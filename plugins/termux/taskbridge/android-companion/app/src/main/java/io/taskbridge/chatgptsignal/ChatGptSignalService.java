package io.taskbridge.chatgptsignal;

import android.accessibilityservice.AccessibilityService;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

public final class ChatGptSignalService extends AccessibilityService {
    private static final String CHATGPT_PACKAGE = "com.openai.chatgpt";
    private static final long VERIFY_DELAY_MS = 650L;
    private static final long MIN_STOP_VISIBLE_MS = 300L;
    private static final long SIGNAL_DEBOUNCE_MS = 2500L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private boolean generating = false;
    private boolean verifyPending = false;
    private long firstStopSeenAt = 0L;
    private long lastStopSeenAt = 0L;
    private long lastSignalAt = 0L;

    private final Runnable verifyStopped = () -> {
        verifyPending = false;
        if (!generating || !MainActivity.hasConsent(this)) return;
        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null || root.getPackageName() == null || !CHATGPT_PACKAGE.contentEquals(root.getPackageName())) return;
        if (containsStopControl(root, 0, new int[]{0})) {
            lastStopSeenAt = SystemClock.elapsedRealtime();
            return;
        }
        long now = SystemClock.elapsedRealtime();
        if (lastStopSeenAt - firstStopSeenAt < MIN_STOP_VISIBLE_MS) return;
        if (now - lastSignalAt < SIGNAL_DEBOUNCE_MS) return;
        generating = false;
        lastSignalAt = now;
        SignalNotifier.post(this, "stop_control_disappeared");
    };

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || !MainActivity.hasConsent(this)) return;
        CharSequence pkg = event.getPackageName();
        if (pkg == null || !CHATGPT_PACKAGE.contentEquals(pkg)) return;

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;
        boolean stopPresent = containsStopControl(root, 0, new int[]{0});
        long now = SystemClock.elapsedRealtime();
        if (stopPresent) {
            if (!generating) firstStopSeenAt = now;
            generating = true;
            lastStopSeenAt = now;
            if (verifyPending) {
                handler.removeCallbacks(verifyStopped);
                verifyPending = false;
            }
            return;
        }

        if (generating && !verifyPending) {
            verifyPending = true;
            handler.postDelayed(verifyStopped, VERIFY_DELAY_MS);
        }
    }

    @Override
    public void onInterrupt() {
        handler.removeCallbacks(verifyStopped);
        verifyPending = false;
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        generating = false;
        verifyPending = false;
    }

    private boolean containsStopControl(AccessibilityNodeInfo node, int depth, int[] visited) {
        if (node == null || depth > 18 || visited[0]++ > 600) return false;
        if (StopControlMatcher.matches(
            node.getText(),
            node.getContentDescription(),
            node.getViewIdResourceName(),
            node.getClassName() == null ? null : node.getClassName().toString(),
            node.isClickable()
        )) {
            return true;
        }
        int count = node.getChildCount();
        for (int i = 0; i < count; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child == null) continue;
            try {
                if (containsStopControl(child, depth + 1, visited)) return true;
            } finally {
                child.recycle();
            }
        }
        return false;
    }
}
