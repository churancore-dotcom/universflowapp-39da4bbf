import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, Headphones } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { supabase } from '@/integrations/supabase/client';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Props {
  songs: Song[];
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] as any },
});

/**
 * Stacked Bento home hero + quick tiles.
 * Rose-ember palette, Bebas Neue display, real data only.
 * Falls back to stream_songs when the local catalog is empty.
 */
const HomeBento: React.FC<Props> = ({ songs }) => {
  const { currentSong, playSong, togglePlay, isPlaying } = usePlayer();
  const navigate = useNavigate();

  // Stream-songs fallback (catalog is mostly stream-only in this app).
  const { data: streamSongs = [] } = useQuery({
    queryKey: ['home-bento', 'stream-fallback'],
    enabled: songs.length === 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Song[]> => {
      const { data, error } = await supabase
        .from('stream_songs')
        .select('track_id,title,artist,cover_url,audio_url,duration,genre,mood,album,last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data || []).map((s: any) => ({
        id: s.track_id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
        duration: s.duration || undefined,
        genre: s.genre || undefined,
        mood: s.mood || undefined,
      } as Song));
    },
  });

  const pool = songs.length > 0 ? songs : streamSongs;

  const hero: Song | undefined = currentSong || pool[0];
  const newRelease = pool[0];
  const recent = useMemo(() => pool.slice(0, 2), [pool]);

  // Top artist: pick the first song with an artist photo, else first song's artist.
  const topArtist = useMemo(() => {
    const withPhoto = pool.find((s) => s.artist_photo_url);
    const seed = withPhoto || pool[0];
    if (!seed) return null;
    return {
      id: seed.artist_id,
      name: seed.artist,
      photo: seed.artist_photo_url || seed.cover_url,
    };
  }, [pool]);

  const featured = useMemo(() => {
    const album = pool.find((s) => s.album && s.cover_url);
    return album;
  }, [pool]);

  const handleResume = () => {
    if (!hero) return;
    triggerHaptic('selection');
    // Real working playback: toggle if same song, else start fresh
    if (currentSong && currentSong.id === hero.id) {
      togglePlay();
    } else {
      playSong(hero, null, pool.slice(0, 30));
    }
  };

  const handleMood = (mood: string) => {
    triggerHaptic('selection');
    navigate(`/search?q=${encodeURIComponent(mood)}`);
  };

  const heroPlaying = !!currentSong && currentSong.id === hero?.id && isPlaying;

  return (
    <div className="space-y-3" style={{ fontFamily: 'Barlow, Inter, system-ui, sans-serif' }}>
      {/* Hero — Continue Listening (real playback, cover-as-background) */}
      {hero && (
        <motion.button
          {...fadeUp(0)}
          onClick={handleResume}
          className="w-full text-left rounded-3xl p-5 relative overflow-hidden block active:scale-[0.98] transition-transform min-h-[148px]"
          style={{
            background: 'linear-gradient(135deg, #FF2D55 0%, #FFB199 100%)',
            boxShadow: '0 12px 40px -10px rgba(255,45,85,0.45)',
          }}
        >
          {/* Cover as background — large blurred photo on the right, masked into the gradient */}
          {hero.cover_url && (
            <>
              <img
                src={hero.cover_url}
                alt=""
                aria-hidden
                className="absolute inset-y-0 right-0 h-full w-2/3 object-cover pointer-events-none"
                style={{
                  filter: 'blur(18px) saturate(140%)',
                  opacity: 0.55,
                  WebkitMaskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
                  maskImage: 'linear-gradient(to left, #000 30%, transparent 100%)',
                }}
              />
              <img
                src={hero.cover_url}
                alt=""
                aria-hidden
                className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl object-cover pointer-events-none shadow-2xl"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}
              />
            </>
          )}

          <div className="relative z-10 pr-28">
            <p className="text-black/60 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1">
              {currentSong ? (heroPlaying ? 'Now Playing' : 'Paused') : 'Continue Listening'}
            </p>
            <h3
              className="text-black text-[28px] leading-[0.95] mb-4 truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.01em' }}
            >
              {hero.title}
            </h3>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg shrink-0">
                {heroPlaying ? (
                  <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-black/80 text-xs font-semibold truncate">{hero.artist}</p>
                <div className="mt-1.5 h-[3px] bg-black/15 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full" style={{ width: heroPlaying ? '62%' : '12%' }} />
                </div>
              </div>
            </div>
          </div>
        </motion.button>
      )}

      {/* Row: Top Artist + Recent */}
      <div className="grid grid-cols-2 gap-3">
        {topArtist && (
          <motion.button
            {...fadeUp(1)}
            onClick={() => {
              triggerHaptic('selection');
              if (topArtist.id) navigate(`/artist/${topArtist.id}`);
            }}
            className="bg-[#141414] rounded-3xl p-4 flex flex-col justify-between h-44 border border-white/5 text-left active:scale-[0.97] transition-transform"
          >
            <span className="text-[#FF2D55] text-[10px] font-extrabold uppercase tracking-[0.18em]">
              Artist of the week
            </span>
            <div>
              <div
                className="w-16 h-16 rounded-full overflow-hidden mb-3 p-[2px]"
                style={{ background: 'linear-gradient(135deg, #FF2D55, #FFB199)' }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                  {topArtist.photo ? (
                    <img src={topArtist.photo} alt={topArtist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <Headphones className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>
              <p
                className="text-[20px] text-white leading-none truncate"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}
              >
                {topArtist.name}
              </p>
            </div>
          </motion.button>
        )}

        <motion.div
          {...fadeUp(2)}
          className="bg-[#141414] rounded-3xl p-4 border border-white/5 flex flex-col h-44"
        >
          <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-3">
            Jump back in
          </span>
          <div className="space-y-3 flex-1">
            {recent.length === 0 && (
              <p className="text-white/30 text-[11px]">No recents yet</p>
            )}
            {recent.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  triggerHaptic('selection');
                  playSong(s, null, pool);
                }}
                className="w-full flex items-center gap-2 text-left active:opacity-70"
              >
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {s.cover_url ? (
                    <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <Headphones className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[12px] font-bold text-white truncate leading-tight">{s.title}</p>
                  <p className="text-[10px] text-white/40 truncate">{s.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Featured Playlist / Album */}
      {featured && (
        <motion.button
          {...fadeUp(3)}
          onClick={() => {
            triggerHaptic('selection');
            const albumSongs = pool.filter((s) => s.album === featured.album);
            if (albumSongs[0]) playSong(albumSongs[0], null, albumSongs);
          }}
          className="w-full bg-[#141414] rounded-3xl p-4 border border-white/5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
        >
          <div className="w-20 h-20 rounded-2xl flex-shrink-0 relative overflow-hidden">
            {featured.cover_url && (
              <img src={featured.cover_url} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'rgba(255,45,85,0.18)', mixBlendMode: 'overlay' }} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[#FFB199] text-[10px] font-extrabold uppercase tracking-[0.18em]">
              Featured Album
            </span>
            <h4
              className="text-white text-[22px] leading-none mt-1 truncate"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.01em' }}
            >
              {featured.album}
            </h4>
            <p className="text-white/50 text-[11px] truncate mt-1">{featured.artist}</p>
          </div>
          <span className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </span>
        </motion.button>
      )}

      {/* Row: Moods + New Release */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          {...fadeUp(4)}
          className="bg-[#141414] rounded-3xl p-4 border border-white/5 flex flex-col h-32"
        >
          <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2">
            Moods
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['Focus', 'Hype', 'Chill', 'Late Night'].map((m, i) => (
              <button
                key={m}
                onClick={() => handleMood(m)}
                className="px-2.5 py-1 text-[10px] font-bold rounded-md active:scale-95 transition-transform"
                style={
                  i === 0
                    ? {
                        background: 'rgba(255,45,85,0.15)',
                        color: '#FF2D55',
                        border: '1px solid rgba(255,45,85,0.3)',
                      }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>

        {newRelease && (
          <motion.button
            {...fadeUp(5)}
            onClick={() => {
              triggerHaptic('selection');
              playSong(newRelease, null, pool);
            }}
            className="rounded-3xl p-4 border border-white/5 flex flex-col h-32 text-left relative overflow-hidden active:scale-[0.97] transition-transform"
            style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)' }}
          >
            <div className="flex justify-between items-start">
              <span className="text-[#FFB199] text-[10px] font-extrabold uppercase tracking-[0.18em]">
                New
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] animate-pulse" />
            </div>
            <div className="mt-auto">
              <p className="text-[12px] font-bold text-white truncate">{newRelease.title}</p>
              <p className="text-[10px] text-white/40 truncate">{newRelease.artist}</p>
            </div>
            {newRelease.cover_url && (
              <img
                src={newRelease.cover_url}
                alt=""
                className="absolute -right-4 -bottom-4 w-20 h-20 rounded-2xl object-cover opacity-30"
              />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default memo(HomeBento);
