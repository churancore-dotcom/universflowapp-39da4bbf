// Persistent "seen" state for announcements. Used by the bell badge and the
// /notifications page to ensure the red dot does not reappear once the user
// has viewed announcements.

const STORAGE_KEY = 'uf_seen_announcements_v2';

export const getSeenAnnouncementIds = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const saveSeenAnnouncementIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch { /* ignore */ }
};

export const markAllAnnouncementsSeen = (ids: string[]) => {
  const set = getSeenAnnouncementIds();
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) { set.add(id); changed = true; }
  }
  if (changed) {
    saveSeenAnnouncementIds(set);
    // Notify same-tab listeners (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent('uf:announcements-seen'));
  }
};
