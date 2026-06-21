---
name: Dynamic Island (Android)
description: System-wide floating pill overlay shown over other apps when music plays in background. Native Android only (TYPE_APPLICATION_OVERLAY).
type: feature
---
Universflow Dynamic Island — a true system-wide overlay (Android only) that floats over other apps when music plays in background.

**Style:** Minimal Onyx — pure black pill, white text, pulsing rose (#FF2D55) dot. Tap = expand to mini card with prev / play-pause / next + slim rose progress bar + close (×). Long-press pill = open app.

**Native:**
- `android/app/src/main/java/com/universeflow/app/island/DynamicIslandPlugin.java` — Capacitor plugin (`DynamicIsland`).
- `android/app/src/main/java/com/universeflow/app/island/DynamicIslandService.kt` — WindowManager overlay, fully programmatic (no XML/drawables).
- Mirrored to `android-native/` kit.
- Requires `SYSTEM_ALERT_WINDOW` permission (added to AndroidManifest).
- Registered in `MainActivity.kt`.

**JS bridge:** `src/lib/dynamicIsland.ts` — `canShowIsland`, `requestIslandPermission`, `showIsland`, `updateIsland`, `hideIsland`, `setIslandHandlers`.

**Wiring:** `src/contexts/PlayerContext.tsx` listens to `@capacitor/app` `appStateChange` — shows island when app goes background while a song is loaded, hides on foreground. Permission prompt opens once per session on first background.

No-op on web and iOS.
