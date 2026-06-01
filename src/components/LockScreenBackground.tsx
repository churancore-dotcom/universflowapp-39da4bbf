import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId: LockScreenThemeId;
  coverUrl?: string | null;
  isPlaying: boolean;
}

/**
 * Each theme renders a *unique full-screen background* that pairs with
 * its artwork variant in LockScreenArtwork. Keep effects mobile-friendly.
 */
const LockScreenBackground = ({ themeId, coverUrl, isPlaying }: Props) => {
  // CLASSIC + VINYL — blurred album-art background (different artwork on top)
  if (themeId === 'classic' || themeId === 'vinyl') {
    return (
      <div className="absolute inset-0">
        {coverUrl && (
          <motion.img
            key={coverUrl}
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1.05, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
          />
        )}
        <div className="absolute inset-0 backdrop-blur-[80px] bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/75" />
        {themeId === 'vinyl' && (
          // subtle aurora layer for the vinyl theme
          <motion.div
            className="absolute -inset-1/4"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, rgba(11,30,63,0.5), rgba(31,122,106,0.45), rgba(184,51,168,0.5), rgba(11,30,63,0.5))',
              filter: 'blur(80px)',
              mixBlendMode: 'screen',
            }}
            animate={{ rotate: isPlaying ? 360 : 0 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    );
  }

  if (themeId === 'pulse') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#06030f]">
        {coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 backdrop-blur-[90px] bg-black/55" />
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255,45,85,0.35) 0%, transparent 55%), radial-gradient(circle at 50% 50%, rgba(94,92,230,0.3) 30%, transparent 70%)',
          }}
          animate={{ opacity: isPlaying ? [0.55, 1, 0.55] : 0.55 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
      </div>
    );
  }

  if (themeId === 'prism') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#06030f]">
        <motion.div
          className="absolute w-[70vw] h-[70vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,45,85,0.7) 0%, transparent 60%)',
            filter: 'blur(60px)',
            top: '-10%',
            left: '-20%',
          }}
          animate={{ x: [0, 120, -40, 0], y: [0, 80, 160, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(94,92,230,0.7) 0%, transparent 60%)',
            filter: 'blur(60px)',
            bottom: '-10%',
            right: '-15%',
          }}
          animate={{ x: [0, -100, 40, 0], y: [0, -60, -120, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/65" />
      </div>
    );
  }

  if (themeId === 'orbit') {
    return <StarfieldBackground isPlaying={isPlaying} />;
  }

  if (themeId === 'stage') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#1b0633] via-[#4a0e6e] to-[#ff2d8a]">
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-[28%] w-[55vw] h-[55vw] rounded-full"
          style={{
            background: 'radial-gradient(circle, #ffea00 0%, #ff2d8a 60%, transparent 80%)',
            filter: 'blur(2px)',
          }}
          animate={{ opacity: isPlaying ? [0.85, 1, 0.85] : 0.9 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1/2"
          style={{
            background:
              'linear-gradient(transparent 0%, rgba(255,45,138,0.35) 100%), repeating-linear-gradient(90deg, transparent 0, transparent 38px, rgba(255,255,255,0.35) 39px, rgba(255,255,255,0.35) 40px), repeating-linear-gradient(0deg, transparent 0, transparent 38px, rgba(255,255,255,0.35) 39px, rgba(255,255,255,0.35) 40px)',
            transform: 'perspective(400px) rotateX(60deg)',
            transformOrigin: 'bottom',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/75" />
      </div>
    );
  }

  return null;
};

const StarfieldBackground = ({ isPlaying }: { isPlaying: boolean }) => {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, #2a2563 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, #5b2a8c 0%, transparent 50%), #06030f',
        }}
      />
      {stars.map((s, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 4}px rgba(255,255,255,0.8)`,
          }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: isPlaying ? s.duration : s.duration * 2,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/65" />
    </div>
  );
};

export default LockScreenBackground;
