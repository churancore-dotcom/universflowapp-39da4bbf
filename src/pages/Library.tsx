import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Music, Heart, ListMusic, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Library = () => {
  const { user } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLibrary();
    }
  }, [user]);

  const fetchLibrary = async () => {
    if (!user) return;

    // Fetch liked songs
    const { data: liked } = await supabase
      .from('user_library')
      .select('*, songs(*)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (liked) {
      setLikedSongs(liked.map(l => ({
        id: l.songs.id,
        title: l.songs.title,
        artist: l.songs.artist,
        album: l.songs.album || undefined,
        cover_url: l.songs.cover_url || undefined,
        audio_url: l.songs.audio_url,
      })));
    }

    // Fetch recently played
    const { data: recent } = await supabase
      .from('recently_played')
      .select('*, songs(*)')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(20);

    if (recent) {
      const uniqueSongs = new Map();
      recent.forEach(r => {
        if (!uniqueSongs.has(r.songs.id)) {
          uniqueSongs.set(r.songs.id, {
            id: r.songs.id,
            title: r.songs.title,
            artist: r.songs.artist,
            album: r.songs.album || undefined,
            cover_url: r.songs.cover_url || undefined,
            audio_url: r.songs.audio_url,
          });
        }
      });
      setRecentlyPlayed(Array.from(uniqueSongs.values()));
    }

    // Fetch playlists
    const { data: userPlaylists } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (userPlaylists) {
      setPlaylists(userPlaylists);
    }

    setLoading(false);
  };

  const SongList = ({ songs, emptyMessage }: { songs: Song[]; emptyMessage: string }) => (
    songs.length === 0 ? (
      <div className="text-center py-12 text-muted-foreground">
        <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    ) : (
      <div className="space-y-2">
        {songs.map((song, index) => {
          const isActive = currentSong?.id === song.id;
          return (
            <motion.button
              key={song.id}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all text-left ${
                isActive ? 'bg-primary/10' : 'hover:bg-white/5'
              }`}
              onClick={() => playSong(song)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {song.cover_url ? (
                  <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                  {song.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
              </div>
              {isActive && isPlaying && (
                <div className="flex items-end gap-0.5 h-4">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-primary rounded-full"
                      animate={{ height: [4, 16, 4] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-background pb-40">
      <motion.header
        className="sticky top-0 z-30 glass px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold">Your Library</h1>
      </motion.header>

      <main className="px-6 pt-6">
        <Tabs defaultValue="liked" className="w-full">
          <TabsList className="w-full glass mb-6">
            <TabsTrigger value="liked" className="flex-1 gap-2">
              <Heart className="w-4 h-4" /> Liked
            </TabsTrigger>
            <TabsTrigger value="recent" className="flex-1 gap-2">
              <Clock className="w-4 h-4" /> Recent
            </TabsTrigger>
            <TabsTrigger value="playlists" className="flex-1 gap-2">
              <ListMusic className="w-4 h-4" /> Playlists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liked">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <SongList songs={likedSongs} emptyMessage="No liked songs yet" />
            )}
          </TabsContent>

          <TabsContent value="recent">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <SongList songs={recentlyPlayed} emptyMessage="No recently played songs" />
            )}
          </TabsContent>

          <TabsContent value="playlists">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ListMusic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No playlists yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {playlists.map((playlist, index) => (
                  <motion.div
                    key={playlist.id}
                    className="glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-all"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-3">
                      {playlist.cover_url ? (
                        <img src={playlist.cover_url} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <ListMusic className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium truncate">{playlist.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{playlist.description || 'Playlist'}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </div>
  );
};

export default Library;
