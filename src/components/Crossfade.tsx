import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { iosSpring } from '@/lib/animations';

interface CrossfadeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CrossfadeSettings {
  enabled: boolean;
  duration: number;
  gapless: boolean;
  autoLevel: boolean;
}

const Crossfade = ({ isOpen, onClose }: CrossfadeProps) => {
  const [settings, setSettings] = useState<CrossfadeSettings>(() => {
    const saved = localStorage.getItem('crossfade_settings');
    return saved ? JSON.parse(saved) : {
      enabled: false,
      duration: 5,
      gapless: true,
      autoLevel: true,
    };
  });

  useEffect(() => {
    localStorage.setItem('crossfade_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof CrossfadeSettings>(key: K, value: CrossfadeSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="h-full flex flex-col safe-area-pt safe-area-pb">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Playback Settings</h1>
                <p className="text-sm text-muted-foreground">Customize your listening experience</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Crossfade Toggle */}
            <motion.div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={iosSpring}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Crossfade</h3>
                  <p className="text-sm text-muted-foreground">Smooth transitions between songs</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSetting('enabled', checked)}
                />
              </div>

              {settings.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t border-white/10"
                >
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Duration</span>
                      <span className="text-primary font-medium">{settings.duration}s</span>
                    </div>
                    <Slider
                      value={[settings.duration]}
                      min={1}
                      max={12}
                      step={1}
                      onValueChange={([v]) => updateSetting('duration', v)}
                      className="[&_[role=slider]]:bg-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>1s</span>
                      <span>12s</span>
                    </div>
                  </div>

                  {/* Visual representation */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                    <div className="flex-1 h-8 rounded-lg bg-gradient-to-r from-primary/60 to-transparent relative overflow-hidden">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">Song A</span>
                    </div>
                    <div className="flex-1 h-8 rounded-lg bg-gradient-to-l from-accent/60 to-transparent relative overflow-hidden">
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">Song B</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Gapless Playback */}
            <motion.div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Gapless Playback</h3>
                  <p className="text-sm text-muted-foreground">No silence between tracks</p>
                </div>
                <Switch
                  checked={settings.gapless}
                  onCheckedChange={(checked) => updateSetting('gapless', checked)}
                />
              </div>
            </motion.div>

            {/* Auto Volume Level */}
            <motion.div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Normalize Volume
                  </h3>
                  <p className="text-sm text-muted-foreground">Keep consistent volume across songs</p>
                </div>
                <Switch
                  checked={settings.autoLevel}
                  onCheckedChange={(checked) => updateSetting('autoLevel', checked)}
                />
              </div>

              {settings.autoLevel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-green-400">Volume normalization active</span>
                </motion.div>
              )}
            </motion.div>

            {/* Audio Quality Info */}
            <motion.div
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.3 }}
            >
              <h3 className="font-semibold mb-3">Audio Quality</h3>
              <div className="space-y-3">
                {[
                  { label: 'Format', value: 'AAC / MP3' },
                  { label: 'Bitrate', value: 'Up to 320kbps' },
                  { label: 'Sample Rate', value: '44.1kHz' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Crossfade;
