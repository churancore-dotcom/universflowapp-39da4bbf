import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AtSign, MailCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FadeTransition } from '@/components/PageTransition';
import appLogo from '@/assets/app-logo.png';

function detectCountryCode(): string | undefined {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toUpperCase();
    const m = locale.match(/-([A-Z]{2})\b/);
    return m?.[1];
  } catch { return undefined; }
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleResend = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
      if (error) toast.error(error.message);
      else toast.success('Verification email sent again');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!navigator.onLine) {
      toast.error('You are offline. Connect to the internet and try again.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error, isAdmin } = await signIn(email, password);
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('not confirmed') || msg.includes('confirm')) {
            setPendingEmail(email);
            toast.error('Please verify your email to sign in');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate(isAdmin ? '/admin' : '/home');
        }
      } else {
        const { error } = await signUp(email, password, username, detectCountryCode());
        if (error) {
          toast.error(error.message);
        } else {
          // Mark this session as fresh signup so the artist picker triggers later
          localStorage.setItem('uf_just_signed_up', '1');
          setPendingEmail(email);
        }
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeTransition>
      <div className="h-[100dvh] bg-background flex flex-col items-center justify-center p-5 relative overflow-hidden">
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 30% 20%, hsl(340 100% 50% / 0.18) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsl(260 100% 60% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 60% 30%, hsl(210 100% 60% / 0.08) 0%, transparent 40%)',
          }}
        />

        <motion.div
          className="relative w-full max-w-sm z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="relative"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div
                className="absolute -inset-4 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(300 80% 55% / 0.25), transparent 70%)' }}
              />
              <div
                className="w-24 h-24 rounded-full relative flex items-center justify-center overflow-hidden"
                style={{
                  background: '#000',
                  boxShadow: '0 0 28px hsl(var(--primary) / 0.35), inset 0 0 0 1px rgba(255,255,255,0.06)',
                }}
              >
                <img
                  src={appLogo}
                  alt="UniversFlow"
                  className="w-full h-full object-cover scale-[1.04]"
                  style={{ filter: 'contrast(1.04)' }}
                />
              </div>
            </motion.div>

            <motion.h1
              className="mt-5 text-3xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Univers
              </span>
              <span className="text-foreground ml-1.5 font-light">Flow</span>
            </motion.h1>
            <motion.p
              className="mt-1.5 text-[12px] tracking-[0.15em] uppercase font-medium text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Premium Music Experience
            </motion.p>
          </div>

          {/* Form / Verify view */}
          <AnimatePresence mode="wait">
          {pendingEmail ? (
            <motion.div
              key="verify"
              className="relative rounded-3xl p-6 text-center"
              style={{
                background: 'rgba(28, 28, 30, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, hsl(340 100% 50% / 0.2), hsl(260 100% 60% / 0.2))',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <MailCheck className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Verify your email</h2>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                We sent a confirmation link to
              </p>
              <p className="text-foreground text-sm font-semibold mt-1 break-all">{pendingEmail}</p>
              <p className="text-muted-foreground text-[11px] mt-3 leading-relaxed">
                Tap the link in your inbox to activate your account. You won't be able to sign in until your email is verified.
              </p>

              <Button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="w-full h-11 text-sm font-semibold rounded-xl border-0 text-primary-foreground mt-5 active:scale-[0.97] transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
                  boxShadow: '0 4px 20px hsl(340 100% 50% / 0.25)',
                }}
              >
                {resending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Resend verification email
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={() => { setPendingEmail(null); setIsLogin(true); }}
                className="mt-4 text-xs text-muted-foreground active:opacity-70"
              >
                Back to sign in
              </button>
            </motion.div>
          ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="relative rounded-3xl p-6 space-y-5"
            style={{
              background: 'rgba(28, 28, 30, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div>
              <h2 className="text-xl font-bold mb-0.5 text-foreground">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="text-muted-foreground text-xs">
                {isLogin ? 'Sign in to continue' : 'Start your music journey'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-sm rounded-xl border-0"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  required
                />
              </div>

              {!isLogin && (
                <div className="relative">
                  <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Username (permanent)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20))}
                    className="pl-10 h-12 text-sm rounded-xl border-0"
                    style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                    required
                    minLength={3}
                    maxLength={20}
                    autoComplete="username"
                  />
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 text-sm rounded-xl border-0"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground active:scale-90 transition-transform"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold rounded-xl border-0 text-primary-foreground active:scale-[0.97] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
                boxShadow: '0 4px 20px hsl(340 100% 50% / 0.25)',
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold active:opacity-70"
                style={{
                  background: 'linear-gradient(135deg, #FF2D55, #BF5AF2)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.form>
          )}
          </AnimatePresence>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="absolute bottom-5 z-10 px-4 py-1.5 rounded-full flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <p className="text-[10px] text-muted-foreground/50 tracking-wider">
            Universflow · Built for music lovers
          </p>
        </motion.div>
      </div>
    </FadeTransition>
  );
};

export default Auth;
