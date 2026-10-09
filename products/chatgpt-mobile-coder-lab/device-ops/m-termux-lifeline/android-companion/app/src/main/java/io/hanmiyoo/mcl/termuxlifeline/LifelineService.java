package io.hanmiyoo.mcl.termuxlifeline;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.IBinder;
import android.os.SystemClock;
import java.util.concurrent.atomic.AtomicLong;

public final class LifelineService extends Service {
    static final String TERMUX_PACKAGE = "com.termux";
    static final String RUN_COMMAND_PERMISSION = "com.termux.permission.RUN_COMMAND";
    static final String RUN_COMMAND_ACTION = "com.termux.RUN_COMMAND";
    static final String RUN_COMMAND_SERVICE = "com.termux.app.RunCommandService";
    static final String RUN_COMMAND_PATH = "com.termux.RUN_COMMAND_PATH";
    static final String RUN_COMMAND_ARGUMENTS = "com.termux.RUN_COMMAND_ARGUMENTS";
    static final String RUN_COMMAND_WORKDIR = "com.termux.RUN_COMMAND_WORKDIR";
    static final String RUN_COMMAND_BACKGROUND = "com.termux.RUN_COMMAND_BACKGROUND";
    static final String RUN_COMMAND_PENDING_INTENT = "com.termux.RUN_COMMAND_PENDING_INTENT";
    static final String RESULT_BUNDLE = "result";
    static final String RESULT_EXIT_CODE = "exitCode";
    static final String RESULT_ERROR_CODE = "err";
    static final String HEARTBEAT_CLIENT_PATH =
        "/data/data/com.termux/files/home/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py";
    static final String RECOVERY_PATH =
        "/data/data/com.termux/files/home/.local/bin/mcl-m-termux-lifeline-recover";
    static final String TERMUX_HOME = "/data/data/com.termux/files/home";
    static final long WATCHDOG_INTERVAL_MS = 5_000L;
    static final long PROBE_INTERVAL_MS = 10_000L;
    static final long RUN_COMMAND_TIMEOUT_MS = 30_000L;

    private static final String CHANNEL_ID = "mcl_m_termux_lifeline";
    private static final int NOTIFICATION_ID = 2756;
    private static final String ACTION_RUN_COMMAND_RESULT =
        "io.hanmiyoo.mcl.termuxlifeline.action.RUN_COMMAND_RESULT_V1";
    private static final String CALLBACK_SCHEME = "mcl-lifeline-result";
    private static final String CALLBACK_AUTHORITY = "callback";
    private static final String KIND_PROBE = "probe";
    private static final String KIND_RECOVERY = "recovery";

    private final AtomicLong lastHeartbeatMs = new AtomicLong(0L);
    private final AtomicLong lastRecoveryReceiptMs = new AtomicLong(0L);
    private volatile boolean running;
    private volatile boolean recoveryPending;
    private volatile boolean attemptedForCurrentLoss;
    private volatile boolean failedForCurrentLoss;
    private volatile long lastAttemptMs;
    private volatile long lastProbeDispatchMs;
    private volatile String status = "WAITING_FOR_FIRST_HEARTBEAT";

