import React, { memo, useMemo } from 'react';
import { Song } from '@/contexts/PlayerContext';
import HorizontalSection from './HorizontalSection';
import SongCard from './SongCard';

interface Props { songs: Song[] }

const FreshReleasesSection = memo(({ songs }: Props) => {
  const fresh = useMemo(() => {
    const flagged = songs.filter((s) => (s as any).show_in_new_releases);
    if (flagged.length > 0) return flagged.slice(0, 20);
    // Fallback: newest by created_at
    return [...songs]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .slice(0, 20);
  }, [songs]);

  if (fresh.length === 0) return null;

  return (
    <HorizontalSection
      title="Fresh Releases"
      subtitle="Just dropped"
      songs={fresh}
    >
      {fresh.map((song, idx) => (
        <div key={song.id} className="snap-start flex-shrink-0">
          <SongCard song={song} index={idx} sectionSongs={fresh} />
        </div>
      ))}
    </HorizontalSection>
  );
});

FreshReleasesSection.displayName = 'FreshReleasesSection';
export default FreshReleasesSection;
