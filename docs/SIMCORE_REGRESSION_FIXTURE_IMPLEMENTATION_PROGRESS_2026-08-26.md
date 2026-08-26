# SimCore Permanent Regression Fixture — Implementation Progress — 2026-08-26

Status: `CURRENT IMPLEMENTATION PROGRESS AUTHORITY · SUMMARY-SCOPE + NARRATIVE-CLOCK COMPLETE · NO RUNTIME CHANGE`

Research/design authority:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`

Implementation evidence:
- `docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_IMPLEMENTATION_EVIDENCE_2026-08-26.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_IMPLEMENTATION_EVIDENCE_2026-08-26.md`

Purpose: track implementation progress for the already-frozen permanent regression expansion portfolio without rewriting the point-in-time research/design documents.

## 1. Frozen portfolio

Canonical order:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure expansion
```

One family/extension is implemented per bounded work item.
Do not bundle the portfolio into one change.

## 2. Current status

```text
summary-scope
= IMPLEMENTED
= EXECUTABLE
= required true
= goldenGate true
= PR #425
= main merge b912baf4d84ab95da2c1668da0b4be898d6d5d2f
= SimCore CI 32919448279 Verify PASS / Required PASS

narrative-clock
= IMPLEMENTED
= EXECUTABLE
= required true
= goldenGate true
= 13 frozen cases
= PR #427
= main merge c7aaa8f72c1920a2d2abf0b81a05bc8607ffed5c
= SimCore CI 32919972593 Verify PASS / Required PASS

frame
= DESIGN FROZEN
= IMPLEMENTATION READY
= NEXT

broadcast-closure expansion
= FROZEN EXTEND_EXISTING decision
= PENDING
```

## 3. Current permanent registry consequence

Before this expansion portfolio the permanent registry contained nine required golden-gate suites.

After the first two implementations:

```text
required permanent suites = 11
new stable suite ids       = summary-scope, narrative-clock
coverage                   = EXECUTABLE for both
```

No second harness was created.

## 4. Evidence maturity reminder

`summary-scope` deterministic regression maturity is permanent/executable, while its dedicated natural semantic close remains separately classified:

```text
CONTRACT_ESTABLISHED
NATURAL_SEMANTIC_CLOSE = VALIDATION_ONLY
```

`narrative-clock` preserves mixed evidence maturity:

```text
Current Timeline deterministic contract = ESTABLISHED
Narrative Tail deterministic contract    = ESTABLISHED
explicit flashback natural close         = VALIDATION_ONLY
post-B_END first-C natural close          = DIRECT_LIVE_CONTROL
```

Do not promote live-evidence maturity from CI success alone.

The remaining fixture families retain the evidence maturity recorded in their frozen design documents until their own implementation/evidence work changes it.

## 5. Separate M2-3 migrations

The following remain outside this four-item expansion sequence:

```text
representation-fast HYBRID_TRANSITIONAL → EXECUTABLE
genuine-edit        HYBRID_TRANSITIONAL → EXECUTABLE
```

They remain gated by the future M2-3 direct application-service ownership boundary.

`broadcast-closure` final unlock HYBRID state also remains an ownership/exposure question; the current portfolio item expands the already-executable lifecycle/airtime/Structure coverage without copying orchestration into tests.

## 6. Production boundary

Current production remains:

```text
SimCore v0.64.7
release-simcore commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob           = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
live gate              = PENDING_REAL_LONG_CHAT
```

Fixture implementation effect:

```text
PLUGIN BYTES         = UNCHANGED
PLUGIN VERSION       = UNCHANGED
latest.js/install.js = UNCHANGED
release-simcore      = UNCHANGED
RUNTIME SEMANTICS    = UNCHANGED
```

## 7. Next operation

```text
NEXT PERMANENT FIXTURE WORK
= frame
```

Use its frozen design as authority and perform it as a separate work branch / PR / permanent-CI / main-evidence transaction.
