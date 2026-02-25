# AtmosLofi — Deployment Guide

## Architecture

```
Frontend (Next.js)  →  Vercel / Netlify
Backend (FastAPI)   →  Railway.app  (needs GPU/CPU for AI + FFmpeg)
```

---

## Step 1: Deploy Backend to Railway

Railway free tier: 512MB RAM, 1 vCPU — works for small-scale.

### 1.1 Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 1.2 Create Procfile in `/backend`
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 1.3 Create `railway.json` in `/backend`
```json
{
  "build": { "builder": "nixpacks" },
  "deploy": { "startCommand": "uvicorn main:app --host 0.0.0.0 --port $PORT" }
}
```

### 1.4 Add nixpacks.toml for FFmpeg
```toml
[phases.setup]
nixPkgs = ["ffmpeg", "python311"]
```

### 1.5 Deploy
```bash
cd backend
railway init
railway up
```

Railway will give you a URL like `https://atmoslofi-backend.up.railway.app`

### 1.6 Set Environment Variables on Railway
```
HF_TOKEN=your_huggingface_token
RAPIDAPI_KEY=your_rapidapi_key
```

---

## Step 2: Update Frontend API URL

In `frontend/src/app/page.tsx` and `Player.tsx`, replace:
```
http://127.0.0.1:8000
```
with your Railway URL:
```
https://atmoslofi-backend.up.railway.app
```

**Tip**: Use `.env.local` for easy switching:
```env
NEXT_PUBLIC_API_URL=https://atmoslofi-backend.up.railway.app
```

Then in code: `` `${process.env.NEXT_PUBLIC_API_URL}/api/...` ``

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Push to GitHub
```bash
git init && git add . && git commit -m "AtmosLofi deploy"
git remote add origin https://github.com/yourname/atmoslofi.git
git push -u origin main
```

### 3.2 Connect to Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Root directory: `frontend`
4. Build command: `npm run build`
5. Add env var: `NEXT_PUBLIC_API_URL=<your railway url>`
6. Click Deploy ✅

---

## Step 4: CORS Fix (Backend)

In `backend/main.py`, update CORS origins:
```python
origins = [
    "http://localhost:3000",
    "https://your-vercel-app.vercel.app",   # add this
]
```

---

## Estimated Monthly Cost

| Service | Free Tier | Paid |
|---------|----------|------|
| Vercel | ✅ Free (hobby) | $20/mo |
| Railway | $5 free credits/mo | $5+/mo |
| Total | ~$0–5/mo | $25/mo |
