# SYS-07 — Cross-Reference Integrity Auditor — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · BOUNDED STRUCTURED CROSS-REFERENCE INTEGRITY AUDITOR · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-07
Idea          = Cross-Reference Integrity Auditor
Size          = MEDIUM
Importance    = 4 / HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_EXECUTABLE
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct upstream design authorities:
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- `docs/SIMCORE_SYS05_HISTORICAL_VS_LIVING_DOCUMENT_REGISTRY_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS06_EVIDENCE_TO_DECISION_TRACE_MAP_DESIGN.md`
- `docs/SIMCORE_SYS18_EVIDENCE_PROVENANCE_CHAIN_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS14_EVIDENCE_FRESHNESS_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS04_STATUS_VOCABULARY_LINTER_DESIGN.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`

Related systems SYS-07 must compose with rather than replace:
- S-10 Authority Drift Check / `sync-state.mjs` for current production-identity contradiction;
- M-13 Evidence Index Generator for generated evidence navigation;
- SYS-03 Gate Dependency Graph for gate dependencies;
- SYS-10 Stale Next-Action Scanner for stale NEXT pointers;
- SYS-13 Verification Proof Matrix for proof fitness;
- SYS-17 Missing Evidence Slot Analyzer for evidence-slot completeness;
- SYS-21 Forensic Classification Consistency Check for classification-vs-evidence consistency;
- SYS-35 Repository Transaction Ledger for curated repository transaction lineage;
- future SYS-36 Branch/PR Relationship Auditor for branch/PR relationship truth.

---

## 1. Problem

SimCore now has increasingly explicit durable references among:

```text
living authorities
historical evidence
frozen designs
current-state projections
decision/supersession edges
evidence→decision traces
provenance receipts
freshness reviews
verification debt rows
fixture/test authorities
repository transaction evidence
```

A reference can be mechanically present while still being semantically wrong for the field that uses it.

Examples:

```text
path exists
→ but points to a historical plan from a CURRENT_AUTHORITY field

heading resolves
→ but that bounded decision scope is explicitly superseded

evidence document exists
→ but the field claims current positive support and SYS-14 says REVALIDATION_REQUIRED

receipt exists
→ but it is a point-in-time provenance receipt being cited as current-state authority

reference text names a valid document
→ but the expected stable section / ID cannot be resolved uniquely
```

Conversely, not every old or historical reference is bad.

```text
historical decision receipt
→ may correctly reference historical evidence forever

superseded predecessor decision
→ may remain a correct historical lineage target

old release publication receipt
→ may remain correct for the immutable claim that release X used commit/blob Y
```

Therefore the problem is not simply:

> Does this Markdown link open?

The useful question is:

> Does this registered reference resolve to the right kind of target for the exact semantic role of the source field, without violating reviewed lifecycle, supersession, provenance, or freshness boundaries?

SYS-07 defines a bounded read-only **Cross-Reference Integrity Auditor** for that question.

---

## 2. Core invariant

```text
registered reference-bearing source field
+ explicit reference class
+ exact target identity
+ reviewed target-role constraints
+ reviewed lifecycle / supersession / provenance / freshness metadata when required
→ deterministic reference-integrity finding

SYS-07
!= repo-wide prose link crawler
!= authority inference engine
!= semantic search engine
!= current-state authority
!= supersession inference engine
!= freshness judge
!= proof engine
!= gate engine
!= decision engine
!= branch/PR truth engine
!= repository writer
!= auto-link fixer
```

Canonical question:

> For this exact registered reference field, is the cited target structurally resolvable and semantically eligible according to already-reviewed source metadata?

SYS-07 never creates the semantic metadata it consumes.

---

## 3. Why reference existence alone is insufficient

The following implications are invalid:

```text
file exists
→ reference is valid for current authority

heading exists
→ referenced decision is still current

historical evidence exists
→ it may support the current claim

provenance receipt exists
→ it is current-state authority

newest file exists
→ old target must be replaced
```

SYS-07 therefore separates four different integrity layers:

```text
L1 RESOLUTION
Can the target be found exactly?

L2 TARGET ROLE
Is that target lifecycle/authority role allowed for this source field?

L3 CURRENT-EFFECT ELIGIBILITY
If the source field expects current effect, is the target superseded or otherwise non-current for that bounded scope?

L4 EVIDENCE-USE ELIGIBILITY
If the source field claims current evidence reuse or provenance, are the required reviewed freshness/provenance relations present?
```

