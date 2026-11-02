package io.hanmiyoo.mcl.termuxlifeline;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public final class BootRearmPolicyTest {
    private static boolean shouldStart(
            boolean bootCompleted, boolean autoRearmEnabled,
            LifelinePolicy.PackageState packageState, boolean runCommandGranted,
            boolean notificationGranted, boolean policyAcknowledged) {
        return BootRearmPolicy.shouldStart(
            bootCompleted, autoRearmEnabled, packageState, runCommandGranted,
            notificationGranted, policyAcknowledged
        );
    }

    @Test public void allPrerequisitesAllowBootRearm() {
        assertTrue(shouldStart(true, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, true, true, true));
    }
    @Test public void nonBootActionFailsClosed() {
        assertFalse(shouldStart(false, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, true, true, true));
    }
    @Test public void optInIsRequired() {
        assertFalse(shouldStart(true, false, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, true, true, true));
    }
    @Test public void stoppedTermuxFailsClosed() {
        assertFalse(shouldStart(true, true, LifelinePolicy.PackageState.STOPPED, true, true, true));
    }
    @Test public void unknownTermuxFailsClosed() {
        assertFalse(shouldStart(true, true, LifelinePolicy.PackageState.UNKNOWN, true, true, true));
    }
    @Test public void runCommandPermissionIsRequired() {
        assertFalse(shouldStart(true, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, false, true, true));
    }
    @Test public void notificationPermissionIsRequired() {
        assertFalse(shouldStart(true, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, true, false, true));
    }
    @Test public void policyAcknowledgementIsRequired() {
        assertFalse(shouldStart(true, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED, true, true, false));
    }
}
