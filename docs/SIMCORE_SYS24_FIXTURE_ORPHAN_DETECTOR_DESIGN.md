# SYS-24 — Fixture Orphan Detector — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_PROTECTED · READ-ONLY PERMANENT-FIXTURE AUTHORITY INTEGRITY CHECK · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-24
Idea          = Fixture Orphan Detector
Size          = SMALL
Importance    = 4 / HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_PROTECTED
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
- `products/simcore/tooling/test.mjs`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
- `docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md`
- `docs/SIMCORE_SYS23_NEGATIVE_CONTROL_REGISTRY_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`

Existing authorities SYS-24 must not replace:
- `products/simcore/tests/registry.mjs` as permanent-suite membership / harness policy authority;
- the permanent harness as fixture loading / schema / execution authority;
- individual fixture/test design authorities;
- SYS-22 as semantic test-intent / non-claim authority;
- SYS-23 as negative-control semantic registry;
- SYS-13 as proof-kind × claim-kind authority;
- CI/release workflows as execution/routing authority;
- human live evidence as LIVE_PASS authority.

---

## 1. Problem

The permanent SimCore regression portfolio is intentionally split across three physical surfaces:

```text
products/simcore/tests/registry.mjs
products/simcore/tests/suites/<suite>.test.mjs
products/simcore/tests/fixtures/<fixtureDir>/*.json
```

The harness already validates a registered row when that row is actually selected and executed.

For a selected registered suite it can fail on conditions such as:

```text
missing fixture directory
empty fixture directory
invalid fixture envelope
suite mismatch
fixture id duplication
missing runSuite export
coverage mismatch
```

That is correct execution-time behavior.

But execution-time validation does not by itself answer the repository-integrity question:

```text
Did a suite module remain in the permanent suite namespace after its registry row was removed?
Did a fixture directory remain after its owning permanent suite was retired?
Did a registry row begin pointing at a module or fixture directory that no longer exists?
Did two registry rows accidentally claim the same physical suite module or fixture directory?
```

Those conditions can leave dead regression assets or ambiguous ownership even when every currently selected registry row still passes.

SYS-24 defines a bounded, read-only **Fixture Orphan Detector** for that permanent-fixture membership graph.

It does not execute fixtures and does not decide semantic coverage.

---

## 2. Core invariant

```text
canonical permanent registry rows
+ bounded permanent suite-module namespace
+ bounded permanent fixture-directory namespace
→ exact membership / ownership graph
→ orphan-integrity disposition

orphan-integrity disposition
!= fixture execution PASS
!= semantic coverage PASS
!= test intent completeness
!= negative-control completeness
!= live validation
```

Canonical identity:

```text
SYS-24
= permanent fixture/suite membership integrity checker

NOT
= test runner
= fixture schema validator
= fixture generator
= fixture deleter
= registry writer
= coverage analyzer
= semantic contract judge
= CI router
```

---

## 3. Why v1 is `NR_PROTECTED`

SYS-24 is read-only and non-runtime, but its purpose is to **police fixture-authority membership**.

The canonical NR policy explicitly treats tooling that alters **or polices** fixture-authority surfaces as protected.

The detector answers governance questions such as:

```text
is this physical suite module an active permanent-suite asset?
is this fixture directory owned by exactly one permanent registry row?
does every permanent registry row resolve to its declared physical assets?
```

Therefore:

```text
Apply Class = NR_PROTECTED
```

A future implementation requires a dedicated protected transaction.

This classification does not mean the checker may mutate fixture authority. The frozen v1 implementation remains read-only.

It must not be implemented casually inside:
- a runtime feature transaction;
- a fixture promotion/mutation transaction;
- a release-system redesign;
- an unrelated CI cleanup.

---

## 4. Constitutional boundary with `registry.mjs`

`products/simcore/tests/registry.mjs` remains the sole permanent-suite membership authority.

Current row shape includes operational fields such as:

```text
id
module
fixtureDir
coverage
required
goldenGate
```

SYS-24 consumes only the fields needed to resolve physical ownership:

```text
id
module
fixtureDir
```

It does not redefine:

```text
coverage
required
goldenGate
packAliases
execution order
```

If SYS-24 reports an orphan, the owning human work item decides whether the correct repair is:

```text
restore registry membership
restore physical asset
remove obsolete physical asset
split/rename ownership
or declare a separately governed non-permanent surface
```

The detector never chooses or applies that repair.

---

## 5. v1 permanent namespaces

The detector is deliberately **not repo-wide**.

Frozen v1 permanent-suite namespaces are:

