package io.hanmiyoo.screenoncompanion;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class PairingActivity extends Activity {
    private String requestedToken;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestedToken = getIntent() == null
                ? null
                : getIntent().getStringExtra(CommandProtocol.EXTRA_TOKEN);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("Termux Screen On Companion");
        title.setTextSize(22);
        root.addView(title);

        status = new TextView(this);
        status.setText(PairingStore.isValidToken(requestedToken)
                ? "Termux requested control. Tap Allow only if you started setup from Termux."
                : "Invalid pairing request. Re-run companion setup from Termux.");
        root.addView(status);

        Button allow = new Button(this);
        allow.setText("Allow Termux control");
        allow.setEnabled(PairingStore.isValidToken(requestedToken));
        allow.setFilterTouchesWhenObscured(true);
        allow.setOnClickListener(v -> {
            PairingStore.approve(this, requestedToken);
            status.setText("Termux control paired. Next, grant Display over other apps.");
        });
        root.addView(allow);

        Button overlay = new Button(this);
        overlay.setText("Open Display over other apps");
        overlay.setOnClickListener(v -> openOverlaySettings());
        root.addView(overlay);

        Button revoke = new Button(this);
        revoke.setText("Revoke Termux control");
        revoke.setOnClickListener(v -> {
            PairingStore.revoke(this);
            status.setText("Termux control revoked. Re-run setup to pair again.");
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
