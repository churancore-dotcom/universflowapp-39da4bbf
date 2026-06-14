import React, { memo, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pause, Play, ChevronRight, Sparkles } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { triggerHaptic } from '@/hooks/useHaptics';
import { usePlayerProgress } from '@/lib/playerProgressStore';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { getFeaturedIndexedArtists } from '@/lib/indexedArtists';

interface Props {
  songs: Song[];
}

interface ArtistOfWeek {
  id: string;
  name: string;
  image: string | null;
  trackCount?: number;
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] as any },
});

const MOOD_CHIPS = ['FOCUS', 'HYPE', 'CHILL', 'LATE NIGHT', 'RELAX', 'LOVE'];

const moodSearch = (m: string) => {
  const k = m.toLowerCase();
  if (k === 'hype') return 'workout songs';
  if (k === 'chill') return 'chill songs';
  if (k === 'late night') return 'late night songs';
  if (k === 'relax') return 'relaxing songs';
  if (k === 'love') return 'love songs';
  if (k === 'focus') return 'focus songs';
  return `${m} songs`;
};

const isCatalogId = (id?: string) =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const songFromRow = (s: any): Song => ({
  id: s.id || s.track_id,
  title: s.title,
  artist: s.artist,
  album: s.album || undefined,
  cover_url: s.cover_url || undefined,
  audio_url: s.audio_url || 'resolving',
  duration: s.duration || undefined,
  genre: s.genre || undefined,
  mood: s.mood || undefined,
  created_at: s.created_at || s.last_seen_at || undefined,
  artist_id: s.artist_id || undefined,
  artist_photo_url: s.artist_photo_url || s.artist_image_url || undefined,
  source: s.track_id ? 'indexed' : undefined,
});

