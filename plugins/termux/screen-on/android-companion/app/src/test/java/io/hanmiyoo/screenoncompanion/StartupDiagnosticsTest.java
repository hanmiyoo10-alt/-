package io.hanmiyoo.screenoncompanion;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class StartupDiagnosticsTest {
    @Test
    public void onlyStableReadyPhaseSkipsDiagnosticSafeMode() {
        assertFalse(StartupDiagnostics.requiresSafeMode(null));
        assertFalse(StartupDiagnostics.requiresSafeMode(StartupDiagnostics.PHASE_READY));
        assertTrue(StartupDiagnostics.requiresSafeMode(StartupDiagnostics.PHASE_UI_BUILD));
        assertTrue(StartupDiagnostics.requiresSafeMode(StartupDiagnostics.PHASE_OVERLAY_PROTECTION));
        assertTrue(StartupDiagnostics.requiresSafeMode(StartupDiagnostics.PHASE_PAIRING_CODE));
        assertTrue(StartupDiagnostics.requiresSafeMode(StartupDiagnostics.PHASE_PAIRING_CODE_VISIBLE));
        assertTrue(StartupDiagnostics.requiresSafeMode("FAILED_PAIRING_CODE_RuntimeException"));
    }

    @Test
    public void sanitizesStartupPhaseToFixedNonSensitiveVocabulary() {
        assertEquals("NONE", StartupDiagnostics.sanitizePhase(null));
        assertEquals("UI_BUILD", StartupDiagnostics.sanitizePhase(StartupDiagnostics.PHASE_UI_BUILD));
        assertEquals("READY", StartupDiagnostics.sanitizePhase(StartupDiagnostics.PHASE_READY));
        assertEquals(
                "FAILED_PAIRING_CODE",
                StartupDiagnostics.sanitizePhase("FAILED_PAIRING_CODE_IllegalStateException"));
        assertEquals(
                "FAILED_OVERLAY_PROTECTION",
                StartupDiagnostics.sanitizePhase("FAILED_OVERLAY_PROTECTION_SecurityException"));
        assertEquals("UNKNOWN", StartupDiagnostics.sanitizePhase("PAIRING_CODE_12345678"));
    }
}
