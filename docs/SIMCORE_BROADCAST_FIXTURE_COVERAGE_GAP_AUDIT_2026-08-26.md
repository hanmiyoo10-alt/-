# SimCore Broadcast Fixture Coverage Gap Audit — 2026-08-26

Status: `AUDIT COMPLETE · EXTEND EXISTING broadcast-closure · NO NEW SUITE · MIXED EXECUTABLE/HYBRID COVERAGE · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7
Production release commit: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Main at audit start: `40c98bda4603fa8b5e37ef1da5d68c95b089a646`

Related:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_LIVE_06403_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_LIVE_06405_VALIDATION.md`
- `docs/SIMCORE_LIVE_06406_VALIDATION.md`
- `products/simcore/tests/suites/broadcast-closure.test.mjs`
- `products/simcore/tests/fixtures/broadcast-closure/cases.json`
- `products/simcore/tests/registry.mjs`

## 1. Audit question

Determine whether the current permanent `broadcast-closure` suite should:

```text
A. remain B_END-only,
B. be extended to cover the complete Broadcast lifecycle family,
or
C. be supplemented by a new broadcast-lifecycle suite.
```

Decision:

```text
EXTEND_EXISTING
NO_NEW_SUITE
```

The stable suite ID remains:

```text
broadcast-closure
```

but its contract description should become:

```text
Broadcast lifecycle + airtime + B_END closure regression family
```

The historical ID is retained for registry stability. A rename is not required merely because the permanent family gains B_START/B_CONTINUE controls.

## 2. Current permanent coverage

The current suite is strongly B_END-centric.

It directly executes:

```text
Time.commitBroadcastAirtime
Structure.validateStructure
```

for:

```text
B_END explicit terminal commit
B_END non-monotonic fail-closed
B_END valid structure
B_END quarantined structure independent of terminal-time parsing
```

It also keeps bounded source-binding guards for B_END diagnostic wiring.

Current coverage state:

```text
HYBRID_TRANSITIONAL
missingExecutableSurface = B_END_STATE_COMMIT_AND_UNLOCK
```

The suite currently contains no direct permanent cases for:

```text
B_START classification / lock acquisition
B_CONTINUE implicit locked continuation
B_CONTINUE explicit continuation
premature/unlocked B_END rejection behavior
Broadcast episode increment
B_START/B_CONTINUE airtime monotonicity
B_START/B_CONTINUE one-COMMUNITY structural expectation
B_START/B_CONTINUE non-terminal contract
```

This is a meaningful coverage gap because natural long-chat evidence already contains healthy B_START/B_CONTINUE/B_END sequences.

## 3. Production ownership map

### Lifecycle owns request classification

Current `Lifecycle.classifyMode(state, input)` is exported and directly executable.

Current bounded semantics include:

```text
if broadcastLocked:
  [방송 중] present
  → B_CONTINUE

  else [방송 종료] present
  → B_END

  else
  → B_CONTINUE

if not locked:
  [방송 시작] + [방송 종료]
  → B_END
  → broadcastLocked true
  → episodeNo +1

  [방송 시작]
  → B_START
  → broadcastLocked true
  → episodeNo +1

  [커뮤니티]
  → C

  otherwise
  → A
```

Important current precedence:

```text
locked + both [방송 중] and [방송 종료]
→ B_CONTINUE
```

because the locked branch checks continuation before end.

This is a current product contract, not an aspirational redesign. A fixture may preserve it unless a later explicit semantic change is approved.

### Time owns Broadcast airtime parsing/commit

Current `Time.commitBroadcastAirtime(state, pending, content)` is directly executable.

For B_START/B_CONTINUE:

```text
first canonical timestamp
→ current broadcast airtime candidate
→ cannot move backward from previous airtime
```

For B_END:

```text
explicit monotonic terminal timestamp sequence
→ last canonical timestamp may become terminal airtime

invalid/non-monotonic terminal sequence
→ no arbitrary prose-time inference
→ fail closed under the existing previous-airtime floor
```

### Structure owns output contract judging

Current `Structure.validateStructure(content, pending)` is directly executable.

Relevant Broadcast expectations:

```text
B_START    → 1 COMMUNITY block
B_CONTINUE → 1 COMMUNITY block
B_END      → 2 COMMUNITY blocks
```

and open B_START/B_CONTINUE responses reject visible terminal/end expressions.

Structure remains judge-only. It does not unlock Broadcast state and does not repair lifecycle state.

### Output/session orchestration owns final B_END unlock

The current output finalization path contains:

```text
if (p.mode === 'B_END') state.broadcastLocked = false
```

inside `finalizePreparedOutput(...)`.

That helper is not currently a clean exported application-service surface for the permanent harness.

Therefore final B_END state commit/unlock remains the existing:

```text
HYBRID_TRANSITIONAL
```

coverage gap.

Do not copy `finalizePreparedOutput` logic into the test suite merely to claim executable coverage.

## 4. Natural evidence already justifies lifecycle regression protection

### v0.64.3 natural sequence

Preserved sequence:

```text
B_START    @2084→2085
B_CONTINUE @2086→2087
B_CONTINUE @2088→2089
B_END      @2090→2091
C          @2092→2093
```

