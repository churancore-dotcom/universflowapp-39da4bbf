import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Lock, ListMusic, Music, Pause, Play, Search } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { triggerHaptic } from '@/hooks/useHaptics';

import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import LockScreenPlayer from '@/components/LockScreenPlayer';
import OfflineIndicator from '@/components/OfflineIndicator';
import OptimizedImage from '@/components/OptimizedImage';
import AllSongsSection from '@/components/AllSongsSection';
import { TabTransition } from '@/components/PageTransition';
import { HomeSkeleton } from '@/components/PageSkeletons';
import SEOHead from '@/components/SEOHead';
import PullToRefreshIndicator from '@/components/PullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import appLogo from '@/assets/app-logo.png';

const HOME_SONGS_QUERY_KEY = ['home', 'songs'] as const;

const fetchHomeSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('*, artists(id, name, photo_url)')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;

  return (data || []).map((s: any) => {
    const artist = s.artists as { id: string; name: string; photo_url: string | null } | null;
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album || undefined,
      cover_url: s.cover_url || undefined,
      audio_url: s.audio_url,
      duration: s.duration || undefined,
      artist_id: artist?.id || s.artist_id || undefined,
      artist_photo_url: artist?.photo_url || undefined,
      genre: s.genre || undefined,
      mood: s.mood || undefined,
      created_at: s.created_at || undefined,
      show_in_new_releases: s.show_in_new_releases,
      show_in_trending: s.show_in_trending,
      is_premium_only: s.is_premium_only,
      play_count: s.play_count ?? 0,
    } as Song;
  });
};

const fetchRecentlyPlayed = async (userId: string, songs: Song[]): Promise<Song[]> => {
  const { data } = await supabase
    .from('recently_played')
    .select('song_id, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(24);

  const seen = new Set<string>();
  const picked: Song[] = [];
  for (const row of (data || []) as any[]) {
    if (seen.has(row.song_id)) continue;
    const song = songs.find((item) => item.id === row.song_id);
    if (song) {
      seen.add(row.song_id);
      picked.push(song);
    }
    if (picked.length >= 8) break;
  }
  return picked;
};

const byNewest = (songs: Song[]) =>
  [...songs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

const byPlays = (songs: Song[]) =>
  [...songs].sort((a, b) => ((b as any).play_count || 0) - ((a as any).play_count || 0));

const ArtworkFallback = memo(({ iconSize = 'w-8 h-8' }: { iconSize?: string }) => (
  <div className="h-full w-full bg-gradient-to-br from-primary/30 via-accent/20 to-secondary flex items-center justify-center">
    <Music className={`${iconSize} text-foreground/35`} />
  </div>
));
ArtworkFallback.displayName = 'ArtworkFallback';

const TinyBars = memo(({ active }: { active: boolean }) => (
  <div className="flex h-4 items-end gap-[3px]">
    {[0, 1, 2, 3].map((bar) => (
      <span
        key={bar}
        className="w-[3px] rounded-full bg-primary animate-audio-wave"
        style={{ animationDelay: `${bar * 0.11}s`, animationPlayState: active ? 'running' : 'paused' }}
      />
    ))}
  </div>
));
TinyBars.displayName = 'TinyBars';

const IconButton = memo(({ label, children, onClick }: { label: string; children: React.ReactNode; onClick: () => void }) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    aria-label={label}
    onClick={() => {
      triggerHaptic('selection');
      onClick();
    }}
    className="grid h-11 w-11 place-items-center rounded-full bg-secondary/80 text-foreground backdrop-blur-xl border border-border/70"
  >
    {children}
  </motion.button>
));
IconButton.displayName = 'IconButton';

const Section = memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <h2 className="px-1 text-[19px] font-extrabold leading-none tracking-normal text-foreground">{title}</h2>
    {children}
  </section>
));
Section.displayName = 'Section';

const Cover = memo(({ song, className = '', eager = false }: { song?: Song; className?: string; eager?: boolean }) => (
  <div className={`overflow-hidden bg-secondary ${className}`}>
    {song?.cover_url ? (
      <OptimizedImage src={song.cover_url} alt={song.title} eager={eager} className="h-full w-full object-cover" />
    ) : (
      <ArtworkFallback />
    )}
  </div>
));
Cover.displayName = 'Cover';

