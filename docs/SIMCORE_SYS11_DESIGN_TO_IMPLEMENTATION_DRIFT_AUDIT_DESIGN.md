# SYS-11 — Design-to-Implementation Drift Audit — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · HUMAN-REVIEWED SEMANTIC AUDIT · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-11
Idea          = Design-to-Implementation Drift Audit
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
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS42_IMPLEMENTATION_SLICE_CONFORMANCE_CHECKER_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`

Existing authorities SYS-11 must not replace:
- frozen human design / implementation-plan authority for the selected work item;
- Architecture Contracts v2 and its checker;
- permanent regression suites and release-specific frozen-surface checks;
- live evidence / anomaly classification authorities;
- SYS-42 machine-verifiable slice conformance when available.

---

## 1. Problem

SimCore deliberately freezes designs before implementation and keeps implementation transactions narrow.

SYS-42 now defines a protected machine-verifiable lower bound for checking whether an implementation diff remained inside a reviewed allowed/forbidden slice. That is necessary but not sufficient.

Many important frozen requirements are semantic and cannot safely be reduced to path rules or exact structural predicates.

Examples:

```text
"move ownership without changing behavior"
"preserve fail-closed semantics"
"do not broaden authority"
"keep diagnostics observational"
"do not turn supporting verification into a new product behavior"
"preserve an existing live-positive control"
"do not claim evidence maturity that was not actually obtained"
```

A diff can therefore be fully inside the machine-approved path slice and still drift from the design.

Typical failure modes:

```text
OMISSION
→ an explicit frozen requirement was never implemented or verified

SEMANTIC BROADENING
→ implementation gives a component more authority than the design allowed

SEMANTIC NARROWING
→ implementation silently drops an intended responsibility or control

PRESERVATION GAP
→ "unchanged" behavior was assumed rather than demonstrated

NON-GOAL LEAK
→ a deliberately excluded concern appears in implementation behavior

VERIFICATION OVERCLAIM
→ CI/test success is used to claim a semantic property the executed evidence did not prove

DESIGN PROJECTION GAP
→ the SYS-42 machine slice omitted an important human requirement, so a clean mechanical result is insufficient
```

SYS-11 defines the human-reviewed semantic audit that catches those gaps.

---

## 2. Core invariant

```text
immutable frozen design authority
+ immutable implementation identity
+ reviewed implementation/evidence packet
+ SYS-42 result when applicable
→ human semantic drift audit

SYS-11
!= automatic semantic classifier
!= LLM design interpreter
!= code reviewer replacement
!= Architecture Contracts v2 replacement
!= runtime correctness proof
!= LIVE_PASS
!= release authorization
```

The audit answers:

> Did the reviewed implementation and its evidence preserve every material frozen design requirement, preservation promise, non-goal, and authority boundary that can be meaningfully assessed at this stage?

It does not answer:

> Is the product globally correct?

---

## 3. Constitutional boundary with SYS-42

This distinction is mandatory.

```text
SYS-42
= machine-verifiable implementation-slice conformance
= reviewed machine manifest + immutable diff
= exact structural/path/family/guard checks where expressible

