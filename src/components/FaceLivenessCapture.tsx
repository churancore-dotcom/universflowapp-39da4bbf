import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, AlertTriangle, RotateCcw, Check, X } from 'lucide-react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

type Pose = 'center' | 'left' | 'right' | 'up';

const POSE_PROMPT: Record<Pose, { title: string; sub: string }> = {
  center: { title: 'Look straight ahead', sub: 'Center your face in the oval' },
  left:   { title: 'Turn your head LEFT',  sub: 'Slowly — your nose should point left' },
  right:  { title: 'Turn your head RIGHT', sub: 'Slowly — your nose should point right' },
  up:     { title: 'Tilt your head UP',    sub: 'Lift your chin a little' },
};

const ORDER: Pose[] = ['center', 'left', 'right', 'up'];

const POSE_ARC: Record<Pose, { startDeg: number; endDeg: number }> = {
  up:     { startDeg: -135, endDeg:  -45 },
  right:  { startDeg:  -45, endDeg:   45 },
  center: { startDeg:   45, endDeg:  135 },
  left:   { startDeg:  135, endDeg:  225 },
};

// Thresholds for pose detection — derived from MediaPipe Face Landmarker
// transformationMatrix yaw/pitch (in degrees). Calibrated to feel responsive
// but not trigger on tiny head wobble.
const YAW_LEFT_MIN  = 15;   // user turns head left   → yaw > +15°
const YAW_RIGHT_MIN = 15;   // user turns head right  → yaw < -15°
const PITCH_UP_MIN  = 12;   // user tilts head up     → pitch > +12°
const CENTER_TOL    = 12;   // straight ahead         → |yaw|<12 && |pitch|<12
const HOLD_MS       = 280;  // must hold the pose this long before capture

export interface LivenessShots {
  center: Blob;
  left: Blob;
  right: Blob;
  up: Blob;
}

// IMPORTANT: the camera preview is mirrored (selfie mode). MediaPipe runs on
// the *un-mirrored* video frame, so a head turned to the user's real LEFT
// produces a NEGATIVE yaw in the matrix. We flip the sign here so "left" in
// our UI matches the user's actual left/right, matching Meta/Face ID UX.
//
// The matrix is column-major. We extract yaw (around Y axis) and pitch
// (around X axis) using a standard rotation-matrix-to-Euler conversion.
function extractYawPitchDeg(m: number[] | Float32Array): { yawDeg: number; pitchDeg: number } | null {
  if (!m || m.length < 16) return null;
  // Column-major 4x4 → rotation matrix elements:
  // R = [ m[0] m[4] m[8]  ]
  //     [ m[1] m[5] m[9]  ]
  //     [ m[2] m[6] m[10] ]
  const r00 = m[0],  r01 = m[4],  r02 = m[8];
  const r10 = m[1],  r11 = m[5],  r12 = m[9];
  const r20 = m[2],  r21 = m[6],  r22 = m[10];
  void r00; void r10; void r11;
  // Standard XYZ Euler (yaw = around Y, pitch = around X)
  const yaw   = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22));
  const pitch = Math.atan2(r21, r22);
  // Flip yaw sign so "user's left" reads as positive (mirror selfie correction).
  return {
    yawDeg:   -(yaw   * 180) / Math.PI,
    pitchDeg:  (pitch * 180) / Math.PI,
  };
}

function poseMatches(target: Pose, yawDeg: number, pitchDeg: number): boolean {
  switch (target) {
    case 'center': return Math.abs(yawDeg) < CENTER_TOL && Math.abs(pitchDeg) < CENTER_TOL;
    case 'left':   return yawDeg >  YAW_LEFT_MIN;
    case 'right':  return yawDeg < -YAW_RIGHT_MIN;
    case 'up':     return pitchDeg > PITCH_UP_MIN;
  }
}

// Singleton: load the FaceLandmarker once per session. We try GPU first; if
// the device/driver rejects it we transparently fall back to CPU so the user
// is never stuck on "Loading face model".
let landmarkerPromise: Promise<FaceLandmarker> | null = null;
async function getLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
    );
    const make = (delegate: 'GPU' | 'CPU') =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate,
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      });
    try {
      return await make('GPU');
    } catch (e) {
      console.warn('Face GPU delegate failed, falling back to CPU', e);
      return await make('CPU');
    }
  })();
  return landmarkerPromise;
}

