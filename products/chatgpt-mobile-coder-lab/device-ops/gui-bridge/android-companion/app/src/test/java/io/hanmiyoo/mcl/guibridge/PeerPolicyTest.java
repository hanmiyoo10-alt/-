package io.hanmiyoo.mcl.guibridge;

import static org.junit.Assert.*;
import org.junit.Test;

public class PeerPolicyTest {
    @Test public void exactTermuxUidIsRequired() {
        assertTrue(PeerPolicy.authorized(10234, 10234));
        assertFalse(PeerPolicy.authorized(10235, 10234));
        assertFalse(PeerPolicy.authorized(-1, 10234));
        assertFalse(PeerPolicy.authorized(10234, -1));
    }
}
