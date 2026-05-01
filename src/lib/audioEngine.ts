/**
 * Global audio engine — single AudioContext, single source per <audio>,
 * smooth parameter changes via setTargetAtTime.
 *
 * Graph: source -> [lowshelf, peaking x6, highshelf] -> masterGain -> compressor
 *                  -> dryGain ─┐
 *                  -> convolver -> wetGain ─┴-> destination
 *
 * Public API:
 *   connectAudioElement(el)      // idempotent; reuses MediaElementSource
 *   setBands(gainsDb[])          // 8 values, smoothed
 *   setBassBoost(percent)        // 0-100, adds to lowest 3 bands
 *   setReverb(percent)           // 0-100 wet mix
 *   setSpatial(enabled)          // gentle auto-pan
 *   getState()                   // 'idle' | 'processed' | 'direct' | 'unsupported'
 *   resume()                     // resumes suspended ctx
 */

const SMOOTH = 0.05; // 50ms — per spec

type Mode = 'idle' | 'processed' | 'direct' | 'unsupported';

interface Engine {
  ctx: AudioContext | null;
  source: MediaElementAudioSourceNode | null;
  filters: BiquadFilterNode[];
  master: GainNode | null;
  compressor: DynamicsCompressorNode | null;
  dryGain: GainNode | null;
  wetGain: GainNode | null;
  convolver: ConvolverNode | null;
  panner: StereoPannerNode | null;
  el: HTMLAudioElement | null;
  signature: string | null;
  mode: Mode;
  spatialRaf: number | null;
  spatialAngle: number;
  listeners: Set<(m: Mode) => void>;
}

const engine: Engine = {
  ctx: null,
  source: null,
  filters: [],
  master: null,
  compressor: null,
  dryGain: null,
  wetGain: null,
  convolver: null,
  panner: null,
  el: null,
  signature: null,
  mode: 'idle',
  spatialRaf: null,
  spatialAngle: 0,
  listeners: new Set(),
};

// One MediaElementSource per element — Web Audio forbids creating it twice.
const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

const BAND_DEFS: Array<{
  freq: number;
  type: BiquadFilterType;
  q: number;
}> = [
  { freq: 60, type: 'lowshelf', q: 0.7 },
  { freq: 170, type: 'peaking', q: 1.0 },
  { freq: 310, type: 'peaking', q: 1.0 },
  { freq: 600, type: 'peaking', q: 1.0 },
  { freq: 1000, type: 'peaking', q: 1.0 },
  { freq: 3000, type: 'peaking', q: 1.0 },
  { freq: 6000, type: 'peaking', q: 1.0 },
  { freq: 12000, type: 'highshelf', q: 0.7 },
];

function ensureCtx(): AudioContext | null {
  if (engine.ctx && engine.ctx.state !== 'closed') return engine.ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    engine.ctx = new AC();
    return engine.ctx;
  } catch {
    return null;
  }
}

function isCorsSafe(el: HTMLAudioElement): boolean {
  const src = el.currentSrc || el.src;
  if (!src) return false;
  if (el.crossOrigin === 'anonymous') return true;
  if (src.startsWith('blob:') || src.startsWith('data:')) return true;
  try {
    const u = new URL(src, window.location.href);
    if (u.origin === window.location.origin) return true;
    if (u.hostname.endsWith('supabase.co')) return true;
  } catch { }
  return false;
}

function signature(el: HTMLAudioElement): string | null {
  const src = el.currentSrc || el.src;
  if (!src) return null;
  return `${src}::${el.crossOrigin || 'none'}`;
}

function makeReverbIR(ctx: AudioContext, duration = 2, decay = 2): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return buf;
}

function disconnectAll() {
  const nodes = [
    engine.source,
    ...engine.filters,
    engine.master,
    engine.compressor,
    engine.dryGain,
    engine.wetGain,
    engine.convolver,
    engine.panner,
  ];
  for (const n of nodes) {
    if (!n) continue;
    try {
      n.disconnect();
    } catch { }
  }
}

function setMode(m: Mode) {
  if (engine.mode === m) return;
  engine.mode = m;
  for (const cb of engine.listeners) {
    try {
      cb(m);
    } catch { }
  }
}

function buildProcessedChain(ctx: AudioContext, source: MediaElementAudioSourceNode) {
  const filters = BAND_DEFS.map((def) => {
    const f = ctx.createBiquadFilter();
    f.type = def.type;
    f.frequency.value = def.freq;
    f.Q.value = def.q;
    f.gain.value = 0;
    return f;
  });

  const master = ctx.createGain();
  master.gain.value = 1;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -8;
  compressor.knee.value = 12;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 1;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0;

  const convolver = ctx.createConvolver();
  convolver.buffer = makeReverbIR(ctx);

  const panner = ctx.createStereoPanner();
  panner.pan.value = 0;

  // Wire chain: source -> filters -> master -> compressor -> [dry + reverb->wet] -> panner -> destination
  source.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) filters[i].connect(filters[i + 1]);
  filters[filters.length - 1].connect(master);
  master.connect(compressor);
  compressor.connect(dryGain);
  compressor.connect(convolver);
  convolver.connect(wetGain);
  dryGain.connect(panner);
  wetGain.connect(panner);
  panner.connect(ctx.destination);

  engine.source = source;
  engine.filters = filters;
  engine.master = master;
  engine.compressor = compressor;
  engine.dryGain = dryGain;
  engine.wetGain = wetGain;
  engine.convolver = convolver;
  engine.panner = panner;
}

