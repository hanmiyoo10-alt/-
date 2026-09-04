# SimCore R2.9 Post-v0.70.6 Operational Feedback — 2026-09-04

Date: 2026-09-04 KST
Status: **FEEDBACK RECORDED · CORE KEEP/FROZEN · REGRESSION MAINTENANCE SEAM FIX-ELIGIBLE · NO R2.11 AUTHORIZATION**
Classification: **RELEASE-SYSTEM FEEDBACK · NON-RUNTIME · STABILITY/SIMPLICITY/BOUNDED AUTOMATION**

## 1. Scope

This feedback is recorded after the genuine v0.70.6 candidate/release transaction exposed a new validation-only qualification failure and then recovered through the ordinary append-only release path.

Primary evidence:

- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_VALIDATION_CONTRACT_PROJECTION_AND_FIXTURE_CLOSURE_DESIGN_2026-08-30.md`
- `docs/SIMCORE_R2_9_OPERATIONAL_FEEDBACK_2026-08-30.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_10_CONTEXT_COHERENT_VALIDATION_HARNESS_DESIGN_2026-08-30.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_PROGRAM_OPERATIONAL_CLOSURE_2026-09-01.md`
- `docs/SIMCORE_07006_CANDIDATE_QUALIFICATION_FAILURE_01_R2_9_ACTIVE_VERSION_2026-09-04.md`
- `docs/SIMCORE_07006_R2_9_VALIDATION_PROJECTION_REPAIR_EVIDENCE_2026-09-04.md`
- `docs/SIMCORE_07006_PUBLICATION_EVIDENCE_2026-09-04.md`
- `products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs`

Runtime mutation: **NONE**

`release-simcore` mutation by this feedback transaction: **NONE**

## 2. v0.70.6 real-use result

The first v0.70.6 candidate request reached PR1 dry qualification with a valid 0.70.6 candidate source and an already-defined exact validation profile, but the permanent R2.9 regression rejected the source before publication:

```text
R2.9 active regression source version unsupported: 0.70.6
```

Classification at discovery:

```text
FIX · BLOCKER · RELEASE QUALIFICATION · NON_RUNTIME · PRODUCTION EXPOSURE NONE
```

The bounded repair changed only the R2.9 permanent regression identity/projection coverage. Production remained v0.70.5 during the failure. A fresh append-only `intent-02/new-02` then qualified and published v0.70.6 through unchanged Exact Approval Activation and Permanent Release authority.

Therefore the safety system behaved correctly, but the release-validation maintenance surface exposed another deterministic manual seam.

## 3. What remains correct and should stay frozen

### KEEP · exact validation profile authority

The exact profile remains the correct release-level authority for version-sensitive projected contracts.

Unknown source versions without an exact profile must continue to fail closed. No nearest/latest profile inference should be introduced.

### KEEP · projected stable contracts

R2.9 still achieves its primary simplification: unchanged behavioral contracts do not require a new version-stamped wrapper set for every runtime release.

### KEEP · R2.10 coherent context construction

The v0.70.6 incident was not a source/loader/profile/fixture coherence failure. R2.10 correctly owns coherent normal-path context construction and should not be redesigned for this incident.

### KEEP · authority boundaries

The incident did not widen release authority. Candidate Required, exact approval, Permanent Release, HUMAN_EVIDENCE, the singular publisher, and the singular main writer remained unchanged.

### KEEP · fail-closed behavior

The stale regression identity list blocked candidate qualification before production mutation. This is the desired safety direction.

## 4. New operational finding

The permanent regression now contains a second per-release identity census in addition to the exact validation profiles.

Current examples include:

```text
KNOWN_RELEASE_IDENTITIES[version] -> releaseName
explicit validation-profile load/assert blocks per selected version
explicit builder-vNNNNN discoverability assertions per selected version
explicit no-wrapper assertions per selected version
active source membership guard against KNOWN_RELEASE_IDENTITIES
```

This means a new runtime version can have all of the intended R2.9 release artifacts present:

```text
exact validation profile
builder suite + fixture closure
R2.10 coherent source/profile/loader/fixture context
stable projected contract route
```

and still fail candidate qualification solely because the permanent regression's historical/current identity census was not extended.

The v0.70.6 failure is direct evidence of that condition.

## 5. Why this matters

R2.9's design objective was to remove recurring per-version validation bridge/fanout work. R2.10 additionally declared `hard-coded active production version assumptions = 0` as a simplicity acceptance criterion.

The current permanent regression no longer hard-codes only one deployed production version, but it does hard-code the set of acceptable active source versions. Operationally this creates a similar maintenance effect:

```text
new exact profile exists
+ new builder closure exists
+ active context is coherent
+ projected contracts are valid
BUT
regression identity census missing current version
-> candidate qualification BLOCK
```

This is not a correctness or authority defect in the R2.9 core. It is a regression-maintenance fanout defect around the core.

## 6. Root cause

The permanent regression currently combines two distinct responsibilities:

```text
A. historical known-release projection coverage
B. acceptance/proof of the actual active source under qualification
```

Historical projection tests legitimately need bounded known identities when synthesizing old versions from a current source.

The active source path should not require membership in that historical test census when the exact validated profile and coherent active validation context already provide the release identity authority.

Conflating A and B turns a historical coverage table into a release-qualification prerequisite.

## 7. Classification

### Closed incident

```text
FIX · R2_9_ACTIVE_VERSION_PROJECTION_LAG · v0.70.6 · CLOSED
```

The exact v0.70.6 qualification blocker is repaired and the release is published.

### Remaining structural seam

```text
FIX-ELIGIBLE · R2_9_REGRESSION_IDENTITY_CENSUS_FANOUT · NON_RUNTIME
```

Rationale:

- the seam caused a real candidate qualification blocker;
- it is deterministic for future versions unless the census is manually maintained;
- prior R2.9 history already contained an active-source-version assumption failure on v0.70.1;
- the current failure occurred after R2.10 normal-path context coherence was already active;
- the issue can be bounded to validation regression ownership without changing release authority.

Current v0.70.6 live validation disposition:

```text
BLOCKER TO CURRENT LIVE GATE = NO
PRODUCTION CORRECTNESS IMPACT = NONE OBSERVED
NEXT RUNTIME ACTION = v0.70.6 HUMAN REAL-LONG-CHAT VALIDATION
```

## 8. Recommended bounded direction

Do not rewrite R2.9 and do not broaden R2.10.

Preferred future repair invariant:

```text
active source acceptance
-> derive source version from exact source
-> load and validate exact profile for that source version
-> build R2.10 coherent validation context
-> execute projected contracts
-> topology/builder closure PASS
-> no separate historical identity-census membership requirement
```

Historical projection coverage may remain explicitly bounded, but it must stop being the authority that decides whether the actual current source version is supported.

A bounded implementation may either:

1. derive historical identity data from validated exact profile artifacts; or
2. retain a finite historical projection table only for synthetic history tests while removing it from active-source qualification.

Option 2 is the smaller default because it separates responsibilities without changing profile ownership.

## 9. Required fail-closed invariants for any future repair

Any future control-plane repair must preserve:

```text
unknown current source with no exact profile -> BLOCK
invalid exact profile -> BLOCK
profile/source version mismatch -> BLOCK
unsupported/unknown contract mode -> BLOCK
builder/fixture closure gap -> BLOCK
R2.10 context provenance contradiction -> BLOCK
latest.js != install.js -> BLOCK
publication authority -> unchanged
main writer -> unchanged
HUMAN_EVIDENCE authority -> unchanged
```

Removing the census gate must not become "accept any future version" behavior. The exact profile remains the explicit opt-in authority.

## 10. Release-system version disposition

The current Release System v2 wave was previously closed with the rule that a new R increment requires concrete operational evidence.

The v0.70.6 incident supplies evidence for a bounded improvement theme, but this feedback document does **not** authorize R2.11 and does not reopen the full R v2 program.

Disposition:

```text
R2_9_CORE = KEEP / FROZEN
R2_9_EXACT_PROFILE_MODEL = KEEP / AUTHORITY
R2_9_PROJECTED_CONTRACT_MODEL = KEEP
R2_10_CONTEXT_OWNER = KEEP / FROZEN
R2_9_REGRESSION_IDENTITY_CENSUS = FIX-ELIGIBLE
R2_11 = NOT AUTHORIZED
RELEASE-SYSTEM IMPLEMENTATION = DEFER UNTIL SEPARATE AUTHORIZATION
```

Because v0.70.6 is currently `LIVE_PENDING`, do not mix a release-system refactor into the active runtime live-validation transaction.

## 11. Recommended sequencing

```text
1. keep this feedback durable on main
2. finish v0.70.6 HUMAN real-long-chat validation
3. close v0.70.6 normally through existing terminal authority
4. if another new runtime release is planned, authorize one separate non-runtime control-plane repair before that candidate transaction
5. prove the next new version can qualify from exact profile + coherent context without editing an active-source identity census
```

No synthetic runtime release should be manufactured solely to prove this point.

## 12. Final verdict

```text
R2.9 SAFETY = PASS
R2.9 CORE DESIGN = KEEP
R2.9 EXACT PROFILE AUTHORITY = KEEP
R2.9 WRAPPER FANOUT REDUCTION = STILL PROVEN
R2.10 CONTEXT COHERENCE = NOT IMPLICATED

NEW FINDING = PERMANENT REGRESSION HAS ACCRETED A MANUAL VERSION CENSUS
IMPACT = RELEASE QUALIFICATION FRICTION, NOT PRODUCTION CORRECTNESS
CLASS = FIX-ELIGIBLE / NON_RUNTIME / SEPARATE CONTROL-PLANE TASK
CURRENT v0.70.6 LIVE GATE = UNAFFECTED
R2.11 = NOT AUTHORIZED BY FEEDBACK ALONE
```