```text
REGISTRY
products/simcore/tests/registry.mjs

PERMANENT SUITE MODULES
products/simcore/tests/suites/*.test.mjs

PERMANENT FIXTURE DIRECTORIES
products/simcore/tests/fixtures/*/
```

These namespaces are derived from the existing RS2-1B harness contract and current harness implementation.

Anything outside them is out of SYS-24 orphan scope unless a later frozen policy explicitly adds it.

---

## 6. Explicit non-orphan surfaces

The repository also contains legitimate test/evidence surfaces that are not permanent registry suites.

Examples include root-level tests under:

```text
products/simcore/tests/*.test.mjs
```

and other subtrees such as:

```text
products/simcore/tests/equivalence/
products/simcore/tests/schema/
products/simcore/tooling/*.test.mjs
```

These MUST NOT be treated as orphaned merely because they have no row in `registry.mjs`.

Canonical rule:

> absence from the permanent registry is meaningful only inside an explicitly frozen permanent-suite namespace.

This prevents the detector from turning into a broad test-discovery policy engine.

---

## 7. Canonical graph model

For each registry row `R`:

```text
R.id
R.module
R.fixtureDir
```

resolve two directed ownership edges:

```text
R.id → suite module path
R.id → fixture directory path
```

Example shape:

```text
summary-scope
  → products/simcore/tests/suites/summary-scope.test.mjs
  → products/simcore/tests/fixtures/summary-scope/
```

The v1 detector compares:

```text
DECLARED MODULE SET
= every normalized registry `module` target

OBSERVED MODULE SET
= every file in the permanent suite-module namespace

DECLARED FIXTURE-DIR SET
= every normalized registry `fixtureDir` target

OBSERVED FIXTURE-DIR SET
= every directory in the permanent fixture namespace
```

The comparison is exact after bounded path normalization.

---

## 8. What counts as an orphan / integrity defect

### 8.1 Registry → missing module

```text
registry row exists
module target does not exist as a file
→ REGISTRY_MODULE_MISSING
```

This is a broken declared permanent-suite edge.

### 8.2 Registry → missing fixture directory

```text
registry row exists
fixtureDir target does not exist as a directory
→ REGISTRY_FIXTURE_DIR_MISSING
```

The harness already fails when executing such a suite, but SYS-24 detects it without requiring suite execution.

### 8.3 Unregistered module in permanent module namespace

```text
physical `tests/suites/*.test.mjs` file exists
no registry row points to it
→ UNREGISTERED_PERMANENT_MODULE
```

This is the canonical suite-module orphan.

### 8.4 Unregistered fixture directory in permanent fixture namespace

```text
physical `tests/fixtures/*/` directory exists
no registry row points to it
→ UNREGISTERED_PERMANENT_FIXTURE_DIR
```

This is the canonical fixture-directory orphan.

### 8.5 Duplicate module ownership

```text
two or more registry rows normalize to the same suite module
→ DUPLICATE_MODULE_OWNERSHIP
```

Even if both rows can technically resolve, permanent membership ownership is ambiguous.

### 8.6 Duplicate fixture-directory ownership

```text
two or more registry rows normalize to the same fixture directory
→ DUPLICATE_FIXTURE_DIR_OWNERSHIP
```

### 8.7 Registry path escape / unsupported target

A registry row must resolve inside the frozen namespaces.

Examples that fail:

```text
module = ../tooling/foo.test.mjs
module = ./../tests/foo.test.mjs
fixtureDir = ../shared
absolute path
symlink/path resolution escaping the frozen root when implementation resolves real paths
```

Result:

```text
REGISTRY_PATH_OUT_OF_SCOPE
```

SYS-24 does not silently broaden its scan radius to accommodate the path.

---

## 9. What is NOT an orphan in SYS-24

The following are explicitly different concerns:

```text
registered fixture directory exists but contains zero JSON fixtures
→ harness REQUIRED_FIXTURE_MISSING concern

fixture JSON has wrong suite id
→ harness fixture-schema concern

fixture has stale expected output
→ fixture correctness / mutation-review concern

suite module exists but runSuite is missing
→ harness execution contract concern

test semantic intent row is missing
→ SYS-22 concern

negative control is missing
→ SYS-23 concern

fixture no longer covers an architecture owner
→ later coverage / contract-to-fixture concern

fixture is old but still intentionally registered
→ not an orphan merely because of age

unregistered root-level `.test.mjs`
→ not an orphan unless that namespace is separately declared permanent-registry-owned
```

SYS-24 must not convert these adjacent concerns into orphan findings.

---

## 10. Naming is not authority

