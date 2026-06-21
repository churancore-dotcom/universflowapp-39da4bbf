import { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Upload, Check, ShieldCheck, Globe2, User, Link2, FileCheck2, Camera, Image as ImageIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import { FadeTransition } from '@/components/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FaceLivenessCapture, { LivenessShots } from '@/components/FaceLivenessCapture';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { detectCountrySilently } from '@/lib/geoCountry';
import { useFilePreview } from '@/lib/useFilePreview';
import {
  ID_DOC_LABELS,
  IdDocType,
  docsForCountry,
  getArtistReapplyState,
  getMyApplication,
  uploadArtistPhoto,
  uploadKycFile,
} from '@/lib/artist';
import type { ArtistApplicationSafe } from '@/lib/artist';
import { validatePhone, getDialCode, PHONE_DIGITS } from '@/lib/phoneValidator';
import { validateSocialLink, atLeastOneValidLink, SocialPlatform } from '@/lib/socialLinkValidator';

type Step = 1 | 2 | 3 | 4 | 5 | 6;
const TOTAL_STEPS = 6;

type SocialLinksDraft = { instagram?: unknown; youtube?: unknown; spotify?: unknown; apple_music?: unknown; bio?: unknown };

function asSocialLinks(value: Json | null): SocialLinksDraft {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getApplicationId(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as { application_id?: unknown; id?: unknown };
  const id = record.application_id ?? record.id;
  return typeof id === 'string' ? id : null;
}

// Wide country list. Order: Top-of-mind first, then alphabetical.
const COUNTRIES: ReadonlyArray<readonly [string, string]> = [
  ['IN', '🇮🇳 India'],
  ['US', '🇺🇸 United States'],
  ['GB', '🇬🇧 United Kingdom'],
  ['CA', '🇨🇦 Canada'],
  ['AU', '🇦🇺 Australia'],
  ['AE', '🇦🇪 United Arab Emirates'],
  ['DE', '🇩🇪 Germany'],
  ['FR', '🇫🇷 France'],
  ['IT', '🇮🇹 Italy'],
  ['ES', '🇪🇸 Spain'],
  ['NL', '🇳🇱 Netherlands'],
  ['BE', '🇧🇪 Belgium'],
  ['PT', '🇵🇹 Portugal'],
  ['PL', '🇵🇱 Poland'],
  ['SE', '🇸🇪 Sweden'],
  ['NO', '🇳🇴 Norway'],
  ['DK', '🇩🇰 Denmark'],
  ['FI', '🇫🇮 Finland'],
  ['IE', '🇮🇪 Ireland'],
  ['CH', '🇨🇭 Switzerland'],
  ['AT', '🇦🇹 Austria'],
  ['CZ', '🇨🇿 Czechia'],
  ['HU', '🇭🇺 Hungary'],
  ['RO', '🇷🇴 Romania'],
  ['GR', '🇬🇷 Greece'],
  ['TR', '🇹🇷 Türkiye'],
  ['RU', '🇷🇺 Russia'],
  ['UA', '🇺🇦 Ukraine'],
  ['JP', '🇯🇵 Japan'],
  ['KR', '🇰🇷 South Korea'],
  ['CN', '🇨🇳 China'],
  ['HK', '🇭🇰 Hong Kong'],
  ['SG', '🇸🇬 Singapore'],
  ['MY', '🇲🇾 Malaysia'],
  ['ID', '🇮🇩 Indonesia'],
  ['TH', '🇹🇭 Thailand'],
  ['VN', '🇻🇳 Vietnam'],
  ['PH', '🇵🇭 Philippines'],
  ['PK', '🇵🇰 Pakistan'],
  ['BD', '🇧🇩 Bangladesh'],
  ['LK', '🇱🇰 Sri Lanka'],
  ['NP', '🇳🇵 Nepal'],
  ['NZ', '🇳🇿 New Zealand'],
  ['BR', '🇧🇷 Brazil'],
  ['MX', '🇲🇽 Mexico'],
  ['AR', '🇦🇷 Argentina'],
  ['CL', '🇨🇱 Chile'],
  ['CO', '🇨🇴 Colombia'],
  ['PE', '🇵🇪 Peru'],
  ['ZA', '🇿🇦 South Africa'],
  ['NG', '🇳🇬 Nigeria'],
  ['EG', '🇪🇬 Egypt'],
  ['KE', '🇰🇪 Kenya'],
  ['MA', '🇲🇦 Morocco'],
  ['SA', '🇸🇦 Saudi Arabia'],
  ['IL', '🇮🇱 Israel'],
  ['QA', '🇶🇦 Qatar'],
  ['XX', '🌍 Other / Not listed'],
];

const STEP_META: Record<Step, { label: string; icon: typeof User }> = {
  1: { label: 'About you',     icon: User },
  2: { label: 'Your music',    icon: Link2 },
  3: { label: 'Verify ID',     icon: FileCheck2 },
  4: { label: 'Face check',    icon: Camera },
  5: { label: 'Profile photo', icon: ImageIcon },
  6: { label: 'Submit',        icon: Sparkles },
};

function FilePicker({
  label,
  file,
  onPick,
  accept = 'image/jpeg,image/png,image/webp',
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  accept?: string;
}) {
  const preview = useFilePreview(file);
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70 mb-2">
        {label}
      </span>
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] p-4 flex items-center gap-3 active:bg-white/[0.06] transition cursor-pointer">
        {file ? (
          <>
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center shrink-0">
              <img src={preview || undefined} alt="preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button
              type="button"
              className="text-[12px] text-primary px-2 py-1 font-medium"
              onClick={(e) => { e.preventDefault(); onPick(null); }}
            >
              Change
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium">Tap to upload</p>
              <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP · auto-compressed</p>
            </div>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          // NOTE: do NOT use `hidden` / display:none — Android WebView blocks the
          // native file picker on display:none inputs. sr-only keeps it tappable.
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onPick(f);
            // Reset so picking the same file again still fires onChange.
            e.target.value = '';
          }}
        />
      </div>
    </label>
  );
}

