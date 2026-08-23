# SimCore Release System v2 — RS2-3C Permissions / Concurrency / Report & Artifact Safety Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
Durable-test contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1B_TEST_HARNESS_CONTRACT.md`
State-check contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2D_DRIFT_CONTRADICTION_CHECK_MODE.md`
Phase: `RS2-3 — Permanent CI`
Subphase: `RS2-3C — Permissions / Concurrency / Report & Artifact Safety`
Authority class: release-infrastructure design / read-only CI execution-safety contract

---

## 1. Purpose

RS2-3A froze the permanent CI topology and trust boundary.
RS2-3B froze the event/profile/check routing matrix.

RS2-3C freezes the execution-safety layer:

```text
what permissions permanent CI receives
which runner/toolchain it executes on
how concurrency cancellation behaves by profile
how fork/untrusted PRs remain read-only
how reusable workflow calls are bounded
which external actions are allowed
whether caches are allowed
what may be printed to logs
what may be uploaded as artifacts
how long artifacts survive
how reports remain bounded and identity-attributable
```

The design goal is:

> A failed or malicious SimCore CI input may cause a failed check, but it must not gain repository-write authority, leak secrets, silently change the source under test, or preserve unbounded/private data as CI evidence.

This document does **not** implement `.github/workflows/simcore-ci.yml`, change branch protection, modify runtime behavior, modify `release-simcore`, modify `product-manifest.json`, write state documents, retire legacy workflows, or implement the RS2-4 release transaction.

---

## 2. Inherited non-negotiable rules

The following remain frozen from RS2-3A/B:

```text
canonical workflow       .github/workflows/simcore-ci.yml
public required check    SimCore CI / Required
repository mutation      FORBIDDEN
release deployment       FORBIDDEN
sync-state --write       FORBIDDEN
repo-main-write.py        FORBIDDEN
candidate identity       immutable commit
production identity      immutable resolved release-simcore commit
ordinary PR event        pull_request
pull_request_target      forbidden for ordinary candidate execution
manual required release  forbidden
```

RS2-3C may narrow permissions further.
It may not broaden CI into a writer.

---

## 3. Permission baseline

The permanent workflow uses the smallest repository permission set compatible with read-only verification.

Frozen default:

```yaml
permissions:
  contents: read
```

No additional repository permission is granted by default.

Explicitly absent unless a later design change proves necessity:

```text
actions: write
checks: write
contents: write
deployments: write
id-token: write
issues: write
packages: write
pull-requests: write
security-events: write
statuses: write
```

The workflow must not depend on write permission merely to report CI status; GitHub's normal workflow/check integration remains platform-owned.

Any future request to add a permission is a `CI_SELF` protected change and must identify:

```text
required capability
minimum scope
profiles that need it
why contents:read is insufficient
new abuse case
rollback
```

---

## 4. No secrets contract

Permanent SimCore verification requires no repository or environment secret.

Frozen rules:

```text
ordinary PR CI       secrets required = NONE
MAIN_HEALTH           secrets required = NONE
CANDIDATE_SHADOW      secrets required = NONE
CANDIDATE_REQUIRED    secrets required = NONE
```

The reusable workflow declares no custom secret input.

The permanent CI implementation must contain no direct `${{ secrets.* }}` reference.

RS2-4 must not use `secrets: inherit` merely because the called CI workflow is reusable.

If a future external service creates a secret requirement, that integration is outside the current RS2-3 contract and requires a separate trust-boundary design.

---

## 5. Fork / untrusted PR rule

`PR_MAIN` must remain executable under the restricted trust model of an ordinary `pull_request` event.

Required properties:

```text
no write token
no repository secrets
no environment secrets
no deployment environment
no OIDC token
no privileged service credential
```

A fork PR may provide source or file changes under test.
It may not redefine the authority used to grant itself additional permissions.

No ordinary PR test job uses `pull_request_target` to execute PR-controlled code.

---

## 6. Trusted machinery and CI self-change execution

There are two distinct questions when a PR modifies permanent CI machinery.

```text
A. Does the current trusted CI policy judge the PR safely?
B. Does the proposed CI machinery behave as intended?
```

They are not the same.

For a `CI_SELF` PR:

```text
CURRENT TRUSTED LANE
  uses current main verifier policy
  treats PR changes as untrusted input

PROPOSED SELF-TEST LANE
  may execute proposed classifier/harness/workflow-adjacent code
  remains contents:read
  receives no secrets
  cannot determine its own final required conclusion alone
```

The stable `SimCore CI / Required` aggregator must remain anchored in the trusted lane until the proposed CI change lands.

A proposed workflow/harness cannot certify itself merely by printing PASS.

Exact shadow-equivalence requirements for changing required semantics belong to RS2-3D.

---

## 7. Reusable workflow trust boundary

`workflow_call` exists for same-repository orchestration.

Frozen policy:

```text
CANDIDATE_SHADOW
  may be called by trusted same-repository infrastructure

CANDIDATE_REQUIRED
  reserved for the eventual RS2-4 SimCore release orchestrator
```

The called CI workflow still declares only `contents: read`, even if the caller has broader permissions.

A caller's broader token must not become an implicit CI capability.

The reusable workflow accepts bounded scalar identity inputs only:

```text
profile
candidate_commit
candidate_fetch_ref
expected_production_commit
```

It must not accept:

```text
shell command
script body
arbitrary environment JSON
arbitrary checkout URL
external repository URL
secret payload
artifact upload path from caller
```

If the implementation cannot reliably prove that a `CANDIDATE_REQUIRED` call originates from the designated same-repository release orchestration boundary, that profile remains disabled until RS2-4 supplies a verifiable caller contract.

Fail-open caller identification is forbidden.

---

## 8. Checkout credential rule

Repository credentials must not remain available to arbitrary test code longer than required for read-only materialization.

Preferred permanent implementation:

```text
checkout trusted machinery with persisted credentials disabled
perform bounded same-origin read materialization
run tests without reusable push credentials in git config
```

The implementation must prove all of the following by CI self-test:

```text
no `git push` step
no ref update command
no stored write-capable credential
no remote URL containing embedded token
no `repo-main-write.py` invocation
```

If a read-only fetch requires temporary authentication in a private-repository configuration, credentials must be scoped to that fetch operation and not exported to test processes.

---

## 9. Runner and toolchain baseline

First permanent implementation target:

```text
runner          ubuntu-24.04
Node.js         22.x LTS line
Python          3.12.x line
shell           bash
```

The CI report records resolved major/minor runtime versions.

A floating host alias such as `ubuntu-latest` is not the canonical contract for the first permanent implementation.

Toolchain upgrades are `CI_SELF` changes and require the full permanent suite plus shadow evidence when they can change parser/runtime behavior.

Self-hosted runners are outside initial RS2-3 scope.

---

## 10. Dependency installation and network rule

The first permanent harness should prefer repository-contained tests using the Node/Python standard libraries and committed data.

Frozen initial policy:

```text
npm install during tests          NO by default
pip install during tests          NO by default
network fetch from test code      NO
runtime fixture download          NO
remote expected-output service    NO
```

External network access needed by GitHub-provided setup/materialization actions is infrastructure transport, not fixture authority.

If third-party package dependencies are introduced later:

```text
lockfile required
exact dependency graph required
install step isolated before source execution
cache policy reconsidered explicitly
supply-chain review required
```

---

## 11. External action pinning

Every action used by the permanent workflow must be pinned to an immutable full commit SHA.

Allowed style:

```yaml
uses: actions/checkout@<full-commit-sha> # vN.x.y
```

Forbidden as permanent authority:

```text
@main
@master
@v4
@latest
floating branch tags
unreviewed marketplace action
```

Version comments may be retained for readability but the commit SHA is execution authority.

Changing an action SHA is a `CI_SELF` change.

---

## 12. Cache policy

Initial permanent SimCore CI uses no dependency or test-result cache.

```text
actions/cache       NOT USED initially
npm cache           NOT USED initially
fixture result cache NOT USED
candidate PASS cache NOT USED
```

Reasons:

```text
small current harness
no package-install requirement in baseline design
avoid stale fixture/results becoming hidden authority
preserve reproducible evidence during adoption
```

A later cache may accelerate material downloads, but it must never cache the semantic PASS result of a candidate and reuse it for a different identity tuple.

