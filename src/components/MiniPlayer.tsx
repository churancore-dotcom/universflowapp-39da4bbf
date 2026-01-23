import { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, X } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { iosBounce } from '@/lib/animations';
import LikeButton from './LikeButton';

// Smooth audio wave component - Apple Music style
const AudioWave = memo(function AudioWave({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-white rounded-full"
          animate={isPlaying ? {
            height: [5, 14, 8, 12, 5],
          } : {
            height: 5,
          }}
          transition={isPlaying ? {
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          } : {
            duration: 0.2,
          }}
        />
      ))}
    </div>
  );
});

const MiniPlayer = memo(function MiniPlayer() {
  const {
    currentSong,
    isPlaying,
    progress,
    duration,
    togglePlay,
    nextSong,
    stopSong,
    setExpanded
  } = usePlayer();
  const navigate = useNavigate();

  const handleArtistClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSong?.artist_id) {
      navigate(`/artist/${currentSong.artist_id}`);
    }
  }, [currentSong?.artist_id, navigate]);

  const handleTogglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      togglePlay();
    } catch (error) {
      console.error('Error toggling play:', error);
    }
  }, [togglePlay]);

  const handleNextSong = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      nextSong();
    } catch (error) {
      console.error('Error skipping song:', error);
    }
  }, [nextSong]);

  const handleStopSong = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      stopSong();
    } catch (error) {
      console.error('Error stopping song:', error);
    }
  }, [stopSong]);

  const handleExpand = useCallback(() => {
    try {
      setExpanded(true);
    } catch (error) {
      console.error('Error expanding player:', error);
    }
  }, [setExpanded]);

  if (!currentSong) return null;

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-16 left-0 right-0 z-40 mx-2 mb-2 rounded-2xl overflow-hidden safe-area-pb"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.3)',
        }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Progress bar - Apple Music style thin line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
          <motion.div
            className="h-full bg-primary"
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.1, ease: "linear" }}
          />
        </div>

        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Song info - tappable to expand */}
          <motion.button
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
            onClick={handleExpand}
            whileTap={{ scale: 0.98, opacity: 0.8 }}
            transition={iosBounce}
          >
            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-muted/50 flex-shrink-0 shadow-lg">
              {currentSong.cover_url ? (
                <img
                  src={currentSong.cover_url}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40" />
              )}
              {isPlaying && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <AudioWave isPlaying={isPlaying} />
                </div>
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[14px] truncate leading-tight">
                {currentSong.title}
              </p>
              <div 
                className={`flex items-center gap-1.5 mt-0.5 ${currentSong.artist_id ? 'cursor-pointer' : ''}`}
                onClick={handleArtistClick}
              >
                {currentSong.artist_photo_url && (
                  <img 
                    src={currentSong.artist_photo_url} 
                    alt={currentSong.artist}
                    className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                  />
                )}
                <p className={`text-[12px] text-muted-foreground truncate ${currentSong.artist_id ? 'hover:text-primary transition-colors' : ''}`}>
                  {currentSong.artist}
                </p>
              </div>
            </div>
          </motion.button>

          {/* Controls */}
          <div className="flex items-center gap-0.5">
            <LikeButton songId={currentSong.id} size="sm" className="mr-1" />
            
            {/* Play/Pause button - Apple Music style */}
            <motion.button
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black"
              onClick={handleTogglePlay}
              whileTap={{ scale: 0.85 }}
              transition={iosBounce}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="black" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="black" />
              )}
            </motion.button>
            
            {/* Next button */}
            <motion.button
              className="w-10 h-10 rounded-full flex items-center justify-center"
              onClick={handleNextSong}
              whileTap={{ scale: 0.85 }}
              transition={iosBounce}
              aria-label="Next song"
            >
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </motion.button>

            {/* Close/Stop button */}
            <motion.button
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-white active:text-white"
              onClick={handleStopSong}
              whileTap={{ scale: 0.85 }}
              transition={iosBounce}
              aria-label="Close player"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default MiniPlayer;