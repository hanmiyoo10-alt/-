# SimCore Release System R2.11 — Profile-Driven Validation Inventory

Date: 2026-09-04 KST

Status: **DESIGN FROZEN · IMPLEMENTATION BLOCKED ON v0.70.6 HUMAN LIVE CLOSE · NON-RUNTIME**

Classification: **RELEASE-SYSTEM DESIGN · STABILITY / SIMPLICITY / BOUNDED AUTOMATION**

Predecessors:
- `R2.9 Validation Contract Projection & Fixture Closure`
- `R2.10 Context-Coherent Validation Harness`

Direction authority:
- operator instruction on 2026-09-04 to design the next version around stabilization + simplification + automation;
- `docs/SIMCORE_R2_9_POST_V07006_OPERATIONAL_FEEDBACK_2026-09-04.md`;
- `docs/SIMCORE_07006_CANDIDATE_QUALIFICATION_FAILURE_01_R2_9_ACTIVE_VERSION_2026-09-04.md`;
- `docs/SIMCORE_07006_R2_9_VALIDATION_PROJECTION_REPAIR_EVIDENCE_2026-09-04.md`;
- `docs/SIMCORE_RELEASE_SYSTEM_V2_PROGRAM_OPERATIONAL_CLOSURE_2026-09-01.md`.

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

---

## 1. Version decision

The next bounded release-system revision is assigned **R2.11**.

Working name:

```text
R2.11 Profile-Driven Validation Inventory
```

This is not R3.0 because the authority graph does not change:

```text
HUMAN_EVIDENCE authority = unchanged
R2.8 terminal convergence = unchanged
R2.9 exact-profile / projected-contract semantics = unchanged
R2.10 coherent validation context = unchanged
Candidate Required = unchanged
Exact Approval = unchanged
Permanent Release = unchanged
production publisher = RS2_4_PERMANENT
main writer = repo-main-write.py
background polling/retry = none
```

R2.11 exists only to remove one newly evidenced mechanical maintenance seam around the R2.9 permanent regression.

---

## 2. Triggering operational evidence

The first v0.70.6 candidate qualification reached a valid production-derived 0.70.6 source with:

```text
exact validation profile = present
builder suite + fixture closure = present
R2.10 coherent source/profile/loader/fixture context = available
stable projected contracts = available
```

but the permanent R2.9 regression still failed with:

```text
R2.9 active regression source version unsupported: 0.70.6
```

The failed attempt remained pre-production and was classified:

```text
FIX · BLOCKER · RELEASE QUALIFICATION · NON_RUNTIME · PRODUCTION EXPOSURE NONE
```

The repair added 0.70.6 to the regression's manual identity/projection census and a fresh append-only release transaction then qualified and published normally.

This proves both:

1. fail-closed safety is correct and must be preserved;
2. a second per-version identity census has become a recurring qualification seam despite exact profiles already being authoritative.

The current regression contains examples of recurring manual version fanout:

```text
KNOWN_RELEASE_IDENTITIES[version] -> releaseName
explicit profile load/assert blocks per selected version
explicit builder-vNNNNN presence assertions per selected version
explicit no-wrapper assertions per selected version
active source membership guard against KNOWN_RELEASE_IDENTITIES
```

That is the exact seam R2.11 targets.

---

## 3. Primary goal

R2.11 should make the already-authoritative validation profile inventory the single release-identity inventory for normal validation mechanics.

Canonical direction:

```text
EXACT PROFILE FILES ARE THE DECLARATIVE INVENTORY
ACTIVE SOURCE SUPPORT COMES FROM EXACT PROFILE RESOLUTION
R2.10 CONSTRUCTS THE COHERENT EXECUTION CONTEXT
BUILDER / FIXTURE CLOSURE IS DISCOVERED STRUCTURALLY
PERMANENT REGRESSION DERIVES ITS VERSION MATRIX FROM PROFILE INVENTORY
NO SECOND MANUAL CURRENT-VERSION CENSUS
UNKNOWN / MISSING / INVALID PROFILE STILL FAILS CLOSED
```

The desired new-release path becomes:

```text
new runtime source
+ exact validation profile
+ builder suite + fixture closure
-> profile inventory discovers release identity
-> exact active profile binds source
-> R2.10 coherent context binds source/loader/profile/fixtures
-> projected contracts execute
-> topology preflight passes
-> permanent regression requires no new active-version census edit
```

