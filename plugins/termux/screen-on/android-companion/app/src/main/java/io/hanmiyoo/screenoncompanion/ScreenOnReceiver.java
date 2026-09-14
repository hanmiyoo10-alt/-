package io.hanmiyoo.screenoncompanion;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class ScreenOnReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (!CommandProtocol.isKnownAction(action)) {
            reply(CommandProtocol.RESULT_ERROR, "error=UNKNOWN_ACTION");
            return;
        }

        String token = intent.getStringExtra(CommandProtocol.EXTRA_TOKEN);
        if (!PairingStore.isAuthorized(context, token)) {
            reply(CommandProtocol.RESULT_AUTH_REQUIRED, "pairing=REQUIRED");
            return;
        }

        try {
            if (CommandProtocol.ACTION_ON.equals(action)) {
                if (!OverlayController.hasPermission(context)) {
                    reply(CommandProtocol.RESULT_PERMISSION_REQUIRED, "overlay_permission=DENIED");
                    return;
                }
                OverlayController.enable(context);
                reply(CommandProtocol.RESULT_ON, "overlay=ON");
                return;
            }

            if (CommandProtocol.ACTION_OFF.equals(action)) {
                OverlayController.disable();
                reply(CommandProtocol.RESULT_OFF, "overlay=OFF");
                return;
            }

            if (!OverlayController.hasPermission(context)) {
                reply(CommandProtocol.RESULT_PERMISSION_REQUIRED, "overlay_permission=DENIED");
                return;
            }
            reply(
                    OverlayController.isActive()
                            ? CommandProtocol.RESULT_STATUS_ON
                            : CommandProtocol.RESULT_STATUS_OFF,
                    OverlayController.isActive() ? "overlay=ON" : "overlay=OFF");
        } catch (RuntimeException exc) {
            reply(CommandProtocol.RESULT_ERROR, "error=" + exc.getClass().getSimpleName());
        }
    }

    private void reply(int code, String data) {
        setResultCode(code);
        setResultData(data);
    }
}
