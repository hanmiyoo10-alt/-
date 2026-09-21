package io.hanmiyoo.mcl.guibridge;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String PREFS = "mcl_gui_bridge";
    private static final String CONSENT = "accessibility_consent_v1";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        root.setPadding(pad, pad, pad, pad);

        TextView title = new TextView(this);
        title.setText("MCL GUI Bridge");
        title.setTextSize(22f);
        root.addView(title);

        TextView disclosure = new TextView(this);
        disclosure.setText(
            "이 기능은 사용자가 명시적으로 허용한 뒤 ChatGPT Android 앱(com.openai.chatgpt)의 접근성 UI만 제한적으로 자동화합니다. " +
            "고정 패키지의 semantic node를 찾고 클릭하거나 bounded text를 입력할 수 있으며, 명시적 요청에서만 현재 ChatGPT 창의 스크린샷을 캡처합니다. " +
            "인터넷 권한, 다른 앱 제어, raw 좌표 gesture, 브라우저 DOM 자동화, clipboard/history 수집, 로그인·비밀번호 입력은 사용하지 않습니다. " +
            "접근성 권한은 Android 설정에서 언제든 끌 수 있습니다."
        );
        disclosure.setTextSize(16f);
        disclosure.setPadding(0, pad, 0, pad);
        root.addView(disclosure);

        Button consent = new Button(this);
        consent.setText("동의하고 접근성 설정 열기");
        consent.setOnClickListener(v -> {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(CONSENT, true).apply();
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
        });
        root.addView(consent);

        Button revoke = new Button(this);
        revoke.setText("앱 내 동의 철회");
        revoke.setOnClickListener(v ->
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(CONSENT, false).apply()
        );
        root.addView(revoke);

        TextView note = new TextView(this);
        note.setText("앱 내 동의만으로 서비스가 활성화되지는 않습니다. 사용자가 Android 접근성 설정에서 별도로 서비스를 켜야 합니다.");
        note.setPadding(0, pad, 0, 0);
        root.addView(note);
        setContentView(root);
    }

    static boolean hasConsent(android.content.Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(CONSENT, false);
    }
}