SYS-11
= broader human-reviewed design-intent audit
= semantic requirements, omissions, preservation claims, non-goals, authority meaning
= may detect that the SYS-42 slice itself omitted an important frozen requirement
```

Therefore:

```text
SLICE_CONFORMANT
!= DRIFT_AUDIT_CLEAN
```

SYS-11 must inspect the frozen human design itself rather than treating the SYS-42 manifest as complete semantic truth.

If SYS-42 reports `SLICE_VIOLATION` or `SLICE_BLOCKED`, SYS-11 may record that fact but must not override or downgrade it.

---

## 4. Why v1 is `NR_DOC_ONLY`

The valuable v1 implementation is a reusable human-review protocol/template.

Preferred materialized form:

```text
docs/SIMCORE_DESIGN_TO_IMPLEMENTATION_DRIFT_AUDIT_TEMPLATE.md
```

or, when a work item already has a dedicated implementation-evidence document, the audit may be embedded as a standardized section there.

No executable semantic analyzer, GitHub Action, repository writer, LLM judge, background watcher, or CI-required check is part of v1.

Reason:
- the audit exists specifically for requirements that are unsafe to machine-infer;
- an executable "semantic judge" would create false confidence and duplicate human design authority;
- structured documentation is sufficient to standardize the review without creating a new protected execution surface.

Therefore:

```text
Runtime Class = NON_RUNTIME
Apply Class   = NR_DOC_ONLY
```

---

## 5. Audit identity contract

Every audit binds to immutable identities where available.

Required identity fields:

```text
Work ID
Design authority path
Design authority commit
Design authority blob (when available)
Implementation base commit
Implementation head commit
Implementation PR / branch reference (navigation only)
SYS-42 report/result reference (when applicable)
Primary implementation-evidence reference
Audit timestamp/date
Reviewer role
```

A branch name is navigation, not proof identity.

If the frozen design identity or implementation head cannot be resolved unambiguously:

```text
AUDIT_BLOCKED
```

Do not audit a moving target and later present it as proof for a different commit.

---

## 6. Frozen v1 audit dimensions

SYS-11 v1 reviews exactly these semantic dimensions.

### D1 — Required behavior / responsibility delivered

Question:

```text
Did every material MUST / owns / becomes / required responsibility in the frozen design receive an implementation or an explicit, design-authorized reason not to apply?
```

Possible finding:

```text
REQUIREMENT_OMITTED
```

Do not treat a touched file as proof that the requirement was implemented.

### D2 — Preservation promises supported

Question:

```text
For every "preserve / unchanged / no behavior change" promise, is there appropriate evidence at the level that promise actually needs?
```

Examples:
- exact-body or byte identity when explicitly required;
- deterministic fixture preservation;
- architecture checker result;
- genuine live control where the design requires live evidence.

Possible findings:

```text
PRESERVATION_UNPROVEN
PRESERVATION_VIOLATED
```

### D3 — Forbidden / non-goal behavior absent

Question:

```text
Did implementation introduce anything the design explicitly said it would not own, change, infer, persist, publish, or restructure?
```

Possible findings:

```text
NON_GOAL_VIOLATED
FORBIDDEN_AUTHORITY_BROADENING
```

### D4 — Ownership / authority meaning preserved

Question:

```text
Did the implementation preserve the intended meaning of ownership and authority rather than merely move code?
```

Examples:
- an extracted application service must not accidentally become persistence authority;
- an observational diagnostic must not become a state mutator;
- a generated view must not become the canonical source it projects.

Possible findings:

```text
AUTHORITY_BROADENED
AUTHORITY_NARROWED
OWNERSHIP_SEMANTICS_DRIFT
```

### D5 — Supporting work stayed supporting

Question:

```text
Did fixtures, docs, tooling, evidence, or sync changes remain support/verification/close-sync rather than silently becoming another primary objective?
```

SYS-50 preflight is relevant but not sufficient; implementation can still escalate later.

Possible finding:

```text
SUPPORTING_WORK_ESCALATED
```

### D6 — Design omissions in the machine slice

Question:

```text
Did SYS-42's reviewed machine slice omit any material frozen requirement that should have been represented mechanically or at least declared HUMAN_REVIEW_REQUIRED?
```

Possible findings:

```text
SLICE_PROJECTION_GAP
MISSING_HUMAN_REVIEW_DECLARATION
```

This finding targets the projection, not the frozen human design.

### D7 — Verification claim matches executed proof

Question:

```text
Are implementation claims no stronger than the evidence actually executed?
```

Examples:
- generic CI PASS does not imply focused standalone test execution;
- deterministic fixture PASS does not imply natural long-chat semantic validation;
- permanent-CI qualification does not imply genuine release E2E proof.

Possible findings:

```text
VERIFICATION_OVERCLAIM
EVIDENCE_MATURITY_OVERCLAIM
```

### D8 — Deferred / WATCH boundaries preserved

Question:

```text
Did the implementation accidentally close, repair, erase, or reclassify an explicitly deferred/WATCH concern without the required evidence or separate work item?
```

Possible finding:

```text
DEFERRED_SCOPE_LEAK
WATCH_DISPOSITION_DRIFT
```

### D9 — Resulting docs/state describe the implementation honestly

Question:

```text
After implementation, do current living authorities and point-in-time evidence state what actually happened without rewriting historical frozen meaning?
```

Possible findings:

```text
CURRENT_STATE_MISREPRESENTED
HISTORICAL_RECORD_REWRITTEN
```

This composes with the real-time document-consistency routine; it does not replace it.

---

## 7. Requirement extraction discipline

SYS-11 may not silently invent a new design during audit.

Before reviewing implementation, make a bounded requirement ledger from the frozen design using only explicit or unavoidable semantic commitments.

Allowed requirement categories:

```text
REQUIRED
PRESERVE
FORBIDDEN
NON_GOAL
AUTHORITY_BOUNDARY
VERIFICATION_REQUIRED
LIVE_CONTROL_REQUIRED
DEFERRED / OUT_OF_SCOPE
```

Each row must contain:

```text
Requirement ID
Category
Frozen design citation / section
Short normalized statement
Evidence needed to assess
Audit disposition
Evidence reference
Notes
```

Normalization must preserve meaning.

Do not convert vague aspirations into hard requirements after implementation merely because the reviewer prefers a different architecture.

If design prose is materially ambiguous:

```text
DESIGN_REQUIREMENT_AMBIGUOUS
→ AUDIT_BLOCKED or explicit limited-scope review
```

Do not repair the ambiguity inside the audit.

---

## 8. Audit disposition vocabulary

Each requirement row uses exactly:

```text
SATISFIED
VIOLATED
UNPROVEN
NOT_APPLICABLE_BY_DESIGN
BLOCKED
```

Rules:

```text
SATISFIED
= evidence appropriate to the frozen requirement supports it