    private long nextGeneration;
    private int nextRequestCode = 1000;
    private String pendingKind;
    private String pendingCallbackData;
    private long pendingSinceMs;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_RUN_COMMAND_RESULT.equals(intent.getAction())) {
            if (!running) {
                stopSelf(startId);
                return START_NOT_STICKY;
            }
            handleRunCommandResult(intent);
            return START_NOT_STICKY;
        }

        if (!running) {
            startForeground(
                NOTIFICATION_ID,
                buildNotification(status),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            );
            running = true;
            Thread watchdogThread = new Thread(this::watchdogLoop, "mcl-termux-lifeline-watchdog");
            watchdogThread.setDaemon(true);
            watchdogThread.start();
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        clearPendingOperation();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void watchdogLoop() {
        while (running) {
            try {
                tick();
                Thread.sleep(WATCHDOG_INTERVAL_MS);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                return;
            } catch (RuntimeException error) {
                setStatus("UNKNOWN_PACKAGE_STATE");
            }
        }
    }

    private void tick() {
        long now = SystemClock.elapsedRealtime();

        if (pendingTimedOut(now)) {
            handlePendingTimeout(now);
            return;
        }
        if (hasPendingOperation()) {
            if (recoveryPending) setStatus("RECOVERY_VERIFYING");
            return;
        }

        if (recoveryPending) {
            RecoveryOutcome.State outcome = RecoveryOutcome.classify(
                now,
                lastAttemptMs,
                lastHeartbeatMs.get(),
                lastRecoveryReceiptMs.get()
            );
            if (outcome == RecoveryOutcome.State.RECOVERED) {
                recoveryPending = false;
                attemptedForCurrentLoss = false;
                failedForCurrentLoss = false;
                setStatus("RECOVERED");
                return;
            }
            if (outcome == RecoveryOutcome.State.FAILED) {
                recoveryPending = false;
                failedForCurrentLoss = true;
                setStatus("RECOVERY_FAILED");
                return;
            }
            if (probeDue(now) && !dispatchFixedProbe(now)) {
                recoveryPending = false;
                failedForCurrentLoss = true;
                setStatus("RECOVERY_FAILED");
                return;
            }
            setStatus("RECOVERY_VERIFYING");
            return;
        }

        LifelinePolicy.PackageState packageState = readPackageState();
        if (packageState == LifelinePolicy.PackageState.STOPPED) {
            setStatus("BLOCKED_FORCE_STOP_DOMAIN");
            return;
        }
        if (packageState == LifelinePolicy.PackageState.UNKNOWN) {
            setStatus("UNKNOWN_PACKAGE_STATE");
            return;
        }
        if (!hasRunCommandPermission()) {
            setStatus("NEEDS_MANUAL_RUN_COMMAND_PERMISSION");
            return;
        }
        if (!MainActivity.isPolicyAcknowledged(this)) {
            setStatus("NEEDS_MANUAL_TERMUX_POLICY");
            return;
        }

        long heartbeat = lastHeartbeatMs.get();
        boolean hasSeenHeartbeat = heartbeat > 0L;
        if (probeDue(now)) {
            if (dispatchFixedProbe(now)) {
                if (!hasSeenHeartbeat) setStatus("WAITING_FOR_FIRST_HEARTBEAT");
                return;
            }
        }

        LifelinePolicy.Decision decision = LifelinePolicy.decide(
            now,
            heartbeat,
            hasSeenHeartbeat,
            packageState,
            true,
            true,
            attemptedForCurrentLoss,
            lastAttemptMs
        );

        if (decision == LifelinePolicy.Decision.HEALTHY) {
            attemptedForCurrentLoss = false;
            failedForCurrentLoss = false;
            setStatus("HEALTHY");
            return;
        }
        if (decision == LifelinePolicy.Decision.RECOVERY_ALREADY_ATTEMPTED
                && failedForCurrentLoss) {
            setStatus("RECOVERY_FAILED");
            return;
        }
        if (decision != LifelinePolicy.Decision.RECOVERY_ELIGIBLE) {
            setStatus(decision.name());
            return;
        }

        attemptedForCurrentLoss = true;
        lastAttemptMs = now;
        if (dispatchFixedRecovery(now)) {
            recoveryPending = true;
            setStatus("RECOVERY_DISPATCHED");
        } else {
            failedForCurrentLoss = true;
            setStatus("RECOVERY_FAILED");
        }
    }

    private boolean probeDue(long now) {
        return lastProbeDispatchMs == 0L || now - lastProbeDispatchMs >= PROBE_INTERVAL_MS;
    }

    private boolean dispatchFixedProbe(long now) {
        boolean started = dispatchFixedRunCommand(
            HEARTBEAT_CLIENT_PATH,
            new String[] {"--status"},
            KIND_PROBE,
            now
        );
        if (started) lastProbeDispatchMs = now;
        return started;
    }

    private boolean dispatchFixedRecovery(long now) {
        return dispatchFixedRunCommand(RECOVERY_PATH, new String[0], KIND_RECOVERY, now);
    }

    private synchronized boolean dispatchFixedRunCommand(
            String path,
            String[] arguments,
            String kind,
            long now) {
        if (pendingKind != null) return false;

        long generation = ++nextGeneration;
        int requestCode = nextRequestCode++;
        if (nextRequestCode == Integer.MAX_VALUE) nextRequestCode = 1000;

        String callbackData = CALLBACK_SCHEME + "://" + CALLBACK_AUTHORITY
            + "/" + kind + "/" + generation;
        Intent callbackIntent = new Intent(this, LifelineService.class);
        callbackIntent.setAction(ACTION_RUN_COMMAND_RESULT);
        callbackIntent.setData(Uri.parse(callbackData));
        PendingIntent callback = PendingIntent.getService(
            this,
            requestCode,
            callbackIntent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_MUTABLE
        );

        Intent commandIntent = new Intent();
        commandIntent.setClassName(TERMUX_PACKAGE, RUN_COMMAND_SERVICE);
        commandIntent.setAction(RUN_COMMAND_ACTION);
        commandIntent.putExtra(RUN_COMMAND_PATH, path);
        commandIntent.putExtra(RUN_COMMAND_ARGUMENTS, arguments);
        commandIntent.putExtra(RUN_COMMAND_WORKDIR, TERMUX_HOME);
        commandIntent.putExtra(RUN_COMMAND_BACKGROUND, true);
        commandIntent.putExtra(RUN_COMMAND_PENDING_INTENT, callback);

        pendingKind = kind;
        pendingCallbackData = callbackData;
        pendingSinceMs = now;
        try {
            if (startService(commandIntent) == null) {
                clearPendingOperationLocked();
                return false;
            }
            return true;
        } catch (SecurityException error) {
            clearPendingOperationLocked();
            setStatus("NEEDS_MANUAL_RUN_COMMAND_PERMISSION");
            return false;
        } catch (RuntimeException error) {
            clearPendingOperationLocked();
            return false;
        }
    }

    private synchronized void handleRunCommandResult(Intent intent) {
        if (pendingKind == null || pendingCallbackData == null) return;
        if (intent.getData() == null || !pendingCallbackData.equals(intent.getDataString())) return;

        String kind = pendingKind;
        boolean success = runCommandSucceeded(intent);
        clearPendingOperationLocked();
        long now = SystemClock.elapsedRealtime();

        if (KIND_PROBE.equals(kind)) {
            if (success) {
                lastHeartbeatMs.set(now);
                if (!recoveryPending) setStatus("HEALTHY");
            } else if (!recoveryPending && lastHeartbeatMs.get() == 0L) {
                setStatus("WAITING_FOR_FIRST_HEARTBEAT");
            }
            return;
        }

        if (!KIND_RECOVERY.equals(kind) || !recoveryPending) return;
        if (!success) {
            recoveryPending = false;
            failedForCurrentLoss = true;
            setStatus("RECOVERY_FAILED");
            return;
        }

        lastRecoveryReceiptMs.set(now);
        if (!dispatchFixedProbe(now)) {
            recoveryPending = false;
            failedForCurrentLoss = true;
            setStatus("RECOVERY_FAILED");
            return;
        }
        setStatus("RECOVERY_VERIFYING");
    }

    private boolean runCommandSucceeded(Intent intent) {
        Bundle result = intent.getBundleExtra(RESULT_BUNDLE);
        if (result == null
                || !result.containsKey(RESULT_EXIT_CODE)
                || !result.containsKey(RESULT_ERROR_CODE)) {
            return false;
        }
        return result.getInt(RESULT_ERROR_CODE, Integer.MIN_VALUE) == Activity.RESULT_OK
            && result.getInt(RESULT_EXIT_CODE, Integer.MIN_VALUE) == 0;
    }

    private synchronized boolean hasPendingOperation() {
        return pendingKind != null;
    }

    private synchronized boolean pendingTimedOut(long now) {
        return pendingKind != null && now - pendingSinceMs >= RUN_COMMAND_TIMEOUT_MS;
    }

    private synchronized void handlePendingTimeout(long now) {
        if (pendingKind == null || now - pendingSinceMs < RUN_COMMAND_TIMEOUT_MS) return;
        String kind = pendingKind;
        clearPendingOperationLocked();
        if (KIND_RECOVERY.equals(kind)) {
            recoveryPending = false;
            failedForCurrentLoss = true;
            setStatus("RECOVERY_FAILED");
        } else if (!recoveryPending && lastHeartbeatMs.get() == 0L) {
            setStatus("WAITING_FOR_FIRST_HEARTBEAT");
        }
    }

    private synchronized void clearPendingOperation() {
        clearPendingOperationLocked();
    }

    private void clearPendingOperationLocked() {
        pendingKind = null;
        pendingCallbackData = null;
        pendingSinceMs = 0L;
    }

    private LifelinePolicy.PackageState readPackageState() {
        try {
            ApplicationInfo info = getPackageManager().getApplicationInfo(TERMUX_PACKAGE, 0);
            if ((info.flags & ApplicationInfo.FLAG_STOPPED) != 0) {
                return LifelinePolicy.PackageState.STOPPED;
            }
            return LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED;
        } catch (PackageManager.NameNotFoundException error) {
            return LifelinePolicy.PackageState.UNKNOWN;
        }
    }

    private boolean hasRunCommandPermission() {
        return checkSelfPermission(RUN_COMMAND_PERMISSION) == PackageManager.PERMISSION_GRANTED;
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "MCL M Termux Lifeline",
            NotificationManager.IMPORTANCE_LOW
        );
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private Notification buildNotification(String text) {
        return new Notification.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
            .setContentTitle("MCL M Termux Lifeline armed")
            .setContentText(text)
            .setOngoing(true)
            .build();
    }

    private void setStatus(String next) {
        status = next;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null && running) {
            manager.notify(NOTIFICATION_ID, buildNotification(next));
        }
    }
}
