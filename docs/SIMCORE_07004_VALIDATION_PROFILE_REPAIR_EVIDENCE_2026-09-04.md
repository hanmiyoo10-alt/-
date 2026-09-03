# SimCore v0.70.4 Validation Profile Repair Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX PASS · VALIDATION-ONLY · PRODUCTION UNCHANGED**
Classification: **FIX · RELEASE_VALIDATION_PROFILE_GAP_V07004 · NON_RUNTIME**

## Scope

Repair for the fail-closed candidate qualification recorded in `SIMCORE_07004_CANDIDATE_FAILURE_01_VALIDATION_PROFILE_GAP_2026-09-04.md`.

Changed only:

- exact declarative profile `products/simcore/releases/validation-profiles/0.70.4.json`;
- permanent R2.9/R2.10 validation-projection regression coverage;
- failure/evidence documentation.

No SimCore runtime, builder semantics, release-system architecture, or `release-simcore` content changed.

## Exact profile

```text
releaseVersion = 0.70.4
releaseName = Manual Edit Rebuild Attribution
reload-cache-continuity = INHERIT_BEHAVIOR from 0.69.2
operator-release-card = CURRENT_IDENTITY_INHERIT_BEHAVIOR from 0.69.2
host-local-telemetry = EXACT_CURRENT_IDENTITY at 0.70.4
host-local predecessor rejection = 0.70.3
bounded-telemetry-capsule = INHERIT_BEHAVIOR from 0.69.2
```

## Executable regression closure

The permanent validation regression now projects a synthetic v0.70.4 source from the active source and executes all four active R2.9/R2.10 contracts against the exact v0.70.4 profile.

It also proves:

- v0.70.4 release-card identity is exact;
- Host-local telemetry accepts exact 0.70.4 and rejects predecessor 0.70.3;
- `builder-v07004` is registered and auto-discoverable;
- no v0.70.4 version-specific wrapper fanout was introduced;
- unknown unprofiled versions continue to fail closed.

## CI

```text
PR = #1446
head = 62208e596b01cce794e4e6ddb31dd96211d633af
SimCore CI = 33792636242
Verify = 100772655428 · SUCCESS
Required = 100772846559 · SUCCESS
```

## Verdict

```text
VALIDATION_PROFILE_GAP_V07004 = FIXED
RUNTIME IMPLEMENTATION = UNCHANGED / STILL PASS
PRODUCTION = release-simcore 4c618563f43b8a3ff0eeb18eeff5536bb287369b · v0.70.3
NEXT = merge validation repair, then requalify candidate request PR #1445
```
