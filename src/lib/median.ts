import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    isMedianApp?: boolean;
    isMedianIOS?: boolean;
    isMedianAndroid?: boolean;
  }
}

// Global detection for native app shells. The APK is Capacitor-based, not Median,
// so it must be treated as native too or `/` falls back to the APK download page.
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

const isCapacitorNative = (() => {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* noop */
  }

  try {
    if (typeof window !== 'undefined' && (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return true;
  } catch {
    /* noop */
  }

  // Production Capacitor Android serves bundled files from https://localhost.
  return (hostname === 'localhost' || hostname === 'capacitorlocalhost') && /android|iphone|ipad/.test(userAgent);
})();

// Official detection: check for 'median' in user agent (lowercase)
export const isMedianApp = userAgent.indexOf('median') > -1 || isCapacitorNative || /universflowapp/.test(userAgent);
export const isMedianIOS = userAgent.indexOf('medianios') > -1 || (isCapacitorNative && /iphone|ipad/.test(userAgent));
export const isMedianAndroid = userAgent.indexOf('medianandroid') > -1 || (isCapacitorNative && /android/.test(userAgent));

// Also expose on window for easy access
if (typeof window !== 'undefined') {
  window.isMedianApp = isMedianApp;
  window.isMedianIOS = isMedianIOS;
  window.isMedianAndroid = isMedianAndroid;
}

// Lazy load Median SDK only when needed
export const getMedian = async () => {
  const { default: Median } = await import('median-js-bridge');
  return Median;
};
