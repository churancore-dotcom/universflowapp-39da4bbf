package PACKAGE_PLACEHOLDER.media;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.media.AudioManager;
import android.media.audiofx.BassBoost;
import android.media.audiofx.Equalizer;
import android.media.audiofx.LoudnessEnhancer;
import android.media.audiofx.PresetReverb;
import android.media.audiofx.Virtualizer;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.source.ProgressiveMediaSource;
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Native ExoPlayer-backed foreground service. This is the AUDIBLE player on
 * Android; the WebView's HTMLAudioElement is muted on native and used only
 * as a UI/event source. Solves background stuttering because:
 *  - ExoPlayer runs in this Service, decoupled from the Activity / WebView
 *    lifecycle, so it is not throttled when the app backgrounds or the
 *    screen locks.
 *  - Foreground service of type mediaPlayback (Android 14+ compliant).
 *  - MediaSessionCompat with STATE_PLAYING tells the OS this is legitimate
 *    media playback (lock-screen / Bluetooth / Auto integration).
 *  - DefaultLoadControl is tuned generously (50s/100s buffer) so brief
 *    mobile-network hiccups don't cause audible gaps.
 *  - Stall watchdog re-prepare()s on >5s buffering.
 *  - ExoPlayer owns audio focus and pauses on becoming-noisy events.
 */
@OptIn(markerClass = UnstableApi.class)
public class NativeAudioPlayerService extends Service {

    public static final String CHANNEL_ID = "uf_native_player";
    public static final int NOTIFICATION_ID = 4712;

    public static final String ACTION_PLAY        = "uf.player.PLAY";
    public static final String ACTION_PAUSE       = "uf.player.PAUSE";
    public static final String ACTION_NEXT        = "uf.player.NEXT";
    public static final String ACTION_PREV        = "uf.player.PREV";
    public static final String ACTION_STOP        = "uf.player.STOP";

    private final IBinder binder = new LocalBinder();
    public class LocalBinder extends Binder {
        public NativeAudioPlayerService getService() { return NativeAudioPlayerService.this; }
    }

    private ExoPlayer player;
    private MediaSessionCompat session;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String title = "";
    private String artist = "";
    private String album = "";
    private String coverUrl = "";
    private Bitmap currentArt = null;
    private String loadedArtUrl = null;

    private Runnable stallWatchdog;
    private boolean reprepareTried = false;
    private long lastPositionTickMs = -1L;

    // --- Native DSP effects attached to ExoPlayer audio session ---
    private int audioSessionId = 0;
    private Equalizer equalizer;
    private BassBoost bassBoost;
    private PresetReverb presetReverb;
    private Virtualizer virtualizer;
    private LoudnessEnhancer loudnessEnhancer;

    // 8D spatial: LFO that sweeps Virtualizer strength + reverb send
    // (Android has no native stereo panner, so we approximate motion).
    private boolean spatial8dEnabled = false;
    private Runnable spatialTicker;
    private long spatialStartMs = 0L;

    // Persisted intent state (re-applied whenever effects are rebuilt)
    private final short[] eqBandGainsDb = new short[]{0,0,0,0,0,0,0,0,0,0};
    private int bassBoostPercent = 0;
    private int reverbPercent = 0;
    private String studioSpaceId = "off";
    private boolean lateNightEnabled = false;
    private boolean virtualizerEnabled = false;
    private float playbackSpeed = 1.0f;

    private final Player.Listener listener = new Player.Listener() {
        @Override public void onPlaybackStateChanged(int playbackState) {
            switch (playbackState) {
                case Player.STATE_BUFFERING:
                    scheduleStallWatchdog();
                    break;
                case Player.STATE_READY:
                    cancelStallWatchdog();
                    reprepareTried = false;
                    break;
                case Player.STATE_ENDED:
                    NativeAudioPlayerPlugin.emitEvent("ended", null, null);
                    break;
                case Player.STATE_IDLE:
                    break;
            }
            postNotification();
        }
        @Override public void onIsPlayingChanged(boolean isPlaying) {
            NativeAudioPlayerPlugin.emitEvent("stateChange", isPlaying ? "playing" : "paused", null);
            postNotification();
            if (isPlaying) startPositionTicker(); else stopPositionTicker();
        }
        @Override public void onPlayerError(PlaybackException error) {
            NativeAudioPlayerPlugin.emitEvent("error", error.getMessage(), null);
        }
    };

