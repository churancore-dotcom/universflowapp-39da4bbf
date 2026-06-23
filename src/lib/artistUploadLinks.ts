/**
 * Artist upload link helpers.
 *
 * Artists may ONLY upload songs via public share links from Google Drive or
 * Dropbox. Everything else (YouTube, Spotify, JioSaavn, SoundCloud, raw mp3,
 * etc.) is rejected up-front, so this module is the single source of truth
 * for what counts as a valid link and how to normalize it for streaming.
 */

export type UploadSource = 'drive' | 'dropbox';

export type LinkValidation =
  | { ok: true; source: UploadSource; normalized: string }
  | { ok: false; reason: string };

const DRIVE_HOSTS = ['drive.google.com', 'docs.google.com'];
const DROPBOX_HOSTS = ['dropbox.com', 'www.dropbox.com', 'dl.dropboxusercontent.com'];

function safeUrl(raw: string): URL | null {
  try { return new URL(raw.trim()); } catch { return null; }
}

/** Extracts the file id from a Google Drive share URL. */
export function extractDriveId(raw: string): string | null {
  const u = safeUrl(raw);
  if (!u) return null;
  if (!DRIVE_HOSTS.includes(u.hostname)) return null;
  // /file/d/<id>/view
  const m = u.pathname.match(/\/file\/d\/([^/]+)/);
  if (m) return m[1];
  // /open?id=<id>  or /uc?id=<id>
  const qid = u.searchParams.get('id');
  if (qid) return qid;
  // /d/<id>
  const m2 = u.pathname.match(/\/d\/([^/]+)/);
  if (m2) return m2[1];
  return null;
}

/** Rewrites a Dropbox link into a direct-download URL. */
export function normalizeDropbox(raw: string): string | null {
  const u = safeUrl(raw);
  if (!u) return null;
  if (!DROPBOX_HOSTS.includes(u.hostname)) return null;
  // Force ?dl=1 and prefer the direct CDN host
  u.searchParams.set('dl', '1');
  // dl.dropboxusercontent.com serves the file inline without redirects
  if (u.hostname === 'dropbox.com' || u.hostname === 'www.dropbox.com') {
    u.hostname = 'dl.dropboxusercontent.com';
  }
  return u.toString();
}

/**
 * Validate a pasted link. Returns ok with a normalized stream URL we can store
 * straight on `artist_songs.stream_url`, or a human-readable reason.
 */
export function validateUploadLink(raw: string): LinkValidation {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, reason: 'Paste a Dropbox or Google Drive share link.' };
  if (!/^https?:\/\//i.test(trimmed)) return { ok: false, reason: 'Link must start with https://' };

  const u = safeUrl(trimmed);
  if (!u) return { ok: false, reason: 'That doesn’t look like a valid URL.' };

  if (DRIVE_HOSTS.includes(u.hostname)) {
    const id = extractDriveId(trimmed);
    if (!id) return { ok: false, reason: 'Couldn’t read a file id from that Google Drive link.' };
    return {
      ok: true,
      source: 'drive',
      normalized: `https://drive.google.com/uc?export=download&id=${id}`,
    };
  }

  if (DROPBOX_HOSTS.includes(u.hostname)) {
    const normalized = normalizeDropbox(trimmed);
    if (!normalized) return { ok: false, reason: 'Couldn’t normalize that Dropbox link.' };
    return { ok: true, source: 'dropbox', normalized };
  }

  // Friendly rejections for the most common wrong sources
  const host = u.hostname.replace(/^www\./, '');
  const blocked: Record<string, string> = {
    'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'music.youtube.com': 'YouTube',
    'spotify.com': 'Spotify', 'open.spotify.com': 'Spotify',
    'soundcloud.com': 'SoundCloud',
    'jiosaavn.com': 'JioSaavn', 'www.jiosaavn.com': 'JioSaavn',
    'apple.com': 'Apple Music', 'music.apple.com': 'Apple Music',
  };
  if (blocked[host]) {
    return { ok: false, reason: `${blocked[host]} links aren’t accepted. Upload your MP3 to Google Drive or Dropbox first.` };
  }
  return { ok: false, reason: 'Only Google Drive and Dropbox share links are accepted.' };
}

/** Pretty label for the source platform — used as a small badge on song rows. */
export function detectSource(url: string): UploadSource | null {
  const u = safeUrl(url);
  if (!u) return null;
  if (DRIVE_HOSTS.includes(u.hostname)) return 'drive';
  if (DROPBOX_HOSTS.includes(u.hostname)) return 'dropbox';
  return null;
}
