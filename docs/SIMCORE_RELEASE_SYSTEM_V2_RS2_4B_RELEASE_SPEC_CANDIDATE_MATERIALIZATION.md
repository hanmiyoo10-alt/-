# SimCore Release System v2 — RS2-4B Declarative Release Spec / Candidate Materialization

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4A_RELEASE_TRANSACTION_IDENTITY_AUTHORITY.md`
Entry contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`
Phase: `RS2-4 — Permanent Release Workflow`
Subphase: `RS2-4B — Declarative Release Spec / Candidate Materialization`
Authority class: release-infrastructure design / immutable release declaration and candidate construction contract

---

## 1. Purpose

RS2-4A froze the release transaction around one immutable production parent `P` and one immutable candidate `C`.

RS2-4B freezes the data and materialization rules that create the release tuple without introducing another version-specific executable workflow.

Core direction:

```text
version-specific facts = declarative JSON data
release mechanics      = permanent code
behavioral correctness = permanent CI
production bytes       = immutable candidate commit
```

RS2-4B defines:

```text
release-spec location and lifecycle
release-spec schema v1
append-only/immutable semantics
normal release authorization record
release ID rules
release modes and mode-specific fields
explicit ROLLBACK design correction
candidate source versus canonical candidate
canonical candidate materialization
candidate branch/ref transport
candidate commit message
version/release-name extraction
release blob binding
expected parent binding
live-gate declaration
bounded evidence references
security/non-executable data rules
release-spec PR shape
normal trigger direction for 4C
```

RS2-4B does **not**:

```text
implement the schema
implement the materializer
create a candidate
change release-simcore
change product-manifest.json
change runtime code
create .github/workflows/simcore-release.yml
activate publication
retire legacy workflows
```

---

## 2. Design correction discovered while entering 4B

RS2-4A correctly froze forward-history rollback:

```text
current production = C_bad
rollback candidate = C_rollback
parent(C_rollback) == C_bad
C_rollback contains approved prior-safe plugin bytes
fast-forward C_bad → C_rollback
```

But 4A's initial release-mode list also classified lower candidate versions as stale.

Those statements conflict when the exact prior-safe bytes contain an older `//@version`.

Classification:

```text
ROLLBACK_MODE_OMISSION
= FIX / DESIGN_GAP / PRE_IMPLEMENTATION
```

No repository/runtime behavior has implemented the conflicting rule.

RS2-4B therefore amends the release-mode taxonomy with one explicit mode:

```text
ROLLBACK
```

This amendment is narrow.

It does **not** turn arbitrary version regression into a valid release.

The corrected mode set from 4B onward is:

```text
NEW_VERSION
SAME_VERSION_CORRECTION
ROLLBACK
NOOP_IDENTICAL
STALE_OR_UNDECLARED
```

Any lower-version candidate without explicit `ROLLBACK` declaration remains fail-closed stale.

---

## 3. Canonical release-spec directory

Permanent release declarations live under:

```text
products/simcore/releases/specs/
```

Schema lives under:

```text
products/simcore/releases/release-schema-v1.json
```

The directory contains immutable historical release instances, not executable programs.

Do not create:

```text
simcore-0650-release.yml
simcore-0650-release.py
release-command-0650.yml
```

for ordinary future releases.

---

## 4. One deployment instance, one spec file

A release spec describes one attempted/authorized production deployment instance, not merely one semantic version.

This distinction is necessary because SimCore supports same-version pre-live correction.

Examples:

```text
v0.64.6 initial deployment          = one release instance
v0.64.6 closure correction          = another release instance
v0.65.0 normal deployment           = another release instance
rollback from v0.65.0 to safe bytes = another release instance
```

Therefore a version may have more than one immutable release spec.

Existing spec files are never edited to point to a new candidate.

A correction creates a new release instance/spec.

---

## 5. Release ID

Stable release-instance ID format:

```text
simcore-v<version>-<kind>-<ordinal>
```

