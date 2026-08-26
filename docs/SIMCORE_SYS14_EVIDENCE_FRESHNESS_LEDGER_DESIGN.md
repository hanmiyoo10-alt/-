# SYS-14 — Evidence Freshness Ledger — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · CLAIM-SCOPED EVIDENCE REUSE / FRESHNESS LEDGER · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-14
Idea          = Evidence Freshness Ledger
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
- `docs/SIMCORE_SYS18_EVIDENCE_PROVENANCE_CHAIN_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS06_EVIDENCE_TO_DECISION_TRACE_MAP_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- future `SYS-07 Cross-Reference Integrity Auditor`

Existing authorities SYS-14 must not replace:
- source evidence documents, diagnostics, fixture/test executions, CI runs, release receipts, architecture outputs, and repository identities as exact evidence authorities;
- SYS-18 as point-in-time decision-time provenance receipt authority;
- SYS-06 as reviewed evidence→decision trace authority;
- SYS-13 as proof-kind × claim-kind fitness/non-equivalence authority;
- SYS-17 as required evidence-slot completeness authority;
- SYS-21 as human forensic classification-consistency review;
- SYS-28 as living verification-debt posture;
- SYS-02 as decision supersession lineage;
- SYS-35 as repository transaction lineage;
- current gate/release/design documents as the actual decision/current-state authorities.

---

## 1. Problem

SimCore intentionally preserves historical evidence.

That evidence remains valuable even after later versions, refactors, releases, architecture checkpoints, host/runtime changes, or new natural samples appear.

But historical validity and current reusability are not the same question.

Examples:

```text
v0.64.5 genuine-edit live control
= valid historical proof that pre-M2-3 production recognized USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT

same evidence after M2-3 extraction
= not sufficient to establish post-M2-3 extraction-close behavior
```

```text
permanent deterministic fixture PASS at commit A
= valid proof for the bounded implementation/fixture state at A

later architecture/contract change touching the relevant surface
= old PASS remains historical evidence
= current claim may require revalidation
```

```text
release publication receipt
= may remain permanently fresh for the historical fact that release X was published with commit/blob Y

same receipt
= cannot establish current runtime/live correctness of a later release
```

Without an explicit freshness layer, later operators can make unsafe shortcuts:

```text
evidence exists
→ assume reusable now

old LIVE PASS exists
→ assume post-refactor LIVE PASS

same contract name still exists
→ assume old fixture execution covers current implementation

evidence is several months old
→ assume stale even though the relevant immutable claim has not changed
```

All four shortcuts are wrong.

SYS-14 defines a curated **Evidence Freshness Ledger** that answers only the current reuse question:

```text
Given this exact evidence identity,
for this exact current claim / decision scope,
under this exact reviewed current context,
may the evidence be reused now without new validation?
```

---

## 2. Core invariant

```text
exact evidence identity
+ exact current claim / decision scope
+ historical provenance / proof context when relevant
+ reviewed current-context anchor
+ reviewed change events since evidence
+ explicit reuse/revalidation basis
→ one claim-scoped evidence-freshness disposition

SYS-14
!= evidence validity eraser
!= age timer
!= proof engine
!= evidence discovery engine
!= current-state authority
!= gate engine
!= decision engine
!= automatic stale classifier
!= repository diff crawler
!= verification-debt engine
!= evidence supersession graph
```

Canonical question:

> Is this historically valid evidence still reusable for this exact current claim, and why?

The ledger does not answer:

> Was the evidence historically real?

> What claim kind can this proof kind establish in general?

> Does the current gate pass?

> Must the resulting revalidation debt block current work?

Those remain with their owning authorities.

---

## 3. Freshness is claim-scoped, never evidence-global

This is the constitutional rule for SYS-14.

```text
freshness(evidence)
= invalid model

freshness(evidence, current claim scope, current context)
= valid model
```

The same evidence may simultaneously be:

```text
FRESH_FOR_SCOPE
for one historical/identity claim

