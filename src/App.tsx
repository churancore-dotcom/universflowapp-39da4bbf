import { useState, useEffect, lazy, Suspense } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlayerProvider, usePlayer } from "./contexts/PlayerContext";
import { DownloadProvider } from "./contexts/DownloadContext";
import SplashScreen from "./components/SplashScreen";
import MobileShell from "./components/MobileShell";

import ArtistPicker from "./components/ArtistPicker";
import RateUsPopup from "./components/RateUsPopup";
import ReviewModal from "./components/ReviewModal";
import { NavDirectionProvider } from "./components/PageTransition";
import GlobalPlayerLayer from "./components/GlobalPlayerLayer";

import SEOHead from "./components/SEOHead";
import Auth from "./pages/Auth";
import VerifyEmail from "./pages/VerifyEmail";
import CheckEmail from "./pages/CheckEmail";

import NotFound from "./pages/NotFound";
import { usePushRegistration } from "./hooks/usePushRegistration";
import { usePlaybackSync } from "./hooks/usePlaybackSync";
import { useUserEQSettingsSync } from "./lib/eqSettings";

// Eager load main tabs for INSTANT navigation (Spotify-like feel).
// Admin and rarely-visited pages stay lazy below.
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import GetApp from "./pages/GetApp";
import { isMedianApp } from "./lib/median";
import OfflinePlayerShell from "./components/OfflinePlayerShell";
import OfflineGate from "./components/OfflineGate";
import { SentryErrorBoundary } from "./components/SentryErrorBoundary";

// These are visited less often — keep lazy to keep initial bundle small.
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));

const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const Settings = lazy(() => import("./pages/Settings"));
const Support = lazy(() => import("./pages/Support"));
const Offline = lazy(() => import("./pages/Offline"));

const AllArtists = lazy(() => import("./pages/AllArtists"));
const ManageSubscription = lazy(() => import("./pages/ManageSubscription"));
const Premium = lazy(() => import("./pages/Premium"));
const Downloads = lazy(() => import("./pages/Downloads"));
const BlogFreeMusicDownloadAppsIndia = lazy(() => import("./pages/BlogFreeMusicDownloadAppsIndia"));
const BlogUniversflowVsJiosaavnVsGaana = lazy(() => import("./pages/BlogUniversflowVsJiosaavnVsGaana"));
const BlogTrendingPunjabiSongs2026 = lazy(() => import("./pages/BlogTrendingPunjabiSongs2026"));


const DownloadQueuePanel = lazy(() => import("./components/DownloadQueuePanel"));
const PrerollAd = lazy(() => import("./components/ads/PrerollAd"));
const PWAInstallBanner = lazy(() => import("./components/PWAInstallBanner"));

const StructuredData = lazy(() => import("./components/StructuredData"));

