import { useEffect, useState } from 'react';
import { connectAudioElement, setBands, setReverb, setSpatial, setLateNight, setStudioSpace as engineSetStudioSpace, resume, subscribe } from '@/lib/audioEngine';
import { getEQSettings, isEqActive } from '@/lib/eqSettings';

/**
 * Mount once at app root.
 *
 * Critical Android background-audio rule:
 *   - When EQ is FLAT (default state), do NOT create a MediaElementSource
 *     or touch the WebAudio graph at all. The <audio> element plays directly
 *     through Android's native MediaPlayer, which the foreground music
 *     notification service keeps alive on lock screen / in background with
 *     ZERO gaps.
 *   - When the user actually enables an EQ effect (slider, reverb, spatial,
 *     studio space, late-night, playback speed), THEN we attach WebAudio.
 *     Once attached the element is tainted forever (Web Audio limitation),
 *     but that's an acceptable trade because the user explicitly chose the
 *     effect.
 *
 * This single change eliminates the 2-4s lock-screen gap and the
 * background glitchiness that the WebAudio graph caused on Android WebView
 * (the AudioContext suspends when the WebView backgrounds).
 */
export function useGlobalAudioEngine(audioElement: HTMLAudioElement | null) {
  useEffect(() => {
    if (!audioElement) return;

    let reapplyTimer: number | null = null;
    // Once we've attached WebAudio for this element, we can't detach — the
    // MediaElementSource permanently routes audio through the graph. We just
    // keep re-pushing settings on every src/play change.
    let isAttached = false;

    const doReapply = () => {
      const s = getEQSettings();
      const wantsProcessing = isEqActive(s);

      // Always honor playback rate — it's a native <audio> property,
      // independent of WebAudio.
      audioElement.playbackRate = s.playbackSpeed;

      if (!wantsProcessing && !isAttached) {
        // Pure HTMLAudio path — best for Android background reliability.
        return;
      }

      // User has effects on (or had them on earlier this session) — attach
      // and push current settings.
      const ok = connectAudioElement(audioElement);
      if (ok) {
        isAttached = true;
        setBands(s.bands, s.bassBoost);
        setReverb(s.reverb);
        engineSetStudioSpace(s.studioSpace);
        setSpatial(s.spatialAudio);
        setLateNight(s.lateNight);
      }
    };

    // Coalesce loadstart+loadedmetadata+canplay bursts into a single rebuild.
    const reapply = (delay = 30) => {
      if (reapplyTimer != null) window.clearTimeout(reapplyTimer);
      reapplyTimer = window.setTimeout(() => {
        reapplyTimer = null;
        doReapply();
      }, delay);
    };
    const onMediaReady = () => reapply();

    const onPlay = () => {
      // Only resume the WebAudio context if we've ever attached. Calling
      // resume() on a non-existent context is a no-op but cleaner this way.
      if (isAttached) resume();
      if (isEqActive(getEQSettings())) reapply();
    };
    const onPointer = () => { if (isAttached) resume(); };

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden' && isAttached) resume();
    };

    // User toggled EQ in modal — apply right now.
    const onEqChanged = () => reapply(90);

    doReapply();
    audioElement.addEventListener('loadstart', onMediaReady);
    audioElement.addEventListener('loadedmetadata', onMediaReady);
    audioElement.addEventListener('canplay', onMediaReady);
    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('playing', onPlay);
    document.addEventListener('pointerdown', onPointer, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('uf-eq-changed', onEqChanged);

    return () => {
      if (reapplyTimer != null) clearTimeout(reapplyTimer);
      audioElement.removeEventListener('loadstart', onMediaReady);
      audioElement.removeEventListener('loadedmetadata', onMediaReady);
      audioElement.removeEventListener('canplay', onMediaReady);
      audioElement.removeEventListener('play', onPlay);
      audioElement.removeEventListener('playing', onPlay);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('uf-eq-changed', onEqChanged);
    };
  }, [audioElement]);
}

export function useEngineState() {
  const [mode, setMode] = useState(() => 'idle' as ReturnType<typeof import('@/lib/audioEngine').getState>);
  useEffect(() => subscribe(setMode), []);
  return mode;
}