and

REVALIDATION_REQUIRED
for one current runtime/behavior claim
```

Example:

```text
Evidence E = v0.64.5 genuine visible user-edit live control

Claim A:
"A direct pre-M2-3 positive control existed"
→ FRESH_FOR_SCOPE

Claim B:
"Post-M2-3 edit-reconcile extraction preserves genuine-edit behavior"
→ REVALIDATION_REQUIRED
```

No row may state only:

```text
Evidence E = STALE
```

without naming the current reuse scope.

---

## 4. Historical validity is preserved

SYS-14 never rewrites old evidence or old SYS-18 receipts to make them stale.

Canonical distinction:

```text
SYS-18 Receipt A
= complete and historically valid for Decision A at time T

SYS-14 Freshness Review F
= asks whether one evidence item from Receipt A is reusable for Claim B at time T2
```

Therefore:

```text
STALE_FOR_SCOPE
!= evidence was false
!= old receipt was invalid
!= old decision never happened
```

A freshness result affects only current reuse.

If a new decision supersedes the historical decision, SYS-02 preserves that decision lineage independently.

---

## 5. Why v1 is `NR_DOC_ONLY`

Some mechanical facts are easy to detect:

```text
commit SHA changed
file changed
version changed
contract snapshot changed
new release exists
```

But none of those mechanical facts alone tells us whether old evidence remains reusable.

Examples:

```text
unrelated doc commit changed
→ does not stale runtime evidence

version bump only
→ may or may not stale a narrow repository-identity claim

large code change outside the evidence-owned surface
→ may leave the evidence fresh for its bounded claim

one-line authority change
→ may invalidate a broad old claim even with little code churn
```

Freshness therefore requires reviewed semantic boundaries:

```text
what claim is being reused?
what implementation/authority/environment surface matters?
what changed since the evidence?
does that change intersect the claim?
is revalidation explicitly required by checkpoint/policy?
```

Useful v1 materialization is one curated living repository artifact, conceptually:

```text
docs/SIMCORE_EVIDENCE_FRESHNESS_LEDGER.md
```

No automatic age scanner, Git diff crawler, CI hook, GitHub Action, LLM judge, repository writer, background watcher, or stale-proof auto-promoter is part of v1.

Apply Class:

```text
NR_DOC_ONLY
```

A future read-only helper may surface mechanical change candidates for human review, but that is a separate implementation boundary and cannot assign semantic freshness automatically.

---

## 6. Frozen v1 freshness states

Exactly five v1 states:

```text
FRESH_FOR_SCOPE
FRESHNESS_REVIEW_REQUIRED
REVALIDATION_REQUIRED
STALE_FOR_SCOPE
FRESHNESS_UNRESOLVED
```

### `FRESH_FOR_SCOPE`

The exact evidence remains reusable for the exact current claim scope under the reviewed current-context anchor.

It means only:

```text
no identified relevant change or explicit policy requirement currently invalidates reuse for this bounded claim
```

It does not mean:

```text
current gate PASS
runtime globally correct
proof stronger than SYS-13 permits
all related claims fresh
no future revalidation will ever be needed
```

### `FRESHNESS_REVIEW_REQUIRED`

A potentially relevant change or ambiguity exists, but current evidence is insufficient to conclude either reusable or revalidation-required without a bounded human review.

Examples:
- architecture ownership moved but behavior contract may be unchanged;
- host/runtime behavior changed but the evidence claim may be implementation-independent;
- new contrary evidence exists but its scope overlap is not established.

### `REVALIDATION_REQUIRED`

The historical evidence remains valid, but current reuse for the named claim requires a new bounded proof/sample because:
- policy/checkpoint explicitly requires it; or
- a relevant surface changed materially; or
- the target claim now covers a new implementation/version/context not established by the old evidence.

This state does not decide whether the revalidation blocks current work.
Blocking posture remains with the owning gate/policy and may be projected into SYS-28.

### `STALE_FOR_SCOPE`

The evidence must not be used as current positive support for the named claim because a reviewed current-context change or contradiction makes reuse invalid for that scope.

Historical evidence remains preserved.

A stale result should name the invalidating basis, not merely an age.

### `FRESHNESS_UNRESOLVED`

The exact evidence identity, current claim scope, relevant context anchor, or change lineage cannot be resolved without guessing.

Fail closed for reuse.

Do not convert unresolved into `STALE_FOR_SCOPE` merely for convenience.

---

## 7. State non-equivalence

```text
FRESH_FOR_SCOPE
!= PASS

