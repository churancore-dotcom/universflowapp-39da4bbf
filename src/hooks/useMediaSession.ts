import { useEffect } from 'react';
import { Song } from '@/contexts/PlayerContext';

interface UseMediaSessionOptions {
  song: Song | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek?: (time: number) => void;
  duration?: number;
  progress?: number;
}

export const useMediaSession = ({
  song,
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
  duration = 0,
  progress = 0,
}: UseMediaSessionOptions) => {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Update metadata when song changes
    if (song) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Unknown Album',
        artwork: song.cover_url ? [
          { src: song.cover_url, sizes: '96x96', type: 'image/jpeg' },
          { src: song.cover_url, sizes: '128x128', type: 'image/jpeg' },
          { src: song.cover_url, sizes: '192x192', type: 'image/jpeg' },
          { src: song.cover_url, sizes: '256x256', type: 'image/jpeg' },
          { src: song.cover_url, sizes: '384x384', type: 'image/jpeg' },
          { src: song.cover_url, sizes: '512x512', type: 'image/jpeg' },
        ] : [],
      });
    }
  }, [song]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Update playback state
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    // Set up action handlers
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('previoustrack', onPrev);
    navigator.mediaSession.setActionHandler('nexttrack', onNext);

    if (onSeek) {
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          onSeek(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skipTime = details.seekOffset || 10;
        onSeek(Math.max(progress - skipTime, 0));
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skipTime = details.seekOffset || 10;
        onSeek(Math.min(progress + skipTime, duration));
      });
    }

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('seekto', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, [onPlay, onPause, onNext, onPrev, onSeek, progress, duration]);

  // Update position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !song) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: duration || 0,
        playbackRate: 1,
        position: Math.min(progress, duration || 0),
      });
    } catch (error) {
      // Position state update failed, ignore
    }
  }, [progress, duration, song]);
};

export default useMediaSession;
