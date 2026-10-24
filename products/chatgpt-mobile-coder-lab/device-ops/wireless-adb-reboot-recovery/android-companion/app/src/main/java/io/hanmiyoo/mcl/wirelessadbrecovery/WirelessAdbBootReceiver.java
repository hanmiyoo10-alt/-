package io.hanmiyoo.mcl.wirelessadbrecovery;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class WirelessAdbBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            return;
        }

        WirelessAdbRecoveryJobService.scheduleFixedAttempts(context);
    }
}