VIOLATED
= reviewed implementation/evidence contradicts the requirement

UNPROVEN
= no contradiction found, but required proof is missing or too weak

NOT_APPLICABLE_BY_DESIGN
= the frozen design itself makes this requirement irrelevant to the implementation slice

BLOCKED
= trustworthy review cannot be completed because the authority/evidence/identity is ambiguous or unavailable
```

`UNPROVEN` must not be rewritten as `SATISFIED` merely because CI is green.

---

## 9. Top-level result vocabulary

Exactly four top-level v1 results:

```text
DRIFT_AUDIT_CLEAN
DRIFT_AUDIT_FINDINGS
DRIFT_AUDIT_REVIEW_REQUIRED
DRIFT_AUDIT_BLOCKED
```

Precedence:

```text
BLOCKED
> FINDINGS
> REVIEW_REQUIRED
> CLEAN
```

### `DRIFT_AUDIT_CLEAN`

All material requirement rows are `SATISFIED` or legitimately `NOT_APPLICABLE_BY_DESIGN`, and no semantic drift finding remains.

This is design-to-implementation conformance evidence only.

### `DRIFT_AUDIT_FINDINGS`

At least one requirement is `VIOLATED` or a definite drift finding exists.

The audit must identify the exact frozen requirement and observed implementation/evidence contradiction.

### `DRIFT_AUDIT_REVIEW_REQUIRED`

No definite violation is proven, but at least one material requirement is `UNPROVEN` or needs a later evidence class (for example natural live control).

This result is especially important for mechanical architecture work whose static implementation is correct but whose live equivalence gate is intentionally later.

### `DRIFT_AUDIT_BLOCKED`

The design identity, implementation identity, or minimum evidence packet is too ambiguous to support a trustworthy audit.

Fail closed:

```text
unknown != clean
```

---

## 10. Frozen finding vocabulary

Minimum v1 finding codes:

```text
REQUIREMENT_OMITTED
PRESERVATION_UNPROVEN
PRESERVATION_VIOLATED
NON_GOAL_VIOLATED
FORBIDDEN_AUTHORITY_BROADENING
AUTHORITY_BROADENED
AUTHORITY_NARROWED
OWNERSHIP_SEMANTICS_DRIFT
SUPPORTING_WORK_ESCALATED
SLICE_PROJECTION_GAP
MISSING_HUMAN_REVIEW_DECLARATION
VERIFICATION_OVERCLAIM
EVIDENCE_MATURITY_OVERCLAIM
DEFERRED_SCOPE_LEAK
WATCH_DISPOSITION_DRIFT
CURRENT_STATE_MISREPRESENTED
HISTORICAL_RECORD_REWRITTEN
DESIGN_REQUIREMENT_AMBIGUOUS
IMPLEMENTATION_IDENTITY_AMBIGUOUS
EVIDENCE_REFERENCE_AMBIGUOUS
```

A finding is never auto-promoted to runtime `FIX/BLOCKER` solely by SYS-11.
Normal anomaly/work classification remains separate.

---

## 11. Relationship to SYS-09 / SYS-50 / SYS-08

### SYS-09 Change-Impact Review Map

SYS-09 identifies semantic change families and review obligations.

SYS-11 consumes those reviewed families as context but audits against the frozen design, not against the family map alone.

### SYS-50 Work Bundling Conflict Detector

SYS-50 is preflight:

```text
Are these primary objectives allowed in one transaction?
```

SYS-11 is post/during implementation:

```text
Did the actual implementation stay faithful to the one selected design objective?
```

A clean preflight cannot prove post-implementation fidelity.

### SYS-08 Work-Item Close Receipt

SYS-08 may record the SYS-11 top-level result and link the audit evidence.
It must not copy the entire requirement ledger into the close receipt.

---

## 12. M2-3 specialization example

M2-3 is a strong example because the frozen checkpoint is primarily mechanical but includes semantic preservation promises.

Representative requirement ledger:

```text
R1 REQUIRED
edit-reconcile becomes the single application service for previous-assistant reconciliation routing