Recommended examples:

```text
simcore-v0.65.0-new-01
simcore-v0.64.6-correction-01
simcore-v0.64.5-rollback-01
```

`ordinal` is two decimal digits within the version/kind namespace.

The exact parser may support future larger ordinals, but identifiers must remain bounded and filesystem-safe.

Required filename relationship:

```text
products/simcore/releases/specs/<releaseId>.json
```

and:

```text
spec.releaseId == filename stem
```

No title, branch name, or workflow name substitutes for `releaseId`.

---

## 6. Append-only immutability

Once a release spec is merged to `main`, it is immutable historical release intent.

Normal rules:

```text
add new spec      = allowed
edit merged spec  = forbidden
reuse old spec C  = forbidden if tuple changed
delete old spec   = forbidden during normal operation
```

If a declaration itself was wrong before publication:

```text
close/abort that release instance through evidence
add a new corrected spec
```

Do not silently rewrite history.

Permanent CI should eventually include an append-only guard for existing release specs.

---

## 7. Release-spec v1 minimum schema

Frozen conceptual schema:

```json
{
  "schemaVersion": 1,
  "releaseId": "simcore-v0.65.0-new-01",
  "product": "SimCore",
  "version": "0.65.0",
  "releaseName": "M2-3 Edit Reconcile Ownership Extraction",
  "releaseMode": "NEW_VERSION",
  "candidateCommit": "<40-hex C>",
  "expectedProductionCommit": "<40-hex P>",
  "candidateReleaseBlob": "<40-hex Git blob L>",
  "primaryGoalId": "M2-3",
  "changeClass": "RUNTIME_FEATURE",
  "evidenceRefs": ["docs/...#bounded-id"],
  "liveGate": {
    "required": true,
    "scenarioId": "M2_3_REAL_LONG_CHAT",
    "closeAuthority": "HUMAN_EVIDENCE"
  }
}
```

Mode-specific objects are described later.

Exact JSON Schema syntax belongs to implementation, but the semantic fields above are frozen.

---

## 8. Fields that are authority-bearing

Authority-bearing spec fields:

```text
schemaVersion
releaseId
product
version
releaseName
releaseMode
candidateCommit
expectedProductionCommit
candidateReleaseBlob
mode-specific authorization fields
```

Changing any authority-bearing value means a different release instance/spec digest.

The digest:

```text
S = SHA-256(canonical validated spec bytes)
```

is bound into the release transaction tuple.

---

## 9. Fields that are descriptive but bounded

Examples:

```text
primaryGoalId
changeClass
evidenceRefs
liveGate.scenarioId
human-readable bounded note/code
```

These fields provide provenance and routing context.

They must not be interpreted as arbitrary executable instructions.

No spec field may inject shell commands, JavaScript, file glob expansion, or workflow expressions.

---

## 10. Fields deliberately not configurable by a release spec

A release spec may **not** widen or disable permanent safety policy.

Forbidden configurable fields include conceptual equivalents of:

```text
allowedProductionPaths
skipRequiredGate
disableArchitectureCheck
allowForcePush
ignoreLatestInstallMismatch
ignoreProductionParent
writeMainPaths
workflowPermissions
arbitraryCommand
arbitraryScript
```

Those are permanent infrastructure policy, not version-specific release data.

If policy needs to change, change the permanent RS2 infrastructure through its own reviewed main PR.

---

## 11. Product and version rules

Required:

```text
product == "SimCore"
version matches bounded numeric dotted version grammar
candidate source //@version == spec.version
candidate runtime constant version == spec.version
```

The release system must not rewrite candidate version during publication.

If source version and spec version differ:

```text
RELEASE_SPEC_VERSION_MISMATCH
→ fail closed
```

---

## 12. Release-name authority

`releaseName` must match the current candidate's release header for the declared version.

Current production convention provides a source line conceptually shaped as:

```text
// v<version> <releaseName>:
```