FRESHNESS_REVIEW_REQUIRED
!= REVALIDATION_REQUIRED

REVALIDATION_REQUIRED
!= BLOCKER

STALE_FOR_SCOPE
!= historical evidence invalid

FRESHNESS_UNRESOLVED
!= MISSING evidence
```

SYS-28 owns verification-debt posture.
SYS-17 owns required evidence-slot completeness.
SYS-13 owns proof fitness.
Current gate/policy owns blocker status.

---

## 8. Current claim / decision scope

Every row must name one exact current reuse target.

Preferred scope identities:

```text
stable gate / checkpoint / work / claim ID
→ exact authority path#stable heading
→ exact authority path + bounded semantic label
```

Good examples:

```text
M2-3 post-extraction genuine-edit close control
06407 reload-cache continuity named live gate
R2.1 next genuine release E2E proof
current architecture dependency claim for representation → edit-reconcile boundary
focused standalone tooling direct-execution claim
release publication identity for v0.64.7
```

Bad examples:

```text
current release
M2
runtime correctness
tests
architecture
```

Broad labels hide the actual reuse boundary.

---

## 9. Current-context anchor

Freshness is evaluated against an explicit current context.

A v1 context anchor records only the dimensions material to the claim, such as:

```text
plugin version / release commit / shared blob when runtime claim
implementation commit or architecture checkpoint when code claim
contract/design authority revision when semantic contract claim
host/runtime/provider generation when environment-sensitive claim
fixture/registry revision when regression claim
release-system policy revision when operation claim
```

Do not require every possible dimension for every row.

Canonical rule:

```text
anchor only what can change the reuse meaning
```

A generic timestamp is insufficient as the sole current-context anchor.

---

## 10. Frozen v1 change-event vocabulary

Freshness review may cite zero or more reviewed change events.

Exactly nine v1 event kinds:

```text
CE-01 RELEVANT_IMPLEMENTATION_CHANGE
CE-02 CONTRACT_OR_AUTHORITY_CHANGE
CE-03 CLAIM_SCOPE_CHANGE
CE-04 ENVIRONMENT_OR_HOST_CHANGE
CE-05 FIXTURE_OR_TEST_SURFACE_CHANGE
CE-06 RELEASE_OR_VERSION_CONTEXT_CHANGE
CE-07 CONTRARY_EVIDENCE_ARRIVAL
CE-08 EXPLICIT_REVALIDATION_TRIGGER
CE-09 REVIEWED_NON_IMPACTING_CHANGE
```

### `CE-01 RELEVANT_IMPLEMENTATION_CHANGE`

Code/ownership/state-writer/runtime behavior relevant to the evidence claim changed.

It does not automatically mean stale.
It is an input to review.

### `CE-02 CONTRACT_OR_AUTHORITY_CHANGE`

The semantic contract, owning authority, acceptance rule, or proof expectation relevant to the claim changed.

This may require revalidation even if runtime code did not change.

### `CE-03 CLAIM_SCOPE_CHANGE`

The current claim is broader or materially different from the historical claim.

Example:

```text
pre-M2-3 behavior preserved
→ post-M2-3 extracted architecture behavior preserved
```

### `CE-04 ENVIRONMENT_OR_HOST_CHANGE`

A host/runtime/provider/environment dimension material to the old evidence changed.

Only use when environment is actually part of the claim's validity boundary.

### `CE-05 FIXTURE_OR_TEST_SURFACE_CHANGE`

Fixture inputs, test semantics, harness ownership, registry role, or relevant deterministic test boundary changed.

### `CE-06 RELEASE_OR_VERSION_CONTEXT_CHANGE`

A release/version boundary changed in a way potentially material to reuse.

Version arithmetic alone never determines freshness.

### `CE-07 CONTRARY_EVIDENCE_ARRIVAL`

New reviewed evidence materially challenges reuse of the older evidence for the same claim scope.

Contrary evidence does not automatically invalidate old evidence; overlap and proof fit must be reviewed.

### `CE-08 EXPLICIT_REVALIDATION_TRIGGER`

A frozen policy/checkpoint/close contract explicitly says a new sample or proof must be run.

Example:

```text
M2-3 extraction lands
→ direct genuine-edit post-extraction control required before M2-4
```

### `CE-09 REVIEWED_NON_IMPACTING_CHANGE`

A known change occurred but reviewed scope analysis establishes it does not affect the current reuse claim.

This event is important because it documents why evidence remains fresh despite repository churn.

---

## 11. Freshness basis vocabulary

Every non-unresolved freshness disposition records one or more basis kinds.

Exactly six v1 basis kinds:

```text
FB-01 UNCHANGED_RELEVANT_SURFACE
FB-02 REVIEWED_NON_IMPACT
FB-03 EXPLICIT_REVALIDATION_POLICY
FB-04 RELEVANT_SURFACE_CHANGED
FB-05 CLAIM_SCOPE_OUTGROWN
FB-06 CONTRARY_EVIDENCE_CONFLICT
```

These are explanation categories, not automatic rules.

Examples:

```text
FRESH_FOR_SCOPE
+ FB-01 UNCHANGED_RELEVANT_SURFACE
```

```text
FRESH_FOR_SCOPE
+ CE-06 release context changed
+ CE-09 reviewed non-impacting change
+ FB-02 REVIEWED_NON_IMPACT
```

```text
REVALIDATION_REQUIRED
+ CE-08 explicit revalidation trigger
+ FB-03 EXPLICIT_REVALIDATION_POLICY
```

```text
STALE_FOR_SCOPE
+ CE-03 claim scope change
+ FB-05 CLAIM_SCOPE_OUTGROWN
```

---

## 12. Freshness review schema

Each v1 row contains:

```text
Freshness Review ID
Evidence ref
Evidence kind / SYS-13 proof ref when applicable
Historical decision / SYS-18 receipt refs[]
Current reuse claim / decision ref
Current-context anchor
Relevant change events[]
Freshness basis[]
Freshness state
Revalidation requirement / exact trigger when applicable
Owning gate / policy ref when applicable
Blocking posture source when applicable
Reviewed at
Review authority / basis refs[]
Next review trigger
Notes / non-claims
```

### Freshness Review ID

Stable ledger-local identity, for example:

```text
EFR-001
EFR-002
```

It is navigation only.
It is not an evidence ID, work ID, release ID, gate ID, or decision ID authority.

### Evidence ref

Use the narrowest exact historical evidence identity.

Prefer source evidence over a derivative when the source is available.
A SYS-18 receipt may be referenced to reconstruct the decision-time chain without replacing the source evidence.

### Evidence kind / SYS-13 proof ref

Use when the reuse claim is a formal verification claim.

Freshness cannot make an otherwise unfit proof kind fit.

Canonical rule:

```text
fresh + proof-incompatible
= still not usable for that claim
```

### Historical decision / receipt refs

Optional but strongly preferred when the evidence's original role matters.

This allows future readers to distinguish:

```text
what the evidence originally proved/decided
vs
what someone is trying to reuse it for now
```

### Current-context anchor

Record exact current identities material to the reuse review.

### Relevant change events

List only reviewed events that can plausibly affect the current claim or that explain non-impact.

Do not dump every commit since the evidence.

### Revalidation requirement

When state is `REVALIDATION_REQUIRED`, state the bounded new evidence needed.

Good:

```text
post-M2-3 one direct harmless genuine visible edit
→ require USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT → snapshot UPDATED
```

Bad:

```text
retest everything
```

### Blocking posture source

If the revalidation is blocking or non-blocking, copy that posture from the owning gate/policy authority.

SYS-14 must not infer blocker severity from freshness state.

### Next review trigger

Optional named event that should force freshness review again.

Examples:
- next relevant runtime release;
- M2-3 extraction landing;
- change to representation/edit-reconcile contract;
- new contrary live specimen;
- host/runtime API change affecting the claim.

No clock-based expiry is required unless an owning policy explicitly defines one.

---

## 13. No generic age expiry

SYS-14 explicitly rejects a universal rule such as:

```text
older than 30 days = stale
older than N releases = stale
```

Age may be useful review context but is not semantic freshness.

Evidence can remain fresh for years for immutable historical/identity claims.

Conversely, evidence from minutes ago can become stale for a current claim if the relevant implementation/authority changed immediately afterward.

Canonical rule:

```text
freshness follows relevant semantic change, not wall-clock age
```

---

## 14. Relationship to SYS-18 Evidence Provenance Chain Receipt

SYS-18 freezes what evidence was actually in force when a decision was made.

SYS-14 asks whether one of those evidence identities can be reused for a later current claim.

```text
SYS-18
Decision A at T1
← evidence chain E1/E2/E3

