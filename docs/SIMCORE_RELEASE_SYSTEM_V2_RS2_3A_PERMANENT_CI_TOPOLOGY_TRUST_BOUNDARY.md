# SimCore Release System v2 — RS2-3A Permanent CI Topology & Trust Boundary

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior phase close: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`
Durable-test contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
First permanent regression pack: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1C_FIRST_REGRESSION_PACK.md`
State checker contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
Phase: `RS2-3 — Permanent CI`
Subphase: `RS2-3A — Permanent CI Topology & Trust Boundary`
Authority class: release-infrastructure design / permanent read-only verification topology

---

## 1. Purpose

RS2-3 turns the durable tests from RS2-1 and the read-only state checker from RS2-2 into one stable CI surface that no longer depends on creating a new executable workflow for each SimCore mini release.

RS2-3A freezes the **topology and trust boundary** of that permanent CI system before trigger matrices, exact path maps, permission details, artifact schemas, or legacy retirement are finalized.

The central questions are:

```text
Where does permanent CI live?
Which repository authority hosts the CI logic?
What source is tested for each CI profile?
Which code is trusted as CI machinery and which code is merely input under test?
How does a candidate work branch get tested without making release-simcore a workflow authority?
Which stable check name becomes the public gate?
How do main PRs avoid required-check path-filter deadlocks?
How are stale CI runs canceled without reintroducing main-write races?
How does RS2-4 later call the same verifier without duplicating it?
```

RS2-3A freezes those answers.

It does **not**:

```text
implement simcore-ci.yml
change SimCore runtime behavior
modify release-simcore
modify product-manifest.json
modify machine-managed documentation blocks
replace the release transaction
retire existing one-shot workflows
change branch protection
create a new main writer
create a new release-simcore writer
```

---

## 2. Core principle — CI is a verifier, never a deployer

Permanent CI is read-only with respect to repository authority.

```text
CI may:
  read main
  read materialized release-simcore
  read a materialized candidate commit
  execute deterministic tests in a bounded runner
  emit bounded reports/artifacts
  return GitHub check status

CI may not:
  git push
  update refs
  merge a PR
  commit a candidate
  update main
  update release-simcore
  rewrite product-manifest.json
  call repo-main-write.py
  deploy plugin files
  promote LIVE state
```

This is a hard boundary.

A CI workflow that needs repository write permission is outside the RS2-3 permanent-CI contract.

Release writes belong to RS2-4.

State/document writes belong to the RS2-2 operational synchronization path and its outer orchestrator.

---

## 3. Current repository evidence

### 3.1 Parent plan already names the permanent workflow

The Release System v2 parent plan targets:

```text
.github/workflows/simcore-ci.yml
```

and expects it to run accumulated SimCore static and regression gates.

RS2-3A preserves that path as the public permanent CI workflow.

### 3.2 A stable read-only architecture check already exists

The current repository contains:

```text
.github/workflows/simcore-architecture-contracts.yml
```

It already demonstrates a useful permanent-CI property:

```text
permissions: contents: read
```

It materializes production `latest.js` / `install.js`, checks syntax and identity, and validates Architecture Contracts v2 without modifying production.

This is a positive structural control.

RS2-3 must eventually absorb equivalent coverage rather than create a second permanent architecture authority forever.

### 3.3 Version-specific build workflows remain executable release-era machinery

The repository also contains version-specific workflow families such as:

```text
simcore-06406-post-bend-c-clock-handoff.yml
simcore-06406-post-bend-c-clock-handoff-v2.yml
simcore-06406-closure-completion-gate.yml
simcore-06406-closure-completion-gate-v2.yml
```

The robust v0.64.6 closure workflow is an example of why permanent CI is needed.

It contains useful regression assertions, but it also:

```text
requires contents: write
checks out a named version work branch
loads a version-specific patch script
runs version-specific fixtures
commits validated plugin files
pushes the work branch
```

That workflow is not a valid permanent-CI template because it mixes verification and candidate mutation.

RS2-3 extracts the durable verification role only.

### 3.4 State synchronization remains separate

The current release-state workflow already has a different responsibility:

