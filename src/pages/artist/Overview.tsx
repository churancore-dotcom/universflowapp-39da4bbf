import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Music2, Heart, Eye, Users, TrendingUp, Upload, BarChart3, UserCog, Bell, Sparkles, ExternalLink,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ArtistProfile, ArtistSong, StatCard, fmt } from './_shared';

type Ctx = { profile: ArtistProfile; songs: ArtistSong[]; followers: number; user: { id: string } };

export default function Overview() {
  const { profile, songs, followers, user } = useOutletContext<Ctx>();
  const [spark, setSpark] = useState<Array<{ t: string; v: number }>>([]);

  const songIds = useMemo(() => songs.map((s) => s.id), [songs]);

  useEffect(() => {
    if (!songIds.length) { setSpark([]); return; }
    let alive = true;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('song_play_events')
        .select('created_at')
        .in('song_id', songIds)
        .gte('created_at', since)
        .limit(5000);
      if (!alive) return;
      const buckets = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        buckets.set(`${d.getMonth() + 1}/${d.getDate()}`, 0);
      }
      for (const r of data ?? []) {
        const d = new Date(r.created_at);
        const k = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets.set(k, (buckets.get(k) ?? 0) + 1);
      }
      setSpark(Array.from(buckets.entries()).map(([t, v]) => ({ t, v })));
    })();
    return () => { alive = false; };
  }, [songIds.join(',')]);

  const stats = useMemo(() => ({
    plays: songs.reduce((a, s) => a + (s.play_count || 0), 0),
    views: songs.reduce((a, s) => a + (s.view_count || 0), 0),
    likes: songs.reduce((a, s) => a + (s.like_count || 0), 0),
  }), [songs]);

  const top = useMemo(() => {
    if (!songs.length) return null;
    const sorted = [...songs].sort((a, b) =>
      (b.play_count + b.like_count * 2 + b.download_count * 3) -
      (a.play_count + a.like_count * 2 + a.download_count * 3));
    return sorted[0];
  }, [songs]);

  const weekTotal = useMemo(() => spark.reduce((a, p) => a + p.v, 0), [spark]);

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden relative"
        style={{
          background: 'linear-gradient(160deg, rgba(255,45,85,0.22), rgba(16,16,18,0.85))',
          border: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        )}
        <div className="relative p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary/90 font-semibold">Welcome back</p>
          <h1 className="text-[26px] font-semibold tracking-tight mt-1">{profile.stage_name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Link to={`/a/${profile.slug}`} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground hover:text-foreground">
              <ExternalLink className="w-3.5 h-3.5" /> /a/{profile.slug}
            </Link>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">{fmt(followers)} followers</span>
          </div>
        </div>
      </motion.section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 mt-4">
        <StatCard icon={<Music2 className="w-4 h-4" />} label="Streams" value={fmt(stats.plays)} accent />
        <StatCard icon={<Users className="w-4 h-4" />} label="Followers" value={fmt(followers)} />
        <StatCard icon={<Heart className="w-4 h-4" />} label="Likes" value={fmt(stats.likes)} />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Views" value={fmt(stats.views)} />
      </section>

      {/* 7-day sparkline */}
      <section className="mt-4 rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-[13px] font-semibold">Last 7 days</p>
          </div>
          <p className="text-[12px] tabular-nums text-muted-foreground">{fmt(weekTotal)} plays</p>
        </div>
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 8, right: 4, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id="ovGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF2D55" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#FF2D55" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: 'rgba(10,10,12,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
              />
              <Area type="monotone" dataKey="v" stroke="#FF2D55" strokeWidth={2} fill="url(#ovGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Top song */}
      {top && (top.play_count > 0 || top.like_count > 0) && (
        <section className="mt-4 rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 shrink-0">
            {top.cover_url
              ? <img src={top.cover_url} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-muted-foreground" /></div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] uppercase tracking-[0.2em] text-primary/90 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Top track
            </p>
            <p className="text-[14px] font-semibold truncate mt-0.5">{top.title}</p>
            <p className="text-[11.5px] text-muted-foreground tabular-nums">
              {fmt(top.play_count)} plays · {fmt(top.like_count)} likes
            </p>
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3 mt-4">
        <QuickAction to="/artist/studio/upload" icon={<Upload className="w-4 h-4" />} label="Upload song" accent />
        <QuickAction to="/artist/studio/analytics" icon={<BarChart3 className="w-4 h-4" />} label="Analytics" />
        <QuickAction to="/artist/studio/notifications" icon={<Bell className="w-4 h-4" />} label="Notifications" />
        <QuickAction to="/artist/studio/profile" icon={<UserCog className="w-4 h-4" />} label="Edit profile" />
      </section>
    </div>
  );
}

function QuickAction({ to, icon, label, accent }: { to: string; icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <Link
      to={to}
      className="rounded-2xl p-4 flex items-center gap-3 transition active:scale-[0.98]"
      style={{
        background: accent
          ? 'linear-gradient(135deg, rgba(255,45,85,0.22), rgba(255,45,85,0.06))'
          : 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-white/15 text-white' : 'bg-white/[0.05] text-foreground'}`}>
        {icon}
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </Link>
  );
}
