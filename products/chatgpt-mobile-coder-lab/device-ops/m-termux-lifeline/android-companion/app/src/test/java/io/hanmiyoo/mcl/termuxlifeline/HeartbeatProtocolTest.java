package io.hanmiyoo.mcl.termuxlifeline;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public final class HeartbeatProtocolTest {
    @Test
    public void acceptsOnlyExactReviewedFrames() {
        assertEquals(
            HeartbeatProtocol.Kind.HEARTBEAT,
            HeartbeatProtocol.classify(HeartbeatProtocol.HEARTBEAT)
        );
        assertEquals(
            HeartbeatProtocol.Kind.RECOVERY_OK,
            HeartbeatProtocol.classify(HeartbeatProtocol.RECOVERY_OK)
        );
        assertEquals(HeartbeatProtocol.Kind.INVALID, HeartbeatProtocol.classify(""));
        assertEquals(
            HeartbeatProtocol.Kind.INVALID,
            HeartbeatProtocol.classify("MCL_M_TERMUX_LIFELINE_HEARTBEAT_V1")
        );
        assertEquals(
            HeartbeatProtocol.Kind.INVALID,
            HeartbeatProtocol.classify("MCL_M_TERMUX_LIFELINE_HEARTBEAT_V1\nextra")
        );
    }
}
