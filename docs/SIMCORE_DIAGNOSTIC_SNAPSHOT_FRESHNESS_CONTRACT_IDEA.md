# SimCore Diagnostic Snapshot Freshness Contract — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · OBSERVABILITY / DIAGNOSTIC FRESHNESS MODEL · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_DEFERRED_SWEEP_AFTER_06406.md`
- `docs/SIMCORE_NEXT_FOCUS_AREAS_AFTER_CACHE_RESEARCH_2026-08-25.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define one coherent freshness/authority model for the existing SimCore diagnostic panel and copied diagnostic report.

The motivating natural specimen is `DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH`, where live telemetry remembered a later request probe while the chat/state snapshot captured by the panel resolved an older visible turn.

Current behavior safely refused to present stale request data as current authority:

```text
probe user != current visible user
→ Probe context STALE
→ current-turn runtime fields collapse to n/a / NOT_EXERCISED
```

That safety behavior is correct and must remain.

The unresolved design question is narrower:

```text
Which observation snapshot does a diagnostic report belong to,
and how should panel-open state, copy-click state, runtime probe state,
and current visible chat state be related without silently mixing them?
```

This document is observability-only research. It does not authorize runtime or UI implementation.

## 2. Existing evidence and current safe behavior

The v0.64.2 natural specimen established four relevant facts:

```text
panel-open captured chat/state can become stale before copy
runtime telemetry/probe may continue advancing
copied report can therefore see mismatched observation times
existing stale guard refuses false current-turn binding
```

Adjacent same-runtime evidence later showed the expected newer visible turn without any durable rewind, strengthening the interpretation that the anomaly belongs to a panel/host snapshot freshness boundary rather than Core state corruption.

Current classification remains:

```text
WATCH_ONLY
surface: OBSERVABILITY
runtime correctness defect: NOT ESTABLISHED
state corruption: NOT OBSERVED
stale data falsely presented as current: PREVENTED
```

## 3. Four observation authorities must not be collapsed

Treat these as distinct observation sources:

```text
PANEL_OPEN_SNAPSHOT
= chat/state/indices captured when the diagnostic panel opens

COPY_ACTION_SNAPSHOT
= chat/state/indices used to materialize the copied report

RUNTIME_PROBE_SNAPSHOT
= latest bounded request/output telemetry remembered by the runtime

CURRENT_VISIBLE_CHAT
= host-visible chat/indices at the relevant observation moment
```

Important:

```text
same browser tab
!= same observation moment

same runtime generation
!= same diagnostic snapshot

latest runtime probe
!= proof that a previously captured panel chat object is current
```

A diagnostic report must never silently combine fields from different observation moments and then label the result `CURRENT TURN`.

## 4. Core freshness invariant

Canonical invariant:

```text
CURRENT-TURN CLAIM
requires one defensible coherent binding between:
- report snapshot visible indices
- report snapshot chat/state
- request/output probe identity
```

If that binding cannot be established:

```text
report may still expose bounded historical/observational facts
BUT
current-turn semantic/runtime authority must degrade explicitly
```

Allowed degraded labels include conceptually:

```text
STALE
SNAPSHOT_MISMATCH
PROBE_AHEAD_OF_SNAPSHOT
SNAPSHOT_AHEAD_OF_PROBE
UNBOUND
NOT_EXERCISED
```

Exact user-facing vocabulary should remain small and compatible with existing diagnostics.

## 5. Snapshot identity model

A future diagnostic snapshot should conceptually have a bounded identity composed only from already-needed metadata, for example:

```ts
{
  captureKind,
  capturedAt,
  runtimeGeneration,
  currentUserIndex,
  currentAssistantIndex,
  locationKey,
  stateSource
}
```

This is a design tuple, not a runtime schema proposal.

Do not retain raw chat bodies solely to establish freshness.

Do not create an unbounded snapshot history.

A compact identity/fingerprint may be useful later, but identity must primarily mean semantic observation position rather than random UUID.

## 6. Panel display and copy action are different products

The panel and copied report have different freshness expectations.

### Panel display

The open panel may legitimately represent the snapshot captured when it was opened.

A panel that remains open across a new request does not necessarily need continuous live refresh.

It should not, however, imply that an old panel snapshot is current merely because the DOM is still visible.

### Copy action

A user pressing copy normally expects a report about the current diagnostic state at copy time.

Therefore a future implementation candidate may prefer:

```text
copy click
→ capture a fresh coherent diagnostic snapshot
→ build copied report from that snapshot
```

rather than:

```text
copy click
→ reuse arbitrarily old panel-open chat/state objects
```

This candidate must still preserve the existing fail-closed stale check.

## 7. Single snapshot producer principle

Avoid separate freshness logic in panel rendering and copy-report generation.

Preferred future ownership shape:

```text
diagnostic snapshot capture helper
→ gathers current indices/chat/Core state as one bounded observation bundle

panel renderer
→ consumes snapshot

copy report builder
→ consumes snapshot

runtime probe
→ remains its existing telemetry authority
```

The helper would own observation capture only.

It must not become a second semantic validator, Session owner, host-history reconciler, or Core state authority.

## 8. Binding outcomes

Conceptual binding classes:

```text
CURRENT_BOUND
= report visible current turn and runtime probe refer to the same defensible request/output lineage

PANEL_STALE
= panel snapshot is older than the latest visible/request observation

PROBE_AHEAD
= runtime probe identifies a later request than the captured chat snapshot

