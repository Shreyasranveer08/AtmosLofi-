'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface VHSOverlayProps {
    active?: boolean;
    vibe?: 'classic' | 'cyberpunk' | 'late-night';
    intensity?: number;
}

export default function VHSOverlay({ active = true, vibe = 'classic', intensity = 0.05 }: VHSOverlayProps) {
    const [timestamp, setTimestamp] = useState('');

    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTimestamp(now.toLocaleTimeString('en-US', { hour12: false }));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!active) return null;

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1] select-none">
            {/* ── Scanlines ── */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />

            {/* ── Film Grain / Noise ── */}
            <motion.div
                animate={{
                    x: ['-5%', '5%', '-2%', '0%', '4%', '-5%'],
                    y: ['2%', '-5%', '3%', '-2%', '5%', '2%']
                }}
                transition={{ duration: 0.2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-[-20%] opacity-[0.04] bg-[url('https://res.cloudinary.com/dlb792sua/image/upload/v1675866172/noise_p0xkty.png')] bg-repeat"
            />

            {/* ── Chromatic Aberration Shift ── */}
            {vibe === 'cyberpunk' && (
                <div className="absolute inset-0 mix-blend-screen opacity-10 blur-[0.5px]">
                    <div className="absolute inset-0 bg-red-500/10 translate-x-[1px]" />
                    <div className="absolute inset-0 bg-blue-500/10 -translate-x-[1px]" />
                </div>
            )}

            {/* ── Retro HUD ── */}
            <div className="absolute top-8 left-8 font-mono text-white/40 tracking-widest text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500/40 animate-pulse" />
                    <span>REC</span>
                </div>
                <div className="mt-2 text-xs opacity-60">
                    {vibe.toUpperCase()} MODE
                </div>
            </div>

            <div className="absolute top-8 right-8 font-mono text-white/40 tracking-widest text-sm">
                <div>PLAY ▷</div>
                <div className="mt-1 tabular-nums">{timestamp}</div>
            </div>

            <div className="absolute bottom-8 left-8 font-mono text-[10px] text-white/20 tracking-wider">
                ATMOS_LOFI_V14.5_STABLE
            </div>

            {/* ── Random Glitch Bar ── */}
            <motion.div
                initial={{ opacity: 0, top: '-10%' }}
                animate={{
                    top: ['-10%', '110%'],
                    opacity: [0, 0.2, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatDelay: 8,
                    ease: 'linear'
                }}
                className="absolute left-0 right-0 h-[2px] bg-white/20 blur-[1px]"
            />
        </div>
    );
}
