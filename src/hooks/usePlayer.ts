import { useState, useRef } from 'react';
import { getSongStreamUrl, preloadNext } from '../lib/jiosaavn';

interface QueueSong {
  id: string;
  title?: string;
  streamUrl?: string;
}

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(
    typeof window !== 'undefined' ? new Audio() : null
  );
  const [current, setCurrent] = useState<unknown>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [queue, setQueue] = useState<QueueSong[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  async function playSong(songId: string, songQueue: QueueSong[] = [], index = 0) {
    setLoading(true);
    const song = await getSongStreamUrl(songId);
    if (!song) { setLoading(false); return; }

    if (audioRef.current) {
      audioRef.current.src = song.streamUrl;
      await audioRef.current.play();
    }

    setCurrent(song);
    setIsPlaying(true);
    setLoading(false);
    setQueue(songQueue);
    setQueueIndex(index);

    preloadNext(songQueue, index);

    if (audioRef.current) {
      audioRef.current.onended = () => {
        const next = songQueue[index + 1];
        if (next) playSong(next.id, songQueue, index + 1);
      };
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function seek(seconds: number) {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }

  return { current, isPlaying, loading, playSong, togglePlay, seek, audioRef };
}
