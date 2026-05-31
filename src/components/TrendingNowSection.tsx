import React, { memo, useMemo } from 'react';
import { Song } from '@/contexts/PlayerContext';
import HorizontalSection from './HorizontalSection';
import SongCard from './SongCard';
import { Flame } from 'lucide-react';

interface Props { songs: Song[] }

const TrendingNowSection = memo(({ songs }: Props) => {
  const trending = useMemo(() => {
    const filtered = songs.filter((s) => (s as any).show_in_trending);
    if (filtered.length > 0) return filtered.slice(0, 20);
    // Fallback: top of catalog so the shelf is never empty
    return songs.slice(0, 20);
  }, [songs]);

  if (trending.length === 0) return null;

  return (
    <HorizontalSection
      title="Trending Now"
      subtitle="What everyone is playing"
      songs={trending}
    >
      {trending.map((song, idx) => (
        <div key={song.id} className="snap-start flex-shrink-0">
          <SongCard song={song} index={idx} sectionSongs={trending} />
        </div>
      ))}
    </HorizontalSection>
  );
});

TrendingNowSection.displayName = 'TrendingNowSection';
export default TrendingNowSection;
