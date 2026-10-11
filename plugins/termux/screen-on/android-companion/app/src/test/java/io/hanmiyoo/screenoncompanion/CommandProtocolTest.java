package io.hanmiyoo.screenoncompanion;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class CommandProtocolTest {
    @Test
    public void acceptsOnlyOwnedActions() {
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_PAIR));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_ON));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_OFF));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_STATUS));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_DIAGNOSTIC));
        assertFalse(CommandProtocol.isKnownAction("com.eonsoft.ACTION_ADD_VIEW"));
        assertFalse(CommandProtocol.isKnownAction(null));
        assertTrue(CommandProtocol.RESULT_AUTH_REQUIRED != CommandProtocol.RESULT_PERMISSION_REQUIRED);
        assertTrue(CommandProtocol.RESULT_PAIRED != CommandProtocol.RESULT_PAIR_CODE_REJECTED);
        assertTrue(CommandProtocol.RESULT_DIAGNOSTIC != CommandProtocol.RESULT_STATUS_OFF);
    }
}
