# SimCore R2.9 Active Source-Version Binding Repair Evidence

Date: 2026-08-30 KST

Status: **REPAIR IMPLEMENTED · QUALIFIED · NON-RUNTIME**

Failure authority:
- `docs/SIMCORE_R2_9_ACTIVATION_CANDIDATE_FAILURE_01_ACTIVE_SOURCE_VERSION_ASSUMPTION_2026-08-30.md`
- failure evidence merge: `8f86afc3ed43d74c3f0f4798e340da47d5e4d38d`

Repair PR:
- `#954 fix(simcore): bind R2.9 regression to active source version`

## Repair

Changed only:

`products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs`

The permanent R2.9 regression no longer equates "current source" with deployed production v0.70.0.

It now enforces:

```text
source metadata version
== exact version loaded by loadActiveValidationProfile(source)
```

The same regression separately proves both known release identities through allowlisted identity-only projection:

```text
0.70.0 = Current Task Primacy Guard
0.70.1 = Cold First-Turn Tail Attribution
```

The projection is limited to exactly one occurrence each of:

```text
userscript metadata version
SIMCORE_RUNTIME_VERSION
HOST_COMPAT_VERSION
operator release-card version/name identity
```

No broad source rewrite is permitted by the helper.

## Preserved fail-closed behavior

The repaired regression still proves:

```text
unknown exact profile 0.70.2 -> VALIDATION_ACTIVE_PROFILE_MISSING
missing contract -> fail closed
implicit latest authority -> fail closed
Host-local exact-current contradiction -> fail closed
builder/fixture half-registration -> fail closed
missing explicit authority -> fail closed
v0.70.1 wrapper fanout -> zero
```

## Qualification

Qualified repair head:

`4b1e4cb342ae38c00a4531edd449447c5c59d927`

SimCore CI:

```text
run      = 33297690413
Verify   = 99220067764 = SUCCESS
Required = 99220113281 = SUCCESS
```

The trusted self-change lane and proposed permanent verifier both passed.

## Frozen surfaces

```text
plugin runtime mutation      = NONE
builder semantic mutation    = NONE
candidate intent mutation    = NONE
release-simcore mutation     = NONE
R2.8 authority mutation      = NONE
publisher/main-writer change = NONE
new exact-version wrappers   = NONE
```

Production remains v0.70.0 at release-simcore commit `13179cff70feaf7d12fe53c56e4735155fcf3eaa` with identical latest/install blob `addf07e273a6fc87f04cdadcb51fa3aa5d6fe298`.

## Disposition

```text
FIX · R2_9_ACTIVE_REGRESSION_SOURCE_VERSION_ASSUMPTION = REPAIRED / QUALIFIED
NEXT = final evidence-bearing CI -> merge #954 -> clean v0.70.1 candidate rerun
```
