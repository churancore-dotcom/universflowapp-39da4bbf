import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlayerProgress } from '@/lib/playerProgressStore';
import { Slider } from '@/components/ui/slider';
import { setLockscreenOpen } from '@/lib/lockscreenState';
import LockScreenBackground from '@/components/LockScreenBackground';
import KaraokeLyricsStage from '@/components/KaraokeLyricsStage';
import {
  Play, Pause, SkipBack, SkipForward, Music,
  Shuffle, Repeat, Repeat1, ChevronDown, Heart, Share2,
} from 'lucide-react';

const fmt = (s: number): string => {
  const m = Math.floor(s / 60);
  const x = Math.floor(s % 60);
  return `${m}:${x.toString().padStart(2, '0')}`;
};

interface LockScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const useWakeLock = (enabled: boolean) => {
  const ref = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!enabled) { ref.current?.release().catch(() => {}); ref.current = null; return; }
    const req = async () => {
      try { if ('wakeLock' in navigator) ref.current = await navigator.wakeLock.request('screen'); } catch {}
    };
    req();
    const onVis = () => { if (document.visibilityState === 'visible' && enabled) req(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      ref.current?.release().catch(() => {}); ref.current = null;
    };
  }, [enabled]);
};

/**
 * Lock-screen lyrics player — full-screen karaoke.
 * Layout (new):
 *   ┌ status pill + close ┐
 *   ┌ floating glass artwork tile (top-left) + track meta ─┐
 *   ├──────── karaoke lyrics stage (full middle) ──────────┤
 *   └ floating control island (rounded glass, minimal) ────┘
 */
