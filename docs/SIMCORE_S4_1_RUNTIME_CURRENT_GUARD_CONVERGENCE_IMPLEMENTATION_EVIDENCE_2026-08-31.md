# SimCore S4-1 Runtime Current Guard Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **IMPLEMENTATION STAGED · PR-DRY PENDING · NO PUBLICATION BEFORE S7**
Classification: **POST-M2 SIMPLIFICATION / S4 / OUTER RUNTIME SHELL / STALE-RUNTIME GUARD DEDUPE**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S3_DIAGNOSTICS_TELEMETRY_BOOKKEEPING_CLOSURE_2026-08-31.md`
- `docs/SIMCORE_S4_1_RUNTIME_CURRENT_GUARD_CONVERGENCE_DESIGN_2026-08-31.md`
- S4-1 design authority main merge = `954c7881c51b468fc27971ea9126e8d613f36a4e`

Production remains unchanged:

```text
release-simcore version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
release blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
provider cache = UNVERIFIED
```

No deployment, candidate persistence, public release or broad live authority exists before S7.

## Cumulative stages

```text
P0 = exact v0.70.1 production
P1 = S1-1 FNV convergence
P2 = S2-1 Prompt dead render seam retirement
P3 = S2-2 Session dead re-export retirement
P4 = S2-3 runtime utility dead export retirement
P5 = S3-1 claim-selection probe convergence
P6 = S3-2 session candidate result convergence
P7 = S3-3 session surface result convergence
P8 = S3-4 session candidate wrapper convergence
P9 = S4-1 runtime current guard convergence
```

## Builder packaging

Builder:

`products/simcore/tooling/build-s4-1-runtime-current-guard-convergence.py`

The candidate materializer executes one isolated builder file. S4-1 therefore contains an exact compressed snapshot of the already-qualified P8 builder inside the P9 builder and validates the snapshot before executing it.

```text
P8 predecessor file = products/simcore/tooling/build-s3-4-session-candidate-wrapper-convergence.py
P8 predecessor source SHA256 = 51c01833ded2369b94a78db9287cddfffb6a3feb4c1a414146ea887eb26fc890
P9 builder source SHA256 at initial staging = e7217b30c594a5c8148e0c96bc343e40f34ffdc26d94df8b660bb892f04fea7b
sibling builder runtime dependency = NONE
network dependency = NONE
release-system materializer change = NONE
```

The embedded predecessor is not product runtime. It is build/verification packaging used only to reproduce P0→P8 before applying P8→P9.

## Exact P8 -> P9 delta

Add one private outer-shell helper:

```js
function guardCurrentRuntime(epoch = runtimeEpoch) {
  if (runtimeIsCurrent(epoch)) return true;
  dropStaleRuntime();
  return false;
}
```

Replace exactly ten negative stale-runtime decision bodies:

```text
prepareCoreRequest = 2
processCoreOutput = 2
beforeRequestHandler = 3
outputHandler = 3
TOTAL = 10
```

Caller-specific behavior remains outside the helper and is byte-preserved:

```text
prepareCoreRequest runtime-unloaded diagnostic patch + {active:false} return
processCoreOutput original content return
beforeRequestHandler original messages return
outputHandler original content return
```

## Frozen proof envelope

The P9 builder fails closed unless:

```text
P0→P8 predecessor verification passes first
P8→P9 exact expected replacement reconstruction equals candidate byte-for-byte
module graph unchanged
require surface unchanged
all SimCore module bodies unchanged
private guard declaration = 1
guard calls = exactly 10
remaining direct dropStaleRuntime call = helper only
staleRuntimeDrops increment site count unchanged = 1
runtime-unloaded diagnostic patches unchanged = 2
positive telemetry runtimeIsCurrent guard unchanged
onUnload runtimeDisposed -> runtimeEpoch increment sequence unchanged
host.currentIndices/getChat call counts unchanged
runtimeSession.loadCoreForChat call count unchanged
cs.onSend/processOutput call counts unchanged
checkpointRuntimeTelemetry OUTPUT_COMMIT call count unchanged
side-effect/protected marker counts unchanged
latest.js == install.js
node --check passes
```

## Local pre-PR verification

Performed before opening PR-dry:

```text
python -m py_compile build-s4-1-runtime-current-guard-convergence.py = PASS
pure Node current/stale guard equivalence harness = PASS
```

Harness cases include matching epoch, epoch mismatch, disposed runtime, explicit captured epoch and implicit current epoch. For every case the old/new continuation decision and stale-drop delta are identical.

## Async / side-effect posture

```text
await boundaries = unchanged
host/session/output call ordering = unchanged
new storage/chat/network/timer I/O = 0
persistent fields/schema = unchanged
prompt/Community semantics = unchanged
telemetry checkpoint gating = unchanged
release-simcore = unchanged
```

## PR-dry plan

Temporary request identity:

```text
intent = simcore-v0.70.3-intent-08
release = simcore-v0.70.3-new-08
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
```

Expected qualification:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
```

After PR-dry PASS, `intent-08` must be removed and a fresh request-free substantive CI must pass with `GATE_PR1_DRY = NOT_APPLICABLE` before merge readiness.

## Anomaly ledger

```text
OPEN WATCH = NONE
OPEN DEFER = NONE
OPEN FIX = NONE
OPEN BLOCKER = NONE
```

Any PR-dry or runtime anomaly is preserved here before repair or progression.

## Current disposition

```text
S4_1_DESIGN = FROZEN ON MAIN
S4_1_P9_BUILDER = STAGED
S4_1_SELF_CONTAINMENT = BUILT-IN / HASH-VERIFIED
S4_1_LOCAL_STATIC = PASS
S4_1_LOCAL_GUARD_EQUIVALENCE = PASS
S4_1_PR_DRY = PENDING
S4_1_REQUEST_FREE_CI = NOT_STARTED
S4_1_PUBLICATION = NONE BEFORE S7
```
