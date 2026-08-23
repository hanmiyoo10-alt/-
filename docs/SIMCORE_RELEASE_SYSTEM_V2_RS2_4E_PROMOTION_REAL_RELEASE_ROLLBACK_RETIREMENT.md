# SimCore Release System v2 — RS2-4E Promotion / Real Release Proof / Rollback Rehearsal / Legacy Retirement

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4D_POST_PUBLISH_STATE_EVIDENCE_LEGACY_SHADOW.md`
Transaction foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4A_RELEASE_TRANSACTION_IDENTITY_AUTHORITY.md`
Release data: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4B_RELEASE_SPEC_CANDIDATE_MATERIALIZATION.md`
Publisher: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4C_PERMANENT_PROMOTION_CONTROLLER.md`
Phase: `RS2-4 — Permanent Release Workflow`
Subphase: `RS2-4E — Promotion / Real Release Proof / Rollback Rehearsal / Legacy Retirement`
Authority class: release-infrastructure design / operational-promotion and phase-close contract

---

## 1. Purpose

RS2-4E freezes the final operational boundary for the permanent SimCore release system.

A–D define how the system should work.

4E answers the harder question:

> What evidence must exist before the new release controller becomes the normal production authority, the old release writer loses authority, and RS2-4 may be called closed?

RS2-4E defines:

```text
promotion claims
entry prerequisites
shadow qualification
negative shadow qualification
rollback rehearsal
first real release qualification
LIVE_PASS requirement
legacy authority cutover
physical retirement/archive rules
failure and reversion behavior
permanent release operating procedure
machine-readable RS2-4 close state
RS2-5 handoff
relationship to future runtime work such as M2-3
```

RS2-4E is design-only.

It does not activate the permanent release system now.

---

## 2. Core principle — design complete is not authority active

Frozen distinction:

```text
RS2-4 DESIGN COMPLETE
!=
PERMANENT RELEASE AUTHORITY ACTIVE
```

Likewise:

```text
workflow files exist
!=
legacy path may be deleted
```

The permanent release system earns authority through controlled evidence.

---

## 3. Operational promotion claims

RS2-4E freezes these independent claims:

```text
PERMANENT_RELEASE_AVAILABLE
PERMANENT_RELEASE_SHADOW_VERIFIED
ROLLBACK_REHEARSAL_VERIFIED
PERMANENT_RELEASE_REAL_PROOF
PERMANENT_RELEASE_AUTHORITY_ACTIVE
LEGACY_RELEASE_AUTHORITY_RETIRED
MANIFEST_DECLARATION_PERMANENT
RS2_4_CLOSED
RS2_5_ENTRY_AUTHORIZED
```

Associated required CI claim after cutover:

```text
CANDIDATE_REQUIRED_RELEASE_AUTHORITY = ACTIVE
```

These are not aliases.

---

## 4. Expected lifecycle before closure

Normal promotion sequence:

```text
NOT_IMPLEMENTED
  ↓
IMPLEMENTED_UNVERIFIED
  ↓
SHADOW_READY
  ↓
SHADOW_VERIFIED
  ↓
REAL_RELEASE_READY
  ↓
REAL_RELEASE_LIVE_PENDING
  ↓
REAL_RELEASE_LIVE_PASS
  ↓
AUTHORITY_CUTOVER
  ↓
LEGACY_RETIREMENT
  ↓
RS2_4_CLOSED
```

A failure may move the infrastructure back to a prior safe authority state without moving production backward automatically.

---

## 5. Hard entry prerequisites for implementation promotion

Before `PERMANENT_RELEASE_AVAILABLE = YES`, all of these must be operationally satisfied, not merely designed:

```text
RS2_1_CLOSED = YES
DURABLE_TESTS_AVAILABLE = YES

RS2_2_CLOSED = YES
STATE_SYNC_AVAILABLE = YES
DOCUMENT_SYNC_CUTOVER_COMPLETE = YES
sync-state canonical CLEAN-1 = PASS
sync-state canonical CLEAN-2 = PASS

RS2_3_CLOSED = YES
PERMANENT_CI_AVAILABLE = YES
PERMANENT_CI_SHADOW_VERIFIED = YES
REQUIRED_CI_ACTIVE = YES
REQUIRED_CI_ENFORCEMENT_VERIFIED = YES
CANDIDATE_REQUIRED_INTERFACE_READY = YES

current production state identity = synchronized
product-manifest release_commit == release-simcore HEAD
product-manifest version/name/blob == actual production
sync-state --check against current production = PASS

RS2-4A/B/C/D implementation self-tests = PASS
runtime diff caused by release-system implementation = NONE
release-simcore mutation caused by qualification setup = NONE
```

