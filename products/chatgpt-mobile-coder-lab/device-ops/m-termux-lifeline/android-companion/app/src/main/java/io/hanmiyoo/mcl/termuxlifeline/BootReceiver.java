package io.hanmiyoo.mcl.termuxlifeline;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        boolean bootCompleted = intent != null
            && Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction());
        if (!bootCompleted) return;

        LifelinePolicy.PackageState packageState = readTermuxPackageState(context);
        boolean runCommandPermissionGranted = permissionGranted(
            context, LifelineService.RUN_COMMAND_PERMISSION
        );
        boolean notificationPermissionGranted = permissionGranted(
            context, Manifest.permission.POST_NOTIFICATIONS
        );
        if (!BootRearmPolicy.shouldStart(
                true,
                MainActivity.isBootAutoRearmEnabled(context),
                packageState,
                runCommandPermissionGranted,
                notificationPermissionGranted,
                MainActivity.isPolicyAcknowledged(context))) {
            return;
        }

        try {
            context.startForegroundService(new Intent(context, LifelineService.class));
        } catch (RuntimeException ignored) {
            // Fail closed. LifelineService remains the sole HEALTHY authority.
        }
    }

    private static boolean permissionGranted(Context context, String permission) {
        try {
            return context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED;
        } catch (RuntimeException error) {
            return false;
        }
    }

    private static LifelinePolicy.PackageState readTermuxPackageState(Context context) {
        try {
            ApplicationInfo info = context.getPackageManager().getApplicationInfo(
                LifelineService.TERMUX_PACKAGE,
                PackageManager.ApplicationInfoFlags.of(0)
            );
            return (info.flags & ApplicationInfo.FLAG_STOPPED) != 0
                ? LifelinePolicy.PackageState.STOPPED
                : LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED;
        } catch (PackageManager.NameNotFoundException | RuntimeException error) {
            return LifelinePolicy.PackageState.UNKNOWN;
        }
    }
}