SYS-14 at T2
E1 + Claim B + current context
→ FRESH_FOR_SCOPE / REVIEW_REQUIRED / REVALIDATION_REQUIRED / STALE_FOR_SCOPE
```

SYS-14 never edits Receipt A.

A later freshness decision may link back to Receipt A for provenance, but current reusability is a new reviewed fact.

---

## 15. Relationship to SYS-06 Evidence-to-Decision Trace Map

SYS-06 says:

```text
Evidence E materially informed Decision A with Role R
```

SYS-14 says:

```text
Evidence E is / is not reusable now for Claim B
```

An active SYS-06 trace does not guarantee current freshness.
A historical SYS-06 trace does not imply the evidence is stale for every future claim.

Never derive freshness only from `TRACE_ACTIVE` / `TRACE_HISTORICAL`.

---

## 16. Relationship to SYS-13 Verification Proof Matrix

SYS-13 answers general proof fitness.

SYS-14 answers current reuse of one exact evidence instance.

Both gates must be satisfied for a formal proof reuse:

```text
SYS-13 proof-kind compatibility
AND
SYS-14 freshness for exact current scope
```

Examples:

```text
old permanent CI run
+ current claim = natural-live PASS
→ SYS-13 may already say proof kind incompatible
→ freshness cannot rescue it
```

```text
old natural-live evidence
+ same proof kind is suitable
+ relevant runtime implementation changed
→ SYS-14 may still require revalidation
```

---

## 17. Relationship to SYS-17 Missing Evidence Slot Analyzer

SYS-17 evaluates whether a required evidence slot is present and in what proof state.

SYS-14 may explain why an old artifact cannot satisfy a current slot.

Example:

```text
slot requires post-M2-3 direct genuine-edit evidence
old v0.64.5 pre-M2-3 specimen exists
SYS-14 = REVALIDATION_REQUIRED for post-M2-3 claim
→ SYS-17 slot remains unsatisfied until new evidence arrives
```

SYS-14 does not create required slots.

---

## 18. Relationship to SYS-28 Verification Debt Index

SYS-14 may create an input for SYS-28 review:

```text
historical evidence becomes REVALIDATION_REQUIRED for current claim
→ owning policy says revalidation required later/currently
→ SYS-28 may record the resulting verification obligation and its due/blocking posture
```

But:

```text
REVALIDATION_REQUIRED
!= automatic verification debt row
!= automatic blocker
```

SYS-28 owns long-lived obligation posture.

---

## 19. Relationship to SYS-21 Forensic Classification Consistency

SYS-21 can use SYS-14 as one reviewed input when checking whether a classification overclaims stale evidence.

Example:

```text
classification says current PASS
only cited positive evidence = STALE_FOR_SCOPE
→ SYS-21 should review classification consistency
```

SYS-14 itself does not change `PASS / WATCH / FIX / BLOCKER`.

---

## 20. Relationship to SYS-02 Decision Supersession Graph

A decision can be superseded while its evidence remains fresh for another bounded claim.

Likewise, a decision can remain current while one old supporting evidence item requires revalidation.

Therefore:

```text
Decision A superseded
!= Evidence E globally stale

