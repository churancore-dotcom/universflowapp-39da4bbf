import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLike } from '@/hooks/useLike';
import { iosBounce } from '@/lib/animations';
import { triggerHaptic } from '@/hooks/useHaptics';
import type { Song } from '@/contexts/PlayerContext';

interface LikeButtonProps {
  songId: string;
  song?: Song | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

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

const LikeButton = memo(({ songId, song, size = 'md', className = '' }: LikeButtonProps) => {
  const { isLiked, isLoading, toggleLike } = useLike(songId, song);

  return (
    <motion.button
      type="button"
      aria-label={isLiked ? 'Unlike song' : 'Like song'}
      aria-pressed={isLiked}
      className={`rounded-full flex items-center justify-center relative transition-colors ${sizeClasses[size]} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        triggerHaptic(isLiked ? 'impactLight' : 'impactMedium');
        toggleLike();
      }}
      whileTap={{ scale: 0.9 }}
      transition={iosBounce}
      disabled={isLoading}
    >
      <Heart
        className={`${iconSizes[size]} transition-colors ${
          isLiked 
            ? 'text-primary fill-primary' 
            : 'text-muted-foreground hover:text-primary'
        }`}
        fill={isLiked ? 'currentColor' : 'none'}
      />
    </motion.button>
  );
});

LikeButton.displayName = 'LikeButton';

export default LikeButton;
