# SimCore S4-1 Runtime Current Guard Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **PR-DRY QUALIFIED · FIX RESOLVED · INTENT REMOVAL NEXT · NO PUBLICATION BEFORE S7**
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
P9 repaired builder source SHA256 = 145526176ee5397c056a862dcfd9f43989949d2be93b33e9fb94d183b100735c
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
all true SimCore.define module bodies unchanged
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

```text
python -m py_compile build-s4-1-runtime-current-guard-convergence.py = PASS
pure Node current/stale guard equivalence harness = PASS
```

Harness cases include matching epoch, epoch mismatch, disposed runtime, explicit captured epoch and implicit current epoch. For every case the old/new continuation decision and stale-drop delta are identical.

## PR-dry failure 01 preserved

```text
intent = simcore-v0.70.3-intent-08
PR = #1043
failed head = eac9d4fe170268b36bc740ad618111111fd0d0c8
workflow run = 33366426066
Verify job = 99407920114
conclusion = FAIL
reasonCodes = [PR1_DRY_QUALIFICATION_FAIL]
GATE_CI_SELF = PASS
GATE_PR1_DRY = FAIL
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latestSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
installSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
production bytes = 574325
```

Exact builder stderr:

```text
CANDIDATE_BUILDER_FAILED: python3 /tmp/simcore-candidate-8RGEou/build-s4-1-runtime-current-guard-convergence.py
S4_1_MODULE_CHANGED: runtime-probe
```

Classification:

```text
FIX = S4_1_LAST_MODULE_BOUNDARY_VERIFIER
class = VERIFIER_BOUNDARY_FALSE_POSITIVE
runtime defect = NO
production mutation = NONE
candidate persistence = NONE
release-system defect = NO
```

Root cause:

The inherited P8 `module_text()` uses the next `SimCore.define` as a module end and therefore uses EOF for the final `runtime-probe` module. The outer async runtime shell follows that final module, so an intentional outer-shell-only P8→P9 delta was falsely attributed to `runtime-probe`.

## FIX repair

Repair commit:

```text
0cb78df195512d82498a5e97a22c26f5f55bd26a
```

Repair rule:

```text
P0→P8 inherited verification = unchanged
release-system/materializer = unchanged
runtime delta = unchanged
P8→P9 last-module comparison only = bounded at explicit outer async-shell marker
all earlier module comparisons = inherited P8 helper
exact P8→P9 expected-byte equality = retained
```

This repairs the verifier boundary without relaxing product-delta proof.

## Repaired PR-dry PASS

```text
PR = #1043
qualified head = 0cb78df195512d82498a5e97a22c26f5f55bd26a
workflow run = 33366845766
Verify job = 99409154127
Required job = 99409289317
PR merge test commit / verifierCommit = a00ed560571cc087bfd26fb13109cd001f378ea6
PR base = fe54058aecd5ec70f2754ff5f508407b63ca0ec8
conclusion = PASS
reasonCodes = []
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latestSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
installSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
production bytes = 574325
architecture contract = 0.70.1 / non-transitional
```

Disposition:

```text
FIX S4_1_LAST_MODULE_BOUNDARY_VERIFIER = RESOLVED
runtime anomaly = NONE OBSERVED
candidate persisted = NO
production moved = NO
```

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

## Request-free qualification plan

The temporary request is now eligible for removal:

```text
intent = simcore-v0.70.3-intent-08
release = simcore-v0.70.3-new-08
purpose = GATE_PR1_DRY only
candidate persistence = NONE
```

After deletion, a fresh substantive CI must pass:

```text
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
Required = PASS
candidateCommit = null
```

## Anomaly ledger

```text
WATCH = NONE
DEFER = NONE
FIX = S4_1_LAST_MODULE_BOUNDARY_VERIFIER / RESOLVED
BLOCKER = NONE
```

## Current disposition

```text
S4_1_DESIGN = FROZEN ON MAIN
S4_1_P9_BUILDER = STAGED / REPAIRED VERIFIER
S4_1_SELF_CONTAINMENT = BUILT-IN / HASH-VERIFIED
S4_1_LOCAL_STATIC = PASS
S4_1_LOCAL_GUARD_EQUIVALENCE = PASS
S4_1_PR_DRY_01 = FAIL / PRESERVED
S4_1_PR_DRY_02 = PASS
S4_1_FIX = RESOLVED
S4_1_REQUEST_FREE_CI = NEXT
S4_1_PUBLICATION = NONE BEFORE S7
```
