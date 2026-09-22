package io.hanmiyoo.mcl.termuxlifeline;

final class LifelinePolicy {
    static final long STALE_AFTER_MS = 45_000L;
    static final long COOLDOWN_MS = 300_000L;

    enum PackageState {
        INSTALLED_NOT_STOPPED,
        STOPPED,
        UNKNOWN
    }

    enum Decision {
        HEALTHY,
        WAITING_FOR_FIRST_HEARTBEAT,
        BLOCKED_FORCE_STOP_DOMAIN,
        UNKNOWN_PACKAGE_STATE,
        NEEDS_MANUAL_RUN_COMMAND_PERMISSION,
        NEEDS_MANUAL_TERMUX_POLICY,
        RECOVERY_ALREADY_ATTEMPTED,
        COOLDOWN,
        RECOVERY_ELIGIBLE
    }

    private LifelinePolicy() {}

    static Decision decide(
            long nowMs,
            long lastHeartbeatMs,
            boolean hasSeenHeartbeat,
            PackageState packageState,
            boolean runCommandPermissionGranted,
            boolean termuxPolicyAcknowledged,
            boolean attemptedForCurrentLoss,
            long lastAttemptMs) {
        if (!hasSeenHeartbeat) return Decision.WAITING_FOR_FIRST_HEARTBEAT;
        if (nowMs - lastHeartbeatMs < STALE_AFTER_MS) return Decision.HEALTHY;
        if (packageState == PackageState.STOPPED) return Decision.BLOCKED_FORCE_STOP_DOMAIN;
        if (packageState == PackageState.UNKNOWN) return Decision.UNKNOWN_PACKAGE_STATE;
        if (!runCommandPermissionGranted) return Decision.NEEDS_MANUAL_RUN_COMMAND_PERMISSION;
        if (!termuxPolicyAcknowledged) return Decision.NEEDS_MANUAL_TERMUX_POLICY;
        if (attemptedForCurrentLoss) return Decision.RECOVERY_ALREADY_ATTEMPTED;
        if (lastAttemptMs > 0L && nowMs - lastAttemptMs < COOLDOWN_MS) {
            return Decision.COOLDOWN;
        }
        return Decision.RECOVERY_ELIGIBLE;
    }
}
