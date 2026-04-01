import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Trash2, Info, Headphones, Bell, Palette, ChevronRight, Heart, Crown, Waves, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import PageTransition from '@/components/PageTransition';
import EqualizerModal from '@/components/EqualizerModal';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { usePremium } from '@/hooks/usePremium';
import { usePlayer } from '@/contexts/PlayerContext';
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { isPremium } = usePremium();
  const { crossfade: crossfadeEnabled, crossfadeDuration, toggleCrossfade, setCrossfadeDuration } = usePlayer();

  const [crossfade, setCrossfade] = useState(crossfadeDuration);
  const [gaplessPlayback, setGaplessPlayback] = useState(() => {
    try { return localStorage.getItem('uf_gapless') !== 'false'; } catch { return true; }
  });
  const [autoplay, setAutoplay] = useState(() => {
    try { return localStorage.getItem('uf_autoplay') !== 'false'; } catch { return true; }
  });
  const [notifications, setNotifications] = useState(() => {
    try { return localStorage.getItem('uf_notifications') !== 'false'; } catch { return true; }
  });
  const [haptics, setHaptics] = useState(() => {
    try { return localStorage.getItem('uf_haptics') !== 'false'; } catch { return true; }
  });
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [showEqualizer, setShowEqualizer] = useState(false);

  // Calculate cache size on mount
  useEffect(() => {
    (async () => {
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const est = await navigator.storage.estimate();
          const mb = ((est.usage || 0) / 1024 / 1024).toFixed(1);
          setCacheSize(`${mb} MB`);
        }
      } catch {}
    })();
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('uf_gapless', String(gaplessPlayback));
  }, [gaplessPlayback]);

  useEffect(() => {
    localStorage.setItem('uf_autoplay', String(autoplay));
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem('uf_notifications', String(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('uf_haptics', String(haptics));
  }, [haptics]);

  const handleCrossfadeChange = useCallback((val: number) => {
    setCrossfade(val);
    setCrossfadeDuration(val);
    if (val > 0 && !crossfadeEnabled) toggleCrossfade();
    if (val === 0 && crossfadeEnabled) toggleCrossfade();
  }, [crossfadeEnabled, toggleCrossfade, setCrossfadeDuration]);

  const handleClearCache = useCallback(async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      // Clear localStorage EQ settings
      ['eq_bands', 'eq_bass', 'eq_reverb', 'eq_speed', 'eq_preset', 'eq_spatial'].forEach(k => localStorage.removeItem(k));
      setCacheSize('0 MB');
      toast.success('Cache cleared successfully');
    } catch {
      toast.error('Failed to clear cache');
    }
  }, []);

  const handleNotificationToggle = useCallback((val: boolean) => {
    setNotifications(val);
    if (val && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    toast.success(val ? 'Notifications enabled' : 'Notifications disabled');
  }, []);

  const handleHapticsToggle = useCallback((val: boolean) => {
    setHaptics(val);
    toast.success(val ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
  }, []);

  return (
    <PageTransition>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex-shrink-0 z-30 px-2 pt-3 pb-2 flex items-center safe-area-pt"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
          }}
        >
          <button onClick={() => navigate(-1)} className="flex items-center gap-0.5 px-2 py-2 -ml-1 text-primary">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">Settings</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pt-3 pb-32 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Playback */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-orange-500">
                <Headphones className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Playback</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Crossfade</span>
                  <span className="text-sm text-primary font-medium">{crossfade}s</span>
                </div>
                <Slider value={[crossfade]} onValueChange={([val]) => handleCrossfadeChange(val)} max={12} step={1} className="[&_[role=slider]]:w-5 [&_[role=slider]]:h-5 [&_[role=slider]]:bg-white" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <span className="text-sm">Gapless Playback</span>
                <Switch checked={gaplessPlayback} onCheckedChange={v => { setGaplessPlayback(v); toast.success(v ? 'Gapless playback on' : 'Gapless playback off'); }} className="data-[state=checked]:bg-primary scale-90" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <span className="text-sm">Autoplay</span>
                <Switch checked={autoplay} onCheckedChange={v => { setAutoplay(v); toast.success(v ? 'Autoplay on' : 'Autoplay off'); }} className="data-[state=checked]:bg-primary scale-90" />
              </div>
              <button
                onClick={() => setShowEqualizer(true)}
                className="w-full px-4 py-3 flex items-center justify-between active:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-primary" />
                  <span className="text-sm">Equalizer</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Support */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-pink-500">
                <Heart className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Support</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <button onClick={() => navigate('/support')} className="w-full px-4 py-3 flex items-center justify-between border-b border-border active:bg-muted/50">
                <div className="flex items-center gap-2">
                  {isPremium && <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-medium text-primary">Premium</span>}
                  <span className="text-sm">{isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Crown className="w-3.5 h-3.5 text-primary" />
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
              <button onClick={() => navigate('/support')} className="w-full px-4 py-3 flex items-center justify-between active:bg-muted/50">
                <span className="text-sm">Buy Me a Coffee</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-red-500">
                <Bell className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Notifications</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <span className="text-sm">Push Notifications</span>
                <Switch checked={notifications} onCheckedChange={handleNotificationToggle} className="data-[state=checked]:bg-primary scale-90" />
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm">Haptic Feedback</span>
                <Switch checked={haptics} onCheckedChange={handleHapticsToggle} className="data-[state=checked]:bg-primary scale-90" />
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-purple-500">
                <Palette className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Appearance</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <button className="w-full px-4 py-3 flex items-center justify-between active:bg-muted/50" onClick={() => toast.info('Dark mode is the only theme')}>
                <span className="text-sm">Theme</span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-sm">Dark</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          </section>

          {/* Storage */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-destructive">
                <Trash2 className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">Storage</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <button onClick={handleClearCache} className="w-full px-4 py-3 flex items-center justify-between text-destructive active:bg-destructive/10">
                <span className="text-sm font-medium">Clear Cache</span>
                <span className="text-sm text-muted-foreground">{cacheSize}</span>
              </button>
            </div>
          </section>

          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-sky-500">
                <Info className="w-3 h-3 text-white" />
              </div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase">About</h2>
            </div>
            <div className="rounded-xl overflow-hidden bg-card border border-border">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border">
                <span className="text-sm">Version</span>
                <span className="text-sm text-muted-foreground">1.0.0</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm">Build</span>
                <span className="text-sm text-muted-foreground">2026.04.01</span>
              </div>
            </div>
          </section>
        </main>

        <BottomNav />
        <MiniPlayer />
        <FullscreenPlayer />
        <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />
      </div>
    </PageTransition>
  );
};

export default Settings;
