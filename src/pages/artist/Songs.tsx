import { useMemo, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArtistSong, fmt } from './_shared';

type Ctx = { songs: ArtistSong[] };

type SortKey = 'recent' | 'plays' | 'likes' | 'views' | 'downloads';

export default function ArtistSongs() {
  const { songs } = useOutletContext<Ctx>();
  const [sort, setSort] = useState<SortKey>('recent');

  const sorted = useMemo(() => {
    const arr = [...songs];
    switch (sort) {
      case 'plays': return arr.sort((a, b) => b.play_count - a.play_count);
      case 'likes': return arr.sort((a, b) => b.like_count - a.like_count);
      case 'views': return arr.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
      case 'downloads': return arr.sort((a, b) => b.download_count - a.download_count);
      default: return arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
  }, [songs, sort]);

  const opts: Array<[SortKey, string]> = [
    ['recent', 'Recent'], ['plays', 'Plays'], ['likes', 'Likes'], ['views', 'Views'], ['downloads', 'Downloads'],
  ];

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight">My songs</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{songs.length} total</p>
        </div>
        <Button asChild className="h-10 rounded-xl text-[12.5px] font-semibold text-white" style={{ background: '#FF2D55' }}>
          <Link to="/artist/studio/upload"><Plus className="w-4 h-4 mr-1" /> Upload</Link>
        </Button>
      </div>

      {!songs.length ? (
        <div className="mt-10 text-center text-[13px] text-muted-foreground">
          No songs yet. <Link to="/artist/studio/upload" className="text-primary underline">Upload your first track</Link>.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none mt-5">
            {opts.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={`shrink-0 px-3 h-8 rounded-full text-[11.5px] font-medium transition ${
                  sort === k ? 'bg-white text-black' : 'bg-white/[0.05] text-muted-foreground active:scale-95'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2.5">
            <AnimatePresence initial={false}>
              {sorted.map((s) => (
                <SongRow key={s.id} song={s} />
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

function SongRow({ song }: { song: ArtistSong }) {
  const onDelete = async () => {
    if (!confirm(`Delete "${song.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('artist_songs').delete().eq('id', song.id);
    if (error) toast.error(error.message);
    else toast.success('Deleted');
  };
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 shrink-0">
        {song.cover_url
          ? <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-muted-foreground" /></div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium truncate">{song.title}</p>
        <p className="text-[11.5px] text-muted-foreground tabular-nums mt-0.5">
          {fmt(song.play_count)} plays · {fmt(song.view_count || 0)} views · {fmt(song.like_count)} likes · {fmt(song.download_count)} dl
        </p>
        {song.status === 'taken_down' && (
          <p className="text-[11px] text-rose-400 mt-0.5">Taken down{song.takedown_reason ? ` — ${song.takedown_reason}` : ''}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center text-rose-400 active:scale-95"
        aria-label="Delete song"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
