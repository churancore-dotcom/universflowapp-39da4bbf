import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, TrendingUp, CheckCircle2, Clock, XCircle, Crown } from 'lucide-react';

type Row = {
  amount_paise: number;
  plan: string | null;
  status: string;
  created_at: string;
};

const fmtINR = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

const RevenueInsights = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
      const { data, error } = await supabase
        .from('payment_requests')
        .select('amount_paise, plan, status, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const approved = rows.filter((r) => r.status === 'approved');
  const pending = rows.filter((r) => r.status === 'pending');
  const rejected = rows.filter((r) => r.status === 'rejected');

  const totalRevenue = approved.reduce((s, r) => s + (r.amount_paise || 0), 0);
  const last30 = approved.filter((r) => new Date(r.created_at).getTime() > Date.now() - 30 * 86400000);
  const revenue30 = last30.reduce((s, r) => s + (r.amount_paise || 0), 0);
  const last7 = approved.filter((r) => new Date(r.created_at).getTime() > Date.now() - 7 * 86400000);
  const revenue7 = last7.reduce((s, r) => s + (r.amount_paise || 0), 0);

  const byPlan = approved.reduce<Record<string, { count: number; sum: number }>>((acc, r) => {
    const key = r.plan || 'unknown';
    acc[key] = acc[key] || { count: 0, sum: 0 };
    acc[key].count += 1;
    acc[key].sum += r.amount_paise || 0;
    return acc;
  }, {});

  // Daily revenue last 30 days
  const days: { label: string; sum: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const sum = approved
      .filter((r) => r.created_at.startsWith(key))
      .reduce((s, r) => s + (r.amount_paise || 0), 0);
    days.push({ label: key.slice(5), sum });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.sum));

  const stats = [
    { icon: IndianRupee, label: 'Total Revenue (90d)', value: fmtINR(totalRevenue), color: 'from-emerald-500 to-teal-400' },
    { icon: TrendingUp, label: 'Last 30 days', value: fmtINR(revenue30), color: 'from-primary to-accent' },
    { icon: TrendingUp, label: 'Last 7 days', value: fmtINR(revenue7), color: 'from-blue-500 to-cyan-400' },
    { icon: CheckCircle2, label: 'Approved', value: approved.length, color: 'from-emerald-500 to-lime-400' },
    { icon: Clock, label: 'Pending', value: pending.length, color: 'from-amber-500 to-orange-400' },
    { icon: XCircle, label: 'Rejected', value: rejected.length, color: 'from-rose-500 to-pink-400' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Revenue Insights</h1>
        <p className="text-muted-foreground mt-1 text-sm">Live from payment requests · last 90 days</p>
      </div>

      {err && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>}
      {loading && <div className="text-muted-foreground text-sm">Loading…</div>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="glass-strong rounded-2xl p-4 md:p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl md:text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Revenue by Plan (approved)</h2>
          <div className="space-y-3">
            {Object.entries(byPlan).length === 0 && (
              <div className="text-sm text-muted-foreground">No approved payments yet.</div>
            )}
            {Object.entries(byPlan)
              .sort((a, b) => b[1].sum - a[1].sum)
              .map(([plan, v]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-medium capitalize">{plan}</span>
                    <span className="text-xs text-muted-foreground">× {v.count}</span>
                  </div>
                  <span className="font-bold">{fmtINR(v.sum)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h2 className="font-semibold mb-4">Daily Revenue (30d)</h2>
          <div className="flex items-end gap-1 h-40">
            {days.map((d) => (
              <div key={d.label} className="flex-1 group relative flex flex-col items-center justify-end">
                <div
                  className="w-full bg-gradient-to-t from-primary to-accent rounded-t opacity-80 group-hover:opacity-100 transition-opacity"
                  style={{ height: `${(d.sum / maxDay) * 100}%`, minHeight: d.sum > 0 ? 2 : 0 }}
                  title={`${d.label}: ${fmtINR(d.sum)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex justify-between">
            <span>{days[0]?.label}</span>
            <span>{days[days.length - 1]?.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueInsights;
