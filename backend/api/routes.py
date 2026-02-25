import os
import asyncio
import yt_dlp
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import threading

from services.audio_processor import process_audio
from services.presets import get_preset_params, PRESETS
from services.ai_service import separate_stems, transcribe_audio_smart, analyze_mood_smart, analyze_song_structure, generate_preset_description
from services.audio_analyzer import analyze_track_dna
from firebase_admin import firestore

router = APIRouter()

UPLOAD_DIR = Path("temp/uploads")
PROCESSED_DIR = Path("temp/processed")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# In-memory mock DB for task tracking
TASKS     = {}   # task_id → status string
TASK_META = {}   # task_id → {mood: str, ...}

def background_process_audio(task_id: str, input_path: str, preset: str, ambient_vol: float, track_vol: float, reverb_amount: float, playback_speed: float, copyright_free: bool = False, vocal_vol: float = 1.0):
    TASKS[task_id] = "processing"
    try:
        # --- AI STEP 1: STEM SEPARATION (StemSplit RapidAPI → Bytez → Fallback) ---
        TASKS[task_id] = "separating_stems"
        print(f"Starting Smart Stem Separation for {task_id}...")
        stems = separate_stems(input_path)
        
        vocals_path = stems.get("vocals", "")
        instrumental_path = stems.get("other", input_path)  # Fallback to original if API fails
        
        # --- AI STEP 2: LYRICS + STRUCTURE (Lyrics.ovh FREE → Bytez fallback) ---
        structure_data = []
        if vocals_path:
            TASKS[task_id] = "analyzing_soulful_structure"
            print(f"Fetching lyrics for structure analysis...")
            transcript_json = transcribe_audio_smart(vocals_path)
            
            print(f"Detecting Chorus/Hooks for {task_id}...")
            structure_data = analyze_song_structure(transcript_json)
            
        # --- AI STEP 3: AUTO VIBE (DNA-Aware v15) ---
        TASKS[task_id] = "analyzing_vibe"
        print(f"Performing technical DNA analysis for {task_id}...")
        dna = analyze_track_dna(input_path)  # Get technical facts
        
        if preset.lower() == "auto":
            print(f"Detecting honest mood for {task_id}...")
            sentiment = analyze_mood_smart(input_path, dna=dna)
            print(f"Honest Vibe Detected: {sentiment}")
            TASK_META[task_id] = {"mood": sentiment}   # store mood for frontend
            
            if "Sad" in sentiment or "Heartbreak" in sentiment:
                preset = "Heartbreak"
            elif "Happy" in sentiment:
                preset = "Late Night Coding"
            elif "Romantic" in sentiment:
                preset = "Rainy Cafe"
            else:
                preset = "Rainy Cafe"
                
            print(f"Auto Vibe selected: {preset}")
        else:
            # For non-auto presets, still store the preset name as mood context
            TASK_META.setdefault(task_id, {})
            sentiment = preset

        TASKS[task_id] = "applying_lofi_effects"
        
        params = get_preset_params(preset)
        # Override the preset's volumes if user provided custom ones
        params["ambient_vol"]   = ambient_vol
        params["track_vol"]     = track_vol
        params["reverb_amount"] = reverb_amount
        params["playback_speed"]= playback_speed
        params["vocal_vol"]     = vocal_vol      # user voice level control
        
        output_wav = PROCESSED_DIR / f"{task_id}.wav"
        output_mp3 = PROCESSED_DIR / f"{task_id}.mp3"
        output_mp4 = PROCESSED_DIR / f"{task_id}.mp4"
        
        # Pass both the instrumental, clean vocals, AND structure data to the processor
        success = process_audio(
            str(instrumental_path), 
            str(vocals_path), 
            str(output_wav), 
            str(output_mp3), 
            str(output_mp4), 
            params, 
            structure_data=structure_data, 
            copyright_free=copyright_free,
            dna_data=dna,
            mood=sentiment # ← v16: Mood-aware video selection
        )
        if success:
            TASKS[task_id] = "completed"
        else:
            TASKS[task_id] = "failed"
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"Error processing {task_id}: {error_msg}")
        try:
            with open("temp/process_error.txt", "w") as f:
                f.write(error_msg)
        except: pass
        TASKS[task_id] = "failed"

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.mp3', '.wav')):
        raise HTTPException(status_code=400, detail="Only MP3 and WAV files are supported.")
    
    file_id = str(uuid.uuid4())
    extension = file.filename.split('.')[-1]
    save_path = UPLOAD_DIR / f"{file_id}.{extension}"
    
    with open(save_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    return {"file_id": file_id, "filename": file.filename, "uploaded_path": str(save_path)}

YT_TASKS = {}  # task_id → {"status": "downloading"/"done"/"failed", "file_id": ...}

@router.post("/youtube")
async def youtube_download(background_tasks: BackgroundTasks, url: str = Form(...)):
    """Start YouTube download in background, return task_id immediately."""
    # v17: Basic URL validation before accepting
    if not ("youtube.com" in url or "youtu.be" in url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL provided.")

    task_id = str(uuid.uuid4())
    file_id = str(uuid.uuid4())
    YT_TASKS[task_id] = {"status": "downloading", "file_id": file_id}

    def run_download(task_id: str, file_id: str, dl_url: str):
        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': str(UPLOAD_DIR / f"{file_id}.%(ext)s"),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'quiet': True
        }
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(dl_url, download=True)
                title = info.get('title', 'YouTube Audio') if info else 'YouTube Audio'
            YT_TASKS[task_id] = {"status": "done", "file_id": file_id, "filename": title}
        except yt_dlp.utils.DownloadError as e:
            # yt-dlp specific errors (e.g., video processing, age restricted, blocked)
            error_msg = str(e)
            if "processing this video" in error_msg.lower():
                error_msg = "YouTube is still processing this video. Please try again later."
            elif "sign in" in error_msg.lower():
                error_msg = "This video is age-restricted or requires sign-in."
            
            YT_TASKS[task_id] = {"status": "failed", "file_id": file_id, "error": error_msg}
        except Exception as e:
            import traceback
            error_msg = str(e)
            YT_TASKS[task_id] = {"status": "failed", "file_id": file_id, "error": error_msg}
            try:
                with open("temp/yt_error.txt", "w") as f:
                    f.write(traceback.format_exc())
            except: pass

    background_tasks.add_task(run_download, task_id, file_id, url)
    return {"task_id": task_id, "status": "downloading"}


@router.get("/yt-status/{task_id}")
async def yt_status(task_id: str):
    """Poll this after /youtube to know when download is complete."""
    task = YT_TASKS.get(task_id)
    if not task:
        return {"status": "not_found"}
    return task

@router.post("/process")
async def process_audio_endpoint(
    background_tasks: BackgroundTasks, 
    file_id: str = Form(...), 
    preset: str = Form(...),
    ambient_vol: float = Form(0.05),
    track_vol: float = Form(2.0),
    reverb_amount: float = Form(0.5),
    playback_speed: float = Form(0.85),
    copyright_free: bool = Form(False),
    vocal_vol: float = Form(1.0),       # voice level, 0.3–2.0
    user_id: str = Form(None)
):
    if copyright_free:
        if not user_id:
            raise HTTPException(status_code=401, detail="Must be logged in to use Copyright-Free mode")
        try:
            db = firestore.client()
            user_ref = db.collection('users').document(user_id)
            user_doc = user_ref.get()
            
            current_credits = user_doc.to_dict().get('credits', 0) if user_doc.exists else 0
            if current_credits <= 0:
                raise HTTPException(status_code=402, detail="Insufficient credits for Copyright-Free mode")
            
            user_ref.update({'credits': current_credits - 1})
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error checking credits: {e}")
            raise HTTPException(status_code=500, detail="Failed to verify credits")

    input_file = None
    for ext in ['mp3', 'wav']:
        potential_path = UPLOAD_DIR / f"{file_id}.{ext}"
        if potential_path.exists():
            input_file = potential_path
            break
            
    if not input_file:
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
        
    task_id = str(uuid.uuid4())
    TASKS[task_id] = "queued"
    
    background_tasks.add_task(
        background_process_audio, task_id, str(input_file),
        preset, ambient_vol, track_vol, reverb_amount, playback_speed, copyright_free, vocal_vol
    )
    
    return {"task_id": task_id, "status": "processing", "copyright_free": copyright_free}

@router.get("/description/{mood}")
async def get_mood_description(mood: str):
    from services.ai_service import generate_preset_description
    desc = generate_preset_description(mood)
    return {"description": desc}

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    status = TASKS.get(task_id, "not_found")
    meta   = TASK_META.get(task_id, {})
    return {"task_id": task_id, "status": status, **meta}

@router.get("/download/{task_id}")
async def download_audio(task_id: str, format: str = "mp3"):
    if format not in ["mp3", "wav", "mp4"]:
        raise HTTPException(status_code=400, detail="Invalid format requested.")
        
    file_path = PROCESSED_DIR / f"{task_id}.{format}"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found or processing not complete.")
        
    media_type = f"video/{format}" if format == "mp4" else f"audio/{format}"
    return FileResponse(path=file_path, filename=f"atmoslofi-{task_id}.{format}", media_type=media_type)

@router.get("/raw/{file_id}")
async def download_raw_original(file_id: str):
    """Serve the original uploaded audio for Before/After comparison."""
    for ext in ['mp3', 'wav', 'm4a', 'ogg']:
        file_path = UPLOAD_DIR / f"{file_id}.{ext}"
        if file_path.exists():
            return FileResponse(
                path=file_path,
                filename=f"original-{file_id}.{ext}",
                media_type=f"audio/{ext}"
            )
    raise HTTPException(status_code=404, detail="Original file not found.")
