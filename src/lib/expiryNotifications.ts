// Free, forever local notifications for subscription expiry.
// Uses Capacitor LocalNotifications (no FCM/server cost).
// Schedules a single "7 days left" notification on the device.

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

const NOTIF_ID_7D = 70007; // stable id so we can replace/cancel

export async function scheduleExpiryNotifications(expiresAtIso: string | null | undefined) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Always cancel previous before re-scheduling so the date is fresh.
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_7D }] });

    if (!expiresAtIso) return;
    const expiresAt = new Date(expiresAtIso).getTime();
    if (!Number.isFinite(expiresAt)) return;

    const fireAt = expiresAt - 7 * 24 * 60 * 60 * 1000;
    if (fireAt <= Date.now()) return; // already inside the 7-day window or expired

    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIF_ID_7D,
          title: 'Universflow Premium',
          body: '7 days left on your Premium. Tap to renew and keep the music going.',
          schedule: { at: new Date(fireAt), allowWhileIdle: true },
          smallIcon: 'ic_stat_icon_config_sample',
          extra: { route: '/premium' },
        },
      ],
    });
  } catch {
    /* silently ignore — notifications are best-effort */
  }
}

export async function cancelExpiryNotifications() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID_7D }] });
  } catch { /* ignore */ }
}