Evidence E stale for Claim B
!= Decision A superseded
```

Keep decision lineage and evidence freshness independent.

---

## 21. Relationship to SYS-35 Repository Transaction Ledger

SYS-35 can identify meaningful repository transactions that occurred after historical evidence.

Those transaction identities may become change-event refs in SYS-14.

But:

```text
repository transaction happened
!= freshness changed
```

Semantic impact must still be reviewed.

SYS-14 never scans every intervening commit or turns commit count into freshness.

---

## 22. Relationship to future SYS-07 Cross-Reference Integrity Auditor

SYS-07 will likely ask whether declared references resolve and obey their structural/reference contracts.

SYS-14 adds a different semantic dimension:

```text
reference resolves
!= evidence is fresh for current reuse
```

A future SYS-07 audit may validate that a SYS-14 row points to real evidence/receipt/claim authorities, but SYS-07 must not calculate freshness from reference existence.

---

## 23. Current repository specimens

### 23.1 Pre-M2-3 genuine-edit evidence

Existing preserved rule:

```text
v0.64.5 direct genuine-edit live control
= PRE_M2_3_BASELINE_ESTABLISHED

post-M2-3 extraction
= direct recheck required before M2-4
```

SYS-14 interpretation:

```text
Evidence:
v0.64.5 direct genuine-edit live control

