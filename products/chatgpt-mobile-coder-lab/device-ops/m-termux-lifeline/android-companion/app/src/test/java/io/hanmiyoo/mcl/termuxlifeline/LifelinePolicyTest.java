package io.hanmiyoo.mcl.termuxlifeline;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public final class LifelinePolicyTest {
    private static final long NOW = 1_000_000L;
    private static final long STALE = NOW - LifelinePolicy.STALE_AFTER_MS - 1L;

    private LifelinePolicy.Decision decide(
            long lastHeartbeatMs,
            boolean seen,
            LifelinePolicy.PackageState packageState,
            boolean permission,
            boolean policyAck,
            boolean attempted,
            long lastAttemptMs) {
        return LifelinePolicy.decide(
            NOW, lastHeartbeatMs, seen, packageState,
            permission, policyAck, attempted, lastAttemptMs
        );
    }

    @Test
    public void waitsForFirstHeartbeatBeforeAnyRecovery() {
        assertEquals(
            LifelinePolicy.Decision.WAITING_FOR_FIRST_HEARTBEAT,
            decide(0L, false, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, true, false, 0L)
        );
    }

    @Test
    public void freshHeartbeatIsHealthy() {
        assertEquals(
            LifelinePolicy.Decision.HEALTHY,
            decide(NOW - 1L, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, true, false, 0L)
        );
    }

    @Test
    public void forceStoppedPackageAlwaysBlocksThisDomain() {
        assertEquals(
            LifelinePolicy.Decision.BLOCKED_FORCE_STOP_DOMAIN,
            decide(STALE, true, LifelinePolicy.PackageState.STOPPED,
                false, false, false, 0L)
        );
    }

    @Test
    public void unknownPackageStateFailsClosed() {
        assertEquals(
            LifelinePolicy.Decision.UNKNOWN_PACKAGE_STATE,
            decide(STALE, true, LifelinePolicy.PackageState.UNKNOWN,
                true, true, false, 0L)
        );
    }

    @Test
    public void missingManualPrerequisitesDoNotMutateOrRecover() {
        assertEquals(
            LifelinePolicy.Decision.NEEDS_MANUAL_RUN_COMMAND_PERMISSION,
            decide(STALE, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                false, true, false, 0L)
        );
        assertEquals(
            LifelinePolicy.Decision.NEEDS_MANUAL_TERMUX_POLICY,
            decide(STALE, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, false, false, 0L)
        );
    }

    @Test
    public void oneLossEpisodeGetsAtMostOneAttempt() {
        assertEquals(
            LifelinePolicy.Decision.RECOVERY_ALREADY_ATTEMPTED,
            decide(STALE, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, true, true, 0L)
        );
    }

    @Test
    public void cooldownBlocksImmediateNewAttempt() {
        assertEquals(
            LifelinePolicy.Decision.COOLDOWN,
            decide(STALE, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, true, false, NOW - 1L)
        );
    }

    @Test
    public void exactEligibleStateAllowsFixedRecovery() {
        assertEquals(
            LifelinePolicy.Decision.RECOVERY_ELIGIBLE,
            decide(STALE, true, LifelinePolicy.PackageState.INSTALLED_NOT_STOPPED,
                true, true, false, 0L)
        );
    }
}
