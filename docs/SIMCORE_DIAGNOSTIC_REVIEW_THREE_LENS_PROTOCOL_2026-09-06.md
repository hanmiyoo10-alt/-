# SimCore Diagnostic Review Three-Lens Protocol

Date: 2026-09-06 KST
Status: **OPERATOR-ADOPTED · DURABLE REVIEW AUTHORITY · NON-RUNTIME**
Tracking: `#1569`
Supersedes for future-version reviews: `docs/SIMCORE_DIAGNOSTIC_REVIEW_TWO_PASS_PROTOCOL_2026-09-05.md`
Proposal record: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THIRD_LENS_ELEMENT_INVENTORY_PROPOSAL_2026-09-06.md`

## 1. Effective boundary

This protocol is adopted by operator decision on 2026-09-06 KST.

It is **not retroactive to v0.70.7**.

The first mandatory use is the **next SimCore runtime version after v0.70.7** whenever that version is legally authorized to begin.

```text
CURRENT v0.70.7 REVIEW = existing two-pass evidence remains valid
NEXT RUNTIME VERSION REVIEW = three-lens protocol mandatory
```

No version number is reserved or implied by this protocol.

## 2. Why three lenses

The three lenses intentionally separate three different reasoning jobs:

```text
LENS 1 = VERSION / RELEASE CONTRACT
Did this version prove what it was supposed to prove?

LENS 2 = COHERENT SET / TRANSITION
Do the supplied specimens form a correct causal/action sequence?

LENS 3 = ELEMENT INVENTORY
Was every defined diagnostic element explicitly inspected and dispositioned?
```

They must be reported separately. One lens does not erase findings from another.

## 3. Lens 1 — version/release contract review

Lens 1 answers only:

```text
Does the supplied evidence satisfy the current release/version acceptance contract?
```

Required behavior:

1. resolve current production identity and live gate from fresh repository authority;
2. read the exact release/version acceptance contract;
3. evaluate only evidence relevant to that contract;
4. declare release-specific `PASS / PARTIAL / FAIL / MISSING_EVIDENCE`;
5. preserve unrelated anomalies without allowing them to distort the release-specific verdict;
6. do not broaden implementation scope from incidental findings.

Lens 1 is the narrowest review.

## 4. Lens 2 — coherent-set transition/causality review

Lens 2 starts again from the supplied diagnostic specimen or coherent specimen set and asks:

```text
What does the sequence mean as one operator/action flow?
```

Examples:

```text
ordinary -> reroll
reroll -> genuine manual edit
fresh generation -> same-generation carryover
request commit -> output commit -> deferred mirror
history mutation -> cache topology change
reload -> host-local telemetry adoption
```

Rules:

- operator clarification such as reroll, manual edit, whitespace edit, refresh, disappearance, or retry is first-class evidence;
- bind each clarification to the exact specimen it describes;
- do not collapse unrelated generations, unrelated operator actions, or unrelated versions into one causal set;
- distinguish clean controls from bug-condition controls;
- preserve every new `WATCH / DEFER / FIX / BLOCKER` in a topic-appropriate repository record.

Lens 2 is strongest at transitions, causality, and cross-turn interpretation.

## 5. Lens 3 — exhaustive diagnostic-element inventory

Lens 3 is mandatory from the effective boundary onward.

It is a mechanical completeness sweep, not another narrative essay.

For every diagnostic element defined by the active diagnostic format and applicable inventory source, produce one explicit disposition per specimen/set.

Allowed states:

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

Definitions:

```text
NOT_EXERCISED = the element belongs to the diagnostic contract but this specimen/set did not exercise it.
NOT_APPLICABLE = the element does not apply to this action/mode/specimen.
```

An unobserved field must never be silently upgraded to `PASS`.

## 6. Lens-3 inventory families

The canonical inventory must follow the active diagnostic format and should cover every defined field. At minimum, when present, inspect these families:

```text
Runtime / boot / generation
Reload safety / stale drops / hook cleanup
Request hook / output hook / binding / commit state
Request timing / handshake / session load
Post-handshake / onSend / prompt-tail timing
Turn storage / output storage / checkpoint storage
Pre-snapshot mode / read hit-miss / read latency
Prior / canonical / fresh / current representation
Edit origin / edit delta / reconcile / snapshot mutation
Repeat-send / reroll / manual-edit attribution
Output provenance / representation ownership
Deferred mirror / mirror identity / transport-only state
Envelope / safe-envelope / compatibility handling
Preamble provenance / stripping policy
Cache posture / prefix / topology / break / effect
Host-prefix attribution / history mutation / alignment
Reconcile frontier / repeated break / representation correlation
Mutation / rebuild attribution
Runtime compiler identity and placement
Telemetry continuity / capsule / host-local transport / checkpoint
Broadcast lifecycle / closure / short-C lock
Summary / recurrence / source handoff / lineage
RAW frame continuity / frame guard / sequence
Evidence shape / root fence / source fence / handoff
Narrative clock / current-time authority / chronology
Stored broadcast state
Warnings / compatibility detail
COMMUNITY / platform / reaction diagnostics when defined
Any repository/document-authority anomaly discovered while reviewing
```

A future format field cannot be ignored merely because this prose list is stale. The active format is the higher-level inventory source.

## 7. Recommended Lens-3 output shape

Use a compact ledger:

```text
Element | Specimen A | Specimen B | Specimen C | Set disposition | Note
```

Only anomalous or ambiguous rows need expanded prose below the ledger.

The goal is to reduce cognitive load while making omissions visible.

## 8. Review cadence

For every qualifying diagnostic set from the next runtime version onward:

```text
STEP 1
LENS 1 · VERSION
-> release/version verdict

