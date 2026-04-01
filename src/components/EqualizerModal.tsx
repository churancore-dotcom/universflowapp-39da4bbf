import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RotateCcw, Volume2, Zap, Waves, Music2, Headphones, Globe } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { iosSpring } from '@/lib/animations';
import { usePlayer } from '@/contexts/PlayerContext';
import { toast } from 'sonner';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioContext?: AudioContext | null;
  sourceNode?: MediaElementAudioSourceNode | null;
}

interface EQBand {
  frequency: number;
  gain: number;
  label: string;
}

interface Preset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  bands: number[];
  bassBoost: number;
}

const presets: Preset[] = [
  { id: 'flat', name: 'Flat', icon: Music2, bands: [0, 0, 0, 0, 0, 0], bassBoost: 0 },
  { id: 'bass-boost', name: 'Bass Boost', icon: Zap, bands: [6, 5, 3, 0, -1, -2], bassBoost: 50 },
  { id: 'treble-boost', name: 'Treble Boost', icon: Sparkles, bands: [-2, -1, 0, 2, 4, 5], bassBoost: 0 },
  { id: 'vocal', name: 'Vocal', icon: Volume2, bands: [-2, 0, 3, 4, 2, 0], bassBoost: 0 },
  { id: '8d-audio', name: '8D Audio', icon: Globe, bands: [1, 0, -1, 0, 1, 2], bassBoost: 20 },
  { id: 'phonk', name: 'Phonk', icon: Headphones, bands: [7, 5, 1, -1, 2, 4], bassBoost: 60 },
  { id: 'deep-bass', name: 'Deep Bass', icon: Waves, bands: [8, 6, 3, 0, -2, -3], bassBoost: 80 },
  { id: 'concert', name: 'Concert', icon: Sparkles, bands: [3, 1, 0, 2, 3, 4], bassBoost: 10 },
];

const defaultBands: EQBand[] = [
  { frequency: 60, gain: 0, label: '60Hz' },
  { frequency: 230, gain: 0, label: '230Hz' },
  { frequency: 910, gain: 0, label: '910Hz' },
  { frequency: 3600, gain: 0, label: '3.6kHz' },
  { frequency: 14000, gain: 0, label: '14kHz' },
  { frequency: 20000, gain: 0, label: '20kHz' },
];

interface FrequencySliderProps {
  band: EQBand;
  index: number;
  onChange: (index: number, value: number) => void;
}

function FrequencySliderComponent({ band, index, onChange }: FrequencySliderProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[10px] text-muted-foreground font-mono">{band.gain > 0 ? '+' : ''}{band.gain}dB</span>
      <div className="h-28 flex items-center">
        <Slider
          orientation="vertical"
          value={[band.gain]}
          min={-12}
          max={12}
          step={1}
          onValueChange={([value]) => onChange(index, value)}
          className="h-full"
        />
      </div>
      <span className="text-[10px] text-muted-foreground/70">{band.label}</span>
    </div>
  );
}

const FrequencySlider = memo(FrequencySliderComponent);
FrequencySlider.displayName = 'FrequencySlider';

const EqualizerModal = ({ isOpen, onClose }: EqualizerModalProps) => {
  const { audioElement } = usePlayer();
  const [bands, setBands] = useState<EQBand[]>(defaultBands);
  const [bassBoost, setBassBoost] = useState(0);
  const [activePreset, setActivePreset] = useState<string>('flat');
  const [isConnected, setIsConnected] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context and connect to audio element
  useEffect(() => {
    if (!audioElement || isConnected) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('AudioContext not supported');
        return;
      }

      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audioElement);
      sourceNodeRef.current = source;

      const filters = defaultBands.map((band) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.frequency;
        filter.Q.value = 1;
        filter.gain.value = band.gain;
        return filter;
      });
      eqFiltersRef.current = filters;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1;
      gainNodeRef.current = gainNode;

      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(gainNode);
      gainNode.connect(ctx.destination);

      setIsConnected(true);
    } catch (error) {
      console.error('Failed to initialize equalizer:', error);
    }

    return () => {};
  }, [audioElement, isConnected]);

  // Apply EQ changes
  useEffect(() => {
    if (!eqFiltersRef.current.length) return;
    bands.forEach((band, index) => {
      if (eqFiltersRef.current[index]) {
        eqFiltersRef.current[index].gain.value = band.gain;
      }
    });
  }, [bands]);

  // Apply bass boost
  useEffect(() => {
    if (!eqFiltersRef.current.length) return;
    const boostAmount = bassBoost / 10;
    if (eqFiltersRef.current[0]) {
      eqFiltersRef.current[0].gain.value = bands[0].gain + boostAmount;
    }
    if (eqFiltersRef.current[1]) {
      eqFiltersRef.current[1].gain.value = bands[1].gain + (boostAmount * 0.5);
    }
  }, [bassBoost, bands]);

  const handleBandChange = useCallback((index: number, value: number) => {
    setBands(prev => prev.map((b, i) => i === index ? { ...b, gain: value } : b));
    setActivePreset('custom');
  }, []);

  const handlePresetSelect = useCallback((preset: Preset) => {
    setBands(prev => prev.map((b, i) => ({ ...b, gain: preset.bands[i] ?? 0 })));
    setBassBoost(preset.bassBoost);
    setActivePreset(preset.id);
    toast.success(`${preset.name} preset applied`);
  }, []);

  const handleReset = useCallback(() => {
    setBands(defaultBands);
    setBassBoost(0);
    setActivePreset('flat');
    toast.success('Equalizer reset');
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        <motion.div
          className="relative w-full max-w-lg mx-4 mb-4 rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.98) 0%, rgba(20, 20, 25, 0.99) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={iosSpring}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600">
                <Waves className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Equalizer</h2>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Play a song to connect'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleReset}
                className="w-10 h-10 rounded-full flex items-center justify-center glass"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </motion.button>
              <motion.button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center glass"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Presets - 2x4 Grid */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Presets</h3>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = activePreset === preset.id;
                  return (
                    <motion.button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className="relative flex flex-col items-center gap-2 py-3 px-2 rounded-xl overflow-hidden transition-all"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(270 80% 55%))'
                          : 'rgba(28, 28, 30, 0.8)',
                        border: isSelected
                          ? '1px solid hsl(var(--primary) / 0.6)'
                          : '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                      <span className={`text-[11px] font-medium leading-tight text-center ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                        {preset.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* EQ Bands */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Frequency Bands</h3>
              <div
                className="flex justify-between px-3 py-4 rounded-2xl"
                style={{
                  background: 'rgba(28, 28, 30, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                {bands.map((band, index) => (
                  <FrequencySlider
                    key={band.frequency}
                    band={band}
                    index={index}
                    onChange={handleBandChange}
                  />
                ))}
              </div>
            </div>

            {/* Bass Boost */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="text-sm">Bass Boost</span>
                </div>
                <span className="text-xs text-muted-foreground">{bassBoost}%</span>
              </div>
              <Slider
                value={[bassBoost]}
                min={0}
                max={100}
                step={5}
                onValueChange={([value]) => {
                  setBassBoost(value);
                  setActivePreset('custom');
                }}
                className="w-full"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EqualizerModal;
