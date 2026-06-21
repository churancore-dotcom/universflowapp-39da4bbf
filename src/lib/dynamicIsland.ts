// Universflow Dynamic Island — system-wide floating pill (Android only).
// No-op on web/iOS. Talks to the native DynamicIslandPlugin.

import { Capacitor, registerPlugin } from '@capacitor/core';

interface DynamicIslandPluginShape {
  canDraw(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  openOverlaySettings?(): Promise<{ granted: boolean }>;
  show(opts: { title: string; artist: string; cover?: string; isPlaying: boolean }): Promise<void>;
  update(opts: { isPlaying?: boolean; position?: number; duration?: number }): Promise<void>;
  hide(): Promise<void>;
  addListener(
    eventName: 'islandAction',
    cb: (e: { action: 'play' | 'pause' | 'next' | 'prev' | 'open' | 'close' }) => void,
  ): Promise<{ remove: () => Promise<void> }> | { remove: () => void };
}

const Island = registerPlugin<DynamicIslandPluginShape>('DynamicIsland');

const PERM_PROMPT_KEY = 'uf:island-perm-prompted:v2';

function isAndroid(): boolean {
  try {
    return Capacitor.getPlatform?.() === 'android' && Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export const isDynamicIslandSupported = isAndroid;

let listenerAttached = false;
let handlers: {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
} = {};

export function setIslandHandlers(h: typeof handlers) {
  handlers = h;
  attachListener();
}

function attachListener() {
  if (listenerAttached || !isAndroid()) return;
  Island.addListener('islandAction', (e) => {
    switch (e.action) {
      case 'play': handlers.onPlay?.(); break;
      case 'pause': handlers.onPause?.(); break;
      case 'next': handlers.onNext?.(); break;
      case 'prev': handlers.onPrev?.(); break;
      case 'open': handlers.onOpen?.(); break;
      case 'close': handlers.onClose?.(); break;
    }
  });
  listenerAttached = true;
}

export async function canShowIsland(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    const { granted } = await Island.canDraw();
    return !!granted;
  } catch { return false; }
}

/** Opens the system "Display over other apps" screen — only call once per app lifetime. */
export async function requestIslandPermission(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    const { granted } = await Island.requestPermission();
    try { sessionStorage.setItem(PERM_PROMPT_KEY, '1'); } catch { /* noop */ }
    return !!granted;
  } catch { return false; }
}

export async function openIslandPermissionSettings(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    const fn = Island.openOverlaySettings || Island.requestPermission;
    const { granted } = await fn.call(Island);
    return !!granted;
  } catch { return false; }
}

export function hasPromptedIslandPermission(): boolean {
  try {
    return sessionStorage.getItem(PERM_PROMPT_KEY) === '1';
  } catch { return false; }
}

export async function showIsland(track: {
  title: string;
  artist: string;
  cover?: string;
  isPlaying: boolean;
}): Promise<void> {
  if (!isAndroid()) return;
  if (!(await canShowIsland())) return;
  try {
    await Island.show(track);
    attachListener();
  } catch { /* noop */ }
}

export async function updateIsland(state: {
  isPlaying?: boolean;
  position?: number; // seconds
  duration?: number; // seconds
}): Promise<void> {
  if (!isAndroid()) return;
  try { await Island.update(state); } catch { /* noop */ }
}

export async function hideIsland(): Promise<void> {
  if (!isAndroid()) return;
  try { await Island.hide(); } catch { /* noop */ }
}
