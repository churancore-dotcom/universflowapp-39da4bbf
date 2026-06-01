import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { Music } from 'lucide-react';
import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId: LockScreenThemeId;
  coverUrl?: string | null;
  title: string;
  songId: string;
  isPlaying: boolean;
}

const COVER_SIZE = 'min(64vw, 260px)';

const Cover = ({
  coverUrl,
  title,
  songId,
  rounded,
}: {
  coverUrl?: string | null;
  title: string;
  songId: string;
  rounded: string;
}) => (
  <AnimatePresence mode="popLayout">
    <motion.div
      key={songId}
      className={`absolute inset-0 overflow-hidden ${rounded}`}
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.45 }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full bg-white/10 flex items-center justify-center">
          <Music className="w-16 h-16 text-white/60" />
        </div>
      )}
    </motion.div>
  </AnimatePresence>
);

const LockScreenArtwork = ({ themeId, coverUrl, title, songId, isPlaying }: Props) => {
  // ───── CLASSIC: static square cover with soft shadow ─────
  if (themeId === 'classic') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <motion.div
          className="relative"
          style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}
          animate={isPlaying ? { scale: [1, 1.015, 1] } : { scale: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="absolute inset-0 rounded-[24px] overflow-hidden"
            style={{
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset',
            }}
          >
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-[24px]" />
          </div>
        </motion.div>
      </div>
    );
  }

  // ───── VINYL: spinning record + conic glow ring ─────
  if (themeId === 'vinyl') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <motion.div
          className="relative"
          style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}
          animate={isPlaying ? { scale: [1, 1.025, 1] } : { scale: 1 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute -inset-3 rounded-full opacity-50 blur-2xl"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(255,45,85,0.5), rgba(94,92,230,0.5), rgba(255,149,0,0.5), rgba(255,45,85,0.5))',
            }}
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden shadow-2xl"
            style={{
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset',
            }}
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          >
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[14%] h-[14%] rounded-full bg-black/85 border border-white/15 flex items-center justify-center">
              <div className="w-[28%] h-[28%] rounded-full bg-white/70" />
            </div>
          </motion.div>
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%)',
            }}
          />
        </motion.div>
      </div>
    );
  }

  // ───── PULSE: square cover surrounded by expanding rings ─────
  if (themeId === 'pulse') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-[28px] border"
              style={{ borderColor: 'rgba(255,45,85,0.55)' }}
              animate={
                isPlaying
                  ? { scale: [1, 1.6], opacity: [0.7, 0] }
                  : { scale: 1, opacity: 0.25 }
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeOut',
                delay: i * 1,
              }}
            />
          ))}
          <motion.div
            className="absolute inset-0 rounded-[24px] overflow-hidden"
            style={{
              boxShadow:
                '0 30px 60px rgba(255,45,85,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
            animate={isPlaying ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-[24px]" />
          </motion.div>
        </div>
      </div>
    );
  }

  // ───── PRISM: cover with rotating conic gradient frame ─────
  if (themeId === 'prism') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}>
          <motion.div
            className="absolute -inset-[6px] rounded-[28px]"
            style={{
              background:
                'conic-gradient(from 0deg, #ff2d55, #5e5ce6, #ff9500, #ff2d55)',
              filter: 'blur(2px)',
            }}
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute -inset-5 rounded-[32px] opacity-60 blur-2xl"
            style={{
              background:
                'conic-gradient(from 0deg, #ff2d55, #5e5ce6, #ff9500, #ff2d55)',
            }}
            animate={isPlaying ? { rotate: -360 } : { rotate: 0 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 rounded-[24px] overflow-hidden shadow-2xl">
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-[24px]" />
          </div>
        </div>
      </div>
    );
  }

  // ───── ORBIT: circular cover + 3 orbiting particles ─────
  if (themeId === 'orbit') {
    const particles = [0, 1, 2];
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}>
          {particles.map(i => (
            <motion.div
              key={i}
              className="absolute inset-0"
              animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
              transition={{
                duration: 10 + i * 4,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.3,
              }}
              style={{ transformOrigin: '50% 50%' }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  width: 10 - i * 2,
                  height: 10 - i * 2,
                  background: i === 0 ? '#ff2d55' : i === 1 ? '#5e5ce6' : '#ffd60a',
                  boxShadow: `0 0 16px ${
                    i === 0 ? '#ff2d55' : i === 1 ? '#5e5ce6' : '#ffd60a'
                  }`,
                }}
              />
            </motion.div>
          ))}
          <motion.div
            className="absolute inset-[10%] rounded-full overflow-hidden"
            style={{
              boxShadow:
                '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
            animate={isPlaying ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-full" />
          </motion.div>
        </div>
      </div>
    );
  }

  // ───── STAGE: square cover with neon spotlight beam ─────
  if (themeId === 'stage') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}>
          {/* spotlight beam behind cover */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 -top-[60%] w-[140%] h-[140%]"
            style={{
              background:
                'radial-gradient(ellipse 50% 60% at 50% 100%, rgba(255,234,0,0.55), rgba(255,45,138,0.25) 50%, transparent 75%)',
              filter: 'blur(8px)',
            }}
            animate={isPlaying ? { opacity: [0.7, 1, 0.7] } : { opacity: 0.65 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-0 rounded-[20px] overflow-hidden"
            style={{
              boxShadow:
                '0 0 40px rgba(255,45,138,0.55), 0 0 0 2px rgba(255,255,255,0.18) inset',
            }}
            animate={isPlaying ? { y: [0, -4, 0] } : { y: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Cover coverUrl={coverUrl} title={title} songId={songId} rounded="rounded-[20px]" />
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
};

export default LockScreenArtwork;
