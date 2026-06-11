import { useEffect } from 'react';
import { motion } from 'framer-motion';
import appLogo from '@/assets/app-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2450);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-background"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <motion.div
        className="absolute inset-0 opacity-90"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 42%, hsl(var(--primary) / 0.22) 0%, hsl(var(--primary) / 0.08) 28%, transparent 58%)',
        }}
      />

      <motion.div
        className="relative flex h-full w-full flex-col items-center justify-center px-8"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className="absolute h-[78vw] max-h-[360px] w-[78vw] max-w-[360px] rounded-full"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: [0, 0.42, 0.18], scale: [0.7, 1.05, 1.18] }}
          transition={{ duration: 1.9, ease: 'easeOut' }}
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.36) 0%, hsl(var(--primary) / 0.12) 36%, transparent 68%)',
            filter: 'blur(18px)',
          }}
        />
        <motion.div
          className="relative flex h-[58vw] max-h-[260px] min-h-[210px] w-[58vw] max-w-[260px] min-w-[210px] items-center justify-center overflow-hidden rounded-[32%]"
          initial={{ y: 18 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          style={{
            background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
            boxShadow:
              '0 0 120px hsl(var(--primary) / 0.42), inset 0 0 0 0.5px hsl(var(--foreground) / 0.1)',
          }}
        >
          <motion.img
            src={appLogo}
            alt="Universflow"
            width={260}
            height={260}
            decoding="sync"
            {...({ fetchpriority: 'high' } as any)}
            className="h-full w-full object-cover scale-[1.18]"
            initial={{ scale: 1.02 }}
            animate={{ scale: [1.02, 1.16, 1.1] }}
            transition={{ duration: 1.55, ease: 'easeInOut' }}
          />
        </motion.div>

        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.55, ease: 'easeOut' }}
        >
          <h1 className="font-display text-[54px] leading-none tracking-wide text-foreground">UNIVERSFLOW</h1>
          <div className="mx-auto mt-6 h-[3px] w-40 rounded-full uf-rose-gradient" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
