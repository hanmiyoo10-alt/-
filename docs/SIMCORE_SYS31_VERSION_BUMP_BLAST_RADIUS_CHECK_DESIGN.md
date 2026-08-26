# SYS-31 — Version-Bump Blast-Radius Check — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_PROTECTED · READ-ONLY RELEASE-GOVERNANCE PREFLIGHT · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-31
Idea          = Version-Bump Blast-Radius Check
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_PROTECTED
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4A_RELEASE_TRANSACTION_IDENTITY_AUTHORITY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4B_RELEASE_SPEC_CANDIDATE_MATERIALIZATION.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `product-manifest.json`
- `products/simcore/tooling/candidate-materialize.mjs`
- `products/simcore/tooling/declare-production.mjs`
- `.github/workflows/simcore-release-state-sync.yml`
- `docs/SIMCORE_SYS09_CHANGE_IMPACT_REVIEW_MAP_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`

Existing authorities SYS-31 must not replace:
- `release-simcore` as deployed runtime/production authority;
- `product-manifest.json` as synchronized declarative release identity;
- RS2-4A/4B as release-mode, candidate, parent, path, and version-semantics authority;
- permanent candidate materialization/verification as canonical candidate construction authority;
- permanent publication caller as sole production publisher;
- release-state convergence/state-sync as post-publication administrative authority;
- SYS-09 as semantic change-family → review-obligation mapping;
- SYS-50 as work-bundling conflict preflight;
- human real-long-chat evidence as LIVE_PASS authority.

---

## 1. Problem

A SimCore version change is not a one-line metadata edit.

The current permanent release model binds a runtime-affecting release to:

```text
current production parent P
+ target version / release name / release mode
+ immutable work/source provenance
+ exactly two production runtime paths
+ candidate C direct-child of P
+ latest/install identical candidate blob
+ permanent verification
+ exact approval/publication
+ post-publish product-manifest/LIVE_PENDING convergence
+ human real-long-chat close
```

The current system already validates many individual facts at their owning stage.

What is still easy for an operator or future automation to get wrong before candidate creation is the **transaction blast radius**:

```text
Are we changing the correct kind of version?
Are all required release surfaces planned?
Are forbidden release/repository-system changes being mixed into product work?
Is a same-version correction actually eligible?
Is a rollback explicitly evidence-bound?
Are we accidentally treating post-publish state-sync files as product-candidate files?
Are we about to manufacture a release merely to test infrastructure?
```

SYS-31 adds one bounded preflight that answers those review questions before production candidate materialization/publication.

It does not bump a version or publish anything.

---

## 2. Core invariant

```text
reviewed release intent
+ exact current production identity
+ reviewed work/change-radius declaration
→ blast-radius disposition

blast-radius disposition
!= release authorization
!= candidate verification
!= publication
!= LIVE_PASS
```

Canonical identity:

```text
SYS-31
= version/release transaction boundary checker

NOT
= version bumper
= release-spec generator
= candidate materializer
= publisher
= state-sync writer
= semantic product verifier
```

---

## 3. Why v1 is NR_PROTECTED

SYS-31 is read-only and non-runtime, but its purpose is to police release-governance boundaries.

The canonical NR policy says a tool is `NR_PROTECTED` when it alters **or polices** build/release/CI/repository/architecture-governance surfaces.

SYS-31 freezes rules such as:

```text
which release-mode/version relationship is legitimate
which production paths may be in a release candidate
which administrative surfaces belong only after publication
which release/repository-system changes may not be bundled with product runtime work
which live-gate requirements must exist before a genuine runtime publication
```

Therefore:

```text
Apply Class = NR_PROTECTED
```

A future implementation requires its own protected implementation transaction.

It must not be implemented inside the M2-3 runtime feature transaction or inside a genuine release that it is meant to check.

---

## 4. Review timing

SYS-31 is a **pre-candidate** release-intent check.

Normal sequence:

```text
product/runtime design frozen
→ implementation and product verification ready
→ release intent/request prepared
→ SYS-09 change-impact review
→ SYS-50 bundling preflight
→ SYS-31 version-bump blast-radius check
→ only then candidate materialization / permanent release path
```

