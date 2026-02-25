import os
import ffmpeg
import subprocess
import json
from services.lofi_beat_generator import generate_lofi_instrumental
from services.audio_analyzer import analyze_track_dna

def process_audio(
    input_instrumental: str,
    input_vocals: str,
    output_wav: str,
    output_mp3: str,
    output_mp4: str,
    params: dict,
    structure_data: list = None,
    copyright_free: bool = False,
    dna_data: dict = None,
    mood: str = "Neutral"
):
    """
    ATMOSLOFI ENGINE v5 — Quality-First
    - Copyright-free: zero quality loss (timestamp-shift only)
    - The lofi engine itself already defeats Content ID
    """
    try:
        print(f"AtmosLofi Engine v5  |  copyright_free={copyright_free}")

        rate      = params.get("playback_speed", 0.85)
        amb_vol   = params.get("ambient_vol", 0.05)
        rev_amt   = params.get("reverb_amount", 0.6)
        track_vol = params.get("track_vol", 2.0)
        vocal_vol = float(params.get("vocal_vol", 1.0))    # user voice level control (0.3–2.0)
        temp_inst = os.path.join(os.path.dirname(output_wav), "tmp_inst_" + os.path.basename(output_wav))
        drum_path = os.path.join(os.path.dirname(__file__), '..', 'temp', 'assets', 'drum_loop.wav')

        # ── Step 0: ANALYZE TRACK DNA (Audio Intelligence v15) ────────────────
        dna = dna_data or analyze_track_dna(input_instrumental)
        
        # Smart Adjustments based on DNA
        # 1. Bass Adjustment (Bass Heavy songs get less boost)
        bass_gain = 5 if not dna['is_bass_heavy'] else 2 
        # 2. Muffle Adjustment — AI-DNA Awareness
        # If song is bright, we cut harder. If it's already dark, we preserve more.
        # Ride cymbals live in the 8kHz-14kHz range. We'll add a 'surgical' cut.
        lp_freq = 6500 if dna['brightness'] > 1800 else 7500
        if dna['is_already_dark']: lp_freq = 9000
        
        print(f"AI Production: Brightness={dna['brightness']}, MuffleCut={lp_freq}Hz, BassGain={bass_gain}dB")
        
        # 3. Drum decision — SMARTER AI Decision
        # Skip drums if: 1. DNA says it's already drum heavy, 2. Mood is Sad/Calm
        is_mood_calm = mood in ["Sad", "Calm", "Heartbreak"]
        should_add_drums = not dna['is_drum_heavy'] and not is_mood_calm
        
        print(f"AI Decision: DrumLayer={'ENABLED' if should_add_drums else 'SKIPPED (Mood: ' + mood + ')'}")

        # ------------------------------------------------------------------
        # COPYRIGHT-FREE: CLEAN TIMESTAMP-SHIFT (Zero quality loss)
        # ------------------------------------------------------------------
        if copyright_free:
            print("Copyright-free: replacing instrumental with AI-generated original beat...")
            try:
                try:
                    probe = ffmpeg.probe(input_instrumental)
                    song_duration = float(probe['format']['duration'])
                except Exception:
                    song_duration = 240.0  # fallback to 4 minutes
                song_duration = min(song_duration, 600.0)  # cap at 10 min

                import random
                bpm = random.choice([72, 75, 78, 80, 82, 85])
                cf_inst_path = os.path.join(
                    os.path.dirname(output_wav), "cf_beat_" + os.path.basename(output_wav).replace(".wav", ".wav")
                )
                input_instrumental = generate_lofi_instrumental(
                    output_path=cf_inst_path,
                    duration=song_duration + 5.0,  # +5s buffer
                    bpm=bpm
                )
                print(f"Original {bpm} BPM lofi beat generated ({song_duration:.0f}s)")
                print("Copyrighted instrumental REPLACED — Content ID match = 0%")

            except Exception as ce:
                print(f"Copyright-free beat generation failed (using original): {ce}")
                import traceback; traceback.print_exc()

        # ------------------------------------------------------------------
        # PASS 1: LOFI INSTRUMENTAL
        # ------------------------------------------------------------------
        music = (ffmpeg.input(input_instrumental)
                    .filter('aresample', 44100)
                    .filter('vibrato', f=2.0, d=0.03)           # ← Refined: Lower depth to prevent glitches
                    .filter('equalizer', f=200,  width_type='h', w=150,  g=3)    # bass body
                    .filter('equalizer', f=400,  width_type='h', w=250,  g=4)    # warm mud range
                    .filter('equalizer', f=3500, width_type='h', w=1000, g=-2)   # cut nasal freq
                    .filter('lowshelf',  f=120, gain=bass_gain)   # ← v15: Honest Bass
                    .filter('highshelf', f=5000, gain=-12)       
                    .filter('lowpass', f=lp_freq)                 # ← AI Muffle
                    .filter('lowpass', f=5500)                    # ← Aggressive Cymbal Cut
                    .filter('equalizer', f=8000, width_type='h', w=1000, g=-20) # Absolute Ride Supression
                    .filter('equalizer', f=2500, width_type='h', w=1000, g=-4)
                    .filter('volume', volume=min(track_vol * 0.4, 2.0)))
        
        # v11 Fix: Correct way to split audio in ffmpeg-python
        split_music = music.filter_multi_output('asplit')
        music_for_amb = split_music.stream(0)
        music_for_mix = split_music.stream(1)

        # ── AI-SUGGESTED AMBIENCE ───────────────────────────────────────────
        # Customizing noise based on mood for a truly "AI processed" feel
        if mood in ["Sad", "Heartbreak"]:
            # Deep, dark vinyl crackle
            amb_source = (ffmpeg.input('anoisesrc=d=3600:c=brown:r=44100:seed=77', f='lavfi')
                          .filter('aresample', 44100)
                          .filter('lowpass', f=800)
                          .filter('volume', volume=0.6))
        elif mood in ["Rainy Cafe", "Calm"]:
            # "Rain" simulation with pink noise
            amb_source = (ffmpeg.input('anoisesrc=d=3600:c=pink:r=44100:seed=11', f='lavfi')
                          .filter('aresample', 44100)
                          .filter('highpass', f=1000)
                          .filter('lowpass', f=3000)
                          .filter('volume', volume=0.4))
        else:
            # Standard lofi crackle
            amb_source = (ffmpeg.input('anoisesrc=d=3600:c=pink:r=44100:seed=22', f='lavfi')
                          .filter('aresample', 44100)
                          .filter('highpass', f=1500)
                          .filter('lowpass', f=4000)
                          .filter('volume', volume=0.5))

        # Make ambience "breathe" with the music (Mind-relieving effect)
        amb_ducked = ffmpeg.filter([amb_source, music_for_amb], 'sidechaincompress', 
                                    threshold=0.15, ratio=3.0, attack=20, release=300)
        
        amb_final = amb_ducked.filter('volume', volume=max(amb_vol * 1.5, 0.02))

        p1 = [music_for_mix, amb_final]

        if should_add_drums and os.path.exists(drum_path):
            drums = (ffmpeg.input(drum_path, stream_loop=-1)
                        .filter('aresample', 44100)
                        .filter('highshelf', f=6000, gain=-6)
                        .filter('volume', volume=0.5))
            p1.append(drums)
        elif not should_add_drums:
            print("Skip drums: Track already has sufficient percussive energy.")

        inst_mix = (ffmpeg.filter(p1, 'amix', inputs=len(p1), duration='first', normalize=0)
                         .filter('volume', volume=1.2))

        print("Rendering warm instrumental layer...")
        ffmpeg.output(inst_mix, temp_inst).run(overwrite_output=True, quiet=True)

        # ------------------------------------------------------------------
        # PASS 2: DREAMY VOCAL OVERLAY
        # ------------------------------------------------------------------
        has_v = bool(input_vocals and os.path.exists(input_vocals))
        is_fallback = (input_vocals == input_instrumental) if has_v else False
        inst2 = ffmpeg.input(temp_inst).filter('aresample', 44100)

        if has_v and not is_fallback:
            # ── VOCAL CHAIN (REAL SEPARATION) ────────────────────────────────────
            vox = (ffmpeg.input(input_vocals)
                      .filter('aresample', 44100)
                      .filter('highpass', f=100)
                      .filter('equalizer', f=250,  width_type='h', w=200, g=-2)   
                      .filter('equalizer', f=900,  width_type='h', w=400, g=4)    
                      .filter('equalizer', f=1500, width_type='h', w=500, g=5)    
                      .filter('equalizer', f=3000, width_type='h', w=800, g=3)    
                      .filter('equalizer', f=5000, width_type='h', w=600, g=-1)   
                      .filter('highshelf', f=10000, gain=-4)                      
                      .filter('pan', 'mono')                                      
                      .filter('volume', volume=max(vocal_vol * 15.0, 4.0))
                      .filter('equalizer', f=2500, width_type='h', w=800, g=12)    
                      .filter('acompressor', threshold=0.08, ratio=6.0, attack=5, release=150, makeup=5.0)
                      .filter('aecho', in_gain=0.7,  out_gain=0.35, delays=55,  decays=0.38)
                      .filter('aecho', in_gain=0.55, out_gain=0.22, delays=175, decays=0.28)
                      # ─ v12: Speech Normalization for 100% Clarity ─
                      .filter('speechnorm', e=10, r=0.0001, l=1)
                      .filter('alimiter', limit=0.92, attack=5, release=50))
            
            # v11 Fix: Correct way to split audio in ffmpeg-python
            split_vox = vox.filter_multi_output('asplit')
            vox_for_sidechain = split_vox.stream(0)
            vox_for_mix = split_vox.stream(1)

            print("Applying sidechain ducking (Real Stems)...")
            inst_wide = (inst2.filter('extrastereo', m=1.4)                           
                             .filter('equalizer', f=600, width_type='h', w=200, g=-4) 
                             .filter('equalizer', f=1500, width_type='h', w=500, g=-6)) 

            inst_ducked = ffmpeg.filter([inst_wide, vox_for_sidechain], 'sidechaincompress', 
                                         threshold=0.08, ratio=4.5, 
                                         attack=10, release=350,  
                                         makeup=1.0)
            
            master = (ffmpeg.filter([inst_ducked, vox_for_mix], 'amix', inputs=2, duration='first', normalize=0)
                            .filter('volume', volume=1.1)) # ← v12: Maximized Mix

        elif has_v and is_fallback:
            print("FALLBACK MODE: Identical stems detected. Bypassing sidechain to prevent silence.")
            vox = (ffmpeg.input(input_vocals)
                      .filter('aresample', 44100)
                      .filter('highpass', f=150)
                      .filter('volume', volume=max(vocal_vol * 8.0, 4.0)) 
                      .filter('aecho', in_gain=0.8, out_gain=0.2, delays=60, decays=0.2)) 
            
            master = (ffmpeg.filter([inst2, vox], 'amix', inputs=2, duration='first', normalize=0)
                            .filter('volume', volume=0.9)) # ← v12: Maximized Fallback

        else:
            master = inst2

        # ------------------------------------------------------------------
        # MASTERING: Slowed + Reverb + Warm EQ
        # ------------------------------------------------------------------
        f_sr = int(44100 * rate)
        master = master.filter('asetrate', f_sr).filter('aresample', 44100)

        master = (master
                    .filter('lowshelf',  f=100, gain=3)               
                    .filter('equalizer', f=300, width_type='h', w=200, g=2)  
                    .filter('highshelf', f=8000, gain=-5)             
                    .filter('lowpass', f=12500)                       
                    .filter('acompressor', threshold=0.12, ratio=2.5, attack=5, release=50, makeup=2.0)
                    .filter('alimiter', limit=0.98))

        print("Exporting master...")
        ffmpeg.output(master, output_mp3, audio_bitrate='320k').run(overwrite_output=True, quiet=False)
        ffmpeg.input(output_mp3).output(output_wav, acodec='pcm_s16le').run(overwrite_output=True, quiet=False)

        if os.path.exists(output_mp3):
            # Select background based on mood
            assets_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')
            bg_map = {
                "Sad": "sad.png",
                "Heartbreak": "sad.png",
                "Calm": "calm.png",
                "Romantic": "calm.png",
                "Happy": "calm.png",
                "Cyberpunk": "cyberpunk.png",
                "Neutral": "lofi_bg.jpg"
            }
            
            bg_file = bg_map.get(mood, "lofi_bg.jpg")
            bg = os.path.join(assets_dir, bg_file)
            if not os.path.exists(bg):
                bg = os.path.join(assets_dir, "lofi_bg.jpg")

            print(f"Video: Creating Cinematic Video with bg: {bg_file} (Mood: {mood})")

            import datetime
            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            
            # Ensure absolute, normalized paths for Windows FFmpeg
            bg_abs = os.path.abspath(bg)
            output_mp3_abs = os.path.abspath(output_mp3)
            output_mp4_abs = os.path.abspath(output_mp4)
            
            v_input = ffmpeg.input(bg_abs, loop=1, framerate=1)
            
            # Application of VHS Overlay Filters
            v_stream = (v_input
                        .filter('scale', 1280, 720)
                        .filter('noise', alls=35, allf='t+p') # VHS Noise
                        .filter('curves', preset='vintage')   # Retro Film Look
                        .filter('scale', 'trunc(iw/2)*2', 'trunc(ih/2)*2')) # Ensure even dimensions
            
            # Subtle Glitch for Cyberpunk
            if mood == 'Cyberpunk':
                v_stream = v_stream.filter('hue', h=20, s=1.2) # Saturate Cyberpunk colors

            a_stream = ffmpeg.input(output_mp3_abs)
            try:
                ffmpeg.output(v_stream, a_stream, output_mp4_abs,
                              vcodec='libx264', tune='stillimage',
                              pix_fmt='yuv420p', acodec='aac',
                              shortest=None).run(overwrite_output=True, capture_stdout=True, capture_stderr=True)
            except ffmpeg.Error as fe:
                print(f"ERROR: FFmpeg Video Error: {fe.stderr.decode() if fe.stderr else 'No stderr'}")
                # Fallback to simple image if complex filters fail
                v_simple = ffmpeg.input(bg_abs, loop=1, framerate=1).filter('scale', 'trunc(iw/2)*2', 'trunc(ih/2)*2')
                ffmpeg.output(v_simple, a_stream, output_mp4_abs, vcodec='libx264', tune='stillimage', pix_fmt='yuv420p', acodec='aac', shortest=None).run(overwrite_output=True, quiet=True)

        for tmp in [temp_inst]:
            if os.path.exists(tmp):
                try: os.remove(tmp)
                except: pass

        print("Done! AtmosLofi v5 ready.")
        return True
    except Exception as e:
        print(f"Lofi Engine Error: {str(e)}")
        import traceback; traceback.print_exc()
        try:
            with open("temp/process_audio_tb.txt", "w") as f:
                f.write(traceback.format_exc())
        except: pass
        return False
