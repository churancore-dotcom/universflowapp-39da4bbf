# Premium Value + Stability Plan

A 3-phase plan, ordered by impact-per-hour. We ship phase 1 first (stabilize), then phase 2 (irresistible Premium), then phase 3 (polish + conversion).

---

## Phase 1 — Kill the bugs (ship first)

Known issues from current logs/usage:

1. `MEDIA_ELEMENT_ERROR: Empty src attribute` — player auto-skip storm when a track has no resolved URL. Fix: in `PlayerContext`, skip *before* assigning empty src; mark dead tracks for the session so we don't loop on them.
2. `Failed to fetch dynamically imported module: DownloadQueuePanel.tsx / nativeMusicControls.ts` — stale chunk after deploy. Fix: wrap dynamic imports with a one-time `window.location.reload()` retry, and add a version query to chunk URLs.
3. `fetchPriority` React warning on `<img>` — switch to lowercase `fetchpriority` or drop the prop on non-supporting React.
4. "Username is locked (can only be set once)" shown as scary `ERROR MATRIX` — downgrade to a soft inline hint, not a red error.
5. Profile flashing "not premium" for premium users (already patched in `usePremium`) — verify on slow network and add a "checking…" skeleton instead of the free-tier UI as default.
6. APK auto-logout on cold start without internet (already patched in `AuthContext`) — add a regression test path: launch APK in airplane mode, confirm session persists and Downloads page works.

Estimated: 1 short pass, no new tables.

---

## Phase 2 — Make Premium actually worth paying for

Right now Premium = "no ads + downloads + EQ". That's table stakes. Add **3 features users can't get free anywhere else** in our niche:

### 2A. Lossless / Hi-Fi Audio toggle (Premium only)
- Settings → Playback → "Hi-Fi (Lossless when available)" switch, gated by `usePremium`.
- For catalog songs, prefer the highest-bitrate URL we have; for YouTube streams, pick the best `itag`.
- Show a small "HiFi" chip on the MiniPlayer when active. This is the single biggest reason audiophiles pay for Tidal/Apple Music.

### 2B. Premium-only Early Releases shelf on Home
- New section "Premium First" on Home, only visible to premium users (free users see a teaser card → upgrade).
- Backed by existing `is_premium_only` flag on `songs` (already in schema). Admin can mark any song.
- This makes Premium *visible* every time they open the app.

### 2C. Unlimited Skips + No Pre-roll Ads (already exists) + Background Downloads
- Free tier: cap skips at 6/hour (industry standard), show "Skip limit — upgrade for unlimited".
- Cap simultaneous downloads at 3 for free, unlimited for Premium.
- Cap offline library at 30 songs for free, unlimited for Premium.

These three create a *daily* friction point that converts.

### 2D. Studio EQ Presets (Premium)
- Free users get the 8-band EQ but only "Flat". Premium unlocks 8 named presets (Bass Boost, Vocal, Late Night, Cinema, etc.) + ability to save custom presets to their account.

---

## Phase 3 — Polish + conversion UX

1. **Premium badge everywhere** — small crown next to username on Profile, in comments, on shared playlist cards. Social proof.
2. **Upgrade CTA placement** — when free user hits a gated action (skip limit, HiFi toggle, premium-only song), show a slick bottom-sheet with the 3 top benefits + price, not a generic toast.
3. **`/premium` page rewrite** — lead with "What you unlock today" (concrete, with screenshots/icons of HiFi chip, Premium First shelf, unlimited skips), then price, then FAQ. Drop any feature we don't actually ship.
4. **First-week trial** — 7-day free trial promo code auto-applied on signup (uses existing `redeem_promo_code` RPC). Massive conversion lever.
5. **Renewal nudges** — 3-day and 1-day expiry pushes already exist in `process_premium_expiry_notifications`. Add an in-app banner too.

---

## Technical notes

- Schema additions needed for Phase 2:
  - `songs.is_premium_only boolean default false` — confirm exists, else migration.
  - `user_subscriptions` already has expiry + status; reuse `is_premium_user(uid)` RPC for all gating.
  - Free-tier skip counter: client-side rolling 60-min window in `localStorage`, server-side `api_rate_limits` row for abuse.
- All gating goes through one hook: `usePremium()` — no scattered checks.
- No new payment provider needed — existing UPI flow + promo codes stay as-is.

---

## Order of execution

1. Phase 1 fixes (1 pass)
2. Phase 2A Hi-Fi toggle + 2C skip/download caps (highest conversion lever)
3. Phase 2B Premium First shelf + 2D EQ presets
4. Phase 3 polish + 7-day trial

Reply "go" to start with Phase 1, or tell me to jump straight to a specific item.