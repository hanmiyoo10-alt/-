# SYS-25 — Golden Fixture Mutation Receipt — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · POINT-IN-TIME GOLDEN-FIXTURE MUTATION ACCOUNTABILITY · NO FIXTURE MUTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-25
Idea          = Golden Fixture Mutation Receipt
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
- `products/simcore/tests/registry.mjs`
- `products/simcore/tests/suites/`
- `products/simcore/tests/fixtures/`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md`
- `docs/SIMCORE_SYS23_NEGATIVE_CONTROL_REGISTRY_DESIGN.md`
- `docs/SIMCORE_SYS24_FIXTURE_ORPHAN_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- current permanent-fixture design / implementation evidence documents

Existing authorities SYS-25 must not replace:
- `products/simcore/tests/registry.mjs` as permanent-suite membership / harness-policy authority;
- fixture JSON and suite source as exact executable test assets;
- owning semantic design/contract as expected-behavior authority;
- Git as exact before/after byte and commit authority;
- GitHub PR metadata as PR/merge authority;
- permanent harness / CI runs as execution evidence;
- SYS-22 as test-intent / explicit-non-claim authority;
- SYS-23 as negative-control semantic authority;
- SYS-24 as fixture membership/orphan integrity authority;
- SYS-35 as cross-work repository transaction lineage;
- SYS-21 as evidence/classification consistency review;
- SYS-13 as proof-kind × claim-kind authority;
- SYS-28 as verification-debt authority;
- future SYS-26 / SYS-29 as coverage-promotion / contract-to-fixture-gap authorities.

---

## 1. Problem

Permanent golden fixtures are deliberately strong regression authority.

The current permanent registry records operational facts such as:

```text
id
module
fixtureDir
coverage
required
goldenGate
```

Current registered suites are all `required: true` and `goldenGate: true`.

A green permanent gate is valuable only if fixture mutations are reviewable.

Otherwise a regression can be hidden by changing the expected fixture instead of fixing the implementation.

Dangerous patterns include:

```text
implementation starts returning a wrong value
→ expected fixture changed to the new wrong value
→ CI green again

negative-control case becomes inconvenient
→ case silently removed
→ false-positive boundary disappears

contract narrows
→ old fixture retained but intent/non-claim meaning silently changes

case identity renamed/restructured
→ historical evidence can no longer tell whether coverage was preserved

fixture expected values change
→ no durable record of whether the semantic authority changed first
```

Git can prove that bytes changed.

It does not by itself answer:

```text
Why was this golden fixture allowed to change?
Which semantic authority justified the new expectation?
Was the change coverage expansion, contraction, correction, or contract migration?
Which negative controls were added, removed, or altered?
Did the test's semantic intent change?
What verification actually ran after the mutation?
Was any live/release claim incorrectly inferred from deterministic PASS?
```

SYS-25 defines one bounded point-in-time **Golden Fixture Mutation Receipt** for intentional permanent golden-fixture changes.

The receipt preserves accountability without becoming a fixture writer or a second test authority.

---

## 2. Core invariant

```text
reviewed permanent golden-fixture mutation
+ exact before/after asset identities
+ owning semantic authority / mutation basis
+ bounded semantic effect
+ affected test-intent / negative-control facts
+ exact verification evidence
→ immutable point-in-time mutation receipt

MUTATION RECEIPT
!= fixture mutation authorization
!= fixture content authority
!= registry membership authority
!= test PASS
!= semantic contract by itself
!= LIVE_PASS
!= release authorization
!= repository transaction ledger
```

Canonical question:

> What golden fixture changed, why was that change semantically legitimate, which regression obligations changed with it, and what exact evidence verified the resulting fixture state?

SYS-25 does not answer:

> Should the contract itself change?

> Should the implementation be changed instead of the fixture?

> May a protected fixture/governance transaction begin?

Those decisions must already be owned by the bounded work/design/contract authorities.