The permanent parser must be bounded and deterministic.

Required:

```text
exactly one current-version release-name header
parsed source release name == spec.releaseName
```

Historical older release headers are allowed and ignored for current-name selection.

Failure classes:

```text
RELEASE_NAME_NOT_FOUND
RELEASE_NAME_AMBIGUOUS
RELEASE_SPEC_NAME_MISMATCH
```

---

## 13. Candidate release blob declaration

The spec declares:

```text
candidateReleaseBlob = L
```

Materialization/validation must prove:

```text
blob(C:latest.js) == L
blob(C:install.js) == L
```

The caller cannot point the spec at commit `C` and separately claim a blob from another candidate.

Mismatch:

```text
CANDIDATE_BLOB_BINDING_MISMATCH
→ fail closed
```

---

## 14. Expected production parent declaration

The spec declares exact parent:

```text
expectedProductionCommit = P
```

Candidate construction must prove:

```text
parent(C) == P
```

Release preparation must also have observed:

```text
release-simcore HEAD == P
```

The merged spec does not make `P` permanently current.

4C re-resolves production immediately before publish.

---

## 15. Release mode `NEW_VERSION`

Required relationship:

```text
candidate version > production version
candidate bytes differ from P
```

Required mode metadata:

```json
{
  "releaseMode": "NEW_VERSION",
  "newVersion": {
    "expectedParentVersion": "<version at P>"
  }
}
```

The parent version is a cross-check, not a replacement for exact parent commit `P`.

If exact `P` matches but parsed parent version does not match the declaration:

```text
EXPECTED_PARENT_VERSION_MISMATCH
→ fail closed
```

---

## 16. Release mode `SAME_VERSION_CORRECTION`

Required relationship:

```text
candidate version == production version
candidate blob != production blob
```

Required bounded metadata:

```json
{
  "releaseMode": "SAME_VERSION_CORRECTION",
  "correction": {
    "reasonCode": "PRE_LIVE_BLOCKER",
    "evidenceRefs": ["docs/...#BLOCKER_ID"],
    "priorLifecycleState": "LIVE_PENDING",
    "preserveReleaseName": true
  }
}
```

Allowed initial reason codes:

```text
PRE_LIVE_BLOCKER
DEPLOYMENT_CORRECTION
```

`ADMINISTRATIVELY_APPROVED_EXCEPTION` is not enabled by default in schema v1.

If future evidence requires it, add it through an explicit schema/policy change.

Required:

```text
priorLifecycleState != LIVE_PASS
preserveReleaseName == true by default
spec.releaseName == deployed semantic release name
```

A same-version candidate with different bytes and no explicit correction object fails:

```text
UNDECLARED_SAME_VERSION_DIVERGENCE
```

---

## 17. Release mode `ROLLBACK`

`ROLLBACK` is the explicit correction to the 4A mode omission.

It is the only normal mode allowed to deploy a source version lower than the current production version.

Required relationship:

```text
candidate source version <= current production version
candidate bytes are explicitly traced to an approved prior-safe production blob or approved reconstructed safe candidate
parent(C) == current production P
```

Preferred exact rollback source is a previously deployed production blob.

Required metadata:

```json
{
  "releaseMode": "ROLLBACK",
  "rollback": {
    "reasonCode": "LIVE_BLOCKER",
    "sourceReleaseCommit": "<prior safe production commit>",
    "sourceReleaseBlob": "<prior safe production blob>",
    "evidenceRefs": ["docs/...#BLOCKER_ID"],
    "targetSafetyState": "LAST_KNOWN_SAFE"
  }
}
```

Allowed initial rollback reason codes:

```text
LIVE_BLOCKER
POST_PUBLISH_BLOCKER
EMERGENCY_CORRECTNESS_ROLLBACK
```

The materializer must not merely move the release ref backward.

Instead it creates new `C` with:

```text
parent(C) == current P
latest/install blobs == declared approved rollback blob
```

