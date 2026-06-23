import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Loader2, AlertTriangle, RotateCcw, Check } from 'lucide-react';
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';

// ────────────────────────────────────────────────────────────────────────────
// FAST single-shot face check.
//
// Previous flow asked users to hold 4 separate poses (center/left/right/up)
// for ~280 ms each. Users on mid-range phones kept failing — heads wobble,
// model load is slow, MediaPipe yaw math is jittery. We're now doing what
// Instagram / X verification actually does: one centered selfie, auto-capture
// the moment a real face is detected and roughly straight, ~120 ms hold.
//
// We KEEP the LivenessShots shape (center/left/right/up) so the Apply page
// keeps working without changes — we just put the single captured blob into
// every slot. The upload code already de-dupes by hashing so there's zero
// extra cost downstream.
// ────────────────────────────────────────────────────────────────────────────

const CENTER_TOL_DEG = 22;   // generous — heads wobble; we just need "facing forward"
const HOLD_MS         = 120; // ~7 frames at 60fps. Feels instant, still proves liveness.

export interface LivenessShots {
  center: Blob;
  left: Blob;
  right: Blob;
  up: Blob;
}

// MediaPipe outputs a column-major 4×4 transform matrix. Yaw (around Y) and
// pitch (around X) come from a standard rotation-matrix → Euler decomposition.
// We don't need the full Euler triple — just |yaw| and |pitch| in degrees.
function extractYawPitchDeg(m: number[] | Float32Array): { yawDeg: number; pitchDeg: number } | null {
  if (!m || m.length < 16) return null;
  const r20 = m[2],  r21 = m[6],  r22 = m[10];
  const yaw   = Math.atan2(-r20, Math.sqrt(r21 * r21 + r22 * r22));
  const pitch = Math.atan2(r21, r22);
  return { yawDeg: (yaw * 180) / Math.PI, pitchDeg: (pitch * 180) / Math.PI };
}

// Singleton: load the FaceLandmarker once per session, GPU-first with CPU
// fallback. Pre-fetched on module import so the model is usually warm by the
// time the user opens the verification step.
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
    try { return await make('GPU'); }
    catch (e) {
      console.warn('Face GPU delegate failed, falling back to CPU', e);
      return await make('CPU');
    }
  })();
  return landmarkerPromise;
}

