# SimCore Release System R2.9 — Validation Contract Projection & Fixture Closure

Date: 2026-08-30 KST

Status: **DESIGN FROZEN · IMPLEMENTATION NOT AUTHORIZED · ACTIVATION DEFERRED**

Classification: **RELEASE-SYSTEM DESIGN · NON-RUNTIME · STABILITY/SIMPLICITY/AUTOMATION**

Predecessor: `R2.8 — Human-Evidence Terminal Convergence`

Primary evidence:
- `docs/SIMCORE_R2_8_OPERATIONAL_FEEDBACK_2026-08-30.md`
- `docs/SIMCORE_07000_CANDIDATE_PR_FAILURE_01_VALIDATION_VERSION_BRIDGE_2026-08-30.md`
- `products/simcore/tests/registry.mjs`
- `products/simcore/tests/suites/reload-cache-continuity-v07000.test.mjs`
- `products/simcore/tests/suites/operator-release-card-v07000.test.mjs`
- `products/simcore/tests/suites/host-local-telemetry-v07000.test.mjs`
- `products/simcore/tests/suites/bounded-telemetry-capsule-v07000.test.mjs`

Runtime mutation: **NONE**

`release-simcore` mutation: **NONE**

---

## 1. Decision

R2.9 is a bounded release-validation simplification layer around the already proven R2.8 trust model.

R2.9 does **not** replace or redesign R2.8 terminal convergence.

Canonical direction:

```text
KEEP R2.8 AUTHORITY BOUNDARIES FROZEN
MAKE CONTRACT INHERITANCE EXPLICIT
REPLACE VERSION-WRAPPER CHAINS WITH PARAMETERIZED STABLE CONTRACTS
MAKE BUILDER + FIXTURE REGISTRATION ATOMIC
FAIL EARLIER THAN CANDIDATE QUALIFICATION
AUTOMATE MECHANICAL RELEASE-VALIDATION WIRING, NOT RELEASE AUTHORITY
```

Primary target:

```text
new runtime version
-> one bounded validation profile
-> stable contract runners derive exact/current vs inherited semantics
-> builder suite + fixture closure discovered and checked automatically
-> candidate qualification sees a complete validation surface on first attempt
```

Disposition:

```text
R2.9 = RELEASE VALIDATION CONTRACT PROJECTION
PRIMARY GOAL = REMOVE PER-VERSION VALIDATION BRIDGE / FIXTURE WIRING FRAGILITY
R2.8 CORE = KEEP / FROZEN
RUNTIME = UNCHANGED
PRODUCTION AUTHORITY = UNCHANGED
```

---

## 2. Why this version exists

The v0.70.0 candidate path produced two consecutive fail-closed validation-only incidents before publication:

```text
1. exact-version wrapper chain stopped at v0.69.2
2. builder-v07000 registry entry existed without its required fixture directory
```

The safety system behaved correctly because production did not move, but both failures were mechanical release-validation wiring defects rather than product defects.

The current registry also points several stable behavioral contracts directly at version-stamped wrapper files:

```text
reload-cache-continuity      -> ...-v07000.test.mjs
operator-release-card        -> ...-v07000.test.mjs
host-local-telemetry         -> ...-v07000.test.mjs
bounded-telemetry-capsule    -> ...-v07000.test.mjs
```

This means every new runtime version can create a small manual bridge graph even when those semantics did not change.

The resulting recurring risk is:

```text
semantic change in one area
-> metadata version increments globally
-> unrelated exact-version suites reject new identity
-> new wrapper files are added
-> registry is rewired manually
-> required builder suite is added manually
-> required fixture directory is added separately
-> omission is discovered during release qualification
```

R2.9 removes that mechanical fan-out without weakening fail-closed behavior.

---

## 3. Frozen authority boundaries

R2.9 must preserve all proven R2.8/R2.7/R2.6 authorities:

```text
1 production publisher = RS2_4_PERMANENT
1 main writer = repo-main-write.py
Candidate Required remains
exact candidate/production/blob binding remains
exact approval remains
Generic Candidate Materialize remains
Permanent Release remains sole publication authority
HUMAN_EVIDENCE remains required for LIVE_PASS
R2.8 terminal resolver remains human-authority downstream only
no automatic LIVE_PASS decision
no automatic checkpoint selection
no automatic priority selection
no automatic release approval
no automatic PR merge
no automatic publication retry
no background polling
latest.js == install.js remains mandatory
append-only failure/recovery evidence remains
```

R2.9 may automate only deterministic validation wiring and contract projection.

---

## 4. Core model — stable contracts, release profile, deterministic projection

R2.9 introduces one conceptual split:

```text
stable behavioral contract
        +
current release validation profile
        =
exact executable validation for the current release
```

A behavioral suite should no longer need a new wrapper merely because the userscript version changed.

The release profile declares only the facts necessary to distinguish:

```text
A. contracts whose semantics are inherited unchanged
B. contracts whose identity changes but behavior is inherited
C. contracts that require exact current-version executable validation
D. contracts that genuinely changed and therefore require a new authority/core
```

The machine must not infer category D from absence of failures. A changed contract must be explicitly declared.

---

## 5. One bounded release validation profile

Preferred owner:

```text
products/simcore/tests/release-validation-profiles.mjs
```

A release entry should be compact and declarative. Illustrative shape only:

```js
{
  version: '0.70.0',
  predecessor: '0.69.2',
  releaseName: 'Current Task Primacy Guard',
  contracts: {
    reloadCacheContinuity: 'INHERIT_BEHAVIOR',
    operatorReleaseCard: 'CURRENT_IDENTITY_INHERIT_BEHAVIOR',
    hostLocalTelemetry: 'EXACT_CURRENT_IDENTITY',
    boundedTelemetryCapsule: 'INHERIT_BEHAVIOR'
  }
}
```

Exact schema is implementation-time work.

Required properties:

```text
one entry per supported current release identity
explicit predecessor identity
explicit release name when operator-facing identity must be checked
explicit contract mode per version-sensitive stable contract
no default "assume inherited" for an unknown contract
unknown mode -> fail closed
unknown current version -> fail closed
```

This replaces four or more scattered version wrapper decisions with one reviewable release-level declaration.

---

## 6. Stable parameterized contract cores

R2.9 should extract stable executable cores for the recurring version-sensitive suites rather than chain wrappers forever.

Preferred conceptual owners:

```text
reload-cache-continuity.contract.mjs
operator-release-card.contract.mjs
host-local-telemetry.contract.mjs
bounded-telemetry-capsule.contract.mjs
```

The exact file layout may differ, but the rule is stable:

```text
historical version wrappers remain historical evidence
new releases do not append another wrapper unless semantics genuinely changed
current stable runner consumes release validation profile + source
```

### 6.1 INHERIT_BEHAVIOR

For contracts such as reload continuity or bounded telemetry whose semantics did not change, the runner may deterministically project only identity fields required by the frozen authority and run the stable behavioral core.

Projection must be allowlisted. Broad text rewriting is forbidden.

### 6.2 CURRENT_IDENTITY_INHERIT_BEHAVIOR

For operator release card behavior:

```text
assert current version/name exactly
assert collapsed/no-side-effect contract on current source
then execute the stable behavioral core with explicit expected identity parameters
```

The design preference is parameterization over rewriting the current card back into a historical release card.

### 6.3 EXACT_CURRENT_IDENTITY

For Host-local telemetry, sourceVersion compatibility is executable semantics, not decorative metadata.

The stable core must accept parameters such as:

```text
currentVersion
previousVersion
expected owner markers
```

and verify:

```text
metadata == runtime == HOST_COMPAT_VERSION == currentVersion
current capsule accepted
predecessor capsule rejected
frozen ownership architecture preserved
```

No metadata-normalization shortcut is permitted for this contract.

### 6.4 CHANGED_CONTRACT

If a future release changes one of these behaviors, the release profile must name a new exact authority/core rather than silently inheriting.

---

## 7. Builder discovery and fixture closure

The second v0.70 failure class came from registering `builder-v07000` without `fixtures/builder-v07000/`.

