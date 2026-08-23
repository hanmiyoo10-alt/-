# SimCore Release System v2 — RS2-3B Trigger / Check Matrix & Path Classification Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
Durable-test contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
State-check contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
RS2-2 close gate: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-3 — Permanent CI`
Subphase: `RS2-3B — Trigger / Check Matrix & Path Classification`
Authority class: release-infrastructure design / permanent read-only CI routing contract

---

## 1. Purpose

RS2-3A froze where permanent CI lives and what it is allowed to trust.

RS2-3B freezes the next layer:

> Given one GitHub event or one reusable-workflow call, which SimCore CI profile is active, which exact source identities are tested, which internal gates are applicable, and how does the stable public gate terminate?

The goal is to remove release-number-specific trigger logic from CI while avoiding two opposite failures:

```text
UNDER-TRIGGER
  relevant SimCore change receives no meaningful verification

OVER-TRIGGER
  unrelated repository work repeatedly runs the entire SimCore suite
```

The permanent workflow must therefore be:

```text
always terminal as a required PR check
internally scope-aware
read-only
identity-bound
profile-driven
data-driven where the suite grows
```

This document does **not** implement `.github/workflows/simcore-ci.yml`, change branch protection, alter runtime behavior, modify `release-simcore`, repair state drift, delete legacy workflows, or replace the release transaction.

---

## 2. Inherited non-negotiable rules

RS2-3B inherits these RS2-3A rules unchanged.

```text
canonical workflow     .github/workflows/simcore-ci.yml
public required name   SimCore CI / Required
repository writes      FORBIDDEN
push/ref mutation       FORBIDDEN
sync-state --write      FORBIDDEN
repo-main-write.py      FORBIDDEN
ordinary PR trigger     pull_request
pull_request_target     not an ordinary test-execution path
release-simcore         source authority, not workflow-policy authority
candidate identity      immutable commit identity per run
```

The internal matrix may decide whether a read-only gate is applicable.

It may not expand CI into deployment authority.

---

## 3. Frozen execution profiles

The permanent CI exposes exactly four semantic profiles.

```text
PR_MAIN
MAIN_HEALTH
CANDIDATE_SHADOW
CANDIDATE_REQUIRED
```

Profiles are semantic contracts, not aliases for event names.

### 3.1 PR_MAIN

Purpose:

```text
verify one pull request targeting main
classify changed paths
run only applicable SimCore gates
always terminate SimCore CI / Required
```

The PR may be:

```text
UNRELATED
DOC_ONLY
STATE_RELEVANT
HARNESS_RELEVANT
CONTRACT_RELEVANT
CI_SELF_RELEVANT
LEGACY_VERIFICATION_RELEVANT
multi-class
```

### 3.2 MAIN_HEALTH

Purpose:

```text
verify landed main infrastructure against deployed production
run the full permanent baseline suite
run state consistency check
produce health evidence independent of PR diff classification
```

`MAIN_HEALTH` does not treat changed paths as permission to skip the baseline.

### 3.3 CANDIDATE_SHADOW

Purpose:

```text
verify an immutable candidate commit
without granting release authority
without branch-protection authority
without mutating candidate or production
```

It is used during RS2-3 shadow adoption and may also remain a manual diagnostic profile later.

### 3.4 CANDIDATE_REQUIRED

Purpose:

```text
future RS2-4 release transaction calls the same permanent verifier
candidate must pass before deployment may proceed
```

This profile is callable, not manually promoted into release authority by a human dispatch.

`CANDIDATE_REQUIRED` remains read-only.

---

## 4. Exact event topology

The future workflow event surface is frozen conceptually as:

```yaml
on:
  pull_request:
    branches: [main]
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review

  push:
    branches: [main]

  workflow_dispatch:
    inputs:
      profile:
        type: choice
        required: true
        options:
          - MAIN_HEALTH
          - CANDIDATE_SHADOW
      candidate_commit:
        type: string
        required: false
      candidate_fetch_ref:
        type: string
        required: false
      expected_production_commit:
        type: string
        required: false

  workflow_call:
    inputs:
      profile:
        type: string
        required: true
      candidate_commit:
        type: string
        required: false
      candidate_fetch_ref:
        type: string
        required: false
      expected_production_commit:
        type: string
        required: false