---

## 4. Three design pillars

### 4.1 Stability — one explicit identity authority

For normal active-source qualification:

```text
source metadata version
-> exact profile file <version>.json
-> validated profile.releaseVersion must equal source version
-> profile.releaseName is current release-name authority for validation identity
```

No fallback to nearest/latest profile is allowed.

No source version may qualify merely because its format is syntactically valid.

No inventory entry may be synthesized without an actual exact profile artifact.

The profile remains an explicit opt-in gate.

### 4.2 Simplicity — remove duplicate version census maintenance

Normal R2.9 regression behavior must stop requiring edits such as:

```text
KNOWN_RELEASE_IDENTITIES['new.version'] = ...
load new profile explicitly in another hand-written block
assert builder-vNNNNN explicitly in another line
assert no-wrapper for the same version in another line cluster
```

The design target is:

```text
manual active-version identity census rows per new release = 0
manual per-version profile assertion blocks = 0
manual per-version builder discoverability assertions = 0
manual per-version unchanged-contract no-wrapper assertion fanout = 0
```

Historical one-off regression archaeology may remain explicit when it proves a historically unique incident, but it must not be the normal current-release routing mechanism.

### 4.3 Bounded automation — derive mechanics, not authority

R2.11 may automatically discover and validate declarative artifacts that already exist in the repository.

It must not:

```text
create validation profiles automatically
choose a release version
choose a predecessor
choose a release name
infer changed contract semantics
approve a release
merge a PR
publish production
retry a failed release
judge HUMAN_EVIDENCE
close LIVE_PASS
```

Automation is strictly repository-local, deterministic, read-only validation inventory construction.

---

## 5. New bounded owner

Preferred new owner:

```text
products/simcore/tooling/validation-profile-inventory-r2-11.mjs
```

One pure/local inventory constructor should:

```text
scan products/simcore/releases/validation-profiles/*.json
-> require exact semver filename
-> parse each profile
-> validate each profile through existing R2.9 profile validator
-> require filename version == profile.releaseVersion
-> require unique releaseVersion
-> preserve exact releaseName from profile
-> sort semantically / deterministically
-> expose immutable validated inventory
```

Illustrative result shape:

```js
ValidationProfileInventory {
  versions: ['0.70.0', ...],
  profilesByVersion: Map,
  identitiesByVersion: Map(version -> { releaseVersion, releaseName }),
  provenance: {
    owner: 'R2.11_PROFILE_DRIVEN_VALIDATION_INVENTORY',
    exactProfilesOnly: true,
    inferredProfiles: false
  }
}
```

Exact API names may vary during implementation, but ownership must remain singular and pure.

---

## 6. Active-source qualification rule

R2.11 must explicitly separate two concerns that are currently entangled.

### A. Active source proof

The actual source under qualification must be accepted only through:

```text
extract source version
-> exact profile lookup
-> validate exact profile
-> R2.10 coherent context
-> projected active contracts
-> topology / builder closure
```

The actual current source must **not** require membership in a separately hand-maintained historical identity table.

### B. Historical projection coverage

Historical/synthetic projection coverage may iterate over validated inventory entries rather than over a manual identity table.

If an old release requires special archaeological handling because the current source cannot be mechanically projected to it, that exception must be explicit and local to historical coverage, not a prerequisite for active-source support.

---

## 7. Profile-derived identity projection

The current regression helper needs release name when projecting source identity between known releases.

R2.11 should derive:

```text
source releaseVersion + releaseName
and
target releaseVersion + releaseName
```

from validated exact profiles, not from `KNOWN_RELEASE_IDENTITIES`.

Projection remains narrowly allowlisted to existing identity fields only:

```text
//@version
SIMCORE_RUNTIME_VERSION
HOST_COMPAT_VERSION
operator release-card version/name identity
```

Broad source rewriting remains forbidden.

Every replacement cardinality must remain exact and fail closed.

---

## 8. Builder and fixture automation

R2.9 already has structural builder/fixture discovery.

R2.11 must reuse it rather than add a second builder census.

Required invariant:

```text
for every active/current release profile that declares a runtime version needing a builder authority,
builder closure must be proven by validation-builder-discovery,
not by another manually appended `registry.some(builder-vNNNNN)` assertion.
```

Historical explicit builder registry rows may remain for compatibility while they still exist, but the regression should compare structural discovery against registry/topology rules generically.

