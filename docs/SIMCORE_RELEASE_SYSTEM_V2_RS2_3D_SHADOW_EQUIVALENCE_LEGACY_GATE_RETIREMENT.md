# SimCore Release System v2 — RS2-3D Shadow Equivalence / Legacy Gate Retirement Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_PERMISSIONS_CONCURRENCY_REPORT_ARTIFACT_SAFETY.md`
Durable test contracts: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`, `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`, `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1D_BASELINE_EQUIVALENCE_PROOF.md`
Permanent CI topology: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
Permanent CI matrix: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
Phase: `RS2-3 — Permanent CI`
Subphase: `RS2-3D — Shadow Equivalence / Legacy Gate Retirement`
Authority class: release-infrastructure design / verification-authority migration contract

---

## 1. Purpose

RS2-3A through RS2-3C define the permanent SimCore CI topology, routing, permissions, concurrency, and bounded evidence model.

RS2-3D defines how that new read-only verifier proves that it is at least as protective as the legacy SimCore verification surface before any legacy verification authority is retired.

The central rule is:

> A legacy workflow is not retired because a new workflow exists. It is retired only after every still-relevant legacy assertion has an explicit permanent owner and the new owner has produced qualifying shadow-equivalence evidence.

This phase therefore freezes:

```text
legacy workflow inventory classes
responsibility-level rather than file-level retirement
assertion migration ledger
shadow-equivalence evidence requirements
positive and negative parity requirements
minimum qualifying shadow count
superseded false-negative workflow treatment
pure check predecessor retirement
mixed build/validator split rules
RS2-4 holdbacks for write/deploy responsibility
rollback and reactivation rules
retirement sequencing
RS2-3E handoff package
```

This document does **not**:

```text
implement simcore-ci.yml
implement the permanent harness
modify release-simcore
modify plugin runtime behavior
modify product-manifest.json
modify state-sync documents
change branch protection
perform a release
run a live long-chat validation
remove release authority from release-simcore
retire the active state-sync writer
retire the active release writer
bulk-delete historical workflows
```

---

## 2. Core principle — retire responsibilities, not filenames

Legacy SimCore workflows frequently combine multiple responsibilities in one YAML file.

Typical current shape:

```text
load version-specific patch
→ mutate work-branch source
→ syntax / latest==install validation
→ architecture checks
→ regression fixtures
→ frozen-surface checks
→ commit candidate
→ push work branch
```

Those responsibilities do not share one retirement date.

RS2-3D therefore defines retirement at the **responsibility unit** level.

A single workflow may simultaneously contain:

```text
VALIDATION RESPONSIBILITY
  eligible for permanent-CI replacement during RS2-3

CANDIDATE MATERIALIZATION RESPONSIBILITY
  not permanent-CI authority
  disposition belongs to RS2-4

RELEASE / REF WRITE RESPONSIBILITY
  not permanent-CI authority
  disposition belongs to RS2-4

HISTORICAL PATCH GLUE
  retained as provenance until replacement evidence is durable
```

No whole-file retirement claim may erase a responsibility that is outside RS2-3 authority.

---

## 3. Frozen legacy disposition classes

Every current SimCore workflow relevant to release infrastructure must receive exactly one top-level disposition class.

### 3.1 `CHECK_ONLY_PREDECESSOR`

Definition:

```text
read-only verification workflow
no candidate mutation
no repository write
no release deployment
```

Retirement authority:

```text
RS2-3D after equivalence proof
```

Primary current example:

```text
.github/workflows/simcore-architecture-contracts.yml
```

### 3.2 `MIXED_BUILD_VALIDATOR`

Definition:

```text
contains durable verification assertions
AND
contains candidate patch/materialization and/or commit/push behavior
```

Retirement rule:

```text
validation portion may be replaced during RS2-3
write/materialization portion may not be declared replaced by CI
```

Current examples include:

```text
.github/workflows/simcore-m2-2-representation.yml
.github/workflows/simcore-06404-community-reaction-attribution.yml
.github/workflows/simcore-06405-community-multiline-reaction-unit.yml
.github/workflows/simcore-06406-post-bend-c-clock-handoff-v2.yml
.github/workflows/simcore-06406-closure-completion-gate-v2.yml
```

### 3.3 `SUPERSEDED_HARNESS_OR_BUILD`

Definition:

```text
an older workflow revision whose current value is provenance/history
and whose execution authority has already been superseded by a later same-goal workflow
```

Examples include earlier v0.64.6 workflow revisions where the later v2 workflow became the validated path.

A workflow in this class is not treated as an independent correctness oracle merely because it once ran.

### 3.4 `ADMIN_STATE_WRITER`

Definition:

```text
writes durable project state, manifest, memory, or administrative evidence
```

Current examples include:

```text
.github/workflows/simcore-release-state-sync.yml
.github/workflows/simcore-memory-sync-06359.yml
```

Disposition:

```text
OUTSIDE RS2-3 RETIREMENT AUTHORITY
```

RS2-2 and RS2-4 define their eventual ownership transition.

### 3.5 `RELEASE_WRITER`

Definition:

```text
writes or publishes release-simcore
or combines release publication with post-release administration
```

Current example:

```text
.github/workflows/simcore-release-command.yml
```

Disposition:

```text
OUTSIDE RS2-3 RETIREMENT AUTHORITY
RETAIN UNTIL RS2-4
```

Permanent CI may replace verification assertions embedded in such a workflow only when RS2-4 consumes the permanent verifier. RS2-3 alone does not delete the release path.

---

## 4. Current workflow inventory frozen for RS2-3D

At design freeze, the explicitly reviewed SimCore workflow set is:

```text
simcore-architecture-contracts.yml
simcore-m2-2-representation.yml
simcore-06404-community-reaction-attribution.yml
simcore-06405-community-multiline-reaction-unit.yml
simcore-06406-post-bend-c-clock-handoff.yml
simcore-06406-post-bend-c-clock-handoff-v2.yml
simcore-06406-closure-completion-gate.yml
simcore-06406-closure-completion-gate-v2.yml
simcore-memory-sync-06359.yml
simcore-release-command.yml
simcore-release-state-sync.yml
```

The permanent migration ledger must discover and classify any additional SimCore-specific workflow present at implementation time.

Unknown SimCore workflows are not silently ignored.

If an unclassified SimCore workflow is discovered:

```text
LEGACY_GATE_UNCLASSIFIED
→ RS2-3 retirement BLOCKED
```

---

## 5. Current evidence by workflow family

### 5.1 Architecture Contracts predecessor

`simcore-architecture-contracts.yml` is the cleanest predecessor.

Its current responsibility is:

```text
materialize release-simcore latest/install
→ node syntax check
→ require latest == install
→ run scripts/simcore-architecture-check.py
```

It uses read-only repository permissions.

Therefore its verification responsibility should map to permanent:

```text
GATE_STATIC
GATE_ARCH
```

and is eligible for physical workflow retirement after RS2-3D equivalence conditions are satisfied.

### 5.2 M2-2 representation checkpoint

`simcore-m2-2-representation.yml` mixes:

```text
M2-2 patch application
version-specific markers
representation ownership assertions
runtime-mirror narrowing assertions
architecture validation
candidate commit/push
```

Permanent owners:

```text
representation ownership invariants
  → permanent architecture/static contract

