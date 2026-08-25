# SimCore Next Focus Areas After Cache Research — 2026-08-25

Date: 2026-08-25
Status: `FOCUS MAP · NO RUNTIME CHANGE · CACHE RESEARCH PAUSED`

Purpose: preserve the next non-cache SimCore research / design / maintenance areas after the Gemini implicit-cache research track was intentionally paused. This is a candidate menu and prioritization map, not an instruction to implement every area.

Primary references:
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_GEMINI_CACHE_RESEARCH_COMPLETENESS_AUDIT_2026-08-25.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Immediate production sequence remains separate from research selection

Current production is v0.64.7 and its real-long-chat close gate remains the immediate production gate. M2-3 is already an independent active workstream; this document does not reset or cancel that workstream.

Current production landing discipline remains conceptually:

```text
v0.64.7 real-long-chat close
→ deferred/WATCH re-check
→ choose any narrow correctness/UI mini only if evidence justifies it
→ M2-3 production landing/rebase
→ M2-3 live close
→ M2-4 / later M2 work
```

A correctness FIX outranks convenience/UI work. Functional changes must not be mixed with release-system restructuring.

## 2. Focus Area A — M2 ownership architecture

Status: `HIGH PRIORITY / EXISTING ROADMAP`

### M2-3 — Edit Reconcile ownership extraction

Already designed / active in its own workstream. It remains the next major architecture checkpoint after the mini/live gates are clean.

Primary goal:

```text
outer runtime + Session edit reconciliation
→ one application service: edit-reconcile
```

Preserve genuine-user-edit and Representation Fast Reconcile golden controls.

### M2-4 — Session / Runtime Mirror narrowing

Contracts v2 explicitly identifies the next checkpoint after M2-3:

```text
M2-4
= narrow Session and remaining Runtime Mirror orchestration contracts
```

Likely research questions:

```text
What state/execution responsibility should Session still own after Edit Reconcile extraction?
Which Runtime Mirror responsibilities are transport-only vs orchestration debt?
Can output-finalize composition be narrowed without changing behavior?
Which public facades remain necessary for compatibility?
```

Do not split output-finalize merely for aesthetics; require a clear ownership win and mechanical equivalence.

### M2-5+

Later cleanup:

```text
remove transition code only after equivalence evidence
shrink Contracts v2 transition exceptions as source edges disappear
remove compatibility facades only when no longer needed
```

This is cleanup, not a place to introduce feature semantics.

## 3. Focus Area B — Long-chat performance / latency

Status: `HIGH VALUE · EVIDENCE-BACKED WATCH`

The strongest non-cache performance family in the current deferred sweep is:

```text
STORE_LATENCY_DOMINANCE
→ recurrent request/output hotspot
→ sometimes >1 s
→ correctness corruption not observed
```

Adjacent performance questions:

```text
manual-edit rebuild cost after M2-3
first-request-after-reload expensive rebuild
SnapshotStore read/write distribution
avoidable repeated parsing / serialization
request preparation vs output finalization cost attribution
```

Recommended direction:

```text
measure first
→ attribute exact owner
→ optimize one narrow hotspot
→ preserve semantic/state behavior
```

Do not bundle broad performance refactors with M2 ownership movement.

## 4. Focus Area C — Diagnostic / operator UX

Status: `GOOD NEAR-TERM CANDIDATE`

The warning notification design is already refined:

```text
MINI_WARNING_WIDGET_V1
= FIXED_COMPACT_FLOATING_BADGE
= HIDDEN_WHEN_HEALTHY
= CLICK_TO_DIAGNOSTIC
```

It consumes existing `lastCore.issues` only and must not create a second validator.

Other diagnostic-maintenance candidates:

```text
DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH
DIAGNOSTIC_REPAIRED_RAW_FRAME_WORDING
diagnostic attribution clarity
current-turn vs stale-copy labeling
compact ownership / reason-code surfacing
```

These should remain observability-only unless a diagnostic defect causes actual state/decision corruption.

## 5. Focus Area D — Host / history resilience

Status: `WATCH / RESEARCH CANDIDATE`