No new builder registry automation authority is added by R2.11.

---

## 9. No-wrapper proof simplification

R2.9's simplification promise remains important:

```text
unchanged stable contracts
-> no new -vNNNNN wrapper fanout
```

R2.11 should prove this generically.

Preferred rule:

```text
for each validated profile in the R2.9+ projected-normal-path era
for each stable projected contract
-> exact-version wrapper for that release version must be absent unless an explicit changed-contract/historical exception authority exists
```

Do not append four hard-coded assertions every time a new version appears.

If generic proof cannot safely distinguish pre-R2.9 historical wrappers from post-R2.9 profiles, define one bounded migration floor/exception set once rather than one growing current-version list.

---

## 10. Required fail-closed reason family

Implementation should expose deterministic inventory failures such as:

```text
VALIDATION_INVENTORY_FILENAME_INVALID
VALIDATION_INVENTORY_PROFILE_PARSE_FAIL
VALIDATION_INVENTORY_PROFILE_INVALID
VALIDATION_INVENTORY_VERSION_MISMATCH
VALIDATION_INVENTORY_DUPLICATE_VERSION
VALIDATION_INVENTORY_RELEASE_NAME_INVALID
VALIDATION_INVENTORY_EMPTY
```

Existing active context failures remain authoritative for the actual source:

```text
VALIDATION_CONTEXT_SOURCE_VERSION_INVALID
VALIDATION_CONTEXT_PROFILE_MISSING
VALIDATION_CONTEXT_PROFILE_INVALID
VALIDATION_CONTEXT_PROFILE_VERSION_MISMATCH
VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED
VALIDATION_CONTEXT_FIXTURE_MISSING
VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH
VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION
VALIDATION_CONTEXT_PROVENANCE_AMBIGUOUS
```

Do not alias missing profile into “unknown but acceptable”.

---

## 11. Permanent regression migration target

Primary target:

```text
products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs
```

R2.11 implementation should narrow this suite from a growing version census into generic invariant proof.

Before:

```text
manual known identity map
manual selected profile blocks
manual selected builder assertions
manual selected no-wrapper assertions
active source must belong to manual map
```

After:

```text
validated profile inventory
active source exact-profile proof independent of history census
inventory-driven selected/all profile validation
structural builder closure proof
inventory-driven no-wrapper proof
bounded historical exceptions only where truly necessary
```

The stable active route remains:

```text
products/simcore/tests/suites/release-validation-active-r2-9.mjs
```

R2.10 context owner remains:

```text
products/simcore/tooling/validation-context-r2-10.mjs
```

No R2.9/R2.10 semantic rename is required.

---

## 12. Static / CI acceptance criteria

A future implementation must prove at least:

### Positive

```text
all existing exact profile files -> inventory PASS
current v0.70.6 source -> exact 0.70.6 profile -> active contracts PASS
known historical projected profiles -> PASS where mechanically supported
builder/fixture discovery -> PASS
validation topology -> PASS
R2.10 coherent provenance -> PASS
latest.js == install.js remains enforced by existing verifier
```

Synthetic future-current control:

```text
add synthetic exact profile + matching source identity + required builder/fixture test surface in isolated fixture
-> active source can qualify without editing a KNOWN_RELEASE_IDENTITIES-style census
```

The synthetic test must not create repository mutation or production authority.

### Negative

```text
source version has no exact profile -> BLOCK
profile filename/version mismatch -> BLOCK
duplicate profile releaseVersion -> BLOCK
invalid releaseName / malformed profile -> BLOCK
unknown contract mode -> BLOCK
builder/fixture gap -> BLOCK
R2.10 context contradiction -> BLOCK
projection attempts broad/non-allowlisted rewrite -> FAIL
active qualification reintroduces manual version-membership gate -> FAIL
new publisher/main writer/approval step/background retry primitive -> FAIL
```

---

## 13. Simplicity budget

R2.11 is justified only if it deletes recurring maintenance rather than relocating it.

Target budget:

```text
new publisher                                  0
new main writer                                0
new lifecycle state                            0
new approval step                              0
new background workflow                        0
new automatic retry                            0
new runtime/plugin behavior                    0
new release-simcore mutation                   0
new validation profile schema mode             0 preferred
new coherent context owner                     0
new active route                               0
new per-release identity census row            0
new per-release profile assertion block        0
new per-release builder assertion row          0
new per-release no-wrapper assertion fanout    0
new pure inventory owner                      +1 maximum
```

