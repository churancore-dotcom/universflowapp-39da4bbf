---
name: Lock Screen Synced Lyrics
description: LRCLIB primary + Genius fallback synced lyrics shown full-screen on lock screen with live highlighting
type: feature
---
Lyrics are sourced via the `lyrics` edge function:
- Primary: LRCLIB (free, no key) — returns LRC synced lyrics + plain fallback
- Secondary: Genius API (GENIUS_ACCESS_TOKEN) — only returns a "View on Genius" URL (Genius ToS forbids returning lyric text)

Client lib: `src/lib/lyrics.ts` — parses LRC `[mm:ss.xx]` tags, binary-searches active line by playback time, caches results 7 days in localStorage.

UI: `src/components/SyncedLyricsView.tsx` — large active line, dim past/future lines, auto-scroll, soft mask gradient. Falls back to plain text or "View on Genius" link if no lyrics found.

Lock screen integration: `LockScreenPlayer` shows lyrics by default. User toggles between lyrics view and artwork view via Mic2 button on the now-playing widget. Preference persists in `localStorage` key `uf_lockscreen_lyrics`.

Lyrics are NOT shown anywhere else in the app — only on lock screen — to preserve the minimalist aesthetic everywhere else.
