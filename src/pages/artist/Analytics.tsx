import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Music2, Heart, Download, Eye, Play, Globe2, Loader2, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { ArtistSong, fmt } from './_shared';
import BentoCard from '@/components/artist/BentoCard';

type Ctx = { songs: ArtistSong[]; followers: number };

type Metric = 'play_count' | 'view_count' | 'like_count' | 'download_count';
type Range = 'day' | 'week' | 'month';

const METRICS: Array<{ key: Metric; label: string; icon: React.ReactNode }> = [
  { key: 'play_count', label: 'Plays', icon: <Play className="w-3.5 h-3.5" /> },
  { key: 'view_count', label: 'Views', icon: <Eye className="w-3.5 h-3.5" /> },
  { key: 'like_count', label: 'Likes', icon: <Heart className="w-3.5 h-3.5" /> },
  { key: 'download_count', label: 'Downloads', icon: <Download className="w-3.5 h-3.5" /> },
];

const RANGES: Array<{ key: Range; label: string; days: number; bucket: 'hour' | 'day' }> = [
  { key: 'day', label: '24h', days: 1, bucket: 'hour' },
  { key: 'week', label: '7 days', days: 7, bucket: 'day' },
  { key: 'month', label: '30 days', days: 30, bucket: 'day' },
];

function flagEmoji(cc: string | null) {
  if (!cc || cc.length !== 2) return '🌍';
  const A = 0x1F1E6, base = 'A'.charCodeAt(0);
  return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => A + (c.charCodeAt(0) - base)));
}