```text
resolve deployed identity
update declared state / documents
land bounded main payload through repo-main-write.py
```

RS2-3 must not absorb that write role.

The permanent CI may call the read-only:

```text
sync-state --check
```

contract after RS2-2 implementation is operational.

It must never call `sync-state --write` as CI repair.

---

## 4. GitHub Actions platform constraints incorporated into the design

RS2-3A records four platform behaviors as design inputs.

### 4.1 Required checks and workflow-level path filters

A workflow that is skipped because its top-level branch/path filter does not match can leave an associated required check pending.

Therefore a future branch-protection-required SimCore check must not rely on a workflow disappearing entirely for unrelated PRs.

The stable PR workflow must start, classify scope internally, and produce a terminal required check result.

### 4.2 Fork PR trust

Ordinary `pull_request` workflows from forks operate with restricted credentials and no repository secrets by default.

RS2-3 adopts that safer trust model.

Permanent CI does not require write tokens or secrets for ordinary verification.

### 4.3 `pull_request_target` is not a test-execution substitute

RS2-3 does not execute untrusted PR code through `pull_request_target` with base-repository write authority.

`pull_request_target` is outside the ordinary permanent SimCore CI design.

### 4.4 Concurrency is not a repository-write lock

GitHub Actions concurrency can cancel stale runs, and current GitHub behavior also supports queued concurrency when explicitly requested.

RS2-3 uses concurrency only to manage **read-only CI freshness and resource use**.

It does not reuse the repository main-write coordination group and does not pretend CI concurrency is a deployment lock.

---

## 5. Permanent workflow authority

The canonical permanent CI workflow path is frozen as:

```text
.github/workflows/simcore-ci.yml
```

The file lives on `main` because `main` is the authority for:

```text
release infrastructure design
permanent tests
contracts
administrative tooling
CI policy
```

`release-simcore` remains production-code/deployment authority and does not become CI-policy authority.

Therefore:

```text
main
  owns CI machinery

release-simcore
  supplies deployed source bytes when production is under test

candidate work commit
  supplies proposed source bytes when a candidate is under test
```

This three-way split is intentional.

---

## 6. Trusted CI machinery vs source under test

The permanent topology distinguishes:

```text
TRUSTED CI MACHINERY
  simcore-ci.yml
  permanent harness
  fixture registry
  architecture/static contracts
  sync-state checker implementation
  CI profile/classifier code

SOURCE UNDER TEST
  production latest.js/install.js
  candidate latest.js/install.js
  bounded manifest/docs inputs for state-check profiles
```

A candidate source does not get to provide its own test runner merely because it is the candidate.

For candidate validation, CI resolves candidate source bytes and feeds them into the trusted permanent harness.

This prevents a candidate branch from proving itself by replacing its own verifier.

### 6.1 Main PRs that intentionally change the verifier

A PR that changes:

```text
.github/workflows/simcore-ci.yml
products/simcore/tests/**
products/simcore/tooling/**
products/simcore/contracts/**
state-sync registry/checker policy
```

is a verifier/self-change PR.

Permanent CI may execute the proposed machinery in the normal read-only PR sandbox, but the resulting green check is **not by itself sufficient evidence that the trust boundary is unchanged**.

Such changes require explicit review and, during RS2-3 adoption, shadow/equivalence evidence against the prior verifier.

RS2-3D owns the exact self-change promotion rule.

---

## 7. Why release-simcore pull_request is not the primary permanent-CI host

The production branch intentionally does not need to mirror all main infrastructure files.

A workflow attached directly to `pull_request -> release-simcore` would require the workflow definition and supporting tooling to exist in the release branch or otherwise duplicate infrastructure authority there.

RS2-3 rejects that authority duplication.

Instead:

```text
main-hosted permanent CI
  ↓
resolves an immutable candidate commit
  ↓
materializes only candidate plugin source
  ↓
runs trusted main-hosted verifier
```

RS2-4 may later make that call mandatory inside the permanent release transaction.

Until RS2-4, the existing release mechanism remains available.

---

## 8. Permanent CI execution profiles

RS2-3A freezes four logical profiles.

