import { memo, useEffect, useRef } from 'react';

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

interface Props {
  variant: AvatarVariant;
  size?: number;
  paused?: boolean;
}

const VideoAvatar = memo(({ variant, size = 96, paused = false }: Props) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const src = SRC[variant];

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
      className="relative overflow-hidden rounded-full bg-background"
      style={{ width: size, height: size, contain: 'paint' }}
      aria-hidden="true"
    >
      <video
        ref={ref}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        // @ts-ignore — non-standard but improves background playback on iOS Safari
        disableRemotePlayback
        preload="auto"
        className="w-full h-full object-cover"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
});

VideoAvatar.displayName = 'VideoAvatar';

export default VideoAvatar;
