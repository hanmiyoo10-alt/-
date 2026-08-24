# SimCore Release System v2 — RS2-4E Permanent Caller Activation Evidence

Date: 2026-08-24
Status: **QUALIFIED · REAL_RELEASE_READY GATE SATISFIED · NON-RUNTIME**
Implementation PR: `#231`
Implementation merge: `f3709c8a59a086c5f0819f61891c05c380c14277`
Permanent CI run: `32737576404`
Verify job: `97463990548`
Required job: `97464126315`

## 1. Verdict

The permanent RS2-4 production caller is implemented and qualified for the first genuine SimCore release.

Qualified claims:

```text
PERMANENT_RELEASE_AVAILABLE = YES
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
ROLLBACK_REHEARSAL_VERIFIED = YES
REAL_RELEASE_READY = YES
```

Not yet claimed:

```text
PERMANENT_RELEASE_REAL_PROOF = NO
PERMANENT_RELEASE_AUTHORITY_ACTIVE = NO
LEGACY_RELEASE_AUTHORITY_RETIRED = NO
RS2_4_CLOSED = NO
```

Those later claims require the first genuine permanent-controller product release to publish successfully, reach real long-chat `LIVE_PASS`, and then complete authority cutover / legacy retirement.

## 2. Production preservation during qualification

Caller activation qualification did not publish a runtime release.

Observed production after implementation merge:

```text
release-simcore HEAD
= 47969d24771f6cc188df6e32150fc6fde519182d

version
= 0.64.6

shared latest/install blob
= 34da01aa131f760b92d65d961a7843e9cc0d37d6
```

Qualification mutation boundary:

```text
runtime mutation        = NONE
release-simcore mutation = NONE
version bump             = NONE
```

The existing shadow workflow remains read-only and was not promoted into a write-capable lane.

## 3. Permanent caller surfaces qualified

Implementation PR #231 added the separate permanent authority surfaces:

```text
.github/workflows/simcore-release-required.yml
.github/workflows/simcore-release-permanent.yml
products/simcore/tooling/post-publish-state.mjs
```

It also extended permanent CI ownership and deterministic coverage through:

```text
products/simcore/tooling/check.mjs
products/simcore/tooling/ci/classify.mjs
products/simcore/tooling/ci/self-test.mjs
products/simcore/tests/post-publish-state-permanent.test.mjs
products/simcore/tests/release-declaration-transition.test.mjs
scripts/simcore-sync-memory.py
```

Authority split after activation:

```text
simcore-release.yml
= SHADOW_ONLY / read-only / production mutation NONE

simcore-release-required.yml
= exact CANDIDATE_REQUIRED verification for RS2_4_RELEASE / read-only

simcore-release-permanent.yml
= explicit RS2_4_RELEASE production transaction caller
```

## 4. Required authority binding

Permanent Required is bound to:

```text
candidateCommit = exact C
expectedProductionCommit = exact P
productionCommit = exact observed P
candidateRequiredAuthority = RS2_4_RELEASE
verifierCommit = exact canonical policy commit
conclusion = PASS
```

`check.mjs` permits exactly two RS2-4 Required authority values:

```text
RS2_4_SHADOW
RS2_4_RELEASE
```

Any other CANDIDATE_REQUIRED authority remains fail-closed.

## 5. Publication and post-publish transaction contract

The permanent caller requires an explicit operator marker:

```text
authority_confirmation = RS2_4_RELEASE
```

Before publication it binds immutable release spec / authorization / verifier identity and rechecks actual production P.

Publication is performed through the already qualified `release-publish.mjs` path:

```text
ordinary fast-forward P -> C only
NOOP allowed without production mutation
force / force-with-lease / backward ref movement forbidden
post-publish exact C observation required
```

For a real `PUBLISHED` disposition, the caller continues through the permanent post-publish state path:

