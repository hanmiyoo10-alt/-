# SYS-18 — Evidence Provenance Chain Receipt — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · POINT-IN-TIME EVIDENCE PROVENANCE RECEIPT · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-18
Idea          = Evidence Provenance Chain Receipt
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
- `docs/SIMCORE_SYS06_EVIDENCE_TO_DECISION_TRACE_MAP_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- future `SYS-14 Evidence Freshness Ledger`
- future `SYS-07 Cross-Reference Integrity Auditor`

Existing authorities SYS-18 must not replace:
- raw/natural evidence, deterministic test outputs, CI/run IDs, release receipts, diagnostics, fixture results, and repository identities as exact natural evidence authorities;
- SYS-06 as the reviewed many-to-many evidence→decision trace authority;
- SYS-13 as proof-kind × claim-kind fitness/non-equivalence authority;
- SYS-17 as required evidence-slot completeness authority;
- SYS-21 as human forensic classification consistency review;
- SYS-28 as living verification-debt posture;
- SYS-02 as decision supersession lineage;
- SYS-35 as repository transaction lineage;
- current gate/release/design/close authorities as the actual decision authorities;
- future SYS-14 as current evidence-freshness review.

---

## 1. Problem

SYS-06 answers the durable lineage question:

```text
which exact evidence
→ materially informed which exact decision
→ in what bounded role
```

That is a living curated map. It is intentionally many-to-many and may gain new rows over time as new decisions occur.

A different need appears at important close points:

```text
live gate closes
release decision closes
architecture checkpoint closes
verification debt changes state
forensic disposition changes
bounded implementation acceptance closes
```

At those moments, future operators need a compact immutable answer to:

```text
What evidence chain was relied on at this exact decision time?
Which evidence identities were source evidence versus derivative/reviewed evidence?
Which proof-scope records constrained the claims?
Which SYS-06 traces connected those evidence identities to the decision?
Which evidence was explicitly not part of the basis?
Were any required provenance links unresolved when the decision was recorded?
```

Without a point-in-time receipt, later repository growth can make historical decisions look better supported than they really were.

Failure modes include:

```text
RETROACTIVE BASIS INFLATION
new evidence appears later
→ later reader assumes it supported the older decision

DERIVATIVE-AS-SOURCE CONFUSION
generated index/summary/fixture derivative exists
→ treated as if it were the original evidence authority

PROOF-SCOPE LOSS
receipt says "tests passed"
→ exact proof kind / claim non-equivalence disappears

TRACE RECONSTRUCTION GUESSING
later operator rebuilds a chain from nearby links
→ invents causality that was never reviewed

HISTORICAL RECEIPT MUTATION
new decision supersedes old decision
→ old receipt is rewritten instead of preserved
```

SYS-18 defines a bounded **Evidence Provenance Chain Receipt** that freezes the evidence lineage actually relied on for one meaningful decision/close at one point in time.

---

## 2. Core invariant

```text
one bounded decision / close subject
+ exact decision-time authority identity
+ reviewed SYS-06 trace edges
+ exact source / derivative evidence identities
+ applicable SYS-13 proof identities / non-claims
+ explicit unresolved links and exclusions
→ one point-in-time provenance receipt

SYS-18
!= new evidence authority
!= proof engine
!= evidence discovery
!= evidence freshness engine
!= decision engine
!= gate engine
!= supersession graph
!= repository transaction graph
!= generic evidence index
!= automatic receipt generator
```

Canonical question:

> At the moment this bounded decision was recorded, what exact reviewed evidence provenance chain was actually in force?

SYS-18 does not answer:

> Is that evidence still fresh enough today?

> Was the decision globally correct?

> Does later evidence retroactively improve the old basis?

Those questions belong elsewhere.

---

## 3. Receipt is point-in-time, not living current state

This is the most important SYS-18 distinction.

```text
SYS-06
= living curated trace map
= new evidence/decisions may add new edges

SYS-18
= immutable historical receipt for one bounded close/decision
= later evidence does not rewrite it
```

If later evidence changes the disposition:

```text
Decision A + Receipt A
→ preserved as historical

new evidence E2
→ Decision B
→ new Receipt B

