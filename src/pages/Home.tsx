import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { useNavigate } from 'react-router-dom';

import AllSongsSection from '@/components/AllSongsSection';
import GlobalTopTracksSection from '@/components/GlobalTopTracksSection';
import FeaturedArtistsSection from '@/components/FeaturedArtistsSection';
import PremiumFirstSection from '@/components/PremiumFirstSection';
import TrendingNowSection from '@/components/TrendingNowSection';
import FreshReleasesSection from '@/components/FreshReleasesSection';
import AlbumsShelf from '@/components/AlbumsShelf';
import CountryViralSection from '@/components/CountryViralSection';

import SleepTimerModal from '@/components/SleepTimerModal';
import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import LockScreenPlayer from '@/components/LockScreenPlayer';
import EqualizerModal from '@/components/EqualizerModal';
import OfflineIndicator from '@/components/OfflineIndicator';
import { TabTransition } from '@/components/PageTransition';
import {
  Music, Lock, ListMusic, Sliders, Headphones, Search,
  Play, Pause, Radio, Heart, Download, Settings as SettingsIcon, Crown,
} from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import appLogo from '@/assets/app-logo.png';
import { HomeSkeleton } from '@/components/PageSkeletons';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SEOHead from '@/components/SEOHead';
import PullToRefreshIndicator from '@/components/PullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

