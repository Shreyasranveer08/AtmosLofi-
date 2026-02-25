'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogIn, Mail, Github, Chrome, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const { loginWithGoogle, loginWithGithub, loginWithEmail, signUpWithEmail } = useAuth();

    // Auth Modes: 'social', 'login', 'signup'
    const [mode, setMode] = useState<'social' | 'login' | 'signup'>('social');

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            await loginWithGoogle();
            onClose();
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    const handleGithubLogin = async () => {
        try {
            await loginWithGithub();
            onClose();
        } catch (error) {
            console.error("GitHub Login failed", error);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'signup') {
                await signUpWithEmail(email, password, name);
            } else {
                await loginWithEmail(email, password);
            }
            onClose();
        } catch (err: any) {
            setError(err.message || "Authentication failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setName('');
        setError('');
        setMode('social');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md glass rounded-[40px] overflow-hidden border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.9)]"
                    >
                        {/* ── ANIMATED BACKGROUND SHAPES ────────────────────────── */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 90, 0],
                                    x: [0, 50, 0],
                                    y: [0, -30, 0]
                                }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 blur-[60px] rounded-full"
                            />
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    rotate: [0, -120, 0],
                                    x: [0, -60, 0],
                                    y: [0, 40, 0]
                                }}
                                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                className="absolute -bottom-10 -right-10 w-56 h-56 bg-purple-500/20 blur-[80px] rounded-full"
                            />
                        </div>

                        <div className="relative z-10 p-8 sm:p-10">
                            <div className="flex justify-between items-center mb-10">
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex items-center gap-4"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/5">
                                        {mode === 'social' ? <LogIn size={22} className="text-indigo-400" /> : <Mail size={22} className="text-indigo-400" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-display font-bold text-white tracking-tight">
                                            {mode === 'social' ? 'Join AtmosLofi' : (mode === 'signup' ? 'Create Account' : 'Welcome Back')}
                                        </h2>
                                        <div className="h-0.5 w-6 bg-indigo-500/50 rounded-full mt-1" />
                                    </div>
                                </motion.div>
                                <button
                                    onClick={onClose}
                                    className="p-2.5 hover:bg-white/5 rounded-full transition-all text-white/30 hover:text-white hover:rotate-90"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <AnimatePresence mode="wait">
                                {mode === 'social' ? (
                                    <motion.div
                                        key="social"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="space-y-4"
                                    >
                                        <p className="text-white/40 text-[15px] mb-8 leading-relaxed font-medium">
                                            Save your vibes, track your history, and access your custom presets from anywhere.
                                        </p>

                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleGoogleLogin}
                                            className="w-full flex items-center justify-center gap-3 py-4.5 px-6 bg-white text-black font-bold rounded-[22px] transition-all shadow-[0_4px_20px_rgba(255,255,255,0.1)] group"
                                        >
                                            <Chrome size={20} className="group-hover:rotate-12 transition-transform" />
                                            Continue with Google
                                        </motion.button>

                                        <div className="grid grid-cols-2 gap-4">
                                            <motion.button
                                                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleGithubLogin}
                                                className="flex items-center justify-center gap-2.5 py-4 px-4 bg-white/5 border border-white/10 text-white/80 font-bold rounded-[20px] transition-all"
                                            >
                                                <Github size={18} className="text-white/40" />
                                                <span className="text-sm">GitHub</span>
                                            </motion.button>

                                            <motion.button
                                                whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.08)" }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setMode('login')}
                                                className="flex items-center justify-center gap-2.5 py-4 px-4 bg-white/5 border border-white/10 text-white/80 font-bold rounded-[20px] transition-all"
                                            >
                                                <Mail size={18} className="text-white/40" />
                                                <span className="text-sm">Email</span>
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleEmailAuth}
                                        className="space-y-4"
                                    >
                                        {error && (
                                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                                                {error}
                                            </div>
                                        )}

                                        {mode === 'signup' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-2">Name</label>
                                                <input
                                                    required
                                                    type="text"
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    placeholder="Lofi Producer"
                                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-medium"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-2">Email Address</label>
                                            <input
                                                required
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="vibe@atmoslofi.com"
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-medium"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 ml-2">Password</label>
                                            <input
                                                required
                                                type="password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-medium"
                                            />
                                        </div>

                                        <button
                                            disabled={loading}
                                            type="submit"
                                            className="w-full py-4.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 mt-4"
                                        >
                                            {loading ? 'Processing...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
                                        </button>

                                        <div className="flex flex-col items-center gap-4 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                                className="text-[11px] font-bold text-white/30 hover:text-white transition-colors"
                                            >
                                                {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={resetForm}
                                                className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-indigo-400/60 hover:text-indigo-400 transition-colors"
                                            >
                                                <ArrowLeft size={12} /> Back to Social Login
                                            </button>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center gap-4"
                            >
                                <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.2em]">Atmospheric Lofi Studio</p>
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => (
                                        <motion.div
                                            key={i}
                                            animate={{ opacity: [0.2, 1, 0.2] }}
                                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                            className="w-1 h-1 rounded-full bg-indigo-500"
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
