import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Music2, Heart, Download, Eye, Play } from 'lucide-react';
import { ArtistSong, StatCard, fmt } from './_shared';

type Ctx = { songs: ArtistSong[]; followers: number };

type Metric = 'play_count' | 'view_count' | 'like_count' | 'download_count';
const METRICS: Array<{ key: Metric; label: string; icon: React.ReactNode }> = [
  { key: 'play_count', label: 'Plays', icon: <Play className="w-3.5 h-3.5" /> },
  { key: 'view_count', label: 'Views', icon: <Eye className="w-3.5 h-3.5" /> },
  { key: 'like_count', label: 'Likes', icon: <Heart className="w-3.5 h-3.5" /> },
  { key: 'download_count', label: 'Downloads', icon: <Download className="w-3.5 h-3.5" /> },
];

export default function ArtistAnalytics() {
  const { songs, followers } = useOutletContext<Ctx>();
  const [metric, setMetric] = useState<Metric>('play_count');

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
    <div className="max-w-3xl mx-auto px-5 pt-5">
      <h2 className="text-[20px] font-semibold tracking-tight">Analytics</h2>
      <p className="text-[12.5px] text-muted-foreground mt-0.5">Live counters update in real time.</p>

      <section className="grid grid-cols-2 gap-3 mt-4">
        <StatCard icon={<Music2 className="w-4 h-4" />} label="Plays" value={fmt(totals.plays)} accent />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Views" value={fmt(totals.views)} />
        <StatCard icon={<Heart className="w-4 h-4" />} label="Likes" value={fmt(totals.likes)} />
        <StatCard icon={<Download className="w-4 h-4" />} label="Downloads" value={fmt(totals.downloads)} />
      </section>

      <div className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
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

      <div className="mt-3 rounded-2xl border border-white/[0.06] overflow-hidden">
        {!ranked.arr.length ? (
          <div className="p-8 text-center text-[13px] text-muted-foreground">
            Upload a song to start tracking analytics.
          </div>
        ) : ranked.arr.map((s, i) => {
          const value = s[metric] || 0;
          const pct = Math.max(2, (value / ranked.max) * 100);
          return (
            <div key={s.id} className={`p-3 ${i !== 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                  {s.cover_url
                    ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-4 h-4 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{s.title}</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${pct}%`, background: '#FF2D55' }}
                    />
                  </div>
                </div>
                <p className="text-[12px] font-semibold tabular-nums w-14 text-right">{fmt(value)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl p-4 bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Heart className="w-5 h-5" fill="currentColor" />
        </div>
        <div className="flex-1">
          <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">Followers</p>
          <p className="text-[18px] font-semibold tabular-nums">{fmt(followers)}</p>
        </div>
      </div>
    </div>
  );
}