A → B relation
→ SYS-02 if supersession/revision applies
```

Forbidden:

```text
E2 arrived after Decision A
→ silently append E2 into Receipt A as if it had been available then
```

A receipt may receive a correction only when the original receipt itself contained a clerical/reference error and the correction preserves an explicit amendment history.

It may not receive a semantic basis upgrade after the fact.

---

## 4. Why v1 is `NR_DOC_ONLY`

The hard part of provenance is not extracting paths.

The hard part is deciding whether a link means:

```text
raw source evidence
reviewed derivative
proof execution
navigation-only projection
actual decision basis
explicit non-basis
```

Those semantics cannot safely be inferred from repository proximity or timestamps.

Therefore useful v1 materialization is a reviewed template/receipt format, conceptually:

```text
docs/SIMCORE_EVIDENCE_PROVENANCE_CHAIN_RECEIPT.md
```

or bounded receipts embedded/referenced by the owning close/evidence document when durable preservation is needed.

No crawler, citation scraper, log parser, graph generator, GitHub Action, CI hook, LLM judge, background watcher, or repository writer is part of v1.

Apply Class:

```text
NR_DOC_ONLY
```

A future read-only integrity checker may validate mechanical references, but that would be a separate implementation/idea boundary.

---

## 5. Receipt subjects

A SYS-18 receipt is created only for a meaningful bounded subject.

Frozen v1 subject kinds:

```text
LIVE_GATE_DECISION
RELEASE_DECISION
ARCHITECTURE_CHECKPOINT_DECISION
FORENSIC_DISPOSITION_DECISION
VERIFICATION_DEBT_STATE_DECISION
IMPLEMENTATION_ACCEPTANCE_DECISION
ROLLBACK_OR_CORRECTION_DECISION
OTHER_REVIEWED_DECISION
```

Examples:

```text
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT close decision
M2-3 checkpoint close decision
R2.1 genuine release E2E proof disposition
named anomaly WATCH → FIX decision
focused execution NOT_CLAIMED → PROVEN decision
rollback source eligibility decision
```

Do not mint receipts for every commit, every test run, every citation, or every chat reply.

The receipt exists when preserving decision-time provenance materially reduces future ambiguity.

---

## 6. Canonical provenance chain model

The frozen v1 conceptual chain is:

```text
SOURCE EVIDENCE
    ↓ reviewed/source-backed derivation when any
DERIVATIVE / CURATED EVIDENCE
    ↓ proof execution / proof record when applicable
PROOF-SCOPE RECORD
    ↓ SYS-06 reviewed trace edge
