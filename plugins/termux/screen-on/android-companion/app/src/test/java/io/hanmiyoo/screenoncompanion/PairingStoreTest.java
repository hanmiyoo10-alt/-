package io.hanmiyoo.screenoncompanion;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class PairingStoreTest {
    @Test
    public void tokenFormatIsExactly256BitLowerHex() {
        assertTrue(PairingStore.isValidToken("a".repeat(64)));
        assertFalse(PairingStore.isValidToken("a".repeat(63)));
        assertFalse(PairingStore.isValidToken("A".repeat(64)));
        assertFalse(PairingStore.isValidToken(null));
    }

    @Test
    public void pairingCodeFormatIsExactlyEightDigits() {
        assertTrue(PairingStore.isValidPairingCode("12345678"));
        assertFalse(PairingStore.isValidPairingCode("1234567"));
        assertFalse(PairingStore.isValidPairingCode("abcdefgh"));
        assertFalse(PairingStore.isValidPairingCode(null));
    }
}
