# SYS-21 — Forensic Classification Consistency Check — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · HUMAN-REVIEWED FORENSIC CONSISTENCY AUDIT · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-21
Idea          = Forensic Classification Consistency Check
Size          = MEDIUM
Importance    = 5 / VERY HIGH
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
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md`
- `docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`

Existing authorities SYS-21 must not replace:
- the source forensic/anomaly/evidence document that owns a specimen or disposition;
- the current live-gate authority;
- the Deferred Ledger and Anomaly Watch lifecycle/status meaning;
- SYS-13 proof fitness and non-equivalence rules;
- SYS-17 required evidence-slot completeness;
- SYS-22 test intent and explicit non-claims;
- future SYS-16 recurrence correlation;
- future SYS-15 WATCH aging review;
- future SYS-04 status-vocabulary linting.

---

## 1. Problem

SimCore deliberately preserves uncertain evidence instead of forcing every observation into `PASS` or `BUG`.

Current repository evidence uses scoped states/dispositions such as:

```text
SUSPECTED
WATCH_ONLY
DIRECT_EVIDENCE
DEFERRED_NON_BLOCKING
CONFIRMED_BLOCKING
MITIGATED
REGRESSION_CONTROL
DISMISSED_NO_DEFECT

WATCH
DEFER
FIX
BLOCKER
```

These labels are useful only when they remain consistent with the evidence actually available.

Without an explicit consistency review, drift can occur in both directions:

```text
OVER-PROMOTION
one ambiguous sample
→ confirmed attribution / FIX / BLOCKER

UNDER-CLASSIFICATION
repeatable attributable corruption
→ still described as low-confidence WATCH

PROOF SUBSTITUTION
generic CI PASS
→ focused execution claimed

MITIGATION CONFUSION
patch deployed
→ live revalidation silently treated as complete

GATE / ANOMALY CONFUSION
required evidence slot missing
→ automatically called a runtime defect
```

SYS-21 defines one bounded human-reviewed consistency audit for the classification already recorded on a forensic item.

It does not assign severity automatically.

---

## 2. Core invariant

```text
one bounded forensic item
+ its current recorded classification/disposition
+ cited evidence/proof maturity
+ cited impact/recurrence/attribution facts
→ human consistency review

SYS-21
!= anomaly classifier
!= automatic severity promoter
!= automatic severity downgrader
!= recurrence correlator
!= WATCH aging system
!= gate closer
!= evidence discoverer
!= runtime repair selector
!= repository writer
```

Canonical question:

> Does the current recorded classification say more, less, or something materially different from what the cited evidence and current operating authority support?

---

## 3. Why v1 is `NR_DOC_ONLY`

Forensic classification consistency is semantic and contextual.

Examples:
- one direct symptom can be real while root-cause attribution remains unproven;
- a confirmed defect can be non-blocking after a narrow mitigation;
- a missing live validation slot can block a gate without proving a runtime defect;
- a repeated anomaly can deserve investigation without yet authorizing repair;
- a generic CI PASS can coexist with a focused execution `NOT_CLAIMED` state.

Encoding these decisions as an automatic severity engine would create false confidence and conflict with the standing rule that live anomaly severity is not auto-promoted.

Therefore useful v1 materialization is a reviewed checklist/template, for example:

```text
docs/SIMCORE_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK.md
```

No script, LLM judge, CI hook, GitHub Action, repository writer, background watcher, automatic ledger edit, or automatic WATCH/FIX/BLOCKER mutation is part of v1.

Apply Class:

```text
NR_DOC_ONLY
```

---

## 4. Review object

One SYS-21 review is always bounded to exactly one forensic object:

```text
anomaly ID
validation/debt ID
verification WATCH
live-gate finding
mitigated defect / regression-control item
```

A review must not sweep arbitrary repository prose and invent a global status model.

Minimum identity:

```text
itemId
sourceAuthorityPath
sourceAuthorityCommitOrBlob when available
currentClassification
reviewedAt
reviewer
```

Historical point-in-time classifications are not rewritten merely because the current state later changed.

The review targets the current living classification or an explicitly selected historical classification record.

---

## 5. Evidence inputs

SYS-21 consumes cited evidence; it does not discover evidence.

Permitted input references include:
- direct live specimen / diagnostic evidence;
- natural evidence corpus entry;
- permanent fixture/test result;
- focused test result;
- permanent CI result;
- release receipt/publication identity;
- SYS-13 proof record;
- SYS-17 evidence-slot result;
- SYS-22 test intent/non-claim row;
- mitigation/release evidence;
- current gate/priority authority;
- recurrence facts already established by an owning authority.

Rule:

```text
uncited inference
!= evidence
```

If a material fact needed to assess consistency is unavailable, return review-required or blocked rather than inventing it.

---

## 6. Frozen review dimensions

SYS-21 reviews the current classification against these dimensions.

### 6.1 Symptom reality

Question:

```text
Is the observable symptom merely suspected,
observed directly,
reproduced/repeated,
or disproved by later evidence?
```

Do not infer root cause from symptom reality.

### 6.2 Attribution maturity

Question:

```text
Does the classification claim a subsystem/root cause
more strongly than the evidence supports?
```

Canonical preservation rule:

```text
DIRECT SYMPTOM
!= CONFIRMED ATTRIBUTION
```

### 6.3 Recurrence maturity

Question:

```text
Does the recorded disposition rely on recurrence,
and if so is recurrence actually established by an authority?
```

SYS-21 does not correlate specimens itself. Future SYS-16 owns recurrence correlation.

### 6.4 Impact / stop-condition maturity

Question:

```text
Does the evidence establish an active condition that must stop current work?
```

Standing SimCore blocker examples remain source-owned, including evidence of:

```text
hard state corruption
broadcast lifecycle regression
real user-edit corruption/misclassification
repeatable chronology corruption
repeatable representation ownership corruption
repeatable structural failure with a narrow attributable cause
```

A `BLOCKER` claim without a supported active stop condition is inconsistent.

A supported active blocking condition left as a harmless WATCH also requires review.

### 6.5 Proof fitness

Use SYS-13.

Examples:

```text
permanent CI PASS
!= focused standalone test executed