Then the normal verify-and-fast-forward transaction applies.

This preserves forward Git history while restoring older safe runtime bytes.

---

## 18. `ROLLBACK` version semantics

The deployed `//@version` after rollback is whatever version is contained in the exact approved rollback bytes.

Therefore production version may decrease after an explicit rollback.

This is not treated as stale because the release mode is explicit and evidence-bound.

State sync must record the actual deployed source version after publication.

It must not keep the failed higher version in `product-manifest.json` merely because it was previously newer.

---

## 19. `NOOP_IDENTICAL`

A spec is normally unnecessary when candidate `C` is byte-identical to production.

If a retry/recovery path resolves:

```text
current production == C
or candidate blob == deployed blob with no release delta
```

4C may classify the transaction:

```text
NOOP_IDENTICAL
```

No new production commit/ref movement is allowed.

The spec remains immutable evidence of the intended release instance if it was already merged.

---

## 20. Change class

`changeClass` is bounded descriptive metadata.

Initial vocabulary:

```text
RUNTIME_FEATURE
CORRECTNESS_MINI
SAME_VERSION_CORRECTION
ROLLBACK
RELEASE_INFRA_QUALIFICATION
```

It does not select CI gates by itself.

Permanent CI profiles/classifier own required verification.

`RELEASE_INFRA_QUALIFICATION` must not alter runtime merely to exercise RS2-4.

---

## 21. Evidence references

`evidenceRefs` may contain only bounded repository-owned references.

Preferred shape:

```text
docs/<file>.md#<stable-id-or-section>
```

or a future structured evidence ID.

Forbidden in release spec:

```text
raw diagnostic body
full user conversation
raw exception stack
opaque external paste
secret/token
arbitrary URL used as executable input
```

The release controller treats evidence references as provenance strings, not code.

---

## 22. Live gate declaration

Every runtime-affecting release spec must declare a live gate.

Minimum:

```json
{
  "liveGate": {
    "required": true,
    "scenarioId": "<registered bounded scenario ID>",
    "closeAuthority": "HUMAN_EVIDENCE"
  }
}
```

The declaration does not auto-run or auto-pass the long-chat.

The automated release transaction ends at `LIVE_PENDING`.

A non-runtime infrastructure qualification may use:

```text
required = false
```

only when the candidate plugin bytes are identical and no production ref moves.

A real runtime publication never disables the live gate through spec convenience.

---

## 23. Source work commit versus canonical candidate

RS2-4B distinguishes:

```text
W = source/work commit
C = canonical release candidate commit
```

`W` is development provenance.

`C` is release authority.

A work branch may contain:

```text
multiple implementation commits
temporary development history
non-production branch organization
```

but `C` must satisfy the 4A direct-child and path rules.

No release uses `W` merely because it is the latest work branch head.

---

## 24. Direct candidate reuse

If a validated work commit already satisfies:

```text
parent(W) == P
changed paths exactly within production allowlist
latest/install identical
commit message contract valid
```

then:

```text
C = W
```

No extra synthetic candidate commit is created.

This is the preferred minimal path when development already produced a clean single release commit.

---

## 25. Canonicalization from multi-commit work

If `W` does not satisfy direct-candidate form, a permanent materializer constructs `C`.

Inputs:

```text
source_commit = W
expected_production_commit = P
release spec draft metadata
```

Materializer reads only approved production blobs from `W`:

```text
W:plugins/simcore/latest.js
W:plugins/simcore/install.js
```

It then constructs one Git tree equivalent to `P` except those two paths use the final `W` blobs.

Then it creates one commit:

```text
parent(C) = P
```

with canonical release commit message.

It does **not** replay arbitrary work commits or copy main-side files.

---

## 26. Candidate materialization invariants

Before creating/publishing candidate ref, require:

```text
W exists in same repository
P exists in same repository
P == observed release-simcore at preparation time
W latest/install exist
W latest blob == W install blob
source parses as expected version/name
no production path outside fixed allowlist selected
constructed tree differs from P only at allowed production paths
C parent exactly P
C latest/install blobs exactly source W blobs
```

Materializer does not decide product correctness.

Permanent CI does that after `C` is frozen.

---

## 27. Candidate materializer must not execute work-branch code

The materializer treats `W` as data/blob source.

It may:

```text
read Git tree/blob objects
parse bounded version/name metadata
construct Git tree/commit objects
```

It may not:

```text
execute scripts from W
source shell files from W
run package hooks from W
trust workflow YAML from W
allow W to define production path policy
```

This protects the release writer from candidate-controlled code execution.

---

## 28. Candidate ref transport

Canonical candidate commit `C` must be fetchable by permanent CI and the publisher.

Preferred transport namespace:

```text
refs/heads/simcore-release-candidate/<releaseId>
```

or an equivalent bounded same-repository ref.

The exact branch naming may be implementation-adjusted.

Authority rule is fixed:

```text
candidate ref = transport hint
candidate commit SHA C = authority
```

If the ref later moves but caller still names `C`, the verifier/publisher uses `C`.

If `C` is no longer fetchable/reachable under repository retention policy, release fails rather than substituting the ref's new head.

---

## 29. Candidate ref mutation policy

Preferred:

```text
one releaseId candidate ref created once
no force movement
```

If candidate changes before release authorization, create a new release instance/ref or use a new bounded candidate revision, rather than silently moving an already-authorized candidate ref.

After release/abort, ref cleanup may be allowed later because durable authority is commit SHA + release spec/evidence, but cleanup policy belongs to 4D/4E.

---

## 30. Candidate commit-message contract

Because `C` becomes the production commit, its message is frozen before verification.

Subject:

```text
SimCore v<version> <releaseName>
```

Required bounded trailers:

```text
Release-Id: <releaseId>
Release-Mode: <mode>
```

Mode-specific recommended trailers:

```text
Correction-Reason: <reasonCode>
Rollback-Source: <commit/blob identity>
```

The exact trailer parser is case-sensitive and deterministic.

The publisher never amends or rewrites the candidate message after PASS.

---

## 31. Commit message versus source release header

Required relationship:

```text
commit subject version == spec.version
commit subject releaseName == spec.releaseName
source current release header version/name == spec.version/releaseName
```

For `SAME_VERSION_CORRECTION`, the semantic release name remains unchanged by default even though the release instance and commit are new.

Correction identity lives in `Release-Id`, `Release-Mode`, and evidence, not by silently inventing a second product release name.

---

## 32. Release-spec authorization PR

Normal future release intent is represented by a dedicated PR to `main` that adds exactly one new release spec.

Preferred PR diff:

```text
+ products/simcore/releases/specs/<releaseId>.json
```

No runtime file belongs in this main PR.

The runtime candidate already exists as immutable `C` in the repository.

The release-spec PR may be reviewed and validated by permanent CI without merging runtime code into main.

---

## 33. Why release authorization belongs on main

`main` already owns:

```text
design
evidence
release policy
permanent CI
administrative records
```

Therefore a merged immutable release spec is a durable authorization record without making `main` the runtime branch.

This eliminates title-magic command PR authority.

The merge event says only:

```text
this exact release tuple may enter the permanent release transaction
```

It does not itself publish production.

---

## 34. Release-spec PR scope rule

Normal release authorization PR should not mix:

```text
release-system implementation changes
CI policy changes
runtime source changes
manifest repair
unrelated product changes
```

with the release spec.

If evidence/docs had to be added, land them before the authorization spec PR when practical.

This preserves one release, one primary goal and keeps the release trigger diff bounded.

---

## 35. Spec selection — event-bound, not current-version scan

The normal 4C publisher should not search all specs and guess which one is current.

Preferred normal resolution:

```text
main commit that authorizes release
→ exactly one newly added release spec path
→ freeze exact main commit R
→ freeze exact spec blob/digest S
→ use that spec
```