const LockScreenPlayer = ({ isOpen, onClose }: LockScreenPlayerProps) => {
  const {
    currentSong, isPlaying, shuffle, repeat,
    togglePlay, nextSong, prevSong, toggleShuffle, toggleRepeat, seek,
  } = usePlayer();
  const { progress, duration } = usePlayerProgress();

  const [time, setTime] = useState(new Date());
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-220, 0], [0, 1]);

  useWakeLock(isOpen);

  useEffect(() => {
    setLockscreenOpen(isOpen);
    return () => setLockscreenOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, [isOpen]);

  if (!currentSong) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -120) onClose();
  };

  const dateStr = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col select-none overflow-hidden"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          <LockScreenBackground coverUrl={currentSong.cover_url} isPlaying={isPlaying} />

          {/* subtle vertical vignette so lyrics pop */}
          <div className="absolute inset-0 pointer-events-none z-[1]"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.55) 100%)' }} />

          <motion.div
            className="relative z-10 flex flex-col h-full w-full max-w-[430px] mx-auto"
            style={{ y: dragY, opacity: dragOpacity }}
            drag="y"
            dragConstraints={{ top: -240, bottom: 0 }}
            dragElastic={0.32}
            onDragEnd={onDragEnd}
          >
            {/* ─── Status row ─── */}
            <div className="flex items-center justify-between px-5 pt-[env(safe-area-inset-top,14px)] pb-2">
              <div className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/55">
                {dateStr}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 -m-1.5 rounded-full flex items-center justify-center active:bg-white/10"
                aria-label="Close">
                <ChevronDown className="w-4 h-4 text-white/65" />
              </button>
            </div>

            {/* ─── Hero: clock + tile + meta ─── */}
            <motion.div
              className="px-5 pb-3"
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="text-[64px] leading-[0.95] font-thin text-white tracking-tighter tabular-nums">
                {timeStr}
              </div>

              <div className="mt-3 flex items-center gap-3">
                {/* Glass artwork tile */}
                <motion.div
                  className="relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0"
                  style={{ boxShadow: '0 10px 30px -8px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.12) inset' }}
                  animate={isPlaying ? { rotate: [0, 1.5, 0, -1.5, 0] } : { rotate: 0 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div key={currentSong.id} className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.3 }}>
                      {currentSong.cover_url ? (
                        <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                          <Music className="w-5 h-5 text-white/55" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="popLayout">
                    <motion.div key={currentSong.id}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.28 }}>
                      <h3 className="text-[15px] font-bold text-white truncate leading-tight">{currentSong.title}</h3>
                      <p className="text-[12px] text-white/55 truncate leading-tight mt-0.5">{currentSong.artist}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Live equalizer pulse */}
                {isPlaying && (
                  <div className="flex items-end gap-[2.5px] h-5 mr-1">
                    {[0, 1, 2, 3].map(i => (
                      <motion.div key={i} className="w-[2.5px] rounded-full bg-primary/90"
                        animate={{ height: ['6px', '16px', '8px', '14px', '6px'] }}
                        transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* ─── Karaoke lyrics ─── */}
            <div className="flex-1 min-h-0 relative mt-1 mb-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`k-${currentSong.id}`} className="absolute inset-0"
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}>
                  <KaraokeLyricsStage
                    artist={currentSong.artist}
                    title={currentSong.title}
                    duration={duration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ─── Floating control island ─── */}
            <motion.div
              className="mx-4 mb-[max(env(safe-area-inset-bottom,16px),18px)] rounded-[30px] overflow-hidden"
              style={{
                background: 'rgba(14,14,18,0.58)',
                backdropFilter: 'blur(34px) saturate(150%)',
                WebkitBackdropFilter: 'blur(34px) saturate(150%)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 22px 56px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              initial={{ opacity: 0, y: 44 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 44 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="px-5 pt-4 pb-3.5">
                {/* progress */}
                <Slider
                  value={[progress]} max={duration || 100} step={0.1}
                  onValueChange={([v]) => seek(v)}
                  className="[&_[role=slider]]:w-[12px] [&_[role=slider]]:h-[12px] [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md [&_[data-radix-slider-track]]:h-[3px] [&_[data-radix-slider-track]]:bg-white/15 [&_[data-radix-slider-range]]:bg-white/95"
                />
                <div className="flex justify-between mt-1.5 text-[10px] text-white/45 font-medium tabular-nums px-0.5">
                  <span>{fmt(progress)}</span>
                  <span>-{fmt(Math.max(0, duration - progress))}</span>
                </div>

                {/* main controls */}
                <div className="flex items-center justify-between mt-3">
                  <motion.button onClick={toggleShuffle} className="w-10 h-10 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}>
                    <Shuffle className={`w-[16px] h-[16px] ${shuffle ? 'text-primary' : 'text-white/45'}`} />
                  </motion.button>

                  <motion.button onClick={prevSong} className="w-12 h-12 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}>
                    <SkipBack className="w-[26px] h-[26px] text-white" fill="white" />
                  </motion.button>

                  <motion.button onClick={togglePlay}
                    className="w-[62px] h-[62px] rounded-full bg-white flex items-center justify-center"
                    style={{ boxShadow: '0 10px 28px -6px rgba(255,255,255,0.35)' }}
                    whileTap={{ scale: 0.88 }}>
                    <AnimatePresence mode="wait" initial={false}>
                      {isPlaying ? (
                        <motion.div key="pa" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.14 }}>
                          <Pause className="w-[28px] h-[28px] text-black" fill="black" />
                        </motion.div>
                      ) : (
                        <motion.div key="pl" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.14 }}>
                          <Play className="w-[28px] h-[28px] text-black ml-0.5" fill="black" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button onClick={nextSong} className="w-12 h-12 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}>
                    <SkipForward className="w-[26px] h-[26px] text-white" fill="white" />
                  </motion.button>

                  <motion.button onClick={toggleRepeat} className="w-10 h-10 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}>
                    {repeat === 'one'
                      ? <Repeat1 className="w-[16px] h-[16px] text-primary" />
                      : <Repeat className={`w-[16px] h-[16px] ${repeat !== 'off' ? 'text-primary' : 'text-white/45'}`} />}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* swipe-up hint */}
            <motion.div className="flex justify-center pb-2.5"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <motion.div className="w-[36px] h-[5px] bg-white/22 rounded-full"
                animate={{ opacity: [0.22, 0.5, 0.22] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LockScreenPlayer;
