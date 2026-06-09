import { useEffect } from 'react';
import { motion } from 'framer-motion';
import mark from '@/assets/universflow-mark.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: '#050507' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Ambient rose halo */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(255,45,85,0.22), rgba(255,45,85,0.05) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative flex flex-col items-center">
        <motion.img
          src={mark}
          alt="Univers Flow"
          width={132}
          height={132}
          className="w-[132px] h-[132px] object-contain"
          initial={{ scale: 0.86, opacity: 0, filter: 'blur(8px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: 'drop-shadow(0 8px 32px rgba(255,45,85,0.35))' }}
        />

        <motion.h1
          className="mt-7 text-[22px] font-semibold tracking-[0.32em] text-white/95"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
        >
          UNIVERS FLOW
        </motion.h1>

        <motion.div
          className="mt-6 h-[2px] w-24 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <motion.div
            className="h-full w-1/2"
            style={{
              background: 'linear-gradient(90deg, transparent, #FF2D55, transparent)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