Observed healthy controls included:

```text
B_START → Stored broadcast LOCKED
B_CONTINUE → Stored broadcast LOCKED / airtime advanced
B_END → end authority ALLOWED / explicit terminal / Stored broadcast UNLOCKED
```

The sequence also contains an expected Frame repair and unrelated COMMUNITY warning family; those remain owned by their own fixture families.

### v0.64.6 natural sequence

Preserved sequence:

```text
B_START
→ four B_CONTINUE turns
→ B_END
→ immediate C
→ second C
```

All fully exercised B_CONTINUE turns reported:

```text
ACTIVE / COMMITTED
Frame PASS
Warnings 0
```

B_END closed with:

```text
Broadcast closure COMPLETE
terminal EXPLICIT
structure PASS
stored terminal == visible terminal
Stored broadcast UNLOCKED
```

This is sufficient natural evidence to justify permanent lifecycle controls without manufacturing a new semantic design.

## 5. Coverage decision

Canonical decision:

```text
broadcast-closure stable suite
→ EXTEND_EXISTING

new broadcast-lifecycle suite
→ NOT JUSTIFIED
```

Reason:

```text
same product family
+ same Lifecycle/Time/Structure owners
+ same natural B sequence provenance
+ no materially different harness adapter required
```

Creating both:

```text
broadcast-closure
broadcast-lifecycle
```

would duplicate owner calls and create ambiguity about which suite is authoritative for B_END classification/airtime boundaries.

## 6. Proposed permanent sub-families

Keep one suite with three bounded sub-families.

```text
BROADCAST_MODE_LIFECYCLE
BROADCAST_AIRTIME
BROADCAST_END_CLOSURE
```

### A. BROADCAST_MODE_LIFECYCLE

Owner:

```text
Lifecycle.classifyMode
```

Coverage state:

```text
EXECUTABLE
```

### B. BROADCAST_AIRTIME

Owner:

```text
Time.commitBroadcastAirtime
```

Coverage state:

```text
EXECUTABLE
```

### C. BROADCAST_END_CLOSURE

Owners consumed:

```text
Time
Structure
output/session orchestration
```

Coverage state:

```text
HYBRID_TRANSITIONAL
```

until final unlock/state application has a clean executable owner surface.

The suite may therefore continue to report top-level:

```text
HYBRID_TRANSITIONAL
```

while explicitly reporting sub-family coverage so the executable B_START/B_CONTINUE gains are not hidden.

## 7. Required lifecycle case matrix

### L1 — `broadcast-start-acquires-lock`

Initial state:

```text
broadcastLocked false
episodeNo 4
```

Input:

```text
[방송 시작]
```

Expected:

```text
mode B_START
wasLocked false
state.broadcastLocked true
state.episodeNo 5
```

Purpose:

```text
protect normal Broadcast acquisition
```

### L2 — `locked-explicit-continue`

Initial state:

```text
broadcastLocked true
```

Input:

```text
[방송 중]
```

Expected:

```text
B_CONTINUE
wasLocked true
```

### L3 — `locked-implicit-continue`

Initial state:

```text
broadcastLocked true
```

Input contains no Broadcast control tag.

Expected:

```text
B_CONTINUE
```

Purpose:

```text
protect persistent locked-broadcast continuation semantics
```

### L4 — `locked-explicit-end`

Initial state:

```text
broadcastLocked true
```

Input:

```text
[방송 종료]
```

Expected request classification:

```text
B_END
```

Important:

```text
classifyMode itself does not unlock state
```

Final unlock is an output-finalization responsibility.

### L5 — `unlocked-end-alone-not-b-end`

Initial state:

```text
broadcastLocked false
```

Input:

```text
[방송 종료]
```

Expected current production classification:

```text
A
```

Purpose:

```text
protect against fabricating an end lifecycle when no Broadcast is locked
```

This is a deterministic classification control, not a claim about human-facing diagnostic wording.

### L6 — `single-request-start-and-end`

Initial state:

```text
broadcastLocked false
```

Input contains both start and end tags.

Expected current production request facts:

```text
mode B_END
broadcastLocked true during request phase
episodeNo +1
```

Final unlock remains output-phase behavior.

### L7 — `locked-continue-precedes-end`

Initial state:

```text
broadcastLocked true
```

Input contains both:

```text
[방송 중]
[방송 종료]
```

Expected current production classification:

```text
B_CONTINUE
```

Purpose:

```text
freeze current locked-branch precedence
```

If product policy later changes, update through an explicit semantic-contract change rather than silently changing the fixture.

## 8. Required airtime case matrix

### T1 — `b-start-first-airtime-commit`

Pending:

```text
mode B_START
broadcastAirtimeIsNew true
```

Content begins with one valid canonical timestamp.

Expected:

```text
state.broadcastAirtime = current timestamp
state.broadcastAirtimeStart = current timestamp
reason committed
```

### T2 — `b-continue-forward-airtime`

Previous airtime exists and current canonical frame is later.

Expected:

```text
airtime advances
```

### T3 — `b-continue-same-airtime`

Current canonical timestamp equals previous.