DECISION / CLOSE SUBJECT
```

Not every receipt needs every middle node.

Valid minimal chain:

```text
natural live specimen
→ SYS-06 CLOSURE_INPUT edge
→ live-gate decision
```

Valid proof-bearing chain:

```text
fixture inputs
→ permanent harness result
→ SYS-13 PK-03 / bounded claim
→ SYS-06 SUPPORTING_BASIS edge
→ decision
```

Valid repository-operation chain:

```text
release candidate / commit identities
→ publication receipt
→ SYS-13 PK-08 release-publication identity
→ SYS-06 PRIMARY_BASIS edge
→ release publication decision/record
```

Invalid chain:

```text
Evidence Index row
→ therefore source evidence
→ therefore decision basis
```

The Evidence Index is navigation unless a source-backed relation establishes more.

---

## 7. Provenance node classes

Exactly six v1 node classes:

```text
PN-01 SOURCE_EVIDENCE
PN-02 REVIEWED_DERIVATIVE
PN-03 PROOF_EXECUTION
PN-04 PROOF_SCOPE_RECORD
PN-05 TRACE_EDGE
PN-06 DECISION_SUBJECT
```

### PN-01 `SOURCE_EVIDENCE`

The narrowest natural/primary evidence identity available for the chain.

Examples:
- natural live specimen with version/runtime/scenario identity;
- immutable CI run/job/step identity;
- deterministic fixture/input plus exact execution result;
- release commit/shared blob/publication receipt;
- exact repository/tooling event with commit/PR identity;
- architecture checker output bound to commit/base/head.

`SOURCE_EVIDENCE` means source for this provenance chain, not philosophically raw data in every system.

### PN-02 `REVIEWED_DERIVATIVE`

A reviewed artifact derived from source evidence while preserving a source link.

Examples:
- curated evidence document;
- reviewed fixture skeleton derived from a live specimen;
- generated navigation/index material when used only as a derivative locator;
- normalized bounded report derived from immutable source data.

A derivative never silently replaces its source authority.

### PN-03 `PROOF_EXECUTION`

The actual bounded test/check/run execution when relevant.

Examples:
- focused deterministic test execution;
- permanent regression suite execution;
- architecture contract checker execution;
- permanent CI run.

### PN-04 `PROOF_SCOPE_RECORD`

A SYS-13-compatible record expressing what the proof may and may not establish for the decision.

This node may be omitted when the evidence is not being used as a formal verification proof.

### PN-05 `TRACE_EDGE`

The reviewed SYS-06 edge that establishes actual use of the evidence in the decision.

A receipt must not invent a replacement trace relationship if a material SYS-06 trace is expected but unresolved.

### PN-06 `DECISION_SUBJECT`

The bounded decision/close authority the receipt documents.

---

## 8. Frozen provenance relation vocabulary

Receipt chain links use exactly these v1 relations:

```text
CAPTURED_AS
DERIVED_FROM
EXECUTED_AGAINST
SCOPED_BY
TRACED_AS_BASIS
RESOLVES_TO_DECISION
```

### `CAPTURED_AS`

A natural/source event is durably captured in a reviewed evidence artifact.

```text
natural specimen
→ CAPTURED_AS
→ evidence document/specimen entry
```

### `DERIVED_FROM`

A reviewed derivative was created from one or more source evidence identities.

This relation requires explicit provenance.

### `EXECUTED_AGAINST`

A bounded proof execution ran against the named input/source/fixture/revision identity.

It does not state what claim was proven.

### `SCOPED_BY`

A proof execution/result is constrained by the named SYS-13 proof/claim record or frozen proof-kind semantics.

### `TRACED_AS_BASIS`

The evidence/proof identity participates in the named SYS-06 trace edge.

The actual role remains the SYS-06 role:

```text
PRIMARY_BASIS
SUPPORTING_BASIS
CONTRARY_INPUT
TRIGGER_INPUT
CLOSURE_INPUT
```

### `RESOLVES_TO_DECISION`

The reviewed trace edge terminates at the bounded decision subject documented by the receipt.

---

## 9. Relation non-equivalence

The chain must preserve these boundaries:

```text
CAPTURED_AS
!= proof of correctness

DERIVED_FROM
!= derivative is equal authority to source

EXECUTED_AGAINST
!= test passed

SCOPED_BY
!= proof is sufficient for every claim

TRACED_AS_BASIS
!= decision is correct