const HeroDeck = memo(({ songs }: { songs: Song[] }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const hero = songs.find((song) => song.cover_url) || songs[0];
  const stack = songs.filter((song) => song.id !== hero?.id && song.cover_url).slice(0, 3);

  if (!hero) return null;

  const isCurrent = currentSong?.id === hero.id;
  const play = () => {
    triggerHaptic('impactMedium');
    if (isCurrent) togglePlay();
    else playSong(hero, undefined, songs);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-[58dvh] rounded-[2rem] overflow-hidden border border-border/60 bg-card"
      style={{ boxShadow: '0 30px 80px -36px hsl(var(--primary) / 0.6)' }}
    >
      {hero.cover_url && (
        <img
          src={hero.cover_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-75"
          style={{ filter: 'saturate(1.15)' }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, hsl(0 0% 0% / 0.05) 0%, hsl(0 0% 0% / 0.38) 48%, hsl(0 0% 0% / 0.96) 100%)',
        }}
      />
      <div className="absolute left-4 top-4 flex -space-x-3">
        {stack.map((song, index) => (
          <Cover
            key={song.id}
            song={song}
            className="h-14 w-14 rounded-2xl border border-border"
            eager={index === 0}
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="mb-2 text-[12px] font-semibold text-foreground/70 line-clamp-1">{hero.artist}</p>
        <h2 className="max-w-[12ch] text-[42px] font-black leading-[0.92] tracking-normal text-foreground line-clamp-3">
          {hero.title}
        </h2>
        <div className="mt-5 flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={play}
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
            className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"
            style={{ boxShadow: '0 12px 34px hsl(var(--primary) / 0.5)' }}
          >
            {isCurrent && isPlaying ? <Pause className="h-6 w-6" fill="currentColor" /> : <Play className="ml-1 h-6 w-6" fill="currentColor" />}
          </motion.button>
          {isCurrent && <TinyBars active={isPlaying} />}
        </div>
      </div>
    </motion.section>
  );
});
HeroDeck.displayName = 'HeroDeck';

const CoverRail = memo(({ title, songs, large = false }: { title: string; songs: Song[]; large?: boolean }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  if (songs.length === 0) return null;

  return (
    <Section title={title}>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
        {songs.map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          return (
            <motion.button
              key={`${title}-${song.id}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                triggerHaptic('selection');
                if (isCurrent) togglePlay();
                else playSong(song, undefined, songs);
              }}
              className={`${large ? 'w-[42vw] max-w-[180px]' : 'w-[31vw] max-w-[136px]'} flex-shrink-0 snap-start text-left`}
            >
              <div className="relative">
                <Cover song={song} eager={index < 4} className={`${large ? 'rounded-[1.7rem]' : 'rounded-3xl'} aspect-square border border-border/60`} />
                {isCurrent && (
                  <div className="absolute inset-0 grid place-items-center rounded-[inherit] bg-background/45">
                    {isPlaying ? <TinyBars active /> : <Play className="h-6 w-6 text-primary" fill="currentColor" />}
                  </div>
                )}
              </div>
              <p className="mt-2 text-[13px] font-bold leading-tight text-foreground line-clamp-1">{song.title}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-tight text-muted-foreground line-clamp-1">{song.artist}</p>
            </motion.button>
          );
        })}
      </div>
    </Section>
  );
});
CoverRail.displayName = 'CoverRail';

const RankList = memo(({ songs }: { songs: Song[] }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  if (songs.length === 0) return null;

  return (
    <Section title="Top played">
      <div className="rounded-[1.65rem] border border-border/60 bg-card/70 overflow-hidden backdrop-blur-2xl">
        {songs.slice(0, 6).map((song, index) => {
          const isCurrent = currentSong?.id === song.id;
          return (
            <motion.button
              key={song.id}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                triggerHaptic('selection');
                if (isCurrent) togglePlay();
                else playSong(song, undefined, songs);
              }}
              className="flex w-full items-center gap-3 p-3 text-left active:bg-secondary/60"
            >
              <span className="w-7 text-center text-[20px] font-black tabular-nums text-muted-foreground/45">{index + 1}</span>
              <Cover song={song} eager={index < 3} className="h-14 w-14 rounded-2xl" />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[14px] font-bold leading-tight ${isCurrent ? 'text-primary' : 'text-foreground'}`}>{song.title}</p>
                <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">{song.artist}</p>
              </div>
              {isCurrent ? <TinyBars active={isPlaying} /> : <Play className="h-4 w-4 text-muted-foreground" fill="currentColor" />}
            </motion.button>
          );
        })}
      </div>
    </Section>
  );
});
RankList.displayName = 'RankList';

const AlbumWall = memo(({ songs }: { songs: Song[] }) => {
  const { playSong } = usePlayer();
  const albums = useMemo(() => {
    const map = new Map<string, { name: string; artist: string; cover?: string; tracks: Song[] }>();
    songs.forEach((song) => {
      if (!song.album) return;
      const key = `${song.album.toLowerCase()}::${song.artist.toLowerCase()}`;
      const item = map.get(key) || { name: song.album, artist: song.artist, cover: song.cover_url, tracks: [] };
      item.cover = item.cover || song.cover_url;
      item.tracks.push(song);
      map.set(key, item);
    });
    return Array.from(map.values()).slice(0, 4);
  }, [songs]);

  if (albums.length === 0) return null;

  return (
    <Section title="Albums">
      <div className="grid grid-cols-2 gap-3">
        {albums.map((album, index) => (
          <motion.button
            key={`${album.name}-${album.artist}`}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              triggerHaptic('selection');
              playSong(album.tracks[0], undefined, album.tracks);
            }}
            className="text-left"
          >
            <div className="relative aspect-square overflow-hidden rounded-[1.7rem] border border-border/60 bg-secondary">
              {album.cover ? <OptimizedImage src={album.cover} alt={album.name} eager={index < 2} className="h-full w-full object-cover" /> : <ArtworkFallback />}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/90 to-transparent" />
            </div>
            <p className="mt-2 truncate text-[13px] font-bold text-foreground">{album.name}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{album.artist}</p>
          </motion.button>
        ))}
      </div>
    </Section>
  );
});
AlbumWall.displayName = 'AlbumWall';

