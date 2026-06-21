import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowRight, Loader2, AlertTriangle, RotateCcw, Check } from 'lucide-react';

type Pose = 'center' | 'left' | 'right' | 'up';

const POSE_PROMPT: Record<Pose, { title: string; sub: string }> = {
  center: { title: 'Look straight ahead', sub: 'Center your face in the circle' },
  left:   { title: 'Turn your head left',  sub: 'Slowly, keep your eyes on the screen' },
  right:  { title: 'Turn your head right', sub: 'Slowly, keep your eyes on the screen' },
  up:     { title: 'Tilt your head up',    sub: 'Lift your chin a little' },
};

const ORDER: Pose[] = ['center', 'left', 'right', 'up'];

// Each pose owns a 90° arc of the ring around the face oval.
// Order around the oval (12 o'clock = top): up, right, center(bottom), left.
const POSE_ARC: Record<Pose, { startDeg: number; endDeg: number }> = {
  up:     { startDeg: -135, endDeg:  -45 }, // top quarter
  right:  { startDeg:  -45, endDeg:   45 }, // right quarter
  center: { startDeg:   45, endDeg:  135 }, // bottom quarter
  left:   { startDeg:  135, endDeg:  225 }, // left quarter
};


export interface LivenessShots {
  center: Blob;
  left: Blob;
  right: Blob;
  up: Blob;
}

