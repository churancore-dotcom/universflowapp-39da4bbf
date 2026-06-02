import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Crown, Check, Sparkles, Download, Headphones,
  Zap, Gift, Copy, Loader2, ShieldCheck, Sliders, Music2, Infinity as InfinityIcon, Clock,
  Moon, Orbit, Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import RedeemCodeModal from '@/components/RedeemCodeModal';
import { iosSpring, iosBounce } from '@/lib/animations';
import { usePremium } from '@/hooks/usePremium';
import { useHaptics } from '@/hooks/useHaptics';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmailVerified } from '@/hooks/useEmailVerified';
import { toast } from '@/hooks/use-toast';
import SEOHead from '@/components/SEOHead';

type PlanId = 'monthly' | 'bimonthly' | 'quarterly';

interface UpiSettings {
  monthlyPrice: number;
  bimonthlyPrice: number;
  quarterlyPrice: number;
  upiId: string;
  payeeName: string;
}

const PLAN_LABEL: Record<PlanId, string> = {
  monthly: '1 Month',
  bimonthly: '2 Months',
  quarterly: '3 Months',
};

const FEATURES = [
  { icon: Zap,         title: 'Zero Ads',                desc: 'No pre-rolls, banners or interruptions. Ever.' },
  { icon: Orbit,       title: 'Spatial 3D Audio',        desc: 'Cinema-grade surround that orbits the song around your head — only on Universflow.' },
  { icon: Sliders,     title: '8-Band Studio Equalizer', desc: 'Studio-grade tuning with crafted presets — works on every stream.' },
  { icon: Building2,   title: 'Studio Spaces',           desc: 'Hear songs inside a Vinyl Booth, Cathedral, Stadium and more — a Universflow exclusive nobody else offers.' },
  { icon: Moon,        title: 'Late Night Mode',         desc: 'Lifts whispered details and tames loud peaks so quiet listening still sounds full.' },
  
  { icon: Download,    title: 'Unlimited Downloads',     desc: 'Save anything. Listen offline. Anywhere.' },
  { icon: Music2,      title: 'AI Playlist Generator',   desc: 'Mood-matched playlists, made instantly.' },
  { icon: InfinityIcon, title: 'Crossfade & Gapless',    desc: 'Seamless transitions, end to end.' },
  
  { icon: Sparkles,    title: 'Premium-Only Tracks',     desc: 'Early drops and exclusive releases.' },
  { icon: ShieldCheck, title: 'Priority Support',        desc: 'Skip the line — we answer first.' },
];

interface PendingPayment {
  id: string;
  utr_number: string;
  amount_paise: number;
  plan: string;
  created_at: string;
}

