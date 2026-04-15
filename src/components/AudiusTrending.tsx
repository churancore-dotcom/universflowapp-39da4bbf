import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Headphones, TrendingUp } from 'lucide-react';
import { usePlayer, Song } from '@/contexts/PlayerContext';

const AUDIUS_NODES = [
  'https://audius-discovery-1.the-standard.io/v1',
  'https://audius-discovery-2.the-standard.io/v1',
  'https://discoveryprovider.audius.co/v1',
  'https://discoveryprovider2.audius.co/v1',
  'https://discoveryprovider3.audius.co/v1',
];
const APP_NAME = 'univers_flow_official';

interface AudiusTrack {
  id: string;
  title: string;
  user: { name: string; };
  artwork: { '150x150'?: string; '480x480'?: string; };
  duration: number;
}

const AudiusTrending = memo(() => {
  const { playSong } = usePlayer();
  const [tracks, setTracks] = useState<AudiusTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      for (const node of AUDIUS_NODES) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(`${node}/tracks/trending?app_name=${APP_NAME}`, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (!res.ok) continue;
          const json = await res.json();
          const data = (json.data || []).slice(0, 20);
          if (data.length > 0) {
            setTracks(data);
            // Store working node
            localStorage.setItem('uf_audius_node', node);
            break;
          }
        } catch {
          continue;
        }
      }
      setLoading(false);
    };
    fetchTrending();
  }, []);

  const handlePlay = (track: AudiusTrack) => {
    const node = localStorage.getItem('uf_audius_node') || AUDIUS_NODES[0];
    const song: Song = {
      id: `audius-${track.id}`,
      title: track.title,
      artist: track.user.name,
      cover_url: track.artwork?.['480x480'] || track.artwork?.['150x150'] || undefined,
      audio_url: `${node}/tracks/${track.id}/stream?app_name=${APP_NAME}`,
      duration: track.duration,
    };
    
    const queue: Song[] = tracks.map(t => ({
      id: `audius-${t.id}`,
      title: t.title,
      artist: t.user.name,
      cover_url: t.artwork?.['480x480'] || t.artwork?.['150x150'] || undefined,
      audio_url: `${node}/tracks/${t.id}/stream?app_name=${APP_NAME}`,
      duration: t.duration,
    }));
    
    playSong(song, null, queue);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="text-base font-bold">Trending on Audius</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-[130px] flex-shrink-0 space-y-2">
              <div className="w-[130px] h-[130px] rounded-xl bg-white/5 animate-pulse" />
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              <div className="h-2.5 w-14 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold">Indie & Underground</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {tracks.map((track) => (
          <motion.button
            key={track.id}
            className="w-[130px] flex-shrink-0 text-left group"
            onClick={() => handlePlay(track)}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-[130px] h-[130px] rounded-xl overflow-hidden mb-2 relative"
              style={{
                background: 'rgba(28,28,30,0.8)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {track.artwork?.['480x480'] || track.artwork?.['150x150'] ? (
                <img
                  src={track.artwork['480x480'] || track.artwork['150x150']}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <Headphones className="w-8 h-8 text-primary/40" />
                </div>
              )}
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                </div>
              </div>
            </div>
            <p className="text-xs font-semibold text-foreground truncate">{track.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">{track.user.name}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
});

AudiusTrending.displayName = 'AudiusTrending';

export default AudiusTrending;
