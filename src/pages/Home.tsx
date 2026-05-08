import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';

import AllSongsSection from '@/components/AllSongsSection';
import GlobalTopTracksSection from '@/components/GlobalTopTracksSection';
import ArtistsRail from '@/components/home/ArtistsRail';
import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import LockScreenPlayer from '@/components/LockScreenPlayer';
import EqualizerModal from '@/components/EqualizerModal';
import OfflineIndicator from '@/components/OfflineIndicator';
import { TabTransition } from '@/components/PageTransition';
import { Music, Lock, ListMusic, Sliders, Search, Play, Pause } from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHaptics';
import appLogo from '@/assets/app-logo.png';
import { HomeSkeleton } from '@/components/PageSkeletons';

const HOME_SONGS_QUERY_KEY = ['home', 'songs'] as const;

const fetchHomeSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('*, artists(id, name, photo_url)')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  if (!data) return [];
  return data.map((s: any) => {
    const artistData = s.artists as { id: string; name: string; photo_url: string | null } | null;
    return {
      id: s.id, title: s.title, artist: s.artist,
      album: s.album || undefined, cover_url: s.cover_url || undefined,
      audio_url: s.audio_url, duration: s.duration || undefined,
      artist_id: artistData?.id || s.artist_id || undefined,
      artist_photo_url: artistData?.photo_url || undefined,
      genre: s.genre || undefined, mood: s.mood || undefined,
      created_at: s.created_at || undefined,
      show_in_new_releases: s.show_in_new_releases,
      show_in_trending: s.show_in_trending,
      is_premium_only: s.is_premium_only,
    } as Song;
  });
};

