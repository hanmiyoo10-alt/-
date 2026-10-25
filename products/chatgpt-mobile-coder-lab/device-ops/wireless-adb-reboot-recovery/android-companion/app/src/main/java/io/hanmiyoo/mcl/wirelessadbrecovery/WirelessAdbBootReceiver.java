package io.hanmiyoo.mcl.wirelessadbrecovery;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public final class WirelessAdbBootReceiver extends BroadcastReceiver {
    private static final String LOG_TAG = "MclWirelessAdbRecovery";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            return;
        }

        boolean lockedBoot = Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action);
        String actionName = lockedBoot ? "LOCKED_BOOT_COMPLETED" : "BOOT_COMPLETED";
        Log.i(LOG_TAG, "event=boot_received action=" + actionName);
        WirelessAdbDiagnosticReceipt.recordBoot(context, lockedBoot);

        WirelessAdbRecoveryJobService.scheduleFixedAttempts(context);
    }
}