R2.9 should make this pair mechanically inseparable.

Preferred behavior:

```text
scan products/simcore/tests/suites/builder-v*.test.mjs
-> derive builder suite id
-> require exact matching fixtures/<id>/
-> require at least one valid fixture authority file
-> include discovered builder in required/golden pack
```

This means a new builder does not require a separate hand-maintained registry row.

Conversely:

```text
orphan builder fixture dir without matching builder suite -> FAIL
builder suite without fixture dir -> FAIL
manual duplicate registry entry for auto-discovered builder -> FAIL
ambiguous builder id/version -> FAIL
```

The failure should occur during ordinary PR CI registry/preflight loading, before PR1 dry candidate qualification.

---

## 8. Registry simplification

The current registry mixes stable named contracts and historical release-specific builder entries.

R2.9 target:

```text
static registry = stable suite identities only
auto discovery = builder-v* suites + fixture closure
release validation profile = current version projection policy
```

Expected reduction:

```text
manual per-release registry rewiring for inherited contracts -> 0
manual per-release builder registry row                   -> 0
new exact-version wrapper files for unchanged contracts   -> 0
separate forgotten builder fixture registration           -> fail at local/PR preflight
```

Historical suites remain present and runnable where needed for regression archaeology, but they stop being the normal current-version routing mechanism.

---

## 9. Fail-closed preflight

R2.9 must add a pure validation-topology preflight before expensive candidate qualification.

It should answer only deterministic topology questions:

```text
current source version known?
release profile exists exactly once?
all declared contract modes known?
all stable contract owners resolvable?
all auto-discovered builders have fixtures?
all builder fixtures have builders?
no duplicate active ownership?
no current registry route points to a stale exact-version wrapper when stable projection owns the contract?
```

Suggested dispositions:

```text
VALIDATION_TOPOLOGY_READY
BLOCKED_UNKNOWN_RELEASE_PROFILE
BLOCKED_UNKNOWN_CONTRACT_MODE
BLOCKED_CONTRACT_OWNER_MISSING
BLOCKED_BUILDER_FIXTURE_MISSING
BLOCKED_ORPHAN_BUILDER_FIXTURE
BLOCKED_DUPLICATE_OWNER
BLOCKED_STALE_VERSION_ROUTE
```

This preflight must not publish, push, merge, retry, or mutate repository state.

---

## 10. Simplicity budget

R2.9 is justified only if it reduces recurring maintenance surface.

Target budget:

```text
new publishers                          0
new main writers                        0
new product lifecycle states            0
new background workflows                0
new release approval steps               0
new HUMAN_EVIDENCE automation            0
new per-release validation wrapper fanout -> 0 for unchanged contracts
new per-release builder registry rows    -> 0
new manual fixture-registration seam     -> 0
one release validation profile owner     +1 bounded declarative owner
one stable projection/helper layer       +1 bounded pure owner preferred
existing CI / candidate / release flows  reused
```

If implementation requires more moving parts than the wrapper/fixture ceremony it removes, the design should be reconsidered.

---

## 11. Regression requirements

### Positive

```text
known current version + complete profile + matching builder fixture
-> VALIDATION_TOPOLOGY_READY

unchanged reload contract on new version
-> stable inherited behavior PASS without new version wrapper

operator card with exact current version/name + frozen behavior
-> PASS

Host-local current capsule accepted and predecessor rejected
-> PASS

new builder suite + matching fixture dir
-> auto-discovered required/golden PASS

historical wrappers remain available as historical evidence
-> PASS
```

### Negative / fail closed

```text
new runtime version with no release validation profile
-> BLOCK

profile omits one version-sensitive stable contract
-> BLOCK

unknown contract mode
-> BLOCK

builder suite without fixture dir
-> BLOCK before candidate qualification

fixture dir without builder suite
-> BLOCK

registry still routes stable current contract through stale vNNNNN wrapper
-> BLOCK after migration activation

Host-local profile incorrectly marked metadata-only inheritance
-> BLOCK

projection attempts broad source rewrite outside allowlisted identity fields
-> FAIL CI

validation helper contains publish/push/merge/retry primitives
-> FAIL CI

latest.js != install.js
-> FAIL/BLOCK unchanged
```

