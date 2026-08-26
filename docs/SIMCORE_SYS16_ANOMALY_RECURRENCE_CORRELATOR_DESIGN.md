# SYS-16 — Anomaly Recurrence Correlator — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · REVIEWED RECURRENCE / CROSS-FAMILY CORRELATION MEMORY · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-16
Idea          = Anomaly Recurrence Correlator
Size          = MEDIUM
Importance    = 4 / HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX_DESIGN.md`
- `docs/SIMCORE_HOST_OBSERVATION_RECURRENCE_MATRIX_IDEA.md`
- `docs/SIMCORE_SYS52_OPERATOR_ERROR_SPECIMEN_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS18_EVIDENCE_PROVENANCE_CHAIN_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- future `SYS-15 WATCH Aging Review`

Existing authorities SYS-16 must not replace:
- `SIMCORE_ANOMALY_WATCH.md` / `SIMCORE_DEFERRED_LEDGER.md` as anomaly/disposition memory;
- dedicated live/runtime/release evidence documents as exact specimen authority;
- S-12 Natural Evidence Corpus Index as natural-specimen navigation;
- SYS-52 as operator/tooling-process specimen memory;
- SYS-21 as forensic classification-consistency review;
- SYS-13 as proof-kind / claim-scope authority;
- owning gate/release/runtime authority as WATCH / DEFER / FIX / BLOCKER consequence authority;
- domain-specific research matrices such as the Host Observation Recurrence Matrix;
- future SYS-15 as WATCH aging/review policy.

---

## 1. Problem

SimCore deliberately preserves the first suspicious natural specimen before recurrence is established.

That is necessary because waiting for a second occurrence can erase valuable evidence.

The repository therefore contains several legitimate shapes:

```text
one-off WATCH
same-input reroll that clears the symptom
same-runtime new-turn recurrence candidate
cross-runtime repeated natural symptom
multi-sample same-runtime series
mitigated defect with later recurrence control
operator/tooling process error that may recur
separate anomaly families that merely share one runtime/context
```

These shapes must not be collapsed into one crude rule such as:

```text
same words twice
→ recurrence confirmed
```

or:

```text
same runtime
→ same cause
```

or:

```text
recurrence confirmed
→ FIX / BLOCKER
```

The repository already has concrete evidence showing why.

`GENERATION_SEMANTIC_EXCURSION` is preserved as a one-off WATCH whose exact same user turn regenerated back into scope. The reroll is useful control evidence, but it is not a second independent natural occurrence.

`PARTIAL_PREVIOUS_TURN_REPLAY` was preserved with recurrence telemetry `FIRST / NO MATCH`; the same-input reroll removed the replay. Again, reroll behavior informs reproducibility/clearance but does not manufacture recurrence.

The Host Observation Recurrence Matrix provides a second important control. `CORE_HANDSHAKE_TRANSIENT_MISS` and `PRE_SIMCORE_HOST_HISTORY_FRONTIER` occurred in the same runtime and near each other, yet current evidence supports only `COINCIDENT_CONTEXT_ONLY`, not one combined defect. A healthy handshake coexisted with the history frontier, disproving the simple claim that frontier presence is sufficient for handshake failure.

SYS-16 defines one bounded semantic recurrence/correlation contract so later reviews can answer:

```text
Is this genuinely another specimen of the same reviewed anomaly family?
How independent is the new specimen?
Does this establish natural recurrence, controlled reproduction, or only contextual similarity?
Are two separate families actually correlated, or merely adjacent?
What healthy / contrary controls prevent over-merging?
```

without changing the owning anomaly disposition automatically.

---

## 2. Core invariant

```text
reviewed anomaly/process family contract
+ exact source-backed specimen identities
+ specimen-independence classification
+ required family discriminators
+ contrary / healthy controls
+ bounded cross-family comparison when requested
→ reviewed recurrence / correlation posture

SYS-16
!= anomaly auto-classifier
!= root-cause engine
!= severity engine
!= WATCH/FIX/BLOCKER promoter
!= runtime telemetry collector
!= raw-log scraper
!= vector similarity engine
!= LLM semantic clustering service
!= gate engine
!= repair selector
!= runtime/release authority
```

