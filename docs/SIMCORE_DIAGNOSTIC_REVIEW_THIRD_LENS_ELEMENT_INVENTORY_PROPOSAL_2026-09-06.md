# SimCore Diagnostic Review Third-Lens Element Inventory Proposal

Date: 2026-09-06 KST
Status: **PROPOSAL · NON-RUNTIME · NOT YET ADOPTED**
Tracking: `#1569`

## 1. Motivation

The current durable protocol separates diagnostic review into two passes:

```text
Pass 1 = release/version contract review
Pass 2 = independent coherent diagnostic audit
```

Pass 2 already asks the reviewer to inspect all diagnostic surfaces actually present. That is useful, but the review is still written as a holistic audit. A surface can therefore be present in the diagnostic format yet receive no explicit line-item disposition if the reviewer does not notice it.

The proposed third lens exists only to eliminate that omission class.

## 2. Proposed three-lens model

```text
1. VERSION LENS
   Does the evidence prove what this release/version is supposed to prove?

2. SET LENS
   What do the specimens say when read as one coherent operator/action sequence?
   Are transitions, causality, carryover, reroll, edit, reload, and cross-turn relationships correct?

3. ELEMENT-INVENTORY LENS
   For every defined diagnostic element, what is its explicit disposition?
```

The three lenses answer different questions and must not collapse into one verdict.

## 3. Why Lens 3 is not redundant with Pass 2

Pass 2 is transition- and context-oriented. It is strongest at questions such as:

```text
ordinary -> reroll
reroll -> genuine edit
fresh generation -> same-generation carryover
output commit -> deferred mirror
history change -> cache topology change
```

Lens 3 is inventory-oriented. It does not ask what the set means as a story. It asks whether every individual diagnostic element was explicitly inspected.

Therefore:

```text
Pass 2 can say: reroll path is healthy.
Lens 3 must still individually score:
- request hook
- binding
- pre-snapshot mode
- read hit/miss
- read latency
- prior representation
- canonical/fresh/current identities
- edit origin
- reconcile result
- snapshot mutation
- history mutation
- cache topology
- SimCore break contribution
- output commit state
- mirror state
- warnings
- etc.
```

A correct set-level conclusion does not replace the element census.

## 4. Mandatory explicit disposition

Every applicable inventory row must receive one explicit state:

```text
PASS
WATCH
DEFER
FIX
BLOCKER
NOT_EXERCISED
NOT_APPLICABLE
```

No blank cells.

Important distinction:

```text
NOT_EXERCISED = the element exists in the diagnostic contract but this specimen/set did not exercise it.
NOT_APPLICABLE = the element does not apply to this specimen/action/mode.
```

An unobserved element must never be silently upgraded to PASS.

## 5. Suggested inventory families

The exact registry should be derived from the diagnostic format/version and kept deterministic. At minimum, the inventory should cover the following families when defined by the active format:

```text
Runtime / boot / generation
Request hook / output hook / cleanup / stale safety
Turn binding / commit / pending state
Handshake / session / character / prompt timings
Turn storage / output storage / checkpoint storage
Pre-snapshot mode / read hit-miss / latency
Representation canonical / fresh / current / prior
Edit origin / reconcile / snapshot mutation
Repeat-send / reroll / manual-edit attribution
Deferred Mirror / output identity / raw-body retention
Cache break / history mutation / prefix / topology / provider-cache boundary
Output compatibility / preamble / safe-envelope handling
Structure / COMMUNITY / platform / reaction validation
Evidence / lineage / handoff / recurrence
Frame / continuity / narrative time / Broadcast
Telemetry continuity / capsule / session / host-local fallback
Compiler stable / slow / volatile / full identity
Runtime placement / prompt insertion position
Warnings / diagnostic compatibility counters
Repository/document authority observed during review
```

This list is illustrative. Adoption should bind Lens 3 to an explicit inventory source so future diagnostic fields cannot disappear from review merely because prose documentation was not updated.

## 6. Review output shape

Recommended Lens-3 output is a compact ledger rather than another narrative essay:

```text
Element | Specimen A | Specimen B | Specimen C | Set disposition | Evidence note
```

Examples:

```text
Prior representation | UNAVAILABLE | EXACT | EXACT | PASS | expected progression
Pre snapshot read latency | n/a | n/a | 1.839 s | WATCH | recurrent performance observation
Edit origin | NONE | NONE | NONE | PASS | no false edit on clean reroll
Output mirror | COMMITTED | COMMITTED | NOT_EXERCISED | PASS + NOT_EXERCISED | C captured request-side only
Provider cache | UNVERIFIED | UNVERIFIED | UNVERIFIED | DEFER | no provider proof
```

This makes omissions visually obvious.

## 7. Relationship between the three verdicts

The lenses may disagree without contradiction because they answer different questions.

Example:

```text
Lens 1 = PASS
The release-specific evidence requirement is satisfied.

Lens 2 = PASS with WATCH
The coherent sequence is correct, with a storage-latency recurrence.

Lens 3 = FIX
One individual Representation element exposes a false rebuild path.
```

The final advancement rule still respects the strongest unresolved correctness classification:

```text
unresolved FIX or BLOCKER -> stop advancement
```

A release/version PASS does not erase an element-level FIX.

## 8. Practical benefit

The model deliberately distributes cognitive load:

```text
Lens 1 = narrow goal check
Lens 2 = causal/story check
Lens 3 = checklist/census check
```

This is expected to reduce:

```text
release-goal anchoring
cross-turn transition mistakes
small-field omission
implicit PASS assumptions
review fatigue from one giant undifferentiated audit
```

It also gives the operator and reviewer a predictable division of work: first decide whether the release did its job, then understand the coherent sequence, then mechanically sweep every diagnostic element.

## 9. Adoption boundary

This document records a proposal only.

It does not yet replace or modify:

`docs/SIMCORE_DIAGNOSTIC_REVIEW_TWO_PASS_PROTOCOL_2026-09-05.md`

If adopted, a separate protocol-authority change should define:

1. the canonical diagnostic-element inventory source;
2. ordering and naming rules;
3. mandatory disposition vocabulary;
4. treatment of NOT_EXERCISED vs NOT_APPLICABLE;
5. whether Lens 3 is required for every supplied diagnostic set or only for live-gate/incident reviews;
6. the exact advancement interaction with FIX/BLOCKER findings.

## 10. Production boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
product-manifest mutation = NONE
production version = UNCHANGED
```