```

Exact YAML syntax may be adjusted for GitHub schema mechanics during implementation, but the semantic event surface above is frozen.

No top-level `paths:` filter is used for the required `pull_request` workflow.

---

## 5. Event-to-profile mapping

The profile selector is deterministic.

| Event | Allowed profile | Rule |
|---|---|---|
| `pull_request` targeting `main` | `PR_MAIN` | automatic only |
| `push` to `main` | `MAIN_HEALTH` | automatic only |
| `workflow_dispatch` | `MAIN_HEALTH` | explicit selection |
| `workflow_dispatch` | `CANDIDATE_SHADOW` | explicit immutable candidate required |
| `workflow_call` | `CANDIDATE_SHADOW` | allowed |
| `workflow_call` | `CANDIDATE_REQUIRED` | allowed for trusted same-repository release orchestration |
| any event | `PR_MAIN` by input | forbidden |
| manual dispatch | `CANDIDATE_REQUIRED` | forbidden |

An invalid event/profile pair is:

```text
CI_PROFILE_INVALID
→ INFRA_ERROR
```

---

## 6. Why manual CANDIDATE_REQUIRED is forbidden

`CANDIDATE_REQUIRED` is intended to become one gate inside RS2-4's release transaction.

A manual button must not be able to create evidence that looks equivalent to:

```text
release orchestrator established candidate
expected parent bound
required candidate verification passed
```

Therefore:

```text
workflow_dispatch + CANDIDATE_REQUIRED
= invalid invocation
```

Humans may use `CANDIDATE_SHADOW` for the same test surface without creating release-transaction authority.

---

## 7. Immutable candidate input contract

Candidate profiles require:

```text
candidate_commit
```

The value must be a full lowercase or uppercase hexadecimal Git commit object ID in the repository's active object format.

For the current SHA-1 repository this means exactly 40 hexadecimal characters.

A mutable branch/tag name is never the candidate authority.

### 7.1 Optional fetch hint

`candidate_fetch_ref` is a transport hint only.

It may identify a repository-local branch from which the candidate commit can be fetched.

It must never replace `candidate_commit` as the tested identity.

Conceptually:

```text
fetch candidate_fetch_ref if needed
→ require object candidate_commit exists
→ checkout/materialize candidate_commit exactly
→ record testedCandidateCommit = candidate_commit
```

If the ref moves during the run, the tested commit does not move.

If the fetch hint cannot materialize the declared commit:

```text
CANDIDATE_COMMIT_UNAVAILABLE
→ INFRA_ERROR
```

### 7.2 No arbitrary remote

A candidate fetch hint may refer only to the same repository origin used by the workflow.

External repository URLs are not candidate inputs.

---

## 8. Expected production parent input

Candidate calls may provide:

```text
expected_production_commit
```

Semantics:

```text
resolve release-simcore once
→ productionCommit P

if expected_production_commit supplied:
  require P == expected_production_commit