This avoids:

```text
current-release pointer drift
multiple same-version correction ambiguity
historical spec collision
latest-file guessing
```

For retry/manual recovery, caller must provide immutable:

```text
release_authorization_commit = R
release_spec_path
release_spec_digest = S
```

not merely `version=0.65.0`.

---

## 36. Existing spec mutation is a blocker

If the authorizing main diff modifies an existing release spec instead of adding a new one:

```text
RELEASE_SPEC_HISTORY_MUTATION
→ BLOCKER
```

If multiple new specs are added in one normal release authorization commit:

```text
RELEASE_SPEC_EVENT_AMBIGUOUS
→ fail closed
```

Batch release authorization is intentionally unsupported in schema v1.

---

## 37. Pre-merge permanent-CI behavior

A release-spec PR is SimCore release infrastructure and should be classified substantively by permanent CI.

At minimum PR validation should check:

```text
schema valid
spec path/ID valid
C and P exist
candidate direct-child shape valid
candidate latest/install identical
candidate version/name/blob match spec
release mode relationship valid
manifest/release state check not contradicted
no existing spec mutation
```

Whether the full `CANDIDATE_REQUIRED` product suite runs pre-merge or is invoked authoritatively immediately after merge is finalized in 4C.

4B requires only that no publisher may skip it.

---

## 38. Normal event direction handed to 4C

Preferred normal pipeline direction:

```text
validated work W
→ canonical candidate C created
→ release spec referencing C/P/L created on main branch PR
→ PR permanent checks
→ spec PR merged to main
→ immutable authorization commit R
→ generic simcore-release controller resolves exact new spec
→ CANDIDATE_REQUIRED identity proof
→ publish exact C
```

This removes per-version command workflow creation.

A compatibility trigger may exist temporarily, but it must resolve the same `R/S/C/P/L` identities.

---

## 39. Release authorization tuple extension

4A tuple:

```text
T = { C, P, L, I, M, S }
```

4B adds authorization identity:

```text
R = release_authorization_main_commit
Q = release_spec_path
```

Normal full release authorization tuple becomes:

```text
A = {
  authorization_commit: R,
  release_spec_path: Q,
  release_spec_digest: S,
  candidate_commit: C,
  expected_production_commit: P,
  candidate_release_blob: L,
  release_mode: M
}
```

Every retry must bind the same tuple or become a new release attempt.

---

## 40. No arbitrary code in release data

Schema validation must reject unknown execution-shaped fields rather than ignore them.

Release spec is closed-schema data.

Prefer:

```text
additionalProperties = false
```

for security-relevant objects.

Bounded strings must have length limits.

Arrays must have item-count limits.

Evidence refs and scenario IDs must use constrained patterns.

This prevents the permanent release controller from evolving into an interpreter for candidate-supplied instructions.

---

## 41. No spec-controlled permissions

GitHub workflow permissions are fixed in permanent workflow source.

The spec cannot request:

```text
contents: write beyond release need
pull-requests: write
actions: write
secrets
admin
branch protection changes
```

Any future permission change is a separate RS2 infrastructure change and must re-run the appropriate permanent CI trust-boundary gates.

---

## 42. Manifest drift and spec preparation

At current design freeze, manifest/release identity is stale.

Therefore no production release spec should be treated as operationally publishable until RS2-2 state closure restores:

```text
manifest release_commit == release-simcore HEAD
manifest deployed version/name == source at release-simcore
```

A spec may be drafted for design/testing, but publication remains blocked by `PRODUCTION_STATE_DRIFT`.

4B does not repair the manifest.

---

## 43. Materializer deterministic output

Given the same:

```text
W
P
releaseId
version
releaseName
releaseMode
```

and the same commit identity inputs required by Git, the materializer must produce a predictable canonical tree and message contract.