---

## 3. Why v1 is `NR_DOC_ONLY`

The difficult part is not detecting that fixture bytes changed.

Git already does that exactly.

The difficult part is preserving reviewed semantic accountability:

```text
which authority justified the new expectation
whether coverage expanded or contracted
whether an expected-value change reflects contract migration or fixture correction
whether a removed case has an explicit replacement/debt disposition
whether a negative control was weakened
whether test intent changed
which proof was actually executed
```

Those are human-reviewed semantic facts.

A useful v1 therefore needs only a durable receipt contract/template and prospective receipt sections.

Preferred later application artifact:

```text
docs/SIMCORE_GOLDEN_FIXTURE_MUTATION_RECEIPT_TEMPLATE.md
```

Preferred receipt sink order:

```text
1. the bounded fixture implementation/mutation evidence document
   → include one `Golden Fixture Mutation Receipt` section

2. a bounded fixture-governance / migration evidence document
   → include one receipt section

3. a dedicated receipt document
   → only when the mutation has no natural durable evidence artifact
```

Do not create one tiny standalone file for every one-line fixture correction by default.

No executable diff scanner, fixture writer, GitHub Action, CI hook, database, automatic semantic judge, or repository writer is required for v1.

Therefore:

```text
Apply Class = NR_DOC_ONLY
```

Important:

```text
SYS-25 receipt application = document-only
actual fixture mutation     = separate fixture-authority work
```

The fact that SYS-25 itself is `NR_DOC_ONLY` does not downgrade the authority risk of the actual fixture mutation transaction.

---

## 4. Golden fixture scope

SYS-25 v1 applies prospectively to intentional mutations of permanent registered fixture assets under:

```text
products/simcore/tests/fixtures/<fixtureDir>/...
```

when the owning registry row is a permanent golden gate.

Current registry authority exposes `goldenGate` directly.

The receipt may also record a directly coupled suite assertion change when that assertion is necessary to interpret the fixture mutation.

However:

```text
fixture mutation receipt
!= generic test-source change receipt
```

A suite-only refactor with no fixture semantic change is outside SYS-25 unless it materially changes how the fixture expectation is interpreted.

### Explicitly outside SYS-25 v1

```text
arbitrary focused standalone tests
non-permanent test files outside registered fixture namespaces
runtime source changes by themselves
registry membership changes by themselves
harness/schema topology redesign by itself
CI workflow changes by themselves
natural live evidence edits
release record edits
```

A transaction may contain one of those only when separately authorized and properly bundled. SYS-25 records only the fixture-mutation slice.

---

## 5. Constitutional anti-greenwashing rule

The most important frozen rule is:

```text
implementation output changed
→ fixture expected output changed merely to restore green
```

is not a legitimate mutation basis by itself.

Every semantic fixture mutation must resolve one of these directions:

```text
A. AUTHORITATIVE CONTRACT CHANGE
   owning semantic authority changes first
   → fixture follows the new reviewed contract

B. FIXTURE DEFECT CORRECTION
   owning semantic authority remains unchanged
   → evidence establishes that the fixture expectation/input was wrong
   → fixture is corrected to match the already-existing authority

C. COVERAGE EXPANSION / REFINEMENT
   owning authority remains compatible
   → new/changed case captures an additional reviewed boundary

D. COVERAGE RETIREMENT / REPLACEMENT
   case is removed/contracted only with explicit reviewed reason
   → replacement, supersession, or accepted verification debt is named
```

Reject as sufficient basis:

```text
"implementation changed"
"test failed"
"new output looks reasonable"
"CI needs to pass"
"fixture was old"
"version bumped"
```

When the correct direction cannot be established:

```text
MUTATION_RECEIPT_BLOCKED
```

The receipt cannot make an otherwise unjustified fixture mutation legitimate after the fact.

---

## 6. Mutation classes

Exactly six v1 mutation classes:

