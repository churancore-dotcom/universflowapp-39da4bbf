import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Music, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Input } from '@/components/ui/input';

const genres = ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Indie'];

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    if (query.length > 1) {
      const timer = setTimeout(() => searchSongs(), 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query]);

  const searchSongs = async () => {
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('is_visible', true)
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
      .limit(20);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
      })));
    }
    setSearching(false);
  };

  const searchByGenre = async (genre: string) => {
    setQuery(genre);
    setSearching(true);
    const { data } = await supabase
      .from('songs')
      .select('*')
      .eq('is_visible', true)
      .ilike('genre', `%${genre}%`)
      .limit(20);

    if (data) {
      setResults(data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album || undefined,
        cover_url: s.cover_url || undefined,
        audio_url: s.audio_url,
      })));
    }
    setSearching(false);
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-30 glass px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold mb-4">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="pl-12 pr-10 h-12 bg-muted/50 border-white/10 rounded-full"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.header>

      <main className="px-6 pt-6">
        {/* Genre Tags */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-lg font-display font-bold mb-4">Browse by Genre</h2>
            <div className="flex flex-wrap gap-3">
              {genres.map((genre, index) => (
                <motion.button
                  key={genre}
                  className="px-4 py-2 rounded-full glass hover:bg-white/10 transition-all text-sm font-medium"
                  onClick={() => searchByGenre(genre)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {genre}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search Results */}
        <AnimatePresence mode="wait">
          {searching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-12"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h2 className="text-lg font-display font-bold mb-4">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </h2>
              <div className="space-y-2">
                {results.map((song, index) => {
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
            </motion.div>
          ) : query.length > 1 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 text-muted-foreground"
            >
              <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No results found</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </div>
  );
};

export default Search;
