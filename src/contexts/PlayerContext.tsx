import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useMediaSession } from '@/hooks/useMediaSession';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  audio_url: string;
  duration?: number;
}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: Song[];
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isExpanded: boolean;
  playSong: (song: Song, offlineUrl?: string | null) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (expanded: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [queue, setQueueState] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
  const [isExpanded, setExpanded] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element with background playback support
  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'auto';
    
    // Enable background playback
    if ('mediaSession' in navigator) {
      // Audio will continue playing in background
      audio.setAttribute('x-webkit-airplay', 'allow');
    }
    
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        nextSongInternal();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    // Handle visibility change to ensure audio continues
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying && audioRef.current) {
        // Keep playing in background
        audioRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      audio.pause();
      audio.src = '';
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const nextSongInternal = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
      if (nextIndex === 0 && repeat === 'off') {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentIndex(nextIndex);
    playSongAtIndex(nextIndex);
  }, [queue, currentIndex, shuffle, repeat]);

  const playSongAtIndex = (index: number) => {
    const song = queue[index];
    if (song && audioRef.current) {
      setCurrentSong(song);
      audioRef.current.src = song.audio_url;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const playSong = useCallback((song: Song, offlineUrl?: string | null) => {
    if (audioRef.current) {
      setCurrentSong(song);
      // Use offline URL if available, otherwise use online URL
      audioRef.current.src = offlineUrl || song.audio_url;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
      
      // Add to queue if not already there
      const existingIndex = queue.findIndex(s => s.id === song.id);
      if (existingIndex === -1) {
        setQueueState(prev => [...prev, song]);
        setCurrentIndex(queue.length);
      } else {
        setCurrentIndex(existingIndex);
      }
    }
  }, [queue]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [currentSong, isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.play().catch(console.error);
    }
  }, [currentSong]);

  const nextSong = useCallback(() => {
    nextSongInternal();
  }, [nextSongInternal]);

  const prevSong = useCallback(() => {
    if (!audioRef.current) return;
    
    if (progress > 3) {
      audioRef.current.currentTime = 0;
    } else if (queue.length > 0) {
      const prevIndex = currentIndex === 0 ? queue.length - 1 : currentIndex - 1;
      setCurrentIndex(prevIndex);
      playSongAtIndex(prevIndex);
    }
  }, [progress, queue, currentIndex]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  const setVolume = (vol: number) => {
    setVolumeState(vol);
  };

  const setQueue = (songs: Song[]) => {
    setQueueState(songs);
    setCurrentIndex(0);
  };

  const addToQueue = (song: Song) => {
    setQueueState(prev => [...prev, song]);
  };

  const toggleShuffle = () => {
    setShuffle(!shuffle);
  };

  const toggleRepeat = () => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const currentModeIndex = modes.indexOf(repeat);
    setRepeat(modes[(currentModeIndex + 1) % modes.length]);
  };

  // Media Session API for lock screen / notification controls
  useMediaSession({
    song: currentSong,
    isPlaying,
    onPlay: play,
    onPause: pause,
    onNext: nextSong,
    onPrev: prevSong,
    onSeek: seek,
    duration,
    progress,
  });

  return (
    <PlayerContext.Provider value={{
      currentSong,
      isPlaying,
      progress,
      duration,
      volume,
      queue,
      shuffle,
      repeat,
      isExpanded,
      playSong,
      togglePlay,
      pause,
      play,
      nextSong,
      prevSong,
      seek,
      setVolume,
      setQueue,
      addToQueue,
      toggleShuffle,
      toggleRepeat,
      setExpanded,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
