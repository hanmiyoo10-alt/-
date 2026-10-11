package io.hanmiyoo.mcl.termuxlifeline;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import org.junit.Test;

public final class HeartbeatProtocolTest {
    @Test
    public void acceptsOnlyExactReviewedActions() {
        assertEquals(
            HeartbeatProtocol.Kind.HEARTBEAT,
            HeartbeatProtocol.classifyAction(HeartbeatProtocol.HEARTBEAT_ACTION)
        );
        assertEquals(
            HeartbeatProtocol.Kind.RECOVERY_OK,
            HeartbeatProtocol.classifyAction(HeartbeatProtocol.RECOVERY_OK_ACTION)
        );
        assertEquals(HeartbeatProtocol.Kind.INVALID, HeartbeatProtocol.classifyAction(null));
        assertEquals(HeartbeatProtocol.Kind.INVALID, HeartbeatProtocol.classifyAction(""));
        assertEquals(
            HeartbeatProtocol.Kind.INVALID,
            HeartbeatProtocol.classifyAction(HeartbeatProtocol.HEARTBEAT_ACTION + ".extra")
        );
    }

    @Test
    public void senderUidMustExactlyMatchInstalledTermuxUid() {
        assertTrue(HeartbeatProtocol.senderUidMatchesTermux(10234, 10234));
        assertFalse(HeartbeatProtocol.senderUidMatchesTermux(-1, 10234));
        assertFalse(HeartbeatProtocol.senderUidMatchesTermux(10235, 10234));
    }
}
