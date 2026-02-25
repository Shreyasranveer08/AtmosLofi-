import os
import sys
from pathlib import Path

# Add the current directory to path so we can import services
sys.path.append(os.getcwd())

from services.ai_service import separate_stems

audio_path = "temp/uploads/debug_test_song.mp3"

try:
    print(f"Starting stem separation for {audio_path}...")
    stems = separate_stems(audio_path)
    
    print("Separation result:")
    for key, path in stems.items():
        if path:
            print(f" - {key}: {path} ({os.path.getsize(path)} bytes)")
        else:
            print(f" - {key}: MISSING")
            
    if not stems.get("vocals") or stems.get("vocals") == audio_path:
        print("⚠️ VOCALS FALLBACK DETECTED: Either API failed or No separation key.")
    else:
         print("✅ REAL VOCALS SEPARATED!")
         
except Exception as e:
    print(f"Separation test failed: {e}")
    import traceback
    traceback.print_exc()
