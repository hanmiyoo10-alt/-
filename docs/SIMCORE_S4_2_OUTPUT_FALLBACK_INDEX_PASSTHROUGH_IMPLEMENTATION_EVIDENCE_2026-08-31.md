# SimCore S4-2 Output Fallback Index Pass-Through Implementation Evidence

Date: 2026-08-31 KST
Status: **MERGE-READY · PR-DRY + REQUEST-FREE QUALIFIED · FINAL EXACT-HEAD CI NEXT · NO PUBLICATION BEFORE S7**
Classification: **POST-M2 SIMPLIFICATION / S4 / OUTER RUNTIME SHELL / PASS-THROUGH PARAMETER RETIREMENT**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S4_1_RUNTIME_CURRENT_GUARD_CONVERGENCE_CLOSURE_2026-08-31.md`
- `docs/SIMCORE_S4_2_OUTPUT_FALLBACK_INDEX_PASSTHROUGH_RETIREMENT_DESIGN_2026-08-31.md`
- S4-2 design/closure main merge = `51522eb1552cd6a3e8bb451051ddcc273e4a3e0c`

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
P10 = S4-2 output fallback-index pass-through retirement
```

## Builder

`products/simcore/tooling/build-s4-2-output-fallback-index-passthrough-retirement.py`

Implementation head after builder creation:

`db1e86d12e13cf557eab164505c619659163147a`

### Self-contained packaging

The isolated materializer receives one builder file. P10 therefore remains self-contained.

Instead of recursively embedding the whole P9 builder, which itself embeds P8, P10 reuses the exact P9-owned hash-verified P8 snapshot and then reproduces P9 using the same frozen S4-1 apply/verification contract before applying P9→P10.

```text
embedded predecessor = exact P8 builder snapshot
P8 source SHA256 = 51c01833ded2369b94a78db9287cddfffb6a3feb4c1a414146ea887eb26fc890
P0→P8 verification = inherited permanent predecessor verification
P8→P9 verification = explicit S4-1 exact reconstruction + module/side-effect/guard checks
P9→P10 verification = explicit exact reconstruction + module/side-effect/order checks
sibling builder runtime dependency = NONE
network dependency = NONE
release-system materializer change = NONE
```

This avoids a recursive builder-snapshot tower while preserving the actual proof obligation that a fully verified P9 is the immediate runtime predecessor of P10.

## Exact P9 -> P10 delta

Before:

```js
async function processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf = null) {
  let t = perfNow();
```

After:

```js
async function processCoreOutput(content, chaIdx, chatIdx, chat, perf = null) {
  const fallbackOutIndex = chat?.message?.length ?? 0;
  let t = perfNow();
```

Caller before:

```js
const fallbackOutIndex = chat?.message?.length ?? 0;
return await processCoreOutput(content, chaIdx, chatIdx, chat, fallbackOutIndex, perf);
```

Caller after:

```js
return await processCoreOutput(content, chaIdx, chatIdx, chat, perf);
```

The fallback expression remains before `perfNow()` and before the first `runtimeSession.loadCoreForChat` await, preserving synchronous evaluation order and `sessionLoadMs` attribution.

## Frozen proof envelope

The builder fails closed unless:

```text
P0→P8 predecessor verification passes
P8→P9 exact reconstruction passes
P9 S4-1 guard/accounting/module invariants pass
P9→P10 expected reconstruction equals candidate byte-for-byte
module graph unchanged
require surface unchanged
all true SimCore.define module bodies unchanged
processCoreOutput definition old=1/new=1 at exact shapes
sole outputHandler call old=1/new=1 at exact shapes
fallback expression count remains 1 on this outer path
Session.resolveOutputIndex(fallbackOutIndex = -1) remains present exactly once
cs.resolveOutputIndex(fallbackOutIndex) remains present exactly once
S4-1 guard declaration/call counts unchanged
staleRuntimeDrops increment/direct-drop counts unchanged
positive telemetry current-runtime guard unchanged
host/session/output/checkpoint call marker counts unchanged
side-effect/protected marker counts unchanged
latest.js == install.js
node --check passes
```

## Pure differential harness

The builder executes a bounded Node harness over:

```text
null chat
empty object
message=null
message=[]
one message
multiple messages
```

For each shape it requires identical fallback values and identical `resolveOutputIndex` result across inactive/active pending-index controls. Session pending send-index precedence remains unchanged code.

## Async / side-effect posture

```text
await boundaries = unchanged
host.currentIndices/getChat ordering = unchanged
runtimeSession.loadCoreForChat ordering = unchanged
cs.processOutput ordering = unchanged
new storage/chat/network/timer I/O = 0
persistent fields/schema = unchanged
prompt/Community semantics = unchanged
telemetry checkpoint gating = unchanged
release-simcore = unchanged
```

## PR-dry qualification

Temporary dry identity:

```text
intent = simcore-v0.70.3-intent-09
release = simcore-v0.70.3-new-09
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
```

Qualified evidence:

```text
PR = #1047
qualified head = 539d30daa6ebdec3f6e5bc1ba5696006b590526b
workflow run = 33368925644
Verify job = 99415405285 / PASS
Required job = 99415565933 / PASS
PR merge-test / verifierCommit = 971ea4de295c09d1db2dd8b7c157aa790022ac61
PR base = 51522eb1552cd6a3e8bb451051ddcc273e4a3e0c
conclusion = PASS
reasonCodes = []
GATE_CI_SELF = PASS
GATE_PR1_DRY = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latestSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
installSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
production bytes = 574325
architecture contract = 0.70.1 / non-transitional
```

The successful PR-dry proves the single-file builder decoded and hash-verified its embedded predecessor, reproduced P0→P9, applied the exact P9→P10 delta, passed static/architecture/regression verification, and did not persist a candidate.

## Request-free qualification

The dry-only request was removed after successful qualification.

```text
request-free head = 2edb87967f899bc6cc1d681a62583f4041e46169
workflow run = 33369150089
Verify job = 99416139319 / PASS
Required job = 99416272568 / PASS
PR merge-test / verifierCommit = 5e8200a7f28dce80c0d04e8984f99ea569a23843
PR base = 51522eb1552cd6a3e8bb451051ddcc273e4a3e0c
conclusion = PASS
reasonCodes = []
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
productionCommit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latestSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
installSha256 = 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf
production bytes = 574325
architecture contract = 0.70.1 / non-transitional
```

Request-free qualification confirms that the branch no longer carries a candidate request and that permanent CI independently accepts the builder/evidence delta against unchanged production.

## Final exact-head requirement

This evidence synchronization creates a new PR head. That exact head must independently pass:

```text
Verify = PASS
Required = PASS
GATE_CI_SELF = PASS
GATE_PR1_DRY = NOT_APPLICABLE
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
candidateCommit = null
```

No further implementation/evidence mutation is allowed after that exact-head qualification before expected-head CAS merge.

## Anomaly ledger

```text
WATCH = NONE
DEFER = NONE
FIX = NONE
BLOCKER = NONE
```

## Current disposition

```text
S4_2_DESIGN = FROZEN ON MAIN
S4_2_P10_BUILDER = MERGE-READY
S4_2_SELF_CONTAINMENT = PASS
S4_2_PR_DRY = PASS
S4_2_REQUEST_FREE_CI = PASS
S4_2_FINAL_EXACT_HEAD_CI = NEXT
S4_2_PUBLICATION = NONE BEFORE S7
```
