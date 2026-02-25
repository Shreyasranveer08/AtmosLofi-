import os
import requests
import json
import urllib.parse
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# ── API KEYS ─────────────────────────────────────────────────────────────────
OPENROUTER_API_KEY  = os.getenv("OPENROUTER_API_KEY", "")
BYTEZ_API_KEY       = os.getenv("BYTEZ_API_KEY", "")
STEMSPLIT_API_KEY   = os.getenv("STEMSPLIT_API_KEY", "")   # RapidAPI key — add when you have it

# ── FREE APIs (NO KEY NEEDED) ─────────────────────────────────────────────────
# Lyrics.ovh   → https://lyricsovh.docs.apiary.io  (FREE, no auth)
# MusicBrainz  → https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2 (FREE, no auth)
# JioSaavn     → https://github.com/cyberboysumanjay/JioSaavnAPI (FREE, no auth)

LYRICSOVH_BASE   = "https://api.lyrics.ovh/v1"
MUSICBRAINZ_BASE = "https://musicbrainz.org/ws/2"
JIOSAAVN_BASE    = "https://saavn.dev/api"   # Community mirror of JioSaavn API

# ─────────────────────────────────────────────────────────────────────────────
# 1. LYRICS (FREE — No Key)
# ─────────────────────────────────────────────────────────────────────────────
def get_lyrics_free(artist: str, title: str) -> str:
    """
    Fetch song lyrics using Lyrics.ovh — completely FREE, no API key needed.
    Falls back to JioSaavn for Indian songs.
    """
    # Try Lyrics.ovh first (works great for Bollywood/Hindi too)
    try:
        url = f"{LYRICSOVH_BASE}/{urllib.parse.quote(artist)}/{urllib.parse.quote(title)}"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            lyrics = r.json().get("lyrics", "")
            if lyrics and len(lyrics) > 50:
                print(f"✅ Lyrics.ovh: Got lyrics for {title}")
                return lyrics
    except Exception as e:
        print(f"Lyrics.ovh error: {e}")

    # Try JioSaavn for Indian songs
    try:
        search_url = f"{JIOSAAVN_BASE}/search/songs?query={urllib.parse.quote(title + ' ' + artist)}&limit=1"
        r = requests.get(search_url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            songs = data.get("data", {}).get("results", [])
            if songs:
                print(f"✅ JioSaavn: Found song metadata for {title}")
                return songs[0].get("description", "")
    except Exception as e:
        print(f"JioSaavn error: {e}")

    return ""


# ─────────────────────────────────────────────────────────────────────────────
# 2. SONG METADATA & MOOD TAGS (FREE — No Key)
# ─────────────────────────────────────────────────────────────────────────────
def get_song_metadata_free(artist: str, title: str) -> dict:
    """
    Get song tags, genre, mood from MusicBrainz — FREE, no API key.
    Returns: {genre: str, tags: list, mood: str}
    """
    try:
        headers = {"User-Agent": "AtmosLofi/1.0 (your@email.com)"}
        
        # Search for the recording
        search_url = f"{MUSICBRAINZ_BASE}/recording"
        params = {
            "query": f'recording:"{title}" AND artist:"{artist}"',
            "fmt": "json",
            "limit": 1
        }
        r = requests.get(search_url, params=params, headers=headers, timeout=10)
        
        if r.status_code == 200:
            data = r.json()
            recordings = data.get("recordings", [])
            if recordings:
                rec = recordings[0]
                tags = [t["name"] for t in rec.get("tags", [])]
                genres = [g["name"] for g in rec.get("genres", [])]
                
                # Derive mood from tags
                mood = _infer_mood_from_tags(tags + genres)
                
                print(f"✅ MusicBrainz: Got metadata for {title} — tags: {tags[:3]}")
                return {
                    "genre": genres[0] if genres else "Unknown",
                    "tags": tags,
                    "mood": mood,
                    "title": rec.get("title", title),
                    "artist": artist
                }
    except Exception as e:
        print(f"MusicBrainz error: {e}")
    
    return {"genre": "Unknown", "tags": [], "mood": "Calm", "title": title, "artist": artist}


def _infer_mood_from_tags(tags: list) -> str:
    """Map MusicBrainz tags to lofi mood labels."""
    tags_lower = [t.lower() for t in tags]
    
    sad_words    = ["sad", "melancholic", "heartbreak", "longing", "bittersweet", "grief", "dard"]
    happy_words  = ["happy", "energetic", "dance", "upbeat", "festive", "joy", "khushi"]
    calm_words   = ["calm", "chill", "peaceful", "ambient", "relax", "sleep", "lo-fi", "lofi"]
    romantic_words = ["love", "romantic", "romance", "pyaar", "ishq", "romance"]
    
    for word in sad_words:
        if any(word in tag for tag in tags_lower):
            return "Sad"
    for word in romantic_words:
        if any(word in tag for tag in tags_lower):
            return "Romantic"
    for word in happy_words:
        if any(word in tag for tag in tags_lower):
            return "Happy"
    for word in calm_words:
        if any(word in tag for tag in tags_lower):
            return "Calm"
    
    return "Neutral"


# ─────────────────────────────────────────────────────────────────────────────
# 3. JIOSAAVN SONG SEARCH (FREE — No Key, great for Indian songs)
# ─────────────────────────────────────────────────────────────────────────────
def search_jiosaavn(query: str) -> dict:
    """
    Search JioSaavn for song info — FREE, no API key.
    Returns song details including artist, album, duration, language.
    """
    try:
        url = f"{JIOSAAVN_BASE}/search/songs?query={urllib.parse.quote(query)}&limit=5"
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            data = r.json()
            songs = data.get("data", {}).get("results", [])
            if songs:
                song = songs[0]
                print(f"✅ JioSaavn: Found '{song.get('name', query)}'")
                return {
                    "name": song.get("name", ""),
                    "artist": song.get("primaryArtists", ""),
                    "album": song.get("album", {}).get("name", ""),
                    "language": song.get("language", ""),
                    "year": song.get("year", ""),
                    "duration": song.get("duration", 0),
                }
    except Exception as e:
        print(f"JioSaavn search error: {e}")
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# 4. SMART MOOD ANALYSIS (FREE first, then OpenRouter if needed)
# ─────────────────────────────────────────────────────────────────────────────
def analyze_mood_smart(filename: str, dna: dict = None) -> str:
    """
    Smart mood analysis using metadata + technical DNA.
    """
    dna = dna or {}
    bpm = dna.get('bpm', 0)
    percussive = dna.get('percussiveness', 0)
    # Step 1: Parse filename for artist/title hints
    base = os.path.splitext(os.path.basename(filename))[0]
    parts = base.replace("_", " ").replace("-", " - ").split(" - ")
    
    artist = parts[0].strip() if len(parts) > 0 else "Unknown"
    title  = parts[1].strip() if len(parts) > 1 else base.strip()
    
    print(f"🎵 Analyzing mood for: {artist} — {title}")
    
    # Step 2: Try MusicBrainz (free)
    metadata = get_song_metadata_free(artist, title)
    if metadata.get("mood") not in ["Neutral", "Calm"]:
        print(f"🎭 Mood from MusicBrainz: {metadata['mood']}")
        return metadata["mood"]
    
    # Step 3: Try JioSaavn (free — gives language clue)
    jio_data = search_jiosaavn(base)
    if jio_data.get("language") in ["hindi", "punjabi", "tamil"]:
        # Indian songs have different mood patterns
        if metadata.get("tags"):
            return metadata["mood"]
    
    # Step 4: If we have OpenRouter key, use it for final analysis
    if OPENROUTER_API_KEY:
        tags_str = ", ".join(metadata["tags"][:10])
        dna_context = f"BPM: {bpm}, Percussiveness: {percussive}, Brightness Score: {dna.get('brightness', 'N/A')}"
        
        try:
            response = requests.post(
                url="https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
                data=json.dumps({
                    "model": "meta-llama/llama-3-8b-instruct:free",
                    "messages": [{
                        "role": "user",
                        "content": f"Analyze this song honestly: '{title}' by {artist}.\nTechnical DNA: {dna_context}\nTags: {tags_str}\n\nBased on these facts, what is the dominant mood? Reply with ONE word only: Happy/Sad/Calm/Romantic/Neutral"
                    }]
                }),
                timeout=15
            )
            mood = response.json()['choices'][0]['message']['content'].strip().split()[0].replace(".", "").replace(",", "")
            if mood in ["Happy", "Sad", "Calm", "Romantic", "Neutral"]:
                print(f"🤖 AI Producer Choice: {mood}")
                return mood
        except Exception as e:
            print(f"OpenRouter mood error: {e}")
    
    return metadata.get("mood", "Neutral")


# ─────────────────────────────────────────────────────────────────────────────
# 5. PRESET DESCRIPTION (OpenRouter — existing feature)
# ─────────────────────────────────────────────────────────────────────────────
def generate_preset_description(mood: str) -> str:
    """Uses OpenRouter to generate a poetic description for the lofi mood."""
    if not OPENROUTER_API_KEY:
        descriptions = {
            "Sad": "Rainy nights and soft memories drift through the air.",
            "Happy": "Golden afternoons with chai and lazy smiles.",
            "Calm": "A quiet evening, notebook open, city hum outside.",
            "Romantic": "Soft lights, old letters, and a song you can't forget.",
            "Neutral": "A cozy lofi vibe perfectly tuned for your soul."
        }
        return descriptions.get(mood, "A cozy lofi vibe.")
    
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps({
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [
                    {"role": "system", "content": "You are a poetic lofi music producer."},
                    {"role": "user", "content": f"Describe the '{mood}' atmosphere in one short, aesthetic sentence for a lofi music app. Max 15 words."}
                ]
            }),
            timeout=15
        )
        return response.json()['choices'][0]['message']['content']
    except Exception:
        return f"Perfectly tuned for {mood}."