The currently observed manifest drift must therefore be repaired before operational promotion.

---

## 6. `PERMANENT_RELEASE_AVAILABLE` definition

This claim means:

> The permanent candidate materializer, release-spec validation, generic publisher, post-publish state path, and bounded release records exist and pass their local/integration tests in non-production mode.

Minimum implementation surfaces:

```text
release schema v1
candidate materializer
release-spec validator/resolver
simcore-release.yml generic controller
CANDIDATE_REQUIRED callable integration
post-publish state declaration helper
explicit state-sync handoff
per-release record support
release transaction report support
shadow/no-publish mode
rollback candidate support
legacy responsibility map
```

No production proof is implied yet.

---

## 7. Qualification environments

RS2-4 promotion uses three evidence environments.

### 7.1 Local/sandbox Git integration

Temporary bare/local repositories may simulate:

```text
candidate materialization
release-spec resolution
fast-forward publish
race rejection
same-version correction
rollback forward history
state-sync payload creation
```

No real production ref exists in these fixtures.

### 7.2 Repository-bound shadow

Uses actual repository Git identities and permanent tooling but:

```text
productionMutation = NONE
```

It may create/fetch candidate transport refs if those refs are explicitly non-production and no plugin runtime is deployed.

### 7.3 First real release

Uses actual:

```text
main authorization
CANDIDATE_REQUIRED
release-simcore production publication
state synchronization
real long-chat validation
```

Only this proves end-to-end production operation.

---

## 8. Minimum qualifying positive shadows

Before first real permanent-controller publication, require at least:

```text
qualifyingPositiveShadows >= 3
```

The three must not be three reruns of the same immutable tuple.

They must cover distinct transaction semantics.

Required set:

```text
SHADOW-P1 repository-bound NOOP/current-production identity path
SHADOW-P2 sandbox NEW_VERSION full publish simulation to temporary release ref
SHADOW-P3 sandbox SAME_VERSION_CORRECTION full publish simulation to temporary release ref
```

A future additional NEW_VERSION shadow may supplement but not replace the required semantic diversity.

---

## 9. SHADOW-P1 — repository-bound NOOP identity path

Purpose:

```text
prove current real repository production can be resolved safely
prove manifest/state preflight is clean
prove permanent controller can bind actual production identity
prove no-op path makes no production mutation
```

Expected:

```text
actual release-simcore observed
latest/install identity verified
state check PASS
publication disposition NOOP_IDENTICAL or equivalent read-only qualification
release-simcore unchanged
main unchanged unless a dedicated non-production evidence PR is separately authorized
```

This shadow may use an ephemeral/non-authoritative fixture spec outside the production spec directory if needed by implementation testing.

It must not create a fake release authorization record that looks like a real deployment.

---

## 10. SHADOW-P2 — sandbox NEW_VERSION

In an isolated temporary Git repository:

```text
P_sandbox
→ construct direct-child C_new
→ validate NEW_VERSION spec
→ invoke verifier test double or actual portable permanent verifier where supported
→ build publication plan
→ ordinary fast-forward temp production P_sandbox → C_new
→ post-publish identity verify
→ admin-state simulation
```

Required:

```text
PASS
no force tokens
exact candidate commit becomes temp production
latest/install exact bytes preserved
```

The simulated runtime bytes are test fixture bytes only.

This is infrastructure testing, not a SimCore product release.

---

## 11. SHADOW-P3 — sandbox SAME_VERSION_CORRECTION

In isolated Git:

```text
P_same version X
→ C_fix same version X, changed approved bytes
→ explicit SAME_VERSION_CORRECTION metadata
→ lifecycle eligible fixture
→ verify
→ fast-forward P_same → C_fix
```

Required controls:

```text
explicit correction passes
undeclared same-version divergence fails
LIVE_PASS/CLOSED correction fixture fails
release ID distinguishes correction instance
```

---

## 12. Minimum negative shadow set

Positive shadows alone are insufficient.

