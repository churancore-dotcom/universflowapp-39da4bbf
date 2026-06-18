import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { uploadArtistPhoto, uploadArtistCover } from '@/lib/artist';
import { ArtistProfile } from './_shared';

type Ctx = { profile: ArtistProfile; user: { id: string } };

export default function EditProfile() {
  const { profile, user } = useOutletContext<Ctx>();
  const [stage, setStage] = useState(profile.stage_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [insta, setInsta] = useState(profile.social_links?.instagram ?? '');
  const [yt, setYt] = useState(profile.social_links?.youtube ?? '');
  const [sp, setSp] = useState(profile.social_links?.spotify ?? '');
  const [apm, setApm] = useState(profile.social_links?.apple_music ?? '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!stage.trim()) return;
    setSaving(true);
    try {
      const [newAvatar, newBanner] = await Promise.all([
        avatar ? uploadArtistPhoto(user.id, avatar) : Promise.resolve(profile.avatar_url),
        banner ? uploadArtistCover(user.id, banner) : Promise.resolve(profile.banner_url),
      ]);
      const { error } = await supabase
        .from('artist_profiles')
        .update({
          stage_name: stage.trim(),
          bio: bio.trim() || null,
          avatar_url: newAvatar,
          banner_url: newBanner,
          social_links: {
            instagram: insta.trim() || null,
            youtube: yt.trim() || null,
            spotify: sp.trim() || null,
            apple_music: apm.trim() || null,
          },
        })
        .eq('user_id', user.id);
      if (error) throw error;
      toast.success('Profile updated ✓');
    } catch (e: any) {
      toast.error(e?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5">
      <h2 className="text-[20px] font-semibold tracking-tight">Edit profile</h2>
      <p className="text-[12.5px] text-muted-foreground mt-0.5">
        These changes go live on your public page at <code className="text-foreground">/a/{profile.slug}</code>.
      </p>

      <div className="space-y-4 mt-5">
        <Field label="Stage name">
          <Input value={stage} onChange={(e) => setStage(e.target.value)} maxLength={60} />
        </Field>

        <Field label="Bio">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} placeholder="Tell listeners about your sound." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <PhotoField label="Profile photo" current={profile.avatar_url} file={avatar} onPick={setAvatar} />
          <PhotoField label="Banner" current={profile.banner_url} file={banner} onPick={setBanner} />
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">Social links</p>
          <div className="space-y-2.5">
            <Input value={insta} onChange={(e) => setInsta(e.target.value)} placeholder="Instagram URL" />
            <Input value={yt} onChange={(e) => setYt(e.target.value)} placeholder="YouTube URL" />
            <Input value={sp} onChange={(e) => setSp(e.target.value)} placeholder="Spotify artist URL" />
            <Input value={apm} onChange={(e) => setApm(e.target.value)} placeholder="Apple Music URL" />
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-xl font-semibold text-white"
          style={{ background: '#FF2D55' }}
          disabled={saving || !stage.trim()}
          onClick={save}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Save changes</span>
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

function PhotoField({
  label, current, file, onPick,
}: { label: string; current: string | null; file: File | null; onPick: (f: File | null) => void }) {
  const preview = file ? URL.createObjectURL(file) : current;
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">{label}</span>
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-3 flex items-center gap-3 cursor-pointer">
        <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center overflow-hidden">
          {preview
            ? <img src={preview} className="w-full h-full object-cover" alt="" />
            : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
        </div>
        <span className="text-[12px] text-muted-foreground flex-1 truncate">
          {file ? file.name : preview ? 'Tap to replace' : 'Tap to upload'}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
      </div>
    </label>
  );
}