export default function FaceLivenessCapture({
  onComplete,
}: {
  onComplete: (shots: LivenessShots) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false); // user tapped "Start camera"
  const [err, setErr] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [armed, setArmed] = useState(false);
  const [shots, setShots] = useState<Partial<LivenessShots>>({});

  const pose = ORDER[stepIdx];

  // Camera permission is requested ONLY after the user taps "Start camera".
  // This avoids the OS prompt firing as soon as Step 4 mounts.
  const startCamera = async () => {
    if (starting || streaming) return;
    setErr(null);
    setStarting(true);
    setStarted(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Your app version can\'t access the camera. Update Universflow to the latest APK, or finish verification on a browser.',
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      // Arm the first capture automatically so the user sees the countdown
      // and knows the system is alive — fixes the "screen just sits dead" bug.
      setTimeout(() => setArmed(true), 600);
    } catch (e) {
      const msg = e?.message || '';
      const name = e?.name || '';
      let friendly = msg;
      if (name === 'NotAllowedError' || /denied|permission/i.test(msg)) {
        friendly = 'Camera permission denied. Open phone Settings → Apps → Universflow → Permissions → allow Camera, then come back and tap Retry.';
      } else if (name === 'NotFoundError') {
        friendly = 'No front camera found on this device.';
      } else if (name === 'NotReadableError') {
        friendly = 'Another app is using the camera. Close it and tap Retry.';
      } else if (!msg) {
        friendly = 'Camera unavailable. Make sure you allowed Camera permission for Universflow.';
      }
      setErr(friendly);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Countdown when armed
  useEffect(() => {
    if (!armed || !streaming) return;
    setCountdown(3);
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        capture();
      } else {
        setCountdown(n);
      }
    }, 800);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, streaming, stepIdx]);

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // mirror to match the preview the user saw
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const next = { ...shots, [pose]: blob } as Partial<LivenessShots>;
        setShots(next);
        setArmed(false);
        if (stepIdx >= ORDER.length - 1) {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          onComplete(next as LivenessShots);
        } else {
          setStepIdx((i) => i + 1);
          // Auto-arm the next pose so the user never gets stuck on a dead screen.
          setTimeout(() => setArmed(true), 1200);
        }
      },
      'image/jpeg',
      0.85,
    );
  };

  if (err) {
    return (
      <div className="rounded-2xl p-5 bg-rose-500/10 border border-rose-500/30 text-rose-100">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4" /> Camera unavailable
        </div>
        <p className="text-[12.5px] mt-1 leading-relaxed">{err}</p>
        <button
          onClick={startCamera}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] underline"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  // Pre-permission screen: only requests camera after a real user gesture.
  if (!started) {
    return (
      <div className="rounded-3xl p-6 bg-white/[0.03] border border-white/10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-[14px] font-semibold">Ready for your face check?</p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            We'll take 4 quick photos to confirm you're a real person.
            Your camera turns on only after you tap below.
          </p>
        </div>
        <button
          type="button"
          onClick={startCamera}
          disabled={starting}
          className="w-full h-12 rounded-xl font-semibold text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: '#FF2D55' }}
        >
          {starting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Requesting camera…</>
          ) : (
            <><Camera className="w-4 h-4" /> Start camera</>
          )}
        </button>
      </div>
    );
  }


  // Progress 0 → 1 for the ring that fills while the user holds the pose.
  const progress = armed ? (3 - countdown + 1) / 3 : 0;
  const RING_R = 130;
  const RING_C = 2 * Math.PI * RING_R;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
        <span>Face check — step {stepIdx + 1} of {ORDER.length}</span>
        <span className="tabular-nums">{Object.keys(shots).length}/{ORDER.length} captured</span>
      </div>

      <div className="relative aspect-square rounded-3xl overflow-hidden bg-black border border-white/10">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* dimmed background outside the face oval — Instagram-style */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="face-mask">
              <rect width="300" height="300" fill="white" />
              <ellipse cx="150" cy="150" rx="108" ry="132" fill="black" />
            </mask>
          </defs>
          <rect width="300" height="300" fill="rgba(0,0,0,0.55)" mask="url(#face-mask)" />

          {/* outer guide ring */}
          <ellipse
            cx="150" cy="150" rx="108" ry="132"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
          />
          {/* progress ring — fills as the user holds the pose, like IG's appeal flow */}
          <circle
            cx="150" cy="150" r={RING_R}
            fill="none"
            stroke="#FF2D55"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - progress)}
            transform="rotate(-90 150 150)"
            style={{ transition: 'stroke-dashoffset 0.7s linear', filter: 'drop-shadow(0 0 8px rgba(255,45,85,0.6))' }}
          />
        </svg>

        {/* arrow guides — only when not the center pose */}
        <AnimatePresence mode="wait">
          {streaming && pose !== 'center' && (
            <motion.div
              key={pose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <ArrowGuide pose={pose} />
            </motion.div>
          )}
          {streaming && pose === 'center' && (
            <motion.div
              key="center-smile"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center"
              >
                <Smile className="w-7 h-7 text-white" strokeWidth={1.8} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* top prompt pill */}
        <div className="absolute top-3 inset-x-3 pointer-events-none">
          <motion.div
            key={pose}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto inline-flex items-center justify-center w-full"
          >
            <div className="rounded-full bg-black/65 backdrop-blur-md px-4 py-2 text-center border border-white/10">
              <p className="text-[13px] font-semibold text-white">{POSE_PROMPT[pose]}</p>
            </div>
          </motion.div>
        </div>

        {/* progress dots */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
          {ORDER.map((p, i) => (
            <div
              key={p}
              className={`h-1.5 rounded-full transition-all ${
                shots[p] ? 'w-6 bg-emerald-400' : i === stepIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <button
        type="button"
        disabled={!streaming || armed}
        onClick={() => setArmed(true)}
        className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60 inline-flex items-center justify-center gap-2"
        style={{ background: '#FF2D55' }}
      >
        {!streaming ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Starting camera…</>
        ) : armed ? (
          <>Hold still… {countdown}</>
        ) : (
          <><Camera className="w-4 h-4" /> Capture {pose === 'center' ? 'front' : pose} <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-[11.5px] text-muted-foreground leading-relaxed text-center">
        Follow the arrow. We take 4 quick photos to confirm you're a real person — stored privately, deleted after review.
      </p>
    </div>
  );
}

// Animated direction-cue arrow that slides toward the requested direction, like
// the guided face-capture flow Meta uses for Instagram identity / appeal checks.
function ArrowGuide({ pose }: { pose: Exclude<Pose, 'center'> }) {
  // Axis the arrow travels along, and its rest position relative to centre.
  const cfg = {
    left:  { x: [-8, -52, -8], y: [0, 0, 0], rot:  180, side: 'left' as const },
    right: { x: [8,  52,  8],  y: [0, 0, 0], rot:    0, side: 'right' as const },
    up:    { x: [0, 0, 0],     y: [-8, -52, -8], rot: -90, side: 'top'  as const },
  }[pose];

  const Icon = pose === 'up' ? ArrowUp : pose === 'left' ? ArrowLeft : ArrowRight;

  // Position so the arrow sits just inside the face oval on the relevant side.
  const positionStyle =
    cfg.side === 'left' ? { left: '8%',  top: '50%', transform: 'translateY(-50%)' } :
    cfg.side === 'right' ? { right: '8%', top: '50%', transform: 'translateY(-50%)' } :
                           { top: '10%', left: '50%', transform: 'translateX(-50%)' };

  return (
    <div className="absolute" style={positionStyle}>
      {/* trailing ghost ring that pulses out in the same direction */}
      <motion.div
        className="absolute inset-0 rounded-full"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.55, 0, 0.55],
          x: cfg.x,
          y: cfg.y,
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 64, height: 64,
          background: 'radial-gradient(circle, rgba(255,45,85,0.55) 0%, rgba(255,45,85,0) 70%)',
        }}
      />
      <motion.div
        animate={{ x: cfg.x, y: cfg.y }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(255,45,85,0.95)',
          boxShadow: '0 8px 24px rgba(255,45,85,0.45), 0 0 0 4px rgba(255,255,255,0.18)',
        }}
      >
        <Icon className="w-7 h-7 text-white" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
}

