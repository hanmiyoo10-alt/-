# SimCore Regression Fixture Expansion Promotion Map — 2026-08-25

Status: `IDEA RECORDED · EVIDENCE→FIXTURE PROMOTION MAP · EXISTING HARNESS ONLY · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH_2026-08-25.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
- `docs/SIMCORE_POST_BEND_C_CLOCK_HANDOFF_REASSESSMENT.md`
- `docs/SIMCORE_LIVE_06406_BROADCAST_SEQUENCE.md`
- `docs/SIMCORE_M2_LIVE_06400_SCOPE_COMPARE.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`
- `docs/SIMCORE_HOST_HISTORY_RESILIENCE_COMPLETENESS_AUDIT_2026-08-25.md`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tooling/test.mjs`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Refresh the permanent-regression expansion strategy now that the RS2 harness is real and the original fixture inventory predates several later SimCore correctness releases.

The goal is:

```text
real natural evidence
→ bounded sanitized contract shape
→ existing permanent harness
→ deterministic regression control
```

This document does not implement fixtures.

It answers:

```text
which currently unregistered contract families are most valuable next?
which existing suite should be extended instead of creating a new suite?
which candidates are blocked by missing live evidence?
which WATCH observations must NOT become PASS fixtures?
how should M2-3 upgrade existing hybrid suites without duplicating them?
```

## 2. Current permanent-test reality

The original RS2-1C first pack designed five suites:

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
```

The current permanent registry has already grown to nine suites:

```text
representation-fast          HYBRID_TRANSITIONAL
genuine-edit                 HYBRID_TRANSITIONAL
community-reaction           EXECUTABLE
broadcast-closure            HYBRID_TRANSITIONAL
diagnostic-copy              EXECUTABLE
reload-cache-continuity      EXECUTABLE
candidate-materialize        EXECUTABLE
candidate-receipt            EXECUTABLE
release-approval             EXECUTABLE
```

Therefore future fixture work must extend this system rather than inventing another harness, fixture schema, runner, or CI framework.

Canonical rule:

```text
ONE PERMANENT HARNESS
MANY CONTRACT SUITES
NO SECOND TEST SYSTEM
```

## 3. Important refresh versus the frozen RS2-1A inventory

RS2-1A remains historical design evidence and should not be rewritten merely because later releases changed candidate maturity.

However its Batch B status reflects an earlier point in time.

At that time it listed:

```text
summary-scope
narrative-clock
frame
representation classification
```

and explicitly held `POST_BEND_C_CLOCK_DOMAIN_GAP` outside permanent PASS fixtures because the repair was then unresolved.

Later evidence changed that one family materially:

```text
v0.64.2 anomaly
+ v0.64.3 healthy control
+ v0.64.5 recurrence
→ POST_BEND_C_CLOCK_DOMAIN_GAP promoted to FIX / DIRECT_RECURRENCE
→ v0.64.6 Post-B_END C Clock Handoff Authority shipped
```

But the preserved v0.64.6 live sequence still marks the decisive immediate-C success specimen as not yet exercised in that evidence file.

Therefore:

```text
post-B_END contract maturity changed
but live-golden maturity must still be stated honestly
```

Do not retroactively edit RS2-1A to hide this history.

## 4. Core promotion model — evidence maturity and executable maturity are separate

Do not use one status word to mean both "we know the desired behavior" and "the harness can execute it directly".

Use two conceptual axes.

### 4.1 Evidence maturity

```text
WATCH_ONLY
CONTRACT_ESTABLISHED
LIVE_GOLDEN_ESTABLISHED
```

`WATCH_ONLY`
= anomaly/observation exists but no stable desired PASS behavior is authorized.

`CONTRACT_ESTABLISHED`
= desired behavior is explicitly frozen by a shipped or implementation-authoritative contract and can be tested deterministically, but a requested natural live-golden close may still be pending.

`LIVE_GOLDEN_ESTABLISHED`
= desired behavior has direct natural live evidence and is safe to preserve as a historical golden control.

### 4.2 Executable maturity

Reuse the existing harness vocabulary:

```text
EXECUTABLE
HYBRID_TRANSITIONAL
NOT_MIGRATED
```

Do not create another equivalent set of runner statuses.

### 4.3 Promotion rule

A permanent fixture may be useful before it is a natural-live golden, but the metadata/report must not overclaim provenance.

Canonical distinction:

```text
CONTRACT fixture
= protects an explicit deterministic requirement

