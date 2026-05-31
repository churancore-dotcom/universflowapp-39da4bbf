import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Disc3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import HorizontalSection from './HorizontalSection';
import OptimizedImage from './OptimizedImage';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Album {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  release_year: number | null;
}

interface Props { songs: Song[] }

const fetchAlbums = async (): Promise<Album[]> => {
  const { data, error } = await supabase
    .from('albums')
    .select('id, title, artist, cover_url, release_year')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as Album[];
};

const AlbumsShelf = memo(({ songs }: Props) => {
  const { playSong } = usePlayer();
  const { data: albums = [] } = useQuery({
    queryKey: ['home', 'albums'],
    queryFn: fetchAlbums,
    staleTime: 10 * 60 * 1000,
  });

  if (albums.length === 0) return null;

  const playAlbum = (album: Album) => {
    triggerHaptic('impactLight');
    const tracks = songs.filter(
      (s) =>
        (s.album || '').toLowerCase() === album.title.toLowerCase() &&
        (s.artist || '').toLowerCase() === album.artist.toLowerCase()
    );
    if (tracks.length > 0) {
      playSong(tracks[0], undefined, tracks);
    }
  };

  return (
    <HorizontalSection title="Albums" subtitle="Full records, one tap to play">
      {albums.map((album, idx) => (
        <motion.button
          key={album.id}
          onClick={() => playAlbum(album)}
          whileTap={{ scale: 0.95 }}
          className="snap-start flex-shrink-0 w-[140px] text-left"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.03 }}
        >
          <div
            className="w-[140px] h-[140px] rounded-2xl overflow-hidden mb-2 relative"
            style={{
              boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
              border: '0.5px solid rgba(255,255,255,0.08)',
            }}
          >
            {album.cover_url ? (
              <OptimizedImage
                src={album.cover_url}
                alt={album.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-primary/60" />
              </div>
            )}
          </div>
          <p className="text-[13px] font-bold text-foreground truncate leading-tight">
            {album.title}
          </p>
          <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
            {album.artist}
            {album.release_year ? ` · ${album.release_year}` : ''}
          </p>
        </motion.button>
      ))}
    </HorizontalSection>
  );
});

AlbumsShelf.displayName = 'AlbumsShelf';
export default AlbumsShelf;
