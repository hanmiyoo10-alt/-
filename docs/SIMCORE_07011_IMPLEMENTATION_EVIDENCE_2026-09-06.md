# SimCore v0.70.11 Implementation Evidence — 2026-09-06

Date: 2026-09-06 KST
Status: **IMPLEMENTATION QUALIFIED · PUBLICATION NOT YET PERFORMED**
Tracking: `#1657`

## 1. Release identity

```text
Version = 0.70.11
Release = Operator Release Card Metadata Repair
Live scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
Validation = PENDING_REAL_LONG_CHAT
Target = #1657 only
```

Canonical design:

`docs/SIMCORE_07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_DESIGN_2026-09-06.md`

Authorization:

`docs/SIMCORE_07011_IMPLEMENTATION_AUTHORIZATION_2026-09-06.md`

## 2. Required prerequisite and incident recovery

Implementation inspection exposed the R2.9 operator-card changed-contract projection gap. It was handled as a separate non-runtime prerequisite and did not expand the v0.70.11 feature transaction.

```text
prerequisite issue = #1683
prerequisite PR = #1686
qualified head = 76c634c71acc034ed1a920868e516626462130be
prerequisite SimCore CI = 34015738854
Verify = SUCCESS
Required = SUCCESS
main merge = e9dba8381c60d3088ba5f6c52ae56bf7004d5c6e
runtime mutation = 0
release-simcore mutation = 0
```

The prerequisite preserves existing `CURRENT_IDENTITY_INHERIT_BEHAVIOR` and activates the already-designed `CHANGED_CONTRACT` exact-current envelope for operator-card releases that intentionally replace the card body.

A separate PR identity concurrency incident was also preserved and recovered before this implementation resumed:

```text
incident = #1689
classification = FIXED · PR_IDENTITY_CONCURRENCY_COLLISION · NON_RUNTIME
evidence PR = #1692
evidence merge = a0cdcceb9d130f96ecf4fb74613614c10b8637bf
production impact = NONE OBSERVED
```

The required procedural guard is now fresh branch -> PR -> exact head resolution immediately before every merge, followed by merged-PR and main readback.

## 3. Implementation transaction

Fresh implementation branch:

`impl/simcore-v07011-operator-release-card-repair-v2`

Implementation PR:

```text
PR = #1698
qualified head = dcb33fd0bf2b8da3029a0a98fcc38a16244a5b0a
merge = 4cb70594b5fc354f536236148c0a8b9334151c9f
changed files = 5
```

Exact implementation file set:

```text
products/simcore/tooling/build-07011-operator-release-card-metadata-repair.py
products/simcore/releases/validation-profiles/0.70.11.json
products/simcore/tests/fixtures/builder-v07011/basic.json
products/simcore/tests/suites/builder-v07011.test.mjs
products/simcore/tests/registry.mjs
```

No `plugins/simcore/latest.js` or `plugins/simcore/install.js` mutation occurred on `main`; candidate materialization remains the publication boundary.

## 4. Builder contract

The dedicated builder consumes exact v0.70.10 predecessor bytes and fails closed unless:

```text
predecessor latest == install
metadata version = 0.70.10
SIMCORE_RUNTIME_VERSION = 0.70.10
HOST_COMPAT_VERSION = 0.70.10
operator card identity = v0.70.10 / Host-Local Telemetry Set Cost Attribution
predecessor card demonstrates the stale historical 06900 body
```

The builder then performs only the authorized release-source mutations:

```text
metadata identity 0.70.10 -> 0.70.11
runtime identity 0.70.10 -> 0.70.11
Host compatibility identity 0.70.10 -> 0.70.11
v0.70.11 release-note header insertion
complete OPERATOR_RELEASE_CARD unit replacement
```

The new card binds together:

```text
version = 0.70.11
name = Operator Release Card Metadata Repair
scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
summary[] = release-local metadata repair only
checks[] = release-local operator-card + ordinary long-chat validation only
```

The current card rejects the historical current-guidance tokens:

