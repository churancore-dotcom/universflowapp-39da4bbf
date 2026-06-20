import { useEffect, useRef, useState } from 'react';
import appLogo from '@/assets/app-logo.gif.asset.json';


interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * SplashScreen — clean logo reveal with CSS keyframes.
 * Fires onComplete after the logo animation finishes (≈ 2.2 s)
 * or after a hard cap so we never block the app.
 */
const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const doneRef = useRef(false);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out' | 'done'>('in');

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  useEffect(() => {
    // Hard cap so a broken asset never wedges the app
    const cap = window.setTimeout(finish, 3500);

    const t1 = window.setTimeout(() => setPhase('hold'), 600);
    const t2 = window.setTimeout(() => setPhase('out'), 1800);
    const t3 = window.setTimeout(() => {
      setPhase('done');
      finish();
    }, 2200);

    return () => {
      window.clearTimeout(cap);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoScale = phase === 'in' ? 'scale-75 opacity-0' : phase === 'hold' ? 'scale-100 opacity-100' : phase === 'out' ? 'scale-110 opacity-0' : 'scale-110 opacity-0';

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-black">
      <div className="flex flex-col items-center justify-center">
        <img
          src={appLogo.url}
          alt="Univers Flow"
          width={160}
          height={160}
          loading="eager"
          decoding="async"
          {...({ fetchpriority: "high" } as any)}
          className={`h-40 w-40 object-contain transition-all duration-[600ms] ease-out ${logoScale}`}
          draggable={false}
        />
        <div
          className={`mt-8 text-white transition-all duration-[600ms] ease-out ${logoScale}`}
          style={{
            fontSize: 30,
            letterSpacing: '0.34em',
            fontWeight: 700,
          }}
        >
          UNIVERS FLOW
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
