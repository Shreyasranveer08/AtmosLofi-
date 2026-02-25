'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Moon, BookOpen, HeartOff, Orbit, Focus, Zap, Sparkles, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
    collection,
    query,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    orderBy
} from 'firebase/firestore';

export const PRESETS = [
    { id: 'Late Night Coding', icon: Moon, desc: 'Slow tempo · deep bass · gentle crackle', color: 'indigo', grad: 'from-indigo-500/20 to-indigo-900/5' },
    { id: 'Rainy Cafe', icon: Coffee, desc: 'Warm mids · soft rain · cozy ambience', color: 'amber', grad: 'from-amber-500/15 to-amber-900/5' },
    { id: 'Deep Focus', icon: Focus, desc: 'Ultra-muted highs · minimal beats', color: 'cyan', grad: 'from-cyan-500/15 to-cyan-900/5' },
    { id: 'Heartbreak', icon: HeartOff, desc: 'Heavy reverb · vinyl distortion · melancholy', color: 'rose', grad: 'from-rose-500/15 to-rose-900/5' },
    { id: 'Space Drift', icon: Orbit, desc: 'Spacious echo · pitch shifted · ethereal', color: 'violet', grad: 'from-violet-500/15 to-violet-900/5' },
    { id: 'Study Mode', icon: BookOpen, desc: 'Balanced lofi · white noise · focus', color: 'emerald', grad: 'from-emerald-500/15 to-emerald-900/5' },
];

const ICON_COLORS: Record<string, string> = {
    indigo: 'bg-indigo-500/20  text-indigo-400',
    amber: 'bg-amber-500/20   text-amber-400',
    cyan: 'bg-cyan-500/20    text-cyan-400',
    rose: 'bg-rose-500/20    text-rose-400',
    violet: 'bg-violet-500/20  text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    purple: 'bg-purple-500/20  text-purple-400',
};

const RING_COLORS: Record<string, string> = {
    indigo: 'border-indigo-500/50  shadow-[0_0_24px_rgba(99,102,241,0.12)]',
    amber: 'border-amber-500/50   shadow-[0_0_24px_rgba(245,158,11,0.12)]',
    cyan: 'border-cyan-500/50    shadow-[0_0_24px_rgba(6,182,212,0.12)]',
    rose: 'border-rose-500/50    shadow-[0_0_24px_rgba(244,63,94,0.12)]',
    violet: 'border-violet-500/50  shadow-[0_0_24px_rgba(167,139,250,0.12)]',
    emerald: 'border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.12)]',
    purple: 'border-purple-500/50  shadow-[0_0_24px_rgba(168,85,247,0.12)]',
};

/* ── Custom Preset Storage ──────────────────────────────────── */
const CUSTOM_KEY = 'atmoslofi_custom_presets';

export interface CustomPreset {
    id: string;   // uuid-ish
    name: string;
    vocalVol: number;
    trackVol: number;
    ambientVol: number;
    reverbAmount: number;
    playbackSpeed: number;
}

export function loadCustomPresets(): CustomPreset[] {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); }
    catch { return []; }
}

export async function saveCustomPreset(p: CustomPreset, uid?: string) {
    if (uid) {
        try {
            await setDoc(doc(db, 'users', uid, 'presets', p.id), p);
            return;
        } catch (error) {
            console.error("Error saving preset to Firestore:", error);
        }
    }
    const list = loadCustomPresets();
    localStorage.setItem(CUSTOM_KEY, JSON.stringify([p, ...list.filter(x => x.id !== p.id)]));
}

