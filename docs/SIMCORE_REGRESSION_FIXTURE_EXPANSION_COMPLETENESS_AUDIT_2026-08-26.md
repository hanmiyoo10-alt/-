# SimCore Regression Fixture Expansion Completeness Audit — 2026-08-26

Status: `BROAD RESEARCH COMPLETE · IMPLEMENTATION PORTFOLIO FROZEN · EVIDENCE/OWNERSHIP-TRIGGERED REOPEN ONLY · NO RUNTIME CHANGE`

Production authority: `release-simcore` v0.64.7
Production release commit at audit: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Main at audit start: `b8043533b0590474c3450a47e965cf5d3cbcd46a`

Related:
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_PROMOTION_MAP_2026-08-25.md`
- `docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_FRAME_PERMANENT_FIXTURE_DESIGN_2026-08-26.md`
- `docs/SIMCORE_BROADCAST_FIXTURE_COVERAGE_GAP_AUDIT_2026-08-26.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `products/simcore/tests/registry.mjs`

## 1. Audit question

Determine whether broad Regression Evidence / Fixture Expansion research should continue producing additional permanent-suite ideas, or whether the current evidence-backed portfolio is sufficiently specified to move to implementation when product/workstream sequencing allows.

Required verdict options:

```text
BROAD_RESEARCH_COMPLETE
ONE_NARROW_GAP
MORE_RESEARCH_REQUIRED
```

Decision:

```text
BROAD_RESEARCH_COMPLETE
```

No additional broad permanent-suite design is justified by the currently preserved evidence.

The next progress on this axis should be implementation of already-frozen families, migration of known HYBRID_TRANSITIONAL coverage when ownership changes expose direct surfaces, or narrow evidence-triggered additions.

## 2. Current permanent-registry baseline

At audit time the existing registry contains nine required golden-gate suites:

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

The last four entries after diagnostic-copy include runtime-observer/release-system evidence surfaces in addition to core semantic behavior.

This audit does not redesign registry aliases, pack topology, harness execution, fixture schema, or release-system policy.

Canonical rule remains:

```text
ONE PERMANENT HARNESS
MANY CONTRACT SUITES
NO SECOND TEST SYSTEM
```

## 3. Frozen expansion portfolio

The evidence review produced exactly three new implementation-ready suite families plus one extension of an existing suite.

### 3.1 New suite — `summary-scope`

Status:

```text
DESIGN FROZEN
IMPLEMENTATION READY
EXECUTABLE
CONTRACT_ESTABLISHED
NATURAL SEMANTIC CLOSE = VALIDATION_ONLY
```

Owner:

```text
Lifecycle.classifySummaryScope
```

Protected boundary:

```text
request + C-mode authority
→ NONE / ANNUAL_ONLY / CUMULATIVE_YOY
→ target/comparison/authority/reason facts
```

It does not judge generated prose.

### 3.2 New suite — `narrative-clock`

Status:

```text
DESIGN FROZEN
IMPLEMENTATION READY
EXECUTABLE
MIXED EVIDENCE MATURITY
```

Owners:

```text
Time
+ bounded Lifecycle post-B_END eligibility
```

Protected boundary:

```text
current Narrative floor
+ canonical timestamp sequence
+ Narrative commit
+ direct first-C-after-B_END floor authority
```

Current Timeline, Narrative Tail Time, and post-B_END first-C clock authority are intentionally consolidated in one suite rather than split by historical release.

Dedicated explicit-flashback natural validation remains a live evidence item; deterministic allowance can still be fixture-protected without claiming a live golden.

### 3.3 New suite — `frame`

Status:

```text
DESIGN FROZEN
IMPLEMENTATION READY
EXECUTABLE
```

Owner split:

```text
Frame
→ Volume / Chapter / Chatindex continuity and repair

Structure
→ response-frame marker shape/order
```

Protected boundary remains separate from Narrative time authority.

