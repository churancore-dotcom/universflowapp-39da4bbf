import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Play } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import OptimizedImage from './OptimizedImage';
import { triggerHaptic } from '@/hooks/useHaptics';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { rerank } from '@/lib/feedPersonalizer';

interface Props { songs: Song[] }

/**
 * Spotify "Top 50" style — vertical ranked Top-10 list with big numerals,
 * NOT a horizontal scroll. Feels like a chart, instantly scannable.
 */
const TrendingNowSection = memo(({ songs }: Props) => {
  const { playSong, currentSong } = usePlayer();
  const taste = useTasteProfile();

  const trending = useMemo(() => {
    const flagged = songs.filter((s) => (s as Song & { show_in_trending?: boolean }).show_in_trending);
    const pool = flagged.length > 0 ? flagged : songs;
    // Pull a larger window then silently re-rank to user taste, finally trim.
    const window = pool.slice(0, 30);
    return rerank(window, taste).slice(0, 10);
  }, [songs, taste]);

  if (trending.length === 0) return null;

  return (
    <section className="mb-2">
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,90,120,0.10) 0%, rgba(255,255,255,0.02) 60%)',
          border: '0.5px solid rgba(255,90,120,0.18)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <div
            className="w-9 h-9 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff2d55, #ff6b35)' }}
          >
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight text-foreground">Trending Now</h2>
            <p className="text-[11px] text-muted-foreground/60 font-medium">Top 10 most played today</p>
          </div>
        </div>

        {/* Ranked list */}
        <div className="px-2 pb-2">
          {trending.map((song, idx) => {
            const isPlaying = currentSong?.id === song.id;
            return (
              <motion.button
                key={song.id}
                onClick={() => { triggerHaptic('selection'); playSong(song, undefined, trending); }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.025 }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-3xl text-left active:bg-white/5"
              >
                <span
                  className={`text-[22px] font-black w-7 text-center tabular-nums ${
                    idx < 3 ? 'text-rose-400' : 'text-muted-foreground/40'
                  }`}
                  style={idx < 3 ? { textShadow: '0 0 12px rgba(255,45,85,0.4)' } : undefined}
                >
                  {idx + 1}
                </span>
                <div
                  className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-white/5"
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                >
                  {song.cover_url ? (
                    <OptimizedImage src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] font-semibold truncate leading-tight ${isPlaying ? 'text-primary' : 'text-foreground'}`}>
                    {song.title}
                  </p>
                  <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">{song.artist}</p>
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-foreground" fill="currentColor" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
});

TrendingNowSection.displayName = 'TrendingNowSection';
export default TrendingNowSection;
