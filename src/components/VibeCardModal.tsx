import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Sparkles, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { iosSpring, iosBounce } from '@/lib/animations';

interface VibeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VibeData {
  topSong: { title: string; artist: string; cover_url: string | null } | null;
  topArtist: string | null;
  playCount: number;
  displayName: string;
}

const PALETTES = [
  { from: '#FF2D55', via: '#FF6B9D', to: '#5E2EE8', name: 'Rose Dream' },
  { from: '#0A84FF', via: '#5E5CE6', to: '#BF5AF2', name: 'Twilight' },
  { from: '#FF9500', via: '#FF2D55', to: '#AF52DE', name: 'Sunset' },
  { from: '#30D158', via: '#0A84FF', to: '#5E5CE6', name: 'Aurora' },
  { from: '#1a1a2e', via: '#16213e', to: '#0f3460', name: 'Midnight' },
];

const VibeCardModal = ({ isOpen, onClose }: VibeCardModalProps) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vibe, setVibe] = useState<VibeData | null>(null);
  const [paletteIdx, setPaletteIdx] = useState(0);

  useEffect(() => {
    if (isOpen && user) {
      fetchVibe();
    } else {
      setCardUrl(null);
      setVibe(null);
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (vibe && isOpen) generateCard();
  }, [vibe, paletteIdx, isOpen]);

  const fetchVibe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('recently_played')
        .select('song_id')
        .eq('user_id', user.id)
        .gte('played_at', since)
        .order('played_at', { ascending: false })
        .limit(200);

      const ids = (recent || []).map((r: any) => r.song_id).filter(Boolean);
      const counts = new Map<string, number>();
      ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));

      let topSong: VibeData['topSong'] = null;
      let topArtist: string | null = null;

      if (counts.size) {
        const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const { data: song } = await supabase
          .from('songs')
          .select('title, artist, cover_url')
          .eq('id', topId)
          .maybeSingle();
        if (song) {
          topSong = song;
          // top artist by aggregate
          const { data: songs } = await supabase
            .from('songs')
            .select('id, artist')
            .in('id', ids.slice(0, 100));
          const aCount = new Map<string, number>();
          (songs || []).forEach((s: any) => {
            if (s.artist) aCount.set(s.artist, (aCount.get(s.artist) || 0) + (counts.get(s.id) || 0));
          });
          if (aCount.size) topArtist = [...aCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();

      setVibe({
        topSong,
        topArtist,
        playCount: ids.length,
        displayName: profile?.username || user.email?.split('@')[0] || 'Listener',
      });
    } finally {
      setLoading(false);
    }
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const generateCard = async () => {
    if (!canvasRef.current || !vibe) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 9:16 story format
    canvas.width = 1080;
    canvas.height = 1920;

    const p = PALETTES[paletteIdx];
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, p.from);
    grad.addColorStop(0.55, p.via);
    grad.addColorStop(1, p.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glow blobs
    const radial = ctx.createRadialGradient(540, 400, 50, 540, 400, 700);
    radial.addColorStop(0, 'rgba(255,255,255,0.25)');
    radial.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Top label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '600 36px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MY VIBE THIS WEEK', canvas.width / 2, 200);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '400 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(`@${vibe.displayName}`, canvas.width / 2, 250);

    // Sparkle
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '60px system-ui';
    ctx.fillText('✨', canvas.width / 2, 360);

    // Album art (large, centered, rounded)
    const size = 640;
    const x = (canvas.width - size) / 2;
    const y = 430;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 30;
    roundRect(ctx, x, y, size, size, 48);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    ctx.restore();

    if (vibe.topSong?.cover_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = vibe.topSong!.cover_url!;
        });
        ctx.save();
        roundRect(ctx, x, y, size, size, 48);
        ctx.clip();
        ctx.drawImage(img, x, y, size, size);
        ctx.restore();
      } catch {
        ctx.save();
        roundRect(ctx, x, y, size, size, 48);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fill();
        ctx.restore();
      }
    } else {
      ctx.save();
      roundRect(ctx, x, y, size, size, 48);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '160px system-ui';
      ctx.fillText('🎵', canvas.width / 2, y + size / 2 + 60);
    }

    // Song info
    const truncate = (txt: string, max: number) => {
      ctx.save();
      let t = txt;
      while (ctx.measureText(t + '…').width > max && t.length > 1) t = t.slice(0, -1);
      ctx.restore();
      return t.length < txt.length ? t + '…' : t;
    };

    if (vibe.topSong) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncate(vibe.topSong.title, 900), canvas.width / 2, y + size + 120);

      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '500 44px system-ui, -apple-system, sans-serif';
      ctx.fillText(truncate(vibe.topSong.artist, 900), canvas.width / 2, y + size + 185);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
      ctx.fillText('Start listening to', canvas.width / 2, y + size + 120);
      ctx.fillText('build your vibe', canvas.width / 2, y + size + 185);
    }

    // Stats pill
    if (vibe.playCount > 0) {
      const pillW = 480;
      const pillX = (canvas.width - pillW) / 2;
      const pillY = y + size + 240;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(ctx, pillX, pillY, pillW, 80, 40);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${vibe.playCount} plays · 7 days`, canvas.width / 2, pillY + 52);
    }

    // Branding
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
    ctx.fillText('UNIVERSFLOW', canvas.width / 2, canvas.height - 140);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '400 28px system-ui, -apple-system, sans-serif';
    ctx.fillText('universflow.in', canvas.width / 2, canvas.height - 90);

    setCardUrl(canvas.toDataURL('image/png'));
  };

  const handleDownload = () => {
    if (!cardUrl) return;
    const link = document.createElement('a');
    link.download = `my-vibe-${Date.now()}.png`;
    link.href = cardUrl;
    link.click();
    toast.success('Vibe card downloaded ✨');
  };

  const handleNativeShare = async () => {
    if (!cardUrl) return;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], 'my-vibe.png', { type: 'image/png' });
      const shareText = vibe?.topSong
        ? `My vibe this week is "${vibe.topSong.title}" by ${vibe.topSong.artist} 🎵`
        : 'My vibe on Universflow 🎵';
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: shareText + '\nhttps://universflow.in',
        });
        return;
      }
      handleDownload();
    } catch {
      handleDownload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={iosSpring}
          >
            <div
              className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl pointer-events-auto"
              style={{
                background: 'rgba(20,20,22,0.96)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-inherit">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-400" />
                  <h2 className="text-base font-semibold">My Vibe Card</h2>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10"
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-4">
                <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-black/60 mb-4">
                  {loading || !cardUrl ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-8 h-8 rounded-full border-2 border-pink-400 border-t-transparent"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      />
                    </div>
                  ) : (
                    <img src={cardUrl} alt="Vibe card" className="w-full h-full object-cover" />
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {/* Palette switcher */}
                <div className="mb-4">
                  <p className="text-xs text-white/50 mb-2 font-medium">Style</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PALETTES.map((pp, i) => (
                      <button
                        key={pp.name}
                        onClick={() => setPaletteIdx(i)}
                        className={`flex-shrink-0 w-12 h-12 rounded-full border-2 transition-all ${
                          paletteIdx === i ? 'border-white scale-110' : 'border-white/20'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${pp.from}, ${pp.via}, ${pp.to})`,
                        }}
                        aria-label={pp.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    onClick={handleDownload}
                    disabled={!cardUrl}
                    className="h-12 rounded-xl bg-white/10 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    whileTap={{ scale: 0.97 }}
                    transition={iosBounce}
                  >
                    <Download className="w-4 h-4" />
                    Save
                  </motion.button>
                  <motion.button
                    onClick={handleNativeShare}
                    disabled={!cardUrl}
                    className="h-12 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 text-white"
                    style={{ background: 'linear-gradient(135deg, #FF2D55, #BF5AF2)' }}
                    whileTap={{ scale: 0.97 }}
                    transition={iosBounce}
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VibeCardModal;