The natural `CHATINDEX_SAME → visible +1 repair` specimen gives direct-live provenance for the key continuity repair while synthetic malformed-envelope negatives remain contract fixtures rather than invented live incidents.

### 3.4 Existing suite extension — `broadcast-closure`

Decision:

```text
EXTEND_EXISTING
NO_NEW broadcast-lifecycle SUITE
```

Target subcoverage:

```text
Lifecycle classification     EXECUTABLE
Broadcast airtime            EXECUTABLE
Broadcast Structure judging  EXECUTABLE
final B_END unlock           HYBRID_TRANSITIONAL
```

The historical suite ID remains stable.

B_START / B_CONTINUE controls belong in the existing Broadcast regression family; they do not justify a second overlapping suite.

## 4. Why no fifth broad expansion suite is justified now

Contracts v2 intentionally contains more stable modules than there are permanent behavioral suites, including:

```text
recurrence
lineage
handoff
evidence
prompt
output-compat
bootstrap-migration
runtime host/cache/topology/telemetry/probe surfaces
```

Completeness does **not** mean:

```text
one production module
→ one permanent suite
```

That rule would duplicate the architecture map inside the test registry and would create suites without evidence-backed promotion reasons.

The RS2-1A promotion criteria remain the correct filter: promote durable fixtures when they protect a directly observed correctness defect, a frozen dependency of later architecture work, an edit-vs-drift discriminator, state/closure authority, silent release/diagnostic failure, a repeatedly reused regression control, or a forbidden side effect/boundary.

At this audit, no additional broad family satisfies those criteria strongly enough to justify another pre-implementation design document.

Therefore the following are **not completeness gaps** merely because they lack dedicated suite IDs:

```text
Recurrence generic behavior
Lineage generic behavior
Source Handoff generic behavior
Evidence/source fencing generic behavior
Prompt generic behavior
Bootstrap/Migration generic behavior
all Runtime observer components
```

They remain eligible for component-triggered fixture work when one of these happens:

```text
owner/module is materially changed
natural correctness evidence establishes a regression risk
an architectural checkpoint names a behavior as a required control
an existing one-shot test must be migrated to permanent authority
```

## 5. Known HYBRID_TRANSITIONAL states are not research gaps

### Representation / Edit Reconcile

Current registry:

```text
representation-fast HYBRID_TRANSITIONAL
genuine-edit        HYBRID_TRANSITIONAL
```

This is a known physical-ownership transition, not missing fixture theory.

Contracts v2 already freezes the future `edit-reconcile` application service as owner of reconcile-path selection and routing.

When M2-3 exposes that application-service boundary, the existing stable fixture IDs should migrate to direct execution:

```text
representation-fast HYBRID_TRANSITIONAL
→ EXECUTABLE

genuine-edit HYBRID_TRANSITIONAL
→ EXECUTABLE
```

Do not create a third overlapping `representation` suite to hide this transition.

### Broadcast final unlock

`broadcast-closure` remains HYBRID_TRANSITIONAL only because final B_END `broadcastLocked=false` is currently performed inside output-finalization orchestration rather than a clean exported service.

The lifecycle/airtime/structure portions are already directly executable.

This is an ownership/exposure fact, not a justification to copy production orchestration into test code or invent a second Broadcast suite.

## 6. WATCH / external-uncertain observations remain outside desired-PASS fixtures

The Promotion Map exclusions remain correct.

