import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Music2, Disc3 } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { getArtistTopTracksByName, type IndexedTrack } from '@/lib/musicIndexer';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Props {
  /** Optional pre-loaded catalog/indexed songs to filter through followed artists.  */
  songs?: Song[];
  /** Compact = smaller cards (used in fullscreen player). */
  compact?: boolean;
  title?: string;
  /** Max tracks to show. */
  limit?: number;
}

const normalize = (v?: string | null) => v?.trim().toLowerCase() || '';

const FollowedArtistsRail = memo(function FollowedArtistsRail({
  songs,
  compact = false,
  title = 'From Your Artists',
  limit = 60,
}: Props) {
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { getDownloadedUrl } = useDownloads();
  const [followedNames, setFollowedNames] = useState<string[]>([]);
  const [fetched, setFetched] = useState<IndexedTrack[]>([]);
  const fetchedKey = useRef<string>('');

  // Load followed artist list
  useEffect(() => {
    let cancelled = false;
    if (!user) { setFollowedNames([]); return; }
    getUserArtistPrefs(user.id).then((prefs) => {
      if (cancelled) return;
      setFollowedNames(prefs.map((p) => p.artist_name).filter(Boolean));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  // From provided catalog/indexed songs (filtered by followed artist names)
  const localMatches = useMemo<Song[]>(() => {
    if (!songs?.length || !followedNames.length) return [];
    const set = new Set(followedNames.map(normalize));
    return songs
      .filter((s) => set.has(normalize(s.artist)))
      .slice(0, limit);
  }, [songs, followedNames, limit]);

  // For non-catalog followed artists with no local match, fetch top tracks via Last.fm
  useEffect(() => {
    if (!followedNames.length) { setFetched([]); return; }
    const localCovered = new Set(localMatches.map((s) => normalize(s.artist)));
    // Fetch top tracks for ALL followed artists (not just non-catalog), so users
    // see "most of their songs" even when local catalog has only 1-2 of them.
    const need = followedNames.slice(0, 12);
    const key = need.join('|');
    if (!need.length || key === fetchedKey.current) return;
    fetchedKey.current = key;

    let cancelled = false;
    (async () => {
      const all: IndexedTrack[] = [];
      // Aim for ~10 tracks per followed artist; capped by the indexer.
      const perArtist = 10;
      const results = await Promise.all(
        need.map((n) => getArtistTopTracksByName(n, perArtist).catch(() => [] as IndexedTrack[]))
      );
      if (cancelled) return;
      results.forEach((arr) => all.push(...arr));
      setFetched(all);
    })();
    return () => { cancelled = true; };
  }, [followedNames, localMatches, limit]);

  // Combine into Song[] for rendering
  const tracks = useMemo<Song[]>(() => {
    const fromFetched: Song[] = fetched.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      cover_url: t.cover_url,
      audio_url: 'resolving',
      duration: t.duration,
      source: 'indexed' as const,
    }));
    const seen = new Set<string>();
    return [...localMatches, ...fromFetched]
      .filter((s) => {
        const k = `${normalize(s.artist)}::${normalize(s.title)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, limit);
  }, [localMatches, fetched, limit]);

  if (!user || tracks.length === 0) return null;

  const cardW = compact ? 'w-28' : 'w-36';
  const titleSize = compact ? 'text-[12px]' : 'text-[13px]';
  const subSize = compact ? 'text-[10px]' : 'text-[11px]';

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Disc3 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-primary`} />
        <h2 className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-foreground`}>{title}</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {tracks.map((song) => {
          const active = currentSong?.id === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => {
                triggerHaptic('impactLight');
                if (active) togglePlay();
                else playSong(song, getDownloadedUrl(song.id), tracks);
              }}
              className={`${cardW} flex-shrink-0 text-left active:scale-[0.96] transition-transform`}
            >
              <div className={`relative mb-2 aspect-square overflow-hidden rounded-2xl bg-muted/50 ${active ? 'ring-2 ring-primary' : ''}`}>
                {song.cover_url ? (
                  <img src={song.cover_url} alt={`${song.title} cover art`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                {active && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isPlaying ? '▶' : 'Ⅱ'}
                  </div>
                )}
              </div>
              <p className={`truncate ${titleSize} font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{song.title}</p>
              <p className={`mt-0.5 truncate ${subSize} text-muted-foreground`}>{song.artist}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
});

export default FollowedArtistsRail;
