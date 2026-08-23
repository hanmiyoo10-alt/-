# SimCore Release System v2 — RS2-3E Promotion / Close Gate / RS2-4 Handoff

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3D_SHADOW_EQUIVALENCE_LEGACY_GATE_RETIREMENT.md`
CI topology: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3A_PERMANENT_CI_TOPOLOGY_TRUST_BOUNDARY.md`
CI routing: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`
CI execution safety: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3C_PERMISSIONS_CONCURRENCY_REPORT_ARTIFACT_SAFETY.md`
State-sync close contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-3 — Permanent CI`
Subphase: `RS2-3E — Promotion / Close Gate / RS2-4 Handoff`
Authority class: release-infrastructure design / permanent-CI operational promotion contract

---

## 1. Purpose

RS2-3A through RS2-3D define:

```text
where permanent CI lives
what it may trust
which events and profiles it serves
how it remains read-only
how results and artifacts are bounded
how legacy assertions migrate
how shadow equivalence is proved
how legacy verification authority is retired
```

RS2-3E freezes the final operational promotion boundary.

Its central question is:

> When may the repository stop calling permanent SimCore CI a shadow system and start calling it the enforced verification authority, and what exact bounded interface is handed to RS2-4 without pretending that release automation already exists?

This phase freezes:

```text
operational status vocabulary
promotion prerequisites
required-check activation order
branch-protection/ruleset enforcement semantics
activation proof matrix
negative enforcement proof
post-activation main-health proof
legacy authority final state
remaining legacy-compat allowance
rollback authority and order
RS2-3 close status record
CANDIDATE_REQUIRED interface readiness
RS2-4 input/output handoff
RS2-4 non-duplication rules
RS2-3 close criteria
```

This document does **not**:

```text
implement .github/workflows/simcore-ci.yml
change branch protection or repository rulesets
implement the permanent harness
implement sync-state
modify release-simcore
modify plugins/simcore/latest.js
modify plugins/simcore/install.js
modify product-manifest.json
perform a release
activate CANDIDATE_REQUIRED as release authority
retire the release writer
retire the active state writer
start RS2-4 implementation
```

---

## 2. Design-time repository fact

At this design freeze, `main` is not protected by a required-status-check rule.

Therefore:

```text
PERMANENT_CI_AVAILABLE      = NOT IMPLEMENTED
REQUIRED_CI_ACTIVE          = NO
RS2_3_CLOSED                = NO
RS2_4_ENTRY_AUTHORIZED      = NO
```

These are implementation-state facts, not design defects.

The design is allowed to close while the implementation remains inactive.

No documentation may claim `REQUIRED_CI_ACTIVE = YES` merely because a workflow named `SimCore CI / Required` exists.

---

## 3. Core principle — availability, enforcement, and release authority are different states

RS2-3E separates three concepts that must never be collapsed.

### 3.1 Permanent CI available

Means:

```text
permanent workflow exists
read-only verifier is operational
required public aggregator is stable
shadow equivalence is complete for retired verification responsibilities
```

It does **not** by itself mean GitHub blocks merges when the check fails.

### 3.2 Required CI active

Means:

```text
repository enforcement configuration actually requires
SimCore CI / Required
for merges to main
```

A team convention, README sentence, or manually observed workflow is not enforcement.

### 3.3 Release candidate required authority

Means:

```text
RS2-4 release transaction has invoked CANDIDATE_REQUIRED
for an immutable candidate/production identity tuple
and consumed the returned identity-bound PASS evidence
```

RS2-3 does not activate this release authority.

The interface may be ready while the release caller is still absent.

---

## 4. Frozen RS2-3 operational claims

The following claims form the permanent RS2-3 status vocabulary.

```text
PERMANENT_CI_AVAILABLE
PERMANENT_CI_SHADOW_VERIFIED
REQUIRED_CI_ACTIVE
REQUIRED_CI_ENFORCEMENT_VERIFIED
PURE_CHECK_PREDECESSORS_RETIRED
MIXED_VALIDATION_AUTHORITY_REPLACED
LEGACY_COMPAT_BOUNDED
RELEASE_WRITE_TRANSITIONAL
STATE_WRITE_TRANSITIONAL_OR_RS2_2_OWNED
CANDIDATE_REQUIRED_INTERFACE_READY
CANDIDATE_REQUIRED_RELEASE_AUTHORITY
RS2_3_CLOSED
RS2_4_ENTRY_AUTHORIZED
```

The normal close state is frozen as:

```text
PERMANENT_CI_AVAILABLE                  YES
PERMANENT_CI_SHADOW_VERIFIED            YES
REQUIRED_CI_ACTIVE                      YES
REQUIRED_CI_ENFORCEMENT_VERIFIED        YES
PURE_CHECK_PREDECESSORS_RETIRED         YES
MIXED_VALIDATION_AUTHORITY_REPLACED     YES
LEGACY_COMPAT_BOUNDED                   YES
RELEASE_WRITE_TRANSITIONAL              YES
STATE_WRITE_TRANSITIONAL_OR_RS2_2_OWNED YES
CANDIDATE_REQUIRED_INTERFACE_READY      YES
CANDIDATE_REQUIRED_RELEASE_AUTHORITY    NO / RESERVED_FOR_RS2_4
RS2_3_CLOSED                            YES
RS2_4_ENTRY_AUTHORIZED                  YES
```

The deliberate `NO` on release authority is correct.

RS2-3 closes verification infrastructure. RS2-4 creates the release transaction.

---

## 5. Preconditions before promotion may begin

Operational RS2-3 promotion may not begin until all of the following implementation prerequisites are true:

```text
RS2-1 permanent harness operational                         PASS
RS2-1 required permanent suites operational                 PASS
RS2-2 sync-state --check operational                        PASS
RS2-2 document cutover/close status available               PASS
RS2-3A topology implemented                                 PASS
RS2-3B classifier/profile matrix implemented                PASS
RS2-3C permission/artifact safety implemented               PASS
RS2-3D legacy responsibility map complete                   PASS
RS2-3D shadow equivalence requirements satisfied            PASS
no open PERMANENT_GATE_WEAKER blocker                       PASS
no open ASSERTION_STRENGTH_GAP blocker                      PASS
no unclassified active SimCore workflow                     PASS
no unmapped current verification assertion                  PASS
stable public check name observed                           PASS
permanent CI repository mutation surface                    NONE
runtime semantic diff in same work item                     NONE
release-simcore diff in same work item                      NONE
```

If any prerequisite fails, status remains:

```text
PERMANENT_CI_AVAILABLE = NO
```

or, if the workflow is installed but not promotable:

```text
PERMANENT_CI_AVAILABLE = SHADOW_ONLY
```

---

## 6. Stable public required check

The only public SimCore verification check intended for repository enforcement is:

```text
SimCore CI / Required
```

This name is a compatibility surface.

After activation it must not be renamed casually.

Changing the name requires:

```text
CI_SELF protected change
new/old enforcement migration plan
proof there is no interval with zero enforced SimCore check
branch-protection/ruleset update
post-change activation proof
rollback plan
```

Internal job names remain implementation details.

---

## 7. Required-check uniqueness

Before enforcement activation, implementation must prove that exactly one current permanent SimCore workflow is intended to produce the public required check.

Forbidden ambiguity:

```text
two unrelated workflows both emit SimCore CI / Required
legacy workflow accidentally reuses the same job/check name
workflow rename causes two current names to coexist as branch-protection authority
```

Failure classification:

```text
REQUIRED_CHECK_NAME_AMBIGUOUS
→ BLOCKER
```

Legacy internal checks may continue to exist during shadowing, but they may not masquerade under the permanent public gate name.

---

## 8. No top-level path-filter enforcement hole

The permanent required PR workflow continues to inherit the 3A/3B rule:

```text
pull_request targeting main
→ workflow starts
→ classifier runs
→ SimCore CI / Required terminates
```

For unrelated work:

```text
classification = UNRELATED
required conclusion = NOOP
GitHub check status = success
```

Top-level path filtering may not make the required workflow disappear.

Therefore branch protection can safely require one stable check without blocking unrelated Usage Dashboard or repository-administration PRs indefinitely.

---

## 9. Enforcement mechanism

`REQUIRED_CI_ACTIVE = YES` requires an actual repository enforcement mechanism supported by GitHub.

Accepted class:

```text
branch protection required status check
OR
repository ruleset required status check
```

The exact GitHub administrative mechanism may evolve, but the semantic requirement is invariant:

> A pull request targeting `main` cannot be merged through the normal protected path while `SimCore CI / Required` is pending or failing.

The following do **not** satisfy the claim:

```text
workflow exists
workflow usually runs
README says it is required
human promises to wait
bot comment says PASS required
optional status check appears in UI
```

---

## 10. Promotion sequence — no silent authority gap

The frozen promotion order is:

```text
P0  Permanent CI installed additively
P1  Legacy responsibility map complete
P2  Shadow equivalence complete
P3  Permanent CI marked PROMOTION_READY
P4  Configure SimCore CI / Required as enforced main check
P5  Prove required-check enforcement with controlled negative
P6  Prove unrelated PR NOOP path under enforcement
P7  Prove SimCore-relevant substantive PASS under enforcement
P8  Land a qualifying main commit through the enforced path
P9  MAIN_HEALTH passes on the landed canonical main
P10 Retire remaining eligible pure check-only predecessor authority
P11 Run post-retirement MAIN_HEALTH again
P12 Write bounded RS2-3 close record
P13 Mark RS2_4_ENTRY_AUTHORIZED = YES
```

A pure check predecessor may be marked `RETIREMENT_ELIGIBLE` during 3D before P4.

Preferred physical retirement is after the permanent required gate is already proven active so the repository does not create an avoidable enforcement gap.

Mixed build/validator files are not bulk-deleted at P10.

---

## 11. Promotion-ready state

Immediately before repository enforcement is changed, the bounded status is:

```text
PERMANENT_CI_AVAILABLE           YES
PERMANENT_CI_SHADOW_VERIFIED     YES
REQUIRED_CI_ACTIVE               NO
RS2_3_CLOSED                     NO
RS2_4_ENTRY_AUTHORIZED           NO
```

This state is named:

```text
PROMOTION_READY
```

It is safe to remain in this state while administrative enforcement configuration is pending.

It is not equivalent to phase close.

---

## 12. Controlled negative enforcement proof

After `SimCore CI / Required` is configured as required, RS2-3E requires one controlled failing PR that is never merged.

Purpose:

```text
prove the permanent check actually fails
AND
prove repository enforcement treats that failure as merge-blocking
```

The negative must be infrastructure-only.

Allowed examples:

```text
temporary test branch changes a permanent fixture expected value
controlled architecture-contract violation in the PR branch
controlled latest/install mismatch in test materialization fixture
CI self-test fixture that intentionally returns a semantic failure
```

Forbidden:

```text
modify release-simcore
publish a bad plugin
change production runtime
merge the intentionally failing PR
use a user long-chat as the negative
```

Required bounded evidence:

```text
negative PR number
head commit
planned failing gate ID
SimCore CI / Required conclusion = failure
repository mergeability/enforcement outcome = blocked
PR final state = closed/unmerged
```

Success code:

```text
REQUIRED_ENFORCEMENT_NEGATIVE_PROVED
```

If the check fails but merge remains normally allowed:

```text
REQUIRED_CHECK_NOT_ENFORCED
→ BLOCKER
```

---

## 13. Unrelated PR NOOP proof

At least one post-activation PR targeting `main` must contain no SimCore-relevant path.

Expected:

```text
classifier = UNRELATED
all product gates = NOT_APPLICABLE
SimCore CI / Required = success / NOOP
no permanent SimCore full regression execution required
merge is not deadlocked by missing/skipped required check
```

This proves the repository can continue hosting multiple products without SimCore branch protection becoming a cross-product deadlock.

Evidence ID:

```text
REQUIRED_NOOP_PATH_PROVED
```

A workflow-level path-filter skip does not satisfy this proof.

---

## 14. SimCore-relevant substantive PR proof

At least one post-activation non-runtime SimCore-relevant PR must cause substantive permanent gates to run.

The preferred proof changes permanent CI/test/contract infrastructure without changing plugin runtime bytes.

Expected:

```text
classifier includes at least one of:
  CI_SELF
  HARNESS
  ARCH_CONTRACT
  STATE_SYNC

