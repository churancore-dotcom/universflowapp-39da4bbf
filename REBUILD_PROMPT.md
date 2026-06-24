# UniversFlow — Complete Technical Specification for Full App Rebuild

**Version:** 4.0 — Refreshed Edition  
**Last Updated:** June 2026  
**Brand:** UniversFlow only  
**Primary Domain:** https://universflow.in

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Design System & CSS Tokens](#3-design-system--css-tokens)
4. [Project File Structure](#4-project-file-structure)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Player Engine Architecture](#6-player-engine-architecture)
7. [Core Contexts & Providers](#7-core-contexts--providers)
8. [Routes, Pages & Navigation](#8-routes-pages--navigation)
9. [Component Inventory](#9-component-inventory)
10. [Edge Functions](#10-edge-functions)
11. [Database Schema (Lovable Cloud)](#11-database-schema-lovable-cloud)
12. [Mobile & Capacitor Build](#12-mobile--capacitor-build)
13. [Android Native Features](#13-android-native-features)
14. [Offline & Download Architecture](#14-offline--download-architecture)
15. [Performance & Caching](#15-performance--caching)
16. [Security & Hardening](#16-security--hardening)
17. [SEO, Meta & Discovery](#17-seo-meta--discovery)
18. [Error Handling](#18-error-handling)
19. [Premium Features](#19-premium-features)
20. [Artist Platform](#20-artist-platform)
21. [Repository Documentation](#21-repository-documentation)
22. [Summary](#22-summary)

---

## 1. Project Overview

**UniversFlow** is a premium, mobile-first music streaming application.

### Core traits
- **Mobile-only UI** — single viewport height (`h-[100dvh]`), touch-first, no hover states.
- **Apple Music Bento-style dark UI** — pure black background, rose accent (#FF2D55), heavy blurs restricted to static backgrounds.
- **Streaming audio** — YouTube Music / catalog audio extracted via Piped → Invidious → Cobalt fallback chain, plus an internal stream proxy for Web Audio effects.
- **Offline playback** — IndexedDB audio blob caching for catalog songs (free for all users).
- **Synced lyrics** — LRCLIB-powered line-by-line lyrics with active-line highlighting and auto-scroll (karaoke-style lock-screen view + in-app lyrics sheet).
- **Song recognition** — AudD-powered “Shazam-like” mic recording via `recognize-song` edge function.
- **Real user search** — title-first YouTube Music + indexed-track search with spam filtering, hidden results, and direct playback.
- **Social / artist features** — UGC artist verification (KYC), Artist Studio, follow artists, share codes, song dedications, reactions, comments, playlists.
- **Premium** — promo-code subscriptions, smart crossfade, gapless pro, headphone 3D surround, studio spaces, late night mode.
- **Admin panel** — 20+ modules for content, users, analytics, moderation, promo codes, push notifications, performance monitoring.
- **Android native** — Capacitor 8 APK, native media controls, dynamic island, lock-screen lyrics, push notifications, widgets.
- **Backend** — Lovable Cloud Supabase (immutable), auth, Postgres, edge functions, Realtime, storage.

### Hard constraints (never change)
- No React.StrictMode.
- No PWA service worker (legacy SWs are unregistered on startup).
- No native device downloads (cache-only via IndexedDB).
- No Google OAuth.
- No AI DJ, no visualizer in the main interface, no sleep timer in the main interface.
- Brand as “UniversFlow” only; no personal attributions in the app.

### Target
- Min SDK 22.
- Optimized for mid-range devices such as Vivo Y28s 5G.
- 8 GB storage limit; prefer external URL uploads and YouTube for catalog.

---

## 2. Technology Stack

### Frontend
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "typescript": "^5.8.3",
  "vite": "^5.4.19",
  "tailwindcss": "^3.4.17",
  "framer-motion": "^12.26.1",
  "@tanstack/react-query": "^5.83.0",
  "lucide-react": "^0.462.0",
  "sonner": "^1.7.4",
  "recharts": "^2.15.4",
  "next-themes": "^0.3.0",
  "zod": "^3.25.76",
  "date-fns": "^3.6.0",
  "vaul": "^0.9.9",
  "class-variance-authority": "^0.7.1",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7"
}
```

### Mobile / Native bridge
```json
{
  "@capacitor/core": "^8.0.1",
  "@capacitor/android": "^8.0.1",
  "@capacitor/cli": "^8.0.1",
  "@capacitor/app": "^8",
  "@capacitor/device": "^8.0.0",
  "@capacitor/local-notifications": "^8",
  "@capacitor/push-notifications": "^8.0.3",
  "median-js-bridge": "^2.12.0",
  "@lovable.dev/cloud-auth-js": "^1.0.0"
}
```

### Backend (Lovable Cloud)
```json
{
  "@supabase/supabase-js": "^2.90.1",
  "supabase-edge-functions": "Deno runtime"
}
```

### Radix / shadcn UI primitives
- `@radix-ui/react-dialog`, `@radix-ui/react-slider`, `@radix-ui/react-tabs`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-progress`, `@radix-ui/react-toast`, `@radix-ui/react-avatar`, `@radix-ui/react-label`, `@radix-ui/react-slot`.

---

## 3. Design System & CSS Tokens

### HSL variables (`src/index.css`)
```css
:root {
  --background: 0 0% 0%;          /* Pure black */
  --foreground: 0 0% 98%;         /* Near white */
  --card: 0 0% 7%;
  --card-foreground: 0 0% 98%;
  --popover: 0 0% 10%;
  --popover-foreground: 0 0% 98%;
  --primary: 350 100% 60%;        /* Rose/Red */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 12%;
  --secondary-foreground: 0 0% 98%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 55%;
  --accent: 330 100% 65%;         /* Pink/Magenta */
  --accent-foreground: 0 0% 100%;
  --destructive: 0 85% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 15%;
  --input: 0 0% 12%;
  --ring: 350 100% 60%;
  --radius: 0.75rem;

  --gradient-start: 350 100% 60%;
  --gradient-mid: 330 100% 65%;
  --gradient-end: 280 100% 65%;

  --glow-primary: 350 100% 60%;
  --glow-accent: 330 100% 65%;
  --glow-purple: 280 100% 65%;
  --glow-cyan: 185 100% 55%;
  --glow-green: 145 100% 50%;
  --glow-orange: 25 100% 55%;

  --glass-bg: 0 0% 8% / 0.85;
  --glass-border: 0 0% 100% / 0.08;
  --glass-blur: 40px;

  --surface-elevated: 0 0% 10%;
  --surface-overlay: 0 0% 6%;

  --sidebar-background: 0 0% 4%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 350 100% 60%;
  --sidebar-primary-foreground: 0 0% 100%;

  --success: 145 80% 50%;
  --warning: 40 100% 55%;
  --info: 200 100% 55%;
}
```

### Font stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif;
```
Google Fonts loaded in `index.css`: Barlow, Bebas Neue, SF Pro Display, SF Pro Text, Inter, Instrument Serif, Work Sans.

### Tailwind config
- Mobile-only breakpoints: only `xs: 375px`.
- Font families: `sans: Barlow/Inter`, `display: Bebas Neue/Space Grotesk/Inter`, `body: Barlow/Inter`.
- Keyframes: `fade-in`, `fade-out`, `scale-in`, `slide-up`, `slide-down`, `ios-bounce`, `pulse-glow`, `spin-slow`, `float`.

### Key CSS classes
- `.glass` / `.glass-strong` / `.glass-ultra` — iOS glassmorphism.
- `.uf-bento-card` — rounded-3xl card with subtle border.
- `.uf-display-title` — display font, wide tracking.
- `.uf-rose-gradient` / `.uf-rose-text` / `.uf-peach-text` — rose/peach accents.
- `.gradient-text` / `.gradient-text-gold` / `.gradient-text-ocean` — gradient text.
- `.glow-primary` / `.glow-accent` / `.glow-purple` / `.glow-cyan` / `.glow-multi` — glow shadows.
- `.btn-premium` / `.btn-glass` / `.btn-glow` — premium buttons.
- `.ios-card` / `.ios-input` / `.ios-list-item` / `.ios-tab-bar` — iOS surfaces.
- `.player-bar` / `.progress-glow` / `.waveform-bar` — player chrome.
- `.dynamic-island` — Dynamic Island-style blur pill.
- `.hide-scrollbar` / `.safe-area-pb` / `.safe-area-pt` — utilities.

### Mobile-only constraints
```css
html { overflow: hidden; height: 100%; touch-action: manipulation; }
body { position: fixed; inset: 0; user-select: none; overscroll-behavior: none; }
img { pointer-events: none; user-drag: none; }
```

### Themes
Theme engine supports:
- Obsidian (default, pure black + rose)
- Pearl (light)
- Onyx (OLED deeper black)
- Sunset
- Aurora
- Midnight Gold

`html.light` overrides in `index.css` flip hardcoded dark surfaces to light-compatible colors.

### WebView / reduced-motion fallbacks
```css
@supports not (backdrop-filter: blur(10px)) {
  .glass, .ios-card { backdrop-filter: none !important; background: rgba(28,28,30,0.95) !important; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 4. Project File Structure

```
.
├── .env
├── .github/workflows/
│   ├── build.yml
│   └── build-android.yml
├── .lovable/plan.md
├── android/
│   └── app/src/main/java/com/universeflow/app/
│       ├── MainActivity.kt
│       ├── AudioFocusPlugin.kt
│       ├── MusicService.kt
│       └── island/ (DynamicIsland plugin + service)
├── android-config/
│   └── google-services.json
├── android-native/
│   └── README.md + Kotlin/Java reference files
├── capacitor.config.ts
├── capacitor.config.prod.ts
├── components.json
├── CONTRIBUTING.md
├── eslint.config.js
├── index.html
├── LICENSE
├── package.json
├── postcss.config.js
├── public/
│   ├── manifest.json
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── llms.txt
│   ├── placeholder.svg
│   └── .well-known/
├── README.md
├── REBUILD_PROMPT.md
├── SECURITY.md
├── scripts/generate-sitemap.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── vite-env.d.ts
│   ├── assets/
│   │   ├── splash.mp4.asset.json
│   │   └── avatars/ (*.mp4.asset.json)
│   ├── components/
│   │   ├── AddSongsToPlaylistModal.tsx
│   │   ├── AddToPlaylistModal.tsx
│   │   ├── AlbumsShelf.tsx
│   │   ├── AllSongsSection.tsx
│   │   ├── AnimatedLyricsStage.tsx
│   │   ├── AnnouncementBanner.tsx
│   │   ├── ArtistPicker.tsx
│   │   ├── AvatarPickerModal.tsx
│   │   ├── BottomNav.tsx
│   │   ├── ChartSection.tsx
│   │   ├── CountryViralSection.tsx
│   │   ├── CreatePlaylistModal.tsx
│   │   ├── CrossDeviceResumeCard.tsx
│   │   ├── DownloadAllButton.tsx
│   │   ├── DownloadButton.tsx
│   │   ├── DownloadQueuePanel.tsx
│   │   ├── EmailVerificationCard.tsx
│   │   ├── EqualizerModal.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── FaceLivenessCapture.tsx
│   │   ├── FeaturedArtistsSection.tsx
│   │   ├── FollowArtistButton.tsx
│   │   ├── FollowedArtistSongsSection.tsx
│   │   ├── FollowedArtistsRail.tsx
│   │   ├── Footer.tsx
│   │   ├── FreshReleasesSection.tsx
│   │   ├── FullscreenPlayer.tsx
│   │   ├── GlobalPlayerLayer.tsx
│   │   ├── GlobalTopTracksSection.tsx
│   │   ├── HomeBento.tsx
│   │   ├── HorizontalSection.tsx
│   │   ├── KaraokeLyricsStage.tsx
│   │   ├── LikeButton.tsx
│   │   ├── LockScreenArtwork.tsx
│   │   ├── LockScreenBackground.tsx
│   │   ├── LockScreenPlayer.tsx
│   │   ├── MiniPlayer.tsx
│   │   ├── MobileShell.tsx
│   │   ├── OfflineGate.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── OfflinePlayerShell.tsx
│   │   ├── OptimizedImage.tsx
│   │   ├── PageSkeletons.tsx
│   │   ├── PageTransition.tsx
│   │   ├── PinToViralButton.tsx
│   │   ├── PlaylistCover.tsx
│   │   ├── PremiumBadge.tsx
│   │   ├── PremiumFirstSection.tsx
│   │   ├── PremiumLockOverlay.tsx
│   │   ├── PullToRefresh.tsx
│   │   ├── QueueDrawer.tsx
│   │   ├── RateUsPopup.tsx
│   │   ├── RecognizeSongButton.tsx
│   │   ├── RedeemCodeModal.tsx
│   │   ├── ReviewModal.tsx
│   │   ├── ReviewsSheet.tsx
│   │   ├── RoseHero.tsx
│   │   ├── SEOHead.tsx
│   │   ├── SentryErrorBoundary.tsx
│   │   ├── SettingsUpdateButton.tsx
│   │   ├── SleepTimerModal.tsx
│   │   ├── SocialShareModal.tsx
│   │   ├── SplashScreen.tsx
│   │   ├── StructuredData.tsx
│   │   ├── SupportChatModal.tsx
│   │   ├── SyncedLyricsView.tsx
│   │   ├── ThemeAura.tsx
│   │   ├── TrendingNowSection.tsx
│   │   ├── VideoAvatar.tsx
│   │   ├── ads/PrerollAd.tsx
│   │   ├── player/ (album-art animations)
│   │   └── ui/ (shadcn components)
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── DownloadContext.tsx
│   │   ├── NavDirectionContext.ts
│   │   └── PlayerContext.tsx
│   ├── hooks/
│   │   ├── useAudioPlayer.ts
│   │   ├── useAutoMix.ts
│   │   ├── useEmailVerified.ts
│   │   ├── useGlobalAudioEngine.ts
│   │   ├── useHaptics.ts
│   │   ├── useLike.ts
│   │   ├── useMediaSession.ts
│   │   ├── useNetworkGuard.ts
│   │   ├── usePlaybackSync.ts
│   │   ├── usePlayer.ts
│   │   ├── usePremium.ts
│   │   ├── usePullToRefresh.ts
│   │   ├── usePushRegistration.ts
│   │   ├── useSongCache.ts
│   │   └── useTasteProfile.ts
│   ├── integrations/
│   │   ├── lovable/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── types.ts
│   ├── lib/
│   │   ├── animations.ts
│   │   ├── artist.ts
│   │   ├── artistRouting.ts
│   │   ├── artistUploadLinks.ts
│   │   ├── assetUrl.ts
│   │   ├── audioEngine.ts
│   │   ├── auditLog.ts
│   │   ├── avatars.ts
│   │   ├── curatedArtists.ts
│   │   ├── deviceId.ts
│   │   ├── dynamicIsland.ts
│   │   ├── eqSettings.ts
│   │   ├── errorMessages.ts
│   │   ├── geoCountry.ts
│   │   ├── imageCompression.ts
│   │   ├── indexedArtists.ts
│   │   ├── jiosaavn.ts
│   │   ├── localRecentlyPlayed.ts
│   │   ├── lockscreenState.ts
│   │   ├── lyrics.ts
│   │   ├── median.ts
│   │   ├── moodKeywords.ts
│   │   ├── musicIndexer.ts
│   │   ├── nativeMusicControls.ts
│   │   ├── perfMonitor.ts
│   │   ├── phoneValidator.ts
│   │   ├── playerProgressStore.ts
│   │   ├── playlistEngine.ts
│   │   ├── premiumState.ts
│   │   ├── searchCache.ts
│   │   ├── sentry.ts
│   │   ├── songHistory.ts
│   │   ├── songSupport.ts
│   │   ├── streamProxy.ts
│   │   ├── streamSongs.ts
│   │   ├── themeBoot.ts
│   │   ├── useFilePreview.ts
│   │   ├── userArtistPrefs.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── AllArtists.tsx
│   │   ├── ArtistDetail.tsx
│   │   ├── Auth.tsx
│   │   ├── CheckEmail.tsx
│   │   ├── Downloads.tsx
│   │   ├── GetApp.tsx
│   │   ├── Home.tsx
│   │   ├── Library.tsx
│   │   ├── ManageSubscription.tsx
│   │   ├── NotFound.tsx
│   │   ├── Offline.tsx
│   │   ├── PlaylistDetail.tsx
│   │   ├── Premium.tsx
│   │   ├── Profile.tsx
│   │   ├── Search.tsx
│   │   ├── Settings.tsx
│   │   ├── Support.tsx
│   │   ├── VerifyEmail.tsx
│   │   ├── Blog*.tsx (3 SEO blog pages)
│   │   ├── admin/ (20 modules)
│   │   ├── artist/ (8+ pages)
│   │   └── legal/ (4 pages)
│   ├── services/
│   │   ├── AudioBufferLoader.ts
│   │   ├── AudioEngine.ts
│   │   ├── MediaSessionManager.ts
│   │   └── NativeBridge.ts
│   ├── test/
│   │   ├── setup.ts
│   │   ├── example.test.ts
│   │   └── playlistEngine.test.ts
│   └── utils/
│       ├── memoryManager.ts
│       └── retry.ts
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── ai-metadata/index.ts
│       ├── artist-verify-checks/index.ts
│       ├── bootstrap-system-push/index.ts
│       ├── chart-aggregator/index.ts
│       ├── confirm-verification-link/index.ts
│       ├── daily-mix-builder/index.ts
│       ├── extract-audio/index.ts
│       ├── geo-detect/index.ts
│       ├── lyrics/index.ts
│       ├── mood-daily-push/index.ts
│       ├── music-indexer/index.ts
│       ├── recognize-song/index.ts
│       ├── send-push/index.ts
│       ├── send-system-push/index.ts
│       ├── send-verification-link/index.ts
│       ├── send-welcome-email/index.ts
│       ├── stream-proxy/index.ts
│       ├── telegram-notify/index.ts
│       ├── verify-registered-user/index.ts
│       ├── yt-innertube-search/index.ts
│       └── yt-music-search/index.ts
└── tailwind.config.ts
```

---

## 5. Authentication & Authorization

### Architecture
- Email/password signup and login (Lovable Cloud auth; no Google OAuth).
- Admin role detection uses the `user_roles` table via the `has_role()` RPC function.
- Profile auto-creation on signup via database trigger + client-side `ensureUserProfile()` fallback.
- Email verification gate: unverified users are redirected to `/check-email`; admins and legacy accounts bypass verification.
- Suspended/banned accounts are blocked at sign-in.
- Offline-aware session handling: do not wipe local session when `navigator.onLine` is false.

### AuthContext interface
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  emailVerified: boolean | null;
  isLoading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (email: string, password: string, username: string, countryCode?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshEmailVerified: () => Promise<void>;
}
```

### Route guards
- `ProtectedRoute` — requires auth + verified email.
- `ArtistProtectedRoute` — same, but unauth bounce to `/artist/auth`.
- `ListenerRoute` — verifies auth/verification + artist routing intent.
- `AdminRoute` — re-verifies `has_role` on every mount; returns `NotFound` on failure (cloak URL existence).

### Roles
Stored in a separate `public.user_roles` table; never in `profiles`. Roles: `admin`, `moderator`, `user`.

---

## 6. Player Engine Architecture

### Song interface
```typescript
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover_url?: string;
  audio_url: string;
  duration?: number;
  artist_id?: string;
  artist_photo_url?: string;
  play_count?: number;
}
```

### PlayerContext features
1. **Dual audio element system** — primary `audioRef` + secondary `nextAudioRef` for crossfade transitions; both created once and never re-mounted.
2. **YouTube IFrame fallback** — lazy-loaded `youtubePlayerRef` handles `audio_url = 'yt-video:<id>` URLs when extraction fails.
3. **Smart shuffle** — `shuffleHistory` Set avoids repeats until the queue is exhausted.
4. **Queue management** — `setQueue`, `addToQueue`, drag-and-drop reorder in `QueueDrawer`; last 100 songs persisted to `localStorage('player_queue_state')`.
5. **Crossfade** — configurable 1–12s, 30-step volume interpolation, audio refs swapped at completion; curves: `linear`, `equal-power`, `smooth`, `exponential`.
6. **Gapless Pro** — `gaplessPro` toggle; next track preloaded for seamless album playback.
7. **Pre-roll ads** — free users see an ad every 3 songs (`AD_FREQUENCY = 3`); `pendingSong` stored while the ad plays.
8. **Progress tracking** — `requestAnimationFrame` loop; decoupled via `playerProgressStore` (external store) for high-frequency updates.
9. **Background audio resilience** — `visibilitychange` + `focus` listeners resume interrupted playback; 5s keep-alive; `wasPlayingRef` tracks pre-background state.
10. **Buffering stall recovery** — 4s stall wait then nudge `audio.play()` if `readyState < 2`.
11. **CORS management** — `crossOrigin = 'anonymous'` applied only to known-safe hosts; `stream-proxy` used only when EQ is active.
12. **MediaSession** — metadata + action handlers (play, pause, next, previous, seek, seekbackward, seekforward).
13. **Recently played tracking** — fire-and-forget insert into `recently_played`.
14. **Cross-device resume** — `playback_state` table syncs song/queue/position.
15. **Two-track prefetch** — next track prefetched for gapless transitions.
16. **Native music controls** — Capacitor bridge for Android media notifications.
17. **Auto-mix** — extends the queue with recommendations when it runs out.

### PlayerContext methods
```typescript
interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: Song[];
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  isExpanded: boolean;
  crossfade: boolean;
  crossfadeDuration: number;
  crossfadeCurve: 'linear' | 'equal-power' | 'smooth' | 'exponential';
  gaplessPro: boolean;
  audioElement: HTMLAudioElement | null;
  showPrerollAd: boolean;
  adType: 'start' | 'end';

  playSong(song, offlineUrl?, songsQueue?);
  togglePlay();
  pause();
  play();
  stopSong();
  nextSong();
  prevSong();
  seek(time);
  setVolume(vol);
  setQueue(songs);
  addToQueue(song);
  toggleShuffle();
  toggleRepeat();
  setExpanded(expanded);
  toggleCrossfade();
  setCrossfadeDuration(seconds);
  setCrossfadeCurve(curve);
  toggleGaplessPro();
  onPrerollAdComplete();
}
```

### Audio engine / Web Audio
- `AudioEngine` service (`src/services/AudioEngine.ts`) for EQ, reverb, binaural crossfeed (headphone 3D), late-night loudness.
- `AudioBufferLoader` for prefetch.
- `audioEngine.ts` (`src/lib/audioEngine.ts`) helper functions.
- `stream-proxy` edge function proxies CORS-restricted external audio so Web Audio effects can be applied.
- `useGlobalAudioEngine` / `useAudioPlayer` hooks.
- EQ is active only when the user enables it; proxy usage gated by `isEqProcessingEnabled()` to avoid unnecessary latency.
- Stream URL formats handled: `http(s)://` direct CDN, `yt-video:<id>` IFrame fallback, `'resolving'` placeholder, `blob:` offline.

### Stream resolution chain (`src/lib/musicIndexer.ts`)
`resolveIndexedTrack(artist, title)` resolves a playable URL in this order:
1. **Memory cache** (`streamCache` Map, 55 min TTL) — instant return.
2. **DB cache** (`stream_songs` table, stale if > 4h) — shared fast cache.
3. **JioSaavn** (`findSongStreamUrl`) — direct CORS-safe CDN audio.
4. **music-indexer edge function** (`action=resolve`) — Piped/Invidious YouTube extraction.

The resolved URL is stored in `stream_songs` and returned to the player.

---

## 7. Core Contexts & Providers

### Provider hierarchy (`src/App.tsx`)
```tsx
<QueryClientProvider>
  <BrowserRouter>
    <AuthProvider>
      <PlayerProvider>
        <DownloadProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </DownloadProvider>
      </PlayerProvider>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
```

### QueryClient configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    },
  },
});
```

### DownloadContext
- IndexedDB audio cache (`uf-audio-cache`).
- Download queue, progress callbacks, batch operations.
- Blob URL creation/revocation, cache size via `navigator.storage.estimate()`.
- `isDownloaded`, `getDownloadedUrl`, `clearAllDownloads`.

### GlobalPlayerLayer
Mounts `MiniPlayer`, `FullscreenPlayer`, and `LockScreenPlayer` overlays globally.

---

## 8. Routes, Pages & Navigation

### Public / auth routes
- `/` — root gate (redirect to `/home`, `/auth`, or `/get` landing based on host).
- `/get`, `/download`, `/app`, `/apk` — APK landing page (only on `universflow.in`/`www.universflow.in`; otherwise redirects to `/auth`).
- `/auth` — login/signup.
- `/verify` — email verification handler.
- `/check-email` — unverified gate.
- `/offline-player` — offline-only shell (no auth).
- `/artist/auth` — artist auth gateway.
- `/a/:slug` — public artist page.
- `/artist/:artistId` — artist detail.
- `/legal/*` — legal pages.
- `/blog/*` — SEO blog pages.

### Protected user routes
- `/home`, `/search`, `/library`, `/profile`, `/settings`, `/support`, `/offline`, `/downloads`, `/subscription`, `/premium`, `/artists`, `/playlist/:id`.

### Artist program routes
- `/artist/apply`, `/artist/status`, `/artist/studio` (nested: upload, songs, analytics, followers, profile, activity, notifications).

### Admin routes (`/admin/*`)
- Dashboard, Upload, Songs, Artists, Playlists, Users, Subscriptions, Announcements, Moderation, Analytics, Live Insights, Activity Logs, System Health, Revenue, Listener Insights, Promo Codes, Payments, Notifications, Devices, Engagement, Security, Support, App Updates, Performance, Artist Applications.

### Home page (`/home`)
- Built as a Bento grid in `HomeBento.tsx`.
- Sections in order:
  1. **Hero — Continue Listening**: rose gradient card with current/last song and live progress.
  2. **Artist of the Week**: followed artist or top catalog/stream artist.
  3. **Jump Back In**: last 3 per-device recent songs from localStorage.
  4. **Moods**: chips (FOCUS, HYPE, CHILL, LATE NIGHT, RELAX, LOVE) → search by mood.
  5. **New Release**: most recent catalog song by `created_at`.
  6. **Global Top Tracks**: horizontal scroll of top trending songs.
- Data sources: `songs` catalog + `stream_songs` fallback; Supabase Realtime invalidation for `songs`, `stream_songs`, `user_library`.

### Search page (`/search`)
- 250ms debounced query input.
- `detectMoodAndLanguage(query)` infers mood/language tags.
- Parallel sources: `searchYouTubeMusicTracks`, `searchIndexedTracks`, `searchJioSaavnTracks`, `searchArtistDirectory`, plus tag-top tracks.
- `rankAndDedupeResults()` scores by title-first matching, token overlap, popularity (log10 listeners), source priority (library > indexer > youtube > tags).
- Spam filter removes covers/karaoke/sped-up/compilations and duration outliers (<75s or >540s unless long-form query).
- Hidden results: users can hide individual results; persisted to localStorage.
- Prefetch top-6 results immediately after render.
- Source filter: **All Songs** (merged) and **Worldwide** (indexer only).
- Artist card shown only when listeners ≥ 100,000 with a real photo.

### Bottom navigation
- 4 tabs: Listen Now (`/home`), Search (`/search`), Library (`/library`), Profile (`/profile`).
- Scroll-responsive hide/show.
- Glassmorphism background, rose active accent.

### MiniPlayer
- Fixed above bottom nav; swipe up → expand, left → next, right → previous.
- Materialization spring entrance.
- Progress bar, play/pause, next, close.

### FullscreenPlayer
- Full-screen overlay, drag-to-collapse.
- Blurred cover background, 85vw album art.
- Shuffle, prev, play/pause, next, repeat.
- Volume + progress scrubber, share, add-to-playlist, reactions, lyrics sheet.
- Artist link to `/artist/:id`.

### LockScreenPlayer
- Full-screen karaoke lyrics overlay.
- Wake lock to keep screen on.
- Swipe-up-to-dismiss.
- iOS-style animated background (sheen, orb, beam, aurora, halo).
- Uses `KaraokeLyricsStage` for synced lyrics.

---

## 9. Component Inventory

### Navigation & shell
- `MobileShell`, `BottomNav`, `MiniPlayer`, `FullscreenPlayer`, `LockScreenPlayer`, `GlobalPlayerLayer`, `PageTransition`, `SplashScreen`.

### Home / Bento
- `HomeBento`, `RoseHero`, `HorizontalSection`, `TrendingNowSection`, `FreshReleasesSection`, `ChartSection`, `GlobalTopTracksSection`, `CountryViralSection`, `FeaturedArtistsSection`, `FollowedArtistsRail`, `FollowedArtistSongsSection`, `AllSongsSection`, `PremiumFirstSection`.

### Player & media
- `KaraokeLyricsStage`, `AnimatedLyricsStage`, `SyncedLyricsView`, `LockScreenBackground`, `LockScreenArtwork`, `VideoAvatar`, `OptimizedImage`, `QueueDrawer`, `EqualizerModal`, `SleepTimerModal`.

### Social / library
- `LikeButton`, `FollowArtistButton`, `PinToViralButton`, `DownloadButton`, `DownloadAllButton`, `DownloadQueuePanel`, `AddToPlaylistModal`, `CreatePlaylistModal`, `AddSongsToPlaylistModal`, `PlaylistCover`, `SocialShareModal`, `ReviewsSheet`, `ReviewModal`, `RateUsPopup`, `ArtistPicker`, `AvatarPickerModal`.

### Search & discovery
- `Search` page, `RecognizeSongButton` (AudD mic recognition), `FollowedArtistsRail`.

### Offline / system
- `OfflinePlayerShell`, `OfflineGate`, `OfflineIndicator`, `PullToRefresh`, `PWAInstallBanner`, `AnnouncementBanner`, `SettingsUpdateButton`, `ErrorBoundary`, `SentryErrorBoundary`, `SEOHead`, `StructuredData`, `ThemeAura`, `PageSkeletons`.

### Admin / artist
- `AdminLayout` + 20 admin pages, `ArtistLayout` + artist pages, `FaceLivenessCapture` (KYC selfie).

### shadcn/ui primitives
`button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `select`, `sheet`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `tooltip`, `avatar`, `badge`.

### Ads
- `ads/PrerollAd` — skippable pre-roll audio ads for free users.

---

## 10. Edge Functions

### Content & streaming
- `extract-audio/index.ts` — YouTube video ID → audio stream URL via Piped/Invidious/Cobalt fallback.
- `stream-proxy/index.ts` — CORS proxy for external audio streams so Web Audio can process them.
- `music-indexer/index.ts` — indexes catalog metadata, admin uploads, YouTube Music fallback.
- `yt-music-search/index.ts` — YouTube Music search via Innertube / Piped proxies.
- `yt-innertube-search/index.ts` — Innertube metadata search.
- `ai-metadata/index.ts` — AI metadata extraction for uploaded audio.

### Lyrics & recognition
- `lyrics/index.ts` — LRCLIB → KuGou → Genius fallback chain for synced/plain lyrics.
- `recognize-song/index.ts` — AudD.io proxy: receives audio blob, returns title/artist/cover.

### Artist & verification
- `artist-verify-checks/index.ts` — KYC / verification checks.
- `verify-registered-user/index.ts` — registered-user verification.
- `confirm-verification-link/index.ts` — verification link handler.
- `send-verification-link/index.ts` — email verification link.
- `send-welcome-email/index.ts` — welcome email.

### Push, notifications, geo
- `send-push/index.ts` — FCM push notification sender.
- `send-system-push/index.ts` — system-wide pushes.
- `bootstrap-system-push/index.ts` — push bootstrapping.
- `mood-daily-push/index.ts` — mood-based daily push.
- `geo-detect/index.ts` — country/geo detection.
- `telegram-notify/index.ts` — Telegram admin alerts.

### Analytics & automation
- `chart-aggregator/index.ts` — global trending/viral charts from Apple, iTunes, Last.fm, Deezer.
- `daily-mix-builder/index.ts` — personalized daily mix.

---

## 11. Database Schema (Lovable Cloud)

### Enums
```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.subscription_platform AS ENUM ('android', 'ios', 'web', 'donation');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE public.subscription_type AS ENUM ('free', 'premium_monthly', 'premium_yearly');
```

### Core tables
- `profiles` — user_id, email, username, avatar_url, status, email_verified, share_code, username_changed, created_at, updated_at.
- `songs` — title, artist, artist_id, album, audio_url, cover_url, duration, genre, mood, bpm, play_count, download_count, is_visible, is_premium_only, show_in_new_releases, show_in_trending.
- `artists` — name, bio, photo_url, genre, is_verified, is_premium_only, social_links.
- `albums` — title, artist, cover_url, release_year.
- `user_roles` — separate roles table (user_id, role).
- `user_subscriptions` — user_id, subscription_type, status, platform, expires_at, transaction_id, purchase_token.
- `promo_codes` / `code_redemptions` — atomic promo code redemption.
- `playlists` / `playlist_songs` — user playlists + songs.
- `user_library` — liked songs.
- `recently_played` — play history.
- `friends` — friend requests.
- `song_dedications` — song dedications between users.
- `song_reactions` / `song_comments` — social reactions & comments.
- `content_reports` — moderation reports.
- `donations` — donation records.
- `announcements` — system announcements.
- `app_settings` — JSONB key/value config.
- `playback_state` — cross-device resume state.
- `perf_events` — performance monitoring events.
- `user_artist_preferences` — artist onboarding picks.
- `artist_applications` — UGC artist KYC applications.
- `registered_devices` — push/device tokens.
- `audit_logs` — security audit trail.
- `stream_songs` — indexed/external track metadata cache (keyPath `track_id`, used by search & stream resolution).
- `stream_url_cache` — YouTube stream URL cache (`video_id`, `audio_url`, `thumbnail`, `expires_at`).

### Key functions
- `handle_new_user()` — create profile + seed admin role for `shashankyadavk12@gmail.com`.
- `has_role(user_id, role)` — SECURITY DEFINER role check (used by RLS + admin route).
- `redeem_promo_code(code, user_id)` — atomic promo redemption + premium grant.
- `find_profile_by_share_code(share_code)` — friend referral lookup.
- `prevent_admin_field_change()` — block direct `is_admin` mutation on profiles.
- `update_updated_at_column()` — timestamp trigger.
- `check_and_increment_rate_limit(user_id, endpoint, max_per_minute)` — per-user rate limit.

### Storage buckets
- `music` — audio files.
- `covers` — cover images.
- `artist-photos` — artist profile photos.
- `documents` — KYC documents.

### Realtime
- `songs` table published for live home-page updates.
- `playback_state` published for cross-device resume sync.

### RLS & grants
Every new `public` table must have explicit `GRANT` statements in the same migration, then `ENABLE ROW LEVEL SECURITY`, then policies. `user_roles` grants `SELECT` to authenticated only (no anon). Tables accessed by edge functions must grant `ALL` to `service_role`.

---

## 12. Mobile & Capacitor Build

### Dev config (`capacitor.config.ts`)
- `appId: 'com.universeflow.app'`, `appName: 'Univers Flow'`.
- `server.url` points to Lovable sandbox for hot reload; `cleartext: true`.
- SplashScreen: 2s black background, spinner #FF2D55.
- StatusBar dark, Keyboard resize body, PushNotifications badge/sound/alert.
- Android: `captureInput: false` (required for IME composition), `hardwareBackButton: false`.

### Production config (`capacitor.config.prod.ts`)
- No `server.url` — assets bundled locally via `https://localhost`.
- `appId: 'app.lovable.id5acaae55bbc847a7bd32f3924d8ef986'` (must match Google Services JSON).
- 1.2s native splash, then React `SplashScreen` takes over.

### GitHub Actions (`build-android.yml`)
- Triggers: `workflow_dispatch` + push to `main` (ignoring `.md`/`.gitignore`).
- Node 22, Java 21 Temurin.
- `npm install --legacy-peer-deps`.
- Generate sitemap, build web with Supabase env vars from GitHub Secrets (fails hard if missing).
- Copy `capacitor.config.prod.ts` over `capacitor.config.ts`.
- `npx cap add android` (skips if `android/build.gradle` exists; merges `android-overlay/`).
- Install `android-config/google-services.json` into `android/app/`.
- Wire Firebase Gradle plugin (classpath + apply plugin + firebase-messaging dependency).
- Programmatically write `MainActivity.java` registering `MediaNotificationPlugin` + `DynamicIslandPlugin`.
- Integrate `MediaNotificationPlugin` sources from `android-native/java/` for lockscreen/notification controls.
- `npx cap sync android` and `./gradlew assembleDebug`.
- Upload `app-debug.apk` artifact.

### Required secrets
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## 13. Android Native Features

### Native plugins (`android/app/...`)
- `AudioFocusPlugin` — Android audio focus management.
- `MusicService` — background media playback service.
- `DynamicIslandPlugin` + `DynamicIslandService` — Android dynamic island / Now Playing overlay.
- `MediaNotificationPlugin` / `MediaNotificationService` — persistent media notification.
- MainActivity requests camera + microphone permissions upfront; grants WebView permissions for `getUserMedia`.

### Native widgets (reference in `android-native/`)
- Now Playing, Favorites, Recently Played, Quick Actions, Music Search.
- `src/lib/widgetBridge.ts` (or equivalent) syncs state via Capacitor bridge.

### Native bridge
- `median-js-bridge` lazy-loaded (`src/lib/median.ts`).
- Haptics via `useHaptics` (Median bridge + Web Vibration fallback).
- Face liveness / KYC capture via `FaceLivenessCapture`.

---

## 14. Offline & Download Architecture

### IndexedDB
- Database name: `MusicAppOffline`.
- Object store: `songs` (keyPath `id`); stores audio Blob, cover Blob, and full song metadata.
- `DownloadContext` wrapper manages all cache operations.
- Blob URLs created on demand from the stored Blob, revoked on removal/unmount.
- Storage quota awareness via `navigator.storage.estimate()`.

### Download UI
- `DownloadButton` per song, `DownloadAllButton` for batch, `DownloadQueuePanel` overlay.
- Catalog songs only; no user uploads / external direct URLs cached.
- Downloads are free for all users.

### Offline pages
- `/offline` — protected, downloaded songs.
- `/offline-player` — unprotected shell for offline-only playback.
- `OfflinePlayerShell` uses cached songs independently.
- `OfflineGate` / `OfflineIndicator` show online status.

---

## 15. Performance & Caching

### Rendering
- `React.memo` on song cards and list items.
- `React.lazy` + `Suspense` for all routes and heavy modals.
- No per-item staggered animation delays in large lists.
- Heavy blur only on static backgrounds.
- `playerProgressStore` decouples high-frequency progress updates from React state.

### Network
- React Query: 5-minute stale, 30-minute GC, no refetch on focus/mount/reconnect.
- Home songs fetched with `limit(1000)`.
- `useSongCache` localStorage metadata cache (5-minute TTL).
- Global like status batched into a single query.
- Supabase Realtime debounced 2 seconds.

### Images
- `OptimizedImage` with Intersection Observer lazy loading.
- IndexedDB image caching via `useImageCache`.
- `loading="lazy"` on non-critical images.

### Caching layers
| Layer | Storage | TTL | Content |
|-------|---------|-----|---------|
| Song metadata | localStorage | 5 min | Home list |
| React Query | memory | 5 min stale / 30 min GC | Supabase queries |
| Lyrics | localStorage | 7 days | LRCLIB results |
| Offline audio | IndexedDB | permanent | Audio blobs |
| Image cache | IndexedDB | permanent | Cover blobs |
| Search | localStorage | stable namespace | Search results |
| Onboarding | localStorage | permanent | `uf_onboarding_done`, artist picks |

### Recommended DB indexes
```sql
CREATE INDEX idx_songs_is_visible ON songs(is_visible);
CREATE INDEX idx_songs_artist_id ON songs(artist_id);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);
CREATE INDEX idx_user_library_user_id ON user_library(user_id);
CREATE INDEX idx_user_library_song_id ON user_library(song_id);
CREATE INDEX idx_recently_played_user_id ON recently_played(user_id);
CREATE INDEX idx_recently_played_played_at ON recently_played(played_at DESC);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
```

---

## 16. Security & Hardening

- Roles live in a separate `user_roles` table; never in `profiles`.
- Admin status verified server-side via `has_role` RPC on every `/admin` mount.
- Route cloak: failed admin check returns `NotFound` instead of redirect.
- Email verification gate; admins and legacy accounts bypass.
- JWT session kept alive offline; validated on reconnect.
- Banned/suspended accounts blocked at sign-in.
- Audit logging (`lib/auditLog.ts`) for login events.
- KYC documents auto-deleted after verification (configurable).
- No client-side storage of role/admin status.
- No anonymous sign-ups.
- Edge functions validate inputs, sizes, and origins.

---

## 17. SEO, Meta & Discovery

### `index.html`
- Cache-busting: `Cache-Control: no-cache, no-store, must-revalidate`.
- Title: “Univers Flow - Free Music Streaming & Download | Listen Offline”.
- Description, keywords, author, robots, canonical to `https://universflow.in/`.
- Open Graph + Twitter Card meta.
- JSON-LD via `StructuredData` component.

### Sitemap & robots
- `scripts/generate-sitemap.ts` runs in `predev` and `prebuild`.
- `public/sitemap.xml` and `public/robots.txt`.
- `public/llms.txt` for LLM discovery.

### SEO blog pages
- `/blog/free-music-download-apps-india`
- `/blog/universflow-vs-jiosaavn-vs-gaana`
- `/blog/trending-punjabi-songs-2026`

---

## 18. Error Handling

### Error message system (`src/lib/errorMessages.ts`)
- Maps PostgreSQL error codes (23505, 23503, 23514, 23502, 42501, 22P02, 22001) to user-friendly messages.
- Auth pattern matching (invalid credentials, email registered, weak password, rate limit).
- Network detection (`fetch failed`, timeout, abort).
- Specialized handlers: `getAuthError`, `getUploadError`, `getDatabaseError`.
- Full error logged to console; safe message returned to user.

### Sentry
- `src/lib/sentry.ts` initialized before React mounts.
- `SentryErrorBoundary` wraps the app.
- User context set on auth state change.

### Regional considerations
- Supabase domains may be blocked by ISPs in some regions (e.g., India).
- `Failed to fetch` may be infrastructure-level; app degrades to offline player shell.

---

## 19. Premium Features

Premium subscription is granted via promo codes (`redeem_promo_code` sets `premium_yearly` until 2099). Premium unlocks:

- **Smart Crossfade** — configurable 1–12s transitions.
- **Gapless Pro** — two-track prefetch, seamless album playback.
- **Headphone 3D Surround** — binaural crossfeed via Web Audio.
- **Studio Spaces** — reverb/EQ presets.
- **Late Night Mode** — loudness-compressed evening listening.
- Ad-free experience (no pre-roll ads).
- Premium badges and UI accents.

---

## 20. Artist Platform

### UGC artist flow
1. User applies at `/artist/apply`.
2. KYC identity capture via `FaceLivenessCapture`.
3. Application stored in `artist_applications`.
4. Admin reviews in `/admin/artist-applications`.
5. Verified artists get a rose checkmark badge and access to `/artist/studio`.

### Artist Studio
- Upload via external URL or YouTube URL (`extract-audio` pipeline).
- Songs management, analytics, followers, profile, activity, notifications.
- Public artist page at `/a/:slug`.

### Content rules
- External URL uploads preferred to save storage.
- YouTube catalog for search results.
- Verified artists can upload; unverified can apply only.

---

## 21. Repository Documentation

### `README.md`
Project overview, feature list, quick start, tech stack.

### `LICENSE`
MIT License (2025 SHASHANK YADAV).

### `SECURITY.md`
- Vulnerability reporting: `shashankyadavk12@gmail.com`.
- Maintainer response within 72 hours.
- Supported versions statement.

### `CONTRIBUTING.md`
- Clone project.
- Run locally with `npm run dev`.
- Submit pull requests.
- Code style: TypeScript, follow existing file structure, no `console.log` in production code.

### `REBUILD_PROMPT.md`
This document — the full technical specification for rebuilding the app from scratch.

---

## 22. Summary

This specification describes the current **UniversFlow** application as of June 2026:

- ✅ Mobile-only, Apple Music Bento dark UI with rose accent (#FF2D55).
- ✅ Lovable Cloud Supabase backend with RLS, separate `user_roles` table, and email verification.
- ✅ Dual-audio player with smart shuffle, crossfade, gapless prefetch, and cross-device resume.
- ✅ LRCLIB synced lyrics with karaoke-style lock-screen view and active-line highlighting.
- ✅ AudD-powered song recognition via microphone (`RecognizeSongButton`).
- ✅ Real user music search via YouTube Music + indexed catalog with spam filtering and direct playback.
- ✅ Offline IndexedDB audio downloads (free for all users, catalog songs only).
- ✅ Premium features via promo codes: crossfade, gapless, 3D headphone, studio spaces, late night.
- ✅ UGC artist platform with KYC verification and Artist Studio.
- ✅ 20+ admin modules + analytics, performance, moderation, push notifications.
- ✅ Capacitor Android build with native media controls, Dynamic Island, lock-screen lyrics, widgets.
- ✅ Stream proxy for Web Audio effects on CORS-restricted external audio.
- ✅ No React.StrictMode, no PWA service worker, no Google OAuth, no native device downloads.
- ✅ Repository docs: `README.md`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `REBUILD_PROMPT.md`.

**Use this document to:** rebuild the app from scratch, hand off to developers, document for maintenance, or reference for feature implementation.

---

*UniversFlow v4.0 • June 2026*