const Home = () => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, togglePlay, setExpanded, playSong } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline, user } = useAuth() as any;
  const { downloads } = useDownloads();
  const queryClient = useQueryClient();
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);

  const { data: onlineSongs = (cachedSongs || []), isLoading } = useQuery({
    queryKey: HOME_SONGS_QUERY_KEY,
    queryFn: fetchHomeSongs,
    initialData: cachedSongs && cachedSongs.length > 0 ? cachedSongs : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !isOffline,
  });

  const songs: Song[] = useMemo(() => {
    if (isOffline) {
      return downloads.map((d) => ({
        id: d.id, title: d.title, artist: d.artist, album: d.album,
        cover_url: d.cover_url, audio_url: d.audio_url, duration: d.duration,
      } as Song));
    }
    return onlineSongs;
  }, [isOffline, downloads, onlineSongs]);

  useEffect(() => {
    if (!isOffline && onlineSongs && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [onlineSongs, updateCache, isOffline]);

  const loading = isLoading && songs.length === 0 && !isOffline;

  // Realtime diff patching
  useEffect(() => {
    if (isOffline) return;
    const channel = supabase
      .channel('songs-realtime-diff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const newRow = payload.new as any;
        const oldRow = payload.old as any;
        queryClient.setQueryData<Song[]>(HOME_SONGS_QUERY_KEY, (current) => {
          if (!current) return current;
          if (eventType === 'DELETE') return current.filter((s) => s.id !== oldRow?.id);
          if (!newRow) return current;
          if (newRow.is_visible === false) return current.filter((s) => s.id !== newRow.id);
          const mapped: Song = {
            id: newRow.id, title: newRow.title, artist: newRow.artist,
            album: newRow.album || undefined, cover_url: newRow.cover_url || undefined,
            audio_url: newRow.audio_url, duration: newRow.duration || undefined,
            artist_id: newRow.artist_id || undefined,
            show_in_new_releases: newRow.show_in_new_releases,
            show_in_trending: newRow.show_in_trending,
            is_premium_only: newRow.is_premium_only,
          } as Song;
          const idx = current.findIndex((s) => s.id === newRow.id);
          if (eventType === 'INSERT' || idx === -1) return [mapped, ...current];
          const next = current.slice();
          next[idx] = { ...current[idx], ...mapped };
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, isOffline]);

  const userName = useMemo(() => {
    const meta = (user?.user_metadata || {}) as any;
    return (meta.username || meta.full_name || (user?.email ? String(user.email).split('@')[0] : '')) || '';
  }, [user]);

  // New releases: latest 12 songs
  const newReleases = useMemo(() => songs.slice(0, 12), [songs]);

  // Made For You: 4 mixes bucketed by genre/mood
  const mixes = useMemo(() => buildMixes(songs), [songs]);

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-black relative flex flex-col overflow-hidden text-white">
        {/* Compact monochrome header */}
        <header
          className="flex-shrink-0 z-30 px-4 pt-3 pb-2 safe-area-pt"
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { triggerHaptic('selection'); navigate('/profile'); }}
              className="flex items-center gap-2.5 min-w-0 active:opacity-60"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/15">
                <img src={appLogo} alt="UniversFlow" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[15px] font-extrabold tracking-tight leading-tight truncate">
                  {userName ? userName : 'Universflow'}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-bold truncate">
                  Home
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1">
              {[
                { icon: Search, action: () => navigate('/search') },
                { icon: ListMusic, action: () => setShowQueue(true) },
                { icon: Sliders, action: () => setShowEqualizer(true) },
                { icon: Lock, action: () => setShowLockScreen(true) },
              ].map(({ icon: Icon, action }, i) => (
                <motion.button
                  key={i}
                  onClick={() => { triggerHaptic('selection'); action(); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  whileTap={{ scale: 0.85 }}
                >
                  <Icon className="w-[18px] h-[18px] text-white/80" />
                </motion.button>
              ))}
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden pb-36 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="px-3 pt-4"><HomeSkeleton /></div>
          ) : (
            <>
              {/* HERO: Huge Now Playing artwork (full-bleed, monochrome treatment) */}
              <NowPlayingHero
                song={currentSong}
                isPlaying={isPlaying}
                onTogglePlay={() => { triggerHaptic('selection'); togglePlay(); }}
                onExpand={() => { triggerHaptic('selection'); setExpanded(true); }}
                onSearch={() => navigate('/search')}
              />

              {/* Section padding wrapper */}
              <div className="px-3 pt-6 space-y-7">
                {/* Top Artists */}
                <ArtistsRail />

                {/* New Releases — Spotify-style horizontal rail of small covers */}
                {newReleases.length > 0 && (
                  <Rail
                    title="New Releases"
                    subtitle="Just dropped"
                    onSeeAll={() => navigate('/library')}
                  >
                    {newReleases.map((s) => (
                      <CoverCard
                        key={s.id}
                        song={s}
                        active={currentSong?.id === s.id}
                        onPlay={() => playSong(s, undefined, newReleases)}
                      />
                    ))}
                  </Rail>
                )}

                {/* Made For You — auto-generated mix tiles */}
                {mixes.length > 0 && (
                  <Rail title="Made For You" subtitle="Mixes built from your catalog">
                    {mixes.map((m) => (
                      <MixCard
                        key={m.id}
                        mix={m}
                        onPlay={() => {
                          if (m.songs.length > 0) playSong(m.songs[0], undefined, m.songs);
                        }}
                      />
                    ))}
                  </Rail>
                )}

                {/* Trending Now (viral feed) */}
                <GlobalTopTracksSection />

                {/* Offline mode fallback */}
                {isOffline && songs.length > 0 && <AllSongsSection songs={songs} />}

                {/* Wordmark footer */}
                <div className="pt-4 pb-2 text-center">
                  <p className="text-[10px] tracking-[0.4em] text-white/20 font-bold">
                    UNIVERSFLOW
                  </p>
                </div>
              </div>
            </>
          )}
        </main>

        <BottomNav />
        {showLockScreen && <LockScreenPlayer isOpen={showLockScreen} onClose={() => setShowLockScreen(false)} />}
        {showQueue && <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />}
        {showEqualizer && <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />}
        <OfflineIndicator />
      </div>
    </TabTransition>
  );
};

/* ───────────── Hero ───────────── */
const NowPlayingHero = memo(({ song, isPlaying, onTogglePlay, onExpand, onSearch }: {
  song: Song | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExpand: () => void;
  onSearch: () => void;
}) => {
  if (!song) {
    // Fallback hero when nothing playing — pure black w/ giant search invite
    return (
      <div className="relative w-full" style={{ aspectRatio: '1 / 1.05' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-black" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.4em] text-white/40 font-bold mb-3">
            Universflow
          </p>
          <h1 className="text-[42px] font-black leading-[0.95] tracking-tight mb-6">
            Press play.<br/>Feel everything.
          </h1>
          <button
            onClick={onSearch}
            className="flex items-center gap-2 px-5 h-12 rounded-full bg-white text-black font-bold text-[14px] active:scale-95 transition-transform"
          >
            <Search className="w-4 h-4" />
            Search any song
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1.05' }}>
      {/* Huge artwork — desaturated for monochrome aesthetic */}
      {song.cover_url ? (
        <img
          src={song.cover_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'grayscale(0.6) contrast(1.05) brightness(0.85)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
          <Music className="w-20 h-20 text-white/30" />
        </div>
      )}

      {/* Top vignette for header contrast */}
      <div className="absolute inset-x-0 top-0 h-24"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6), transparent)' }} />
      {/* Bottom vignette for text legibility */}
      <div className="absolute inset-x-0 bottom-0 h-2/3"
        style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 55%, #000 100%)' }} />

      {/* Tap target to expand player (covers full hero except play button) */}
      <button
        type="button"
        onClick={onExpand}
        className="absolute inset-0"
        aria-label="Open player"
      />

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-5 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-bold mb-2">
          Now Playing
        </p>
        <h2 className="text-[30px] font-black leading-[1] tracking-tight line-clamp-2">
          {song.title}
        </h2>
        <p className="text-white/70 text-[15px] font-semibold mt-1.5 truncate">
          {song.artist}
        </p>

        <div className="mt-4 flex items-center gap-3 pointer-events-auto">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onTogglePlay}
            className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-2xl"
          >
            {isPlaying
              ? <Pause className="w-6 h-6 text-black" fill="currentColor" />
              : <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />}
          </motion.button>
          <button
            onClick={onExpand}
            className="h-12 px-5 rounded-full border border-white/25 text-white text-[13px] font-bold active:scale-95 transition-transform"
          >
            Open player
          </button>
        </div>
      </div>
    </div>
  );
});
NowPlayingHero.displayName = 'NowPlayingHero';

/* ───────────── Rail ───────────── */
const Rail = memo(({ title, subtitle, onSeeAll, children }: {
  title: string; subtitle?: string; onSeeAll?: () => void; children: React.ReactNode;
}) => (
  <section>
    <div className="flex items-end justify-between mb-3 px-1">
      <div className="min-w-0">
        <h2 className="text-[20px] font-black tracking-tight text-white leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-bold mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={() => { triggerHaptic('selection'); onSeeAll(); }}
          className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/60 active:text-white"
        >
          See all
        </button>
      )}
    </div>
    <div
      className="flex gap-3 overflow-x-auto hide-scrollbar -mx-3 px-3 pb-1 snap-x"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  </section>
));
Rail.displayName = 'Rail';

/* ───────────── Cover card (for New Releases) ───────────── */
const CoverCard = memo(({ song, active, onPlay }: {
  song: Song; active: boolean; onPlay: () => void;
}) => (
  <button
    type="button"
    onClick={() => { triggerHaptic('selection'); onPlay(); }}
    className="group flex-shrink-0 w-36 snap-start text-left active:scale-[0.97] transition-transform"
  >
    <div
      className="relative aspect-square mb-2 overflow-hidden rounded-md bg-white/5"
      style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}
    >
      {song.cover_url ? (
        <img
          src={song.cover_url}
          alt={song.title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Music className="w-8 h-8 text-white/30" />
        </div>
      )}
      <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white opacity-0 group-active:opacity-100 flex items-center justify-center">
        <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
      </div>
    </div>
    <p className={`truncate text-[13px] font-bold leading-tight ${active ? 'text-white' : 'text-white/95'}`}>
      {song.title}
    </p>
    <p className="mt-0.5 truncate text-[11px] text-white/50 font-medium">{song.artist}</p>
  </button>
));
CoverCard.displayName = 'CoverCard';

/* ───────────── Mix card (Made For You) ───────────── */
type Mix = { id: string; label: string; subtitle: string; songs: Song[]; cover?: string };

const MixCard = memo(({ mix, onPlay }: { mix: Mix; onPlay: () => void }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic('selection'); onPlay(); }}
    className="group flex-shrink-0 w-44 snap-start text-left active:scale-[0.97] transition-transform"
  >
    <div
      className="relative aspect-square mb-2 overflow-hidden rounded-md bg-white/5"
      style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}
    >
      {mix.cover ? (
        <img
          src={mix.cover}
          alt={mix.label}
          className="w-full h-full object-cover"
          style={{ filter: 'grayscale(0.5) contrast(1.05)' }}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-white/15 to-white/5" />
      )}
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 p-3 flex flex-col justify-between">
        <p className="text-[10px] uppercase tracking-[0.3em] font-extrabold text-white/90">
          Mix
        </p>
        <div>
          <p className="text-white text-[20px] font-black leading-none tracking-tight line-clamp-2">
            {mix.label}
          </p>
          <p className="text-white/70 text-[10px] font-semibold mt-1.5 truncate">
            {mix.subtitle}
          </p>
        </div>
      </div>
    </div>
    <p className="truncate text-[12px] font-bold text-white/90">{mix.label}</p>
    <p className="mt-0.5 truncate text-[11px] text-white/50">{mix.songs.length} songs</p>
  </button>
));
MixCard.displayName = 'MixCard';

/* ───────────── Mix builder ───────────── */
function buildMixes(songs: Song[]): Mix[] {
  if (!songs || songs.length < 4) return [];
  const buckets = new Map<string, Song[]>();
  for (const s of songs) {
    const key = (s.genre || s.mood || 'Daily').trim();
    if (!key) continue;
    const arr = buckets.get(key) || [];
    arr.push(s);
    buckets.set(key, arr);
  }
  // Take top 4 buckets by count
  const sorted = Array.from(buckets.entries())
    .filter(([, arr]) => arr.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);

  // Always include a "Daily Mix" from latest songs as the first
  const mixes: Mix[] = [];
  mixes.push({
    id: 'daily',
    label: 'Daily Mix',
    subtitle: 'Fresh picks for today',
    songs: songs.slice(0, 30),
    cover: songs.find((s) => s.cover_url)?.cover_url,
  });

  for (const [key, arr] of sorted) {
    mixes.push({
      id: `mix-${key}`,
      label: key,
      subtitle: `${arr[0]?.artist || ''}${arr[1] ? ', ' + arr[1].artist : ''} & more`,
      songs: arr.slice(0, 30),
      cover: arr.find((s) => s.cover_url)?.cover_url,
    });
  }

  return mixes;
}

export default Home;