The detector must not assume basename equality as a semantic rule.

For example, it must not require by convention alone:

```text
id == fixtureDir == module basename
```

Current rows often follow that pattern, but the authority is the explicit registry edge.

Therefore:

```text
registry row explicitly maps id A → module B → fixtureDir C
+ both bounded targets exist and ownership is unique
→ not orphaned solely because A/B/C names differ
```

A naming-style policy would require its own frozen contract.

---

## 11. Current repository observation vs detector claim

The current registry visibly contains permanent rows such as:

```text
representation-fast
genuine-edit
community-reaction
summary-scope
narrative-clock
frame
broadcast-closure
diagnostic-copy
reload-cache-continuity
candidate-materialize
candidate-receipt
release-approval
```

The current permanent fixture namespace and suite namespace visibly contain corresponding families.

That observation motivates the graph model but does **not** create a durable `FIXTURE_GRAPH_CLEAN` proof for SYS-24, because the SYS-24 executable checker does not yet exist and has not been run.

Design-time observation therefore remains:

```text
CURRENT OBVIOUS ORPHAN = NONE OBSERVED IN REVIEWED BOUNDED LISTS
SYS-24 MACHINE CLEAN CLAIM = NOT CLAIMED
```

---

## 12. Result vocabulary

Top-level v1 result uses exactly:

```text
FIXTURE_GRAPH_CLEAN
FIXTURE_ORPHAN_PRESENT
FIXTURE_GRAPH_INVALID
FIXTURE_GRAPH_BLOCKED
```

### `FIXTURE_GRAPH_CLEAN`

Means only:

```text
registry parsed successfully
all declared module/fixtureDir targets are in scope and exist
all observed permanent suite modules are registered
all observed permanent fixture directories are registered
module ownership is unique
fixture-directory ownership is unique
```

It does not mean fixture contents pass.

### `FIXTURE_ORPHAN_PRESENT`

At least one exact missing/unregistered ownership finding exists.

### `FIXTURE_GRAPH_INVALID`

The registry/graph is structurally contradictory, for example duplicate ownership or out-of-scope path declaration.

### `FIXTURE_GRAPH_BLOCKED`

The checker cannot safely establish bounded inputs, for example:

```text
registry cannot be imported/parsed
permanent namespace cannot be read
filesystem error prevents exact observation
```

The detector fails closed instead of declaring CLEAN.

---

## 13. Reason-code vocabulary

Frozen v1 reason codes:

```text
REGISTRY_UNREADABLE
REGISTRY_ROW_INVALID
REGISTRY_MODULE_MISSING
REGISTRY_FIXTURE_DIR_MISSING
UNREGISTERED_PERMANENT_MODULE
UNREGISTERED_PERMANENT_FIXTURE_DIR
DUPLICATE_MODULE_OWNERSHIP
DUPLICATE_FIXTURE_DIR_OWNERSHIP
REGISTRY_PATH_OUT_OF_SCOPE
PERMANENT_MODULE_NAMESPACE_UNREADABLE
PERMANENT_FIXTURE_NAMESPACE_UNREADABLE
```

The implementation may include bounded path/row identifiers in findings but must not invent semantic severity.

---

## 14. Finding schema

A v1 finding should contain:

```text
code
registryId?          // when a row owns the finding
observedPath?        // when an unregistered physical asset exists
declaredPath?        // when a registry target is involved
ownerIds?            // duplicate ownership
sourceAuthority
```

Example:

```json
{
  "code": "UNREGISTERED_PERMANENT_FIXTURE_DIR",
  "observedPath": "products/simcore/tests/fixtures/example-old/",
  "sourceAuthority": "products/simcore/tests/registry.mjs"
}
```

No auto-delete recommendation is encoded as authority.

---

## 15. Frozen v1 implementation shape

Preferred future protected implementation:

```text
products/simcore/tooling/fixture-orphan-check.mjs
products/simcore/tooling/fixture-orphan-check.test.mjs
```

Optional bounded machine-readable report:

```text
--report <path>
```

The core tool must be:

```text
local
read-only
no network
no GitHub API
no branch mutation
no registry mutation
no fixture mutation
no suite mutation
no source/runtime mutation
```

No CI integration is part of the core SYS-24 implementation transaction.

If permanent CI later consumes the check as a required gate, that is a separate protected CI-authority integration decision.

---

## 16. Deterministic implementation inputs

The checker may receive or resolve only bounded repository-local paths:

```text
--registry products/simcore/tests/registry.mjs
--suite-root products/simcore/tests/suites
--fixture-root products/simcore/tests/fixtures
```