const dedupeSongs = (items: Song[]) => {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = `${s.id || ''}::${(s.artist || '').toLowerCase()}::${(s.title || '').toLowerCase()}`;
    if (!s.title || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fmtTime = (sec: number) => {
  if (!isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const HomeBento: React.FC<Props> = ({ songs }) => {
  const { user } = useAuth();
  const { currentSong, queue, playSong, togglePlay, isPlaying } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Stream fallback
  const { data: streamSongs = [] } = useQuery({
    queryKey: ['home-bento', 'stream-fallback'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Song[]> => {
      const { data, error } = await supabase
        .from('stream_songs')
        .select('track_id,title,artist,cover_url,audio_url,duration,genre,mood,album,last_seen_at,artist_image_url')
        .not('cover_url', 'is', null)
        .not('audio_url', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      return (data || []).map(songFromRow);
    },
  });

  // Realtime invalidation
  useEffect(() => {
    const channel = supabase.channel('home-bento-live-data');
    ['stream_songs', 'recently_played', 'user_library', 'songs'].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryClient.invalidateQueries({ queryKey: ['home-bento'] });
        queryClient.invalidateQueries({ queryKey: ['home', 'songs'] });
      });
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  useEffect(() => {
    if (!currentSong?.id) return;
    queryClient.invalidateQueries({ queryKey: ['home-bento', 'recent', user?.id ?? 'anon'] });
  }, [currentSong?.id, queryClient, user?.id]);

  // Recent
  const { data: recentSongs = [] } = useQuery({
    queryKey: ['home-bento', 'recent', user?.id ?? 'anon'],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Song[]> => {
      const { data, error } = await supabase
        .from('recently_played')
        .select('song_id, played_at')
        .eq('user_id', user!.id)
        .order('played_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      const ids = (data || []).map((r) => r.song_id).filter(isCatalogId);
      if (ids.length === 0) return [];
      const { data: rows, error: songError } = await supabase
        .from('songs')
        .select('id,title,artist,album,cover_url,audio_url,duration,genre,mood,created_at,artist_id')
        .in('id', ids)
        .eq('is_visible', true);
      if (songError) throw songError;
      const byId = new Map((rows || []).map((row: any) => [row.id, songFromRow(row)]));
      return ids.map((id) => byId.get(id)).filter(Boolean) as Song[];
    },
  });

  // Artist of the Week — real artist from the user's followed list, else top artist from live stream catalog
  const { data: artistOfWeek } = useQuery({
    queryKey: ['home-bento', 'artist-of-week', user?.id ?? 'anon'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<ArtistOfWeek | null> => {
      if (user) {
        const prefs = await getUserArtistPrefs(user.id);
        if (prefs.length > 0) {
          const p = prefs[0];
          return { id: p.id, name: p.artist_name, image: p.artist_image };
        }
      }
      // Real artist with a real photo from catalog
      const { data: catalog } = await supabase
        .from('artists')
        .select('id,name,photo_url')
        .not('photo_url', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (catalog && catalog.length > 0) {
        return { id: catalog[0].id, name: catalog[0].name, image: catalog[0].photo_url };
      }
      // Fallback: top artist by activity in the live stream catalog, using their newest cover as the image
      const { data: rows } = await supabase
        .from('stream_songs')
        .select('artist,cover_url,artist_image_url,last_seen_at')
        .not('cover_url', 'is', null)
        .not('audio_url', 'is', null)
        .order('last_seen_at', { ascending: false })
        .limit(200);
      if (rows && rows.length > 0) {
        const counts = new Map<string, { name: string; count: number; image: string | null }>();
        for (const r of rows as any[]) {
          if (!r.artist) continue;
          const key = r.artist.toLowerCase().trim();
          const existing = counts.get(key);
          if (existing) {
            existing.count += 1;
            if (!existing.image) existing.image = r.artist_image_url || r.cover_url || null;
          } else {
            counts.set(key, { name: r.artist, count: 1, image: r.artist_image_url || r.cover_url || null });
          }
        }
        const top = [...counts.values()].sort((a, b) => b.count - a.count)[0];
        if (top) return { id: top.name, name: top.name, image: top.image, trackCount: top.count };
      }
      return null;
    },
  });

  const pool = useMemo(() => dedupeSongs([...songs, ...streamSongs]), [songs, streamSongs]);
  const jumpBack = useMemo(
    () => dedupeSongs([...recentSongs, ...queue, ...pool]).filter((s) => s.cover_url).slice(0, 3),
    [recentSongs, queue, pool],
  );
  const newRelease = useMemo(() => {
    const withCover = pool.filter((s) => s.cover_url && s.created_at);
    withCover.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return withCover[0] || pool.find((s) => s.cover_url);
  }, [pool]);


  const hero = currentSong || recentSongs[0] || pool[0];
  const heroIsCurrent = !!currentSong && currentSong.id === hero?.id;
  const heroPlaying = heroIsCurrent && isPlaying;
  const heroProgressPct =
    heroIsCurrent && duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
  const heroDuration = heroIsCurrent && duration > 0 ? duration : hero?.duration || 0;
  const heroElapsed = heroIsCurrent ? progress : 0;

  const handleResume = () => {
    if (!hero) return;
    triggerHaptic('selection');
    if (currentSong && currentSong.id === hero.id) togglePlay();
    else playSong(hero, null, pool.slice(0, 40));
  };

  const playFromTile = (song: Song) => {
    triggerHaptic('selection');
    if (currentSong?.id === song.id) togglePlay();
    else playSong(song, null, pool.slice(0, 40));
  };

  if (!hero && pool.length === 0) return null;

  return (
    <div className="space-y-3 font-body">
      {/* ====== HERO: CONTINUE LISTENING ====== */}
      {hero && (
        <motion.button
          {...fadeUp(0)}
          onClick={handleResume}
          className="w-full text-left rounded-3xl p-5 relative overflow-hidden block active:scale-[0.98] transition-transform"
          style={{
            background:
              'linear-gradient(135deg, #ff2d55 0%, #ff4a6b 45%, #b81d3d 100%)',
            boxShadow: '0 16px 44px -14px rgba(255,45,85,0.55)',
          }}
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-extrabold uppercase tracking-[0.22em] mb-1.5">
                Continue Listening
              </p>
              <h3
                className="text-white text-[26px] leading-[0.95] uppercase tracking-wide font-display line-clamp-2"
                style={{ wordBreak: 'break-word' }}
              >
                {hero.title}
              </h3>
              <p className="text-white/85 text-[12px] font-semibold mt-1.5 truncate">
                {hero.artist}
              </p>
            </div>
            {hero.cover_url && (
              <div className="w-[88px] h-[88px] rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ring-1 ring-white/15">
                <img
                  src={hero.cover_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5 relative z-10">
            <span className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg shrink-0">
              {heroPlaying ? (
                <Pause className="w-4 h-4 text-white fill-white" />
              ) : (
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="h-[3px] bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-[width] duration-300"
                  style={{ width: `${heroProgressPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-white/85 text-[10px] font-semibold tabular-nums">
                <span>{fmtTime(heroElapsed)}</span>
                <span>{fmtTime(heroDuration)}</span>
              </div>
            </div>
          </div>
        </motion.button>
      )}

      {/* ====== ROW 1: ARTIST OF THE WEEK | JUMP BACK IN ====== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Artist of the Week */}
        <motion.button
          {...fadeUp(1)}
          onClick={() => {
            if (!artistOfWeek) return;
            triggerHaptic('selection');
            navigate(`/artists?focus=${encodeURIComponent(artistOfWeek.name)}`);
          }}
          className="relative rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-transform h-[230px] border border-white/[0.06] bg-[#0e0e10]"
        >
          {artistOfWeek?.image ? (
            <img
              src={artistOfWeek.image}
              alt={artistOfWeek.name}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 to-rose-900/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
          <div className="absolute top-3 left-3 right-3 z-10">
            <span className="text-rose-400 text-[10px] font-extrabold uppercase tracking-[0.18em] drop-shadow">
              Artist of the Week
            </span>
          </div>
          <div className="absolute left-3 right-3 bottom-3 z-10">
            <p className="text-white text-[16px] font-extrabold uppercase tracking-wide leading-tight line-clamp-2 drop-shadow">
              {artistOfWeek?.name || 'Discover artists'}
            </p>
            <p className="text-white/65 text-[10px] mt-0.5 font-medium">
              Tap to explore
            </p>
          </div>
        </motion.button>

        {/* Jump Back In */}
        <motion.div
          {...fadeUp(2)}
          className="rounded-3xl p-4 border border-white/[0.06] bg-[#0e0e10] flex flex-col h-[230px]"
        >
          <span className="text-rose-400 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-3">
            Jump back in
          </span>
          <div className="space-y-2.5 flex-1 overflow-hidden">
            {jumpBack.length === 0 ? (
              <p className="text-white/30 text-[11px]">Play something to fill this</p>
            ) : (
              jumpBack.map((s) => (
                <button
                  key={s.id}
                  onClick={() => playFromTile(s)}
                  className="w-full flex items-center gap-2.5 text-left active:opacity-70"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 shrink-0">
                    {s.cover_url ? (
                      <img
                        src={s.cover_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="text-[12px] font-bold text-white truncate leading-tight">
                      {s.title}
                    </p>
                    <p className="text-[10px] text-white/45 truncate">{s.artist}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* ====== ROW 2: MOODS | NEW RELEASE ====== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Moods */}
        <motion.div
          {...fadeUp(3)}
          className="rounded-3xl p-4 border border-white/[0.06] bg-[#0e0e10] flex flex-col h-[200px]"
        >
          <span className="text-rose-400 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-3">
            Moods
          </span>
          <div className="flex flex-wrap gap-2 content-start">
            {MOOD_CHIPS.map((m, i) => (
              <button
                key={m}
                onClick={() => {
                  triggerHaptic('selection');
                  navigate(`/search?q=${encodeURIComponent(moodSearch(m))}`);
                }}
                className="px-3 py-1.5 text-[10px] font-extrabold rounded-full active:scale-95 transition-transform tracking-wide"
                style={
                  i === 0
                    ? {
                        background: 'rgba(255,45,85,0.18)',
                        color: '#ff2d55',
                        border: '1px solid rgba(255,45,85,0.45)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.55)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }
                }
              >
                {m}
              </button>
            ))}
          </div>
        </motion.div>

        {/* New Release */}
        {newRelease ? (
          <motion.button
            {...fadeUp(4)}
            onClick={() => playFromTile(newRelease)}
            className="relative rounded-3xl overflow-hidden text-left active:scale-[0.98] transition-transform h-[200px] border border-white/[0.06] bg-[#0e0e10]"
          >
            {newRelease.cover_url && (
              <img
                src={newRelease.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            <div className="absolute top-3 left-3 z-10">
              <span className="text-rose-400 text-[10px] font-extrabold uppercase tracking-[0.18em] drop-shadow">
                New Release
              </span>
            </div>
            <div className="absolute left-3 right-3 bottom-3 z-10 flex items-end gap-2.5">
              {newRelease.cover_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-lg shrink-0 ring-1 ring-white/10">
                  <img
                    src={newRelease.cover_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] font-extrabold truncate drop-shadow leading-tight">
                  {newRelease.title}
                </p>
                <p className="text-white/70 text-[10px] truncate">{newRelease.artist}</p>
              </div>
              <span className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0 shadow-lg">
                <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
              </span>
            </div>
          </motion.button>
        ) : (
          <motion.div
            {...fadeUp(4)}
            className="rounded-3xl p-4 border border-white/[0.06] bg-[#0e0e10] h-[200px] flex items-center justify-center"
          >
            <div className="flex items-center gap-2 text-white/40 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>No new releases yet</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* "View all" affordance into discovery */}
      <motion.button
        {...fadeUp(5)}
        onClick={() => { triggerHaptic('selection'); navigate('/search'); }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] active:scale-[0.99] transition-transform"
      >
        <span className="text-[11px] text-white/55 font-semibold uppercase tracking-[0.2em]">
          Discover more
        </span>
        <ChevronRight className="w-4 h-4 text-white/40" />
      </motion.button>
    </div>
  );
};

export default memo(HomeBento);
