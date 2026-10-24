package io.hanmiyoo.mcl.wirelessadbrecovery;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;

public final class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        TextView message = new TextView(this);
        message.setPadding(48, 48, 48, 48);
        message.setText(
                "MCL Wireless ADB Recovery\n\n"
                + "This launcher does not change Android settings. "
                + "Its only activation purpose is to leave the package's initial stopped state.\n\n"
                + "Automatic recovery attempts are scheduled only from system boot broadcasts.");
        setContentView(message);
    }
}
