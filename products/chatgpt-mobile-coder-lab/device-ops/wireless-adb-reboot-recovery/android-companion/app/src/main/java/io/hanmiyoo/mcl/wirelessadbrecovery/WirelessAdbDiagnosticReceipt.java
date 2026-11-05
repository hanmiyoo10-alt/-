package io.hanmiyoo.mcl.wirelessadbrecovery;

import android.content.Context;
import android.util.AtomicFile;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

final class WirelessAdbDiagnosticReceipt {
    private static final String FILE_NAME = "mcl_wireless_adb_diagnostic_receipt_v1.txt";
    private static final int MAX_BYTES = 4_096;
    private static final Object LOCK = new Object();

    private WirelessAdbDiagnosticReceipt() {}

    static void resetForActivation(Context context) {
        synchronized (LOCK) {
            State state = State.defaults();
            state.armed = true;
            writeState(context, state);
        }
    }

    static void recordBoot(Context context, boolean lockedBoot) {
        mutate(context, state -> {
            if (lockedBoot) {
                state.lockedBootReceived = true;
            } else {
                state.bootCompletedReceived = true;
            }
        });
    }

    static void recordNetwork(
            Context context,
            String attempt,
            boolean activeNetworkPresent,
            boolean wifiTransport) {
        int slot = attemptSlot(attempt);
        if (slot < 0) {
            return;
        }
        mutate(context, state -> {
            state.settingPre[slot] = "unknown";
            state.write[slot] = "not_reached";
            state.settingPost[slot] = "unknown";
            state.exception[slot] = "not_reached";
            state.attemptSeen[slot] = true;
            state.activeNetwork[slot] = booleanValue(activeNetworkPresent);
            state.wifiTransport[slot] = booleanValue(wifiTransport);
        });
    }

    static void recordSettingPre(Context context, String attempt, boolean enabled) {
        int slot = attemptSlot(attempt);
        if (slot < 0) {
            return;
        }
        mutate(context, state -> {
            state.settingPre[slot] = enabledState(enabled);
            state.exception[slot] = "none";
        });
    }

    static void recordWriteStarted(Context context, String attempt) {
        updateAttempt(context, attempt, state -> state.write[attemptSlot(attempt)] = "started");
    }

    static void recordWriteResult(Context context, String attempt, boolean accepted) {
        updateAttempt(
                context,
                attempt,
                state -> state.write[attemptSlot(attempt)] = accepted ? "accepted" : "rejected");
    }

    static void recordWriteNotNeeded(Context context, String attempt) {
        updateAttempt(context, attempt, state -> state.write[attemptSlot(attempt)] = "not_needed");
    }

    static void recordSettingPost(Context context, String attempt, boolean enabled) {
        updateAttempt(
                context,
                attempt,
                state -> state.settingPost[attemptSlot(attempt)] = enabledState(enabled));
    }

    static void recordSecurityException(Context context, String attempt) {
        updateAttempt(
                context,
                attempt,
                state -> state.exception[attemptSlot(attempt)] = "security");
    }

    static void recordIllegalArgumentException(Context context, String attempt) {
        updateAttempt(
                context,
                attempt,
                state -> state.exception[attemptSlot(attempt)] = "illegal_argument");
    }

    private static void updateAttempt(Context context, String attempt, Mutation mutation) {
        if (attemptSlot(attempt) < 0) {
            return;
        }
        mutate(context, mutation);
    }

    private static void mutate(Context context, Mutation mutation) {
        synchronized (LOCK) {
            State state = readState(context);
            if (state == null || !state.armed) {
                return;
            }
            mutation.apply(state);
            writeState(context, state);
        }
    }

    private static State readState(Context context) {
        try {
            AtomicFile file = atomicFile(context);
            if (!file.getBaseFile().isFile()) {
                return null;
            }
            byte[] bytes = file.readFully();
            if (bytes.length == 0 || bytes.length > MAX_BYTES) {
                return null;
            }
            return parse(new String(bytes, StandardCharsets.UTF_8));
        } catch (IOException | RuntimeException ignored) {
            return null;
        }
    }

    private static void writeState(Context context, State state) {
        byte[] bytes = render(state).getBytes(StandardCharsets.UTF_8);
        if (bytes.length == 0 || bytes.length > MAX_BYTES) {
            return;
        }

        AtomicFile file = null;
        FileOutputStream output = null;
        try {
            file = atomicFile(context);
            output = file.startWrite();
            output.write(bytes);
            file.finishWrite(output);
            output = null;
        } catch (IOException | RuntimeException ignored) {
            if (file != null && output != null) {
                try {
                    file.failWrite(output);
                } catch (RuntimeException ignoredFailWrite) {
                    // Diagnostic persistence is best-effort only.
                }
            }
        }
    }

    private static AtomicFile atomicFile(Context context) {
        Context storage = context.createDeviceProtectedStorageContext();
        File path = new File(storage.getFilesDir(), FILE_NAME);
        return new AtomicFile(path);
    }

    private static int attemptSlot(String attempt) {
        if ("1".equals(attempt)) {
            return 0;
        }
        if ("2".equals(attempt)) {
            return 1;
        }
        if ("3".equals(attempt)) {
            return 2;
        }
        return -1;
    }

    private static String booleanValue(boolean value) {
        return value ? "true" : "false";
    }

    private static String enabledState(boolean enabled) {
        return enabled ? "enabled" : "disabled";
    }

