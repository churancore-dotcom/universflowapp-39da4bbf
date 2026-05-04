// Lightweight external store for high-frequency progress/duration updates.
// Keeping these out of React state prevents 250ms re-renders cascading through
// every component that calls usePlayer().

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const listeners = new Set<Listener>();
let progress = 0;
let duration = 0;

let snapshot = { progress, duration };

const emit = () => {
  snapshot = { progress, duration };
  listeners.forEach((l) => l());
};

export const playerProgressStore = {
  setProgress(v: number) {
    if (Math.abs(progress - v) < 0.2) return;
    progress = v;
    emit();
  },
  setDuration(v: number) {
    if (duration === v) return;
    duration = v;
    emit();
  },
  reset() {
    progress = 0;
    duration = 0;
    emit();
  },
  getProgress() { return progress; },
  getDuration() { return duration; },
  getSnapshot() { return snapshot; },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function usePlayerProgress() {
  return useSyncExternalStore(playerProgressStore.subscribe, playerProgressStore.getSnapshot, playerProgressStore.getSnapshot);
}
