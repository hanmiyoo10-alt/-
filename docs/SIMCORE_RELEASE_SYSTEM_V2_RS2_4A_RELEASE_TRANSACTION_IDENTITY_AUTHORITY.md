# SimCore Release System v2 — RS2-4A Release Transaction / Identity / Authority

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Entry contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3E_PROMOTION_CLOSE_GATE_RS2_4_HANDOFF.md`
Phase: `RS2-4 — Permanent Release Workflow`
Subphase: `RS2-4A — Release Transaction / Identity / Authority`
Authority class: release-infrastructure design / production promotion transaction contract

---

## 1. Purpose

RS2-4 replaces SimCore's version-specific executable release path with one permanent, identity-bound, fail-closed release transaction.

RS2-4A freezes the transaction model before any trigger, release-spec schema, workflow YAML, promotion helper, state writer, or legacy retirement is implemented.

Its central rule is:

> Materialize once → freeze one immutable candidate commit → verify that exact candidate against one exact production parent → promote that exact verified commit without rebuilding → verify production identity → synchronize administrative state separately.

RS2-4A defines:

```text
release authority boundaries
canonical candidate shape
immutable identity tuple
production-parent authority
candidate/parent ancestry rule
release transaction states
same-version correction semantics
exact-byte promotion semantics
allowed release paths
read/write trust split
concurrency versus correctness
idempotency classes
pre-publish and post-publish failure boundary
rollback direction
RS2-4B through RS2-4E decomposition
```

RS2-4A does **not**:

```text
implement .github/workflows/simcore-release.yml
implement the release-spec schema
choose the final user/event trigger
change release-simcore
change main
change product-manifest.json
change latest.js or install.js
bump SimCore version
start M2-3
activate CANDIDATE_REQUIRED as release authority
retire any existing release workflow
run a production release
```

---

## 2. Current repository facts at design freeze

Observed authority facts:

```text
main HEAD
= 1db8f11eb0635bf6fa9fa4d2123a598c81dba548

release-simcore HEAD
= 47969d24771f6cc188df6e32150fc6fde519182d

