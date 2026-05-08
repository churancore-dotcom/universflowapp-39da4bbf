import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Collection {
  label: string;
  emoji: string;
  query: string;
  gradient: string;
}

const COLLECTIONS: Collection[] = [
  { label: 'Bollywood\nClassics', emoji: '🎬', query: 'bollywood', gradient: 'linear-gradient(135deg,#5BC0BE,#3A86FF,#8338EC)' },
  { label: 'K-Pop\nEssentials', emoji: '🇰🇷', query: 'kpop', gradient: 'linear-gradient(135deg,#FF6B9D,#FF2D55,#9B5DE5)' },
  { label: 'Punjabi\nBangers', emoji: '🥁', query: 'punjabi', gradient: 'linear-gradient(135deg,#06D6A0,#26C485,#00B4D8)' },
  { label: 'Indie\nVibes', emoji: '🎻', query: 'indie', gradient: 'linear-gradient(135deg,#A06CD5,#7B2CBF,#5A189A)' },
  { label: 'Hip Hop\nHeat', emoji: '🔥', query: 'hip hop', gradient: 'linear-gradient(135deg,#F77F00,#D62828,#9D0208)' },
  { label: 'Lo-Fi\nChill', emoji: '🌙', query: 'lofi chill', gradient: 'linear-gradient(135deg,#3A0CA3,#4361EE,#4CC9F0)' },
  { label: 'Latin\nFiesta', emoji: '💃', query: 'latin reggaeton', gradient: 'linear-gradient(135deg,#FB5607,#FF006E,#8338EC)' },
  { label: 'Workout\nPump', emoji: '💪', query: 'workout edm', gradient: 'linear-gradient(135deg,#06FFA5,#0496FF,#7400B8)' },
];

function CuratedCollectionsComponent() {
  const navigate = useNavigate();

  return (
    <section className="space-y-2.5">
      <h2 className="text-[20px] font-extrabold tracking-tight px-1">Curated Collections</h2>
      <div className="flex gap-2.5 overflow-x-auto hide-scrollbar -mx-3 px-3 pb-1">
        {COLLECTIONS.map((c) => (
          <motion.button
            key={c.label}
            onClick={() => { triggerHaptic('selection'); navigate(`/search?q=${encodeURIComponent(c.query)}`); }}
            whileTap={{ scale: 0.94 }}
            className="flex-shrink-0 w-[140px] h-[58px] rounded-xl px-3 flex items-center justify-between text-left text-white shadow-md"
            style={{
              background: c.gradient,
              border: '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <p className="text-[12.5px] font-extrabold leading-[1.1] whitespace-pre-line drop-shadow-sm">
              {c.label}
            </p>
            <span className="text-[20px] leading-none drop-shadow-sm">{c.emoji}</span>
          </motion.button>
        ))}
      </div>
    </section>
  );
}

const CuratedCollections = memo(CuratedCollectionsComponent);
CuratedCollections.displayName = 'CuratedCollections';
export default CuratedCollections;
