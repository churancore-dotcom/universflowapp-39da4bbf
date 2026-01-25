import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { iosSpring } from '@/lib/animations';

interface SplashScreenProps {
  onComplete: () => void;
}

// Detect if running in a simple WebView (AppsGeyser, etc.)
const isSimpleWebView = () => {
  try {
    const ua = navigator.userAgent.toLowerCase();
    // Detect Android WebView without Chrome branding (typical of AppsGeyser)
    const isAndroidWebView = ua.includes('wv') || (ua.includes('android') && !ua.includes('chrome'));
    // Detect if localStorage is blocked (common in restricted WebViews)
    let storageBlocked = false;
    try {
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');
    } catch {
      storageBlocked = true;
    }
    return isAndroidWebView || storageBlocked;
  } catch {
    return true; // If detection fails, assume it's a restricted WebView
  }
};

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isWebView] = useState(isSimpleWebView);
  
  // Faster timeout for WebViews (1.5s), normal for browsers (3s)
  useEffect(() => {
    const timeout = isWebView ? 1500 : 3000;
    const timer = setTimeout(() => {
      onComplete();
    }, timeout);
    
    return () => clearTimeout(timer);
  }, [onComplete, isWebView]);

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Animated ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(211 100% 50% / 0.3), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.6, 0.4],
            x: [-50, 50, -50],
            y: [-30, 30, -30],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Secondary glow */}
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(328 100% 54% / 0.25), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.3, 0.5, 0.3],
            x: [30, -30, 30],
            y: [20, -20, 20],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Tertiary purple glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(270 100% 60% / 0.2), transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />

        {/* Shooting Stars - reduced for WebView compatibility */}
        {!isWebView && [...Array(4)].map((_, i) => {
          const startX = 20 + i * 20;
          const startY = 10 + i * 8;
          const duration = 1.5 + i * 0.2;
          const delay = i * 0.8;
          
          return (
            <motion.div
              key={`shooting-star-${i}`}
              className="absolute"
              style={{
                top: `${startY}%`,
                left: `${startX}%`,
                width: '100px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), rgba(200,220,255,1))',
                borderRadius: '50%',
                filter: 'blur(0.5px)',
                boxShadow: '0 0 6px 2px rgba(200,220,255,0.6)',
              }}
              initial={{ 
                x: 0, 
                y: 0, 
                opacity: 0,
                rotate: 35,
                scale: 0.5,
              }}
              animate={{
                x: [0, 300],
                y: [0, 200],
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.3],
              }}
              transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatDelay: 4,
                ease: "easeOut",
              }}
            />
          );
        })}

        {/* Additional smaller shooting stars - skip in WebView */}
      </div>

      <div className="relative flex flex-col items-center">
        {/* Premium Universe Logo */}
        <motion.div
          className="relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            ...iosSpring,
            delay: 0.2,
          }}
        >
          {/* Outer cosmic ring */}
          <motion.div
            className="absolute -inset-8 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, hsl(211 100% 60%), hsl(270 80% 60%), hsl(328 100% 60%), hsl(211 100% 60%))',
              opacity: 0.4,
              filter: 'blur(8px)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Second orbital ring */}
          <motion.div
            className="absolute -inset-6 rounded-full border border-white/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          >
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-white"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `rotate(${angle}deg) translateX(calc(50% + 24px)) translateY(-50%)`,
                  boxShadow: '0 0 10px 3px rgba(255,255,255,0.8)',
                }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.3, 0.8] }}
                transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
              />
            ))}
          </motion.div>
          
          {/* Main logo container - Galaxy sphere */}
          <motion.div
            className="w-36 h-36 rounded-full flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #1a1a2e 0%, #0f0f1a 50%, #000000 100%)',
              boxShadow: '0 0 60px 20px rgba(100,150,255,0.3), inset 0 0 40px rgba(100,150,255,0.2)',
            }}
            animate={{
              boxShadow: [
                '0 0 60px 20px rgba(100,150,255,0.3), inset 0 0 40px rgba(100,150,255,0.2)',
                '0 0 80px 30px rgba(150,100,255,0.4), inset 0 0 50px rgba(150,100,255,0.3)',
                '0 0 60px 20px rgba(100,150,255,0.3), inset 0 0 40px rgba(100,150,255,0.2)',
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Galaxy spiral background */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(100,150,255,0.15) 60deg, transparent 120deg, rgba(200,100,255,0.1) 180deg, transparent 240deg, rgba(255,100,150,0.1) 300deg, transparent 360deg)',
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Nebula clouds */}
            <div
              className="absolute inset-4 rounded-full"
              style={{
                background: 'radial-gradient(ellipse at 30% 40%, rgba(100,150,255,0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(200,100,255,0.2) 0%, transparent 40%)',
                filter: 'blur(8px)',
              }}
            />
            
            {/* Star field */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: Math.random() * 2 + 1 + 'px',
                  height: Math.random() * 2 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1 + Math.random() * 2, delay: Math.random() * 2, repeat: Infinity }}
              />
            ))}
            
            {/* Central bright core */}
            <motion.div
              className="absolute w-16 h-16 rounded-full"
              style={{
                background: 'radial-gradient(circle at 40% 40%, #ffffff 0%, #a0c4ff 20%, #6b8cff 40%, transparent 70%)',
                filter: 'blur(4px)',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Universe "U" symbol */}
            <motion.svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              className="relative z-10"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <defs>
                <linearGradient id="uGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#a0c4ff" />
                  <stop offset="100%" stopColor="#c4a0ff" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Stylized "U" with music wave */}
              <motion.path
                d="M18 18 L18 38 C18 48 26 54 32 54 C38 54 46 48 46 38 L46 18"
                stroke="url(#uGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
                filter="url(#glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              />
              {/* Sound waves emanating */}
              {[0, 1, 2].map((i) => (
                <motion.path
                  key={i}
                  d={`M${50 + i * 6} 28 Q${54 + i * 6} 32 ${50 + i * 6} 36`}
                  stroke="url(#uGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: [0, 0.8, 0], pathLength: 1 }}
                  transition={{ 
                    duration: 1.5, 
                    delay: 1.5 + i * 0.3, 
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
              ))}
            </motion.svg>
          </motion.div>
        </motion.div>

        {/* Animated waveform */}
        <motion.div
          className="flex items-center justify-center gap-1.5 mt-12 h-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.8 }}
        >
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{
                background: `linear-gradient(to top, hsl(211 100% 60%), hsl(328 100% 60%))`,
              }}
              animate={{
                height: [4, 24 + Math.sin(i * 0.8) * 12, 4],
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.06,
              }}
            />
          ))}
        </motion.div>

        {/* Brand name - Univers Flow */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 1 }}
        >
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Univers</span>
            <span className="text-white ml-2">Flow</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-3 text-muted-foreground text-sm font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          Premium Music Experience
        </motion.p>

        {/* Creator credit */}
        <motion.p
          className="mt-8 text-[11px] text-muted-foreground/60 font-medium tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          by Shashank Yadav
        </motion.p>

        {/* Skip button */}
        <motion.button
          onClick={handleSkip}
          className="mt-10 px-6 py-2.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm text-white/80 text-sm font-medium tracking-wide hover:bg-white/10 hover:border-white/30 transition-all duration-300 active:scale-95"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Skip →
        </motion.button>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
