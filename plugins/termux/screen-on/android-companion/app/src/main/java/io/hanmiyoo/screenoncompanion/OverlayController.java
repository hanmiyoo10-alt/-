package io.hanmiyoo.screenoncompanion;

import android.content.Context;
import android.graphics.PixelFormat;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;

final class OverlayController {
    private static final Object LOCK = new Object();
    private static WindowManager windowManager;
    private static View overlayView;

    private OverlayController() {}

    static boolean hasPermission(Context context) {
        return Settings.canDrawOverlays(context);
    }

    static boolean isActive() {
        synchronized (LOCK) {
            return overlayView != null;
        }
    }

    static void enable(Context context) {
        synchronized (LOCK) {
            if (overlayView != null) {
                return;
            }
            Context appContext = context.getApplicationContext();
            if (!hasPermission(appContext)) {
                throw new SecurityException("Display over other apps permission is required");
            }
            WindowManager manager = (WindowManager) appContext.getSystemService(Context.WINDOW_SERVICE);
            if (manager == null) {
                throw new IllegalStateException("WindowManager unavailable");
            }
            View view = new View(appContext);
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    1,
                    1,
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                            | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
                    PixelFormat.TRANSLUCENT);
            params.gravity = Gravity.TOP | Gravity.START;
            manager.addView(view, params);
            windowManager = manager;
            overlayView = view;
        }
    }

    static void disable() {
        synchronized (LOCK) {
            if (overlayView == null) {
                return;
            }
            try {
                windowManager.removeViewImmediate(overlayView);
            } finally {
                overlayView = null;
                windowManager = null;
            }
        }
    }
}
