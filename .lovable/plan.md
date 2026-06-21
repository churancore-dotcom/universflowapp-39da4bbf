
# Full sweep — 4 fixes for 400 real users

Goal: make Universflow feel like a real product. Clean catalog, instant playback, smart mixes, music that never dies in your pocket.

Build order is by risk — playback safety first, then catalog, then intelligence.

---

## 1. Spam / fake-song killer (STRICT mode) — `yt-music-search` + `chart-aggregator`

Today the YT extractor leaks "sped up", "slowed + reverb", karaoke, instrumental, lyric videos, AI covers, and random reupload channels. We will:

- **Expand SPAM_PATTERN** to a single regex covering: `sped up`, `slowed`, `reverb`, `8d`, `bass boost`, `karaoke`, `instrumental`, `cover by`, `cover version`, `lyric video`, `with lyrics`, `lofi remix`, `nightcore`, `mashup`, `tutorial`, `reaction`, `whatsapp status`, `ringtone`, `loop`, `1 hour`, `extended`, `tiktok version`, `audio only`, `unofficial`, `fan made`, `ai cover`, `ai voice`.
- **Channel allow-list signal**: prefer results from channels with `Official Artist Channel` badge, `VEVO`, or subscriber count ≥ 100k. Below 10k subs + suspicious title → drop.
- **Duration sanity**: drop tracks <60s (clips) or >9min unless title contains `mix`/`set` opt-in.
- **Title-first matching**: when user searches "Blinding Lights", the result title must contain `blinding lights` as a contiguous substring after normalization — no fuzzy junk.
- **Apply same filter to `chart-aggregator`** so Trending Now never shows karaoke covers.
- **Bust `searchCache`** version once (bump cache key prefix) so old polluted results vanish.

This is the highest-impact change for perceived quality. Memory `[Search Strategy]` already documents the philosophy; we just enforce it harder.

## 2. Auto-playlists — layered (Radio + Personal Mix + Discover Mix)

We already have `src/lib/playlistEngine.ts` (tag + collab + trending, cold-start aware). We will wire it to the UI and add layers:

- **Instant Radio** (works from play #1): tap any song → "Start Radio" generates a 20-song queue via the engine using only seed tags + trending. No history needed.
- **Made For You — Daily Mix** (unlocks at 20+ plays): one auto-mix per top-genre cluster, refreshed every 24h by a new edge function `daily-mix-builder` on pg_cron at 04:00 user-local-ish (UTC for now).
- **Discover Mix** (unlocks at 100+ active users globally): collaborative filtering layer kicks in automatically — engine already supports it via `user_song_scores`.
- **DB**: new `auto_playlists` table (user_id, kind, seed_song_id, tracks jsonb, generated_at, expires_at) with RLS owner-only.
- **UI**: new `AutoMixesSection` on Home, between "Jump Back In" and "Moods". Empty state shows "Play 5 songs to unlock your mix".
- **Long-press menu** on any song card → "Start Radio".

## 3. Song-start delay fix

Root causes from the codebase: stream-proxy is wrapped even when not needed, `getSongStreamUrl` waits on a cold YT extract, and we don't preload track #2 until after #1 starts.

- **Eager URL resolution**: as soon as user taps a card, resolve URL in parallel with the play-intent animation — don't wait for AudioContext unlock.
- **Two-track lookahead**: when track N starts playing, immediately resolve URL for N+1 and N+2 (today we only do N+1, per memory). Already partially done — verify and harden.
- **Skip stream-proxy when EQ flat**: `streamProxy.ts` already documents this; audit `PlayerContext` to confirm we actually skip it on cold start.
- **Edge cache**: `yt-music-search` results cached in `stream_songs` table for 24h — check, then on repeat plays we skip extraction entirely.
- **Add `perf_event`** for `time_to_first_byte` so we can see the win on `/admin/performance`.

## 4. Background playback hardening (Android + web)

- **Audit `MediaSessionManager` + native `MusicService.kt`**: confirm `MediaSession` stays active during track transitions (lose-then-regain is what kills lock-screen controls).
- **Wake lock**: ensure `PARTIAL_WAKE_LOCK` held only while playing, released on pause to save battery.
- **Foreground service notification**: verify it's started BEFORE `play()` not after (Android 14 hard requirement).
- **Web**: `navigator.mediaSession` action handlers re-registered on every track change (today they leak).

---

## Technical section

**Files touched (new):**
- `supabase/functions/daily-mix-builder/index.ts` — runs nightly, picks top 3 genre clusters per active user, calls `runPlaylistEngine`, writes `auto_playlists`.
- `src/components/AutoMixesSection.tsx` — Home rail with 3 mix cards.
- `src/components/RadioButton.tsx` — "Start Radio" CTA.
- `src/hooks/useAutoMix.ts` — fetches/subscribes to user's auto-playlists.

**Files touched (edited):**
- `supabase/functions/yt-music-search/index.ts` — expanded SPAM_PATTERN, channel/duration gates, title-first match.
- `supabase/functions/chart-aggregator/index.ts` — same spam filter applied before insert.
- `src/lib/searchCache.ts` — version bump invalidates polluted entries.
- `src/contexts/PlayerContext.tsx` — eager resolve, two-track preload audit, MediaSession re-register.
- `src/lib/streamProxy.ts` — verify EQ-flat bypass actually triggers.
- `src/components/HomeBento.tsx` — insert `AutoMixesSection`.
- `src/components/SongCard.tsx` — long-press → "Start Radio".
- `src/services/MediaSessionManager.ts` — re-register handlers per track.
- `android/app/.../MusicService.kt` — foreground-before-play order, wake lock lifecycle.

**Migration (one):**
- `auto_playlists` table + RLS + GRANTs + pg_cron job hitting `daily-mix-builder` at 04:00 UTC daily.

**Memory updates after build:**
- Append "Auto-playlists: layered Radio→Personal→Discover" to `mem://features/`.
- Update `mem://features/search-quality-filtering` with the new SPAM_PATTERN list.

---

## Risk + rollout

- All 4 changes are independent — if #3 misbehaves, #1/#2 still ship.
- Spam filter is the highest user-visible win and lowest risk (server-side only, cache bust handles old results).
- Daily-mix cron starts producing mixes immediately for any user with ≥20 plays; others see "play more" empty state — no broken UI.
- Background playback changes are Android-side; web users unaffected.

Approve and I'll build all four in order, verify each, then update memory.