RESOLVES_TO_DECISION
!= decision remains current forever
```

SYS-13, SYS-06, source evidence, and current decision authorities keep their own semantics.

---

## 10. Receipt state vocabulary

Exactly four top-level v1 receipt states:

```text
PROVENANCE_RECEIPT_COMPLETE
PROVENANCE_RECEIPT_REVIEW_REQUIRED
PROVENANCE_RECEIPT_BLOCKED
PROVENANCE_RECEIPT_NOT_APPLICABLE
```

### `PROVENANCE_RECEIPT_COMPLETE`

All provenance links required for the bounded receipt are exact, source-backed, and internally coherent.

This means only:

```text
the documented chain is complete enough to preserve decision-time provenance
```

It does not mean:

```text
decision PASS
runtime PASS
live PASS
proof universally sufficient
release authorized
```

### `PROVENANCE_RECEIPT_REVIEW_REQUIRED`

The decision exists and enough provenance is known to preserve a receipt, but at least one material link/role/source distinction requires review.

### `PROVENANCE_RECEIPT_BLOCKED`

A required evidence identity, trace identity, decision identity, or source-backed relation cannot be resolved without guessing.

Fail closed rather than reconstructing causality from proximity.

### `PROVENANCE_RECEIPT_NOT_APPLICABLE`

The selected operation/decision does not justify a durable provenance receipt under the inclusion rule.

---

## 11. Receipt schema

Every v1 receipt contains:

```text
Receipt ID
Subject kind
Subject decision ref
Decision-time result / classification
Decision timestamp / effective point
Decision authority refs[]
Provenance nodes[]
Provenance links[]
SYS-06 trace refs[]
SYS-13 proof refs[]
Source evidence refs[]
Derivative evidence refs[]
Explicit exclusions / non-basis[]
Unresolved links[]
Receipt state
Supersession / follow-up refs[]
Notes / non-claims
Recorded at
```

### Receipt ID

Stable receipt-local identity, for example:

```text
EPR-001
EPR-002
```

It is navigation only.
It must not become a work ID, release ID, evidence ID, or decision ID authority.

### Subject decision ref

Use the smallest stable bounded decision identity.

Preferred order:

```text
stable gate / work / decision / classification ID
→ exact path#stable heading/marker
→ exact path + bounded semantic label
```

### Decision-time result / classification

Copy the actual result from the owning decision authority.

Examples:

```text
PASS
WATCH
FIX
BLOCKER
PENDING_REAL_LONG_CHAT
ACTIVE / AWAITING GENUINE RELEASE PROOF
```

SYS-18 does not create a new result vocabulary for the decision itself.

### Decision timestamp / effective point

Bind the receipt to when the decision became effective or was recorded.

This prevents later evidence from being mistaken for contemporaneous basis.

### Provenance nodes / links

List only the nodes and links materially needed to reconstruct the bounded decision-time chain.

Do not build an entire repository graph.

### Explicit exclusions / non-basis

This field is mandatory when nearby evidence could easily be misread as basis.

Examples:

```text
permanent fixture PASS was supporting only; did not close natural-live gate
later v0.64.8 sample did not exist at this decision time
Evidence Index row used for navigation only
focused standalone test direct CI execution remained NOT_CLAIMED
```

### Unresolved links

Preserve every material unresolved provenance edge.

Do not hide unresolved lineage merely to obtain `COMPLETE`.

### Supersession / follow-up refs

Optional navigation to:
- a later SYS-02 decision supersession edge;
- a later receipt for the successor decision;
- a future SYS-14 freshness review.

These refs do not mutate the historical receipt.

---

## 12. Completeness rule

A receipt is `PROVENANCE_RECEIPT_COMPLETE` only when all material decision-basis chains are represented.

Required minimum for a proof-bearing decision:

```text
exact source/proof evidence identity
+ proof execution/result identity when applicable
+ SYS-13 scope/non-claim identity when material
+ SYS-06 trace edge
+ exact decision subject
```

Required minimum for a direct natural decision:

```text
exact natural specimen identity
+ SYS-06 trace edge
+ exact decision subject
```

Do not require decorative/background evidence.

Canonical rule:

```text
receipt complete
!= every citation in the source document copied into receipt
```

Completeness is semantic, not citation-count based.

---

## 13. Explicit non-basis is first-class

A major SYS-18 value is recording what was *not* part of the decision basis.

Why:

```text
repository contains many nearby PASS artifacts
→ future reader may over-assume basis
```

Therefore when materially useful, preserve statements such as:

```text
permanent CI qualification
= available supporting context
= not genuine release E2E proof

permanent fixture PASS
= deterministic support
= not natural live closure evidence

historical positive control
= regression context
= not current-version live proof
```

This field is bounded by SYS-13 non-equivalence and actual decision authority.

It must not invent exclusions unsupported by the record.

---

## 14. Relationship to SYS-06 Evidence-to-Decision Trace Map

```text
SYS-06
= living reviewed evidence→decision edges

SYS-18
= one point-in-time receipt selecting the relevant reviewed edges for one bounded decision
```

Frozen rules:

```text
SYS-18 consumes SYS-06
SYS-18 does not replace SYS-06
SYS-18 does not mint causality that SYS-06/source authority cannot support
```

If a material decision-basis relationship is required for the receipt but no trustworthy SYS-06 edge/source-backed equivalent can be established:

```text
PROVENANCE_RECEIPT_REVIEW_REQUIRED
or
PROVENANCE_RECEIPT_BLOCKED
```

Do not silently draw the edge inside the receipt.

---

## 15. Relationship to SYS-13 Verification Proof Matrix

SYS-13 says which proof kinds can establish which claims.

SYS-18 preserves which proof chain was present at decision time.

Example:

```text
permanent CI run
→ proof identity PK-04
→ CK-05 applicable CI passed
→ SYS-06 SUPPORTING_BASIS
→ release readiness decision
```

SYS-18 must preserve SYS-13 non-equivalence, including:

```text
permanent CI PASS
!= focused test directly executed

