# Artist Experience — Premium Overhaul

Goal: every artist surface feels hand-crafted (Spotify-for-Artists / Apple-grade), not generic AI. Locked palette: Obsidian + Rose (`#0A0A0B` / `#141417` / `#FF2D55` / `#F5F5F7`). Mobile-first, with desktop refinements.

Shipped in 4 focused turns so each surface lands polished, not half-done.

---

## Turn 1 — Onboarding (Apply + Status + Auth)

New flow at `/artist/auth → /artist/apply → /artist/status`.

- **Cinematic intro** on `/artist/auth`: full-bleed obsidian gradient, slow rose aurora, kinetic headline ("Your sound. Our stage."), one CTA. No marketing fluff stack.
- **5-step wizard** `/artist/apply` with progress rail, step transitions (framer-motion), persisted draft in localStorage:
  1. Identity (stage name, real name, country)
  2. Socials (live preview chips, validator)
  3. ID document (upload with frame guide, doc-type aware)
  4. Selfie (existing FaceLivenessCapture, restyled)
  5. Press photo + review screen
- **Status page**: timeline component (Submitted → Under Review → Decision) with live ETA copy, animated rose pulse on current step. Rejected state shows reason in a quote-block + countdown card to re-apply.

## Turn 2 — Artist Studio (Overview + Analytics)

- **Overview** rebuilt as a Bento grid: hero "Today" card (live listeners count w/ pulse), monthly listeners spark, top track card with mini-waveform, fan-map preview, latest follower stream.
- **Analytics**: real charts (Recharts) — 28-day plays line, demographics donut, top cities bar, save-rate gauge. Time-range pills. Empty states with art, not gray boxes.
- New **Audience Map** card (country heat list, no maps lib — pure CSS bars sorted).
- New **Revenue placeholder card** (Coming soon, branded — not a TODO).

## Turn 3 — Upload Wizard

`/artist/studio/upload` rebuilt as 3-step wizard:

1. **Source** — URL paste with live host validation, format detection, duration probe.
2. **Cover & Metadata** — drag/drop cover with square cropper, AI title-case suggest, genre/mood chips, explicit toggle, release date picker.
3. **Review & Publish** — full preview card identical to how it'll render in the app, publish animation (rose burst → "It's live").

Plus: drafts auto-saved, waveform preview after URL load (Web Audio peaks), share-kit modal post-publish.

## Turn 4 — Public Artist Page `/a/:slug`

- **Editorial hero**: parallax banner, large stage name in display font, verified rose check, monthly-listener badge, follow CTA (sticky on scroll).
- **Top Tracks** list with play counts + inline play.
- **About** card with social link chips.
- **Share kit** (copy link, story image gen, X/IG deep links).
- **SEO**: structured data (MusicGroup schema), OG image per artist.

---

## Technical notes

- New shared primitives in `src/components/artist/`: `StepRail.tsx`, `BentoCard.tsx`, `StatPill.tsx`, `Waveform.tsx`, `EmptyArt.tsx`.
- Display font: add `@fontsource-variable/fraunces` (editorial serif for hero numbers/names) paired with existing sans. Body stays current.
- Tokens added to `index.css`: `--rose-glow`, `--obsidian-1/2/3`, `--shadow-hero`, `--gradient-aurora`.
- No backend schema changes needed for Turns 1, 3, 4. Turn 2 adds two RPCs: `get_artist_overview_stats(_user_id)` and `get_artist_audience_breakdown(_user_id)` (read-only, security-definer, owner-scoped).
- All existing data hooks (`useArtistLive`) reused — pure presentation rebuild on top.

---

## Ship order

I'll do **Turn 1 (Onboarding) now**, then check in with a screenshot. You approve → I roll Turn 2, etc. This keeps each surface tight instead of one giant blurry PR.

Reply **"go"** to start Turn 1, or tell me to reorder (e.g. "do Studio first").
