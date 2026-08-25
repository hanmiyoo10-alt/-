# SimCore Diagnostic Attribution Clarity — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC ATTRIBUTION / REASON-CODE CONTRACT · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define a small common attribution contract for SimCore diagnostics so a copied report can answer, without re-running semantics:

```text
What happened?
Why was this status shown?
Which existing owner produced the underlying fact?
Which observation source supplied the evidence?
How fresh/bound is that evidence?
What does the diagnostic layer NOT know?
```

This is an observability/explainability design only.

It does not authorize:

```text
new semantic validators
new severity taxonomy
new runtime state
new SnapshotStore schema
new warning authority
new host/history mutation
new network calls
new timers
work-branch implementation
release-simcore deployment
```

Canonical boundary:

```text
existing semantic owner
→ produces the real result

diagnostic attribution layer
→ explains the result
→ never becomes a second semantic owner
```

## 2. Why this is needed

Current diagnostics already expose many useful states such as:

```text
Probe context: CURRENT TURN / STALE / UNAVAILABLE
Runtime status: ACTIVE / INACTIVE / n/a
Stability: PASS / NOT_EXERCISED
Edit reconcile: SAME_FAST / REPRESENTATION_FAST_RECONCILED / MANUAL_EDIT_REBUILT
Deferred mirror: COMMITTED / OUTPUT_MISMATCH / NOT_EXERCISED
Post-B_END clock handoff: APPLIED / INELIGIBLE
Warnings: N
Compatibility diagnostics: N
Cache first-break / contribution / continuity facts
```

These values are useful, but the reason and ownership are often encoded only in nearby prose or implied by implementation knowledge.

The v0.64.2 `DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH` specimen illustrates the problem well:

```text
Probe context STALE
runtime fields n/a / NOT_EXERCISED
```

The behavior was correct, but a reader must understand that:

```text
STALE
= observation binding refusal
!= runtime failure
!= chat rewind
!= state corruption
```

A common attribution shape can make that distinction explicit without changing any runtime decision.

## 3. Attribution must remain derived from existing facts

Diagnostic attribution is not a new decision engine.

Allowed flow:

```text
owner result
+ observation binding/freshness fact
+ existing reason/result code where available
→ bounded diagnostic attribution record
```

Forbidden flow:

```text
diagnostic strings
→ parse/reconstruct semantic result
→ override owner result
```

or:

```text
missing owner reason
→ diagnostic layer guesses a cause
```

Missing cause remains `UNKNOWN` / `UNATTRIBUTED`.

## 4. Attribution dimensions

A diagnostic item should be conceptually explainable along independent dimensions.

### 4.1 Subject

What fact is being explained?

Examples:

```text
PROBE_CONTEXT
CORE_HANDSHAKE
RUNTIME_STATUS
TURN_BINDING
EDIT_RECONCILE
OUTPUT_REPRESENTATION
DEFERRED_MIRROR
BROADCAST_END_AUTHORITY
POST_BEND_CLOCK_HANDOFF
STRUCTURE_RESULT
WARNING_SET
CACHE_FIRST_BREAK
TELEMETRY_CONTINUITY
```

This list is illustrative, not a request to create a global runtime registry immediately.

### 4.2 Semantic owner

Which existing component owns the meaning of the underlying fact?

Conceptual owner vocabulary:

```text
HOST_ADAPTER
RUNTIME
SESSION
EDIT_RECONCILE
REPRESENTATION
LIFECYCLE
TIME
FRAME
BROADCAST
STRUCTURE
REACTION
OUTPUT_COMPAT
BOOTSTRAP_MIGRATION
RUNTIME_TELEMETRY
DIAGNOSTIC_BINDING
UNKNOWN
```

The exact machine-readable names, if ever implemented, should align with `SIMCORE_CONTRACTS_V2.md` and actual module boundaries rather than inventing fictional owners.

### 4.3 Observation source

Where did the evidence used for the displayed fact come from?

Use the freshness contract distinction:

```text
PANEL_OPEN_SNAPSHOT
COPY_ACTION_SNAPSHOT
RUNTIME_PROBE_SNAPSHOT
CURRENT_VISIBLE_CHAT
PERSISTED_CORE_STATE
CURRENT_OUTPUT_RESULT
DERIVED_DIAGNOSTIC_VIEW
UNKNOWN_SOURCE
```

Observation source is not semantic authority.

Example:

```text
semantic owner: EDIT_RECONCILE
observation source: RUNTIME_PROBE_SNAPSHOT
```

### 4.4 Binding / freshness