Current evidence families:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
PRE_SIMCORE_HOST_HISTORY_FRONTIER
DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH
reload-boundary provenance unavailable rebuild
```

Possible research questions:

```text
Which host/prompt-composition conditions cause transient handshake misses?
Can host/history observation be made more attributable without rewriting history?
Can stale/current host snapshots be labeled more deterministically?
Can reload provenance be retained safely without expanding semantic state?
```

Hard boundary:

```text
observe / attribute host-history behavior
!= rewrite history to force stability
```

## 6. Focus Area E — Semantic validator / authority coverage

Status: `EVIDENCE-TRIGGERED ONLY`

Several semantic families remain useful but are not currently promoted fixes:

```text
Summary Scope natural ANNUAL_ONLY / CUMULATIVE_YOY validation
explicit past-scene / flashback allowance
COMMUNITY platform-family diversity
REACTION_STALE_SCALE_FALLBACK
GENERATION_SEMANTIC_EXCURSION
```

Rule:

```text
natural failing specimen / recurrence
→ preserve immediately
→ classify
→ only then design a narrow semantic repair
```

Do not invent a patch merely because a natural validation sample is still missing.

## 7. Focus Area F — Legacy / bootstrap / migration robustness

Status: `DEFER / TRIGGERED ONLY`

A true old-schema/history-bootstrap migration path remains rarely exercised.

Potential later work becomes justified when:

```text
bootstrap/migration ownership changes
legacy path naturally appears
schema evolution requires a real migration
recovery facade cleanup reaches this boundary
```

Until then, do not mutate production state merely to manufacture a migration specimen.

## 8. Focus Area G — Regression evidence and permanent-fixture expansion

Status: `HIGH LEVERAGE · LOW SEMANTIC RISK`

SimCore already has valuable natural long-chat controls. A useful non-feature track is to continue converting important real specimens into permanent deterministic fixtures when a component is touched.

High-value families include:

```text
genuine visible edit
Representation Fast Reconcile
B_START / B_CONTINUE / B_END lifecycle
post-B_END first-C floor
COMMUNITY multiline reaction validation
Summary Scope classifiers
reload continuity
stale/current diagnostic-copy behavior
```

Goal:

```text
real evidence
→ bounded sanitized fixture
→ permanent regression control
```

Do not build a second test/release system; reuse the existing SimCore harness.

## 9. Focus Area H — Output finalization / recovery facade cleanup

Status: `POST-M2-3 / ARCHITECTURE CANDIDATE`

Contracts v2 explicitly leaves possible output-finalize composition narrowing for later, and `recovery` still exists as a compatibility facade after the M2-1 split.

Questions worth revisiting after M2-3/M2-4 evidence:

```text
Does Session still own too much output-finalize composition?
Can recovery compatibility facade shrink or disappear?
Which output-compat / bootstrap-migration calls can become direct without new dependency debt?
Is there any remaining outer-shell decision tree with a clear application owner?
```

This must remain mechanical/equivalence-first.

## 10. Recommended priority buckets

### Bucket 1 — already committed roadmap

```text
M2-3
→ M2-4
→ M2-5+ cleanup
```

### Bucket 2 — best independent near-term research candidates

```text
1. long-chat Store / rebuild latency attribution
2. diagnostic/operator UX including warning mini-widget
3. host/history resilience and handshake attribution
4. permanent fixture / regression-evidence expansion
```

### Bucket 3 — evidence-triggered semantic work

```text
Summary Scope
past-scene allowance
COMMUNITY platform diversity
Reaction stale-scale fallback
generation semantic excursion
legacy/bootstrap migration
```

Do not promote Bucket 3 without new evidence.

## 11. Suggested next research choice

If selecting one new non-cache research topic now, the strongest candidates are:

```text
A. PERFORMANCE / STORE LATENCY
   Highest direct long-chat user-value; recurrent evidence already exists.

B. M2-4 OWNERSHIP PRE-DESIGN
   Best architecture continuation; should stay coordinated with M2-3 and not interfere with its active workstream.

C. DIAGNOSTIC / OPERATOR UX
   Low semantic risk; warning widget already has a refined candidate design.

D. HOST / HISTORY RESILIENCE
   Interesting systems research, but evidence is still mostly WATCH-level and must remain attribution-first.
```

Recommended default order for new design work outside the active M2-3 workstream:

```text
Performance / Store latency research
→ M2-4 ownership research when M2-3 shape is sufficiently stable
→ diagnostic UX / warning mini as release sequencing permits
→ host/history resilience research
```

This order is a research preference, not a production release override.

## 12. Cache research pause rule

The Gemini cache research stack is intentionally paused after the completeness audit.

Reopen it only when one of the following occurs:

```text
real paired Gemini/gateway evidence arrives
implementation exposes a concrete missing cache owner
measured evidence justifies prompt-topology work
a cache regression becomes a correctness/performance priority
```

Do not resume horizontal cache idea expansion without one of those triggers.

## 13. Current classification

```text
SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH
= NAVIGATION / PRIORITIZATION MAP
= CACHE TRACK PAUSED
= M2 ROADMAP PRESERVED
= PERFORMANCE TRACK HIGH VALUE
= DIAGNOSTIC UX GOOD CANDIDATE
= HOST/HISTORY ATTRIBUTION WATCH
= SEMANTIC FIXES EVIDENCE-TRIGGERED
= LEGACY MIGRATION DEFERRED
= NO RUNTIME CHANGE
```