A later repeat may be run against the final immutable candidate request before candidate materialization.

SYS-31 does not replace post-candidate checks.

---

## 5. Frozen inputs

A v1 check operates on explicit bounded inputs only.

Required:

```text
A. production identity receipt
   productionCommit
   productionVersion
   productionReleaseName
   latestBlob
   installBlob

B. release intent / candidate request
   intentId
   targetVersion
   releaseName
   releaseMode
   expectedProductionCommit
   builderPath
   verificationSuite
   allowedRuntimePaths
   changeClass
   primaryGoalId
   liveGate
   evidenceRefs

C. reviewed transaction-radius declaration
   primary change families / roles
   intended product-work surfaces
   intended supporting verification surfaces
   intended release-intent surfaces
   explicitly separate protected/infrastructure work, if any
```

The production identity receipt must come from an immutable/reobserved release-simcore identity source, not from freehand text.

`product-manifest.json` is also checked for synchronization with the observed production identity, but a contradictory manifest never overrides actual `release-simcore` production.

---

## 6. Production identity precondition

Required before any version-radius conclusion:

```text
latestBlob == installBlob
observed production commit is full immutable identity
observed version is parseable
product-manifest release_commit == observed production commit
product-manifest production_version == observed production version
product-manifest release_blob == observed shared blob
```

If manifest and production disagree:

```text
VERSION_RADIUS_BLOCKED
reason = PRODUCTION_STATE_DRIFT
```

The repair belongs to existing state-sync/authority tooling.

SYS-31 does not repair it.

---

## 7. Version grammar and comparator

Current generic candidate requests accept bounded numeric dotted versions:

```text
major.minor.patch
```

v1 compares the three decimal components numerically and lexicographically:

```text
(major, minor, patch)
```

Examples:

```text
0.64.7 < 0.64.8
0.64.8 < 0.65.0
0.65.0 < 1.0.0
```

No prerelease/build-metadata semantics are introduced by SYS-31.

If future release request grammar expands, SYS-31 must be revised with the canonical release policy instead of inventing its own comparator.

---

## 8. Release-mode blast-radius rules

### 8.1 NEW_VERSION

Required:

```text
releaseMode = NEW_VERSION
targetVersion > productionVersion
expectedProductionCommit == observed productionCommit
allowedRuntimePaths exactly latest.js + install.js
liveGate.required == true
liveGate.closeAuthority == HUMAN_EVIDENCE
changeClass describes genuine runtime/correctness product work
```

A genuine new-version release must not exist solely to qualify release infrastructure.

Forbidden:

```text
targetVersion <= productionVersion
runtime candidate disabled live gate
release/repository-system redesign bundled as the product release objective
```

### 8.2 SAME_VERSION_CORRECTION

Required:

```text
releaseMode = SAME_VERSION_CORRECTION
targetVersion == productionVersion
expectedProductionCommit == observed productionCommit
explicit correction reason/evidence exists
prior lifecycle is not durably LIVE_PASS/CLOSED
release name is preserved unless owning release policy explicitly allows otherwise
live gate remains required for changed runtime bytes
```

Allowed initial correction purposes remain the existing RS2 policy set such as:

```text
PRE_LIVE_BLOCKER
DEPLOYMENT_CORRECTION
```

SYS-31 does not invent additional correction reason codes.

If lifecycle eligibility or evidence is unresolved:

```text
VERSION_RADIUS_REVIEW_REQUIRED
or
VERSION_RADIUS_BLOCKED
```

depending on whether the required authority is merely unbound versus contradictory.

### 8.3 ROLLBACK

Required:

```text
releaseMode = ROLLBACK
expectedProductionCommit == current production commit
explicit rollback reason/evidence exists
approved source release commit/blob is identified
rollback target safety state is declared by existing release policy
candidate production paths remain exactly latest.js + install.js
publication remains forward-history direct-child / fast-forward
live gate remains human-evidence gated for the resulting runtime deployment
```

A lower target version without explicit rollback authority is a violation.

SYS-31 never treats ordinary version regression as a valid rollback by inference.

