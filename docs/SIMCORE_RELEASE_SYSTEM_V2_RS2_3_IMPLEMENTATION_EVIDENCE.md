# SimCore Release System v2 — RS2-3 Permanent CI Implementation Evidence

Date: 2026-08-23
Status: **IMPLEMENTING · NON-RUNTIME**
Phase: `RS2-3 — Permanent CI`
Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_PERMISSIONS_CONCURRENCY_REPORT_ARTIFACT_SAFETY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3D_SHADOW_EQUIVALENCE_LEGACY_GATE_RETIREMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`

## Entry authority

```text
implementation base main = 1dcf86a8af4ba3feb3a17d5a1817da647ce6137e
RS2-2 phase            = CLOSED
RS2-3 entry authorized = YES
release-simcore        = 47969d24771f6cc188df6e32150fc6fde519182d
production version     = 0.64.6
production blob        = 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

`release-simcore` is read-only input to this work item. No runtime/plugin source mutation is authorized.

## Scope lock

Allowed:

```text
.github/workflows/simcore-ci.yml
products/simcore/ci/**
products/simcore/tooling/check.mjs
products/simcore/tooling/ci/**
permanent-harness enrollment needed to preserve existing verification strength
RS2-3 implementation / shadow / promotion evidence
pure check-only predecessor retirement only after its frozen parity gate is satisfied
```

Forbidden:

```text
plugins/simcore/latest.js mutation
plugins/simcore/install.js mutation
release-simcore mutation
runtime semantic change
product-manifest repair by CI
sync-state --write from permanent CI
repo-main-write.py from permanent CI
repository ref mutation by permanent CI
release transaction replacement
RS2-4 implementation
```

## Entry administration evidence

At implementation start, GitHub reports:

```text
main protected = false
required status checks = off
```

The available repository connector exposes no branch-protection or repository-ruleset mutation action.

Classification:

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= BLOCKER / ADMINISTRATION / TOOL_SURFACE
```

This does **not** block installing and shadow-verifying permanent read-only CI. It blocks only the RS2-3E claims that require actual repository enforcement:

```text
REQUIRED_CI_ACTIVE = YES
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
RS2_3_CLOSED = YES
RS2_4_ENTRY_AUTHORIZED = YES
```

The implementation therefore proceeds through the frozen `PROMOTION_READY` boundary and must not fabricate enforcement evidence.

## Permanent action pins selected

```text
actions/checkout   = 11d5960a326750d5838078e36cf38b85af677262
actions/setup-node = 49933ea5288caeca8642d1e84afbd3f7d6820020
actions/setup-python = a26af69be951a213d495a4c3e4e4022e16d87065
actions/upload-artifact = ea165f8d65b6e75b540449e92b4886f43607fa02
```

All permanent workflow external actions must remain full-SHA pinned.

## Required implementation outcomes before PROMOTION_READY

```text
permanent workflow installed                      PASS required
contents:read / no secrets / no writes            PASS required
PR classifier + explicit NOOP                      PASS required
MAIN_HEALTH full baseline                          PASS required
immutable candidate profiles                       PASS required
Batch A permanent regression                       PASS required
architecture/static gate                           PASS required
RS2-2 sync-state --check                           PASS required
legacy responsibility map complete                 PASS required
bounded legacy-compat ownership                    PASS required
3 positive shadows / diversity rules               PASS required
mandatory negative parity                          PASS required
no PERMANENT_GATE_WEAKER                           PASS required
runtime diff                                        NONE required
release-simcore diff                                NONE required
```

## Permanent CI first execution

Implementation PR: `#151`

```text
workflow       = SimCore CI
run            = 32637087508
Verify job     = 97188369974 / SUCCESS
Required job   = 97188394793 / SUCCESS
profile        = PR_MAIN
scope          = CI_SELF + HARNESS + SIMCORE_DOC_ONLY
production     = 47969d24771f6cc188df6e32150fc6fde519182d
source sha256  = 1f07668f418faf0029c37409c31545f146c27592ac37eff39fea8cdd0e599aac
Node           = 22.23
Python         = 3.12
report artifact= 9492595979
```

Executed permanent gates:

```text
GATE_CI_SELF    PASS
GATE_STATIC     PASS
GATE_ARCH       PASS
GATE_REGRESSION PASS
```

The base branch had no permanent predecessor verifier, so the current-trusted-lane step correctly recorded an initial-install condition rather than inventing a base permanent result.

The stable GitHub job name `Required` is operational. Repository enforcement is still inactive and is not inferred from the successful check.

## Validation record

Permanent PR execution: **PASS**.
Shadow equivalence and negative parity: **COLLECTING**.