Before first real release require all of these negative classes to pass fail-closed tests:

```text
N1 CANDIDATE_REQUIRED failure
N2 production parent moved before publish
N3 candidate path outside latest/install
N4 latest/install divergence
N5 verifier identity mismatch
N6 mixed authorization commit
N7 existing release-spec mutation
N8 undeclared same-version divergence
N9 undeclared downgrade
N10 post-publish simulated admin failure truth preservation
```

Expected for N1–N9:

```text
production ref unchanged
```

Expected N10:

```text
simulated production remains C
status = PUBLISHED_ADMIN_RECOVERY_REQUIRED
no automatic reset to P
```

---

## 13. Shadow evidence identity rule

Each qualifying shadow records at minimum:

```text
shadow ID
transaction class
input tuple digest
controller commit
verifier commit
result
production mutation target namespace
before ref
expected after ref
observed after ref
report digest
```

Repeated execution of the same tuple with the same expected outcome is useful stability evidence but does not increment the minimum distinct-shadow count.

---

## 14. `PERMANENT_RELEASE_SHADOW_VERIFIED` definition

Required:

```text
PERMANENT_RELEASE_AVAILABLE = YES
positive shadows P1/P2/P3 = PASS
negative classes N1–N10 = PASS
no actual release-simcore mutation during shadow qualification
no runtime behavior change introduced for qualification
shadow evidence durable on main
```

Then:

```text
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
```

---

## 15. Rollback rehearsal is separate from ordinary shadows

Rollback is safety-critical enough to require its own claim:

```text
ROLLBACK_REHEARSAL_VERIFIED
```

It is not satisfied merely because the materializer has a `ROLLBACK` enum branch.

---

## 16. Rollback rehearsal level 1 — sandbox full transaction

Use temporary Git history:

```text
P_safe
→ C_bad
→ C_rollback
```

where:

```text
parent(C_bad) == P_safe
parent(C_rollback) == C_bad
C_rollback latest/install blobs == P_safe approved safe blobs
```

Run:

```text
ROLLBACK spec validation
candidate verification
ordinary fast-forward temp production C_bad → C_rollback
post-publish identity verification
state declaration showing actual restored version/blob
```

Required:

```text
no backward ref movement
no force
production history remains forward
actual restored source version may decrease
record identifies rollback source and failed parent
```

---

## 17. Rollback rehearsal level 2 — repository-bound shadow plan

Against actual repository metadata, choose a known historical prior production identity as a read-only rollback source fixture.

The shadow controller proves it can construct/validate a rollback plan from:

```text
current actual production P_current
approved prior-safe source commit/blob
```

without publishing to `release-simcore`.

Expected:

```text
wouldCreate direct-child rollback candidate
wouldUse exact approved prior-safe latest/install blob
wouldRequire CANDIDATE_REQUIRED
wouldFastForward only
productionMutation = NONE
```

If current historical metadata is insufficient to prove a safe source, the repository-bound rollback shadow may report `SOURCE_NOT_QUALIFIED`; in that case RS2-4 cannot close until a bounded approved rollback source fixture is established.

---

## 18. Rollback negative controls

Required:

```text
rollback source blob mismatch        → fail
unknown/unrecorded source            → fail
candidate not direct child current P → fail
rollback path includes extra files   → fail
arbitrary lower version NEW_VERSION  → fail
force/backward ref operation token   → fail static gate
```

---

## 19. `ROLLBACK_REHEARSAL_VERIFIED` definition

Required:

```text
sandbox full rollback transaction PASS
repository-bound rollback shadow plan PASS
rollback negative controls PASS
production release-simcore unchanged by rehearsal
rollback evidence durable
```

Then:

```text
ROLLBACK_REHEARSAL_VERIFIED = YES
```

---

## 20. Real-release readiness

The first real permanent-controller release may begin only when:

```text
PERMANENT_RELEASE_AVAILABLE = YES
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
ROLLBACK_REHEARSAL_VERIFIED = YES
current state sync check = PASS
CANDIDATE_REQUIRED release interface operational
legacy release fallback still available as documented emergency reference
```

The legacy writer is not yet physically retired.

---

## 21. First real release must be genuine product work

The qualification release must be a separately authorized SimCore product/correctness release.

Forbidden qualification trick:

```text
bump version with no reason just to test pipeline
modify plugin comments solely to force deployment
bundle release-system implementation with runtime feature
```

