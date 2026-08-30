# SimCore Release System R2.9 Implementation Authorization

Date: 2026-08-30 KST

Status: **IMPLEMENTATION AUTHORIZED · ACTIVATION DEFERRED · NON-RUNTIME**

Design authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_VALIDATION_CONTRACT_PROJECTION_AND_FIXTURE_CLOSURE_DESIGN_2026-08-30.md`

Operator authorization:
- Explicit user instruction on 2026-08-30 KST: `일단 2.9 구현ㄱ`

## Decision

R2.9 implementation is authorized now.

The design-time activation gate is not waived. The implementation may be completed, permanently regression-tested, and merged to `main` in a **shadow-ready** state, while normal release qualification continues to use the currently proven validation route until a separate activation transaction is authorized by the frozen gate.

Canonical disposition:

```text
IMPLEMENTATION = AUTHORIZED
SHADOW IMPLEMENTATION = AUTHORIZED
PERMANENT REGRESSION = AUTHORIZED
NORMAL-PATH ACTIVATION = DEFERRED
R2.8 AUTHORITY MODEL = FROZEN
RUNTIME MUTATION = NONE
release-simcore MUTATION = NONE
```

## Authorized implementation scope

The work branch may add or modify only release-validation/control-plane surfaces needed to realize the frozen R2.9 design:

1. validation-profile schema/parser and explicit contract-mode validation;
2. current v0.70.0 seed validation profile;
3. stable parameterized contract runners or cores for the four current version-sensitive contracts;
4. deterministic builder-suite discovery and builder/fixture closure checks;
5. pure/read-only validation-topology preflight;
6. R2.9 permanent regression coverage, including synthetic next-version proof;
7. shadow/projection helpers required to prove equivalence with the currently active v0.70 wrapper route;
8. implementation evidence and status documentation.

## Activation boundary

Until a separate activation transaction is allowed, implementation MUST NOT:

```text
replace the currently active registry route for
  reload-cache-continuity
  operator-release-card
  host-local-telemetry
  bounded-telemetry-capsule

remove current per-version wrappers
remove current explicit builder rows from the active registry
change Candidate Required semantics
change Permanent Release semantics
change exact approval semantics
change HUMAN_EVIDENCE authority
change R2.8 terminal convergence
change production publisher ownership
change main writer ownership
change plugin runtime code
change release-simcore
```

A new permanent R2.9 regression suite may be added to the active test registry because it validates the shadow implementation itself and does not switch production qualification semantics to R2.9.

## Frozen authorities

R2.9 implementation inherits and must preserve:

- one production publisher: `RS2_4_PERMANENT`;
- one main writer/integration gateway: `repo-main-write.py`;
- HUMAN_EVIDENCE remains required for LIVE_PASS;
- no automatic LIVE_PASS decision;
- no automatic checkpoint or next-priority selection;
- no background polling or retry;
- no automatic publication, approval, or merge;
- candidate C/P/blob binding remains;
- `latest.js == install.js` remains a permanent prerequisite;
- validation inheritance is explicit, never nearest/latest inferred;
- exact-current identity contracts remain exact-current identity contracts.

## Activation gate remains pending

Normal-path R2.9 activation remains deferred until the design gate is satisfied, including the still-pending v0.70 HUMAN_EVIDENCE live close and an ordinary second R2.8 terminal convergence without recovery surgery.

If implementation reveals a contradiction in the design, record it immediately as `WATCH`, `DEFER`, `FIX`, or `BLOCKER` and stop activation rather than weakening the frozen safety model.

## Implementation sequence

```text
A. merge this authorization authority to main
B. create dedicated R2.9 implementation branch
C. implement shadow-ready validation profile + stable contract projection
D. implement builder/fixture closure + topology preflight
E. add permanent regression and synthetic next-version controls
F. prove current active registry routing remains unchanged
G. pass SimCore CI Verify + Required
H. seal implementation evidence on main
I. keep activation deferred pending the frozen operational gate
```

## Release/deployment disposition

This is a release-system validation implementation, not a SimCore plugin runtime release.

Therefore the deployment phase is explicitly:

```text
release-simcore deployment = N/A_VERIFIED_NO_RUNTIME_MUTATION
production plugin identity  = UNCHANGED
```

No runtime deployment is authorized by this record.