# ─────────────────────────────────────────────────────────────────────────────
# 6. STEM SEPARATION — StemSplit (RapidAPI) → Bytez → Fallback
# ─────────────────────────────────────────────────────────────────────────────
def _download_file(url: str, dest_path: str) -> Optional[str]:
    """Download a file from URL to local path."""
    try:
        r = requests.get(url, stream=True, timeout=60)
        r.raise_for_status()
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        with open(dest_path, 'wb') as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return dest_path
    except Exception as e:
        print(f"Download error: {e}")
        return None


def separate_stems_stemsplit(audio_path: str) -> dict:
    """
    StemSplit via RapidAPI — 500,000 FREE requests/month!
    Add STEMSPLIT_API_KEY to .env to activate.
    Get key from: https://rapidapi.com/stemsplit/api/stemsplit-ai-audio-stem-separation-youtube-to-stems
    """
    if not STEMSPLIT_API_KEY:
        return {}
    
    try:
        print("🎵 Trying StemSplit (RapidAPI)...")
        
        # Step 1: Upload file to get uploadKey
        with open(audio_path, 'rb') as f:
            upload_r = requests.post(
                "https://stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com/upload",
                headers={
                    "x-rapidapi-key": STEMSPLIT_API_KEY,
                    "x-rapidapi-host": "stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com"
                },
                files={"file": f},
                timeout=60
            )
        
        if upload_r.status_code != 200:
            print(f"StemSplit upload failed: {upload_r.status_code}")
            return {}
        
        upload_key = upload_r.json().get("uploadKey", "")
        if not upload_key:
            return {}
        
        # Step 2: Create separation job
        job_r = requests.post(
            "https://stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com/jobs",
            headers={
                "x-rapidapi-key": STEMSPLIT_API_KEY,
                "x-rapidapi-host": "stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com",
                "Content-Type": "application/json"
            },
            json={
                "uploadKey": upload_key,
                "outputFormat": "MP3",
                "quality": "STANDARD"
            },
            timeout=30
        )
        
        if job_r.status_code not in (200, 201):
            return {}
        
        job_id = job_r.json().get("jobId", "")
        if not job_id:
            return {}
        
        # Step 3: Poll for results (max 3 minutes)
        import time
        for attempt in range(36):
            time.sleep(5)
            status_r = requests.get(
                f"https://stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com/jobs/{job_id}",
                headers={
                    "x-rapidapi-key": STEMSPLIT_API_KEY,
                    "x-rapidapi-host": "stemsplit-ai-audio-stem-separation-youtube-to-stems.p.rapidapi.com"
                },
                timeout=15
            )
            if status_r.status_code == 200:
                result = status_r.json()
                status = result.get("status", "")
                print(f"  StemSplit status [{attempt+1}]: {status}")
                
                if status == "COMPLETED":
                    stems_urls = result.get("stems", {})
                    stems = {}
                    base = os.path.splitext(os.path.basename(audio_path))[0]
                    
                    for stem_name, stem_url in stems_urls.items():
                        if isinstance(stem_url, str) and stem_url.startswith("http"):
                            dest = os.path.join("temp", "stems", f"{base}_{stem_name}.mp3")
                            local = _download_file(stem_url, dest)
                            if local and os.path.getsize(local) > 50000:
                                stems[stem_name] = local
                    
                    if stems.get("vocals"):
                        print(f"✅ StemSplit: Vocals separated successfully!")
                        return stems
                    break
                    
                elif status in ("FAILED", "ERROR"):
                    print("StemSplit job failed")
                    break
        
    except Exception as e:
        print(f"StemSplit error: {e}")
    
    return {}


