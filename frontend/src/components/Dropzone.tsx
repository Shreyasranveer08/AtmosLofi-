'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Music, AlertCircle, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export default function Dropzone({ onFileSelect, isProcessing }: DropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    setError(null);
    if (rejected.length > 0) {
      const code = rejected[0].errors[0].code;
      setError(code === 'file-too-large' ? 'File exceeds 50MB limit.' : 'Only MP3 or WAV files are supported.');
      return;
    }
    if (accepted.length > 0) onFileSelect(accepted[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/mpeg': ['.mp3'], 'audio/wav': ['.wav'] },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    disabled: isProcessing,
  });

  return (
    <div {...getRootProps()} className="w-full max-w-2xl mx-auto mt-6 outline-none">
      <motion.div
        whileHover={!isProcessing ? { scale: 1.01 } : undefined}
        whileTap={!isProcessing ? { scale: 0.99 } : undefined}
        className={`
          relative overflow-hidden rounded-3xl border-2 border-dashed p-14
          flex flex-col items-center justify-center text-center
          transition-all duration-300 cursor-pointer group
          ${isDragActive
            ? 'border-indigo-500 bg-indigo-500/8 shadow-[0_0_60px_rgba(99,102,241,0.15)]'
            : 'border-white/10 hover:border-white/20 bg-white/[0.025] hover:bg-white/[0.04]'
          }
          ${isProcessing ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />

        {/* Shimmer on drag */}
        {isDragActive && (
          <div className="absolute inset-0 shimmer rounded-3xl pointer-events-none" />
        )}

        {/* Icon */}
        <motion.div
          animate={isDragActive ? { scale: 1.15, rotate: -5 } : { scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`
            w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-lg
            ${isDragActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-white/30 group-hover:text-white/50 group-hover:bg-white/8'}
            transition-colors duration-300
          `}
        >
          {isProcessing
            ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
              <Music size={32} />
            </motion.div>
            : isDragActive
              ? <FileAudio size={32} />
              : <UploadCloud size={32} />
          }
        </motion.div>

        <h3 className="text-xl font-semibold text-white/90 mb-2 font-display">
          {isDragActive ? 'Release to upload ✨' : 'Drop your track here'}
        </h3>
        <p className="text-sm text-white/30 max-w-xs leading-relaxed">
          MP3 or WAV · up to 50MB · or click to browse
        </p>

        {/* Format badges */}
        <div className="flex gap-2 mt-5">
          {['MP3', 'WAV'].map(f => (
            <span key={f} className="text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-white/40 px-2.5 py-1 rounded-full">
              {f}
            </span>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-5 flex items-center gap-2 text-rose-400 bg-rose-400/8 border border-rose-400/20 px-4 py-2 rounded-xl"
            >
              <AlertCircle size={14} />
              <span className="text-xs font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
