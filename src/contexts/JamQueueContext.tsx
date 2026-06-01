import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, type Song } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import { triggerHaptic } from '@/hooks/useHaptics';

/**
 * Jam Queue — collaborative playlist with independent playback.
 *
 * Each room holds a shared, realtime-synced queue of songs. Every member
 * plays it locally on their own device, at their own pace — no fragile
 * audio-sync, no drift, no "guest stuck loading" bugs. Think Spotify Jam
 * but async.
 */

export interface JamRoom {
  id: string;
  code: string;
  name: string | null;
  hostUserId: string;
  isHost: boolean;
  createdAt: string;
}

export interface JamMember {
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface JamQueueItem {
  id: string;
  roomId: string;
  addedBy: string;
  addedByName: string;
  position: number;
  songId: string | null;
  title: string;
  artist: string;
  coverUrl: string | null;
  audioUrl: string | null;
  source: string | null;
  createdAt: string;
}

interface JamQueueContextValue {
  room: JamRoom | null;
  members: JamMember[];
  queue: JamQueueItem[];
  loading: boolean;
  isConnected: boolean;
  inviteUrl: string | null;
  createRoom: (name?: string) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  addCurrentSongToQueue: () => Promise<void>;
  addSongToQueue: (song: Partial<Song> & { title: string; artist: string }) => Promise<void>;
  removeFromQueue: (itemId: string) => Promise<void>;
  playItem: (item: JamQueueItem) => void;
  playAllFromHere: (item: JamQueueItem) => void;
}

const STORAGE_KEY = 'uf_jam_room';
const JamQueueContext = createContext<JamQueueContextValue | undefined>(undefined);

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const readStored = (): { roomId: string; code: string } | null => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.roomId || !parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeStored = (val: { roomId: string; code: string } | null) => {
  if (val) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(val));
  else window.sessionStorage.removeItem(STORAGE_KEY);
};

const mapItem = (row: any): JamQueueItem => ({
  id: row.id,
  roomId: row.room_id,
  addedBy: row.added_by,
  addedByName: row.added_by_name || 'Someone',
  position: Number(row.position) || 0,
  songId: row.song_id ?? null,
  title: row.title,
  artist: row.artist,
  coverUrl: row.cover_url ?? null,
  audioUrl: row.audio_url ?? null,
  source: row.source ?? null,
  createdAt: row.created_at,
});

const itemToSong = (item: JamQueueItem): Song => ({
  id: item.songId || `jam-${item.id}`,
  title: item.title,
  artist: item.artist,
  cover_url: item.coverUrl || undefined,
  audio_url: item.audioUrl || '',
  source: (item.source as Song['source']) || 'indexed',
});