const ArtistStrip = memo(({ songs }: { songs: Song[] }) => {
  const navigate = useNavigate();
  const artists = useMemo(() => {
    const map = new Map<string, { name: string; image?: string; count: number }>();
    songs.forEach((song) => {
      const key = song.artist.toLowerCase();
      const item = map.get(key) || { name: song.artist, image: song.artist_photo_url || song.cover_url, count: 0 };
      item.image = item.image || song.artist_photo_url || song.cover_url;
      item.count += 1;
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [songs]);

  if (artists.length === 0) return null;

  return (
    <Section title="Artists">
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 scrollbar-none">
        {artists.map((artist) => (
          <motion.button
            key={artist.name}
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              triggerHaptic('selection');
              navigate(`/artist/${encodeURIComponent(artist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))}`);
            }}
            className="w-[78px] flex-shrink-0 text-center"
          >
            <div className="mx-auto h-[74px] w-[74px] overflow-hidden rounded-full border border-border/70 bg-secondary">
              {artist.image ? <img src={artist.image} alt={artist.name} loading="lazy" className="h-full w-full object-cover" /> : <ArtworkFallback iconSize="w-6 h-6" />}
            </div>
            <p className="mt-2 truncate text-[11px] font-bold text-foreground">{artist.name}</p>
          </motion.button>
        ))}
      </div>
    </Section>
  );
});
ArtistStrip.displayName = 'ArtistStrip';

const EmptyState = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className="space-y-5 pb-8"
  >
    <section
      className="relative h-[68dvh] min-h-[500px] overflow-hidden rounded-[2rem] border border-border/60 bg-card"
      style={{
        boxShadow: '0 30px 80px -38px hsl(var(--primary) / 0.55)',
        background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.32), transparent 46%), linear-gradient(180deg, hsl(var(--secondary) / 0.85), hsl(var(--background)))',
      }}
    >
      <div className="absolute left-1/2 top-8 grid w-[76%] -translate-x-1/2 grid-cols-2 gap-3 rotate-[-7deg]">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className={`aspect-square rounded-[1.7rem] border border-border/70 bg-secondary/90 grid place-items-center ${item === 1 ? 'translate-y-7' : ''} ${item === 2 ? '-translate-y-2' : ''}`}
          >
            <Music className="h-8 w-8 text-primary" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h2 className="max-w-[7ch] text-[48px] font-black leading-[0.88] tracking-normal text-foreground">Universflow</h2>
        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground" style={{ boxShadow: '0 12px 34px hsl(var(--primary) / 0.5)' }}>
            <Play className="ml-1 h-6 w-6" fill="currentColor" />
          </div>
          <TinyBars active />
        </div>
      </div>
    </section>
    <div className="grid grid-cols-3 gap-3 opacity-55">
      {[0, 1, 2].map((item) => (
        <div key={item} className="aspect-square rounded-3xl border border-border/50 bg-secondary/70" />
      ))}
    </div>
  </motion.div>
));
EmptyState.displayName = 'EmptyState';