Representation fast relation controls
  → RS2-1 representation-fast suite

Genuine visible edit relation controls
  → RS2-1 genuine-edit suite

latest/install syntax and equality
  → GATE_STATIC
```

Non-permanent-CI responsibility:

```text
apply M2-2 mechanical patch
commit/push M2-2 work branch
```

That write responsibility is historical build glue and cannot be called replaced by `simcore-ci.yml`.

### 5.3 v0.64.4 COMMUNITY Reaction attribution

`simcore-06404-community-reaction-attribution.yml` contains durable controls for:

```text
Reaction inspector acceptance equivalence
MISSING / MULTIPLE / FINAL_TAIL attribution
format-only versus visible-tail attribution
Structure judge-only wiring
warning attribution shape
Reaction normalization frozen surface
protected side-effect counts
syntax / latest==install / architecture
```

Permanent ownership direction:

```text
community-reaction suite
architecture/static contracts
frozen-surface contract registry
```

Version-specific patch and branch push are not permanent CI responsibilities.

### 5.4 v0.64.5 COMMUNITY multiline reaction unit

`simcore-06405-community-multiline-reaction-unit.yml` contains durable controls for:

```text
v0.64.4 physical-line reproducer = MISSING x5
v0.64.5 logical-unit bilingual 4 TOP + 1 REPLY = PASS
supported single-line formats remain PASS
missing / multiple / final-tail negatives remain FAIL
Community grouping → Reaction inspection → Structure judge-only ownership
frozen Time/Lifecycle/Reaction surfaces
protected side-effect counts
syntax / latest==install / architecture
```

These are primary migration sources for the permanent `community-reaction` suite and frozen-surface contracts.

Patch application and branch commit/push remain non-CI build glue.

### 5.5 v0.64.6 clock-handoff v2

`simcore-06406-post-bend-c-clock-handoff-v2.yml` contains the first 18-case timeline-regression consolidation.

The durable assertion families include:

```text
first direct B_END → C floor application
already-satisfied Narrative control
second-C non-bridge
B_CONTINUE/B_START negatives
invalid terminal source
Narrative current-frame floor
historical timestamp preservation
later Narrative tail wins
rollback prevention
B_END terminal commit
COMMUNITY 4+1 retained control
Representation fast control
Genuine edit control
Summary Scope execution control
no persistent Broadcast→Narrative coupling
frozen subsystem surfaces
protected side-effect counts
```

This workflow also applies the v0.64.6 patch and pushes a candidate branch.

Only its validation responsibility is in RS2-3 scope.

### 5.6 v0.64.6 closure-completion v2

`simcore-06406-closure-completion-gate-v2.yml` is the canonical final v0.64.6 correction validator for this migration because it runs the robust **1–25** fixture set after applying the closure-completion correction.

Durable additional assertions include:

```text
closure incomplete → INELIGIBLE
terminal/stored airtime mismatch → INVALID_SOURCE
non-direct prior B request → INELIGIBLE
non-direct prior visible assistant → INELIGIBLE
complete/direct/matching + stale Narrative → APPLIED
complete/direct/matching + later Narrative → ALREADY_SATISFIED
```

It also preserves:

```text
architecture validation
latest/install equality
frozen Community/Reaction/Representation/output-compat surfaces
protected storage/network/timer surface counts
```

For v0.64.6 migration, this v2 closure validator is the primary legacy assertion source.

The older post-B_END v2 remains provenance for how fixtures 1–18 entered the history, but no duplicate permanent gate is created merely because both workflows contain overlapping assertions.

---

## 6. Superseded v0.64.6 workflow treatment

The earlier v0.64.6 workflow revisions must not become permanent authorities merely because their filenames still exist.

In particular, a workflow revision with a known harness/module-extraction false negative is classified:

```text
SUPERSEDED_HARNESS_OR_BUILD
```

Its product-level conclusion is not used as a golden oracle.

The durable lesson promoted from such a failure is:

```text
harness extraction must be robust to module order
unexpected module-loader failure = HARNESS/INFRA error
not product semantic FAIL
```

A superseded harness workflow may be physically retired once:

```text
its unique assertions are mapped or proven none
its failure provenance is documented
its later replacement workflow is identified
no active release path references it
```

It does **not** require three product-equivalence shadows if it has no independent current verification responsibility.

---

## 7. Assertion migration ledger

Implementation must create one canonical responsibility mapping file under permanent SimCore CI infrastructure.

Frozen target path:

```text
products/simcore/ci/legacy-gate-map.json
```

The file is administrative test-infrastructure state, not production identity authority.

Minimum record shape:

```json
{
  "legacyWorkflow": ".github/workflows/example.yml",
  "responsibilityId": "example.assertion-family",
  "class": "CHECK_ONLY_PREDECESSOR",
  "status": "MAPPED",
  "permanentOwners": ["GATE_ARCH"],
  "permanentSuiteIds": [],
  "disposition": "RETIRE_AFTER_EQUIVALENCE",
  "notes": "bounded explanation"
}
```

Allowed responsibility status vocabulary:

```text
UNMAPPED
MAPPED
SHADOWING
SHADOW_VERIFIED
VALIDATION_REPLACED
OUTSIDE_RS2_3
SUPERSEDED_NO_AUTHORITY
```

A legacy workflow cannot become retirement-eligible while any still-relevant responsibility remains `UNMAPPED`.

---

## 8. Assertion disposition vocabulary

Every assertion family extracted from a legacy workflow must receive one of these dispositions.

### 8.1 `PERMANENT_TEST`

Behavioral assertion is owned by a permanent RS2-1 suite.

Examples:

```text
COMMUNITY logical-unit 4+1
Reaction missing/multiple/final-tail negatives
Representation relation classification
B_END closure/time behavior where executable
```

### 8.2 `PERMANENT_CONTRACT`

Static/architecture/frozen-surface invariant is owned by permanent contracts.

Examples:

```text
latest == install
syntax validity
module ownership boundary
forbidden dependency edge
protected side-effect count or frozen-surface digest where still contractually meaningful
```

### 8.3 `LEGACY_COMPAT_TRANSITIONAL`

Still-relevant assertion not yet assigned a stable first-pack suite may temporarily execute through the permanent CI `GATE_LEGACY_COMPAT` lane.

Rules:

```text
must be data-driven
must live under permanent CI/harness ownership
must not create another version-named workflow
must identify future permanent owner
must not mutate source
```

This category prevents a single missing control from forcing retention of a write-capable one-shot workflow.

It is transitional and must be visible in RS2-3E status.

### 8.4 `RELEASE_GLUE`

Assertion is meaningful only to a particular release/build transaction rather than steady-state product behavior.

Examples:

```text
exact historical version marker
exact historical patch parent
exact command PR title
branch name used for one old work item
```

Disposition belongs to historical evidence or RS2-4 release orchestration, not the permanent regression pack.

### 8.5 `HISTORICAL_ONLY`

Assertion describes a historical reproducer or old implementation shape that must not constrain current implementation forever.

Example:

```text
v0.64.4 physical-line framing reproduces MISSING x5
```

The historical shape may remain as differential provenance without becoming a current golden expectation.

### 8.6 `SUPERSEDED`

Assertion was replaced by a stricter later same-goal assertion and has no independent current responsibility.

It must reference the replacing responsibility.

---

## 9. No assertion-by-grep migration

Migration may not reduce behavioral controls into weak marker presence checks merely to claim coverage.

Forbidden example:

```text
legacy workflow dynamically proved B_END floor behavior
→ permanent CI only greps for 'Post-B_END clock handoff:'
→ claim equivalent
```

That is not equivalence.

Equivalence requires matching semantic strength:

```text
behavioral assertion → executable permanent behavior test where safely possible
static ownership assertion → static/architecture contract
bounded transitional source binding → explicitly HYBRID / transitional
```

If equal strength is not available:

```text
ASSERTION_STRENGTH_GAP
→ retirement BLOCKED
```

---

## 10. Relationship to RS2-1 coverage states

RS2-3D inherits RS2-1 coverage honesty.

A permanent suite may be:

```text
EXECUTABLE
HYBRID_TRANSITIONAL
NOT_MIGRATED
```

Retirement implications:

### `EXECUTABLE`

May replace a legacy behavioral responsibility after shadow parity.

### `HYBRID_TRANSITIONAL`

May replace only the exact portion actually proven.

Any missing executable surface must be:

```text
covered by another permanent contract
OR
registered under LEGACY_COMPAT_TRANSITIONAL
OR
left as a retirement blocker
```

A HYBRID suite cannot silently claim end-to-end behavior it did not execute.

### `NOT_MIGRATED`

Relevant legacy responsibility remains active/not-retired.

---

## 11. Summary Scope and other non-Batch-A controls

The v0.64.6 consolidated fixtures include controls beyond RS2-1C Batch A, including Summary Scope execution.

RS2-3D explicitly forbids losing those controls merely because Batch A contains only:

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
```

