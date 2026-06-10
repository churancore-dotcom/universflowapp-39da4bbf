import React, { memo, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pause, Play } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { triggerHaptic } from '@/hooks/useHaptics';
import { usePlayerProgress } from '@/lib/playerProgressStore';

interface Props {
  songs: Song[];
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] as any },
});

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

const HomeBento: React.FC<Props> = ({ songs }) => {
  const { user } = useAuth();
  const { currentSong, queue, playSong, togglePlay, isPlaying } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        .limit(8);
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

  const { data: likedSongs = [] } = useQuery({
    queryKey: ['home-bento', 'liked', user?.id ?? 'anon'],
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<Song[]> => {
      const { data, error } = await supabase
        .from('user_library')
        .select('song_id, added_at, track_source')
        .eq('user_id', user!.id)
        .order('added_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      const rows = data || [];
      const catalogIds = rows.map((r) => r.song_id).filter(isCatalogId);
      const streamIds = rows.map((r) => r.song_id).filter((id) => !isCatalogId(id));

      const [catalogRes, streamRes] = await Promise.all([
        catalogIds.length
          ? supabase.from('songs').select('id,title,artist,album,cover_url,audio_url,duration,genre,mood,created_at,artist_id').in('id', catalogIds).eq('is_visible', true)
          : Promise.resolve({ data: [] as any[], error: null }),
        streamIds.length
          ? supabase.from('stream_songs').select('track_id,title,artist,cover_url,audio_url,duration,genre,mood,album,last_seen_at,artist_image_url').in('track_id', streamIds)
          : Promise.resolve({ data: [] as any[], error: null }),
      ]);
      if (catalogRes.error) throw catalogRes.error;
      if (streamRes.error) throw streamRes.error;
      const byId = new Map<string, Song>();
      (catalogRes.data || []).forEach((row: any) => byId.set(row.id, songFromRow(row)));
      (streamRes.data || []).forEach((row: any) => byId.set(row.track_id, songFromRow(row)));
      return rows.map((row) => byId.get(row.song_id)).filter(Boolean) as Song[];
    },
  });

  const pool = useMemo(() => dedupeSongs([...songs, ...streamSongs]), [songs, streamSongs]);
  const recent = useMemo(() => dedupeSongs([...(currentSong ? [currentSong] : []), ...recentSongs, ...queue, ...pool]).slice(0, 2), [currentSong, recentSongs, queue, pool]);
  const liked = useMemo(() => dedupeSongs(likedSongs).slice(0, 3), [likedSongs]);
  const newRelease = useMemo(() => pool.find((s) => s.created_at || s.cover_url) || pool[0], [pool]);
  const featured = useMemo(() => pool.find((s) => s.album && s.cover_url), [pool]);
  // Smart Moods: prefer moods/genres inferred from the user's actual recent listening,
  // then fall back to the broader pool when history is empty.
  const moodList = useMemo(() => {
    const tally = new Map<string, number>();
    const bump = (val: string | undefined, weight: number) => {
      if (!val) return;
      const k = val.trim();
      if (!k) return;
      tally.set(k, (tally.get(k) || 0) + weight);
    };
    recentSongs.forEach((s) => { bump(s.mood, 3); bump(s.genre, 2); });
    likedSongs.forEach((s) => { bump(s.mood, 2); bump(s.genre, 1); });
    pool.forEach((s) => { bump(s.mood, 1); bump(s.genre, 1); });
    const discovered = Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return (discovered.length ? discovered : ['Chill', 'Romantic', 'Party', 'Focus']).slice(0, 4);
  }, [recentSongs, likedSongs, pool]);

  const moodSearchTerm = (mood: string) => {
    const lower = mood.toLowerCase();
    if (lower.includes('slow') && lower.includes('reverb')) return 'slow reverb songs';
    if (lower.includes('bass')) return 'bass boosted songs';
    if (lower === 'energetic') return 'workout songs';
    if (lower === 'calm') return 'chill songs';
    if (lower === 'uplifting') return 'happy songs';
    return `${mood} songs`;
  };


  const hero = currentSong || recent[0] || pool[0];
  const heroPlaying = !!currentSong && currentSong.id === hero?.id && isPlaying;
  const heroProgress = currentSong?.id === hero?.id && duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

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
      {hero && (
        <motion.button
          {...fadeUp(0)}
          onClick={handleResume}
          className="w-full text-left rounded-3xl p-5 relative overflow-hidden block active:scale-[0.98] transition-transform min-h-[148px]"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(18 100% 82%) 100%)',
            boxShadow: '0 12px 40px -10px hsl(var(--primary) / 0.45)',
          }}
        >
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
              />
            </>
          )}

          <div className="relative z-10 pr-28">
            <p className="text-black/60 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-1">
              {currentSong ? (heroPlaying ? 'Now Playing' : 'Paused') : recentSongs.length > 0 ? 'Recently Played' : 'Start Listening'}
            </p>
            <h3 className="text-black text-[28px] leading-[0.95] mb-4 truncate font-display tracking-wide">
              {hero.title}
            </h3>
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-lg shrink-0">
                {heroPlaying ? <Pause className="w-4 h-4 text-white fill-white" /> : <Play className="w-4 h-4 text-white fill-white ml-0.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-black/80 text-xs font-semibold truncate">{hero.artist}</p>
                <div className="mt-1.5 h-[3px] bg-black/15 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-[width] duration-300" style={{ width: `${heroPlaying ? heroProgress : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        </motion.button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <motion.div {...fadeUp(1)} className="bg-card rounded-3xl p-4 border border-white/5 flex flex-col h-44">
          <span className="text-primary text-[10px] font-extrabold uppercase tracking-[0.18em] mb-3">Jump back in</span>
          <div className="space-y-3 flex-1">
            {recent.length === 0 ? (
              <p className="text-white/30 text-[11px]">Play a song to fill this</p>
            ) : recent.map((s) => (
              <button key={s.id} onClick={() => playFromTile(s)} className="w-full flex items-center gap-2 text-left active:opacity-70">
                <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className="text-[12px] font-bold text-white truncate leading-tight">{s.title}</p>
                  <p className="text-[10px] text-white/40 truncate">{s.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp(2)} className="bg-card rounded-3xl p-4 border border-white/5 flex flex-col h-44">
          <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-3">Your likes</span>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {liked.slice(0, 3).map((s) => (
              <button key={s.id} onClick={() => playFromTile(s)} className="aspect-square rounded-xl overflow-hidden bg-white/5 active:scale-95 transition-transform">
                {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />}
              </button>
            ))}
          </div>
          <button onClick={() => navigate('/library')} className="mt-auto text-left">
            <p className="text-[20px] text-white leading-none truncate font-display tracking-wide">LIBRARY</p>
            <p className="text-[10px] text-white/40 truncate">{likedSongs.length || liked.length} saved tracks</p>
          </button>
        </motion.div>
      </div>

      {featured && (
        <motion.button {...fadeUp(3)} onClick={() => playFromTile(featured)} className="w-full bg-card rounded-3xl p-4 border border-white/5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform">
          <div className="w-20 h-20 rounded-2xl flex-shrink-0 relative overflow-hidden bg-white/5">
            {featured.cover_url && <img src={featured.cover_url} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-primary/15 mix-blend-overlay" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[hsl(18_100%_82%)] text-[10px] font-extrabold uppercase tracking-[0.18em]">Featured Album</span>
            <h4 className="text-white text-[22px] leading-none mt-1 truncate font-display tracking-wide">{featured.album}</h4>
            <p className="text-white/50 text-[11px] truncate mt-1">{featured.artist}</p>
          </div>
          <span className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </span>
        </motion.button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <motion.div {...fadeUp(4)} className="bg-card rounded-3xl p-4 border border-white/5 flex flex-col h-32">
          <span className="text-white/40 text-[10px] font-extrabold uppercase tracking-[0.18em] mb-2">Moods</span>
          {moodList.length === 0 ? (
            <button onClick={() => navigate('/search')} className="mt-auto text-left text-white/45 text-[11px]">
              Discover by search
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {moodList.map((m, i) => (
                <button key={m} onClick={() => navigate(`/search?q=${encodeURIComponent(moodSearchTerm(m))}`)} className="px-2.5 py-1 text-[10px] font-bold rounded-md active:scale-95 transition-transform" style={i === 0 ? { background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)' } : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {newRelease && (
          <motion.button {...fadeUp(5)} onClick={() => playFromTile(newRelease)} className="rounded-3xl border border-white/5 flex flex-col h-32 text-left relative overflow-hidden active:scale-[0.97] transition-transform bg-card">
            {newRelease.cover_url ? (
              <img
                src={newRelease.cover_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-[hsl(18_100%_82%)]/30" />
            )}
            {/* readable scrim over the artwork */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
            <div className="relative z-10 flex justify-between items-start p-4">
              <span className="text-white text-[10px] font-extrabold uppercase tracking-[0.18em] drop-shadow">New</span>
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" aria-hidden />
            </div>
            <div className="relative z-10 mt-auto p-4 pt-0">
              <p className="text-[12px] font-bold text-white truncate drop-shadow">{newRelease.title}</p>
              <p className="text-[10px] text-white/70 truncate">{newRelease.artist}</p>
            </div>
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default memo(HomeBento);