import { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Loader2, Upload as UploadIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isBlockedStreamHost, uploadArtistCover } from '@/lib/artist';
import { ArtistProfile } from './_shared';

type Ctx = { profile: ArtistProfile; user: { id: string } };

export default function ArtistUpload() {
  const { user } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const urlError = streamUrl ? isBlockedStreamHost(streamUrl) : null;

  const save = async () => {
    if (!title.trim() || !streamUrl.trim() || urlError) return;
    setSaving(true);
    try {
      const coverUrl = cover ? await uploadArtistCover(user.id, cover) : null;
      const { error } = await supabase.from('artist_songs').insert({
        artist_user_id: user.id,
        title: title.trim(),
        stream_url: streamUrl.trim(),
        cover_url: coverUrl,
      });
      if (error) throw error;
      toast.success('Song published ✓');
      navigate('/artist/studio/songs');
    } catch (e) {
      toast.error(e?.message || 'Could not publish song.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5">
      <h2 className="text-[20px] font-semibold tracking-tight">Upload a song</h2>
      <p className="text-[12.5px] text-muted-foreground mt-1">
        Publish a new track to your Universflow profile.
      </p>

      <div className="rounded-2xl p-3.5 mt-4 bg-amber-500/10 border border-amber-500/20 text-[12px] leading-relaxed text-amber-100/90">
        We only accept <strong>direct audio URLs</strong> from sources you own or have rights to
        (your website, CDN, label HLS). YouTube, JioSaavn, Spotify, SoundCloud are blocked.
      </div>

      <div className="space-y-4 mt-5">
        <Field label="Song title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Midnight Run" maxLength={80} />
        </Field>

        <Field label="Direct stream URL">
          <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder="https://your-cdn.com/track.mp3" />
          {urlError && <p className="text-[11.5px] text-rose-400 mt-1.5">{urlError}</p>}
        </Field>

        <Field label="Cover art (optional)">
          <label className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3.5 flex items-center gap-3 cursor-pointer">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center overflow-hidden">
              {cover
                ? <img src={URL.createObjectURL(cover)} className="w-full h-full object-cover" alt="" />
                : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <span className="text-[12.5px] text-muted-foreground flex-1 truncate">
              {cover ? cover.name : 'Tap to pick cover (square recommended)'}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
        </Field>

        <Button
          className="w-full h-12 rounded-xl font-semibold text-white"
          style={{ background: '#FF2D55' }}
          disabled={saving || !title.trim() || !streamUrl.trim() || !!urlError}
          onClick={save}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-2"><UploadIcon className="w-4 h-4" /> Publish song</span>
          )}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">{label}</span>
      {children}
    </label>
  );
}