```text
GM-01 CASE_ADDED
GM-02 CASE_REMOVED
GM-03 CASE_INPUT_CHANGED
GM-04 CASE_EXPECTATION_CHANGED
GM-05 CASE_IDENTITY_OR_STRUCTURE_CHANGED
GM-06 MULTI_CASE_COMPOSITE
```

### GM-01 `CASE_ADDED`

A new permanent fixture case is introduced.

Receipt must identify:
- new stable case identity;
- semantic authority / boundary protected;
- whether it adds a positive or negative regression obligation;
- exact verification evidence.

### GM-02 `CASE_REMOVED`

An existing permanent case is removed.

This is high scrutiny because removal can silently contract regression coverage.

Receipt must include one explicit disposition:

```text
SUPERSEDED_BY_CASE
CONTRACT_NO_LONGER_APPLIES
DUPLICATE_COVERAGE_REVIEWED
MOVED_TO_OTHER_PERMANENT_SUITE
ACCEPTED_VERIFICATION_DEBT
OTHER_REVIEWED_REASON
```

`cleanup` alone is not sufficient.

### GM-03 `CASE_INPUT_CHANGED`

The deterministic input/precondition changes while the case identity remains materially the same.

Receipt must state whether the protected semantic boundary is preserved.

If the new input targets a materially different contract, use a new case identity or explicitly record semantic supersession instead of pretending it is a clerical edit.

### GM-04 `CASE_EXPECTATION_CHANGED`

Expected deterministic result changes.

This is the highest-risk ordinary mutation class because it can hide regressions.

Mandatory basis:

```text
AUTHORITATIVE_CONTRACT_CHANGE
or
FIXTURE_DEFECT_CORRECTION
```

A mere implementation diff is insufficient.

### GM-05 `CASE_IDENTITY_OR_STRUCTURE_CHANGED`

Case ID, grouping, envelope structure, or fixture organization changes in a way that affects historical traceability.

Receipt must preserve old→new mapping.

If the change is purely formatting and semantic identity is provably unchanged, record:

```text
SEMANTIC_EFFECT = NONE_REVIEWED
```

### GM-06 `MULTI_CASE_COMPOSITE`

One bounded fixture mutation intentionally changes several cases for one shared semantic reason.

Use only when the cases truly share one reviewed mutation basis.

Do not use `MULTI_CASE_COMPOSITE` to hide unrelated fixture cleanup in one receipt.

SYS-50 bundling rules remain authoritative.

---

## 7. Mutation basis vocabulary

Exactly five v1 basis values:

```text
MB-01 CONTRACT_CHANGE_PROPAGATION
MB-02 FIXTURE_DEFECT_CORRECTION
MB-03 REGRESSION_COVERAGE_EXPANSION
MB-04 NEGATIVE_CONTROL_REFINEMENT
MB-05 COVERAGE_RETIREMENT_OR_REPLACEMENT
```

### MB-01 `CONTRACT_CHANGE_PROPAGATION`

A reviewed owning semantic contract changed first.

Required:
- exact old/new contract authority refs or supersession identity;
- exact affected fixture cases;
- proof that the fixture now represents the new contract.

### MB-02 `FIXTURE_DEFECT_CORRECTION`

The semantic authority did not change; the old fixture was incorrect.

Required:
- exact authority showing intended behavior;
- evidence explaining why the old fixture was wrong;
- no claim that implementation behavior became correct merely because the fixture changed.

### MB-03 `REGRESSION_COVERAGE_EXPANSION`

A case is added/refined to cover an already-reviewed contract boundary.

Required:
- protected behavior / contract ref;
- why the existing portfolio did not already represent the boundary;
- SYS-22 intent compatibility.

### MB-04 `NEGATIVE_CONTROL_REFINEMENT`

A fixture change intentionally strengthens or refines a SYS-23 negative-control boundary.

Required:
- exact negative-control ref or reviewed pre-materialization authority;
- forbidden outcome preserved;
- proof boundary remains scoped to the actual test kind.