A reference may pass one layer and fail another.

---

## 4. Bounded scope: registered structured references only

SYS-07 must not scan arbitrary prose and attempt to infer what every path-like token means.

Frozen v1 scope:

```text
explicitly registered tables / fields / manifests / managed blocks
whose reference semantics materially affect current-state, authority, evidence, decision, or governance interpretation
```

Examples of eligible source surfaces:

```text
Living Authority Map primary/supporting authority fields
Historical-vs-Living Document Registry navigation/supersession fields
Decision / Supersession Graph predecessor/successor/source refs
Current-State Snapshot source refs
Evidence-to-Decision Trace Map evidence/decision refs
Evidence Provenance Chain Receipt node/trace/decision refs
Evidence Freshness Ledger evidence/claim/receipt/policy refs
Verification Debt Index proof/gate/policy refs
Canonical Task Card authority/gate/source refs
selected close/handoff structured reference fields
```

Out of scope by default:

```text
arbitrary prose citations
ordinary explanatory Markdown links
external web links
all repository Markdown files
runtime source imports
plugin module dependency graph
branch/PR relationship truth
CI/run existence over the network
```

A source surface enters SYS-07 only through an explicit reviewed rule.

---

## 5. Relationship to upstream semantic authorities

### 5.1 SYS-01 Living Authority Map

SYS-01 answers:

```text
state family / question
→ where to ask
```

SYS-07 may verify that a registered `CURRENT_AUTHORITY_REF` resolves to an allowed living authority target.

It may not decide which authority should own the family.

```text
SYS-01 entry wrong semantically
→ authority-map review

SYS-01 entry points to missing / ineligible target
→ SYS-07 finding
```

### 5.2 SYS-05 Historical-vs-Living Document Registry

SYS-05 provides reviewed lifecycle metadata.

Frozen lifecycle roles currently include:

```text
LIVING_CURRENT
LIVING_POLICY
FROZEN_DESIGN_CONTRACT
POINT_IN_TIME_EVIDENCE
HISTORICAL_PLAN
GENERATED_NAVIGATION
TEMPLATE_CONTRACT
```

SYS-07 consumes those roles for target-role checks.

It must never infer lifecycle from filename, age, status words, or commit date.

Mixed documents must honor SYS-05 section-role exceptions.

### 5.3 SYS-02 Decision / Supersession Graph

SYS-02 owns reviewed bounded supersession.

For fields that expect current instruction/effect:

```text
target resolves
+ target decision scope has active reviewed supersession
→ current-target integrity finding
```

For historical lineage fields:

```text
target resolves to superseded predecessor
→ may still be fully valid
```

SYS-07 must therefore apply supersession rules by reference class, not globally.

### 5.4 SYS-06 Evidence-to-Decision Trace Map

SYS-06 owns actual evidence→decision causality.

SYS-07 may verify that a field requiring a reviewed evidence basis points to an existing registered SYS-06 trace identity.

It may not invent a trace because an evidence document and decision document happen to reference each other.

### 5.5 SYS-18 Evidence Provenance Chain Receipt

SYS-18 is immutable point-in-time provenance.

SYS-07 may verify receipt-local reference resolvability and expected node/trace/decision classes.

It must not reinterpret a complete historical receipt as current evidence freshness or current decision truth.

### 5.6 SYS-14 Evidence Freshness Ledger

SYS-14 owns reviewed claim-scoped current reuse semantics.

For a source field explicitly classified as `CURRENT_EVIDENCE_REUSE_REF`, SYS-07 may require a matching freshness row and consume the recorded state.

It must not calculate freshness from age, diff size, version arithmetic, or repository churn.

### 5.7 SYS-04 Status Vocabulary Linter

SYS-04 validates status token namespaces/cardinality in registered structured fields.

SYS-07 validates reference identity/eligibility.

```text
valid status token
!= valid reference

valid reference
!= semantically true status
```

The two tools may share registered-field concepts later, but neither replaces the other.

---

## 6. Why v1 is `NR_EXECUTABLE`

The core value of SYS-07 requires deterministic mechanical checks that documentation alone cannot reliably provide:

```text
path exists
stable heading/marker exists
registered ID resolves exactly once
reference class has an eligible lifecycle role
current-effect ref does not point to a reviewed superseded scope
current-evidence-reuse ref has required reviewed freshness metadata
provenance-required ref has required reviewed provenance/trace metadata
```

