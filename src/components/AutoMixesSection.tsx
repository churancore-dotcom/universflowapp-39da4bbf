import { memo } from "react";
import { useAutoMix } from "@/hooks/useAutoMix";
import { Sparkles } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

// Home-screen "Made For You" rail. Reads pre-computed daily mixes from
// auto_playlists (built nightly by the daily-mix-builder edge function).

function AutoMixesSectionImpl() {
  const { mixes, loading } = useAutoMix();
  const player = usePlayer() as unknown as { playSong?: (id: string, queue: unknown[], idx: number) => void };

  if (loading) return null;

  if (!mixes.length) {
    return (
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <h2 className="text-base font-semibold tracking-tight">Made For You</h2>
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-white/60">
          Play 5+ songs and your personal Daily Mixes will appear here tomorrow morning.
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-rose-500" />
        <h2 className="text-base font-semibold tracking-tight">Made For You</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 snap-x snap-mandatory">
        {mixes.map((mix) => {
          const covers = mix.cover_urls?.slice(0, 4) ?? [];
          return (
            <button
              key={mix.id}
              type="button"
              onClick={() => {
                const first = mix.tracks?.[0];
                if (first && player.playSong) {
                  player.playSong(first.track_id, mix.tracks, 0);
                }
              }}
              className="min-w-[160px] snap-start text-left group"
            >
              <div className="relative w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-500/30 to-fuchsia-500/30 grid grid-cols-2 grid-rows-2 gap-0.5">
                {covers.length > 0
                  ? covers.map((c, i) => (
                      <img key={i} src={c} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ))
                  : <div className="col-span-2 row-span-2 flex items-center justify-center text-white/70"><Sparkles className="w-8 h-8" /></div>}
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold truncate">{mix.title}</div>
                <div className="text-xs text-white/55 truncate">{mix.subtitle || `${mix.tracks?.length ?? 0} tracks`}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export const AutoMixesSection = memo(AutoMixesSectionImpl);