```

Mismatch:

```text
PRODUCTION_PARENT_MOVED
→ INFRA_ERROR for candidate verification
```

This prevents a release candidate from being verified against one production parent and later treated as verified against another.

For `CANDIDATE_REQUIRED`, `expected_production_commit` is mandatory.

For `CANDIDATE_SHADOW`, it is optional but strongly preferred during equivalence proof.

---

## 9. Production materialization contract

For every profile that needs deployed production, the workflow resolves `release-simcore` once near the beginning of the run.

The resulting commit is frozen as:

```text
productionCommit P
```

The workflow then materializes from exactly P:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

It must not repeatedly read a moving `origin/release-simcore` later in the same run and silently test mixed production identities.

---

## 10. PR changed-path authority

`PR_MAIN` classifies the PR's complete changed-file set relative to the PR base.

Frozen semantic inputs:

```text
baseSha = pull_request.base.sha
headSha = pull_request.head.sha
```

The classifier must use a merge-base-aware PR diff equivalent to GitHub's PR changed-file semantics.

Conceptually:

```text
git diff --name-only baseSha...headSha
```

The classifier result is deterministic for one `(baseSha, headSha)` pair.

The workflow must record both SHAs in its bounded report.

---

## 11. Main-push changed-path authority

`MAIN_HEALTH` never uses changed paths to skip the required health suite.

The push diff may be recorded for diagnostics, but:

```text
push(main)
→ MAIN_HEALTH
→ full health matrix
```

This is deliberate.

A landed merge is a canonical repository state, so health verification should not depend on whether the merge looked documentation-only before landing.

---

## 12. Classifier output vocabulary

The path classifier emits a set of zero or more scope labels.

Frozen labels:

```text
CI_SELF
HARNESS
ARCH_CONTRACT
STATE_SYNC
LEGACY_VERIFICATION
SIMCORE_DOC_ONLY
SHARED_MAIN_COORDINATION
```

If no label matches:

```text
UNRELATED = true
```

Labels are additive.

A path may intentionally activate more than one label.

---

## 13. CI_SELF paths

Initial protected CI self-change surface:

```text
.github/workflows/simcore-ci.yml
products/simcore/tooling/check.mjs
products/simcore/tooling/ci/**
products/simcore/tests/**
products/simcore/contracts/**
```

Future permanent classifier/runner/fixture-registry files must be enrolled into this class when introduced.

Changing these files must be visible as:

```text
CI_SELF_RELEVANT = YES
```

A CI self-change can never be classified as plain `DOC_ONLY` merely because runtime source is untouched.

---

## 14. HARNESS paths

Initial permanent-harness paths:

```text
products/simcore/tests/**
products/simcore/contracts/frozen-surfaces.json
products/simcore/tooling/check.mjs
products/simcore/tooling/test-*.mjs
```

During migration, explicitly registered durable fixture files promoted from legacy locations also map to HARNESS.

A broad rule such as:

```text
scripts/simcore-*.mjs
```

must not automatically make every historical one-shot script permanent.

Enrollment is registry-driven after RS2-1 implementation.

---

## 15. ARCH_CONTRACT paths

Initial architecture/static-contract surface:

```text
config/simcore-architecture-v2.json
scripts/simcore-architecture-check.py
docs/SIMCORE_CONTRACTS_V2.md
products/simcore/contracts/**
```

The current `simcore-architecture-contracts.yml` is treated as a predecessor workflow, not the future contract authority.

When its permanent coverage is proven, 3D may retire that predecessor workflow without changing this path class.

---

## 16. STATE_SYNC paths

Initial state-synchronization surface after RS2-2 implementation:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/state-sync/**
products/simcore/tooling/sync-state.mjs
products/simcore/tooling/target-registry.json
scripts/simcore-sync-memory.py
.github/workflows/simcore-release-state-sync.yml
```

If implementation chooses slightly different permanent registry filenames, the exact implemented files must be enrolled without broadening the authority class.

`STATE_SYNC` means the read-only state checker is applicable.

It does **not** authorize state repair.

---

## 17. SHARED_MAIN_COORDINATION paths

SimCore state landing depends on repository-wide main coordination infrastructure.

Initial shared coordination surface:

```text
scripts/repo-main-write.py
docs/REPO_MAIN_WRITE_COORDINATION.md
```

Changes here activate:

```text
SHARED_MAIN_COORDINATION
```

The permanent SimCore CI does not become the owner of shared coordination.

Its responsibility is limited to running the SimCore-facing coordination compatibility/self-test profile defined by the permanent harness when available.

---

## 18. LEGACY_VERIFICATION paths

During shadow adoption, retained SimCore one-shot validation/build machinery remains relevant evidence.

Examples:

```text
.github/workflows/simcore-*.yml
scripts/simcore-0*.py
scripts/simcore-0*-test.mjs
scripts/simcore-m2-*.py
```

Exceptions:

```text
simcore-ci.yml                  → CI_SELF
simcore-release-state-sync.yml  → STATE_SYNC
```

This class is transitional.

It does not mean the permanent CI executes arbitrary historical patch programs as permanent tests.

Instead it means:

```text
legacy verification machinery changed
→ permanent baseline verification remains applicable
→ legacy-equivalence evidence may be required during RS2-3D
```

---

## 19. SIMCORE_DOC_ONLY paths

Design/evidence documentation that is SimCore-related but does not itself define machine state, executable CI, harness, or architecture contract may map to:

```text
SIMCORE_DOC_ONLY
```

Examples include:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_*.md
docs/SIMCORE_*_BUILD_EVIDENCE.md
docs/SIMCORE_DEFERRED_LEDGER.md
```

Explicit higher-priority classes win where a named document is authoritative for another class.

For example:

```text
docs/SIMCORE_GUIDELINES.md
```

is `STATE_SYNC`, not plain `DOC_ONLY`.

---

## 20. Classifier precedence

The classifier is additive, but exact-path enrollment takes precedence over broad patterns.

Precedence for resolving ambiguous broad matches:

```text
CI_SELF
STATE_SYNC
ARCH_CONTRACT
HARNESS
SHARED_MAIN_COORDINATION
LEGACY_VERIFICATION
SIMCORE_DOC_ONLY
UNRELATED
```

This precedence never discards a legitimate additional exact label.

Example:

```text
products/simcore/contracts/frozen-surfaces.json
→ CI_SELF + HARNESS + ARCH_CONTRACT
```

---

## 21. PR gate vocabulary

Internal gate families are frozen as:

```text
GATE_CLASSIFY
GATE_CI_SELF
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
GATE_STATE
GATE_COORDINATION
GATE_LEGACY_COMPAT
GATE_REQUIRED
```

Not every profile runs every family.

Each gate is either:

```text
PLANNED
NOT_APPLICABLE
```

before its execution result is interpreted.

---

## 22. PR_MAIN check matrix

Initial routing matrix:

| Scope | CI_SELF | STATIC | ARCH | REGRESSION | STATE | COORDINATION | LEGACY_COMPAT |
|---|---:|---:|---:|---:|---:|---:|---:|
| UNRELATED | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| SIMCORE_DOC_ONLY | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| CI_SELF | YES | YES | YES | YES | conditional | conditional | N/A |
| HARNESS | YES | YES | YES | YES | N/A | N/A | N/A |
| ARCH_CONTRACT | conditional | YES | YES | YES | N/A | N/A | N/A |
| STATE_SYNC | conditional | YES | conditional | conditional | YES | conditional | N/A |
| SHARED_MAIN_COORDINATION | conditional | YES | N/A | conditional | conditional | YES | N/A |
| LEGACY_VERIFICATION | N/A | YES | YES | YES | conditional | conditional | YES |

`conditional` means another active label or an enrolled harness dependency determines applicability.

The union of all active labels determines the final planned gate set.

---

## 23. DOC_ONLY semantics

A pure `SIMCORE_DOC_ONLY` PR reaches:

```text
GATE_CLASSIFY = PASS
all semantic execution gates = NOT_APPLICABLE
GATE_REQUIRED = PASS / NOOP_SIMCORE_DOC_ONLY
```

This is distinct from repository-UNRELATED NOOP in the structured report, but both render as successful GitHub required status.

Design-only SimCore documentation must not consume the full regression suite merely because its filename starts with `SIMCORE_`.

---

## 24. UNRELATED semantics

If the changed-file set contains no enrolled SimCore class:

```text
scope = UNRELATED
```

Then:

```text
GATE_CLASSIFY = PASS
all other internal semantic gates = NOT_APPLICABLE
SimCore CI / Required = successful NOOP
```

No production materialization is required for an unrelated PR.

This is the path that allows Usage Dashboard-only changes to coexist with a globally configured SimCore required check.

---

## 25. MAIN_HEALTH matrix

`MAIN_HEALTH` ignores PR path scope and always plans:

```text
GATE_STATIC
GATE_ARCH
GATE_REGRESSION
GATE_STATE
GATE_COORDINATION when the permanent coordination fixture exists
GATE_REQUIRED
```

`GATE_CI_SELF` is not a separate semantic requirement in ordinary main health because the landed permanent suite itself is exercising the canonical CI machinery.

However self-test fixtures remain part of regression/static coverage.

---

## 26. CANDIDATE_SHADOW matrix

Always plans:

```text
candidate identity/materialization
GATE_STATIC(candidate)
GATE_ARCH(candidate)
GATE_REGRESSION(candidate)
GATE_STATE(deployed production state, read-only)
GATE_REQUIRED
```

Important separation:

```text
candidate source
≠ deployed state authority
```

Therefore `sync-state --check` is evaluated against the deployed production identity and main state, not by pretending the candidate is already deployed.

A shadow candidate regression failure fails the workflow run, but does not itself mutate or block an existing release authority.

---

## 27. CANDIDATE_REQUIRED matrix

Always plans everything from `CANDIDATE_SHADOW` plus:

```text
expected production parent equality
required candidate identity binding
```

Frozen prerequisites:

```text
candidate_commit present
expected_production_commit present
resolved production commit == expected production commit
candidate latest/install materialized exactly
```

Any prerequisite failure is `INFRA_ERROR`, not a semantic regression failure.

Only a successful `CANDIDATE_REQUIRED` call may satisfy the permanent-CI prerequisite later consumed by RS2-4.

---

## 28. STATIC gate minimum contract

The permanent static gate includes at minimum:

```text
candidate/production JavaScript syntax
latest.js == install.js for the tested source identity
version marker parseability
runtime version marker agreement where applicable
no malformed bundle/truncated source
registered forbidden side-effect/static surface checks from permanent contracts
```

The exact accumulated static-contract registry is RS2-1/implementation data, not hard-coded release-number logic in the YAML.

---

## 29. ARCH gate minimum contract

The architecture gate invokes the permanent equivalent of Contracts v2 against the tested source identity.

It must not read an arbitrary architecture contract from the candidate branch as trusted policy.

For candidate profiles:

```text
trusted architecture contract = main CI machinery identity
source under test              = candidate commit
```

For PR changes to the architecture contract itself, self-change/equivalence policy applies.

---

## 30. REGRESSION gate minimum contract

The regression gate invokes the accumulated RS2-1 permanent harness.

It includes all promoted durable regression fixtures whose behavior remains supported.

The YAML does not enumerate release numbers.

New correctness minis add data/tests to the permanent harness rather than new permanent workflow branches.

---

## 31. STATE gate semantics

The state gate consumes the RS2-2 read-only checker.

For applicable profiles:

```text
CHECK_CLEAN                    → gate success
CHECK_CLEAN_WITH_OBSERVATIONS  → gate success + observations retained
CHECK_DRIFT                    → gate failure
CHECK_BLOCKED                  → gate failure / authority blocker
```

A human-prose `OBSERVATION` alone does not fail `SimCore CI / Required`.

Machine drift/blockers do.

CI never responds by invoking `sync-state --write`.

---

## 32. State check on PR_MAIN

When `STATE_SYNC` is active, the state checker evaluates the PR head's proposed state files against one immutable deployed production identity P.

This lets a state-update PR prove that its proposed machine blocks are consistent before merge.

When `STATE_SYNC` is not active, PR_MAIN does not run the state checker merely to rediscover unrelated global state.

Main health still checks canonical state after landing.

---

## 33. State check on candidate profiles

Candidate profiles do **not** rewrite expected state to candidate identity.

They verify:

```text
current main state
↔ current deployed production P
```

separately from:

```text
candidate C regression/static/architecture validity
```

This prevents pre-deployment candidates from generating false state drift.

---

## 34. CI self-change classification

If any `CI_SELF` path changes:

```text
ciSelfChange = true
```

The ordinary PR still runs the read-only planned matrix.

But the result report must explicitly state:

```text
SELF_CHANGE_REVIEW_REQUIRED
```

The permanent CI result alone does not certify equivalence of a rewrite to its own authority.

RS2-3D remains responsible for shadow/equivalence promotion when required semantics change.

Human review remains mandatory per RS2-3A.

---

## 35. CI self-change may not hide the public gate

A proposed workflow change is invalid as permanent-CI-equivalent if it:

```text
renames SimCore CI / Required without migration authority
adds top-level PR paths that can suppress the required workflow
removes read-only permissions boundary
adds repository write behavior
removes classifier terminal NOOP behavior
allows candidate mutable ref to replace immutable commit identity
```

Implementation must include a policy/self-test capable of detecting these changes before RS2-3 promotion.

Exact enforcement mechanics are completed in RS2-3C/D.

---

## 36. Aggregator input contract

The final required job receives:

```text
profile
scope labels
planned/not-applicable flags
result of each planned gate
bounded semantic result codes
productionCommit if materialized
candidateCommit if materialized
ciSelfChange flag
```

The public gate does not infer applicability from whether a GitHub job happened to be skipped.

Applicability was already decided by the classifier/profile matrix.

---

## 37. Aggregator planned-gate rule

For every gate G:

```text
if planned(G) == false:
  GitHub job result SKIPPED is acceptable

if planned(G) == true:
  only SUCCESS satisfies G
```

Therefore for a planned gate:

```text
FAILURE   → required FAIL/INFRA_ERROR according to bounded reason
CANCELLED → required not PASS
SKIPPED   → UNEXPECTED_GATE_SKIP → INFRA_ERROR
SUCCESS   → eligible to pass
```

This prevents a broken `if:` expression from silently converting required coverage into success.

---

## 38. Aggregator execution rule

The final aggregator is conceptually an `always()` job over internal dependencies.

It must inspect planned flags and dependency results even when one semantic gate failed.

It must not use the pattern:

```text
if all previous jobs succeeded, run required
```

because then the stable public gate could disappear on the exact failures it is meant to report.

---

## 39. Workflow cancellation semantics

PR concurrency may cancel a stale run when a newer commit arrives for the same PR.

A cancelled stale run does not synthesize a PASS.

The newest head's workflow is the authoritative required-check attempt.

Frozen rule:

```text
cancel stale attempt
≠ mark stale attempt successful
```

If the current/latest attempt is externally cancelled without replacement, permanent CI has not passed.

---

## 40. Required result mapping

Top-level semantic mapping:

```text
UNRELATED or pure DOC_ONLY
  → NOOP successful check status

all applicable semantic gates success
  → PASS successful check status

semantic regression/contract/state drift
  → FAIL failing check status

invalid identity / unexpected skip / unavailable source / malformed invocation
  → INFRA_ERROR failing check status
```

The visible check name remains:

```text
SimCore CI / Required
```

---

## 41. Candidate result authority

Candidate verification evidence must bind at minimum:

```text
profile
verifier main commit
production commit
candidate commit
permanent harness identity/version
architecture contract identity
state-check identity/version
result
```

A PASS without exact candidate commit identity is invalid evidence.

---

## 42. workflow_dispatch exact validation

### MAIN_HEALTH

Allowed:

```text
profile = MAIN_HEALTH
candidate_commit empty
candidate_fetch_ref empty
expected_production_commit optional/empty
```

Supplying candidate-only fields with MAIN_HEALTH is an invocation error rather than silently ignoring ambiguous input.

### CANDIDATE_SHADOW

Required:

```text
profile = CANDIDATE_SHADOW
candidate_commit non-empty and valid
```

Optional:

```text
candidate_fetch_ref
expected_production_commit
```

---

## 43. workflow_call exact validation

Allowed profiles:

```text
CANDIDATE_SHADOW
CANDIDATE_REQUIRED
```

Future RS2-4 caller uses:

```text
profile = CANDIDATE_REQUIRED
candidate_commit = immutable C
candidate_fetch_ref = bounded repository-local transport hint if needed
expected_production_commit = immutable P
```

`PR_MAIN` and `MAIN_HEALTH` are not reusable-call profiles in the first permanent contract.

---

## 44. Candidate caller trust boundary

`CANDIDATE_REQUIRED` is intended for same-repository trusted workflow orchestration from the canonical release workflow introduced in RS2-4.

The verifier must not accept secrets from a caller merely because the caller asks for required verification.

The verifier remains:

```text
contents: read
no deployment credentials
no write token requirement
```

Caller authorization details and permissions hardening are RS2-3C authority.

---

## 45. No candidate mutation

Candidate profiles may not:

```text
apply patch scripts
rewrite version markers
copy latest to install
commit corrected files
push a work branch
```

If the candidate is not already materialized correctly:

```text
FAIL or INFRA_ERROR
```

The release/build owner must create a new candidate commit and invoke CI again.

---

## 46. Legacy one-shot fixture interaction

During shadow adoption, permanent regression coverage may be compared with retained legacy fixture outcomes.

But the permanent workflow's normal matrix does not execute release-number-specific patch scripts as prerequisites.

RS2-3D must prove which legacy validation portions are covered before retirement.

Until then:

```text
legacy workflow result
and
permanent CI result
```

may coexist as separate evidence.

---

## 47. Current architecture predecessor interaction

The existing:

```text
.github/workflows/simcore-architecture-contracts.yml
```

remains a positive predecessor during shadow adoption.

Permanent CI may not delete or disable it in the same initial installation that first introduces `simcore-ci.yml`.

RS2-3D must compare equivalent contract outcomes before predecessor retirement.

---

## 48. Main-health state-sync scoping

`MAIN_HEALTH` always runs state check after RS2-2 is operational.

This means canonical main continuously verifies:

```text
manifest declaration
registered managed blocks
writer-policy state
current release-simcore production identity
```

Human observations remain nonblocking according to RS2-2.

This is the canonical post-landing safety net for state-changing PRs.

---

## 49. Why push(main) has no path suppression

A merge can alter canonical behavior through combinations that were not obvious from one file pattern.

Also, main health is cheap enough to be deliberately boring once permanent tests exist.

Therefore:

```text
on push main
→ always MAIN_HEALTH
```

This does not mean all repository pushes block each other.

The workflow remains read-only and may use its own CI concurrency policy defined in RS2-3C.

---

## 50. Failure ordering

When multiple internal failures exist, the report retains all bounded findings.

Top-level precedence:

```text
INFRA_ERROR
> FAIL
> PASS
> NOOP
```

Examples:

```text
regression FAIL + report-upload warning
→ FAIL, unless report failure prevents trustworthy result attribution

candidate unavailable + state drift
→ INFRA_ERROR; state may be NOT_EVALUATED depending on identity establishment

state DRIFT + human observation
→ FAIL with observation retained
```

---

## 51. Identity establishment before semantic candidate gates

Candidate semantic gates are not run against an unresolved identity.

Order:

```text
validate invocation
resolve/fetch immutable identities
materialize bytes
verify latest/install source pair
then run architecture/regression semantics
```

If identity establishment fails, downstream candidate semantics are:

```text
NOT_EVALUATED
```

not guessed failures.

---

## 52. PR classifier failure

If PR changed paths cannot be established reliably:

```text
PATH_CLASSIFICATION_FAILED
→ INFRA_ERROR
```

The workflow must not default to `UNRELATED` on classifier failure.

Fail-open classification would let relevant SimCore changes bypass verification.

---

## 53. Unknown future SimCore permanent paths

Permanent path growth is registry/config driven.

Implementation should centralize path classification in one machine-readable or testable policy surface rather than scattering globs across many jobs.

When a new permanent SimCore subsystem path is introduced:

```text
add path classification
add classifier self-test
then rely on matrix
```

Do not add a new version-number-specific workflow.

---

## 54. Path deletion and rename semantics

Deleted and renamed files remain part of changed-path classification.

A PR deleting:

```text
products/simcore/tests/representation.test.mjs
```

must still activate HARNESS/CI_SELF.

A rename across classes activates the union of old/new paths where the classifier can observe both.

If rename metadata is unavailable, the deleted old path plus added new path still produces a safe union through the diff.

---

## 55. Draft PR behavior

The first contract does not require running expensive SimCore CI merely because a PR remains draft.

However `ready_for_review` is an explicit trigger so the required result is refreshed when review begins.

Implementation may also run `opened/synchronize` on drafts for early feedback.

The stable rule is:

```text
ready-for-review PR must have a current terminal SimCore CI / Required result
```

Exact cost-saving behavior for draft-only synchronize events may be finalized in RS2-3C if it does not create required-check ambiguity.

---

## 56. Reopened PR behavior

`reopened` triggers PR_MAIN because an old result may refer to stale base or policy.

The reopened run re-establishes:

```text
base SHA
head SHA
changed paths
current verifier identity
```

Old closed-PR evidence does not automatically satisfy the reopened required check.

---

## 57. Base-main movement

A PR's base may advance without a head commit change.

The permanent required result is bound to the `(baseSha, headSha, verifier identity)` tuple recorded by that run.

Branch-protection freshness policy is outside RS2-3B, but permanent CI reports enough identity to determine whether a result is stale.

Implementation may use GitHub merge-queue/update mechanisms later without changing the semantic matrix.

---

## 58. Reported scope example — Usage Dashboard-only PR

Changed paths:

```text
products/usage-dashboard/**
docs/USAGE_DASHBOARD_*.md
```

Classifier:

```text
UNRELATED = YES
```

Result:

```text
SimCore CI / Required
→ NOOP success
```

No release-simcore fetch is necessary.

---

## 59. Reported scope example — SimCore design doc only

Changed path:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_....md
```

Classifier:

```text
SIMCORE_DOC_ONLY
```

Result:

```text
required success / NOOP_SIMCORE_DOC_ONLY
```

No runtime regression suite required.

---

## 60. Reported scope example — architecture contract edit

Changed paths:

```text
config/simcore-architecture-v2.json
scripts/simcore-architecture-check.py
```

Classifier:

```text
ARCH_CONTRACT
```

Planned:

```text
STATIC
ARCH
REGRESSION
```

The production baseline is materialized so the proposed contract change cannot silently invalidate current production without evidence.

---

## 61. Reported scope example — state docs update

Changed paths:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
```

Classifier:

```text
STATE_SYNC
```

Planned:

```text
STATIC minimum environment check
STATE
```

State gate compares proposed PR state against immutable deployed production P.

Human observation-only output does not fail required.

---

## 62. Reported scope example — permanent harness change

Changed path:

```text
products/simcore/tests/representation.test.mjs
```

Classifier:

```text
CI_SELF + HARNESS
```

Planned:

```text
CI_SELF
STATIC
ARCH
REGRESSION
```

Report additionally records:

```text
SELF_CHANGE_REVIEW_REQUIRED
```

---

## 63. Reported scope example — candidate shadow

Inputs:

```text
profile = CANDIDATE_SHADOW
candidate_commit = C
expected_production_commit = P
```

Planned:

```text
resolve production exactly P
materialize candidate exactly C
STATIC(C)
ARCH(C)
REGRESSION(C)
STATE(P against main)
REQUIRED
```

No path classifier is used to reduce candidate regression coverage.

---

## 64. Required outputs to RS2-3C

RS2-3B hands RS2-3C the following frozen semantics:

```text
four profiles
exact allowed event/profile mapping
manual CANDIDATE_REQUIRED forbidden
candidate immutable commit authority
candidate fetch ref transport-only
expected production commit rule
PR changed-path classifier basis
push(main) always full health
scope-label vocabulary
initial path-class map
gate vocabulary
PR matrix
MAIN_HEALTH matrix
CANDIDATE_SHADOW matrix
CANDIDATE_REQUIRED matrix
state observation result mapping
planned-vs-skipped aggregator rule
public result precedence
CI self-change report flag
```

RS2-3C must not redesign those merely for YAML convenience.

---

## 65. Decisions delegated to RS2-3C

RS2-3C must freeze the operational mechanics around this matrix:

```text
exact `permissions:` blocks
runner image and runtime versions
exact job-level concurrency expressions
timeouts
artifact/report schema and names
artifact retention
job summary policy
external action pinning
cache policy
fork/untrusted execution mechanics
same-repository workflow_call caller hardening
bounded log redaction
failure artifact behavior
how classifier policy is stored/tested physically
```

It may optimize execution cost.

It may not turn a planned required gate into an implicit skip.

---

## 66. Required future matrix self-tests

Implementation must contain meta-tests for at least:

```text
Usage Dashboard-only PR -> UNRELATED NOOP
SimCore design-doc-only PR -> DOC_ONLY NOOP
CURRENT_DEVELOPMENT edit -> STATE_SYNC
GUIDELINES edit -> STATE_SYNC
manifest edit -> STATE_SYNC
architecture contract edit -> ARCH_CONTRACT
permanent fixture edit -> CI_SELF + HARNESS
simcore-ci.yml edit -> CI_SELF
repo-main-write.py edit -> SHARED_MAIN_COORDINATION
legacy v0.64.6 workflow edit -> LEGACY_VERIFICATION
unknown classifier error -> INFRA_ERROR, never UNRELATED
planned gate skipped -> INFRA_ERROR
not-applicable gate skipped -> accepted
state observation only -> required success
state drift -> required failure
candidate shadow without commit -> INFRA_ERROR
candidate required without expected parent -> INFRA_ERROR
candidate ref moves -> tested candidate commit unchanged
production parent moves from expected -> INFRA_ERROR
latest/install mismatch -> failure
manual CANDIDATE_REQUIRED -> invalid invocation
push(main) doc-only commit -> MAIN_HEALTH still full
```

---

## 67. RS2-3B design close gate

RS2-3B design is complete when:

```text
four profiles preserved                                      PASS
exact event topology defined                                PASS
PR event types defined                                      PASS
push(main) full-health rule defined                         PASS
workflow_dispatch profiles defined                          PASS
workflow_call profiles defined                              PASS
manual CANDIDATE_REQUIRED forbidden                         PASS
candidate immutable commit input defined                    PASS
candidate fetch-ref transport-only rule defined             PASS
same-repository candidate source rule defined               PASS
expected production commit semantics defined               PASS
CANDIDATE_REQUIRED expected-parent requirement defined      PASS
PR diff identity tuple defined                              PASS
classifier vocabulary defined                               PASS
CI_SELF path class defined                                  PASS
HARNESS path class defined                                  PASS
ARCH_CONTRACT path class defined                            PASS
STATE_SYNC path class defined                               PASS
SHARED_MAIN_COORDINATION path class defined                 PASS
LEGACY_VERIFICATION path class defined                      PASS
SIMCORE_DOC_ONLY path class defined                         PASS
classifier precedence defined                              PASS
PR gate vocabulary defined                                 PASS
PR check matrix defined                                    PASS
DOC_ONLY NOOP semantics defined                             PASS
UNRELATED NOOP semantics defined                            PASS
MAIN_HEALTH matrix defined                                 PASS
CANDIDATE_SHADOW matrix defined                            PASS
CANDIDATE_REQUIRED matrix defined                          PASS
candidate/deployed-state separation preserved              PASS
state OBSERVATION nonblocking mapping preserved             PASS
CI self-change classification defined                      PASS
stable public gate anti-hide constraints defined            PASS
planned-vs-not-applicable aggregator rule defined            PASS
unexpected skipped gate fail-closed defined                 PASS
stale-run cancellation semantics defined                    PASS
public result precedence defined                            PASS
workflow_call input validation defined                     PASS
workflow_dispatch input validation defined                 PASS
identity-before-semantic-gates order defined               PASS
classifier failure fail-closed defined                     PASS
path deletion/rename behavior defined                      PASS
required self-test families defined                        PASS
RS2-3C handoff defined                                     PASS
runtime diff                                                 NONE
release-simcore diff                                         NONE
manifest diff                                                NONE
state-doc diff                                               NONE
permanent CI implementation                                 NONE
branch-protection change                                     NONE
legacy workflow deletion                                     NONE
```

No implementation is required to close the **design** subphase.

---

## 68. RS2-3 status after this document

```text
RS2-3A  Permanent CI Topology & Trust Boundary            COMPLETE
RS2-3B  Trigger / Check Matrix & Path Classification      COMPLETE
RS2-3C  Permissions / Concurrency / Reports & Safety      NEXT
RS2-3D  Shadow Equivalence / Legacy Gate Retirement       PLANNED
RS2-3E  Promotion / Close Gate / RS2-4 Handoff            PLANNED
```

Implementation remains separate from design.

---

## 69. Frozen final rule

> A permanent required check must be impossible to bypass by being irrelevant, skipped, mutable, or ambiguous.

For RS2-3B that means:

```text
unrelated work terminates NOOP
relevant work gets an explicit planned gate set
candidate work is bound to an immutable commit
production is bound once per run
planned skipped gates fail closed
state observations remain observations
machine drift remains failure
main health always checks canonical state
release candidates never mutate themselves inside CI
```

The matrix should make the routine path boring:

```text
classify
materialize exact identities
run applicable permanent gates
aggregate deterministically
finish with one stable public result
```