### 8.4 NOOP_IDENTICAL

`NOOP_IDENTICAL` is an observed transaction disposition, not a normal candidate request release mode.

If the intended runtime bytes are already identical to production:

```text
no new product release commit is required
no ref movement is justified merely to create a version event
```

SYS-31 reports that the planned release radius needs review rather than manufacturing a release.

---

## 9. Three blast-radius zones

SYS-31 explicitly separates three zones that must not be confused.

### Zone P — Product/work transaction

May contain, according to the frozen product work:

```text
runtime implementation source on main/work branch
product builder
supporting regression tests/fixtures
architecture contract updates required by the product checkpoint
design/evidence docs
candidate request/release intent
```

This is development provenance, not production release commit content.

### Zone C — Canonical production candidate

Permanent production path allowlist remains:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

Candidate `C` must not carry:

```text
docs/**
products/simcore/tests/**
products/simcore/tooling/**
.github/**
product-manifest.json
release evidence
work-branch helpers
```

SYS-31 reports any plan that widens Zone C without an explicit prior release-infrastructure policy change as a blast-radius violation.

### Zone A — Post-publication administrative convergence

Existing state-sync/convergence may update bounded administrative truth such as:

```text
product-manifest production identity
validation_status = PENDING_REAL_LONG_CHAT
current live priority/scenario
managed CURRENT_DEVELOPMENT / SIMCORE_GUIDELINES state
per-release LIVE_PENDING record/evidence
```

These are expected **after publication** under existing state-sync authority.

They are not production candidate paths and must not be manually smuggled into Zone C.

---

## 10. Frozen forbidden bundling classes

SYS-31 consumes SYS-09/SYS-50 results where available and adds release-specific guardrails.

A genuine runtime version bump is `SPLIT_REQUIRED` / blast-radius violation when the same primary transaction also attempts:

```text
permanent release-workflow redesign
CI routing/topology redesign
repository writer redesign
release-simcore authority redesign
candidate path allowlist expansion
release mode/schema semantics redesign
state-sync writer-policy redesign
branch-protection / release authorization model redesign
```

Supporting evidence, tests, required architecture-contract sync, and ordinary release intent are not prohibited merely because they are non-runtime.

Canonical distinction:

```text
product release USING existing release system
= normal

product release CHANGING release system
= split transaction
```

This preserves the standing rule that feature/runtime change and release/repo-system restructuring do not ship as one work item.

---

## 11. Required review surfaces

For a genuine runtime version boundary, SYS-31 requires explicit disposition for these surfaces:

```text
BR-01 production parent identity
BR-02 target version / release mode relationship
BR-03 release name identity
BR-04 latest/install candidate path pair
BR-05 latest/install equality expectation
BR-06 builder / immutable source provenance
BR-07 permanent verification suite
BR-08 change-class / primary-goal identity
BR-09 live-gate declaration
BR-10 evidence references
BR-11 SYS-09 semantic impact families
BR-12 SYS-50 bundling disposition
BR-13 architecture checkpoint/contract review when applicable
BR-14 post-publish administrative convergence expectation
BR-15 R2.1 genuine-release-proof relevance when this is the first qualifying genuine release
```

`BR-15` is informational/review-required context only.

SYS-31 does not declare R2.1 operationally proven; that requires the actual genuine release path evidence.

---

## 12. Result vocabulary

Top-level result uses exactly:

```text
VERSION_RADIUS_CLEAR
VERSION_RADIUS_REVIEW_REQUIRED
VERSION_RADIUS_VIOLATION
VERSION_RADIUS_BLOCKED
```

### VERSION_RADIUS_CLEAR

All frozen v1 blast-radius rules are satisfied for the supplied reviewed inputs.

It means only:

```text
no known version/release boundary contradiction was found
```

It does not authorize publication.

### VERSION_RADIUS_REVIEW_REQUIRED

No direct contradiction is proven, but one required human/authority disposition is unresolved.

Examples:

```text
same-version lifecycle eligibility not yet cited
rollback source safety authority not yet bound
architecture-review applicability unresolved
```

### VERSION_RADIUS_VIOLATION