    private final Runnable positionTicker = new Runnable() {
        @Override public void run() {
            if (player != null && player.isPlaying()) {
                long pos = player.getCurrentPosition();
                long dur = Math.max(0, player.getDuration());
                NativeAudioPlayerPlugin.emitEvent("positionChange", String.valueOf(pos), String.valueOf(dur));
                lastPositionTickMs = pos;
            }
            mainHandler.postDelayed(this, 500);
        }
    };

    private void startPositionTicker() {
        mainHandler.removeCallbacks(positionTicker);
        mainHandler.postDelayed(positionTicker, 250);
    }
    private void stopPositionTicker() {
        mainHandler.removeCallbacks(positionTicker);
    }

    private void scheduleStallWatchdog() {
        cancelStallWatchdog();
        stallWatchdog = () -> {
            if (player == null) return;
            if (player.getPlaybackState() == Player.STATE_BUFFERING && player.getPlayWhenReady()) {
                if (!reprepareTried) {
                    reprepareTried = true;
                    long pos = player.getCurrentPosition();
                    try { player.prepare(); player.seekTo(pos); } catch (Throwable ignore) {}
                } else {
                    NativeAudioPlayerPlugin.emitEvent("error", "stalled", null);
                }
            }
        };
        mainHandler.postDelayed(stallWatchdog, 5000);
    }
    private void cancelStallWatchdog() {
        if (stallWatchdog != null) mainHandler.removeCallbacks(stallWatchdog);
        stallWatchdog = null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        initPlayer();
        initSession();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Make sure we satisfy startForegroundService → startForeground within 5s
        postNotification();
        if (intent != null && intent.getAction() != null) {
            switch (intent.getAction()) {
                case ACTION_PLAY:  if (player != null) player.setPlayWhenReady(true);  break;
                case ACTION_PAUSE: if (player != null) player.setPlayWhenReady(false); break;
                case ACTION_NEXT:  NativeAudioPlayerPlugin.emitEvent("nextRequested", null, null); break;
                case ACTION_PREV:  NativeAudioPlayerPlugin.emitEvent("previousRequested", null, null); break;
                case ACTION_STOP:  stopSelfFully(); break;
            }
        }
        return START_STICKY;
    }

    @Nullable @Override public IBinder onBind(Intent intent) { return binder; }

    private void initPlayer() {
        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
            // Generous buffer so brief network drops while backgrounded don't
            // create audible gaps. min/max buffer 50s/100s, start at 2.5s,
            // resume after rebuffer at 5s.
            .setBufferDurationsMs(50_000, 100_000, 2_500, 5_000)
            .setPrioritizeTimeOverSizeThresholds(true)
            .build();

        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setConnectTimeoutMs(15_000)
            .setReadTimeoutMs(15_000)
            .setAllowCrossProtocolRedirects(true)
            .setUserAgent("Universflow/1.0 (Android; ExoPlayer)");

        DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, http);

        DefaultMediaSourceFactory mediaSourceFactory = new DefaultMediaSourceFactory(dataSourceFactory)
            .setLoadErrorHandlingPolicy(new DefaultLoadErrorHandlingPolicy(3));

        AudioAttributes audioAttrs = new AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build();

        player = new ExoPlayer.Builder(this)
            .setLoadControl(loadControl)
            .setMediaSourceFactory(mediaSourceFactory)
            .setAudioAttributes(audioAttrs, /* handleAudioFocus= */ true)
            .setHandleAudioBecomingNoisy(true)
            .setWakeMode(C.WAKE_MODE_NETWORK)
            .build();

