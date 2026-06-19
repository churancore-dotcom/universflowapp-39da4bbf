import { supabase } from '@/integrations/supabase/client';
import { compressImage } from './imageCompression';

export type ArtistAppStatus = 'pending' | 'approved' | 'rejected';
export type IdDocType = 'voter_id' | 'pan' | 'passport' | 'drivers_license' | 'national_id';

export const ID_DOC_LABELS: Record<IdDocType, string> = {
  voter_id: 'Voter ID',
  pan: 'PAN Card',
  passport: 'Passport',
  drivers_license: "Driver's Licence",
  national_id: 'National ID',
};

export function docsForCountry(cc: string): IdDocType[] {
  const c = (cc || '').toUpperCase();
  if (c === 'IN') return ['voter_id', 'pan', 'passport'];
  if (c === 'US') return ['passport', 'drivers_license'];
  return ['national_id', 'passport'];
}

const KYC_BUCKET = 'artist-kyc';
const COVERS_BUCKET = 'covers';

async function compressKyc(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.78,
    outputType: 'image/jpeg',
  });
}

async function compressPhoto(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.82,
    outputType: 'image/webp',
  });
}

async function uploadFile(bucket: string, path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function uploadKycFile(
  userId: string,
  kind: 'front' | 'back' | 'selfie',
  file: File,
): Promise<string> {
  const compressed = await compressKyc(file);
  const path = `${userId}/${Date.now()}-${kind}.jpg`;
  return uploadFile(KYC_BUCKET, path, compressed);
}

export async function uploadArtistPhoto(userId: string, file: File): Promise<string> {
  const compressed = await compressPhoto(file);
  const path = `artist-photos/${userId}/${Date.now()}.webp`;
  await uploadFile(COVERS_BUCKET, path, compressed);
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadArtistCover(userId: string, file: File): Promise<string> {
  const compressed = await compressPhoto(file);
  const path = `artist-covers/${userId}/${Date.now()}.webp`;
  await uploadFile(COVERS_BUCKET, path, compressed);
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isBlockedStreamHost(url: string): string | null {
  const u = url.toLowerCase();
  if (!/^https?:\/\//.test(u)) return 'URL must start with https:// or http://';
  const blocked = [
    ['youtube.com', 'YouTube'],
    ['youtu.be', 'YouTube'],
    ['music.youtube', 'YouTube'],
    ['jiosaavn', 'JioSaavn'],
    ['spotify.com', 'Spotify'],
    ['soundcloud.com', 'SoundCloud'],
  ];
  for (const [needle, label] of blocked) {
    if (u.includes(needle)) return `${label} links are not allowed — use a direct audio URL you own.`;
  }
  return null;
}

export async function getMyApplication(userId: string) {
  // admin_note column is no longer SELECT-able by regular authenticated users;
  // fetch the rest of the row, then pull the owner-scoped note via RPC.
  const { data } = await supabase
    .from('artist_applications')
    .select('id, user_id, stage_name, real_name, phone, country_code, social_links, id_doc_type, id_doc_front_path, id_doc_back_path, selfie_path, artist_photo_path, status, reviewed_at, reviewed_by, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return data;
  let admin_note: string | null = null;
  try {
    const { data: note } = await (supabase.rpc as any)('get_my_artist_application_note', { _app_id: (data as any).id });
    admin_note = (note as string | null) ?? null;
  } catch {
    admin_note = null;
  }
  return { ...(data as any), admin_note };
}

export async function getMyArtistProfile(userId: string) {
  const { data } = await supabase
    .from('artist_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}
