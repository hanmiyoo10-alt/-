package io.hanmiyoo.screenoncompanion;

import android.content.Context;
import android.content.SharedPreferences;

final class StartupDiagnostics {
    static final String PHASE_UI_BUILD = "UI_BUILD";
    static final String PHASE_OVERLAY_PROTECTION = "OVERLAY_PROTECTION";
    static final String PHASE_PAIRING_CODE = "PAIRING_CODE";
    static final String PHASE_PAIRING_CODE_VISIBLE = "PAIRING_CODE_VISIBLE";
    static final String PHASE_READY = "READY";

    private static final String PREFS = "screen_on_startup_diagnostics";
    private static final String KEY_PHASE = "phase";

    private StartupDiagnostics() {}

    static String readPhase(Context context) {
        return prefs(context).getString(KEY_PHASE, null);
    }

    static void mark(Context context, String phase) {
        prefs(context).edit().putString(KEY_PHASE, phase).commit();
    }

    static void markFailure(Context context, String phase, RuntimeException error) {
        mark(context, "FAILED_" + phase + "_" + error.getClass().getSimpleName());
    }

    static boolean requiresSafeMode(String phase) {
        return phase != null && !PHASE_READY.equals(phase);
    }

    static String readSanitizedPhase(Context context) {
        return sanitizePhase(readPhase(context));
    }

    static String sanitizePhase(String phase) {
        if (phase == null) return "NONE";
        if (PHASE_UI_BUILD.equals(phase)
                || PHASE_OVERLAY_PROTECTION.equals(phase)
                || PHASE_PAIRING_CODE.equals(phase)
                || PHASE_PAIRING_CODE_VISIBLE.equals(phase)
                || PHASE_READY.equals(phase)) {
            return phase;
        }
        if (phase.startsWith("FAILED_" + PHASE_UI_BUILD + "_")) return "FAILED_UI_BUILD";
        if (phase.startsWith("FAILED_" + PHASE_OVERLAY_PROTECTION + "_")) return "FAILED_OVERLAY_PROTECTION";
        if (phase.startsWith("FAILED_" + PHASE_PAIRING_CODE + "_")) return "FAILED_PAIRING_CODE";
        if (phase.startsWith("FAILED_" + PHASE_PAIRING_CODE_VISIBLE + "_")) return "FAILED_PAIRING_CODE_VISIBLE";
        return "UNKNOWN";
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }
}
