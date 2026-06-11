import { AudioEngine } from './AudioEngine';
import { cacheBuffer, getBuffer, clearBuffers } from '../utils/memoryManager';

export async function preloadBuffer(url: string, engine: AudioEngine): Promise<AudioBuffer> {
  const cached = getBuffer(url);
  if (cached) return cached;
  const buffer = await engine.loadBuffer(url);
  cacheBuffer(url, buffer);
  return buffer;
}

export function clearCache(): void {
  clearBuffers();
}