Canonical question:

> What recurrence or bounded correlation claim is actually supported by the preserved specimens, without merging families or escalating impact beyond the evidence?

SYS-16 does not answer:

> What caused the anomaly?

> Should runtime code be patched?

> Is the current gate blocked?

> Is a recurring symptom necessarily severe?

Those remain with their owning evidence, forensic, gate and implementation authorities.

---

## 3. Recurrence is family-scoped, not text-similarity-scoped

Frozen rule:

```text
similar prose
!= same anomaly family
```

A recurrence claim requires a reviewed **family contract**.

One v1 family contract contains:

```text
Family ID
Family label
Owning authority
Observation plane / concern
Required match dimensions
Allowed variation dimensions
Explicit exclusion dimensions
Known healthy / contrary controls
Current disposition authority ref
Family contract state
```

### Required match dimensions

These are the dimensions that make a new specimen eligible for the same family.

Examples may include:

```text
same forbidden visible outcome class
same lifecycle transition shape
same classifier misclassification direction
same host observation result family
same operator/process deviation class
same bounded state/diagnostic contradiction
```

The exact dimensions are family-specific and reviewed.

### Allowed variation dimensions

A family may permit differences such as:

```text
version
runtime generation
mode
turn index
surface wording
specific content topic
exact character count delta
```

when those fields are not part of the family identity.

### Explicit exclusion dimensions

An exclusion prevents a superficially similar specimen from being silently absorbed.

Examples:

```text
explicit user-requested flashback
vs unrequested chronology rollback

same-input regeneration
vs independent new-turn occurrence

healthy host-history frontier
vs handshake activation miss

known representation carryover
vs genuine visible user edit
```

If required/exclusion boundaries are unresolved:

```text
RECURRENCE_REVIEW_REQUIRED
```

rather than guessing family membership.

---

## 4. Family contract identity and versioning

A family definition may become more precise over time.

Do not silently rewrite historical recurrence claims under a materially changed family definition.

Frozen rule:

```text
Family ID + Family Contract Version
= recurrence comparison contract identity
```

Minor clerical clarification that does not change membership semantics may retain the contract version with a documented amendment.

Material changes such as:
- adding/removing a required discriminator;
- changing an exclusion boundary;
- splitting one broad family into two;
- merging previously distinct families after new evidence;

require a new family-contract version or explicit split/supersession record.

Historical specimens remain attached to the contract version under which they were reviewed unless a bounded re-review explicitly reclassifies them.

---

## 5. Specimen identity comes from source evidence

SYS-16 never invents a specimen because two paragraphs look alike.

Each compared specimen must have an exact source-backed identity.

Preferred identities, when available:

```text
S-12 natural specimen ID
named live-evidence specimen / dedicated evidence doc
runtime + turn pair/sequence named by the evidence authority
SYS-52 operator-error specimen ID after later application
release/repository incident evidence identity
other bounded source-defined specimen identity
```

Rule:

```text
one source-defined proof sequence
!= automatically multiple recurrence specimens
```

If a source document treats a multi-turn sequence as one proof unit, SYS-16 must not split it merely to increase the count.

Likewise, duplicate references to the same underlying event across several docs remain one specimen.

---

## 6. Specimen independence — mandatory v1 field

A recurrence claim must preserve how independent each specimen is from another.

Frozen v1 independence classes:

```text
IND-01 NATURAL_NEW_OCCURRENCE
IND-02 SAME_INPUT_REROLL_OR_REGEN
IND-03 NEIGHBOR_CONTROL
IND-04 CONTROLLED_LIVE_REPRODUCTION
IND-05 DETERMINISTIC_SYNTHETIC_REPRODUCTION
IND-06 DUPLICATE_REFERENCE_SAME_EVENT
IND-07 INDEPENDENCE_UNRESOLVED
```

### IND-01 `NATURAL_NEW_OCCURRENCE`

A distinct natural operational event/source-defined specimen.

This is the primary class that may establish **natural recurrence** when the family contract also matches.

