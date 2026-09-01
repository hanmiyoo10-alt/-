# Repository Agent Skill Design — plugin-impact-scope Candidate Grounded Report Contract — 2026-09-02

Status: **DESIGN READY · COMMON AGENT SKILL / EVAL-HARNESS ONLY · IMPLEMENTATION NOT STARTED · NO SCOPE PROMOTION · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## 0. Purpose

Freeze the next generic repair design for `plugin-impact-scope` after two genuinely independent candidate held-outs failed with the same downstream freeform-grounding pattern.

This design is intentionally **not** a Termux answer patch, Voyage answer patch, SimCore promotion, or a repository-runtime feature.

Selected seam:

```text
CANDIDATE_GROUNDED_REPORT_VALIDATION_GATE
```

The goal is to let the model propose semantic impact claims while moving **grounding admissibility, unresolved-claim blocking, and final verdict authority** out of freeform prose and into deterministic evaluation machinery.

## 1. Current evidence state

### 1.1 Proven pilot lane

The validated pilot remains exactly:

```text
plugin:usage-dashboard
```

Its zero-credit structured response lane currently uses a bounded response contract with:

- evaluator-owned evidence registry;
- bounded flow-edge registry;
- evidence/status allowlists;
- mechanical validation of source anchors;
- evaluator-derived blocked claims;
- evaluator-derived final impact verdict.

The v15 Usage Dashboard regression remains PASS after generic candidate prompt-layout changes.

### 1.2 Retired SimCore candidate

The prior SimCore 3M-3 held-out was useful diagnostic/training evidence after generic skill changes. It is no longer valid independent generalization proof and must not be reused as such.

### 1.3 Independent Termux result

`plugin:termux-large-doc-editor` was frozen before output, executed once, and qualitatively failed.

What worked:

```text
candidate scope selection
+ immutable frozen-ref fetch
+ bounded evidence delivery
+ candidate scope-gate projection
```

What failed:

- generic high-level flow labels replaced exact source-grounded semantic distinctions;
- material preservation/test/production boundaries were missed or flattened;
- unresolved claims did not reliably become blockers;
- the freeform response could still self-award a successful verdict.

The exact Termux case is retired from future independent proof.

### 1.4 Independent Voyage result

`plugin:voyage-token-check` was prospectively frozen after the Usage Dashboard regression remained green, then executed once and also qualitatively failed.

It used the newer candidate guidance-recency layout, so the repeated failure demonstrates that prompt recency alone is not sufficient.

The Voyage failure repeated the same core shape:

- task nouns could become apparent semantic owners/edges without exact source grounding;
- case-specific preservation/security/completeness boundaries could be omitted;
- missing material claims did not mechanically block success;
- freeform output could still claim a successful impact scope despite unresolved evidence.

The exact Voyage case is also retired from future independent proof.

## 2. Problem statement

The current candidate lane proves that the harness can deliver the right scope and frozen source context, but the freeform response still owns too much of the acceptance decision.

Today a small model can effectively do this:

```text
user task noun
→ plausible semantic label
→ generic flow sentence
→ Blocked claims: none
→ Verdict: IMPACT_SCOPED
```

without a deterministic component proving that:

- each non-UNKNOWN semantic claim names an actual supplied source basis;
- all required report categories were represented;
- unresolved required categories were converted into blockers;
- the final verdict follows from the validated claim state.

That is inconsistent with the canonical skill contract, which already requires concrete current source basis for every non-UNKNOWN edge and fail-closed handling of unresolved material claims.

## 3. Design principles

### 3.1 Model proposes semantics; evaluator owns admissibility

The model may propose:

- semantic owners;
- producer/consumer edges;
- preservation claims;
- tests/contracts;
- generated/release boundaries;
- the narrowest supported impact boundary.

The deterministic evaluator may validate only bounded mechanical properties such as:

- referenced source block exists;
- referenced anchor exists verbatim in that supplied block;
- status is in the allowed evidence vocabulary;
- required generic report fields are present;
- non-UNKNOWN claims carry admissible source references;
- unresolved required fields produce blockers;
- final verdict is derived consistently.

The evaluator must **not** claim that an anchor semantically proves an edge merely because the text exists.

```text
SOURCE ANCHOR EXISTS
!=
SEMANTIC RELATIONSHIP PROVEN
```

Qualitative held-out assertions remain necessary for semantic generalization evidence.

### 3.2 No hidden case answer injection

The contract must not encode Termux/Voyage/SimCore-specific paths, symbols, expected owner names, expected flow endpoints, or frozen assertion wording into the model-visible guidance.

Retired held-outs may inform the generic failure class but not the expected answer content.

### 3.3 Candidate contract is evaluation-only

This design does not:

- expand `PILOT_VALIDATED_SCOPES`;
- change normal skill invocation authority;
- make candidate scopes production-supported;
- prove trigger/discovery behavior;
- authorize any product/plugin/runtime/release change.

### 3.4 Preserve the proven Usage Dashboard lane

The existing Usage Dashboard structured contract remains unchanged unless a later implementation needs a strictly backward-compatible shared helper refactor.

A candidate repair that regresses the validated pilot is rejected.

## 4. Selected conceptual contract

Introduce an evaluation-only draft shape conceptually named:

```text
CandidateGroundedImpactDraftV1
```

The exact serialization is an implementation detail, but the semantic fields are frozen as follows.

```text
scope

authority
  status
  value
  sourceRefs[]

semanticOwners[]
  label
  status
  sourceRefs[]

flowEdges[]
  from
  to
  status
  sourceRefs[]

preservation
  requestIdentity
  noExtraIo
  otherBoundaries[]

testsContracts[]
  boundary
  status
  sourceRefs[]

generatedRelease
  status
  value
  sourceRefs[]

narrowestBoundary
  status
  value
  sourceRefs[]
```

Allowed claim status vocabulary remains aligned with the skill:

```text
DIRECT
SUPPORTED_LIKELY
UNKNOWN
CONFLICT
```

A claim with `UNKNOWN` carries no affirmative evidence authority.

## 5. Generic source-reference contract

The harness may assign bounded opaque IDs to supplied context blocks, for example:

```text
S1
S2
S3
...
```

A model-visible source reference may contain only bounded locator information such as:

```text
sourceBlockId
sourceAnchor
```

where `sourceAnchor` must be a short verbatim substring present in the supplied block.

The evaluator verifies:

```text
sourceBlockId exists
AND
sourceAnchor occurs in that exact supplied block
```

It does not infer a semantic edge from this mechanical match.

Every non-`UNKNOWN` affirmative semantic claim must provide at least one admissible source reference.

If a non-UNKNOWN claim has no valid source basis:

```text
→ INVALID_GROUNDING
→ claim cannot contribute to successful completion
→ derived blocker
```

## 6. Completion enforcement

The candidate report must represent the canonical generic categories rather than silently omitting them:

1. authority;
2. semantic owners;
3. state/data/effect flow;
4. request-identity preservation;
5. no-extra-I/O preservation;
6. tests/contracts/validation;
7. generated/release/materializer boundary;
8. narrowest supported impact boundary.

`UNKNOWN` is a valid value.

Omission is not a substitute for `UNKNOWN`.

For a broad impact-scope candidate case:

- no resolved/source-grounded flow edge means the report cannot receive a success verdict;
- unresolved required preservation or validation categories become derived blockers;
- conflicting authority/evidence yields a conflict outcome;
- ungrounded affirmative claims are treated as unresolved/invalid rather than accepted because they sound plausible.

## 7. Blocked-claim ownership

Candidate model output must not own the authoritative blocker list.

A compatibility field may exist only if mechanically constrained, but evaluator-derived blockers are authoritative.

Generic derived blocker classes may include:

```text
authority
flow
request_identity
no_extra_io
tests_contracts
generated_release
narrowest_boundary
invalid_grounding
conflict
```

These are generic field classes, not hidden expected answers.

The evaluator must never derive a blocker named after a Termux/Voyage/SimCore assertion or expected source path.

## 8. Verdict ownership

The model must not self-award the authoritative final verdict for candidate evaluation.

Conceptual evaluator verdicts:

```text
SUPPORTED
PARTIAL
UNKNOWN
CONFLICT
```

Minimum derivation principles:

### CONFLICT

Any unresolved owning-authority conflict or required semantic claim with `CONFLICT` that blocks a coherent impact boundary.

### UNKNOWN

No useful grounded connected impact boundary can be established, or current authority itself is unresolved.

### PARTIAL

At least one useful source-grounded semantic boundary is established, but one or more required material categories remain unresolved/invalid.

### SUPPORTED

All generic required report categories needed for the requested broad impact conclusion are represented consistently, required source-grounded flow exists, no blocking conflict remains, and derived blockers are empty.

`SUPPORTED` in this evaluator means the **impact report is mechanically complete under the candidate contract**. It does not itself prove semantic correctness or promote the candidate scope.

## 9. What remains qualitative

A deterministic evaluator cannot safely prove, from arbitrary source prose alone, that:

- the proposed `from -> to` edge is semantically correct;
- the chosen owner label is the true narrowest owner;
- all domain-specific material boundaries were recognized;
- a cited test actually protects the claimed behavior beyond mechanically available contract metadata;
- a negative statement proves a full absence outside the bounded evidence scope.

Therefore independent generalization still requires prospectively frozen qualitative assertions evaluated after the mechanical pair is valid.

Mechanical PASS is necessary, not sufficient.

