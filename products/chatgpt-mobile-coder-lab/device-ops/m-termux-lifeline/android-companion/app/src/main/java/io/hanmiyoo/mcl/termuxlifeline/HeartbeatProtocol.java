package io.hanmiyoo.mcl.termuxlifeline;

final class HeartbeatProtocol {
    static final String SOCKET_NAME = "mcl-m-termux-lifeline-v1";
    static final String HEARTBEAT = "MCL_M_TERMUX_LIFELINE_HEARTBEAT_V1\n";
    static final String RECOVERY_OK = "MCL_M_TERMUX_LIFELINE_RECOVERY_OK_V1\n";
    static final String ACK = "MCL_M_TERMUX_LIFELINE_ACK_V1\n";
    static final int MAX_FRAME_BYTES = 64;

    enum Kind {
        HEARTBEAT,
        RECOVERY_OK,
        INVALID
    }

    private HeartbeatProtocol() {}

    static Kind classify(String frame) {
        if (HEARTBEAT.equals(frame)) return Kind.HEARTBEAT;
        if (RECOVERY_OK.equals(frame)) return Kind.RECOVERY_OK;
        return Kind.INVALID;
    }
}
