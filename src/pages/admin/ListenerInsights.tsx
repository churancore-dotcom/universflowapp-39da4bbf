import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, PlayCircle, Globe2, TrendingUp } from 'lucide-react';

type Ev = {
  user_id: string | null;
  session_id: string | null;
  track_id: string;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
  country_code: string | null;
  action: string;
  created_at: string;
};

const ListenerInsights = () => {
  const [evs, setEvs] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
      const { data, error } = await supabase
        .from('song_play_events')
        .select('user_id, session_id, track_id, title, artist, cover_url, country_code, action, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(5000);
      if (!active) return;
      if (error) setErr(error.message);
      else setEvs((data ?? []) as Ev[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const now = Date.now();
  const within = (hours: number) => evs.filter((e) => now - new Date(e.created_at).getTime() < hours * 3600 * 1000);

  const day = within(24);
  const week = within(24 * 7);
  const month = evs;

  const uniq = (arr: Ev[]) => new Set(arr.map((e) => e.user_id || e.session_id || '').filter(Boolean)).size;
  const dau = uniq(day);
  const wau = uniq(week);
  const mau = uniq(month);
  const streamsToday = day.filter((e) => e.action === 'stream').length;

  // Top tracks last 7 days by stream weight
  const topMap = new Map<string, { title: string; artist: string; cover: string | null; streams: number; saves: number }>();
  for (const e of week) {
    const k = e.track_id;
    const r = topMap.get(k) || { title: e.title || '—', artist: e.artist || '—', cover: e.cover_url, streams: 0, saves: 0 };
    if (e.action === 'stream') r.streams += 1;
    if (e.action === 'save') r.saves += 1;
    topMap.set(k, r);
  }
  const topTracks = [...topMap.entries()]
    .sort((a, b) => b[1].streams - a[1].streams)
    .slice(0, 15);

  // Top countries last 30 days
  const ctyMap = new Map<string, number>();
  for (const e of month) {
    if (!e.country_code) continue;
    ctyMap.set(e.country_code, (ctyMap.get(e.country_code) || 0) + 1);
  }
  const topCountries = [...ctyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCty = Math.max(1, ...topCountries.map(([, n]) => n));

  const stats = [
    { icon: Users, label: 'DAU (24h)', value: dau, color: 'from-emerald-500 to-teal-400' },
    { icon: Users, label: 'WAU (7d)', value: wau, color: 'from-primary to-accent' },
    { icon: Users, label: 'MAU (30d)', value: mau, color: 'from-blue-500 to-cyan-400' },
    { icon: PlayCircle, label: 'Streams today', value: streamsToday, color: 'from-rose-500 to-pink-400' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display font-bold">Listener Insights</h1>
        <p className="text-muted-foreground mt-1 text-sm">Live from play events · last 30 days</p>
      </div>

      {err && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{err}</div>}
      {loading && <div className="text-muted-foreground text-sm">Loading…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="glass-strong rounded-2xl p-4 md:p-5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-xl md:text-2xl font-bold mt-1">{s.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Top Tracks (7 days)</h2>
          </div>
          <div className="space-y-2">
            {topTracks.length === 0 && <div className="text-sm text-muted-foreground">No plays yet.</div>}
            {topTracks.map(([id, t], idx) => (
              <div key={id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{idx + 1}</span>
                {t.cover ? (
                  <img src={t.cover} alt="" className="w-10 h-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{t.streams}</div>
                  <div className="text-xs text-muted-foreground">streams</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Top Countries (30 days)</h2>
          </div>
          <div className="space-y-3">
            {topCountries.length === 0 && <div className="text-sm text-muted-foreground">No location data yet.</div>}
            {topCountries.map(([code, n]) => (
              <div key={code}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{code}</span>
                  <span className="text-muted-foreground">{n.toLocaleString()} events</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${(n / maxCty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListenerInsights;
