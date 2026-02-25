'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Music2, CheckCircle2, XCircle, Loader2, Trash2, Download, Play, Layers } from 'lucide-react';
import axios from 'axios';
import { saveToHistory } from './HistoryPanel';

interface BatchItem {
    id: string;
    file: File;
    status: 'queued' | 'uploading' | 'processing' | 'done' | 'error';
    taskId?: string;
    error?: string;
    progress?: number;
}

interface BatchUploaderProps {
    preset: string;
    vocalVol: number;
    trackVol: number;
    ambientVol: number;
    reverbAmount: number;
    playbackSpeed: number;
    copyrightFree: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STATUS_LABELS: Record<BatchItem['status'], string> = {
    queued: 'Queued',
    uploading: 'Uploading…',
    processing: 'Converting…',
    done: 'Done ✓',
    error: 'Error',
};

const STATUS_COLOR: Record<BatchItem['status'], string> = {
    queued: 'text-white/30',
    uploading: 'text-indigo-400',
    processing: 'text-amber-400',
    done: 'text-emerald-400',
    error: 'text-rose-400',
};

export default function BatchUploader({
    preset, vocalVol, trackVol, ambientVol, reverbAmount, playbackSpeed, copyrightFree
}: BatchUploaderProps) {
    const [items, setItems] = useState<BatchItem[]>([]);
    const [running, setRunning] = useState(false);
    const abortRef = useRef(false);

    const update = (id: string, patch: Partial<BatchItem>) =>
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));

    /* ── Drop handler ── */
    const onDrop = useCallback((accepted: File[]) => {
        const newItems: BatchItem[] = accepted.slice(0, 10).map(f => ({
            id: `${f.name}-${Date.now()}-${Math.random()}`,
            file: f,
            status: 'queued',
            progress: 0,
        }));
        setItems(prev => [...prev, ...newItems].slice(0, 10));
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'] },
        maxSize: 50 * 1024 * 1024,
        maxFiles: 10,
        disabled: running,
    });

    /* ── Process one item ── */
    const processItem = async (item: BatchItem) => {
        if (abortRef.current) return;

        // UPLOAD
        update(item.id, { status: 'uploading' });
        let fileId: string;
        try {
            const fd = new FormData(); fd.append('file', item.file);
            const res = await axios.post(`${API}/api/upload`, fd);
            fileId = res.data.file_id;
        } catch {
            update(item.id, { status: 'error', error: 'Upload failed' }); return;
        }

        // PROCESS
        update(item.id, { status: 'processing', progress: 5 });
        let taskId: string;
        try {
            const fd = new URLSearchParams();
            fd.append('file_id', fileId); fd.append('preset', preset);
            fd.append('vocal_vol', vocalVol.toString());
            fd.append('track_vol', trackVol.toString());
            fd.append('ambient_vol', ambientVol.toString());
            fd.append('reverb_amount', reverbAmount.toString());
            fd.append('playback_speed', playbackSpeed.toString());
            fd.append('copyright_free', copyrightFree.toString());
            const res = await axios.post(`${API}/api/process`, fd);
            taskId = res.data.task_id;
        } catch {
            update(item.id, { status: 'error', error: 'Processing failed' }); return;
        }

        // POLL with progress
        const startTime = Date.now();
        await new Promise<void>((resolve, reject) => {
            const prog = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                update(item.id, { progress: Math.min(90, 5 + (elapsed / 55) * 85) });
            }, 500);

            const poll = setInterval(async () => {
                if (abortRef.current) { clearInterval(poll); clearInterval(prog); resolve(); return; }
                try {
                    const s = await axios.get(`${API}/api/status/${taskId}`);
                    if (s.data.status === 'completed') {
                        clearInterval(poll); clearInterval(prog);
                        update(item.id, { status: 'done', taskId, progress: 100 });
                        saveToHistory({
                            taskId, preset,
                            title: item.file.name.replace(/\.[^.]+$/, ''),
                            date: new Date().toISOString(),
                        });
                        resolve();
                    } else if (s.data.status === 'failed') {
                        clearInterval(poll); clearInterval(prog);
                        update(item.id, { status: 'error', error: 'Convert failed' });
                        resolve();
                    }
                } catch { clearInterval(poll); clearInterval(prog); reject(); }
            }, 2500);
        });
    };

    /* ── Run all ── */
    const processAll = async () => {
        abortRef.current = false;
        setRunning(true);
        const queued = items.filter(i => i.status === 'queued' || i.status === 'error');
        for (const item of queued) {
            if (abortRef.current) break;
            await processItem(item);
        }
        setRunning(false);
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
    const clearDone = () => setItems(prev => prev.filter(i => i.status !== 'done'));

    const pending = items.filter(i => i.status === 'queued' || i.status === 'error').length;
    const done = items.filter(i => i.status === 'done').length;

    return (
        <div className="w-full max-w-2xl mx-auto mt-4">
            {/* ── Drop zone ── */}
            <motion.div
                whileHover={!running ? { scale: 1.01 } : {}}
                className={`${running ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
                {items.length > 0 && (
                    <p className="text-[10px] text-indigo-400 mt-2 font-semibold">{items.length}/10 tracks in queue</p>
                )}
            </motion.div>

            {/* ── Queue list ── */}
            <AnimatePresence>
                {items.map(item => (
                    <motion.div key={item.id}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all
                            ${item.status === 'done' ? 'bg-emerald-500/5  border-emerald-500/15' :
                                item.status === 'error' ? 'bg-rose-500/5    border-rose-500/15' :
                                    item.status === 'processing' || item.status === 'uploading' ? 'bg-indigo-500/5 border-indigo-500/15' :
                                        'bg-white/[0.025] border-white/[0.05]'}`}
                        >
                            {/* Icon */}
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                {item.status === 'done'
                                    ? <CheckCircle2 size={15} className="text-emerald-400" />
                                    : item.status === 'error'
                                        ? <XCircle size={15} className="text-rose-400" />
                                        : item.status === 'processing' || item.status === 'uploading'
                                            ? <Loader2 size={15} className="animate-spin text-indigo-400" />
                                            : <Music2 size={15} className="text-white/30" />
                                }
                            </div>

                            {/* Name + progress */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-white/70 truncate">{item.file.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className={`text-[10px] font-medium ${STATUS_COLOR[item.status]}`}>
                                        {item.error || STATUS_LABELS[item.status]}
                                    </p>
                                    {(item.status === 'processing' || item.status === 'uploading') && item.progress !== undefined && (
                                        <span className="text-[9px] text-white/20 font-mono">{Math.round(item.progress)}%</span>
                                    )}
                                </div>
                                {/* Mini progress bar */}
                                {(item.status === 'processing' || item.status === 'uploading') && (
                                    <div className="w-full h-0.5 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                        <motion.div className="h-full bg-indigo-500 rounded-full"
                                            animate={{ width: `${item.progress ?? 0}%` }}
                                            transition={{ duration: 0.4 }} />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {item.status === 'done' && item.taskId && (
                                    <a href={`${API}/api/download/${item.taskId}?format=mp3`} download
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 hover:bg-indigo-500/25 transition-all">
                                        <Download size={10} /> MP3
                                    </a>
                                )}
                                {!running && (
                                    <button onClick={() => removeItem(item.id)}
                                        className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                                        <Trash2 size={10} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* ── Actions ── */}
            {items.length > 0 && (
                <div className="flex items-center gap-3 mt-4">
                    <motion.button
                        onClick={processAll}
                        disabled={running || pending === 0}
                        whileHover={!running && pending > 0 ? { scale: 1.02 } : {}}
                        whileTap={!running && pending > 0 ? { scale: 0.97 } : {}}
                        className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_24px_rgba(99,102,241,0.25)]"
                    >
                        {running
                            ? <><Loader2 size={15} className="animate-spin" /> Converting ({items.filter(i => i.status === 'done').length}/{items.length})…</>
                            : <><Play size={15} fill="white" /> Convert All ({pending} tracks)</>
                        }
                    </motion.button>
                    {done > 0 && !running && (
                        <button onClick={clearDone}
                            className="px-4 py-3 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-all">
                            Clear done
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
