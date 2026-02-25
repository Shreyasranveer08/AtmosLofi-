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

@app.get("/")
async def root():
    return {"message": "Welcome to AtmosLofi API"}