Those are repeatable read-only operations over explicit inputs.

Therefore the useful future implementation form is local executable tooling, conceptually:

```text
products/simcore/tooling/cross-reference-rules-v1.json
products/simcore/tooling/cross-reference-integrity.mjs
products/simcore/tooling/cross-reference-integrity.test.mjs
```

Apply Class:

```text
NR_EXECUTABLE
```

It is not `NR_PROTECTED` in v1 because it does not alter or police build/release/CI/branch/fixture/architecture-governance authority. It audits registered repository-memory references only.

If later work makes SYS-07 a required CI/release gate or gives it mutation authority, that is a separate protected integration transaction and requires reclassification/review of that new boundary.

---

## 7. Application/implementation prerequisite

SYS-07 design can freeze before its upstream document-only designs are applied.

Actual executable implementation must not invent substitute metadata.

Before useful semantic execution, the later application phase must provide materialized reviewed inputs equivalent to:

```text
SYS-01 Living Authority Map
SYS-05 Document Lifecycle Registry
SYS-02 Decision / Supersession Graph
SYS-06 Evidence-to-Decision Trace Map when provenance rules use it
SYS-18 receipts when receipt rules use them
SYS-14 Evidence Freshness Ledger when current evidence reuse rules use it
```

The implementation may begin with a smaller registered rule set if only a subset has been materialized, but it must report unsupported semantic checks as unclaimed/unresolved rather than silently treating them as PASS.

Design sweep rule remains:

```text
SYS-07 design freeze now
!= apply upstream docs now
!= implement SYS-07 now
```

---

## 8. Frozen v1 reference classes

Exactly seven semantic reference classes:

```text
XR-01 NAVIGATION_REF
XR-02 CURRENT_AUTHORITY_REF
XR-03 HISTORICAL_EVIDENCE_REF
XR-04 CURRENT_EVIDENCE_REUSE_REF
XR-05 FROZEN_CONTRACT_REF
XR-06 DECISION_LINEAGE_REF
XR-07 PROVENANCE_REF
```

### XR-01 `NAVIGATION_REF`

Purpose:

```text
help a human/tool locate another registered artifact
```

Required semantics:
- exact target resolution when target is repository-local;
- no current-authority or proof implication;
- historical targets are allowed unless the source rule says otherwise.

A valid navigation reference does not establish authority, freshness, proof, or current effect.

### XR-02 `CURRENT_AUTHORITY_REF`

Purpose:

```text
point from a structured current-state field to the authority that currently owns the answer
```

Required semantics:
- target resolves exactly;
- SYS-05 target role is eligible for the rule, normally `LIVING_CURRENT` or `LIVING_POLICY`;
- if bounded decision scope is relevant, the target must not be rendered non-current by an applicable SYS-02 supersession edge;
- target is not merely generated navigation or point-in-time evidence unless the source rule explicitly permits a supporting physical authority role.

`CURRENT_AUTHORITY_REF` does not mean the referenced content itself is correct; only that the reference points to an eligible current authority target.

### XR-03 `HISTORICAL_EVIDENCE_REF`

Purpose:

```text
point to evidence that is intentionally historical / point-in-time
```

Required semantics:
- exact target resolution;
- target role may be `POINT_IN_TIME_EVIDENCE` or another explicitly allowed historical evidence family;
- supersession of a decision mentioned by that evidence does not invalidate the historical reference;
- current freshness is not required unless the source field separately claims current reuse.

### XR-04 `CURRENT_EVIDENCE_REUSE_REF`

Purpose:

```text
use exact historical/current evidence as positive support for an exact current claim
```

Required semantics:
- exact evidence identity resolves;
- proof kind remains compatible under SYS-13 when a formal proof claim is involved;
- a matching reviewed SYS-14 freshness review exists for the same current claim/context;
- the freshness state permits current reuse.

Frozen reuse rule:

```text
FRESH_FOR_SCOPE
→ reusable from the SYS-07 reference-integrity perspective

FRESHNESS_REVIEW_REQUIRED
REVALIDATION_REQUIRED
STALE_FOR_SCOPE
FRESHNESS_UNRESOLVED
→ must not be reported as current reusable positive support
```

This does not decide blocker posture.

### XR-05 `FROZEN_CONTRACT_REF`

Purpose:

```text
point to a frozen design/policy/template contract used as a normative implementation/review boundary
```

Required semantics:
- exact target/section resolution;
- target lifecycle role is compatible with the registered rule, commonly `FROZEN_DESIGN_CONTRACT`, `LIVING_POLICY`, or `TEMPLATE_CONTRACT` depending on field semantics;
- a historical plan must not silently substitute for a frozen contract.

### XR-06 `DECISION_LINEAGE_REF`

Purpose:

```text
point to predecessor/successor/retirement decision identities or reviewed SYS-02 lineage
```

Required semantics:
- exact bounded decision identity or SYS-02 edge resolves;
- reference direction/role matches the source field;
- no transitive edge is invented merely because a path through multiple edges exists.

Historical/superseded targets are expected and valid in this class.

### XR-07 `PROVENANCE_REF`

Purpose:

```text
point to reviewed source/derivative/proof/trace/receipt lineage
```

Required semantics:
- required SYS-06 trace / SYS-18 receipt / source evidence identity resolves according to the field rule;
- provenance role matches the source field;
- Evidence Index navigation alone cannot satisfy a source/provenance requirement unless the rule explicitly requests navigation only.

---

## 9. Target identity forms

Frozen v1 repository-local target forms:

```text
T-01 PATH
T-02 PATH_AND_STABLE_HEADING_OR_MARKER
T-03 REGISTERED_STABLE_ID
T-04 REGISTERED_EDGE_OR_ROW_ID
```

### T-01 `PATH`

Exact repository path.

Use only when whole-artifact identity is sufficient.

### T-02 `PATH_AND_STABLE_HEADING_OR_MARKER`

Preferred for bounded sections/decisions inside mixed documents.

The auditor resolves against an explicit stable heading/marker policy; it must not use fuzzy nearest-heading matching.

### T-03 `REGISTERED_STABLE_ID`

Stable ID inside a registered structured artifact, for example:

```text
Family ID
Gate ID
Decision ID
Evidence ID
Freshness Review ID
Receipt ID
```

The ID must resolve exactly once within the configured namespace.

### T-04 `REGISTERED_EDGE_OR_ROW_ID`

Used for reviewed relation rows such as SYS-02/SYS-06/SYS-14/SYS-18 materializations when stable row identities exist.

---

## 10. External identities are not silently verified

Repository documents may reference natural external identities such as:

```text
Git commit SHA
PR number
workflow run/job ID
release commit/blob
branch name
```

SYS-07 v1 is local/no-network.

Therefore:

```text
external identity text present
!= external identity verified by SYS-07
```

Frozen rule:
- SYS-07 may validate syntax/shape only when a registered field rule explicitly defines it;
- external existence/relationship truth remains with Git/GitHub/release natural authority;
- branch/PR relationship semantics belong to future SYS-36;
- release publication truth remains with existing release authority;
- the report must label external resolution as `NOT_CLAIMED` unless a separately supplied immutable local source proves it.

No network access is part of v1.

---

## 11. Cross-reference rule schema

Every registered v1 rule contains:

```text
Rule ID
Source artifact / bounded family
Source selector
Source field name
Reference class
Target identity form
Allowed target lifecycle roles[]
Current-effect check required: YES / NO
Freshness check required: YES / NO
Provenance check required: YES / NO
Allowed target namespace / family
Cardinality
External identity policy
Required upstream metadata[]
Notes / non-claims
```

### Source selector

Must be deterministic.

Allowed v1 selector forms:

```text
stable managed block marker
stable table name + column
stable key inside a reviewed structured manifest
exact path + stable heading + field label
```

Forbidden:

```text
"look around this paragraph"
semantic nearest match
LLM extraction from arbitrary prose
regex over every Markdown link in repository
```

### Cardinality

Allowed values:

```text
ZERO_OR_ONE
EXACTLY_ONE
ONE_OR_MORE
ZERO_OR_MORE
```

Cardinality is reference presence/structure only.
It does not decide whether the underlying semantic claim is true.

---

## 12. Frozen v1 finding vocabulary

Exactly eleven primary finding kinds:

```text
XF-01 TARGET_MISSING
XF-02 TARGET_ANCHOR_MISSING
XF-03 TARGET_ID_UNRESOLVED
XF-04 TARGET_ID_AMBIGUOUS
XF-05 REFERENCE_CLASS_MISMATCH
XF-06 TARGET_ROLE_MISMATCH
XF-07 CURRENT_TARGET_SUPERSEDED
XF-08 CURRENT_REUSE_FRESHNESS_MISSING
XF-09 CURRENT_REUSE_NOT_FRESH
XF-10 REQUIRED_PROVENANCE_MISSING
XF-11 REQUIRED_SEMANTIC_INPUT_UNRESOLVED
```

### XF-01 `TARGET_MISSING`

Repository-local path does not exist at the audited revision.

### XF-02 `TARGET_ANCHOR_MISSING`

Path exists but exact stable heading/marker does not.

No fuzzy fallback.

### XF-03 `TARGET_ID_UNRESOLVED`

Registered stable ID cannot be resolved in its configured namespace.

### XF-04 `TARGET_ID_AMBIGUOUS`

Stable ID resolves to more than one target where uniqueness is required.

### XF-05 `REFERENCE_CLASS_MISMATCH`

Source field is registered for one semantic reference class but encoded/declared as another incompatible class.

### XF-06 `TARGET_ROLE_MISMATCH`

Target resolves but SYS-05 lifecycle/role is not allowed by the rule.

Example:

```text
CURRENT_AUTHORITY_REF
→ HISTORICAL_PLAN
```

### XF-07 `CURRENT_TARGET_SUPERSEDED`

A current-effect reference points at a bounded decision scope whose current effect is replaced/retired by an applicable reviewed SYS-02 relation.

Do not emit this for historical lineage/evidence references merely because the target is superseded.

### XF-08 `CURRENT_REUSE_FRESHNESS_MISSING`

A `CURRENT_EVIDENCE_REUSE_REF` requires SYS-14 review but no exact matching freshness review can be resolved.

This means current reuse is unproven, not that the historical evidence is false.

### XF-09 `CURRENT_REUSE_NOT_FRESH`

Exact SYS-14 review exists but current state is not `FRESH_FOR_SCOPE`.

The finding preserves the actual SYS-14 state and does not convert it into a gate blocker.

### XF-10 `REQUIRED_PROVENANCE_MISSING`

A rule requires reviewed SYS-06/SYS-18 provenance but the exact required trace/receipt relation cannot be resolved.

No causal relationship may be synthesized from citation proximity.

### XF-11 `REQUIRED_SEMANTIC_INPUT_UNRESOLVED`

A required upstream registry/graph/ledger input needed for this rule is unavailable or ambiguous.

Fail closed for that semantic check.
Do not downgrade it into mechanical PASS.

---

## 13. Audit result states

Exactly four top-level states:

```text
XREF_AUDIT_CLEAN
XREF_AUDIT_FINDINGS
XREF_AUDIT_PARTIAL
XREF_AUDIT_BLOCKED
```

### `XREF_AUDIT_CLEAN`

All registered reference rules that were required for the selected audit scope executed and produced no integrity findings.

It means only:

```text
registered references are structurally/semantically coherent under the supplied reviewed metadata
```

It does not mean:

```text
all docs correct
all evidence fresh globally
current state PASS
runtime PASS
release ready
no arbitrary prose broken links
```

### `XREF_AUDIT_FINDINGS`

All required audit inputs were available and one or more integrity findings were produced.

### `XREF_AUDIT_PARTIAL`

The selected audit intentionally covered only a declared subset of rule families.

A partial audit must print the omitted families.

### `XREF_AUDIT_BLOCKED`

A required ruleset, source surface, or semantic input cannot be loaded/resolved sufficiently to make the configured audit claim.

Fail closed rather than skipping silently.

---

## 14. Mechanical resolution vs semantic eligibility

Every audited reference should report two distinct dimensions:

```text
Resolution
= RESOLVED / MISSING / AMBIGUOUS / NOT_CHECKED_EXTERNAL

Eligibility
= ELIGIBLE / INELIGIBLE / UNRESOLVED / NOT_APPLICABLE
```

Examples:

```text
path resolves
+ historical target in CURRENT_AUTHORITY_REF
→ Resolution RESOLVED
→ Eligibility INELIGIBLE
```

```text
historical evidence path resolves
+ HISTORICAL_EVIDENCE_REF
→ Resolution RESOLVED
→ Eligibility ELIGIBLE
```

```text
current evidence path resolves
+ freshness metadata missing
→ Resolution RESOLVED
→ Eligibility UNRESOLVED
```

