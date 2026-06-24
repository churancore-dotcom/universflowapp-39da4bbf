import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Disc3, Play } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import OptimizedImage from './OptimizedImage';
import { triggerHaptic } from '@/hooks/useHaptics';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { rerank } from '@/lib/feedPersonalizer';

interface Props { songs: Song[] }

/**
 * Apple Music "Just Dropped" style — one giant hero card + 4 compact rows.
 * Distinct from horizontal scroll; immediately draws the eye to the newest drop.
 */
const FreshReleasesSection = memo(({ songs }: Props) => {
  const { playSong } = usePlayer();
  const taste = useTasteProfile();

  const fresh = useMemo(() => {
    const flagged = songs.filter((s) => (s as Song & { show_in_new_releases?: boolean }).show_in_new_releases);
    const pool = flagged.length > 0
      ? flagged
      : [...songs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    // Widen window, silently re-rank to the user's taste, then trim to the hero set.
    const window = pool.slice(0, 20);
    return rerank(window, taste).slice(0, 5);
  }, [songs, taste]);

  if (fresh.length === 0) return null;
  const hero = fresh[0];
  const rest = fresh.slice(1);

  const play = (s: Song) => { triggerHaptic('selection'); playSong(s, undefined, fresh); };

  return (
    <section className="mb-2">
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(120,90,255,0.10) 0%, rgba(255,255,255,0.02) 60%)',
          border: '0.5px solid rgba(120,90,255,0.18)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
      >
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <div
            className="w-9 h-9 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #785aff, #00d4ff)' }}
          >
            <Disc3 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight text-foreground">Fresh Releases</h2>
            <p className="text-[11px] text-muted-foreground/60 font-medium">Just dropped, hear it first</p>
          </div>
        </div>

        {/* Hero card */}
        <div className="px-3 pb-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => play(hero)}
            className="relative w-full h-44 rounded-3xl overflow-hidden text-left group"
            style={{ boxShadow: '0 10px 32px rgba(0,0,0,0.45)' }}
          >
            {hero.cover_url && (
              <OptimizedImage src={hero.cover_url} alt={hero.title} className="absolute inset-0 w-full h-full object-cover scale-110" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-white/15 backdrop-blur-md">
              <span className="text-[10px] font-bold tracking-widest text-white uppercase">New</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-black text-white truncate leading-tight" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                  {hero.title}
                </p>
                <p className="text-[13px] text-white/75 truncate mt-0.5">{hero.artist}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
              </div>
            </div>
          </motion.button>
        </div>

        {/* Compact rest */}
        <div className="px-2 pb-2">
          {rest.map((song, idx) => (
            <motion.button
              key={song.id}
              onClick={() => play(song)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + idx * 0.03 }}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-3xl text-left active:bg-white/5"
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
                {song.cover_url && <OptimizedImage src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{song.title}</p>
                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{song.artist}</p>
              </div>
              <span className="text-[10px] font-bold text-violet-300/80 uppercase tracking-wider flex-shrink-0">New</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
});

FreshReleasesSection.displayName = 'FreshReleasesSection';
export default FreshReleasesSection;
