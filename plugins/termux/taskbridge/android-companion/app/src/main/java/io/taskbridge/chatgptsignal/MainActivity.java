package io.taskbridge.chatgptsignal;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String PREFS = "taskbridge_signal";
    private static final String CONSENT = "accessibility_consent_v1";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("TaskBridge ChatGPT Signal");
        title.setTextSize(22f);
        root.addView(title);

        TextView disclosure = new TextView(this);
        disclosure.setText(
            "이 기능은 ChatGPT 앱 화면의 접근성 이벤트를 사용합니다. " +
            "ChatGPT 패키지에서 클릭 가능한 생성 중지/Stop 컨트롤이 보였다가 사라지는지만 확인합니다. " +
            "응답 본문, 대화 내용, 계정 정보는 저장하거나 네트워크로 전송하지 않습니다. " +
            "완료를 감지하면 이 앱의 로컬 알림 하나만 게시하며 TaskBridge가 그 알림의 패키지/ID/시간 메타데이터를 해시로 확인합니다. " +
            "접근성 권한은 Android 설정에서 언제든 끌 수 있습니다."
        );
        disclosure.setTextSize(16f);
        disclosure.setPadding(0, pad, 0, pad);
        root.addView(disclosure);

        Button consent = new Button(this);
        consent.setText("동의하고 접근성 설정 열기");
        consent.setOnClickListener(v -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(CONSENT, true).apply();
            requestNotificationPermissionIfNeeded();
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        });
        root.addView(consent);

        Button test = new Button(this);
        test.setText("TaskBridge 테스트 완료 신호 보내기");
        test.setOnClickListener(v -> {
            requestNotificationPermissionIfNeeded();
            SignalNotifier.post(this, "manual_test");
        });
        root.addView(test);

        TextView note = new TextView(this);
        note.setText("Google Play에 배포할 경우 AccessibilityService 사용 공개·동의 및 Play Console 선언 요건을 별도로 충족해야 합니다.");
        note.setPadding(0, pad, 0, 0);
        root.addView(note);

        setContentView(root);
    }

    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }
    }

    static boolean hasConsent(android.content.Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(CONSENT, false);
    }
}
