import { useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music2, Heart, Download, Eye, Users, TrendingUp, Upload, BarChart3, UserCog } from 'lucide-react';
import { ArtistProfile, ArtistSong, StatCard, fmt } from './_shared';

type Ctx = { profile: ArtistProfile; songs: ArtistSong[]; followers: number };

export default function Overview() {
  const { profile, songs, followers } = useOutletContext<Ctx>();

  const stats = useMemo(() => ({
    plays: songs.reduce((a, s) => a + (s.play_count || 0), 0),
    views: songs.reduce((a, s) => a + (s.view_count || 0), 0),
    likes: songs.reduce((a, s) => a + (s.like_count || 0), 0),
    downloads: songs.reduce((a, s) => a + (s.download_count || 0), 0),
  }), [songs]);

  const top = useMemo(() => {
    if (!songs.length) return null;
    const sorted = [...songs].sort((a, b) =>
      (b.play_count + b.like_count * 2 + b.download_count * 3) -
      (a.play_count + a.like_count * 2 + a.download_count * 3),
    );
    const t = sorted[0];
    if (t.play_count === 0 && t.like_count === 0 && t.download_count === 0) return null;
    return t;
  }, [songs]);

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(255,45,85,0.18), rgba(16,16,18,0.85))',
          border: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        <p className="text-[11px] uppercase tracking-[0.16em] text-rose-200/80">Welcome back</p>
        <h2 className="text-[22px] font-semibold mt-1">{profile.stage_name}</h2>
        <p className="text-[12.5px] text-muted-foreground mt-1">
          {songs.length} song{songs.length === 1 ? '' : 's'} live · {fmt(followers)} followers
        </p>
      </motion.section>

      <section className="grid grid-cols-2 gap-3 mt-4">
        <StatCard icon={<Music2 className="w-4 h-4" />} label="Total plays" value={fmt(stats.plays)} accent />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Profile views" value={fmt(stats.views)} />
        <StatCard icon={<Heart className="w-4 h-4" />} label="Likes" value={fmt(stats.likes)} />
        <StatCard icon={<Download className="w-4 h-4" />} label="Downloads" value={fmt(stats.downloads)} />
        <StatCard icon={<Users className="w-4 h-4" />} label="Followers" value={fmt(followers)} />
      </section>

      {top && (
        <motion.div
          layout
          className="mt-4 rounded-2xl p-3.5 flex items-center gap-3 relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(255,45,85,0.22), rgba(16,16,18,0.6))',
            border: '0.5px solid rgba(255,45,85,0.25)',
          }}
        >
          <div className="absolute top-2 right-3 inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-rose-200/90">
            <TrendingUp className="w-3 h-3" /> Top track
          </div>
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 shrink-0">
            {top.cover_url ? (
              <img src={top.cover_url} alt={top.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Music2 className="w-6 h-6 text-muted-foreground" /></div>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-14">
            <p className="text-[14px] font-semibold truncate">{top.title}</p>
            <p className="text-[11.5px] text-rose-100/70 tabular-nums mt-0.5">
              {fmt(top.play_count)} plays · {fmt(top.like_count)} likes · {fmt(top.download_count)} dl
            </p>
          </div>
        </motion.div>
      )}

      <section className="mt-5 grid grid-cols-3 gap-3">
        <QuickAction to="/artist/studio/upload" icon={<Upload className="w-5 h-5" />} label="Upload" />
        <QuickAction to="/artist/studio/analytics" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" />
        <QuickAction to="/artist/studio/profile" icon={<UserCog className="w-5 h-5" />} label="Profile" />
      </section>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl p-4 bg-white/[0.04] border border-white/[0.06] flex flex-col items-center gap-2 active:scale-95 transition"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">{icon}</div>
      <span className="text-[12px] font-medium">{label}</span>
    </Link>
  );
}