This separation prevents `link exists` from being mistaken for semantic integrity.

---

## 15. Current-authority reference rule

For `CURRENT_AUTHORITY_REF`, v1 evaluates:

```text
1. exact target resolves
2. target lifecycle role is allowed
3. bounded current-effect scope is not superseded/retired when SYS-02 applies
4. target is not generated navigation substituted for source authority
5. source field cardinality is satisfied
```

It does not compare the current value stored inside the target to other authorities.

That remains S-10/current-state consistency work.

---

## 16. Current evidence reuse rule

For `CURRENT_EVIDENCE_REUSE_REF`, v1 evaluates:

```text
1. exact evidence identity resolves
2. expected evidence/proof namespace matches
3. required SYS-13 proof reference resolves when rule requires formal proof context
4. exact SYS-14 freshness review resolves for the same current claim/context
5. freshness state = FRESH_FOR_SCOPE
6. required provenance relation resolves when the field claims decision basis
```

Important:

```text
freshness state = REVALIDATION_REQUIRED
→ SYS-07 reports NOT_FRESH for current reuse
→ SYS-07 does NOT decide BLOCKER
```

SYS-28/current gate authority handles that downstream posture.

---

## 17. Historical reference rule

Historical references are not second-class references.

For `HISTORICAL_EVIDENCE_REF` and historical `DECISION_LINEAGE_REF`:

```text
exact old target exists
+ bounded identity is correct
+ source field explicitly expects history
→ integrity can be CLEAN
```

Even when:

```text
target contains old production version
old NEXT action
superseded decision
old gate classification
```

provided those values are historically correct for the target's point in time.

SYS-07 must never rewrite history to make a current-reference audit cleaner.

---

## 18. Generated/navigation references

`GENERATED_NAVIGATION` may be a valid target for `NAVIGATION_REF`.

It is normally invalid as a substitute target for:

```text
CURRENT_AUTHORITY_REF
CURRENT_EVIDENCE_REUSE_REF
PROVENANCE_REF requiring source evidence
```

unless the exact source field rule explicitly says the generated artifact is only an intermediate locator and also preserves the natural source reference.

Example:

```text
Evidence Index row
→ valid navigation

Evidence Index row alone
→ not source evidence
→ not automatic decision basis
```

---

## 19. Supersession handling

SYS-07 consumes only explicit reviewed SYS-02 edges.

Frozen rules:

```text
newer file
!= supersession

higher version
!= supersession

current-looking status word
!= supersession

transitive reachability
!= new semantic edge
```

For current-effect references, the auditor follows only the reviewed affected scope of applicable edges.

If supersession scope cannot be resolved exactly:

```text
XF-11 REQUIRED_SEMANTIC_INPUT_UNRESOLVED
```

not guessed stale/current classification.

---

## 20. Freshness handling

SYS-07 does not own freshness semantics.

It consumes SYS-14 rows only when the source rule requires current evidence reuse.

Frozen rules:

```text
old evidence
!= stale

new evidence
!= fresh

version changed
!= stale

same file path
!= fresh
```

A current reuse reference is eligible only if the exact matching reviewed freshness disposition permits reuse.

Historical evidence references do not require freshness merely to remain historical references.

---

## 21. Provenance handling

A `PROVENANCE_REF` can require one of:

```text
exact source evidence identity
exact SYS-06 trace identity
exact SYS-18 receipt identity
exact receipt node/edge identity
```

according to the registered rule.

The auditor checks that the required object resolves and matches the declared namespace/role.

It does not reconstruct missing chains from:

```text
nearby citations
same date
same commit
same document family
same version
```

Missing provenance remains missing/unresolved.

---

## 22. Fail-closed rules

SYS-07 must fail closed for semantic integrity claims when required reviewed metadata is unavailable.

Examples:

```text
CURRENT_AUTHORITY_REF requires lifecycle metadata
+ SYS-05 target classification unavailable
→ XF-11
→ not CLEAN
```

```text
CURRENT_EVIDENCE_REUSE_REF requires freshness
+ SYS-14 ledger not materialized / matching row unresolved
→ XF-08 or XF-11 according to whether input exists but row is absent
→ not CLEAN
```

```text
PROVENANCE_REF requires SYS-06 trace
+ trace map unavailable
→ XF-11
```

A tool may still report mechanical path resolution separately, but cannot promote the whole rule to semantic PASS.

---