A supplied transaction contradicts a frozen blast-radius rule.

Examples:

```text
NEW_VERSION with equal/lower target version
same-version correction without correction authority
lower version without ROLLBACK
candidate path plan wider than latest/install
runtime release bundled with release-system redesign
runtime publication with live gate disabled
```

### VERSION_RADIUS_BLOCKED

The check cannot establish authoritative inputs safely.

Examples:

```text
production identity unresolved
manifest/production drift
latest/install production divergence
release intent malformed
```

---

## 13. Reason-code families

Frozen v1 reason families:

```text
IDENTITY_UNRESOLVED
PRODUCTION_STATE_DRIFT
PRODUCTION_LATEST_INSTALL_DIVERGED
RELEASE_INTENT_INVALID
EXPECTED_PARENT_MISMATCH
NEW_VERSION_RELATION_INVALID
SAME_VERSION_RELATION_INVALID
SAME_VERSION_ELIGIBILITY_UNRESOLVED
SAME_VERSION_AUTHORITY_MISSING
ROLLBACK_RELATION_INVALID
ROLLBACK_AUTHORITY_MISSING
ROLLBACK_SOURCE_UNRESOLVED
NOOP_RELEASE_NOT_REQUIRED
CANDIDATE_PATH_RADIUS_INVALID
LATEST_INSTALL_PAIR_INCOMPLETE
LIVE_GATE_INVALID
CHANGE_CLASS_GOAL_UNRESOLVED
RELEASE_SYSTEM_CHANGE_BUNDLED
REPOSITORY_SYSTEM_CHANGE_BUNDLED
CI_SYSTEM_CHANGE_BUNDLED
STATE_SYNC_SYSTEM_CHANGE_BUNDLED
ARCHITECTURE_REVIEW_UNRESOLVED
R2_1_GENUINE_RELEASE_PROOF_RELEVANT
```

These are SYS-31 review findings only.

They do not replace release-controller failure codes.

---

## 14. Relationship to candidate materialization

Current generic candidate materialization already enforces:

```text
valid request shape
allowed runtime paths exactly latest/install
expected production parent exact
production latest/install equality
builder provenance
changed path equality
candidate latest/install equality
syntax
permanent regression suite
candidate direct-child identity
```

SYS-31 does not duplicate candidate construction.

The relationship is:

```text
SYS-31
= is the planned release transaction/radius legitimate before candidate construction?

candidate-materialize
= can the exact candidate be safely constructed and verified under existing permanent policy?
```

A `VERSION_RADIUS_CLEAR` result does not guarantee candidate materialization PASS.

---

## 15. Relationship to post-publish state sync

The current release-state sync observes real `release-simcore`, requires latest/install equality, extracts deployed version/name, and updates bounded main state.

SYS-31 only verifies that the release plan expects this administrative convergence in the correct zone.

It never writes:

```text
product-manifest.json
CURRENT_DEVELOPMENT.md
SIMCORE_GUIDELINES.md
release records
```

and never predicts a production commit/blob before publication as if it were already authoritative.

---

## 16. Relationship to SYS-09 and SYS-50

```text
SYS-09
= what semantic change families are present and what must be reviewed?

SYS-50
= may those change-family roles coexist in one work transaction?

SYS-31
= given the intended release/version boundary, is the resulting release blast radius legitimate?
```

SYS-31 may consume reviewed SYS-09/SYS-50 dispositions but does not recompute their full policy.

If a supplied SYS-50 result is `BUNDLE_SPLIT_REQUIRED` or `BUNDLE_BLOCKED`, SYS-31 cannot return `VERSION_RADIUS_CLEAR`.

---

## 17. Relationship to future SYS-35 / SYS-30 / SYS-33

```text
SYS-31
= pre-release version/radius contract

SYS-35 Repository Transaction Ledger
= durable transaction-history identity across work/release operations

SYS-30 Release-to-Docs Convergence Receipt
= later proof that publication/admin docs actually converged

SYS-33 Rollback Readiness Checklist
= operator readiness before an actual rollback path is chosen
```

Do not expand SYS-31 into those systems.

---

## 18. Future v1 implementation

