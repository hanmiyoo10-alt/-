package io.hanmiyoo.screenoncompanion;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.MotionEvent;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class PairingActivity extends Activity {
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            getWindow().setHideOverlayWindows(true);
        }

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Termux Screen On Companion");
        title.setTextSize(22);
        root.addView(title);

        status = new TextView(this);
        status.setTextSize(18);
        status.setText("Preparing one-time pairing code...");
        root.addView(status);

        Button overlay = new Button(this);
        overlay.setText("Open Display over other apps");
        overlay.setOnClickListener(v -> openOverlaySettings());
        root.addView(overlay);

        SecureActionButton revoke = new SecureActionButton("Revoke Termux control");
        revoke.setOnClickListener(v -> {
            PairingStore.revoke(this);
            status.setText("Termux control and any pending pairing code were revoked. Close and reopen the app to create a new code.");
        });
        root.addView(revoke);

        setContentView(root);
        showPairingCode();
    }

    private void showPairingCode() {
        try {
            String code = PairingStore.getOrArmPairing(this);
            status.setText("Pairing code: " + code
                    + "\nValid for 2 minutes and one pairing attempt."
                    + "\nOpening this app is the user approval step for generating the code.");
        } catch (RuntimeException error) {
            status.setText("Pairing code generation failed ("
                    + error.getClass().getSimpleName()
                    + "). Close and reopen the app, then retry.");
        }
    }

    private void openOverlaySettings() {
        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }

    private final class SecureActionButton extends Button {
        SecureActionButton(String label) {
            super(PairingActivity.this);
            setText(label);
            setFilterTouchesWhenObscured(true);
        }

        @Override
        public boolean onFilterTouchEventForSecurity(MotionEvent event) {
            boolean allowed = super.onFilterTouchEventForSecurity(event);
            if (!allowed) {
                status.setText("Tap blocked because another window is covering this screen. Close bubbles or overlays and try again.");
            }
            return allowed;
        }
    }
}