release-simcore current runtime
= SimCore v0.64.6 closure-completion eligibility hardening
```

The active legacy generic-looking file:

```text
.github/workflows/simcore-release-command.yml
```

is not actually a permanent release controller. It is hard-coded to historical v0.63.54 state, patch tooling, markers, and commit message, and it combines release mutation with memory synchronization.

Therefore its current classification is:

```text
LEGACY_VERSION_BOUND_RELEASE_WRITER
= TRANSITIONAL / NOT FUTURE AUTHORITY
```

The current `product-manifest.json` observed on `main` still declares v0.64.3 / release commit `d7fd45cd...` while `release-simcore` is already at v0.64.6 / `47969d24...`.

Classification:

```text
PRODUCTION_IDENTITY_MANIFEST_DRIFT
= BLOCKER / STATE_AUTHORITY / PRE_RS2_4_IMPLEMENTATION
```

This does not change runtime production authority: `release-simcore` remains the code that actually runs.

It does mean permanent release automation must not be promoted while canonical administrative release identity is stale.

The drift belongs to RS2-2/state-sync operational closure, not to a runtime repair and not to RS2-4A implementation.

---

## 3. RS2-4 phase decomposition

RS2-4 is frozen into five subphases.

### RS2-4A — Release Transaction / Identity / Authority

Freeze:

```text
who owns what
immutable candidate form
expected production parent
release state machine
promotion identity
same-version correction class
failure boundary
```

### RS2-4B — Declarative Release Spec / Candidate Materialization Contract

Freeze:

```text
release-spec schema
release mode metadata
candidate creation rules
candidate branch/reference transport
allowed paths
version/name assertions
expected parent declaration
release reason/evidence fields
live-gate declaration
```

### RS2-4C — Permanent Promotion Controller / Atomic Publish / Concurrency

Freeze:

```text
workflow topology
CANDIDATE_REQUIRED invocation
identity-bound output consumption
compare-and-swap parent recheck
fast-forward publication
idempotency
race handling
post-publish verification
permissions
```

### RS2-4D — Post-Publish State Sync / Evidence / LIVE_PENDING / Legacy Writer Shadow

Freeze:

```text
state-sync handoff
manifest timing
release evidence
LIVE_PENDING transition
post-publish administrative recovery
legacy writer shadow/rehearsal
command-PR compatibility if required
```

### RS2-4E — Promotion / Real Release Proof / Rollback Rehearsal / Legacy Retirement

Freeze:

```text
first real release qualification
shadow proof
rollback rehearsal
legacy writer retirement
RS2-4 close record
future release operating procedure
RS2-5 handoff eligibility
```

No later subphase may weaken 4A identity rules merely to simplify workflow YAML.

---

## 4. Authority split

The permanent system keeps the existing SimCore authority separation.

### 4.1 `release-simcore`

Authority for:

```text
actual deployed plugin code
current production Git commit
current production plugin blobs
```

The release transaction resolves the expected production parent from the actual `release-simcore` ref.

It does not infer the current production commit from a planning document or release request.

### 4.2 `main`

Authority for:

```text
release policy
permanent CI
permanent tests
release-spec schema and records
state-sync tooling
release evidence
roadmap/admin state
```

`main` is not the deployed runtime branch.

### 4.3 `product-manifest.json`

Authority for the synchronized declarative release identity after RS2-2 is operational.

At normal RS2-4 entry, `sync-state --check` must prove that manifest identity agrees with `release-simcore`.

The manifest is not used to override a contradictory actual release ref.

If manifest and release ref disagree:

```text
PRODUCTION_STATE_DRIFT
→ release blocked
→ state authority repaired separately
```

### 4.4 Permanent CI

Authority for product/release-candidate verification policy.

It remains read-only.

### 4.5 Permanent release controller

Authority only for the bounded production promotion transaction.

It must not own behavioral regression logic or human live validation judgment.

---

## 5. Canonical production-parent identity

Every release transaction freezes one expected production parent:

```text
P = expected_production_commit
```

`P` must be the exact `release-simcore` HEAD resolved at transaction preparation time.

Required properties:

```text
full 40-hex Git commit SHA
exists in same repository
is current release-simcore HEAD at preparation time
is passed to CANDIDATE_REQUIRED
is returned as verified_production_commit
is rechecked immediately before publication
```

A branch name alone is never sufficient authority.

If the release branch moves from `P` before publication:

```text
PRODUCTION_PARENT_MOVED
→ no publication
→ prior CI result not reusable
→ candidate must be re-evaluated against the new parent
```

---

## 6. Canonical candidate commit

The canonical deployable candidate is one immutable Git commit:

```text
C = candidate_commit
```

Normal candidate form is frozen as:

```text
parent(C) == P
C changes only approved SimCore production paths
C contains final latest.js bytes
C contains final install.js bytes
latest blob == install blob
C contains no post-verification build placeholder
```

The preferred and normal production path is therefore:

```text
P = current release-simcore
        ↓
materialize candidate branch
        ↓
create one canonical release commit C
where parent(C) == P
        ↓
verify C against P
        ↓
