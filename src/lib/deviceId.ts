// Persistent per-browser device identity used by cross-device playback sync.
// We DON'T tie this to user id — the same device, multiple users, keeps the
// same id so the server can tell "this device" from "any other device".

const DEVICE_ID_KEY = 'uf_device_id';
const DEVICE_LABEL_KEY = 'uf_device_label';

const randomId = () => {
  try {
    // crypto.randomUUID exists in all modern browsers + Android WebView 89+
    return crypto.randomUUID();
  } catch {
    return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
};

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
}

function detectLabel(): string {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent || '';
  // Native APK shell
  if (/median/i.test(ua) || /UniversflowApp/i.test(ua)) return 'Universflow App';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) {
    // Try to grab the model from "Android 14; SM-A546B"
    const m = ua.match(/Android[^;]*;\\s*([^)]+?)(?:\\sBuild|\\))/i);
    if (m) {
      const model = m[1].split(';').pop()?.trim();
      if (model && model.length < 32) return model;
    }
    return 'Android phone';
  }
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Web browser';
}

export function getDeviceLabel(): string {
  try {
    let label = localStorage.getItem(DEVICE_LABEL_KEY);
    if (!label) {
      label = detectLabel();
      localStorage.setItem(DEVICE_LABEL_KEY, label);
    }
    return label;
  } catch {
    return detectLabel();
  }
}
