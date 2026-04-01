/**
 * Singleton audio engine — owns the AudioContext and the single
 * MediaElementAudioSourceNode. Both the EQ modal and the visualizer
 * tap into this one graph so `createMediaElementSource` is only
 * ever called once per HTMLAudioElement.
 */

const FREQUENCIES = [32, 64, 125, 500, 1000, 4000, 8000, 16000];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private src: MediaElementAudioSourceNode | null = null;
  private el: HTMLAudioElement | null = null;

  // EQ nodes
  private filters: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private convolver: ConvolverNode | null = null;
  private wetGain: GainNode | null = null;
  private dryGain: GainNode | null = null;

  // Visualizer
  private analyserNode: AnalyserNode | null = null;

  // 8D
  private panRAF: number | null = null;
  private is8DActive = false;

  // Track elements we've already called createMediaElementSource on
  private boundSources = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

  private ensureCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new C();
    }
    return this.ctx;
  }

  /**
   * Bind to an audio element. Safe to call repeatedly — reuses
   * existing source if already bound to the same element.
   */
  async bind(audio: HTMLAudioElement): Promise<boolean> {
    try {
      const ctx = this.ensureCtx();

      // Resume first — critical for mobile browsers
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      // Already fully wired to this element
      if (this.el === audio && this.src && this.masterGain) {
        return true;
      }

      // Disconnect old graph (but keep context)
      this.disconnectGraph();

      // Reuse existing source if we already created one for this element
      const existingSource = this.boundSources.get(audio);
      if (existingSource) {
        this.src = existingSource;
      } else {
        // createMediaElementSource can only be called ONCE per element
        this.src = ctx.createMediaElementSource(audio);
        this.boundSources.set(audio, this.src);
      }

      this.el = audio;
      this.buildGraph(ctx);

      return true;
    } catch (err) {
      console.error('AudioEngine bind failed:', err);
      // Fallback: ensure audio still plays directly
      try {
        audio.play().catch(() => {});
      } catch {}
      return false;
    }
  }

  private disconnectGraph() {
    // Disconnect everything except src (we may reuse it)
    [...this.filters, this.panner, this.convolver,
     this.wetGain, this.dryGain, this.masterGain, this.analyserNode
    ].forEach(n => { try { n?.disconnect(); } catch {} });

    // Disconnect src last
    try { this.src?.disconnect(); } catch {}

    this.filters = [];
    this.analyserNode = null;
    this.masterGain = null;
    this.panner = null;
    this.convolver = null;
    this.wetGain = null;
    this.dryGain = null;
  }

  private buildGraph(ctx: AudioContext) {
    if (!this.src) return;

    // Analyser (for visualizer)
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 128;
    this.analyserNode.smoothingTimeConstant = 0.85;

    // EQ filters
    this.filters = FREQUENCIES.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.4;
      f.gain.value = 0;
      return f;
    });

    // Panner for 8D
    this.panner = ctx.createStereoPanner();
    this.panner.pan.value = 0;

    // Reverb
    this.convolver = ctx.createConvolver();
    const sr = ctx.sampleRate;
    const len = sr * 2.5;
    const impulse = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
      }
    }
    this.convolver.buffer = impulse;

    this.wetGain = ctx.createGain();
    this.wetGain.gain.value = 0;
    this.dryGain = ctx.createGain();
    this.dryGain.gain.value = 1;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;

    // Wire: source → analyser → filters → panner → dry/wet → master → destination
    this.src.connect(this.analyserNode);
    this.analyserNode.connect(this.filters[0]);
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    this.filters[this.filters.length - 1].connect(this.panner);
    this.panner.connect(this.dryGain);
    this.panner.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.dryGain.connect(this.masterGain);
    this.wetGain.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    // Restore persisted EQ settings
    this.restoreSettings();
  }

  private restoreSettings() {
    try {
      const bandsStr = localStorage.getItem('eq_bands');
      if (bandsStr) {
        const bands = JSON.parse(bandsStr);
        if (Array.isArray(bands)) {
          const gains = bands.map((b: any) => b.gain ?? 0);
          this.setBands(gains);
        }
      }
      const bass = Number(localStorage.getItem('eq_bass')) || 0;
      if (bass > 0) {
        const bandsData = JSON.parse(localStorage.getItem('eq_bands') || '[]');
        const gains = bandsData.map((b: any) => b.gain ?? 0);
        this.setBassBoost(bass, gains);
      }
      const reverb = Number(localStorage.getItem('eq_reverb')) || 0;
      if (reverb > 0) this.setReverb(reverb);
      const spatial = localStorage.getItem('eq_spatial') === 'true';
      if (spatial) this.set8D(true);
    } catch {}
  }

  get connected(): boolean {
    return this.el !== null && this.src !== null && this.masterGain !== null;
  }

  /** Expose analyser for the visualizer hook */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  async resume() {
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }
  }

  // ─── EQ Controls ───

  setBands(gains: number[]) {
    gains.forEach((g, i) => {
      if (this.filters[i]) this.filters[i].gain.value = g;
    });
  }

  setBassBoost(boost: number, bandGains: number[]) {
    const factor = boost / 8;
    if (this.filters[0]) this.filters[0].gain.value = (bandGains[0] || 0) + factor;
    if (this.filters[1]) this.filters[1].gain.value = (bandGains[1] || 0) + factor * 0.7;
    if (this.filters[2]) this.filters[2].gain.value = (bandGains[2] || 0) + factor * 0.3;
  }

  setReverb(amount: number) {
    if (this.wetGain && this.dryGain) {
      const wet = amount / 100;
      this.wetGain.gain.value = wet * 0.6;
      this.dryGain.gain.value = 1 - wet * 0.3;
    }
  }

  set8D(enabled: boolean) {
    this.is8DActive = enabled;
    if (enabled) {
      if (!this.panRAF) this.startPanLoop();
    } else {
      if (this.panRAF) {
        cancelAnimationFrame(this.panRAF);
        this.panRAF = null;
      }
      if (this.panner) this.panner.pan.value = 0;
    }
  }

  private startPanLoop() {
    const loop = () => {
      if (!this.is8DActive || !this.panner || !this.ctx) return;
      this.panner.pan.value = Math.sin(this.ctx.currentTime * 0.8) * 0.85;
      this.panRAF = requestAnimationFrame(loop);
    };
    this.panRAF = requestAnimationFrame(loop);
  }
}

// Export singleton
export const audioEngine = new AudioEngine();
