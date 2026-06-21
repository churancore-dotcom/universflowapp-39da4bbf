import { useEffect, useState } from 'react';
import { Laptop, Smartphone, Play, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, type Song } from '@/contexts/PlayerContext';
import { playerProgressStore } from '@/lib/playerProgressStore';
import { getDeviceId } from '@/lib/deviceId';

interface PlaybackRow {
  song: Song | null;
  queue: Song[] | null;
  position_seconds: number;
  device_id: string | null;
  device_label: string | null;
  updated_at: string;
}

const formatAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const formatTime = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

const CrossDeviceResumeCard = () => {
  const { user } = useAuth();
  const { playSong, seek, currentSong } = usePlayer();
  const [row, setRow] = useState<PlaybackRow | null>(null);
  const [loading, setLoading] = useState(true);

  const myDeviceId = getDeviceId();

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('playback_state')
      .select('song, queue, position_seconds, device_id, device_label, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    setRow((data as unknown as PlaybackRow) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleResume = () => {
    if (!row?.song) return;
    const queue = (row.queue && row.queue.length ? row.queue : [row.song]) as Song[];
    playSong(row.song, undefined, queue);
    // Seek slightly after play kicks in
    window.setTimeout(() => {
      try { seek(Math.max(0, row.position_seconds - 1)); } catch { /* noop */ }
    }, 600);
  };

  if (loading || !row?.song) return null;

  const isOtherDevice = row.device_id && row.device_id !== myDeviceId;
  // Hide if it's this same device AND the song is already playing
  if (!isOtherDevice && currentSong?.id === row.song.id) return null;

  const Icon = /phone|android|iphone|ipad/i.test(row.device_label || '') ? Smartphone : Laptop;

  return (
    <div
      className="rounded-2xl p-4 mb-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.12), rgba(88, 86, 214, 0.10))',
        border: '1px solid rgba(255, 45, 85, 0.25)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-white/70" />
        <span className="text-[10px] uppercase tracking-widest text-white/70 font-semibold">
          {isOtherDevice ? `Last played on ${row.device_label || 'another device'}` : 'Continue listening'}
        </span>
        <span className="text-[10px] text-white/40 ml-auto">{formatAgo(row.updated_at)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
          {row.song.cover_url ? (
            <img src={row.song.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className="w-6 h-6 text-white/60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white">{row.song.title}</p>
          <p className="text-xs text-white/60 truncate">{row.song.artist}</p>
          <p className="text-[10px] text-white/40 mt-0.5">
            Paused at {formatTime(row.position_seconds)}
            {row.queue && row.queue.length > 1 ? ` · ${row.queue.length} in queue` : ''}
          </p>
        </div>
        <button
          onClick={handleResume}
          aria-label="Resume here"
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(135deg, #FF2D55, #FF6482)',
            boxShadow: '0 8px 24px rgba(255, 45, 85, 0.45)',
          }}
        >
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </button>
      </div>
    </div>
  );
};

export default CrossDeviceResumeCard;