        // Allocate our own audio session ID so we can attach DSP effects
        // BEFORE the first track plays (no first-track gap of unprocessed audio).
        try {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            audioSessionId = am != null
                ? am.generateAudioSessionId()
                : AudioManager.AUDIO_SESSION_ID_GENERATE;
            if (audioSessionId != AudioManager.ERROR && audioSessionId != 0) {
                player.setAudioSessionId(audioSessionId);
                attachAudioEffects();
            }
        } catch (Throwable t) {
            NativeAudioPlayerPlugin.emitEvent("error", "audiofx init failed: " + t.getMessage(), null);
        }

        player.addListener(listener);
    }

    // ===== Native DSP (android.media.audiofx) =====

    private void attachAudioEffects() {
        releaseAudioEffects();
        try {
            equalizer = new Equalizer(0, audioSessionId);
            equalizer.setEnabled(true);
        } catch (Throwable t) { equalizer = null; }
        try {
            bassBoost = new BassBoost(0, audioSessionId);
            bassBoost.setEnabled(false);
        } catch (Throwable t) { bassBoost = null; }
        try {
            presetReverb = new PresetReverb(0, audioSessionId);
            presetReverb.setPreset(PresetReverb.PRESET_NONE);
            presetReverb.setEnabled(false);
        } catch (Throwable t) { presetReverb = null; }
        try {
            virtualizer = new Virtualizer(0, audioSessionId);
            virtualizer.setEnabled(false);
        } catch (Throwable t) { virtualizer = null; }
        try {
            loudnessEnhancer = new LoudnessEnhancer(audioSessionId);
            loudnessEnhancer.setEnabled(false);
        } catch (Throwable t) { loudnessEnhancer = null; }

        // Re-apply persisted intent (e.g. service was restarted).
        applyAllEffects();
    }

    private void releaseAudioEffects() {
        try { if (equalizer != null) { equalizer.release(); } } catch (Throwable ignore) {}
        try { if (bassBoost != null) { bassBoost.release(); } } catch (Throwable ignore) {}
        try { if (presetReverb != null) { presetReverb.release(); } } catch (Throwable ignore) {}
        try { if (virtualizer != null) { virtualizer.release(); } } catch (Throwable ignore) {}
        try { if (loudnessEnhancer != null) { loudnessEnhancer.release(); } } catch (Throwable ignore) {}
        equalizer = null; bassBoost = null; presetReverb = null;
        virtualizer = null; loudnessEnhancer = null;
    }

    private void applyAllEffects() {
        applyEqualizer();
        applyBassBoost();
        applyReverb();
        applyVirtualizer();
        applyLoudness();
        applyPlaybackSpeed();
        applySpatial8d();
    }

    /** Map our 10-band web EQ onto the device Equalizer's (typically 5) bands. */
    private void applyEqualizer() {
        if (equalizer == null) return;
        try {
            short numBands = equalizer.getNumberOfBands();
            short[] range = equalizer.getBandLevelRange(); // millibels (min, max)
            short min = range[0], max = range[1];
            for (short b = 0; b < numBands; b++) {
                int centerHz = equalizer.getCenterFreq(b) / 1000; // mHz -> Hz
                // Pick the nearest web band by log distance
                int bestIdx = 0; double bestDist = Double.MAX_VALUE;
                int[] webHz = new int[]{32,64,125,250,500,1000,2000,4000,8000,16000};
                for (int i = 0; i < webHz.length; i++) {
                    double d = Math.abs(Math.log(webHz[i]) - Math.log(Math.max(1, centerHz)));
                    if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
                // Web gain is dB ±12; native is millibels.
                int dB = eqBandGainsDb[bestIdx];
                int mB = Math.max(min, Math.min(max, dB * 100));
                equalizer.setBandLevel(b, (short) mB);
            }
            // Equalizer stays enabled even at flat — cheaper than toggling.
            equalizer.setEnabled(true);
        } catch (Throwable ignore) {}
    }

    private void applyBassBoost() {
        if (bassBoost == null) return;
        try {
            short s = (short) Math.max(0, Math.min(1000, bassBoostPercent * 10));
            if (s > 0 && bassBoost.getStrengthSupported()) {
                bassBoost.setStrength(s);
                bassBoost.setEnabled(true);
            } else {
                bassBoost.setEnabled(false);
            }
        } catch (Throwable ignore) {}
    }

    /** Reverb % + studio space → PresetReverb preset + level. */
    private void applyReverb() {
        if (presetReverb == null) return;
        try {
            short preset = PresetReverb.PRESET_NONE;
            switch (studioSpaceId == null ? "off" : studioSpaceId) {
                case "vinyl":     preset = PresetReverb.PRESET_SMALLROOM;  break;
                case "studio":    preset = PresetReverb.PRESET_SMALLROOM;  break;
                case "bedroom":   preset = PresetReverb.PRESET_MEDIUMROOM; break;
                case "hall":      preset = PresetReverb.PRESET_MEDIUMHALL; break;
                case "cathedral": preset = PresetReverb.PRESET_LARGEHALL;  break;
                case "stadium":   preset = PresetReverb.PRESET_LARGEHALL;  break;
                case "off":
                default:
                    // Fall back to the wet-mix slider
                    if (reverbPercent >= 60)      preset = PresetReverb.PRESET_LARGEHALL;
                    else if (reverbPercent >= 30) preset = PresetReverb.PRESET_MEDIUMHALL;
                    else if (reverbPercent >= 10) preset = PresetReverb.PRESET_MEDIUMROOM;
                    else if (reverbPercent > 0)   preset = PresetReverb.PRESET_SMALLROOM;
                    else                          preset = PresetReverb.PRESET_NONE;
                    break;
            }
            boolean active = preset != PresetReverb.PRESET_NONE;
            presetReverb.setPreset(preset);
            presetReverb.setEnabled(active);
        } catch (Throwable ignore) {}
    }

    private void applyVirtualizer() {
        if (virtualizer == null) return;
        try {
            boolean on = virtualizerEnabled || spatial8dEnabled;
            if (on && virtualizer.getStrengthSupported()) {
                if (!spatial8dEnabled) virtualizer.setStrength((short) 1000);
                virtualizer.setEnabled(true);
            } else {
                virtualizer.setEnabled(false);
            }
        } catch (Throwable ignore) {}
    }

    private void applyLoudness() {
        if (loudnessEnhancer == null) return;
        try {
            if (lateNightEnabled) {
                // +8 dB makeup gain — quiet vocals audible without loud peaks.
                loudnessEnhancer.setTargetGain(800);
                loudnessEnhancer.setEnabled(true);
            } else {
                loudnessEnhancer.setEnabled(false);
            }
        } catch (Throwable ignore) {}
    }

    private void applyPlaybackSpeed() {
        if (player == null) return;
        try { player.setPlaybackParameters(new PlaybackParameters(playbackSpeed, 1.0f)); }
        catch (Throwable ignore) {}
    }

    private void applySpatial8d() {
        // Sweep Virtualizer strength + reverb between two presets to simulate
        // the rotating spatial motion of "8D audio". Approximation only —
        // Android audiofx has no stereo panner.
        if (spatialTicker != null) { mainHandler.removeCallbacks(spatialTicker); spatialTicker = null; }
        if (!spatial8dEnabled) {
            // Restore static state
            applyVirtualizer();
            applyReverb();
            return;
        }
        try { if (virtualizer != null) virtualizer.setEnabled(true); } catch (Throwable ignore) {}
        try {
            if (presetReverb != null) {
                presetReverb.setPreset(PresetReverb.PRESET_LARGEHALL);
                presetReverb.setEnabled(true);
            }
        } catch (Throwable ignore) {}
        spatialStartMs = System.currentTimeMillis();
        spatialTicker = new Runnable() {
            @Override public void run() {
                if (!spatial8dEnabled || virtualizer == null) return;
                try {
                    double t = (System.currentTimeMillis() - spatialStartMs) / 1000.0;
                    // 5.5s period sine — matches the web engine's SPATIAL_RATE_HZ.
                    double phase = Math.sin(2 * Math.PI * t / 5.5);
                    short strength = (short) (500 + (int) (phase * 500));
                    strength = (short) Math.max(0, Math.min(1000, strength));
                    if (virtualizer.getStrengthSupported()) virtualizer.setStrength(strength);
                } catch (Throwable ignore) {}
                mainHandler.postDelayed(this, 80);
            }
        };
        mainHandler.post(spatialTicker);
    }

    // ===== Setters called from the plugin =====

    public void setEqBands(short[] dB) {
        for (int i = 0; i < Math.min(eqBandGainsDb.length, dB.length); i++) {
            eqBandGainsDb[i] = (short) Math.max(-15, Math.min(15, (int) dB[i]));
        }
        applyEqualizer();
    }
    public void setBassBoostPercent(int pct) {
        bassBoostPercent = Math.max(0, Math.min(100, pct));
        applyBassBoost();
    }
    public void setReverbPercent(int pct) {
        reverbPercent = Math.max(0, Math.min(100, pct));
        applyReverb();
    }
    public void setStudioSpace(String id) {
        studioSpaceId = id == null ? "off" : id;
        applyReverb();
    }
    public void setLateNight(boolean on) {
        lateNightEnabled = on;
        applyLoudness();
    }
    public void setHeadphoneSurround(boolean on) {
        virtualizerEnabled = on;
        applyVirtualizer();
    }
    public void setSpatial8D(boolean on) {
        spatial8dEnabled = on;
        applySpatial8d();
    }
    public void setPlaybackSpeed(float speed) {
        playbackSpeed = Math.max(0.5f, Math.min(2.0f, speed));
        applyPlaybackSpeed();
    }


    private void initSession() {
        session = new MediaSessionCompat(this, "UniversFlowNativePlayer");
        session.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay()       { if (player != null) player.setPlayWhenReady(true);  }
            @Override public void onPause()      { if (player != null) player.setPlayWhenReady(false); }
            @Override public void onSkipToNext() { NativeAudioPlayerPlugin.emitEvent("nextRequested", null, null); }
            @Override public void onSkipToPrevious() { NativeAudioPlayerPlugin.emitEvent("previousRequested", null, null); }
            @Override public void onStop()       { stopSelfFully(); }
            @Override public void onSeekTo(long pos) { if (player != null) player.seekTo(pos); }
        });
        session.setActive(true);
    }

    // ===== Public API used by the plugin =====

    public void loadAndPlay(String url, String title, String artist, String album, String cover, long startPositionMs) {
        this.title = safe(title);
        this.artist = safe(artist);
        this.album = safe(album);
        this.coverUrl = safe(cover);
        loadArtAsync(this.coverUrl);

        try {
            MediaItem item = MediaItem.fromUri(url);
            player.setMediaItem(item, startPositionMs);
            player.prepare();
            player.setPlayWhenReady(true);
        } catch (Throwable t) {
            NativeAudioPlayerPlugin.emitEvent("error", String.valueOf(t.getMessage()), null);
        }
        postNotification();
    }

    public void playerPlay()  { if (player != null) player.setPlayWhenReady(true);  }
    public void playerPause() { if (player != null) player.setPlayWhenReady(false); }
    public void playerSeek(long ms) { if (player != null) player.seekTo(ms); }
    public void playerSetVolume(float v) { if (player != null) player.setVolume(Math.max(0f, Math.min(1f, v))); }
    public void playerStop() { stopSelfFully(); }

    public long getPosition() { return player == null ? 0L : player.getCurrentPosition(); }
    public long getDuration() { return player == null ? 0L : Math.max(0L, player.getDuration()); }
    public boolean isPlaying() { return player != null && player.isPlaying(); }

    // ===== Internals =====

    private void stopSelfFully() {
        if (spatialTicker != null) { mainHandler.removeCallbacks(spatialTicker); spatialTicker = null; }
        releaseAudioEffects();
        try { if (player != null) { player.stop(); player.release(); } } catch (Throwable ignore) {}
        player = null;
        stopForegroundCompat();
        stopSelf();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Universflow Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            ch.setShowBadge(false);
            ch.setSound(null, null);
            ch.enableVibration(false);
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private void postNotification() {
        boolean isPlaying = isPlaying();

        // Update session metadata + state so the OS treats us as legitimate
        // media playback (lock screen, Bluetooth, Android Auto).
        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, getDuration());
        if (currentArt != null) meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArt);
        if (session != null) session.setMetadata(meta.build());

        long actions = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_STOP
            | PlaybackStateCompat.ACTION_SEEK_TO;
        PlaybackStateCompat state = new PlaybackStateCompat.Builder()
            .setActions(actions)
            .setState(
                isPlaying ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                getPosition(), isPlaying ? 1f : 0f
            )
            .build();
        if (session != null) session.setPlaybackState(state);

        Intent contentIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentPi = contentIntent == null ? null : PendingIntent.getActivity(
            this, 0, contentIntent, PendingIntent.FLAG_UPDATE_CURRENT | piImmutable()
        );

        int smallIconRes = getResources().getIdentifier("ic_stat_notify", "drawable", getPackageName());
        if (smallIconRes == 0) smallIconRes = getApplicationInfo().icon;

        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(smallIconRes)
            .setColor(0xFFFF2D55)
            .setColorized(true)
            .setContentTitle(title.isEmpty() ? "Now Playing" : title)
            .setContentText(artist.isEmpty() ? "Universflow" : artist)
            .setLargeIcon(currentArt)
            .setContentIntent(contentPi)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setOnlyAlertOnce(true);

        if (album != null && !album.isEmpty()) b.setSubText(album);

        b.addAction(new NotificationCompat.Action(
            android.R.drawable.ic_media_previous, "Previous", buildActionPi(ACTION_PREV)));
        b.addAction(new NotificationCompat.Action(
            isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
            isPlaying ? "Pause" : "Play",
            buildActionPi(isPlaying ? ACTION_PAUSE : ACTION_PLAY)));
        b.addAction(new NotificationCompat.Action(
            android.R.drawable.ic_media_next, "Next", buildActionPi(ACTION_NEXT)));

        b.setStyle(new MediaStyle()
            .setMediaSession(session != null ? session.getSessionToken() : null)
            .setShowActionsInCompactView(0, 1, 2));

        Notification notif = b.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                startForeground(NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } catch (Throwable t) {
                startForeground(NOTIFICATION_ID, notif);
            }
        } else {
            startForeground(NOTIFICATION_ID, notif);
        }

        if (!isPlaying) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_DETACH);
            } else {
                stopForeground(false);
            }
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(NOTIFICATION_ID, notif);
        }
    }

    private PendingIntent buildActionPi(String action) {
        Intent i = new Intent(this, NativeAudioPlayerService.class).setAction(action);
        return PendingIntent.getService(this, action.hashCode(), i,
            PendingIntent.FLAG_UPDATE_CURRENT | piImmutable());
    }
    private int piImmutable() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private void stopForegroundCompat() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
            else stopForeground(true);
        } catch (Throwable ignore) {}
        try { if (session != null) { session.setActive(false); session.release(); session = null; } } catch (Throwable ignore) {}
    }

    private void loadArtAsync(final String url) {
        if (url == null || url.isEmpty() || url.equals(loadedArtUrl)) return;
        new Thread(() -> {
            Bitmap bmp = downloadBitmap(url);
            if (bmp != null) {
                currentArt = bmp;
                loadedArtUrl = url;
                mainHandler.post(this::postNotification);
            }
        }).start();
    }

    private Bitmap downloadBitmap(String url) {
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            try (InputStream is = conn.getInputStream()) {
                return BitmapFactory.decodeStream(is);
            }
        } catch (Throwable ignore) {
            return null;
        } finally {
            if (conn != null) try { conn.disconnect(); } catch (Throwable ignore) {}
        }
    }

    @Override
    public void onDestroy() {
        cancelStallWatchdog();
        stopPositionTicker();
        if (spatialTicker != null) { mainHandler.removeCallbacks(spatialTicker); spatialTicker = null; }
        releaseAudioEffects();
        try { if (player != null) { player.release(); player = null; } } catch (Throwable ignore) {}
        try { if (session != null) { session.release(); session = null; } } catch (Throwable ignore) {}
        super.onDestroy();
    }

    private static String safe(String s) { return s == null ? "" : s; }
}
