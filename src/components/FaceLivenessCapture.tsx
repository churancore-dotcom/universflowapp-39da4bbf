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


  // Progress 0 → 1 for the current pose's arc segment.
  const segProgress = armed ? (3 - countdown + 1) / 3 : 0;

  // Geometry — square viewBox; oval matches the face guide.
  const VB = 300;
  const CX = 150;
  const CY = 150;
  const RX = 108;
  const RY = 132;
  // Ring radius sits just outside the oval.
  const RING_RX = RX + 14;
  const RING_RY = RY + 14;

  // Build an SVG arc path between two angles around the face oval.
  const arcPath = (startDeg: number, endDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const sx = CX + RING_RX * Math.cos(toRad(startDeg));
    const sy = CY + RING_RY * Math.sin(toRad(startDeg));
    const ex = CX + RING_RX * Math.cos(toRad(endDeg));
    const ey = CY + RING_RY * Math.sin(toRad(endDeg));
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${RING_RX} ${RING_RY} 0 ${large} 1 ${ex} ${ey}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
        <span>Identity check — step {stepIdx + 1} of {ORDER.length}</span>
        <span className="tabular-nums">{Object.keys(shots).length}/{ORDER.length}</span>
      </div>

      <div
        className="relative aspect-square rounded-3xl overflow-hidden border border-white/10"
        style={{ background: 'radial-gradient(ellipse at center, #0a0a0a 0%, #000 100%)' }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Dimmed mask outside the face oval — clean Meta-style focus */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${VB} ${VB}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="face-mask">
              <rect width={VB} height={VB} fill="white" />
              <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="black" />
            </mask>
            <linearGradient id="active-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF2D55" />
              <stop offset="100%" stopColor="#FF6B9A" />
            </linearGradient>
          </defs>

          {/* dim outside oval */}
          <rect width={VB} height={VB} fill="rgba(0,0,0,0.62)" mask="url(#face-mask)" />

          {/* faint full ring track */}
          <ellipse
            cx={CX} cy={CY} rx={RING_RX} ry={RING_RY}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />

          {/* 4 arc segments — completed = green, active = filling, idle = faint */}
          {ORDER.map((p) => {
            const { startDeg, endDeg } = POSE_ARC[p];
            const done = !!shots[p];
            const isActive = p === pose && !done;
            // Idle background segment
            const base = (
              <path
                key={`${p}-base`}
                d={arcPath(startDeg, endDeg)}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            );
            if (done) {
              return (
                <g key={p}>
                  {base}
                  <path
                    d={arcPath(startDeg, endDeg)}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="6"
                    strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.55))' }}
                  />
                </g>
              );
            }
            if (isActive) {
              // Partial fill via dasharray trick: length of arc ≈ proportional to angle.
              return (
                <g key={p}>
                  {base}
                  <path
                    d={arcPath(startDeg, startDeg + (endDeg - startDeg) * segProgress)}
                    fill="none"
                    stroke="url(#active-grad)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(255,45,85,0.7))',
                      transition: 'd 0.7s linear',
                    }}
                  />
                </g>
              );
            }
            return base;
          })}

          {/* Sharp oval outline */}
          <ellipse
            cx={CX} cy={CY} rx={RX} ry={RY}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Scanning sweep across the face — Meta-style "looking at you" feel */}
        {streaming && armed && (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: '12%', right: '12%',
              top: '8%', bottom: '8%',
              borderRadius: '9999px',
              overflow: 'hidden',
              maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, #000 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, #000 60%, transparent 100%)',
            }}
          >
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '100%' }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-x-0 h-12"
              style={{
                background:
                  'linear-gradient(to bottom, transparent, rgba(255,45,85,0.55) 50%, transparent)',
                filter: 'blur(4px)',
              }}
            />
          </motion.div>
        )}

        {/* Big visual cue badge — confirmation tick when pose completes */}
        <AnimatePresence>
          {shots[pose] && (
            <motion.div
              key={`done-${pose}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/90 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top prompt — Meta-style two-line card */}
        <div className="absolute top-3 inset-x-3 pointer-events-none">
          <motion.div
            key={pose}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mx-auto rounded-2xl bg-black/70 backdrop-blur-xl px-4 py-2.5 border border-white/10 text-center"
          >
            <p className="text-[14px] font-semibold text-white leading-tight">{POSE_PROMPT[pose].title}</p>
            <p className="text-[11px] text-white/65 leading-tight mt-0.5">{POSE_PROMPT[pose].sub}</p>
          </motion.div>
        </div>

        {/* Bottom countdown indicator */}
        {streaming && armed && (
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center pointer-events-none">
            <motion.div
              key={countdown}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-12 h-12 rounded-full bg-black/65 backdrop-blur-md border border-white/15 flex items-center justify-center"
            >
              <span className="text-white font-bold text-xl tabular-nums">{countdown}</span>
            </motion.div>
          </div>
        )}
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
          <>Hold still…</>
        ) : (
          <><Camera className="w-4 h-4" /> Capture <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-[11.5px] text-muted-foreground leading-relaxed text-center">
        We take 4 quick photos to confirm you're a real person. Stored privately, deleted after review.
      </p>
    </div>
  );
}

