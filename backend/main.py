from fastapi import FastAPI, Request, Response
from dotenv import load_dotenv

import os

# Ensure environment variables are loaded FIRST
load_dotenv()

from api.routes import router as api_router
from api.firebase_config import init_firebase_admin

app = FastAPI(title="AtmosLofi API", description="Lofi Audio Processing API")

# Initialize Firebase
init_firebase_admin()

# ULTIMATE CORS FIX (v17 Stability)
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response()
        response.status_code = 200
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

from api.payments import router as payments_router

app.include_router(api_router, prefix="/api")
app.include_router(payments_router, prefix="/api/payments")

@app.get("/api/debug-logs")
async def get_debug_logs():
    res = {}
    import os
    for file in ["temp/process_error.txt", "temp/process_audio_tb.txt", "temp/yt_error.txt"]:
        if os.path.exists(file):
            try:
                with open(file, "r") as f:
                    res[file] = f.read()
            except Exception as e:
                res[file] = f"Could not read: {e}"
    
    if not res:
        return {"message": "No error log files found on the server."}
    return res

@app.get("/")
async def root():
    return {"message": "Welcome to AtmosLofi API"}
