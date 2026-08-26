# SimCore Frame Permanent Fixture Implementation Plan — 2026-08-26

Status: `IMPLEMENTATION STARTED · FIXTURE-ONLY · NO RUNTIME CHANGE`

Design authority:
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`

Implementation scope:
- add stable permanent suite `frame`;
- add one grouped frozen 20-case fixture;
- register as `EXECUTABLE`, `required`, `goldenGate=true`;
- execute current production `frame` and `structure` owners only through the existing permanent harness;
- preserve owner split between Frame continuity/repair and Structure frame-envelope shape;
- preserve v0.64.5 `CHATINDEX_SAME` as direct-live provenance without asserting reader-facing diagnostic wording.

Frozen case groups:

```text
A Frame parsing/capture = 3
B Frame continuity      = 10
C Structure envelope    = 7
TOTAL                    = 20
```

Forbidden in this work item:
- plugin/runtime source change;
- version bump;
- `release-simcore` mutation;
- fixture schema redesign;
- harness/CI topology redesign;
- Narrative clock semantics;
- Broadcast closure expansion;
- COMMUNITY/Knowledge/output-generation judging.

Required validation:
- dedicated work branch;
- exact frozen 20-case count;
- SimCore permanent CI `Verify` + `Required` PASS;
- proposed `GATE_CI_SELF`, `GATE_STATIC`, `GATE_ARCH`, `GATE_REGRESSION` PASS against materialized `release-simcore` source;
- main implementation evidence/progress sync after merge.

Implementation sequence:

```text
main plan record
→ work/frame-permanent-fixture
→ suite + fixture + registry only
→ PR permanent CI
→ squash merge on PASS
→ main evidence/progress sync
```
