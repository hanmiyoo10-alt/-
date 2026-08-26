# SimCore Broadcast Closure Permanent Fixture Expansion Plan — 2026-08-26

Status: `IMPLEMENTATION STARTED · EXTEND_EXISTING · FIXTURE-ONLY · NO RUNTIME CHANGE`

Design/evidence authority:
- `docs/SIMCORE_BROADCAST_FIXTURE_COVERAGE_GAP_AUDIT_2026-08-26.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`

Existing permanent family:
- `products/simcore/tests/suites/broadcast-closure.test.mjs`
- `products/simcore/tests/fixtures/broadcast-closure/cases.json`
- registry ID remains `broadcast-closure`

Implementation scope:
- keep the existing stable suite ID and HYBRID_TRANSITIONAL top-level coverage;
- add 7 Lifecycle.classifyMode controls for B_START/B_CONTINUE/B_END request classification and lock/episode request-phase facts;
- add 5 Time.commitBroadcastAirtime controls for B_START/B_CONTINUE/non-Broadcast airtime semantics;
- add 4 minimal Structure.validateStructure controls for B_START/B_CONTINUE COMMUNITY cardinality and non-terminal rules;
- retain the existing four B_END controls unchanged in authority;
- report subcoverage explicitly as lifecycle EXECUTABLE, airtime EXECUTABLE, structure EXECUTABLE, final-unlock HYBRID_TRANSITIONAL;
- preserve `missingExecutableSurface = B_END_STATE_COMMIT_AND_UNLOCK`.

Frozen added case groups:

```text
Lifecycle classification     = 7
Airtime                       = 5
Open-broadcast structure      = 4
Existing B_END controls       = 4 retained
```

Forbidden in this work item:
- new suite or registry ID;
- plugin/runtime source change;
- version bump;
- `release-simcore` mutation;
- fixture schema / harness / CI topology redesign;
- copying output-finalization unlock logic into tests;
- Frame, Narrative clock, reaction grammar, representation/edit-reconcile expansion.

Required validation:
- dedicated work branch;
- only existing broadcast-closure suite/fixture files modified;
- permanent SimCore CI Verify + Required PASS;
- GATE_CI_SELF, GATE_STATIC, GATE_ARCH, GATE_REGRESSION PASS against materialized release-simcore production source;
- main implementation evidence/progress sync after merge.

Implementation sequence:

```text
main plan record
→ work/broadcast-closure-permanent-expansion
→ expand existing fixture + suite only
→ PR permanent CI
→ squash merge on PASS
→ main evidence/progress sync
```
