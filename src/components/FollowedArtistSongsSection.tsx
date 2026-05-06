import { memo, useEffect, useMemo, useState } from 'react';
import { Music2, Sparkles } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Props {
  songs: Song[];
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || '';

const FollowedArtistSongsSection = memo(function FollowedArtistSongsSection({ songs }: Props) {
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { getDownloadedUrl } = useDownloads();
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setFollowed(new Set());
      return;
    }
    getUserArtistPrefs(user.id).then((prefs) => {
      if (!cancelled) setFollowed(new Set(prefs.map((pref) => normalize(pref.artist_name))));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const followedSongs = useMemo(() => {
    if (!followed.size) return [];
    return songs
      .filter((song) => followed.has(normalize(song.artist)))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 18);
  }, [followed, songs]);

  if (!user || followedSongs.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
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
              <div className={`relative mb-2 aspect-square overflow-hidden rounded-2xl bg-muted/50 ${active ? 'ring-2 ring-primary' : ''}`}>
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