at least one substantive gate = PLANNED and executed
SimCore CI / Required = PASS
merge proceeds only after PASS
```

Evidence ID:

```text
REQUIRED_SUBSTANTIVE_PATH_PROVED
```

A doc-only NOOP does not satisfy this proof.

No runtime feature release is required merely to prove CI enforcement.

---

## 15. Canonical main-health proof

After a qualifying PR has merged through the enforced path:

```text
push(main)
→ MAIN_HEALTH
→ full permanent baseline
→ state check against deployed production
```

must pass on the exact landed `main` commit.

Required conclusion:

```text
MAIN_HEALTH_POST_ACTIVATION = PASS
```

This proof matters because PR verification can run against one base/head composition while the canonical landed main contains intervening unrelated repository work.

A pre-merge PR PASS does not substitute for the landed-main health proof.

---

## 16. Post-retirement main-health proof

After the final eligible pure check-only predecessor is physically retired or disabled as current authority, run `MAIN_HEALTH` again.

Required:

```text
permanent workflow still present
static/architecture coverage still executes
state check still executes
legacy predecessor absence does not create missing dependency
SimCore CI health = PASS
```

Evidence ID:

```text
MAIN_HEALTH_POST_RETIREMENT = PASS
```

This is the final automated proof before the RS2-3 close record is written.

---

## 17. Required activation proof matrix

RS2-3 close requires all four operational proof classes:

| Proof | Required | Expected |
|---|---:|---|
| controlled failing PR | YES | required gate FAIL + merge blocked |
| unrelated PR | YES | NOOP success, no deadlock |
| SimCore-relevant infrastructure PR | YES | substantive gate PASS + merge allowed only after PASS |
| landed main after retirement | YES | MAIN_HEALTH PASS |

These are activation proofs, not product runtime release tests.

They may all be completed without changing `plugins/simcore/latest.js` or `install.js`.

---

## 18. Branch-protection/ruleset drift

After activation, permanent CI must treat enforcement configuration drift as an administrative blocker even though the read-only workflow itself cannot repair repository settings.

Examples:

```text
required check removed from main rules
required check renamed in workflow but repository still requires old name
main protection disabled
rule scope stops applying to main
```

Classification:

```text
REQUIRED_CI_ENFORCEMENT_DRIFT
→ BLOCKER / ADMINISTRATION
```

Detection may initially be external/manual if read-only CI cannot inspect repository rules with its frozen permission model.

Permanent CI must not request elevated token permissions merely to self-repair enforcement.

---

## 19. No self-repair of repository rules

The CI workflow is forbidden from changing:

```text
branch protection
repository rulesets
required checks
merge permissions
workflow permissions
```

Administrative enforcement changes remain a separate explicit repository operation with durable evidence.

This preserves the RS2-3 rule:

```text
CI verifies
CI does not govern itself by mutation
```

---

## 20. Pure check predecessor final state

At RS2-3 close, any pure check-only predecessor whose responsibility is fully replaced must have:

```text
validationAuthority = PERMANENT_CI
retirementEvidence  = PRESENT
rollbackSource      = RECORDED
currentRequired     = NO
```

Preferred physical state:

```text
fileRetired = true
```

For the currently identified architecture predecessor:

```text
.github/workflows/simcore-architecture-contracts.yml
```

physical retirement is expected once 3D parity and 3E activation proofs are complete.

If an implementation-specific platform dependency temporarily prevents deletion, RS2-3E may close only if:

```text
workflow has no current required authority
workflow is not automatically double-running as a second hidden gate
retirement reason is documented
file retention is explicitly temporary
```

The normal target remains physical retirement.

---

## 21. Mixed build/validator final state

At RS2-3 close, mixed historical workflows that have proven replacement of their validation responsibilities use:

```text
validationAuthority = PERMANENT_CI
validationStatus    = VALIDATION_REPLACED
normalInvocation    = FORBIDDEN
writeDisposition    = RS2_4_PENDING or HISTORICAL_ONLY
fileRetired         = implementation-specific
```

Their existence on disk does not make them current verification authority.

No current SimCore development instruction may direct a new release to create a command PR against an old version-specific build validator as the normal path.

RS2-4 owns their write/build fate.

---

## 22. Remaining legacy-compat allowance

RS2-3 may close with a bounded number of `GATE_LEGACY_COMPAT` assertion IDs still present inside permanent CI.

This is allowed only when every remaining ID has:

```text
registered assertion ID
read-only permanent execution
bounded deterministic fixture/input
no version-named workflow dependency
no source patching
no repository write
future permanent owner
retirement target phase/milestone
nonBlockingForRelease = true
```

The following are not allowed at close:

```text
UNMAPPED current assertion
NOT_MIGRATED release-safety assertion
legacy-compat assertion with no future owner
legacy-compat assertion that requires an old write-capable workflow
open PERMANENT_GATE_WEAKER
open ASSERTION_STRENGTH_GAP
```

Therefore:

```text
LEGACY_COMPAT_BOUNDED = YES
```

may coexist with a nonzero `legacyCompatIds` list.

---

## 23. Human observations at close

Nonblocking observations may remain open at RS2-3 close if they do not weaken verification authority.

Allowed examples:

```text
report wording cleanup
historical workflow naming cleanup
future fixture ergonomics
nonblocking CI duration optimization
legacy-compat migration debt with explicit owner
```

Not allowed as mere observations:

```text
required check not actually enforced
unmapped current assertion
candidate identity not immutable
write permission in permanent CI
secret dependency in ordinary PR CI
unexpected skipped planned gate
missing negative parity for retired responsibility
weaker permanent check
```

Those remain blockers.

---

## 24. RS2-3 close status file

Implementation must create one bounded machine-readable phase status file:

```text
products/simcore/ci/RS2_3_STATUS.json
```

This is administrative infrastructure state.

It is not production identity authority.

Minimum schema direction:

```json
{
  "schemaVersion": 1,
  "phase": "RS2-3",
  "phaseStatus": "CLOSED",
  "permanentCiAvailable": true,
  "permanentCiShadowVerified": true,
  "requiredCiActive": true,
  "requiredCiEnforcementVerified": true,
  "requiredCheckName": "SimCore CI / Required",
  "workflowPath": ".github/workflows/simcore-ci.yml",
  "verifierCommit": "<sha>",
  "legacyGateMapSha256": "<sha256>",
  "shadowEquivalenceSha256": "<sha256>",
  "pureCheckPredecessorsRetired": ["..."],
  "mixedValidationReplaced": ["..."],
  "legacyCompatIds": ["..."],
  "releaseWriteDisposition": "RS2_4_PENDING",
  "candidateRequiredInterface": "READY",
  "candidateRequiredReleaseAuthority": "RESERVED_FOR_RS2_4",
  "activationEvidence": {
    "negativeEnforcement": "...",
    "unrelatedNoop": "...",
    "substantivePass": "...",
    "mainHealthPostActivation": "...",
    "mainHealthPostRetirement": "..."
  },
  "rollbackSourceCommit": "<sha>",
  "openObservationIds": [],
  "rs2_4EntryAuthorized": true
}
```

Exact formatting may be implementation-adjusted without changing these semantics.

---

## 25. Status file source rules

`RS2_3_STATUS.json` must not duplicate or replace:

```text
product-manifest.json production identity authority
release-simcore code authority
RS2-2 state-sync source identity verification
```

It records only the **CI phase state**.

Forbidden uses:

```text
infer deployed version from RS2_3_STATUS.json
publish release from RS2_3_STATUS.json
rewrite manifest from RS2_3_STATUS.json
choose runtime candidate from RS2_3_STATUS.json
```

---

## 26. Close record write safety

Writing `RS2_3_STATUS.json` is a main-branch administrative operation.

If automated, it must use the repository's bounded main-write coordination mechanism and an explicit allowlist.

It must not introduce a new cross-product main-write lock.

Allowed future payload path:

```text
products/simcore/ci/RS2_3_STATUS.json
```

Any accompanying documentation close update must remain within explicit SimCore-owned paths.

No runtime or release branch file may be staged in the same close payload.

---

## 27. Candidate-required interface readiness

At RS2-3 close, the permanent workflow must expose the frozen callable profile contract:

```text
profile = CANDIDATE_REQUIRED
candidate_commit
candidate_fetch_ref (transport hint only)
expected_production_commit
```

The profile implementation is read-only.

The interface is considered:

```text
CANDIDATE_REQUIRED_INTERFACE_READY = YES
```

when static/self-tests prove:

```text
candidate_commit mandatory
expected_production_commit mandatory
mutable branch not authority
same-repository materialization only
production parent mismatch fails closed
candidate source identity is immutable per run
no repository write capability
identity-bound output schema present
manual workflow_dispatch cannot invoke required profile
```

A real release caller is not required to exist yet.

---

## 28. Candidate-required release authority remains inactive

RS2-3 explicitly closes with:

```text
CANDIDATE_REQUIRED_RELEASE_AUTHORITY = RESERVED_FOR_RS2_4
```

This means:

```text
interface implemented
verification semantics proven
release orchestration not yet connected
```

No manual shadow run, test caller, or CI self-test may be relabeled as release authorization.

Only RS2-4 may transition this state to active release authority.

---

## 29. RS2-4 entry authorization

RS2-4 may begin when:

```text
RS2_3_CLOSED = YES
RS2_4_ENTRY_AUTHORIZED = YES
```

RS2-4 entry does not require deleting every historical SimCore workflow file.

It does require:

```text
current verification authority is permanent CI
legacy write/build holdbacks are explicitly identified
no old version-specific validator is required for correctness
CANDIDATE_REQUIRED interface is ready
release-simcore remains production authority
```

---

## 30. RS2-4 handoff inputs

The permanent release workflow must establish an immutable candidate tuple before invoking permanent CI.

Minimum caller inputs:

```text
profile                 CANDIDATE_REQUIRED
candidate_commit        C
candidate_fetch_ref     optional same-repository transport hint
expected_production_commit P
```

`candidate_commit` and `expected_production_commit` are authority-bearing identities.

A branch name is not sufficient.

---

## 31. RS2-4 handoff outputs

The permanent verifier must return at least:

```text
ci_conclusion
verified_candidate_commit
verified_production_commit
verifier_commit
report_sha256
```

Recommended additional bounded outputs:

```text
registry_sha256
contract_sha256
required_gate_version/schema
```

RS2-4 may proceed only when:

```text
ci_conclusion == PASS
verified_candidate_commit == caller candidate C
verified_production_commit == caller expected parent P
report_sha256 is present
```

No boolean-only `passed=true` handoff is sufficient.

---

## 32. RS2-4 must revalidate identity before deployment

A successful `CANDIDATE_REQUIRED` result proves one immutable tuple.

Before writing `release-simcore`, RS2-4 must re-resolve the production head and verify:

```text
current release-simcore head == verified_production_commit P
```

If production moved:

```text
PRODUCTION_PARENT_MOVED
→ deployment blocked
→ candidate must be re-evaluated against new parent
```

The old CI PASS cannot be carried forward to a different production parent.

---

## 33. RS2-4 must deploy the verified candidate bytes

RS2-4 may not run permanent CI on candidate C and then generate different plugin bytes D during deployment.

Required relationship:

```text
candidate C contains exact proposed latest/install bytes
CANDIDATE_REQUIRED verifies C
release transaction promotes exact verified bytes from C
post-publish release-simcore identity is checked
```

If RS2-4 requires a build/materialization step, that step must occur **before** `CANDIDATE_REQUIRED` and produce the immutable candidate commit that is verified.

This prevents:

```text
verify source A
build source B after PASS
publish B
```

---

## 34. RS2-4 must not duplicate the regression suite

The permanent release workflow must consume permanent CI rather than copy its assertions.

Forbidden RS2-4 architecture:

```text
simcore-release.yml
  reimplements 25 timeline fixtures
  reimplements community fixtures
  reimplements representation fixtures
  maintains its own architecture assertion fork
