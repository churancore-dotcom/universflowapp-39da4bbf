---
name: Auto-playlists (Made For You)
description: Layered Radio + Daily Mix + Discover Mix system backed by auto_playlists table and daily-mix-builder cron
type: feature
---
**Table:** `auto_playlists` (user_id, kind: radio|daily_mix|discover_mix, title, subtitle, tracks jsonb, cover_urls jsonb, generated_at, expires_at). RLS owner-only.

**Cron:** `daily-mix-builder-04-10-utc` runs nightly at 04:10 UTC, hits `/functions/v1/daily-mix-builder`.

**Logic (daily_mix):** For every user with ≥5 stream events in last 14d, bucket their played songs by primary artist, pick top 3 buckets, fetch up to 60 candidates per bucket from `stream_songs` via `ilike artist`, take 20, write one mix per bucket. Replaces prior daily_mix rows for that user.

**UI:** `AutoMixesSection` renders below `HomeBento` on `/home`. Reads via `useAutoMix()` hook. Empty state prompts "Play 5+ songs".

**Not yet built (TODO):** instant Radio button on song cards (kind='radio'), discover_mix using cross-user `user_song_scores`, long-press menu on SongCard.