GOLDEN fixture
= additionally carries natural live validation provenance
```

Never label a synthetic/static control as `LIVE_GOLDEN_ESTABLISHED` merely because CI passes.

## 5. Selection rule — extend first, split only for real ownership

Before creating a new suite, ask:

```text
does an existing suite already own this exact behavioral boundary?
```

If yes:

```text
add bounded fixture cases to existing suite
```

If no and the contract has a distinct semantic owner/execution adapter:

```text
new suite may be justified
```

Forbidden pattern:

```text
one historical release
→ one new suite
```

Version chronology belongs only in provenance metadata.

## 6. Priority P0 — Summary Scope classifier family

Candidate stable family:

```text
summary-scope
```

Current registry:

```text
ABSENT
```

Why high value:

```text
real paired ANNUAL_ONLY / CUMULATIVE_YOY evidence exists
visible stale-baseline/coverage contamination motivated the authority contract
v0.64.1 introduced deterministic request-scoped classification
scope authority is independent of M2-3 ownership movement
classifier behavior is bounded and suitable for deterministic fixture reduction
```

Minimum desired cases:

```text
summary-scope.none
summary-scope.annual-only
summary-scope.cumulative-yoy
summary-scope.ambiguous-multiyear-fails-closed
summary-scope.explicit-yoy-baseline-required
```

Important boundary:

```text
fixture protects request classification / authority metadata
!= fixture judges generated prose quality
!= fixture parses an output body to repair omissions
```

Evidence status at this map:

```text
CONTRACT_ESTABLISHED
```

Before implementation, perform one focused evidence check for whether a direct v0.64.1+ natural post-fix classifier revalidation is already preserved elsewhere. If found, individual cases may gain `LIVE_GOLDEN_ESTABLISHED` provenance. If not found, keep provenance honest rather than blocking all contract testing.

Expected executable direction:

```text
prefer direct Lifecycle classifier execution
```

Do not copy the classification algorithm into test code.

## 7. Priority P0 — Narrative / Current Timeline clock family

Candidate stable family:

```text
narrative-clock
```

Current registry:

```text
ABSENT
```

This family should consolidate stable Time/Narrative current-time contracts rather than create one suite per historical mini.

Candidate contract cases:

```text
current timeline cannot silently regress to historical era
explicit user-requested past scene / flashback remains allowed
later canonical narrative tail advances committed current time
prose-only clock mention is not silently promoted without canonical authority
B-mode airtime remains a separate clock domain
```

These protect the v0.63.57/v0.63.58-style chronology boundaries without making SimCore the prose renderer.

Primary invariant:

```text
Time / Lifecycle own authority facts
Main Model remains renderer
fixture tests authority/commit decisions, not prose authorship
```

Before implementation, verify which exact Time/Lifecycle functions are safely extractable through the current bundle loader.

Do not force production modularization solely for fixture convenience.

## 8. Priority P0/P1 — Post-B_END first-C clock handoff

This should normally be a case inside:

```text
narrative-clock
```

not a version-named standalone suite.

Protected contract:

```text
completed clean B_END
+ direct first following C
+ stored Narrative current time older than B_END terminal
→ request-scoped minimum current-time floor may apply
→ current C frame must not be authorized below completed terminal
→ historical/event/flashback timestamps remain separately allowed
→ bridge is one-shot, not permanent Broadcast→Narrative coupling
```

Required discriminator cases:

```text
post-bend-c.floor-required
post-bend-c.already-satisfied
post-bend-c.not-direct-followup
post-bend-c.invalid-or-incomplete-bend
post-bend-c.flashback-allowed
post-bend-c.one-shot-next-c-normal
post-bend-c.source-handoff-ineligible-does-not-block-clock-eligibility
```

Evidence maturity:

```text
CONTRACT_ESTABLISHED
DIRECT DEFECT RECURRENCE ESTABLISHED
```

But do not automatically mark the repaired path `LIVE_GOLDEN_ESTABLISHED` from the preserved v0.64.6 B sequence alone, because that document explicitly records the decisive immediate-C repair check as not yet exercised.

Promotion policy:

```text
static deterministic contract cases may be designed
→ natural repaired first-C success adds live-golden provenance
```

Do not invent the missing live success.

## 9. Priority P1 — Frame sequencing family

Candidate stable family:

```text
frame
```

Current registry:

```text
ABSENT
```

Suggested cases from the existing inventory:

```text
one canonical response frame
Response / Volume / Chapter / Chatindex ordering
canonical timestamp position/order
no duplicate frame markers
duplicate/malformed frame markers fail validation
backward-floor behavior remains separated from explicit historical-scene allowance
```

This family is attractive because it is structural, deterministic, and comparatively low semantic risk.

Prefer direct Frame module execution.

Do not snapshot entire rendered responses merely to test marker ordering.

## 10. Priority P1 — Broadcast lifecycle expansion

Current permanent coverage already contains:

```text
broadcast-closure
```

Therefore do not automatically create `broadcast-lifecycle` as a new suite.

First audit whether the existing suite can safely gain cases for:

```text
B_START locks session
B_CONTINUE preserves open/locked lifecycle
B_END requires end authority
B_END unlocks only after valid closure rules
post-B_END ordinary state remains unlocked
```

If these cases share the existing Broadcast/Lifecycle adapter cleanly:

```text
EXTEND broadcast-closure
```

Only create a distinct `broadcast-lifecycle` suite if the executable adapter/owner is genuinely different enough that combining them would blur failures.

This is a suite-boundary decision, not a naming preference.

## 11. Priority P1 — Representation matrix should mostly extend existing suites

The old inventory proposed a separate broad:

```text
representation
```

family.

Today we already have:

```text
representation-fast
genuine-edit
```

and M2-3 is actively moving reconcile ownership.

Therefore avoid creating a third overlapping representation suite unless a clearly separate `representation`-module contract remains uncovered.

Preferred near-term action when M2-3 lands:

```text
representation-fast HYBRID_TRANSITIONAL
→ EXECUTABLE