// Lazy load ALL admin routes
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UploadMusic = lazy(() => import("./pages/admin/UploadMusic"));
const ManageSongs = lazy(() => import("./pages/admin/ManageSongs"));
const ManageArtists = lazy(() => import("./pages/admin/ManageArtists"));
const ManageAlbums = lazy(() => import("./pages/admin/ManageAlbums"));
const ManagePlaylists = lazy(() => import("./pages/admin/ManagePlaylists"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const ManageSubscriptions = lazy(() => import("./pages/admin/ManageSubscriptions"));
const AppSettings = lazy(() => import("./pages/admin/AppSettings"));
const FeatureFlags = lazy(() => import("./pages/admin/FeatureFlags"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const ContentModeration = lazy(() => import("./pages/admin/ContentModeration"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const LiveInsights = lazy(() => import("./pages/admin/LiveInsights"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const BulkActions = lazy(() => import("./pages/admin/BulkActions"));
const SystemHealth = lazy(() => import("./pages/admin/SystemHealth"));
const ContentScheduler = lazy(() => import("./pages/admin/ContentScheduler"));
const BackupExport = lazy(() => import("./pages/admin/BackupExport"));
const PromoCodes = lazy(() => import("./pages/admin/PromoCodes"));
const PaymentRequests = lazy(() => import("./pages/admin/PaymentRequests"));
const APIManagement = lazy(() => import("./pages/admin/APIManagement"));
const PushNotifications = lazy(() => import("./pages/admin/PushNotifications"));
const RegisteredDevices = lazy(() => import("./pages/admin/RegisteredDevices"));
const UserEngagement = lazy(() => import("./pages/admin/UserEngagement"));
const ABTesting = lazy(() => import("./pages/admin/ABTesting"));
const SecurityCenter = lazy(() => import("./pages/admin/SecurityCenter"));

const SupportInbox = lazy(() => import("./pages/admin/SupportInbox"));
const AppUpdates = lazy(() => import("./pages/admin/AppUpdates"));
const ArtistApplications = lazy(() => import("./pages/admin/ArtistApplications"));

// Artist program
const ArtistApply = lazy(() => import("./pages/artist/Apply"));
const ArtistAuth = lazy(() => import("./pages/artist/ArtistAuth"));
const ArtistStatus = lazy(() => import("./pages/artist/Status"));
const ArtistStudio = lazy(() => import("./pages/artist/Studio"));
const ArtistPublic = lazy(() => import("./pages/artist/ArtistPublic"));

// Legal
const LegalTerms = lazy(() => import("./pages/legal/Terms"));
const LegalPrivacy = lazy(() => import("./pages/legal/Privacy"));
const LegalArtistTerms = lazy(() => import("./pages/legal/ArtistTerms"));
const LegalArtistPrivacy = lazy(() => import("./pages/legal/ArtistPrivacy"));

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

const LazyFallback = () => <div className="min-h-screen bg-background" />;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, emailVerified } = useAuth();
  if (isLoading) return <LazyFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  // Wait for the profile check to finish before rendering anything. Without
  // this, the user sees Home flash for a second on login and then gets bounced
  // to the verification screen because emailVerified is briefly null.
  if (emailVerified === null) return <LazyFallback />;
  if (emailVerified === false) return <Navigate to="/check-email" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useAuth();
  // Server-side re-verification on every admin mount. Cached `isAdmin` from
  // context is not trusted on its own — we hit the SECURITY DEFINER RPC
  // (`has_role`) which queries the `user_roles` table directly. If the role
  // was revoked mid-session, this catches it immediately.
  const [verified, setVerified] = useState<null | boolean>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setVerified(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin',
        });
        if (!cancelled) setVerified(!error && !!data);
      } catch {
        if (!cancelled) setVerified(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (isLoading || verified === null) return <LazyFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  // Cloak: if not admin (cached OR re-verified), render 404 instead of
  // redirecting. URL guessing reveals nothing about /admin existence.
  if (!isAdmin || !verified) return <NotFound />;
  return <>{children}</>;
};

// Hostnames where the public APK landing page (/get) is allowed to render.
// EVERYWHERE else — APK webview, Capacitor (localhost), lovable previews,
// dev — we go straight to the app. APK must NEVER show /get.
const WEB_LANDING_HOSTS = new Set(['universflow.in', 'www.universflow.in']);
const isWebLanding = typeof window !== 'undefined'
  && WEB_LANDING_HOSTS.has(window.location.hostname.toLowerCase());

const RootGate = () => {
  const { user, isLoading, emailVerified } = useAuth();
  if (isLoading) return <LazyFallback />;
  if (user) {
    if (emailVerified === null) return <LazyFallback />;
    if (emailVerified === false) return <Navigate to="/check-email" replace />;
    return <Home />;
  }
  if (isMedianApp || !isWebLanding) return <Navigate to="/auth" replace />;
  return <GetApp />;
};

const GetAppGate = () => {
  const { user } = useAuth();
  if (isMedianApp || !isWebLanding) {
    return <Navigate to={user ? "/home" : "/auth"} replace />;
  }
  return <GetApp />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user, isOffline } = useAuth();

  return (
    <NavDirectionProvider>
    <OfflineGate />
    <Suspense fallback={<LazyFallback />}>
        <Routes location={location}>
          <Route path="/" element={<RootGate />} />
          <Route path="/get" element={<GetAppGate />} />
          <Route path="/download" element={<GetAppGate />} />
          <Route path="/app" element={<GetAppGate />} />
          <Route path="/apk" element={<GetAppGate />} />
          <Route path="/blog/free-music-download-apps-india" element={<BlogFreeMusicDownloadAppsIndia />} />
          <Route path="/blog/universflow-vs-jiosaavn-vs-gaana" element={<BlogUniversflowVsJiosaavnVsGaana />} />
          <Route path="/blog/trending-punjabi-songs-2026" element={<BlogTrendingPunjabiSongs2026 />} />
          <Route path="/welcome" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={
            user ? <Navigate to="/home" replace /> :
            <Auth />
          } />
          <Route path="/verify" element={<VerifyEmail />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/offline-player" element={<OfflinePlayerShell />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/support" element={<Support />} />
          <Route path="/offline" element={<ProtectedRoute><Offline /></ProtectedRoute>} />
          <Route path="/artists" element={<ProtectedRoute><AllArtists /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><ManageSubscription /></ProtectedRoute>} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />

          {/* Artist program — these MUST come before /artist/:artistId so static segments win */}
          <Route path="/artist/auth" element={user ? <Navigate to="/artist/apply" replace /> : <ArtistAuth />} />
          <Route path="/artist/apply" element={<ProtectedRoute><ArtistApply /></ProtectedRoute>} />
          <Route path="/artist/status" element={<ProtectedRoute><ArtistStatus /></ProtectedRoute>} />
          <Route path="/artist/studio" element={<ProtectedRoute><ArtistStudio /></ProtectedRoute>} />
          <Route path="/artist/:artistId" element={<ProtectedRoute><ArtistDetail /></ProtectedRoute>} />
          <Route path="/a/:slug" element={<ArtistPublic />} />

          {/* Legal */}
          <Route path="/legal/terms" element={<LegalTerms />} />
          <Route path="/legal/privacy" element={<LegalPrivacy />} />
          <Route path="/legal/artist-terms" element={<LegalArtistTerms />} />
          <Route path="/legal/artist-privacy" element={<LegalArtistPrivacy />} />
          
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="upload" element={<UploadMusic />} />
            <Route path="songs" element={<ManageSongs />} />
            <Route path="artists" element={<ManageArtists />} />
            <Route path="albums" element={<ManageAlbums />} />
            <Route path="playlists" element={<ManagePlaylists />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="subscriptions" element={<ManageSubscriptions />} />
            <Route path="app-settings" element={<AppSettings />} />
            <Route path="features" element={<FeatureFlags />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="moderation" element={<ContentModeration />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="insights" element={<LiveInsights />} />
            <Route path="logs" element={<ActivityLogs />} />
            <Route path="bulk" element={<BulkActions />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="scheduler" element={<ContentScheduler />} />
            <Route path="backup" element={<BackupExport />} />
            <Route path="promo-codes" element={<PromoCodes />} />
            <Route path="payments" element={<PaymentRequests />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="api" element={<APIManagement />} />
            <Route path="notifications" element={<PushNotifications />} />
            <Route path="devices" element={<RegisteredDevices />} />
            <Route path="engagement" element={<UserEngagement />} />
            <Route path="ab-testing" element={<ABTesting />} />
            <Route path="security" element={<SecurityCenter />} />
            <Route path="support" element={<SupportInbox />} />
            <Route path="app-updates" element={<AppUpdates />} />
            <Route path="artists-applications" element={<ArtistApplications />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
    </Suspense>
    </NavDirectionProvider>
  );
};

const PrerollAdWrapper = () => {
  const { showPrerollAd, onPrerollAdComplete, adType } = usePlayer();
  return (
    <Suspense fallback={null}>
      <PrerollAd 
        isOpen={showPrerollAd} 
        onComplete={onPrerollAdComplete}
        onSkip={onPrerollAdComplete}
        adType={adType}
      />
    </Suspense>
  );
};

const PostAuthGate = () => {
  const { user, emailVerified } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Open artist picker ONLY immediately after signup (not on every login),
  // and ONLY once the user's email is verified — otherwise unverified accounts
  // were getting the picker over the /check-email screen.
  useEffect(() => {
    if (!user) return;
    if (emailVerified !== true) return;
    const justSignedUp = localStorage.getItem('uf_just_signed_up');
    if (!justSignedUp) return;

    const key = `uf_artists_picked_${user.id}`;
    if (localStorage.getItem(key)) {
      localStorage.removeItem('uf_just_signed_up');
      return;
    }

    // Double-check DB to avoid showing twice across devices
    supabase.from('user_artist_preferences').select('id').eq('user_id', user.id).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          localStorage.setItem(key, '1');
          localStorage.removeItem('uf_just_signed_up');
        } else {
          setTimeout(() => setShowPicker(true), 600);
        }
      });
  }, [user, emailVerified]);

  const handlePickerComplete = () => {
    localStorage.removeItem('uf_just_signed_up');
    setShowPicker(false);
  };

  if (!user) return null;
  return (
    <>
      <AnimatePresence>
        {showPicker && <ArtistPicker key="picker" onComplete={handlePickerComplete} />}
      </AnimatePresence>
      {!showPicker && <RateUsPopup onOpenReview={() => setShowReview(true)} />}
      <ReviewModal isOpen={showReview} onClose={() => setShowReview(false)} />
    </>
  );
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user } = useAuth();
  usePushRegistration();
  usePlaybackSync();
  useUserEQSettingsSync(user?.id);

  const handleSplashComplete = () => setShowSplash(false);

  return (
    <MobileShell>
      <Suspense fallback={null}>
        <StructuredData />
      </Suspense>
      <Toaster />
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        ) : (
          <AnimatedRoutes key="routes" />
        )}
      </AnimatePresence>

      <PrerollAdWrapper />
      <GlobalPlayerLayer />
      
      <PostAuthGate />
      <Suspense fallback={null}>
        <DownloadQueuePanel />
        <PWAInstallBanner />
      </Suspense>
    </MobileShell>
  );
};

const App = () => {
  return (
    <SentryErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
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
    </SentryErrorBoundary>
  );
};

export default App;