Reuse claim:
pre-M2-3 baseline existed
→ FRESH_FOR_SCOPE

Reuse claim:
post-M2-3 extracted implementation preserves behavior
→ REVALIDATION_REQUIRED
→ CE-03 CLAIM_SCOPE_CHANGE
→ CE-08 EXPLICIT_REVALIDATION_TRIGGER
→ FB-03 EXPLICIT_REVALIDATION_POLICY
```

This is the canonical example proving freshness must be claim-scoped.

### 23.2 R2.1 permanent-CI qualification

Existing current state:

```text
R2.1 delegated release operation = ACTIVE
permanent CI qualification = PASS
next genuine runtime release E2E proof = PENDING
```

SYS-14 must not reuse the permanent-CI qualification as current evidence for genuine release E2E proof.

That is partly proof-scope non-equivalence under SYS-13 and partly a distinct claim scope.

### 23.3 Focused standalone tooling execution WATCH

Existing repository state preserves:

```text
generic PR-level SimCore CI PASS
focused standalone tooling direct execution = NOT_CLAIMED
```

The generic CI evidence may remain fresh for the claim that those required PR gates passed at that commit.

It cannot become fresh evidence for a direct-execution claim that was never established.

Freshness never manufactures a missing historical claim.

### 23.4 Immutable release publication identity

A release publication receipt for v0.64.7 may remain `FRESH_FOR_SCOPE` indefinitely for the bounded historical identity claim:

```text
v0.64.7 publication used release commit X / shared blob Y
```

A later version does not stale that historical fact.

The same receipt is irrelevant/insufficient for later runtime correctness claims.

---

## 24. Explicit non-claims

A SYS-14 ledger row must preserve, when applicable:

```text
historical evidence remains valid even when current reuse is stale
freshness does not broaden proof kind
freshness does not prove direct execution that was never claimed
freshness does not establish recurrence/root cause
freshness does not close a live gate
freshness does not authorize release
freshness does not make a revalidation blocker unless owning policy says so
freshness is scoped to the named claim/context only
```

---

## 25. Review / update lifecycle

SYS-14 is a living ledger.

A row may be revisited when a named relevant trigger occurs.

Correct update pattern:

```text
EFR-001 at T1
Evidence E + Claim C
→ FRESH_FOR_SCOPE