genuine-edit HYBRID_TRANSITIONAL
→ EXECUTABLE
```

using the new edit-reconcile application-service boundary and the same stable fixture IDs.

Do not rename fixtures merely because ownership moved.

Potential additional Representation-only cases may live in one existing suite if they are only negative controls for those decisions.

## 12. Explicit non-candidates — do NOT fixture these as desired PASS behavior now

### 12.1 Diagnostic snapshot freshness mismatch

Current state:

```text
WATCH / OBSERVABILITY
repair not promoted
```

Do not turn the stale copied-panel behavior itself into a golden expectation.

If a freshness repair is later selected and implemented, extend the existing:

```text
diagnostic-copy
```

suite with fresh/current vs stale-degraded controls.

Do not create a second diagnostic harness.

### 12.2 Handshake transient miss

Current state:

```text
WATCH
one transient miss
fail-closed correct
root cause unestablished
```

Eligible future fixture:

```text
fail-closed scanner behavior on a synthetic absent-handshake input
```

Not eligible as a permanent claim:

```text
host transient miss mechanism
```

unless future evidence proves it.

### 12.3 PRE_SIMCORE host-history marching frontier

Current state:

```text
WATCH / OBSERVE_ONLY
root cause unestablished
correctness impact unestablished
```

Do not freeze the observed compact signature or `+2 messages` movement as required product behavior.

At most, deterministic unit tests may protect local topology-classifier mechanics if that module is later touched.

### 12.4 Store latency

Do not encode unstable wall-clock thresholds into the golden gate.

### 12.5 Provider cache

Do not create PASS fixtures asserting Gemini cache hits/misses without authoritative provider evidence.

## 13. Captured-shape sanitization rule

Any new natural long-chat fixture must preserve only the minimum structure needed by the contract.

Allowed:

```text
indices
roles/kinds
bounded timestamps
mode/state enum
fingerprints/length relation where appropriate
small neutral placeholder text when grammar needs text
expected reason/result
source evidence document reference
```

Avoid:

```text
full user request
full assistant response
full diagnostic report
full host request/history
raw system prompt
unbounded exception/provenance payload
```

The fixture is a deterministic contract specimen, not a long-chat archive.

## 14. Evidence-to-fixture provenance

Each new fixture should answer:

```text
What real evidence motivated this case?
What exact stable contract is protected?
Is expected behavior from live proof or contract-only proof?
Which production owner is actually executed?
What negative side effect must remain absent?
```

Recommended bounded metadata extension only if the existing fixture schema can express it without disruptive migration:

```text
sourceEvidence
contract
introducedBy
evidenceClass
negativeControl
```

Do not restructure the fixture schema in the same implementation merely for nicer metadata unless the current schema actually blocks required provenance.

Fixture expansion and harness/schema redesign must remain separate work if both are needed.

## 15. One-shot CI migration rule

Historical release-specific scripts/workflows are useful evidence sources.

They are not automatically disposable just because an equivalent permanent fixture is added.

Retirement sequence:

```text
identify historical one-shot assertion
→ reproduce same contract in permanent suite
→ differential/equivalence proof where needed
→ permanent CI observes it
→ only then consider legacy script retirement
```

Do not mix:

```text
new fixture behavior
+
release/CI system cleanup
```

in one work item.

## 16. Candidate implementation order

Recommended order after design selection:

```text
1. summary-scope
2. narrative-clock core cases
3. frame
4. broadcast-closure lifecycle expansion
5. post-B_END first-C cases when live-golden provenance is available or explicitly contract-only scoped
6. M2-3 upgrade of representation-fast / genuine-edit to EXECUTABLE as part of M2-3's own validation work, not this fixture-expansion implementation
```

This order is not a release order.

It is a low-risk permanent-evidence expansion order.

## 17. First implementation candidate

Best first candidate:

```text
SUMMARY_SCOPE_PERMANENT_FIXTURE_PACK
```

Why:

```text
already identified in frozen Batch B inventory
strong real defect provenance
deterministic bounded classifier
independent of host/history uncertainty
independent of provider cache
independent of Store latency
independent of active M2-3 ownership movement
no renderer responsibility transfer
```

Implementation should be its own non-runtime work item.

Normal SimCore sequencing still applies:

```text
main design/evidence record
→ dedicated work branch
→ fixture/harness-only implementation
→ static/permanent test validation
→ no release-simcore deployment because runtime is unchanged
→ main evidence sync
```

If implementation discovers that production source must change merely to expose the classifier, stop and reclassify as `HYBRID_TRANSITIONAL` or defer. Do not smuggle runtime refactoring into a test-only task.

## 18. Promotion decision matrix

| Candidate | Current permanent suite | Evidence maturity | Preferred action |
|---|---|---|---|
| Summary Scope | none | CONTRACT_ESTABLISHED; live-golden provenance needs focused check | new `summary-scope` suite candidate |
| Narrative current/tail clock | none | contract families established | new `narrative-clock` suite candidate |
| Post-B_END first-C floor | none | defect recurrence + shipped contract; repaired live-golden not established by preserved v0.64.6 B file | cases under `narrative-clock`, live provenance gated |
| Frame sequencing | none | stable structural contract candidate | new `frame` suite candidate |
| B lifecycle | `broadcast-closure` adjacent | strong existing broadcast evidence | extend existing suite first |
| Representation Fast | existing | golden control | upgrade HYBRID→EXECUTABLE with M2-3 |
| Genuine edit | existing | golden control | upgrade HYBRID→EXECUTABLE with M2-3 |
| Diagnostic freshness | `diagnostic-copy` adjacent | WATCH only | defer until repair promotion |
| Handshake transient miss | none | WATCH / unattributed | no external-mechanism fixture; fail-closed unit control only if scanner touched |
| Host-history frontier | none | WATCH / observe-only | no golden behavior fixture |
| Store latency | none | performance WATCH | no fixed-ms golden gate |
| Gemini provider cache | none | UNVERIFIED | no provider-result fixture |

## 19. Stop rule

Do not turn this track into unlimited fixture taxonomy research.

After the promotion map, the next useful step is narrow:

```text
SUMMARY_SCOPE_FIXTURE_DESIGN
```

or stop if another active SimCore workstream has higher priority.

Do not create generic layers such as:

```text
Fixture Event Bus
Universal Evidence Runtime
Regression State Machine
Fixture Provenance Service
```

The existing harness plus bounded metadata is sufficient unless implementation proves otherwise.

## 20. Current classification

```text
SIMCORE_REGRESSION_FIXTURE_EXPANSION
= HIGH LEVERAGE
= LOW SEMANTIC RISK
= EXISTING HARNESS ONLY
= EXTEND BEFORE SPLIT
= EVIDENCE MATURITY != EXECUTABLE MATURITY
= CONTRACT FIXTURE != LIVE GOLDEN FIXTURE
= WATCH OBSERVATIONS ARE NOT GOLDEN BEHAVIOR
= SUMMARY_SCOPE FIRST CANDIDATE
= POST_BEND LIVE-GOLDEN PROVENANCE GATED
= M2-3 HYBRID→EXECUTABLE UPGRADE SEPARATE
= NO RUNTIME CHANGE
= NO RELEASE-SIMCORE CHANGE
= NO RELEASE-SYSTEM RESTRUCTURE
```