### MB-05 `COVERAGE_RETIREMENT_OR_REPLACEMENT`

Coverage is intentionally removed, consolidated, or moved.

Required:
- explicit replacement/supersession/debt disposition;
- affected SYS-22 intent and SYS-23 controls reviewed;
- no silent reduction of a required negative control.

---

## 8. Semantic effect vocabulary

Every receipt records one semantic effect:

```text
SE-01 NONE_REVIEWED
SE-02 COVERAGE_EXPANDED
SE-03 COVERAGE_CONTRACTED
SE-04 EXPECTATION_REALIGNED_TO_EXISTING_AUTHORITY
SE-05 EXPECTATION_MIGRATED_TO_NEW_AUTHORITY
SE-06 CONTROL_BOUNDARY_REFINED
SE-07 MIXED_REVIEWED
```

This field describes the fixture portfolio effect only.

It does not assign severity or prove correctness.

`COVERAGE_CONTRACTED` is allowed only with an explicit reviewed retirement/replacement/debt disposition.

---

## 9. Exact before/after identity

A receipt must preserve enough immutable identity to reconstruct the mutation without relying on filenames alone.

Required v1 identities:

```text
Work / transaction identity
Owning permanent suite ID
Fixture path(s)
Before commit SHA
After commit SHA or merged result SHA
Before blob SHA(s), when available
After blob SHA(s), when available
Affected case ID(s)
Old→new case ID mapping, when identity changed
PR / merge ref, when applicable
```

Git remains the exact byte authority.

The receipt points to Git; it does not paste full old/new fixture JSON.

When a mutation has not yet merged, a provisional receipt may use candidate/head identities, but final close must resolve the durable merged identity or remain `REVIEW_REQUIRED`.

---

## 10. Relationship to owning semantic authority

Fixture expectation is downstream of semantic authority.

Frozen direction:

```text
semantic authority
→ test intent
→ fixture expected behavior
```

not:

```text
fixture changed
→ therefore semantic authority changed
```

For `CONTRACT_CHANGE_PROPAGATION`:
- cite the exact new/superseding authority;
- cite the predecessor where useful;
- use SYS-02 lineage if the decision/contract supersession is already registered.

For `FIXTURE_DEFECT_CORRECTION`:
- cite the unchanged authority;
- state explicitly that runtime/semantic contract did not change.

A fixture receipt cannot create a new semantic owner.

---

## 11. Relationship to SYS-22 Test Intent Manifest

SYS-22 owns what the suite is intended to prove and explicitly not prove.

Every SYS-25 receipt records:

```text
Test-intent impact:
UNCHANGED
REVIEW_REQUIRED
UPDATED_BY_SEPARATE_AUTHORITY
```

### `UNCHANGED`

The fixture mutation stays inside the already-reviewed intent and non-claim boundary.

### `REVIEW_REQUIRED`

The fixture mutation may materially change protected behaviors, intended claims, evidence maturity boundary, or required fixture meaning.

The receipt cannot declare the new intent on its own.

### `UPDATED_BY_SEPARATE_AUTHORITY`

A legitimate SYS-22 application/update was separately performed and is cited.

Frozen rule:

```text
fixture mutation
!= permission to broaden test intent
```

A successful post-mutation test still cannot prove claims excluded by SYS-22/SYS-13.

---

## 12. Relationship to SYS-23 Negative-Control Registry

Every receipt records:

```text
Affected negative controls:
NONE
NC-xxx ...
UNMATERIALIZED_REVIEWED_CONTROL_REF
```

If a mutation changes/removes a case enforcing a negative control, the receipt must record one of:

```text
CONTROL_PRESERVED
CONTROL_STRENGTHENED
CONTROL_MOVED
CONTROL_REVALIDATION_REQUIRED
CONTROL_RETIREMENT_REVIEWED
```

Forbidden:

```text
remove negative-control case
→ say nothing because suite still passes
```

SYS-25 never invents a new SYS-23 control automatically.

---

## 13. Relationship to SYS-24 Fixture Orphan Detector

SYS-24 answers permanent membership/ownership integrity:

```text
registry row
↔ suite module
↔ fixture directory
```

SYS-25 answers semantic accountability for intentional fixture-content mutation.

Therefore:

```text
FIXTURE_GRAPH_CLEAN
!= fixture mutation semantically legitimate

MUTATION_RECEIPT_COMPLETE
!= fixture membership graph clean
```

If a mutation also changes registry/module/directory membership, SYS-24's protected governance boundary is separately relevant.

SYS-25 does not absorb it.

---

## 14. Relationship to SYS-35 Repository Transaction Ledger

SYS-35 may record the meaningful fixture mutation transaction as:

```text
transaction class = PRODUCT_IMPLEMENTATION / NON_RUNTIME_APPLICATION / PR_MERGE as appropriate
authority domain  = MAIN_TEST_FIXTURE
```

SYS-25 remains narrower:

```text
SYS-35
= where the repository transaction sits in work lineage

SYS-25
= why the golden fixture mutation itself was semantically legitimate
```

A SYS-25 receipt should cite the SYS-35 row when materialized, but neither document replaces Git/PR facts.

---

## 15. Relationship to SYS-21 Forensic Classification Consistency

SYS-21 may review whether the mutation receipt overstates evidence or impact.

Typical hazards:

```text
fixture expectation changed
→ receipt says "bug fixed" without implementation/live evidence

negative control removed
→ receipt says "coverage unchanged" without replacement evidence

permanent suite PASS
→ receipt says LIVE_PASS
```

SYS-25 must preserve exact evidence/non-claim language so SYS-21 can review it.

SYS-25 itself does not assign WATCH/FIX/BLOCKER merely because a fixture changed.

---

## 16. Relationship to SYS-13 proof scope

Post-mutation verification must preserve proof kind.

Typical deterministic proof:

```text
PK-02 FOCUSED_DETERMINISTIC_TEST
PK-03 PERMANENT_REGRESSION_HARNESS
```

Frozen non-equivalence:

```text
post-mutation permanent fixture PASS
!= natural live validation
!= genuine release E2E proof
!= proof that adjacent owners are correct
```

Receipt must name exact executed proof/evidence refs, not merely say `tests pass`.

If direct focused execution is not established, preserve `NOT_CLAIMED` rather than upgrading from generic CI PASS.

---

## 17. Relationship to SYS-28 Verification Debt

A mutation may create or reveal a later proof obligation.

Examples:

```text
negative control moved but direct natural revalidation still pending
coverage intentionally contracted with accepted follow-up
fixture expectation migrated after architecture change and post-extraction live control remains required
```

SYS-25 records the relevant SYS-28 debt ref when one exists.

It does not create blocker posture from fixture mutation type.

If no reviewed debt authority exists, receipt uses:

```text
Verification debt impact = NONE KNOWN / REVIEW REQUIRED
```

rather than inventing a debt row.

---

## 18. Frozen v1 receipt schema

Every receipt contains exactly these top-level semantic sections.

### 18.1 Mutation identity

```text
Receipt ID
Date
Work ID / bounded work title
Permanent suite ID
Mutation class (GM-xx)
Mutation basis (MB-xx)
Semantic effect (SE-xx)
```

Receipt ID is navigation identity only.

Recommended form:

```text
GFM-YYYYMMDD-NNN
```

### 18.2 Exact repository identity

```text
Fixture path(s)
Affected case ID(s)
Before commit SHA
After/merged commit SHA
Before blob SHA(s)
After blob SHA(s)
PR / merge ref when applicable
Old→new case mapping when applicable
```

### 18.3 Semantic authority basis