The tuple:

```text
verifierCommit
candidateCommit
productionCommit
registryHash
contractHash
```

must always be re-evaluated when candidate authority is required.

---

## 13. Job timeout contract

Permanent CI must fail closed instead of hanging indefinitely.

Initial maximum job timeouts:

```text
classify / profile resolution      5 minutes
materialization / identity         8 minutes
CI self checks                    10 minutes
static / architecture             10 minutes
permanent regression              20 minutes
state check                       10 minutes
coordination compatibility        10 minutes
legacy compatibility shadow       15 minutes
required aggregator               5 minutes
```

No ordinary job may exceed 20 minutes in the first permanent design.

A timeout is not a semantic regression PASS/FAIL.
It maps to:

```text
CI_JOB_TIMEOUT
→ INFRA_ERROR
```

If the accumulated permanent regression pack genuinely needs more than 20 minutes, RS2-3 must first consider suite partitioning or deterministic optimization before raising the ceiling.

---

## 14. Concurrency policy by profile

Concurrency is used only for stale read-only CI freshness and resource control.
It is never a repository-write lock.

### 14.1 PR_MAIN

Conceptual group:

```text
simcore-ci-pr-<PR number>
```

Policy:

```text
cancel-in-progress: true
```

A newer PR head supersedes the older head.

The newest head must receive its own terminal `SimCore CI / Required` result.

### 14.2 MAIN_HEALTH

Conceptual group:

```text
simcore-ci-main-health
```

Policy:

```text
cancel-in-progress: true
```

A newer canonical main commit supersedes an older pending/running health check.

Cancellation of an older health run does not alter the health conclusion of the newer commit.

### 14.3 CANDIDATE_SHADOW

Conceptual group:

```text
simcore-ci-shadow-<candidate commit>-<production commit>
```

Policy:

```text
cancel-in-progress: true
```

A duplicate shadow request for the exact same immutable identity tuple may supersede an earlier duplicate.

A different candidate or production parent never shares the group.

### 14.4 CANDIDATE_REQUIRED

Conceptual group:

```text
simcore-ci-required-<candidate commit>-<production commit>
```

Policy:

```text
cancel-in-progress: false
```

A release transaction waiting on required candidate verification must not have its evidence silently canceled by an unrelated later invocation.

Duplicate required calls may queue, but they do not cancel each other.

---

## 15. Writer concurrency isolation

Permanent CI must not reuse groups such as:

```text
simcore-main-state-sync
usage-dashboard-release
usage-dashboard-project-memory
repo-main-write
```

CI groups begin with the permanent SimCore CI namespace only.

Therefore:

```text
CI cancellation cannot cancel a writer
writer serialization cannot cancel CI
Usage Dashboard release work cannot evict SimCore required verification
```

---

## 16. Cancellation semantics

A canceled stale run is not evidence that the tested commit failed.

For PR/main freshness profiles:

```text
older run canceled because newer identity exists
→ STALE_RUN_CANCELED
→ no final authority for newest identity
```

For the active/latest run, unexpected cancellation before `GATE_REQUIRED` terminates is:

```text
CI_ACTIVE_RUN_CANCELED
→ no PASS evidence
```

RS2-4 must never interpret a canceled `CANDIDATE_REQUIRED` call as pass-equivalent.

---

## 17. Artifact philosophy

Artifacts are evidence aids, not a second release database.

Permanent CI artifacts may preserve:

```text
bounded machine-readable report
bounded classifier output
bounded failed assertion IDs
bounded immutable identity tuple
bounded shadow-equivalence summary
```

They must not preserve merely for convenience:

```text
entire SimCore source bundle
entire repository checkout
raw long-chat transcripts
full diagnostic-copy reports
clipboard payloads
private user content
arbitrary stdout/stderr dump
all environment variables
Git credential files
GitHub token
secret material
```

---

## 18. Canonical CI report schema

The permanent workflow emits one bounded conceptual report:

```text
simcore-ci-report.json
```

Minimum fields:

```json
{
  "schemaVersion": 1,
  "profile": "PR_MAIN|MAIN_HEALTH|CANDIDATE_SHADOW|CANDIDATE_REQUIRED",
  "conclusion": "PASS|FAIL|INFRA_ERROR|NOOP",
  "reasonCodes": [],
  "verifierCommit": "...",
  "productionCommit": "...|null",
  "candidateCommit": "...|null",
  "expectedProductionCommit": "...|null",
  "prBaseCommit": "...|null",
  "prHeadCommit": "...|null",
  "scopeLabels": [],
  "gates": [],
  "stateCheck": "CLEAN|CLEAN_WITH_OBSERVATIONS|DRIFT|BLOCKED|NOT_APPLICABLE",
  "observationIds": [],
  "sourceDigests": {},
  "toolchain": {
    "node": "major.minor",
    "python": "major.minor",
    "runner": "ubuntu-24.04"
  }
}
```

Exact serialization belongs to implementation, but the bounded field classes above are frozen.

No arbitrary user-controlled text is copied into the report.

---

## 19. Report size bound

The structured report has a hard size ceiling.

Initial contract:

```text
maximum uncompressed report size = 256 KiB
```

If bounded details exceed the ceiling:

```text
truncate repeated detail entries deterministically
preserve total counts
preserve first bounded failing IDs
set reportTruncated = true
```

The workflow must not solve report overflow by attaching raw source/output files.

---

## 20. Failure reason representation

Semantic failures are represented by stable IDs and bounded metadata.

Preferred:

```text
fixtureId
suiteId
gateId
reasonCode
expectedClass
actualClass
```

Avoid:

```text
full response text
full generated prompt
full plugin source excerpt
full exception object
arbitrary serialized runtime state
```

If a short excerpt is indispensable for a static parser error, it must be separately bounded and must not include user/private runtime content.

---

## 21. Log safety

Workflow logs are not treated as an unlimited debug channel.

Frozen shell rules:

```text
set -euo pipefail          YES
set -x                     NO
printenv / env dump        NO
cat credential files       NO
cat full source on failure NO
echo token-bearing URL     NO
```

Test wrappers should print:

```text
gate name
suite / fixture ID
reason code
bounded count/position metadata
```

not full fixture payloads by default.

Unexpected exceptions may print a bounded sanitized stack only when it contains repository-local tooling paths and no fixture/private payload.

Machine reports remain stricter than human-readable logs.

---

## 22. Artifact upload matrix

Initial artifact policy:

| Profile | PASS | FAIL / INFRA_ERROR | Retention |
|---|---|---|---|
| `PR_MAIN` | no artifact by default | bounded report | 7 days |
| `MAIN_HEALTH` | no artifact by default | bounded report | 7 days |
| `CANDIDATE_SHADOW` | bounded report | bounded report | 14 days |
| `CANDIDATE_REQUIRED` | bounded report | bounded report | 30 days |

Why candidate reports survive on PASS:

```text
SHADOW
  needed for RS2-3D equivalence proof

REQUIRED
  needed by RS2-4 transaction attribution/recovery
```

Artifacts are temporary operational evidence.
Durable release evidence still belongs in explicit repository evidence/state records after the appropriate promotion step.

---

## 23. Artifact naming

Artifact names must be deterministic and identity-bounded.

Conceptual names:

```text
simcore-ci-pr-<number>-<head-shortsha>
simcore-ci-main-<main-shortsha>
simcore-ci-shadow-<candidate-shortsha>-<production-shortsha>
simcore-ci-required-<candidate-shortsha>-<production-shortsha>
```

Names must not include:

```text
user prompt text
release notes free text
branch names containing untrusted arbitrary strings
raw PR title
actor email
secret values
```

---

## 24. Artifact integrity

Before upload the workflow computes a SHA-256 of `simcore-ci-report.json` and records the digest in the job summary.

The report includes immutable source identities so an artifact cannot be interpreted independently of:

```text
verifier commit
candidate commit if any
production commit if any
profile
```

Artifact identity is evidence metadata, not production authority.

---

## 25. No source artifact rule

Candidate or production JavaScript files are not uploaded as routine CI artifacts.

Reasons:

```text
production source already has Git authority
candidate source already has Git commit authority
artifact copies create stale duplicate authority
source upload increases accidental data retention surface
```

If a future build phase produces a deterministic bundle that does not yet exist in Git, RS2-4/build design must explicitly own that artifact boundary.