const PremiumPage = memo(function PremiumPage() {
  const navigate = useNavigate();
  const { isPremium, subscription, refetch: refetchPremium } = usePremium();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [showRedeem, setShowRedeem] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('bimonthly');
  const [settings, setSettings] = useState<UpiSettings | null>(null);
  const [pending, setPending] = useState<PendingPayment | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['premium_price_monthly_inr', 'premium_price_bimonthly_inr', 'premium_price_quarterly_inr', 'upi_id', 'upi_payee_name']);
      const map: Record<string, any> = {};
      data?.forEach(r => {
        try { map[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value; }
        catch { map[r.key] = r.value; }
      });
      setSettings({
        monthlyPrice: Number(map.premium_price_monthly_inr ?? 59),
        bimonthlyPrice: Number(map.premium_price_bimonthly_inr ?? 100),
        quarterlyPrice: Number(map.premium_price_quarterly_inr ?? 149),
        upiId: String(map.upi_id ?? 'yourupi@okaxis'),
        payeeName: String(map.upi_payee_name ?? 'UniversFlow'),
      });
    })();
  }, []);

  // Detect any pending payment request for this user
  useEffect(() => {
    if (!user || isPremium) { setPending(null); return; }
    let cancelled = false;
    const fetchPending = async () => {
      const { data } = await supabase
        .from('payment_requests')
        .select('id, utr_number, amount_paise, plan, created_at')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPending(data ?? null);
    };
    fetchPending();

    // Realtime: react to status updates on payment_requests + subscriptions
    const prChannel = supabase
      .channel(`user-pr-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'payment_requests',
        filter: `user_id=eq.${user.id}`,
      }, () => { fetchPending(); refetchPremium(); })
      .subscribe();

    const subChannel = supabase
      .channel(`user-sub-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => { refetchPremium(); fetchPending(); })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(prChannel);
      supabase.removeChannel(subChannel);
    };
  }, [user, isPremium, refetchPremium]);

  const monthly = settings?.monthlyPrice ?? 59;
  const bimonthly = settings?.bimonthlyPrice ?? 100;
  const quarterly = settings?.quarterlyPrice ?? 149;
  const bimonthlyPerMo = (bimonthly / 2).toFixed(0);
  const quarterlyPerMo = (quarterly / 3).toFixed(0);
  const bimonthlySave = Math.max(0, Math.round((1 - (bimonthly / 2) / monthly) * 100));
  const quarterlySave = Math.max(0, Math.round((1 - (quarterly / 3) / monthly) * 100));
  const selectedPrice = selectedPlan === 'quarterly' ? quarterly : selectedPlan === 'bimonthly' ? bimonthly : monthly;

  const handleUpgrade = useCallback(() => {
    haptics.medium();
    setShowCheckout(true);
  }, [haptics]);

  const expiryText = subscription?.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <PageTransition>
      <SEOHead
        title="Univers Flow Premium — Ad-Free Music & Spatial Audio"
        description="Upgrade to Univers Flow Premium for zero ads, spatial 3D audio, studio EQ, unlimited downloads and exclusive tracks."
        keywords="Univers Flow Premium, premium music, ad-free streaming, spatial audio, music download"
        path="/premium"
        jsonLdId="premium-jsonld"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Univers Flow Premium',
            description: 'Ad-free streaming, spatial audio, studio EQ, and unlimited offline downloads.',
            brand: { '@type': 'Brand', name: 'Univers Flow' },
            offers: {
              '@type': 'Offer',
              priceCurrency: 'INR',
              price: '99',
              url: 'https://universflow.in/premium',
              availability: 'https://schema.org/InStock',
            },
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://universflow.in/' },
              { '@type': 'ListItem', position: 2, name: 'Premium', item: 'https://universflow.in/premium' },
            ],
          },
        ]}
      />
      <motion.div
        className="min-h-screen bg-background pb-44 relative overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      >
        {/* ─── Aurora gradient mesh backdrop ─── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-40 left-1/2 -translate-x-1/2 w-[820px] h-[820px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.55), transparent 65%)', filter: 'blur(110px)' }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.6, 0.45] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[35%] -right-32 w-[460px] h-[460px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.55), transparent 65%)', filter: 'blur(90px)' }}
            animate={{ scale: [1.05, 1, 1.05], opacity: [0.3, 0.45, 0.3] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[55%] -left-24 w-[380px] h-[380px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)', filter: 'blur(100px)' }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.25, 0.4, 0.25] }}
            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Header */}
        <motion.header
          className="sticky top-0 z-30 px-2 pt-4 pb-3 flex items-center safe-area-pt"
          style={{
            background: 'hsl(var(--background) / 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
          initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={iosSpring}
        >
          <motion.button
            onClick={() => { haptics.light(); navigate(-1); }}
            className="flex items-center gap-1 px-2 py-2 -ml-1 text-primary"
            whileTap={{ scale: 0.95, opacity: 0.7 }} transition={iosBounce}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-[17px]">Back</span>
          </motion.button>
        </motion.header>

        <main className="relative px-5 pt-2 space-y-8">
          {/* ─── Cinematic hero ─── */}
          <motion.section
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.05 }}
            className="text-center pt-8 pb-2 relative"
          >
            {/* Animated crown with sheen */}
            <motion.div
              initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }}
              transition={{ ...iosBounce, delay: 0.1 }}
              className="relative inline-flex items-center justify-center mb-6"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)', filter: 'blur(30px)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div
                className="relative w-[72px] h-[72px] rounded-[22px] flex items-center justify-center overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                  boxShadow: '0 25px 60px -15px hsl(var(--primary) / 0.7), inset 0 1px 0 hsl(0 0% 100% / 0.3)',
                }}
              >
                <Crown className="w-9 h-9 text-primary-foreground relative z-10" fill="currentColor" />
                <motion.div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(115deg, transparent 35%, hsl(0 0% 100% / 0.45) 50%, transparent 65%)' }}
                  animate={{ x: ['-100%', '120%'] }}
                  transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, ...iosSpring }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-5"
              style={{
                background: 'hsl(var(--primary) / 0.1)',
                border: '0.5px solid hsl(var(--primary) / 0.35)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <Sparkles className="w-3 h-3 text-primary" fill="currentColor" />
              <span className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase">
                Universflow Premium
              </span>
            </motion.div>

            <h1 className="text-[44px] font-bold leading-[0.92] tracking-tight mb-4">
              Sound, the way<br />
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(120deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  animation: 'auroraShift 6s ease-in-out infinite',
                }}
              >
                it deserves.
              </span>
            </h1>
            <p className="text-muted-foreground text-[15px] max-w-[320px] mx-auto leading-relaxed">
              Studio-grade audio. Zero interruptions. Built for people who really listen.
            </p>
          </motion.section>

          {/* Active premium banner */}
          {isPremium && (
            <motion.section
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              transition={iosSpring}
              className="rounded-3xl p-7 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.18))',
                border: '1px solid hsl(var(--primary) / 0.45)',
                boxShadow: '0 25px 70px -20px hsl(var(--primary) / 0.55)',
              }}
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(115deg, transparent 40%, hsl(0 0% 100% / 0.08) 50%, transparent 60%)' }}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
              <Crown className="w-12 h-12 text-primary mx-auto mb-3 relative" fill="currentColor" />
              <p className="text-[22px] font-bold mb-1 relative">You're Premium</p>
              {expiryText && (
                <p className="text-[13px] text-muted-foreground relative">Active until {expiryText}</p>
              )}
              <button
                onClick={handleUpgrade}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold relative"
                style={{ background: 'hsl(var(--primary) / 0.18)', color: 'hsl(var(--primary))' }}
              >
                Extend membership
              </button>
            </motion.section>
          )}

          {/* Pending payment banner */}
          {!isPremium && pending && (
            <PendingProgressBanner pending={pending} />
          )}

          {/* Plan selector */}
          {!isPremium && !pending && (
            <motion.section
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.15 }}
              className="space-y-3"
            >
              <PlanCard
                planId="bimonthly"
                selected={selectedPlan === 'bimonthly'}
                onSelect={() => { haptics.light(); setSelectedPlan('bimonthly'); }}
                badge={`Save ${bimonthlySave}%`}
                title="2 Months"
                price={bimonthly}
                perMonth={`₹${bimonthlyPerMo}/mo`}
                tagline="The sweet spot · 60 days"
                recommended
              />
              <PlanCard
                planId="quarterly"
                selected={selectedPlan === 'quarterly'}
                onSelect={() => { haptics.light(); setSelectedPlan('quarterly'); }}
                badge={`Save ${quarterlySave}%`}
                title="3 Months"
                price={quarterly}
                perMonth={`₹${quarterlyPerMo}/mo`}
                tagline="Best value · 90 days"
              />
              <PlanCard
                planId="monthly"
                selected={selectedPlan === 'monthly'}
                onSelect={() => { haptics.light(); setSelectedPlan('monthly'); }}
                title="Monthly"
                price={monthly}
                perMonth="30 days"
                tagline="Try it for a month"
              />
            </motion.section>
          )}

          {/* What's inside */}
          <motion.section
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.25 }}
            className="pt-2"
          >
            <div className="mb-5 px-1">
              <p className="text-[10px] font-bold tracking-[0.25em] text-primary uppercase mb-2">
                Included
              </p>
              <h2 className="text-[28px] font-bold tracking-tight leading-[1.05]">
                Everything you need.<br />
                <span className="text-muted-foreground">Nothing you don't.</span>
              </h2>
            </div>

            <div className="space-y-2">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.04, ...iosSpring }}
                  className="flex items-center gap-4 p-4 rounded-2xl relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--card) / 0.7), hsl(var(--card) / 0.4))',
                    border: '0.5px solid hsl(var(--border) / 0.6)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 relative"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--primary) / 0.28), hsl(var(--accent) / 0.12))',
                      boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.08)',
                    }}
                  >
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] leading-tight">{f.title}</p>
                    <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                  </div>
                  <Check className="w-5 h-5 text-primary shrink-0" strokeWidth={3} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Trust strip */}
          <motion.section
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="grid grid-cols-3 gap-2 pt-4"
          >
            {[
              { label: 'Secure', value: 'UPI' },
              { label: 'Activates', value: 'In minutes' },
              { label: 'Support', value: '24/7' },
            ].map(t => (
              <div
                key={t.label}
                className="text-center py-3.5 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.3))',
                  border: '0.5px solid hsl(var(--border) / 0.5)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <p className="text-[9.5px] uppercase tracking-[0.18em] text-muted-foreground">{t.label}</p>
                <p className="text-[13px] font-semibold mt-0.5">{t.value}</p>
              </div>
            ))}
          </motion.section>

          {/* Redeem code link */}
          {!isPremium && !pending && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-center pt-2"
            >
              <button
                onClick={() => { haptics.light(); setShowRedeem(true); }}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary py-2"
              >
                <Gift className="w-4 h-4" />
                Have a code? Redeem here
              </button>
            </motion.div>
          )}
        </main>

        {/* ─── Sticky bottom CTA bar ─── */}
        {!isPremium && !pending && settings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ ...iosSpring, delay: 0.4 }}
            className="fixed bottom-[68px] left-0 right-0 z-40 px-4 pb-2 pointer-events-none safe-area-pb"
          >
            <div
              className="max-w-md mx-auto rounded-2xl p-3 pointer-events-auto flex items-center gap-3"
              style={{
                background: 'hsl(var(--background) / 0.78)',
                border: '0.5px solid hsl(var(--border))',
                backdropFilter: 'blur(30px) saturate(180%)',
                WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                boxShadow: '0 -10px 40px -10px hsl(var(--background) / 0.6)',
              }}
            >
              <div className="min-w-0 flex-1 pl-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {PLAN_LABEL[selectedPlan]}
                </p>
                <p className="text-[18px] font-bold leading-tight">₹{selectedPrice}</p>
              </div>
              <motion.button
                onClick={handleUpgrade}
                whileTap={{ scale: 0.96 }}
                className="px-6 py-3.5 rounded-xl font-bold text-[15px] flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 12px 30px -8px hsl(var(--primary) / 0.6)',
                }}
              >
                Get Premium
                <Sparkles className="w-4 h-4" fill="currentColor" />
              </motion.button>
            </div>
          </motion.div>
        )}

        <BottomNav />

        <RedeemCodeModal isOpen={showRedeem} onClose={() => setShowRedeem(false)} />

        <AnimatePresence>
          {showCheckout && settings && (
            <UpiCheckoutSheet
              settings={settings}
              plan={selectedPlan}
              onClose={() => setShowCheckout(false)}
              onRedeem={() => { setShowCheckout(false); setShowRedeem(true); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  );
});

// ─────────── Plan card ───────────

interface PlanCardProps {
  planId: PlanId;
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: number;
  perMonth: string;
  tagline: string;
  badge?: string;
  recommended?: boolean;
}

const PlanCard = memo(function PlanCard({
  selected, onSelect, title, price, perMonth, tagline, badge, recommended,
}: PlanCardProps) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.99 }}
      className="w-full text-left rounded-3xl p-[1.5px] relative transition-all"
      style={{
        background: selected
          ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--primary)) 100%)'
          : recommended
          ? 'linear-gradient(135deg, hsl(var(--primary) / 0.5), hsl(var(--accent) / 0.4), hsl(var(--primary) / 0.5))'
          : 'hsl(var(--border) / 0.6)',
        boxShadow: selected
          ? '0 22px 55px -15px hsl(var(--primary) / 0.55)'
          : recommended
          ? '0 12px 35px -15px hsl(var(--primary) / 0.35)'
          : 'none',
      }}
    >
      {recommended && (
        <div
          className="absolute -top-2.5 right-5 px-2.5 py-1 rounded-full text-[9px] font-bold tracking-[0.18em] uppercase z-10 flex items-center gap-1"
          style={{
            background: 'linear-gradient(135deg, #f5c542, #e8a317)',
            color: '#1a0f00',
            boxShadow: '0 6px 18px -4px rgba(245, 197, 66, 0.6)',
          }}
        >
          <Sparkles className="w-2.5 h-2.5" fill="currentColor" />
          Most Popular
        </div>
      )}

      <div
        className="rounded-[22px] p-5 relative overflow-hidden"
        style={{
          background: selected
            ? 'linear-gradient(160deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--card)) 55%, hsl(var(--accent) / 0.15) 100%)'
            : 'linear-gradient(135deg, hsl(var(--card) / 0.85), hsl(var(--card) / 0.55))',
          backdropFilter: 'blur(12px)',
        }}
      >
        {selected && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(115deg, transparent 40%, hsl(0 0% 100% / 0.06) 50%, transparent 60%)' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          />
        )}

        <div className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              animate={selected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 1.6, repeat: selected ? Infinity : 0, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: selected
                  ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))'
                  : 'transparent',
                border: selected ? 'none' : '1.5px solid hsl(var(--muted-foreground) / 0.4)',
                boxShadow: selected ? '0 6px 18px -4px hsl(var(--primary) / 0.5)' : 'none',
              }}
            >
              {selected && <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3.5} />}
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[17px] font-bold">{title}</p>
                {badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{
                      background: 'linear-gradient(135deg, hsl(var(--accent) / 0.25), hsl(var(--primary) / 0.18))',
                      color: 'hsl(var(--accent))',
                      border: '0.5px solid hsl(var(--accent) / 0.35)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{tagline}</p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[26px] font-bold leading-none tracking-tight">₹{price}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{perMonth}</p>
          </div>
        </div>
      </div>
    </motion.button>
  );
});