def separate_stems_bytez(audio_path: str) -> dict:
    """Legacy Bytez fallback (usually 404, kept as last resort)."""
    if not BYTEZ_API_KEY:
        return {}
    try:
        with open(audio_path, 'rb') as f:
            for url in [
                "https://api.bytez.com/v2/models/facebook/demucs_v4",
                "https://api.bytez.com/v1/models/facebook/demucs_v4"
            ]:
                r = requests.post(url, headers={"Authorization": f"Bearer {BYTEZ_API_KEY}"}, files={"file": f}, timeout=60)
                if r.status_code == 200:
                    raw = r.json().get("stems", {})
                    stems = {}
                    for name, stem_url in raw.items():
                        if isinstance(stem_url, str) and stem_url.startswith("http"):
                            dest = os.path.join("temp", "stems", f"{os.path.basename(audio_path)}_{name}.wav")
                            local = _download_file(stem_url, dest)
                            if local and os.path.getsize(local) > 50000:
                                stems[name] = local
                    if stems.get("vocals"):
                        return stems
    except Exception as e:
        print(f"Bytez error: {e}")
    return {}


def separate_stems(audio_path: str) -> dict:
    """
    Master stem separator — tries all methods in order:
    1. StemSplit via RapidAPI (best, 500K free/month) — needs STEMSPLIT_API_KEY
    2. Bytez (usually broken, kept as last resort)
    3. Zero-Loss Fallback — uses original audio for both paths (always works)
    """
    # Try StemSplit first if key is available
    result = separate_stems_stemsplit(audio_path)
    if result.get("vocals"):
        result.setdefault("other", audio_path)
        return result
    
    # Try Bytez (usually fails but worth trying)
    result = separate_stems_bytez(audio_path)
    if result.get("vocals"):
        result.setdefault("other", audio_path)
        return result
    
    # Zero-Loss Fallback — ALWAYS works
    print("⚠️ Stem separation fallback: Using original audio (add STEMSPLIT_API_KEY for real separation)")
    return {"vocals": audio_path, "other": audio_path}


