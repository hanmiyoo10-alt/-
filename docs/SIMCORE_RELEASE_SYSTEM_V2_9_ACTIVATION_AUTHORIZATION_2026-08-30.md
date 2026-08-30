# SimCore Release System R2.9 Normal-Path Activation Authorization

Date: 2026-08-30 KST

Status: **ACTIVATION AUTHORIZED · NON-RUNTIME · SEPARATE CONTROL-PLANE TRANSACTION**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_VALIDATION_CONTRACT_PROJECTION_AND_FIXTURE_CLOSURE_DESIGN_2026-08-30.md`

Implementation authority/evidence:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_EVIDENCE_2026-08-30.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_CLOSURE_2026-08-30.md`
- `products/simcore/releases/R_V2_9_VALIDATION_CONTRACT_PROJECTION_STATUS.json`

Operational gate evidence:
- `docs/SIMCORE_R2_8_V07000_SECOND_ORDINARY_TERMINAL_CLOSE_2026-08-30.md`

Operator instruction:
- explicit continuation instruction on 2026-08-30 KST after the v0.70.1 candidate qualification blocker was identified: `ㄱ`

## 1. Gate resolution

The frozen R2.9 activation gate required both:

```text
v0.70.0 HUMAN_EVIDENCE LIVE_PASS = true
second ordinary R2.8 terminal convergence without recovery = true
```

Both are now satisfied.

R2.8 evidence records:

```text
human evidence merge = ded837ee6d9b563ce3df3f51570715c67fdc95a6
terminal workflow run = 33295987185 = SUCCESS
durable terminal state commit = e3e32b3151212ae4d5269194b9e9394ff69a2783
validation_status = LIVE_PASS
major checkpoint = M2-6
recovery transaction = NONE
```

Therefore the design-time activation deferral is released.

## 2. New operational evidence

v0.70.1 candidate PR #949 fail-closed during PR1 dry qualification after the runtime implementation itself had already passed its dedicated implementation CI.

Current exact blocker:

```text
PR1_DRY_QUALIFICATION_FAIL
CANDIDATE_REGRESSION_FAILED
SUITE_ASSERTION_FAILED: reload-cache-continuity: reload continuity gate version 0.70.1
run = 33296664638
production mutation = NONE
```

The active registry still routes stable contracts through v0.70.0 version wrappers:

```text
reload-cache-continuity   -> reload-cache-continuity-v07000.test.mjs
operator-release-card     -> operator-release-card-v07000.test.mjs
host-local-telemetry      -> host-local-telemetry-v07000.test.mjs
bounded-telemetry-capsule -> bounded-telemetry-capsule-v07000.test.mjs
```

This is precisely the recurrence R2.9 was built to eliminate.

Classification:

`FIX · RELEASE_VALIDATION_VERSION_BRIDGE_RECURRENCE · NON_RUNTIME · PRODUCTION_UNCHANGED`

## 3. Decision

Activate the already-qualified R2.9 validation projection as the normal route in a dedicated control-plane PR before retrying v0.70.1 candidate qualification.

Do **not** add new v0.70.1 exact-version wrapper files. The existing R2.9 synthetic-next regression explicitly proves that unchanged stable contracts should advance without wrapper fanout.

Canonical disposition:

```text
R2.9 NORMAL-PATH ACTIVATION = AUTHORIZED
R2.8 AUTHORITY = FROZEN
v0.70.1 RUNTIME = UNCHANGED
release-simcore = UNCHANGED
production plugin = UNCHANGED
new per-version wrappers = FORBIDDEN FOR THIS FIX
```

## 4. Authorized activation scope

The implementation PR may only:

1. add the exact v0.70.1 release validation profile required by the already-implemented R2.9 profile contract;
2. add/adjust a stable registry-facing projected-contract runner if needed to bind source version to the exact profile;
3. switch the four active stable contract registry routes from v0.70.0 wrappers to the R2.9 projected normal path;
4. wire the existing topology preflight into the ordinary qualification path only if the frozen R2.9 implementation already provides a bounded, read-only insertion point and CI proves equivalence;
5. update the R2.9 permanent regression from shadow-only assertions to active-route assertions while retaining synthetic no-wrapper proof;
6. update R2.9 status/evidence to `NORMAL_PATH_ACTIVATED` after CI success.

## 5. Forbidden scope

This activation must not:

```text
change plugin runtime source
change release-simcore
change Candidate Required authority
change Permanent Release publisher
change Exact Approval authority
change HUMAN_EVIDENCE authority
change R2.8 terminal semantics
add background polling/retry
add automatic merge/publication
retire historical wrappers
retire predecessor terminal fallbacks
perform Node action migration
change v0.70.1 instrumentation semantics
```

Historical wrappers remain as evidence; only normal-path dependence may be removed.

## 6. Required verification

Before merge:

```text
R2.9 current v0.70.0 projected contracts PASS
R2.9 exact v0.70.1 profile PASS
synthetic next-version no-wrapper proof PASS
all four registry routes use projected normal path
builder-v07001 fixture closure PASS
unknown release profile fails closed
Host-local exact current identity remains exact
latest.js/install.js production identity remains unchanged
SimCore CI Verify = SUCCESS
SimCore CI Required = SUCCESS
```

After merge, retry PR #949 without changing the v0.70.1 runtime candidate intent. Candidate qualification must either pass or expose a new exact bounded blocker.

## 7. Final authorization

```text
R2.9 ACTIVATION = AUTHORIZED
REASON = FROZEN GATE SATISFIED + REAL VERSION-BRIDGE RECURRENCE OBSERVED
IMPLEMENTATION TRANSACTION = SEPARATE CONTROL-PLANE PR
RUNTIME MUTATION = NONE
RELEASE-SIMCORE MUTATION = NONE
PRODUCTION MUTATION BEFORE QUALIFICATION = NONE
NEXT = ACTIVATE -> CI -> MERGE -> RETRY #949
```