Defaults may point to the canonical paths above.

Forbidden scope-expanding inputs include:

```text
--scan-repo
--scan-tests-recursively
--github-ref
--branch
--delete-orphans
--fix
--rewrite-registry
```

Ref resolution belongs outside the tool when CI or another orchestrator eventually invokes it.

---

## 17. Registry loading rule

The implementation must treat the registry as data authority without executing arbitrary unrelated repository behavior.

Preferred bounded choices are:

```text
import the known local ESM registry module in a controlled local process
or
reuse a small registry loader already trusted by the permanent harness
```

The detector must not parse JavaScript with fragile regex solely to recover rows if a normal bounded module import can preserve exact semantics.

Any future registry format change requires SYS-24 implementation adaptation; SYS-24 must not maintain a shadow copy of registry membership.

---

## 18. Path normalization

Frozen rules:

```text
module target
= resolve registry `module` relative to products/simcore/tests/

fixture target
= resolve registry `fixtureDir` beneath products/simcore/tests/fixtures/

then require normalized/real target remains inside its frozen root
```

Use repository-relative canonical display paths in reports.

Do not compare paths by unnormalized textual spelling alone.

Symlink handling must fail closed on root escape.

---

## 19. Deterministic comparison rules

### Module side

```text
registry module targets
↔ direct files matching `*.test.mjs` in permanent suite root
```

No recursive module discovery in v1.

### Fixture side

```text
registry fixtureDir targets
↔ direct child directories of permanent fixture root
```

Files directly under the fixture root are not silently interpreted as fixture families.

Unexpected root files may be ignored by SYS-24 unless a separate fixture-layout policy says otherwise.

This keeps orphan semantics focused on permanent family ownership.

---

## 20. Relationship to harness execution

The current harness loads a registry row, resolves its fixture directory, validates fixtures, imports the suite module, and requires `runSuite`.

SYS-24 sits before/alongside execution:

```text
SYS-24
= is the permanent membership graph structurally complete and one-to-one?

permanent harness
= does a selected registered suite load and pass its fixture contract?
```

Neither result substitutes for the other.

Example:

```text
FIXTURE_GRAPH_CLEAN
+ one fixture assertion fails
→ regression FAIL remains real

FIXTURE_ORPHAN_PRESENT
+ all currently selected registered suites pass
→ repository fixture-authority drift still exists
```

---

## 21. Relationship to SYS-22 Test Intent Manifest

```text
SYS-24
= physical permanent-suite membership ownership

SYS-22
= semantic intent / allowed claims of selected test surfaces
```

A registered suite with no intent row is not a SYS-24 orphan.

An intent row pointing to a retired/nonexistent suite is not automatically a SYS-24 finding either; that is a cross-reference/intent maintenance concern unless a future explicit integration contract is frozen.

This prevents the orphan detector from absorbing semantic authority.

---

## 22. Relationship to SYS-23 Negative-Control Registry

```text
SYS-24
= is the fixture/suite asset still attached to permanent membership?

SYS-23
= what bounded forbidden semantic outcome must not occur?
```

A negative-control row without executable fixture enforcement is not a physical orphan.

A fixture directory may be fully registered yet still lack an important negative control.

The two systems compose but do not merge.

---

## 23. Relationship to future SYS-25 / SYS-26 / SYS-29

SYS-24 is a useful lower-level prerequisite for later regression-governance work.

```text
SYS-25 Golden Fixture Mutation Receipt
needs to know which permanent fixture family is actually owned/registered.

SYS-26 Coverage Promotion Readiness Scanner
should not reason about promotion while permanent fixture membership itself is orphaned/ambiguous.

SYS-29 Contract-to-Fixture Gap View
should not interpret dead/unowned fixture directories as active coverage.
```

SYS-24 does not pre-decide those designs.

---

## 24. Current known root-level tests are a negative control

The current repository contains root-level tests outside `tests/suites/`.

Those files provide an important design negative control:

```text
unregistered test file outside permanent suite namespace
→ MUST NOT produce UNREGISTERED_PERMANENT_MODULE
```

A future implementation test should create/observe an out-of-scope root-level test and prove it is ignored by SYS-24 membership logic.

This is exactly why repo-wide `*.test.mjs` crawling is forbidden.

---

## 25. Frozen focused verification plan

Future protected implementation requires at minimum:

### Positive clean fixture graph

```text
registry rows
↔ exact suite modules
↔ exact fixture directories
→ FIXTURE_GRAPH_CLEAN
```

### Missing module