fixture PASS
!= natural live PASS

release publication
!= live runtime PASS

permanent-CI qualification
!= genuine release E2E proof
```

A complete receipt with an invalid proof claim is not allowed.

Use review-required/blocked and cite the contradiction instead.

---

## 16. Relationship to SYS-17 Missing Evidence Slot Analyzer

SYS-17 answers whether explicitly required evidence slots are complete.

SYS-18 answers what provenance chain supported the decision that was actually taken.

Therefore:

```text
SYS-17 SLOT_MISSING
→ may be represented as unresolved/non-basis context
→ does not automatically prevent every decision
```

For a decision whose own policy requires that slot before close, however:

```text
required closure slot unresolved
→ receipt cannot launder the decision into COMPLETE closure provenance
```

The owning gate/policy decides whether the missing slot blocks the decision.

---

## 17. Relationship to SYS-21 Forensic Classification Consistency Check

SYS-21 reviews whether the classification stays within the evidence.

SYS-18 can provide a compact decision-time evidence chain for that review.

```text
receipt
→ shows exactly which evidence was relied on

SYS-21
→ judges whether the resulting classification over/under-claims that evidence
```

SYS-18 itself does not declare the forensic classification consistent.

---

## 18. Relationship to SYS-28 Verification Debt Index

When evidence changes a verification-debt decision, a receipt may preserve:

```text
old debt state
+ arriving exact proof identity
+ SYS-06 edge
→ new debt-state decision
```

But:

```text
receipt exists
!= debt closed
```

The actual debt state remains with SYS-28/owning proof authority.

---

## 19. Relationship to SYS-02 Decision / Supersession Graph

Receipts are tied to decisions, not rewritten by later decisions.

```text
Decision A
→ Receipt A

Decision A → superseded by Decision B
→ SYS-02

Decision B
→ Receipt B
```

SYS-18 may link to the supersession edge for navigation.

It must not merge Receipt A and Receipt B into one timeless chain.

---

## 20. Relationship to SYS-35 Repository Transaction Ledger

Some provenance chains include repository events:

```text
candidate commit
PR / merge / publication transaction
release-simcore publication identity
```

SYS-35 remains the transaction-lineage authority.

SYS-18 may reference relevant SYS-35 transaction IDs/rows, but:

```text
repository transaction occurred
!= evidence was used as decision basis
```

The SYS-06 trace/source decision authority must still establish actual basis.

---

## 21. Relationship to future SYS-14 Evidence Freshness Ledger

This is an intentional sequencing boundary.

SYS-18 freezes:

```text
what evidence chain was relied on then
```

SYS-14 will answer:

```text
is a referenced evidence basis still fresh enough for a current use now?
```

Therefore historical receipt state must not mutate because evidence later becomes stale.

Correct model:

```text
Receipt A = COMPLETE at decision time
later SYS-14 = STALE_FOR_CURRENT_REUSE
```

Both can be true simultaneously.

---

## 22. Relationship to future SYS-07 Cross-Reference Integrity Auditor

SYS-18 creates a bounded reference set worth checking:

```text
subject decision ref
source evidence refs
proof refs
SYS-06 trace refs
optional SYS-02 / SYS-35 refs
```

Future SYS-07 may check that those references still resolve mechanically/structurally.

But SYS-07 must not reinterpret provenance semantics merely because a path exists or breaks.

---

## 23. Current SimCore examples validating the design

These are design examples only, not materialized receipts.

### 23.1 v0.64.7 reload-cache continuity gate

Before live close:

```text
permanent deterministic reload-cache-continuity fixture
= available regression evidence

current named real-long-chat scenario
= still PENDING_REAL_LONG_CHAT
```

A future PASS receipt must distinguish:

```text
deterministic fixture result
→ SUPPORTING_BASIS only unless source authority says otherwise

