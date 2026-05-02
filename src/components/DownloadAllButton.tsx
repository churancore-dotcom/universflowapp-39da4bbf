import { motion } from 'framer-motion';
import { Download, ListPlus, Check } from 'lucide-react';
import { useDownloads } from '@/contexts/DownloadContext';
import { Song } from '@/contexts/PlayerContext';
import { Button } from '@/components/ui/button';
import { iosBounce } from '@/lib/animations';

interface DownloadAllButtonProps {
  songs: Song[];
  className?: string;
}

const DownloadAllButton = ({ songs, className = '' }: DownloadAllButtonProps) => {
  const { addToQueue, isDownloaded, isInQueue } = useDownloads();

  const downloadableSongs = songs.filter(
    song => !isDownloaded(song.id) && !isInQueue(song.id)
  );

  const allDownloaded = songs.every(song => isDownloaded(song.id));
  const someInQueue = songs.some(song => isInQueue(song.id));

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadableSongs.length === 0) return;
    addToQueue(downloadableSongs);
  };


  if (songs.length === 0) return null;

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      transition={iosBounce}
    >
      <Button
        variant="ghost"
        size="sm"
        className={`gap-2 text-muted-foreground hover:text-primary ${className}`}
        onClick={handleClick}
        disabled={allDownloaded || downloadableSongs.length === 0}
      >
        {allDownloaded ? (
          <>
            <Check className="w-4 h-4" />
            <span className="text-xs">All Downloaded</span>
          </>
        ) : someInQueue && downloadableSongs.length === 0 ? (
          <>
            <ListPlus className="w-4 h-4" />
            <span className="text-xs">In Queue</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="text-xs">Download All ({downloadableSongs.length})</span>
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default DownloadAllButton;