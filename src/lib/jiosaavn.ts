const API = 'https://jiosaavn-api.universflow.workers.dev';

const cache = new Map();

export async function searchSongs(query: string, limit = 20) {
  const res = await fetch(
    `${API}/api/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  const data = await res.json();
  return data.data?.results ?? [];
}

export async function getSongStreamUrl(songId: string) {
  if (cache.has(songId)) return cache.get(songId);

  const res = await fetch(`${API}/api/songs/${songId}`);
  const data = await res.json();
  const song = data.data?.[0];
  if (!song) return null;

  const urls = song.downloadUrl;
  const best = urls.find((u: any) => u.quality === '320kbps') || urls[urls.length - 1];

  const result = {
    streamUrl: best.url,
    id: song.id,
    title: song.name,
    artist: song.artists.primary.map((a: any) => a.name).join(', '),
    album: song.album.name,
    duration: song.duration,
    image: song.image[2]?.url,
  };

  cache.set(songId, result);
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  return result;
}

export function prefetchSong(songId: string) {
  if (!cache.has(songId)) getSongStreamUrl(songId);
}

export function preloadNext(queue: any[], currentIndex: number) {
  const next = queue[currentIndex + 1];
  if (next) prefetchSong(next.id);
}