relevant architecture change at T2
→ review same claim/context family
→ append/update reviewed current disposition with history preserved
```

Do not erase old review history if it materially explains why reuse changed.

A practical v1 ledger may preserve a compact review-history field or superseding review reference.

The exact historical evidence itself remains immutable.

---

## 26. Freshness transition rules

Allowed reviewed transitions include:

```text
FRESH_FOR_SCOPE
→ FRESHNESS_REVIEW_REQUIRED
→ FRESH_FOR_SCOPE
```

```text
FRESH_FOR_SCOPE
→ REVALIDATION_REQUIRED
→ new evidence arrives
→ old evidence may remain historical; current claim should move to new evidence identity
```

```text
FRESH_FOR_SCOPE
→ STALE_FOR_SCOPE
```

when a reviewed change makes positive reuse invalid.

```text
FRESHNESS_UNRESOLVED
→ any resolved state
```

when exact identities/context become available.

No automatic transition occurs because time passed.

---

## 27. Fail-closed rules

When any material element cannot be resolved:

```text
exact evidence identity unknown
current claim scope vague
current implementation/context anchor unknown
change overlap uncertain and material
historical proof role unresolved
```

use:

```text
FRESHNESS_UNRESOLVED
or
FRESHNESS_REVIEW_REQUIRED
```

Do not guess `FRESH_FOR_SCOPE` merely to avoid revalidation work.
Do not guess `STALE_FOR_SCOPE` merely because the evidence is old.

---

## 28. No automatic blocker promotion

SYS-14 never maps freshness state directly to gate severity.

Forbidden:

```text
STALE_FOR_SCOPE
→ BLOCKER
```

```text
REVALIDATION_REQUIRED
→ DUE_NOW
```

```text
FRESHNESS_REVIEW_REQUIRED
→ FIX
```

Correct flow:

```text
SYS-14 freshness result
→ owning gate/policy decides obligation and blocking posture
→ SYS-28 may preserve resulting verification debt
```

---

## 29. No automatic replacement-evidence selection

When evidence becomes stale/revalidation-required, SYS-14 does not select a replacement artifact.

It may state the exact required revalidation shape when already owned by a gate/policy.

It must not:
- search for the newest passing run and promote it;
- choose a later natural sample because timestamps look better;
- infer that a fixture result replaces live evidence;
- copy evidence support through SYS-02 supersession.

Replacement evidence becomes current support only through the normal evidence/proof/decision authorities.

---

## 30. Initial materialization concept

Later application, after the current design sweep closes or priority changes, may materialize:

```text
docs/SIMCORE_EVIDENCE_FRESHNESS_LEDGER.md
```

Suggested compact table columns:

```text
Review ID
Evidence
Current reuse claim
Current context anchor
Historical receipt / trace
Change events
State
Basis
Revalidation / trigger
Owning policy / blocker source
Reviewed at
Notes / non-claims
```

Do not duplicate full raw evidence inside the ledger.
Use exact refs.

---

## 31. Seed candidates for later application

Do not apply these rows in this design transaction, but the following are good initial reviewed seed candidates:

```text
v0.64.5 genuine-edit direct live control
→ pre-M2-3 baseline claim
→ likely FRESH_FOR_SCOPE

same v0.64.5 evidence
→ post-M2-3 extraction-close claim
→ REVALIDATION_REQUIRED

R2.1 permanent-CI qualification
→ permanent-CI qualification claim
→ FRESH_FOR_SCOPE while exact qualification authority remains unchanged

same R2.1 evidence
→ next genuine runtime release E2E claim
→ not reusable as that claim's proof; preserve proof-scope boundary

