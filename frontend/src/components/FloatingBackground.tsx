'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/*
 * FloatingBackground — Advanced animated music scene
 * All elements are pure SVG/CSS — inherently transparent, no black box issue.
 * Mouse-tracking parallax with 3 depth layers (near/mid/far).
 */

// ── Mouse parallax hook ──────────────────────────────────────────────────────
function useMouseParallax(strength: number) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 55, damping: 18 });
    const sy = useSpring(y, { stiffness: 55, damping: 18 });
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
            x.set(((e.clientX - cx) / cx) * strength);
            y.set(((e.clientY - cy) / cy) * strength);
        };
        window.addEventListener('mousemove', fn);
        return () => window.removeEventListener('mousemove', fn);
    }, [strength, x, y]);
    return { x: sx, y: sy };
}

// ── Particles ────────────────────────────────────────────────────────────────
interface Particle { id: number; x: number; y: number; size: number; dur: number; delay: number; }
const PARTICLES: Particle[] = Array.from({ length: 32 }, (_, i) => ({
    id: i, x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100,
    size: (i % 3) + 0.8, dur: 5 + (i % 7), delay: (i * 0.4) % 8,
}));

// ── SVG Components ───────────────────────────────────────────────────────────

/** Detailed glowing headphones */
function HeadphonesSVG({ size = 140, color = '#818cf8', glow = '#6366f1' }: { size?: number; color?: string; glow?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id={`hpGlow${size}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id={`hpGrad${size}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                    <stop offset="100%" stopColor={glow} stopOpacity="0.4" />
                </radialGradient>
            </defs>
            {/* Band */}
            <path d="M20 50 Q20 18 50 18 Q80 18 80 50" stroke={color} strokeWidth="5" strokeLinecap="round" fill="none" filter={`url(#hpGlow${size})`} />
            {/* Left ear cup */}
            <rect x="8" y="48" width="18" height="26" rx="8" fill={glow} opacity="0.7" filter={`url(#hpGlow${size})`} />
            <rect x="11" y="51" width="12" height="20" rx="6" fill={color} opacity="0.5" />
            {/* Right ear cup */}
            <rect x="74" y="48" width="18" height="26" rx="8" fill={glow} opacity="0.7" filter={`url(#hpGlow${size})`} />
            <rect x="77" y="51" width="12" height="20" rx="6" fill={color} opacity="0.5" />
            {/* Cord detail */}
            <line x1="50" y1="80" x2="50" y2="92" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            <circle cx="50" cy="93" r="2.5" fill={color} opacity="0.6" />
            {/* Glow orb behind */}
            <circle cx="50" cy="62" r="32" fill={glow} opacity="0.06" />
        </svg>
    );
}

/** Vinyl record with grooves */
function VinylSVG({ size = 120, color = '#a855f7', glow = '#818cf8' }: { size?: number; color?: string; glow?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <radialGradient id={`vGrad${size}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                    <stop offset="60%" stopColor={glow} stopOpacity="0.08" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.04" />
                </radialGradient>
                <filter id={`vGlow${size}`} x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Body */}
            <circle cx="50" cy="50" r="47" fill={`url(#vGrad${size})`} stroke={color} strokeWidth="1.2" opacity="0.6" />
            {/* Grooves */}
            {[38, 30, 22, 14].map((r, i) => (
                <circle key={r} cx="50" cy="50" r={r} stroke={color} strokeWidth="0.6" opacity={0.1 + i * 0.06} fill="none" />
            ))}
            {/* Label circle */}
            <circle cx="50" cy="50" r="12" fill={color} opacity="0.25" filter={`url(#vGlow${size})`} />
            <circle cx="50" cy="50" r="8" fill={color} opacity="0.40" />
            {/* Center hole */}
            <circle cx="50" cy="50" r="2.5" fill="white" opacity="0.6" />
            {/* Outer glow ring */}
            <circle cx="50" cy="50" r="46" stroke={glow} strokeWidth="0.8" opacity="0.35" filter={`url(#vGlow${size})`} fill="none" />
            {/* Light streak */}
            <path d="M 68 20 Q 75 35 72 50" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.12" fill="none" />
        </svg>
    );
}

/** Musical eighth notes */
function EighthNotesSVG({ size = 55, color = '#818cf8' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id={`nGlow${size}`} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {/* Beamed eighth notes */}
            <line x1="18" y1="48" x2="18" y2="16" stroke={color} strokeWidth="3" strokeLinecap="round" filter={`url(#nGlow${size})`} />
            <line x1="38" y1="44" x2="38" y2="12" stroke={color} strokeWidth="3" strokeLinecap="round" filter={`url(#nGlow${size})`} />
            {/* Beam */}
            <line x1="18" y1="16" x2="38" y2="12" stroke={color} strokeWidth="3" strokeLinecap="round" filter={`url(#nGlow${size})`} />
            <line x1="18" y1="22" x2="38" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" filter={`url(#nGlow${size})`} opacity="0.6" />
            {/* Note heads */}
            <ellipse cx="15" cy="49" rx="6" ry="4.5" fill={color} transform="rotate(-10 15 49)" filter={`url(#nGlow${size})`} />
            <ellipse cx="35" cy="45" rx="6" ry="4.5" fill={color} transform="rotate(-10 35 45)" filter={`url(#nGlow${size})`} />
        </svg>
    );
}

/** Sound wave visualization */
function WaveformSVG({ color = '#6366f1' }: { color?: string }) {
    const bars = [12, 28, 45, 60, 48, 32, 55, 42, 20, 38, 52, 24, 44, 30, 50];
    return (
        <svg width="130" height="50" viewBox="0 0 130 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="wGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>
            {bars.map((h, i) => (
                <rect key={i} x={i * 8.5 + 2} y={(50 - h) / 2} width="5" height={h} rx="2.5"
                    fill={color} opacity={0.4 + (i % 3) * 0.15} filter="url(#wGlow)" />
            ))}
        </svg>
    );
}

/** Simple quarter note */
function QuarterNote({ size = 32, color = '#a5b4fc' }: { size?: number; color?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="36" x2="20" y2="6" stroke={color} strokeWidth="3" strokeLinecap="round" />
            <path d="M20 6 L29 9 L29 15 L20 12 Z" fill={color} />
            <ellipse cx="15" cy="36" rx="8" ry="5.5" fill={color} transform="rotate(-15 15 36)" opacity="0.9" />
        </svg>
    );
}

// ── Weather Particles ────────────────────────────────────────────────────────
interface WeatherDot { id: number; x: number; y: number; speed: number; opacity: number; }
const WEATHER_COUNT = 40;
const RAIN: WeatherDot[] = Array.from({ length: WEATHER_COUNT }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    speed: 0.8 + Math.random() * 1.5, opacity: 0.1 + Math.random() * 0.3
}));

// ── Main Component ────────────────────────────────────────────────────────────
interface FloatingBackgroundProps {
    vibe?: 'classic' | 'cyberpunk' | 'late-night';
}

export default function FloatingBackground({ vibe = 'classic' }: FloatingBackgroundProps) {
    const near = useMouseParallax(32);
    const mid = useMouseParallax(16);
    const far = useMouseParallax(7);

    const isRain = vibe === 'late-night';
    const isGlitch = vibe === 'cyberpunk';

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">

            {/* ── Gradient Orbs ── */}
            <motion.div style={{ x: far.x, y: far.y }} className="absolute inset-0">
                <div className={`absolute top-[-8%] left-[-5%] w-[55vw] h-[55vw] rounded-full blur-[130px] transition-colors duration-1000 
                    ${vibe === 'cyberpunk' ? 'bg-cyan-600/10' : vibe === 'late-night' ? 'bg-blue-900/20' : 'bg-indigo-700/10'}`} />
                <div className={`absolute bottom-[-12%] right-[-4%] w-[50vw] h-[50vw] rounded-full blur-[140px] transition-colors duration-1000
                    ${vibe === 'cyberpunk' ? 'bg-fuchsia-700/10' : vibe === 'late-night' ? 'bg-slate-900/30' : 'bg-purple-700/8'}`} />
            </motion.div>

            {/* ── Rain / Snow Layer ── */}
            {isRain && (
                <div className="absolute inset-0">
                    {RAIN.map(r => (
                        <motion.div
                            key={r.id}
                            className="absolute w-[1px] h-8 bg-blue-400/20 blur-[0.5px]"
                            style={{ left: `${r.x}%`, top: '-10%' }}
                            animate={{ top: ['0%', '110%'] }}
                            transition={{ duration: r.speed, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
                        />
                    ))}
                </div>
            )}

            {/* ── Star Particles ── */}
            <motion.div style={{ x: far.x, y: far.y }} className="absolute inset-0">
                {PARTICLES.map(p => (
                    <motion.div key={p.id} className="absolute rounded-full bg-white"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
                        animate={{
                            opacity: [0.06, 0.38, 0.06],
                            scale: isGlitch ? [1, 2.5, 0.5, 1] : [1, 1.4, 1],
                            x: isGlitch ? [0, 10, -10, 0] : 0
                        }}
                        transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
                ))}
            </motion.div>

            {/* ── MAIN HEADPHONES — top left, large ── */}
            <motion.div style={{ x: near.x, y: near.y }} className="absolute top-[3%] left-[-1%]">
                <motion.div
                    animate={{
                        y: [0, -24, 0],
                        rotate: [-5, 4, -5],
                        filter: isGlitch ? ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(0deg)'] : 'hue-rotate(0deg)'
                    }}
                    transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
                    <motion.div animate={{ opacity: [0.45, 0.70, 0.45] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                        <HeadphonesSVG size={180} color={vibe === 'cyberpunk' ? '#22d3ee' : '#a5b4fc'} glow={vibe === 'cyberpunk' ? '#0891b2' : '#6366f1'} />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ... Rest of the background elements updated with vibe colors ... */}

            {/* ── VINYL — top right, large, spinning ── */}
            <motion.div style={{ x: mid.x, y: mid.y }} className="absolute top-[0%] right-[3%]">
                <motion.div
                    animate={{ rotate: 360, y: [0, -14, 0] }}
                    transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, y: { duration: 9, repeat: Infinity, ease: 'easeInOut' } }}
                >
                    <motion.div animate={{ opacity: [0.38, 0.58, 0.38] }} transition={{ duration: 5, repeat: Infinity }}>
                        <VinylSVG size={170} color={vibe === 'late-night' ? '#475569' : '#a855f7'} glow={vibe === 'late-night' ? '#1e293b' : '#818cf8'} />
                    </motion.div>
                </motion.div>
            </motion.div>

            {/* ── EIGHTH NOTES — scattered ── */}
            <motion.div style={{ x: near.x, y: near.y }} className="absolute top-[14%] left-[28%]">
                <motion.div animate={{ y: [0, -22, 0], opacity: [0.30, 0.55, 0.30], rotate: [-5, 8, -5] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }}>
                    <EighthNotesSVG size={60} color={isRain ? '#3b82f6' : '#818cf8'} />
                </motion.div>
            </motion.div>

            {/* ── WAVEFORMS ── */}
            <motion.div style={{ x: far.x, y: far.y }} className="absolute bottom-[18%] left-[12%]">
                <motion.div animate={{ y: [0, -10, 0], opacity: [0.18, 0.38, 0.18] }} transition={{ duration: 7, repeat: Infinity, delay: 3.5 }}>
                    <WaveformSVG color={vibe === 'cyberpunk' ? '#f472b6' : '#818cf8'} />
                </motion.div>
            </motion.div>

            {/* ── Center ambient glow ── */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[40vh] rounded-full blur-[120px] transition-colors duration-1000
                ${vibe === 'late-night' ? 'bg-slate-800/20' : 'bg-indigo-600/4'}`} />
        </div>
    );
}