Do not create desired-PASS permanent fixtures for the observed external mechanism itself in these families:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
PRE_SIMCORE host-history marching frontier
Store wall-clock latency variation
Gemini provider cache behavior without authoritative receipt
Diagnostic snapshot freshness mismatch before a selected repair
```

Bounded local mechanics may be tested if their owner changes, but an unexplained host/provider observation must not be fossilized into product behavior merely to increase fixture count.

## 7. Architecture checks are not missing behavioral suites

Contracts v2 / architecture dependency enforcement is an independent checker surface.

Do not add a behavioral suite named `architecture-contracts` merely to make the permanent behavioral registry appear module-complete if the existing architecture checker already owns the dependency invariant.

Likewise release-system suites such as candidate materialization/receipt/approval must not be used as evidence that runtime semantics themselves are covered; infrastructure and product behavior remain separately owned.

## 8. Implementation portfolio freeze

The regression-expansion implementation portfolio is now frozen as:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure lifecycle/airtime expansion
```

Then, separately as part of M2-3 validation/ownership work:

```text
5. representation-fast HYBRID → EXECUTABLE
6. genuine-edit HYBRID → EXECUTABLE
```

This list is an implementation/evidence order, not a release-version order.

Do not implement all four expansion items as one giant change merely because they share this audit.

Preferred unit:

```text
one fixture family / existing-suite expansion
→ dedicated non-runtime work item
→ harness/static validation
→ main evidence sync
```

Runtime source must not be changed solely for fixture convenience.

## 9. Separation from release-system restructuring

Fixture expansion is product regression-evidence work using the existing permanent harness.

Do not combine it with:

```text
pack alias redesign
fixture schema redesign unless genuinely blocking
new CI/release topology
legacy gate retirement
candidate/release authority restructuring
release-simcore deployment
runtime version bump
```

If old one-shot CI is later retired, perform equivalence proof and retirement as a separate release-system task.

## 10. Evidence maturity remains case-scoped

Adding a suite to `goldenGate=true` means the deterministic permanent regression gate is mandatory.

It does not automatically mean every case has natural-live golden provenance.

Preserve distinctions such as:

```text
summary-scope
→ CONTRACT_ESTABLISHED
→ dedicated natural semantic close still VALIDATION_ONLY

narrative-clock explicit flashback
→ deterministic allowance established
→ dedicated natural success still pending

narrative-clock post-B_END first C
→ DIRECT_LIVE_CONTROL established

frame CHATINDEX_SAME repair
→ DIRECT_LIVE_CONTROL established

synthetic malformed negatives
→ contract evidence, not fabricated natural incidents
```

## 11. Reopen conditions

Broad fixture ideation is closed.

Reopen this research axis only when at least one concrete trigger appears:

```text
A. natural long-chat correctness regression exposes an unprotected stable contract;
B. M2/M3 ownership movement exposes a new direct executable boundary requiring fixture migration;
C. a component is materially changed and currently has no suitable regression control;
D. a historical one-shot gate is proposed for retirement but permanent equivalence is missing;
E. implementation of one of the frozen families reveals a real owner/schema/harness gap;
F. a WATCH item is promoted to FIX with a stable desired behavior;
G. a forbidden-side-effect boundary becomes newly reachable.
```

Do not reopen merely because another module exists or because a larger fixture count feels safer.

## 12. Stop rule

Canonical sequence from here:

```text
frozen implementation-ready portfolio
→ implement one bounded fixture family when selected
→ validate against existing harness
→ preserve provenance/evidence
→ stop
```

For broad research:

```text
NO MORE HORIZONTAL FIXTURE IDEATION
WITHOUT A CONCRETE EVIDENCE OR OWNERSHIP TRIGGER
```

## 13. Final verdict

```text
REGRESSION_FIXTURE_EXPANSION_RESEARCH
= BROAD COMPLETE

existing permanent suites
= 9

new implementation-ready suite families
= 3
  summary-scope
  narrative-clock
  frame

existing suite expansions selected
= 1
  broadcast-closure

known HYBRID migrations
= representation-fast
  genuine-edit
  broadcast final unlock

new harness required
= NO

runtime change justified
= NO

release-simcore change
= NONE

next progress type
= IMPLEMENT FROZEN FAMILY OR OWNERSHIP/EVIDENCE-TRIGGERED MIGRATION
```
