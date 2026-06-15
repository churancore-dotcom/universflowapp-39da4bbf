import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { setLockscreenOpen } from '@/lib/lockscreenState';
import LockScreenBackground from '@/components/LockScreenBackground';
import KaraokeLyricsStage from '@/components/KaraokeLyricsStage';

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

const LockScreenPlayer = ({ isOpen, onClose }: LockScreenPlayerProps) => {
  const { currentSong, isPlaying } = usePlayer();
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-220, 0], [0, 1]);

  useWakeLock(isOpen);

  useEffect(() => {
    setLockscreenOpen(isOpen);
    return () => setLockscreenOpen(false);
  }, [isOpen]);

  if (!currentSong) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -120) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] select-none overflow-hidden bg-background"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
        >
          <LockScreenBackground coverUrl={currentSong.cover_url} isPlaying={isPlaying} />

          <motion.div
            aria-hidden
            className="absolute inset-0 z-[1] pointer-events-none"
            animate={isPlaying ? { opacity: [0.76, 0.92, 0.76] } : { opacity: 0.78 }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.28) 34%, rgba(0,0,0,0.18) 50%, rgba(0,0,0,0.42) 72%, rgba(0,0,0,0.82) 100%)',
            }}
          />

          <motion.div
            aria-hidden
            className="absolute inset-0 z-[2] pointer-events-none mix-blend-screen"
            animate={isPlaying ? { scale: [1, 1.08, 1], rotate: [0, 2, 0] } : { scale: 1 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: 'radial-gradient(circle at 20% 18%, hsl(var(--primary) / 0.22), transparent 30%), radial-gradient(circle at 82% 72%, rgba(255,255,255,0.12), transparent 28%)',
            }}
          />

          <motion.div
            className="relative z-10 h-full w-full max-w-[430px] mx-auto"
            style={{ y: dragY, opacity: dragOpacity }}
            drag="y"
            dragConstraints={{ top: -240, bottom: 0 }}
            dragElastic={0.32}
            onDragEnd={onDragEnd}
          >
            <div className="absolute inset-0 pt-[max(env(safe-area-inset-top,18px),22px)] pb-[max(env(safe-area-inset-bottom,18px),22px)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`k-${currentSong.id}`} className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.04, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -18 }}
                  transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}>
                  <KaraokeLyricsStage
                    artist={currentSong.artist}
                    title={currentSong.title}
                    duration={currentSong.duration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              aria-label="Close lyrics"
              onClick={onClose}
              className="absolute right-0 top-0 z-20 h-16 w-16 opacity-0"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LockScreenPlayer;