Reuse the Diagnostic Snapshot Freshness Contract rather than creating a second freshness classifier.

Conceptual states may include:

```text
CURRENT_BOUND
STALE
PROBE_AHEAD
CHAT_AHEAD
UNBOUND
UNAVAILABLE
UNKNOWN
```

Exact vocabulary must be frozen with the freshness contract before implementation.

### 4.5 Reason code

A reason code explains why the already-owned result took its displayed state.

Properties:

```text
short
stable
machine-readable
content-free
owned by or mechanically derived from the real producer
not a replacement for the result itself
```

Examples of acceptable shapes:

```text
PROBE_VISIBLE_INDEX_MISMATCH
CURRENT_REQUEST_HANDSHAKE_MISSING
NO_CURRENT_REQUEST_CONTEXT
PRIOR_OUTPUT_EXACT_MATCH
PRIOR_FRESH_REPRESENTATION_MATCH
VISIBLE_BODY_DIVERGED_FROM_CANONICAL_AND_FRESH
EXPLICIT_B_END
NOT_DIRECT_POST_B_END_C
B_END_TERMINAL_AFTER_NARRATIVE
OUTPUT_CALLBACK_NOT_CURRENT
DOM_SURFACE_UNAVAILABLE
```

These examples describe existing semantics; they must not be emitted unless source ownership supports them.

## 5. Result, reason and evidence must remain separate

Do not collapse these fields.

Example:

```text
result:
  REPRESENTATION_FAST_RECONCILED

reason:
  PRIOR_FRESH_REPRESENTATION_MATCH

owner:
  EDIT_RECONCILE

evidence source:
  CURRENT_VISIBLE_CHAT + REPRESENTATION FACTS
```

Likewise:

```text
result:
  NOT_EXERCISED

reason:
  PROBE_VISIBLE_INDEX_MISMATCH

owner:
  DIAGNOSTIC_BINDING

evidence source:
  RUNTIME_PROBE_SNAPSHOT + COPY_ACTION_SNAPSHOT
```

This prevents one ambiguous text label from carrying semantic result, causality and freshness simultaneously.

## 6. Reason-code authority rules

Use one of three reason-source classes.

```text
OWNER_DIRECT
= producer already has a stable reason/result discriminator

MECHANICAL_DERIVED
= diagnostic projection maps an explicit bounded predicate to a reason code

UNATTRIBUTED
= no defensible cause exists from current evidence
```

Examples:

```text
Post-B_END handoff reason `not-direct-post-b-end-c`
→ OWNER_DIRECT

probe index != visible current index
→ PROBE_VISIBLE_INDEX_MISMATCH
→ MECHANICAL_DERIVED from diagnostic binding rule

backend.set latency spike internal cause
→ UNATTRIBUTED
```

Do not upgrade `UNATTRIBUTED` merely to make diagnostics look more informative.

## 7. No private reinterpretation by consumers

Diagnostic panel, copied report and future warning mini-widget must consume the same attribution fact when one exists.

Forbidden:

```text
copy report maps STALE one way
panel maps STALE a second way
warning widget invents a third cause
```

Preferred:

```text
one bounded diagnostic attribution projection
→ panel formatting
→ copy formatting
→ optional UI surfaces
```

This does not require a new runtime service. A pure helper or typed formatter may be sufficient if implementation is later justified.

## 8. Current-turn vs not-exercised clarity

One recurring ambiguity is `NOT_EXERCISED`.

`NOT_EXERCISED` should never imply failure by itself.

Possible attribution examples:

```text
NOT_EXERCISED + NO_CURRENT_REQUEST_CONTEXT
= no request-bound evidence exists for this report

NOT_EXERCISED + PROBE_VISIBLE_INDEX_MISMATCH
= evidence exists, but cannot be bound to the visible turn safely

NOT_EXERCISED + PATH_NOT_APPLICABLE
= this subsystem legitimately did not run for the current mode/path
```

These cases should remain distinguishable.

Do not create synthetic PASS values when a path was not exercised.

## 9. UNKNOWN and UNAVAILABLE are first-class

Do not turn missing attribution into guessed attribution.

Preferred semantics:

```text
UNKNOWN
= relevant evidence may exist, but current diagnostics cannot determine the value

UNAVAILABLE
= required observation source is absent

UNATTRIBUTED
= result is known, but current evidence does not establish a defensible cause

NOT_APPLICABLE
= the fact does not apply to this path
```

Do not use empty string, `0`, `false`, or `n/a` interchangeably in any future machine-readable representation.

Human-facing text may remain compact, but internal meanings should stay distinct.