### IND-02 `SAME_INPUT_REROLL_OR_REGEN`

Same user turn/input is regenerated/rerolled.

It may establish:
- symptom reproduced on reroll;
- symptom cleared on reroll;
- generation instability/control behavior.

It does **not** count as a second independent natural recurrence.

### IND-03 `NEIGHBOR_CONTROL`

A nearby healthy/comparable turn used to test sufficiency or co-occurrence claims.

It is a control, not a recurrence specimen.

### IND-04 `CONTROLLED_LIVE_REPRODUCTION`

A deliberate production/live action created specifically to exercise the condition.

It may strengthen reproducibility evidence but remains distinct from natural recurrence.

### IND-05 `DETERMINISTIC_SYNTHETIC_REPRODUCTION`

Fixture/unit/static/replay reproduction.

This belongs to deterministic proof scope and must not be promoted into natural recurrence.

### IND-06 `DUPLICATE_REFERENCE_SAME_EVENT`

Two records point to the same underlying event.

Count once.

### IND-07 `INDEPENDENCE_UNRESOLVED`

The repository cannot prove whether two references represent independent events.

Fail closed: do not count as natural recurrence until resolved.

---

## 7. Frozen same-family recurrence posture

Exactly five v1 postures:

```text
RECURRENCE_FIRST_ONLY
RECURRENCE_CANDIDATE
RECURRENCE_CONFIRMED
RECURRENCE_SERIES_ESTABLISHED
RECURRENCE_REVIEW_REQUIRED
```

### `RECURRENCE_FIRST_ONLY`

Only one independent qualifying natural specimen is established.

Same-input rerolls, controls or synthetic reproductions do not change this posture by themselves.

### `RECURRENCE_CANDIDATE`

A later source-backed event plausibly belongs to the same family, but one or more required family/independence discriminators remain unresolved.

No escalation is implied.

### `RECURRENCE_CONFIRMED`

At least two independent qualifying natural specimens satisfy the same reviewed family contract without an exclusion conflict.

This means only:

```text
same reviewed family recurred naturally
```

It does not establish:
- root cause;
- severity;
- repeatability on demand;
- regression attribution;
- current blocker status.

### `RECURRENCE_SERIES_ESTABLISHED`

The owning evidence defines a bounded multi-specimen natural series and the family contract is consistently satisfied across that series.

This is not a severity level and is not triggered merely by reaching an arbitrary global count.

The v0.64.2 marching Host-history frontier series is a canonical example of a source-defined series shape.

### `RECURRENCE_REVIEW_REQUIRED`

Family membership, independence, or required comparison context is materially ambiguous/contradictory.

No guess-based count or promotion is allowed.

---

## 8. No global numeric recurrence severity

SYS-16 v1 explicitly rejects a scalar score such as:

```text
1 occurrence = 1 point
3 occurrences = medium
5 occurrences = blocker
```

Reasons:
- one rare hard state corruption can matter more than many harmless observations;
- some anomaly families naturally cluster within one runtime;
- one source-defined sequence can contain many observations without representing independent failures;
- recurrence and impact are different axes;
- version/runtime diversity may matter more than raw count for some claims.

SYS-16 may preserve exact counts for navigation, but counts do not calculate severity.

---

## 9. Natural recurrence vs reproducibility

Frozen distinction:

```text
NATURAL RECURRENCE
= independent ordinary operational occurrences

CONTROLLED REPRODUCTION
= deliberate live reproduction

DETERMINISTIC REPRODUCTION
= fixture/unit/static/replay proof
```

These can support different investigations, but they are not interchangeable.

Example:

```text
one natural anomaly
+ deterministic reproduction
```

may establish a strong reproducible mechanism while natural recurrence remains `FIRST_ONLY`.

Conversely:

```text
multiple natural recurrences
+ no deterministic reproduction
```

may establish recurrence while root cause remains unknown.

SYS-13 remains the proof-scope authority for what each proof kind can establish.

---

## 10. Cross-family correlation is separate from recurrence

Two anomaly families may occur in the same runtime, turn neighborhood, mode or release without being one family.

SYS-16 therefore keeps:

```text
same-family recurrence posture
```

separate from:

```text
cross-family correlation posture
```

A cross-family relation never silently merges the family IDs.

---

## 11. Frozen cross-family correlation vocabulary

SYS-16 generalizes only the non-causal portion of the existing Host Observation Recurrence Matrix vocabulary.

Exactly five v1 relation states:

```text
CORRELATION_UNRELATED_OR_NOT_COMPARABLE
CORRELATION_CONTEXT_ONLY
CORRELATION_SHARED_DISCRIMINATOR
CORRELATION_OBSERVATION_CONFIRMED
CORRELATION_REVIEW_REQUIRED
```

### `CORRELATION_UNRELATED_OR_NOT_COMPARABLE`

The preserved evidence does not provide enough comparable context or the families clearly occupy unrelated observation contracts.

### `CORRELATION_CONTEXT_ONLY`

The families share runtime/version/adjacency/mode or another broad context, but no bounded discriminator connects occurrence.

Canonical example:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
vs PRE_SIMCORE_HOST_HISTORY_FRONTIER
→ same runtime / adjacent observations
→ currently COINCIDENT_CONTEXT_ONLY
```

### `CORRELATION_SHARED_DISCRIMINATOR`

A bounded discriminator is repeatedly present with both affected families and meaningfully constrained by controls.

One shared discriminator is correlation evidence only.
It is not root-cause proof.

### `CORRELATION_OBSERVATION_CONFIRMED`

Multiple paired natural specimens show the two family results repeatedly co-varying under comparable contexts, with healthy/contrary controls sufficient to rule out trivial context-only explanation.

Still:

```text
CORRELATION_OBSERVATION_CONFIRMED
!= CAUSATION
```

### `CORRELATION_REVIEW_REQUIRED`

Pairing, context comparability, controls or discriminator identity are insufficient/contradictory.

---

## 12. Causality is explicitly out of scope

The Host Observation Recurrence Matrix includes research levels such as `CAUSAL_CANDIDATE` and `CAUSAL_REPRODUCTION` for that bounded domain study.

SYS-16 does not generalize those into a global automatic causality ladder.

Frozen rule:

```text
SYS-16 output
→ recurrence / correlation evidence
→ MAY TRIGGER a separate attribution investigation

SYS-16 output
!= root-cause conclusion
```

Any causal claim requires the owning domain investigation and direct proof appropriate to that mechanism.

No anomaly family may be merged solely because SYS-16 reports cross-family correlation.

---

## 13. Healthy and contrary controls are first-class

A useful correlation system needs evidence that weakens a hypothesis, not only evidence that supports it.

Each family/cross-family review may name:

```text
healthy controls
contrary controls
missing comparison quadrants
```

Canonical current example:

```text
handshake healthy + history frontier present
```

is a direct contrary control against:

```text
history frontier presence
→ necessarily causes handshake miss
```

SYS-16 must preserve such controls rather than hiding them behind a positive recurrence count.

A correlation posture may only strengthen when the required control structure is actually supported.

---

## 14. Family split is safer than forced merge

When two specimens share some visible shape but violate required family discriminators:

```text
DO NOT widen the family until both fit
```

Instead:

```text
preserve specimen separately
→ RECURRENCE_REVIEW_REQUIRED
→ create/review a narrower sibling family if warranted
```

Similarly, a broad historical family may later need to split.

A split must preserve:
- original family contract/version;
- original specimen reviews;
- new child family identities;
- reason for split;
- no retroactive deletion of old evidence.

SYS-02 may later represent semantic supersession where a living family definition is formally replaced, but historical recurrence records remain point-in-time evidence.

---

## 15. Disposition remains source-owned

SYS-16 deliberately does not emit WATCH / DEFER / FIX / BLOCKER.

Those belong to existing anomaly/gate authorities.

Frozen flow:

```text
new specimen captured immediately
→ source anomaly/process authority classifies/preserves it
→ SYS-16 reviews family recurrence/correlation
→ owning authority MAY re-review disposition if recurrence materially changes risk
```

Mandatory anti-inference:

```text
RECURRENCE_CONFIRMED
!= FIX
!= BLOCKER

