import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ExternalLink, Minus, Plus, RotateCcw } from 'lucide-react';
import { fetchLyrics, findActiveLine, type LyricsResult, type LyricLine } from '@/lib/lyrics';
import { playerProgressStore } from '@/lib/playerProgressStore';

interface Props {
  artist: string;
  title: string;
  duration?: number;
}

const EMPTY: LyricsResult = {
  synced: [], plain: null, source: null, geniusUrl: null, hasLyrics: false, isSynced: false,
};

const OFFSET_KEY = 'uf_lyrics_offset_v1';
const loadOffset = (): number => {
  try { return parseFloat(localStorage.getItem(OFFSET_KEY) || '0') || 0; } catch { return 0; }
};
const saveOffset = (v: number) => { try { localStorage.setItem(OFFSET_KEY, String(v)); } catch {} };

/**
 * Karaoke-style lyrics stage. Uses rAF-driven progress (not React state) so the
 * active line updates 60fps without re-renders elsewhere. Active line gets a
 * shimmer-sweep, glow halo, and a soft pop-in. Adjustable timing offset (±s).
 */
const KaraokeLyricsStage = ({ artist, title, duration }: Props) => {
  const [lyrics, setLyrics] = useState<LyricsResult>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [offset, setOffset] = useState<number>(loadOffset);
  const [showOffsetUI, setShowOffsetUI] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Fetch lyrics whenever song changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLyrics(EMPTY);
    setActiveIdx(-1);
    fetchLyrics(artist, title, duration).then((r) => {
      if (!cancelled) { setLyrics(r); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [artist, title, duration]);

  // rAF loop for true 60fps sync — reads progress directly from store
  useEffect(() => {
    if (!lyrics.isSynced) return;
    const tick = () => {
      const t = playerProgressStore.getProgress() + offset;
      const idx = findActiveLine(lyrics.synced, t);
      setActiveIdx((prev) => (prev === idx ? prev : idx));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [lyrics, offset]);

  const adjustOffset = (delta: number) => {
    const v = Math.max(-5, Math.min(5, +(offset + delta).toFixed(2)));
    setOffset(v); saveOffset(v);
  };
  const resetOffset = () => { setOffset(0); saveOffset(0); };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <motion.div
          className="flex items-center gap-2 text-white/45 text-[13px] font-medium tracking-wide"
          animate={{ opacity: [0.35, 0.85, 0.35] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          Searching lyrics
        </motion.div>
      </div>
    );
  }

  if (!lyrics.hasLyrics) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
        >
          <Music2 className="w-6 h-6 text-white/40" />
        </motion.div>
        <p className="text-white/70 text-[15px] font-semibold tracking-tight">
          No lyrics found
        </p>
        <p className="text-white/35 text-[12px] font-medium max-w-[260px] leading-relaxed">
          Just vibe — when lyrics exist they appear here in real-time.
        </p>
        {lyrics.geniusUrl && (
          <a href={lyrics.geniusUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-white/55 underline underline-offset-4 mt-1">
            View on Genius <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  if (!lyrics.isSynced) {
    return (
      <div className="h-full w-full overflow-y-auto px-7 py-10 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: 'none',
          WebkitMaskImage: 'linear-gradient(180deg,transparent 0%,#000 12%,#000 88%,transparent 100%)',
          maskImage: 'linear-gradient(180deg,transparent 0%,#000 12%,#000 88%,transparent 100%)',
        }}>
        <p className="text-white/75 text-[17px] leading-[1.7] font-semibold whitespace-pre-wrap tracking-tight text-center">
          {lyrics.plain}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <KaraokeView lines={lyrics.synced} activeIdx={activeIdx} />

      {/* Offset adjuster (tap once on header to reveal — handled by parent toggle) */}
      <AnimatePresence>
        {showOffsetUI && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            <button onClick={() => adjustOffset(-0.2)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/10"><Minus className="w-3 h-3 text-white/80" /></button>
            <span className="text-[11px] text-white/85 font-mono tabular-nums min-w-[44px] text-center">{offset >= 0 ? '+' : ''}{offset.toFixed(1)}s</span>
            <button onClick={() => adjustOffset(0.2)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/10"><Plus className="w-3 h-3 text-white/80" /></button>
            <button onClick={resetOffset} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-white/10"><RotateCcw className="w-3 h-3 text-white/80" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap zone in top area toggles offset UI */}
      <button
        aria-label="Adjust lyrics timing"
        onClick={() => setShowOffsetUI((v) => !v)}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 opacity-0"
      />
    </div>
  );
};

/* ─────────────────── Karaoke renderer ─────────────────── */

const LINE_H = 60;
const WINDOW = 4;

const KaraokeView = ({ lines, activeIdx }: { lines: LyricLine[]; activeIdx: number }) => {
  const visualIdx = activeIdx < 0 ? 0 : activeIdx;
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Top/bottom soft fade */}
      <div className="absolute inset-0 pointer-events-none" style={{
        WebkitMaskImage: 'linear-gradient(180deg,transparent 0%,#000 18%,#000 82%,transparent 100%)',
        maskImage: 'linear-gradient(180deg,transparent 0%,#000 18%,#000 82%,transparent 100%)',
      }} />

      {/* Active-line halo */}
      <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[72px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.22) 0%, transparent 70%)', filter: 'blur(10px)' }} />

      <motion.div
        className="absolute left-0 right-0 px-6"
        style={{ top: '50%' }}
        animate={{ y: -visualIdx * LINE_H - LINE_H / 2 }}
        transition={{ type: 'spring', stiffness: 220, damping: 30, mass: 0.9 }}
      >
        {lines.map((line, i) => {
          const d = i - activeIdx;
          const inWindow = Math.abs(d) <= WINDOW;
          if (!inWindow) return <div key={i} style={{ height: LINE_H }} aria-hidden />;
          const isActive = d === 0;
          const absD = Math.abs(d);
          const opacity = isActive ? 1 : Math.max(0.18, 0.55 - absD * 0.12);
          const scale = isActive ? 1 : 0.9 - Math.min(absD * 0.02, 0.08);
          const blur = isActive ? 0 : Math.min(absD * 0.7, 2.4);

          return (
            <motion.div
              key={i}
              layout
              initial={false}
              animate={{ opacity, scale, filter: `blur(${blur}px)` }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="relative text-center font-extrabold tracking-tight leading-tight will-change-transform"
              style={{
                height: LINE_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isActive ? 26 : 20,
                color: isActive ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.6)',
                textShadow: isActive ? '0 4px 28px rgba(255,45,85,0.4), 0 0 1px rgba(255,255,255,0.5)' : 'none',
              }}
            >
              {isActive ? (
                <motion.span
                  key={`active-${i}`}
                  initial={{ opacity: 0, y: 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="relative line-clamp-2 px-2"
                  style={{
                    backgroundImage: 'linear-gradient(95deg, #ffffff 0%, #ffffff 45%, #ffd8e1 55%, #ffffff 65%, #ffffff 100%)',
                    backgroundSize: '220% 100%',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    animation: 'lyricShimmer 2.4s ease-in-out infinite',
                  }}
                >
                  {line.text || '♪'}
                </motion.span>
              ) : (
                <span className="line-clamp-2 px-2">{line.text || '♪'}</span>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      <style>{`
        @keyframes lyricShimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
};

export default KaraokeLyricsStage;