Therefore a still-relevant Summary Scope assertion must be either:

```text
promoted into an explicitly named permanent contract/suite
OR
registered in GATE_LEGACY_COMPAT as transitional permanent-CI coverage
```

before the v0.64.6 validation responsibility can be marked fully replaced.

The same rule applies to any current invariant such as a frozen fallback marker that is not yet owned by Batch A.

No control disappears because the first permanent pack intentionally has limited membership.

---

## 12. Shadow-equivalence record

Implementation must create a durable bounded summary ledger:

```text
products/simcore/ci/shadow-equivalence.json
```

This file does not replace ephemeral CI artifacts.

It records only promotion-level evidence summaries required to justify retirement.

Minimum record:

```json
{
  "equivalenceId": "...",
  "legacyResponsibilityId": "...",
  "sourceCommit": "...",
  "productionCommit": "...",
  "verifierCommit": "...",
  "legacyConclusion": "PASS",
  "permanentConclusion": "PASS",
  "legacyReasonClass": "...",
  "permanentReasonClass": "...",
  "assertionMapDigest": "...",
  "permanentReportSha256": "...",
  "evidenceKind": "POSITIVE_SHADOW",
  "qualifies": true
}
```

No raw source, transcript, diagnostic body, or secret is stored in this ledger.

---

