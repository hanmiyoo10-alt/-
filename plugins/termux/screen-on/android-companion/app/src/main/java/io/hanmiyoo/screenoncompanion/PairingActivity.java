package io.hanmiyoo.screenoncompanion;

import android.app.ActionBar;
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
    private static final long STABLE_UI_DELAY_MS = 1500L;

    private LinearLayout root;
    private TextView status;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        ActionBar actionBar = getActionBar();
        if (actionBar != null) {
            actionBar.hide();
        }

        String previousPhase = StartupDiagnostics.readPhase(this);
        boolean safeMode = StartupDiagnostics.requiresSafeMode(previousPhase);
        if (!safeMode) {
            StartupDiagnostics.mark(this, StartupDiagnostics.PHASE_UI_BUILD);
        }

        buildBaseUi();
        if (safeMode) {
            status.setText("Startup diagnostic safe mode.\nPrevious launch stopped during: "
                    + previousPhase
                    + "\nNo pairing action was run. Report this phase, then close the app.");
            return;
        }

        addControls();
        runStartupSequence();
    }

    private void buildBaseUi() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = Math.round(24 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(
                    pad + insets.getSystemWindowInsetLeft(),
                    pad + insets.getSystemWindowInsetTop(),
                    pad + insets.getSystemWindowInsetRight(),
                    pad + insets.getSystemWindowInsetBottom());
            return insets;
        });

        TextView title = new TextView(this);
        title.setText("Termux Screen On Companion");
        title.setTextSize(22);
        root.addView(title);

        status = new TextView(this);
        status.setTextSize(18);
        status.setText("Startup phase: UI ready");
        root.addView(status);
        setContentView(root);
        root.requestApplyInsets();
    }

    private void addControls() {
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
    }

    private void runStartupSequence() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            StartupDiagnostics.mark(this, StartupDiagnostics.PHASE_OVERLAY_PROTECTION);
            status.setText("Startup phase: applying overlay protection...");
            try {
                getWindow().setHideOverlayWindows(true);
            } catch (RuntimeException error) {
                showStartupFailure(StartupDiagnostics.PHASE_OVERLAY_PROTECTION, error);
                return;
            }
        }

        StartupDiagnostics.mark(this, StartupDiagnostics.PHASE_PAIRING_CODE);
        status.setText("Startup phase: preparing pairing code...");
        try {
            String code = PairingStore.getOrArmPairing(this);
            status.setText("Pairing code: " + code
                    + "\nValid for 2 minutes and one pairing attempt."
                    + "\nOpening this app is the user approval step for generating the code.");
            StartupDiagnostics.mark(this, StartupDiagnostics.PHASE_PAIRING_CODE_VISIBLE);
            status.postDelayed(() -> {
                if (!isFinishing() && !isDestroyed() && status.isShown() && status.hasWindowFocus()) {
                    StartupDiagnostics.mark(this, StartupDiagnostics.PHASE_READY);
                }
            }, STABLE_UI_DELAY_MS);
        } catch (RuntimeException error) {
            showStartupFailure(StartupDiagnostics.PHASE_PAIRING_CODE, error);
        }
    }

    private void showStartupFailure(String phase, RuntimeException error) {
        StartupDiagnostics.markFailure(this, phase, error);
        status.setText("Startup failed during " + phase
                + " (" + error.getClass().getSimpleName() + ")."
                + "\nNo pairing action was completed. Report this phase.");
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
