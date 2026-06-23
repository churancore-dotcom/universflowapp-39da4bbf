
# Artist Dashboard — Premium Rebuild

A complete reimagining of `/artist/studio/*`. Spotify-for-Artists aesthetic: dark, dense, premium, with live realtime pulses. Sidebar shell stays, every page gets rebuilt, plus two new pages (Notifications, Activity) and one redesigned upload flow restricted to Dropbox / Google Drive links.

## Pages & sections

```
/artist/studio                 Overview        Hero, live KPIs, sparkline, top song, recent activity
/artist/studio/upload          Upload          Dropbox/Drive only, with visual how-to
/artist/studio/songs           My Music        Status pills, inline stats, edit, delete
/artist/studio/songs/:id/edit  Edit Song       Title, genre, cover URL
/artist/studio/analytics       Analytics       Time-series chart, top songs, country map
/artist/studio/followers       Fans            Recent followers + growth sparkline
/artist/studio/activity        Activity Feed   New followers, milestones, status updates
/artist/studio/notifications   Notifications   Inbox-style, mark-read
/artist/studio/profile         Branding        Bio, photo, banner, socials, slug
```

## Upload flow (the core change)

- Field accepts ONLY:
  - `dropbox.com/s/...`, `dropbox.com/scl/...`, `dl.dropboxusercontent.com/...`
  - `drive.google.com/file/d/.../view`, `drive.google.com/open?id=...`, `drive.google.com/uc?id=...`
- Reject any other host (YouTube, Spotify, raw `.mp3` URLs, JioSaavn, etc.) inline with a clear red message.
- Auto-normalize on save:
  - Dropbox: rewrite `?dl=0` → `?dl=1`, swap host to `dl.dropboxusercontent.com` for direct streaming.
  - Drive: extract file ID and store as `https://drive.google.com/uc?export=download&id=<ID>`.
- Visual how-to card with two tabs (Drive | Dropbox), step icons, copy-link mock.
- New fields on upload: title, genre (select), cover art URL (also validated as https image link), source platform auto-detected badge.

## Analytics

- Aggregate KPIs (streams, listeners, followers, growth %) — live via realtime subscription on `artist_songs` and `artist_followers`.
- Time-series line chart (Recharts already in stack) with Day / Week / Month tabs, built from `song_play_events` for the artist's songs.
- Top songs ranking by selectable metric (existing pattern, restyled).
- Top countries derived from `song_play_events.country` — horizontal bar list with flag emoji. Falls back to "Locations available once you have plays" when empty.

## Music management

- Status pills: live, pending review, taken_down (rejected) — color-coded.
- Inline per-song stats row.
- Edit modal: title, genre, cover URL. Delete with confirm.
- Source-platform badge on each row (Drive / Dropbox).

## Profile & branding

- Bio (textarea, 280 char), profile photo upload, banner upload, social links (instagram, youtube, spotify, apple_music, twitter, website), slug display + "Copy public link" button.
- All edits via existing `artist_profiles` table; live preview card at top.

## Fan engagement

- Activity feed assembled client-side from:
  - `artist_followers` inserts (last 30d)
  - Milestone events (computed from `artist_songs` totals crossing 100 / 1k / 10k / 100k / 1M)
  - `artist_applications.status` changes
- Notifications page = same source, but persistent and dismissible (stored in `localStorage` keyed by `lastReadAt`).

## Design language

- Dark surface `bg-background` with `rgba(255,255,255,0.03)` cards and `0.5px` borders, rose accent `#FF2D55`.
- KPI numbers in tabular-nums, animated counter on realtime updates (extend existing `StatCard`).
- Sidebar gains: Activity, Notifications items; unread dot for notifications.
- Live indicator pulse in header — reuse existing.
- Framer-motion entry animations on every section.

## Technical notes

- No DB schema changes required. All needed columns already exist (`artist_songs.genre` exists? — verified below; if missing, add via migration in a small follow-up).
- All analytics built from existing tables: `song_play_events`, `artist_songs`, `artist_followers`, `artist_applications`.
- Realtime: extend `useArtistLive` to also subscribe to `artist_applications` for status updates.
- New helper `src/lib/artistUploadLinks.ts` for Drive/Dropbox detection + normalization with unit-testable pure functions.
- New `src/pages/artist/Activity.tsx`, `Notifications.tsx`, `EditSong.tsx`.
- Routes added in `src/App.tsx` under the existing `ArtistProtectedRoute`.
- Recharts is already a dependency (used elsewhere); no new packages.

## Out of scope (call out so it isn't expected)

- Server-side validation/transcoding of Drive/Dropbox links — links are stored as-is after client normalization; playback already streams external URLs.
- Comments system (the brief said "if applicable" — no comments table exists; skipped).
- Email/push notifications for milestones (in-app only this pass).