deterministic fixture PASS
!= natural live validation

release publication
!= live behavior PASS
```

Classification text must not rely on proof substitution.

### 6.6 Required-slot state

Use SYS-17 when the classification depends on whether required evidence exists.

Important:

```text
SLOT_MISSING
!= runtime defect
```

A required current-gate slot may legitimately keep a gate pending while the underlying runtime remains unclassified.

### 6.7 Test-intent boundary

Use SYS-22 when a test result is cited.

The classification must remain inside the test's intended claims and explicit non-claims.

### 6.8 Mitigation state

Question:

```text
Is a mitigation/patch actually recorded,
and are post-mitigation validation claims kept separate?
```

Canonical distinction:

```text
MITIGATION DEPLOYED
!= LIVE REVALIDATION COMPLETE
```

### 6.9 Current-vs-historical state

A historical classification may be correct for its time even if superseded later.

SYS-21 must distinguish:

```text
historical point-in-time state
vs
current living disposition
```

Do not call a frozen historical record inconsistent merely because later evidence changed the current state.

---

## 7. Frozen consistency rules

### Rule FCR-01 — no evidence over-promotion

```text
one-off / ambiguous / attribution-unproven evidence
→ must not silently become confirmed cause, FIX, or BLOCKER
```

A stronger classification is allowed only with explicit supporting authority.

### Rule FCR-02 — no active blocker under-classification

If current authoritative evidence establishes an active blocking condition, a living classification that still presents the issue only as non-blocking WATCH/DEFER requires review.

SYS-21 reports inconsistency; it does not promote the label itself.

### Rule FCR-03 — symptom and attribution remain separate

```text
observable defect = confirmed
root cause = may remain unproven
```

Do not force both to the same maturity.

### Rule FCR-04 — recurrence claims require recurrence evidence

Terms such as repeated/recurrent/systemic must have cited recurrence authority.

One sample plus one reroll is not automatically recurrence.

### Rule FCR-05 — proof non-equivalence is preserved

All SYS-13 mandatory non-equivalence rules apply.

### Rule FCR-06 — missing evidence is not failure evidence

```text
NOT_CLAIMED / SLOT_MISSING / PENDING
!= FAILED
!= FIX
!= BLOCKER
```

unless a separate authority says the absence itself is a blocking procedural condition.

### Rule FCR-07 — mitigation does not erase evidence history

A mitigated defect remains preserved as evidence/regression control where appropriate.

Do not rewrite it as `never happened`.

### Rule FCR-08 — mitigation does not manufacture validation

Patch deployed without post-fix natural evidence must keep the revalidation state pending/deferred when required.

### Rule FCR-09 — deterministic PASS does not erase semantic WATCH

A permanent fixture may protect a deterministic contract while natural semantic validation remains WATCH/DEFER/VALIDATION_ONLY.

### Rule FCR-10 — current gate and anomaly severity are orthogonal

A gate can remain `PENDING` because evidence is missing without any underlying anomaly being `BLOCKER`.

Conversely, an active blocker can stop work even if an unrelated gate slot is otherwise satisfied.

### Rule FCR-11 — dismissal requires resolving evidence

`DISMISSED_NO_DEFECT` requires a cited reason/evidence that resolves the suspicion.

Absence of recurrence alone is not sufficient to rewrite an observed defect as dismissed.

### Rule FCR-12 — classification changes preserve provenance

When current classification legitimately changes:

```text
old classification
+ new evidence / decision authority
→ new current classification
```

Do not erase the prior point-in-time classification or specimen.

---

## 8. Finding vocabulary

SYS-21 does not replace source status vocabularies. Its own finding codes describe only consistency problems.

Frozen v1 finding codes:

```text
EVIDENCE_OVERPROMOTION
ACTIVE_BLOCKER_UNDERCLASSIFIED
ATTRIBUTION_OVERCLAIM
RECURRENCE_OVERCLAIM
PROOF_SUBSTITUTION
MISSING_EVIDENCE_MISLABELED_AS_FAILURE
TEST_INTENT_OVERREACH
MITIGATION_WITHOUT_EVIDENCE
MITIGATION_TREATED_AS_REVALIDATION
DISMISSAL_WITHOUT_RESOLUTION
HISTORICAL_STATE_MISREAD_AS_CURRENT
CURRENT_STATE_STALE_AFTER_NEW_EVIDENCE
CLASSIFICATION_SOURCE_UNRESOLVED
REVIEW_FACT_MISSING
```

These are audit findings only.

They do not automatically map 1:1 to WATCH / DEFER / FIX / BLOCKER.

---

## 9. Top-level audit result

Exactly four v1 results:

```text
FORENSIC_CLASSIFICATION_CONSISTENT
FORENSIC_CLASSIFICATION_REVIEW_REQUIRED
FORENSIC_CLASSIFICATION_INCONSISTENT
FORENSIC_CLASSIFICATION_BLOCKED
```

### `FORENSIC_CLASSIFICATION_CONSISTENT`

The reviewed classification remains within the cited evidence, proof, attribution, recurrence, impact, and lifecycle boundaries.

This does not mean the underlying behavior is healthy.

### `FORENSIC_CLASSIFICATION_REVIEW_REQUIRED`

No definite contradiction is established, but one or more material facts needed for confidence are unresolved.

### `FORENSIC_CLASSIFICATION_INCONSISTENT`

At least one deterministic/logical inconsistency with cited authority is established, such as proof substitution or a stale current disposition after stronger evidence.

The result asks the owning authority to review/update the classification. It does not mutate it.

### `FORENSIC_CLASSIFICATION_BLOCKED`

Trustworthy review is impossible because the owning source or required evidence identity cannot be resolved.

Precedence:

```text
BLOCKED
> INCONSISTENT
> REVIEW_REQUIRED
> CONSISTENT
```

---

## 10. Review record schema

Recommended v1 review block:

```text
itemId
sourceAuthority
currentClassification
reviewScope
proofRefs[]
slotRefs[]
testIntentRefs[]
recurrenceRefs[]
mitigationRefs[]
currentGateRefs[]
findings[]
result
recommendedOwnerAction
nonClaims[]
reviewedAt
```

`recommendedOwnerAction` is bounded to actions such as:

```text
KEEP_CLASSIFICATION
REVIEW_CLASSIFICATION
REQUEST_MISSING_EVIDENCE
UPDATE_LIVING_DISPOSITION
PRESERVE_HISTORICAL_AND_UPDATE_CURRENT
```

It must not say:

```text
AUTO_PROMOTE_TO_BLOCKER
AUTO_PATCH_RUNTIME
AUTO_CLOSE_GATE
AUTO_RELEASE
```

---

## 11. Current SimCore examples

### 11.1 `GENERATION_SEMANTIC_EXCURSION`

Current evidence shape:

```text
one natural first-generation excursion
regeneration corrected it
SimCore diagnostics otherwise healthy
Recovery/Representation attribution unproven
```

A low-confidence `WATCH_ONLY` classification is consistent with that maturity.

SYS-21 must not promote it merely because the output was visibly wrong once.

### 11.2 Visible scene-time regression guard gap

Current evidence can simultaneously support:

```text
visible symptom = DIRECT/HIGH
persisted state corruption = PREVENTED
root-cause attribution = UNPROVEN
mitigation = DEPLOYED
post-mitigation live validation = separate state
```

Those facts are not contradictory. A direct symptom does not force confirmed M2 attribution or permanent BLOCKER state.

### 11.3 NR focused-test CI coverage WATCH

Current evidence:

```text
permanent CI = PASS
focused standalone execution by that CI = NOT_CLAIMED
runtime impact = NONE
release impact = NONE
```

`WATCH_ONLY / VERIFICATION_COVERAGE / NON_BLOCKING` is consistent.

Promoting this to runtime FIX because the CI did not prove focused execution would violate proof and impact boundaries.

### 11.4 v0.64.7 live-gate pending evidence

Current required real-long-chat evidence remains missing/pending.

Correct interpretation:

```text
current live gate = PENDING_REAL_LONG_CHAT
```

It does not imply:

```text
runtime defect = confirmed
FIX required
BLOCKER anomaly exists
```

The gate authority, not SYS-21, decides whether work may advance.

### 11.5 R2.1 genuine release proof

Permanent-CI qualification is established while genuine runtime release E2E proof remains pending.

That is a proof-maturity distinction, not an inconsistency.

---

## 12. Relationship to nearby system ideas

### SYS-13 Verification Proof Matrix

```text
SYS-13
= what kind of proof can establish what claim?