Preferred:

```text
next legitimately scheduled runtime/correctness release
```

with its own normal design/evidence and work-branch implementation.

This preserves:

```text
release-system change != product behavior change
```

as separate workstreams even though the legitimate product release becomes the first consumer of the new system.

---

## 22. First real release workflow

Qualification real release follows exactly:

```text
1. product design/evidence already frozen
2. work branch implementation
3. normal static/permanent CI on work
4. canonical candidate materialized as direct child C of current P
5. immutable release spec PR added to main
6. release-spec PR permanent checks PASS
7. merge spec → authorization R
8. generic permanent publisher resolves R/Q/S/C/P/L/M
9. authoritative CANDIDATE_REQUIRED(C,P) PASS
10. recheck actual production == P
11. fast-forward release-simcore P → C
12. post-publish C/L verification PASS
13. explicit state-sync handoff
14. manifest/docs/release record main payload lands
15. fresh main state check PASS
16. state = LIVE_PENDING
17. real long-chat validation
18. evidence classified
19. LIVE_PASS close payload lands
```

No step is skipped because it is the qualification release.

---

## 23. First real release must reach LIVE_PASS for full 4E promotion

RS2-4E freezes the conservative rule:

```text
first permanent-controller production publication
must reach LIVE_PASS
```

before:

```text
LEGACY_RELEASE_AUTHORITY_RETIRED = YES
RS2_4_CLOSED = YES
```

Reason:

The user's SimCore release process defines successful closure through real long-chat validation and final main synchronization.

Publication-only evidence proves the release machinery, but not the full operating procedure that RS2-4 is intended to replace.

---

## 24. Product semantic failure during first real release

If the permanent system publishes correctly but live validation finds a product bug:

```text
release infrastructure result may be PASS
product release result = FIX/BLOCKER
```

Do not misclassify the release controller as broken solely because product semantics failed.

However:

```text
PERMANENT_RELEASE_REAL_PROOF remains incomplete
legacy retirement remains blocked
```

until the correction/rollback path restores a release that reaches LIVE_PASS under the permanent system.

A successful same-version correction or rollback can provide additional release-system evidence, but a final stable LIVE_PASS is still required.

---

## 25. Release-infrastructure failure during first real release

Examples:

```text
wrong C/P binding
unexpected publisher write
state-sync cannot recover
post-publish identity mismatch
release-spec resolver ambiguity despite valid input
required verifier authority bypass
```

Classification:

```text
RS2_4_PROMOTION_BLOCKER
```

Actions:

```text
preserve evidence immediately
stop authority cutover
retain legacy/manual fallback
repair infrastructure separately
repeat shadow qualification affected by the fix
attempt a new real release only after gates pass
```

No stale prior shadow evidence may be reused for changed affected logic without explicit equivalence proof.

---

## 26. `PERMANENT_RELEASE_REAL_PROOF` definition

Required first real release evidence:

```text
valid release spec authorization on main
exact candidate C/P/L tuple
CANDIDATE_REQUIRED identity PASS
release-simcore exactly C
post-publish blob exactly L
manifest declares C/L/version/name
state-sync landed main clean
release record LIVE_PENDING then LIVE_PASS
real long-chat evidence PRESENT
final main human close sync PRESENT
no unresolved release-infrastructure BLOCKER
```

Then:

```text
PERMANENT_RELEASE_REAL_PROOF = YES
```

---

## 27. Authority cutover

Only after:

```text
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
ROLLBACK_REHEARSAL_VERIFIED = YES
PERMANENT_RELEASE_REAL_PROOF = YES
```

may the repository declare:

```text
PERMANENT_RELEASE_AUTHORITY_ACTIVE = YES
CANDIDATE_REQUIRED_RELEASE_AUTHORITY = ACTIVE
MANIFEST_DECLARATION_PERMANENT = YES
```

Normal future SimCore releases must then use RS2-4.

---

## 28. Cutover is authority first, deletion second

Order is fixed:

```text
1. activate permanent release authority
2. disable normal legacy invocation
3. verify no scheduled/command path still selects legacy writer
4. run post-cutover main health/release-system self-check
5. archive/retire obsolete workflow files
6. verify permanent path remains sole normal authority
```

Do not delete old paths first and hope the new path is enough.

---

## 29. Legacy release writer retirement map

