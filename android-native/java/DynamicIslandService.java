package com.universeflow.app.island;

import android.animation.ValueAnimator;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.net.URL;

/**
 * Universflow Dynamic Island — Java port. System-wide TYPE_APPLICATION_OVERLAY
 * pill that floats above other apps while music plays.
 */
public class DynamicIslandService extends Service {

    public static final String ACTION_SHOW = "com.universeflow.island.SHOW";
    public static final String ACTION_UPDATE = "com.universeflow.island.UPDATE";
    public static final String ACTION_HIDE = "com.universeflow.island.HIDE";

    private static final int ROSE = 0xFFFF2D55;
    private static final int WHITE_70 = 0xB3FFFFFF;
    private static final int WHITE_10 = 0x1AFFFFFF;

    private WindowManager wm;
    private FrameLayout root;
    private WindowManager.LayoutParams lp;

    private ImageView artwork;
    private TextView title;
    private TextView artist;
    private View roseDot;
    private ImageButton playBtn;
    private ImageButton prevBtn;
    private ImageButton nextBtn;
    private ImageButton closeBtn;
    private View progressBar;
    private View progressTrack;
    private LinearLayout compactRow;
    private LinearLayout expandedRow;

    private boolean expanded = false;
    private boolean isPlaying = true;
    private String lastCoverUrl = null;
    private String lastTitle = "";
    private String lastArtist = "";
    private int positionMs = 0;
    private int durationMs = 0;
    private final Handler main = new Handler(Looper.getMainLooper());
    private ValueAnimator dotAnim;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || intent.getAction() == null) return START_STICKY;
        String action = intent.getAction();
        if (ACTION_SHOW.equals(action)) {
            lastTitle = intent.getStringExtra("title");
            if (lastTitle == null) lastTitle = "";
            lastArtist = intent.getStringExtra("artist");
            if (lastArtist == null) lastArtist = "";
            isPlaying = intent.getBooleanExtra("isPlaying", true);
            String cover = intent.getStringExtra("cover");
            ensureView();
            applyMeta(lastTitle, lastArtist);
            applyPlayingState(isPlaying);
            if (cover != null && !cover.equals(lastCoverUrl)) {
                lastCoverUrl = cover;
                loadArtwork(cover);
            }
        } else if (ACTION_UPDATE.equals(action)) {
            if (intent.hasExtra("isPlaying")) {
                isPlaying = intent.getBooleanExtra("isPlaying", isPlaying);
                applyPlayingState(isPlaying);
            }
            if (intent.hasExtra("position")) positionMs = intent.getIntExtra("position", 0) * 1000;
            if (intent.hasExtra("duration")) durationMs = intent.getIntExtra("duration", 0) * 1000;
            applyProgress();
        } else if (ACTION_HIDE.equals(action)) {
            teardown();
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private void ensureView() {
        if (root != null) return;
        final Context ctx = this;
        wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);

        int type;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            type = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            //noinspection deprecation
            type = WindowManager.LayoutParams.TYPE_PHONE;
        }

        lp = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(8f);

        root = new FrameLayout(ctx);

        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setShape(GradientDrawable.RECTANGLE);
        pillBg.setCornerRadius(dp(28f));
        pillBg.setColor(Color.BLACK);
        pillBg.setStroke(dp(0.5f), WHITE_10);

        LinearLayout container = new LinearLayout(ctx);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackground(pillBg);
        container.setPadding(dp(8f), dp(8f), dp(8f), dp(8f));
        container.setElevation(dp(12f));

        compactRow = new LinearLayout(ctx);
        compactRow.setOrientation(LinearLayout.HORIZONTAL);
        compactRow.setGravity(Gravity.CENTER_VERTICAL);

        artwork = new ImageView(ctx);
        int aSize = dp(40f);
        LinearLayout.LayoutParams aLp = new LinearLayout.LayoutParams(aSize, aSize);
        aLp.rightMargin = dp(10f);
        artwork.setLayoutParams(aLp);
        artwork.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable aBg = new GradientDrawable();
        aBg.setShape(GradientDrawable.RECTANGLE);
        aBg.setCornerRadius(dp(10f));
        aBg.setColor(0xFF111111);
        artwork.setBackground(aBg);
        artwork.setClipToOutline(true);

        LinearLayout textCol = new LinearLayout(ctx);
        textCol.setOrientation(LinearLayout.VERTICAL);
        textCol.setLayoutParams(new LinearLayout.LayoutParams(
                dp(150f), LinearLayout.LayoutParams.WRAP_CONTENT));

        title = new TextView(ctx);
        title.setTextColor(Color.WHITE);
        title.setTextSize(13f);
        title.setMaxLines(1);
        title.setEllipsize(TextUtils.TruncateAt.END);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));

        artist = new TextView(ctx);
        artist.setTextColor(WHITE_70);
        artist.setTextSize(11f);
        artist.setMaxLines(1);
        artist.setEllipsize(TextUtils.TruncateAt.END);

        textCol.addView(title);
        textCol.addView(artist);

        roseDot = new View(ctx);
        int dSize = dp(7f);
        LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(dSize, dSize);
        dLp.leftMargin = dp(10f);
        dLp.rightMargin = dp(6f);
        roseDot.setLayoutParams(dLp);
        GradientDrawable dBg = new GradientDrawable();
        dBg.setShape(GradientDrawable.OVAL);
        dBg.setColor(ROSE);
        roseDot.setBackground(dBg);

        compactRow.addView(artwork);
        compactRow.addView(textCol);
        compactRow.addView(roseDot);
        container.addView(compactRow);

        expandedRow = new LinearLayout(ctx);
        expandedRow.setOrientation(LinearLayout.VERTICAL);
        expandedRow.setVisibility(View.GONE);
        expandedRow.setPadding(dp(4f), dp(10f), dp(4f), dp(2f));

        LinearLayout controls = new LinearLayout(ctx);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        controls.setGravity(Gravity.CENTER);

        prevBtn = mkBtn("\u23EE", new Runnable() {
            @Override public void run() { DynamicIslandPlugin.emitAction("prev"); }
        });
        playBtn = mkBtn(isPlaying ? "\u23F8" : "\u25B6", new Runnable() {
            @Override public void run() {
                isPlaying = !isPlaying;
                applyPlayingState(isPlaying);
                DynamicIslandPlugin.emitAction(isPlaying ? "play" : "pause");
            }
        });
        nextBtn = mkBtn("\u23ED", new Runnable() {
            @Override public void run() { DynamicIslandPlugin.emitAction("next"); }
        });
        controls.addView(prevBtn);
        controls.addView(spacer(dp(20f)));
        controls.addView(playBtn);
        controls.addView(spacer(dp(20f)));
        controls.addView(nextBtn);

        FrameLayout trackHolder = new FrameLayout(ctx);
        LinearLayout.LayoutParams thLp = new LinearLayout.LayoutParams(dp(240f), dp(2f));
        thLp.topMargin = dp(10f);
        thLp.gravity = Gravity.CENTER_HORIZONTAL;
        trackHolder.setLayoutParams(thLp);

        progressTrack = new View(ctx);
        progressTrack.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));
        GradientDrawable ptBg = new GradientDrawable();
        ptBg.setShape(GradientDrawable.RECTANGLE);
        ptBg.setCornerRadius(dp(1f));
        ptBg.setColor(WHITE_10);
        progressTrack.setBackground(ptBg);

        progressBar = new View(ctx);
        progressBar.setLayoutParams(new FrameLayout.LayoutParams(
                dp(2f), FrameLayout.LayoutParams.MATCH_PARENT));
        GradientDrawable pbBg = new GradientDrawable();
        pbBg.setShape(GradientDrawable.RECTANGLE);
        pbBg.setCornerRadius(dp(1f));
        pbBg.setColor(ROSE);
        progressBar.setBackground(pbBg);

        trackHolder.addView(progressTrack);
        trackHolder.addView(progressBar);

        closeBtn = mkBtn("\u00D7", new Runnable() {
            @Override public void run() {
                DynamicIslandPlugin.emitAction("close");
                collapse();
                teardown();
                stopSelf();
            }
        });
        closeBtn.setLayoutParams(new LinearLayout.LayoutParams(dp(28f), dp(28f)));

        LinearLayout topBar = new LinearLayout(ctx);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.END);
        topBar.addView(closeBtn);

        expandedRow.addView(topBar);
        expandedRow.addView(controls);
        expandedRow.addView(trackHolder);

        container.addView(expandedRow);

        compactRow.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { toggleExpand(); }
        });
        compactRow.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                DynamicIslandPlugin.emitAction("open");
                openHostApp();
                return true;
            }
        });

        root.addView(container);

        try {
            wm.addView(root, lp);
        } catch (Throwable t) {
            root = null;
            return;
        }

        startDotPulse();
    }

    private ImageButton mkBtn(final String label, final Runnable onClick) {
        ImageButton btn = new ImageButton(this);
        int s = dp(36f);
        btn.setLayoutParams(new LinearLayout.LayoutParams(s, s));
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(0x14FFFFFF);
        btn.setBackground(bg);
        btn.setImageBitmap(textGlyph(label, dp(18f), Color.WHITE));
        btn.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { onClick.run(); }
        });
        return btn;
    }

    private View spacer(int w) {
        View v = new View(this);
        v.setLayoutParams(new LinearLayout.LayoutParams(w, 1));
        return v;
    }

    private Bitmap textGlyph(String s, float size, int color) {
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(color);
        paint.setTextSize(size);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        Rect bounds = new Rect();
        paint.getTextBounds(s, 0, s.length(), bounds);
        int w = Math.max((int) (paint.measureText(s) + dp(8f)), dp(20f));
        int h = bounds.height() + dp(10f);
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint.FontMetrics fm = paint.getFontMetrics();
        float baseline = h / 2f - (fm.ascent + fm.descent) / 2f;
        c.drawText(s, w / 2f, baseline, paint);
        return bmp;
    }

    private void applyMeta(String t, String a) {
        if (title != null) title.setText(t != null && !t.trim().isEmpty() ? t : "Now Playing");
        if (artist != null) artist.setText(a);
    }

    private void applyPlayingState(boolean playing) {
        if (playBtn != null) {
            playBtn.setImageBitmap(textGlyph(playing ? "\u23F8" : "\u25B6", dp(18f), Color.WHITE));
        }
        if (playing) startDotPulse(); else stopDotPulse();
    }

    private void applyProgress() {
        if (progressTrack == null || progressBar == null) return;
        int w = progressTrack.getWidth();
        if (w <= 0 || durationMs <= 0) return;
        float pct = Math.max(0f, Math.min(1f, (float) positionMs / (float) durationMs));
        FrameLayout.LayoutParams pblp = (FrameLayout.LayoutParams) progressBar.getLayoutParams();
        pblp.width = Math.max((int) (w * pct), dp(2f));
        progressBar.setLayoutParams(pblp);
    }

    private void startDotPulse() {
        if (dotAnim != null && dotAnim.isRunning()) return;
        dotAnim = ValueAnimator.ofFloat(0.55f, 1f);
        dotAnim.setDuration(850);
        dotAnim.setRepeatMode(ValueAnimator.REVERSE);
        dotAnim.setRepeatCount(ValueAnimator.INFINITE);
        dotAnim.setInterpolator(new AccelerateDecelerateInterpolator());
        dotAnim.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
            @Override public void onAnimationUpdate(ValueAnimator a) {
                if (roseDot != null) roseDot.setAlpha((Float) a.getAnimatedValue());
            }
        });
        dotAnim.start();
    }

    private void stopDotPulse() {
        if (dotAnim != null) dotAnim.cancel();
        dotAnim = null;
        if (roseDot != null) roseDot.setAlpha(0.35f);
    }

    private void toggleExpand() {
        if (expanded) collapse(); else expand();
    }

    private void expand() {
        expanded = true;
        if (expandedRow != null) expandedRow.setVisibility(View.VISIBLE);
        applyProgress();
    }

    private void collapse() {
        expanded = false;
        if (expandedRow != null) expandedRow.setVisibility(View.GONE);
    }

    private void openHostApp() {
        try {
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                startActivity(launch);
            }
        } catch (Throwable ignored) {}
    }

    private void loadArtwork(final String url) {
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    java.net.URLConnection conn = new URL(url).openConnection();
                    conn.setConnectTimeout(6000);
                    conn.setReadTimeout(6000);
                    final Bitmap bmp = BitmapFactory.decodeStream(conn.getInputStream());
                    if (bmp != null) {
                        final Bitmap rounded = roundedBitmap(bmp, dp(10f));
                        main.post(new Runnable() {
                            @Override public void run() {
                                if (artwork != null) artwork.setImageBitmap(rounded);
                            }
                        });
                    }
                } catch (Throwable ignored) {}
            }
        }).start();
    }

    private Bitmap roundedBitmap(Bitmap src, float radius) {
        int size = Math.min(src.getWidth(), src.getHeight());
        Bitmap sq = Bitmap.createBitmap(
                src,
                (src.getWidth() - size) / 2,
                (src.getHeight() - size) / 2,
                size, size);
        Bitmap out = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(out);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF rect = new RectF(0f, 0f, (float) size, (float) size);
        canvas.drawRoundRect(rect, radius, radius, paint);
        paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
        canvas.drawBitmap(sq, 0f, 0f, paint);
        return out;
    }

    private void teardown() {
        stopDotPulse();
        try {
            if (root != null && wm != null) wm.removeView(root);
        } catch (Throwable ignored) {}
        root = null;
    }

    @Override
    public void onDestroy() {
        teardown();
        super.onDestroy();
    }
}
