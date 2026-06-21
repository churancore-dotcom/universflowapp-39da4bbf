import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Re-export shared types/utils/hooks so existing imports keep working.
// New code should import directly from './artistShared' or './useArtistLive'.
export type { ArtistProfile, ArtistSong } from './artistShared';
export { fmt } from './artistShared';
export { useArtistLive } from './useArtistLive';

export function StatCard({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden transition-shadow"
      style={{
        background: accent
          ? 'linear-gradient(160deg, rgba(255,45,85,0.18), rgba(16,16,18,0.6))'
          : 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.07)',
        boxShadow: pulse
          ? '0 0 0 1px rgba(255,45,85,0.45), 0 8px 32px -8px rgba(255,45,85,0.35)'
          : undefined,
      }}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={value}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="mt-2 text-[22px] font-semibold tabular-nums leading-none"
        >
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
