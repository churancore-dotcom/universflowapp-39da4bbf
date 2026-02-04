import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1800);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Simple static gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-40"
          style={{
            background: 'radial-gradient(circle, hsl(211 100% 50% / 0.4), transparent 60%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, hsl(328 100% 54% / 0.35), transparent 60%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Simple Logo */}
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center relative"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #1a1a2e 0%, #0f0f1a 50%, #000000 100%)',
              boxShadow: '0 0 50px 15px rgba(100,150,255,0.3)',
            }}
          >
            {/* Universe "U" symbol */}
            <svg width="56" height="56" viewBox="0 0 64 64">
              <defs>
                <linearGradient id="uGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#a0c4ff" />
                  <stop offset="100%" stopColor="#c4a0ff" />
                </linearGradient>
              </defs>
              <path
                d="M18 18 L18 38 C18 48 26 54 32 54 C38 54 46 48 46 38 L46 18"
                stroke="url(#uGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
        </motion.div>

        {/* Simple loading indicator */}
        <motion.div
          className="flex items-center justify-center gap-1 mt-8 h-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>

        {/* Brand name */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Univers</span>
            <span className="text-white ml-1">Flow</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-2 text-muted-foreground text-sm font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Premium Music Experience
        </motion.p>

        {/* Developer branding */}
        <motion.div
          className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-[10px] text-muted-foreground/50 tracking-wide">
            Crafted by
          </p>
          <p className="text-xs font-semibold text-primary tracking-wide mt-0.5">
            SHASHANK YADAV
          </p>
        </motion.div>

        {/* Skip button */}
        <motion.button
          onClick={onComplete}
          className="mt-8 px-5 py-2 rounded-full border border-white/20 bg-white/5 text-white/70 text-sm font-medium active:scale-95 transition-transform"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Skip →
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
