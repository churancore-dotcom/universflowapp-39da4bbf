import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioVisualizerData {
  frequencyData: Uint8Array;
  averageFrequency: number;
  bassFrequency: number;
  midFrequency: number;
  highFrequency: number;
}

export const useAudioVisualizer = (audioElement: HTMLAudioElement | null, isPlaying: boolean) => {
  const [visualizerData, setVisualizerData] = useState<AudioVisualizerData>({
    frequencyData: new Uint8Array(0),
    averageFrequency: 0,
    bassFrequency: 0,
    midFrequency: 0,
    highFrequency: 0,
  });
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);

  const connectAudio = useCallback(() => {
    if (!audioElement || isConnectedRef.current) return;

    try {
      // Create or resume audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume if suspended
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }

      // Create analyser
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;
      }

      // Connect source only once
      if (!sourceRef.current) {
        try {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          isConnectedRef.current = true;
        } catch (e) {
          // Already connected - this is fine
          console.warn('Audio already connected to context');
          isConnectedRef.current = true;
        }
      }
    } catch (error) {
      console.warn('Web Audio API not available:', error);
    }
  }, [audioElement]);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !isPlaying) {
      setVisualizerData({
        frequencyData: new Uint8Array(0),
        averageFrequency: 0,
        bassFrequency: 0,
        midFrequency: 0,
        highFrequency: 0,
      });
      return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate frequency ranges
    const bassEnd = Math.floor(bufferLength * 0.1); // 0-10% for bass
    const midEnd = Math.floor(bufferLength * 0.5); // 10-50% for mids
    
    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let totalSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      totalSum += dataArray[i];
      if (i < bassEnd) {
        bassSum += dataArray[i];
      } else if (i < midEnd) {
        midSum += dataArray[i];
      } else {
        highSum += dataArray[i];
      }
    }

    setVisualizerData({
      frequencyData: dataArray,
      averageFrequency: totalSum / bufferLength / 255,
      bassFrequency: bassSum / bassEnd / 255,
      midFrequency: midSum / (midEnd - bassEnd) / 255,
      highFrequency: highSum / (bufferLength - midEnd) / 255,
    });

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [isPlaying]);

  useEffect(() => {
    if (audioElement && isPlaying) {
      connectAudio();
      analyze();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement, isPlaying, connectAudio, analyze]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return visualizerData;
};
