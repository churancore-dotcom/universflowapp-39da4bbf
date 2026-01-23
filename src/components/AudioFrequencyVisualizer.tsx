import { memo } from 'react';
import { motion } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAudioVisualizer } from '@/hooks/useAudioVisualizer';

interface AudioFrequencyVisualizerProps {
  className?: string;
}

const AudioFrequencyVisualizerComponent = ({ className = '' }: AudioFrequencyVisualizerProps) => {
  const { audioElement, isPlaying } = usePlayer();
  const { frequencyData, bassFrequency, midFrequency, highFrequency } = useAudioVisualizer(audioElement, isPlaying);

  // Create bar heights from frequency data
  const bars = Array.from({ length: 32 }, (_, i) => {
    const dataIndex = Math.floor((i / 32) * frequencyData.length);
    const value = frequencyData[dataIndex] || 0;
    return (value / 255) * 100;
  });

  // Calculate dynamic glow based on bass
  const glowIntensity = bassFrequency * 0.8;
  const pulseScale = 1 + bassFrequency * 0.15;

  if (!isPlaying) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Dynamic glow ring behind artwork based on bass */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, rgba(250, 45, 72, ${0.3 + glowIntensity * 0.4}) 0%, transparent 70%)`,
        }}
        animate={{
          scale: pulseScale,
          opacity: 0.5 + glowIntensity * 0.5,
        }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />
      
      {/* Second glow ring for mids */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, rgba(255, 100, 130, ${0.2 + midFrequency * 0.3}) 0%, transparent 60%)`,
        }}
        animate={{
          scale: 1.2 + midFrequency * 0.2,
          opacity: 0.3 + midFrequency * 0.4,
        }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />
      
      {/* Third ring for highs */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, rgba(255, 150, 180, ${0.1 + highFrequency * 0.2}) 0%, transparent 50%)`,
        }}
        animate={{
          scale: 1.4 + highFrequency * 0.15,
          opacity: 0.2 + highFrequency * 0.3,
        }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />

      {/* Frequency bars around the artwork */}
      <div className="absolute inset-0 flex items-end justify-center gap-[2px] p-2 overflow-hidden rounded-2xl opacity-30">
        {bars.slice(0, 16).map((height, i) => (
          <motion.div
            key={i}
            className="w-1 rounded-full bg-gradient-to-t from-rose-500 to-pink-300"
            animate={{ height: `${Math.max(4, height)}%` }}
            transition={{ duration: 0.05, ease: 'linear' }}
          />
        ))}
      </div>
    </div>
  );
};

export const AudioFrequencyVisualizer = memo(AudioFrequencyVisualizerComponent);
AudioFrequencyVisualizer.displayName = 'AudioFrequencyVisualizer';

export default AudioFrequencyVisualizer;
