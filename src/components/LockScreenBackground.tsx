import { memo, useEffect, useState } from 'react';

interface Props {
  coverUrl?: string | null;
  isPlaying?: boolean;
}

/**
 * Module-level decoded-image cache. Browsers already cache the byte response,
 * but creating a fresh <img> on every track change re-decodes + re-rasterises
 * the heavy 90px blur. Preloading + reusing the same <img>.src across mounts
 * keeps the blurred layer warm on the GPU and removes the per-track hiccup.
 */
const decodedCache = new Map<string, Promise<void>>();
function preloadCover(url: string) {
  if (decodedCache.has(url)) return decodedCache.get(url)!;
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
  decodedCache.set(url, p);
  return p;
}

/**
 * Persistent blurred cover layer. Renders TWO stacked covers and crossfades
 * between them on URL change so the GPU never sees a blank → re-blur frame.
 */
const CachedBlurCover = memo(({ url }: { url: string | null | undefined }) => {
  const [current, setCurrent] = useState<string | null>(url || null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!url || url === current) return;
    let cancelled = false;
    preloadCover(url).then(() => {
      if (cancelled) return;
      setPrevious(current);
      setCurrent(url);
      setFading(true);
      const t = window.setTimeout(() => setFading(false), 450);
      return () => window.clearTimeout(t);
    });
    return () => { cancelled = true; };
  }, [url, current]);

  return (
    <>
      {previous && fading && (
        <img
          src={previous}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 opacity-70 transition-opacity duration-500"
          style={{ filter: 'blur(90px) saturate(1.2)', willChange: 'opacity', transform: 'translateZ(0) scale(1.25)' }}
          draggable={false}
        />
      )}
      {current && (
        <img
          src={current}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 opacity-70"
          style={{
            filter: 'blur(90px) saturate(1.2)',
            willChange: 'filter',
            transform: 'translateZ(0) scale(1.25)',
            animation: fading ? 'lockfxFadeIn 450ms ease-out' : undefined,
          }}
          draggable={false}
        />
      )}
    </>
  );
});
CachedBlurCover.displayName = 'CachedBlurCover';

const LockScreenBackground = ({ coverUrl, isPlaying }: Props) => {
  const bgGradient = 'linear-gradient(180deg, hsl(220 22% 18%) 0%, hsl(222 28% 10%) 56%, hsl(228 34% 5%) 100%)';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: bgGradient }}>
      <CachedBlurCover url={coverUrl} />
      <div className="lockfx-ios-sheen" aria-hidden style={{ animationPlayState: isPlaying ? 'running' : 'paused' }} />
      <div className="lockfx-ios-grain" aria-hidden />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
};

export default LockScreenBackground;