    private static String render(State state) {
        String[] lines = new String[25];
        lines[0] = "schema=1";
        lines[1] = "armed=" + state.armed;
        lines[2] = "locked_boot_received=" + state.lockedBootReceived;
        lines[3] = "boot_completed_received=" + state.bootCompletedReceived;
        renderAttempt(lines, 4, 0, 1, state);
        renderAttempt(lines, 11, 1, 2, state);
        renderAttempt(lines, 18, 2, 3, state);
        return String.join("\n", lines);
    }

    private static void renderAttempt(
            String[] lines, int offset, int slot, int attemptNumber, State state) {
        String prefix = "attempt_" + attemptNumber + "_";
        lines[offset] = prefix + "seen=" + state.attemptSeen[slot];
        lines[offset + 1] = prefix + "active_network=" + state.activeNetwork[slot];
        lines[offset + 2] = prefix + "wifi_transport=" + state.wifiTransport[slot];
        lines[offset + 3] = prefix + "setting_pre=" + state.settingPre[slot];
        lines[offset + 4] = prefix + "write=" + state.write[slot];
        lines[offset + 5] = prefix + "setting_post=" + state.settingPost[slot];
        lines[offset + 6] = prefix + "exception=" + state.exception[slot];
    }

    private static State parse(String text) {
        if (text.indexOf('\r') >= 0) {
            return null;
        }
        String[] lines = text.split("\n", -1);
        if (lines.length != 25 || !"1".equals(value(lines[0], "schema"))) {
            return null;
        }

        State state = State.defaults();
        Boolean armed = booleanField(lines[1], "armed");
        Boolean lockedBoot = booleanField(lines[2], "locked_boot_received");
        Boolean bootCompleted = booleanField(lines[3], "boot_completed_received");
        if (armed == null || lockedBoot == null || bootCompleted == null) {
            return null;
        }
        state.armed = armed;
        state.lockedBootReceived = lockedBoot;
        state.bootCompletedReceived = bootCompleted;

        if (!parseAttempt(lines, 4, 0, 1, state)
                || !parseAttempt(lines, 11, 1, 2, state)
                || !parseAttempt(lines, 18, 2, 3, state)) {
            return null;
        }
        return state;
    }

    private static boolean parseAttempt(
            String[] lines, int offset, int slot, int attemptNumber, State state) {
        String prefix = "attempt_" + attemptNumber + "_";
        Boolean seen = booleanField(lines[offset], prefix + "seen");
        String activeNetwork = value(lines[offset + 1], prefix + "active_network");
        String wifiTransport = value(lines[offset + 2], prefix + "wifi_transport");
        String settingPre = value(lines[offset + 3], prefix + "setting_pre");
        String write = value(lines[offset + 4], prefix + "write");
        String settingPost = value(lines[offset + 5], prefix + "setting_post");
        String exception = value(lines[offset + 6], prefix + "exception");

        if (seen == null
                || !isBooleanOrUnknown(activeNetwork)
                || !isBooleanOrUnknown(wifiTransport)
                || !isEnabledOrUnknown(settingPre)
                || !isWriteState(write)
                || !isEnabledOrUnknown(settingPost)
                || !isExceptionState(exception)) {
            return false;
        }

        state.attemptSeen[slot] = seen;
        state.activeNetwork[slot] = activeNetwork;
        state.wifiTransport[slot] = wifiTransport;
        state.settingPre[slot] = settingPre;
        state.write[slot] = write;
        state.settingPost[slot] = settingPost;
        state.exception[slot] = exception;
        return true;
    }

    private static Boolean booleanField(String line, String key) {
        String field = value(line, key);
        if ("true".equals(field)) {
            return Boolean.TRUE;
        }
        if ("false".equals(field)) {
            return Boolean.FALSE;
        }
        return null;
    }

    private static String value(String line, String key) {
        String prefix = key + "=";
        if (!line.startsWith(prefix)) {
            return null;
        }
        String value = line.substring(prefix.length());
        return value.indexOf('=') < 0 ? value : null;
    }

    private static boolean isBooleanOrUnknown(String value) {
        return "unknown".equals(value) || "true".equals(value) || "false".equals(value);
    }

    private static boolean isEnabledOrUnknown(String value) {
        return "unknown".equals(value) || "enabled".equals(value) || "disabled".equals(value);
    }

    private static boolean isWriteState(String value) {
        return "not_reached".equals(value)
                || "not_needed".equals(value)
                || "started".equals(value)
                || "accepted".equals(value)
                || "rejected".equals(value);
    }

    private static boolean isExceptionState(String value) {
        return "not_reached".equals(value)
                || "none".equals(value)
                || "security".equals(value)
                || "illegal_argument".equals(value);
    }

    private interface Mutation {
        void apply(State state);
    }

    private static final class State {
        boolean armed;
        boolean lockedBootReceived;
        boolean bootCompletedReceived;
        final boolean[] attemptSeen = new boolean[3];
        final String[] activeNetwork = {"unknown", "unknown", "unknown"};
        final String[] wifiTransport = {"unknown", "unknown", "unknown"};
        final String[] settingPre = {"unknown", "unknown", "unknown"};
        final String[] write = {"not_reached", "not_reached", "not_reached"};
        final String[] settingPost = {"unknown", "unknown", "unknown"};
        final String[] exception = {"not_reached", "not_reached", "not_reached"};

        static State defaults() {
            return new State();
        }
    }
}
