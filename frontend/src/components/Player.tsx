'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Download,
    Music2, RotateCcw, Repeat, Repeat1, Share2, Check,
    Headphones, Speaker, Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WaveSurfer from 'wavesurfer.js';
import { useAuth } from '@/context/AuthContext';

interface PlayerProps {
    audioUrl: string;
    taskId: string;
    vibe?: 'classic' | 'cyberpunk' | 'late-night';
    onVibeChange?: (v: 'classic' | 'cyberpunk' | 'late-night') => void;
    onRequireAuth?: () => void;
}


/* ─── EQ Profiles ────────────────────────────────────────────────────── */
interface EqBand { type: BiquadFilterType; freq: number; gain: number; Q?: number; }

const EQ_HEADPHONES: EqBand[] = [
    { type: 'lowshelf', freq: 80, gain: 3.5 },   // warm sub-bass boost
    { type: 'peaking', freq: 250, gain: 1.5 },   // body / warmth
    { type: 'peaking', freq: 3000, gain: 2.0 },   // vocal presence
    { type: 'highshelf', freq: 9000, gain: -1.5 },   // tame harshness in ear
];

const EQ_SPEAKERS: EqBand[] = [
    { type: 'lowshelf', freq: 120, gain: -2.0 },   // cut room boom
    { type: 'peaking', freq: 500, gain: 1.0 },   // add warmth for distance
    { type: 'peaking', freq: 2000, gain: 1.5 },   // clarity & intelligibility
    { type: 'highshelf', freq: 8000, gain: 1.0 },   // air / presence at distance
];

type OutputMode = 'headphones' | 'speakers';
const STORAGE_KEY = 'atmoslofi_output_mode';

/* ─── Device Detection ───────────────────────────────────────────────── */
async function detectOutputMode(): Promise<OutputMode> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY) as OutputMode | null;
        if (saved) return saved;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices.filter(d => d.kind === 'audiooutput');
        const headphonePattern = /headphone|headset|earphone|earbuds|airpod|wired|in-ear|bluetooth/i;
        const hasHeadphones = outputs.some(d => headphonePattern.test(d.label));
        return hasHeadphones ? 'headphones' : 'speakers';
    } catch {
        return 'speakers'; // fallback
    }
}