export default function ArtistApply() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReapplyMode = searchParams.get('mode') === 'reapply';
  const [bootChecked, setBootChecked] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState<ArtistApplicationSafe | null>(null);
  const isLockedReapply = isReapplyMode && !!existingApp;

  // form
  const [stageName, setStageName] = useState('');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(''); // NO default. User must pick.
  const [bio, setBio] = useState('');
  const [instagram, setInstagram] = useState('');
  const [youtube, setYoutube] = useState('');
  const [spotify, setSpotify] = useState('');
  const [appleMusic, setAppleMusic] = useState('');

  const [docType, setDocType] = useState<IdDocType | null>(null);
  const [docFront, setDocFront] = useState<File | null>(null);
  const [docBack, setDocBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [livenessShots, setLivenessShots] = useState<LivenessShots | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    (async () => {
      const existing = await getMyApplication(user.id);
      if (existing) {
        const reapply = getArtistReapplyState(existing);
        if (!isReapplyMode || existing.status !== 'rejected' || !reapply.canReapply) {
          if (isReapplyMode && existing.status === 'rejected') toast.error(reapply.waitText || 'You can re-submit 7 days after rejection.');
          navigate('/artist/status', { replace: true });
          return;
        }
        setExistingApp(existing);
        setStageName(existing.stage_name || '');
        setRealName(existing.real_name || '');
        const lockedCountry = existing.country_code || '';
        const lockedDial = lockedCountry ? getDialCode(lockedCountry) : '';
        const lockedPhone = String(existing.phone || '');
        setPhone(lockedDial && lockedPhone.startsWith(lockedDial) ? lockedPhone.slice(lockedDial.length) : lockedPhone.replace(/\D/g, ''));
        setCountry(existing.country_code || '');
        const links = asSocialLinks(existing.social_links);
        setInstagram(typeof links.instagram === 'string' ? links.instagram : '');
        setYoutube(typeof links.youtube === 'string' ? links.youtube : '');
        setSpotify(typeof links.spotify === 'string' ? links.spotify : '');
        setAppleMusic(typeof links.apple_music === 'string' ? links.apple_music : '');
        setBio(typeof links.bio === 'string' ? links.bio : '');
        setBootChecked(true);
        return;
      }

      let prefilledCountry = '';
      try {
        const raw = localStorage.getItem('uf_artist_signup');
        if (raw) {
          const s = JSON.parse(raw) as { full_name?: string; phone?: string; country_code?: string };
          if (s.full_name) setRealName(s.full_name);
          if (s.phone) setPhone(s.phone);
          if (s.country_code) { setCountry(s.country_code); prefilledCountry = s.country_code; }
        }
      } catch { /* ignore */ }

      // Silent geo-detect ONLY as a soft suggestion if user hasn't set one.
      if (!prefilledCountry) {
        try {
          const cc = await detectCountrySilently();
          if (cc && COUNTRIES.some(([c]) => c === cc)) setCountry(cc);
        } catch { /* keep blank */ }
      }

      setBootChecked(true);
    })();
  }, [user, isLoading, navigate, isReapplyMode]);

  // Update doc type when country changes — but never auto-pick if user hasn't chosen country yet.
  useEffect(() => {
    if (!country) { setDocType(null); return; }
    const options = docsForCountry(country);
    if (!docType || !options.includes(docType)) setDocType(options[0]);
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsBack = docType !== 'pan' && docType !== 'passport';
  const allowedDocs = country ? docsForCountry(country) : [];

  const phoneCheck = country ? validatePhone(country, phone) : { ok: false, reason: '' };
  const linksCheck = atLeastOneValidLink({ instagram, youtube, spotify, apple_music: appleMusic });
  const countryLabel = COUNTRIES.find(([c]) => c === country)?.[1] ?? country;

  const canNext = () => {
    if (step === 1) return stageName.trim().length >= 2 && realName.trim().length >= 2 && !!country && phoneCheck.ok;
    if (step === 2) return linksCheck.ok;
    if (step === 3) return !!docType && !!docFront && (!needsBack || !!docBack) && !!selfie;
    if (step === 4) return !!livenessShots;
    if (step === 5) return !!photo;
    return agreeTerms && agreePrivacy;
  };

  const submit = async () => {
    if (!user) return;
    if (!agreeTerms || !agreePrivacy) {
      toast.error('Please accept the Artist Terms and Privacy Policy.');
      return;
    }
    setSubmitting(true);
    try {
      const blobToFile = (b: Blob, name: string) => new File([b], name, { type: b.type || 'image/jpeg' });
      const faceUploads = livenessShots
        ? await Promise.all(
            (['center', 'left', 'right', 'up'] as const).map((k) =>
              uploadKycFile(user.id, 'selfie', blobToFile(livenessShots[k], `face-${k}.jpg`)),
            ),
          )
        : [];

      const [frontPath, backPath, selfiePath, photoUrl] = await Promise.all([
        docFront ? uploadKycFile(user.id, 'front', docFront) : Promise.resolve(null),
        needsBack && docBack ? uploadKycFile(user.id, 'back', docBack) : Promise.resolve(null),
        selfie ? uploadKycFile(user.id, 'selfie', selfie) : Promise.resolve(null),
        photo ? uploadArtistPhoto(user.id, photo) : Promise.resolve(null),
      ]);

      // Anti-duplicate hashes (sha256). Phone is hashed in E.164 form so the
      // same number typed two different ways still collides.
      const sha256Hex = async (data: ArrayBuffer | string) => {
        const buf = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
        const digest = await crypto.subtle.digest('SHA-256', buf);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      };
      const phoneE164 = phoneCheck.e164 || `${getDialCode(country)}${phone.replace(/\D/g, '')}`;
      const phoneHash = await sha256Hex(phoneE164.toLowerCase());
      const idImageHash = docFront ? await sha256Hex(await docFront.arrayBuffer()) : null;

      const socialLinks = {
        instagram: instagram.trim() || null,
        youtube: youtube.trim() || null,
        spotify: spotify.trim() || null,
        apple_music: appleMusic.trim() || null,
        bio: bio.trim() || null,
        face_shots: faceUploads,
      };

      const { data: inserted, error } = isLockedReapply
        ? await supabase.rpc('reapply_artist_application', {
            p_application_id: existingApp.id,
            p_social_links: socialLinks,
            p_id_doc_type: docType,
            p_id_doc_front_path: frontPath,
            p_id_doc_back_path: backPath,
            p_selfie_path: selfiePath,
            p_artist_photo_path: photoUrl,
            p_id_image_hash: idImageHash ?? '',
          })
        : await supabase.from('artist_applications').insert({
            user_id: user.id,
            stage_name: stageName.trim(),
            real_name: realName.trim(),
            phone: phoneE164,
            country_code: country,
            social_links: socialLinks,
            id_doc_type: docType,
            id_doc_front_path: frontPath,
            id_doc_back_path: backPath,
            selfie_path: selfiePath,
            artist_photo_path: photoUrl,
            phone_hash: phoneHash,
            id_image_hash: idImageHash,
          }).select('id').maybeSingle();

      if (error) {
        // Surface friendly errors for the new anti-abuse rules.
        const msg = error.message || '';
        if (msg.includes('re-apply 7 days') || msg.includes('Next attempt allowed')) {
          toast.error(msg);
        } else if (msg.toLowerCase().includes('already linked to another artist')) {
          toast.error(msg);
        } else {
          throw error;
        }
        return;
      }

      // Kick off automated verification in the background — non-blocking.
      const applicationId = getApplicationId(inserted);
      if (applicationId) {
        supabase.functions
          .invoke('artist-verify-checks', { body: { application_id: applicationId } })
          .catch((e) => console.warn('verify-checks invoke failed', e));
      }

      toast.success(isLockedReapply ? 'Verification re-submitted ✓' : 'Application submitted ✓ Auto-verification running…');
      navigate('/artist/status', { replace: true });
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  };


  if (isLoading || !bootChecked) return <div className="min-h-[100dvh] bg-background" />;

  const meta = STEP_META[step];
  const StepIcon = meta.icon;

  return (
    <FadeTransition>
      <SEOHead
        title="Apply as Artist — Universflow"
        description="Become a verified Universflow artist. Submit ID, get reviewed in 1–3 days, then publish your music."
        path="/artist/apply"
      />
      <div className="min-h-[100dvh] bg-background text-foreground pb-36">
        {/* Header with title + dot progress */}
        <header
          className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-white/5"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                if (step > 1) { setStep((s) => (s - 1) as Step); return; }
                // Step 1 back: leave the apply flow and return to main auth.
                navigate('/auth', { replace: true });
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.06] active:scale-95 transition"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight leading-tight truncate">{isLockedReapply ? 'Re-submit Verification' : 'Apply as Artist'}</h1>
              <p className="text-[11px] text-muted-foreground leading-tight truncate">{meta.label}</p>
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                const n = i + 1;
                const active = n === step;
                const done = n < step;
                return (
                  <span
                    key={n}
                    className={`h-1.5 rounded-full transition-all ${
                      active ? 'w-5 bg-primary' : done ? 'w-1.5 bg-primary/60' : 'w-1.5 bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-5 pt-5 pb-2">
          {/* Step header pill */}
          <div className="mb-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/12 border border-primary/20 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Step {step} of {TOTAL_STEPS}</p>
              <h2 className="text-[18px] font-semibold leading-tight">{meta.label}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {step === 1 && (
                <>
                  {isLockedReapply && existingApp?.admin_note && (
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-rose-300/80 mb-2">Rejected reason</p>
                      <p className="text-[13px] leading-relaxed text-foreground/90">{existingApp.admin_note}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12.5px] leading-relaxed text-foreground/90">
                      Verification takes <strong>1–3 days</strong>. Your ID is encrypted, kept private,
                      and <strong>auto-deleted after review</strong>.
                    </p>
                  </div>
                  <Field label="Stage / Artist name">
                    <Input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="e.g. KAYO" maxLength={50} disabled={isLockedReapply} />
                  </Field>
                  <Field label="Legal full name">
                    <Input value={realName} onChange={(e) => setRealName(e.target.value)} placeholder="As shown on ID" maxLength={80} disabled={isLockedReapply} />
                  </Field>
                  <Field label={`Phone number${country ? ` · ${getDialCode(country)} (${PHONE_DIGITS[country] ?? '—'} digits)` : ''}`}>
                    <div className="flex gap-2">
                      <span className="h-11 px-3 inline-flex items-center rounded-xl bg-white/[0.04] border border-white/10 text-[13px] tabular-nums text-muted-foreground shrink-0">
                        {country ? getDialCode(country) : '+—'}
                      </span>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                        placeholder={country ? `${PHONE_DIGITS[country] ?? 10}-digit mobile number` : 'Pick country first'}
                        maxLength={15}
                        disabled={!country || isLockedReapply}
                      />
                    </div>
                    {country && phone.length > 0 && !phoneCheck.ok && (
                      <p className="mt-1.5 text-[11.5px] text-rose-300 leading-snug">
                        {phoneCheck.troll || phoneCheck.reason}
                      </p>
                    )}
                    {country && phoneCheck.ok && (
                      <p className="mt-1.5 text-[11.5px] text-emerald-300 leading-snug">
                        ✓ Valid {countryLabel.replace(/^[^\s]+\s/, '')} mobile number.
                      </p>
                    )}
                    <p className="mt-1 text-[10.5px] text-muted-foreground/70">
                      You can&apos;t change this later. Use a real number — we check it.
                    </p>
                  </Field>
                  <Field label="Country">
                    <div className="relative">
                      <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        disabled={isLockedReapply}
                        className={`flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 py-2 text-sm appearance-none focus:outline-none focus:border-primary/50 ${
                          !country ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <option value="" disabled>Select your country…</option>
                        {COUNTRIES.map(([c, l]) => (
                          <option key={c} value={c} className="bg-background text-foreground">{l}</option>
                        ))}
                      </select>
                    </div>
                    {!country && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        We use this to ask for the right ID document.
                      </p>
                    )}
                  </Field>
                  <Field label="Short bio (optional)">
                    <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="What you make, where you're from…" rows={3} />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-[12.5px] text-muted-foreground -mt-1">
                    Paste at least <strong>one</strong> real artist profile link so we can match it to your ID.
                    Plain handles or fake text won&apos;t pass.
                  </p>
                  <LinkField platform="instagram" value={instagram} onChange={setInstagram} placeholder="https://instagram.com/yourhandle" />
                  <LinkField platform="youtube" value={youtube} onChange={setYoutube} placeholder="https://youtube.com/@yourchannel" />
                  <LinkField platform="spotify" value={spotify} onChange={setSpotify} placeholder="https://open.spotify.com/artist/…" />
                  <LinkField platform="apple_music" value={appleMusic} onChange={setAppleMusic} placeholder="https://music.apple.com/…/artist/…" />
                  {!linksCheck.ok && (instagram || youtube || spotify || appleMusic) && (
                    <p className="text-[11.5px] text-rose-300">{linksCheck.reason}</p>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  {!country ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[12.5px] text-amber-200">
                      Pick your country in Step 1 first so we can show the right ID options.
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/25 text-[12.5px] text-foreground/90 leading-relaxed">
                        You picked <strong>{countryLabel}</strong>. We only accept{' '}
                        <strong>{countryLabel.replace(/^[^\s]+\s/, '')}</strong>-issued ID documents.
                        Submitting an ID from any other country will get your application rejected instantly.
                      </div>
                      <Field label="Document type">
                        <div className="space-y-2">
                          {allowedDocs.map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setDocType(d)}
                              className={`w-full h-12 px-4 rounded-xl text-[13.5px] font-medium border transition flex items-center justify-between ${
                                docType === d
                                  ? 'bg-primary/15 text-foreground border-primary'
                                  : 'bg-white/[0.03] border-white/10 text-muted-foreground'
                              }`}
                            >
                              <span>{ID_DOC_LABELS[d]}</span>
                              {docType === d && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <FilePicker label="ID — front" file={docFront} onPick={setDocFront} />
                      {needsBack && <FilePicker label="ID — back" file={docBack} onPick={setDocBack} />}
                      <FilePicker label="Selfie holding the same ID" file={selfie} onPick={setSelfie} />
                      <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                        Files are compressed on-device, stored privately, and deleted right after review.
                      </p>
                    </>
                  )}
                </>
              )}

              {step === 4 && (
                <>
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/8 border border-primary/15">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[12.5px] leading-relaxed text-foreground/90">
                      Quick face check. Look at the camera and follow the prompts —{' '}
                      <strong>turn left, right, then up</strong>. We capture 4 photos to confirm you're a real person.
                    </p>
                  </div>
                  {livenessShots ? (
                    <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-300" />
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-emerald-200">Face check complete</p>
                        <p className="text-[11.5px] text-emerald-200/80">4 photos captured. Tap Continue.</p>
                      </div>
                      <button type="button" onClick={() => setLivenessShots(null)} className="text-[11.5px] text-emerald-200 underline">Redo</button>
                    </div>
                  ) : (
                    <FaceLivenessCapture onComplete={(s) => setLivenessShots(s)} />
                  )}
                </>
              )}

              {step === 5 && (
                <>
                  <p className="text-[12.5px] text-muted-foreground -mt-1">
                    A clean, high-quality photo of you. This becomes your public profile picture once verified.
                  </p>
                  <FilePicker label="Artist photo" file={photo} onPick={setPhoto} />
                </>
              )}

              {step === 6 && (
                <>
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-[13px] font-semibold">Almost done</p>
                    </div>
                    <p className="text-[12.5px] text-foreground/80 leading-relaxed">
                      Review takes 1–3 days. You'll get a push notification with the result.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <input
                      type="checkbox" checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF2D55]"
                    />
                    <span className="text-[12.5px] leading-relaxed">
                      I agree to the{' '}
                      <Link to="/legal/artist-terms" className="underline text-primary">Artist Terms</Link>{' '}
                      and confirm I have the right to publish the music I will upload.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <input
                      type="checkbox" checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#FF2D55]"
                    />
                    <span className="text-[12.5px] leading-relaxed">
                      I agree to the{' '}
                      <Link to="/legal/artist-privacy" className="underline text-primary">Artist Privacy Policy</Link>,
                      including that my ID will be deleted after review.
                    </span>
                  </label>
                </>
              )}
            </motion.section>
          </AnimatePresence>
        </main>

        {/* Sticky bottom CTA */}
        <div
          className="fixed bottom-0 inset-x-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent pt-6 px-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        >
          <div className="max-w-md mx-auto">
            {step < TOTAL_STEPS ? (
              <Button
                className="w-full h-13 rounded-2xl text-[14.5px] font-semibold shadow-lg shadow-primary/20"
                disabled={!canNext()}
                onClick={() => setStep((s) => (s + 1) as Step)}
                style={{ background: '#FF2D55', color: '#fff', height: 52 }}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                className="w-full rounded-2xl text-[14.5px] font-semibold shadow-lg shadow-primary/20"
                disabled={!canNext() || submitting}
                onClick={submit}
                style={{ background: '#FF2D55', color: '#fff', height: 52 }}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Submit application</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </FadeTransition>
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

const LINK_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  spotify: 'Spotify artist',
  apple_music: 'Apple Music artist',
};

function LinkField({
  platform, value, onChange, placeholder,
}: {
  platform: SocialPlatform;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const check = validateSocialLink(platform, value);
  const hasValue = value.trim().length > 0;
  return (
    <Field label={LINK_LABELS[platform]}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode="url" />
      {hasValue && !check.ok && (
        <p className="mt-1.5 text-[11px] text-rose-300 leading-snug">{check.reason}</p>
      )}
      {hasValue && check.ok && (
        <p className="mt-1.5 text-[11px] text-emerald-300 leading-snug">✓ Looks like a real link.</p>
      )}
    </Field>
  );
}