export async function deleteCustomPreset(id: string, uid?: string) {
    if (uid) {
        try {
            await deleteDoc(doc(db, 'users', uid, 'presets', id));
            return;
        } catch (error) {
            console.error("Error deleting preset from Firestore:", error);
        }
    }
    const list = loadCustomPresets().filter(x => x.id !== id);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

/* ── Props ───────────────────────────────────────────────────── */
interface PresetSelectorProps {
    selected: string | null;
    onSelect: (id: string) => void;
    onCustomSelect?: (p: CustomPreset) => void;
    disabled: boolean;
    // For the Save-Preset flow, pass current mix values:
    currentMix?: {
        vocalVol: number; trackVol: number;
        ambientVol: number; reverbAmount: number; playbackSpeed: number;
    };
}

export default function PresetSelector({ selected, onSelect, onCustomSelect, disabled, currentMix }: PresetSelectorProps) {
    const { user } = useAuth();
    const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
    const [savingName, setSavingName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    useEffect(() => {
        if (user) {
            const presetsQuery = query(collection(db, 'users', user.uid, 'presets'));
            const unsubscribe = onSnapshot(presetsQuery, (snapshot) => {
                const presetsList = snapshot.docs.map(doc => doc.data() as CustomPreset);
                setCustomPresets(presetsList);
            });
            return () => unsubscribe();
        } else {
            setCustomPresets(loadCustomPresets());
        }
    }, [user]);

    const handleSave = async () => {
        if (!savingName.trim() || !currentMix) return;
        const p: CustomPreset = {
            id: `custom-${Date.now()}`,
            name: savingName.trim().slice(0, 24),
            ...currentMix,
        };
        await saveCustomPreset(p, user?.uid);
        if (!user) setCustomPresets(loadCustomPresets());
        setSavingName('');
        setShowSaveInput(false);
    };

    const handleDeleteCustom = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteCustomPreset(id, user?.uid);
        if (!user) setCustomPresets(loadCustomPresets());
    };

    const handleSelectCustom = (p: CustomPreset) => {
        if (disabled) return;
        onSelect(p.id);
        onCustomSelect?.(p);
    };

    /* ── Render ── */
    return (
        <div className="w-full max-w-2xl mx-auto mt-8 mb-4">
            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 flex items-center gap-1.5">
                    <Zap size={9} className="text-indigo-400" /> Choose your vibe
                </span>
                <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* ── Auto Mood AI (full-width card) ── */}
            <motion.button
                onClick={() => !disabled && onSelect('Auto')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                whileHover={!disabled ? { scale: 1.01 } : {}}
                whileTap={!disabled ? { scale: 0.98 } : {}}
                disabled={disabled}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border mb-3 transition-all text-left
                    ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    ${selected === 'Auto'
                        ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/15 border-purple-500/40 shadow-[0_0_24px_rgba(168,85,247,0.12)]'
                        : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.04] hover:border-purple-500/20'
                    }`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all
                    ${selected === 'Auto' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/25'}`}>
                    <motion.div animate={selected === 'Auto' ? { rotate: [0, 360] } : {}} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                        <Sparkles size={18} />
                    </motion.div>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-semibold ${selected === 'Auto' ? 'text-white' : 'text-white/60'}`}>Auto Mood AI</h4>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">AI</span>
                    </div>
                    <p className="text-[10px] text-white/25">Analyzes your song's mood and auto-picks the perfect lofi vibe</p>
                </div>
                {selected === 'Auto' && (
                    <div className="flex gap-0.5 items-center">
                        {[0, 1, 2].map(i => (
                            <motion.div key={i} animate={{ scaleY: [1, 2, 1] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                className="w-0.5 h-3 bg-purple-400 rounded-full origin-bottom" />
                        ))}
                    </div>
                )}
            </motion.button>

            {/* ── Built-in Presets ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PRESETS.map((p, i) => (
                    <motion.button key={p.id}
                        onClick={() => !disabled && onSelect(p.id)}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        whileHover={!disabled ? { scale: 1.02, y: -2 } : {}} whileTap={!disabled ? { scale: 0.97 } : {}}
                        disabled={disabled}
                        className={`relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden
                            ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                            ${selected === p.id
                                ? `bg-gradient-to-br ${p.grad} ${RING_COLORS[p.color]} border-opacity-100`
                                : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.04] hover:border-white/[0.12]'
                            }`}
                    >
                        {selected === p.id && <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all
                            ${selected === p.id ? ICON_COLORS[p.color] : 'bg-white/5 text-white/25'}`}>
                            <p.icon size={17} />
                        </div>
                        <h4 className={`text-sm font-semibold mb-0.5 leading-tight ${selected === p.id ? 'text-white' : 'text-white/60'}`}>{p.id}</h4>
                        <p className="text-[10px] text-white/25 leading-snug">{p.desc}</p>
                        {selected === p.id && (
                            <motion.div layoutId="preset-ring"
                                className={`absolute inset-0 rounded-2xl border-2 pointer-events-none ${RING_COLORS[p.color].split(' ')[0]}`}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                        )}
                    </motion.button>
                ))}
            </div>

            {/* ── Custom / Saved Presets ── */}
            <AnimatePresence>
                {customPresets.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="flex items-center gap-3 mt-5 mb-3">
                            <div className="h-px flex-1 bg-white/5" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">My Presets</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {customPresets.map((cp, i) => (
                                <motion.button key={cp.id}
                                    onClick={() => { if (!disabled) { onSelect(cp.id); onCustomSelect?.(cp); } }}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                    whileHover={!disabled ? { scale: 1.02, y: -2 } : {}} whileTap={!disabled ? { scale: 0.97 } : {}}
                                    disabled={disabled}
                                    className={`relative flex flex-col items-start p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden
                                        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        ${selected === cp.id
                                            ? 'bg-gradient-to-br from-purple-500/20 to-purple-900/5 border-purple-500/40'
                                            : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.04]'
                                        }`}
                                >
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${selected === cp.id ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/25'}`}>
                                        <Save size={15} />
                                    </div>
                                    <h4 className={`text-sm font-semibold mb-0.5 leading-tight truncate w-full ${selected === cp.id ? 'text-white' : 'text-white/60'}`}>{cp.name}</h4>
                                    <p className="text-[10px] text-white/25">Custom · {Math.round(cp.playbackSpeed * 100)}% speed</p>
                                    {!disabled && (
                                        <button onClick={e => { e.stopPropagation(); deleteCustomPreset(cp.id); setCustomPresets(loadCustomPresets()); }}
                                            className="absolute top-2 right-2 w-5 h-5 rounded-md bg-white/5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all">
                                            <Trash2 size={9} />
                                        </button>
                                    )}
                                    {selected === cp.id && (
                                        <motion.div layoutId="custom-ring"
                                            className="absolute inset-0 rounded-2xl border-2 border-purple-500/50 pointer-events-none"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Save as Preset ── */}
            {currentMix && (
                <div className="mt-4">
                    <AnimatePresence mode="wait">
                        {showSaveInput ? (
                            <motion.div key="input" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2">
                                <Save size={12} className="text-purple-400 shrink-0" />
                                <input
                                    autoFocus
                                    value={savingName} onChange={e => setSavingName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false); }}
                                    placeholder="Preset name… (Enter to save)"
                                    className="flex-1 bg-transparent text-xs text-white/70 placeholder-white/20 outline-none"
                                    maxLength={24}
                                />
                                <button onClick={handleSave} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors px-2">Save</button>
                                <button onClick={() => setShowSaveInput(false)} className="text-white/20 hover:text-white/50 transition-colors"><X size={12} /></button>
                            </motion.div>
                        ) : (
                            <motion.button key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                onClick={() => setShowSaveInput(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-white/10 text-[11px] text-white/20 hover:text-white/40 hover:border-white/20 transition-all">
                                <Save size={10} /> Save current mix as preset
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