## 23. v1 CLI / output contract

Conceptual future commands:

```text
node products/simcore/tooling/cross-reference-integrity.mjs
node products/simcore/tooling/cross-reference-integrity.mjs --check
node products/simcore/tooling/cross-reference-integrity.mjs --scope living-authority
node products/simcore/tooling/cross-reference-integrity.mjs --scope evidence
```

Default human report:

```text
SimCore Cross-Reference Integrity
Result: XREF_AUDIT_...
Rules evaluated: N
References evaluated: N
Findings: N
Blocked semantic rules: N
External resolution: NOT_CLAIMED where applicable

[XF-..] source path#field
  class: XR-..
  target: ...
  resolution: ...
  eligibility: ...
  basis: exact upstream refs
```

`--check` exit contract:

```text
0 = CLEAN for the selected full/declared scope
1 = FINDINGS or BLOCKED
2 = invalid tool/ruleset invocation
```

`PARTIAL` exits 0 only when partial scope was explicitly requested; the output must clearly state that full-repository/reference integrity is not claimed.

---

## 24. Determinism requirements

The future executable must be deterministic over identical inputs.

Frozen requirements:

```text
same repository revision
+ same ruleset
+ same materialized semantic metadata
→ same ordered findings
```

Stable ordering:

```text
source path
→ source selector / field
→ rule ID
→ target identity
→ finding kind
```

No timestamps in comparison-critical output unless explicitly requested as report metadata.

No random IDs.

No LLM/network dependency.

---

## 25. Safety / mutation boundary

SYS-07 v1 is strictly read-only.

Forbidden:

```text
auto-fix link paths
auto-rewrite headings
auto-replace superseded refs
auto-change freshness state
auto-create SYS-02 edges
auto-create SYS-06 traces
auto-create SYS-14 rows
auto-edit Evidence Index
auto-edit living docs
auto-open/close gates
auto-commit
network fetch
GitHub mutation
release mutation
runtime/plugin mutation
```

Findings must preserve exact evidence for later bounded human correction.

---

## 26. CI boundary

A future focused local test is part of SYS-07 implementation.

Permanent CI integration is not.

Frozen distinction:

```text
implement SYS-07 local read-only auditor + focused deterministic tests
= later NR_EXECUTABLE implementation transaction

make SYS-07 a required permanent CI gate / release precondition
= separate repository/CI governance decision
```

Do not widen path classifiers, permanent workflow authority, harness authority, or release policy merely to claim SYS-07 coverage.

If a future PR-level generic CI passes without directly executing the focused SYS-07 test, direct execution remains `NOT_CLAIMED` under existing verification policy.

---

## 27. Focused deterministic verification plan

Future implementation tests should cover at least:

```text
1. valid NAVIGATION_REF to historical evidence → CLEAN
2. missing local path → XF-01
3. missing stable heading → XF-02
4. duplicate stable ID → XF-04
5. CURRENT_AUTHORITY_REF → HISTORICAL_PLAN → XF-06
6. CURRENT_AUTHORITY_REF → reviewed superseded scope → XF-07
7. HISTORICAL_EVIDENCE_REF → superseded historical decision evidence → CLEAN
8. CURRENT_EVIDENCE_REUSE_REF + no freshness row → XF-08
9. CURRENT_EVIDENCE_REUSE_REF + REVALIDATION_REQUIRED → XF-09
10. CURRENT_EVIDENCE_REUSE_REF + FRESH_FOR_SCOPE → eligible
11. PROVENANCE_REF + missing SYS-06 trace → XF-10
12. required semantic registry unavailable → XF-11 / BLOCKED
13. external PR/commit identity → format may parse, existence NOT_CLAIMED
14. arbitrary prose Markdown link outside ruleset → ignored
15. partial requested scope → PARTIAL with explicit omitted families
```

Tests must use self-contained fixture repositories/metadata where possible rather than depending on mutable live main contents.

---

## 28. False-positive controls

The following must not produce findings by themselves:

```text
historical evidence contains old version
historical decision was superseded
old evidence is chronologically old
newer release exists
path target is GENERATED_NAVIGATION when source class is NAVIGATION_REF
external identity cannot be network-verified by local v1 tool
arbitrary prose contains an old document path
```

The finding must arise only from violation of an explicit registered source-field rule.

---

## 29. False-negative controls

The following must not be accepted merely because the path exists:

```text
CURRENT_AUTHORITY_REF → historical plan
CURRENT_AUTHORITY_REF → superseded bounded current instruction
CURRENT_EVIDENCE_REUSE_REF → historical evidence with no freshness review
CURRENT_EVIDENCE_REUSE_REF → SYS-14 REVALIDATION_REQUIRED
PROVENANCE_REF → navigation index without required source/trace
FROZEN_CONTRACT_REF → historical plan with no frozen-contract role
```

Mechanical resolution cannot mask semantic ineligibility.

---

## 30. Relationship to future SYS-36 Branch/PR Relationship Auditor

SYS-07 may encounter references containing PR/branch/commit identities.

It does not own questions such as:

```text
Was PR X really merged from branch Y?
Does branch Y actually contain commit Z?
Was PR X based on the expected branch?
Is the PR/branch relationship stale or impossible?
```

Those belong to future SYS-36.

SYS-07 only verifies registered repository-document reference structure around such identities and labels external relationship verification as not claimed.

This boundary is expected to let SYS-36 later consume reference locations without making SYS-07 a GitHub API tool.

---

## 31. Relationship to future SYS-49 Safe Parallel Work Finder

SYS-49 may later use authority/gate/work metadata to suggest safe parallel work.

SYS-07 can help ensure that the references in that metadata resolve to the intended reviewed authorities.

However:

```text
XREF_AUDIT_CLEAN
!= work is safe to parallelize
```

SYS-49 must use its own gate/dependency/bundling logic.

---

## 32. Relationship to future SYS-25 Golden Fixture Mutation Receipt

SYS-25 may later produce immutable references to:

```text
fixture identity
registry row
source specimen
mutation reason
test intent / negative control
verification result
```

SYS-07 may later verify those structured refs if registered.

It does not decide whether a fixture mutation was justified or whether the golden fixture is semantically correct.

---

## 33. Relationship to future SYS-16 Anomaly Recurrence Correlator

SYS-16 may later link repeated anomaly specimens/evidence identities.

SYS-07 may verify that those specimen references resolve and use the expected evidence/ledger role.

It does not decide whether two anomalies are actually the same recurrence family.

---

## 34. Application artifact concept

Later implementation may materialize:

```text
products/simcore/tooling/cross-reference-rules-v1.json
products/simcore/tooling/cross-reference-integrity.mjs
products/simcore/tooling/cross-reference-integrity.test.mjs
```

Optional later documentation may provide a human-readable reference-rule summary, but that is not required as a second semantic authority if the executable rules file is clear and source-linked.

The rules file must reference the applied upstream registries/ledgers rather than copying their semantic facts into an independent hidden universe.

---

## 35. No runtime / release impact

This design changes no runtime behavior.

```text
plugins/simcore/latest.js = unchanged
plugins/simcore/install.js = unchanged
plugin version             = unchanged
release-simcore            = unchanged
product-manifest           = unchanged
runtime semantics          = unchanged
release workflow authority = unchanged
CI authority               = unchanged
```

No real long-chat validation is required solely for SYS-07 design/application/tooling.

---

## 36. Frozen implementation boundary

A later SYS-07 implementation transaction may include only the bounded read-only tooling/rules/test surfaces frozen here.

It must not be bundled with:

```text
runtime feature changes
M2-3 physical extraction
release publication
Release System redesign
permanent CI classifier expansion
branch/PR governance implementation
fixture-authority changes
architecture-contract changes
upstream SYS-01/05/02/06/14 semantic decisions invented ad hoc
```

If an upstream applied registry is missing, apply that frozen document design in its own bounded transaction rather than silently creating it inside SYS-07 implementation.

---

## 37. Design verdict

```text
SYS-07 Cross-Reference Integrity Auditor
= DESIGN FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_EXECUTABLE
= BOUNDED REGISTERED STRUCTURED REFERENCES ONLY
= LOCAL / READ-ONLY / NO NETWORK / NO WRITER
= CONSUMES REVIEWED LIFECYCLE / SUPERSESSION / PROVENANCE / FRESHNESS METADATA
= DOES NOT CREATE SEMANTIC AUTHORITY
= IMPLEMENTATION HOLD DURING DESIGN SWEEP
= NO RUNTIME CHANGE
= OPEN QUESTIONS 0
```

Design work stops here.

Actual materialization/implementation remains a separate bounded transaction after the current system design sweep closes or priority is explicitly changed.