Primary mixed legacy writer:

```text
.github/workflows/simcore-release-command.yml
```

Target after cutover:

```text
normalInvocation = FORBIDDEN
publicationAuthority = NONE
manifestAuthority = NONE
documentAuthority = NONE
historicalProvenance = PRESERVED
physicalWorkflow = RETIRE/ARCHIVE
```

Its historical version-specific source/patch references remain available through Git history and explicit archive metadata.

---

## 30. Legacy state workflow disposition

Current path:

```text
.github/workflows/simcore-release-state-sync.yml
```

is not automatically deleted because 4D may evolve it into the permanent explicit/reusable state writer.

Target:

```text
if migrated to 4D permanent contract:
  KEEP / RENAME AS NEEDED
  authority = PERMANENT_STATE_WRITER

if replaced by a new permanent file:
  old file normalInvocation = FORBIDDEN
  archive/retire after equivalence proof
```

Decision is based on implemented responsibility, not filename age.

---

## 31. Legacy sync script disposition

Current transitional script:

```text
scripts/simcore-sync-memory.py
```

After permanent manifest declaration + RS2-2 sync-state + rollback proof:

```text
normal manifest mutation authority = NONE
normal document mutation authority = NONE
```

It may be retained temporarily as:

```text
ARCHIVED_ROLLBACK_REFERENCE
```

if reverse migration tooling still needs it.

Physical deletion is optional once:

```text
rollback procedure no longer depends on executable legacy script
historical provenance is preserved in Git/archive records
```

RS2-4 close requires loss of normal authority, not necessarily erasing every historical script byte.

---

## 32. Historical version-specific build workflows

Examples include historical SimCore workflows for:

```text
M2-2 representation checkpoint
v0.64.4 community attribution
v0.64.5 multiline reaction
v0.64.6 clock handoff variants
v0.64.6 closure-completion variants
```

They are classified by responsibility:

```text
behavioral validation authority → PERMANENT_CI
candidate materialization authority → PERMANENT_RS2_4 tooling
production publication authority → PERMANENT_RS2_4 publisher
historical provenance → Git/archive metadata
```

Once all active responsibilities are replaced, their workflow-trigger authority should be retired so a historical PR title cannot accidentally mutate a branch.

Physical files may be deleted from active `.github/workflows/` or converted to non-executable archive records.

---

## 33. Legacy workflow archive record

Permanent retirement should create a bounded archive index, for example:

```text
products/simcore/releases/legacy-workflows.json
```

Conceptual entry:

```json
{
  "path": ".github/workflows/simcore-06406-closure-completion-gate-v2.yml",
  "retiredAtCommit": "...",
  "formerResponsibilities": ["candidate-build", "validation", "work-branch-write"],
  "replacementAuthorities": ["Permanent CI", "RS2-4 candidate materializer"],
  "historicalCommit": "..."
}
```

The archive does not preserve executable triggers.

Git history remains the full historical source authority.

---

## 34. Retirement static guard

After legacy workflow retirement, permanent CI/release-infrastructure self-tests should fail if old active authority regrows.

Required conceptual assertions:

```text
no active title-magic SimCore production release writer
no active version-specific workflow can push release-simcore
no legacy full state writer is selected by normal release flow
one generic permanent release controller exists
release controller contains no current product-version literal authority
release specs are data, not workflow names
force release ref mutation absent
```

---

## 35. Emergency fallback after cutover

Permanent authority cutover does not eliminate emergency recovery.

Preferred fallback order:

```text
1. retry permanent idempotent transaction/admin recovery
2. repair permanent infrastructure in place if production not at risk
3. use explicit permanent ROLLBACK transaction when product rollback needed
4. use bounded manual Git procedure following P/C/blob/fast-forward rules only if permanent controller itself is unavailable
```

Do not automatically reactivate obsolete version-specific patch workflows.

---

## 36. Manual emergency release procedure constraints

If permanent workflow infrastructure is unavailable during an urgent correctness event, manual fallback must still obey core 4A identities:

```text
freeze P
construct direct-child C
latest/install identical
validate with available permanent/local gates
ordinary fast-forward only
post-publish identity check
record evidence
repair state from actual production
```

Manual does not mean uncontrolled.

Any emergency deviation becomes a BLOCKER/evidence event requiring release-system review before normal operations resume.

---