If implementation needs multiple inventories, generated committed manifests, or a second profile authority, reject the design and simplify further.

---

## 14. Frozen authority boundaries

R2.11 must not modify:

```text
R2.8 HUMAN_EVIDENCE authority
terminal convergence semantics
R2.9 validation profile schema unless a separate explicit need is proven
R2.9 contract modes
R2.9 projected stable contract semantics
R2.10 coherent context semantics
Candidate Required
Exact Approval Activation
Permanent Release
RS2_4_PERMANENT publisher
repo-main-write.py authority
release records / lifecycle state model
production publication retry behavior
latest.js / install.js contract
```

No automatic LIVE_PASS, checkpoint selection, priority selection, release approval, merge, publication retry, or background polling may be introduced.

---

## 15. Relationship to v0.70.6 live validation

Current production remains:

```text
version = 0.70.6
release = Manual Edit Redundant Prune Elision
live state = LIVE_PENDING / PENDING_REAL_LONG_CHAT
```

R2.11 design may be frozen now because its evidence is already durable and non-runtime.

Implementation must not begin while v0.70.6 is still in active HUMAN real-long-chat validation.

Strict sequencing:

```text
freeze R2.11 design
-> complete v0.70.6 HUMAN real-long-chat evidence
-> close v0.70.6 through ordinary R2.8 terminal convergence
-> fresh main / release-simcore / validation-source preflight
-> separate explicit R2.11 implementation authorization
-> implementation branch
-> static / permanent CI qualification
-> no release-simcore deployment because non-runtime
-> direct production readback unchanged
-> main documentation / long-memory synchronization
```

This keeps the runtime live gate and release-system refactor isolated.

---

## 16. Implementation shape preference

Preferred smallest implementation:

```text
1. add one profile-inventory helper
2. change R2.9 permanent regression to consume that helper
3. remove active-source manual membership guard
4. replace repeated profile blocks with inventory iteration / generic assertions
5. replace repeated builder lines with structural discovery assertions
6. replace repeated no-wrapper lines with generic projected-era proof
7. retain narrowly explicit historical exceptions only when needed
8. add one R2.11 permanent regression / fixture if needed to prove inventory failure modes
```

Do not edit plugin runtime, release workflows, approval schemas, or terminal machinery in this transaction.

---

## 17. Operational success criterion

The strongest proof should come naturally from the next genuine runtime release after R2.11 implementation.

Desired observation:

```text
new runtime version N
+ exact N validation profile
+ builder / fixture closure
-> implementation PR CI PASS
-> candidate qualification PASS
-> no edit to an R2.9 active-version identity census
-> exact approval / Permanent Release unchanged
```

A fake runtime release must not be created solely to prove R2.11.

If the next genuine release fails for a legitimate missing-profile or invalid-profile reason, fail-closed behavior is still correct.

---

## 18. Non-goals

R2.11 does not authorize:

```text
plugin/runtime optimization
v0.70.7 design or release
cache-attribution work
R2.8 cleanup / predecessor fallback retirement
R2.9 contract redesign
R2.10 context redesign
validation profile auto-generation
manifest generation committed to main
release workflow refactor
publisher refactor
approval simplification
CURRENT_DEVELOPMENT architecture cleanup
Node migration
historical test deletion
```

Those remain separate topics and require separate evidence/design transactions.

---

## 19. Final disposition

```text
R2.11 NAME = PROFILE-DRIVEN VALIDATION INVENTORY
R2.11 DESIGN = FROZEN
R2.11 IMPLEMENTATION = BLOCKED ON v0.70.6 HUMAN LIVE CLOSE + FRESH PREFLIGHT + SEPARATE AUTHORIZATION

STABILITY = EXACT PROFILE REMAINS FAIL-CLOSED IDENTITY AUTHORITY
SIMPLICITY = REMOVE DUPLICATE CURRENT-VERSION CENSUS / ASSERTION FANOUT
AUTOMATION = DERIVE VALIDATION INVENTORY FROM EXISTING EXACT PROFILES AND STRUCTURAL DISCOVERY

R2.9 CORE = KEEP / FROZEN
R2.10 CORE = KEEP / FROZEN
AUTHORITY EXPANSION = NONE
RUNTIME MUTATION = NONE
RELEASE-SIMCORE MUTATION = NONE
```
