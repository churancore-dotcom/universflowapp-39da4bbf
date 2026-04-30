package app.lovable.universflow.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.net.Uri;
import android.widget.RemoteViews;
import com.getcapacitor.BridgeActivity;

public class NowPlayingWidget extends AppWidgetProvider {

    public static final String ACTION_PLAY_PAUSE = "app.lovable.universflow.PLAY_PAUSE";
    public static final String ACTION_NEXT = "app.lovable.universflow.NEXT";
    public static final String ACTION_PREVIOUS = "app.lovable.universflow.PREVIOUS";
    public static final String PREFS_NAME = "UniversFlowWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_now_playing);
        
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String title = prefs.getString("current_title", "Not Playing");
        String artist = prefs.getString("current_artist", "Tap to open UniversFlow");
        boolean isPlaying = prefs.getBoolean("is_playing", false);
        int progress = prefs.getInt("progress", 0);
        
        views.setTextViewText(R.id.widget_song_title, title);
        views.setTextViewText(R.id.widget_artist_name, artist);
        views.setProgressBar(R.id.widget_progress, 100, progress, false);
        views.setImageViewResource(R.id.widget_btn_play_pause, 
            isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);
        
        // Play/Pause - sent directly to MediaNotificationService (foreground media service)
        views.setOnClickPendingIntent(R.id.widget_btn_play_pause,
            createMediaServiceIntent(context,
                isPlaying ? "uf.media.PAUSE" : "uf.media.PLAY", 0));

        // Next
        views.setOnClickPendingIntent(R.id.widget_btn_next,
            createMediaServiceIntent(context, "uf.media.NEXT", 1));

        // Previous
        views.setOnClickPendingIntent(R.id.widget_btn_previous,
            createMediaServiceIntent(context, "uf.media.PREV", 2));
        
        // Open app on album art / song info click
        Intent openAppIntent = new Intent(context, BridgeActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        openAppIntent.setData(Uri.parse("universflow://now-playing"));
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(context, 3, 
            openAppIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_album_art, openAppPendingIntent);
        views.setOnClickPendingIntent(R.id.widget_song_info, openAppPendingIntent);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createActionIntent(Context context, String action, int requestCode) {
        Intent intent = new Intent(context, BridgeActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.setData(Uri.parse("universflow://widget-action?action=" + action));
        intent.putExtra("widget_action", action);
        return PendingIntent.getActivity(context, requestCode,
            intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * Sends transport-control intents directly to MediaNotificationService so widget
     * buttons work even when the app UI isn't open. Resolved via Class.forName because
     * the service lives in the appId-derived "<pkg>.media" subpackage that's only
     * known at build time (injected by build-android.yml).
     */
    private static PendingIntent createMediaServiceIntent(Context context, String action, int requestCode) {
        String pkg = context.getPackageName();
        Intent intent;
        try {
            Class<?> svc = Class.forName(pkg + ".media.MediaNotificationService");
            intent = new Intent(context, svc).setAction(action);
        } catch (ClassNotFoundException e) {
            // Fallback: explicit component by name (still resolvable by the OS)
            intent = new Intent(action).setComponent(
                new android.content.ComponentName(pkg, pkg + ".media.MediaNotificationService"));
        }
        return PendingIntent.getService(context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
    }

    public static void updatePlaybackState(Context context, String title, String artist, 
            boolean isPlaying, int progress, Bitmap albumArt) {
        SharedPreferences.Editor editor = context
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit();
        editor.putString("current_title", title);
        editor.putString("current_artist", artist);
        editor.putBoolean("is_playing", isPlaying);
        editor.putInt("progress", progress);
        editor.apply();
        
        // Update all widget instances
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName widget = new ComponentName(context, NowPlayingWidget.class);
        int[] ids = manager.getAppWidgetIds(widget);
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
