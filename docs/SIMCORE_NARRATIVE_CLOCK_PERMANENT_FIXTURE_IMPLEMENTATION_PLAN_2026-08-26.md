# SimCore Narrative Clock Permanent Fixture Implementation Plan — 2026-08-26

Status: `IMPLEMENTATION STARTED · FIXTURE-ONLY · NO RUNTIME CHANGE`

Design authority:
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`

Implementation scope:
- add `narrative-clock` permanent suite;
- add one grouped 13-case fixture;
- register as `EXECUTABLE`, `required`, `goldenGate=true`;
- execute only current production Time/Lifecycle exports through the existing permanent harness;
- preserve mixed evidence maturity, including explicit-flashback natural close as `VALIDATION_ONLY`.

Forbidden in this work item:
- plugin/runtime source change;
- version bump;
- `release-simcore` mutation;
- fixture schema redesign;
- harness/CI topology redesign;
- Frame or Broadcast-closure contract expansion.

Required validation:
- dedicated PR branch;
- SimCore permanent CI `Verify` + `Required` PASS;
- `GATE_CI_SELF`, `GATE_STATIC`, `GATE_ARCH`, `GATE_REGRESSION` PASS against materialized `release-simcore` production source;
- main implementation evidence/progress sync after merge.
