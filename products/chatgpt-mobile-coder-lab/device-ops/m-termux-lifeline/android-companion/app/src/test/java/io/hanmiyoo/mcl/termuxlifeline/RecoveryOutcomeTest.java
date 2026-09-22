package io.hanmiyoo.mcl.termuxlifeline;

import static org.junit.Assert.assertEquals;
import org.junit.Test;

public final class RecoveryOutcomeTest {
    private static final long ATTEMPT = 100_000L;

    @Test
    public void requiresBothHeartbeatAndRecoveryReceipt() {
        assertEquals(
            RecoveryOutcome.State.PENDING,
            RecoveryOutcome.classify(ATTEMPT + 1L, ATTEMPT, ATTEMPT + 1L, ATTEMPT - 1L)
        );
        assertEquals(
            RecoveryOutcome.State.PENDING,
            RecoveryOutcome.classify(ATTEMPT + 1L, ATTEMPT, ATTEMPT - 1L, ATTEMPT + 1L)
        );
        assertEquals(
            RecoveryOutcome.State.RECOVERED,
            RecoveryOutcome.classify(ATTEMPT + 1L, ATTEMPT, ATTEMPT + 1L, ATTEMPT + 1L)
        );
    }

    @Test
    public void verificationTimeoutFailsClosed() {
        assertEquals(
            RecoveryOutcome.State.PENDING,
            RecoveryOutcome.classify(
                ATTEMPT + RecoveryOutcome.VERIFY_TIMEOUT_MS - 1L,
                ATTEMPT, ATTEMPT - 1L, ATTEMPT - 1L
            )
        );
        assertEquals(
            RecoveryOutcome.State.FAILED,
            RecoveryOutcome.classify(
                ATTEMPT + RecoveryOutcome.VERIFY_TIMEOUT_MS,
                ATTEMPT, ATTEMPT - 1L, ATTEMPT - 1L
            )
        );
    }
}