```text
Owning semantic authority
Predecessor authority when relevant
Successor/current authority when relevant
Why fixture mutation follows that authority
Contract changed? YES / NO
Fixture defect established? YES / NO / NOT_APPLICABLE
```

At least one valid mutation basis must resolve.

### 18.4 Case-level effect

For every materially affected case:

```text
Case ID
Before semantic purpose
After semantic purpose
Input changed? YES/NO
Expectation changed? YES/NO
Coverage effect
Replacement/supersession ref if removed
```

Do not paste raw fixture bodies.

### 18.5 Test-intent impact

```text
UNCHANGED
REVIEW_REQUIRED
UPDATED_BY_SEPARATE_AUTHORITY
```

Include SYS-22 ref when available.

### 18.6 Negative-control impact

```text
Affected controls
Disposition per affected control
Evidence/fixture refs
```

Use `NONE` only after review.

### 18.7 Verification evidence

```text
Focused deterministic execution
Permanent harness execution
CI run / job refs
Exact PASS/FAIL/NOT_CLAIMED scope
Production authority used by the harness when relevant
```

Do not broaden evidence maturity.

### 18.8 Repository / lineage refs

```text
Git commit(s)
PR / merge
SYS-35 transaction row when available
related work-close receipt when available
```

### 18.9 Verification debt / follow-up

```text
NONE
SYS-28 debt ref
REVIEW_REQUIRED
```

This is a pointer, not a blocker calculation.

### 18.10 Explicit non-claims

Every receipt must state at least:

```text
receipt completeness != fixture correctness proof by itself
fixture PASS != natural live PASS
fixture mutation != runtime semantic authorization
receipt != registry/harness authority
```

Add narrower non-claims required by the suite intent.

### 18.11 Receipt state

One frozen top-level receipt state from section 19.

---

## 19. Receipt states

Exactly four:

```text
MUTATION_RECEIPT_COMPLETE
MUTATION_RECEIPT_REVIEW_REQUIRED
MUTATION_RECEIPT_BLOCKED
MUTATION_RECEIPT_NOT_APPLICABLE
```

### `MUTATION_RECEIPT_COMPLETE`

Required identities, semantic basis, case effects, intent/control impacts, and verification refs are resolved enough to preserve the mutation faithfully.

Meaning only:

```text
the mutation's accountability record is complete
```

It does not establish fixture PASS or runtime correctness by itself.

### `MUTATION_RECEIPT_REVIEW_REQUIRED`

Mutation is known but one or more non-blocking receipt facts remain unresolved, such as final merged identity or a bounded semantic impact review.

Do not use for a missing legitimacy basis.

### `MUTATION_RECEIPT_BLOCKED`

The mutation cannot be represented as legitimate because a required semantic authority/basis is missing or contradictory.

Canonical examples:

```text
expected value changed solely because implementation changed
removed negative-control case has no reviewed disposition
contract-change claim has no authority ref
before/after event identity cannot be distinguished
```

`BLOCKED` is a receipt/accountability finding. The owning work/gate authority decides the operational stop/repair consequence.

### `MUTATION_RECEIPT_NOT_APPLICABLE`

No permanent golden fixture semantic mutation occurred.

Do not create fake receipts for ordinary runtime or documentation-only work.

---

## 20. Receipt immutability and amendment

A completed receipt is point-in-time historical evidence.

Do not rewrite it later merely because:
- a newer contract supersedes the fixture;
- a later test adds more coverage;
- later natural evidence changes confidence;
- a later release changes production.

If a clerical identity/reference error is found:

```text
append a bounded CORRECTION / AMENDMENT note
preserve the original mistaken value and correction reason
```

If the fixture changes again:

```text
new mutation
→ new receipt
```

Do not mutate the old receipt into a rolling current-state page.

---

## 21. Case removal discipline

Case removal is the mutation most likely to create silent coverage loss.

Mandatory review:

```text
What contract did the case protect?
Was it a SYS-23 negative control?
Is another permanent case now equivalent?
Was the contract itself superseded?
Was the case moved to another suite?
Did coverage become intentionally narrower?
Is follow-up verification debt required?
```

Forbidden:

```text
case removed because flaky
case removed because implementation no longer passes
case removed because old
```

unless the underlying semantic cause is separately reviewed and recorded.

A flaky deterministic fixture is itself a test-system problem; deletion is not a default remedy.

---

## 22. Expected-value mutation discipline

For `GM-04 CASE_EXPECTATION_CHANGED`, receipt completeness requires one exact branch.

### Branch A — contract changed

```text
old contract authority
→ reviewed successor/supersession
→ new expected fixture value
```

Record:

```text
Mutation basis = MB-01
Semantic effect = SE-05
```

### Branch B — fixture was wrong

```text
unchanged semantic authority
+ source-backed evidence old fixture expectation was incorrect
→ corrected fixture value
```

Record:

```text
Mutation basis = MB-02
Semantic effect = SE-04
```

If neither branch is supported:

```text
MUTATION_RECEIPT_BLOCKED
```

This is the primary anti-greenwashing guard.

---

## 23. Initial fixture creation vs mutation

SYS-25 is prospective mutation accountability.

A brand-new permanent suite/fixture family initially materialized from a frozen implementation-ready design does not require pretending that a prior golden fixture existed.

Initial creation is better evidenced by the existing implementation-evidence pattern:

```text
frozen fixture design
→ new suite/fixtures/registry row
→ verification
→ implementation evidence
```

SYS-25 becomes applicable when a previously established permanent golden fixture is intentionally mutated after that baseline exists.

Do not retrofit every historical initial fixture creation into a fake mutation receipt.

The existing summary-scope/narrative-clock/frame/broadcast-closure implementation evidence remains valid historical evidence without retrospective SYS-25 receipts.

---

## 24. Registry-field changes are separate governance

Changes to operational registry fields such as:

```text
coverage
required
goldenGate
module
fixtureDir
```

are not legitimized by SYS-25.

They remain under registry/harness/fixture-governance authority.

If one bounded work legitimately changes both fixture content and registry membership/policy:
- SYS-50 bundling rules must permit the combination;
- protected governance requirements still apply;
- SYS-25 records only the fixture-content mutation slice;
- SYS-24/SYS-35 and other relevant authorities remain separate.

Especially forbidden:

```text
goldenGate=true → false
```

being described as a mere fixture receipt change.

That is a material governance change, not a documentation shortcut.

---

## 25. Verification minimum for a future mutation transaction

SYS-25 does not define the full protected fixture mutation workflow, but any completed receipt must point to verification appropriate to the owning fixture.

Minimum evidence shape:

```text
exact before/after diff reviewed
fixture/schema loading succeeds where applicable
focused owning suite executes when available
permanent harness executes the affected golden suite
existing required/golden gates remain green unless an explicitly authorized contract migration says otherwise
negative-control expectations reviewed
SYS-22 non-claims preserved
release-simcore/runtime change claims stated explicitly
```

Do not claim direct focused execution if CI only proves a broader generic gate.

If the fixture mutation accompanies runtime implementation, deterministic PASS remains deterministic proof; live validation requirements remain separately owned.

---

## 26. Representative mutation examples

These examples validate the receipt model; they do not mutate current fixtures.

### 26.1 Add a new summary-scope false-positive boundary

```text
Mutation class = GM-01 CASE_ADDED
Basis          = MB-03 REGRESSION_COVERAGE_EXPANSION
Semantic effect= SE-02 COVERAGE_EXPANDED

Authority      = existing Summary Scope Authority
Test intent    = UNCHANGED if still deterministic classifier scope
Negative control impact = new/refined false-positive guard if reviewed
```

Permanent PASS still does not prove natural rendered annual-summary semantics.

### 26.2 Change an expected scope after a reviewed contract revision

