import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Users, Copy, Share2, Loader2, LogOut, Plus, Play,
  Trash2, Music2, Link2, Sparkles, ListMusic,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/PageTransition';
import BottomNav from '@/components/BottomNav';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useJamQueue, type JamQueueItem } from '@/contexts/JamQueueContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { triggerHaptic } from '@/hooks/useHaptics';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';

const copyText = async (text: string, label = 'Copied') => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
    triggerHaptic('impactLight');
  } catch {
    toast.error('Could not copy');
  }
};

const QueueRow = ({
  item, index, isHost, isMine, onPlay, onRemove,
}: {
  item: JamQueueItem;
  index: number;
  isHost: boolean;
  isMine: boolean;
  onPlay: () => void;
  onRemove: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
    transition={{ duration: 0.22 }}
    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] active:bg-white/[0.05]"
  >
    <span className="w-5 text-center text-xs text-white/40 tabular-nums">{index + 1}</span>
    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
      {item.coverUrl
        ? <img src={item.coverUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-5 h-5 text-white/30" /></div>}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium truncate">{item.title}</p>
      <p className="text-[11px] text-white/50 truncate">{item.artist} · {item.addedByName}</p>
    </div>
    <button
      onClick={onPlay}
      aria-label={`Play ${item.title}`}
      className="w-9 h-9 rounded-full bg-[#FF2D55] flex items-center justify-center active:scale-95 transition-transform"
    >
      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
    </button>
    {(isHost || isMine) && (
      <button
        onClick={onRemove}
        aria-label="Remove from jam"
        className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 active:bg-white/10 active:text-white"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </motion.div>
);

const JamQueuePage = () => {
  const navigate = useNavigate();
  const { currentSong } = usePlayer();
  const {
    room, members, queue, loading, inviteUrl,
    createRoom, joinRoom, leaveRoom, addCurrentSongToQueue,
    removeFromQueue, playItem, playAllFromHere,
  } = useJamQueue();

  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState('');

  const shareInvite = async () => {
    if (!room || !inviteUrl) return;
    const text = `Join my Universflow Jam — code ${room.code}\n${inviteUrl}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Universflow Jam', text, url: inviteUrl });
      } else {
        await copyText(text, 'Invite copied');
      }
    } catch { /* user cancelled */ }
  };

  // ===== Not in a room: lobby =====
  if (!room) {
    return (
      <PageTransition>
        <SEOHead
          title="Jam Queue — Universflow"
          description="Build a shared playlist with friends in real time. Add songs to one queue, everyone plays it on their own device."
        />
        <div className="min-h-[100dvh] bg-background pb-32">
          <header className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-white/[0.06]">
            <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-2 flex items-center justify-center" aria-label="Back">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold">Jam Queue</h1>
          </header>

          <div className="px-5 pt-8">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#FF2D55] to-[#FF6482] flex items-center justify-center shadow-lg shadow-[#FF2D55]/30">
              <ListMusic className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-center leading-tight">One queue.<br/>Everyone adds.</h2>
            <p className="text-sm text-white/55 text-center mt-2 px-4">
              Build a shared playlist in real time. Each person plays it on their own device — no awkward sync.
            </p>
          </div>

          <div className="px-5 mt-8 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-semibold">Start a jam</p>
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value.slice(0, 40))}
                placeholder="Optional name (e.g. Friday Night)"
                className="bg-white/5 border-white/10 mb-3 h-11"
              />
              <Button
                onClick={() => createRoom(roomName)}
                disabled={loading}
                className="w-full h-12 bg-[#FF2D55] hover:bg-[#FF2D55]/90 text-white rounded-xl text-[15px] font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2" /> Create room</>}
              </Button>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-wider text-white/40 mb-2 font-semibold">Join with a code</p>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="6-character code"
                className="bg-white/5 border-white/10 mb-3 h-11 tracking-[0.3em] uppercase text-center font-mono"
                maxLength={6}
              />
              <Button
                onClick={() => joinRoom(joinCode)}
                disabled={loading || joinCode.length !== 6}
                variant="outline"
                className="w-full h-12 bg-transparent border-white/15 hover:bg-white/5 rounded-xl text-[15px] font-semibold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join jam'}
              </Button>
            </div>
          </div>

          <div className="px-5 mt-10 grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Add any song', icon: Plus },
              { label: 'Plays on your device', icon: Play },
              { label: 'Live updates', icon: Sparkles },
            ].map(({ label, icon: Icon }) => (
              <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <Icon className="w-4 h-4 mx-auto mb-1.5 text-[#FF2D55]" />
                <p className="text-[10.5px] text-white/55 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </PageTransition>
    );
  }

  // ===== In a room: queue view =====
  const meId = members.find((m) => m.userId === room.hostUserId)?.userId; // sentinel only
  const canAddCurrent = Boolean(currentSong);

  return (
    <PageTransition>
      <SEOHead
        title={`Jam: ${room.name || room.code} — Universflow`}
        description="Add songs to the shared jam queue."
      />
      <div className="min-h-[100dvh] bg-background pb-40">
        <header className="sticky top-0 z-30 flex items-center gap-2 px-4 py-3 bg-background/85 backdrop-blur-xl border-b border-white/[0.06]">
          <button onClick={() => navigate(-1)} className="w-9 h-9 -ml-2 flex items-center justify-center" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold truncate">{room.name || 'Jam Queue'}</h1>
            <p className="text-[11px] text-white/50">
              {members.length} {members.length === 1 ? 'listener' : 'listeners'} · {room.isHost ? 'You host' : 'Guest'}
            </p>
          </div>
          <button
            onClick={leaveRoom}
            aria-label={room.isHost ? 'End jam' : 'Leave jam'}
            className="w-9 h-9 flex items-center justify-center text-white/60 active:text-white"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* Invite card */}
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#FF2D55]/12 to-transparent p-4">
            <p className="text-[10.5px] uppercase tracking-wider text-white/45 font-semibold">Room code</p>
            <p className="text-3xl font-bold tracking-[0.32em] font-mono mt-1.5">{room.code}</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => copyText(room.code, 'Code copied')}
                className="flex-1 h-9 rounded-lg bg-white/8 border border-white/10 text-[12.5px] font-medium flex items-center justify-center gap-1.5 active:bg-white/14"
              >
                <Copy className="w-3.5 h-3.5" /> Copy code
              </button>
              <button
                onClick={shareInvite}
                className="flex-1 h-9 rounded-lg bg-white text-black text-[12.5px] font-semibold flex items-center justify-center gap-1.5 active:bg-white/85"
              >
                <Share2 className="w-3.5 h-3.5" /> Invite
              </button>
            </div>
            {inviteUrl && (
              <button
                onClick={() => copyText(inviteUrl, 'Link copied')}
                className="mt-2 w-full text-[11px] text-white/45 flex items-center justify-center gap-1 active:text-white/80"
              >
                <Link2 className="w-3 h-3" /> {inviteUrl.replace(/^https?:\/\//, '')}
              </button>
            )}
          </div>
        </div>

        {/* Members chips */}
        {members.length > 0 && (
          <div className="px-5 mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <Users className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
            {members.map((m) => (
              <span
                key={m.userId}
                className={`text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${
                  m.userId === room.hostUserId
                    ? 'border-[#FF2D55]/40 bg-[#FF2D55]/12 text-white'
                    : 'border-white/10 bg-white/[0.04] text-white/70'
                }`}
              >
                {m.displayName}{m.userId === room.hostUserId ? ' · host' : ''}
              </span>
            ))}
          </div>
        )}

        {/* Add current song bar */}
        <div className="px-5 mt-5">
          <button
            onClick={addCurrentSongToQueue}
            disabled={!canAddCurrent}
            className={`w-full h-12 rounded-xl border flex items-center gap-3 px-3 text-left transition-colors ${
              canAddCurrent
                ? 'border-[#FF2D55]/30 bg-[#FF2D55]/10 active:bg-[#FF2D55]/16'
                : 'border-white/10 bg-white/[0.02] opacity-60'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-[#FF2D55] flex items-center justify-center flex-shrink-0">
              <Plus className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-tight">Add what's playing</p>
              <p className="text-[11px] text-white/50 truncate">
                {currentSong ? `${currentSong.title} — ${currentSong.artist}` : 'Play any song first'}
              </p>
            </div>
          </button>
          <p className="text-[10.5px] text-white/35 mt-2 px-1 leading-relaxed">
            Tip: open any song anywhere in the app, then come back here and tap to drop it into the jam.
          </p>
        </div>

        {/* Queue */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-[15px] font-semibold">Queue</h2>
            <span className="text-[11px] text-white/45">{queue.length} {queue.length === 1 ? 'track' : 'tracks'}</span>
          </div>

          {queue.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 px-6 text-center">
              <Music2 className="w-7 h-7 mx-auto text-white/30 mb-2" />
              <p className="text-[13px] text-white/55">Queue is empty.</p>
              <p className="text-[11.5px] text-white/35 mt-1">Add the first song to start the jam.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {queue.map((item, idx) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    index={idx}
                    isHost={room.isHost}
                    isMine={false /* server enforces; UI shows trash for host always */}
                    onPlay={() => playAllFromHere(item)}
                    onRemove={() => removeFromQueue(item.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </PageTransition>
  );
};

export default JamQueuePage;