const Home = () => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline, user } = useAuth();
  const { downloads } = useDownloads();
  const queryClient = useQueryClient();

  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  const { data: onlineSongs = cachedSongs || [], isLoading } = useQuery({
    queryKey: HOME_SONGS_QUERY_KEY,
    queryFn: fetchHomeSongs,
    initialData: cachedSongs && cachedSongs.length > 0 ? cachedSongs : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !isOffline,
  });

  const songs: Song[] = useMemo(() => {
    if (!isOffline) return onlineSongs;
    return downloads.map((download) => ({
      id: download.id,
      title: download.title,
      artist: download.artist,
      album: download.album,
      cover_url: download.cover_url,
      audio_url: download.blobUrl || download.audio_url,
      duration: download.duration,
    } as Song));
  }, [downloads, isOffline, onlineSongs]);

  useEffect(() => {
    if (!isOffline && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [isOffline, onlineSongs, updateCache]);

  useEffect(() => {
    if (isOffline) return;
    const channel = supabase
      .channel('home-song-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const newRow = payload.new as any;
        const oldRow = payload.old as any;

        queryClient.setQueryData<Song[]>(HOME_SONGS_QUERY_KEY, (current) => {
          if (!current) return current;
          if (eventType === 'DELETE') return current.filter((song) => song.id !== oldRow?.id);
          if (!newRow || newRow.is_visible === false) return current.filter((song) => song.id !== newRow?.id);

          const mapped: Song = {
            id: newRow.id,
            title: newRow.title,
            artist: newRow.artist,
            album: newRow.album || undefined,
            cover_url: newRow.cover_url || undefined,
            audio_url: newRow.audio_url,
            duration: newRow.duration || undefined,
            artist_id: newRow.artist_id || undefined,
            genre: newRow.genre || undefined,
            mood: newRow.mood || undefined,
            created_at: newRow.created_at || undefined,
            show_in_new_releases: newRow.show_in_new_releases,
            show_in_trending: newRow.show_in_trending,
            is_premium_only: newRow.is_premium_only,
            play_count: newRow.play_count ?? 0,
          } as Song;

          const index = current.findIndex((song) => song.id === mapped.id);
          if (index === -1) return [mapped, ...current];
          const next = current.slice();
          next[index] = { ...current[index], ...mapped };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOffline, queryClient]);

  const allSongs = useMemo(() => songs, [songs]);
  const loading = isLoading && allSongs.length === 0 && !isOffline;

  const { data: recent = [] } = useQuery({
    queryKey: ['home', 'recently-played', user?.id, allSongs.length],
    queryFn: () => fetchRecentlyPlayed(user!.id, allSongs),
    enabled: !!user && !isOffline && allSongs.length > 0,
    staleTime: 60_000,
  });

  const trending = useMemo(() => {
    const flagged = allSongs.filter((song) => (song as any).show_in_trending);
    return (flagged.length ? flagged : byPlays(allSongs)).slice(0, 12);
  }, [allSongs]);

  const newReleases = useMemo(() => {
    const flagged = allSongs.filter((song) => (song as any).show_in_new_releases);
    return (flagged.length ? flagged : byNewest(allSongs)).slice(0, 12);
  }, [allSongs]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('impactMedium');
      await queryClient.invalidateQueries({ queryKey: HOME_SONGS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: HOME_SONGS_QUERY_KEY });
    },
  });

  return (
    <TabTransition>
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
        <SEOHead
          title="Universflow — Music Home"
          description="Stream your Universflow music library with charts, albums, artists, new releases, and playback controls."
          path="/home"
          jsonLdId="home-jsonld"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Universflow Home',
            url: 'https://universflow.in/home',
            description: 'Music home with library discovery, charts, albums, and artists.',
            isPartOf: { '@type': 'WebSite', name: 'Universflow', url: 'https://universflow.in' },
          }}
        />
        <h1 className="sr-only">Universflow music home</h1>

        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {currentSong?.cover_url && (
            <img
              src={currentSong.cover_url}
              alt=""
              aria-hidden="true"
              className="absolute -top-28 left-1/2 h-[70%] w-[190%] -translate-x-1/2 object-cover opacity-25"
              style={{ filter: 'blur(70px) saturate(1.35)' }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background to-background" />
        </div>

        <header className="relative z-30 flex items-center justify-between px-4 pb-3 pt-3 safe-area-pt">
          <button
            aria-label="Profile"
            onClick={() => {
              triggerHaptic('selection');
              navigate('/profile');
            }}
            className="h-12 w-12 overflow-hidden rounded-full border border-border bg-secondary"
          >
            <img src={appLogo} alt="Universflow" className="h-full w-full object-cover" width={48} height={48} decoding="async" />
          </button>
          <div className="flex items-center gap-2">
            <IconButton label="Search" onClick={() => navigate('/search')}><Search className="h-5 w-5" /></IconButton>
            <IconButton label="Queue" onClick={() => setShowQueue(true)}><ListMusic className="h-5 w-5" /></IconButton>
            <IconButton label="Lock screen" onClick={() => setShowLockScreen(true)}><Lock className="h-5 w-5" /></IconButton>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-36 pt-1" style={{ WebkitOverflowScrolling: 'touch' }} {...pullToRefresh.handlers}>
          <PullToRefreshIndicator
            pullDistance={pullToRefresh.pullDistance}
            isRefreshing={pullToRefresh.isRefreshing}
            progress={pullToRefresh.progress}
            isTriggered={pullToRefresh.isTriggered}
          />

          {loading ? <HomeSkeleton /> : allSongs.length === 0 ? <EmptyState /> : (
            <div className="space-y-8">
              {!isOffline && <HeroDeck songs={allSongs} />}

              {currentSong && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    togglePlay();
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.6rem] border border-border/70 bg-card/80 p-3 text-left backdrop-blur-2xl"
                >
                  <Cover song={currentSong} className="h-16 w-16 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-black text-foreground">{currentSong.title}</p>
                    <p className="mt-1 truncate text-[12px] font-medium text-muted-foreground">{currentSong.artist}</p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground">
                    {isPlaying ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
                  </div>
                </motion.button>
              )}

              {!isOffline && recent.length > 0 && <CoverRail title="Continue" songs={recent} large />}
              {!isOffline && <CoverRail title="New" songs={newReleases} />}
              {!isOffline && <RankList songs={trending} />}
              {!isOffline && <AlbumWall songs={allSongs} />}
              {!isOffline && <ArtistStrip songs={allSongs} />}
              <CoverRail title={isOffline ? 'Downloads' : 'Library'} songs={allSongs.slice(0, 18)} />
              {isOffline && <AllSongsSection songs={allSongs} />}
            </div>
          )}
        </main>

        <BottomNav />
        {showLockScreen && <LockScreenPlayer isOpen={showLockScreen} onClose={() => setShowLockScreen(false)} />}
        {showQueue && <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />}
        <OfflineIndicator />
      </div>
    </TabTransition>
  );
};

export default Home;