import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { iosSpring, iosBounce, staggerItem } from '@/lib/animations';
import DownloadButton from './DownloadButton';

interface SongCardProps {
  song: Song;
  index?: number;
}

const SongCard = ({ song, index = 0 }: SongCardProps) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { isDownloaded, getDownloadedUrl } = useDownloads();
  const isCurrentSong = currentSong?.id === song.id;
  const downloaded = isDownloaded(song.id);

  const handleClick = () => {
    if (isCurrentSong) {
      togglePlay();
    } else {
      // Use offline URL if downloaded
      const offlineUrl = getDownloadedUrl(song.id);
      playSong(song, offlineUrl);
    }
  };

  return (
    <motion.div
      className="group relative flex-shrink-0 w-[160px] md:w-[180px] snap-start"
      variants={staggerItem}
      initial="initial"
      animate="animate"
      custom={index}
    >
      <motion.div
        className="relative aspect-square rounded-2xl overflow-hidden bg-muted/50 cursor-pointer"
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.97 }}
        transition={iosBounce}
        onClick={handleClick}
      >
        {song.cover_url ? (
          <motion.img
            src={song.cover_url}
            alt={song.title}
            className="w-full h-full object-cover"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <div className="flex items-end gap-1 h-10">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 bg-white/50 rounded-full"
                  animate={isCurrentSong && isPlaying ? {
                    height: [6, 28, 6],
                  } : { height: 10 }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* iOS-style gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Download button - top right */}
        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <DownloadButton song={song} size="sm" />
        </div>
        
        {/* Downloaded indicator badge */}
        {downloaded && (
          <motion.div
            className="absolute top-2 left-2 z-10"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={iosBounce}
          >
            <div className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </motion.div>
        )}
        
        {/* Play button overlay - iOS style */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
        >
          <motion.div
            className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl"
            initial={{ scale: 0.5, opacity: 0 }}
            whileHover={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.9 }}
            transition={iosBounce}
          >
            {isCurrentSong && isPlaying ? (
              <Pause className="w-6 h-6 text-black" fill="black" />
            ) : (
              <Play className="w-6 h-6 text-black ml-1" fill="black" />
            )}
          </motion.div>
        </motion.div>

        {/* Playing indicator - iOS style */}
        {isCurrentSong && (
          <motion.div
            className="absolute bottom-3 right-3"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={iosSpring}
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg glow-sm">
              <div className="flex items-end gap-0.5 h-3.5">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[3px] bg-white rounded-full"
                    animate={isPlaying ? {
                      height: [3, 12, 3],
                    } : { height: 5 }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
      
      <div className="mt-3 px-1">
        <motion.p 
          className={`font-medium text-[15px] truncate leading-tight ${isCurrentSong ? 'text-primary' : ''}`}
          animate={{ color: isCurrentSong ? 'hsl(var(--primary))' : 'inherit' }}
        >
          {song.title}
        </motion.p>
        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
          {song.artist}
        </p>
      </div>
    </motion.div>
  );
};

export default SongCard;
