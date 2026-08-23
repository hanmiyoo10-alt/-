# SimCore Release System v2 — RS2-3 Permanent CI Implementation Evidence

Date: 2026-08-23
Status: **SHADOW VERIFIED · INSTALLATION READY · NON-RUNTIME**
Phase: `RS2-3 — Permanent CI`
Implementation PR: `#151`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_PERMISSIONS_CONCURRENCY_REPORT_ARTIFACT_SAFETY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3D_SHADOW_EQUIVALENCE_LEGACY_GATE_RETIREMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`

## Entry authority

```text
implementation base main = 1dcf86a8af4ba3feb3a17d5a1817da647ce6137e
RS2-2 phase               = CLOSED
release-simcore           = 47969d24771f6cc188df6e32150fc6fde519182d
production version        = 0.64.6
production blob           = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

`release-simcore` remained read-only throughout RS2-3 implementation. No runtime/plugin source mutation was authorized or performed.

## Permanent CI installed by this work item

```text
.github/workflows/simcore-ci.yml
products/simcore/tooling/check.mjs
products/simcore/tooling/ci/classify.mjs
products/simcore/tooling/ci/legacy-compat.mjs
products/simcore/tooling/ci/self-test.mjs
products/simcore/ci/legacy-compat.json
products/simcore/ci/legacy-gate-map.json
products/simcore/ci/shadow-equivalence.json
```

Permanent properties:

```text
public check                     = SimCore CI / Required
repository permission            = contents: read
secrets                          = none
repository/ref writes            = none
sync-state --write               = forbidden
repo-main-write.py               = forbidden
external actions                 = full-SHA pinned
bounded report maximum           = 256 KiB
PR unrelated/doc-only conclusion = NOOP success
MAIN_HEALTH                      = full baseline
CANDIDATE_SHADOW                 = immutable candidate check
CANDIDATE_REQUIRED               = interface present, caller authority reserved for RS2-4
```

## First permanent execution

```text
run          = 32637087508
Verify       = 97188369974 / SUCCESS
Required     = 97188394793 / SUCCESS
profile      = PR_MAIN
production   = 47969d24771f6cc188df6e32150fc6fde519182d
Node         = 22.23
Python       = 3.12
artifact     = 9492595979
```

Executed gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

## Preserved shadow-proof anomalies

Two evidence-collector defects were discovered during RS2-3D and preserved before repair.

### `RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION`

```text
classification = FIX / TEST_EVIDENCE / NON_RUNTIME
run            = 32637377662
```

The temporary proof expected a nonexistent per-fixture stdout string. The legacy robust runner's stable contract is aggregate exit 0 plus:

```text
v0.64.6 closure + timeline regression fixtures 1-25: PASS
```

No permanent product gate was weaker in that run.

### `RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE`

```text
classification = FIX / TEST_EVIDENCE / NON_RUNTIME
run            = 32637534610
```

The temporary COMMUNITY negative removed the whole Reaction module and therefore produced a harness infrastructure error instead of a semantic failure. The repaired negative preserved module loadability and changed only the reaction predicate. No permanent product gate was weakened.

Both failed runs also demonstrated fail propagation:

```text
Verify failure -> Required failure
```

This proves workflow graph propagation only; it does not prove repository enforcement.

## Shadow equivalence — complete

Qualifying successful runs:

```text
run 32637669371
  verifier = bdfcfdc5533a701fe5dd7624d1f928af2ec37c61
  Verify   = SUCCESS
  Required = SUCCESS

run 32637743955
  verifier = fbe326d07767a676c3835fb929dc9541e3efef0f
  Verify   = SUCCESS
  Required = SUCCESS
```

Each run checked both immutable positive identities:

```text
DEPLOYED_PRODUCTION
  source = 47969d24771f6cc188df6e32150fc6fde519182d

HISTORICAL_CORRECTION_CANDIDATE
  source = db14a61862c3730582ad102a70d109348b7e1cb7
```

For each positive identity:

```text
permanent CANDIDATE_SHADOW = PASS
legacy architecture        = PASS
legacy robust 1-25         = PASS
```

Resulting evidence diversity:

```text
positive records                    = 4
minimum required                    = 3
distinct verifier identities        = 2
minimum distinct verifier identities= 2
```

