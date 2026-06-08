import { memo } from 'react';
import a1 from '@/assets/avatars/avatar-1.jpg';
import a2 from '@/assets/avatars/avatar-2.jpg';
import a3 from '@/assets/avatars/avatar-3.jpg';
import a4 from '@/assets/avatars/avatar-4.jpg';
import a5 from '@/assets/avatars/avatar-5.jpg';
import a6 from '@/assets/avatars/avatar-6.jpg';
import a7 from '@/assets/avatars/avatar-7.jpg';
import a8 from '@/assets/avatars/avatar-8.jpg';
import a9 from '@/assets/avatars/avatar-9.jpg';
import a10 from '@/assets/avatars/avatar-10.jpg';

export type AvatarVariant =
  | 'hoodie-guy' | 'sweater-girl' | 'glasses-beard' | 'leather-bob'
  | 'chain-guy' | 'pink-sweater' | 'white-hoodie' | 'afro-yellow'
  | 'headphones-boy' | 'pink-beanie';

const IMG: Record<AvatarVariant, string> = {
  'hoodie-guy': a1,
  'sweater-girl': a2,
  'glasses-beard': a3,
  'leather-bob': a4,
  'chain-guy': a5,
  'pink-sweater': a6,
  'white-hoodie': a7,
  'afro-yellow': a8,
  'headphones-boy': a9,
  'pink-beanie': a10,
};

interface Effect {
  /** Animation applied to the portrait itself */
  motion: 'wave' | 'bob' | 'sway' | 'breathe';
  /** Overlay decoration layered above the portrait */
  overlay: 'wave-hand' | 'notes' | 'sparkles' | 'hearts' | 'glow-ring' | 'none';
  /** Glow color of the soft halo ring */
  ring: string;
}

const EFFECTS: Record<AvatarVariant, Effect> = {
  'hoodie-guy':      { motion: 'wave',    overlay: 'wave-hand', ring: 'rgba(255,45,85,0.45)' },
  'sweater-girl':    { motion: 'sway',    overlay: 'sparkles',  ring: 'rgba(255,150,200,0.5)' },
  'glasses-beard':   { motion: 'breathe', overlay: 'glow-ring', ring: 'rgba(120,180,255,0.45)' },
  'leather-bob':     { motion: 'bob',     overlay: 'sparkles',  ring: 'rgba(220,40,90,0.5)' },
  'chain-guy':       { motion: 'bob',     overlay: 'notes',     ring: 'rgba(255,200,80,0.45)' },
  'pink-sweater':    { motion: 'breathe', overlay: 'hearts',    ring: 'rgba(255,150,200,0.5)' },
  'white-hoodie':    { motion: 'sway',    overlay: 'glow-ring', ring: 'rgba(255,255,255,0.4)' },
  'afro-yellow':     { motion: 'wave',    overlay: 'wave-hand', ring: 'rgba(255,200,40,0.55)' },
  'headphones-boy':  { motion: 'bob',     overlay: 'notes',     ring: 'rgba(120,90,255,0.5)' },
  'pink-beanie':     { motion: 'breathe', overlay: 'hearts',    ring: 'rgba(255,170,210,0.5)' },
};

interface Props {
  variant: AvatarVariant;
  size?: number;
  paused?: boolean;
}

const KEYFRAMES = `
@keyframes uf-portrait-wave { 0%,55%,100%{transform:rotate(0deg)} 65%{transform:rotate(-3deg)} 75%{transform:rotate(2deg)} 85%{transform:rotate(-1.5deg)} }
@keyframes uf-portrait-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2.5px)} }
@keyframes uf-portrait-sway { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
@keyframes uf-portrait-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
@keyframes uf-wave-hand { 0%,40%,100%{transform:rotate(0deg)} 50%{transform:rotate(-28deg)} 60%{transform:rotate(18deg)} 70%{transform:rotate(-12deg)} 80%{transform:rotate(8deg)} 90%{transform:rotate(0deg)} }
@keyframes uf-float-up { 0%{transform:translate(var(--sx,0),0) scale(0.5);opacity:0} 20%{opacity:1} 100%{transform:translate(calc(var(--sx,0) + var(--dx,0)),-32px) scale(1);opacity:0} }
@keyframes uf-sparkle { 0%,100%{transform:scale(0.3);opacity:0} 50%{transform:scale(1);opacity:1} }
@keyframes uf-ring-pulse { 0%{transform:scale(0.95);opacity:0.7} 100%{transform:scale(1.18);opacity:0} }
@keyframes uf-ring-glow { 0%,100%{opacity:0.6} 50%{opacity:1} }
`;