v0.64.7 publication identity
→ historical release commit/blob identity
→ FRESH_FOR_SCOPE
```

Each actual seed row requires bounded source review at application time.

---

## 32. Verification requirements for later application

Because v1 is document-only, later application verifies:

```text
all evidence refs resolve
all current claim refs resolve
historical SYS-18 / SYS-06 refs resolve where used
SYS-13 proof scope is not broadened
freshness state has explicit reviewed basis
no age-only stale rule introduced
no gate/blocker severity invented
no runtime/release/CI/fixture authority mutated
release-simcore unchanged
```

No real long-chat validation is required solely to materialize the ledger.

A ledger row may of course state that a real long-chat revalidation is required by an owning gate.

---

## 33. Relationship to current live gate

Current production remains:

```text
v0.64.7 Cross-Reload Cache Observer Continuity
live gate = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
status = PENDING_REAL_LONG_CHAT
```

SYS-14 design does not change that gate.

The named v0.64.7 real-long-chat evidence, once captured and reviewed, will be current evidence for its own named gate.

Historical evidence from earlier releases may support orientation/regression context only within their valid claim/proof scopes; SYS-14 must not use them to close the current gate.

---

## 34. Relationship to M2-3

The next physical architecture move remains M2-3 after the v0.64.7 live gate closes.

SYS-14 directly strengthens the already-frozen extraction-close rule:

```text
pre-M2-3 genuine-edit live PASS
= historical baseline

M2-3 implementation changes edit-reconcile ownership
→ relevant implementation + claim context changed
→ post-M2-3 direct genuine-edit revalidation required before M2-4
```

This is not a new requirement invented by SYS-14.
It is a freshness representation of an already-existing close control.

---

## 35. Relationship to later releases

Freshness review is especially useful at release/checkpoint boundaries because evidence reuse pressure is high.

Before reusing historical evidence for a new release/checkpoint claim, review:

```text
exact claim equivalence
relevant code/authority changes
host/runtime changes when material
explicit checkpoint revalidation rules
new contrary evidence
proof-kind compatibility
```

A new release number alone does not force all evidence stale.
A new release number also does not keep evidence fresh.

---

## 36. Design freeze verdict

SYS-14 is frozen with these decisions:

```text
1. Freshness is evidence + current-claim scoped, never global per evidence artifact.
2. Historical validity and current reusability are independent.
3. SYS-18 receipts remain immutable; SYS-14 never rewrites historical provenance.
4. Five freshness states are frozen:
   FRESH_FOR_SCOPE / FRESHNESS_REVIEW_REQUIRED / REVALIDATION_REQUIRED / STALE_FOR_SCOPE / FRESHNESS_UNRESOLVED.
5. Nine reviewed change-event kinds are frozen.
6. Six freshness-basis kinds are frozen.
7. No universal time/age expiry exists.
8. Freshness cannot broaden SYS-13 proof fitness.
9. Freshness cannot create required slots, debt/blocker posture, gate decisions, or release authorization.
10. Relevant repository/version change is review input, not automatic stale proof.
11. v1 is a curated living document ledger and therefore NR_DOC_ONLY.
12. No crawler/scanner/CI/repo writer/runtime behavior is part of v1.
13. Application remains HOLD while the current system design sweep is active.
```

Open design questions:

```text
0
```

---

## 37. Production / repository boundary

This design transaction changes documentation only.

```text
plugin bytes = unchanged
plugin version = unchanged
latest.js = unchanged
install.js = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
CI authority = unchanged
fixture authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```

---

## 38. Application stop

Stop after design freeze + living-ledger/classification synchronization.

Do not materialize `SIMCORE_EVIDENCE_FRESHNESS_LEDGER.md` in this transaction.
Do not add a freshness scanner.
Do not modify CI.
Do not modify runtime/plugin code.
Do not modify release-simcore.
Do not change any evidence/gate disposition solely because SYS-14 is now designed.

Later application is a separate bounded transaction after the system design sweep closes or priority explicitly changes.