Mandatory negative parity:

```text
latest/install mismatch          legacy FAIL · permanent FAIL · LATEST_INSTALL_MISMATCH
forbidden architecture module    legacy FAIL · permanent FAIL · ARCH_CONTRACT_FAIL
COMMUNITY predicate broken       legacy FAIL · permanent FAIL · SEMANTIC_FAIL
terminal/stored mismatch #21     legacy/permanent expected INVALID_SOURCE
```

Canonical ledger:

```text
products/simcore/ci/shadow-equivalence.json
status = SHADOW_VERIFIED
openMismatchIds = []
permanentStrength = EQUIVALENT_OR_STRICTER_WITH_DURABLE_BATCH_A_PLUS_BOUNDED_LEGACY_COMPAT
```

No `PERMANENT_GATE_WEAKER` or `ASSERTION_STRENGTH_GAP` blocker remains open.

## Legacy validation authority migration

Canonical map:

```text
products/simcore/ci/legacy-gate-map.json
status = SHADOW_VERIFIED
```

Disposition:

```text
CHECK_ONLY_PREDECESSOR
  architecture contracts
  shadow status          = SHADOW_VERIFIED
  retirementEligibility  = YES
  physical retirement    = HELD_FOR_REQUIRED_ENFORCEMENT

MIXED_BUILD_VALIDATOR
  validation responsibility = VALIDATION_REPLACED
  build/write responsibility = RS2_4_PENDING
  normal invocation          = FORBIDDEN_AFTER_VALIDATION_REPLACEMENT

ADMIN_STATE_WRITER / RELEASE_WRITER
  write authority = outside RS2-3 retirement authority
```

The pure architecture predecessor is intentionally not physically removed before required-check enforcement, preserving the frozen no-authority-gap sequence.

## Temporary shadow infrastructure retirement

After shadow evidence became durable:

```text
.github/workflows/rs2-3-simcore-shadow-proof.yml      REMOVED
products/simcore/tooling/ci/rs2-3-shadow-proof.mjs  REMOVED
branch-specific shadow hook in check.mjs             REMOVED
```

No temporary proof collector remains in the permanent implementation.

## Permanent-only pre-merge proof

Final substantive implementation head before evidence-only close notes:

```text
branch head    = da0d231fa986df4f688952897f5738c7f852248c
workflow run   = 32638328493
Verify job     = 97191324976 / SUCCESS
Required job   = 97191357029 / SUCCESS
report artifact= 9492903249
report bytes   = 791
profile        = PR_MAIN
scope          = CI_SELF + HARNESS + SIMCORE_DOC_ONLY
production     = 47969d24771f6cc188df6e32150fc6fde519182d
```

Executed permanent gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

This run contains no temporary shadow hook or collector.

## Administrative enforcement blocker

Repository fact remains:

```text
main protected         = false
required status checks = off
```

The available repository connector exposes no branch-protection/ruleset mutation action.

Classification:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= BLOCKER / ADMINISTRATION / TOOL_SURFACE
```

This blocks only RS2-3E P4+ claims:

```text
REQUIRED_CI_ACTIVE = YES
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
PURE_CHECK_PREDECESSORS_RETIRED = YES
RS2_3_CLOSED = YES
RS2_4_ENTRY_AUTHORIZED = YES
```

It does not block installing permanent CI or reaching the frozen P3 `PROMOTION_READY` state.

## Current implementation conclusion

```text
RS2-3A topology implementation                 PASS
RS2-3B trigger/classifier/profile matrix       PASS
RS2-3C permission/artifact safety              PASS
RS2-3D responsibility map                      PASS
RS2-3D shadow equivalence                      PASS
RS2-3D negative parity                         PASS
legacy compatibility                           BOUNDED / TRANSITIONAL
permanent-only pre-merge CI                    PASS
runtime diff                                   NONE
release-simcore diff                           NONE
production deployment                          NONE
```

Next repository operation is additive installation of PR #151 into `main`, followed by canonical `MAIN_HEALTH` and a bounded `products/simcore/ci/RS2_3_STATUS.json` promotion-ready record. Required-check activation remains an explicit later administration step and must not be inferred from installation.
