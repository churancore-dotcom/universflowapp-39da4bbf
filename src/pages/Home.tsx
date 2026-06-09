import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';

import AllSongsSection from '@/components/AllSongsSection';
import HomeBento from '@/components/HomeBento';

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
import { Music, Lock, ListMusic, Sliders, Headphones } from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHaptics';
import { usePremium } from '@/hooks/usePremium';
import appLogo from '@/assets/universflow-mark.png';
import { HomeSkeleton } from '@/components/PageSkeletons';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SEOHead from '@/components/SEOHead';
import PullToRefreshIndicator from '@/components/PullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';


// Simple empty state
const EmptyState = memo(() => (
  <div className="text-center py-8">
    <div 
      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
      style={{
        background: 'linear-gradient(135deg, hsl(211 100% 50% / 0.2), hsl(328 100% 54% / 0.2))',
      }}
    >
      <Music className="w-8 h-8 text-muted-foreground" />
    </div>
    <h2 className="text-base font-semibold mb-1">No music yet</h2>
    <p className="text-muted-foreground text-xs px-4">
      Music will appear here once uploaded.
    </p>
  </div>
));

EmptyState.displayName = 'EmptyState';

// Simple loading
const LoadingSkeleton = memo(() => (
  <div className="flex justify-center py-8">
    <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

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
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album || undefined,
      cover_url: s.cover_url || undefined,
      audio_url: s.audio_url,
      duration: s.duration || undefined,
      artist_id: artistData?.id || s.artist_id || undefined,
      artist_photo_url: artistData?.photo_url || undefined,
      genre: s.genre || undefined,
      mood: s.mood || undefined,
      created_at: s.created_at || undefined,
      show_in_new_releases: s.show_in_new_releases,
      show_in_trending: s.show_in_trending,
      is_premium_only: s.is_premium_only,
    } as Song;
  });
};