```

Required direction:

```text
simcore-release.yml
  establish immutable candidate
  call CANDIDATE_REQUIRED
  validate identity-bound outputs
  deploy/promote exact verified bytes
  verify post-publish identity
  trigger/coordinate state synchronization
```

Release-specific transaction checks may exist when they concern publication semantics rather than product behavior.

---

## 35. RS2-4 release-specific checks allowed

Examples that belong to RS2-4 rather than permanent product CI:

```text
expected release-simcore parent still current
candidate commit is approved release candidate
promotion changes only allowed release paths
latest/install candidate blobs are identical
published release commit contains exact verified blobs
no force push
monotonic/stale release guard
post-publish ref identity
state-sync trigger/handshake
```

These checks must not fork behavioral correctness logic already owned by RS2-3.

---

## 36. release-simcore authority remains unchanged at RS2-3 close

RS2-3 close does not change:

```text
release-simcore = actual deployed plugin code/deployment authority
```

Permanent CI on `main` owns verification policy.

The authority split at close is:

```text
main
  → CI policy, tests, contracts, evidence, admin state

release-simcore
  → deployed plugin code
```

RS2-4 will automate movement between those authorities without merging them.

---

## 37. State synchronization relationship at RS2-3 close

RS2-3 does not absorb state writing.

It only consumes:

```text
sync-state --check
```

as a read-only state gate where the profile requires it.

The state-writer disposition remains whatever RS2-2/RS2-4 has explicitly established.

Therefore close status uses:

```text
STATE_WRITE_TRANSITIONAL_OR_RS2_2_OWNED = YES
```

rather than claiming that CI owns state mutation.

---

## 38. Required-check activation is an infrastructure change

Activating repository enforcement must be done as a dedicated release/repository-system change.

It must not be bundled with:

```text
SimCore runtime feature change
version bump
release-simcore deployment
M2-3 implementation
semantic fixture expectation change
```

If activation reveals a product failure, preserve evidence and open a separate product task.

Do not weaken the check in the same activation change merely to make it green.

---

## 39. Rollback authority

Until RS2-4 replaces the release transaction, RS2-3 CI promotion rollback is an administrative main/branch-protection operation only.

Rollback may change:

```text
required-check enforcement configuration
permanent CI main files
pure-check predecessor presence/authority
CI status record
```

Rollback may not silently change:

```text
release-simcore runtime
production version
manifest production declaration without its owner
old version-specific work branch
```

---

## 40. Rollback trigger classes

Immediate rollback evaluation is required for:

```text
required check deadlocks unrelated PRs
planned gates are unexpectedly skipped
fork PRs require unavailable secrets
permanent CI gains write capability
stable public gate disappears/renames unexpectedly
permanent verifier produces false PASS versus protected negative
permanent verifier is proven weaker than retired legacy check
main-health cannot run after predecessor retirement
branch-protection configuration no longer matches emitted check
```

Classification must be preserved as:

```text
FIX
WATCH
DEFER
BLOCKER
```

per SimCore repository evidence rules.

Security/trust-boundary or false-PASS conditions are BLOCKER by default.

---

## 41. Rollback order

Frozen rollback order:

```text
R1 freeze new SimCore CI promotion work
R2 preserve failing run / PR / identity evidence
R3 if required gate is deadlocking valid work, remove or suspend required enforcement explicitly
R4 restore last known safe check-only predecessor authority if needed and safe
R5 do NOT invoke old mixed mutation workflows as a side effect
R6 repair permanent CI on a separate main work branch
R7 rerun affected 3D shadow evidence as required by reset rules
R8 repeat 3E activation proof matrix
R9 reactivate stable required enforcement
```

Removing branch protection without restoring any meaningful verification is an emergency temporary state, not a successful rollback close.

---

## 42. Mixed legacy workflow rollback restriction

A historical mixed build/validator is not automatically safe to reactivate against current source.

Rollback may reuse its **assertion intent** or a read-only extracted validator.

It may not blindly replay:

```text
old patch script
old version bump
old candidate commit step
old git push
```

against a newer SimCore version.

If no safe read-only predecessor exists, repository merges may remain administratively paused until the permanent verifier is repaired.

---

## 43. Activation evidence durability

Before RS2-3 status becomes CLOSED, main must contain bounded references for:

```text
shadow-equivalence close evidence
required-check negative enforcement proof
unrelated NOOP proof
substantive SimCore PR proof
post-activation MAIN_HEALTH
pure predecessor retirement decision
post-retirement MAIN_HEALTH
rollback source commit
```

Raw GitHub logs are not the sole durable authority because retention is finite.

Bounded run IDs, commit SHAs, report hashes, conclusions, and reason codes are sufficient.

---

## 44. No live runtime validation required for RS2-3 close

RS2-3 is CI/repository infrastructure.

Therefore a new real long-chat runtime validation is not required merely to close RS2-3, provided:

```text
no runtime bytes changed
no release-simcore deployment occurred
all automated verification authority changes are proven through shadow/activation evidence
```

This does not weaken the SimCore release workflow.

Any future runtime release still requires its normal real long-chat validation before main release-memory close.

---

## 45. RS2-3 does not unblock an unfinished runtime release by itself

Permanent CI infrastructure and a runtime release have separate close gates.

Example:

```text
RS2-3 CLOSED
```

does not imply:

```text
current runtime release live gate CLOSED
```

Likewise a successful runtime live sample does not substitute for RS2-3 shadow/enforcement evidence.

This preserves evidence attribution.

---

## 46. RS2-4 entry package

The durable handoff package from RS2-3 to RS2-4 is:

```text
1. .github/workflows/simcore-ci.yml identity
2. SimCore CI / Required public check contract
3. CANDIDATE_REQUIRED workflow_call schema
4. identity-bound output schema
5. products/simcore/ci/RS2_3_STATUS.json
6. products/simcore/ci/legacy-gate-map.json digest
7. products/simcore/ci/shadow-equivalence.json digest
8. retired pure-check predecessor list
9. mixed validators with validationAuthority=PERMANENT_CI
10. remaining legacyCompatIds
11. release/write workflows still transitional
12. rollback source commit
13. open nonblocking observation IDs
```

RS2-4 must consume this package rather than reconstruct migration history from filenames.

---

## 47. RS2-4 entry invariants

RS2-4 must preserve all of these:

```text
permanent CI remains read-only
release-simcore remains deployment authority
candidate identity is immutable
production parent is immutable during one verification tuple
latest/install remain identical
verified bytes are promoted exactly
no force push
functional change and release-system implementation remain separate
main admin/state writes use their owned coordination mechanism
live validation remains outside CI and after deployment
```

RS2-4 may simplify orchestration.

It may not weaken these invariants.

---

## 48. RS2-4 first design questions

The next phase must freeze at least:

```text
how a candidate is materialized before verification
which branch/commit is candidate authority
how release approval is represented
how CANDIDATE_REQUIRED is invoked
how exact verified blobs are promoted to release-simcore
how stale production-parent races are handled
how same-version corrected releases are represented
how latest/install identity is rechecked after publish
how state-sync begins after publish
what happens if publish succeeds but state sync fails
how rollback differs from forward correction
which legacy release writers can finally retire
```

No answer may depend on reintroducing version-specific release workflows for each mini release.

---

## 49. Close state machine

Frozen RS2-3 operational state machine:

```text
DESIGN_COMPLETE
  ↓