```text
PR_MAIN
MAIN_HEALTH
CANDIDATE_SHADOW
CANDIDATE_REQUIRED
```

The exact event/argument matrix is finalized in RS2-3B.

### 8.1 `PR_MAIN`

Purpose:

```text
validate SimCore infrastructure/tests/contracts/state-policy changes proposed to main
provide a stable required check on main PRs
return a bounded NOOP success for unrelated repository PRs
```

Source model:

```text
CI machinery / changed infrastructure
  <- PR content in read-only sandbox

production source baseline
  <- release-simcore resolved once to immutable commit
```

The main PR is not allowed to invent a different production branch merely to make the test pass.

### 8.2 `MAIN_HEALTH`

Purpose:

```text
re-check the canonical landed main state
verify permanent tests against current production
verify state-sync consistency when applicable
catch post-merge/replay drift
```

This is read-only repository health validation.

It is not a deployment event.

### 8.3 `CANDIDATE_SHADOW`

Purpose:

```text
validate a SimCore work/candidate commit with the permanent suite
compare permanent CI results against retained legacy gates during adoption
produce no deployment/write authority
```

A human-supplied branch/ref may be accepted for convenience only if the workflow immediately resolves it to one immutable commit and records that resolved commit before testing.

All later source reads in the run use that immutable commit.

### 8.4 `CANDIDATE_REQUIRED`

Purpose:

```text
future RS2-4 release workflow invocation
```

This profile is callable by the future permanent release transaction through the frozen permanent CI interface.

Its candidate identity must be immutable.

Directionally:

```text
candidateCommit = exact commit SHA
```

not:

```text
candidateBranch = moving branch read repeatedly during the run
```

RS2-4 decides how successful required CI is bound to promotion.

RS2-3 only defines the verifier.

---

## 9. Event topology

The future permanent workflow is directional as:

```text
on:
  pull_request:        -> PR_MAIN
  push(main):          -> MAIN_HEALTH
  workflow_dispatch:   -> manual MAIN_HEALTH or CANDIDATE_SHADOW
  workflow_call:       -> future CANDIDATE_REQUIRED / bounded reuse
```

Exact event filters and input schemas are RS2-3B authority.

### 9.1 No workflow-level PR `paths` filter for the stable required check

The required PR workflow must always create its public terminal check.

Therefore:

```text
pull_request:
  paths: [...]
```

must not be used as the mechanism that makes the required SimCore check disappear on unrelated PRs.

Instead:

```text
workflow starts
→ classify changed paths
→ relevant jobs run or become explicit NOT_APPLICABLE
→ required aggregator always reports
```

### 9.2 Push filtering may be narrower

`MAIN_HEALTH` does not need to be the same branch-protection-required check surface as PR validation.

RS2-3B may therefore use bounded push path filters or internal classification for resource efficiency, provided state/CI self-change coverage is not lost.

---

## 10. Public required check contract

RS2-3A freezes one stable public gate name:

```text
SimCore CI / Required
```

Branch protection, when later authorized, should depend on this stable aggregator rather than a long list of internal job names.

Internal job names may evolve while preserving the public gate contract.

Directionally:

```text
classify
materialize
static-contracts
regression
state-check
required
```

The final:

```text
required
```

job runs with an `always()`-style aggregation rule and explicitly interprets every relevant upstream result.

It must not accidentally succeed because a required dependency was skipped after another job failed.

### 10.1 Explicit NOT_APPLICABLE is allowed

Unrelated main PR:

```text
static-contracts = NOT_APPLICABLE
regression       = NOT_APPLICABLE
state-check      = NOT_APPLICABLE
required         = PASS / NOOP
```

A NOOP is success only when the classifier proves the PR is outside SimCore CI scope.

It is not a way to hide a failed SimCore check.

---

## 11. Scope classification vocabulary

RS2-3A freezes an initial logical vocabulary for internal classification:

```text
SIMCORE_RUNTIME_CANDIDATE
SIMCORE_TEST_INFRA
SIMCORE_STATE_SURFACE
SIMCORE_POLICY_DOC
SIMCORE_CI_SELF_CHANGE
UNRELATED
```

