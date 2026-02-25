import librosa
import numpy as np
import os

def analyze_track_dna(file_path: str) -> dict:
    """
    Extracts technical DNA from an audio file to guide the 'Honest' Lofi Engine.
    Returns: {bpm, percussiveness, energy, bass_heavy, brightness}
    """
    try:
        print(f"Analyzing Track DNA: {os.path.basename(file_path)}")
        
        # Load audio (mono, 22kHz is enough for analysis)
        y, sr = librosa.load(file_path, sr=22050, mono=True)
        
        # 1. TEMPO & BEAT (Reliability: High)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo[0]) if isinstance(tempo, (list, np.ndarray)) else float(tempo)
        
        # 2. PERCUSSIVENESS (Drums Detection)
        # Separates percussive from harmonic components
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        percussive_energy = np.mean(librosa.feature.rms(y=y_percussive))
        harmonic_energy = np.mean(librosa.feature.rms(y=y_harmonic))
        
        # Ratio of percussive energy to harmonic energy
        # Higher values (> 0.2) usually indicate clear drums/transients
        percussiveness = float(percussive_energy / (harmonic_energy + 1e-6))
        
        # 3. SPECTRAL BALANCE (Bass vs Brightness)
        # Spectral Centroid: 'Center of mass' of the sound spectrum
        cent = librosa.feature.spectral_centroid(y=y, sr=sr)
        avg_cent = np.mean(cent) # Lower = Bassier/Darker, Higher = Brighter
        
        # 4. LOW-END ENERGY (10Hz - 250Hz)
        # Check if the song is already bass-heavy
        stft = np.abs(librosa.stft(y))
        freqs = librosa.fft_frequencies(sr=sr)
        bass_range = (freqs >= 10) & (freqs <= 250)
        bass_energy = np.mean(stft[bass_range, :])
        
        mid_range = (freqs > 250) & (freqs <= 2000)
        mid_energy = np.mean(stft[mid_range, :])
        
        bass_ratio = float(bass_energy / (mid_energy + 1e-6))
        
        result = {
            "bpm": round(bpm, 2),
            "percussiveness": round(percussiveness, 3),
            "brightness": round(avg_cent, 2), # e.g., 2000 is bright, 800 is dark
            "bass_ratio": round(bass_ratio, 3),
            "is_drum_heavy": percussiveness > 0.35,
            "is_bass_heavy": bass_ratio > 1.2,
            "is_already_dark": avg_cent < 1200
        }
        
        print(f"DNA Results: BPM={result['bpm']}, DrumHeavy={result['is_drum_heavy']}, BassHeavy={result['is_bass_heavy']}")
        return result

    except Exception as e:
        print(f"Analysis failed: {e}")
        return {
            "bpm": 75.0,
            "percussiveness": 0.1,
            "brightness": 1500,
            "bass_ratio": 1.0,
            "is_drum_heavy": False,
            "is_bass_heavy": False,
            "is_already_dark": False
        }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(analyze_track_dna(sys.argv[1]))
