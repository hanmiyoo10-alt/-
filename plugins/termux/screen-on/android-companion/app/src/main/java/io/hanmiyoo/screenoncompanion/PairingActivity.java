package io.hanmiyoo.screenoncompanion;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class PairingActivity extends Activity {
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Termux Screen On Companion");
        title.setTextSize(22);
        root.addView(title);

        status = new TextView(this);
        status.setText("Tap Generate one-time pairing code, then use that code from Termux within 2 minutes.");
        root.addView(status);

        Button generate = new Button(this);
        generate.setText("Generate one-time pairing code");
        generate.setFilterTouchesWhenObscured(true);
        generate.setOnClickListener(v -> {
            String code = PairingStore.armPairing(this);
            status.setText("Pairing code: " + code + "\nValid for 2 minutes and one pairing attempt.");
        });
        root.addView(generate);

        Button overlay = new Button(this);
        overlay.setText("Open Display over other apps");
        overlay.setOnClickListener(v -> openOverlaySettings());
        root.addView(overlay);

        Button revoke = new Button(this);
        revoke.setText("Revoke Termux control");
        revoke.setFilterTouchesWhenObscured(true);
        revoke.setOnClickListener(v -> {
            PairingStore.revoke(this);
            status.setText("Termux control and any pending pairing code were revoked.");
        });
        root.addView(revoke);

        setContentView(root);
    }

    private void openOverlaySettings() {
        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }
}
