import { Link } from "react-router-dom";
import { Download, Share2, ShieldCheck, Music2, WifiOff, Sparkles, Headphones, ChevronRight, Users } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const APK_URL = "https://kzaeahjeqlihmxrfhjqd.supabase.co/storage/v1/object/public/music/releases/UniversFlow.apk";
const VERSION = "1.0.0";
const SIZE = "11 MB";
const INSTALLS = "50+";

// Real in-app screenshots
const SHOTS = [
  { src: "/screenshots/home.png", alt: "Universflow home — Listen Now with personalized recommendations" },
  { src: "/screenshots/player.png", alt: "Now Playing — fullscreen Apple Music-style player" },
  { src: "/screenshots/library.png", alt: "Your Library — liked songs, playlists and downloads" },
  { src: "/screenshots/search.png", alt: "Discover — search songs, artists and albums worldwide" },
  { src: "/screenshots/profile.png", alt: "Profile — listening stats and quick access" },
];

const FEATURES = [
  { icon: Music2, label: "Millions of songs" },
  { icon: WifiOff, label: "Offline downloads" },
  { icon: Headphones, label: "Hi-Fi audio engine" },
  { icon: Sparkles, label: "Premium UI" },
];

const handleShare = async () => {
  const data = { title: "Universflow", text: "Stream music free on Android — Universflow APK", url: "https://universflow.in/get" };
  try {
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(data.url);
  } catch {}
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
      screenshot: [
        "https://universflow.in/screenshots/home.png",
        "https://universflow.in/screenshots/player.png",
        "https://universflow.in/screenshots/library.png",
        "https://universflow.in/screenshots/search.png",
        "https://universflow.in/screenshots/profile.png",
      ],
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
      screenshot: [
        "https://universflow.in/screenshots/home.png",
        "https://universflow.in/screenshots/player.png",
        "https://universflow.in/screenshots/library.png",
        "https://universflow.in/screenshots/search.png",
        "https://universflow.in/screenshots/profile.png",
      ],
      description: "Free music streaming and download app for Android. Stream millions of songs, build playlists, and listen offline.",
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to install Universflow APK on Android",
      description: "Step-by-step guide to download and install the Universflow music app APK on your Android phone.",
      totalTime: "PT2M",
      step: [
        { "@type": "HowToStep", name: "Download the APK", text: "Tap the Install button on the Universflow app page to download the APK file.", url: "https://universflow.in/get#step1" },
        { "@type": "HowToStep", name: "Open the downloaded file", text: "Open the APK file from your Downloads notification or file manager.", url: "https://universflow.in/get#step2" },
        { "@type": "HowToStep", name: "Allow installation", text: "If prompted, allow installation from this source in your Android settings.", url: "https://universflow.in/get#step3" },
        { "@type": "HowToStep", name: "Install and open", text: "Tap Install, then Open to start using Universflow.", url: "https://universflow.in/get#step4" },
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

      <main className="min-h-[100dvh] w-full bg-black text-white overflow-y-auto">
        {/* Hero splash video */}
        <section className="w-full bg-black flex items-center justify-center pt-2">
          <video
            src="/getapp-splash.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            // @ts-ignore
            webkit-playsinline="true"
            className="w-full max-w-[520px] h-auto object-contain"
            aria-label="Universflow animated logo"
          />
        </section>

        {/* Listing header */}
        <section className="px-5 pt-4 pb-5">
          <div className="flex items-start gap-4">
            <img
              src="/pwa-192x192.png"
              alt="Universflow app icon"
              width={88}
              height={88}
              decoding="async"
              {...({ fetchpriority: "high" } as any)}
              className="rounded-3xl shadow-xl shadow-[#FF2D55]/30 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight truncate">Universflow</h1>
              <p className="text-sm text-[#FF2D55] font-medium mt-0.5">Music & Audio</p>
              <p className="text-xs text-white/55 mt-1">Contains ads · In-app purchases</p>
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 text-center">
            <div className="px-2">
              <div className="flex items-center justify-center gap-1 text-base font-bold">
                <Users className="w-3.5 h-3.5 text-white/70" /> {INSTALLS}
              </div>
              <div className="text-[11px] text-white/55 mt-0.5">Installs</div>
            </div>
            <div className="px-2">
              <div className="text-base font-bold">{SIZE}</div>
              <div className="text-[11px] text-white/55 mt-0.5">Download</div>
            </div>
            <div className="px-2">
              <div className="text-base font-bold">5.1+</div>
              <div className="text-[11px] text-white/55 mt-0.5">Android</div>
            </div>
          </div>

          {/* Install CTA */}
          <a
            href={APK_URL}
            download
            className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#FF2D55] text-white font-bold text-base active:scale-[0.98] transition shadow-lg shadow-[#FF2D55]/30"
          >
            <Download className="w-5 h-5" />
            Install
          </a>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-xs text-white/70 active:text-white"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            <Link to="/auth" className="text-xs text-white/70 underline underline-offset-4 decoration-white/20">
              Open web player
            </Link>
          </div>
        </section>

        {/* Feature chips */}
        <section className="px-5 pb-5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/80">
                <Icon className="w-3.5 h-3.5 text-[#FF2D55]" /> {label}
              </div>
            ))}
          </div>
        </section>

        {/* Screenshots strip */}
        <section className="pb-6">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory">
            {SHOTS.map((s, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-[58vw] max-w-[260px] aspect-[9/19.5] rounded-2xl overflow-hidden border border-white/10 bg-black"
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
        </section>

        {/* About this app */}
        <section className="px-5 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold">About this app</h2>
            <ChevronRight className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-sm text-white/75 leading-relaxed">
            Universflow is a premium music streaming app built for Android. Discover millions of songs across pop,
            hip-hop, Bollywood, lo-fi, indie and more. Build playlists, download for offline, and enjoy a clean
            Apple Music–style player tuned for mid-range phones.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Music", "Streaming", "Offline", "Playlists", "Hi-Fi"].map((t) => (
              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-white/70">
                #{t}
              </span>
            ))}
          </div>
        </section>

        {/* Data safety */}
        <section className="px-5 pb-6">
          <h2 className="text-base font-bold mb-3">Data safety</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-[#FF2D55] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Signed Android APK</p>
                <p className="text-xs text-white/60 mt-0.5">Hosted directly on universflow.in. No third-party mirrors.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="w-5 h-5 text-[#FF2D55] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">No spyware, no trackers</p>
                <p className="text-xs text-white/60 mt-0.5">Only the permissions needed for playback, downloads & notifications.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Ratings & reviews — disabled until real user reviews are collected */}

        {/* What's new */}
        <section className="px-5 pb-8">
          <h2 className="text-base font-bold mb-2">What&apos;s new</h2>
          <p className="text-xs text-white/70 mb-2">Version {VERSION}</p>
          <ul className="text-sm text-white/75 space-y-1.5 list-disc list-inside">
            <li>Faster splash & instant avatar loading</li>
            <li>New Apple Music-style fullscreen player</li>
            <li>Offline downloads improvements</li>
            <li>Bug fixes & performance on mid-range devices</li>
          </ul>
        </section>

        {/* Install steps */}
        <section className="px-5 pb-10">
          <h2 className="text-base font-bold mb-3">How to install</h2>
          <ol className="space-y-2.5 text-sm text-white/75">
            <li><span className="text-[#FF2D55] font-bold mr-1">1.</span> Tap <b>Install</b> above to download the APK.</li>
            <li><span className="text-[#FF2D55] font-bold mr-1">2.</span> Open the file from your Downloads notification.</li>
            <li><span className="text-[#FF2D55] font-bold mr-1">3.</span> Allow installs from this source if prompted.</li>
            <li><span className="text-[#FF2D55] font-bold mr-1">4.</span> Tap <b>Install → Open</b> 🎧</li>
          </ol>

          <a
            href={APK_URL}
            download
            className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 rounded-full bg-[#FF2D55] text-white font-bold text-base active:scale-[0.98] transition shadow-lg shadow-[#FF2D55]/30"
          >
            <Download className="w-5 h-5" />
            Install APK
          </a>
        </section>

        <footer className="px-5 py-6 text-center text-[11px] text-white/70 border-t border-white/5">
          <div className="space-x-3">
            <Link to="/premium" className="hover:text-white/70">Premium</Link>
            <Link to="/support" className="hover:text-white/70">Support</Link>
            <Link to="/auth" className="hover:text-white/70">Sign in</Link>
          </div>
          <div className="mt-3">© Universflow</div>
        </footer>
      </main>
    </>
  );
};

export default GetApp;
