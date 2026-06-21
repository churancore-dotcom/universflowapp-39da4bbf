import { memo, useEffect, useRef, useState } from 'react';

export type AvatarVariant =
  | 'headphones-boy'
  | 'chain-guy'
  | 'glasses-beard'
  | 'wavy-girl'
  | 'coffee-girl'
  | 'peace-guy'
  | 'kiss-girl'
  | 'thumbs-guy';

// Avatar videos are bundled into /public/media/avatars so the APK plays them
// instantly from the local file bundle — no CDN round-trip, no broken video
// icon when the network is slow or offline.
const SRC: Record<AvatarVariant, string> = {
  'headphones-boy': '/media/avatars/headphones-boy.mp4',
  'chain-guy': '/media/avatars/chain-guy.mp4',
  'glasses-beard': '/media/avatars/glasses-beard.mp4',
  'wavy-girl': '/media/avatars/wavy-girl.mp4',
  'coffee-girl': '/media/avatars/coffee-girl.mp4',
  'peace-guy': '/media/avatars/peace-guy.mp4',
  'kiss-girl': '/media/avatars/kiss-girl.mp4',
  'thumbs-guy': '/media/avatars/thumbs-guy.mp4',
};

// Distinct gradient tile per variant — painted instantly on the first frame
// so an avatar always *appears* immediately. The decoded video fades in on top
// the moment the WebView reports it can play.
const TILE: Record<AvatarVariant, { from: string; to: string; emoji: string }> = {
  'headphones-boy': { from: '#FF6B9D', to: '#7E4FFF', emoji: '🎧' },
  'chain-guy':      { from: '#FFD86B', to: '#FF7A45', emoji: '⛓️' },
  'glasses-beard':  { from: '#5EE6FF', to: '#3D7BFF', emoji: '🤓' },
  'wavy-girl':      { from: '#FFA8C8', to: '#FF5E8E', emoji: '🌊' },
  'coffee-girl':    { from: '#D6A887', to: '#7A4A2B', emoji: '☕' },
  'peace-guy':      { from: '#92E3A9', to: '#3FAE6C', emoji: '✌️' },
  'kiss-girl':      { from: '#FF8FB3', to: '#E03070', emoji: '💋' },
  'thumbs-guy':     { from: '#FFC97A', to: '#E07A20', emoji: '👍' },
};

interface Props {
  variant: AvatarVariant;
  size?: number;
  paused?: boolean;
}

const VideoAvatar = memo(({ variant, size = 96, paused = false }: Props) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const src = SRC[variant];
  const tile = TILE[variant];

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (paused) {
      v.pause();
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        contain: 'paint',
        background: `linear-gradient(135deg, ${tile.from} 0%, ${tile.to} 100%)`,
      }}
      aria-hidden="true"
    >
      {/* Instant emoji placeholder — visible the moment React paints */}
      <div
        className="absolute inset-0 flex items-center justify-center select-none"
        style={{
          fontSize: Math.max(20, size * 0.42),
          lineHeight: 1,
          opacity: ready ? 0 : 1,
          transition: 'opacity 180ms ease-out',
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}
      >
        {tile.emoji}
      </div>
      <video
        ref={ref}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        disableRemotePlayback
        preload="auto"
        onCanPlay={() => setReady(true)}
        onLoadedData={() => setReady(true)}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          pointerEvents: 'none',
          opacity: ready ? 1 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      />
    </div>
  );
});

VideoAvatar.displayName = 'VideoAvatar';

export default VideoAvatar;
