import os
import math
import wave
import struct
import random

def generate_boombap_drums(filepath="temp/assets/drum_loop.wav", duration=60, bpm=75):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    sample_rate = 44100
    num_samples = int(duration * sample_rate)
    
    # Calculate samples per beat
    samples_per_beat = int((60.0 / bpm) * sample_rate)
    samples_per_16th = int(samples_per_beat / 4)
    
    audio_data = bytearray()
    
    last_noise = 0.0
    for i in range(num_samples):
        # Current 16th note step (0 to 15)
        step = int((i % (samples_per_beat * 4)) / samples_per_16th)
        
        sample = 0.0
        
        # BOOM-BAP KICK (Steps 0, 8, 10 - syncopated) - Deep, punchy, vintage
        step_time_kick = (i % samples_per_16th) / sample_rate
        if step in [0, 8, 10]:
            env = max(0, 1.0 - (step_time_kick * 12.0)) # Slightly slower decay for "boom"
            freq = 80.0 * env + 40.0 
            val = math.sin(2 * math.pi * freq * step_time_kick) * env
            # Soft saturation instead of hard clipping
            sample += math.tanh(val * 1.5) * 0.9 
            
        # BOOM-BAP SNARE (Steps 4, 12) - Crunchy, dusty
        step_time_snare = (i % samples_per_16th) / sample_rate
        if step in [4, 12]:
            # Lofi Snare: Dusty noise with a very soft decay
            env = max(0, 1.0 - (step_time_snare * 8.0))
            # REAL 1-POLE LOWPASS for snare noise (Removes metallic artifacts)
            raw_noise = random.uniform(-1, 1)
            alpha = 0.12 # Cutoff factor
            noise_filtered = raw_noise * alpha + last_noise * (1.0 - alpha)
            last_noise = noise_filtered
            
            body = math.sin(2 * math.pi * 200 * step_time_snare) * env
            sample += (noise_filtered * 0.35 + body * 0.25) * 0.8
            
        # VINTAGE HI-HAT (All 8th notes) - REMOVED per user feedback (Excessive Cymbals)
        # ... (hats logic stays removed) ...

        # Clamp and quantize to 16-bit
        # Soft tape saturation
        sample = math.tanh(sample)
        
        val_int = int(sample * 32767)
        audio_data.extend(struct.pack('<h', val_int))
        
    with wave.open(filepath, 'w') as obj:
        obj.setnchannels(1) # Mono
        obj.setsampwidth(2) # 16-bit
        obj.setframerate(sample_rate)
        obj.writeframes(audio_data)
        
def np_clip(val):
    return max(-1.0, min(1.0, val))

if __name__ == "__main__":
    print(f"Generating 60-second Boom-Bap Lofi drum loop at 75 BPM...")
    generate_boombap_drums()
    print("Done: temp/assets/drum_loop.wav")
