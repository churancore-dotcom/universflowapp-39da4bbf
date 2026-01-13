import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlayerProvider } from "./contexts/PlayerContext";
import SplashScreen from "./components/SplashScreen";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UploadMusic from "./pages/admin/UploadMusic";
import ManageSongs from "./pages/admin/ManageSongs";
import Analytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-background" />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) setShowSplash(false);
  }, [isLoading, user]);

  return (
    <AnimatePresence mode="wait">
      {showSplash && !user ? (
        <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
      ) : (
        <Routes>
          <Route path="/" element={user ? <Navigate to="/home" replace /> : <Navigate to="/auth" replace />} />
          <Route path="/auth" element={user ? <Navigate to="/home" replace /> : <Auth />} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="upload" element={<UploadMusic />} />
            <Route path="songs" element={<ManageSongs />} />
            <Route path="albums" element={<ManageSongs />} />
            <Route path="playlists" element={<ManageSongs />} />
            <Route path="users" element={<AdminDashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlayerProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
