package io.hanmiyoo.screenoncompanion;

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
}
