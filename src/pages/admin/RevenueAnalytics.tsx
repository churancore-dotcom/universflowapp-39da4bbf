import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Users, Crown, CreditCard, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RevenueData {
  month: string;
  subscriptions: number;
  donations: number;
  total: number;
}

interface SubscriptionBreakdown {
  type: string;
  count: number;
  revenue: number;
  color: string;
}

const PRICE_MONTHLY = 9.99;
const PRICE_YEARLY = 99.99;

const RevenueAnalytics = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [avgRevPerUser, setAvgRevPerUser] = useState(0);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [subscriptionBreakdown, setSubscriptionBreakdown] = useState<SubscriptionBreakdown[]>([]);
  const [retentionRate, setRetentionRate] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [lifetimeValue, setLifetimeValue] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: allSubs },
        { data: donations },
        { count: totalUsers },
      ] = await Promise.all([
        supabase.from('user_subscriptions').select('subscription_type, status, created_at, expires_at, updated_at'),
        supabase.from('donations').select('amount, created_at'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
      ]);

      const subs = allSubs || [];
      const dons = donations || [];

      const activeSubs = subs.filter(s =>
        s.status === 'active' &&
        s.subscription_type !== 'free' &&
        (!s.expires_at || new Date(s.expires_at) > new Date())
      );
      const monthlyCount = activeSubs.filter(s => s.subscription_type === 'premium_monthly').length;
      const yearlyCount = activeSubs.filter(s => s.subscription_type === 'premium_yearly').length;

      const totalDonations = dons.reduce((acc, d) => acc + Number(d.amount || 0), 0);
      const subMonthlyEquivalent = monthlyCount * PRICE_MONTHLY + yearlyCount * (PRICE_YEARLY / 12);

      setTotalRevenue(subMonthlyEquivalent + totalDonations);
      setActiveSubscribers(activeSubs.length);
      setAvgRevPerUser(activeSubs.length ? subMonthlyEquivalent / activeSubs.length : 0);

      // Build a real 6-month series from created_at of subs + donations
      const months: RevenueData[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = start.toLocaleString('en', { month: 'short' });
        const subRev = subs
          .filter(s => {
            const d = new Date(s.created_at);
            return d >= start && d < end && s.subscription_type !== 'free';
          })
          .reduce((acc, s) => acc + (s.subscription_type === 'premium_monthly' ? PRICE_MONTHLY : PRICE_YEARLY), 0);
        const donRev = dons
          .filter(d => {
            const dt = new Date(d.created_at);
            return dt >= start && dt < end;
          })
          .reduce((acc, d) => acc + Number(d.amount || 0), 0);
        months.push({ month: monthName, subscriptions: Math.round(subRev), donations: Math.round(donRev), total: Math.round(subRev + donRev) });
      }
      setRevenueData(months);

      // Real month-over-month growth
      const last = months[months.length - 1]?.total || 0;
      const prev = months[months.length - 2]?.total || 0;
      setMonthlyGrowth(prev === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - prev) / prev) * 1000) / 10);

      setSubscriptionBreakdown([
        { type: 'Monthly Premium', count: monthlyCount, revenue: monthlyCount * PRICE_MONTHLY, color: 'hsl(var(--primary))' },
        { type: 'Yearly Premium', count: yearlyCount, revenue: yearlyCount * PRICE_YEARLY, color: 'hsl(var(--accent))' },
        { type: 'Donations', count: dons.length, revenue: totalDonations, color: 'hsl(142 71% 45%)' },
      ]);

      // Key metrics — real
      const expired = subs.filter(s => s.status === 'expired' || s.status === 'cancelled').length;
      const everPaid = subs.filter(s => s.subscription_type !== 'free').length;
      setChurnRate(everPaid ? Math.round((expired / everPaid) * 1000) / 10 : 0);
      setRetentionRate(everPaid ? Math.round(((everPaid - expired) / everPaid) * 1000) / 10 : 0);
      setConversionRate(totalUsers ? Math.round((activeSubs.length / totalUsers) * 1000) / 10 : 0);
      // LTV ≈ avg monthly revenue / churn rate (simple model). Fall back to accumulated if churn=0.
      const monthlyChurnRatio = everPaid ? expired / everPaid / 12 : 0;
      const ltv = monthlyChurnRatio > 0
        ? subMonthlyEquivalent / Math.max(activeSubs.length, 1) / monthlyChurnRatio
        : (totalDonations + subs.filter(s => s.subscription_type === 'premium_yearly').length * PRICE_YEARLY
           + subs.filter(s => s.subscription_type === 'premium_monthly').length * PRICE_MONTHLY) / Math.max(everPaid, 1);
      setLifetimeValue(Math.round(ltv * 100) / 100 || 0);
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenueData();
    const ch = supabase
      .channel('revenue_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' }, () => fetchRevenueData())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'donations' }, () => fetchRevenueData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRevenueData]);

  const stats = [
    { label: 'Total Monthly Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, change: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth}%`, isPositive: monthlyGrowth >= 0 },
    { label: 'Active Subscribers', value: activeSubscribers.toString(), icon: Crown, change: '', isPositive: true },
    { label: 'Avg Revenue/User', value: `$${avgRevPerUser.toFixed(2)}`, icon: Users, change: '', isPositive: true },
    { label: 'MoM Growth', value: `${monthlyGrowth}%`, icon: TrendingUp, change: '', isPositive: monthlyGrowth >= 0 },
  ];

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Revenue Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Real-time revenue from subscriptions and donations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRevenueData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="glass rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                {stat.change && (
                  <span className={`flex items-center text-xs font-medium ${stat.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-display font-bold mt-0.5">{loading ? '…' : stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Revenue Over Time (last 6 months)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value}`, '']} />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#revenueGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-accent" /> Revenue Breakdown
          </h2>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={subscriptionBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="revenue">
                  {subscriptionBreakdown.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              {subscriptionBreakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${item.revenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{item.count} users</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-lg font-display font-bold mb-4">Key Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-primary">{retentionRate}%</p>
            <p className="text-sm text-muted-foreground">Retention Rate</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-green-400">{conversionRate}%</p>
            <p className="text-sm text-muted-foreground">Free → Premium</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-accent">${lifetimeValue.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Avg Lifetime Value</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-orange-400">{churnRate}%</p>
            <p className="text-sm text-muted-foreground">Churn Rate</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RevenueAnalytics;