Expected:

```text
no backward failure
no invented advancement
```

### T4 — `b-continue-backward-fail-closed`

Current canonical timestamp is earlier than previous.

Expected:

```text
reason backward
stored state remains previous
```

### T5 — `non-broadcast-does-not-commit-broadcast-airtime`

Pending mode A or C.

Expected:

```text
reason not-broadcast
Broadcast state unchanged
```

B_END terminal cases already present in the permanent suite remain retained.

## 9. Required structural lifecycle controls

Do not duplicate all COMMUNITY grammar fixtures from `community-reaction`.

Use minimal already-valid bounded envelopes only to protect Broadcast-specific cardinality/terminal rules.

### S1 — `b-start-one-community-valid`

Expected:

```text
1 COMMUNITY block
no open-broadcast terminal-expression issue
```

### S2 — `b-continue-one-community-valid`

Same structural Broadcast cardinality as B_START.

### S3 — `b-start-terminal-expression-rejected`

A structurally valid B_START envelope containing an explicit broadcast-ending expression should produce the existing open-broadcast terminal issue.

### S4 — `b-continue-terminal-expression-rejected`

Same negative control for B_CONTINUE.

Do not duplicate:

```text
reaction grammar matrix
platform alias taxonomy matrix
Frame continuity matrix
Narrative clock matrix
```

inside this suite.

## 10. Existing B_END cases remain authoritative

Retain the existing permanent controls:

```text
broadcast-closure.explicit-terminal
broadcast-closure.non-monotonic-fail-closed
broadcast-closure.structure-valid
broadcast-closure.structure-quarantined-independent-of-terminal
```

The expanded suite must not weaken these while adding lifecycle coverage.

In particular:

```text
terminal airtime authority
≠ structure acceptance
```

remains an intentional separation.

A B_END can have a valid explicit terminal timestamp while Structure independently quarantines malformed output.

## 11. What must not be pulled into this expansion

Do not add:

```text
Frame Chatindex/Chapter repair
Narrative current-time floor
post-B_END first-C floor
Representation/Edit reconcile
COMMUNITY reaction parser exhaustive cases
Store latency thresholds
host/history frontier
provider cache claims
```

Relevant permanent owner map:

```text
frame             → Frame/Structure frame family
narrative-clock   → Time/Lifecycle Narrative family
community-reaction→ Community/Reaction/Structure grammar family
broadcast-closure → Broadcast lifecycle/airtime/closure family
```

## 12. Coverage honesty after expansion

A useful reporting shape is:

```text
suite: broadcast-closure
coverage: HYBRID_TRANSITIONAL

subcoverage:
  lifecycle: EXECUTABLE
  airtime: EXECUTABLE
  structure: EXECUTABLE
  final-unlock: HYBRID_TRANSITIONAL
```

Do not relabel the whole suite `EXECUTABLE` until the B_END state-commit/unlock path itself is directly exercised through its real production owner.

Likewise, do not hide the new executable coverage merely because one orchestration boundary remains hybrid.

## 13. Future promotion condition

The remaining hybrid gap may be promoted when architecture exposes a bounded executable application-service owner for output finalization / B_END state application.

Possible future trigger:

```text
M2 ownership work creates or exposes a clean finalization facade
```

Then:

```text
same fixture IDs
+ direct owner call
→ HYBRID_TRANSITIONAL → EXECUTABLE
```

Do not move production code solely for test convenience.

## 14. Implementation shape when selected

No new suite directory.

Modify only the existing permanent family:

```text
products/simcore/tests/suites/broadcast-closure.test.mjs
products/simcore/tests/fixtures/broadcast-closure/cases.json
```

Registry ID remains:

```text
broadcast-closure
```

No second registry row.

No fixture schema revision required unless subcoverage reporting later requires a harness-wide contract change; do not mix such infrastructure redesign into this fixture expansion.

## 15. Sequencing

This audit is design/evidence work only.

If implementation is selected later:

```text
main design/evidence already recorded
→ dedicated non-runtime test work branch
→ expand existing fixture/suite only
→ run permanent harness/static checks
→ verify no plugin runtime byte change
→ merge/sync main evidence
```

This does not require a `release-simcore` deployment because the proposed change is regression-test infrastructure only.

If a later runtime feature/fix is combined with fixture implementation, split the work; do not mix release/runtime changes with regression-pack expansion.

## 16. Final audit verdict

```text
BROADCAST_FIXTURE_COVERAGE
= GAP CONFIRMED

current bias
= B_END HEAVY

B_START/B_CONTINUE deterministic surfaces
= DIRECTLY EXECUTABLE

new suite required
= NO

stable suite action
= EXTEND broadcast-closure

lifecycle subcoverage
= EXECUTABLE

airtime subcoverage
= EXECUTABLE

structure subcoverage
= EXECUTABLE

B_END final unlock
= HYBRID_TRANSITIONAL

runtime change
= NONE

release-simcore change
= NONE
```

Next regression-expansion decision should be based on coverage value, not suite count. After `summary-scope`, `narrative-clock`, `frame`, and this Broadcast expansion design, run a regression-family completeness audit before designing another horizontal permanent suite.