PROBE_BEHIND
= captured visible chat advanced beyond the latest usable probe

UNBOUND
= no defensible current-turn relation can be established

NO_REQUEST_CONTEXT
= panel/report is valid as a general snapshot but no request-bound current-turn claim is possible
```

These are diagnostic binding semantics only.

They do not change request/output behavior.

## 9. Fail-closed rule

Freshness failure must degrade observability, never runtime correctness.

```text
chat refresh failure
Core state refresh failure
indices changed during capture
host returns transient stale snapshot
runtime probe unavailable
→ do not fabricate current binding
→ preserve diagnostics with explicit degraded freshness
→ never alter Core state or generated output
```

Do not retry in an unbounded loop trying to force a coherent snapshot.

## 10. Atomicity and race handling

A future capture helper should treat current indices as a bounded consistency guard.

Conceptually:

```text
read indices A
→ get chat/state
→ read indices B

if A == B
→ coherent candidate snapshot

if A != B
→ one bounded retry MAY be considered
→ otherwise classify capture as raced/unbound
```

This is only a design candidate.

Do not add polling, intervals, or repeated host reads merely to chase perfect freshness.

One-shot/strictly bounded capture is preferred.

## 11. Relationship to host freshness

SimCore can prove only what its host-facing observation surface returns.

Even if copy-time recapture is added later:

```text
fresh host.getChat call
!= proof that host itself returned the newest durable UI state
```

Therefore attribution vocabulary must remain conservative:

```text
SIMCORE_CAPTURE_STALE
HOST_SNAPSHOT_STALE_CANDIDATE
CAPTURE_RACE
UNKNOWN_FRESHNESS_BOUNDARY
```

Do not label PocketRisu/RisuAI or browser state as defective without direct recurrence/evidence.

## 12. Diagnostic wording principle

The diagnostic UI should answer two separate questions:

```text
What snapshot am I looking at?

Is this snapshot safely bound to the current request/output?
```

Useful bounded fields could eventually include:

```text
Diagnostic snapshot: COPY_ACTION · user @2064 · assistant @2065
Snapshot freshness: CURRENT_BOUND

or

Diagnostic snapshot: PANEL_OPEN · user @2060 · assistant @2061
Snapshot freshness: PANEL_STALE · latest probe user @2062
```

Do not flood the primary panel with internal timing or raw host-object details.

## 13. Interaction with warning widget

The warning floating widget remains governed by finalized current output `lastCore.issues` and its own current-output occurrence identity.

It must not consume a stale copied diagnostic snapshot as warning authority.

Relationship:

```text
warning widget
= current finalized output projection

diagnostic snapshot freshness
= panel/copy observation binding
```

The two may share UI navigation, but not semantic authority.

## 14. Static research/fixture candidates for a future implementation

A future implementation should prove at least:

```text
1. panel opened and copied immediately
   → CURRENT_BOUND

2. panel remains open across one new request, then user copies
   → copy-time fresh snapshot becomes current OR old panel snapshot is explicitly labeled stale

3. runtime probe ahead of captured chat
   → no false CURRENT TURN claim

4. chat ahead of usable runtime probe
   → no false request binding

5. indices change during capture
   → bounded retry or explicit raced/unbound classification

6. host getChat/state refresh throws
   → report remains fail-closed / diagnostics do not break Core

7. no raw-body retention added

8. no Core SnapshotStore semantic writes

9. no request-history mutation

10. no network/timer/polling dependency

11. existing v0.64.2 stale specimen remains a positive regression control for fail-closed behavior

12. latest.js == install.js when/if implementation eventually occurs
```

## 15. Promotion gate

Current evidence is one natural stale-snapshot specimen plus adjacent recovery evidence.

That is enough for a durable research contract, but not enough to authorize a runtime/UI mini by itself.

Promotion from WATCH to implementation candidate requires at least one of:

```text
A. natural recurrence where panel-open → later copy again produces stale snapshot

B. user-visible diagnostic confusion caused by stale panel/copy binding

C. diagnostic maintenance work touches this exact capture path anyway,
   making a narrow equivalence-preserving freshness refactor low-risk

D. warning-widget implementation needs a current diagnostic-open path and exposes the same snapshot-capture debt concretely
```

Otherwise retain:

```text
WATCH / OBSERVABILITY
NO CORRECTNESS FIX
```

## 16. Explicit non-goals

Do not use this work to:

```text
rewrite chat history
force host state refresh semantics
change Session/Core authority
change SnapshotStore schema
change request/output lifecycle
add background polling
retain raw message bodies
make the panel a real-time event-stream dashboard
couple SimCore to Usage Dashboard
```

## 17. Current classification

```text
SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT
= GOOD DIAGNOSTIC / OPERATOR UX RESEARCH CANDIDATE
= WATCH-GROUNDED
= OBSERVABILITY ONLY
= PANEL_OPEN != COPY_ACTION != RUNTIME_PROBE != CURRENT_VISIBLE_CHAT
= CURRENT-TURN CLAIM REQUIRES COHERENT SNAPSHOT BINDING
= EXISTING STALE FAIL-CLOSED BEHAVIOR PRESERVED
= COPY-TIME RECAPTURE IS A FUTURE CANDIDATE, NOT YET AUTHORIZED
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
= NO SNAPSHOTSTORE CHANGE
= NO RENDERER RESPONSIBILITY CHANGE
```