SYS-21
= did the forensic classification stay within those proof boundaries?
```

### SYS-17 Missing Evidence Slot Analyzer

```text
SYS-17
= which explicitly required evidence slots are unresolved?

SYS-21
= was that unresolved state classified honestly, without converting absence into failure or ignoring an active procedural blocker?
```

### SYS-22 Test Intent Manifest

```text
SYS-22
= what does a named test intend to prove/not prove?

SYS-21
= did a forensic classification overreach that intent?
```

### SYS-16 Anomaly Recurrence Correlator

```text
SYS-16
= correlate multiple specimens into recurrence evidence

SYS-21
= consume recurrence evidence if it exists; do not create it
```

### SYS-15 WATCH Aging Review

```text
SYS-15
= time/age review for WATCH items

SYS-21
= semantic evidence/classification consistency regardless of age
```

### SYS-04 Status Vocabulary Linter

```text
SYS-04
= are status tokens/placements syntactically/administratively valid?

SYS-21
= is the semantic classification defensible from evidence?
```

Do not merge these ideas.

---

## 13. Update discipline

When SYS-21 finds inconsistency:

```text
1. preserve the existing source evidence
2. cite the exact contradictory proof/authority
3. classify the SYS-21 audit result
4. update the owning living forensic authority if a human review confirms the correction
5. preserve historical point-in-time state
6. run RT-01/RT-07/RT-08/RT-12 as triggered by the actual change
```

SYS-21 itself never writes the source classification automatically.

---

## 14. Explicit non-goals

SYS-21 v1 does not:
- discover anomalies;
- correlate recurrence;
- age WATCH items;
- create new severity taxonomy;
- normalize every repository status token;
- change WATCH / DEFER / FIX / BLOCKER automatically;
- change `SUSPECTED / DIRECT_EVIDENCE / MITIGATED / ...` automatically;
- infer root cause;
- choose runtime repair;
- close live gates;
- release plugins;
- edit `release-simcore`;
- modify permanent CI;
- write GitHub issues/PRs;
- run in the background.

---

## 15. Freeze-time examples of unacceptable shortcuts

Do not implement any of these as SYS-21 v1:

```text
if recurrenceCount >= 2 → BLOCKER
if DIRECT_EVIDENCE → FIX
if CI PASS → DISMISS
if fixture PASS → LIVE_PASS
if SLOT_MISSING → BUG
if patch exists → MITIGATED_AND_VALIDATED
if no recurrence for N days → DISMISSED
```

All lose context and violate existing authority boundaries.

---

## 16. Application plan after design sweep

Future application is a separate document-only transaction:

```text
1. materialize reviewed consistency-check template/policy
2. reference SYS-13 / SYS-17 / SYS-22
3. add bounded worked examples from current authorities
4. verify no source forensic classification changed merely by template creation
5. sync living authority map/current operating docs if materially affected
```

No runtime release is required.

---

## 17. Production boundary

This design transaction changes only `main` documentation authority.

```text
production version = v0.64.7
release-simcore = unchanged
latest.js = unchanged
install.js = unchanged
runtime semantics = unchanged
current live gate = PENDING_REAL_LONG_CHAT
```

---

## 18. Freeze verdict

```text
SYS-21 DESIGN = FROZEN
Runtime Class = NON_RUNTIME
Apply Class = NR_DOC_ONLY
Open design questions = 0
Application = NOT STARTED / HELD
```

Core principle:

> Forensic classification must be no stronger and no weaker than the current evidence and operating authority justify, but SYS-21 reports inconsistency rather than becoming the authority that changes severity itself.
