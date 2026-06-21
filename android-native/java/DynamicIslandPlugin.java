package PACKAGE_PLACEHOLDER.island;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor bridge for the Universflow Dynamic Island — a system-wide
 * floating pill that hovers over other apps when music is playing.
 *
 * JS API (src/lib/dynamicIsland.ts):
 *   - canDraw()              -> { granted }
 *   - requestPermission()    opens the "Display over other apps" screen
 *   - show({title, artist, cover, isPlaying})
 *   - update({isPlaying, position, duration})
 *   - hide()
 *
 * Events (notifyListeners):
 *   - "islandAction" with { action: "play"|"pause"|"next"|"prev"|"open"|"close" }
 */
@CapacitorPlugin(name = "DynamicIsland")
public class DynamicIslandPlugin extends Plugin {

    private static DynamicIslandPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    public static void emitAction(String action) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        instance.notifyListeners("islandAction", data, true);
    }

    private boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(getContext());
    }

    @PluginMethod
    public void canDraw(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", canDrawOverlays());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (canDrawOverlays()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        try {
            Intent i = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Throwable ignored) {}
        JSObject ret = new JSObject();
        ret.put("granted", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canDrawOverlays()) {
            call.reject("overlay-permission-missing");
            return;
        }
        Intent i = new Intent(getContext(), DynamicIslandService.class);
        i.setAction(DynamicIslandService.ACTION_SHOW);
        i.putExtra("title", call.getString("title", ""));
        i.putExtra("artist", call.getString("artist", ""));
        i.putExtra("cover", call.getString("cover", ""));
        i.putExtra("isPlaying", call.getBoolean("isPlaying", true));
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        Intent i = new Intent(getContext(), DynamicIslandService.class);
        i.setAction(DynamicIslandService.ACTION_UPDATE);
        if (call.getBoolean("isPlaying") != null) {
            i.putExtra("isPlaying", call.getBoolean("isPlaying"));
        }
        if (call.getInt("position") != null) {
            i.putExtra("position", call.getInt("position", 0));
        }
        if (call.getInt("duration") != null) {
            i.putExtra("duration", call.getInt("duration", 0));
        }
        startSvc(i);
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        Intent i = new Intent(getContext(), DynamicIslandService.class);
        i.setAction(DynamicIslandService.ACTION_HIDE);
        startSvc(i);
        call.resolve();
    }

    private void startSvc(Intent i) {
        try {
            getContext().startService(i);
        } catch (Throwable ignored) {}
    }
}
