# Native Android sources injected at build time

These Java files are copied into `android/app/src/main/java/<pkg>/media/` by
`.github/workflows/build-android.yml` (which also patches `MainActivity.java`,
`AndroidManifest.xml`, and adds the required permissions).

- `MediaNotificationPlugin.java` — Capacitor plugin (JS bridge)
- `MediaNotificationService.java` — Foreground service + MediaSessionCompat + MediaStyle notification

JS side: `src/lib/nativeMusicControls.ts` calls this via `Capacitor.Plugins.MediaNotification`.