actual 06407 real-long-chat specimen
→ CLOSURE_INPUT
→ named live-gate decision
```

The deterministic fixture cannot be retroactively relabeled as natural-live closure proof.

### 23.2 R2.1 permanent-CI qualification vs genuine release E2E

Current state preserves:

```text
R2.1 permanent CI qualification = established
genuine runtime release E2E proof = pending
```

A receipt for current R2.1 qualification must explicitly exclude:

```text
genuine release E2E = NOT YET BASIS / NOT PROVEN
```

When a future genuine release occurs, that event gets a new decision/provenance receipt.

### 23.3 v0.64.5 genuine-edit baseline

The v0.64.5 natural genuine-edit specimen establishes a pre-M2-3 direct positive control.

A later post-M2-3 close must not silently reuse that historical specimen as the required post-extraction direct check.

Correct lineage:

```text
v0.64.5 specimen
→ historical supporting/regression basis

post-M2-3 new genuine-edit specimen
→ closure basis for post-extraction control
```

### 23.4 SYS-24 selection-drift FIX

The selection-drift evidence can support its exact FIX disposition receipt.

Later corrected inventory state does not erase the original evidence chain.

The receipt preserves:

```text
observed inventory/selection contradiction
→ FIX decision
→ corrected living state
```

without claiming a runtime defect.

---

## 24. Receipt creation flow

Recommended v1 flow:

```text
1. identify one bounded decision/close subject
2. resolve exact subject authority and decision-time result
3. collect only source evidence actually used
4. resolve relevant reviewed derivatives / proof executions
5. attach SYS-13 proof scope/non-claims where material
6. resolve SYS-06 trace edges proving actual decision use
7. record explicit non-basis / exclusions
8. record unresolved links honestly
9. assign receipt state
10. preserve point-in-time receipt
11. later decisions create new receipts rather than rewriting this one
```

If step 6 cannot be supported for a material basis claim:

```text
do not infer causality from proximity
→ REVIEW_REQUIRED / BLOCKED
```

---

## 25. Amendment rule

A receipt is normally immutable.

Allowed amendment class:

```text
CLERICAL_REFERENCE_CORRECTION
```

Examples:
- typo in path;
- wrong display label while exact underlying identity is unchanged;
- broken link repaired to the same immutable source.

A clerical amendment must preserve:

```text
prior value
corrected value
reason
correction evidence
recorded at
```

Not allowed as amendment:

```text
adding later evidence as if contemporaneous
changing trace role after new semantic review
changing decision result
replacing missing proof with a later run
```

Those require a new decision/receipt or explicit SYS-02/SYS-06 updates as appropriate.

---

## 26. No automatic freshness conclusion

Receipt age is not evidence freshness.

Forbidden:

```text
old receipt
→ stale evidence

new receipt
→ fresh evidence
```

Freshness depends on reuse context, version/revision scope, changed authority, contract evolution, and other factors owned by future SYS-14.

SYS-18 stores the identities needed for that later review; it does not perform it.

---

## 27. No scalar provenance score

Do not compute:

```text
provenance completeness = 87%
evidence confidence = 0.93
chain quality score = A+
```

Reason:
- one missing closure input can matter more than ten supporting links;
- proof kinds are not linearly ranked;
- historical receipts can be complete while current reuse is invalid;
- semantic sufficiency is owned by decision/proof authorities.

Use explicit node/link states and non-claims instead.

---

## 28. Inclusion policy

Create/preserve a SYS-18 receipt when all are true:

```text
1. a bounded decision/close is materially important;
2. evidence provenance is non-trivial enough that future ambiguity is plausible;
3. source evidence identities can be cited;
4. a durable point-in-time receipt provides value beyond the source decision document itself.
```

Typical good candidates:
- real-long-chat gate closes;
- genuine release E2E proof decisions;
- M2 checkpoint closes;
- meaningful forensic FIX/BLOCKER transitions;
- verification debt closure with previously missing proof;
- rollback/correction decisions.

Do not require receipts for trivial doc typo fixes or ordinary explanatory notes.

---

## 29. Failure behavior

Fail closed on provenance identity.

```text
missing exact source evidence
→ BLOCKED or REVIEW_REQUIRED