## 13. What qualifies as a shadow comparison

A qualifying comparison must bind immutable identities.

Required tuple:

```text
legacy responsibility ID
source under test commit/blob identity
production parent if applicable
permanent verifier commit
permanent registry/contract digest
```

Both legacy and permanent conclusions must refer to equivalent source semantics.

A comparison does not qualify if:

```text
legacy tested source A but permanent tested source B
candidate branch moved between tests and exact commit was not recorded
legacy result came from a failed harness rather than product assertion
permanent gate was NOT_APPLICABLE
permanent report identity is missing
results were inferred manually without bounded evidence
```

---

## 14. Minimum positive shadow requirement

For every retirement unit that currently carries verification authority, minimum positive evidence is:

```text
3 qualifying positive shadow records
```

Additional diversity rule:

```text
at least 2 distinct immutable evidence identities
```

A distinct evidence identity may differ by source commit, verifier commit, or both, but repeated retries of the exact same run tuple do not count as independent evidence.

At least one of the three must test:

```text
current deployed production identity
```

At least one must test either:

```text
a historical immutable source that originally exercised the migrated assertion
OR
a current immutable candidate that exercises the same assertion family
```

The third may be a second clean-run reproduction on an independently materialized checkout.

This requirement does not force waiting for three future releases.

Historical immutable commits are valid shadow inputs when the assertion is meaningful there.

---

## 15. Mandatory negative parity

Positive PASS/PASS agreement alone is insufficient.

Each retirement unit must also have at least one controlled negative proving the permanent owner fails when the protected contract is violated.

Required:

```text
minimum 1 negative parity case per retired responsibility family
```

Examples:

```text
latest/install mismatch
→ permanent static gate FAIL

forbidden architecture dependency
→ permanent architecture gate FAIL

COMMUNITY missing reaction tag
→ permanent community-reaction fixture FAIL

B_END terminal/stored mismatch
→ permanent broadcast-closure fixture produces INVALID_SOURCE expectation
```

A negative case may use a committed fixture or temporary controlled mutation inside the test harness.

It must not mutate production or a repository ref.

Negative parity does not count as one of the three positive shadows.

---

## 16. Reason-class parity

Exact wording does not need to match a historical workflow log.

Semantic class must match.

Examples:

```text
legacy: architecture contract violation
permanent: ARCH_CONTRACT_FAIL
→ parity acceptable

legacy: product semantic fixture fails
permanent: HARNESS_ERROR
→ parity NOT acceptable
```

A permanent harness failure cannot masquerade as semantic equivalence.

Required parity classes:

```text
PASS
SEMANTIC_FAIL
CONTRACT_FAIL
IDENTITY_FAIL
INFRA/HARNESS_ERROR
```

When old workflows did not distinguish classes cleanly, the migration ledger documents the bounded interpretation used.

---

## 17. Permanent CI must be at least as strict

A legacy responsibility may retire only when permanent behavior is:

```text
EQUIVALENT
or
STRICTER_WITHOUT_SCOPE_EXPANSION
```

`STRICTER_WITHOUT_SCOPE_EXPANSION` means a new verifier rejects an invalid state the old verifier accidentally allowed, without rejecting valid product behavior outside the frozen contract.

Any weaker result is:

```text
PERMANENT_GATE_WEAKER
→ retirement BLOCKED
```

If a stricter result changes product semantics rather than verification quality, it is not an RS2-3 infrastructure change and must be split into a runtime/correctness task.

---

## 18. Architecture predecessor retirement gate

`simcore-architecture-contracts.yml` is retirement-eligible only after all of the following:

```text
permanent GATE_STATIC operational                   PASS
permanent GATE_ARCH operational                     PASS
same production materialization semantics           PASS
latest/install equality preserved                    PASS
architecture checker/contract coverage mapped        PASS
3 positive qualifying shadows                        PASS
at least 1 architecture negative parity              PASS
at least 1 latest/install mismatch negative parity   PASS
no weaker assertion detected                         PASS
rollback procedure documented                        PASS
```

After this gate, physical removal of `simcore-architecture-contracts.yml` is allowed during RS2-3 implementation because it is a pure check-only predecessor.

Its historical run evidence remains in Git history.

---

## 19. Mixed build-validator replacement gate

A `MIXED_BUILD_VALIDATOR` reaches:

```text
VALIDATION_REPLACED
```

only when:

```text
all current validation assertions classified
all PERMANENT_TEST owners implemented
all PERMANENT_CONTRACT owners implemented
all LEGACY_COMPAT_TRANSITIONAL controls executable in permanent CI
3 positive qualifying shadows per responsibility family satisfied
required negative parity satisfied
no ASSERTION_STRENGTH_GAP
no UNMAPPED relevant assertion
```