export default function Player({ audioUrl, taskId, vibe = 'classic', onVibeChange, onRequireAuth }: PlayerProps) {
    const { user } = useAuth();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1.0);
    const [isReady, setIsReady] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [copied, setCopied] = useState(false);
    const [outputMode, setOutputMode] = useState<OutputMode>('speakers');
    const [modeDetected, setModeDetected] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const eqNodesRef = useRef<BiquadFilterNode[]>([]);
    const rafRef = useRef<number>(0);
    const loopRef = useRef(false);
    const playingRef = useRef(false);

    const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

    /* ── Apply EQ profile to existing nodes ── */
    const applyEq = useCallback((mode: OutputMode) => {
        const profile = mode === 'headphones' ? EQ_HEADPHONES : EQ_SPEAKERS;
        eqNodesRef.current.forEach((node, i) => {
            if (profile[i]) {
                node.type = profile[i].type;
                node.frequency.value = profile[i].freq;
                node.gain.value = profile[i].gain;
            }
        });
    }, []);

    /* ── Toggle output mode ── */
    const switchMode = (mode: OutputMode) => {
        setOutputMode(mode);
        localStorage.setItem(STORAGE_KEY, mode);
        applyEq(mode);
    };

    /* ── Canvas Visualizer ── */
    const drawVisualizer = useCallback(() => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufLen = analyser.frequencyBinCount;
        const data = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const BAR_COUNT = 64;
        const barW = (W / BAR_COUNT) - 1.5;
        const step = Math.floor(bufLen / BAR_COUNT);

        for (let i = 0; i < BAR_COUNT; i++) {
            const raw = data[i * step] ?? 0;
            const val = playingRef.current
                ? raw
                : 14 + Math.sin(Date.now() / 600 + i * 0.4) * 12;

            const barH = Math.max(3, (val / 255) * H * 0.92);
            const x = i * (barW + 1.5);
            const brightness = val / 255;
            const alpha = playingRef.current ? 0.4 + brightness * 0.6 : 0.25;

            // v14: Sync visualizer color with Vibe
            if (vibe === 'cyberpunk') {
                ctx.fillStyle = i % 2 === 0
                    ? `rgba(34,211,238,${alpha})`
                    : `rgba(244,114,182,${alpha})`;
            } else if (vibe === 'late-night') {
                ctx.fillStyle = `rgba(148,163,184,${alpha})`;
            } else {
                ctx.fillStyle = `rgba(${Math.round(99 + brightness * 50)},${Math.round(102 * (1 - brightness * 0.3))},${Math.round(241 - brightness * 30)},${alpha})`;
            }

            ctx.beginPath();
            ctx.roundRect(x, H / 2 - barH / 2, barW, barH, 2);
            ctx.fill();
        }
        rafRef.current = requestAnimationFrame(drawVisualizer);
    }, []);

    /* ── WaveSurfer setup ── */
    useEffect(() => {
        if (!containerRef.current) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: 'rgba(255,255,255,0.06)', progressColor: 'rgba(99,102,241,0.5)',
            cursorColor: 'transparent', barWidth: 2, barRadius: 2, barGap: 1.5,
            height: 0, normalize: true,
        });

        const separator = audioUrl.includes('?') ? '&' : '?';
        ws.load(`${audioUrl}${separator}t=${Date.now()}`).catch(e => { if (e.name !== 'AbortError') console.error(e); });
        wavesurferRef.current = ws;

        ws.on('ready', async () => {
            setDuration(ws.getDuration());
            setIsReady(true);

            // ── Detect output mode ──
            const mode = await detectOutputMode();
            setOutputMode(mode);
            setModeDetected(true);

            // ── Build Web Audio chain: source → EQ filters → analyser → dest ──
            try {
                const media = (ws as any).media as HTMLMediaElement;
                const audioCtx = new AudioContext();
                const source = audioCtx.createMediaElementSource(media);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 128;

                // Build EQ band nodes
                const profile = mode === 'headphones' ? EQ_HEADPHONES : EQ_SPEAKERS;
                const eqNodes: BiquadFilterNode[] = profile.map(band => {
                    const f = audioCtx.createBiquadFilter();
                    f.type = band.type;
                    f.frequency.value = band.freq;
                    f.gain.value = band.gain;
                    if (band.Q !== undefined) f.Q.value = band.Q;
                    return f;
                });
                eqNodesRef.current = eqNodes;

                // Chain: source → eq[0] → eq[1] → ... → analyser → destination
                source.connect(eqNodes[0]);
                for (let i = 0; i < eqNodes.length - 1; i++) {
                    eqNodes[i].connect(eqNodes[i + 1]);
                }
                eqNodes[eqNodes.length - 1].connect(analyser);
                analyser.connect(audioCtx.destination);

                analyserRef.current = analyser;
                audioCtxRef.current = audioCtx;
                rafRef.current = requestAnimationFrame(drawVisualizer);

                // Listen for device changes
                navigator.mediaDevices?.addEventListener?.('devicechange', async () => {
                    const newMode = await detectOutputMode();
                    setOutputMode(newMode);
                    applyEq(newMode);
                });
            } catch (e) { console.warn('Web Audio API not available:', e); }
        });

        ws.on('play', () => { setIsPlaying(true); playingRef.current = true; });
        ws.on('pause', () => { setIsPlaying(false); playingRef.current = false; });
        ws.on('finish', () => {
            if (loopRef.current) { ws.seekTo(0); ws.play(); }
            else { setIsPlaying(false); playingRef.current = false; }
        });
        ws.on('audioprocess', () => setCurrent(ws.getCurrentTime()));

        return () => {
            cancelAnimationFrame(rafRef.current);
            audioCtxRef.current?.close();
            ws.destroy();
        };
    }, [audioUrl, drawVisualizer, applyEq]);

    /* ── Canvas resize ── */
    useEffect(() => {
        const resize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const togglePlay = async () => {
        if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
        wavesurferRef.current?.playPause();
    };
    const restart = async () => {
        if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
        wavesurferRef.current?.seekTo(0);
        wavesurferRef.current?.play();
    };
    const toggleLoop = () => { loopRef.current = !isLooping; setIsLooping(l => !l); };
    const toggleMute = () => { wavesurferRef.current?.setMuted(!isMuted); setIsMuted(m => !m); };
    const handleVolume = (v: number) => {
        setVolume(v); wavesurferRef.current?.setVolume(v);
        if (v === 0) setIsMuted(true); else if (isMuted) setIsMuted(false);
    };
    const handleShare = async () => {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${API}/api/download/${taskId}?format=mp3`;
        try { await navigator.clipboard.writeText(url); }
        catch { const el = Object.assign(document.createElement('input'), { value: url }); document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
        setCopied(true); setTimeout(() => setCopied(false), 2500);
    };

    const handleDownload = (fmt: string) => {
        if (!user) {
            if (onRequireAuth) onRequireAuth();
            else alert("Please sign in to download tracks.");
            return;
        }
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const url = `${API}/api/download/${taskId}?format=${fmt}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `AtmosLofi_${taskId}.${fmt}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };


    const DL_BTNS = [
        { fmt: 'mp3', label: 'MP3', style: 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' },
        { fmt: 'wav', label: 'WAV', style: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white' },
        { fmt: 'mp4', label: 'MP4', style: 'bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 text-purple-300' },
    ];

    const modeLabels = {
        headphones: { label: 'Earphones', icon: Headphones, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25', tip: 'Bass boosted · Vocal presence enhanced · Ear-safe highs' },
        speakers: { label: 'Speakers', icon: Speaker, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25', tip: 'Room-balanced · Clarity boosted · Natural depth' },
    };
    const m = modeLabels[outputMode];

    return (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto glass rounded-3xl p-6 shadow-[0_32px_64px_rgba(0,0,0,0.5)]"
        >
            {/* Track info row */}
            <div className="flex items-center gap-3 mb-4">
                <motion.div animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: 'linear' }}
                    className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                    <Music2 size={16} className="text-indigo-400" />
                </motion.div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-white/90">Your Lofi Track</p>
                    <p className="text-xs text-white/30">AtmosLofi · {fmt(duration)} · 320kbps</p>
                </div>
                {isPlaying && (
                    <div className="flex items-center gap-1">
                        {[0, 1, 2].map(i => (
                            <motion.div key={i} animate={{ scaleY: [1, 1.8, 1] }}
                                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                                className="w-0.5 h-3 bg-indigo-400 rounded-full origin-bottom" />
                        ))}
                    </div>
                )}
                <motion.button onClick={handleShare} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                    className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all" title="Copy link">
                    <AnimatePresence mode="wait">
                        {copied
                            ? <motion.div key="chk" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={13} className="text-emerald-400" /></motion.div>
                            : <motion.div key="shr" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Share2 size={13} className="text-white/40" /></motion.div>}
                    </AnimatePresence>
                </motion.button>
            </div>

            {/* ── Output Mode & Vibe Selector ── */}
            <AnimatePresence>
                {modeDetected && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden flex flex-col gap-2">

                        {/* Output Mode (Earphones/Speakers) */}
                        <div className={`flex items-center gap-3 p-2.5 rounded-xl border ${m.bg} transition-all`}>
                            <div className="flex items-center gap-1 flex-1">
                                <m.icon size={13} className={m.color} />
                                <span className={`text-[11px] font-semibold ${m.color}`}>{m.label} Mode</span>
                                <span className="text-[10px] text-white/20 ml-1">· {m.tip}</span>
                            </div>
                            <div className="flex gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
                                {(['headphones', 'speakers'] as const).map(mode => {
                                    const Icon = modeLabels[mode].icon;
                                    return (
                                        <button key={mode} onClick={() => switchMode(mode)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all
                                                ${outputMode === mode ? `${modeLabels[mode].bg} ${modeLabels[mode].color}` : 'text-white/25 hover:text-white/50'}`}>
                                            <Icon size={10} />{mode === 'headphones' ? '🎧' : '🔊'}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Vibe Selector (Classic/Cyberpunk/Late-Night) */}
                        <div className="flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-1 flex-1">
                                <Sparkles size={11} className="text-white/40" />
                                <span className="text-[11px] font-semibold text-white/50">Visual Vibe</span>
                            </div>
                            <div className="flex gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
                                {([
                                    { id: 'classic', label: 'Classic', icon: '🎨' },
                                    { id: 'cyberpunk', label: 'Retro-Tech', icon: '⚡' },
                                    { id: 'late-night', label: 'Rainy Night', icon: '🌧️' }
                                ] as const).map(v => (
                                    <button key={v.id} onClick={() => onVibeChange?.(v.id)}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all
                                            ${vibe === v.id
                                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                                : 'text-white/25 hover:text-white/50'}`}>
                                        {v.icon} {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── CANVAS FREQUENCY VISUALIZER ── */}
            <div className="relative w-full h-20 mb-3 rounded-xl overflow-hidden bg-white/[0.02] border border-white/[0.05]">
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map(i => (
                                <motion.div key={i} animate={{ scaleY: [1, 2, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                    className="w-1 h-4 bg-white/10 rounded-full" />
                            ))}
                        </div>
                    </div>
                )}
                <canvas ref={canvasRef} className={`w-full h-full transition-opacity duration-500 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                    style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Hidden WaveSurfer */}
            <div ref={containerRef} className="hidden" />

            {/* Time bar */}
            <div className="mb-4">
                <div className="flex justify-between text-[10px] font-mono text-white/25 mb-1.5">
                    <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
                </div>
                <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden cursor-pointer"
                    onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        wavesurferRef.current?.seekTo((e.clientX - rect.left) / rect.width);
                    }}>
                    <motion.div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
                <motion.button onClick={restart} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!isReady}
                    className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all disabled:opacity-30">
                    <RotateCcw size={13} />
                </motion.button>
                <motion.button onClick={togglePlay} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} disabled={!isReady} className="relative w-12 h-12 shrink-0">
                    {isPlaying && <span className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" style={{ animationDuration: '2s' }} />}
                    <span className="relative w-12 h-12 bg-indigo-500 hover:bg-indigo-400 rounded-full flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-colors">
                        {isPlaying ? <Pause fill="white" size={18} /> : <Play fill="white" size={18} className="ml-0.5" />}
                    </span>
                </motion.button>
                <motion.button onClick={toggleLoop} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} disabled={!isReady}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all disabled:opacity-30
                        ${isLooping ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40 hover:text-white/70'}`}>
                    {isLooping ? <Repeat1 size={13} /> : <Repeat size={13} />}
                </motion.button>
                <div className="flex items-center gap-2 flex-1">
                    <button onClick={toggleMute} className="text-white/30 hover:text-white/70 transition-colors shrink-0">
                        {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume}
                        onChange={e => handleVolume(parseFloat(e.target.value))}
                        className="flex-1" style={{ accentColor: '#6366f1' }} />
                </div>
                <div className="flex gap-1.5 shrink-0">
                    {DL_BTNS.map(b => (
                        <button key={b.fmt} onClick={() => handleDownload(b.fmt)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${b.style}`}>
                            <Download size={11} />{b.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {isLooping && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-center text-[10px] text-indigo-400/60 mt-3 flex items-center justify-center gap-1">
                        <Repeat1 size={9} /> Looping enabled
                    </motion.p>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
