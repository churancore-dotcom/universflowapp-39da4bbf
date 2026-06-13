import { Link } from "react-router-dom";
import { Download, Share2, Music2, WifiOff, Headphones, Sparkles, ShieldCheck, Zap, Radio, Heart } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const APK_URL = "https://kzaeahjeqlihmxrfhjqd.supabase.co/storage/v1/object/public/music/releases/UniversFlow.apk";
const VERSION = "1.0.0";
const SIZE = "11 MB";

const SHOTS = [
  { src: "/screenshots/player.png", alt: "Now Playing — fullscreen Apple Music-style player" },
  { src: "/screenshots/home.png", alt: "Universflow home — personalized recommendations" },
  { src: "/screenshots/library.png", alt: "Your Library — liked songs and playlists" },
  { src: "/screenshots/search.png", alt: "Discover — search songs and artists" },
  { src: "/screenshots/profile.png", alt: "Profile — listening stats" },
];

const PILLARS = [
  { icon: Headphones, title: "Hi-Fi engine", body: "8-band EQ, gapless playback, dynamics-tuned for buds & speakers." },
  { icon: WifiOff, title: "True offline", body: "Save tracks to your phone. Plane mode, metro tunnel — keeps playing." },
  { icon: Zap, title: "Built for mid-range", body: "Smooth on Vivo, Redmi, Realme. No bloat, no battery drain." },
  { icon: Radio, title: "Endless discovery", body: "Auto-queue keeps the vibe going. Catalog + worldwide streams." },
  { icon: Sparkles, title: "Premium UI", body: "Apple Music aesthetic, rose accents, blurs that feel native." },
  { icon: ShieldCheck, title: "Signed & safe", body: "Hosted on universflow.in. No mirrors, no trackers, no spyware." },
];

const handleShare = async () => {
  const data = { title: "Universflow", text: "Stream music free on Android — Universflow APK", url: "https://universflow.in/get" };
  try {
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(data.url);
  } catch { /* ignore */ }
};

