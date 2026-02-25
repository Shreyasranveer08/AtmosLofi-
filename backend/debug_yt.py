import yt_dlp
import os
from pathlib import Path

UPLOAD_DIR = Path("temp/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

url = "https://youtu.be/6DCOjq0omBc?si=GaXJBC6IlIbno1s_"
file_id = "debug_test_song"

ydl_opts = {
    'format': 'bestaudio/best',
    'outtmpl': str(UPLOAD_DIR / f"{file_id}.%(ext)s"),
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'mp3',
        'preferredquality': '192',
    }],
    'quiet': False
}

try:
    print(f"Starting download for {url}...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        print(f"Successfully downloaded: {info.get('title')}")
        
    expected_path = UPLOAD_DIR / f"{file_id}.mp3"
    if expected_path.exists():
        print(f"File exists at: {expected_path}")
        print(f"Size: {os.path.getsize(expected_path)} bytes")
    else:
        print(f"ERROR: File NOT found at {expected_path}")
        # Check what actually got downloaded
        print("Folder contents:")
        for f in os.listdir(UPLOAD_DIR):
            if file_id in f:
                print(f" - {f}")
except Exception as e:
    print(f"Download failed: {e}")