IMPLEMENTING
  ↓
SHADOW_ONLY
  ↓
PROMOTION_READY
  ↓
REQUIRED_ACTIVE_UNVERIFIED
  ↓
REQUIRED_ACTIVE_VERIFIED
  ↓
PREDECESSOR_RETIREMENT_VERIFIED
  ↓
CLOSED
```

Failure transitions:

```text
SHADOW_ONLY / PROMOTION_READY
  → BLOCKED

REQUIRED_ACTIVE_UNVERIFIED
  → ROLLBACK_REQUIRED

REQUIRED_ACTIVE_VERIFIED
  → ROLLBACK_REQUIRED

CLOSED
  → REOPENED
```

A CLOSED phase may be reopened if later evidence proves the permanent gate materially weaker or enforcement missing.

---

## 50. `CLOSED` is not immutable dogma

RS2-3 status represents current verified infrastructure truth.

If later evidence proves:

```text
required check no longer enforced
critical migrated assertion disappeared
permanent CI has false-PASS behavior
trust boundary was weakened
```

then status must transition:

```text
CLOSED → REOPENED
```

with the incident preserved.

Do not leave `RS2_3_CLOSED = YES` merely because the phase was once completed.

---

## 51. Promotion failure codes

Initial bounded failure vocabulary:

```text
CI_PROMOTION_PREREQUISITE_MISSING
REQUIRED_CHECK_NAME_AMBIGUOUS
REQUIRED_CHECK_NOT_ENFORCED
REQUIRED_CHECK_DEADLOCK
REQUIRED_CHECK_UNEXPECTED_SKIP
REQUIRED_NOOP_PATH_FAILED
REQUIRED_SUBSTANTIVE_PATH_FAILED
MAIN_HEALTH_POST_ACTIVATION_FAILED
MAIN_HEALTH_POST_RETIREMENT_FAILED
PURE_PREDECESSOR_STILL_AUTHORITATIVE
MIXED_VALIDATOR_STILL_NORMAL_AUTHORITY
LEGACY_COMPAT_UNBOUNDED
RS2_4_HANDOFF_SCHEMA_INVALID
CANDIDATE_REQUIRED_MANUAL_AUTHORITY_EXPOSED
CANDIDATE_REQUIRED_IDENTITY_UNBOUND
REQUIRED_CI_ENFORCEMENT_DRIFT
```

These reason codes may be extended additively during implementation.

Equivalent failures must not be silently collapsed into generic `CI failed` when a bounded cause is known.

---

## 52. Implementation meta-tests required by 3E

The RS2-3 implementation suite must include at least:

```text
public required check name exactly stable
unrelated PR classifier returns NOOP success
planned gate skipped → aggregator INFRA_ERROR
manual CANDIDATE_REQUIRED rejected
candidate required without candidate commit rejected
candidate required without expected production commit rejected
production-parent mismatch rejected
identity-bound outputs include candidate/production/verifier/report digest
status file cannot claim CLOSED while requiredCiActive=false
status file cannot claim CLOSED without negative enforcement evidence
status file cannot claim CLOSED without unrelated NOOP proof
status file cannot claim CLOSED without substantive PASS proof
status file cannot claim CLOSED without post-retirement MAIN_HEALTH
status file cannot claim release authority active before RS2-4
remaining legacy-compat entry without future owner blocks close
remaining active pure predecessor blocks close
mixed validator normalInvocation=true blocks close after replacement
```

These tests validate phase governance, not product runtime behavior.

---

## 53. RS2-3 implementation close checklist

RS2-3 implementation may be declared complete only when:

```text
permanent workflow installed                                   PASS
read-only permission contract                                  PASS
stable public check observed                                   PASS
RS2-1 permanent regression gate operational                    PASS
RS2-2 state check operational                                  PASS
classifier/matrix self-tests                                   PASS
artifact/report safety self-tests                              PASS
legacy responsibility map complete                             PASS
3D shadow requirements complete                               PASS
mandatory negative parity complete                            PASS
no weaker permanent responsibility                            PASS
required check configured in actual repository enforcement    PASS
controlled failing PR proves merge blocking                   PASS
unrelated PR proves NOOP terminal success                     PASS
SimCore-relevant PR proves substantive enforced PASS          PASS
post-activation landed main health                            PASS
eligible pure predecessor authority retired                   PASS
mixed validation authority replaced where proven              PASS
post-retirement main health                                   PASS
remaining legacy-compat IDs bounded/nonblocking               PASS
CANDIDATE_REQUIRED interface self-tests                       PASS
CANDIDATE_REQUIRED release authority remains RS2-4-reserved   PASS
RS2_3_STATUS.json written                                     PASS
rollback source/evidence recorded                             PASS
RS2_4_ENTRY_AUTHORIZED                                        YES
runtime diff                                                  NONE
release-simcore diff                                          NONE
production deployment                                         NONE
```

---

## 54. RS2-3 design close gate

This RS2-3E design subphase is complete when the following are frozen:

```text
availability/enforcement/release-authority distinction        PASS
operational claim vocabulary                                  PASS
normal close-state values                                     PASS
promotion prerequisites                                       PASS
stable required check compatibility surface                  PASS
required-check uniqueness                                     PASS
actual enforcement definition                                 PASS
no path-filter enforcement hole                               PASS
promotion order                                               PASS
PROMOTION_READY state                                         PASS
controlled negative enforcement proof                        PASS
unrelated NOOP proof                                          PASS
substantive SimCore PR proof                                  PASS
post-activation main-health proof                             PASS
post-retirement main-health proof                             PASS
legacy pure/mixed final states                                PASS
bounded legacy-compat allowance                               PASS
human observation policy                                      PASS
RS2_3_STATUS.json contract                                    PASS
candidate-required interface readiness                        PASS
release authority reservation for RS2-4                       PASS
RS2-4 input/output handoff                                    PASS
production-parent revalidation rule                           PASS
exact verified-byte promotion invariant                       PASS
RS2-4 no-regression-duplication rule                          PASS
release/state authority separation                            PASS
rollback triggers/order                                       PASS
activation evidence durability                               PASS
no live-runtime requirement for CI infra close                PASS
RS2-4 entry package/invariants                                PASS
close/reopen state machine                                    PASS
failure vocabulary                                            PASS
implementation meta-tests                                     PASS
runtime diff                                                  NONE
release-simcore diff                                          NONE
manifest diff                                                 NONE
branch-protection implementation                              NONE
permanent CI implementation                                  NONE
release workflow implementation                               NONE
```

No operational activation is performed by this design-only change.

---

## 55. RS2-3 detailed design status

After this document is frozen:

```text
RS2-3A  Permanent CI Topology & Trust Boundary               DESIGN COMPLETE
RS2-3B  Trigger / Check Matrix & Path Classification         DESIGN COMPLETE
RS2-3C  Permissions / Concurrency / Report & Artifact Safety DESIGN COMPLETE
RS2-3D  Shadow Equivalence / Legacy Gate Retirement          DESIGN COMPLETE
RS2-3E  Promotion / Close Gate / RS2-4 Handoff               DESIGN COMPLETE

