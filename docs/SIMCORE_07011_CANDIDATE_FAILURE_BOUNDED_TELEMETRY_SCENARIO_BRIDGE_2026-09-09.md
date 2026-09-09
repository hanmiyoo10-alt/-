# SimCore v0.70.11 Candidate Failure — Bounded Telemetry Scenario Bridge

Date: 2026-09-09 KST
Status: **FIX · VALIDATION BRIDGE · NONRUNTIME · CANDIDATE HOLD**
Tracking: `#1657`, `#1941`, candidate PR `#1702`

## 1. Trigger

Resumption of the already-open v0.70.11 candidate request exposed that its original SimCore CI had failed and had never qualified for merge.

Exact failed run:

```text
SimCore CI = 34017396513
head = eb53c5ab801f3a62bfec9f6070d323ce5759b47b
profile = PR_MAIN
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
GATE_PR1_DRY = FAIL
reason = PR1_DRY_QUALIFICATION_FAIL
production = ecc55f026315c6482c34d267aba2adb97527cdbc
production mutation = NONE
```

Exact candidate-regression failure:

```text
bounded-telemetry-capsule: v0.64.11 source marker missing scenario: '06411_BOUNDED_CAPSULE_HOST_LOCAL_RELOAD_CONTINUITY_REAL_LONG_CHAT'
```

## 2. Causal chain

v0.70.11 intentionally replaces the entire `OPERATOR_RELEASE_CARD`, including the live scenario:

```text
07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
```

The bounded-telemetry semantic contract itself does not change. Its v0.70.11 profile therefore inherits frozen behavior from v0.69.2.

The inherited semantic chain eventually delegates to the v0.64.11 bounded-capsule authority. That historical suite includes the then-current operator-card scenario among its source freeze markers. Historical version bridges normalized operator scenarios whenever those scenarios changed. Releases after v0.69.0 retained the same 06900 card body, so no newer scenario bridge was needed until v0.70.11.

Therefore:

```text
ROOT_CAUSE = BOUNDED_TELEMETRY_VALIDATION_BRIDGE_OMITS_INTENTIONAL_07011_CARD_SCENARIO_NORMALIZATION
BOUNDED_TELEMETRY_RUNTIME_REGRESSION = NOT SUPPORTED
V07011_OPERATOR_CARD_IMPLEMENTATION_ERROR = NOT SUPPORTED
RELEASE_SYSTEM_PUBLICATION_ERROR = NOT REACHED
```

## 3. Classification

```text
CLASSIFICATION = FIX / VALIDATION BRIDGE / NONRUNTIME
V07011_IMPLEMENTATION = KEEP
V07011_DESIGN = KEEP
RELEASE_SIMCORE = UNCHANGED / 0.70.10
CANDIDATE_PR_1702 = HOLD / FAILED QUALIFICATION
```

## 4. Repair boundary

Use the smallest explicit validation-only compatibility bridge.

Required behavior:

1. keep v0.70.11 bounded-telemetry contract as `INHERIT_BEHAVIOR` from the frozen authority;
2. before delegation, normalize only the release metadata already normalized by R2.9 plus the explicitly irrelevant v0.70.11 operator-card scenario back to the historical scenario expected by the frozen chain;
3. fail closed if the expected current scenario marker is absent or ambiguous;
4. add permanent executable coverage that materializes the real v0.70.11 candidate from production and runs the active bounded-telemetry projection against it;
5. do not mutate plugin runtime source, release-simcore, candidate publication rules, storage/network/timers/schema, or #1660 behavior.

Forbidden alternatives:

```text
adding a historical fake scenario marker to production runtime source
weakening/removing the frozen bounded-capsule assertions
claiming bounded telemetry changed contract semantics
broad release-system restructuring
blind scenario replacement without exact release/contract ownership
```

## 5. Transaction rule

This is a prerequisite transaction distinct from the v0.70.11 runtime-source feature implementation.

```text
durable failure record
→ dedicated validation prerequisite branch
→ static + SimCore CI
→ merge prerequisite to main
→ close #1941 only after exact merged-main health/readback
→ retire failed candidate PR #1702 as failed historical intent
→ create fresh v0.70.11 candidate intent from then-current main
```

The failed intent must not be retroactively treated as qualified.
