// Validates that social-link inputs are actually real URLs on the right host —
// not just a name, a handle, or random text.
export type SocialPlatform = 'instagram' | 'youtube' | 'spotify' | 'apple_music';

const HOSTS: Record<SocialPlatform, RegExp> = {
  instagram: /^(www\.)?instagram\.com$/i,
  youtube: /^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$/i,
  spotify: /^(open\.|play\.)?spotify\.com$/i,
  apple_music: /^(music\.|geo\.music\.)?apple\.com$/i,
};

const LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  spotify: 'Spotify',
  apple_music: 'Apple Music',
};

export interface LinkCheck { ok: boolean; reason?: string; normalized?: string }

export function validateSocialLink(platform: SocialPlatform, raw: string): LinkCheck {
  const value = (raw || '').trim();
  if (!value) return { ok: true }; // empty allowed (validation only when filled)
  let url: URL;
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    return { ok: false, reason: `Paste a full ${LABEL[platform]} URL (https://…), not just a name.` };
  }
  if (!HOSTS[platform].test(url.hostname)) {
    return { ok: false, reason: `That doesn't look like a ${LABEL[platform]} link.` };
  }
  // Must have an actual path (profile/handle), not just the homepage
  if (url.pathname.replace(/\/+$/, '').length < 2) {
    return { ok: false, reason: `Link to your ${LABEL[platform]} profile, not the homepage.` };
  }
  return { ok: true, normalized: url.toString() };
}

export function atLeastOneValidLink(links: Partial<Record<SocialPlatform, string>>): { ok: boolean; reason?: string } {
  const entries = Object.entries(links) as Array<[SocialPlatform, string]>;
  const filled = entries.filter(([, v]) => v && v.trim().length > 0);
  if (filled.length === 0) return { ok: false, reason: 'Add at least one social link so we can verify you.' };
  for (const [p, v] of filled) {
    const r = validateSocialLink(p, v);
    if (!r.ok) return { ok: false, reason: r.reason };
  }
  return { ok: true };
}
