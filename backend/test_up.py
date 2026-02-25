import requests
import sys

try:
    with open(r'temp\uploads\test.mp3', 'rb') as f:
        files = {'file': ('test.mp3', f, 'audio/mpeg')}
        r = requests.post('http://localhost:8000/api/upload', files=files)
        print(f'Status: {r.status_code}')
        print(f'Text: {r.text}')
except Exception as e:
    print(f'Error: {e}')