```text
observe exact C/latest/install
→ declare C as production truth
→ validation_status = PENDING_REAL_LONG_CHAT
→ release record = LIVE_PENDING
→ sync-state write/check
→ bounded main payload
→ repo-main-write protected MAIN_HEALTH / Required gateway
→ reobserve durable main release_commit == C
```

Allowed persistent main payload remains bounded to:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/releases/records/<releaseId>.json
```

## 6. Deterministic qualification coverage

Permanent CI self-test owns the new caller boundaries.

Permanent post-publish tests:

```text
P1 bounded LIVE_PENDING payload + exact production identity
P2 latest/install observed identity mismatch fails before declaration
P3 idempotent admin rerun
P4 newer-release / superseded recovery protection
P5 post-publication admin failure preserves C truth and recovers
```

Pass marker:

```text
RS2_4E_POST_PUBLISH_STATE_PERMANENT_TEST_PASS P1-P5
```

Release declaration transition tests:

```text
NEW production commit       -> PENDING_REAL_LONG_CHAT
same production commit      -> preserve current validation status
ROLLBACK/new production commit -> PENDING_REAL_LONG_CHAT
```

Pass marker:

```text
RS2_4E_RELEASE_DECLARATION_TRANSITION_TEST_PASS NEW SAME ROLLBACK
```

Existing controller, rollback, shadow, state-sync, architecture, regression, coordination, and legacy-compatibility gates also remained in the permanent CI path.

## 7. Permanent CI evidence

Implementation head submitted through PR #231:

```text
head = cba197f70c5a6f4b2ef240cd30924c74bc5ab7dd
```

Permanent CI:

```text
run      = 32737576404
Verify   = 97463990548  SUCCESS
Required = 97464126315  SUCCESS
```

The proposed permanent verifier completed all planned checks successfully, followed by the stable `Required` aggregate PASS.

Implementation then merged to main as:

```text
f3709c8a59a086c5f0819f61891c05c380c14277
```

## 8. PFFL findings converted into permanent defenses

### `PRELIVE_STATUS_INHERITANCE_RACE`

```text
classification = FIX / STATE_SYNC / NON_RUNTIME
production mutation during qualification = NONE
```

Risk: automatic release-state-sync could observe new C while preserving prior production `LIVE_PASS`.

Permanent defense:

```text
release_commit changes
→ validation_status = PENDING_REAL_LONG_CHAT
```

with NEW / SAME / ROLLBACK deterministic coverage.

### `POST_PUBLISH_MAIN_WRITER_RACE`

```text
classification = FIX / COORDINATION / NON_RUNTIME
production mutation during qualification = NONE
```

Risk: release-simcore push automatically starts legacy/transitional state-sync while the permanent caller also needs to land its bounded release record/state payload.

Permanent defense:

```text
existing state-sync writer
+ permanent post-publish writer
→ shared concurrency group simcore-main-state-sync
→ cancel-in-progress false
→ idempotent exact-C convergence
```

### `POST_PUBLISH_GATEWAY_TOKEN_MISSING`

```text
classification = FIX / HARNESS / NON_RUNTIME
production mutation during qualification = NONE
```

Risk: protected `repo-main-write.py` requires GitHub token authority to dispatch and verify exact-commit Required.

Permanent defense:

```text
post-publish main job
→ GH_TOKEN = github.token
→ protected MAIN_HEALTH / Required gateway
```

These findings are now encoded checks rather than operator memory.

## 9. REAL_RELEASE_READY meaning

`REAL_RELEASE_READY = YES` means the permanent release transaction may now be used by the next **legitimate separately designed SimCore product release**.

It does not mean R has already proven a real production publication.

The next required qualification event is:

```text
next genuine SimCore product release
→ normal design/evidence
→ work-branch implementation
→ permanent CI
→ immutable candidate/spec
→ RS2_4_RELEASE caller
→ release-simcore publication
→ LIVE_PENDING admin state
→ real long-chat validation
→ LIVE_PASS
```

Only after that successful real release may RS2-4E evaluate permanent authority cutover, legacy release authority retirement, and `RS2_4_CLOSED`.
