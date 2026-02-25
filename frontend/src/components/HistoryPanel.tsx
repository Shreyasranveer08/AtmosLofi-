'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Download, Trash2, Music2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
    limit,
    setDoc
} from 'firebase/firestore';

export interface HistoryEntry {
    taskId: string;
    title: string;
    preset: string;
    date: string;   // ISO string
    duration?: number;
    id?: string;    // Firestore doc ID
}

const STORAGE_KEY = 'atmoslofi_history';

interface HistoryPanelProps {
    onRequireAuth?: () => void;
}

export async function saveToHistory(entry: HistoryEntry, uid?: string) {
    if (uid) {
        try {
            const historyRef = doc(db, 'users', uid, 'history', entry.taskId);
            await setDoc(historyRef, entry);
            return;
        } catch (error) {
            console.error("Error saving to Firestore history:", error);
        }
    }

    // Fallback to local storage (for guests or offline)
    try {
        const existing: HistoryEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const fresh = [entry, ...existing.filter(e => e.taskId !== entry.taskId)].slice(0, 20);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch { /* ignore */ }
}

export function loadHistory(): HistoryEntry[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
}

function timeAgo(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryPanel({ onRequireAuth }: HistoryPanelProps) {
    const { user } = useAuth();
    const [items, setItems] = useState<HistoryEntry[]>([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (user) {
            // Fetch from Firestore
            const historyQuery = query(
                collection(db, 'users', user.uid, 'history'),
                orderBy('date', 'desc'),
                limit(20)
            );

            const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
                const historyData = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                })) as HistoryEntry[];
                setItems(historyData);
            });

            return () => unsubscribe();
        } else {
            // Load from LocalStorage
            setItems(loadHistory());
        }
    }, [user]);

    const remove = async (taskId: string) => {
        if (user) {
            try {
                await deleteDoc(doc(db, 'users', user.uid, 'history', taskId));
            } catch (error) {
                console.error("Error deleting history from Firestore:", error);
            }
        } else {
            const fresh = items.filter(i => i.taskId !== taskId);
            setItems(fresh);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
    };

    const handleDownload = (taskId: string, fmt: string) => {
        if (!user && onRequireAuth) {
            onRequireAuth();
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

    if (items.length === 0) return null;

    const visible = expanded ? items : items.slice(0, 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="w-full max-w-2xl mt-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-white/25">
                    <Clock size={12} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Recent Conversions</span>
                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full">{items.length}</span>
                </div>
                {items.length > 3 && (
                    <button onClick={() => setExpanded(e => !e)}
                        className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                        {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show all</>}
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="space-y-2">
                <AnimatePresence>
                    {visible.map((item, i) => (
                        <motion.div key={item.taskId}
                            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.04] transition-all group"
                        >
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Music2 size={13} className="text-indigo-400" />
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-white/70 truncate">{item.title}</p>
                                <p className="text-[10px] text-white/25 flex items-center gap-1.5">
                                    <span>{item.preset}</span>
                                    <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                                    <span>{timeAgo(item.date)}</span>
                                </p>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {['mp3', 'wav'].map(fmt => (
                                    <button key={fmt}
                                        onClick={() => handleDownload(item.taskId, fmt)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 transition-all"
                                    >
                                        <Download size={9} />{fmt.toUpperCase()}
                                    </button>
                                ))}
                                <button onClick={() => remove(item.taskId)}
                                    className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/20 transition-all" title="Remove">
                                    <Trash2 size={10} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
