import { memo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Music2, Disc3 } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { getArtistTopTracksByName } from '@/lib/musicIndexer';
import { supabase } from '@/integrations/supabase/client';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Props {
  songs: Song[];
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || '';

type SongRowWithArtist = {
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  cover_url?: string | null;
  audio_url: string;
  duration?: number | null;
  artist_id?: string | null;
  genre?: string | null;
  mood?: string | null;
  created_at?: string | null;
  artists?: { id: string; name: string; photo_url: string | null } | null;
};

const toCatalogSong = (row: SongRowWithArtist): Song => {
  const artistData = row.artists;
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album || undefined,
    cover_url: row.cover_url || undefined,
    audio_url: row.audio_url,
    duration: row.duration || undefined,
    artist_id: artistData?.id || row.artist_id || undefined,
    artist_photo_url: artistData?.photo_url || undefined,
    genre: row.genre || undefined,
    mood: row.mood || undefined,
    created_at: row.created_at || undefined,
    source: 'library',
  };
};

const dedupeSongs = (songs: Song[]) => {
  const seen = new Set<string>();
  return songs.filter((song) => {
    const key = `${normalize(song.artist)}::${normalize(song.title)}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fetchFollowedArtistSongs = async (userId: string, seedSongs: Song[] = []) => {
  const prefs = await getUserArtistPrefs(userId, true);
  const followedNames = [...new Set(prefs.map((pref) => pref.artist_name).filter(Boolean))];
  const followed = new Set(followedNames.map(normalize));
  if (!followed.size) return [];

  const seedMatches = seedSongs.filter((song) => followed.has(normalize(song.artist)));

  const [{ data: catalog, error }, fallbackGroups] = await Promise.all([
    supabase
      .from('songs')
      .select('*, artists(id, name, photo_url)')
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(1000),
    Promise.all(
      followedNames.slice(0, 12).map((artist) =>
        getArtistTopTracksByName(artist, 10).catch(() => []),
      ),
    ),
  ]);

  if (error) console.warn('Failed to load followed-artist catalog songs:', error);

  const catalogMatches = ((catalog || []) as SongRowWithArtist[])
    .map(toCatalogSong)
    .filter((song) => followed.has(normalize(song.artist)));

  const fallbackSongs = fallbackGroups.flat().map((track): Song => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    cover_url: track.cover_url,
    audio_url: track.audio_url || 'resolving',
    duration: track.duration,
    source: 'indexed',
  }));

  return dedupeSongs([...seedMatches, ...catalogMatches, ...fallbackSongs]).slice(0, 24);
};

const FollowedArtistSongsSection = memo(function FollowedArtistSongsSection({ songs }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { getDownloadedUrl } = useDownloads();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['followed-artist-songs', userId] as const, [userId]);

  useEffect(() => {
    if (!userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey });
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('uf:artist-prefs-changed', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('uf:artist-prefs-changed', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId, queryClient, queryKey]);

  const { data: followedSongs = [] } = useQuery({
    queryKey,
    queryFn: () => fetchFollowedArtistSongs(userId!, songs),
    enabled: !!userId,
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });

  if (!user || followedSongs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">From Your Artists</h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {followedSongs.map((song) => {
          const active = currentSong?.id === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => {
                triggerHaptic('impactLight');
                if (active) togglePlay();
                else playSong(song, getDownloadedUrl(song.id), followedSongs);
              }}
              className="w-36 flex-shrink-0 text-left active:scale-[0.96] transition-transform"
            >
              <div className={`relative mb-2 aspect-square overflow-hidden rounded-3xl bg-muted/50 ${active ? 'ring-2 ring-primary' : ''}`}>
                {song.cover_url ? (
                  <img src={song.cover_url} alt={`${song.title} cover art`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                {active && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isPlaying ? '▶' : 'Ⅱ'}
                  </div>
                )}
              </div>
              <p className={`truncate text-[13px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{song.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{song.artist}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
});

export default FollowedArtistSongsSection;