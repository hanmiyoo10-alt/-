# SimCore Diagnostic Review Two-Pass Protocol

Date: 2026-09-05 KST
Status: **HISTORICAL AUTHORITY FOR v0.70.7 · SUPERSEDED FOR FUTURE VERSIONS · NON-RUNTIME**
Tracking: `#1550`
Superseded for future-version reviews by: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`

## 0. Supersession boundary

This protocol remains the valid review authority for the completed v0.70.7 diagnostic review.

It is superseded prospectively, not retroactively.

```text
v0.70.7 = two-pass review remains valid
next SimCore runtime version after v0.70.7 = three-lens protocol mandatory
```

Do not reopen or mechanically re-score v0.70.7 solely because the three-lens protocol was adopted later.

## 1. Purpose

Future SimCore diagnostic-log reviews under this historical protocol were intentionally split into two separate passes.

The goal was to prevent release-goal anchoring from hiding unrelated runtime or subsystem evidence.

The same supplied diagnostic log, or one coherent diagnostic log set, could be used by both passes. The reviews still had to be presented separately.

## 2. Pass 1 — release/version contract review

Pass 1 answers only:

```text
Does this log prove what the current version/release is supposed to prove?
```

Required behavior:

1. resolve current production version and live gate from fresh repository authority;
2. read the release-specific acceptance contract;
3. compare only the relevant fields against that contract;
4. declare release-specific PASS / PARTIAL / FAIL / MISSING EVIDENCE;
5. preserve any unrelated anomaly noticed during the pass, but do not mix it into the release-specific verdict;
6. do not expand the implementation scope from incidental evidence.

Examples of Pass-1 questions:

```text
Does the v0.70.7 output-storage diagnostic expose the intended set span?
Does the observed payload-size/latency relationship satisfy the required Stage evidence?
Is the current live gate complete or is an independent sample still missing?
```

## 3. Pass 2 — independent diagnostic audit

Pass 2 starts again from the diagnostic itself and answers:

```text
What does this log tell us about every diagnostic surface that is actually present?
```

The release goal is not the organizing authority for this pass.

Inspect all applicable surfaces, including but not limited to:

```text
runtime / hook / reload safety
request timing / handshake / session / prompt tail
turn storage / output storage / checkpoint storage
Representation / Edit Reconcile
Deferred Mirror / output identity
repeat-send / reroll / manual-edit attribution
cache / history / topology / provider-cache claim boundaries
Output Compat / preamble compatibility
Structure / COMMUNITY / Reaction
Evidence / Lineage / Handoff / Recurrence
Frame / Continuity / Time / Broadcast
telemetry transport / capsule / host-local fallback
compiler identity / runtime placement
repo/document authority discovered during review
```

Each finding is independently classified:

```text
PASS
WATCH
DEFER
FIX
BLOCKER
```

## 4. Individual-log vs coherent-set handling

A single diagnostic may be audited alone when it contains enough local context.

When several diagnostics belong to one coherent action sequence, review them as one set in Pass 2 so transitions can be judged correctly, for example:

```text
ordinary output
-> reroll/repeat-send
-> genuine manual edit
-> reload
```

Do not collapse unrelated generations, unrelated operator actions, or unrelated versions into one causal set.

Operator clarification about actions such as reroll, manual edit, whitespace edit, refresh, or disappearing prior output is first-class evidence and must be bound to the exact specimen it describes.

## 5. Separation rule

The historical review cadence was:

```text
PASS 1
release/version-specific review
-> report release verdict

PASS 2
independent diagnostic audit
-> report per-surface findings
-> preserve new WATCH / DEFER / FIX / BLOCKER items
```

Do not reinterpret this historical record as having required the later element-inventory lens.

## 6. Repository preservation

Plugin-related findings must be recorded in the repository.

If Pass 2 discovers a finding with a different owner or topic, create a separate durable record for that topic rather than burying it inside the release-specific evidence record.

Examples:

```text
storage attribution evidence -> release live evidence record
COMMUNITY classifier recurrence -> separate Community record
Representation anomaly -> separate Representation/Edit-Reconcile record
document authority drift -> separate documentation record
```

## 7. Scope and authority

This protocol changed review procedure only.

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
persistent schema mutation = NONE
```

Future runtime repairs still require the normal SimCore workflow:

```text
repo design/evidence
-> dedicated implementation branch
-> static/CI verification
-> release-simcore publication when runtime-changing
-> real long-chat validation
-> main documentation / continuity synchronization
```

## 8. Historical closure

The two-pass protocol remains authoritative evidence for reviews already completed under it, especially v0.70.7.

All future runtime-version diagnostic reviews must use the adopted three-lens authority after the stated effective boundary.
