# SimCore Release System R2.9 Implementation Evidence

Date: 2026-08-30 KST

Status: **IMPLEMENTED SHADOW-READY · CI QUALIFICATION PENDING · ACTIVATION DEFERRED**

Classification: **RELEASE-SYSTEM IMPLEMENTATION · NON-RUNTIME · STABILITY/SIMPLICITY/AUTOMATION**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_VALIDATION_CONTRACT_PROJECTION_AND_FIXTURE_CLOSURE_DESIGN_2026-08-30.md`

Implementation authorization:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_IMPLEMENTATION_AUTHORIZATION_2026-08-30.md`
- authorization merge: `07d2ae46942c97fcef6d4f250454e5651b06ac15`

Implementation branch:
- `impl/simcore-r2-9-validation-contract-projection`

## Implemented surface

### 1. Declarative validation profile authority

Added:
- `products/simcore/tooling/validation-contract-profile.mjs`
- `products/simcore/releases/validation-profiles/0.70.0.json`

The profile parser requires exact semantic versions and explicit per-contract modes. It rejects missing contracts, self-inheritance, exact-current identity contradictions, duplicate/current reject versions, and non-version authority aliases such as `latest`.

Current v0.70 profile explicitly declares:

```text
reload-cache-continuity      = INHERIT_BEHAVIOR / authority 0.69.2
operator-release-card        = CURRENT_IDENTITY_INHERIT_BEHAVIOR / authority 0.69.2
host-local-telemetry         = EXACT_CURRENT_IDENTITY / authority 0.70.0 / reject 0.69.2
bounded-telemetry-capsule    = INHERIT_BEHAVIOR / authority 0.69.2
```

No nearest/latest authority inference exists.

### 2. Stable parameterized contract projection

Added:
- `products/simcore/tests/suites/release-validation-contracts-r2-9.mjs`

This is one stable projected-contract runner rather than another v0.70-specific wrapper fanout.

Behavioral inheritance is explicitly bound to frozen v0.69.2 authorities. Operator identity is checked at the current release, then normalized only to the explicitly named authority identity for inherited behavior. Host-local telemetry remains exact-current and directly proves metadata/runtime/HOST compatibility equality plus current capsule acceptance and explicit predecessor rejection.

### 3. Builder + fixture all-or-none closure

Added:
- `products/simcore/tooling/validation-builder-discovery.mjs`

It deterministically discovers `builder-vNNNNN.test.mjs` and matching `builder-vNNNNN` fixture directories, projects canonical builder rows, and returns `BLOCK_FIXTURE_GAP` when either half is missing.

This directly addresses the v0.70 `builder-v07000` registry-without-fixture failure family.

### 4. Pure validation topology preflight

Added:
- `products/simcore/tooling/validation-topology-preflight.mjs`

The preflight validates:
- complete release profile;
- explicit inherited authority availability;
- exact-current runner availability;
- builder/fixture closure;
- registry module/fixture referential closure.

It is pure/read-only and currently shadow-only. It is not yet wired into PR1 or Candidate Required.

### 5. Permanent R2.9 regression

Added:
- `products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs`
- `products/simcore/tests/fixtures/release-system-r2-9-validation-contract-projection/contract.json`

Registered exactly one new permanent/golden suite:
- `release-system-r2-9-validation-contract-projection`

Regression proves:
- seed v0.70 profile validity;
- all four current projected contracts pass;
- current active v0.70 registry routes remain unchanged;
- explicit `builder-v07000` row remains unchanged before activation;
- real builder/fixture inventory closes;
- current topology preflight passes;
- a synthetic v0.70.1 source/profile validates all four contracts without any `-v07001` wrapper files;
- missing required contract fails closed;
- implicit authority alias fails closed;
- exact-current identity contradiction fails closed;
- builder-only or fixture-only registration fails closed;
- unresolved inherited authority fails closed;
- runtime and `release-simcore` mutation remain NONE.

## Activation boundary proof

The following active routes are intentionally unchanged:

```text
reload-cache-continuity
  -> ./suites/reload-cache-continuity-v07000.test.mjs
operator-release-card
  -> ./suites/operator-release-card-v07000.test.mjs
host-local-telemetry
  -> ./suites/host-local-telemetry-v07000.test.mjs
bounded-telemetry-capsule
  -> ./suites/bounded-telemetry-capsule-v07000.test.mjs
```

Existing explicit builder rows through `builder-v07000` are also retained.

Therefore this implementation does not activate R2.9 normal-path validation projection.

## Frozen authority proof

```text
R2.8 HUMAN_EVIDENCE authority = unchanged
RS2_4_PERMANENT publisher     = unchanged
repo-main-write.py main writer = unchanged
Candidate Required            = unchanged
Permanent Release             = unchanged
Exact Approval Activation     = unchanged
plugin runtime                = unchanged
release-simcore               = unchanged
```

## Deployment disposition

This implementation is non-runtime.

```text
release-simcore deployment = N/A_VERIFIED_NO_RUNTIME_MUTATION
latest.js/install.js       = not modified by this transaction
production v0.70.0         = unchanged
```

## Qualification gate

Pending permanent SimCore CI on the implementation PR.

Required before implementation closure:

```text
SimCore CI Verify   = SUCCESS
SimCore CI Required = SUCCESS
```

If qualification exposes a defect, preserve it as WATCH / DEFER / FIX / BLOCKER and repair the shadow implementation without weakening the frozen activation boundary.

## Current disposition

```text
R2.9 IMPLEMENTATION = SHADOW_READY
R2.9 ACTIVATION      = DEFERRED
R2.8                 = FROZEN
RUNTIME              = UNCHANGED
PRODUCTION            = UNCHANGED
```
