import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Volume2, Palette, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings = () => {
  const navigate = useNavigate();
  const [crossfade, setCrossfade] = useState(3);
  const [audioQuality, setAudioQuality] = useState('high');
  const [gaplessPlayback, setGaplessPlayback] = useState(true);
  const [autoplay, setAutoplay] = useState(true);

  return (
    <div className="min-h-screen bg-background pb-40">
      <motion.header
        className="sticky top-0 z-30 glass px-6 py-4 flex items-center gap-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-display font-bold">Settings</h1>
      </motion.header>

      <main className="px-6 pt-6 space-y-6">
        {/* Audio Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Volume2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold">Audio</h2>
          </div>
          
          <div className="glass rounded-xl p-4 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium">Audio Quality</label>
                <span className="text-sm text-muted-foreground capitalize">{audioQuality}</span>
              </div>
              <Select value={audioQuality} onValueChange={setAudioQuality}>
                <SelectTrigger className="bg-muted/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (64 kbps)</SelectItem>
                  <SelectItem value="normal">Normal (128 kbps)</SelectItem>
                  <SelectItem value="high">High (256 kbps)</SelectItem>
                  <SelectItem value="very_high">Very High (320 kbps)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium">Crossfade</label>
                <span className="text-sm text-muted-foreground">{crossfade}s</span>
              </div>
              <Slider
                value={[crossfade]}
                onValueChange={([val]) => setCrossfade(val)}
                max={12}
                step={1}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Gapless Playback</label>
              <Switch checked={gaplessPlayback} onCheckedChange={setGaplessPlayback} />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Autoplay</label>
              <Switch checked={autoplay} onCheckedChange={setAutoplay} />
            </div>
          </div>
        </motion.section>

        {/* Appearance */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-display font-bold">Appearance</h2>
          </div>
          
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              Theme customization coming soon...
            </p>
          </div>
        </motion.section>

        {/* Storage */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Trash2 className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-display font-bold">Storage</h2>
          </div>
          
          <div className="glass rounded-xl p-4">
            <button className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all text-destructive">
              <span className="font-medium">Clear Cache</span>
              <span className="text-sm text-muted-foreground">0 MB</span>
            </button>
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-display font-bold">About</h2>
          </div>
          
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Build</span>
              <span className="text-sm">2026.01.13</span>
            </div>
          </div>
        </motion.section>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </div>
  );
};

export default Settings;