## 10. Suggested compact human presentation

The normal report must not become a wall of metadata.

Possible compact formatting:

```text
Probe context: STALE
  reason PROBE_VISIBLE_INDEX_MISMATCH
  source runtime-probe vs copy-snapshot

Edit reconcile: REPRESENTATION_FAST_RECONCILED · 1 ms
  reason PRIOR_FRESH_REPRESENTATION_MATCH
  owner edit-reconcile

Post-B_END clock handoff: INELIGIBLE
  reason NOT_DIRECT_POST_B_END_C
  owner time/lifecycle authority
```

A future panel may hide attribution details behind expansion while the copied diagnostic can retain compact one-line reason/owner fields.

Exact UI formatting is not frozen here.

## 11. Warning widget relationship

The warning mini-widget must remain intentionally shallow.

```text
warning widget
= signal that existing warning authority has findings

full diagnostic attribution
= explain owner/reason/source/freshness
```

Do not put verbose reason chains into the floating badge.

Click-to-diagnostic may reveal the normal attributed detail.

The widget must not create or reinterpret reason codes.

## 12. Privacy and boundedness

Attribution metadata must remain content-free.

Allowed:

```text
enums
short reason codes
module/owner names
turn indices
bounded fingerprints where already authorized
freshness/binding states
```

Forbidden solely for attribution:

```text
raw user text
raw assistant text
system prompt
full chat bodies
full exception dumps
unbounded provenance chains
```

## 13. Implementation gate

Do not implement this contract merely because the design exists.

Implementation becomes attractive when one of the following occurs:

```text
Diagnostic Snapshot Freshness repair is promoted
warning widget implementation touches diagnostic opening/binding
another natural diagnostic ambiguity recurs
M2 ownership changes expose an opportunity to emit existing owner reasons mechanically
broad diagnostic wording cleanup is explicitly selected as its own mini
```

Even then, keep scope observability-only.

## 14. Static fixture candidates for a future implementation

At minimum:

```text
1. current bound healthy request
   → CURRENT_BOUND
   → owner/reason consistent

2. stale probe vs visible chat
   → STALE
   → PROBE_VISIBLE_INDEX_MISMATCH
   → no current-turn semantic facts asserted

3. no request context
   → NOT_EXERCISED
   → NO_CURRENT_REQUEST_CONTEXT

4. representation fast reconcile
   → owner EDIT_RECONCILE
   → prior Fresh exact-match reason

5. genuine visible edit
   → owner EDIT_RECONCILE
   → divergence reason
   → no diagnostic reinterpretation

6. B_END authority
   → existing direct reason preserved

7. post-B_END C ineligible
   → existing reason preserved

8. known result with no defensible cause
   → UNATTRIBUTED
   → no guessed owner-internal explanation

9. warning widget consumes attribution only after click/details
   → badge semantics unchanged

10. raw body privacy unchanged

11. latest.js == install.js if runtime implementation eventually occurs

12. all existing semantic golden controls unchanged
```

## 15. Anti-patterns

Reject:

```text
diagnostic layer re-running validators
parsing human-readable diagnostic strings back into semantic facts
assigning cause from timing correlation alone
inventing severity from owner/reason codes
using owner label to imply blame
turning UNKNOWN into the nearest plausible explanation
keeping separate panel/copy/widget private reason vocabularies
expanding attribution into a generic event bus
```

`owner` means semantic ownership, not fault attribution.

## 16. Relationship to adjacent diagnostic work

```text
Diagnostic Snapshot Freshness Contract
= which observation snapshot is current / stale / bound

Diagnostic Attribution Clarity
= why a displayed fact has its state and which owner/source supports it

Warning Notification Surface
= compact exceptional signal consuming existing warning authority

future diagnostic wording cleanup
= presentation only after the underlying contracts are stable
```

These should remain separate work items unless one narrow implementation naturally requires two contracts together and the release scope is explicitly re-frozen.

## 17. Current classification

```text
SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY
= HIGH VALUE DIAGNOSTIC MAINTENANCE
= EXPLAINABILITY / OWNERSHIP CONTRACT
= RESULT / REASON / OWNER / SOURCE / FRESHNESS SEPARATED
= NO SECOND SEMANTIC AUTHORITY
= UNKNOWN / UNATTRIBUTED PRESERVING
= CONTENT-FREE / BOUNDED
= WARNING-WIDGET COMPATIBLE
= IMPLEMENTATION TRIGGERED, NOT AUTOMATIC

runtime change: NONE
prompt byte change: NONE
SnapshotStore change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
