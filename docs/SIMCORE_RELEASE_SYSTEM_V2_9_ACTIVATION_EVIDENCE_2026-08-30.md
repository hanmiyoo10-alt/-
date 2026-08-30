# SimCore Release System R2.9 Normal-Path Activation Evidence

Date: 2026-08-30 KST

Status: **ACTIVATION IMPLEMENTED · QUALIFIED · NON-RUNTIME**

Authorization authority:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_9_ACTIVATION_AUTHORIZATION_2026-08-30.md`
- authorization merge: `eb9d5f63f873f0bbf11eabe14f5282213074fa48`

## Implemented activation

The R2.9 projected validation system is now wired as the active route for the four version-sensitive stable contracts:

```text
reload-cache-continuity
operator-release-card
host-local-telemetry
bounded-telemetry-capsule
```

All four registry rows point to one stable runner:

```text
products/simcore/tests/suites/release-validation-active-r2-9.mjs
```

The runner:

1. reads the exact userscript metadata version;
2. requires `products/simcore/releases/validation-profiles/<exact-version>.json`;
3. validates all required contract modes explicitly;
4. invokes the already-qualified R2.9 projected contract owner;
5. fails closed when the exact profile is absent or invalid.

No v0.70.1 per-version bridge wrappers were added.

## v0.70.1 profile

Added:

`products/simcore/releases/validation-profiles/0.70.1.json`

Exact identity:

```text
releaseVersion = 0.70.1
releaseName = Cold First-Turn Tail Attribution
```

Contract projection:

```text
reload-cache-continuity   = INHERIT_BEHAVIOR / authority 0.69.2
operator-release-card     = CURRENT_IDENTITY_INHERIT_BEHAVIOR / authority 0.69.2
host-local-telemetry      = EXACT_CURRENT_IDENTITY / authority 0.70.1 / reject 0.70.0
bounded-telemetry-capsule = INHERIT_BEHAVIOR / authority 0.69.2
```

This matches the frozen v0.70.1 design: runtime request timing attribution changes only, while reload transport, operator-card behavior, persistent Host-local schema ownership, and bounded durable telemetry semantics remain frozen except for exact current Host-local version compatibility.

## Permanent regression changes

`release-system-r2-9-validation-contract-projection` now proves:

```text
active 0.70.0 source -> exact 0.70.0 profile -> four active contracts PASS
synthetic 0.70.1 identity -> exact 0.70.1 profile -> four active contracts PASS
v0.70.1 Host-local exact-current compatibility + v0.70.0 rejection PASS
no v07001 wrapper files required
unknown 0.70.2 profile -> fail closed
builder-v07000 and builder-v07001 fixture closure PASS
validation topology preflight PASS
runtime mutation = NONE
release-simcore mutation = NONE
```

Historical v0.70.0 wrapper files remain in repository history/evidence but are no longer the active registry route.

## Qualification

PR: `#951 feat(simcore): activate R2.9 projected validation normal path`

Qualified implementation head:

`3f5ca8ce59f3b2cded7580c801ecb6a48c2ec27b`

SimCore CI:

```text
run      = 33297311586
Verify   = 99219096197 = SUCCESS
Required = 99219147493 = SUCCESS
```

The trusted self-change lane and proposed permanent verifier both passed.

## Relationship to v0.70.1 candidate blocker

PR #949 previously failed closed with:

```text
PR1_DRY_QUALIFICATION_FAIL
SUITE_ASSERTION_FAILED: reload-cache-continuity: reload continuity gate version 0.70.1
```

Classification:

`FIX · RELEASE_VALIDATION_VERSION_BRIDGE_RECURRENCE · NON_RUNTIME · PRODUCTION_UNCHANGED`

R2.9 activation removes the exact-version wrapper dependency that produced this failure class. After this activation merges, PR #949 must be retried unchanged except for any branch synchronization needed to rerun qualification.

## Frozen authorities

Unchanged:

```text
production publisher = RS2_4_PERMANENT
main writer = repo-main-write.py
Candidate Required authority = unchanged
Exact Approval authority = unchanged
Permanent Release authority = unchanged
HUMAN_EVIDENCE authority = unchanged
R2.8 terminal convergence = unchanged
background polling/retry = none
plugin runtime = unchanged
release-simcore = unchanged
```

Production remains:

```text
version = 0.70.0
release-simcore commit = 13179cff70feaf7d12fe53c56e4735155fcf3eaa
latest blob = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
install blob = addf07e273a6fc87f04cdadcb51fa3aa5d6fe298
latest == install = true
```

## Disposition

```text
R2.9 PROJECTED VALIDATION NORMAL PATH = IMPLEMENTED / QUALIFIED
PER-VERSION WRAPPER FANOUT FOR v0.70.1 = ZERO
PRODUCTION MUTATION = NONE
NEXT = FINAL CI WITH EVIDENCE -> MERGE #951 -> RETRY #949
```
