# SimCore Next Focus Refresh After Research Closes — 2026-08-26

Status: `FOCUS REFRESH · THREE BROAD RESEARCH AXES CLOSED · IMPLEMENTATION / LIVE-GATE / M2 NEXT · NO RUNTIME CHANGE`

Main at refresh start: `1e5eca80cc3d9bc3c17b229d7b2906c3e5f6e432`
Production authority: `release-simcore` v0.64.7
Production release commit: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`

Related:
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH_2026-08-25.md`
- `docs/SIMCORE_DIAGNOSTIC_UX_PREIMPLEMENTATION_CLOSE_2026-08-25.md`
- `docs/SIMCORE_HOST_HISTORY_RESILIENCE_COMPLETENESS_AUDIT_2026-08-25.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- `docs/SIMCORE_CONTRACTS_V2.md`

## 1. Why this refresh is needed

The earlier post-cache focus map listed several broad independent research directions. Since then:

```text
Diagnostic / Operator UX broad research
→ COMPLETE / CLOSED

Host / History Resilience broad research
→ COMPLETE / CLOSED

Regression Evidence / Fixture Expansion broad research
→ COMPLETE / CLOSED

Long-chat performance / Store latency
→ researched to current evidence limit / NATURAL SAMPLE WATCH

Gemini cache architecture
→ COMPLETE / PAUSED pending provider/gateway evidence
```

Therefore the next phase should not continue horizontal ideation inside already-closed axes.

The work menu now needs to distinguish:

```text
production gate
implementation-ready non-runtime work
active/next M2 architecture
implementation-ready UX mini
natural-evidence watches
post-M2 cleanup/extraction
```

## 2. Tier 0 — Immediate production authority gate

Current production remains:

```text
v0.64.7 — Cross-Reload Cache Observer Continuity
status: PENDING_REAL_LONG_CHAT
```

`CURRENT_DEVELOPMENT.md` remains authoritative that the runtime is frozen until the required real long-chat v0.64.7 close is classified.

Therefore the first production action is still:

```text
v0.64.7 natural real-long-chat validation
→ classify PASS / WATCH / FIX / BLOCKER
→ preserve evidence immediately
```

No later runtime release should silently leapfrog this gate.

This is not a new research axis; it is the current production close requirement.

## 3. Tier 1 — Implementation-ready, non-runtime permanent evidence work

Broad regression-fixture research is closed, but implementation has not started for the newly frozen portfolio.

Implementation-ready order:

```text
1. summary-scope
2. narrative-clock
3. frame
4. broadcast-closure lifecycle/airtime expansion
```

### 3.1 `summary-scope`

Best first implementation candidate.

Reasons:

```text
Lifecycle owner directly executable
independent of M2-3 ownership movement
independent of host/history
independent of Store latency
no runtime artifact change required
no renderer responsibility transfer
```

Expected work class:

```text
TEST / EVIDENCE INFRA ONLY
```

Normal sequencing:

```text
main design/evidence already frozen
→ dedicated fixture work branch
→ fixture + registry implementation
→ permanent/static test validation
→ main evidence sync
```

Because runtime artifact does not change, no `release-simcore` deployment is required solely for this fixture implementation.

### 3.2 `narrative-clock`

Implementation-ready direct Time/Lifecycle fixtures covering:

```text
current narrative floor
canonical tail promotion
non-monotonic fail-closed
historical timestamp preservation
post-B_END first-C one-shot authority
```

Keep explicit flashback natural success as a separate validation-only evidence item.

### 3.3 `frame`

Implementation-ready direct Frame + Structure suite covering:

```text
Volume / Chapter / Chatindex continuity
same-title Chapter hold
Chatindex exact +1 repair
nearest-assistant frame capture safety
response-frame marker order / uniqueness / format
```

### 3.4 `broadcast-closure` expansion

Do not create a new `broadcast-lifecycle` suite.

Extend the existing stable ID with:

```text
B_START classification / lock
B_CONTINUE explicit + implicit locked continuation
Broadcast airtime monotonicity
B_START/B_CONTINUE Structure controls
```

Final B_END unlock remains HYBRID_TRANSITIONAL until a future ownership boundary exposes direct execution.

## 4. Tier 2 — M2 ownership architecture

### 4.1 M2-3 — Edit Reconcile extraction

M2-3 remains the next major architecture checkpoint after production/live sequencing allows it.

Target:

```text
outer request shell + Session reconcile ownership
→ edit-reconcile application service
```

Must preserve:

```text
Representation Fast Reconcile
genuine user edit rebuild
snapshot semantics
Fresh-is-identity-evidence invariant
```

A useful side effect of successful M2-3 ownership extraction is expected fixture promotion:

```text
representation-fast HYBRID_TRANSITIONAL
→ EXECUTABLE

genuine-edit HYBRID_TRANSITIONAL
→ EXECUTABLE
```

Do not create duplicate suites when ownership moves.

### 4.2 M2-4 — Session / Runtime Mirror narrowing

After M2-3 shape is stable, the next architecture research should examine:

```text
what Session still owns after edit-reconcile leaves
which Runtime Mirror responsibilities remain transport-only
which orchestration remains accidental rather than essential
whether output-finalize composition has a clean application owner
```

This is the strongest genuinely new architecture-design area after M2-3.

## 5. Tier 3 — Output finalization / Recovery facade cleanup

This remains a post-M2-3 / M2-4 candidate rather than immediate work.

Potential questions:

```text
Can final output-state commit become a bounded application service?
Can B_END final unlock become directly executable through that boundary?
Does Session still carry output-finalize responsibilities that should move?
Can recovery compatibility facade shrink after M2-1 migration is sufficiently proven?
Can output-compat and bootstrap-migration be called directly without creating dependency debt?
```

This area is particularly relevant to the new module-cohesion rule because `finalizePreparedOutput`-style orchestration may become an extraction candidate if it continues accumulating independently describable responsibilities.

Do not split solely because the function/module is large.

Apply:

```text
module size is a signal
ownership cohesion is the authority
```

Possible planning states:

```text
COHESIVE_LARGE
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

