# SimCore Release System v2 — RS2-4C Permanent Promotion Controller / Atomic Publish / Concurrency

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4B_RELEASE_SPEC_CANDIDATE_MATERIALIZATION.md`
Transaction foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4A_RELEASE_TRANSACTION_IDENTITY_AUTHORITY.md`
CI handoff: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`
Phase: `RS2-4 — Permanent Release Workflow`
Subphase: `RS2-4C — Permanent Promotion Controller / Atomic Publish / Concurrency`
Authority class: release-infrastructure design / permanent production publisher contract

---

## 1. Purpose

RS2-4C freezes the permanent write-capable release controller around the immutable authorization tuple created by 4B.

Normal authorization tuple:

```text
A = { R, Q, S, C, P, L, M }
```

Where:

```text
R = immutable main release-authorization commit
Q = immutable release-spec path
S = release-spec SHA-256 digest
C = immutable canonical candidate commit
P = immutable expected production parent
L = candidate latest/install shared Git blob
M = release mode
```

The controller's only production purpose is:

```text
verify A
→ obtain identity-bound permanent CI PASS for C/P
→ recheck current production is still P
→ fast-forward release-simcore P → C
→ prove published identity
```

It must never rebuild product bytes after verification.

---

## 2. Target workflow

Permanent controller path:

```text
.github/workflows/simcore-release.yml
```

This file is generic.

It must not contain a current SimCore product version literal as release control logic.

Version-specific release facts come only from the validated spec identified by `R/Q/S`.

---

## 3. Normal trigger

Normal production release trigger:

```text
push to main
where the landed commit adds exactly one file under:
products/simcore/releases/specs/*.json
```

The controller freezes the triggering landed main commit:

```text
R = github.sha
```

It then validates that the commit is a legal release-authorization event under 4B.

A release is never triggered merely because:

```text
PR title contains "release"
branch name contains version
candidate branch changed
release-simcore branch changed
latest.js changed on a work branch
```

---

## 4. Retry/recovery trigger

A bounded `workflow_dispatch` recovery path is allowed.

Inputs must identify immutable authorization, not restate mutable release facts.

Minimum inputs:

```text
authorization_commit = R
release_spec_path = Q
```

The controller resolves `S/C/P/L/M` again from exact `R:Q`.

Optional input:

```text
expected_release_id
```

may be accepted only as a cross-check.

Forbidden manual authority inputs:

```text
candidate branch only
version only
release name only
"deploy latest"
force=true
skip_ci=true
ignore_parent=true
```

---

## 5. Event resolver

For normal `push(main)` release authorization:

```text
1. freeze R = triggering main commit
2. inspect R's diff against first parent
3. require exactly one newly added release spec under Q namespace
4. require no existing spec modification/deletion
5. require no runtime production path in same main commit
6. parse and validate exact R:Q
7. compute S from validated exact spec bytes
8. resolve C/P/L/M from the spec
```

Failure before any production write.

---

## 6. Dedicated release-authorization commit scope

Preferred and required v1 normal event shape:

```text
one newly added release spec
no permanent release-controller implementation change
no CI policy change
no runtime plugin change on main
no manifest repair
no unrelated product release spec
```

If the landed commit mixes release authorization with controller/CI mutation:

```text
RELEASE_AUTHORIZATION_SCOPE_MIXED
→ fail closed
```

This prevents a release request from changing the release engine that interprets it in the same transaction.

---

## 7. Trusted code source

Executable publisher code comes from the canonical permanent release system on `main`.

Candidate `C` is never an executable trust source for publisher mechanics.

The controller may read candidate Git objects but may not:

```text
source candidate shell scripts
execute candidate workflow files
run candidate npm hooks
load arbitrary candidate code into publisher process
```

Product logic is exercised only inside permanent CI's bounded harness.

---

## 8. Permissions

The write-capable controller uses the minimum permission required to publish `release-simcore` and invoke/consume trusted repository automation.

Baseline direction:

```yaml
permissions:
  contents: write
```

Add another permission only if implementation proves it is required.

Not authorized by default:

```text
pull-requests: write
issues: write
actions: write
packages: write
id-token: write
administration
security-events: write
```

No repository secret is required for ordinary same-repository release publication if `GITHUB_TOKEN` is sufficient.

---

## 9. Permanent CI remains read-only even when called by writer

The publisher invokes permanent CI's reusable profile:

```text
CANDIDATE_REQUIRED
```

The called verifier must explicitly remain read-only.

The caller's write-capable token must not cause the verifier to gain publication authority.

Required reusable-workflow permission boundary:

```text
called verifier declares/receives only read authority needed by 3C
```

If reusable-workflow permission inheritance cannot guarantee this, use a separate read-only invocation topology.

No candidate verification step writes repository refs.

---

## 10. v1 decision — authoritative post-merge verification

RS2-4C freezes this v1 rule:

> The publisher authoritatively invokes `CANDIDATE_REQUIRED(C,P)` after the release-spec authorization has landed on main.

A pre-merge PR run may execute the same profile for early feedback.

But pre-merge evidence is:

```text
PREVIEW / NOT RELEASE AUTHORITY
```

for v1 publication.

Reason:

```text
avoids complex cross-run artifact attestation
avoids accidentally consuming a stale PR run
keeps release authority local to one post-authorization transaction
reuses the same permanent verifier code rather than duplicating assertions
```

This may cost a second test execution on release authorization PRs, but it does not fork verification logic.

Future evidence-backed optimization may reuse a prior identity-attested report only through a separately designed change.

---

## 11. Verification inputs

Publisher passes exactly:

```text
profile = CANDIDATE_REQUIRED
candidate_commit = C
expected_production_commit = P
candidate_fetch_ref = optional transport hint
```

The spec digest `S` and release identity are additionally supplied/verified if the CANDIDATE_REQUIRED interface supports them after implementation.

A mutable branch head is never substituted for `C`.

---

## 12. Required verifier outputs

Publisher requires:

```text
ci_conclusion == PASS
verified_candidate_commit == C
verified_production_commit == P
verifier_commit == V
report_sha256 == H
```

When available, also require:

```text
verified_candidate_latest_blob == L
verified_candidate_install_blob == L
release_spec_sha256 == S
```

Any mismatch:

```text
VERIFIER_IDENTITY_MISMATCH
→ no publication
```

---

## 13. Publication plan is pure data before write

Before touching `release-simcore`, the controller constructs a bounded publication plan:

```json
{
  "releaseId": "...",
  "authorizationCommit": "R",
  "releaseSpecPath": "Q",
  "releaseSpecSha256": "S",
  "candidateCommit": "C",
  "expectedProductionCommit": "P",
  "candidateReleaseBlob": "L",
  "releaseMode": "M",
  "verifierCommit": "V",
  "verificationReportSha256": "H"
}
```

No raw plugin body is required in the plan.

The plan is not authority by itself; it is a bounded record of already verified identities.

---

## 14. Pre-publish state check

Immediately before publication, fetch actual production and resolve:

```text
P_now = origin/release-simcore
```

Classify:

```text
P_now == P  → READY_TO_PUBLISH
P_now == C  → ALREADY_PROMOTED
else        → PRODUCTION_PARENT_MOVED
```

No spec field or cached earlier fetch may override `P_now`.

---

## 15. Candidate ancestry recheck

Before publication require:

```text
parent(C) == P
```

and candidate tree diff against `P` changes no path outside:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

This is rechecked by release-specific transaction logic even though permanent CI may also verify the same property.

Reason: ancestry/path are publication semantics, not duplicated behavioral correctness.

---

## 16. Candidate blob recheck

Before publication resolve from exact Git objects:

```text
L_now = blob(C:latest.js)
I_now = blob(C:install.js)
```

Require:

```text
L_now == L
I_now == L
```

If not:

```text
CANDIDATE_PUBLISH_BLOB_MISMATCH
→ BLOCKER
```

With immutable Git commits this should be impossible unless the transaction identities were corrupted/misresolved.

---

## 17. Release-mode relation recheck

Publisher performs release-transaction relation checks that do not duplicate product behavior.

### `NEW_VERSION`

Require candidate source version > current production source version.

### `SAME_VERSION_CORRECTION`

Require candidate source version == current production version and correction metadata/lifecycle remains eligible.

### `ROLLBACK`

Require rollback source identities/evidence are valid and candidate blobs match approved rollback target.

### `NOOP_IDENTICAL`

No ref movement.

A relation that no longer matches because production moved is stale, not auto-reclassified into another mode.

---

## 18. Product-local release concurrency

Workflow concurrency:

```yaml
concurrency:
  group: simcore-release
  cancel-in-progress: false
```

Purpose:

```text
reduce duplicate simultaneous publisher execution
keep one product's release attempts orderly
```

Not correctness authority.

GitHub Actions concurrency may coalesce/replace pending runs depending on platform behavior.

Therefore every run independently validates immutable tuple and current parent.

---

## 19. No cross-product release lock

Do not introduce:

```text
repo-release
repo-main-write
all-products-release
```

as a shared cancellation/concurrency correctness domain.

SimCore publishes only `release-simcore`.

Usage Dashboard and other products have separate production branches/transactions.

Cross-product correctness on `main` remains the established bounded main-write coordination problem, not a reason to couple release publishers.

---

## 20. Fast-forward publication command semantics

Publication is conceptually:

```text
git push origin C:refs/heads/release-simcore
```

with ordinary non-force semantics.

Because:

```text
parent(C) == P
and remote release-simcore == P
```

the push must be a fast-forward.

Forbidden:

```text
--force
--force-with-lease
+<refspec>
reset remote branch
GitHub API ref update with force=true
```

---

## 21. Race safety

Race window exists between pre-publish fetch and push.

Correct behavior:

```text
Run A verifies P
Run B publishes another child of P first
Run A ordinary push is rejected as non-fast-forward
Run A fetches current production
Run A classifies PRODUCTION_PARENT_MOVED
Run A fails closed
```

No retry against the new parent using the old CI PASS.

A new candidate/authorization transaction is required.

---

## 22. Duplicate same-transaction race

If two runs publish the same `C`:

```text
first run: P → C
second run: observes/pushes remote already C
```

Second run classifies:

```text
ALREADY_PROMOTED
```

if and only if production HEAD and verified blob identity exactly equal `C/L`.

It may continue to post-publish recovery stages without creating another commit.

---

## 23. `NOOP_IDENTICAL` publication behavior

If candidate runtime blob equals production runtime blob and no production change is required:

```text
publicationDisposition = NOOP_IDENTICAL
```

Do not move release-simcore to a same-tree synthetic commit merely to create release activity.

The authorization spec may be recorded as NOOP/aborted qualification evidence, but production identity stays unchanged.

---

## 24. Post-publish verification

After successful fast-forward, refetch production and require:

```text
origin/release-simcore == C
blob(release-simcore:latest.js) == L
blob(release-simcore:install.js) == L
latest/install path blobs identical
candidate commit message still matches validated release identity
```

Only then:

```text
publicationState = POST_PUBLISH_VERIFIED
```

A push command returning success without this ref/blob verification is insufficient.

---

## 25. Post-publish mismatch severity

Any mismatch after a reported successful publication is:

```text
POST_PUBLISH_IDENTITY_MISMATCH
= BLOCKER / RELEASE_INTEGRITY
```

The controller must preserve:

```text
expected C/P/L
observed production HEAD/blob
workflow run identity
```

and stop downstream state finalization.

Do not force-reset production automatically.

---

## 26. Production truth after successful ref movement

The moment `release-simcore` moves to `C`, actual production truth is `C` even before manifest/state sync completes.

Therefore the controller's final conclusion model distinguishes:

```text
PUBLICATION_FAILED
PUBLISHED_VERIFIED_ADMIN_PENDING
PUBLISHED_VERIFIED
```

A downstream administrative failure must not collapse `PUBLISHED_VERIFIED_ADMIN_PENDING` into a misleading generic failure that implies old production remains active.

---

## 27. Controller stage model

Frozen job/stage semantics:

```text
RESOLVE_AUTHORIZATION
VALIDATE_SPEC
VALIDATE_CURRENT_STATE
VERIFY_CANDIDATE_REQUIRED
BUILD_PUBLICATION_PLAN
ACQUIRE_PRODUCT_RELEASE_SERIALIZATION
RECHECK_PRODUCTION_PARENT
PUBLISH_FAST_FORWARD
VERIFY_PUBLISHED_IDENTITY
HANDOFF_STATE_SYNC
REPORT_TRANSACTION
```

Implementation may combine shell steps/jobs but must preserve these semantic boundaries.

---

## 28. No candidate materialization inside publisher after verification

4C publisher receives pre-existing canonical `C`.

It must not:

```text
cherry-pick W
squash W
patch latest.js
copy install.js
change version
rewrite commit message
construct C after CANDIDATE_REQUIRED
```

If candidate materialization is ever integrated into the same top-level workflow, it must happen in a distinct pre-verification stage and freeze `C` before the verifier runs.

The publication stage itself never materializes bytes.

---

## 29. No full behavioral regression fork

`simcore-release.yml` must not contain copies of:

```text
representation fixtures
community reaction fixtures
broadcast/time fixtures
summary scope fixtures
diagnostic-copy fixtures
architecture contract implementation
```

It calls permanent CI.

Release-specific checks are limited to transaction identity/publication semantics.

---

## 30. Permanent CI failure

If CANDIDATE_REQUIRED concludes anything other than identity-bound PASS:

```text
CANDIDATE_REQUIRED_FAILED
→ release-simcore unchanged
→ publication skipped
```

The release controller must not downgrade a failed required gate to warning based on release mode.

Rollback candidates are verified too.

---

## 31. State-drift precondition

Before v1 publication authority is promoted, `sync-state --check` must be operational and current canonical state must agree with deployed production.

Normal preflight:

```text
stateCheck = PASS
```

If:

```text
manifest release commit/version/name != actual release-simcore
```

then:

```text
PRODUCTION_STATE_DRIFT
→ no new release publication
```

This prevents compounding unresolved administrative identity drift.

---

## 32. `SAME_VERSION_CORRECTION` lifecycle check

Publisher must resolve the durable lifecycle state of the currently deployed release instance.

Normal allowed:

```text
LIVE_PENDING
DEPLOYED_PRE_LIVE
ADMIN_RECOVERY_REQUIRED before LIVE_PASS
```

Default forbidden:

```text
LIVE_PASS
CLOSED
```

If correction eligibility cannot be determined:

```text
CORRECTION_LIFECYCLE_UNKNOWN
→ fail closed
```

The controller must not infer eligibility from version equality alone.

---

## 33. `ROLLBACK` source check

For rollback, publisher validates:

```text
rollback source commit exists
rollback source was a recorded prior production identity or explicitly approved safe source
rollback source blob equals candidate release blob L
candidate C is still direct child of current P
```

The current production ref is not moved backward.

Normal publish remains:

```text
P → C_rollback
```

---

## 34. Controller output schema

Every run emits bounded machine-readable result conceptually containing:

```json
{
  "schemaVersion": 1,
  "releaseId": "...",
  "authorizationCommit": "R",
  "releaseSpecPath": "Q",
  "releaseSpecSha256": "S",
  "candidateCommit": "C",
  "expectedProductionCommit": "P",
  "candidateReleaseBlob": "L",
  "releaseMode": "M",
  "verifierCommit": "V",
  "verificationReportSha256": "H",
  "prePublishDisposition": "READY_TO_PUBLISH",
  "publicationDisposition": "PUBLISHED",
  "observedProductionCommit": "C",
  "observedProductionBlob": "L",
  "stateSyncDisposition": "PENDING",
  "reasonCode": "NONE"
}
```

No raw plugin source or long-chat content is embedded.

---

## 35. Artifact retention

Release transaction report may be uploaded as a bounded workflow artifact.

Artifact is evidence convenience, not canonical release identity authority.

Durable post-release evidence will be synchronized to main in 4D.

Artifact names must use release ID/short immutable identity, not raw user text.

---

## 36. Logging safety

The publisher may log:

```text
release ID
short/full commit identities
blob identities
mode
bounded disposition/reason codes
changed path list
verifier/report hashes
```

It should not dump full `latest.js` or `install.js` merely to prove identity.

Git SHA/blob IDs are sufficient.

---

## 37. Candidate-controlled output handling

Any parsed source metadata such as release name is treated as untrusted text and bounded before logging/output.

No candidate string may be injected unsafely into shell commands.

Use environment variables/quoted arguments or structured scripts.

The candidate commit SHA must satisfy strict full-hash validation before use in Git commands.

---

## 38. Candidate ref deletion during run

Once exact `C` has been fetched/materialized locally, later candidate-ref movement/deletion must not change what is verified or published.

Authority remains local/fetched `C` identity.

If the run cannot obtain `C` before verification:

```text
CANDIDATE_NOT_FETCHABLE
→ fail closed
```

Do not fall back to ref HEAD.

---

## 39. Controller source change protection

Changes to:

```text
.github/workflows/simcore-release.yml
release resolver/publisher tooling
release schema security semantics
```

are release infrastructure changes and must run permanent CI's protected `CI_SELF`/release-infrastructure gates.

They must not simultaneously authorize a real product release spec.

---

## 40. Workflow source and authorization commit separation

For a normal release-spec-only main commit `R`, controller workflow code already exists from an earlier reviewed main commit.

This is intentional.

If `R` somehow also changes controller code:

```text
RELEASE_AUTHORIZATION_SCOPE_MIXED
→ publication blocked
```

No release should be interpreted by brand-new unproven publisher code introduced by the same authorization commit.

---

## 41. Do not rely on token-authored release push to trigger state sync

GitHub Actions events caused by the workflow's own `GITHUB_TOKEN` may not start downstream workflows in the same way as ordinary user/merge events due to recursion-prevention behavior.

Therefore 4C explicitly forbids making correctness depend solely on:

```text
release workflow pushes release-simcore
→ hope release-simcore push event starts state-sync workflow
```

4D must define an explicit trusted state-sync handoff such as reusable workflow invocation or other deterministic same-run coordination.

Release-branch push-triggered state sync may remain a recovery/externally-triggered path, but not the only normal post-publish mechanism.

---

## 42. Controller conclusion model

Top-level release run conclusion must preserve stage truth.

Examples:

### Pre-publish failure

```text
productionMoved = false
status = RELEASE_BLOCKED
reason = CANDIDATE_REQUIRED_FAILED
```

### Publish success, state sync later fails

```text
productionMoved = true
status = PUBLISHED_ADMIN_RECOVERY_REQUIRED
productionCommit = C
reason = STATE_SYNC_FAILED
```

### Complete automated path

```text
productionMoved = true
status = LIVE_PENDING
productionCommit = C
reason = NONE
```

This prevents operational ambiguity.

---

## 43. Idempotent retry after admin failure

If production is already `C` and verified blob is `L`, a retry using the same `R/Q/S/C/P/L/M` tuple may:

```text
classify ALREADY_PROMOTED
skip publication mutation
rerun post-publish identity proof
resume state-sync/evidence handoff
```

It does not require a new product candidate or CI behavioral rerun if the implementation can prove the exact previously verified report is still bound and valid.

For v1 simplicity, re-running CANDIDATE_REQUIRED on retry is allowed and safe.

No new production commit is created.

---

## 44. Retry after production moved elsewhere

If production is neither `P` nor `C`:

```text
PRODUCTION_PARENT_MOVED
```

The old authorization cannot be replayed.

Even if candidate `C` would still fast-forward from an ancestor, the exact parent contract is broken.

Prepare a new release instance against current production.

---

## 45. No automatic release chaining

A queued second spec referencing the old `P` does not auto-rebase itself after the first release publishes.

It fails stale.

This prevents hidden release-order reinterpretation.

The second candidate must be reconstructed/re-authorized against new production.

---

## 46. Publication rollback on command failure

If ordinary push command fails before remote ref movement, production remains P.

If network result is ambiguous, the controller must refetch and classify actual remote state:

```text
HEAD == P → not published
HEAD == C → published
other     → parent moved/diverged
```

Do not guess based on local command exit text alone.

---

## 47. No automatic reverse ref mutation after post-publish failure

If remote has moved to `C`, post-publish verification/state-sync failure does not authorize resetting to P.

Recovery options:

```text
repair admin state
or prepare explicit ROLLBACK candidate
```

This preserves forward release history and evidence.

---

## 48. Shadow implementation mode

Before 4C becomes production authority, implementation must support a shadow mode that performs everything through publication-plan construction but never pushes `release-simcore`.

Shadow expected output:

```text
wouldPublish = C
currentParent = P
verifiedTuple = PASS
publicationPlan = VALID
productionMutation = NONE
```

Shadow does not count as a real release.

4D/4E define equivalence/retirement evidence.

---

## 49. Dry-run is not allowed to weaken verification

Shadow/dry-run may skip only the actual ref write and downstream production-dependent state mutation.

It must still execute:

```text
spec validation
state preflight
C/P identity checks
CANDIDATE_REQUIRED
path/blob/mode checks
publication plan generation
```

A lightweight syntax-only dry run does not prove release-controller readiness.

---

## 50. 4C failure codes

Reserved controller classes include:

```text
RELEASE_AUTHORIZATION_SCOPE_MIXED
RELEASE_AUTHORIZATION_NOT_FOUND
RELEASE_AUTHORIZATION_IDENTITY_MISMATCH
RELEASE_SPEC_INVALID
PRODUCTION_STATE_DRIFT
CANDIDATE_NOT_FETCHABLE
CANDIDATE_REQUIRED_FAILED
VERIFIER_IDENTITY_MISMATCH
CANDIDATE_PARENT_MISMATCH
CANDIDATE_PUBLISH_PATH_DENIED
CANDIDATE_PUBLISH_BLOB_MISMATCH
VERSION_RELATION_INVALID
CORRECTION_LIFECYCLE_UNKNOWN
CORRECTION_LIFECYCLE_NOT_ALLOWED
ROLLBACK_SOURCE_INVALID
PRODUCTION_PARENT_MOVED
PUBLISH_FAST_FORWARD_FAILED
PUBLISH_RESULT_AMBIGUOUS
POST_PUBLISH_IDENTITY_MISMATCH
STATE_SYNC_FAILED
```

Each report includes the stage at which it occurred.

---

## 51. 4C close criteria

Design closes when all are frozen:

```text
generic workflow path
normal main-spec trigger
immutable retry trigger
release-authorization event resolver
scope-mixed blocker
trusted code/candidate data split
least-privilege writer permissions
read-only reusable verifier boundary
post-merge authoritative CANDIDATE_REQUIRED rule
identity-bound verifier consumption
publication plan
P/C/blob/mode rechecks
product-local concurrency
fast-forward-only push
race and duplicate handling
NOOP behavior
post-publish identity verification
truth-preserving conclusion states
no token-push-only state-sync dependency
shadow mode
failure taxonomy
```

---

## 52. Handoff to RS2-4D

4D must define everything after verified publication plus proof against the old release writer:

```text
explicit state-sync invocation
manifest/current-state transition to deployed C
release evidence record schema
LIVE_PENDING representation
admin-recovery behavior
how release transaction output becomes durable main evidence
how legacy writer is shadow-compared
what command-PR compatibility remains, if any
candidate ref cleanup
how token-authored push recovery is handled
which old write workflows become forbidden for normal invocation
```

---

## 53. Frozen summary

RS2-4C freezes the permanent publisher as a thin transaction controller:

```text
immutable main authorization R/Q/S
        ↓
resolve C/P/L/M
        ↓
CANDIDATE_REQUIRED(C,P) authoritative PASS
        ↓
recheck production == P
        ↓
ordinary fast-forward release-simcore P → C
        ↓
post-publish HEAD/blob == C/L
        ↓
explicit state-sync handoff
```

The permanent release workflow does not build runtime bytes and does not own product regression logic.

Its job is to ensure that the exact commit permanent CI approved is the exact commit production receives.