One change may belong to multiple classes.

Examples:

```text
products/simcore/tests/**
  -> SIMCORE_TEST_INFRA

product-manifest.json
or registered state-sync targets/tooling
  -> SIMCORE_STATE_SURFACE

.github/workflows/simcore-ci.yml
  -> SIMCORE_CI_SELF_CHANGE

Usage Dashboard-only change
  -> UNRELATED for SimCore CI
```

Exact paths and combinations are RS2-3B authority.

Classification never grants repository write permission.

---

## 12. Source materialization contract

Every run records the exact source identities it tested.

### 12.1 Production materialization

When production is the source under test:

```text
fetch release-simcore
resolve once to commit P
materialize:
  P:plugins/simcore/latest.js
  P:plugins/simcore/install.js
verify local equality / syntax as required
record P and blob identities
```

No later `origin/release-simcore` re-resolution may silently change the source within the same job graph.

### 12.2 Candidate materialization

When a candidate is the source under test:

```text
resolve requested candidate once to commit C
verify C is accessible
materialize candidate latest.js/install.js from C
record C
run all candidate gates against those bytes
```

The candidate branch is input discovery only.

The commit is execution authority for that run.

### 12.3 CI machinery identity

Reports also record the main/workflow commit that supplied the verifier.

Conceptually:

```text
verifierCommit
productionCommit | candidateCommit
fixtureRegistryVersion
contractVersion
```

This makes later attribution possible when the same candidate produces different results under a changed permanent harness.

---

## 13. Durable-test integration

RS2-1 already established the runner boundary:

```text
node products/simcore/tooling/test.mjs --source <path> --suite <suite-or-pack>
```

Permanent CI invokes that contract rather than re-embedding fixture code in workflow YAML.

The YAML owns orchestration only.

It does not own test semantics.

Directionally:

```text
workflow
  -> materialize source
  -> test.mjs
  -> bounded result
```

This is the main mechanism by which one-shot fixture logic leaves version-specific workflow files.

---

## 14. State-check integration

RS2-2 hands RS2-3 a read-only checker:

```text
sync-state --check
```

Permanent CI may invoke it only in profiles where the source/manifest comparison is semantically valid.

Examples:

```text
PR_MAIN state-surface change
MAIN_HEALTH
post-state-sync verification
```

It is not automatically valid for an undeployed runtime candidate because the manifest is expected to describe deployed production, not the candidate.

Therefore:

```text
runtime candidate != declared production
```

is not by itself a state-sync contradiction.

RS2-3B freezes exact profile applicability.

---

## 15. Architecture/static contract integration

The current `simcore-architecture-contracts.yml` coverage becomes one permanent CI check family.

Directionally:

```text
syntax
latest/install identity
Architecture Contracts v2
frozen-surface/static contract checks
forbidden API/side-effect checks
```

move behind permanent runner/tooling interfaces.

The existing architecture workflow is retained until RS2-3D proves replacement equivalence.

No deletion occurs in RS2-3A.

---

## 16. Concurrency model

Permanent CI is read-only, so its concurrency policy optimizes freshness rather than branch serialization.

### 16.1 PR profile

Directional group:

```text
simcore-ci-pr-<PR number>
```

Desired behavior:

```text
new head commit arrives
→ obsolete run may be canceled
→ newest head must receive the terminal required result
```

Therefore `cancel-in-progress: true` is appropriate for the PR freshness profile.

The old head cannot satisfy a required check for the new head anyway.

### 16.2 Main health

Directional group:

```text
simcore-ci-main-health
```

Read-only main health normally cares about the newest main state.

Stale health runs may be canceled unless RS2-3C identifies an evidence reason to queue them.

### 16.3 Candidate shadow

Directional group:

```text
simcore-ci-candidate-<resolved identity>
```

Duplicate runs for the same moving candidate may collapse to the latest requested source identity.

An immutable candidate commit already under active evidence capture must remain attributable even if another commit is later tested.

Exact grouping is RS2-3C authority.

### 16.4 No main-write concurrency group

Do not use:

```text
simcore-main-state-sync
usage-dashboard-release
usage-dashboard-project-memory
repo main writer groups
```

as CI concurrency groups.

Those groups exist to protect writers.

Permanent CI does not write.

This separation also prevents SimCore CI from delaying Usage Dashboard administrative writes.

---

## 17. Permissions trust boundary

Baseline permanent CI permission direction is:

```text
contents: read
```

Additional scopes, if any, require explicit RS2-3C justification.

Permanent test jobs do not need:

```text
contents: write
pull-requests: write
issues: write
actions: write
id-token: write
packages: write
```

for ordinary verification.

Secrets are not part of the ordinary CI test contract.

A test that only passes because a secret/write token is present is not an eligible ordinary permanent regression test.

---

## 18. Fork / untrusted PR rule

Ordinary PR verification uses:

```text
pull_request
read-only token
no repository secrets
GitHub-hosted isolated runner
```

The workflow may execute deterministic repository test tooling, but there is no repository write capability to steal.

Do not switch to `pull_request_target` merely because a fork lacks write credentials.

Lack of write credentials is a desired property for permanent CI.

If a future check truly requires privileged infrastructure, it belongs in a separately trusted post-review profile, not in ordinary untrusted PR execution.

---

## 19. External action / dependency principle

Permanent CI should minimize third-party action surface.

Directional rule:

```text
built-in shell/node/python tooling
+ approved GitHub-maintained actions where necessary
```

External actions must be explicitly reviewed and pinned according to the repository's future CI security policy.

Exact pinning/allowlist requirements are RS2-3C authority.

Do not add a new package-manager dependency merely to reproduce an assertion that the permanent harness can implement locally.

---

## 20. Check result semantics

The permanent CI public outcome is intentionally smaller than every internal assertion.

Top-level gate result:

```text
PASS
FAIL
INFRA_ERROR
NOOP
```

Internal durable test results retain their own RS2-1 vocabulary.

State check retains its RS2-2 vocabulary.

The aggregator maps them without erasing the original bounded reason codes.

Conceptually:

```text
required PASS
  <- every applicable required check passed

required FAIL
  <- at least one applicable semantic gate failed

required INFRA_ERROR
  <- CI could not establish trustworthy execution/input

required NOOP
  <- classifier proved SimCore was not in scope
```

NOOP renders as successful GitHub check status but remains distinguishable in bounded report output.

---

## 21. Failure artifacts and reports

RS2-3A freezes only the principle:

```text
bounded structured report
no full private/unbounded chat diagnostics
no entire source file copied merely because a test failed
no secret/token dump
```

Candidate/source identity and failed assertion IDs must be retained.

Exact artifact naming, retention, log summaries, and whether PASS artifacts are uploaded are RS2-3C authority.

---

## 22. No auto-repair in CI

Permanent CI must not respond to drift/failure by mutating the repository.

Forbidden examples:

```text
state check DRIFT
→ auto-run sync-state --write

latest/install mismatch
→ copy latest over install

manifest drift
→ rewrite manifest from release-simcore

fixture failure
→ weaken expected value
```

The workflow reports the failure and stops.

Repair belongs to the owner of that authority.

---

## 23. Relationship to current release behavior

RS2-3 must preserve existing release behavior while permanent CI is adopted.

The initial operational relationship is:

```text
permanent CI
  = read-only verifier / shadow evidence

existing version-specific release/build path
  = retained operational fallback/authority where still required
```

RS2-3 does not claim that adding `simcore-ci.yml` alone replaces the current release mechanism.

That replacement boundary belongs to RS2-4.

---

## 24. Legacy workflow classes

RS2-3A freezes three disposition classes for existing workflows.

### 24.1 Permanent-check predecessor

Example:

```text
simcore-architecture-contracts.yml
```

Disposition:

```text
REPLACEMENT_ELIGIBLE_AFTER_EQUIVALENCE
```

### 24.2 Version-specific validation/build workflow

Examples include v0.64.6 clock/closure workflows.

They mix valuable assertions with version-specific candidate mutation.

Disposition:

```text
VALIDATION_PORTION_REPLACEMENT_ELIGIBLE
WRITE/DEPLOY PORTION RETAINED UNTIL RS2-4 DISPOSITION
```

### 24.3 State/release administrative writer

Example:

```text
simcore-release-state-sync.yml
```

Disposition:

```text
OUTSIDE RS2-3 RETIREMENT AUTHORITY
```

RS2-3 may consume its resulting state through read-only checks.

RS2-4 owns permanent release/write replacement.

---

## 25. No workflow deletion during initial permanent-CI installation

The first `simcore-ci.yml` implementation is additive.

It does not delete old workflows in the same initial installation commit.

Required sequence direction:

```text
install permanent CI
→ shadow against retained legacy checks
→ prove mapped equivalence
→ classify replacement coverage
→ retire only eligible check-only predecessors
→ keep deployment/write authority until RS2-4
```

This preserves evidence attribution and rollback.

---

## 26. CI self-change safety

Permanent CI cannot fully certify a change that rewrites its own execution authority.

Therefore changes to the following form a protected self-change surface:

```text
.github/workflows/simcore-ci.yml
permanent CI classifier
permanent test runner
fixture registry schema
contract runner security boundary
```

Such a PR requires:

```text
normal read-only CI result
+ explicit self-change classification
+ shadow/equivalence evidence when changing required semantics
+ human review
```

A workflow edit may not erase its own required gate by changing path filters/check names and still claim equivalent permanent CI.

RS2-3D freezes the exact promotion/retirement proof.

---

## 27. Stable public gate vs internal check evolution

The public required name stays:

```text
SimCore CI / Required
```

Internal checks may be added as permanent regression coverage grows.

Examples:

```text
SimCore CI / Static Contracts
SimCore CI / Regression Pack
SimCore CI / State Check
SimCore CI / Harness Self-Test
```

Branch protection should not need to change every time an internal fixture family is added.

The aggregator is the compatibility boundary.

---

## 28. No required-check deadlock through internal skipping

The final aggregator must explicitly run even when prior jobs fail or skip.

Directionally:

```text
if: always()
needs:
  - classify
  - static-contracts
  - regression
  - state-check
```

Then it verifies:

```text
applicable gate success     -> PASS
proved not applicable       -> accepted NOT_APPLICABLE
unexpected skipped/canceled -> FAIL or INFRA_ERROR
```

A dependency being skipped because an earlier dependency failed is not silently treated as success.

Exact mapping is RS2-3B/3C authority.

---

## 29. Main-health and state consistency

After RS2-2 implementation becomes operational, landed main must be checkable without mutation.

Directionally:

```text
MAIN_HEALTH
  → materialize deployed production identity
  → durable harness self/production checks
  → sync-state --check
  → bounded public health result
```

Human current-state observations from RS2-2 may remain nonblocking according to the RS2-2 severity contract.

RS2-3 does not upgrade OBSERVATION to BLOCKER merely because the check is now running in CI.

---

## 30. Candidate validation and deployed-state validation are distinct

Permanent CI must never compare an undeployed candidate to the production manifest and call the expected difference an identity failure.

The profiles remain distinct:

```text
CANDIDATE validation
  candidate bytes vs candidate contracts/release expectations

DEPLOYED STATE validation
  manifest vs actual release-simcore production
```

RS2-4 later orders these stages in the release transaction.

RS2-3 only preserves the semantic boundary.

---

## 31. One permanent workflow, data-driven accumulated suites

Routine regression growth should happen by adding:

```text
fixture files
fixture registry entries
contract records
bounded release metadata
```

not by adding:

```text
simcore-<version>-new-fix.yml
simcore-<version>-new-fix-v2.yml
```

The permanent workflow must not encode release-number-specific assertion branches as its normal growth model.

If a temporary diagnostic workflow is needed during an incident, its evidence must later be either:

```text
migrated into permanent harness
or explicitly classified non-durable
```

before retirement.

---

## 32. Interaction with urgent runtime fixes

RS2-3 infrastructure must never block an urgent correctness mini by forcing unfinished CI migration into the runtime release.

If permanent CI is not yet promoted:

```text
use last verified release path
ship narrow correctness fix
record evidence
resume RS2-3 separately
```

Do not combine:

```text
runtime semantic change
+
permanent CI architecture migration
```

in one work item.

---

## 33. RS2-3 subphase map

RS2-3 detailed design is divided into five subphases.

```text
RS2-3A  Permanent CI Topology & Trust Boundary
RS2-3B  Trigger / Check Matrix & Path Classification
RS2-3C  Permissions / Concurrency / Reports & Artifact Safety
RS2-3D  Shadow Equivalence / Legacy Gate Retirement
RS2-3E  Promotion / Close Gate & RS2-4 Handoff
```

This map is frozen unless implementation evidence exposes a missing safety boundary.

### 33.1 RS2-3A

Owns:

```text
one permanent workflow authority
read-only verifier boundary
execution profiles
source materialization model
stable public required check
trusted machinery vs source-under-test split
subphase map
```

### 33.2 RS2-3B

Must freeze:

```text
exact on: event matrix
workflow_call / workflow_dispatch inputs
exact main PR path classifier
which check families apply to each profile/class
required vs optional check matrix
NOT_APPLICABLE rules
candidate source eligibility
state-check applicability
stable internal job names
aggregator result mapping
```

### 33.3 RS2-3C

Must freeze:

```text
minimum GITHUB_TOKEN permissions
fork/untrusted behavior
external action pinning policy
network/dependency policy
concurrency group expressions
cancel vs queue semantics
artifact/report schema
retention
log redaction
runner/runtime versions
resource/time bounds
```

### 33.4 RS2-3D

Must freeze:

```text
shadow run protocol
legacy assertion mapping
exact/compatible/partial equivalence use
which old checks become replacement-eligible
one-shot workflow inventory/disposition
CI self-change proof
retirement ordering
rollback of CI authority
```

### 33.5 RS2-3E

Must freeze:

```text
PERMANENT_CI_AVAILABLE claim
REQUIRED_CI_ACTIVE claim
legacy check retirement status
minimum successful shadow evidence
close criteria
fallback status
RS2-4 entry package
which candidate-verification interface RS2-4 must call
```

---

## 34. Expected permanent CI topology

Conceptual topology:

```text
                  main
                   │
        .github/workflows/simcore-ci.yml
                   │
                   ▼
               CLASSIFY
              /   |    \
             /    |     \
            ▼     ▼      ▼
       MATERIALIZE   STATE INPUT
        SOURCE(S)        │
            │            │
       ┌────┴────┐       │
       ▼         ▼       ▼
 STATIC/ARCH   REGRESSION   STATE CHECK
       │         │          │
       └─────────┴──────────┘
                  │
                  ▼
          SimCore CI / Required
```

No arrow points from CI back to repository mutation.

---

## 35. Future RS2-4 relationship

RS2-4 must consume the permanent CI interface rather than reimplement its assertions in `simcore-release.yml`.

Target directional relationship:

```text
simcore-release.yml
  → establish immutable candidate commit
  → call permanent CI CANDIDATE_REQUIRED
  → require PASS
  → only then perform deployment transaction
```

The release workflow may own deployment orchestration.

It may not fork a second divergent regression suite.

If RS2-4 needs a release-specific check, that check should be expressed as bounded release metadata consumed by the permanent verifier where practical.

---

## 36. Design decisions explicitly deferred to RS2-3B/C/D/E

RS2-3A does not yet freeze:

```text
exact path glob list
exact workflow_dispatch input names
exact workflow_call schema
exact candidate eligibility graph
exact timeout minutes
exact runner image / node version
exact artifact retention days
exact external action SHA pins
exact concurrency expressions
exact branch-protection activation timing
exact one-shot workflow deletion list
exact shadow run count
exact permanent CI close record
```

Those are intentionally deferred, not forgotten.

---

## 37. Required future fixture / self-test families

Permanent CI implementation must itself become testable.

Initial meta-test families include:

```text
unrelated main PR -> required NOOP success
SimCore infra PR -> applicable gates run
failed regression -> required fails
unexpected skipped gate -> required fails
state DRIFT -> required reflects profile policy
state OBSERVATION only -> follows RS2-2 nonblocking rule
candidate ref resolves once -> immutable commit used
candidate branch moves mid-run -> tested commit unchanged
latest/install mismatch -> fail
fork-style read-only execution -> no write dependency
workflow has no repository push step
no pull_request_target test execution
required workflow not skipped by PR path filter
stale PR run cancellation does not affect newest head result
CI report contains bounded identities only
```

Exact executable form is RS2-3 implementation authority.

---

## 38. RS2-3A implementation prerequisites

Before implementing the permanent workflow:

```text
RS2-1 implementation close status available      REQUIRED
RS2-2 implementation close / operational checker REQUIRED
current release path retained                     REQUIRED
no runtime semantic change in same work item      REQUIRED
permanent harness callable locally                REQUIRED
sync-state --check callable locally               REQUIRED
```

Detailed design may proceed before those implementation prerequisites are satisfied because design itself does not alter production.

---

## 39. RS2-3A design close gate

RS2-3A design is complete when:

```text
canonical permanent workflow path defined                  PASS
CI read-only/non-deployer rule defined                     PASS
main as CI policy authority defined                        PASS
release-simcore as source authority preserved              PASS
trusted machinery vs source-under-test split defined       PASS
release-simcore direct workflow duplication rejected       PASS
PR_MAIN profile defined                                    PASS
MAIN_HEALTH profile defined                                PASS
CANDIDATE_SHADOW profile defined                           PASS
CANDIDATE_REQUIRED future profile defined                  PASS
event topology direction defined                           PASS
workflow-level PR path-filter deadlock avoided             PASS
stable public required check name defined                  PASS
internal aggregator model defined                          PASS
NOT_APPLICABLE/NOOP semantics defined                      PASS
scope classification vocabulary defined                    PASS
production immutable materialization defined               PASS
candidate immutable materialization defined                PASS
verifier identity attribution defined                      PASS
RS2-1 harness integration boundary defined                 PASS
RS2-2 check integration boundary defined                   PASS
architecture-contract migration direction defined          PASS
read-only concurrency principle defined                    PASS
write concurrency groups excluded                          PASS
fork/untrusted read-only rule defined                      PASS
pull_request_target ordinary test path rejected            PASS
no CI auto-repair rule defined                             PASS
legacy workflow classes defined                            PASS
initial additive/no-delete adoption rule defined           PASS
CI self-change protected surface defined                   PASS
candidate vs deployed-state semantics separated            PASS
one permanent workflow / data-driven growth rule defined   PASS
RS2-3 A->E subphase map defined                            PASS
RS2-4 permanent-CI reuse direction defined                 PASS
runtime diff                                                NONE
release-simcore diff                                        NONE
manifest diff                                               NONE
state-doc diff                                              NONE
permanent CI implementation                                NONE
legacy workflow deletion                                    NONE
```

No implementation is required to close the **design** subphase.

---

## 40. Handoff to RS2-3B

RS2-3B must turn this topology into the exact trigger/check matrix.

At minimum it must decide:

```text
exact YAML on: event shapes
whether push(main) uses paths or classifier-only gating
exact workflow_dispatch profiles and immutable-resolution rules
exact workflow_call candidate identity input
exact changed-path classifier map
which profile runs syntax / identity / contracts / regression / state check
which checks are required vs observational
how PR CI self-change is classified
how unrelated repo PRs reach NOOP success
how required aggregator handles success/failure/cancel/skipped
whether state OBSERVATION affects the public required result
which candidate sources are accepted during shadow adoption
how main-health check scopes state-sync files
```

RS2-3B must preserve the no-write boundary frozen here.

---

## 41. Frozen final rule

> Permanent CI owns verification policy, not repository state.

For RS2-3 the intended boring steady state is:

```text
one stable workflow
one stable required check name
one permanent accumulated harness
one read-only state checker
immutable source identities per run
no release-number-specific workflow growth
no repository writes
no hidden auto-repair
no trust-boundary escalation for fork PRs
```

The workflow should become less interesting as the regression suite becomes more capable.

That is the goal.
