# SimCore v0.70.6 R2.9 Validation Projection Repair Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **FIX IMPLEMENTED · CLEAN CI PASS · NON_RUNTIME · RELEASE RETRY PENDING**
Classification: **SIMCORE · v0.70.6 · RELEASE QUALIFICATION REPAIR · R2.9 VALIDATION PROJECTION**

## 1. Preserved blocker

Authority:

- `docs/SIMCORE_07006_CANDIDATE_QUALIFICATION_FAILURE_01_R2_9_ACTIVE_VERSION_2026-09-04.md`

The failed `intent-01/new-01` candidate qualification stopped at:

```text
R2.9 active regression source version unsupported: 0.70.6
```

Production remained v0.70.5 and no candidate was published.

## 2. Exact repair surface

Branch:

```text
fix/simcore-v07006-r29-validation-projection
```

Changed file only:

```text
products/simcore/tests/suites/release-system-r2-9-validation-contract-projection.test.mjs
```

No plugin runtime file, builder, release workflow, candidate schema, approval schema, or release authority was changed.

## 3. Repair semantics

The existing R2.9 projection regression now recognizes the already-authoritative v0.70.6 validation identity:

```text
version = 0.70.6
release = Manual Edit Redundant Prune Elision
profile = products/simcore/releases/validation-profiles/0.70.6.json
Host-local exact authority = 0.70.6
reject predecessor = 0.70.5
```

Coverage was extended for:

```text
KNOWN_RELEASE_IDENTITIES 0.70.6
exact v0.70.6 profile validation
builder-v07006 registry discoverability
known v0.70.6 active contract projection
builder-v07006 closure discovery
v0.70.6 no-wrapper fanout assertions
```

Unknown future versions still fail closed through the existing unsupported-source guard.

## 4. Clean verification

Repair head before this evidence append:

```text
6430c5c0e942e8cf7c8645c75532a9c62c7e7abc
```

SimCore CI:

```text
run = 33872781320
Verify = PASS
Required = PASS
proposed permanent verifier = PASS
enforce verifier conclusion = PASS
```

The repair therefore resolves the exact qualification gap without changing runtime or release-system control flow.

## 5. Release recovery disposition

The failed pre-merge `simcore-v0.70.6-intent-01 / simcore-v0.70.6-new-01` transaction remains preserved and must not be rewritten.

After this repair is merged to `main` through a fresh exact-head PASS:

```text
create fresh append-only intent-02/new-02
bind unchanged production v0.70.5 parent
rerun candidate qualification
materialize immutable candidate
exact approval
Permanent Release
production readback
```

The canonical exact approval PR title must be used exactly for the future release id.