If author/committer timestamps make commit SHA nondeterministic, the tool must explicitly freeze their source or report the resulting candidate SHA as the canonical immutable output before any release spec is authorized.

The important invariant is not necessarily reproducible SHA from arbitrary wall-clock reruns; it is:

```text
once C is created and authorized, C never changes
```

and its tree/message are fully validated.

---

## 44. Candidate materialization write boundary

Candidate materialization may create a non-production candidate ref.

It may not write:

```text
release-simcore
main
product-manifest.json
current-state docs
```

in the same operation.

This keeps candidate construction recoverable and non-deploying.

Publishing `release-simcore` belongs only to 4C.

---

## 45. Candidate cleanup is not part of correctness

Candidate refs are transport convenience.

Correctness/evidence authority after authorization is:

```text
C commit SHA
R authorization main commit
S spec digest
L release blob
```

Candidate branch deletion after release must not erase historical identity.

Cleanup policy is deferred to 4D/4E.

---

## 46. 4B failure codes

Reserved bounded classes:

```text
RELEASE_SPEC_SCHEMA_INVALID
RELEASE_SPEC_ID_INVALID
RELEASE_SPEC_HISTORY_MUTATION
RELEASE_SPEC_EVENT_AMBIGUOUS
RELEASE_SPEC_VERSION_MISMATCH
RELEASE_SPEC_NAME_MISMATCH
RELEASE_NAME_NOT_FOUND
RELEASE_NAME_AMBIGUOUS
EXPECTED_PARENT_VERSION_MISMATCH
CANDIDATE_BLOB_BINDING_MISMATCH
CANDIDATE_SOURCE_NOT_FOUND
CANDIDATE_SOURCE_EXECUTION_FORBIDDEN
CANDIDATE_DIRECT_CHILD_REQUIRED
CANDIDATE_MATERIALIZATION_PATH_DENIED
CANDIDATE_MATERIALIZATION_IDENTITY_MISMATCH
CORRECTION_LIFECYCLE_NOT_ALLOWED
ROLLBACK_SOURCE_NOT_APPROVED
ROLLBACK_SOURCE_BLOB_MISMATCH
UNDECLARED_SAME_VERSION_DIVERGENCE
UNDECLARED_DOWNGRADE
```

Failure before production publication leaves `release-simcore` unchanged.

---

## 47. 4B close criteria

Design closes when these are frozen:

```text
spec directory/schema path
one deployment instance per immutable spec
releaseId rule
closed-schema/non-executable data rule
spec authority-bearing fields
fixed policy not spec-configurable
version/name/blob/parent binding
NEW_VERSION fields
SAME_VERSION_CORRECTION fields
explicit ROLLBACK mode and fields
NOOP semantics
work commit W versus canonical C
DIRECT reuse rule
canonicalization algorithm
candidate ref transport semantics
candidate commit-message contract
release-spec authorization PR model
event-bound unique spec selection
R/Q/S authorization identity
materialization write boundary
```

---

## 48. Handoff to RS2-4C

4C must implement/design the permanent controller around the frozen authorization tuple:

```text
A = { R, Q, S, C, P, L, M }
```

4C must answer:

```text
exact workflow triggers
permissions
which stage runs read-only versus write-capable
whether PR CANDIDATE_REQUIRED evidence is reused or re-run after merge
how report identity is transported
how publisher rechecks P
how release-simcore fast-forward is performed without force
how duplicate/retry runs classify READY / ALREADY_PROMOTED / STALE
how races are handled
how post-publish HEAD/blob verification works
how workflow reports publication truth even if downstream state sync fails
```

---

## 49. Frozen summary

RS2-4B freezes the durable release data model:

```text
immutable spec on main
        ↓
A = { R, Q, S, C, P, L, M }
        ↓
C is one direct-child release commit
        ↓
C contains only final identical latest/install production bytes
```

and replaces version-specific executable release metadata with bounded declarative records.

The release spec can describe a release.

It cannot redefine the safety system that releases it.