missing material SYS-06 trace
→ REVIEW_REQUIRED / BLOCKED

proof-fit contradiction
→ REVIEW_REQUIRED

moving branch name only
→ insufficient immutable identity

later evidence only
→ cannot backfill old receipt as contemporaneous basis
```

Never fabricate a cleaner chain merely to make a close artifact look complete.

---

## 30. Hard non-goals

SYS-18 v1 does not:

```text
discover evidence automatically
scrape citations
crawl CI/logs
run tests
create proof records
judge proof fitness
close gates
classify WATCH/FIX/BLOCKER
decide freshness
infer recurrence
select rollback
publish releases
write runtime state
mutate release-simcore
rewrite old receipts with later evidence
build a generic repository knowledge graph
```

---

## 31. Future materialization shape

Preferred durable template:

```text
# Evidence Provenance Chain Receipt — <subject>

Receipt ID:
Subject kind:
Subject decision:
Decision-time result:
Decision/effective point:
Decision authority:
Receipt state:

## Chain
<ordered nodes / links>

## Source evidence
...

## Proof scope / non-claims
...

## SYS-06 trace edges
...

## Explicit exclusions / non-basis
...

## Unresolved links
...

## Supersession / follow-up
...

## Verdict
...
```

The receipt may be a standalone file or a bounded section inside an owning close/evidence artifact when that better preserves locality.

Do not create a new standalone file for every trivial decision.

---

## 32. Application boundary

Current transaction:

```text
DESIGN ONLY
```

Do not yet materialize:

```text
docs/SIMCORE_EVIDENCE_PROVENANCE_CHAIN_RECEIPT.md
```

Do not create actual production/live/release receipts under SYS-18 during this design transaction.

Do not modify:

```text
plugins/simcore/*
release-simcore
CI/workflows
release tooling
permanent fixture authority
runtime state
```

Application remains HOLD while the current system-design sweep remains active unless priority is explicitly changed.

---

## 33. Verification plan for a later application transaction

Because v1 is document-only, later application verification is bounded to:

```text
1. template fields match this frozen design
2. relation vocabulary is unchanged
3. source-vs-derivative distinction is explicit
4. SYS-06 trace refs resolve
5. SYS-13 proof/non-claim boundaries are preserved
6. historical receipt immutability rule is present
7. no automatic freshness/proof/gate inference is introduced
8. no executable/runtime/release file changes
9. release-simcore unchanged
```

No runtime CI claim is needed for the document-only materialization itself.

---

## 34. Frozen invariants

```text
I1  One receipt targets one bounded decision/close subject.
I2  Receipt is point-in-time; later evidence does not rewrite historical basis.
I3  Source evidence and reviewed derivatives remain distinct.
I4  Exact immutable identities are preferred over moving refs/generic labels.
I5  SYS-06 owns evidence→decision causality; SYS-18 consumes it.
I6  SYS-13 owns proof fitness/non-equivalence; receipt preserves those bounds.
I7  Receipt completeness does not mean decision correctness or PASS.
I8  Explicit non-basis/exclusions are first-class when ambiguity is plausible.
I9  Missing material provenance fails closed rather than being guessed.
I10 SYS-02 owns later decision supersession; receipts remain historical.
I11 SYS-35 owns repository transaction lineage.
I12 Future SYS-14 owns current evidence freshness.
I13 No scalar provenance/confidence score.
I14 No auto ingestion/generation in v1.
I15 v1 is NR_DOC_ONLY and application remains separate from design.
```

---

## 35. Frozen decision

```text
SYS-18 Evidence Provenance Chain Receipt
= DESIGN FROZEN
= NON_RUNTIME
= NR_DOC_ONLY
= point-in-time bounded decision evidence-chain receipt
= consumes SYS-06 reviewed trace edges
= preserves SYS-13 proof/non-claim scope
= distinguishes source evidence from reviewed derivatives
= records explicit non-basis and unresolved links
= never retroactively upgrades an old decision with later evidence
= no freshness decision
= no gate/decision authority
= no repository/runtime/release mutation
= APPLY HOLD during system design sweep
```

Open design questions:

```text
0
```
