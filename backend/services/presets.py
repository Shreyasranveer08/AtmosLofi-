from typing import Dict, Any

PRESETS: Dict[str, Dict[str, Any]] = {
    "Late Night Coding": {
        "bpm_reduction": 0.95,  # 5% slower
        "cutoff_hz": 6000,
        "reverb_mix": 0.2,
        "noise_type": "lofi_crackle_1.wav",
        "noise_volume": 0.15,
        "compression_threshold": -15
    },
    "Rainy Cafe": {
        "bpm_reduction": 0.92,
        "cutoff_hz": 5000,
        "reverb_mix": 0.3,
        "noise_type": "rain_cafe.wav",
        "noise_volume": 0.25,
        "compression_threshold": -12
    },
    "Deep Focus": {
        "bpm_reduction": 0.97,
        "cutoff_hz": 7000,
        "reverb_mix": 0.1,
        "noise_type": "subtle_crackle.wav",
        "noise_volume": 0.1,
        "compression_threshold": -10
    },
    "Heartbreak": {
        "bpm_reduction": 0.90,
        "cutoff_hz": 4000,
        "reverb_mix": 0.5,
        "noise_type": "heavy_vinyl.wav",
        "noise_volume": 0.3,
        "compression_threshold": -18
    },
    "Space Drift": {
        "bpm_reduction": 0.88,
        "cutoff_hz": 4500,
        "reverb_mix": 0.6,
        "noise_type": "space_static.wav",
        "noise_volume": 0.15,
        "compression_threshold": -14
    },
    "Study Mode": {
        "bpm_reduction": 0.95,
        "cutoff_hz": 6500,
        "reverb_mix": 0.15,
        "noise_type": "white_noise.wav",
        "noise_volume": 0.1,
        "compression_threshold": -8
    }
}

def get_preset_params(preset_name: str) -> Dict[str, Any]:
    return PRESETS.get(preset_name, PRESETS["Late Night Coding"])