// Kick off model + WASM download as soon as this module is imported, so by
// the time the user taps "Start camera" the model is usually ready.
if (typeof window !== 'undefined') {
  // best-effort, swallow errors — real load happens again in startCamera()
  setTimeout(() => { void getLandmarker().catch(() => { landmarkerPromise = null; }); }, 50);
}

export default function FaceLivenessCapture({
  onComplete,
}: {
  onComplete: (shots: LivenessShots) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const shotsRef = useRef<Partial<LivenessShots>>({});
  const stepRef = useRef<number>(0);
  const capturingRef = useRef(false);

  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [shots, setShots] = useState<Partial<LivenessShots>>({});
  const [poseOk, setPoseOk] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [faceDetected, setFaceDetected] = useState(false);
  const [debugYP, setDebugYP] = useState<{ y: number; p: number } | null>(null);
  const [flash, setFlash] = useState(false);

  const pose = ORDER[stepIdx];

  // Hard restart — stop camera, wipe shots, reset to "Start camera" screen.
  const restart = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    holdStartRef.current = null;
    capturingRef.current = false;
    shotsRef.current = {};
    stepRef.current = 0;
    setShots({});
    setStepIdx(0);
    setPoseOk(false);
    setHoldProgress(0);
    setFaceDetected(false);
    setDebugYP(null);
    setStreaming(false);
    setStarted(false);
    setErr(null);
  };

  const startCamera = async () => {
    if (starting || streaming) return;
    setErr(null);
    setStarting(true);
    setStarted(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Your app version can't access the camera. Update Universflow to the latest APK, or finish verification in a browser.",
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);

      setModelLoading(true);
      try {
        landmarkerRef.current = await getLandmarker();
      } catch (e) {
        console.error('Face model load failed', e);
        setErr('Could not load the face model. Check your internet and tap Retry.');
        return;
      } finally {
        setModelLoading(false);
      }
      runDetectionLoop();
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      const msg = err?.message || '';
      const name = err?.name || '';
      let friendly = msg;
      if (name === 'NotAllowedError' || /denied|permission/i.test(msg)) {
        friendly = 'Camera permission denied. Open phone Settings → Apps → Universflow → Permissions → allow Camera, then tap Retry.';
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runDetectionLoop = () => {
    const tick = () => {
      const video = videoRef.current;
      const lm = landmarkerRef.current;
      if (!video || !lm || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      let result: FaceLandmarkerResult | null = null;
      try {
        result = lm.detectForVideo(video, performance.now());
      } catch {
        result = null;
      }
      const matrix = result?.facialTransformationMatrixes?.[0]?.data;
      const targetPose = ORDER[stepRef.current];
      if (!matrix) {
        setFaceDetected(false);
        setPoseOk(false);
        setHoldProgress(0);
        holdStartRef.current = null;
        setDebugYP(null);
      } else {
        setFaceDetected(true);
        const yp = extractYawPitchDeg(matrix as unknown as number[]);
        if (yp) {
          setDebugYP({ y: yp.yawDeg, p: yp.pitchDeg });
          const ok = poseMatches(targetPose, yp.yawDeg, yp.pitchDeg);
          setPoseOk(ok);
          if (ok) {
            if (holdStartRef.current == null) holdStartRef.current = performance.now();
            const held = performance.now() - holdStartRef.current;
            const prog = Math.min(1, held / HOLD_MS);
            setHoldProgress(prog);
            if (prog >= 1 && !capturingRef.current && !shotsRef.current[targetPose]) {
              capturingRef.current = true;
              capture(targetPose);
            }
          } else {
            holdStartRef.current = null;
            setHoldProgress(0);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const capture = async (target: Pose) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { capturingRef.current = false; return; }
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { capturingRef.current = false; return; }
    // Save un-mirrored frame so OCR/face-match downstream sees the real face.
    ctx.drawImage(video, 0, 0, w, h);
    // Cinematic shutter flash
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    await new Promise<void>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { capturingRef.current = false; resolve(); return; }
          const next = { ...shotsRef.current, [target]: blob } as Partial<LivenessShots>;
          shotsRef.current = next;
          setShots(next);
          // brief lock-in pause to show the green tick, then advance
          setTimeout(() => {
            capturingRef.current = false;
            holdStartRef.current = null;
            setHoldProgress(0);
            setPoseOk(false);
            if (stepRef.current >= ORDER.length - 1) {
              if (rafRef.current) cancelAnimationFrame(rafRef.current);
              streamRef.current?.getTracks().forEach((t) => t.stop());
              onComplete(next as LivenessShots);
            } else {
              stepRef.current += 1;
              setStepIdx(stepRef.current);
            }
            resolve();
          }, 220);
        },
        'image/jpeg',
        0.85,
      );
    });
  };

  if (err) {
    return (
      <div className="rounded-2xl p-5 bg-rose-500/10 border border-rose-500/30 text-rose-100">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4" /> Camera unavailable
        </div>
        <p className="text-[12.5px] mt-1 leading-relaxed">{err}</p>
        <button
          onClick={() => { setErr(null); setStarted(false); }}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] underline"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="rounded-3xl p-6 bg-white/[0.03] border border-white/10 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-[14px] font-semibold">Live face check</p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            We use on-device face tracking to confirm you're a real person.
            Follow the prompts — center, left, right, up. We capture only when
            your head is actually in the right pose.
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

  // SVG geometry
  const VB = 300, CX = 150, CY = 150, RX = 108, RY = 132;
  const RING_RX = RX + 14, RING_RY = RY + 14;

  const arcPath = (startDeg: number, endDeg: number) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const sx = CX + RING_RX * Math.cos(toRad(startDeg));
    const sy = CY + RING_RY * Math.sin(toRad(startDeg));
    const ex = CX + RING_RX * Math.cos(toRad(endDeg));
    const ey = CY + RING_RY * Math.sin(toRad(endDeg));
    const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${RING_RX} ${RING_RY} 0 ${large} 1 ${ex} ${ey}`;
  };

  // Status state machine for the bottom pill — drives the AnimatePresence morph
  type Status = { key: string; tone: 'load' | 'warn' | 'idle' | 'ok' | 'lock'; label: string };
  const status: Status = (!streaming || modelLoading)
    ? { key: 'load', tone: 'load', label: 'Warming up face tracker…' }
    : !faceDetected
      ? { key: 'noface', tone: 'warn', label: 'Center your face in the oval' }
      : poseOk && holdProgress >= 1
        ? { key: 'lock', tone: 'lock', label: 'Captured ✓' }
        : poseOk
          ? { key: 'hold', tone: 'ok', label: `Hold still · ${Math.round(holdProgress * 100)}%` }
          : { key: 'pose', tone: 'idle', label: 'Match the pose above' };

  const toneColor = {
    load: { fg: 'rgba(255,255,255,0.92)', bd: 'rgba(255,255,255,0.14)' },
    warn: { fg: 'rgba(255,196,196,0.95)', bd: 'rgba(244,114,114,0.45)' },
    idle: { fg: 'rgba(255,255,255,0.92)', bd: 'rgba(255,255,255,0.14)' },
    ok:   { fg: '#34D399',                bd: 'rgba(52,211,153,0.55)' },
    lock: { fg: '#34D399',                bd: 'rgba(52,211,153,0.7)' },
  }[status.tone];

  const doneCount = Object.keys(shots).length;

  return (
    <div className="space-y-4">
      {/* Cinematic step bar — four segments fill as poses complete */}
      <div className="flex items-center gap-2">
        {ORDER.map((p, i) => {
          const isDone = !!shots[p];
          const isActive = i === stepIdx && !isDone;
          return (
            <div key={p} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
              <motion.div
                initial={false}
                animate={{
                  width: isDone ? '100%' : isActive ? `${Math.max(8, holdProgress * 100)}%` : '0%',
                  backgroundColor: isDone ? '#34D399' : '#FF2D55',
                }}
                transition={{ duration: isDone ? 0.25 : 0.12, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ boxShadow: isActive ? '0 0 8px rgba(255,45,85,0.55)' : undefined }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>Step {Math.min(stepIdx + 1, ORDER.length)} of {ORDER.length}</span>
        <span>{doneCount}/{ORDER.length} captured</span>
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

        {/* Scanning sweep while waiting for face — purely cinematic */}
        {streaming && !faceDetected && !modelLoading && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-x-0 h-1/3 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,45,85,0.18) 50%, transparent 100%)',
            }}
          />
        )}

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

          <rect width={VB} height={VB} fill="rgba(0,0,0,0.62)" mask="url(#face-mask)" />

          <ellipse
            cx={CX} cy={CY} rx={RING_RX} ry={RING_RY}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />

          {ORDER.map((p) => {
            const { startDeg, endDeg } = POSE_ARC[p];
            const done = !!shots[p];
            const isActive = p === pose && !done;
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
              const span = endDeg - startDeg;
              return (
                <g key={p}>
                  {base}
                  <path
                    d={arcPath(startDeg, startDeg + span * holdProgress)}
                    fill="none"
                    stroke="url(#active-grad)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    style={{
                      filter: 'drop-shadow(0 0 10px rgba(255,45,85,0.7))',
                      transition: 'd 120ms linear',
                    }}
                  />
                </g>
              );
            }
            return base;
          })}

          <ellipse
            cx={CX} cy={CY} rx={RX} ry={RY}
            fill="none"
            stroke={poseOk ? '#34D399' : faceDetected ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)'}
            strokeWidth={poseOk ? 2.5 : 1.5}
            style={{ transition: 'stroke 180ms ease, stroke-width 180ms ease' }}
          />
        </svg>

        {/* Shutter flash on capture */}
        <AnimatePresence>
          {flash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Big ✓ pop on each successful pose */}
        <AnimatePresence>
          {shots[pose] && (
            <motion.div
              key={`done-${pose}`}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/90 backdrop-blur-md flex items-center justify-center shadow-2xl">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top: animated prompt card */}
        <div className="absolute top-3 inset-x-3 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={pose}
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              className="mx-auto max-w-[88%] rounded-2xl px-4 py-2.5 text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.62) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '0.5px solid rgba(255,255,255,0.12)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
              }}
            >
              <p className="text-[14px] font-semibold text-white leading-tight tracking-tight">{POSE_PROMPT[pose].title}</p>
              <p className="text-[11px] text-white/70 leading-tight mt-0.5">{POSE_PROMPT[pose].sub}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Top-right: restart control */}
        {started && (
          <button
            type="button"
            onClick={restart}
            aria-label="Restart face check"
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/55 backdrop-blur-md border border-white/15 text-white/90 active:scale-90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Bottom: morphing status pill */}
        <div className="absolute bottom-3 inset-x-3 pointer-events-none flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status.key}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="rounded-full px-3.5 py-1.5 text-[11.5px] font-medium border backdrop-blur-md flex items-center gap-2 tabular-nums"
              style={{
                background: 'rgba(0,0,0,0.6)',
                borderColor: toneColor.bd,
                color: toneColor.fg,
                boxShadow: status.tone === 'ok' || status.tone === 'lock'
                  ? '0 0 18px rgba(52,211,153,0.25)'
                  : status.tone === 'warn'
                    ? '0 0 18px rgba(244,114,114,0.18)'
                    : undefined,
              }}
            >
              {status.tone === 'load' && <Loader2 className="w-3 h-3 animate-spin" />}
              {status.tone === 'lock' && <Check className="w-3 h-3" strokeWidth={3} />}
              {status.tone === 'warn' && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              )}
              {status.label}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Helper row with restart link — always reachable */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted-foreground leading-relaxed flex-1">
          Auto-capture on each pose. Photos stay private and are deleted after review.
        </p>
        {started && (
          <button
            type="button"
            onClick={restart}
            className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-white/80 hover:text-white px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 active:scale-95 transition"
          >
            <RotateCcw className="w-3 h-3" /> Restart
          </button>
        )}
      </div>

      {debugYP && (
        <p className="text-[10.5px] text-center text-muted-foreground/60 tabular-nums">
          yaw {debugYP.y.toFixed(0)}° · pitch {debugYP.p.toFixed(0)}°
        </p>
      )}
    </div>
  );
}

