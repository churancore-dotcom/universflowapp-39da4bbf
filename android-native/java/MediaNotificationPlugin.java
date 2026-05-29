package PACKAGE_PLACEHOLDER.media;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Capacitor bridge for the MediaNotificationService.
 *
 * JS API (mirrors the previous capacitor-music-controls-plugin shape so
 * src/lib/nativeMusicControls.ts stays the same):
 *   - create({ title, artist, album, cover, duration, isPlaying })
 *   - update({ isPlaying, position })
 *   - destroy()
 *   - requestPermission()    (Android 13+ POST_NOTIFICATIONS)
 *
 * Events (notifyListeners):
 *   - "controlsNotification" with { message: "music-controls-play" | ... }
 *     so the existing JS listener wiring keeps working.
 */
@CapacitorPlugin(
    name = "MediaNotification",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MediaNotificationPlugin extends Plugin {

    private static MediaNotificationPlugin instance;

    private void startMediaService(Intent intent) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
        } catch (Exception ignored) {
            // Background service starts can be rejected on aggressive Android builds.
            // The JS audio engine keeps playing; the next foreground/notification
            // update will resync the MediaSession instead of crashing the APK.
        }
    }

    @Override
    public void load() {
        instance = this;
    }

    /** Service callback hook so MediaNotificationService can emit JS events. */
    public static void emitControlEvent(String message) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("message", message);
        instance.notifyListeners("controlsNotification", data, true);
    }

    @PluginMethod
    public void create(PluginCall call) {
        Intent i = new Intent(getContext(), MediaNotificationService.class);
        i.setAction(MediaNotificationService.ACTION_UPDATE);
        i.putExtra("title", call.getString("title", ""));
        i.putExtra("artist", call.getString("artist", ""));
        i.putExtra("album", call.getString("album", ""));
        i.putExtra("cover", call.getString("cover", ""));
        i.putExtra("duration", call.getInt("duration", 0).longValue() * 1000L);
        i.putExtra("isPlaying", call.getBoolean("isPlaying", false));

        startMediaService(i);
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        Intent i = new Intent(getContext(), MediaNotificationService.class);
        i.setAction(MediaNotificationService.ACTION_STATE);
        i.putExtra("isPlaying", call.getBoolean("isPlaying", false));
        if (call.getInt("position") != null) {
            i.putExtra("position", call.getInt("position", 0).longValue() * 1000L);
        }
        startMediaService(i);
        call.resolve();
    }

    @PluginMethod
    public void destroy(PluginCall call) {
        Intent i = new Intent(getContext(), MediaNotificationService.class);
        i.setAction(MediaNotificationService.ACTION_STOP);
        startMediaService(i);
        call.resolve();
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("notifications", call, "permsCallback");
    }

    @PermissionCallback
    private void permsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = getPermissionState("notifications").toString().equalsIgnoreCase("granted");
        ret.put("granted", granted);
        call.resolve(ret);
    }
}
