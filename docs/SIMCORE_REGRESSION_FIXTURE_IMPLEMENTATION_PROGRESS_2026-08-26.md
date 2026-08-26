# SimCore Permanent Regression Fixture — Implementation Progress — 2026-08-26

Status: `CURRENT IMPLEMENTATION PROGRESS AUTHORITY · FOUR-ITEM EXPANSION PORTFOLIO COMPLETE · NO RUNTIME CHANGE`

Research/design authority:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_BROADCAST_FIXTURE_COVERAGE_GAP_AUDIT_2026-08-26.md`

Implementation evidence:
- `docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_IMPLEMENTATION_EVIDENCE_2026-08-26.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_IMPLEMENTATION_EVIDENCE_2026-08-26.md`
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_IMPLEMENTATION_EVIDENCE_2026-08-26.md`
- `docs/SIMCORE_BROADCAST_CLOSURE_PERMANENT_FIXTURE_EXPANSION_EVIDENCE_2026-08-26.md`

Purpose: track implementation progress for the already-frozen permanent regression expansion portfolio without rewriting the point-in-time research/design documents.

## 1. Frozen portfolio

Canonical order:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure expansion
```

One family/extension was implemented per bounded work item.
The four-item expansion portfolio is now complete.

## 2. Current status

```text
summary-scope
= IMPLEMENTED
= EXECUTABLE
= required true
= goldenGate true
= 9 frozen cases
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
= IMPLEMENTED
= EXECUTABLE
= required true
= goldenGate true
= 20 frozen cases
= PR #429
= main merge 9b58a01b13f72224a1aa57da9cc4708119ac8db5
= SimCore CI 32920570077 Verify PASS / Required PASS

broadcast-closure expansion
= IMPLEMENTED / EXTEND_EXISTING
= stable suite id broadcast-closure
= top-level HYBRID_TRANSITIONAL
= required true
= goldenGate true
= 20 assertions total
= lifecycle subcoverage EXECUTABLE
= airtime subcoverage EXECUTABLE
= structure subcoverage EXECUTABLE
= finalUnlock subcoverage HYBRID_TRANSITIONAL
= missing executable surface B_END_STATE_COMMIT_AND_UNLOCK
= PR #432
= main merge b6e066eafd926a169d51384ef43cb3ab92ff658f
= SimCore CI 32921116326 Verify PASS / Required PASS
```

## 3. Current permanent registry consequence

Before this expansion portfolio the permanent registry contained nine required golden-gate suites.

The first three work items added new stable suite IDs:

```text
summary-scope
narrative-clock
frame
```

The fourth work item extended the already-existing `broadcast-closure` suite and therefore did not add a registry row.

Current result:

```text
required permanent suites = 12
new stable suite ids       = summary-scope, narrative-clock, frame
broadcast-closure          = existing stable ID, expanded in place
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

`frame` preserves its owner/evidence split:

```text
Frame deterministic continuity = ESTABLISHED
CHATINDEX_SAME repair           = DIRECT_LIVE_CONTROL / v0.64.5
Structure frame envelope        = GOLDEN_CONTRACT / EXECUTABLE
```

`broadcast-closure` preserves mixed executable/hybrid ownership honesty:

```text
Lifecycle classification = EXECUTABLE
Broadcast airtime        = EXECUTABLE
Broadcast Structure      = EXECUTABLE
B_END final unlock       = HYBRID_TRANSITIONAL
```

Do not promote live-evidence maturity from CI success alone.
Do not relabel the whole `broadcast-closure` suite EXECUTABLE until the real output-finalization/state-application owner is directly exercisable.

## 5. Separate M2-3 migrations

The following remain outside this completed four-item expansion portfolio:

```text
representation-fast HYBRID_TRANSITIONAL → EXECUTABLE
genuine-edit        HYBRID_TRANSITIONAL → EXECUTABLE
```

They remain gated by the future M2-3 direct application-service ownership boundary.

`broadcast-closure` final unlock promotion also remains a future ownership/exposure question; production code must not be moved solely for test convenience.

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

## 7. Portfolio closure

```text
FOUR-ITEM PERMANENT FIXTURE EXPANSION PORTFOLIO
= COMPLETE

summary-scope               = DONE
narrative-clock             = DONE
frame                       = DONE
broadcast-closure expansion = DONE

NEXT WORK FROM THIS PORTFOLIO
= NONE
```

Future fixture promotions triggered by M2 ownership work are separate incremental work items, not unfinished work in this portfolio.
