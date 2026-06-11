import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import appLogo from '@/assets/app-logo.png';
import splashVideo from '@/assets/splash.mp4.asset.json';
import { cdnAssetUrl } from '@/lib/assetUrl';

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash: plays the branded splash.mp4 once, then dismisses.
 * Falls back to the static logo if the video fails to load/play
 * (older webviews, autoplay blocked, etc.). Hard cap at 2.6s so the
 * shell is never stuck behind splash.
 */
const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onComplete();
    };

    // Hard cap so we never hang on splash.
    const hardCap = setTimeout(finish, 2600);

    const v = videoRef.current;
    if (v) {
      const onEnded = () => finish();
      const onError = () => {
        setVideoFailed(true);
        setTimeout(finish, 500);
      };
      v.addEventListener('ended', onEnded);
      v.addEventListener('error', onError);
      // Try to play; if autoplay is blocked, treat as failed.
      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          setVideoFailed(true);
          setTimeout(finish, 500);
        });
      }
      return () => {
        clearTimeout(hardCap);
        v.removeEventListener('ended', onEnded);
        v.removeEventListener('error', onError);
      };
    }
    return () => clearTimeout(hardCap);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {!videoFailed && (
        <video
          ref={videoRef}
          src={cdnAssetUrl(splashVideo.url)}
          autoPlay
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {videoFailed && (
        <motion.div
          className="flex flex-col items-center gap-5"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <div
            className="w-28 h-28 rounded-[28px] overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1a1a1c 0%, #0a0a0b 100%)',
              boxShadow:
                '0 0 48px hsl(var(--primary) / 0.28), inset 0 0 0 0.5px rgba(255,255,255,0.08)',
            }}
          >
            <img
              src={appLogo}
              alt="Universflow"
              width={112}
              height={112}
              decoding="sync"
              fetchpriority="high"
              className="w-full h-full object-cover scale-[1.18]"
            />
          </div>
          <div className="text-center">
            <h1 className="text-[26px] leading-none font-black tracking-[0.08em] text-foreground">
              Univers <span className="text-primary">Flow</span>
            </h1>
            <div className="mt-3 h-[2px] w-24 mx-auto rounded-full uf-rose-gradient opacity-90" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SplashScreen;