fast-forward release-simcore P → C
```

This is intentionally stronger than merely verifying some source and later constructing a new production commit.

The **verified candidate commit itself becomes the production commit**.

---

## 7. Why direct-child candidate is required

Requiring:

```text
parent(C) == P
```

provides these properties:

```text
one release = one production commit
no hidden intermediate release history
no cherry-pick interpretation difference
no post-PASS tree reconstruction
no merge commit ambiguity
simple fast-forward publication
simple rollback provenance
simple candidate/production identity comparison
```

If development required many work commits, those commits are not themselves the canonical release candidate.

Before required verification, they must be materialized/squashed into one final canonical candidate `C` whose only parent is `P`.

The materialization process belongs to RS2-4B.

---

## 8. Production path allowlist

The normal permanent SimCore production candidate may change exactly these production delivery paths:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

The candidate must not carry into `release-simcore`:

```text
docs/**
products/simcore/tests/**
products/simcore/tooling/**
.github/**
product-manifest.json
release evidence
temporary patch scripts
work-branch helpers
```

Therefore the release commit is intentionally narrow even when the development branch used broader main-side infrastructure.

If future production delivery genuinely requires another path, the allowlist must change through an explicit RS2 infrastructure design change before a release uses it.

---

## 9. Candidate blob identity

For candidate `C`:

```text
L = blob(C:plugins/simcore/latest.js)
I = blob(C:plugins/simcore/install.js)
```

Required:

```text
L == I
```

The verifier/release report should bind at least:

```text
candidate_commit = C
expected_production_commit = P
candidate_latest_blob = L
candidate_install_blob = I
```

Since `L == I`, the shared blob may be reported as:

```text
candidate_release_blob
```

but the verifier should still prove both file paths resolve to that blob.

---

## 10. Immutable release transaction tuple

The minimum authority-bearing release tuple is:

```text
T = {
  candidate_commit: C,
  expected_production_commit: P,
  candidate_latest_blob: L,
  candidate_install_blob: I,
  release_mode: M,
  release_spec_digest: S
}
```

Where:

```text
C = immutable candidate commit
P = immutable expected production parent
L = latest.js candidate blob
I = install.js candidate blob
M = release mode
S = validated declarative release-spec digest
```

`C` and `P` are the primary Git authority identities.

`L`, `I`, and `S` prevent a later caller from silently changing artifact or release-declaration interpretation while reusing an old PASS.

The exact RS2-4B schema may add bounded metadata without removing these identities.

---

## 11. Verification handoff

RS2-4 consumes the RS2-3E callable profile:

```text
profile = CANDIDATE_REQUIRED
candidate_commit = C
candidate_fetch_ref = optional transport hint
expected_production_commit = P
```

Required verifier output:

```text
ci_conclusion = PASS
verified_candidate_commit = C
verified_production_commit = P
verifier_commit = V
report_sha256 = H
```

Recommended identity additions:

```text
verified_candidate_latest_blob = L
verified_candidate_install_blob = I
release_spec_sha256 = S
registry_sha256
contract_sha256
```

The release controller may not accept:

```text
passed=true
```

without identity-bound outputs.

---

## 12. Release modes

SimCore history requires more than a strictly increasing-version model.

RS2-4A freezes these release modes.

### 12.1 `NEW_VERSION`

Candidate version is greater than the deployed production version according to the frozen SimCore version comparator.

Normal case:

```text
0.64.5 → 0.64.6
0.64.6 → 0.65.0
```

### 12.2 `SAME_VERSION_CORRECTION`

Candidate version equals the deployed version, but candidate bytes differ and a bounded release declaration explicitly authorizes correction of the already-deployed version before final closure.

Historical motivating shape:

```text
initial v0.64.6 candidate
→ pre-live BLOCKER discovered
→ corrected v0.64.6 candidate
→ same version/name retained
```

This is a legitimate SimCore safety operation and must remain expressible.

Requirements are stricter than `NEW_VERSION`:

```text
explicit release_mode = SAME_VERSION_CORRECTION
explicit correction reason/evidence ID
expected production parent P exact
candidate differs from P only on allowed paths
candidate version == production version
release name compatibility checked
no claim that the previous candidate was LIVE_PASS
```

RS2-4B/4C will freeze the exact declaration fields and live-state constraints.

### 12.3 `NOOP_IDENTICAL`

Candidate resolves to the same production blobs already deployed.

No release commit is created and no ref is moved.

The transaction may still report an idempotent success and resume any missing post-publish administrative synchronization if identity proves the same deployment.

### 12.4 `STALE_OR_UNDECLARED`

Examples:

```text
candidate version < production version
same version + different bytes without SAME_VERSION_CORRECTION
candidate parent != expected production P
release mode disagrees with version relationship
```

These fail closed.

---

## 13. Same-version correction is not general mutable-version permission

`SAME_VERSION_CORRECTION` is deliberately narrow.

It must not become a way to silently rewrite a historically closed/live-passed release.

At minimum, later design must require a bounded correction disposition such as:

```text
PRE_LIVE_BLOCKER
DEPLOYMENT_CORRECTION
ADMINISTRATIVELY_APPROVED_EXCEPTION
```

and evidence that the correction is still within the release's allowed lifecycle.

If a release has already been durably closed as `LIVE_PASS`, the default correction mechanism should be a new version, not a same-version rewrite.

Any exception after LIVE_PASS requires separate explicit design/evidence and must not be inferred automatically.

---

## 14. Two authority phases — verification and publication

The transaction is divided into two authorities.

### Phase A — read-only verification

```text
resolve C and P
validate release declaration
validate candidate shape
invoke CANDIDATE_REQUIRED(C, P)
receive identity-bound PASS
```

No production ref write occurs.

### Phase B — bounded publication

```text
serialize SimCore release writer
re-resolve release-simcore HEAD
require HEAD == P
require candidate C still resolves to verified blobs
require verifier identities still match transaction tuple
fast-forward release-simcore P → C
verify release-simcore HEAD == C
verify production latest/install blobs == L/I
```

No product behavior is rebuilt or re-tested by the publisher.

---

## 15. Atomic publication definition

For RS2-4, atomic publication means:

```text
before successful ref update:
  production == P

after successful ref update:
  production == C
```

There is no supported intermediate production state containing only one of the two plugin files.

Because candidate `C` already contains both final production files and is a direct child of `P`, publication is one fast-forward branch-ref transition.

The publisher does not commit `latest.js` and `install.js` separately.

---

## 16. No post-verification rebuild

Forbidden:

```text
verify C
→ run patch/materializer again
→ produce D
→ publish D
```

Forbidden:

```text
verify source branch
→ construct release commit after PASS
```

Required:

```text
materialize canonical C first
→ verify C
→ publish exact C
```

If any step would alter production bytes, it occurs before `CANDIDATE_REQUIRED` and produces a new candidate commit requiring a new verification tuple.

---

## 17. Fast-forward only

Normal publication must be:

```text
release-simcore P → C
```

with:

```text
parent(C) == P
```

and no force update.

Forbidden:

```text
--force
--force-with-lease
reset production ref backward
merge an unrelated branch history into release-simcore
replace P after verification without rerun
```

A failed ordinary fast-forward due to concurrent movement is evidence of a race, not permission to force.

---

## 18. Concurrency is serialization, not correctness authority

The permanent release workflow may use one product-local concurrency domain such as:

```text
simcore-release
cancel-in-progress: false
```

This reduces duplicate simultaneous publishers.

But correctness must not depend solely on GitHub Actions concurrency.

The real correctness guards are:

```text
immutable P
immutable C
parent(C) == P
identity-bound CANDIDATE_REQUIRED PASS
pre-publish HEAD == P recheck
ordinary fast-forward only
post-publish HEAD/blob verification
```

If two release attempts race, at most the transaction whose expected parent still equals current production may publish.

The loser fails closed with parent movement/stale transaction evidence.

No repository-wide cross-product cancellation group is introduced.

---

## 19. Normal release state machine

Frozen transaction states:

```text
PREPARED
  ↓
CANDIDATE_FROZEN
  ↓
VERIFYING
  ↓
VERIFIED
  ↓
PUBLISH_READY
  ↓
PUBLISHED
  ↓
POST_PUBLISH_VERIFIED
  ↓
STATE_SYNC_PENDING
  ↓
LIVE_PENDING
```

`LIVE_PENDING` is the end of automated deployment authority.

Real long-chat validation remains separate.

Later live states remain conceptually:

```text
LIVE_PENDING
  ↓
LIVE_PASS
```

or evidence-driven failure/reopen states.

The publisher never auto-claims `LIVE_PASS`.

---

## 20. Failure state vocabulary

RS2-4A reserves these bounded failure classes.

Pre-publish:

```text
RELEASE_SPEC_INVALID
PRODUCTION_STATE_DRIFT
CANDIDATE_NOT_IMMUTABLE
CANDIDATE_PARENT_MISMATCH
CANDIDATE_PATH_DENIED
LATEST_INSTALL_MISMATCH
VERSION_RELATION_INVALID
UNDECLARED_SAME_VERSION_DIVERGENCE
CANDIDATE_REQUIRED_FAILED
VERIFIER_IDENTITY_MISMATCH
PRODUCTION_PARENT_MOVED
PUBLISH_FAST_FORWARD_FAILED
```

Post-publish:

```text
POST_PUBLISH_HEAD_MISMATCH
POST_PUBLISH_BLOB_MISMATCH
STATE_SYNC_FAILED
EVIDENCE_RECORD_FAILED
```

A post-publish administrative failure must not misreport production as still equal to `P` if the ref has already moved to `C`.

---

## 21. Pre-publish failure invariant

Any failure before the successful `release-simcore` ref update must leave production unchanged.

Required invariant:

```text
transaction conclusion != PUBLISHED
→ release-simcore remains P
```

If tooling cannot prove this property, promotion is not safe to activate.

---

## 22. Post-publish failure invariant

Once the production ref successfully moves to `C`, the system must preserve that fact even if later administrative work fails.

Forbidden response to a state-sync failure:

```text
claim release failed and old P is still production
```

Required response:

```text
production = C
release state = PUBLISHED / ADMIN_RECOVERY_REQUIRED
state-sync/evidence = pending or failed
```

Repair proceeds from actual production identity.

This is why publication and state synchronization are distinct transaction stages.

---

## 23. Idempotency classes

A rerun must classify current production before acting.

### 23.1 `READY_TO_PUBLISH`

```text
HEAD == P
candidate C valid direct child of P
verified tuple valid
```

Publication may proceed.

### 23.2 `ALREADY_PROMOTED`

```text
HEAD == C
production blobs == verified L/I
```

Do not create another release commit.

Resume only missing post-publish verification/state-sync/evidence stages.

### 23.3 `PRODUCTION_PARENT_MOVED`

```text
HEAD != P
HEAD != C
```

Transaction is stale and may not publish.

### 23.4 `PRODUCTION_DIVERGED_AT_CANDIDATE`

```text
HEAD == C
but expected production blobs do not equal verified L/I
```

This should be impossible for immutable Git identity and is a BLOCKER if observed.

---

## 24. Release commit identity equals candidate identity

Normal successful RS2-4 publication freezes:

```text
release_commit == candidate_commit == C
```

This is a deliberate simplification.

The transaction does not need a second synthetic production commit merely to say "release".

Release metadata/evidence belongs on `main`, not as unverified extra mutation inside the production commit.

Benefits:

```text
what CI verified == what production runs
commit identity is directly comparable
blob identity is directly comparable
rollback provenance is simpler
no build-after-PASS gap
```

---

## 25. Release commit message

Because the candidate commit itself becomes production, its commit message must already be suitable as durable release provenance before verification.

RS2-4B will define the bounded candidate commit-message contract.

The publisher must not rewrite the commit message after PASS.

---

## 26. Runtime change and release-system change remain separate

RS2-4 implementation is release infrastructure work.

It must not be combined with:

```text
M2-3 runtime ownership extraction
new SimCore behavior
reaction grammar change
representation semantics change
broadcast/time behavior change
new persistent state
plugin version bump solely to test RS2-4
```

The first RS2-4 real release proof should use a separately authorized runtime/correctness release or a deliberately safe infrastructure qualification path defined later.

Do not invent a fake runtime change merely to exercise the release controller.

---

## 27. State synchronization is downstream, not embedded release truth

After publication:

```text
release-simcore == C
```

is the immediate production truth.

Then RS2-2/4D synchronizes:

```text
product-manifest.json
machine-managed current-state blocks
bounded release evidence
```

If sync fails, production does not revert automatically.

The state writer must recover from actual `release-simcore` identity.

---

## 28. Live validation remains a human/evidence gate

The permanent release controller ends at:

```text
LIVE_PENDING
```

It may prepare the expected live validation scenario from the release declaration, but it must not fabricate a live result.

The established SimCore flow remains:

```text
static/permanent CI
→ release-simcore deployment
→ real long-chat validation
→ evidence classification WATCH / DEFER / FIX / BLOCKER
→ final main memory/roadmap close
```

---

## 29. Rollback direction — forward history only

Production rollback must not normally move `release-simcore` backward with force/reset.

Preferred rollback is another explicit forward candidate:

```text
current production = C_bad
rollback candidate = C_rollback
parent(C_rollback) == C_bad
C_rollback contains approved prior-safe plugin bytes
verify C_rollback against C_bad
fast-forward release-simcore C_bad → C_rollback
```

This preserves complete release history and the same exact-candidate verification model.

Emergency exceptions, if ever required, need separate explicit evidence and are not part of the normal RS2-4 contract.

---

## 30. Current manifest drift implication

The observed `product-manifest.json` / `release-simcore` mismatch is direct evidence for this fail-closed precondition:

Before permanent RS2-4 promotion may become current release authority:

```text
sync-state --check == PASS
manifest release_commit == release-simcore HEAD
manifest version/name agree with deployed source
latest/install deployed blob identity valid
```

Until that state exists:

```text
RS2_4_IMPLEMENTATION_PROMOTION = BLOCKED
```

Design work may continue.

This preserves the separation:

```text
fix state authority in RS2-2
then activate RS2-4
```

rather than hiding stale state inside the release controller.

---

## 31. Legacy release writer disposition at 4A

Existing historical/mixed release workflows remain available as rollback evidence during design.

They are not current future authority.

At 4A:

```text
legacyWriterRetired = NO
legacyWriterNormalUse = TRANSITIONAL_ONLY
permanentReleaseImplemented = NO
permanentReleaseAuthority = NO
```

No file is deleted in 4A.

RS2-4D/4E own shadow proof, rollback rehearsal, and retirement.

---

## 32. Trigger transport intentionally deferred to 4B/4C

RS2-4A does not yet freeze whether the normal user-facing release request is initiated through:

```text
merged declarative release record on main
workflow_dispatch with immutable inputs
a command-only PR compatibility wrapper
another bounded same-repository event
```

Whatever transport is selected later, it must resolve to the same immutable transaction tuple `T`.

The trigger itself is never release authority.

Forbidden authority shortcuts:

```text
PR title == release identity
branch name == candidate identity
"latest work branch" == candidate identity
workflow run that does not bind C/P
mutable file pointer with no digest == release identity
```

---

## 33. 4A implementation-neutral transaction diagram

```text
Development / repair work
        ↓
materialize final canonical candidate
        ↓
P ─────→ C
        │  parent(C) == P
        │  diff only latest.js/install.js
        │  latest blob == install blob
        ↓
validate declarative release tuple
        ↓
CANDIDATE_REQUIRED(C, P)
        ↓
identity-bound PASS
        ↓
serialize SimCore publisher
        ↓
recheck release-simcore HEAD == P
        ↓
fast-forward P → C
        ↓
verify HEAD == C and blobs == verified blobs
        ↓
state-sync / manifest / evidence
        ↓
LIVE_PENDING
        ↓
real long-chat validation
        ↓
final main evidence + roadmap close
```

---

## 34. 4A close criteria

RS2-4A design is complete when all of these are frozen:

```text
release authority split
P and C identity semantics
direct-child candidate rule
production path allowlist
latest/install exact-blob identity
transaction tuple
CANDIDATE_REQUIRED handoff
release mode taxonomy
same-version correction allowance
read-only verification / write publication split
fast-forward-only publication
concurrency-not-correctness rule
pre/post publish failure boundary
idempotency classes
candidate commit == production commit rule
forward-history rollback direction
4B–4E decomposition
current state-drift precondition
```

Implementation remains forbidden until the appropriate RS2-1/2/3 operational prerequisites close.

---

## 35. Handoff to RS2-4B

RS2-4B must now define the declarative data and materialization contract that produces a valid tuple:

```text
T = { C, P, L, I, M, S }
```

4B must answer at least:

```text
where release specs live
how one release spec is uniquely selected
schema and allowed fields
how expected parent P is declared/resolved
how NEW_VERSION differs from SAME_VERSION_CORRECTION in data
how candidate C is created from development output
how a multi-commit work branch becomes one direct-child C
which commit message is required
how version and release name are verified
how the live-gate scenario is declared
how raw evidence is kept out of executable release metadata
how transport hints remain non-authoritative
```

No workflow implementation begins from 4A alone.

---

## 36. Frozen summary

RS2-4A freezes this core equation:

```text
VERIFY(C, P) == PASS
AND parent(C) == P
AND current_release_head == P
AND blobs(C) == verified_blobs

→ fast-forward release-simcore P → C
```

and this invariant:

```text
production commit == verified candidate commit
```

with SimCore-specific release-mode support:

```text
NEW_VERSION
SAME_VERSION_CORRECTION
NOOP_IDENTICAL
STALE_OR_UNDECLARED
```

Everything else in RS2-4 exists to create, transport, authorize, publish, synchronize, prove, and eventually retire around that identity-preserving core.
