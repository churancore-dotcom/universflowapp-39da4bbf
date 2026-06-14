import { memo, useCallback, useEffect, useState } from 'react';
import { Flame, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { triggerHaptic } from '@/hooks/useHaptics';
import { toast } from 'sonner';

export interface PinToViralPayload {
  track_id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  audio_url?: string | null;
  source?: string | null;
}

interface Props {
  song: PinToViralPayload;
  size?: 'sm' | 'md';
  className?: string;
  variant?: 'overlay' | 'inline';
}

const PinToViralButton = memo(({ song, size = 'sm', className = '', variant = 'overlay' }: Props) => {
  const { isAdmin } = useAuth();
  const [pinned, setPinned] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin || !song.track_id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('viral_picks')
        .select('id, is_active')
        .eq('track_id', song.track_id)
        .maybeSingle();
      if (!cancelled) setPinned(!!data?.is_active);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, song.track_id]);

  const toggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    triggerHaptic('selection');
    setBusy(true);
    try {
      if (pinned) {
        const { error } = await supabase
          .from('viral_picks')
          .update({ is_active: false })
          .eq('track_id', song.track_id);
        if (error) throw error;
        setPinned(false);
        toast.success('Removed from Trending Now');
      } else {
        // Find next position
        const { data: maxRow } = await supabase
          .from('viral_picks')
          .select('position')
          .eq('is_active', true)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();
        const nextPos = (maxRow?.position ?? -1) + 1;
        const { error } = await supabase
          .from('viral_picks')
          .upsert({
            track_id: song.track_id,
            title: song.title,
            artist: song.artist,
            cover_url: song.cover_url ?? null,
            audio_url: song.audio_url ?? null,
            source: song.source || (song.track_id.startsWith('audius-') ? 'audius' : 'indexed'),
            is_active: true,
            position: nextPos,
            pinned_at: new Date().toISOString(),
          }, { onConflict: 'track_id' });
        if (error) throw error;
        setPinned(true);
        toast.success('Pinned to Trending Now 🔥');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  }, [busy, pinned, song]);

  if (!isAdmin) return null;

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const base = variant === 'overlay'
    ? 'bg-black/50 backdrop-blur-md text-foreground/80 active:bg-black/70'
    : 'bg-muted/40 text-foreground/80 active:bg-muted/60';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={pinned ? 'Unpin from Trending Now' : 'Pin to Trending Now'}
      className={`${dim} rounded-full flex items-center justify-center transition-colors ${base} ${className}`}
      style={pinned ? { color: '#FF6B2D' } : undefined}
    >
      {busy ? (
        <Loader2 className={`${icon} animate-spin`} />
      ) : (
        <Flame className={icon} fill={pinned ? '#FF6B2D' : 'none'} />
      )}
    </button>
  );
});

PinToViralButton.displayName = 'PinToViralButton';
export default PinToViralButton;
