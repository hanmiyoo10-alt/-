# SimCore v0.70.11 Candidate Failure — R2.9 Changed-Contract Projection Boundary

Date: 2026-09-09 KST
Status: **FIX · VALIDATION SELF-TEST · NONRUNTIME · CANDIDATE HOLD**
Tracking: `#1657`, `#1945`, failed candidate PR `#1944`

## 1. Trigger

After prerequisite FIX `#1941` was merged and exact merged-main SimCore CI passed, a fresh immutable candidate request was created:

```text
intent = simcore-v0.70.11-intent-02
release = simcore-v0.70.11-new-02
PR = #1944
head = ee35685a67574b34cf30b22c5711e762d8d667ec
expected production = ecc55f026315c6482c34d267aba2adb97527cdbc
```

Candidate dry qualification still failed closed:

```text
SimCore CI = 34313738056
profile = PR_MAIN
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
GATE_PR1_DRY = FAIL
reason = PR1_DRY_QUALIFICATION_FAIL
production mutation = NONE
```

Exact assertion:

```text
release-system-r2-9-validation-contract-projection:
v0.69.0 scenario count: expected=1 actual=0
```

The proposed permanent verifier passed, so the previously repaired bounded-telemetry bridge was not the failing owner.

## 2. Causal inspection

`release-system-r2-9-validation-contract-projection.test.mjs` contains an inventory projection loop that synthesizes every historical validation profile from the active runtime source.

Its current projection helper rewrites only release identity surfaces:

```text
userscript metadata version
SIMCORE_RUNTIME_VERSION
HOST_COMPAT_VERSION
OPERATOR_RELEASE_CARD version/name
```

It then executes all active contracts against that synthetic historical identity.

That projection was coherent while later releases retained the historical operator-card body. It becomes invalid at v0.70.11 because the release intentionally changes the whole operator-card contract:

```text
0.70.11 operator-release-card.mode = CHANGED_CONTRACT
0.70.11 card scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
historical 0.69.0 card scenario = 06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT
```

Projecting only the version/name backward therefore creates an impossible hybrid:

```text
v0.69.0 identity
+
v0.70.11 changed-contract card body
```

Historical v0.69.0 validation correctly rejects that impossible synthetic source.

## 3. Frozen interpretation

```text
RUNTIME_REGRESSION = NOT SUPPORTED
V07011_OPERATOR_CARD_IMPLEMENTATION = KEEP
#1941_BOUNDED_BRIDGE = KEEP / PROVEN
R2_9_HISTORICAL_PROJECTION_ASSUMPTION = INVALID ACROSS CHANGED_CONTRACT BOUNDARY
CANDIDATE_INTENT_02 = FAILED IMMUTABLE ATTEMPT / DO NOT REUSE
```

## 4. Repair contract

The inventory projection test must become contract-aware without weakening current or historical validation.

Required behavior:

1. exact active source still executes all required contracts;
2. historical identity projection may execute a contract only when its semantic contract remains projectable from the active source under the existing identity projection model;
3. `operator-release-card` must not be backward-synthesized across a `CHANGED_CONTRACT` boundary using version/name-only rewriting;
4. historical operator-card behavior remains covered by its dedicated historical wrapper suites and profile topology checks;
5. exact current v0.70.11 `CHANGED_CONTRACT` operator-card remains executed through the active R2.9 route and the dedicated changed-contract regression;
6. all other projectable contracts continue to run over inventory-projected versions;
7. the test must explicitly assert that skipping an impossible cross-boundary operator projection is intentional and contract-derived, not a blanket omission;
8. future synthetic-profile controls must retain their existing purpose and fail-closed invariants.

## 5. Preferred implementation shape

Keep the change inside the R2.9 projection self-test rather than altering runtime or release profiles.

Introduce a small contract-projection predicate driven by source and target profile contract modes, for example:

```text
source operator mode = CHANGED_CONTRACT
and target operator authority/behavior is historical
=> operator-release-card backward identity projection = NOT_PROJECTABLE
```

Then the historical inventory loop should execute:

```text
all projectable contracts
+ explicit PASS assertion for the non-projectable changed-contract boundary
```

It must not reconstruct a fake historical card body and must not hide failures for contracts that are still projectable.

## 6. Forbidden alternatives

```text
putting 06900 historical card content back into v0.70.11 runtime
weakening historical v0.69.0 operator assertions
changing the v0.70.11 validation profile away from CHANGED_CONTRACT
skipping every historical contract projection
changing publication/release-controller behavior
mixing #1660 output hygiene work
```

## 7. Transaction sequence

```text
this design/evidence record
→ dedicated validation-test branch
→ permanent executable regression / CI
→ main merge
→ exact merged-main health
→ close #1945
→ create fresh candidate intent-03 from current main
```

Failed candidate intent-02 remains historical evidence and is not amendable into a passing candidate.
