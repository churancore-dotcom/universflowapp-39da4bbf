import { initNativeBridge } from './NativeBridge';

export class AudioEngine {
  private context: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentBuffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.gainNode = this.context.createGain();
      this.gainNode.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  async loadBuffer(url: string): Promise<AudioBuffer> {
    await this.unlock();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.context!.decodeAudioData(arrayBuffer);
  }

  async play(buffer: AudioBuffer, offset: number = 0): Promise<void> {
    await this.unlock();
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* noop */ }
      this.currentSource.disconnect();
    }
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode!);
    source.start(0, offset);
    this.currentSource = source;
    this.currentBuffer = buffer;
    this.startTime = this.context!.currentTime - offset;
    this.isPlaying = true;
  }

  pause(): void {
    if (!this.isPlaying || !this.currentSource) return;
    this.pauseOffset = this.context!.currentTime - this.startTime;
    try { this.currentSource.stop(); } catch { /* noop */ }
    this.isPlaying = false;
  }

  resume(): void {
    if (this.isPlaying || !this.currentBuffer) return;
    this.play(this.currentBuffer, this.pauseOffset);
  }

  stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* noop */ }
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
  }

  setVolume(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(value, this.context!.currentTime, 0.01);
    }
  }

  getCurrentTime(): number {
    if (!this.context || !this.isPlaying) return this.pauseOffset;
    return this.context.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.currentBuffer?.duration ?? 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  scheduleNextTrack(nextBuffer: AudioBuffer, onEnded: () => void): void {
    if (!this.context || !this.currentBuffer) return;
    const remaining = this.currentBuffer.duration - this.getCurrentTime();
    const nextSource = this.context.createBufferSource();
    nextSource.buffer = nextBuffer;
    nextSource.connect(this.gainNode!);
    nextSource.start(this.context.currentTime + remaining);
    nextSource.onended = onEnded;
  }
}

export const audioEngine = new AudioEngine();

// Call this once after first play, not inside unlock()
let bridgeInitialized = false;

export function ensureNativeBridge(
  onPause: () => void,
  onResume: () => void
): void {
  if (bridgeInitialized) return;
  bridgeInitialized = true;
  initNativeBridge(onPause, onResume);
}

