import { useMemo, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Loader2, Upload as UploadIcon, Link2, CheckCircle2, AlertCircle, Cloud, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadArtistCover } from '@/lib/artist';
import { useFilePreview } from '@/lib/useFilePreview';
import { validateUploadLink } from '@/lib/artistUploadLinks';
import { ArtistProfile } from './_shared';

type Ctx = { profile: ArtistProfile; user: { id: string } };

const GENRES = ['Pop', 'Hip-Hop', 'R&B', 'Rock', 'Indie', 'Electronic', 'Dance', 'Lo-fi', 'Classical', 'Jazz', 'Folk', 'Punjabi', 'Bollywood', 'Devotional', 'Regional', 'Other'];

export default function ArtistUpload() {
  const { user } = useOutletContext<Ctx>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState<string>('');
  const [streamUrl, setStreamUrl] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'drive' | 'dropbox'>('drive');
  const coverPreview = useFilePreview(cover);

  const linkState = useMemo(() => streamUrl.trim() ? validateUploadLink(streamUrl) : null, [streamUrl]);
  const isValid = !!linkState?.ok;
  const linkMessage = linkState
    ? linkState.ok === false
      ? linkState.reason
      : `${linkState.source === 'drive' ? 'Google Drive' : 'Dropbox'} link looks good — we’ll stream it directly.`
    : null;

  const save = async () => {
    if (!title.trim() || !linkState?.ok) return;
    setSaving(true);
    try {
      const coverUrl = cover ? await uploadArtistCover(user.id, cover) : null;
      // Append metadata to title as " · genre" if the schema lacks a genre column,
      // but write to a `title` field only — `artist_songs` doesn't expose genre yet.
      const { error } = await supabase.from('artist_songs').insert({
        artist_user_id: user.id,
        title: title.trim(),
        stream_url: linkState.normalized,
        cover_url: coverUrl,
      });
      if (error) throw error;
      toast.success('Song published ✓');
      navigate('/artist/studio/songs');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish song.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-12">
      <h2 className="text-[22px] font-semibold tracking-tight">Upload a song</h2>
      <p className="text-[12.5px] text-muted-foreground mt-1">
        Share a new track from your Google Drive or Dropbox.
      </p>

      {/* How-to card */}
      <div className="mt-5 rounded-3xl overflow-hidden border border-white/[0.06] bg-white/[0.025]">
        <div className="flex">
          {(['drive', 'dropbox'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-3 text-[12.5px] font-medium flex items-center justify-center gap-2 transition ${
                tab === t ? 'bg-white/[0.05] text-foreground' : 'text-muted-foreground'
              }`}
            >
              {t === 'drive' ? <HardDrive className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              {t === 'drive' ? 'Google Drive' : 'Dropbox'}
            </button>
          ))}
        </div>
        <div className="p-4 text-[12.5px] leading-relaxed text-muted-foreground space-y-2">
          {tab === 'drive' ? (
            <>
              <Step n={1} text="Upload your MP3 to Google Drive." />
              <Step n={2} text={<>Right-click the file <span className="text-foreground">→ Share</span>.</>} />
              <Step n={3} text={<>Set access to <span className="text-foreground">“Anyone with the link”</span>.</>} />
              <Step n={4} text={<>Hit <span className="text-foreground">Copy link</span> and paste below — we’ll convert it for streaming.</>} />
            </>
          ) : (
            <>
              <Step n={1} text="Upload your MP3 to Dropbox." />
              <Step n={2} text={<>Hover the file <span className="text-foreground">→ Share → Create link</span>.</>} />
              <Step n={3} text={<>Hit <span className="text-foreground">Copy link</span> and paste below.</>} />
              <Step n={4} text={<>We auto-swap <code className="text-foreground">?dl=0</code> to <code className="text-foreground">?dl=1</code> so it streams.</>} />
            </>
          )}
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <Field label="Song title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midnight Run"
            maxLength={80}
            className="h-12"
          />
        </Field>

        <Field label="Genre">
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGenre(g === genre ? '' : g)}
                className={`px-3 h-8 rounded-full text-[11.5px] font-medium transition ${
                  genre === g ? 'bg-white text-black' : 'bg-white/[0.05] text-muted-foreground active:scale-95'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Public share link">
          <div className="relative">
            <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://drive.google.com/file/d/…   or   https://dropbox.com/s/…"
              className="h-12 pl-9"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
          <AnimatePresence mode="wait">
            {linkState && (
              <motion.div
                key={isValid ? 'ok' : 'bad'}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-2 flex items-start gap-2 text-[11.5px] ${
                  isValid ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {isValid
                  ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                <span>{linkMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </Field>

        <Field label="Cover art (optional)">
          <label className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3.5 flex items-center gap-3 cursor-pointer">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center overflow-hidden">
              {cover
                ? <img src={coverPreview || undefined} className="w-full h-full object-cover" alt="" />
                : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
            </div>
            <span className="text-[12.5px] text-muted-foreground flex-1 truncate">
              {cover ? cover.name : 'Tap to pick cover (square recommended)'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                setCover(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
        </Field>

        <Button
          className="w-full h-12 rounded-xl font-semibold text-white"
          style={{ background: '#FF2D55' }}
          disabled={saving || !title.trim() || !isValid}
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

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-white/[0.06] text-foreground text-[10.5px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{n}</span>
      <span>{text}</span>
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