const Home = () => {
  const { currentSong, playSong } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline } = useAuth();
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

  // When offline → ONLY show downloaded songs. When online → full catalog.
  const songs: Song[] = useMemo(() => {
    if (isOffline) {
      return downloads.map((d) => ({
        id: d.id,
        title: d.title,
        artist: d.artist,
        album: d.album,
        cover_url: d.cover_url,
        audio_url: d.blobUrl || d.audio_url,
        duration: d.duration,
      } as Song));
    }
    return onlineSongs;
  }, [isOffline, downloads, onlineSongs]);

  // Persist to local song cache for instant boot next time
  useEffect(() => {
    if (!isOffline && onlineSongs && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [onlineSongs, updateCache, isOffline]);

  const loading = isLoading && songs.length === 0 && !isOffline;

  const allSongs = useMemo(() => songs, [songs]);

  // Realtime: DIFF-based cache patch — only mutate the affected row instead of refetching
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

          if (eventType === 'DELETE') {
            return current.filter((s) => s.id !== oldRow?.id);
          }

          if (!newRow) return current;

          // Hide if no longer visible
          if (newRow.is_visible === false) {
            return current.filter((s) => s.id !== newRow.id);
          }

          const mapped: Song = {
            id: newRow.id,
            title: newRow.title,
            artist: newRow.artist,
            album: newRow.album || undefined,
            cover_url: newRow.cover_url || undefined,
            audio_url: newRow.audio_url,
            duration: newRow.duration || undefined,
            artist_id: newRow.artist_id || undefined,
            show_in_new_releases: newRow.show_in_new_releases,
            show_in_trending: newRow.show_in_trending,
            is_premium_only: newRow.is_premium_only,
          } as Song;

          const idx = current.findIndex((s) => s.id === newRow.id);
          if (eventType === 'INSERT' || idx === -1) {
            // Prepend new song (preserves "latest first" order)
            return [mapped, ...current];
          }
          // UPDATE — patch in place, preserve joined fields like artist_photo_url
          const next = current.slice();
          next[idx] = { ...current[idx], ...mapped };
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isOffline]);




  const greeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Pull-to-refresh — re-fetches home feed on overscroll
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('impactMedium');
      await queryClient.invalidateQueries({ queryKey: HOME_SONGS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: HOME_SONGS_QUERY_KEY });
    },
  });

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background relative flex flex-col overflow-hidden">
        <SEOHead
          title="Univers Flow — Free Music Streaming & Playlists"
          description="Your personalized music feed: trending tracks, featured artists, smart mixes, and your now-playing card. Stream and download free."
          path="/home"
          jsonLdId="home-jsonld"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Univers Flow — Home',
            url: 'https://universflow.in/home',
            description: 'Personalized music feed with trending tracks, featured artists, and smart mixes.',
            isPartOf: { '@type': 'WebSite', name: 'Univers Flow', url: 'https://universflow.in' },
          }}
        />
        <h1 className="sr-only">Univers Flow Music Player</h1>
        {/* Ambient background — cinematic */}
        <div className="absolute inset-0 pointer-events-none">
          {currentSong?.cover_url && (
            <img
              src={currentSong.cover_url}
              alt=""
              className="absolute top-0 left-1/2 -translate-x-1/2 w-[250%] blur-[120px] opacity-[0.12] saturate-150"
              style={{ height: '60%' }}
            />
          )}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 50% at 50% 0%, hsl(350 100% 60% / 0.08), transparent),
                radial-gradient(ellipse 60% 40% at 80% 20%, hsl(280 100% 65% / 0.05), transparent),
                radial-gradient(ellipse 40% 30% at 10% 60%, hsl(210 100% 60% / 0.04), transparent)
              `,
            }}
          />
        </div>

        {/* Premium Header */}
        <header
          className="flex-shrink-0 z-30 px-4 pt-3 pb-3 safe-area-pt"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '0.5px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 25%, rgba(255,45,85,0.18), transparent 70%)',
                }}
              >
                <img src={appLogo} alt="Univers Flow logo" width={36} height={36} {...({ fetchpriority: "high" } as any)} decoding="async" className="w-9 h-9 object-contain" />
              </div>
              <div>
                <p
                  className="text-[24px] leading-none text-foreground tracking-[0.02em]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {greeting().toUpperCase()}
                </p>
                <p className="text-[10px] text-[#FFB199]/70 font-bold tracking-[0.28em] uppercase mt-1">
                  UNIVERS FLOW
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {[
                { icon: ListMusic, action: () => setShowQueue(true), label: 'Open queue' },
                ...(isPremium || isOffline ? [{ icon: Sliders, action: () => setShowEqualizer(true), label: 'Open equalizer' }] : []),
                { icon: Lock, action: () => setShowLockScreen(true), label: 'Open lock screen player' },
              ].map(({ icon: Icon, action, label }, i) => (
                <motion.button
                  key={i}
                  onClick={() => { triggerHaptic('selection'); action(); }}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.10)',
                  }}
                  whileTap={{ scale: 0.85 }}
                >
                  <Icon className="w-4 h-4 text-foreground/60" />
                </motion.button>
              ))}
            </div>
          </div>
        </header>

        {/* Scrollable content area */}
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-4 pb-36 relative z-10"
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
            <div className="space-y-3">
              {/* Live admin announcement banner */}
              <AnnouncementBanner />
              {/* New Bento Hero — Continue Listening + quick tiles */}
              {!isOffline && <HomeBento songs={allSongs} />}

              {/* Online-only discovery sections — hidden when offline */}
              {!isOffline && (
                <>
                  {/* Premium-only / early-access shelf (teaser for free users) */}
                  <PremiumFirstSection />

                  {/* Trending Now — admin-curated trending catalog */}
                  <TrendingNowSection songs={allSongs} />

                  {/* Fresh Releases — newest drops */}
                  <FreshReleasesSection songs={allSongs} />

                  {/* Albums — full records, one tap to play */}
                  <AlbumsShelf songs={allSongs} />

                  {/* Artist discovery */}
                  <FeaturedArtistsSection />

                  {/* Viral Right Now — per-country viral + global charts */}
                  <CountryViralSection />

                  {/* Top 30 from your followed artists */}
                  <GlobalTopTracksSection />

                </>
              )}


              {/* Saved songs only when offline — uploaded catalog is hidden from online Home */}
              {isOffline && allSongs.length > 0 && (
                <AllSongsSection songs={allSongs} />
              )}

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