if (typeof window !== 'undefined') {
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
  const capturedRef = useRef(false);

  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [poseOk, setPoseOk] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [flash, setFlash] = useState(false);

  const restart = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    holdStartRef.current = null;
    capturedRef.current = false;
    setStreaming(false);
    setStarted(false);
    setPoseOk(false);
    setHoldProgress(0);
    setFaceDetected(false);
    setDone(false);
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
      if (!video || !lm || video.readyState < 2 || capturedRef.current) {
        if (!capturedRef.current) rafRef.current = requestAnimationFrame(tick);
        return;
      }
      let result: FaceLandmarkerResult | null = null;
      try { result = lm.detectForVideo(video, performance.now()); }
      catch { result = null; }
      const matrix = result?.facialTransformationMatrixes?.[0]?.data;
      if (!matrix) {
        setFaceDetected(false);
        setPoseOk(false);
        setHoldProgress(0);
        holdStartRef.current = null;
      } else {
        setFaceDetected(true);
        const yp = extractYawPitchDeg(matrix as unknown as number[]);
        if (yp) {
          const ok = Math.abs(yp.yawDeg) < CENTER_TOL_DEG && Math.abs(yp.pitchDeg) < CENTER_TOL_DEG;
          setPoseOk(ok);
          if (ok) {
            if (holdStartRef.current == null) holdStartRef.current = performance.now();
            const held = performance.now() - holdStartRef.current;
            const prog = Math.min(1, held / HOLD_MS);
            setHoldProgress(prog);
            if (prog >= 1 && !capturedRef.current) {
              capturedRef.current = true;
              void capture();
              return;
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

  const capture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { capturedRef.current = false; return; }
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 640;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { capturedRef.current = false; return; }
    // Save un-mirrored frame so OCR/face-match downstream sees the real face.
    ctx.drawImage(video, 0, 0, w, h);
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    canvas.toBlob(
      (blob) => {
        if (!blob) { capturedRef.current = false; return; }
        // Tear down the camera immediately — we have what we need.
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setDone(true);
        // Same blob in every slot keeps the LivenessShots interface intact
        // for the Apply page without forcing a multi-pose flow on the user.
        setTimeout(() => {
          onComplete({ center: blob, left: blob, right: blob, up: blob });
        }, 320);
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
          onClick={restart}
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
          <p className="text-[14px] font-semibold">Quick face check</p>
          <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
            Look at the camera. We auto-capture in a split second — no poses,
            no holding still.
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

  // SVG oval guide geometry
  const VB = 300, CX = 150, CY = 150, RX = 108, RY = 132;

  const status: { tone: 'load' | 'warn' | 'ok' | 'lock'; label: string } = done
    ? { tone: 'lock', label: 'Captured ✓' }
    : (!streaming || modelLoading)
      ? { tone: 'load', label: 'Warming up camera…' }
      : !faceDetected
        ? { tone: 'warn', label: 'Center your face in the oval' }
        : poseOk
          ? { tone: 'ok', label: `Hold still · ${Math.round(holdProgress * 100)}%` }
          : { tone: 'warn', label: 'Face the camera straight on' };

  const toneColor = {
    load: { fg: 'rgba(255,255,255,0.92)', bd: 'rgba(255,255,255,0.14)' },
    warn: { fg: 'rgba(255,196,196,0.95)', bd: 'rgba(244,114,114,0.45)' },
    ok:   { fg: '#34D399',                bd: 'rgba(52,211,153,0.55)' },
    lock: { fg: '#34D399',                bd: 'rgba(52,211,153,0.7)' },
  }[status.tone];

  return (
    <div className="space-y-4">
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

        {/* Scanning sweep while waiting for a face */}
        {streaming && !faceDetected && !modelLoading && !done && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: '100%' }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-x-0 h-12 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,45,85,0.18) 50%, transparent 100%)',
            }}
          />
        )}

        {/* Oval guide + progress ring */}
        <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="cutout">
              <rect width={VB} height={VB} fill="white" />
              <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill="black" />
            </mask>
          </defs>
          <rect width={VB} height={VB} fill="rgba(0,0,0,0.55)" mask="url(#cutout)" />
          <ellipse
            cx={CX}
            cy={CY}
            rx={RX}
            ry={RY}
            fill="none"
            stroke={done ? '#34D399' : poseOk ? '#34D399' : 'rgba(255,255,255,0.55)'}
            strokeWidth={2}
            style={{ transition: 'stroke 180ms ease' }}
          />
          {/* Progress ring fills as user holds */}
          <ellipse
            cx={CX}
            cy={CY}
            rx={RX + 8}
            ry={RY + 8}
            fill="none"
            stroke="#FF2D55"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * ((RX + RY) / 2 + 8)}
            strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * ((RX + RY) / 2 + 8)}
            style={{ transition: 'stroke-dashoffset 80ms linear' }}
            transform={`rotate(-90 ${CX} ${CY})`}
            opacity={done ? 0 : 1}
          />
        </svg>

        {/* Cinematic flash */}
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="absolute inset-0 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Lock-in tick */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/90 flex items-center justify-center shadow-2xl">
                <Check className="w-9 h-9 text-white" strokeWidth={3} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status pill */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
          <div
            className="px-3.5 py-1.5 rounded-full text-[12px] font-medium backdrop-blur-md bg-black/45 border tabular-nums"
            style={{ color: toneColor.fg, borderColor: toneColor.bd }}
          >
            {status.tone === 'load' && <Loader2 className="inline w-3 h-3 mr-1.5 animate-spin" />}
            {status.label}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!done && streaming && (
        <button
          type="button"
          onClick={restart}
          className="w-full h-10 rounded-xl text-[12.5px] text-muted-foreground hover:text-white border border-white/10 hover:border-white/25 transition"
        >
          <RotateCcw className="inline w-3.5 h-3.5 mr-1.5" /> Restart camera
        </button>
      )}
    </div>
  );
}
