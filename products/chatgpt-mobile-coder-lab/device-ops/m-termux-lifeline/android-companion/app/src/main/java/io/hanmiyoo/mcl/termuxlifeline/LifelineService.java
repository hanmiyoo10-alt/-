package io.hanmiyoo.mcl.termuxlifeline;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.IBinder;
import android.os.SystemClock;
import java.util.concurrent.atomic.AtomicLong;

public final class LifelineService extends Service {
    static final String TERMUX_PACKAGE = "com.termux";
    static final String RUN_COMMAND_PERMISSION = "com.termux.permission.RUN_COMMAND";
    static final String RUN_COMMAND_ACTION = "com.termux.RUN_COMMAND";
    static final String RUN_COMMAND_SERVICE = "com.termux.app.RunCommandService";
    static final String RECOVERY_PATH =
        "/data/data/com.termux/files/home/.local/bin/mcl-m-termux-lifeline-recover";
    static final String TERMUX_HOME = "/data/data/com.termux/files/home";
    static final long WATCHDOG_INTERVAL_MS = 5_000L;

    private static final String CHANNEL_ID = "mcl_m_termux_lifeline";
    private static final int NOTIFICATION_ID = 2756;
    private final AtomicLong lastHeartbeatMs = new AtomicLong(0L);
    private final AtomicLong lastRecoveryReceiptMs = new AtomicLong(0L);
    private volatile boolean running;
    private volatile boolean recoveryPending;
    private volatile boolean attemptedForCurrentLoss;
    private volatile boolean failedForCurrentLoss;
    private volatile long lastAttemptMs;
    private volatile String status = "WAITING_FOR_FIRST_HEARTBEAT";
    private volatile boolean receiverRegistered;
    private final BroadcastReceiver heartbeatReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            handleHeartbeatBroadcast(this, intent);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(
            NOTIFICATION_ID,
            buildNotification(status),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        );
        if (!registerHeartbeatReceiver()) {
            stopSelf();
            return;
        }
        running = true;
        Thread watchdogThread = new Thread(this::watchdogLoop, "mcl-termux-lifeline-watchdog");
        watchdogThread.setDaemon(true);
        watchdogThread.start();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (receiverRegistered) {
            try {
                unregisterReceiver(heartbeatReceiver);
            } catch (IllegalArgumentException ignored) {
            }
            receiverRegistered = false;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private boolean registerHeartbeatReceiver() {
        IntentFilter filter = new IntentFilter();
        filter.addAction(HeartbeatProtocol.HEARTBEAT_ACTION);
        filter.addAction(HeartbeatProtocol.RECOVERY_OK_ACTION);
        try {
            registerReceiver(heartbeatReceiver, filter, Context.RECEIVER_EXPORTED);
            receiverRegistered = true;
            return true;
        } catch (RuntimeException error) {
            setStatus("RECEIVER_UNAVAILABLE");
            return false;
        }
    }

    private void handleHeartbeatBroadcast(BroadcastReceiver receiver, Intent intent) {
        if (!broadcastIsFixedAndFromTermux(receiver, intent)) return;
        HeartbeatProtocol.Kind kind = HeartbeatProtocol.classifyAction(intent.getAction());
        if (kind == HeartbeatProtocol.Kind.INVALID) return;
        long now = SystemClock.elapsedRealtime();
        if (kind == HeartbeatProtocol.Kind.HEARTBEAT) {
            lastHeartbeatMs.set(now);
            if (!recoveryPending) setStatus("HEALTHY");
            return;
        }
        lastRecoveryReceiptMs.set(now);
        lastHeartbeatMs.set(now);
    }

    private boolean broadcastIsFixedAndFromTermux(BroadcastReceiver receiver, Intent intent) {
        if (intent == null || !getPackageName().equals(intent.getPackage())) return false;
        if (intent.getExtras() != null
                || intent.getData() != null
                || intent.getClipData() != null
                || intent.getCategories() != null
                || intent.getComponent() != null
                || intent.getSelector() != null) {
            return false;
        }
        try {
            ApplicationInfo app = getPackageManager().getApplicationInfo(TERMUX_PACKAGE, 0);
            return HeartbeatProtocol.senderUidMatchesTermux(receiver.getSentFromUid(), app.uid);
        } catch (PackageManager.NameNotFoundException error) {
            return false;
        }
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
        long heartbeat = lastHeartbeatMs.get();

        if (recoveryPending) {
            RecoveryOutcome.State outcome = RecoveryOutcome.classify(
                now,
                lastAttemptMs,
                heartbeat,
                lastRecoveryReceiptMs.get()
            );
            if (outcome == RecoveryOutcome.State.PENDING) {
                setStatus("RECOVERY_VERIFYING");
                return;
            }
            recoveryPending = false;
            if (outcome == RecoveryOutcome.State.RECOVERED) {
                attemptedForCurrentLoss = false;
                failedForCurrentLoss = false;
                setStatus("RECOVERED");
            } else {
                failedForCurrentLoss = true;
                setStatus("RECOVERY_FAILED");
            }
            return;
        }

        boolean hasSeenHeartbeat = heartbeat > 0L;
        LifelinePolicy.Decision decision = LifelinePolicy.decide(
            now,
            heartbeat,
            hasSeenHeartbeat,
            readPackageState(),
            hasRunCommandPermission(),
            MainActivity.isPolicyAcknowledged(this),
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
        if (dispatchFixedRecovery()) {
            recoveryPending = true;
            setStatus("RECOVERY_DISPATCHED");
        } else {
            failedForCurrentLoss = true;
            setStatus("RECOVERY_FAILED");
        }
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

    private boolean dispatchFixedRecovery() {
        Intent intent = new Intent();
        intent.setClassName(TERMUX_PACKAGE, RUN_COMMAND_SERVICE);
        intent.setAction(RUN_COMMAND_ACTION);
        intent.putExtra("com.termux.RUN_COMMAND_PATH", RECOVERY_PATH);
        intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[0]);
        intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", TERMUX_HOME);
        intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        try {
            return startService(intent) != null;
        } catch (SecurityException error) {
            setStatus("NEEDS_MANUAL_RUN_COMMAND_PERMISSION");
            return false;
        } catch (RuntimeException error) {
            return false;
        }
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
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification(next));
    }
}