```text
registered module absent
→ FIXTURE_ORPHAN_PRESENT
→ REGISTRY_MODULE_MISSING
```

### Missing fixture dir

```text
registered fixtureDir absent
→ FIXTURE_ORPHAN_PRESENT
→ REGISTRY_FIXTURE_DIR_MISSING
```

### Extra module

```text
suite-root module exists without registry edge
→ UNREGISTERED_PERMANENT_MODULE
```

### Extra fixture dir

```text
fixture-root child directory exists without registry edge
→ UNREGISTERED_PERMANENT_FIXTURE_DIR
```

### Duplicate module target

```text
two rows → same module
→ FIXTURE_GRAPH_INVALID
→ DUPLICATE_MODULE_OWNERSHIP
```

### Duplicate fixture target

```text
two rows → same fixtureDir
→ FIXTURE_GRAPH_INVALID
→ DUPLICATE_FIXTURE_DIR_OWNERSHIP
```

### Path escape

```text
registry target escapes frozen root
→ FIXTURE_GRAPH_INVALID
→ REGISTRY_PATH_OUT_OF_SCOPE
```

### Out-of-scope standalone test negative control

```text
products/simcore/tests/example.test.mjs
no registry row
→ ignored by SYS-24
```

### No mutation

Hash/byte-compare registry + suite + fixture inputs before/after checker execution where practical.

---

## 26. Exit-code semantics

Recommended future local CLI:

```text
0 = FIXTURE_GRAPH_CLEAN
1 = FIXTURE_ORPHAN_PRESENT or FIXTURE_GRAPH_INVALID
2 = FIXTURE_GRAPH_BLOCKED / invocation error
```

Exact numeric mapping is implementation detail but this three-way distinction is frozen directionally.

The checker must not return success merely because it could not inspect a required namespace.

---

## 27. No automatic cleanup

SYS-24 must never perform:

```text
rm orphan directory
rm suite module
edit registry.mjs
rename fixture family
move test files
create missing fixture
create missing registry row
```

An orphan can be evidence of either:

```text
obsolete dead asset
or
accidentally dropped ownership declaration
```

Deleting it automatically would destroy the evidence needed to choose correctly.

---

## 28. No automatic severity / gate promotion

A SYS-24 finding is a fixture-authority integrity finding.

It does not automatically mean:

```text
runtime BLOCKER
release BLOCKER
LIVE failure
fixture semantics are wrong
CI is broken
```

Blocking effect belongs to the active work/gate policy.

For example, a newly orphaned required permanent fixture during a fixture-authority transaction may block that transaction, while a historical unreferenced asset discovered in an unrelated doc-only review may be recorded for bounded cleanup.

SYS-24 reports the structural fact; owning policy decides the stop condition.

---

## 29. No implementation during design sweep

This transaction freezes only the design.

Forbidden in this transaction:

```text
create fixture-orphan-check.mjs
create fixture-orphan-check.test.mjs
change registry.mjs
change suites
change fixtures
change test harness
change CI
change release workflows
change runtime plugin
```

Apply/implementation remains HOLD under Design Sweep First.

Because SYS-24 is `NR_PROTECTED`, its later implementation requires a dedicated protected transaction even if the core checker remains read-only.

---

## 30. Acceptance criteria

SYS-24 design is frozen when all are true:

```text
permanent namespace is explicit
registry remains sole membership authority
orphan definitions are exact and symmetric
root-level/standalone tests are protected from false orphan classification
duplicate ownership and path escape are fail-closed
harness/schema/semantic coverage concerns remain separate
SYS-22 and SYS-23 boundaries are explicit
future implementation is read-only
fixture-authority policing is classified NR_PROTECTED
CI integration is excluded from core v1
no runtime/release mutation occurs
```

All are satisfied by this document.

---

## 31. Frozen verdict

```text
SYS-24 Fixture Orphan Detector
= DESIGN FROZEN
= SMALL / I4 / D2
= NON_RUNTIME
= NR_PROTECTED
= READ-ONLY PERMANENT-FIXTURE MEMBERSHIP INTEGRITY CHECK
= IMPLEMENTATION HOLD
= OPEN DESIGN QUESTIONS 0
```

Canonical contract:

```text
registry-owned permanent-suite graph
→ exact bounded membership comparison
→ detect missing, unregistered, duplicate-owned, or out-of-scope fixture/suite assets
→ never mutate or semantically reinterpret them
```

Production boundary:

```text
plugin bytes = unchanged
release-simcore = unchanged
runtime semantics = unchanged
fixture files = unchanged
registry = unchanged
CI/release authority = unchanged
```
