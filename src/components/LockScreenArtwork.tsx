import { motion, AnimatePresence } from 'framer-motion';
import { Music } from 'lucide-react';
import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  title: string;
  songId: string;
  isPlaying?: boolean;
}

const COVER_SIZE = 'min(58vw, 240px)';

/**
 * Lock-screen hero artwork.
 *
 * Default `classic` intentionally shows no big centre PFP/artwork — the cover
 * only drives the animated background, matching the older simple lock screen.
 * Other themes may show a compact floating cover, but never force the default
 * into the vinyl layout again.
 */
const LockScreenArtwork = ({ themeId = 'classic', coverUrl, title, songId, isPlaying }: Props) => {
  if (themeId === 'classic') {
    return <div className="h-7 flex-shrink-0" aria-hidden />;
  }

  // Other themes: clean square cover.
  return (
    <div className="flex justify-center items-center px-6 mb-2">
      <div className="relative lockfx-cover-float" style={{ width: COVER_SIZE, aspectRatio: '1 / 1', animationPlayState: isPlaying ? 'running' : 'paused' }}>
        <div
          className="absolute inset-0 rounded-[24px] overflow-hidden"
          style={{
            boxShadow:
              '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={songId}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white/60" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LockScreenArtwork;
