package PACKAGE_PLACEHOLDER.media;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Build;
import android.os.IBinder;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor bridge to NativeAudioPlayerService (ExoPlayer in a foreground
 * service). The WebView calls this for all audible playback on Android so
 * the audio engine is decoupled from the Activity / WebView lifecycle and
 * keeps playing smoothly when backgrounded or on the lock screen.
 *
 * JS API:
 *   load({ url, title?, artist?, album?, cover?, startPositionMs? })
 *   play()
 *   pause()
 *   seek({ positionMs })
 *   setVolume({ volume })   // 0..1
 *   stop()
 *   getState() -> { isPlaying, positionMs, durationMs }
 *
 * Events (notifyListeners("nativeAudioEvent", ...)):
 *   { type: "stateChange", state: "playing" | "paused" }
 *   { type: "positionChange", positionMs, durationMs }
 *   { type: "ended" }
 *   { type: "error", message }
 *   { type: "nextRequested" }    -- from lock-screen / BT controls
 *   { type: "previousRequested" }
 */
@CapacitorPlugin(name = "NativeAudioPlayer")
public class NativeAudioPlayerPlugin extends Plugin {

    private static NativeAudioPlayerPlugin instance;
    private NativeAudioPlayerService service;
    private boolean bound = false;

    private final ServiceConnection conn = new ServiceConnection() {
        @Override public void onServiceConnected(ComponentName name, IBinder binder) {
            service = ((NativeAudioPlayerService.LocalBinder) binder).getService();
            bound = true;
        }
        @Override public void onServiceDisconnected(ComponentName name) {
            service = null; bound = false;
        }
    };

    @Override
    public void load() {
        instance = this;
        // Pre-bind the service so the first play() is instant. Service is
        // not started here — start happens inside the load() method below
        // when the user actually triggers playback.
    }

    private void ensureStartedAndBound() {
        Context ctx = getContext();
        Intent i = new Intent(ctx, NativeAudioPlayerService.class);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(i);
            } else {
                ctx.startService(i);
            }
        } catch (Throwable ignore) {}
        if (!bound) {
            try { ctx.bindService(i, conn, Context.BIND_AUTO_CREATE); } catch (Throwable ignore) {}
        }
    }

    public static void emitEvent(String type, String arg1, String arg2) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("type", type);
        switch (type) {
            case "stateChange":
                data.put("state", arg1);
                break;
            case "positionChange":
                try { data.put("positionMs", Long.parseLong(arg1)); } catch (Throwable ignore) {}
                try { data.put("durationMs", Long.parseLong(arg2)); } catch (Throwable ignore) {}
                break;
            case "error":
                data.put("message", arg1 == null ? "" : arg1);
                break;
            default:
                break;
        }
        instance.notifyListeners("nativeAudioEvent", data, true);
    }

    @PluginMethod
    public void load(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("url is required");
            return;
        }
        String title  = call.getString("title", "");
        String artist = call.getString("artist", "");
        String album  = call.getString("album", "");
        String cover  = call.getString("cover", "");
        Long startMs  = call.getLong("startPositionMs", 0L);
        ensureStartedAndBound();
        // The service may not be bound on the *very first* call. Retry once
        // after a short delay so playback still starts.
        final long startPosition = startMs == null ? 0L : startMs;
        if (service != null) {
            service.loadAndPlay(url, title, artist, album, cover, startPosition);
            call.resolve();
        } else {
            getActivity().runOnUiThread(() ->
                new android.os.Handler().postDelayed(() -> {
                    if (service != null) service.loadAndPlay(url, title, artist, album, cover, startPosition);
                    call.resolve();
                }, 250)
            );
        }
    }

    @PluginMethod public void play(PluginCall call)  { if (service != null) service.playerPlay();  call.resolve(); }
    @PluginMethod public void pause(PluginCall call) { if (service != null) service.playerPause(); call.resolve(); }

    @PluginMethod public void seek(PluginCall call) {
        Long pos = call.getLong("positionMs", 0L);
        if (service != null) service.playerSeek(pos == null ? 0L : pos);
        call.resolve();
    }

    @PluginMethod public void setVolume(PluginCall call) {
        Double v = call.getDouble("volume", 1.0);
        if (service != null) service.playerSetVolume(v == null ? 1f : v.floatValue());
        call.resolve();
    }

    @PluginMethod public void stop(PluginCall call) {
        if (service != null) service.playerStop();
        try {
            if (bound) { getContext().unbindService(conn); bound = false; service = null; }
        } catch (Throwable ignore) {}
        call.resolve();
    }

    @PluginMethod public void getState(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isPlaying", service != null && service.isPlaying());
        ret.put("positionMs", service == null ? 0L : service.getPosition());
        ret.put("durationMs", service == null ? 0L : service.getDuration());
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        try { if (bound) { getContext().unbindService(conn); bound = false; } } catch (Throwable ignore) {}
        super.handleOnDestroy();
    }
}