export const JamQueueProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { currentSong, playSong } = usePlayer();

  const [room, setRoom] = useState<JamRoom | null>(null);
  const [members, setMembers] = useState<JamMember[]>([]);
  const [queue, setQueue] = useState<JamQueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{ username: string } | null>(null);

  const channelRef = useRef<any>(null);
  const restoringRef = useRef(false);

  // -- load profile (for display name) --
  useEffect(() => {
    if (!user) { setProfile(null); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!alive) return;
        setProfile({ username: data?.username || user.email?.split('@')[0] || 'Listener' });
      } catch {
        if (alive) setProfile({ username: user.email?.split('@')[0] || 'Listener' });
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const clearRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  const resetState = useCallback(() => {
    setRoom(null);
    setMembers([]);
    setQueue([]);
    writeStored(null);
  }, []);

  const fetchQueue = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('jam_queue_items')
      .select('*')
      .eq('room_id', roomId)
      .order('position', { ascending: true });
    if (data) setQueue(data.map(mapItem));
  }, []);

  const fetchMembers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('jam_room_members')
      .select('user_id, display_name, joined_at')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (data) {
      setMembers(data.map((m: any) => ({
        userId: m.user_id,
        displayName: m.display_name || 'Listener',
        joinedAt: m.joined_at,
      })));
    }
  }, []);

  const subscribeToRoom = useCallback((roomId: string) => {
    clearRealtime();
    const channel = supabase
      .channel(`jam-room:${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jam_queue_items', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapItem(payload.new);
            setQueue((prev) => {
              if (prev.some((x) => x.id === item.id)) return prev;
              return [...prev, item].sort((a, b) => a.position - b.position);
            });
            if (item.addedBy !== user?.id) {
              toast.info(`🎶 ${item.addedByName} added "${item.title}"`);
              triggerHaptic('impactLight');
            }
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as any)?.id;
            if (id) setQueue((prev) => prev.filter((x) => x.id !== id));
          } else if (payload.eventType === 'UPDATE') {
            const item = mapItem(payload.new);
            setQueue((prev) =>
              prev.map((x) => (x.id === item.id ? item : x)).sort((a, b) => a.position - b.position),
            );
          }
        },
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'jam_room_members', filter: `room_id=eq.${roomId}` },
        () => { void fetchMembers(roomId); },
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jam_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const updated = payload.new as any;
          if (!updated.is_active) {
            toast.info('Jam ended by the host');
            clearRealtime();
            resetState();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
  }, [clearRealtime, fetchMembers, resetState, user?.id]);

  const hydrateRoom = useCallback(async (roomId: string) => {
    if (!user) return false;
    const { data: roomRow, error } = await supabase
      .from('jam_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !roomRow) return false;

    const r: JamRoom = {
      id: roomRow.id,
      code: roomRow.code,
      name: roomRow.name,
      hostUserId: roomRow.host_user_id,
      isHost: roomRow.host_user_id === user.id,
      createdAt: roomRow.created_at,
    };
    setRoom(r);
    writeStored({ roomId: r.id, code: r.code });
    await Promise.all([fetchQueue(r.id), fetchMembers(r.id)]);
    subscribeToRoom(r.id);
    return true;
  }, [fetchMembers, fetchQueue, subscribeToRoom, user]);

  // -- restore on reload --
  useEffect(() => {
    if (!user || !profile || room || restoringRef.current) return;
    const stored = readStored();
    if (!stored) return;
    restoringRef.current = true;
    void hydrateRoom(stored.roomId).then((ok) => {
      if (!ok) writeStored(null);
    }).finally(() => { restoringRef.current = false; });
  }, [hydrateRoom, profile, room, user]);

  useEffect(() => () => clearRealtime(), [clearRealtime]);

  // ===== Actions =====
  const createRoom = useCallback(async (name?: string) => {
    if (!user) { toast.error('Sign in to start a jam'); return; }
    setLoading(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from('jam_rooms')
        .insert({ code, host_user_id: user.id, name: name?.trim() || null })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('jam_room_members').upsert(
        { room_id: data.id, user_id: user.id, display_name: profile?.username || 'Host' },
        { onConflict: 'room_id,user_id' },
      );
      await hydrateRoom(data.id);
      toast.success('Jam room is live — share the code');
      triggerHaptic('success');
    } catch (e: any) {
      console.error('[Jam] createRoom failed:', e);
      toast.error(e?.message || 'Could not start the jam');
    } finally {
      setLoading(false);
    }
  }, [hydrateRoom, profile?.username, user]);

  const joinRoom = useCallback(async (code: string) => {
    if (!user) { toast.error('Sign in to join a jam'); return; }
    const clean = code.trim().toUpperCase();
    if (clean.length !== 6) { toast.error('Enter the 6-character code'); return; }
    setLoading(true);
    try {
      const { data: roomId, error } = await supabase
        .rpc('join_jam_room', { p_code: clean, p_display_name: profile?.username || null });
      if (error || !roomId) throw error || new Error('Room not found');
      const ok = await hydrateRoom(roomId as string);
      if (!ok) throw new Error('Could not load room');
      toast.success('Joined the jam 🎉');
      triggerHaptic('success');
    } catch (e: any) {
      console.error('[Jam] joinRoom failed:', e);
      toast.error(e?.message || 'Could not join that jam');
    } finally {
      setLoading(false);
    }
  }, [hydrateRoom, profile?.username, user]);

  const leaveRoom = useCallback(async () => {
    if (!room || !user) { resetState(); clearRealtime(); return; }
    try {
      if (room.isHost) {
        await supabase.from('jam_rooms').update({ is_active: false }).eq('id', room.id);
      } else {
        await supabase.from('jam_room_members').delete()
          .eq('room_id', room.id).eq('user_id', user.id);
      }
    } finally {
      clearRealtime();
      resetState();
      triggerHaptic('impactMedium');
    }
  }, [clearRealtime, resetState, room, user]);

  const addSongToQueue = useCallback(async (
    song: Partial<Song> & { title: string; artist: string },
  ) => {
    if (!room || !user) { toast.error('Join a jam first'); return; }
    if (!song.title || !song.artist) { toast.error('Missing song info'); return; }
    const position = (queue.length > 0 ? queue[queue.length - 1].position : Date.now() / 1000) + 1;
    const { error } = await supabase.from('jam_queue_items').insert({
      room_id: room.id,
      added_by: user.id,
      added_by_name: profile?.username || 'Listener',
      position,
      song_id: song.id || null,
      title: song.title,
      artist: song.artist,
      cover_url: song.cover_url || null,
      audio_url: song.audio_url || null,
      source: song.source || null,
    });
    if (error) {
      console.error('[Jam] add failed:', error);
      toast.error('Could not add to the jam');
      return;
    }
    toast.success('Added to the jam ✨');
    triggerHaptic('impactLight');
  }, [profile?.username, queue, room, user]);

  const addCurrentSongToQueue = useCallback(async () => {
    if (!currentSong) { toast.error('Play a song first'); return; }
    await addSongToQueue(currentSong);
  }, [addSongToQueue, currentSong]);

  const removeFromQueue = useCallback(async (itemId: string) => {
    if (!room) return;
    const { error } = await supabase.from('jam_queue_items')
      .delete().eq('id', itemId);
    if (error) toast.error('Could not remove that');
    else triggerHaptic('impactLight');
  }, [room]);

  const playItem = useCallback((item: JamQueueItem) => {
    if (!item.audioUrl) {
      toast.error('No stream available for this track yet');
      return;
    }
    const song = itemToSong(item);
    playSong(song, undefined, [song]);
  }, [playSong]);

  const playAllFromHere = useCallback((item: JamQueueItem) => {
    const startIdx = queue.findIndex((x) => x.id === item.id);
    if (startIdx < 0) return playItem(item);
    const slice = queue.slice(startIdx).filter((x) => x.audioUrl);
    if (slice.length === 0) return playItem(item);
    const songs = slice.map(itemToSong);
    playSong(songs[0], undefined, songs);
  }, [playItem, playSong, queue]);

  const inviteUrl = useMemo(() => {
    if (!room?.code) return null;
    return `https://universflow.in/jam?join=${room.code}`;
  }, [room?.code]);

  // -- deep-link join (?join=CODE) --
  useEffect(() => {
    if (!user || !profile || room) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('join');
      if (code && code.length === 6) {
        params.delete('join');
        const search = params.toString();
        window.history.replaceState({}, '',
          `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
        void joinRoom(code);
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const value = useMemo<JamQueueContextValue>(() => ({
    room, members, queue, loading,
    isConnected: Boolean(room),
    inviteUrl,
    createRoom, joinRoom, leaveRoom,
    addCurrentSongToQueue, addSongToQueue,
    removeFromQueue, playItem, playAllFromHere,
  }), [
    addCurrentSongToQueue, addSongToQueue, createRoom, inviteUrl, joinRoom,
    leaveRoom, loading, members, playAllFromHere, playItem, queue,
    removeFromQueue, room,
  ]);

  return <JamQueueContext.Provider value={value}>{children}</JamQueueContext.Provider>;
};

export const useJamQueue = () => {
  const ctx = useContext(JamQueueContext);
  if (!ctx) throw new Error('useJamQueue must be used inside JamQueueProvider');
  return ctx;
};