RECURRENCE_FIRST_ONLY
!= harmless

CORRELATION_OBSERVATION_CONFIRMED
!= root cause
```

One confirmed recurrence can remain WATCH.
One first specimen can already be BLOCKER if the owning evidence proves a hard stop condition.

---

## 16. Relationship to immediate anomaly capture

SYS-16 never delays first-specimen preservation.

Canonical order remains:

```text
suspicious specimen appears
→ capture immediately
→ classify under owning authority
→ continue only after required containment
→ recurrence review later / immediately if comparison evidence already exists
```

Reject:

```text
wait for recurrence
→ then decide whether first specimen deserved preservation
```

Recurrence controls investigation priority and pattern confidence, not whether the first evidence exists.

---

## 17. Relationship to S-12 Natural Evidence Corpus Index

S-12 answers:

```text
What natural specimens exist and where is their evidence?
```

SYS-16 answers:

```text
Which source-backed specimens belong to the same reviewed anomaly family,
and what recurrence/correlation posture do they support?
```

S-12 specimen IDs are preferred inputs when available, but SYS-16 does not change S-12 naturalness/disposition or duplicate raw evidence.

A controlled live reproduction excluded from S-12 may still appear in SYS-16 as `IND-04`, explicitly separated from natural recurrence.

---

## 18. Relationship to SYS-52 Operator Error Specimen Ledger

SYS-52 preserves each meaningful process deviation.

SYS-16 may later correlate those reviewed specimens by a reviewed process family such as:

```text
selection-pointer drift
wrong mutation surface
precondition-order failure
close-order error
```

But:
- SYS-16 does not score operators;
- recurrence does not auto-escalate operator severity;
- repeated process errors do not become product defects automatically;
- SYS-52 remains the historical specimen authority.

This fulfills SYS-52's frozen boundary that recurrence/correlation belongs to SYS-16 rather than the specimen ledger itself.

---

## 19. Relationship to SYS-21 Forensic Classification Consistency Check

A confirmed recurrence may make an old classification worth reviewing.

Example shape:

```text
WATCH
+ later RECURRENCE_CONFIRMED
→ SYS-21 / owning authority review may ask whether WATCH still matches evidence
```

But SYS-16 cannot directly promote/demote it.

Likewise, absence of recurrence does not justify downgrading a directly proven defect.

---

## 20. Relationship to SYS-28 Verification Debt Index

SYS-16 may expose that a recurrence investigation needs a named evidence/control slot.

That becomes verification debt only after the owning evidence/gate authority explicitly establishes the obligation.

```text
SYS-16 sees missing healthy quadrant
!= automatically new required proof debt
```

SYS-28 remains the durable debt authority after requirement review.

---

## 21. Relationship to future SYS-15 WATCH Aging Review

SYS-15 is expected to consume fields such as:

```text
first seen
last independently seen
recurrence posture
latest source disposition
next review trigger
```

SYS-16 provides recurrence context only.

It must not implement age-based dismissal or severity.

Example:

```text
old WATCH + no recurrence
```

may be lower review priority, but it is not automatically `DISMISSED_NO_DEFECT`.

Similarly:

```text
recent recurrent WATCH
```

may deserve faster review without becoming a blocker automatically.

---

## 22. Frozen v1 durable materialization

The useful v1 implementation is a curated repository document, conceptually:

```text
docs/SIMCORE_ANOMALY_RECURRENCE_INDEX.md
```

It contains two reviewed sections:

```text
A. Same-family recurrence rows
B. Cross-family correlation rows
```

### Same-family row — frozen fields

```text
Family ID
Family Contract Version
Owner Authority
First Specimen
Latest Specimen
Independent Natural Specimens
Controlled Reproductions
Deterministic Reproductions
Recurrence Posture
Required Match Summary
Contrary / Healthy Controls
Current Disposition Ref
Next Review Trigger
Record State
```

### Cross-family row — frozen fields

```text
Relation ID
Family A
Family B
Comparable Context
Shared Discriminator
Healthy / Contrary Controls
Correlation Posture
Evidence Refs
Explicit Non-Claim
Next Review Trigger
Record State
```

No raw chat body or full diagnostic dump belongs in the index.
Source evidence remains authoritative.

---

## 23. Why v1 is `NR_DOC_ONLY`

The hard part of SYS-16 is semantic review:

```text
family membership
required discriminator selection
independence classification
control adequacy
cross-family comparability
```

Those are not safely inferable from filenames, token similarity, timestamps or generic embeddings.

A deterministic tool could later count already-reviewed rows, but counting is not the core value and does not justify creating a semantic auto-correlator.

Therefore v1 deliberately avoids:

```text
vector similarity clustering
LLM family assignment
auto family merge/split
log scraping
runtime diagnostic ingestion
background watcher
GitHub Action
severity scoring
repo writer
```

Frozen classification:

```text
Apply Class = NR_DOC_ONLY
```

If a later structured manifest plus deterministic counting/checking tool becomes desirable, it is a separate executable/protected design decision rather than silent expansion of SYS-16 v1.

---

## 24. Record states

Each recurrence/correlation row uses one of exactly four record states:

```text
RECURRENCE_RECORD_ACTIVE
RECURRENCE_RECORD_REVIEW_REQUIRED
RECURRENCE_RECORD_SUPERSEDED
RECURRENCE_RECORD_CLOSED
```

`CLOSED` means the current review obligation is closed, not that historical specimens disappear.

`SUPERSEDED` preserves a prior family/relation definition when a newer reviewed contract replaces it.

No record is deleted merely because a mitigation shipped or a later hypothesis changed.

---

## 25. Update triggers

Review/update a SYS-16 row when one of these occurs:

```text
new source-backed specimen for the family
same-input reroll materially changes reproducibility evidence
controlled/deterministic reproduction appears
new healthy or contrary control appears
family contract is split/amended/superseded
new version/runtime materially broadens recurrence scope
owning disposition changes
cross-family shared discriminator appears/disappears
future SYS-15 aging review requests latest recurrence context
```

Do not update a row merely because time passed with no new evidence.
Time-based review belongs to SYS-15.

---

## 26. Canonical current seed examples

Later application should begin from existing reviewed evidence rather than inventing synthetic rows.

### Seed A — `GENERATION_SEMANTIC_EXCURSION`

Current source posture:

```text
WATCH_ONLY
one natural affected generation
same-input regeneration corrected scope
runtime diagnostics otherwise healthy
```

Expected SYS-16 posture before any new natural specimen:

```text
RECURRENCE_FIRST_ONLY
reroll = IND-02 control
```

### Seed B — `PARTIAL_PREVIOUS_TURN_REPLAY`

Current source posture includes:

```text
Recurrence telemetry = FIRST / NO MATCH
same-input reroll removed replay
```

Expected SYS-16 posture:

```text
RECURRENCE_FIRST_ONLY
reroll = IND-02 control
```

### Seed C — Host history frontier series

Current source evidence already identifies a seven-sample same-runtime marching series.

Expected posture:

```text
RECURRENCE_SERIES_ESTABLISHED
```

without promoting correctness impact or root cause.

### Seed D — handshake miss vs history frontier

Current specialized matrix already establishes:

```text
same runtime
adjacent observations
healthy handshake + frontier present control
relationship = COINCIDENT_CONTEXT_ONLY
```

Expected generalized SYS-16 relation:

```text
CORRELATION_CONTEXT_ONLY
```

The specialized Host matrix remains the detailed source authority.

### Seed E — SYS-52 process specimens

Later SYS-52 application may expose repeated process-family candidates.

Until two source-backed independent process specimens satisfy one reviewed family contract:

```text
RECURRENCE_FIRST_ONLY / CANDIDATE
```

not automatic operator/process severity escalation.

---

## 27. Application review cases

A later document-only application must demonstrate at least these cases:

```text
1. one natural specimen only
   → RECURRENCE_FIRST_ONLY