RS2-3 does not invent it.

---

## 26. Job summary contract

The GitHub job summary may display only bounded human-readable facts:

```text
profile
conclusion
scope labels
verifier commit
production commit
candidate commit
planned gate statuses
failed reason IDs
state-check disposition
artifact name if emitted
```

It must not contain full plugin source, long diagnostics, raw user content, or secrets.

---

## 27. Observation handling

RS2-2 human current-state observations remain nonblocking when their source checker reports:

```text
CHECK_CLEAN_WITH_OBSERVATIONS
```

Permanent CI may expose:

```text
observation count
observation IDs
```

It does not upload full human-document copies merely because an observation exists.

The public required conclusion remains PASS under the RS2-2 contract.

---

## 28. State/blocker artifact handling

For:

```text
CHECK_DRIFT
CHECK_BLOCKED
```

artifact/report content may include:

```text
target ID
block ID
reason code
expected digest
actual digest
source identity status
```

It must not include the entire target document unless a human explicitly fetches that document from Git separately.

---

## 29. No automatic issue/comment spam

Permanent CI does not need issue or PR write permission.

Therefore it does not automatically:

```text
open issue
post PR comment
edit PR body
label PR
create release note
```

The check result/job summary/artifact are sufficient initial interfaces.

Any future bot-comment feature is separate from required CI and must not require widening the verifier's token.

---

## 30. No deployment environment

Permanent CI jobs do not target a GitHub Environment associated with deployment or protected secrets.

```text
environment: production      forbidden
environment: release-simcore forbidden
```

A CI verification job must not require release approval merely to read and test source bytes.

RS2-4 may own a separate deployment environment if later required.

---

## 31. No OIDC / cloud identity

Permanent CI does not request:

```text
id-token: write
```

It does not exchange GitHub identity for cloud credentials.

If future artifact attestation is desired, that is a separate infrastructure change with its own least-privilege design.

---

## 32. Workspace isolation

Materialized sources use bounded, profile-specific workspace paths.

Conceptual layout:

```text
/tmp/simcore-ci/<run-id>/trusted/
/tmp/simcore-ci/<run-id>/production/
/tmp/simcore-ci/<run-id>/candidate/
/tmp/simcore-ci/<run-id>/reports/
```

Candidate source is never copied over the trusted CI tooling tree.

Production and candidate paths remain distinct even when byte-identical.

A cleanup step removes temporary materialized source/report staging after upload or failure handling.

---

## 33. File permission / executable boundary

A candidate commit must not gain execution merely because it contains an executable bit.

The workflow executes only enrolled permanent entry points from trusted machinery.

Candidate files are treated as source-under-test inputs unless a specific permanent fixture explicitly loads their bounded JS modules according to the RS2-1 harness contract.

No candidate-provided shell script is invoked as a generic CI step.

---

## 34. Command construction safety

Identity inputs are validated before use in shell commands.

Commit inputs:

```text
must match repository object-id format
must not contain whitespace
must not contain ref syntax fragments
```

Fetch hints are bounded same-repository refs and must not be concatenated into arbitrary shell strings without safe argument handling.

Forbidden:

```text
eval "$INPUT"
bash -c "$USER_INPUT"
node -e "$UNTRUSTED_INPUT"
```

---

## 35. Required aggregator execution safety

`GATE_REQUIRED` runs with:

```text
if: always()
```

or an equivalent mechanism so it can interpret upstream failure/skipped/canceled states.

It does not trust a single upstream textual PASS string.

It consumes bounded planned-gate metadata and actual job conclusions.

Inherited RS2-3B rule:

```text
PLANNED + success      accepted
PLANNED + failure      FAIL
PLANNED + canceled     INFRA_ERROR unless run is intentionally stale/superseded
PLANNED + skipped      UNEXPECTED_GATE_SKIP / INFRA_ERROR
NOT_APPLICABLE + skip  accepted
```

---

## 36. Candidate required output contract

`CANDIDATE_REQUIRED` must expose bounded outputs to the future RS2-4 caller.

At minimum:

```text
ci_conclusion
verified_candidate_commit
verified_production_commit
verifier_commit
report_sha256
```

The caller must compare returned identities to its own transaction identities before deployment.