export default function ArtistAnalytics() {
  const { songs, followers } = useOutletContext<Ctx>();
  const [metric, setMetric] = useState<Metric>('play_count');
  const [range, setRange] = useState<Range>('week');
  const [series, setSeries] = useState<Array<{ t: string; plays: number; listeners: number }>>([]);
  const [countries, setCountries] = useState<Array<{ cc: string | null; name: string; count: number }>>([]);
  const [delta, setDelta] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const songIds = useMemo(() => songs.map((s) => s.id), [songs]);

  useEffect(() => {
    if (!songIds.length) { setSeries([]); setCountries([]); setLoading(false); return; }
    let alive = true;
    (async () => {
      setLoading(true);
      const cfg = RANGES.find((r) => r.key === range)!;
      const now = Date.now();
      const windowMs = cfg.days * 86400000;
      const sinceCur = new Date(now - windowMs).toISOString();
      const sincePrev = new Date(now - 2 * windowMs).toISOString();

      const [{ data: cur }, { data: prev }] = await Promise.all([
        supabase.from('song_play_events')
          .select('created_at, country_code, country_name, user_id, session_id')
          .in('song_id', songIds)
          .gte('created_at', sinceCur)
          .order('created_at', { ascending: true })
          .limit(5000),
        supabase.from('song_play_events')
          .select('created_at')
          .in('song_id', songIds)
          .gte('created_at', sincePrev)
          .lt('created_at', sinceCur)
          .limit(5000),
      ]);

      if (!alive) return;
      const rows = cur ?? [];
      const prevTotal = prev?.length ?? 0;
      const curTotal = rows.length;
      setDelta(prevTotal === 0 ? (curTotal === 0 ? 0 : 100) : ((curTotal - prevTotal) / prevTotal) * 100);

      const buckets = new Map<string, { plays: number; listeners: Set<string> }>();
      const fmtKey = (d: Date) => cfg.bucket === 'hour'
        ? `${d.getHours().toString().padStart(2, '0')}:00`
        : `${d.getMonth() + 1}/${d.getDate()}`;
      for (let i = cfg.days * (cfg.bucket === 'hour' ? 24 : 1) - 1; i >= 0; i--) {
        const d = new Date(now - i * (cfg.bucket === 'hour' ? 3600000 : 86400000));
        buckets.set(fmtKey(d), { plays: 0, listeners: new Set() });
      }
      for (const r of rows) {
        const d = new Date(r.created_at);
        const k = fmtKey(d);
        if (!buckets.has(k)) buckets.set(k, { plays: 0, listeners: new Set() });
        const b = buckets.get(k)!;
        b.plays += 1;
        b.listeners.add(r.user_id ?? r.session_id ?? 'anon');
      }
      setSeries(Array.from(buckets.entries()).map(([t, v]) => ({
        t, plays: v.plays, listeners: v.listeners.size,
      })));

      const counts = new Map<string, { name: string; count: number; cc: string | null }>();
      for (const r of rows) {
        const key = r.country_code ?? r.country_name ?? 'unknown';
        if (!counts.has(key)) counts.set(key, { name: r.country_name ?? 'Unknown', count: 0, cc: r.country_code });
        counts.get(key)!.count += 1;
      }
      setCountries(Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [songIds.join(','), range]);

  const totals = useMemo(() => ({
    plays: songs.reduce((a, s) => a + (s.play_count || 0), 0),
    views: songs.reduce((a, s) => a + (s.view_count || 0), 0),
    likes: songs.reduce((a, s) => a + (s.like_count || 0), 0),
    downloads: songs.reduce((a, s) => a + (s.download_count || 0), 0),
  }), [songs]);

  const ranked = useMemo(() => {
    const arr = [...songs].sort((a, b) => (b[metric] || 0) - (a[metric] || 0));
    const max = Math.max(1, ...arr.map((s) => s[metric] || 0));
    return { arr, max };
  }, [songs, metric]);

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 font-semibold">
            Insights
          </p>
          <h2 className="font-display text-[28px] leading-none tracking-tight mt-1">Analytics</h2>
          <p className="text-[12px] text-muted-foreground mt-1.5">Live — updates as plays come in.</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase text-emerald-300/90">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </div>
      </div>

      {/* KPI Bento grid */}
      <section className="grid grid-cols-6 gap-3 mt-4">
        <Kpi label="Streams" value={fmt(totals.plays)} icon={<Music2 className="w-3.5 h-3.5" />} accent />
        <Kpi label="Followers" value={fmt(followers)} icon={<Heart className="w-3.5 h-3.5" />} />
        <Kpi label="Views" value={fmt(totals.views)} icon={<Eye className="w-3.5 h-3.5" />} />
        <Kpi label="Downloads" value={fmt(totals.downloads)} icon={<Download className="w-3.5 h-3.5" />} />
      </section>

      {/* Time series */}
      <BentoCard className="mt-4 p-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground/80 font-semibold">
              Plays & listeners
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-display text-[24px] leading-none tabular-nums">
                {fmt(series.reduce((a, p) => a + p.plays, 0))}
              </p>
              <DeltaPill value={delta} />
            </div>
          </div>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-2.5 h-7 rounded-full text-[10.5px] font-semibold transition ${
                  range === r.key ? 'bg-white text-black' : 'bg-white/[0.05] text-muted-foreground active:scale-95'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[200px] mt-3">
          {loading ? (
            <div className="h-full grid place-items-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : series.every((p) => p.plays === 0 && p.listeners === 0) ? (
            <div className="h-full grid place-items-center text-[12.5px] text-muted-foreground">
              No plays in this window yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,12,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Line type="monotone" dataKey="plays" stroke="#FF2D55" strokeWidth={2.25} dot={false} name="Plays" />
                <Line type="monotone" dataKey="listeners" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} dot={false} name="Listeners" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </BentoCard>

      {/* Metric pills */}
      <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11.5px] font-medium transition ${
              metric === m.key ? 'bg-white text-black' : 'bg-white/[0.05] text-muted-foreground active:scale-95'
            }`}
          >
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* Top songs */}
      <BentoCard className="mt-3 overflow-hidden">
        {!ranked.arr.length ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">
            Upload a song to start tracking analytics.
          </div>
        ) : ranked.arr.map((s, i) => {
          const value = s[metric] || 0;
          const pct = Math.max(2, (value / ranked.max) * 100);
          return (
            <div key={s.id} className={`p-3.5 ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-[11px] font-semibold tabular-nums text-muted-foreground/70 text-right">
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0 ring-1 ring-white/10">
                  {s.cover_url
                    ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full grid place-items-center"><Music2 className="w-4 h-4 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{s.title}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #FF2D55, #FF5A77)',
                      }}
                    />
                  </div>
                </div>
                <p className="text-[12px] font-semibold tabular-nums w-14 text-right">{fmt(value)}</p>
              </div>
            </div>
          );
        })}
      </BentoCard>

      {/* Top countries */}
      <BentoCard className="mt-5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="w-4 h-4 text-muted-foreground" />
          <p className="text-[13px] font-semibold tracking-tight">Top listener countries</p>
        </div>
        {!countries.length ? (
          <p className="text-[12.5px] text-muted-foreground py-6 text-center">
            Location data appears once your songs start getting plays.
          </p>
        ) : (
          <div className="space-y-2.5">
            {countries.map((c, i) => {
              const max = countries[0].count;
              const pct = Math.max(4, (c.count / max) * 100);
              return (
                <div key={`${c.cc ?? c.name}-${i}`} className="flex items-center gap-3">
                  <span className="text-[18px] leading-none w-6">{flagEmoji(c.cc)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">{fmt(c.count)}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #FF2D55, #FF8A9E)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BentoCard>
    </div>
  );
}

function Kpi({
  label, value, icon, accent,
}: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <BentoCard glow={accent} className={`col-span-3 sm:col-span-3 p-4 ${accent ? 'sm:col-span-3' : ''}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">
        {icon}{label}
      </div>
      <p className="mt-2 font-display text-[24px] tabular-nums leading-none">{value}</p>
    </BentoCard>
  );
}

function DeltaPill({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums"
      style={{
        background: up ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
        color: up ? '#34D399' : '#FB7185',
        border: up ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(244,63,94,0.25)',
      }}
    >
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}{rounded}% vs prev
    </span>
  );
}