R2 REQUIRED
Session / outer-shell ownership is reduced accordingly

R3 PRESERVE
representation fast reconcile still accepts exact prior Fresh carryover without rebuilding snapshot

R4 PRESERVE
genuine user edit still routes USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT

R5 FORBIDDEN
edit-reconcile must not own representation taxonomy/provenance storage

R6 FORBIDDEN
edit-reconcile must not own host Fresh reads or Deferred Mirror scheduling

R7 NON_GOAL
no provider-cache claim or redesign

R8 NON_GOAL
no M2-4 Session/Runtime Mirror ownership movement

R9 VERIFY
Contracts v2 / permanent regression controls must pass

R10 LIVE_CONTROL_REQUIRED
post-extraction genuine-edit direct control remains a separate real evidence requirement
```

Possible static-close result:

```text
R1 SATISFIED
R2 SATISFIED
R3 SATISFIED by executable deterministic control
R4 SATISFIED by deterministic control, live direct recheck still separately required by project gate
R5 SATISFIED
R6 SATISFIED
R7 SATISFIED
R8 SATISFIED
R9 SATISFIED
R10 UNPROVEN pending direct post-extraction live control

Top-level = DRIFT_AUDIT_REVIEW_REQUIRED
```

That is a correct result. The audit must not call the checkpoint fully live-closed merely because static implementation fidelity is clean.

---

## 13. Deliberately unsupported v1 behavior

SYS-11 v1 must not add:

```text
LLM auto-judge over design prose
semantic code equivalence claims
automatic PASS from green CI
automatic FIX/BLOCKER classification
automatic PR approval/merge
repository mutation
background monitoring
release authorization
provider/cache inference
transcript-wide unbounded data retention
```

The goal is disciplined review, not automated confidence theater.

---

## 14. Application form after design sweep

Preferred reusable artifact:

```text
docs/SIMCORE_DESIGN_TO_IMPLEMENTATION_DRIFT_AUDIT_TEMPLATE.md
```

Suggested compact sections:

```text
1. Immutable identities
2. Frozen requirement ledger
3. SYS-42 result/reference
4. Semantic drift findings
5. Verification/evidence maturity check
6. Deferred/WATCH preservation
7. Top-level audit result
8. Follow-up routing
```

For a major architecture checkpoint, a dedicated point-in-time audit evidence document may be created from the template.

For a tiny bounded NR/doc transaction, do not force a giant audit document if no implementation semantics exist to audit.

---

## 15. Verification plan for later document application

When the template is materialized, verify at least:

```text
1. every audit binds to a frozen design identity
2. implementation identity is immutable
3. requirement categories come from the frozen design, not reviewer preference
4. preservation claims require evidence appropriate to their scope
5. UNPROVEN remains distinct from SATISFIED
6. SYS-42 result is referenced rather than duplicated when applicable
7. SLICE_CONFORMANT does not imply DRIFT_AUDIT_CLEAN
8. no automatic semantic classifier is introduced
9. no runtime/plugin/release/CI/repository-writer behavior changes
10. audit findings do not auto-reclassify runtime anomaly severity
11. deferred/WATCH concerns are not silently closed
12. historical frozen documents are not rewritten merely to make audit wording current
```

No real long-chat validation is required solely to materialize the SYS-11 template.
Specific audited runtime work may of course retain its own live gate.

---

## 16. Unified classification freeze verdict

Source/design inspection confirms:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful v1 is a human-reviewed semantic audit protocol/template;
- machine semantic inference is explicitly out of scope;
- SYS-42 already owns the protected machine-verifiable lower bound;
- SYS-11 creates no CI/release/repository writer/architecture checker authority.

---

## 17. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop this idea here. Materializing the reusable audit template is a later bounded NR_DOC_ONLY application transaction after the active system-idea design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
