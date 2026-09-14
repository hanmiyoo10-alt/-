package io.hanmiyoo.screenoncompanion;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class CommandProtocolTest {
    @Test
    public void acceptsOnlyOwnedActions() {
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_ON));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_OFF));
        assertTrue(CommandProtocol.isKnownAction(CommandProtocol.ACTION_STATUS));
        assertFalse(CommandProtocol.isKnownAction("com.eonsoft.ACTION_ADD_VIEW"));
        assertFalse(CommandProtocol.isKnownAction(null));
        assertTrue(CommandProtocol.RESULT_AUTH_REQUIRED != CommandProtocol.RESULT_PERMISSION_REQUIRED);
    }
}