```text
06900_M2_6_STATE_RECONCILE_KERNEL_INVERSION_REAL_LONG_CHAT
Version 0.69.0
State Reconcile
Kernel Inversion
```

It also does not claim issue-specific ownership of #1660.

## 5. Frozen runtime invariants

Builder and permanent regression both preserve:

```text
module inventory and order
module require graph
request/output hook semantics
Session / Mirror / Representation / Edit Reconcile semantics
Host-local telemetry attribution behavior
persistent state schema constants
mailbox/key/TTL/cap surfaces
storage/network/timer/retry/polling behavior
chat/history mutation surfaces
OUTPUT_COMMIT checkpoint ownership
```

Protected marker counts are checked before and after the builder. The card body itself is also checked for absence of network/timer/storage side-effect surfaces.

## 6. Validation profile

v0.70.11 uses the qualified R2.9 projection model:

```text
reload-cache-continuity = INHERIT_BEHAVIOR @ 0.69.2
operator-release-card = CHANGED_CONTRACT @ 0.70.11
host-local-telemetry = EXACT_CURRENT_IDENTITY @ 0.70.11; reject 0.70.10
bounded-telemetry-capsule = INHERIT_BEHAVIOR @ 0.69.2
```

This is intentional. The operator card body changes in v0.70.11, so `CURRENT_IDENTITY_INHERIT_BEHAVIOR` would be semantically false. `CHANGED_CONTRACT` checks exact current identity plus stable operator UI/purity invariants while the v0.70.11 builder regression owns the release-specific body semantics.

## 7. Permanent regression coverage

`builder-v07011` is a golden executable suite.

For production v0.70.10 input it:

1. proves stale 06900 card evidence is present in the predecessor;
2. runs the real v0.70.11 builder in a temporary plugin tree;
3. requires `07011_BUILD_PASS`;
4. requires output latest/install byte identity;
5. checks metadata/runtime/Host identity convergence;
6. checks the complete release-local card family;
7. checks the live-gate scenario contract and pending validation state;
8. rejects all frozen historical current-card guidance;
9. preserves module/require topology and protected side-effect counts.

For a v0.70.11 candidate source it directly re-validates the resulting candidate card and profile contract.

Release-spec parity is additionally enforced in the subsequent candidate/spec/approval transaction by using the same exact scenario as the release request `liveGate.scenarioId`.

## 8. Hosted qualification

Implementation PR #1698 head:

`dcb33fd0bf2b8da3029a0a98fcc38a16244a5b0a`

SimCore CI:

```text
run = 34017147113
Verify = SUCCESS
Current trusted lane = SUCCESS
Proposed permanent verifier = SUCCESS
Bounded conclusion = SUCCESS
Enforce verifier conclusion = SUCCESS
Required = SUCCESS
```

Plugin Control Plane PR observe:

```text
SUCCESS
```

No new FIX or BLOCKER was emitted by implementation qualification.

## 9. Production non-mutation proof

Immediately after implementation merge, production authority remained:

```text
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
production version = 0.70.10
production release = Host-Local Telemetry Set Cost Attribution
v0.70.11 publication = NOT YET PERFORMED
```

Therefore implementation qualification itself did not bypass candidate/exact-approval release authority.

## 10. Explicit exclusions preserved

Still outside v0.70.11:

```text
#1660 visible standalone internal: alias repair
#1588 Host-local latency optimization
provider-cache work
runtime architecture refactor
release-system refactor
storage/network/timer/persistent-schema changes
```

## 11. Qualification verdict

```text
V07011_DESIGN = KEEP
V07011_AUTHORIZATION = GRANTED
V07011_PREREQUISITE = CLOSED / PASS
V07011_IMPLEMENTATION = QUALIFIED
V07011_IMPLEMENTATION_CI = PASS
V07011_PRODUCTION = STILL 0.70.10
V07011_PUBLICATION = NOT YET PERFORMED
#1657 = REMAINS OPEN UNTIL HUMAN LIVE ACCEPTANCE
NEXT = SEPARATE CANDIDATE REQUEST -> IMMUTABLE CANDIDATE -> EXACT APPROVAL -> PERMANENT RELEASE
```
