'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
    Sparkles, Music2, Zap, Layers,
    Crown, Shield, Download, Star,
    ArrowRight, Github, User as UserIcon, LogOut
} from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
    onLoginClick: () => void;
}

export default function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
    const { user, logout } = useAuth();
    const FEATURES = [
        { icon: Music2, label: 'Stem Separation', desc: 'Split vocals and instruments with AI.' },
        { icon: Sparkles, label: 'Auto Mood AI', desc: 'Detects the perfect vibe for any track.' },
        { icon: Layers, label: 'Batch Mode', desc: 'Process up to 10 tracks at once.' },
        { icon: Shield, label: 'Copyright Free', desc: 'Beat content ID with AI generation.' },
        { icon: Crown, label: 'Custom Presets', desc: 'Save and load your own lofi styles.' },
        { icon: Zap, label: 'Priority Queue', desc: 'Instant processing for everyone.' },
    ];

    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-[#0A0A0B]">
            {/* ── BACKGROUND ACCENTS ────────────────────────────────────────── */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32">
                {/* ── NAV ────────────────────────────────────────────────── */}
                <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 pointer-events-none">
                    <div className="max-w-7xl mx-auto flex justify-between items-center pointer-events-auto">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                <Music2 size={22} className="text-white" fill="white" />
                            </div>
                            <span className="text-xl font-display font-bold text-white tracking-tight">AtmosLofi</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="https://github.com" target="_blank" className="hidden sm:block text-white/40 hover:text-white transition-colors mr-2">
                                <Github size={20} />
                            </a>

                            {user ? (
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-bold text-white/40">{user.displayName || 'Lofi Producer'}</span>
                                        <button onClick={() => logout()} className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Logout</button>
                                    </div>
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-xl" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center">
                                            <UserIcon size={14} className="text-white/40" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={onLoginClick}
                                    className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm font-semibold text-white hover:bg-white/10 transition-all"
                                >
                                    Login
                                </button>
                            )}

                            <button
                                onClick={onGetStarted}
                                className="px-5 py-2.5 bg-indigo-500 rounded-full text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition-all"
                            >
                                Beta Access
                            </button>
                        </div>
                    </div>
                </nav>

                {/* ── HERO ────────────────────────────────────────────────── */}
                <div className="text-center mt-20 mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-8"
                    >
                        <Sparkles size={12} /> The Future of Lofi is Here
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-6xl md:text-8xl font-display font-extrabold text-white leading-tight tracking-tight mb-8"
                    >
                        Your AI <span className="gradient-text">Lofi Studio</span><br />
                        Any Song, Reimagined.
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/40 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        Transform any track into a cozy, atmospheric lofi masterpiece in seconds.
                        Professional stems, reverb, vinyl texture, and AI mood detection — all for free.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <button
                            onClick={onGetStarted}
                            className="group relative px-8 py-4 bg-indigo-500 rounded-2xl text-white font-bold text-lg flex items-center gap-3 shadow-[0_20px_40px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-all active:scale-95"
                        >
                            Open Studio
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white/80 font-semibold text-lg hover:bg-white/10 transition-all active:scale-95"
                        >
                            Explore Features
                        </button>
                    </motion.div>
                </div>

                {/* ── FEATURES GRID ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <f.icon size={24} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{f.label}</h3>
                            <p className="text-white/30 leading-relaxed text-sm">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>

                {/* ── FOOTER ────────────────────────────────────────────────── */}
                <footer className="mt-40 pt-20 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2.5 opacity-50">
                        <Music2 size={18} className="text-white" />
                        <span className="text-sm font-bold text-white tracking-tight">AtmosLofi</span>
                    </div>
                    <div className="flex items-center gap-8 text-sm font-medium text-white/20">
                        <a href="#" className="hover:text-white/40 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white/40 transition-colors">Terms</a>
                        <a href="#" className="hover:text-white/40 transition-colors">Community</a>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-2 text-right">
                        <p className="text-sm font-semibold text-white/40">Developer: <span className="text-indigo-400">Shreyas</span></p>
                        <p className="text-xs font-mono text-white/10">© 2026 ATMOS LOFI. ALL RIGHTS RESERVED.</p>
                    </div>
                </footer>
            </div>

            {/* ── DECORATIVE ELEMENTS ────────────────────────────────────────── */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                <div className="w-[800px] h-[800px] border border-white/5 rounded-full animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />
            </div>
        </div>
    );
}
