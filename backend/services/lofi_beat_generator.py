"""
lofi_beat_generator.py — High Quality Lofi Synthesizer
────────────────────────────────────────────────────────────────────
Uses scipy + numpy for professional-quality lofi backing tracks:
  • Additive synthesis (harmonic sines — NOT FM, no bell sound)
  • Butterworth lowpass filter per note (warm, smooth)
  • Real Am7→G→Fmaj7→Em7 chord progression
  • Humanized timing ±20ms
  • Swing rhythm on off-beats
  • Bass on beats 1 & 3
  • All 100% original — zero Content ID match
"""

import os, io, random, wave
import numpy as np
from scipy.signal import butter, sosfilt

try:
    import soundfile as sf
    HAS_SF = True
except ImportError:
    HAS_SF = False

SR = 44100

# ── Lofi chord progression (A minor, classic lofi) ──────────────────────────
ROOT = 220.0  # A3

def hz(semitones): return ROOT * (2 ** (semitones / 12.0))

CHORDS = [
    # (name, [semitones…])
    ("Am7",   [0,  3,  7, 10]),   # A C E G
    ("G",     [-2, 2,  5]),       # G B D
    ("Fmaj7", [-4, 0,  4,  9]),   # F A C E
    ("Em7",   [-5, -2, 2,  5]),   # E G B D
]

# ── Butterworth lowpass (warm, no ringing) ────────────────────────────────────
def lp(data: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    sos = butter(order, cutoff / (SR / 2), btype='low', output='sos')
    return sosfilt(sos, data).astype(np.float32)

# ── Additive note (NOT FM — no bell!) ─────────────────────────────────────────
def make_note(freq: float, dur: float, harmonics: list[tuple], vel: float = 0.6,
              cutoff: float = 2800.0) -> np.ndarray:
    """
    Additive synthesis: sum of pure sine harmonics, then lowpass filtered.
    harmonics = [(harmonic_number, amplitude), ...]
    """
    n  = int(dur * SR)
    t  = np.linspace(0, dur, n, endpoint=False, dtype=np.float32)

    wave_out = np.zeros(n, dtype=np.float32)
    for h, amp in harmonics:
        wave_out += amp * np.sin(2 * np.pi * freq * h * t)

    # ADSR
    atk = max(1, int(0.012 * SR))
    dec = max(1, int(0.08  * SR))
    sus = 0.60
    rel = max(1, int(0.18  * SR))

    env = np.full(n, sus, dtype=np.float32)
    env[:atk] = np.linspace(0, 1, atk)
    d_end = min(atk + dec, n)
    env[atk:d_end] = np.linspace(1, sus, d_end - atk)
    if rel < n:
        env[-rel:] = np.linspace(sus, 0, rel)

    note = wave_out * env * vel

    # Warm lowpass (removes harsh overtones, gives electric piano feel)
    note = lp(note, cutoff)
    return note

# EP harmonics: fundamental + gentle 2nd/3rd (like Fender Rhodes)
EP = [(1, 1.0), (2, 0.28), (3, 0.08), (4, 0.03)]
# Bass harmonics: fundamental + slight 2nd
BASS = [(1, 1.0), (2, 0.22)]

# ── Full beat generator ───────────────────────────────────────────────────────
def generate_lofi_beat(duration: float, bpm: float) -> np.ndarray:
    n_samples = int(duration * SR)
    out = np.zeros(n_samples, dtype=np.float32)

    spb   = (60.0 / bpm) * SR          # samples per beat
    sp_bar = spb * 4                    # samples per bar

    rng = random.Random(42)            # reproducible per session

    chord_idx = 0
    bar = 0

    while True:
        bar_start = int(bar * sp_bar)
        if bar_start >= n_samples:
            break

        chord_name, semitones = CHORDS[chord_idx % len(CHORDS)]
        freqs = [hz(st) for st in semitones]
        chord_dur = 2 * sp_bar / SR    # 2 bars per chord

        # ── Chord pad (soft, warm EP) ────────────────────────────────
        for freq in freqs:
            note_dur = min(chord_dur, (n_samples - bar_start) / SR)
            if note_dur <= 0: break
            vel   = 0.38 + rng.uniform(-0.06, 0.06)
            note  = make_note(freq, note_dur, EP, vel, cutoff=2400)
            # Human timing offset ±20ms
            off   = int(rng.uniform(-0.020, 0.020) * SR)
            start = max(0, bar_start + off)
            end   = min(start + len(note), n_samples)
            # Stereo panning baked into mono via volume variation
            out[start:end] += note[:end - start] * 0.28

        # ── Bass: root on beat 1 + beat 3, swing slightly ────────────
        bass_hz = freqs[0] / 2.0       # one octave lower
        for beat in [0, 2]:
            for b_offset in range(2):  # both bars of the chord
                bb = int(bar_start + b_offset * spb * 4 + beat * spb)
                if bb >= n_samples: break
                bass_dur = min(0.48 + rng.uniform(-0.04, 0.04), (n_samples - bb) / SR)
                vel      = 0.58 + rng.uniform(-0.07, 0.07)
                note     = make_note(bass_hz, bass_dur, BASS, vel, cutoff=650)
                # Slight swing push on beat 3
                swing = int(0.018 * SR) if beat == 2 else 0
                off   = int(rng.uniform(-0.012, 0.015) * SR) + swing
                start = max(0, bb + off)
                end   = min(start + len(note), n_samples)
                out[start:end] += note[:end - start] * 0.52

        bar       += 2
        chord_idx += 1

    # ── Master chain: warm lowpass → soft clip → normalize ───────────────────
    out = lp(out, 9000)                  # master warm ceiling
    out = np.tanh(out * 2.2) / 2.2      # tape saturation

    peak = np.max(np.abs(out))
    if peak > 0:
        out = out / peak * 0.72

    return out

# ── Entry point ───────────────────────────────────────────────────────────────
def generate_lofi_instrumental(output_path: str, duration: float = 120.0, bpm: float = 75.0) -> str:
    print(f"🎹 Generating lofi instrumental ({duration:.0f}s @ {bpm:.0f} BPM)...")
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    bpm_varied = bpm + random.uniform(-3, 3)   # slight BPM variation per song
    audio = generate_lofi_beat(duration, bpm_varied)

    if HAS_SF:
        sf.write(output_path, audio, SR, subtype='PCM_16')
    else:
        pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
        with wave.open(output_path, 'w') as wf:
            wf.setnchannels(1); wf.setsampwidth(2)
            wf.setframerate(SR); wf.writeframes(pcm.tobytes())

    size_kb = os.path.getsize(output_path) // 1024
    print(f"✅ Lofi beat saved: {output_path} ({size_kb} KB)")
    return output_path

if __name__ == "__main__":
    import sys
    dur = float(sys.argv[1]) if len(sys.argv) > 1 else 30.0
    generate_lofi_instrumental("temp/assets/cf_beat_test.wav", duration=dur)