That state means:

```text
old workflow is no longer verification authority
```

It does **not** mean:

```text
old workflow file can necessarily be deleted
old build/write path has been replaced
release-simcore write authority moved
```

Write/build disposition remains an RS2-4 concern.

---

## 20. Mixed workflow quarantine after validation replacement

Once validation is proven replaced, a mixed legacy workflow should no longer be used as a normal correctness gate.

Frozen status:

```text
VALIDATION_REPLACED
WRITE_PATH_LEGACY
NOT_NORMAL_CI
```

During RS2-3 implementation, the safest default is:

```text
retain file in repository
retain history/provenance
remove it from required/current verification documentation
avoid creating new command PRs against it
```

Do not convert it into a new privileged manual release mechanism merely to keep it callable.

Whether its write portion is archived, rewritten, or deleted belongs to RS2-4.

---

## 21. Superseded workflow physical retirement

A `SUPERSEDED_HARNESS_OR_BUILD` file may become `RETIREMENT_ELIGIBLE` without the full three-shadow requirement only if:

```text
replacement workflow identified
no unique current assertion remains
known failure/provenance recorded
no current required check references it
no current release workflow calls it
no state-sync workflow depends on its name
```

If any unique assertion remains, the workflow is reclassified at the responsibility level until that assertion is migrated.

This prevents deleting useful evidence merely because a newer suffix exists.

---

## 22. Active state and release writers are explicit holdbacks

The following remain outside RS2-3 retirement authority:

```text
simcore-release-state-sync.yml
simcore-release-command.yml
```

The historical:

```text
simcore-memory-sync-06359.yml
```

is also not treated as a permanent-CI predecessor because its purpose is administrative mutation, not read-only verification.

RS2-3D may document their embedded generic validation controls for later reuse.

It may not claim those workflows are replaced solely because permanent CI exists.

Expected handoff:

```text
RS2-3
  verifies

RS2-4
  creates the permanent release transaction
  consumes CANDIDATE_REQUIRED
  defines release/write migration
```

---

## 23. Legacy release-command validation controls

`simcore-release-command.yml` contains old release-specific validation markers and a release push.

RS2-3D classifies these controls as:

```text
generic syntax / latest==install
  → permanent static coverage

current architecture/product invariants still relevant
  → migrate to permanent test/contract when identified

v0.63.54-specific release markers / expected parent
  → RELEASE_GLUE / HISTORICAL_ONLY

release-simcore push
  → RS2-4 authority

memory/state sync write
  → RS2-2/RS2-4 authority
```

The file cannot be retired by RS2-3 because the write transaction remains unresolved.

---

## 24. No branch-protection cutover before shadow proof

The stable public check name is:

```text
SimCore CI / Required
```

RS2-3D does not permit making this the sole required SimCore verification check before shadow proof is complete.

Adoption direction:

```text
install permanent CI as additive
→ run shadow
→ close responsibility mapping
→ prove parity
→ retire eligible legacy check authority
→ activate stable required-check policy in RS2-3E implementation close
```

Exact repository branch-protection activation mechanics are RS2-3E implementation/administration authority.

---

## 25. CI self-change parity requirement

Changes to permanent CI machinery after installation cannot use only the proposed verifier to prove their own equivalence.

For `CI_SELF` changes affecting required semantics:

```text
current trusted lane must still run
proposed lane must run shadow
old/new result mapping must be compared
negative self-tests must remain intact
```

A proposed CI change that removes an existing migrated assertion requires explicit migration-ledger change.

Silent coverage shrinkage is:

```text
PERMANENT_ASSERTION_DROPPED
→ CI_SELF BLOCKER
```

---

## 26. Equivalence ledger monotonicity

The shadow-equivalence ledger is append/update controlled but evidence may not be rewritten to hide an earlier mismatch.

If an equivalence attempt fails:

```text
record failure evidence
classify cause
repair
add later passing evidence
```

Do not delete the mismatch merely to reach three PASS records.

Allowed mismatch dispositions:

```text
FIX
WATCH
DEFER
BLOCKER
HARNESS_FALSE_NEGATIVE
LEGACY_FALSE_NEGATIVE
LEGACY_ASSERTION_OBSOLETE_WITH_EVIDENCE
```

A blocker remains open until its recorded resolution is linked.

---

## 27. Shadow mismatch handling

If legacy and permanent conclusions differ:

### Case A — permanent weaker

```text
legacy FAIL
permanent PASS
```

Default:

```text
BLOCKER
PERMANENT_GATE_WEAKER
```

### Case B — permanent catches more invalid state

```text
legacy PASS
permanent FAIL
```

Investigate whether:

```text
new check is valid stricter verification
or
new check is an overconstraint / semantic regression
```

Do not auto-classify as improvement.

### Case C — permanent harness error

```text
legacy PASS/FAIL
permanent HARNESS_ERROR
```

Classification:

```text
FIX / INFRASTRUCTURE
```

No parity credit.

### Case D — legacy harness false negative

If direct evidence proves the old workflow failed because its loader/harness was wrong while product behavior was valid:

```text
LEGACY_FALSE_NEGATIVE
```

The permanent verifier should match product truth, not reproduce the broken harness behavior.

---

## 28. Known loader-failure lesson

The v0.64.6 closure correction already demonstrated a module-extraction harness false negative before the robust runner was integrated.

RS2-3D freezes the lesson:

```text
legacy harness failure != product semantic oracle
```

Permanent equivalence compares **assertion intent and product behavior**, not every historical CI exit code blindly.

The robust later fixture runner is the canonical evidence source for the same correction family.

---

## 29. Retirement ordering

Physical retirement must be staged.

Frozen order:

```text
1. implement permanent harness + state checker + CI
2. create complete legacy responsibility map
3. run shadow equivalence
4. resolve all mismatches
5. mark pure check predecessors RETIREMENT_ELIGIBLE
6. retire pure check predecessor files
7. mark mixed validators VALIDATION_REPLACED
8. stop treating mixed validators as normal CI authority
9. preserve write/build portions until RS2-4 disposition
10. RS2-3E closes permanent CI authority
```

Do not bulk-delete all `simcore-*.yml` files in step 6.

---

## 30. Initial retirement matrix

Frozen directional matrix:

| Workflow | Class | Permanent validation owner | RS2-3D physical retirement? |
|---|---|---|---|
| `simcore-architecture-contracts.yml` | `CHECK_ONLY_PREDECESSOR` | `GATE_STATIC` + `GATE_ARCH` | YES, after equivalence |
| `simcore-m2-2-representation.yml` | `MIXED_BUILD_VALIDATOR` | static/arch + representation suites | validation only; file hold for RS2-4/history |
| `simcore-06404-community-reaction-attribution.yml` | `MIXED_BUILD_VALIDATOR` | community-reaction + contracts | validation only; file hold for RS2-4/history |
| `simcore-06405-community-multiline-reaction-unit.yml` | `MIXED_BUILD_VALIDATOR` | community-reaction + contracts | validation only; file hold for RS2-4/history |
| `simcore-06406-post-bend-c-clock-handoff-v2.yml` | `MIXED_BUILD_VALIDATOR` | broadcast/representation/community + legacy-compat as needed | validation only; largely superseded by closure v2 evidence |
| `simcore-06406-closure-completion-gate-v2.yml` | `MIXED_BUILD_VALIDATOR` | permanent regression + static/arch + legacy-compat | validation only; file hold for RS2-4/history |
| earlier v0.64.6 non-v2/superseded revisions | `SUPERSEDED_HARNESS_OR_BUILD` | replacement evidence only | eligible after no-unique-assertion proof |
| `simcore-memory-sync-06359.yml` | `ADMIN_STATE_WRITER` | outside RS2-3 | NO |
| `simcore-release-command.yml` | `RELEASE_WRITER` | RS2-4 | NO |
| `simcore-release-state-sync.yml` | `ADMIN_STATE_WRITER` | RS2-2/RS2-4 | NO |

This matrix is directional.

Implementation must verify exact current contents before changing any file.

---

## 31. What counts as physical retirement

Physical retirement may take one of two forms.

### 31.1 Delete check-only predecessor

Allowed after proof for a workflow whose only responsibility has been replaced.

Git history remains provenance.

### 31.2 Remove active verification authority while retaining historical mixed workflow

For mixed workflows, physical file retention does not imply active authority.

The migration ledger must state:

```text
validationAuthority = PERMANENT_CI
legacyWriteDisposition = RS2_4_PENDING
normalInvocation = FORBIDDEN
```

No human-facing current-development document may instruct future releases to invoke the retired validation path as normal procedure.

---

## 32. Rollback rule

RS2-3D retirement must remain reversible until RS2-3E closes.

If permanent CI exhibits a correctness or trust-boundary regression:

```text
freeze retirement
restore prior check-only workflow from known main commit if needed
remove permanent check from sole-required position if already activated
retain evidence of failure
repair permanent CI
restart shadow count for affected responsibility
```

For a mixed legacy workflow, rollback means restoring its **verification authority only when safe**.

It does not automatically authorize replaying an old patch or write transaction against current production.

Old version-specific mutation paths may be unsafe on modern source and must not be run merely because their validator once worked.

---

## 33. Shadow count reset semantics

A permanent-CI change does not always reset all evidence.

### Full reset for a responsibility when:

```text
its assertion implementation changes semantically
its source adapter/extractor changes materially
gate result mapping changes
trust boundary changes
fixture expected result changes
```

### No full reset when:

```text
unrelated documentation changes
unrelated suite is added
bounded report formatting changes without semantic output change
```

The ledger records which verifier commit range the evidence applies to.

If uncertain whether semantics changed, reset the affected responsibility rather than reusing stale proof.

---

## 34. Three-shadow diversity requirement examples

Valid example:

```text
Shadow 1
  current production commit P
  verifier V1

Shadow 2
  historical known-good source H
  verifier V1

Shadow 3
  current production P
  verifier V2 after final CI wiring
```

This qualifies because it has three positive records and more than one immutable evidence identity.

Non-valid example:

```text
same candidate commit
same verifier commit
same registry hash
workflow rerun three times
```

This is one evidence identity repeated three times and does not satisfy diversity.

---

## 35. Permanent legacy-compat lane constraints

`GATE_LEGACY_COMPAT` is permitted only as a migration bridge.

It must not become a dumping ground for endless historical scripts.

Required properties:

```text
read-only
registered assertion IDs
no version-named workflow
no patch application
no git write
bounded deterministic source adapter
bounded fixture data
explicit target permanent owner
```

RS2-3E status must list all remaining legacy-compat IDs.

RS2-4 may proceed with a small bounded legacy-compat set only if none represents an unresolved release-safety blocker.

---

## 36. Version-specific markers are not permanent product tests by default

Legacy workflows frequently assert exact strings such as:

```text
//@version 0.64.5
v0.64.5 COMMUNITY Multiline Reaction Unit Validation Repair
```

Permanent CI must instead validate generic identity consistency:

```text
metadata version == runtime version
latest == install
candidate identity bound to immutable commit
release metadata internally coherent
```

Old exact version strings are classified:

```text
RELEASE_GLUE or HISTORICAL_ONLY
```

unless a future release transaction explicitly requires a particular expected version.

This prevents permanent CI from being hardcoded to old releases.

---

## 37. Frozen-surface assertions require named ownership

Historical workflows use subsystem byte hashes and side-effect call counts to prove a scoped repair did not touch unrelated surfaces.

Those controls remain valuable, but the permanent system must not freeze arbitrary source bytes forever without ownership.

Each frozen-surface assertion must identify:

```text
surface ID
why it is protected
which operation is allowed to change it
whether protection is exact-byte or semantic
owner contract
```

If an intentional later architecture change modifies that surface, updating the permanent contract is a reviewed CI_SELF/architecture change rather than a release-number-specific workflow rewrite.

---

## 38. Live evidence is not a CI shadow substitute

Real long-chat validation remains mandatory for runtime releases under the SimCore workflow.

But live evidence and CI equivalence prove different things.

```text
live evidence
  proves deployed behavior in realistic long-chat use

RS2-3 shadow equivalence
  proves permanent automated verification preserves legacy test authority
```

A successful live chat does not permit skipping shadow-equivalence proof.

A successful shadow does not close a runtime release live gate.

---

## 39. No runtime change during retirement implementation

RS2-3D implementation is repository/CI infrastructure work.

Therefore the same work item must not modify:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore runtime
runtime semantics
version number
```

If an assertion cannot pass without a product fix, classify the product issue separately and stop retirement for that responsibility.

This preserves the rule:

```text
functional change
!=
release/repository-system change
```

---

## 40. Required implementation self-tests

RS2-3D implementation must include meta-tests for the retirement machinery.

Minimum:

```text
unclassified SimCore workflow blocks retirement
unmapped assertion blocks retirement
3 identical reruns do not satisfy evidence diversity
3 qualifying positive shadows do satisfy positive count
missing negative parity blocks retirement
permanent weaker result blocks retirement
HARNESS_ERROR earns no parity credit
superseded workflow with unique assertion cannot be retired
superseded workflow with no unique assertion can become eligible
admin writer cannot be retired by RS2-3
release writer cannot be retired by RS2-3
mixed workflow can reach VALIDATION_REPLACED without claiming WRITE_REPLACED
legacy-compat entry requires future owner
ledger stores no raw source or chat content
```

---

## 41. Required bounded implementation files

Initial RS2-3D implementation may add:

```text
products/simcore/ci/legacy-gate-map.json
products/simcore/ci/shadow-equivalence.json
products/simcore/ci/validate-retirement.mjs
```

Exact helper decomposition may vary, but there must be one canonical mapping authority and one bounded shadow summary.

Do not create one mapping file per historical release unless data volume genuinely requires it.

---

## 42. Retirement state machine

Responsibility-level state machine:

```text
DISCOVERED
  ↓
CLASSIFIED
  ↓
MAPPED
  ↓
SHADOWING
  ↓
SHADOW_VERIFIED
  ↓
VALIDATION_REPLACED
  ↓
RETIREMENT_ELIGIBLE
  ↓
RETIRED
```

For mixed workflows:

```text
VALIDATION_REPLACED
  ↓
