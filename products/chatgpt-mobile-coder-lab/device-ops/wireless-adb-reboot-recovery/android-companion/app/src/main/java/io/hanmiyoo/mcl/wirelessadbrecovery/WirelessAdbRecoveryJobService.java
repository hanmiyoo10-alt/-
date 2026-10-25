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
import android.util.Log;

public final class WirelessAdbRecoveryJobService extends JobService {
    private static final String LOG_TAG = "MclWirelessAdbRecovery";
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
        String attempt = attemptLabel(params.getJobId());
        NetworkState networkState = inspectNetworkState(this);
        Log.i(
                LOG_TAG,
                "event=job_network attempt=" + attempt
                        + " active_network_present=" + networkState.activeNetworkPresent
                        + " wifi_transport=" + networkState.wifiTransport);

        if (!networkState.wifiTransport) {
            Log.i(LOG_TAG, "event=job_result attempt=" + attempt + " outcome=no_active_wifi");
            return false;
        }

        try {
            int current = Settings.Global.getInt(
                    getContentResolver(), ADB_WIFI_ENABLED_SETTING, 0);
            boolean preEnabled = current == ENABLED;
            Log.i(LOG_TAG, "event=setting_pre attempt=" + attempt + " enabled=" + preEnabled);

            if (current != ENABLED) {
                Log.i(LOG_TAG, "event=setting_write_start attempt=" + attempt + " attempted=true");
                boolean accepted = Settings.Global.putInt(
                        getContentResolver(), ADB_WIFI_ENABLED_SETTING, ENABLED);
                Log.i(
                        LOG_TAG,
                        "event=setting_write_result attempt=" + attempt
                                + " result=" + (accepted ? "accepted" : "rejected"));
            } else {
                Log.i(LOG_TAG, "event=setting_write_start attempt=" + attempt + " attempted=false");
                Log.i(LOG_TAG, "event=setting_write_result attempt=" + attempt + " result=not_needed");
            }

            int post = Settings.Global.getInt(
                    getContentResolver(), ADB_WIFI_ENABLED_SETTING, 0);
            Log.i(LOG_TAG, "event=setting_post attempt=" + attempt + " enabled=" + (post == ENABLED));
        } catch (SecurityException exception) {
            Log.i(LOG_TAG, "event=job_exception attempt=" + attempt + " type=SECURITY_EXCEPTION");
        } catch (IllegalArgumentException exception) {
            Log.i(LOG_TAG, "event=job_exception attempt=" + attempt + " type=ILLEGAL_ARGUMENT_EXCEPTION");
        }
        return false;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }

    private static NetworkState inspectNetworkState(Context context) {
        ConnectivityManager manager = context.getSystemService(ConnectivityManager.class);
        if (manager == null) {
            return new NetworkState(false, false);
        }

        Network active = manager.getActiveNetwork();
        if (active == null) {
            return new NetworkState(false, false);
        }

        NetworkCapabilities capabilities = manager.getNetworkCapabilities(active);
        boolean wifiTransport = capabilities != null
                && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
        return new NetworkState(true, wifiTransport);
    }

    private static String attemptLabel(int jobId) {
        if (jobId == JOB_IDS[0]) {
            return "1";
        }
        if (jobId == JOB_IDS[1]) {
            return "2";
        }
        if (jobId == JOB_IDS[2]) {
            return "3";
        }
        return "unmapped";
    }

    private static final class NetworkState {
        final boolean activeNetworkPresent;
        final boolean wifiTransport;

        NetworkState(boolean activeNetworkPresent, boolean wifiTransport) {
            this.activeNetworkPresent = activeNetworkPresent;
            this.wifiTransport = wifiTransport;
        }
    }
}
