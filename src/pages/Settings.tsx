import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Volume2, Palette, Trash2, Info, Headphones, Bell, Shield, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { iosSpring, iosBounce } from '@/lib/animations';

const Settings = () => {
  const navigate = useNavigate();
  const [crossfade, setCrossfade] = useState(3);
  const [gaplessPlayback, setGaplessPlayback] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const SettingSection = ({ 
    title, 
    icon: Icon, 
    iconColor, 
    children, 
    delay = 0 
  }: { 
    title: string; 
    icon: React.ElementType; 
    iconColor: string;
    children: React.ReactNode;
    delay?: number;
  }) => (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...iosSpring, delay }}
    >
      <div className="flex items-center gap-3 mb-3 px-1">
        <div 
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: iconColor }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-[15px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      </div>
      
      <div 
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(28, 28, 30, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {children}
      </div>
    </motion.section>
  );

  const SettingRow = ({ 
    label, 
    value, 
    children,
    isLast = false,
  }: { 
    label: string; 
    value?: string;
    children?: React.ReactNode;
    isLast?: boolean;
  }) => (
    <div 
      className={`px-5 py-4 flex items-center justify-between ${
        !isLast ? 'border-b border-white/[0.06]' : ''
      }`}
    >
      <span className="text-[15px]">{label}</span>
      {value ? (
        <span className="text-[15px] text-muted-foreground">{value}</span>
      ) : children}
    </div>
  );

  return (
    <motion.div 
      className="min-h-screen bg-black pb-44"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* iOS-style header with back button */}
      <motion.header
        className="sticky top-0 z-30 px-2 pt-4 pb-3 flex items-center safe-area-pt"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={iosSpring}
      >
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 px-2 py-2 -ml-1 text-primary"
          whileTap={{ scale: 0.95, opacity: 0.7 }}
          transition={iosBounce}
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-[17px]">Back</span>
        </motion.button>
        <motion.h1 
          className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Settings
        </motion.h1>
      </motion.header>

      <main className="px-5 pt-6 space-y-8">
        {/* Audio Settings */}
        <SettingSection title="Playback" icon={Headphones} iconColor="rgba(255, 149, 0, 0.9)" delay={0.05}>
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[15px]">Crossfade</span>
              <motion.span 
                className="text-[15px] text-primary font-medium min-w-[40px] text-right"
                key={crossfade}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={iosBounce}
              >
                {crossfade}s
              </motion.span>
            </div>
            <Slider
              value={[crossfade]}
              onValueChange={([val]) => setCrossfade(val)}
              max={12}
              step={1}
              className="[&_[role=slider]]:w-6 [&_[role=slider]]:h-6 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-lg"
            />
          </div>
          
          <SettingRow label="Gapless Playback">
            <Switch 
              checked={gaplessPlayback} 
              onCheckedChange={setGaplessPlayback}
              className="data-[state=checked]:bg-primary"
            />
          </SettingRow>
          
          <SettingRow label="Autoplay" isLast>
            <Switch 
              checked={autoplay} 
              onCheckedChange={setAutoplay}
              className="data-[state=checked]:bg-primary"
            />
          </SettingRow>
        </SettingSection>

        {/* Notifications */}
        <SettingSection title="Notifications" icon={Bell} iconColor="rgba(255, 59, 48, 0.9)" delay={0.1}>
          <SettingRow label="Push Notifications">
            <Switch 
              checked={notifications} 
              onCheckedChange={setNotifications}
              className="data-[state=checked]:bg-primary"
            />
          </SettingRow>
          <SettingRow label="Haptic Feedback" isLast>
            <Switch 
              checked={haptics} 
              onCheckedChange={setHaptics}
              className="data-[state=checked]:bg-primary"
            />
          </SettingRow>
        </SettingSection>

        {/* Appearance */}
        <SettingSection title="Appearance" icon={Palette} iconColor="rgba(175, 82, 222, 0.9)" delay={0.15}>
          <motion.button
            className="w-full px-5 py-4 flex items-center justify-between"
            whileTap={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <span className="text-[15px]">Theme</span>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-[15px]">Dark</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </motion.button>
        </SettingSection>

        {/* Storage */}
        <SettingSection title="Storage" icon={Trash2} iconColor="rgba(255, 69, 58, 0.9)" delay={0.2}>
          <motion.button
            className="w-full px-5 py-4 flex items-center justify-between text-destructive"
            whileTap={{ backgroundColor: 'rgba(255,69,58,0.1)' }}
          >
            <span className="text-[15px] font-medium">Clear Cache</span>
            <span className="text-[15px] text-muted-foreground">0 MB</span>
          </motion.button>
        </SettingSection>

        {/* About */}
        <SettingSection title="About" icon={Info} iconColor="rgba(90, 200, 250, 0.9)" delay={0.25}>
          <SettingRow label="Version" value="1.0.0" />
          <SettingRow label="Build" value="2026.01.13" />
          <motion.button
            className="w-full px-5 py-4 flex items-center justify-between border-t border-white/[0.06]"
            whileTap={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <span className="text-[15px]">Privacy Policy</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          <motion.button
            className="w-full px-5 py-4 flex items-center justify-between"
            whileTap={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
          >
            <span className="text-[15px]">Terms of Service</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        </SettingSection>

        {/* App Info */}
        <motion.div 
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-muted-foreground/50 text-sm">
            Made with ❤️ by Sonique
          </p>
        </motion.div>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
    </motion.div>
  );
};

export default Settings;
