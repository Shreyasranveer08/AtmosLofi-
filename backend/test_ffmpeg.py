import os
import traceback
import json
from services.audio_processor import process_audio
from services.presets import get_preset_params
from services.ai_service import separate_stems_bytez, transcribe_audio_bytez, analyze_song_structure

BASE_DIR = r'D:\New folder (24)\backend'
input_mp3 = os.path.join(BASE_DIR, 'temp', 'test_song.mp3')
output_wav = os.path.join(BASE_DIR, 'temp', 'demo_final.wav')
output_mp3 = os.path.join(BASE_DIR, 'temp', 'demo_final.mp3')
output_mp4 = os.path.join(BASE_DIR, 'temp', 'demo_final.mp4')

def run_demo():
    print("--- 🚀 STARTING SMART LOFI DEMO 🚀 ---")
    
    try:
        # 1. Stem Separation
        print("\n[STEP 1] Separating Stems (Bytez AI)...")
        stems = separate_stems_bytez(input_mp3)
        vocals_path = stems.get("vocals", "")
        inst_path = stems.get("other", input_mp3)
        print(f"   Done! Vocals isolated at: {vocals_path}")

        # 2. Transcription & Structure
        print("\n[STEP 2] Analyzing Soulful Structure (Bytez + OpenRouter)...")
        transcript = transcribe_audio_bytez(vocals_path if vocals_path else input_mp3)
        structure = analyze_song_structure(transcript)
        print(f"   Detected Structure: {json.dumps(structure, indent=2)}")

        # 3. Final Mix
        print("\n[STEP 3] Applying Slowed + Reverb + Smart Rearrangement...")
        params = get_preset_params('Rainy Cafe')
        success = process_audio(inst_path, vocals_path, output_wav, output_mp3, output_mp4, params, structure_data=structure)
        
        if success:
            print("\n✅ DEMO COMPLETED SUCCESSFULLY!")
            print(f"   Final Lofi MP3: {output_mp3}")
        else:
            print("\n❌ Processing failed.")

    except Exception as e:
        print(f"\n💥 ERROR: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_demo()
