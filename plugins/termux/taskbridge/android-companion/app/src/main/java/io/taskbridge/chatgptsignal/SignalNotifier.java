package io.taskbridge.chatgptsignal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;

final class SignalNotifier {
    static final int SIGNAL_NOTIFICATION_ID = 742001;
    private static final String CHANNEL_ID = "taskbridge_completion_signal";

    private SignalNotifier() {}

    static void post(Context context, String reason) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;

        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "TaskBridge completion signal",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Local metadata-only signal consumed by TaskBridge");
            channel.enableVibration(false);
            channel.setSound(null, null);
            manager.createNotificationChannel(channel);
        }

        long now = System.currentTimeMillis();
        Notification.Builder builder = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(context, CHANNEL_ID)
            : new Notification.Builder(context);
        builder
            .setSmallIcon(android.R.drawable.stat_notify_more)
            .setContentTitle("TaskBridge ChatGPT UI completion")
            .setContentText("local_signal:" + reason + ":" + now)
            .setWhen(now)
            .setShowWhen(true)
            .setOnlyAlertOnce(true)
            .setAutoCancel(false)
            .setOngoing(false);
        manager.notify(SIGNAL_NOTIFICATION_ID, builder.build());
    }
}
