# Universflow

Current repository refresh: **v4.1 — June 24, 2026**.

Universflow is a mobile-first music streaming app with the dark Apple Music-style Bento UI, rose accents, real catalog search, synced lyrics, offline IndexedDB caching, artist tools, admin tools, and a Capacitor Android build.

## Current App Includes

- Mobile-only dark music UI with bottom navigation, mini player, full player, queue, library, search, profile, premium, settings, and offline screens.
- Real user music search through the existing `yt-music-search` backend function plus indexed catalog results.
- LRCLIB synced lyrics with active-line highlighting and auto-scroll.
- Song recognition through the `recognize-song` backend function.
- Artist platform with verification, Artist Studio, uploads, analytics, followers, activity, and public artist pages.
- Admin modules for content, users, subscriptions, payments, analytics, security, moderation, support, app updates, push notifications, and performance.
- Capacitor Android setup with native media controls, notification/lock-screen playback, Dynamic Island overlay support, push notifications, and APK build workflow.
- Repository docs: `REBUILD_PROMPT.md`, `SECURITY.md`, `CONTRIBUTING.md`, and `LICENSE`.

## Run Locally

```bash
npm install
npm run dev
```

The app runs on the local URL printed by Vite, usually `http://localhost:8080`.

## Build

```bash
npm run build
```

## Android APK Build

Use the current GitHub Actions workflow:

- **Build Android APK** (`.github/workflows/build-android.yml`)

The older `build.yml` workflow now delegates to the current Android workflow so it cannot build an outdated APK path.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS + shadcn-style primitives
- Lovable Cloud backend functions, database, auth, and storage
- Capacitor 8 for Android

## Full Rebuild Spec

See `REBUILD_PROMPT.md` for the complete full-app technical specification.
