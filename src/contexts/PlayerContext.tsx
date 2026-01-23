import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useMediaSession } from '@/hooks/useMediaSession';
import { supabase } from '@/integrations/supabase/client';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  audio_url: string;
  duration?: number;
  artist_id?: string;
  artist_photo_url?: string;
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
  crossfade: boolean;
  crossfadeDuration: number;
  audioElement: HTMLAudioElement | null;
  playSong: (song: Song, offlineUrl?: string | null) => void;
  togglePlay: () => void;
  pause: () => void;
  play: () => void;
  stopSong: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setExpanded: (expanded: boolean) => void;
  toggleCrossfade: () => void;
  setCrossfadeDuration: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Safe audio play with WebView compatibility
const safeAudioPlay = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    // Some WebViews require user interaction first
    await audio.play();
  } catch (error: any) {
    // NotAllowedError is common in WebViews - audio will play on next user interaction
    if (error?.name === 'NotAllowedError') {
      console.warn('Audio autoplay blocked - will play on user interaction');
    } else {
      console.error('Audio play error:', error);
    }
  }
};

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
  const [crossfade, setCrossfade] = useState(true);
  const [crossfadeDuration, setCrossfadeDurationState] = useState(3);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const crossfadeIntervalRef = useRef<number | null>(null);
  const isCrossfading = useRef(false);
  const isInitialized = useRef(false);

  // Initialize audio elements with WebView compatibility
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const audio = new Audio();
    audio.volume = volume;
    audio.preload = 'metadata'; // Changed from 'auto' for better WebView compat
    audio.crossOrigin = 'anonymous'; // For CORS
    
    // WebView compatibility attributes
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    
    // Enable background playback
    if ('mediaSession' in navigator) {
      audio.setAttribute('x-webkit-airplay', 'allow');
    }
    
    audioRef.current = audio;

    // Create second audio element for crossfade
    const nextAudio = new Audio();
    nextAudio.volume = 0;
    nextAudio.preload = 'metadata';
    nextAudio.crossOrigin = 'anonymous';
    nextAudio.setAttribute('playsinline', 'true');
    nextAudio.setAttribute('webkit-playsinline', 'true');
    nextAudioRef.current = nextAudio;

    const handleTimeUpdate = () => {
      if (!isCrossfading.current && audioRef.current) {
        setProgress(audioRef.current.currentTime);
      }

      // Start crossfade before song ends
      if (crossfade && queue.length > 1 && audioRef.current?.duration) {
        const timeLeft = audioRef.current.duration - audioRef.current.currentTime;
        if (timeLeft <= crossfadeDuration && timeLeft > 0 && !isCrossfading.current) {
          startCrossfade();
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration || 0);
      }
    };

    const handleEnded = () => {
      if (repeat === 'one' && audioRef.current) {
        audioRef.current.currentTime = 0;
        safeAudioPlay(audioRef.current);
      } else if (!isCrossfading.current) {
        nextSongInternal();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      if (!isCrossfading.current) {
        setIsPlaying(false);
      }
    };

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      console.warn('Audio error:', audioEl.error?.message || 'Unknown error');
      // Don't crash - just log and continue
    };

    const handleCanPlay = () => {
      // Audio is ready to play
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Handle visibility change to ensure audio continues
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying && audioRef.current) {
        // Keep playing in background
      } else if (document.visibilityState === 'visible' && isPlaying && audioRef.current?.paused) {
        // Resume if was playing
        safeAudioPlay(audioRef.current);
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
      audio.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      try {
        audio.pause();
        audio.src = '';
        nextAudio.pause();
        nextAudio.src = '';
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
    };
  }, []);

  // Update volume on both audio elements
  useEffect(() => {
    if (audioRef.current && !isCrossfading.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const startCrossfade = useCallback(() => {
    if (!audioRef.current || !nextAudioRef.current || isCrossfading.current) return;
    if (queue.length <= 1) return;

    isCrossfading.current = true;

    // Determine next song
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = (currentIndex + 1) % queue.length;
      if (nextIndex === 0 && repeat === 'off') {
        isCrossfading.current = false;
        return;
      }
    }

    const nextSong = queue[nextIndex];
    if (!nextSong) {
      isCrossfading.current = false;
      return;
    }

    // Prepare next audio
    nextAudioRef.current.src = nextSong.audio_url;
    nextAudioRef.current.volume = 0;
    safeAudioPlay(nextAudioRef.current).catch(() => {
      isCrossfading.current = false;
    });

    const steps = 30;
    const stepDuration = (crossfadeDuration * 1000) / steps;
    let currentStep = 0;

    crossfadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const fadeProgress = currentStep / steps;

      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, volume * (1 - fadeProgress));
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.volume = Math.min(volume, volume * fadeProgress);
      }

      if (currentStep >= steps) {
        if (crossfadeIntervalRef.current) {
          clearInterval(crossfadeIntervalRef.current);
          crossfadeIntervalRef.current = null;
        }

        // Complete the transition
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }

        // Swap audio elements
        const temp = audioRef.current;
        audioRef.current = nextAudioRef.current;
        nextAudioRef.current = temp;

        // Update state
        setCurrentSong(nextSong);
        setCurrentIndex(nextIndex);
        setProgress(0);
        setDuration(audioRef.current?.duration || 0);

        isCrossfading.current = false;
      }
    }, stepDuration);
  }, [queue, currentIndex, shuffle, repeat, volume, crossfadeDuration]);

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
      // Cancel any ongoing crossfade
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
      isCrossfading.current = false;

      setCurrentSong(song);
      audioRef.current.src = song.audio_url;
      audioRef.current.volume = volume;
      safeAudioPlay(audioRef.current);
      setIsPlaying(true);
    }
  };

  const playSong = useCallback(async (song: Song, offlineUrl?: string | null) => {
    if (audioRef.current) {
      // Cancel any ongoing crossfade
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
        crossfadeIntervalRef.current = null;
      }
      isCrossfading.current = false;

      setCurrentSong(song);
      audioRef.current.src = offlineUrl || song.audio_url;
      audioRef.current.volume = volume;
      await safeAudioPlay(audioRef.current);
      setIsPlaying(true);
      
      // Add to queue if not already there
      const existingIndex = queue.findIndex(s => s.id === song.id);
      if (existingIndex === -1) {
        setQueueState(prev => [...prev, song]);
        setCurrentIndex(queue.length);
      } else {
        setCurrentIndex(existingIndex);
      }

      // Track recently played (fire and forget)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('recently_played')
            .insert({
              user_id: user.id,
              song_id: song.id,
            });
        }
      } catch (error) {
        // Silent fail for tracking
      }
    }
  }, [queue, volume]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      safeAudioPlay(audioRef.current);
    }
  }, [currentSong, isPlaying]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const play = useCallback(() => {
    if (audioRef.current && currentSong) {
      safeAudioPlay(audioRef.current);
    }
  }, [currentSong]);

  const stopSong = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
      if (nextAudioRef.current) {
        nextAudioRef.current.pause();
        nextAudioRef.current.src = '';
      }
    } catch (e) {
      // Ignore errors
    }
    
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    isCrossfading.current = false;
    setCurrentSong(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setQueueState([]);
    setCurrentIndex(0);
    setExpanded(false);
  }, []);

  const nextSong = useCallback(() => {
    // Cancel crossfade if manually skipping
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    isCrossfading.current = false;
    nextSongInternal();
  }, [nextSongInternal]);

  const prevSong = useCallback(() => {
    if (!audioRef.current) return;
    
    // Cancel crossfade
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    isCrossfading.current = false;
    
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

  const toggleCrossfade = () => {
    setCrossfade(!crossfade);
  };

  const setCrossfadeDuration = (seconds: number) => {
    setCrossfadeDurationState(Math.max(1, Math.min(12, seconds)));
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
      crossfade,
      crossfadeDuration,
      audioElement: audioRef.current,
      playSong,
      togglePlay,
      pause,
      play,
      stopSong,
      nextSong,
      prevSong,
      seek,
      setVolume,
      setQueue,
      addToQueue,
      toggleShuffle,
      toggleRepeat,
      setExpanded,
      toggleCrossfade,
      setCrossfadeDuration,
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