## 6. Tier 4 — Diagnostic UX implementation candidate

Broad Diagnostic UX research is closed; do not redesign it horizontally.

Two narrow implementation candidates remain:

```text
A. MINI_WARNING_WIDGET_V1
B. Diagnostic Snapshot Freshness repair
```

### A. Warning mini-widget

Frozen design:

```text
FIXED_COMPACT_FLOATING_BADGE
HIDDEN_WHEN_HEALTHY
CLICK_TO_DIAGNOSTIC
```

Uses existing `lastCore.issues`; no second validator, polling, persistence, or focus-stealing UI.

This is a low-semantic-risk product mini when release sequencing permits.

### B. Snapshot freshness repair

Only select if the existing stale/current observation contract is being actively repaired.

Do not combine A and B in one broad Diagnostic rewrite.

## 7. Tier 5 — Natural evidence watches, not design work

These areas should wait for real specimens rather than receiving more horizontal design.

### 7.1 Long-chat Store latency

Current state:

```text
HIGH_VARIANCE_WITHIN_FAMILY
payload-only model contradicted
missing same-family payloadChars discriminator
no FIX candidate
```

Next action:

```text
wait for natural same-runtime sample
```

Do not add instrumentation unless the next natural sample proves existing evidence insufficient for a concrete decision.

### 7.2 Host / History Resilience

Broad research closed.

Reopen only for:

```text
new handshake miss
frontier regression/collapse/reset with informative evidence
user-visible correctness impact
shared discriminator recurrence
SimCore-owned scanner/comparator defect reproduction
```

### 7.3 Gemini cache

Broad architecture paused.

Reopen only with:

```text
real Gemini/gateway receipt evidence
provider cached-token evidence
concrete implementation-discovered owner gap
measured prompt-topology regression
```

### 7.4 Semantic validation-only families

Natural evidence still useful for:

```text
Summary Scope ANNUAL_ONLY / CUMULATIVE_YOY rendered semantics
explicit past-scene / flashback success
Reaction stale-scale fallback
Community platform diversity
generation semantic excursion
```

No patch without a failing/recurrent specimen.

## 8. Tier 6 — Legacy / Bootstrap Migration

Remain deferred / trigger-only.

Only promote when:

```text
schema evolution requires migration
bootstrap/migration ownership is touched
real old-state specimen appears
Recovery facade cleanup reaches this boundary
```

Do not manufacture destructive old-state scenarios merely to exercise it.

## 9. Module-cohesion maintenance overlay

The new module-cohesion rule is not a separate feature track.

It applies during every future architecture or feature task.

When touching a module, ask:

```text
Is this still one coherent owner?
Are unrelated responsibilities growing together?
Did a new dependency enter only for a separate concern?
Can one lifecycle/application phase now be tested independently?
Is this module becoming a gravity well?
```

If ownership drift is observed:

```text
preserve observation in main
→ classify SIZE_ONLY vs OWNERSHIP_DRIFT
→ separate extraction work item
→ mechanical branch
→ permanent regression proof
→ runtime release/live validation only if artifact changed
```

Do not smuggle extraction into feature work.

## 10. Recommended next choices

If choosing the next **actual work item** after the current production gate, recommended order is:

```text
A. summary-scope permanent fixture implementation
B. narrative-clock fixture implementation
C. frame fixture implementation
D. broadcast-closure lifecycle expansion
```

If choosing the next **architecture research item** rather than fixture implementation:

```text
M2-4 Session / Runtime Mirror narrowing pre-design
```

but only when the M2-3 physical shape is sufficiently stable to avoid designing against a moving boundary.

If choosing a **small user-facing mini**:

```text
MINI_WARNING_WIDGET_V1
```

provided the production/live sequencing allows a convenience/UX release and no correctness FIX outranks it.

If choosing a **brand-new performance investigation**:

```text
NONE yet
```

because current Store-latency research has reached the natural-evidence limit and should not be reopened without a better specimen.

## 11. Current map

```text
NOW
→ v0.64.7 REAL-LONG-CHAT CLOSE

NON-RUNTIME IMPLEMENTATION READY
→ summary-scope
→ narrative-clock
→ frame
→ broadcast-closure expansion

MAJOR ARCHITECTURE
→ M2-3
→ M2-4
→ output-finalize / recovery cleanup

OPTIONAL NARROW UX
→ MINI_WARNING_WIDGET_V1
→ Snapshot Freshness repair only if explicitly selected

WATCH / EVIDENCE-TRIGGERED
→ Store latency
→ Host/History
→ Gemini provider cache
→ semantic validation-only families
→ legacy/bootstrap

MAINTENANCE OVERLAY
→ module cohesion / extraction when ownership drift appears
```

## 12. Final classification

```text
SIMCORE_NEXT_FOCUS_REFRESH_2026_08_26
= PRODUCTION GATE FIRST
= THREE NEW FIXTURE SUITES IMPLEMENTATION READY
= ONE EXISTING BROADCAST SUITE EXPANSION READY
= M2-3 THEN M2-4 ARCHITECTURE PATH PRESERVED
= OUTPUT FINALIZATION / RECOVERY CLEANUP POST-M2
= DIAGNOSTIC UX NARROW IMPLEMENTATION ONLY
= PERFORMANCE / HOST / CACHE BROAD RESEARCH PAUSED OR CLOSED
= MODULE COHESION APPLIES CONTINUOUSLY
= NO RUNTIME CHANGE
```
