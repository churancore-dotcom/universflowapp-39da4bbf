import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Song } from '@/contexts/PlayerContext';
import SongCard from '@/components/SongCard';
import HorizontalSection from '@/components/HorizontalSection';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Sparkles, Music } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();

    const channel = supabase
      .channel('songs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, fetchSongs)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (data) {
      setSongs(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
        duration: s.duration || undefined,
      })));
    }
    setLoading(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const EmptyState = () => (
    <motion.div
      className="text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
        <Music className="w-12 h-12 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-display font-bold mb-2">No music yet</h2>
      <p className="text-muted-foreground max-w-xs mx-auto">
        Music will appear here once an admin uploads songs to the platform.
      </p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-40">
      <motion.header
        className="sticky top-0 z-30 glass px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()}</p>
            <h1 className="text-xl font-display font-bold">{user?.email?.split('@')[0] || 'Music Lover'}</h1>
          </div>
          <motion.div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </motion.div>
        </div>
      </motion.header>

      <main className="px-6 pt-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : songs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <HorizontalSection title="New Releases" subtitle="Fresh tracks just added">
              {songs.slice(0, 10).map((song, i) => (
                <SongCard key={song.id} song={song} index={i} />
              ))}
            </HorizontalSection>

            {songs.length > 5 && (
              <HorizontalSection title="Trending Now" subtitle="What's hot right now">
                {[...songs].sort(() => Math.random() - 0.5).slice(0, 8).map((song, i) => (
                  <SongCard key={song.id} song={song} index={i} />
                ))}
              </HorizontalSection>
            )}

            {songs.length > 3 && (
              <HorizontalSection title="Recommended for You" subtitle="Based on your taste">
                {[...songs].reverse().slice(0, 8).map((song, i) => (
                  <SongCard key={song.id} song={song} index={i} />
                ))}
              </HorizontalSection>
            )}
          </>
        )}
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </div>
  );
};

export default Home;