STEP 2
LENS 2 · SET
-> transition/causality verdict
-> preserve cross-turn findings

STEP 3
LENS 3 · ELEMENT INVENTORY
-> exhaustive ledger
-> no blank states
-> preserve any newly discovered finding
```

Do not collapse the three steps into one giant answer unless the operator explicitly requests a one-shot combined report.

## 9. Finding severity and advancement

A lens-specific `PASS` does not override a stronger finding from another lens.

Example:

```text
Lens 1 = PASS
Lens 2 = PASS + WATCH
Lens 3 = FIX
=> overall advancement blocked by unresolved FIX
```

Existing SimCore advancement authority remains:

```text
unresolved FIX or BLOCKER -> stop advancement
```

`WATCH` and `DEFER` remain non-blocking unless separately promoted by evidence.

## 10. Repository preservation

All plugin-related findings must be preserved in the repository.

Different topics must receive separate durable records rather than being buried in the release-specific record.

Examples:

```text
release acceptance -> release evidence record
Representation anomaly -> Representation/Edit-Reconcile record
storage latency -> storage/performance record
COMMUNITY classifier issue -> Community record
document authority drift -> documentation record
```

## 11. Current-version non-retroactivity

The completed v0.70.7 review remains authoritative under the protocol active when it was performed.

Do not reopen or mechanically re-score v0.70.7 solely because Lens 3 was later adopted.

A v0.70.7 specimen may still be revisited only when needed as evidence for an existing incident/FIX or as a comparator for a future version.

## 12. Administrative transaction note

During this adoption transaction, two attempted repository file writes were issued before the adoption branch existed and failed closed with HTTP 404.

Classification:

```text
FIX · TOOLING_ORDERING_MISROUTE · NON_RUNTIME · CLOSED
```

Disposition:

- no file was created;
- no branch was mutated;
- `main` was unchanged;
- `release-simcore` was unchanged;
- the correct branch was then created from fresh `main` before any successful write.

## 13. Production boundary

This protocol is review-procedure authority only.

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
product-manifest mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
```

The normal SimCore product workflow remains unchanged:

```text
repo design/evidence
-> dedicated implementation branch
-> static/CI verification
-> release-simcore deployment when runtime-changing
-> real long-chat validation
-> main documentation / continuity synchronization
```

## 14. Adoption verdict

```text
THREE_LENS_PROTOCOL = ADOPTED
EFFECTIVE = NEXT_RUNTIME_VERSION_AFTER_V0_70_7
RETROACTIVE_TO_V0_70_7 = NO
LENS_1 = VERSION_CONTRACT
LENS_2 = COHERENT_SET_TRANSITION_CAUSALITY
LENS_3 = EXHAUSTIVE_ELEMENT_INVENTORY
BLANK_ELEMENT_DISPOSITION = FORBIDDEN
```
