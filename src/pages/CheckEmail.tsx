import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const verifyVariants = {
  initial: { opacity: 0, y: 26, scale: 0.96, filter: 'blur(12px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
};

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const state = (location.state || {}) as { email?: string; username?: string };
  const email = state.email || params.get('email') || '';
  const username = state.username || params.get('u') || '';

  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) navigate('/auth', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-link', {
        body: { email, username },
      });
      if (error) {
        const ctx = (error as { context?: Response })?.context;
        let msg = 'Could not send email';
        try {
          if (ctx) {
            const j = await ctx.clone().json();
            if (typeof j?.error === 'string') msg = j.error;
          }
        } catch { /* keep */ }
        toast.error(msg);
      } else if (data?.already) {
        toast.success('Your email is already verified — sign in below.');
        navigate('/auth');
      } else {
        toast.success('Verification email sent again');
        setCooldown(60);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  const maskEmail = (e: string) => {
    const [u, d] = e.split('@');
    if (!u || !d) return e;
    const visible = u.length <= 2 ? u : u.slice(0, 2);
    return `${visible}${'•'.repeat(Math.max(2, Math.min(6, u.length - 2)))}@${d}`;
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 10%, hsl(340 100% 55% / 0.22) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(260 100% 60% / 0.18) 0%, transparent 55%)',
        }}
      />

      <button
        onClick={() => navigate('/auth')}
        className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
        aria-label="Back to sign in"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <motion.div
        className="relative w-full max-w-sm z-10 text-center"
        variants={verifyVariants}
        initial="initial"
        animate="animate"
        transition={{ type: 'spring', stiffness: 210, damping: 24, mass: 0.9 }}
      >
        {/* Animated envelope hero */}
        <motion.div
          className="relative mx-auto mb-7"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          style={{ width: 112, height: 112 }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(340 100% 55% / 0.45), transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
          <motion.div
            className="relative w-full h-full rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
              boxShadow: '0 18px 50px hsl(340 100% 50% / 0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
            }}
            animate={{ y: [0, -6, 0], rotate: [0, -2, 2, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Mail className="w-12 h-12 text-white" strokeWidth={1.75} />
          </motion.div>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold tracking-tight mb-1.5"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          Check your inbox
        </motion.h1>
        <motion.p
          className="text-[13px] text-muted-foreground px-3 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
        >
          We sent a confirmation link to
        </motion.p>
        <motion.div
          className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Mail className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12.5px] font-semibold tracking-tight break-all">{maskEmail(email)}</span>
        </motion.div>

        <motion.div
          className="rounded-3xl p-5 mt-7 space-y-4 text-left"
          style={{
            background: 'rgba(22, 22, 24, 0.82)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {[
            { icon: CheckCircle2, text: <>Open the email and tap <strong className="text-foreground">Confirm my email</strong></> },
            { icon: ShieldCheck, text: <>The link expires in <strong className="text-foreground">24 hours</strong></> },
            { icon: Mail, text: <>Can't find it? Check your <strong className="text-foreground">spam folder</strong></> },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.07 }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: 'linear-gradient(135deg, hsl(340 100% 55% / 0.18), hsl(260 100% 60% / 0.18))',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-[12.5px] text-muted-foreground leading-snug pt-1">{item.text}</p>
              </motion.div>
            );
          })}

          <Button
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="w-full h-12 text-[13px] font-semibold rounded-xl mt-2"
            style={{
              background: cooldown > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
              color: cooldown > 0 ? 'hsl(var(--muted-foreground))' : 'hsl(var(--foreground))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {resending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Resend email
              </span>
            )}
          </Button>
        </motion.div>

        <motion.button
          onClick={() => navigate('/auth')}
          className="mt-6 text-[12px] text-muted-foreground active:opacity-70 inline-flex items-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <ArrowLeft className="w-3 h-3" /> Wrong email? Sign up again
        </motion.button>
      </motion.div>
    </div>
  );
};

export default CheckEmail;
