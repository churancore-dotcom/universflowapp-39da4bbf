import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music2, Loader2, AlertCircle, Mic2 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { iosSpring } from '@/lib/animations';

interface LyricsDisplayProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sample lyrics database (in real app, would fetch from API)
const SAMPLE_LYRICS: Record<string, string[]> = {
  default: [
    "♪ Music fills the air ♪",
    "",
    "When words aren't enough",
    "Let the melody speak",
    "Every note tells a story",
    "Every beat sets you free",
    "",
    "Dancing through the night",
    "Lost in sound and light",
    "This rhythm in your heart",
    "Was there from the start",
    "",
    "♪ Let the music play ♪",
    "",
    "Close your eyes and feel",
    "Every moment is real",
    "The bass drops and you rise",
    "Reaching for the skies",
    "",
    "Lyrics flow like water",
    "Emotions grow much stronger",
    "The song becomes your soul",
    "Making you feel whole",
    "",
    "♪ This is your song ♪",
  ],
};

const LyricsDisplay = ({ isOpen, onClose }: LyricsDisplayProps) => {
  const { currentSong, progress, duration, isPlaying } = usePlayer();
  const [lyrics, setLyrics] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentSong) {
      fetchLyrics();
    }
  }, [isOpen, currentSong?.id]);

  useEffect(() => {
    if (lyrics.length > 0 && duration > 0) {
      // Calculate current line based on progress
      const lineIndex = Math.floor((progress / duration) * lyrics.length);
      setCurrentLineIndex(Math.min(lineIndex, lyrics.length - 1));
    }
  }, [progress, duration, lyrics.length]);

  useEffect(() => {
    // Auto-scroll to current line
    if (containerRef.current && isPlaying) {
      const currentLine = containerRef.current.querySelector(`[data-line="${currentLineIndex}"]`);
      currentLine?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLineIndex, isPlaying]);

  const fetchLyrics = async () => {
    setLoading(true);
    // Simulate API call - in real app would fetch from lyrics API
    await new Promise(resolve => setTimeout(resolve, 800));
    setLyrics(SAMPLE_LYRICS.default);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Blurred background */}
        <div className="absolute inset-0 bg-black">
          {currentSong?.cover_url && (
            <motion.img
              src={currentSong.cover_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'blur(100px) saturate(1.2)', opacity: 0.4 }}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            />
          )}
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="relative h-full flex flex-col safe-area-pt safe-area-pb">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Mic2 className="w-5 h-5 text-primary" />
              <span className="font-bold">Lyrics</span>
            </div>
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Song Info */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-4">
              {currentSong?.cover_url && (
                <motion.img
                  src={currentSong.cover_url}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                />
              )}
              <div>
                <h2 className="font-bold text-lg">{currentSong?.title}</h2>
                <p className="text-muted-foreground">{currentSong?.artist}</p>
              </div>
            </div>
          </div>

          {/* Lyrics Container */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading lyrics...</p>
              </div>
            ) : lyrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground/50" />
                <div>
                  <p className="font-medium">No lyrics available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lyrics for this song haven't been added yet
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-8">
                {lyrics.map((line, index) => (
                  <motion.p
                    key={index}
                    data-line={index}
                    className={`text-2xl font-bold leading-relaxed transition-all duration-300 ${
                      index === currentLineIndex
                        ? 'text-white scale-105 origin-left'
                        : index < currentLineIndex
                        ? 'text-white/30'
                        : 'text-white/50'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    {line || '\u00A0'}
                  </motion.p>
                ))}
              </div>
            )}
          </div>

          {/* Progress indicator */}
          {isPlaying && (
            <motion.div
              className="absolute bottom-20 left-6 right-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Music2 className="w-4 h-4" />
                <span>Auto-scrolling to lyrics</span>
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LyricsDisplay;
