# SimCore Release System v2.1 — A/B/C/D Qualification Evidence

Date: 2026-08-25
Status: **B/C/D QUALIFIED · E IMPLEMENTATION AUTHORIZED · NON-RUNTIME**

## Qualification purpose

This gate is the explicit boundary required before R2.1-E Exact Release Approval Consolidation may activate.

The frozen activation rule is:

```text
R2_1_B_C_D_QUALIFIED
→ only then may R2.1-E implementation begin
```

That gate is now satisfied.

## Composition qualification

A, B, C, and D were individually permanent-CI verified. The D final-head run first proved the composed implementation with B/C permanent suites and D deterministic state tests simultaneously present:

```text
run      32764634954
Verify   97551262418  PASS
Required 97551357191  PASS
```

The dedicated qualification PR then re-ran the current permanent verifier on merged A/B/C/D main:

```text
run      32764906669
Verify   97552076823  PASS
Required 97552211100  PASS
```

This is the durable activation evidence for E.

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

Machine-derived publication authority is still OFF. Qualification authorizes E implementation; it does not itself activate publication from spec shadows.

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

## Activation decision

```text
B qualified = YES
C qualified = YES
D qualified = YES
R2.1-E implementation = AUTHORIZED
machine spec publication authority = NOT YET ACTIVE
```

E must still prove that an approval cannot resolve a different C/P, and that NEW_VERSION / SAME_VERSION_CORRECTION / ROLLBACK machine spec representations resolve correctly before its authority can activate.

## Production safety

```text
runtime mutation = NONE
release-simcore mutation = NONE
current production = v0.64.7
human long-chat authority = unchanged
```
