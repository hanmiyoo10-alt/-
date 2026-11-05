package io.taskbridge.chatgptsignal;

import java.util.Locale;

final class StopControlMatcher {
    private StopControlMatcher() {}

    private static String norm(CharSequence value) {
        return value == null ? "" : value.toString().trim().toLowerCase(Locale.ROOT).replace('_', ' ').replace('-', ' ');
    }

    static boolean matches(CharSequence text, CharSequence description, String viewId, String className, boolean clickable) {
        String t = norm(text);
        String d = norm(description);
        String id = norm(viewId);
        String cls = norm(className);
        boolean buttonLike = clickable || cls.contains("button");
        if (!buttonLike) return false;

        String[] strong = {
            "stop generating", "stop generation", "stop response",
            "생성 중지", "응답 중지", "답변 중지", "생성 멈추기"
        };
        for (String token : strong) {
            if (t.contains(token) || d.contains(token)) return true;
        }

        if (("stop".equals(t) || "stop".equals(d) || "중지".equals(t) || "중지".equals(d)) && cls.contains("button")) {
            return true;
        }

        boolean idHasStop = id.contains("stop") || id.contains("cancel");
        boolean idHasGeneration = id.contains("generat") || id.contains("response") || id.contains("stream");
        return idHasStop && idHasGeneration;
    }
}
