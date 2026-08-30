# SimCore R2.8 Operational Feedback

Date: 2026-08-30 KST
Status: FEEDBACK RECORDED · NO IMPLEMENTATION AUTHORIZATION
Classification: RELEASE-SYSTEM FEEDBACK · POST-FIRST-GENUINE-USE · NON-RUNTIME

## Current authority snapshot

R2.8 remains `OPERATIONALLY_PROVEN_FIRST_GENUINE_USE_PASS` with disposition `STABILITY_SIMPLICITY_BOUNDED_AUTOMATION`.

Preserved authorities remain correct and should not be weakened:
- exactly one production publisher: `RS2_4_PERMANENT`
- exactly one main writer: `repo-main-write.py`
- HUMAN_EVIDENCE required for LIVE_PASS
- no automatic LIVE_PASS decision
- no automatic checkpoint/priority selection
- no background polling or retry

## Positive feedback

### 1. The core abstraction is correct
R2.8 successfully separates human authority from machine bookkeeping. The human decides LIVE_PASS; the system derives and performs the terminal convergence afterward. This is the right trust boundary and should remain frozen.

### 2. Fail-closed behavior proved useful in real operation
The first genuine v0.68 use failed closed on permanent fixture drift instead of silently mutating durable state. That incident exposed a fixture-independence defect and was repaired without compromising authority boundaries. This is evidence that the gate is doing useful defensive work rather than merely adding ceremony.

### 3. Reuse of existing owners reduced control-plane sprawl
R2.8 reuses the existing admin transition engine, state renderer, main gateway, and permanent publisher rather than inventing a parallel release authority. This materially improves auditability.

### 4. Terminal close is now substantially cleaner
Once accepted HUMAN_EVIDENCE exists, R2.8 removes a large amount of manual terminal bookkeeping. The successful v0.68 retry reaching `ALREADY_DURABLE` is the strongest proof of value.

## Friction observed after first genuine use

### FIX candidate A: historical/permanent fixture isolation remains a sharp edge
R2.8's first genuine use and the later v0.69 post-publish recovery both exposed the same family of risk: historical terminal fixtures can accidentally inherit or conflict with current production identity.

This should be treated as a recurring release-system correctness concern, not as a one-off typo. Historical fixtures should be structurally unable to bind to mutable current-production identity unless the fixture explicitly declares that intent.

Recommended classification: `FIX`, but as a separate release-system task. Do not mix with runtime feature work.

### WATCH candidate B: terminal convergence is healthy, release initiation is still a separate gap
The v0.69.1 release required a bounded one-shot fresh-dispatch bridge because the available control path did not directly provide the required fresh Permanent Release dispatch from the current operating context.

This is not an R2.8 terminal-convergence failure. R2.8 acts after HUMAN_EVIDENCE and terminal authority. However, operationally it reveals an asymmetry:

```text
release initiation     -> still occasionally needs special transport
post-human terminal close -> bounded and automated by R2.8
```

Recommended classification: `WATCH` for R2.8 itself, and a separate `FIX/DESIGN` candidate for release initiation/control-plane ergonomics if recurrence is observed.

### DEFER candidate C: predecessor fallbacks are now clearly retirement candidates
The status already marks predecessor active admin transition retirement, durable-memory sync command retirement, and full root-helper migration as deferred. After first genuine-use PASS, these are more credible cleanup candidates, but removing them now would reduce rollback options without meaningful user-facing gain.

Recommended classification: keep `DEFER` until at least one more ordinary terminal convergence succeeds without recovery surgery.

### WATCH candidate D: Node20 action runtime deprecation
Existing status already tracks this. It remains nonblocking but should stay visible because release-system reliability depends on workflow runtime stability.

## Suggested R2.8 posture

Do not build R2.9 just because R2.8 worked.

The preferred posture is:
1. keep R2.8 architecture frozen,
2. collect at least one additional genuine terminal convergence from a later release,
3. fix fixture identity isolation separately if the same family can still recur,
4. keep predecessor fallbacks until repeated ordinary success,
5. only design R2.9 when a repeated operational pain cannot be solved by a bounded R2.8 maintenance patch.

## Overall assessment

R2.8 is a net success.

Its strongest result is not that it eliminated every release-system problem. Its strongest result is that it narrowed the remaining problems into clearer ownership boundaries:
- HUMAN_EVIDENCE authority remains human,
- terminal bookkeeping is machine-owned,
- production publishing remains single-authority,
- current observed friction is mostly outside the terminal-convergence core.

Recommended disposition: `KEEP R2.8 · STABILIZE · FIX FIXTURE ISOLATION SEPARATELY · DO NOT START R2.9 YET`.
