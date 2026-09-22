package io.hanmiyoo.mcl.termuxlifeline;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.net.Credentials;
import android.net.LocalServerSocket;
import android.net.LocalSocket;
import android.os.IBinder;
import android.os.SystemClock;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
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
    private LocalServerSocket serverSocket;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(
            NOTIFICATION_ID,
            buildNotification(status),
            ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        );
        running = true;
        Thread socketThread = new Thread(this::serveLoop, "mcl-termux-lifeline-socket");
        socketThread.setDaemon(true);
        socketThread.start();
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
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void serveLoop() {
        try (LocalServerSocket server = new LocalServerSocket(HeartbeatProtocol.SOCKET_NAME)) {
            serverSocket = server;
            while (running) {
                try (LocalSocket client = server.accept()) {
                    client.setSoTimeout(2_000);
                    if (!peerIsTermux(client)) continue;
                    String frame = readBoundedFrame(client.getInputStream());
                    HeartbeatProtocol.Kind kind = HeartbeatProtocol.classify(frame);
                    if (kind == HeartbeatProtocol.Kind.INVALID) continue;
                    long now = SystemClock.elapsedRealtime();
                    if (kind == HeartbeatProtocol.Kind.HEARTBEAT) {
                        lastHeartbeatMs.set(now);
                    } else {
                        lastRecoveryReceiptMs.set(now);
                        lastHeartbeatMs.set(now);
                    }
                    OutputStream output = client.getOutputStream();
                    output.write(HeartbeatProtocol.ACK.getBytes(StandardCharsets.UTF_8));
                    output.flush();
                } catch (Exception ignored) {
                }
            }
        } catch (IOException ignored) {
            setStatus("SOCKET_UNAVAILABLE");
        } finally {
            serverSocket = null;
        }
    }

    private boolean peerIsTermux(LocalSocket client) {
        try {
            Credentials credentials = client.getPeerCredentials();
            ApplicationInfo app = getPackageManager().getApplicationInfo(TERMUX_PACKAGE, 0);
            return credentials != null && credentials.getUid() == app.uid;
        } catch (Exception error) {
            return false;
        }
    }

    private String readBoundedFrame(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        boolean terminated = false;
        while (output.size() < HeartbeatProtocol.MAX_FRAME_BYTES) {
            int next = input.read();
            if (next < 0) break;
            output.write(next);
            if (next == '\n') {
                terminated = true;
                break;
            }
        }
        if (!terminated) throw new IOException("FRAME_INVALID");
        return output.toString(StandardCharsets.UTF_8);
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