# ─────────────────────────────────────────────────────────────────────────────
# 7. SONG TRANSCRIPTION — Free lyrics lookup instead of Whisper
# ─────────────────────────────────────────────────────────────────────────────
def transcribe_audio_smart(audio_path: str, artist: str = "", title: str = "") -> dict:
    """
    Smart transcription: uses Lyrics.ovh (FREE) instead of expensive Whisper.
    Falls back to Bytez Whisper only if no lyrics found.
    """
    # Try to get artist/title from filename if not provided
    if not artist or not title:
        base = os.path.splitext(os.path.basename(audio_path))[0]
        parts = base.replace("_", " ").replace("-", " - ").split(" - ")
        artist = parts[0].strip() if len(parts) > 0 else ""
        title  = parts[1].strip() if len(parts) > 1 else base.strip()
    
    # Try free lyrics API first
    if artist and title:
        lyrics = get_lyrics_free(artist, title)
        if lyrics:
            # Convert lyrics to transcript-like format
            lines = [l.strip() for l in lyrics.split("\n") if l.strip()]
            segments = [{"start": i * 3.0, "end": (i + 1) * 3.0, "text": line} for i, line in enumerate(lines[:30])]
            return {"text": lyrics[:2000], "segments": segments}
    
    # Last resort: Bytez Whisper (usually fails)
    if BYTEZ_API_KEY:
        try:
            with open(audio_path, 'rb') as f:
                r = requests.post(
                    "https://api.bytez.com/v1/models/openai/whisper-large-v3",
                    headers={"Authorization": f"Bearer {BYTEZ_API_KEY}"},
                    files={"file": f},
                    timeout=120
                )
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print(f"Bytez Whisper error: {e}")
    
    return {}


def analyze_song_structure(transcript_json: dict) -> list:
    """Uses OpenRouter to identify Hook/Chorus for anti-copyright structure."""
    if not OPENROUTER_API_KEY or not transcript_json.get("text"):
        return []
    
    segments = transcript_json.get("segments", [])
    text_snippet = transcript_json.get("text", "")[:500]
    
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps({
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [{
                    "role": "user",
                    "content": f"Song lyrics snippet: {text_snippet}\n\nIdentify the most emotional Hook/Chorus. Return ONLY a JSON list: [{{'start': 10.0, 'end': 25.0, 'label': 'Hook'}}]"
                }]
            }),
            timeout=15
        )
        res_text = response.json()['choices'][0]['message']['content']
        if "```json" in res_text:
            res_text = res_text.split("```json")[1].split("```")[0].strip()
        elif "```" in res_text:
            res_text = res_text.split("```")[1].split("```")[0].strip()
        return json.loads(res_text)
    except Exception as e:
        print(f"Structure analysis error: {e}")
        return []
