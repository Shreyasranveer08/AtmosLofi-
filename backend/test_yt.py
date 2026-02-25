import requests
import sys

try:
    data = {'url': 'https://www.youtube.com/watch?v=k-W0a3F4OEk'}
    r = requests.post('http://localhost:8000/api/youtube', data=data)
    print(f'Status: {r.status_code}')
    print(f'Text: {r.text}')
except Exception as e:
    print(f'Error: {e}')