const GetApp = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      name: "Universflow",
      operatingSystem: "ANDROID",
      applicationCategory: "MusicApplication",
      url: "https://universflow.in/get",
      installUrl: APK_URL,
      downloadUrl: APK_URL,
      softwareVersion: VERSION,
      fileSize: SIZE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      image: "https://universflow.in/pwa-512x512.png",
      screenshot: SHOTS.map((s) => `https://universflow.in${s.src}`),
      description: "Free music streaming and download app for Android. Stream millions of songs, build playlists, and listen offline.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Universflow",
      operatingSystem: "Android 5.1+",
      applicationCategory: "MusicApplication",
      url: "https://universflow.in/get",
      downloadUrl: APK_URL,
      installUrl: APK_URL,
      softwareVersion: VERSION,
      fileSize: SIZE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      image: "https://universflow.in/pwa-512x512.png",
      screenshot: SHOTS.map((s) => `https://universflow.in${s.src}`),
      description: "Free music streaming and download app for Android. Stream millions of songs, build playlists, and listen offline.",
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to install Universflow APK on Android",
      description: "Step-by-step guide to download and install the Universflow music app APK on your Android phone.",
      totalTime: "PT2M",
      step: [
        { "@type": "HowToStep", name: "Download the APK", text: "Tap the Install button on the Universflow app page to download the APK file." },
        { "@type": "HowToStep", name: "Open the downloaded file", text: "Open the APK file from your Downloads notification or file manager." },
        { "@type": "HowToStep", name: "Allow installation", text: "If prompted, allow installation from this source in your Android settings." },
        { "@type": "HowToStep", name: "Install and open", text: "Tap Install, then Open to start using Universflow." },
      ],
    },
  ];

  return (
    <>
      <SEOHead
        title="Universflow APK — Free Music App for Android"
        description="Download Universflow APK for Android. Stream millions of songs free, build playlists, and listen offline. No credit card required."
        path="/get"
        keywords="Univers Flow App, Universflow APK download, Universflow Android app, download Univers Flow, Universflow install, free music app Android APK, music streaming APK, offline music player APK"
        type="website"
        jsonLd={jsonLd}
        jsonLdId="getapp-jsonld"
      />

      <main className="min-h-[100dvh] w-full bg-black text-white overflow-y-auto overflow-x-hidden">

        {/* ─── HERO ───────────────────────────────────────────── */}
        <section className="relative px-5 pt-10 pb-12">
          {/* Static branded glow — no animations, mobile-perf safe */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full opacity-60"
            style={{
              background: "radial-gradient(closest-side, rgba(255,45,85,0.55), rgba(255,45,85,0.0) 70%)",
              filter: "blur(40px)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-40 -left-20 w-[280px] h-[280px] rounded-full opacity-40"
            style={{
              background: "radial-gradient(closest-side, rgba(120,40,200,0.55), rgba(120,40,200,0) 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative flex flex-col items-center text-center">
            {/* Floating wordmark badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55]" />
              <span className="text-[11px] font-semibold tracking-widest text-white/80">UNIVERSFLOW · ANDROID</span>
            </div>

            <h1 className="mt-5 text-[44px] leading-[1.02] font-black tracking-tight">
              Music that <br />
              <span className="bg-gradient-to-r from-[#FF2D55] via-[#FF6A88] to-[#FF2D55] bg-clip-text text-transparent">
                actually flows.
              </span>
            </h1>

            <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-white/70">
              A handcrafted music app for Android. No accounts to start. No store gatekeepers. Just install and play.
            </p>

            {/* Magnetic CTA */}
            <a
              href={APK_URL}
              download
              className="group mt-7 relative inline-flex items-center justify-center gap-2 w-full max-w-[320px] py-4 rounded-2xl bg-[#FF2D55] text-white font-bold text-[16px] tracking-wide active:scale-[0.97] transition shadow-[0_20px_60px_-15px_rgba(255,45,85,0.7)]"
            >
              <Download className="w-5 h-5" />
              Download APK
              <span className="ml-1 text-[11px] font-medium text-white/80">· {SIZE}</span>
            </a>

            <div className="mt-3 flex items-center gap-4 text-[11px] text-white/55">
              <span>v{VERSION}</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>Android 5.1+</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>Free forever</span>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-white/70 active:text-white">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <Link to="/auth" className="text-xs text-white/70 underline underline-offset-4 decoration-white/20">
                Try in browser first
              </Link>
            </div>
          </div>
        </section>

        {/* ─── PHONE TILT SCREENSHOT MARQUEE ───────────────────── */}
        <section className="pb-14 -mt-4">
          <div className="relative">
            <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 snap-x snap-mandatory pb-2">
              {SHOTS.map((s, i) => (
                <div
                  key={i}
                  className="snap-center shrink-0 w-[62vw] max-w-[260px] aspect-[9/19.5] rounded-[28px] overflow-hidden border border-white/10 bg-black shadow-[0_30px_80px_-20px_rgba(255,45,85,0.35)]"
                  style={{ transform: i % 2 === 0 ? "translateY(0) rotate(-2deg)" : "translateY(12px) rotate(2deg)" }}
                >
                  <img
                    src={s.src}
                    alt={s.alt}
                    loading={i === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PILLARS — bento-ish grid, not a store feature list ─── */}
        <section className="px-5 pb-14">
          <div className="mb-5">
            <p className="text-[11px] font-semibold tracking-widest text-[#FF2D55]">WHY UNIVERSFLOW</p>
            <h2 className="mt-1 text-2xl font-extrabold">Built different.</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PILLARS.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className={`relative p-4 rounded-2xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 ${i === 0 ? "col-span-2" : ""}`}
              >
                <Icon className="w-5 h-5 text-[#FF2D55]" />
                <h3 className="mt-3 text-[15px] font-bold">{title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-white/65">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── INSTALL FLOW — Vertical step-rail ──────────────── */}
        <section className="px-5 pb-14">
          <div className="mb-5">
            <p className="text-[11px] font-semibold tracking-widest text-[#FF2D55]">2 MINUTES</p>
            <h2 className="mt-1 text-2xl font-extrabold">Install, your way.</h2>
          </div>

          <ol className="relative pl-7 space-y-5 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-[#FF2D55]/60 before:to-transparent">
            {[
              { t: "Tap Download APK", b: "The 11 MB file lands in your Downloads folder." },
              { t: "Open the file", b: "Pull down the notification, tap the APK." },
              { t: "Allow this source", b: "First time only. Android will ask — say yes." },
              { t: "Install · Open · Play", b: "You're in. No account needed to start listening." },
            ].map((s, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-7 top-0 flex items-center justify-center w-[22px] h-[22px] rounded-full bg-[#FF2D55] text-[11px] font-black text-white shadow-[0_0_0_4px_rgba(255,45,85,0.15)]">
                  {i + 1}
                </span>
                <p className="text-[14px] font-bold leading-tight">{s.t}</p>
                <p className="mt-1 text-[12px] text-white/60 leading-relaxed">{s.b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── TRUST STRIP ─────────────────────────────────────── */}
        <section className="px-5 pb-14">
          <div className="rounded-2xl p-5 bg-gradient-to-br from-[#FF2D55]/15 to-transparent border border-[#FF2D55]/20">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-6 h-6 text-[#FF2D55] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-[15px] font-bold">Direct from us. Nothing in between.</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">
                  This APK is hosted on universflow.in. No third-party mirrors. No analytics SDKs you didn't agree to.
                  Permissions are limited to playback, downloads and notifications.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ───────────────────────────────────────── */}
        <section className="px-5 pb-12">
          <div className="relative rounded-3xl overflow-hidden p-8 text-center border border-white/10 bg-gradient-to-br from-[#1a0a14] to-black">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background: "radial-gradient(circle at 50% 0%, rgba(255,45,85,0.4), transparent 60%)",
              }}
            />
            <div className="relative">
              <Heart className="w-7 h-7 text-[#FF2D55] mx-auto" />
              <h2 className="mt-3 text-2xl font-extrabold leading-tight">Ready when you are.</h2>
              <p className="mt-2 text-[13px] text-white/65 max-w-[280px] mx-auto">
                Your next favourite song is one tap away.
              </p>
              <a
                href={APK_URL}
                download
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white text-black font-bold text-[16px] active:scale-[0.97] transition"
              >
                <Download className="w-5 h-5" />
                Get Universflow · {SIZE}
              </a>
              <p className="mt-3 text-[10px] text-white/40 tracking-wider uppercase">Free · No sign-up to install</p>
            </div>
          </div>
        </section>

        <footer className="px-5 py-8 text-center text-[11px] text-white/60 border-t border-white/5">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Music2 className="w-3.5 h-3.5 text-[#FF2D55]" />
            <span className="font-bold tracking-widest text-white/80">UNIVERSFLOW</span>
          </div>
          <div className="space-x-3">
            <Link to="/premium" className="hover:text-white">Premium</Link>
            <Link to="/support" className="hover:text-white">Support</Link>
            <Link to="/auth" className="hover:text-white">Sign in</Link>
          </div>
          <div className="mt-3 text-white/40">v{VERSION} · © Universflow</div>
        </footer>
      </main>
    </>
  );
};

export default GetApp;
