package io.hanmiyoo.mcl.termuxlifeline;

final class RecoveryOutcome {
    static final long VERIFY_TIMEOUT_MS = 30_000L;

    enum State {
        PENDING,
        RECOVERED,
        FAILED
    }

    private RecoveryOutcome() {}

    static State classify(
            long nowMs,
            long attemptMs,
            long lastHeartbeatMs,
            long lastRecoveryReceiptMs) {
        if (lastHeartbeatMs >= attemptMs && lastRecoveryReceiptMs >= attemptMs) {
            return State.RECOVERED;
        }
        if (nowMs - attemptMs >= VERIFY_TIMEOUT_MS) return State.FAILED;
        return State.PENDING;
    }
}