```text
Mutation class = GM-04 CASE_EXPECTATION_CHANGED
Basis          = MB-01 CONTRACT_CHANGE_PROPAGATION
Semantic effect= SE-05 EXPECTATION_MIGRATED_TO_NEW_AUTHORITY
```

Required:
- old/new semantic authority;
- decision/supersession refs where available;
- exact case mapping;
- post-mutation deterministic verification.

### 26.3 Fix a typo in an expected deterministic field

If the owning contract always required the corrected value and the fixture was demonstrably wrong:

```text
Mutation class = GM-04
Basis          = MB-02 FIXTURE_DEFECT_CORRECTION
Semantic effect= SE-04 EXPECTATION_REALIGNED_TO_EXISTING_AUTHORITY
```

No runtime contract change is implied.

### 26.4 Remove a duplicated case

```text
Mutation class = GM-02 CASE_REMOVED
Basis          = MB-05 COVERAGE_RETIREMENT_OR_REPLACEMENT
```

Receipt must identify the surviving equivalent case and review negative-control/test-intent impact.

`duplicate` must be demonstrated, not asserted from similar names.

---

## 27. Relationship to future SYS-26 and SYS-29

SYS-26 Coverage Promotion Readiness Scanner may later consume mutation receipts as evidence that a fixture family has stable reviewed history.

SYS-29 Contract-to-Fixture Gap View may later use receipts to understand whether a gap was created/closed by fixture mutation.

Neither future system may treat receipt existence as automatic coverage proof.

Frozen direction:

```text
SYS-25 receipt
→ trustworthy mutation history input
!= promotion authorization
!= coverage completeness
```

---

## 28. Relationship to SYS-08 work close receipt

One fixture mutation work item may also produce a SYS-08 close receipt.

The roles differ:

```text
SYS-25
= detailed accountability for one golden fixture mutation

SYS-08
= compact closure summary for the whole bounded work item
```

SYS-08 may point to the SYS-25 receipt rather than duplicating case-level mutation details.

---

## 29. Application plan after design sweep

Later v1 application should be document-only and bounded:

```text
1. materialize SIMCORE_GOLDEN_FIXTURE_MUTATION_RECEIPT_TEMPLATE.md
2. cross-reference SYS-22 / SYS-23 / SYS-24 / SYS-35 / SYS-21 / SYS-13 / SYS-28 boundaries
3. apply prospectively to the next legitimate permanent golden fixture mutation
4. do not retrofit historical fixture additions unless a real audit requires it
```

No current fixture asset changes in the application transaction.

If the next fixture mutation occurs before template materialization, its implementation evidence may still follow this frozen contract directly; later application should not rewrite the historical event.

---

## 30. Verification for this design transaction

This SYS-25 design freeze is valid only if:

```text
design doc added on main
inventory/progress/classification/deferred living docs synchronized
products/simcore/tests/registry.mjs unchanged
products/simcore/tests/suites/** unchanged
products/simcore/tests/fixtures/** unchanged
plugin runtime source unchanged
CI/release workflow unchanged
release-simcore unchanged
```

No current golden fixture is mutated merely to design the mutation receipt.

---

## 31. Freeze verdict

```text
SYS-25 GOLDEN FIXTURE MUTATION RECEIPT
= DESIGN FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_DOC_ONLY
= POINT-IN-TIME FIXTURE-MUTATION ACCOUNTABILITY
= PROSPECTIVE / NO HISTORICAL BACKFILL REQUIRED
= ANTI-GREENWASHING CONTRACT FROZEN
= ACTUAL FIXTURE MUTATION REMAINS SEPARATE AUTHORITY WORK
= NO FIXTURE CHANGE
= NO HARNESS / REGISTRY / CI CHANGE
= NO RUNTIME / RELEASE CHANGE
= OPEN DESIGN QUESTIONS 0
```

Application remains a later bounded transaction under the active Design Sweep First hold.