2. same input reroll reproduces symptom
   → natural recurrence count unchanged

3. same input reroll clears symptom
   → natural recurrence count unchanged; control preserved

4. second independent natural specimen matches required family discriminators
   → RECURRENCE_CONFIRMED

5. candidate specimen violates one explicit family exclusion
   → do not merge; RECURRENCE_REVIEW_REQUIRED or separate family

6. multi-sample source-defined natural series
   → RECURRENCE_SERIES_ESTABLISHED without severity escalation

7. deterministic fixture reproduces one first-only natural anomaly
   → deterministic reproduction recorded; natural posture remains FIRST_ONLY

8. two distinct families share only runtime/version adjacency
   → CORRELATION_CONTEXT_ONLY

9. healthy control disproves simple sufficiency claim
   → control remains visible; no stronger relation

10. confirmed recurrence under WATCH owner disposition
    → SYS-16 does not change WATCH automatically

11. duplicate evidence docs point to same underlying event
    → IND-06; count once

12. independence unresolved
    → RECURRENCE_REVIEW_REQUIRED
```

No real long-chat validation is required solely to freeze/apply SYS-16. Future natural specimens are consumed when they occur; they are not manufactured merely to populate the index.

---

## 28. Hard boundaries

SYS-16 must never become:

```text
provider-cache attribution engine
semantic-generation root-cause engine
runtime anomaly detector
runtime diagnostic writer
background monitor
cross-chat raw corpus scraper
operator scorecard
severity leaderboard
automatic WATCH/FIX/BLOCKER rule
automatic family merge
automatic family split
LLM similarity cluster authority
repair recommendation engine
gate closer
release authorizer
```

No new runtime instrumentation is justified by SYS-16 alone.

Use existing evidence fields first.

---

## 29. Evidence honesty / non-claims

Every recurrence record must preserve:

```text
what is source-observed
what family membership was human-reviewed
what independence class was reviewed
what controls exist
what remains unknown
```

Mandatory non-claims as applicable:

```text
root cause = NOT_CLAIMED
provider/backend cause = NOT_CLAIMED
M2 attribution = NOT_CLAIMED unless source evidence proves it
severity promotion = NOT_CLAIMED
runtime repair requirement = NOT_CLAIMED unless owning authority establishes it
gate blocker = NOT_CLAIMED unless owning gate establishes it
```

No recurrence count can replace those distinctions.

---

## 30. Design acceptance

SYS-16 design is complete when all are true:

```text
1. family recurrence is based on reviewed contracts, not text similarity
2. same-input reroll is not counted as independent natural recurrence
3. natural recurrence and controlled/deterministic reproduction remain distinct
4. duplicate references to one event count once
5. cross-family correlation remains separate from family recurrence
6. context-only co-occurrence cannot become causal attribution
7. healthy/contrary controls are first-class
8. recurrence cannot auto-promote WATCH/DEFER/FIX/BLOCKER
9. first specimen is still preserved immediately before recurrence exists
10. S-12 and SYS-52 remain specimen authorities for their domains
11. SYS-21 remains classification-consistency authority
12. SYS-15 remains future WATCH aging authority
13. v1 is curated document-only memory
14. no runtime/release/repository mutation is introduced
```

All conditions are frozen here.

---

## 31. Application posture

```text
DESIGN = FROZEN
APPLY CLASS = NR_DOC_ONLY
APPLICATION = HOLD
IMPLEMENTATION = NOT APPLICABLE IN V1
RUNTIME CHANGE = NONE
RELEASE-SIMCORE CHANGE = NONE
REAL LONG-CHAT VALIDATION = NOT REQUIRED SOLELY FOR SYS-16
```

Application remains a later bounded transaction after the active system-design sweep closes or priority is explicitly changed.

---

## 32. Verdict

```text
SYS-16 ANOMALY RECURRENCE CORRELATOR
= FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_DOC_ONLY

Core safety rule:
recurrence requires source-backed independent specimens under one reviewed family contract;
similarity, adjacency, rerolls and raw counts do not silently create recurrence, causality or severity.

Cross-family safety rule:
correlation never merges anomaly families or establishes root cause by itself.

Application remains HOLD.
Plugin/runtime/release-simcore remains unchanged.
```