RS2-3 DETAILED DESIGN                                         COMPLETE
```

Implementation remains separate and not yet authorized merely by this status line.

---

## 56. Handoff to RS2-4

The next design phase is:

```text
RS2-4 — Permanent Release Workflow
```

Its first design must start from the invariant:

> Build/materialize first, verify the immutable candidate second, promote those exact verified bytes third, then verify published identity and synchronize durable state.

The directional release transaction is:

```text
candidate materialization
        ↓
immutable candidate commit C
        ↓
resolve production parent P
        ↓
CANDIDATE_REQUIRED(C, P)
        ↓ PASS + identity-bound evidence
recheck release-simcore still P
        ↓
promote exact verified latest/install bytes
        ↓
post-publish release identity verification
        ↓
state synchronization
        ↓
real long-chat validation for runtime release
        ↓
main final release evidence / long-memory close
```

RS2-4 may automate this chain.

It may not collapse the evidence boundaries.

---

## 57. Frozen final rule

> Permanent CI becomes authority only after the repository proves both correctness equivalence and actual enforcement. RS2-4 receives a verified interface, not permission to invent a second verifier.

The boring steady state after RS2-3 implementation should be:

```text
one permanent SimCore CI workflow
one stable required public check
one permanent accumulated regression system
one read-only state check
bounded legacy-compat only where explicitly owned
no normal version-specific validator commands
no CI repository writes
actual main enforcement verified
release writer still separate until RS2-4
```

That is the RS2-3 close target.