import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Check, ArrowRight, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

type Pose = 'center' | 'left' | 'right' | 'up';

const POSE_PROMPT: Record<Pose, string> = {
  center: 'Look straight at the camera',
  left: 'Slowly turn your head LEFT',
  right: 'Slowly turn your head RIGHT',
  up: 'Tilt your head UP',
};

const ORDER: Pose[] = ['center', 'left', 'right', 'up'];

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
    } catch (e: any) {
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
          // done
          streamRef.current?.getTracks().forEach((t) => t.stop());
          onComplete(next as LivenessShots);
        } else {
          setStepIdx((i) => i + 1);
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
        {/* face guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="rounded-full border-2 border-white/40"
            style={{ width: '72%', height: '88%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
          />
        </div>
        {/* prompt */}
        <div className="absolute top-3 inset-x-3">
          <div className="rounded-full bg-black/60 backdrop-blur px-4 py-2 text-center">
            <p className="text-[13px] font-semibold text-white">{POSE_PROMPT[pose]}</p>
          </div>
        </div>
        {/* countdown */}
        <AnimatePresence>
          {armed && (
            <motion.div
              key={countdown}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-24 h-24 rounded-full bg-black/70 backdrop-blur flex items-center justify-center">
                <span className="text-white text-5xl font-bold tabular-nums">{countdown}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* progress dots */}
        <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
          {ORDER.map((p, i) => (
            <div
              key={p}
              className={`w-2 h-2 rounded-full transition ${
                shots[p] ? 'bg-emerald-400' : i === stepIdx ? 'bg-white' : 'bg-white/30'
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
          <>Hold still…</>
        ) : (
          <><Camera className="w-4 h-4" /> Capture {pose === 'center' ? 'front' : pose} <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      <p className="text-[11.5px] text-muted-foreground leading-relaxed text-center">
        We take 4 photos to confirm you're a real person. Photos are stored privately and deleted right after review.
      </p>
    </div>
  );
}