## 10. Why not reuse the Usage Dashboard E/F registry model directly

The Usage Dashboard response contract contains case-specific evaluator authority such as evidence IDs and required flow-edge IDs.

That is valid for a known validated case, but copying the same pattern into a new held-out by pre-encoding the expected Termux/Voyage flow would contaminate the generalization test.

The candidate contract must therefore constrain **grounding form and completion semantics**, not hidden domain answers.

A future independent held-out may still carry hidden qualitative assertions frozen before output, but those assertions remain scoring authority and are not injected into model-visible contract fields.

## 11. Candidate fixture lifecycle

Retired cases:

```text
SimCore 3M-3 held-out
Termux background-autosave held-out
Voyage visible-refresh held-out
```

may be used only for:

- diagnosis;
- regression tests of generic harness behavior when answer text is not used as an expected template;
- proving that retired-case metadata remains retired.

They must not be counted again as fresh independent generalization evidence after implementation.

## 12. Implementation decomposition

A future implementation, if authorized, should stay in common Agent Skill eval tooling and split into small transactions.

### CGR-1 — candidate contract schema + parser only

- add generic candidate response schema;
- no new held-out;
- no SKILL semantic rewrite;
- no validated-scope expansion.

### CGR-2 — source-block/anchor grounding validator

- verify bounded source references against the supplied context bundle;
- fail closed on unknown block IDs, absent anchors, oversized references, malformed statuses;
- never interpret text occurrence as semantic proof.

### CGR-3 — derived blockers + derived verdict

- derive generic unresolved classes;
- prevent model-owned success from overriding unresolved fields;
- keep raw/model verdict non-authoritative or remove it from candidate schema.

### CGR-4 — retired-case diagnostic regression only

- run deterministic fixtures against synthetic/recorded structures;
- do not count retired Termux/Voyage output as new independent proof.

### CGR-5 — validated Usage Dashboard regression

- execute the existing proven zero-credit case unchanged;
- must remain PASS.

### CGR-6 — new unseen prospective held-out

Only after CGR-1..5 are green:

- choose a new independent candidate scope/case;
- freeze task, assertions, source snapshot and bounded context before any model output;
- execute once;
- require both mechanical validity and qualitative assertion review;
- do not tune and reuse the same case as independent proof after reading its answer.

## 13. Acceptance gates

Before claiming the generic repair works:

1. `PILOT_VALIDATED_SCOPES` is still exactly `plugin:usage-dashboard`;
2. normal non-pilot invocation still returns `UNVALIDATED_SCOPE`;
3. candidate evaluation scope bypass remains evaluation-only;
4. candidate output schema contains no case-specific expected owner/path/edge answer;
5. every non-UNKNOWN affirmative claim requires a valid supplied source reference;
6. omitted/UNKNOWN required categories become evaluator-owned blockers;
7. candidate authoritative verdict is evaluator-derived;
8. invalid source anchors cannot count as grounding;
9. evidence order/file order cannot become semantic proof;
10. Usage Dashboard validated regression remains green;
11. retired SimCore/Termux/Voyage cases are not reused as fresh promotion proof;
12. a new prospectively frozen independent held-out is required for any new generalization claim.

## 14. Non-goals

This design does not add:

- an autonomous semantic fact checker;
- repository-wide source graph inference;
- embeddings/search ranking;
- a generic dependency database;
- hidden per-project answer templates;
- new product/plugin runtime code;
- new release/deployment behavior;
- SimCore runtime implementation;
- Termux autosave implementation;
- Voyage refresh implementation.

## 15. Promotion boundary

Even if a future new held-out passes, one independent PASS does not automatically mean every plugin scope is validated.

A later promotion decision must separately define what evidence threshold changes:

```text
PILOT_VALIDATED_SCOPES
```

or whether the skill graduates from a single-scope pilot to a generic registered-plugin workflow.

That policy is outside this design.

## 16. Current conclusion

```text
USAGE DASHBOARD PILOT
= VALIDATED / REGRESSION GREEN

SIMCORE HELD-OUT
= RETIRED DIAGNOSTIC/TRAINING EVIDENCE

TERMUX INDEPENDENT HELD-OUT
= QUALITATIVE FAIL / RETIRED

VOYAGE INDEPENDENT HELD-OUT
= QUALITATIVE FAIL / RETIRED

CANDIDATE SCOPE/FROZEN CONTEXT PLUMBING
= WORKING

REMAINING GENERIC GAP
= FREEFORM GROUNDING + BLOCKER/VERDICT ENFORCEMENT

SELECTED NEXT DESIGN
= CANDIDATE_GROUNDED_REPORT_VALIDATION_GATE

IMPLEMENTATION
= NOT STARTED

VALIDATED-SCOPE EXPANSION
= NONE
```
