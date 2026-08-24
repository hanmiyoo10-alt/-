# SimCore Release System v2.1 — A/B/C/D Qualification Evidence

Date: 2026-08-25
Status: **QUALIFICATION ACTIVE · PENDING PERMANENT CI · NON-RUNTIME**

## Qualification purpose

This gate is the explicit boundary required before R2.1-E Exact Release Approval Consolidation may activate.

The frozen activation rule is:

```text
R2_1_B_C_D_QUALIFIED
→ only then may R2.1-E implementation begin
```

## Why this is a composition qualification

A, B, C, and D were already implemented and individually permanent-CI verified on separate branches. The D final-head permanent CI run `32764634954` executed with the current B/C permanent suites and D deterministic post-publish tests simultaneously present:

```text
Verify   97551262418  PASS
Required 97551357191  PASS
```

Therefore this qualification does not invent a parallel verification stack. Instead, the machine status file `products/simcore/releases/R_V2_1_QUALIFICATION_STATUS.json` is itself classified as SimCore CI/HARNESS state. Its PR must pass the current permanent verifier again on top of merged A/B/C/D main.

That second full-composition PASS is the activation evidence for E.

## Qualified units

### A — one-shot retirement

- version-specific v0.64.7 candidate workflows are absent from durable main;
- historical evidence remains;
- no production mutation occurred.

### B — generic candidate controller

Permanent suite covers:

```text
build from immutable S against exact P
candidate direct child
latest/install equality
exact-existing retry = ALREADY_MATERIALIZED/PASS
conflicting candidate = BLOCK
candidate lane has no production publisher
```

### C — machine receipt / spec shadow

Permanent suite covers:

```text
machine P/S/C/blob/ref/verifier/report digest
NEW_VERSION
SAME_VERSION_CORRECTION
ROLLBACK
release-id mismatch block
historical v0.64.7 semantic equivalence
```

Machine-derived specs remain `SHADOW_ONLY` until E explicitly changes authority.

### D — LIVE_PENDING state convergence

Permanent state tests cover:

```text
observed production identity
current_priority = liveScenarioId
deterministic state receipt
exact replay = ALREADY_CONVERGED
newer production = BLOCK
missing live gate = BLOCK
conflicting receipt = BLOCK
recovery cannot publish
```

## Production safety

Qualification is read-only with respect to production:

```text
runtime mutation = NONE
release-simcore mutation = NONE
current production = v0.64.7
human long-chat authority = unchanged
```

R2.1-E implementation remains unauthorized until this branch receives permanent Verify/Required PASS and the qualification status is promoted to `B_C_D_QUALIFIED`.
