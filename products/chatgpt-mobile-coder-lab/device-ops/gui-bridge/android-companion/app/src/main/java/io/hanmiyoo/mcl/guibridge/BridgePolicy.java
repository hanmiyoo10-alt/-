package io.hanmiyoo.mcl.guibridge;

import java.util.Locale;

final class BridgePolicy {
    static final String TARGET_PACKAGE = "com.openai.chatgpt";
    static final String TERMUX_PACKAGE = "com.termux";
    static final int MAX_TEXT = 512;
    static final int MAX_LABEL = 80;

    private static final String[] RESTRICTED = {
        "login", "log in", "sign in", "sign up", "password", "email",
        "로그인", "회원가입", "비밀번호", "이메일"
    };

    private BridgePolicy() {}

    static boolean boundedText(String value) {
        return value != null && !value.isEmpty() && value.length() <= MAX_TEXT && value.indexOf('\0') < 0;
    }

    static boolean restrictedLabel(String value) {
        if (value == null) return false;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        for (String token : RESTRICTED) {
            if (normalized.equals(token) || normalized.contains(token)) return true;
        }
        return false;
    }

    static String visibleLabel(CharSequence text, CharSequence description, boolean editable) {
        if (editable) return "editable";
        CharSequence raw = description != null && description.length() > 0 ? description : text;
        if (raw == null) return null;
        String label = raw.toString().replaceAll("\\s+", " ").trim();
        if (label.isEmpty() || restrictedLabel(label)) return null;
        return label.length() <= MAX_LABEL ? label : label.substring(0, MAX_LABEL);
    }
}
