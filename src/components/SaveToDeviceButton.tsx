import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardDriveDownload, Check, Loader2, AlertCircle } from 'lucide-react';
import { Song } from '@/contexts/PlayerContext';
import { iosBounce } from '@/lib/animations';
import { triggerHaptic } from '@/hooks/useHaptics';
import { toast } from 'sonner';

interface SaveToDeviceButtonProps {
  song: Song;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SaveToDeviceButton = ({ song, size = 'md', showLabel = false }: SaveToDeviceButtonProps) => {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (status === 'downloading') return;
    
    triggerHaptic('impactMedium');
    setStatus('downloading');
    setProgress(0);

    try {
      // Fetch the audio file with progress tracking
      const response = await fetch(song.audio_url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const chunks: ArrayBuffer[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Copy to ArrayBuffer for blob compatibility
        chunks.push(value.buffer.slice(0) as ArrayBuffer);
        received += value.length;
        
        const progressPercent = total > 0 ? Math.round((received / total) * 100) : 50;
        setProgress(Math.min(progressPercent, 95));
      }

      // Create blob from chunks
      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${song.title} - ${song.artist}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatus('success');
      triggerHaptic('impactMedium');
      toast.success(`"${song.title}" saved to your device!`);

      // Reset after success animation
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 2500);

    } catch (error) {
      console.error('Save to device failed:', error);
      setStatus('error');
      triggerHaptic('impactLight');
      toast.error('Failed to save song to device');
      
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);
    }
  }, [song, status]);

  return (
    <motion.button
      className={`relative ${sizeClasses[size]} rounded-full flex items-center justify-center transition-colors group`}
      onClick={handleDownload}
      whileTap={{ scale: 0.9 }}
      transition={iosBounce}
      disabled={status === 'downloading'}
    >
      {/* Progress ring */}
      <AnimatePresence>
        {status === 'downloading' && (
          <motion.svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 40 40"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="17"
              fill="none"
              stroke="url(#saveGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 17}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 17 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 17 * (1 - progress / 100) 
              }}
              transition={{ duration: 0.3 }}
            />
            <defs>
              <linearGradient id="saveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(145, 80%, 50%)" />
                <stop offset="100%" stopColor="hsl(185, 100%, 55%)" />
              </linearGradient>
            </defs>
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Background glow for success state */}
      <AnimatePresence>
        {status === 'success' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-br from-green-500/30 to-cyan-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={iosBounce}
          />
        )}
      </AnimatePresence>

      {/* Inner content */}
      <motion.div
        className={`relative z-10 ${status === 'success' ? 'text-green-400' : 'text-muted-foreground hover:text-foreground'} transition-colors`}
      >
        <AnimatePresence mode="wait">
          {status === 'downloading' ? (
            <motion.div
              key="loading"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center justify-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className={iconSizes[size]} />
              </motion.div>
            </motion.div>
          ) : status === 'error' ? (
            <motion.div
              key="error"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-destructive"
            >
              <AlertCircle className={iconSizes[size]} />
            </motion.div>
          ) : status === 'success' ? (
            <motion.div
              key="success"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Check className={iconSizes[size]} />
            </motion.div>
          ) : (
            <motion.div
              key="save"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <HardDriveDownload className={iconSizes[size]} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Success animation burst */}
      <AnimatePresence>
        {status === 'success' && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-gradient-to-r from-green-400 to-cyan-400"
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * Math.PI * 2) / 8) * 30,
                  y: Math.sin((i * Math.PI * 2) / 8) * 30,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeOut",
                }}
              />
            ))}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-green-400"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>

      {showLabel && (
        <span className="ml-2 text-sm">
          {status === 'downloading' 
            ? `${progress}%` 
            : status === 'success'
            ? 'Saved!'
            : 'Save to Device'}
        </span>
      )}
    </motion.button>
  );
};

export default SaveToDeviceButton;