---

## 12. Migration strategy

R2.9 must not rewrite historical validation evidence.

Historical files such as:

```text
reload-cache-continuity-v07000.test.mjs
operator-release-card-v07000.test.mjs
host-local-telemetry-v07000.test.mjs
bounded-telemetry-capsule-v07000.test.mjs
```

remain in repository history and may remain executable during migration.

Preferred staged migration if implementation is separately authorized:

```text
A. add release validation profile schema + topology preflight
B. add stable parameterized cores beside existing wrappers
C. prove current v0.70 source through both old wrappers and new projection path
D. auto-discover builder suites and enforce fixture closure
E. move registry current routes to stable projection owners
F. prove old/current result equivalence
G. retire only normal-path dependence on exact-version wrappers
H. keep historical wrappers as evidence unless separate cleanup is justified
```

Do not delete historical wrappers in the same step that first proves their replacement.

---

## 13. Relationship to R2.8

R2.8 remains frozen.

R2.8 question:

```text
Who may authorize LIVE_PASS, and how does that human authority become durable terminal state?
```

R2.9 question:

```text
How does a new release acquire a complete, exact, non-fragile validation topology before candidate qualification?
```

They are intentionally separate systems.

R2.9 must not touch:

```text
release-terminal-transition.mjs semantics
HUMAN_EVIDENCE schema/authority
terminal convergence trigger semantics
checkpoint/priority authority
production publication authority
```

---

## 14. Activation gate

This document authorizes design only.

Implementation remains deferred until both are true:

```text
1. v0.70 real long-chat validation receives explicit HUMAN_EVIDENCE LIVE_PASS
2. the existing R2.8 terminal convergence closes that release ordinarily without recovery surgery
```

Reason:

The current feedback recommends one more ordinary R2.8 terminal close before removing predecessor safety surfaces or declaring a broader release-system generation complete.

R2.9 may be designed now because its target defect is already recurrent and independently evidenced, but implementation should begin only after the second ordinary R2.8 proof confirms that terminal convergence remains stable while the validation layer changes separately.

An urgent new validation BLOCKER may justify revisiting this gate through a separate explicit authorization record.

---

## 15. Non-goals

R2.9 does not authorize:

```text
runtime/plugin feature changes
release-simcore mutation
R2.8 semantic changes
automatic HUMAN_EVIDENCE creation
automatic LIVE_PASS judgment
automatic checkpoint/priority selection
new publisher
new main writer
release approval automation beyond existing exact approval
automatic merge
automatic retry
background polling
predecessor terminal fallback retirement
Node20 migration
CURRENT_DEVELOPMENT archival redesign
full historical test-file deletion
```

---

## 16. Expected clean-path change

Current new-version validation wiring:

```text
new builder
+ builder registry row
+ builder fixture directory
+ inspect exact-version-sensitive suites
+ add N version wrappers
+ rewire N registry routes
+ candidate qualification discovers any omission
```

R2.9 target:

```text
new builder + matching fixture
+ one bounded release validation profile
+ stable contract projection
+ topology preflight
+ candidate qualification
```

For a release whose behavior changes only in one unrelated runtime domain, the validation infrastructure should not require four new bridge files merely because the global version string advanced.

---

## 17. Final disposition

```text
R2.9 NAME = VALIDATION CONTRACT PROJECTION & FIXTURE CLOSURE
DESIGN = FROZEN
IMPLEMENTATION = NOT AUTHORIZED
ACTIVATION = DEFERRED UNTIL SECOND ORDINARY R2.8 TERMINAL CLOSE
R2.8 CORE = KEEP / FROZEN
STABILITY = FAIL EARLIER + EXPLICIT CONTRACT MODES
SIMPLICITY = REMOVE VERSION-WRAPPER / REGISTRY FANOUT
AUTOMATION = AUTO-DISCOVER BUILDERS + ENFORCE FIXTURE CLOSURE
RUNTIME MUTATION = NONE
RELEASE-SIMCORE MUTATION = NONE
```