A plain boolean `passed=true` without identity binding is insufficient.

---

## 37. Report schema versioning

The report starts at:

```text
schemaVersion = 1
```

Additive fields may be introduced compatibly.

Removing/renaming authority-bearing identity or conclusion fields requires:

```text
schema version change
CI_SELF classification
RS2-4 caller compatibility review if active
```

---

## 38. Runner/action upgrade safety

Changes to any of these are protected:

```text
runner image
Node major
Python major
actions/checkout pin
setup-node pin
setup-python pin
artifact action pin
```

A change requires:

```text
full permanent suite
CI self-test
shadow result against current production
no runtime/source diff attributable to infrastructure
```

This protects against toolchain-induced parser or ordering changes.

---

## 39. Initial no-write static meta-gates

Permanent CI implementation must include a self-check proving the workflow contains no ordinary mutation authority.

At minimum detect/reject unexpected appearances of:

```text
contents: write
git push
git tag
update-ref
repo-main-write.py
sync-state --write
pull_request_target
id-token: write
secrets: inherit
```

False positives from quoted test fixtures should be handled structurally where practical, but a failing meta-gate must be resolved explicitly rather than ignored.

---

## 40. Initial report-safety meta-gates

Permanent CI implementation must self-test:

```text
report > 256 KiB fails/truncates deterministically
source bytes are not embedded in normal report
unknown arbitrary error text is bounded
observation IDs survive without full prose
artifact path cannot escape reports directory
artifact name ignores raw PR title/branch text
PASS PR_MAIN emits no routine artifact
CANDIDATE_REQUIRED output identities match report identities
```

---

## 41. Initial concurrency meta-gates

Implementation tests must prove:

```text
same PR old head may cancel
new PR head gets fresh required result
new MAIN_HEALTH may cancel older main health
candidate A never cancels candidate B
same shadow tuple may supersede duplicate shadow
required candidate calls do not cancel each other
CI groups do not equal writer groups
canceled required run never maps to PASS
```

---

## 42. Failure classification additions

RS2-3C adds these infrastructure reason codes:

```text
CI_PERMISSION_SCOPE_INVALID
CI_SECRET_DEPENDENCY_FORBIDDEN
CI_CALLER_CONTRACT_UNVERIFIED
CI_EXTERNAL_ACTION_UNPINNED
CI_RUNNER_UNSUPPORTED
CI_JOB_TIMEOUT
CI_ACTIVE_RUN_CANCELED
CI_ARTIFACT_SCOPE_VIOLATION
CI_REPORT_TOO_LARGE
CI_REPORT_SERIALIZATION_ERROR
CI_CREDENTIAL_PERSISTENCE_VIOLATION
CI_UNTRUSTED_COMMAND_EXECUTION
CI_OUTPUT_IDENTITY_MISMATCH
```

These map to:

```text
INFRA_ERROR
```

not semantic regression FAIL.

---

## 43. Artifact and log incident response

If CI accidentally emits disallowed sensitive/unbounded data:

```text
classify immediately as FIX or BLOCKER according to exposure
stop further artifact upload for the affected path
preserve bounded incident evidence only
delete/expire unsafe artifact where supported
repair logger/report contract separately from runtime changes
```

A logging/artifact incident must not be fixed by weakening runtime regression gates in the same change.

---

## 44. Relationship to existing one-shot workflows

Existing one-shot workflows may have broader permissions because they also mutate work branches.

RS2-3C does not retroactively declare those workflows permanent-CI-compliant.

Instead:

```text
legacy verifier assertions
→ migrate into permanent read-only harness

legacy candidate commit/push steps
→ remain outside permanent CI
→ RS2-4 owns replacement
```

This distinction is mandatory when 3D compares equivalence.

---

## 45. Relationship to repo-wide main-write coordination

`repo-main-write.py` remains a writer-side integration mechanism.

Permanent CI may test compatibility assumptions around it when `SHARED_MAIN_COORDINATION` changes.

Permanent CI never invokes it to land its own result.

CI evidence is communicated by GitHub check status and bounded artifact/report only.

---

## 46. Relationship to RS2-4

RS2-4 inherits a ready-made read-only interface:

```text
input:
  candidate_commit C
  expected_production_commit P

output:
  PASS/FAIL/INFRA_ERROR
  verified C
  verified P
  verifier commit V
  report digest R
```

RS2-4 may then decide whether deployment is authorized.

Permanent CI itself still cannot deploy even when `CANDIDATE_REQUIRED` passes.

---

## 47. RS2-3C implementation prerequisites

Before permanent CI implementation can claim compliance:

```text
RS2-1 permanent harness implementation operational
RS2-2 sync-state --check operational
RS2-3A/B design frozen
current legacy release path retained
no runtime semantic change mixed into CI installation
```

Design work may close before those implementation prerequisites are completed.

---

## 48. RS2-3C design close gate

RS2-3C design is complete when all are frozen:

```text
contents:read-only permission baseline                         PASS
no custom secrets                                            PASS
no secrets:inherit requirement                               PASS
fork PR restricted execution                                 PASS
trusted lane vs proposed CI self-test lane                    PASS
workflow_call bounded scalar inputs                           PASS
CANDIDATE_REQUIRED caller fail-closed rule                    PASS
checkout credential persistence boundary                     PASS
ubuntu-24.04 runner baseline                                  PASS
Node 22 / Python 3.12 baseline                                PASS
no dependency install/network fixture baseline               PASS
external actions immutable SHA-pinned                         PASS
initial cache disabled                                        PASS
per-job timeout ceilings                                      PASS
PR_MAIN concurrency                                           PASS
MAIN_HEALTH concurrency                                       PASS
CANDIDATE_SHADOW concurrency                                  PASS
CANDIDATE_REQUIRED noncanceling concurrency                   PASS
writer-group isolation                                        PASS
cancellation semantics                                        PASS
bounded artifact philosophy                                   PASS
canonical report field classes                               PASS
256 KiB report ceiling                                        PASS
log safety rules                                              PASS
profile-specific artifact retention                           PASS
artifact deterministic naming                                 PASS
report digest integrity                                       PASS
no routine source artifact                                    PASS
no automatic PR/issue writer                                  PASS
no deployment environment                                     PASS
no OIDC                                                       PASS
workspace source/tool isolation                               PASS
candidate executable boundary                                 PASS
shell/input construction safety                               PASS
aggregator always-run fail-closed semantics                   PASS
CANDIDATE_REQUIRED identity-bound outputs                     PASS
report schema versioning                                      PASS
toolchain/action upgrade protection                           PASS
no-write meta-gates                                           PASS
report-safety meta-gates                                      PASS
concurrency meta-gates                                        PASS
new infrastructure reason codes                               PASS
incident response boundary                                    PASS
RS2-4 input/output handoff                                    PASS
runtime diff                                                  NONE
release-simcore diff                                          NONE
manifest diff                                                 NONE
state-doc diff                                                NONE
CI implementation                                             NONE
legacy workflow deletion                                      NONE
```

---

## 49. Handoff to RS2-3D

RS2-3D must now define **Shadow Equivalence & Legacy Gate Retirement**.

At minimum it must decide:

```text
which current one-shot workflows contain permanent-worthy verification
which assertions map to permanent suites/gates
which legacy workflow is a positive predecessor
minimum shadow run set
minimum production/candidate identity coverage
how PASS equivalence is proven
how expected FAIL cases are compared
what counts as coverage gap
which workflows may be archived/de-triggered after equivalence
which write/deploy workflows must remain for RS2-4
rollback if permanent CI produces a false negative/false positive
when simcore-architecture-contracts.yml can retire
whether old v0.64.x version workflows are deleted, archived, or trigger-disabled
how `PERMANENT_CI_SHADOW_EQUIVALENT` is recorded
```

RS2-3D must preserve the permission/artifact boundaries frozen here.

---

## 50. Frozen final rule

> Permanent CI gets enough authority to prove facts, and no authority to make those facts true by changing the repository.

The intended steady state is deliberately boring:

```text
read-only token
no secrets
immutable inputs
pinned toolchain/actions
bounded time
profile-specific cancellation
bounded reports
short-lived artifacts
no source duplication
no auto-repair
no push
no deployment
```

That boring verifier is the foundation RS2-4 may trust before it performs a release transaction.
