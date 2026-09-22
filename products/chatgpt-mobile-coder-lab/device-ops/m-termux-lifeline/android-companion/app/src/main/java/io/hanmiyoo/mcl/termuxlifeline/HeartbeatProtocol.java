package io.hanmiyoo.mcl.termuxlifeline;

final class HeartbeatProtocol {
    static final String HEARTBEAT_ACTION =
        "io.hanmiyoo.mcl.termuxlifeline.action.HEARTBEAT_V1";
    static final String RECOVERY_OK_ACTION =
        "io.hanmiyoo.mcl.termuxlifeline.action.RECOVERY_OK_V1";

    enum Kind {
        HEARTBEAT,
        RECOVERY_OK,
        INVALID
    }

    private HeartbeatProtocol() {}

    static Kind classifyAction(String action) {
        if (HEARTBEAT_ACTION.equals(action)) return Kind.HEARTBEAT;
        if (RECOVERY_OK_ACTION.equals(action)) return Kind.RECOVERY_OK;
        return Kind.INVALID;
    }

    static boolean senderUidMatchesTermux(int senderUid, int termuxUid) {
        return senderUid >= 0 && senderUid == termuxUid;
    }
}
