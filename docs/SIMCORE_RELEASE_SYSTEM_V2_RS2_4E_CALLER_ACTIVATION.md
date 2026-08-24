# SimCore Release System v2 — RS2-4E Permanent Caller Activation

Date: 2026-08-24
Status: **IMPLEMENTATION ACTIVE · NON-RUNTIME · NO PRODUCTION PUBLICATION IN QUALIFICATION**
Parent: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_PROMOTION_REAL_RELEASE_ROLLBACK_RETIREMENT.md`
Qualification state: `products/simcore/releases/RS2_4E_QUALIFICATION_STATUS.json`

## 1. Purpose

Activate the permanent production release caller only after the RS2-4E controller primitive, repository-bound qualification, rollback rehearsal, and administrative state repair have passed.

This work item must end at:

```text
PERMANENT_RELEASE_AVAILABLE = YES
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
ROLLBACK_REHEARSAL_VERIFIED = YES
REAL_RELEASE_READY = YES
```

It must **not** publish a new SimCore runtime release during qualification.

## 2. Frozen authority split

Keep the existing shadow lane unchanged:

```text
.github/workflows/simcore-release.yml
= SHADOW_ONLY
= contents: read
= production mutation NONE
```

Add a separate production caller lane:

```text
.github/workflows/simcore-release-permanent.yml
= RS2_4_RELEASE
= explicit operator confirmation marker
= exact immutable release spec from main
= exact C/P Candidate Required
= publisher write permission only at publish job and bounded post-publish state job
= ordinary fast-forward only
```

The production caller must not weaken the shadow workflow trust boundary.

## 3. Permanent Required lane

Use the same permanent verifier implementation (`products/simcore/tooling/check.mjs`) through a dedicated reusable release-required workflow.

Required tuple:

```text
profile = CANDIDATE_REQUIRED
candidateCommit = C
expectedProductionCommit = P
productionCommit = P
candidateRequiredAuthority = RS2_4_RELEASE
verifierCommit = exact caller-policy commit
conclusion = PASS
```

Manual workflow dispatch must not be able to synthesize a `CANDIDATE_REQUIRED` report.

## 4. Production caller invariants

Before any production write:

```text
RS2_4E status == REAL_RELEASE_READY
explicit confirmation == RS2_4_RELEASE
release spec path is inside products/simcore/releases/specs/
spec exists on canonical main
candidate/parent/blob fields are valid
candidate transport ref, if used, is same-repository fetch-only input
RS2_4_RELEASE Required report == PASS for exact C/P
report verifier identity == canonical policy commit
actual release-simcore == P immediately before publish
publisher authorization bytes are immutable
latest/install candidate blobs are equal
candidate path diff is allowed by release contract
```

Publish semantics:

```text
NOOP -> no production mutation
publish -> ordinary fast-forward P -> C
force / force-with-lease / backward ref movement forbidden
post-publish release-simcore must equal C
```

## 5. Permission boundary

Workflow-level permissions remain read-only where possible.

Only the bounded mutation jobs may receive `contents: write`:

```text
publish exact candidate to release-simcore
post-publish bounded main-state handoff
```

Candidate verification remains read-only. The post-publish state job may write only:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/releases/records/<releaseId>.json
```

through the existing project-owned main-write gateway.

## 6. Post-publish truth handoff

A successful real publication must not leave main claiming the previous production or inherit the previous release's `LIVE_PASS` state.

After `release-simcore` is observed at exact C:

```text
verify C/latest/install exact production identity
→ declare-production
→ validation_status = PENDING_REAL_LONG_CHAT
→ release record = LIVE_PENDING
→ sync-state --write
→ sync-state --check
→ bounded payload commit
→ repo-main-write project gateway
→ fresh main state becomes the administrative truth for C
```

If the admin handoff fails after publication, production truth remains C and recovery must resume from the C identity. Never move `release-simcore` backward merely to repair main state.

## 7. Qualification without publication

Caller activation is qualified by permanent CI/static contracts and deterministic controller/state tests. The production caller itself is **not dispatched with a publishable product spec** during this work item.

Qualification must prove:

```text
shadow workflow remains read-only
production workflow contains explicit RS2_4_RELEASE marker
production caller depends on successful permanent Required job
publisher is invoked only in the downstream publish job
exact verifier and authorization commit are passed to release-publish.mjs
post-publish state is gated after exact publication
bounded main allowlist is explicit
no force token exists in production caller/publisher path
current production remains v0.64.6 throughout qualification
```

The first actual execution is the next legitimate separately designed SimCore runtime/correctness release.

## 8. State transition

After CI qualification passes and main evidence is merged:

```text
permanentReleaseAvailable = true
permanentReleaseShadowVerified = true
rollbackRehearsalVerified = true
realReleaseReady = true
nextStep = FIRST_GENUINE_R_RELEASE
```

Do not claim:

```text
PERMANENT_RELEASE_REAL_PROOF
PERMANENT_RELEASE_AUTHORITY_ACTIVE
LEGACY_RELEASE_AUTHORITY_RETIRED
RS2_4_CLOSED
```

until the first genuine permanent-controller release reaches real long-chat `LIVE_PASS` and the authority-cutover/legacy-retirement close gate is completed.

## 9. Failure handling

Any qualification anomaly is preserved immediately as:

```text
WATCH / DEFER / FIX / BLOCKER
```

No caller-activation failure may trigger a runtime change or a release-simcore write.