const PortraitAvatar = memo(({ variant, size = 96, paused = false }: Props) => {
  const url = IMG[variant];
  const fx = EFFECTS[variant];
  const motionAnim = paused ? 'none' : `uf-portrait-${fx.motion} ${fx.motion === 'wave' ? '4s' : fx.motion === 'bob' ? '1.6s' : fx.motion === 'sway' ? '3.2s' : '4s'} ease-in-out infinite`;

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-full"
      style={{ width: size, height: size, contain: 'paint' }}
      aria-hidden="true"
    >
      <style>{KEYFRAMES}</style>

      {/* Soft halo glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: `inset 0 0 24px 4px ${fx.ring}`,
          animation: paused ? 'none' : 'uf-ring-glow 3s ease-in-out infinite',
        }}
      />

      {/* Pulsing outer ring (glow-ring overlay) */}
      {fx.overlay === 'glow-ring' && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: `2px solid ${fx.ring}`,
            animation: paused ? 'none' : 'uf-ring-pulse 1.8s ease-out infinite',
            transformOrigin: 'center',
          }}
        />
      )}

      {/* Portrait image with motion */}
      <img
        src={url}
        alt=""
        loading="lazy"
        width={size}
        height={size}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          animation: motionAnim,
          transformOrigin: '50% 70%',
          willChange: paused ? 'auto' : 'transform',
        }}
      />

      {/* Waving hand emoji */}
      {fx.overlay === 'wave-hand' && (
        <span
          className="absolute select-none pointer-events-none"
          style={{
            right: '4%',
            top: '8%',
            fontSize: size * 0.32,
            lineHeight: 1,
            transformOrigin: '70% 70%',
            animation: paused ? 'none' : 'uf-wave-hand 2.6s ease-in-out infinite',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          }}
        >
          👋
        </span>
      )}

      {/* Floating music notes */}
      {fx.overlay === 'notes' && (
        <div className="absolute inset-0 pointer-events-none">
          {['♪', '♫', '♩'].map((n, i) => (
            <span
              key={i}
              className="absolute font-bold"
              style={{
                left: `${[10, 78, 18][i]}%`,
                bottom: `${[30, 40, 60][i]}%`,
                fontSize: size * 0.18,
                color: '#fff',
                textShadow: '0 0 8px rgba(255,45,85,0.8)',
                ['--sx' as never]: `${[0, 0, 0][i]}px`,
                ['--dx' as never]: `${[6, -8, 4][i]}px`,
                animation: paused ? 'none' : `uf-float-up ${2.4 + i * 0.3}s ease-out ${i * 0.6}s infinite`,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      )}

      {/* Floating hearts */}
      {fx.overlay === 'hearts' && (
        <div className="absolute inset-0 pointer-events-none">
          {['💗', '💖', '💕'].map((h, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${[12, 76, 22][i]}%`,
                bottom: `${[28, 38, 62][i]}%`,
                fontSize: size * 0.16,
                ['--dx' as never]: `${[4, -6, 2][i]}px`,
                animation: paused ? 'none' : `uf-float-up ${2.6 + i * 0.3}s ease-out ${i * 0.7}s infinite`,
                filter: 'drop-shadow(0 2px 4px rgba(255,45,85,0.5))',
              }}
            >
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Sparkles */}
      {fx.overlay === 'sparkles' && (
        <div className="absolute inset-0 pointer-events-none">
          {[[12, 18, 0], [82, 22, 0.4], [16, 78, 0.8], [80, 74, 1.2]].map(([x, y, d], i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                fontSize: size * 0.14,
                transformOrigin: 'center',
                animation: paused ? 'none' : `uf-sparkle 2.2s ease-in-out infinite ${d}s`,
                filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))',
              }}
            >
              ✨
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

PortraitAvatar.displayName = 'PortraitAvatar';

export default PortraitAvatar;
