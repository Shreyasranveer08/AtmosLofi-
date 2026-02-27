# 🎵 AtmosLofi — AI-Powered Lofi Music Studio

AtmosLofi is a full-stack web application that transforms any song into a cozy, atmospheric lofi masterpiece using AI-driven mood detection, stem separation, and real-time audio processing.

![AtmosLofi Preview](screenshots/preview.png)

## 🚀 Live Demo
- **Studio:** [https://atmoslofi-af7a4.web.app/](https://atmoslofi-af7a4.web.app/)
- **Developer Portfolio:** [https://shreyasranveer.netlify.app/](https://shreyasranveer.netlify.app/)

## ✨ Features
- **AI Mood Detection:** Analyzes song lyrics and DNA to determine the perfect lofi vibe.
- **Stem Separation:** Isolates vocals and instruments for a clean mix.
- **Real-time FX:** Analog-style reverb, playback speed control (slowed + reverb), and ambient overlays.
- **VHS Aesthetic:** Retro visual effects with scanlines and chromatic aberration.
- **History Panel:** Keeps track of your previous creations.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, Tailwind CSS, Framer Motion, Lucide React, WaveSurfer.js.
- **Backend:** FastAPI (Python), FFmpeg, OpenRouter AI, YouTube-DLP.
- **Database/Auth:** Firebase (Firestore & Authentication).
- **Deployment:** Netlify (Frontend), Render (Backend).

## 📦 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/Shreyasranveer08/AtmosLofi-.git
cd AtmosLofi-
```

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env.local
# Fill in your Firebase keys in .env.local
npm install
npm run dev
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env
uvicorn main:app --reload
```

## 🛡️ Environment Variables
Check the `.env.example` files in both `frontend/` and `backend/` directories for required keys.

## 📄 License
This project is licensed under the MIT License.
