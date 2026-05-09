import { useEffect, useState } from 'react';
import { bypassAudioElement, connectAudioElement, setBands, setReverb, setSpatial, resume, subscribe } from '@/lib/audioEngine';
import { usePremium } from '@/hooks/usePremium';

const STORAGE_KEY = 'eq_settings';

interface StoredEQ {
  bands?: number[];
  bassBoost?: number;
  reverb?: number;
  spatialAudio?: boolean;
  playbackSpeed?: number;
}

function readStored(): StoredEQ {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function hasActiveProcessing(s: StoredEQ) {
  return Boolean(
    s.bands?.some((gain) => Math.abs(gain) >= 0.5) ||
    (s.bassBoost ?? 0) > 0 ||
    (s.reverb ?? 0) > 0 ||
    s.spatialAudio ||
    (typeof s.playbackSpeed === 'number' && s.playbackSpeed !== 1)
  );
}

/**
 * Mount once at app root. Connects the engine to the live <audio> element
 * and re-applies persisted EQ settings whenever the source changes.
 */
export function useGlobalAudioEngine(audioElement: HTMLAudioElement | null) {
  const { isPremium, isLoading } = usePremium();

  useEffect(() => {
    if (!audioElement) return;

    const reapply = () => {
      if (!isPremium) {
        bypassAudioElement(audioElement);
        audioElement.playbackRate = 1;
        return;
      }

      const s = readStored();
      if (!hasActiveProcessing(s)) {
        bypassAudioElement(audioElement);
        audioElement.playbackRate = 1;
        return;
      }

      const ok = connectAudioElement(audioElement);
      if (!ok) return;
      setBands(s.bands ?? [0, 0, 0, 0, 0, 0, 0, 0], s.bassBoost ?? 0);
      setReverb(s.reverb ?? 0);
      setSpatial(!!s.spatialAudio);
      if (typeof s.playbackSpeed === 'number') audioElement.playbackRate = s.playbackSpeed;
    };

    // Resume the AudioContext on first user gesture / play
    const onPlay = () => resume();
    const onPointer = () => resume();

    if (!isLoading) reapply();
    audioElement.addEventListener('loadedmetadata', reapply);
    audioElement.addEventListener('canplay', reapply);
    audioElement.addEventListener('play', onPlay);
    document.addEventListener('pointerdown', onPointer, { once: true });

    return () => {
      audioElement.removeEventListener('loadedmetadata', reapply);
      audioElement.removeEventListener('canplay', reapply);
      audioElement.removeEventListener('play', onPlay);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [audioElement, isPremium, isLoading]);
}

export function useEngineState() {
  const [mode, setMode] = useState(() => 'idle' as ReturnType<typeof import('@/lib/audioEngine').getState>);
  useEffect(() => subscribe(setMode), []);
  return mode;
}