## 37. Release-system rollback versus product rollback

Distinguish:

```text
RELEASE_SYSTEM_ROLLBACK
= stop using new automation / restore a prior admin operating path

PRODUCT_ROLLBACK
= deploy safe runtime bytes through explicit ROLLBACK candidate
```

A release-system problem does not automatically justify changing production runtime.

A product semantic problem does not automatically justify restoring legacy release automation.

---

## 38. Release-system rollback trigger

After authority cutover, consider release-system rollback/reopen if:

```text
permanent controller violates P/C binding
unexpected ref mutation occurs
required CI can be bypassed
post-publish state truth cannot be represented reliably
legacy authority was not actually disabled
repeated publisher races produce ambiguous production state
```

Then:

```text
PERMANENT_RELEASE_AUTHORITY_ACTIVE = SUSPENDED
RS2_4_CLOSED = REOPENED
```

Preserve actual production state; do not reset it just to match infrastructure status.

---

## 39. Re-promotion after release-system rollback

Required:

```text
fix root cause
rerun affected unit/integration gates
rerun minimum affected positive shadows
rerun relevant negative shadows
rerun rollback rehearsal if rollback logic changed
perform another qualifying real release LIVE_PASS if publication/state authority materially changed
re-disable legacy fallback
update RS2_4_STATUS
```

No stale promotion evidence survives a material authority change by assumption.

---

## 40. Future normal release procedure after RS2-4 close

The permanent operating procedure becomes:

```text
A. Design/evidence on main
B. Implement product change on work branch
C. Static/permanent CI
D. Materialize canonical direct-child release candidate C from current P
E. Add immutable release spec PR on main
F. Permanent CI validates authorization/candidate
G. Merge spec authorization R
H. Generic simcore-release publisher invokes CANDIDATE_REQUIRED(C,P)
I. Fast-forward release-simcore P → C
J. Verify exact production C/L
K. Explicit manifest/state sync to main
L. State = LIVE_PENDING
M. Real long-chat validation
N. Record WATCH / DEFER / FIX / BLOCKER
O. LIVE_PASS final main docs/long-memory sync when appropriate
```

No new version-specific release workflow is created.

---

## 41. Same-version correction future procedure

If a pre-live BLOCKER is found after deployment:

```text
preserve blocker evidence
→ prepare corrected work
→ materialize new direct-child C_fix from current production P
→ new immutable SAME_VERSION_CORRECTION spec/releaseId
→ permanent verification
→ fast-forward P → C_fix
→ state sync
→ LIVE_PENDING
→ real long-chat validation
```

The old release instance record becomes `SUPERSEDED_BY_CORRECTION`.

No need to invent a new product version merely because release infrastructure requires unique deployment identity.

---

## 42. Product rollback future procedure

If live evidence requires rollback:

```text
preserve BLOCKER
→ identify approved prior-safe production blob
→ materialize new ROLLBACK C_rollback as direct child of current P
→ immutable rollback spec/releaseId
→ CANDIDATE_REQUIRED
→ fast-forward P → C_rollback
→ verify
→ state sync to actual restored version/name/blob
→ real safety validation as required
```

No ref reset backward.

---

## 43. WATCH / DEFER findings during promotion

Nonblocking findings discovered during shadow/real qualification must be recorded immediately.

They may remain open only when they do not invalidate release correctness authority.

Examples:

```text
artifact naming cosmetic issue          WATCH
candidate-ref cleanup ergonomics        DEFER
bounded report wording                  WATCH
release latency optimization            DEFER
```

Blocking examples:

```text
identity mismatch                       BLOCKER
force path exists                       BLOCKER
state sync can overwrite newer release  BLOCKER
verifier bypass                         BLOCKER
unexpected runtime diff                 BLOCKER
```

---

## 44. RS2-4 machine-readable close status

Canonical close record:

```text
products/simcore/releases/RS2_4_STATUS.json
```

This is infrastructure authority status, not product runtime identity.

---

## 45. Suggested RS2_4_STATUS schema