function buildDirectChain(source: MediaElementAudioSourceNode, ctx: AudioContext) {
  source.connect(ctx.destination);
  engine.source = source;
  engine.filters = [];
  engine.master = null;
  engine.compressor = null;
  engine.dryGain = null;
  engine.wetGain = null;
  engine.convolver = null;
  engine.panner = null;
}

/**
 * Connect (or reconnect) the global engine to this audio element.
 * Safe to call repeatedly — only rebuilds when the source URL/CORS mode changes.
 * Returns true if the EQ chain is active (processed mode), false if direct/unsupported.
 */
export function connectAudioElement(el: HTMLAudioElement): boolean {
  const ctx = ensureCtx();
  if (!ctx) {
    setMode('unsupported');
    return false;
  }

  const sig = signature(el);
  // Same element + same source => already wired
  if (engine.el === el && engine.signature === sig && sig !== null) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    return engine.mode === 'processed';
  }

  // Need to (re)wire. Disconnect first.
  disconnectAll();

  // Get/create the source. NEVER re-create one for the same element.
  let source = sourceCache.get(el);
  if (!source) {
    try {
      source = ctx.createMediaElementSource(el);
      sourceCache.set(el, source);
    } catch (e) {
      console.warn('[audioEngine] createMediaElementSource failed', e);
      setMode('unsupported');
      return false;
    }
  }

  engine.el = el;
  engine.signature = sig;

  if (!isCorsSafe(el)) {
    buildDirectChain(source, ctx);
    setMode('direct');
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    return false;
  }

  buildProcessedChain(ctx, source);
  setMode('processed');
  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
  return true;
}

/** Apply 8 band gains in dB (-12..+12). Smoothed via setTargetAtTime(0.05). */
export function setBands(gainsDb: number[], bassBoostPercent = 0) {
  if (engine.mode !== 'processed' || !engine.ctx || !engine.filters.length) return;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const boost = (bassBoostPercent / 100) * 6; // up to +6dB on lowest band

  for (let i = 0; i < engine.filters.length; i++) {
    let g = gainsDb[i] ?? 0;
    if (i === 0) g += boost;
    else if (i === 1) g += boost * 0.6;
    else if (i === 2) g += boost * 0.25;
    g = Math.max(-12, Math.min(12, g));
    const param = engine.filters[i].gain;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(g, now, SMOOTH);
  }
}

/** 0..100 wet mix. */
export function setReverb(percent: number) {
  if (engine.mode !== 'processed' || !engine.ctx || !engine.dryGain || !engine.wetGain) return;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const wet = Math.max(0, Math.min(1, percent / 100));
  // Equal-power-ish crossfade: keep dry strong, blend reverb up to ~0.45
  const dry = 1 - wet * 0.35;
  const w = wet * 0.45;
  engine.dryGain.gain.cancelScheduledValues(now);
  engine.wetGain.gain.cancelScheduledValues(now);
  engine.dryGain.gain.setTargetAtTime(dry, now, SMOOTH);
  engine.wetGain.gain.setTargetAtTime(w, now, SMOOTH);
}

export function setSpatial(enabled: boolean) {
  if (engine.spatialRaf !== null) {
    cancelAnimationFrame(engine.spatialRaf);
    engine.spatialRaf = null;
  }
  if (!engine.panner || !engine.ctx) return;
  if (!enabled) {
    const now = engine.ctx.currentTime;
    engine.panner.pan.cancelScheduledValues(now);
    engine.panner.pan.setTargetAtTime(0, now, SMOOTH);
    return;
  }
  const tick = () => {
    if (!engine.panner || !engine.ctx) return;
    engine.spatialAngle += 0.018;
    const v = Math.sin(engine.spatialAngle) * 0.18;
    engine.panner.pan.setTargetAtTime(v, engine.ctx.currentTime, 0.08);
    engine.spatialRaf = requestAnimationFrame(tick);
  };
  engine.spatialRaf = requestAnimationFrame(tick);
}

export function resume() {
  if (engine.ctx?.state === 'suspended') {
    engine.ctx.resume().catch(() => { });
  }
}

export function getState(): Mode {
  return engine.mode;
}

export function subscribe(cb: (m: Mode) => void): () => void {
  engine.listeners.add(cb);
  cb(engine.mode);
  return () => engine.listeners.delete(cb);
}