WRITE_PATH_RS2_4_PENDING
```

instead of direct file retirement.

Any unresolved blocker returns the affected responsibility to:

```text
MAPPED or SHADOWING
```

with evidence retained.

---

## 43. Pure-check retirement versus mixed-validator retirement

The term `RETIRED` has two different object types and must not be ambiguous.

### Pure check workflow

```text
workflow file may be deleted
verification authority is permanent CI
```

### Mixed workflow validation responsibility

```text
validation authority is retired
workflow file may remain
write/build responsibility remains explicitly pending
```

Reports must therefore use explicit fields:

```text
validationRetired: true|false
fileRetired: true|false
writeDisposition: NONE|RS2_4_PENDING|OUTSIDE_RS2_3
```

---

## 44. Initial target assertion map

The first implementation should map at minimum these responsibility families.

### Static / identity

```text
node syntax latest/install
latest == install
metadata/runtime version consistency
candidate/source immutable identity
```

### Architecture

```text
Contracts v2
module ownership edges
forbidden direct dependencies
```

### Representation

```text
representation owner exists
runtime-mirror no longer owns provenance ledger
FRESH exact carryover classification
new visible representation negative/edit classification
```

### COMMUNITY / Reaction

```text
logical comment-unit grouping
4 TOP + 1 REPLY cardinality
reaction tag accepted labels
MISSING
MULTIPLE
FINAL_TAIL
judge-only Structure wiring
```

### Broadcast / Time

```text
B_END terminal authority
first direct post-B_END C floor
second-C negative
invalid-source handling
closure-complete gate
terminal/stored-airtime mismatch
historical timestamp preservation
later Narrative tail wins
```

### Cross-cutting frozen controls

```text
protected side-effect surfaces
forbidden persistent Broadcast→Narrative coupling
frozen subsystem/owner contracts where still applicable
```

### Transitional non-Batch-A controls

```text
Summary Scope execution control
other explicitly discovered current v0.64.6 regression controls
```

These must not remain unmapped at retirement time.

---

## 45. Retirement evidence must survive workflow deletion

Before deleting any check-only predecessor, durable main evidence must contain:

```text
legacy workflow path
last relevant blob/commit identity
assertion mapping digest
qualifying shadow IDs
negative parity IDs
replacement permanent gate IDs
retirement decision commit
rollback source commit
```

Deleting YAML without this record is forbidden.

Git history alone is not sufficient as the operational lookup mechanism.

---

## 46. Required shadow evidence does not authorize release

A `CANDIDATE_SHADOW` PASS used during 3D equivalence does not become release evidence.

Only future:

```text
CANDIDATE_REQUIRED
```

inside the RS2-4 release transaction may authorize deployment.

Therefore shadow records must mark:

```text
releaseAuthority = NONE
```

This prevents accidental reuse of a manual shadow PASS as a release gate.

---

## 47. No hidden legacy invocation after retirement

Once a legacy validation responsibility is marked replaced, current automation must not invoke it as an undocumented second gate.

Allowed:

```text
explicit rollback test
historical/manual forensic reproduction
```

Forbidden:

```text
permanent CI silently shells out to old workflow script
new release workflow still relies on old version-specific command PR
branch protection requires both new stable gate and undocumented old gate forever
```

If a legacy assertion is still needed, migrate the assertion into permanent ownership instead of hiding the old workflow behind the new one.

---

## 48. RS2-3D implementation promotion gate

RS2-3D implementation is complete only when:

```text
all SimCore workflows discovered and classified                    PASS
legacy responsibility map complete                                PASS
all current assertion families mapped                              PASS
permanent owners identified                                        PASS
Batch-A owners operational where required                          PASS
legacy-compat transitional owners explicit                         PASS
architecture predecessor has 3 positive qualifying shadows         PASS
architecture predecessor has required negative parity              PASS
mixed validation families meet 3-shadow requirement                PASS
known v0.64.6 robust 1–25 controls mapped                           PASS
Summary Scope/non-Batch-A controls not lost                         PASS
superseded harness false-negative provenance retained               PASS
no permanent gate weaker than retired responsibility                PASS
pure check predecessor retirement decision evidence durable         PASS
mixed validator validation authority marked replaced where proven   PASS
active release writer retained                                      PASS
active state writer retained                                        PASS
no runtime diff                                                     PASS
no release-simcore diff                                             PASS
```

Physical deletion of every historical mixed workflow is **not** required to close RS2-3D.

---

## 49. Handoff to RS2-3E

RS2-3E must consume the resulting bounded package:

```text
permanent CI implementation identity
stable public gate identity
legacy-gate-map digest
shadow-equivalence ledger digest
retired pure-check predecessor list
mixed validators with VALIDATION_REPLACED
remaining legacy-compat IDs
remaining RS2-4 write/release holdbacks
known rollback commit
open observations/blockers
```

RS2-3E must then freeze:

```text
PERMANENT_CI_AVAILABLE claim
REQUIRED_CI_ACTIVE claim
branch-protection activation timing
minimum main-health post-activation proof
legacy authority final status
RS2-3 close record
RS2-4 callable CANDIDATE_REQUIRED handoff
rollback status after close
```

---

## 50. RS2-3D design close gate

RS2-3D design is frozen when all of the following are defined:

```text
responsibility-level retirement model                      PASS
legacy disposition classes                                 PASS
current SimCore workflow inventory direction               PASS
check-only predecessor rule                                PASS
mixed build-validator split                                PASS
superseded harness treatment                               PASS
admin/release writer holdbacks                             PASS
assertion migration ledger schema                          PASS
assertion disposition vocabulary                           PASS
behavioral-strength preservation rule                      PASS
RS2-1 coverage-state interaction                           PASS
non-Batch-A control preservation                           PASS
shadow-equivalence ledger                                  PASS
immutable comparison tuple                                 PASS
minimum positive shadows = 3                               PASS
evidence diversity rule                                    PASS
mandatory negative parity                                  PASS
reason-class parity                                        PASS
permanent-not-weaker rule                                  PASS
architecture predecessor retirement gate                   PASS
mixed-validator replacement gate                           PASS
mixed workflow quarantine                                  PASS
superseded workflow retirement gate                        PASS
branch-protection no-early-cutover rule                    PASS
CI_SELF parity rule                                        PASS
mismatch handling                                          PASS
retirement ordering                                        PASS
initial retirement matrix                                  PASS
rollback rule                                              PASS
shadow reset semantics                                     PASS
legacy-compat constraints                                  PASS
version-specific marker treatment                          PASS
frozen-surface ownership rule                              PASS
live evidence separation                                   PASS
no runtime change boundary                                 PASS
implementation self-test families                          PASS
responsibility state machine                               PASS
RS2-3E handoff package                                     PASS
runtime diff                                               NONE
release-simcore diff                                       NONE
manifest diff                                              NONE
permanent CI implementation                                NONE
legacy workflow deletion                                   NONE
```

No implementation or workflow deletion is required to close this **design** subphase.

---

## 51. Frozen final rule

> Preserve every useful assertion, but retire every obsolete mechanism only after its replacement is proved.

The intended migration is:

```text
legacy one-shot workflow
  ├─ useful semantic assertions
  │    → permanent tests/contracts
  │
  ├─ still-needed transitional assertion
  │    → bounded permanent legacy-compat lane
  │
  ├─ version-specific patch/build glue
  │    → historical / RS2-4 disposition
  │
  └─ repository writes
       → never absorbed by permanent CI
```

Permanent CI becomes authoritative because its coverage is demonstrated, not because old YAML is deleted.