```json
{
  "schemaVersion": 1,
  "phase": "RS2-4",
  "phaseStatus": "COMPLETE",
  "permanentReleaseAvailable": true,
  "permanentReleaseShadowVerified": true,
  "rollbackRehearsalVerified": true,
  "permanentReleaseRealProof": true,
  "permanentReleaseAuthority": "ACTIVE",
  "candidateRequiredReleaseAuthority": "ACTIVE",
  "manifestDeclarationOwner": "PERMANENT_RS2_4",
  "documentStateOwner": "RS2_2_SYNC_STATE",
  "legacyReleaseAuthority": "RETIRED",
  "legacyStateAuthority": "ROLLBACK_REFERENCE_ONLY",
  "firstRealReleaseId": "...",
  "firstRealReleaseCommit": "...",
  "firstRealReleaseLiveResult": "PASS",
  "shadowEvidence": {
    "positiveDistinct": 3,
    "negativeSet": "PASS"
  },
  "rollbackEvidence": "...",
  "retirementCommit": "...",
  "openObservationIds": [],
  "rs2_5EntryAuthorized": true
}
```

Exact field names may adjust during implementation while preserving meanings.

---

## 46. Close record update authority

`RS2_4_STATUS.json` changes only through explicit release-infrastructure promotion/reopen work.

A routine product release does not rewrite phase-close evidence.

It must not become a mutable current production manifest.

---

## 47. `LEGACY_RELEASE_AUTHORITY_RETIRED` definition

Required:

```text
PERMANENT_RELEASE_AUTHORITY_ACTIVE = YES
old normal release trigger disabled
old writer cannot push release-simcore through normal invocation
old state writer cannot own normal manifest/docs path
historical active version-specific branch writers retired or explicitly archived
archive/provenance record present
permanent static anti-regrowth guard PASS
post-retirement self-check PASS
```

Then:

```text
LEGACY_RELEASE_AUTHORITY_RETIRED = YES
```

---

## 48. `RS2_4_CLOSED` definition

All required:

```text
RS2_1_CLOSED = YES
RS2_2_CLOSED = YES
RS2_3_CLOSED = YES

PERMANENT_RELEASE_AVAILABLE = YES
PERMANENT_RELEASE_SHADOW_VERIFIED = YES
ROLLBACK_REHEARSAL_VERIFIED = YES
PERMANENT_RELEASE_REAL_PROOF = YES
PERMANENT_RELEASE_AUTHORITY_ACTIVE = YES
CANDIDATE_REQUIRED_RELEASE_AUTHORITY = ACTIVE
MANIFEST_DECLARATION_PERMANENT = YES
LEGACY_RELEASE_AUTHORITY_RETIRED = YES

first real release LIVE_PASS = YES
post-retirement main/release health = PASS
blocking release-system anomalies = 0
RS2_4_STATUS.json = PRESENT + VALID
runtime changes from RS2 infrastructure cutover = NONE
```

Then:

```text
RS2_4_CLOSED = YES
```

---

## 49. Post-retirement health check

After physical workflow retirement/archive lands on main, perform fresh checks:

```text
Permanent CI MAIN_HEALTH PASS
release infrastructure self-test PASS
sync-state --check PASS
current manifest == actual release-simcore
legacy active-writer scan CLEAN
force-token release scan CLEAN
```

This proves retirement itself did not break the permanent system.

---

## 50. What RS2-4 close does not claim

RS2-4 close does **not** mean:

```text
SimCore runtime architecture is finished
M2-3 is implemented
all WATCH/DEFER items are fixed
source is modularized
release-simcore no longer exists
real long-chat validation is automated
human roadmap reasoning is automated
```

It means the release transaction itself is permanently governed by the new authority model.

---

## 51. RS2-5 handoff

After RS2-4 close:

```text
RS2_5_ENTRY_AUTHORIZED = YES
```

means optional source modularization infrastructure work may be considered without release-system uncertainty.

It does not require RS2-5 to start immediately.

RS2-5 remains optional.

---

## 52. Relationship to M2-3 and product roadmap

RS2-4 close does not reorder the product roadmap automatically.

M2-3 remains a separate runtime architecture task with its previously frozen ownership-extraction design.

When product work resumes after release-system infrastructure is ready, M2-3 must use the new permanent release procedure rather than being bundled into RS2-4 implementation.

This preserves:

```text
release/repo system change
!=
runtime feature/refactor change
```

---

## 53. First M2-3 release under permanent system

If M2-3 happens to become the first legitimate product release after RS2-4 implementation, it may serve as the first real release proof **only if**:

```text
RS2-4 shadow + rollback prerequisites already passed
M2-3 implementation was developed independently
release authorization is a separate immutable spec
permanent controller handles deployment without release-system code being changed in the same release authorization
real long-chat validation reaches PASS
```

Do not combine RS2-4 implementation changes and M2-3 runtime code into one candidate merely to save a release cycle.

---

## 54. Promotion failure matrix

### Failure before any real publish

```text
status: SHADOW_BLOCKED
production: unchanged
legacy fallback: retained
```

### Failure during real release before publish

```text
status: REAL_RELEASE_BLOCKED_PRE_PUBLISH
production: P
legacy retirement: blocked
```

### Publish succeeds, admin sync fails

```text
status: PUBLISHED_ADMIN_RECOVERY_REQUIRED
production: C
repair admin state
legacy retirement: blocked until clean
```

### Publish/admin pass, live product BLOCKER

```text
status: LIVE_BLOCKER
production: C until correction/rollback
use permanent correction/rollback if safe
legacy retirement: blocked
```

### Full success

```text
status: LIVE_PASS
then authority cutover + retirement
```

---

## 55. No “successful once” loophole

A real release does not qualify merely because the workflow conclusion UI is green.

Required evidence is semantic:

```text
correct authorization tuple
correct verifier tuple
correct production commit/blob
correct main state
correct live evidence
correct final close
```

A green run with missing identity evidence does not count.

---

## 56. No timer-based confidence threshold

RS2-4 promotion does not require waiting an arbitrary number of days.

Confidence comes from:

```text
distinct shadow cases
negative fail-closed cases
rollback rehearsal
one genuine full production release
real long-chat PASS
post-retirement checks
```

If a future observation window is useful, it may be recorded as WATCH/operational monitoring but is not substituted for these gates.

---

## 57. Release-system evidence document

Implementation close should create a durable human-readable evidence document alongside the machine status, for example:

```text
docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4_CLOSE_EVIDENCE.md
```

It should summarize:

```text
implementation commits
shadow run IDs/results
negative test results
rollback rehearsal
first real release ID/commit
live evidence references
legacy retirement commit
remaining WATCH/DEFER items
```

Do not copy full CI logs.

---

## 58. Retirement must preserve history

Deleting active workflow YAML from current main does not erase history.

Before retirement, record:

```text
former active path
last relevant blob/commit
responsibility replacement
retirement commit
```

Git history remains available for forensic reference.

No duplicate disabled `.yml` file should remain under `.github/workflows/` if GitHub would still parse it as an active workflow.

---

## 59. Current design completion versus implementation status

After this 4E document is merged, expected state is:

```text
RS2-4 detailed design A–E = COMPLETE
RS2-4 implementation = NOT STARTED
PERMANENT_RELEASE_AUTHORITY_ACTIVE = NO
legacy release writer = still physically present
current runtime = unchanged
release-simcore = unchanged
```

This distinction must be explicit in user-facing status and repo records.

---

## 60. Final frozen architecture

Once implemented and promoted, the release system is:

```text
PRODUCT WORK
  design/evidence on main
        ↓
  work branch implementation
        ↓
  Permanent CI
        ↓
  canonical direct-child candidate C from production P
        ↓

RELEASE AUTHORIZATION
  immutable release spec PR on main
        ↓
  authorization R/Q/S/C/P/L/M
        ↓

PERMANENT RELEASE
  CANDIDATE_REQUIRED(C,P)
        ↓ PASS
  recheck production == P
        ↓
  fast-forward release-simcore P → C
        ↓
  verify production == C/L
        ↓

POST-PUBLISH ADMIN
  declare manifest = C/L/version/name/LIVE_PENDING
        ↓
  RS2-2 sync-state renders registered docs
        ↓
  per-release record
        ↓
  bounded repo-main-write payload
        ↓
  fresh main check
        ↓

REAL VALIDATION
  LIVE_PENDING
        ↓
  real long-chat
        ↓
  WATCH / DEFER / FIX / BLOCKER
        ↓
  LIVE_PASS final main close
```

No version-specific release workflow is part of the normal path.

---

## 61. RS2-4 design-close statement

With 4A–4E frozen, the detailed design of the permanent SimCore release workflow is complete.

Implementation must follow the established phase order and may not skip unresolved RS2-1/2/3 operational prerequisites.

The next release-system activity after design is **implementation planning/cutover execution**, not silent product deployment.
