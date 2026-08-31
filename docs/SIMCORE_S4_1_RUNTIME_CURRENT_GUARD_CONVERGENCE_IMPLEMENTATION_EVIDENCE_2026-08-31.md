# SimCore S4-1 Runtime Current Guard Convergence Implementation Evidence

Date: 2026-08-31 KST
Status: **MERGE-READY · PR-DRY PASS · REQUEST-FREE PASS · FINAL EXACT-HEAD CI NEXT · NO PUBLICATION BEFORE S7**
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

The isolated candidate materializer receives one builder file. P9 therefore embeds and SHA256-verifies the exact qualified P8 builder source before reproducing P0→P8 and applying P8→P9.

```text
P8 predecessor file = products/simcore/tooling/build-s3-4-session-candidate-wrapper-convergence.py
P8 predecessor source SHA256 = 51c01833ded2369b94a78db9287cddfffb6a3feb4c1a414146ea887eb26fc890
P9 repaired builder source SHA256 = 145526176ee5397c056a862dcfd9f43989949d2be93b33e9fb94d183b100735c
sibling builder runtime dependency = NONE
network dependency = NONE
release-system materializer change = NONE
```

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

Caller-specific return values and request diagnostics remain outside the helper and byte-preserved. Captured hook epochs, await boundaries, host/session/output ordering, positive telemetry guard, persistent/schema surfaces, prompt/Community semantics and provider-cache posture remain frozen.

## Frozen proof envelope

P9 fails closed unless:

```text
P0→P8 predecessor verification passes
P8→P9 exact expected replacement equals candidate byte-for-byte
module graph / require surface unchanged
all true SimCore.define module bodies unchanged
private guard declaration = 1
guard calls = exactly 10
direct dropStaleRuntime call = helper only
staleRuntimeDrops increment site count = 1
runtime-unloaded diagnostic patches = 2
positive telemetry runtimeIsCurrent guard unchanged
onUnload runtimeDisposed -> runtimeEpoch sequence unchanged
host.currentIndices/getChat counts unchanged
runtimeSession.loadCoreForChat count unchanged
cs.onSend/processOutput counts unchanged
checkpointRuntimeTelemetry OUTPUT_COMMIT count unchanged
side-effect/protected marker counts unchanged
latest.js == install.js
node --check passes
```

## Local verification

```text
python -m py_compile build-s4-1-runtime-current-guard-convergence.py = PASS
pure Node current/stale guard equivalence harness = PASS
```

The harness covers matching epoch, epoch mismatch, disposed runtime, explicit captured epoch and implicit current epoch. Old/new continuation decisions and stale-drop deltas are identical.

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

Exact stderr:

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

Root cause: inherited P8 `module_text()` uses EOF for the final `runtime-probe` module and therefore falsely included the following outer async runtime shell in that module comparison.

## FIX repair and repaired PR-dry PASS

Repair commit:

`0cb78df195512d82498a5e97a22c26f5f55bd26a`

Repair preserves P0→P8 verification, release-system/materializer, and the runtime delta. Only P8→P9 final-module comparison is bounded at the explicit outer async-shell marker; exact expected-byte equality remains the stronger delta proof.

```text
qualified head = 0cb78df195512d82498a5e97a22c26f5f55bd26a
workflow run = 33366845766
Verify job = 99409154127
Required job = 99409289317
PR merge test / verifierCommit = a00ed560571cc087bfd26fb13109cd001f378ea6
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

```text
FIX S4_1_LAST_MODULE_BOUNDARY_VERIFIER = RESOLVED
runtime anomaly = NONE OBSERVED
candidate persisted = NO
production moved = NO
```

## Intent retirement

Temporary `simcore-v0.70.3-intent-08` existed only for `GATE_PR1_DRY` and persisted no candidate. It was deleted after repaired PR-dry qualification.

```text
intent removal head = d9a9eb2019ee399d80b39fbbed3447f5dcccf711
candidate persistence = NONE
```

## Request-free substantive PASS

```text
PR = #1043
request-free head = d9a9eb2019ee399d80b39fbbed3447f5dcccf711
workflow run = 33367006406
Verify job = 99409700647
Required job = 99409802289
PR merge test / verifierCommit = b16ea300c8697464f437d340ca32b7f7f05c0e1f
PR base = fe54058aecd5ec70f2754ff5f508407b63ca0ec8
conclusion = PASS
reasonCodes = []
scope = CI_SELF + HARNESS + SIMCORE_DOC_ONLY
docOnly = false
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
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

This is the required request-free qualification. No candidate request was present and no candidate was materialized or persisted.

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
S4_1_P9_BUILDER = QUALIFIED / REPAIRED VERIFIER
S4_1_SELF_CONTAINMENT = BUILT-IN / HASH-VERIFIED
S4_1_LOCAL_STATIC = PASS
S4_1_LOCAL_GUARD_EQUIVALENCE = PASS
S4_1_PR_DRY_01 = FAIL / PRESERVED
S4_1_PR_DRY_02 = PASS
S4_1_FIX = RESOLVED
S4_1_REQUEST_FREE_CI = PASS
S4_1_FINAL_EXACT_HEAD_CI = NEXT
S4_1_MERGE_AUTHORITY = READY AFTER FINAL EXACT-HEAD PASS
S4_1_PUBLICATION = NONE BEFORE S7
```