const EmptyState = memo(() => (
  <div className="text-center py-12">
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
      style={{ background: 'linear-gradient(135deg, hsl(350 100% 60% / 0.25), hsl(280 100% 65% / 0.15))' }}
    >
      <Music className="w-9 h-9 text-primary" />
    </div>
    <h2 className="text-lg font-bold mb-1">No music yet</h2>
    <p className="text-muted-foreground text-xs px-4">Your library will appear here once tracks are added.</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

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
    const a = s.artists as { id: string; name: string; photo_url: string | null } | null;
    return {
      id: s.id, title: s.title, artist: s.artist,
      album: s.album || undefined, cover_url: s.cover_url || undefined,
      audio_url: s.audio_url, duration: s.duration || undefined,
      artist_id: a?.id || s.artist_id || undefined,
      artist_photo_url: a?.photo_url || undefined,
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
  const { currentSong, isPlaying, togglePlay, playSong } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline, user } = useAuth();
  const { downloads } = useDownloads();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
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
        cover_url: d.cover_url, audio_url: d.blobUrl || d.audio_url, duration: d.duration,
      } as Song));
    }
    return onlineSongs;
  }, [isOffline, downloads, onlineSongs]);

  useEffect(() => {
    if (!isOffline && onlineSongs && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [onlineSongs, updateCache, isOffline]);

  const loading = isLoading && songs.length === 0 && !isOffline;
  const allSongs = useMemo(() => songs, [songs]);

  // Realtime diff patch
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

  const greeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Late night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Tonight';
  }, []);

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('impactMedium');
      await queryClient.invalidateQueries({ queryKey: HOME_SONGS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: HOME_SONGS_QUERY_KEY });
    },
  });

  // Editorial hero pick — newest with a cover
  const heroPick = useMemo(() => {
    const withCover = allSongs.find((s) => s.cover_url);
    return withCover || allSongs[0];
  }, [allSongs]);

  // Quick-shuffle starter — random 20
  const startShuffle = useCallback(() => {
    if (allSongs.length === 0) return;
    triggerHaptic('impactMedium');
    const pool = [...allSongs].sort(() => Math.random() - 0.5).slice(0, 20);
    playSong(pool[0], undefined, pool);
  }, [allSongs, playSong]);

  const username = useMemo(() => {
    const meta: any = user?.user_metadata || {};
    return meta.username || meta.full_name || (user?.email ? user.email.split('@')[0] : '');
  }, [user]);

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background relative flex flex-col overflow-hidden">
        <SEOHead
          title="Univers Flow — Free Music Streaming & Playlists"
          description="Your personalized music feed: trending tracks, featured artists, auto-generated mixes, and your now-playing card. Stream and download free."
          path="/home"
          jsonLdId="home-jsonld"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Univers Flow — Home',
            url: 'https://universflow.in/home',
            description: 'Personalized music feed with trending tracks, featured artists, and auto-generated mixes.',
            isPartOf: { '@type': 'WebSite', name: 'Univers Flow', url: 'https://universflow.in' },
          }}
        />
        <h1 className="sr-only">Univers Flow Music Player</h1>

        {/* Ambient layered background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {currentSong?.cover_url && (
            <img
              src={currentSong.cover_url}
              alt=""
              aria-hidden
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[260%] h-[80%] object-cover opacity-[0.18] saturate-[1.6]"
              style={{ filter: 'blur(120px)' }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 90% 55% at 50% -10%, hsl(350 100% 60% / 0.18), transparent 60%),
                radial-gradient(ellipse 60% 45% at 100% 10%, hsl(280 100% 65% / 0.10), transparent 65%),
                radial-gradient(ellipse 50% 35% at 0% 70%, hsl(210 100% 60% / 0.08), transparent 70%)
              `,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)',
              backgroundSize: '3px 3px',
            }}
          />
        </div>

        {/* Header — editorial / glass */}
        <header
          className="flex-shrink-0 z-30 px-4 pt-3 pb-3 safe-area-pt"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { triggerHaptic('selection'); navigate('/profile'); }}
              className="flex items-center gap-3 min-w-0 active:opacity-70"
            >
              <div
                className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 relative"
                style={{
                  boxShadow: '0 4px 18px hsl(var(--primary) / 0.35), inset 0 0 0 1.5px hsl(var(--primary) / 0.4)',
                }}
              >
                <img src={appLogo} alt="Univers Flow" width={44} height={44} {...({ fetchpriority: 'high' } as any)} decoding="async" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/80">{greeting()}</p>
                <p className="text-[15px] font-bold text-foreground tracking-tight truncate leading-tight">
                  {username || 'Welcome back'}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5">
              <motion.button
                onClick={() => { triggerHaptic('selection'); navigate('/search'); }}
                aria-label="Search"
                whileTap={{ scale: 0.85 }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)' }}
              >
                <Search className="w-4 h-4 text-foreground/75" />
              </motion.button>
              <motion.button
                onClick={() => { triggerHaptic('selection'); setShowQueue(true); }}
                aria-label="Queue"
                whileTap={{ scale: 0.85 }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)' }}
              >
                <ListMusic className="w-4 h-4 text-foreground/75" />
              </motion.button>
              <motion.button
                onClick={() => { triggerHaptic('selection'); setShowLockScreen(true); }}
                aria-label="Lock screen player"
                whileTap={{ scale: 0.85 }}
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08))',
                  border: '0.5px solid hsl(var(--primary) / 0.35)',
                }}
              >
                <Lock className="w-4 h-4 text-primary" />
              </motion.button>
            </div>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-36 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
          {...pullToRefresh.handlers}
        >
          <PullToRefreshIndicator
            pullDistance={pullToRefresh.pullDistance}
            isRefreshing={pullToRefresh.isRefreshing}
            progress={pullToRefresh.progress}
            isTriggered={pullToRefresh.isTriggered}
          />

          {loading ? (
            <HomeSkeleton />
          ) : isOffline && songs.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              <AnnouncementBanner />

              {/* === EDITORIAL HERO === */}
              {!isOffline && heroPick && (
                <motion.button
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => { triggerHaptic('impactMedium'); playSong(heroPick, undefined, allSongs); }}
                  className="relative w-full rounded-[28px] overflow-hidden text-left"
                  style={{
                    aspectRatio: '16 / 10',
                    boxShadow: '0 20px 60px -20px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08)',
                  }}
                >
                  {heroPick.cover_url && (
                    <img src={heroPick.cover_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110" />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)',
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-between p-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] uppercase tracking-[0.22em] font-extrabold px-2.5 py-1 rounded-full"
                        style={{
                          background: 'rgba(255,45,85,0.95)',
                          color: 'white',
                          letterSpacing: '0.22em',
                          boxShadow: '0 4px 14px rgba(255,45,85,0.5)',
                        }}
                      >
                        Editor's Pick
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/65 mb-1">
                        {heroPick.artist}
                      </p>
                      <p className="text-[26px] leading-[1.05] font-black text-white tracking-tight line-clamp-2 mb-3"
                         style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' }}>
                        {heroPick.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-11 h-11 rounded-full flex items-center justify-center"
                          style={{
                            background: 'white',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          }}
                        >
                          <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
                        </span>
                        <span className="text-[12px] font-semibold text-white/80">Play now</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              )}

              {/* === QUICK ACTION CHIPS === */}
              <div className="flex gap-2 overflow-x-auto -mx-3 px-3 scrollbar-none">
                {[
                  { icon: Radio, label: 'Shuffle Mix', onClick: startShuffle, accent: 'hsl(350 100% 60%)' },
                  { icon: Heart, label: 'Liked', onClick: () => navigate('/library?tab=liked'), accent: 'hsl(328 100% 60%)' },
                  { icon: Download, label: 'Downloads', onClick: () => navigate('/downloads'), accent: 'hsl(195 100% 55%)' },
                  ...(isPremium || isOffline
                    ? [{ icon: Sliders, label: 'Equalizer', onClick: () => setShowEqualizer(true), accent: 'hsl(280 100% 65%)' }]
                    : [{ icon: Crown, label: 'Go Premium', onClick: () => navigate('/premium'), accent: 'hsl(45 100% 55%)' }]),
                  { icon: SettingsIcon, label: 'Settings', onClick: () => navigate('/settings'), accent: 'hsl(0 0% 70%)' },
                ].map((c, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { triggerHaptic('selection'); c.onClick(); }}
                    className="flex-shrink-0 flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(20px)',
                    }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: `${c.accent.replace(')', ' / 0.18)')}`, border: `0.5px solid ${c.accent.replace(')', ' / 0.3)')}` }}
                    >
                      <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-foreground/90 whitespace-nowrap">{c.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* === NOW PLAYING — premium ribbon card === */}
              {currentSong && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative rounded-3xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                  }}
                >
                  {currentSong.cover_url && (
                    <img
                      src={currentSong.cover_url}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl saturate-150"
                    />
                  )}
                  <div className="relative flex items-center gap-3.5 p-3.5">
                    <div
                      className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative"
                      style={{
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      {currentSong.cover_url ? (
                        <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <Headphones className="w-7 h-7 text-primary" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="flex items-end gap-[2px] h-2.5">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="w-[2.5px] bg-primary rounded-full animate-audio-wave"
                                 style={{ animationDelay: `${i * 0.14}s` }} />
                          ))}
                        </div>
                        <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary">
                          {isPlaying ? 'Now Playing' : 'Paused'}
                        </p>
                      </div>
                      <p className="text-[15px] font-bold text-foreground truncate leading-tight">{currentSong.title}</p>
                      <p className="text-[12px] text-muted-foreground/70 truncate mt-0.5">{currentSong.artist}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => { triggerHaptic('selection'); togglePlay(); }}
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(350 100% 50%))',
                        boxShadow: '0 6px 20px hsl(var(--primary) / 0.45)',
                      }}
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 text-white" fill="white" />
                      ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* === DISCOVERY === */}
              {!isOffline && (
                <>
                  <PremiumFirstSection />
                  <TrendingNowSection songs={allSongs} />
                  <FreshReleasesSection songs={allSongs} />
                  <AlbumsShelf songs={allSongs} />
                  <FeaturedArtistsSection />
                  <CountryViralSection />
                  <GlobalTopTracksSection />
                </>
              )}

              {isOffline && allSongs.length > 0 && <AllSongsSection songs={allSongs} />}

              {/* Editorial footer mark */}
              <div className="pt-6 pb-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-muted-foreground/40">
                  Universflow
                </p>
                <div className="mx-auto mt-2 h-[1px] w-12"
                     style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)' }} />
              </div>
            </div>
          )}
        </main>

        <BottomNav />
        {showLockScreen && <LockScreenPlayer isOpen={showLockScreen} onClose={() => setShowLockScreen(false)} />}
        {showSleepTimer && <SleepTimerModal isOpen={showSleepTimer} onClose={() => setShowSleepTimer(false)} />}
        {showQueue && <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />}
        {showEqualizer && <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />}
        <OfflineIndicator />
      </div>
    </TabTransition>
  );
};

export default Home;
