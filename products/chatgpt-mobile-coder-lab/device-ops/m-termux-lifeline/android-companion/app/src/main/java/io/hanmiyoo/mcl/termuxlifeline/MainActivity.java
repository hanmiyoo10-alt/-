package io.hanmiyoo.mcl.termuxlifeline;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String PREFS = "mcl_m_termux_lifeline";
    private static final String POLICY_ACK = "allow_external_apps_user_ack_v1";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("MCL M Termux Lifeline");
        title.setTextSize(22f);
        root.addView(title);

        TextView disclosure = new TextView(this);
        disclosure.setText(
            "이 앱은 사용자가 직접 arm한 동안에만 M Termux의 고정 heartbeat를 감시합니다. " +
            "일반 프로세스 소실만 대상으로 하며 force-stop 상태는 복구하지 않습니다. " +
            "인터넷, 접근성, 오버레이, root, 임의 명령은 사용하지 않습니다. " +
            "Termux RUN_COMMAND 권한과 allow-external-apps=true는 사용자가 별도로 직접 설정해야 합니다."
        );
        disclosure.setPadding(0, pad, 0, pad);
        root.addView(disclosure);

        Button permission = new Button(this);
        permission.setText("앱 권한 설정 열기");
        permission.setOnClickListener(v -> openAppSettings());
        root.addView(permission);

        Button policyAck = new Button(this);
        policyAck.setText("Termux 정책을 직접 설정했음을 확인");
        policyAck.setOnClickListener(v -> setPolicyAcknowledged(this, true));
        root.addView(policyAck);

        Button policyRevoke = new Button(this);
        policyRevoke.setText("Termux 정책 확인 취소");
        policyRevoke.setOnClickListener(v -> setPolicyAcknowledged(this, false));
        root.addView(policyRevoke);

        Button arm = new Button(this);
        arm.setText("Lifeline arm");
        arm.setOnClickListener(v ->
            startForegroundService(new Intent(this, LifelineService.class))
        );
        root.addView(arm);

        Button disarm = new Button(this);
        disarm.setText("Lifeline disarm");
        disarm.setOnClickListener(v -> stopService(new Intent(this, LifelineService.class)));
        root.addView(disarm);

        TextView note = new TextView(this);
        note.setText(
            "정책 확인은 실제 Termux 설정을 변경하거나 읽지 않습니다. " +
            "실제 복구 성공은 heartbeat와 고정 recovery receipt가 둘 다 돌아온 경우에만 인정됩니다."
        );
        note.setPadding(0, pad, 0, 0);
        root.addView(note);
        setContentView(root);
    }

    private void openAppSettings() {
        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getPackageName())
        );
        startActivity(intent);
    }

    static boolean isPolicyAcknowledged(Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE)
            .getBoolean(POLICY_ACK, false);
    }

    static void setPolicyAcknowledged(Context context, boolean value) {
        context.getSharedPreferences(PREFS, MODE_PRIVATE)
            .edit()
            .putBoolean(POLICY_ACK, value)
            .apply();
    }
}