Preferred bounded implementation:

```text
products/simcore/tooling/version-bump-blast-radius.mjs
products/simcore/tooling/version-bump-blast-radius.test.mjs
products/simcore/tooling/schema/version-bump-blast-radius-input-v1.schema.json
```

The tool is read-only.

Conceptual invocation:

```text
node products/simcore/tooling/version-bump-blast-radius.mjs \
  --production <production-identity.json> \
  --manifest product-manifest.json \
  --request <candidate-request.json> \
  --radius <reviewed-transaction-radius.json> \
  --report <path>
```

No implicit GitHub/network lookup in v1.

Inputs must be materialized explicitly by the caller.

---

## 19. Forbidden v1 capabilities

```text
modify plugin source
modify //@version
modify release name
create candidate commit
push candidate ref
write release spec/approval
publish release-simcore
write product-manifest
write living docs
alter state-sync registry/policy
alter CI/workflow files
alter release schema/policy
open/merge PR
change WATCH/FIX/BLOCKER
mark R2.1 genuine proof complete
background monitoring
```

If later implementation wants permanent CI or release-controller enforcement, that is a separate protected policy change after the standalone checker itself is qualified.

---

## 20. Determinism and fail-closed behavior

Given identical normalized input documents, the JSON report must be byte-identical.

No timestamp, branch-tip lookup, environment-specific data, or network response is required.

Malformed or contradictory authority input fails closed.

The tool must not silently choose:

```text
manifest over actual production
one plugin file over the other
NEW_VERSION over ROLLBACK
product work over release-system change
```

when the supplied facts conflict.

---

## 21. Verification plan for later protected implementation

Minimum focused tests:

```text
1. clean NEW_VERSION plan → CLEAR
2. equal-version NEW_VERSION → VIOLATION
3. lower-version NEW_VERSION → VIOLATION
4. eligible SAME_VERSION_CORRECTION → CLEAR
5. same-version correction without authority → VIOLATION/REVIEW per missing-vs-contradictory input
6. correction after LIVE_PASS → VIOLATION
7. explicit valid rollback → CLEAR
8. downgrade without rollback → VIOLATION
9. rollback source unresolved → REVIEW/BLOCKED
10. production manifest drift → BLOCKED
11. production latest/install divergence → BLOCKED
12. candidate path pair missing one runtime file → VIOLATION
13. candidate path radius contains docs/workflow/tooling → VIOLATION
14. runtime product release + release-system primary redesign → VIOLATION
15. runtime product release + supporting regression tests → not a bundling violation
16. required architecture-contract sync as supporting product work → not automatically a release-system conflict
17. liveGate disabled for changed runtime → VIOLATION
18. exact identical intent classified NOOP review rather than forced release
19. malformed release intent → BLOCKED
20. deterministic repeated report bytes
21. no file/network/repository mutation
```

Because the item is `NR_PROTECTED`, implementation verification must additionally show that the checker itself does not become a publisher/writer and is not silently wired into permanent release authority in the same transaction.

---

## 22. Current v0.64.7 / next M2-3 specialization

Current production remains:

```text
v0.64.7
release-simcore commit = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob = 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
live gate = PENDING_REAL_LONG_CHAT
checkpoint = M2-2
```

SYS-31 does not authorize a next version while that live gate is open.

After the v0.64.7 live gate closes and M2-3 is implemented/verified, the next genuine runtime release will be especially important because it is also the pending R2.1 end-to-end delegated-release proof opportunity.

That fact means:

```text
R2.1 genuine proof relevance = YES
```

not:

```text
R2.1 proof already satisfied = YES
```

The actual release must still exercise the real delegated candidate → approval → permanent publication → LIVE_PENDING path and later human live close.

---

## 23. Freeze verdict

```text
SYS-31 = DESIGN FROZEN
Runtime Class = NON_RUNTIME
Apply Class = NR_PROTECTED
Open design questions = 0
Implementation = NOT STARTED / HOLD
```

Canonical value:

```text
before a SimCore version/release boundary is exercised,
prove the intended transaction radius is legitimate
without turning the preflight checker into the release authority itself.
```