// ─────────── UPI Checkout Sheet ───────────

interface CheckoutProps {
  settings: UpiSettings;
  plan: PlanId;
  onClose: () => void;
  onRedeem: () => void;
}

type Step = 'pay' | 'confirm' | 'verifying';

const UpiCheckoutSheet = memo(function UpiCheckoutSheet({ settings, plan, onClose, onRedeem }: CheckoutProps) {
  const haptics = useHaptics();
  const { user } = useAuth();
  const { requireVerified } = useEmailVerified();
  const { refetch: refetchPremium } = usePremium();
  const [step, setStep] = useState<Step>('pay');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);
  const [verifyStage, setVerifyStage] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [activated, setActivated] = useState(false);

  const basePrice = plan === 'quarterly' ? settings.quarterlyPrice : plan === 'bimonthly' ? settings.bimonthlyPrice : settings.monthlyPrice;
  const planLabel = PLAN_LABEL[plan];

  // Unique paise per user (1–99) for auto-matching
  const userPaise = user?.id
    ? (parseInt(user.id.replace(/[^0-9]/g, '').slice(-2) || '7', 10) % 99) + 1
    : 7;
  const amountFinal = `${basePrice}.${String(userPaise).padStart(2, '0')}`;
  const amountPaise = basePrice * 100 + userPaise;

  const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.payeeName)}&am=${amountFinal}&cu=INR&tn=${encodeURIComponent(`Premium-${plan}-${user?.id?.slice(0, 8) ?? ''}`)}`;

  const copyUpi = () => { navigator.clipboard.writeText(settings.upiId); haptics.light(); toast({ title: 'UPI ID copied' }); };
  const copyAmount = () => { navigator.clipboard.writeText(amountFinal); haptics.light(); toast({ title: 'Amount copied' }); };
  const openUpiApp = () => { haptics.medium(); window.location.href = upiUrl; };

  const submitUtr = async () => {
    if (!user) { toast({ title: 'Please sign in first', variant: 'destructive' }); return; }
    if (!requireVerified('submit a payment')) return;
    const cleanUtr = utr.trim();
    if (cleanUtr.length < 6) { toast({ title: 'Enter a valid UTR / transaction ID', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.from('payment_requests').insert({
        user_id: user.id,
        amount_paise: amountPaise,
        utr_number: cleanUtr,
        status: 'pending',
        plan,
      }).select('id').single();
      if (error) {
        if (error.code === '23505') toast({ title: 'This transaction ID is already submitted', variant: 'destructive' });
        else toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
        setSubmitting(false); return;
      }
      haptics.success();
      setPaymentRequestId(data?.id ?? null);
      setStep('verifying');
      setVerifyStage(1);
      // Fire-and-forget Telegram notification
      supabase.functions.invoke('telegram-notify', {
        body: {
          event: 'payment_submitted',
          email: user.email,
          user_id: user.id,
          plan,
          amount_inr: Math.round(amountPaise / 100),
          utr: cleanUtr,
        },
      }).catch(() => {});
    } catch {
      toast({ title: 'Something went wrong', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  // ── Live verification: progress through stages + listen for activation ──
  useEffect(() => {
    if (step !== 'verifying' || !user) return;

    // Animated stage advancement (visual progress while verifying)
    const stageTimers: number[] = [];
    stageTimers.push(window.setTimeout(() => setVerifyStage(s => (s < 2 ? 2 : s)), 1500));
    stageTimers.push(window.setTimeout(() => setVerifyStage(s => (s < 3 ? 3 : s)), 3500));

    // Realtime: payment_requests row changes (admin approving)
    const prChannel = paymentRequestId
      ? supabase
          .channel(`pr-${paymentRequestId}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_requests',
            filter: `id=eq.${paymentRequestId}`,
          }, (payload) => {
            const status = (payload.new as any)?.status;
            if (status === 'approved' || status === 'auto_approved') {
              setVerifyStage(4);
            } else if (status === 'rejected') {
              toast({ title: 'Payment could not be verified', description: 'Please contact support with your UTR.', variant: 'destructive' });
            }
          })
          .subscribe()
      : null;

    // Realtime: subscription becomes active premium
    const subChannel = supabase
      .channel(`sub-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = (payload.new as any);
        const isPrem = row?.status === 'active'
          && (row?.subscription_type === 'premium_monthly' || row?.subscription_type === 'premium_yearly');
        if (isPrem) {
          setVerifyStage(4);
          setActivated(true);
          haptics.success();
          refetchPremium();
        }
      })
      .subscribe();

    // Polling fallback (in case realtime is filtered)
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('status, subscription_type, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      const isPrem = data?.status === 'active'
        && (data?.subscription_type === 'premium_monthly' || data?.subscription_type === 'premium_yearly')
        && (!data?.expires_at || new Date(data.expires_at) > new Date());
      if (isPrem) {
        setVerifyStage(4);
        setActivated(true);
        haptics.success();
        refetchPremium();
      }
    }, 5000);

    return () => {
      stageTimers.forEach(t => clearTimeout(t));
      if (prChannel) supabase.removeChannel(prChannel);
      supabase.removeChannel(subChannel);
      clearInterval(poll);
    };
  }, [step, user, paymentRequestId, haptics, refetchPremium]);


  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={iosSpring}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 max-h-[92vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)), hsl(var(--background)))',
          border: '0.5px solid hsl(var(--border))',
        }}
      >
        <div className="w-12 h-1 rounded-full bg-muted mx-auto mb-5" />

        {step === 'pay' && (
          <>
            <div className="text-center mb-5">
              <div
                className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
              >
                <Crown className="w-7 h-7 text-primary-foreground" />
              </div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{planLabel} · Premium</p>
              <h3 className="text-[22px] font-bold">Pay ₹{amountFinal}</h3>
              <p className="text-[12px] text-muted-foreground mt-1">
                Unique amount helps us auto-match your payment
              </p>
            </div>

            <div
              className="rounded-2xl p-5 mb-3 text-center"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--accent) / 0.12))',
                border: '0.5px solid hsl(var(--primary) / 0.3)',
              }}
            >
              <p className="text-[11px] tracking-widest uppercase text-muted-foreground mb-1">Amount</p>
              <button onClick={copyAmount} className="inline-flex items-center gap-2 group">
                <span className="text-[36px] font-bold tracking-tight">₹{amountFinal}</span>
                <Copy className="w-4 h-4 text-muted-foreground group-active:text-primary" />
              </button>
              <p className="text-[11px] text-muted-foreground mt-1">Tap to copy · Pay this exact amount</p>
            </div>

            <button
              onClick={copyUpi}
              className="w-full rounded-2xl p-4 mb-4 flex items-center justify-between"
              style={{ background: 'hsl(var(--muted) / 0.4)', border: '0.5px solid hsl(var(--border) / 0.5)' }}
            >
              <div className="text-left">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground">UPI ID</p>
                <p className="font-semibold text-[15px] mt-0.5">{settings.upiId}</p>
              </div>
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>

            <button
              onClick={openUpiApp}
              className="w-full py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 mb-3"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 10px 30px -10px hsl(var(--primary) / 0.5)',
              }}
            >
              Open UPI app
            </button>

            <button
              onClick={() => { haptics.light(); setStep('confirm'); }}
              className="w-full py-3.5 rounded-2xl font-semibold text-[15px]"
              style={{ background: 'hsl(var(--muted) / 0.5)', border: '0.5px solid hsl(var(--border) / 0.5)' }}
            >
              I've paid · Submit transaction ID
            </button>

            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              onClick={onRedeem}
              className="w-full py-3 text-[14px] font-semibold text-primary flex items-center justify-center gap-1.5"
            >
              <Gift className="w-4 h-4" />
              Redeem a code instead
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <button onClick={() => setStep('pay')} className="text-[14px] text-primary mb-4 flex items-center">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h3 className="text-[22px] font-bold mb-1">Submit transaction ID</h3>
            <p className="text-[13px] text-muted-foreground mb-5">
              Find the 12-digit UTR / Transaction ID in your UPI app's payment receipt.
            </p>

            <input
              type="text"
              value={utr}
              onChange={e => setUtr(e.target.value)}
              placeholder="e.g. 412345678901"
              autoComplete="off"
              maxLength={30}
              className="w-full px-4 py-4 rounded-2xl text-[16px] font-mono tracking-wider mb-3 bg-transparent outline-none"
              style={{
                background: 'hsl(var(--muted) / 0.4)',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              }}
            />

            <div
              className="rounded-2xl p-3 mb-4 text-[12px] leading-relaxed"
              style={{ background: 'hsl(var(--primary) / 0.08)', border: '0.5px solid hsl(var(--primary) / 0.2)' }}
            >
              <p className="text-foreground/80">
                <strong className="text-primary">Auto-verify:</strong> We match the unique amount{' '}
                <strong>(₹{amountFinal})</strong> with your bank UTR. Premium activates within minutes.
              </p>
            </div>

            <button
              onClick={submitUtr}
              disabled={submitting || utr.trim().length < 6}
              className="w-full py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit & Activate'}
            </button>
          </>
        )}

        {step === 'verifying' && (
          <SubmittedConfirmation
            activated={activated}
            amount={amountFinal}
            utr={utr}
            onClose={onClose}
          />
        )}
      </motion.div>
    </motion.div>
  );
});

// ─────────── Live verification UI ───────────

interface SubmittedConfirmationProps {
  activated: boolean;
  amount: string;
  utr: string;
  onClose: () => void;
}

/**
 * Sheet confirmation shown right after the user submits a UTR.
 * Closes the sheet and lets the page-level PendingProgressBanner take over.
 */
const SubmittedConfirmation = memo(function SubmittedConfirmation({
  activated, amount, utr, onClose,
}: SubmittedConfirmationProps) {
  if (activated) {
    return (
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={iosBounce}
          className="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            boxShadow: '0 20px 50px -10px hsl(var(--primary) / 0.6)',
          }}
        >
          <Crown className="w-12 h-12 text-primary-foreground" fill="currentColor" />
        </motion.div>
        <h3 className="text-[26px] font-bold mb-2">You're Premium 🎉</h3>
        <p className="text-[14px] text-muted-foreground mb-6 px-4">
          Premium is now live on your account. Enjoy the upgrade.
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-bold text-[16px]"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          Start listening
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={iosBounce}
        className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--accent) / 0.18))',
          border: '1px solid hsl(var(--primary) / 0.4)',
        }}
      >
        <Check className="w-10 h-10 text-primary" strokeWidth={3} />
      </motion.div>
      <h3 className="text-[22px] font-bold mb-2">Got it — payment received</h3>
      <p className="text-[13.5px] text-muted-foreground mb-1 px-2 leading-relaxed">
        We've recorded your UTR <strong className="text-foreground">{utr.slice(0, 6)}…</strong> for ₹{amount}.
      </p>
      <p className="text-[13px] text-muted-foreground mb-6 px-4 leading-relaxed">
        Verification is now running in the background. You can watch live progress on the Premium page —
        and we'll send a push the moment Premium activates.
      </p>
      <button
        onClick={onClose}
        className="w-full py-4 rounded-2xl font-bold text-[16px]"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
          color: 'hsl(var(--primary-foreground))',
        }}
      >
        See live progress
      </button>
    </div>
  );
});

// ─────────── Pending progress banner (shown on /premium when a UTR is awaiting verification) ───────────

interface PendingProgressBannerProps {
  pending: PendingPayment;
}

const PendingProgressBanner = memo(function PendingProgressBanner({ pending }: PendingProgressBannerProps) {
  // Animated stage advancement to feel "live" — caps at stage 3 (last step is activation)
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(pending.created_at).getTime();
    const tick = () => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      setElapsed(seconds);
      if (seconds < 20) setStage(1);
      else if (seconds < 60) setStage(2);
      else setStage(3);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pending.created_at]);

  const amountInr = (pending.amount_paise / 100).toFixed(2);
  const planLabel = (PLAN_LABEL as Record<string, string>)[pending.plan] ?? pending.plan;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const steps = [
    { label: 'Payment received', detail: `UTR ${pending.utr_number.slice(0, 6)}…` },
    { label: 'Verifying with bank', detail: `Matching ₹${amountInr}` },
    { label: 'Activating your Premium', detail: 'Almost there — stay close' },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={iosSpring}
      className="rounded-3xl p-6 relative overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, hsl(var(--primary) / 0.22) 0%, hsl(var(--card)) 60%, hsl(var(--accent) / 0.18) 100%)',
        border: '1px solid hsl(var(--primary) / 0.4)',
        boxShadow: '0 20px 60px -20px hsl(var(--primary) / 0.45)',
      }}
    >
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)', filter: 'blur(30px)' }}
      />

      <div className="flex items-center gap-3 mb-1 relative">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'hsl(var(--primary) / 0.2)' }}
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.22em] text-primary uppercase">
            You're so close
          </p>
          <h2 className="text-[20px] font-bold leading-tight">Activating Premium · {planLabel}</h2>
        </div>
      </div>

      <p className="text-[13px] text-muted-foreground mb-5 relative">
        Your payment of <strong className="text-foreground">₹{amountInr}</strong> is being matched with our bank records.
        This usually takes <strong className="text-foreground">1–2 minutes</strong>.
      </p>

      <div className="space-y-2 mb-4 relative">
        {steps.map((s, idx) => {
          const done = stage > (idx + 1) as any;
          const active = stage === (idx + 1);
          const pendingStep = !done && !active;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 p-3 rounded-2xl"
              style={{
                background: active
                  ? 'hsl(var(--primary) / 0.12)'
                  : done
                  ? 'hsl(var(--primary) / 0.06)'
                  : 'hsl(var(--muted) / 0.25)',
                border: `0.5px solid ${active ? 'hsl(var(--primary) / 0.4)' : 'hsl(var(--border) / 0.4)'}`,
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: done
                    ? 'hsl(var(--primary))'
                    : active
                    ? 'hsl(var(--primary) / 0.25)'
                    : 'hsl(var(--muted) / 0.6)',
                }}
              >
                {done ? (
                  <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                ) : active ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                ) : (
                  <span className="text-[10px] text-muted-foreground font-bold">{idx + 1}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] font-semibold ${pendingStep ? 'text-muted-foreground' : ''}`}>
                  {s.label}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{s.detail}</p>
              </div>
              {active && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-3 flex items-center gap-2 relative"
        style={{ background: 'hsl(var(--background) / 0.5)', border: '0.5px solid hsl(var(--border) / 0.5)' }}
      >
        <Clock className="w-4 h-4 text-primary shrink-0" />
        <p className="text-[12px] text-foreground/80 flex-1">
          Waiting <strong className="text-foreground">{mins > 0 ? `${mins}m ` : ''}{secs}s</strong> · You'll get a push notification the instant it's live.
        </p>
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
      </div>
    </motion.section>
  );
});

export default PremiumPage;
