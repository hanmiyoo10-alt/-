package io.hanmiyoo.mcl.wirelessadbrecovery;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.provider.Settings;

public final class WirelessAdbRecoveryJobService extends JobService {
    private static final String ADB_WIFI_ENABLED_SETTING = "adb_wifi_enabled";
    private static final int ENABLED = 1;

    private static final int[] JOB_IDS = {372201, 372202, 372203};
    private static final long[] MIN_LATENCIES_MS = {10_000L, 60_000L, 180_000L};

    static void scheduleFixedAttempts(Context context) {
        JobScheduler scheduler = context.getSystemService(JobScheduler.class);
        if (scheduler == null) {
            return;
        }

        ComponentName service = new ComponentName(context, WirelessAdbRecoveryJobService.class);
        for (int index = 0; index < JOB_IDS.length; index++) {
            JobInfo job = new JobInfo.Builder(JOB_IDS[index], service)
                    .setMinimumLatency(MIN_LATENCIES_MS[index])
                    .setPersisted(false)
                    .build();
            scheduler.schedule(job);
        }
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        if (!hasActiveWifi(this)) {
            return false;
        }

        try {
            int current = Settings.Global.getInt(
                    getContentResolver(), ADB_WIFI_ENABLED_SETTING, 0);
            if (current != ENABLED) {
                Settings.Global.putInt(
                        getContentResolver(), ADB_WIFI_ENABLED_SETTING, ENABLED);
            }
        } catch (SecurityException | IllegalArgumentException exception) {
            // Fail closed. A later fixed job may retry if one remains scheduled.
        }
        return false;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }

    private static boolean hasActiveWifi(Context context) {
        ConnectivityManager manager = context.getSystemService(ConnectivityManager.class);
        if (manager == null) {
            return false;
        }

        Network active = manager.getActiveNetwork();
        if (active == null) {
            return false;
        }

        NetworkCapabilities capabilities = manager.getNetworkCapabilities(active);
        return capabilities != null
                && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
    }
}
