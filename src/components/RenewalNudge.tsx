import { memo, useMemo } from 'react';
import { CalendarClock, ShieldCheck } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';

/**
 * Shows a soft renewal nudge on the Profile/Premium pages when a premium
 * subscription is within 7 days of expiring. Silent otherwise.
 */
const RenewalNudge = memo(function RenewalNudge() {
  const { isPremium, subscription } = usePremium();

  const renewal = useMemo(() => {
    if (!isPremium || !subscription?.expires_at) return null;
    const expiresAt = new Date(subscription.expires_at);
    const ms = expiresAt.getTime() - Date.now();
    if (ms <= 0) return null;
    const daysLeft = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return {
      daysLeft,
      date: expiresAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  }, [isPremium, subscription?.expires_at]);

  if (!renewal || renewal.daysLeft > 7) return null;

  return (
    <section
      className="w-full mt-3 rounded-2xl p-4 text-left"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.14), hsl(var(--card) / 0.86))',
        border: '1px solid hsl(var(--primary) / 0.28)',
        boxShadow: '0 14px 38px -24px hsl(var(--primary) / 0.8)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
        >
          <CalendarClock className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-primary mb-1">
            Subscription status
          </p>
          <p className="text-sm font-bold leading-snug">
            {renewal.daysLeft <= 1 ? 'Your Premium renews soon' : `${renewal.daysLeft} days left on Premium`}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
            Active until {renewal.date}. Your Premium features stay unlocked until then.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>No page jump — this is only a status reminder.</span>
      </div>
    </section>
  );
});

export default RenewalNudge;
