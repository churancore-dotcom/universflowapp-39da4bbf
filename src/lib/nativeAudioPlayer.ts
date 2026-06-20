// Native ExoPlayer bridge — drives audible playback on Android via the
// NativeAudioPlayer Capacitor plugin. The WebView HTMLAudioElement remains
// the UI / event source (muted on native) so all existing PlayerContext
// logic for ended/timeupdate/queue advance keeps working unchanged.
//
// On web/iOS this file is a no-op: every call is guarded by isNativeAndroid().

import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeAudioLoadOpts {
  url: string;
  title?: string;
  artist?: string;
  album?: string;
  cover?: string;
  startPositionMs?: number;
}

export interface NativeAudioState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
}

export type NativeAudioEvent =
  | { type: 'stateChange'; state: 'playing' | 'paused' }
  | { type: 'positionChange'; positionMs: number; durationMs: number }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'nextRequested' }
  | { type: 'previousRequested' };

interface NativeAudioPluginShape {
  load(opts: NativeAudioLoadOpts): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(opts: { positionMs: number }): Promise<void>;
  setVolume(opts: { volume: number }): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<NativeAudioState>;
  addListener(
    eventName: 'nativeAudioEvent',
    cb: (e: NativeAudioEvent) => void,
  ): Promise<{ remove: () => Promise<void> }> | { remove: () => void };
}

const NativeAudio = registerPlugin<NativeAudioPluginShape>('NativeAudioPlayer');

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform?.() === true && Capacitor.getPlatform?.() === 'android';
  } catch {
    return false;
  }
}

let listenerAttached = false;
const handlers = new Set<(e: NativeAudioEvent) => void>();

export function onNativeAudioEvent(cb: (e: NativeAudioEvent) => void): () => void {
  handlers.add(cb);
  attachListenerOnce();
  return () => { handlers.delete(cb); };
}

async function attachListenerOnce() {
  if (listenerAttached || !isNativeAndroid()) return;
  listenerAttached = true;
  try {
    await NativeAudio.addListener('nativeAudioEvent', (e) => {
      handlers.forEach((h) => { try { h(e); } catch { /* noop */ } });
    });
  } catch (err) {
    console.warn('[NativeAudioPlayer] addListener failed:', err);
  }
}

export async function nativeAudioLoad(opts: NativeAudioLoadOpts): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.load(opts); } catch (e) { console.warn('[NativeAudioPlayer] load failed', e); }
}
export async function nativeAudioPlay(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.play(); } catch { /* noop */ }
}
export async function nativeAudioPause(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.pause(); } catch { /* noop */ }
}
export async function nativeAudioSeek(positionMs: number): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.seek({ positionMs: Math.max(0, Math.floor(positionMs)) }); } catch { /* noop */ }
}
export async function nativeAudioSetVolume(volume: number): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.setVolume({ volume: Math.max(0, Math.min(1, volume)) }); } catch { /* noop */ }
}
export async function nativeAudioStop(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await NativeAudio.stop(); } catch { /* noop */ }
}
