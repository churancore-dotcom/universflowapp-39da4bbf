import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Activity, Crown, Globe, Smartphone, Music, PlayCircle, RefreshCw, TrendingUp, Headphones,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Range = 7 | 14 | 30 | 90;

const COLORS = ['#FF2D55', '#0A84FF', '#30D158', '#FFD60A', '#BF5AF2', '#FF9F0A', '#64D2FF', '#FF375F'];

const fmtDay = (d: Date) => d.toISOString().slice(0, 10);
const fmtShort = (s: string) => {
  const d = new Date(s + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const LiveInsights = () => {
  const [range, setRange] = useState<Range>(14);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [signups, setSignups] = useState<{ date: string; count: number }[]>([]);
  const [dau, setDau] = useState<{ date: string; users: number; plays: number }[]>([]);
  const [countries, setCountries] = useState<{ name: string; value: number }[]>([]);
  const [platforms, setPlatforms] = useState<{ name: string; value: number }[]>([]);
  const [topSongs, setTopSongs] = useState<{ title: string; artist: string; plays: number }[]>([]);
  const [topArtists, setTopArtists] = useState<{ name: string; plays: number }[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    users: 0, newUsers: 0, premium: 0, dauNow: 0, playsRange: 0, devices: 0,
  });

  const load = async (showSpinner = true) => {
    if (showSpinner) setLoading(true); else setRefreshing(true);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - range);
    since.setUTCHours(0, 0, 0, 0);
    const sinceIso = since.toISOString();

    const [
      { count: usersCount },
      { count: premiumCount },
      { count: devicesCount },
      { data: newProfiles },
      { data: events },
      { data: countryRows },
      { data: deviceRows },
      { data: recent },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_subscriptions').select('*', { count: 'exact', head: true })
        .eq('status', 'active').in('subscription_type', ['premium_monthly', 'premium_yearly']),
      supabase.from('device_tokens').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('created_at').gte('created_at', sinceIso),
      supabase.from('song_play_events').select('user_id, title, artist, action, created_at')
        .gte('created_at', sinceIso).limit(10000),
      supabase.from('profiles').select('country_code').not('country_code', 'is', null),
      supabase.from('device_tokens').select('platform'),
      supabase.from('profiles').select('user_id, email, username, avatar_url, country_code, created_at')
        .order('created_at', { ascending: false }).limit(10),
    ]);

    // signups per day
    const sMap: Record<string, number> = {};
    const dMap: Record<string, { users: Set<string>; plays: number }> = {};
    for (let i = 0; i <= range; i++) {
      const d = new Date(since); d.setUTCDate(since.getUTCDate() + i);
      const k = fmtDay(d);
      sMap[k] = 0;
      dMap[k] = { users: new Set(), plays: 0 };
    }
    (newProfiles || []).forEach((p: any) => {
      const k = fmtDay(new Date(p.created_at));
      if (k in sMap) sMap[k]++;
    });
    (events || []).forEach((e: any) => {
      const k = fmtDay(new Date(e.created_at));
      if (!dMap[k]) return;
      if (e.user_id) dMap[k].users.add(e.user_id);
      if (e.action === 'stream') dMap[k].plays++;
    });

    const signupsArr = Object.entries(sMap).map(([date, count]) => ({ date, count }));
    const dauArr = Object.entries(dMap).map(([date, v]) => ({ date, users: v.users.size, plays: v.plays }));

    // top songs/artists
    const songMap: Record<string, { title: string; artist: string; plays: number }> = {};
    const artistMap: Record<string, number> = {};
    (events || []).filter((e: any) => e.action === 'stream' && e.title).forEach((e: any) => {
      const key = `${e.title}::${e.artist}`;
      if (!songMap[key]) songMap[key] = { title: e.title, artist: e.artist || 'Unknown', plays: 0 };
      songMap[key].plays++;
      if (e.artist) artistMap[e.artist] = (artistMap[e.artist] || 0) + 1;
    });
    const topSongsArr = Object.values(songMap).sort((a, b) => b.plays - a.plays).slice(0, 10);
    const topArtistsArr = Object.entries(artistMap)
      .map(([name, plays]) => ({ name, plays })).sort((a, b) => b.plays - a.plays).slice(0, 8);

    // countries
    const cMap: Record<string, number> = {};
    (countryRows || []).forEach((r: any) => {
      const cc = (r.country_code || 'XX').toUpperCase();
      cMap[cc] = (cMap[cc] || 0) + 1;
    });
    const countriesArr = Object.entries(cMap).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 10);

    // platforms
    const pMap: Record<string, number> = {};
    (deviceRows || []).forEach((r: any) => {
      const p = (r.platform || 'unknown').toLowerCase();
      pMap[p] = (pMap[p] || 0) + 1;
    });
    const platformsArr = Object.entries(pMap).map(([name, value]) => ({ name, value }));

    setSignups(signupsArr);
    setDau(dauArr);
    setCountries(countriesArr);
    setPlatforms(platformsArr);
    setTopSongs(topSongsArr);
    setTopArtists(topArtistsArr);
    setRecentUsers(recent || []);
    setTotals({
      users: usersCount || 0,
      newUsers: (newProfiles || []).length,
      premium: premiumCount || 0,
      dauNow: dauArr[dauArr.length - 1]?.users || 0,
      playsRange: (events || []).filter((e: any) => e.action === 'stream').length,
      devices: devicesCount || 0,
    });

    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(true); }, [range]);

  // Realtime: refresh quietly when new data lands
  useEffect(() => {
    const ch = supabase
      .channel('admin-live-insights')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => load(false))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'song_play_events' }, () => load(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const premiumPct = useMemo(() =>
    totals.users ? Math.round((totals.premium / totals.users) * 1000) / 10 : 0, [totals]);

  const statCards = [
    { icon: Users, label: 'Total Users', value: totals.users, color: 'from-rose-500 to-pink-500' },
    { icon: TrendingUp, label: `New (${range}d)`, value: totals.newUsers, color: 'from-emerald-500 to-green-400' },
    { icon: Activity, label: 'Active Today', value: totals.dauNow, color: 'from-blue-500 to-cyan-400' },
    { icon: PlayCircle, label: `Plays (${range}d)`, value: totals.playsRange, color: 'from-orange-500 to-yellow-400' },
    { icon: Crown, label: `Premium (${premiumPct}%)`, value: totals.premium, color: 'from-amber-500 to-yellow-400' },
    { icon: Smartphone, label: 'Devices', value: totals.devices, color: 'from-violet-500 to-purple-400' },
  ];

  const tooltipStyle = {
    contentStyle: { background: 'rgba(20,20,24,0.92)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 },
    labelStyle: { color: '#fff' },
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start md:items-center justify-between flex-col md:flex-row gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Live Insights</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time charts on users, activity, geography and content
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {([7, 14, 30, 90] as Range[]).map(r => (
            <Button key={r} size="sm" variant={range === r ? 'default' : 'outline'}
              onClick={() => setRange(r)} className="text-xs">{r}d</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => load(false)} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} className="glass rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-0.5">{loading ? '…' : s.value.toLocaleString()}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Signups + DAU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Signups per day</h3>
            <span className="text-xs text-muted-foreground">{totals.newUsers} new users</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signups}>
                <defs>
                  <linearGradient id="gSignups" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#30D158" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#30D158" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} labelFormatter={fmtShort} />
                <Area type="monotone" dataKey="count" stroke="#30D158" fill="url(#gSignups)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Active users & plays</h3>
            <span className="text-xs text-muted-foreground">DAU & streams</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dau}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShort} stroke="rgba(255,255,255,0.4)" fontSize={11} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} labelFormatter={fmtShort} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="users" stroke="#0A84FF" strokeWidth={2} dot={false} name="Active users" />
                <Line type="monotone" dataKey="plays" stroke="#FF2D55" strokeWidth={2} dot={false} name="Plays" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Geography + Platforms + Top artists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Top countries</h3>
          <div className="h-64">
            {countries.length === 0 ? <Empty label="No country data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countries} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} width={40} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill="#0A84FF" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Smartphone className="w-4 h-4 text-violet-400" /> Devices</h3>
          <div className="h-64">
            {platforms.length === 0 ? <Empty label="No devices registered" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={platforms} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                    {platforms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Headphones className="w-4 h-4 text-rose-400" /> Top artists</h3>
          <div className="h-64">
            {topArtists.length === 0 ? <Empty label="No play data yet" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topArtists}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="plays" fill="#FF2D55" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top songs + Recent signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Music className="w-4 h-4 text-amber-400" /> Top songs ({range}d)</h3>
          {topSongs.length === 0 ? <Empty label="No streams yet" /> : (
            <div className="space-y-2">
              {topSongs.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <span className={`w-6 text-center font-bold ${i < 3 ? 'text-rose-400' : 'text-muted-foreground'}`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.plays} plays</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-emerald-400" /> Newest users</h3>
          {recentUsers.length === 0 ? <Empty label="No users" /> : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-xs font-bold overflow-hidden">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> :
                      (u.username || u.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.username || u.email || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.country_code ? `${u.country_code} · ` : ''}{new Date(u.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Empty = ({ label }: { label: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
    <Activity className="w-8 h-8 opacity-40 mb-2" />
    {label}
  </div>
);

export default LiveInsights;
