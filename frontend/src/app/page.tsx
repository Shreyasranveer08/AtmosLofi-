'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import LandingPage from '@/components/LandingPage';
import AuthModal from '@/components/AuthModal';
import PresetSelector, { PRESETS } from '@/components/PresetSelector';
import BatchUploader from '@/components/BatchUploader';
import Player from '@/components/Player';
import VHSOverlay from '@/components/VHSOverlay';
import FloatingBackground from '@/components/FloatingBackground';
import HistoryPanel from '@/components/HistoryPanel';
import { Music2, Sparkles, Sliders, History } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'studio'>('landing');
  const [showAuth, setShowAuth] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESETS[0].id);
  const [vibe, setVibe] = useState<'classic' | 'cyberpunk' | 'late-night'>('classic');

  // Studio controls
  const [vocalVol, setVocalVol] = useState(0.8);
  const [trackVol, setTrackVol] = useState(1.0);
  const [ambientVol, setAmbientVol] = useState(0.4);
  const [reverbAmount, setReverbAmount] = useState(0.5);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.9);
  const [copyrightFree, setCopyrightFree] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center"
        >
          <Music2 className="text-indigo-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] text-white selection:bg-indigo-500/30">
      <VHSOverlay intensity={vibe === 'late-night' ? 0.15 : 0.05} />
      <FloatingBackground />

      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <LandingPage
              onGetStarted={() => setView('studio')}
              onLoginClick={() => setShowAuth(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24"
          >
            {/* Studio Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('landing')}
                  className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                >
                  <Music2 size={20} className="text-white/60" />
                </button>
                <div>
                  <h1 className="text-3xl font-display font-black tracking-tight">Lofi Studio</h1>
                  <p className="text-xs text-white/30 font-medium uppercase tracking-widest mt-0.5">AtmosLofi Beta 1.0</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl">
                <button className="px-4 py-2 rounded-xl bg-indigo-500 text-xs font-bold shadow-lg shadow-indigo-500/20">Studio</button>
                <button className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white transition-all">Templates</button>
                <button className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 hover:text-white transition-all">Community</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Mix Controls */}
              <div className="lg:col-span-4 space-y-8">
                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Sliders size={14} className="text-indigo-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/30">Master Mix</h2>
                  </div>

                  <div className="space-y-6">
                    {[
                      { label: 'Vocals', val: vocalVol, set: setVocalVol, min: 0, max: 2 },
                      { label: 'Instrumental', val: trackVol, set: setTrackVol, min: 0, max: 2 },
                      { label: 'Ambience', val: ambientVol, set: setAmbientVol, min: 0, max: 1 },
                      { label: 'Reverb', val: reverbAmount, set: setReverbAmount, min: 0, max: 1 },
                      { label: 'Speed', val: playbackSpeed, set: setPlaybackSpeed, min: 0.5, max: 1.5 },
                    ].map((control) => (
                      <div key={control.label} className="space-y-2">
                        <div className="flex justify-between items-center group">
                          <span className="text-xs font-bold text-white/50 group-hover:text-white transition-colors">{control.label}</span>
                          <span className="text-[10px] font-mono text-white/20">{Math.round(control.val * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={control.min}
                          max={control.max}
                          step="0.01"
                          value={control.val}
                          onChange={(e) => control.set(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <HistoryPanel />
              </div>

              {/* Middle Column: Processing */}
              <div className="lg:col-span-8 space-y-8">
                <PresetSelector
                  selected={selectedPreset}
                  onSelect={setSelectedPreset}
                  disabled={false}
                  currentMix={{ vocalVol, trackVol, ambientVol, reverbAmount, playbackSpeed }}
                />

                <BatchUploader
                  preset={selectedPreset}
                  vocalVol={vocalVol}
                  trackVol={trackVol}
                  ambientVol={ambientVol}
                  reverbAmount={reverbAmount}
                  playbackSpeed={playbackSpeed}
                  copyrightFree={copyrightFree}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </main>
  );
}
