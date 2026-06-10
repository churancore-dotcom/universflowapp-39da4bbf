import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
// Bundled locally in /public so the APK shows it instantly without hitting the CDN.
const SPLASH_VIDEO = '/media/splash.mp4';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Hard cap so we never block the app even if the video stalls
    const fallback = setTimeout(onComplete, 4000);
    return () => clearTimeout(fallback);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="w-44 h-44 rounded-full overflow-hidden flex items-center justify-center bg-black shadow-[0_0_48px_hsl(var(--primary)_/_0.24)]">
          <video
            ref={videoRef}
            src={SPLASH_VIDEO}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={onComplete}
            onError={onComplete}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-center">
          <h1 className="text-[28px] leading-none font-black tracking-[0.08em] text-foreground">
            Univers <span className="text-primary">Flow</span>
          </h1>
          <div className="mt-3 h-[2px] w-28 mx-auto rounded-full uf-rose-gradient opacity-90" />
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
