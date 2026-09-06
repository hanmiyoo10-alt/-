# SimCore MCP-04 — Read-Only Release Preflight Design

Date: 2026-09-06
Tracking: #1710
Classification: TOOLING · MCP · READ_ONLY · DESIGN_FIRST

## 1. Purpose

Add a fourth SimCore MCP tool:

```text
simcore_release_preflight(version)
```

MCP-04 answers one narrow question:

> Given an exact target version, are the currently deployed authority, current documentation authority, and the target validation profile mutually coherent enough to proceed to the existing release-system workflow?

It does not authorize, stage, materialize, approve, or deploy a release.

## 2. Authority boundary

MCP-04 is a read-only orchestration layer over existing authorities.

- `product-manifest.json` remains production/current-state authority on `main`.
- `release-simcore` remains deployed plugin-code authority.
- MCP-02 remains the focused production-identity verifier.
- MCP-03 remains the focused current-document drift verifier.
- `products/simcore/tooling/validation-contract-profile.mjs` and the R2.10 validation-context contract define the canonical validation-profile semantics.
- existing SimCore release CI/workflows remain release authority.
- HUMAN_EVIDENCE remains human-live closure authority where required.

A preflight `ready: true` is advisory evidence, not release authorization.

## 3. Input contract

```text
version: string
```

Accepted form:

```text
X.Y.Z
```

where each component is a decimal integer and no prefix such as `v` is accepted.

Examples:

```text
0.70.11   valid
v0.70.11  invalid
0.70       invalid
```

No branch name, candidate SHA, source body, issue number, or workflow identifier is accepted by MCP-04.

## 4. Output contract

Top-level structure:

```text
{
  "ready": bool,
  "repository": str,
  "target": {...},
  "components": {
    "production_identity": {...},
    "docs_drift": {...},
    "validation_profile": {...}
  },
  "checks": [...],
  "violations": [...],
  "errors": [...]
}
```

`ready` is true only when:

1. input is valid;
2. MCP-02 passes;
3. MCP-03 passes;
4. target version strictly advances current production version;
5. exact target validation profile exists and is valid under the bounded Python projection of canonical R2.9/R2.10 validation-profile semantics;
6. there are no read/parse errors.

## 5. Composition contract

MCP-04 must call the existing Python verifier functions rather than reimplement their logic:

```text
verify_production_identity(reader)
check_docs_drift(reader)
```

The component reports are returned intact enough to preserve their existing evidence surface.

MCP-04 may add aggregate checks:

```text
PRODUCTION_IDENTITY_PASS
DOCS_DRIFT_PASS
```

but it must not alter MCP-02 or MCP-03 pass semantics.

## 6. Target-version checks

Required checks, in deterministic order:

```text
TARGET_VERSION_VALID
PRODUCTION_VERSION_AVAILABLE
TARGET_ADVANCES_PRODUCTION
VALIDATION_PROFILE_AVAILABLE
VALIDATION_PROFILE_SCHEMA_SUPPORTED
VALIDATION_PROFILE_VERSION_MATCH
VALIDATION_PROFILE_NAME_VALID
VALIDATION_PROFILE_CONTRACTS_OBJECT
VALIDATION_PROFILE_REQUIRED_CONTRACTS_PRESENT
VALIDATION_PROFILE_CONTRACTS_VALID
PRODUCTION_IDENTITY_PASS
DOCS_DRIFT_PASS
```

Additional per-contract detail lives inside the validation-profile component rather than expanding the top-level check list nondeterministically.

## 7. Semantic-version comparison

MCP-04 supports exact numeric three-component versions only.

Comparison is tuple-based:

```text
major, minor, patch
```

The target must be strictly greater than `product-manifest.json.production_version` as observed through the MCP-02 report.

MCP-04 does not require a one-patch increment. It only rejects equal or older target versions.

## 8. Validation profile path

Exact path:

```text
products/simcore/releases/validation-profiles/<version>.json
```

The path is derived only from a validated target version.

No directory enumeration or fuzzy matching is used.

## 9. Canonical profile semantics projected by MCP-04

The read-only Python projection must mirror the current canonical rules in `products/simcore/tooling/validation-contract-profile.mjs` without claiming to replace that JavaScript authority.

Supported modes:

```text
INHERIT_BEHAVIOR
CURRENT_IDENTITY_INHERIT_BEHAVIOR
EXACT_CURRENT_IDENTITY
CHANGED_CONTRACT
```

Required R2.10 contracts:

```text
reload-cache-continuity
operator-release-card
host-local-telemetry
bounded-telemetry-capsule
```

Profile rules:

- `schemaVersion == 1`;
- `releaseVersion` is exact `X.Y.Z`;
- `releaseVersion == requested target version`;
- `releaseName` is a non-empty string;
- `contracts` is an object;
- every required R2.10 contract exists;
- every contract id is non-empty;
- every contract value is an object;
- every mode is explicitly supported;
- every `authorityVersion` is exact `X.Y.Z`;
- inherited modes must not self-reference the target version;
- exact-current modes must use the target version as authority;
- `CURRENT_IDENTITY_INHERIT_BEHAVIOR` requires non-empty `authorityIdentity.releaseName`;
- optional `rejectVersions` must be an array of exact versions;
- reject versions must be unique;
- target version may not appear in its own reject list.

Unknown mode or malformed contract fails closed.

## 10. Validation-profile component output

Suggested structure:

```text
{
  "pass": bool,
  "path": str,
  "blob": str | null,
  "release_version": str | null,
  "release_name": str | null,
  "required_contracts": [...],
  "contracts": {
    "<contract-id>": {
      "pass": bool,
      "mode": str | null,
      "authority_version": str | null,
      "issues": [...]
    }
  },
  "violations": [...],
  "errors": [...]
}
```

Contract keys should be emitted in sorted order for deterministic output.

## 11. Failure behavior

MCP-04 fails closed.

Examples:

- malformed target version -> `ready: false`;
- production identity drift -> `ready: false`;
- documentation drift -> `ready: false`;
- target equal to deployed version -> `ready: false`;
- missing exact validation profile -> `ready: false`;
- unknown validation mode -> `ready: false`;
- inherited contract self-references current target -> `ready: false`;
- GitHub read failure -> error surfaced and `ready: false`.

No fallback inference is allowed.

## 12. Read-only safety boundary

MCP-04 must not expose or call any write operation.

Forbidden:

```text
create/update/delete GitHub content
candidate materialization
release command/workflow dispatch
branch mutation
approval mutation
HUMAN_EVIDENCE mutation
release-state mutation
manifest mutation
production mutation
```

The existing `GitHubReader` remains GET-only.

## 13. Non-goals

MCP-04 intentionally does not verify:

- immutable candidate source SHA;
- candidate userscript body/version;
- builder output;
- candidate receipt;
- PR mergeability;
- live-chat evidence;
- workflow freshness;
- approval state;
- actual release eligibility beyond the authorities explicitly read here.

Those remain existing release-system responsibilities or future focused MCP tools.

## 14. Test matrix

Minimum deterministic tests:

1. healthy target/profile + healthy MCP-02/MCP-03 -> ready;
2. malformed target version -> fail;
3. target equal to production -> fail;
4. target older than production -> fail;
5. production-identity component failure -> fail;
6. docs-drift component failure -> fail;
7. missing profile -> visible read failure + fail;
8. schema mismatch -> fail;
9. profile version mismatch -> fail;
10. missing required contract -> fail;
11. unknown mode -> fail;
12. inherited self-reference -> fail;
13. exact-current authority mismatch -> fail;
14. missing authorityIdentity for CURRENT_IDENTITY_INHERIT_BEHAVIOR -> fail;
15. rejectVersions malformed/duplicate/current-target -> fail;
16. valid current v0.70.11 profile shape -> pass candidate-profile component.

## 15. Implementation shape

Target files:

```text
tools/simcore-mcp/simcore_mcp/release_preflight.py
tools/simcore-mcp/simcore_mcp/server.py
tools/simcore-mcp/tests/test_release_preflight.py
tools/simcore-mcp/README.md
```

No product/runtime files are changed.

## 16. Acceptance gate

MCP-04 is COMPLETE only after:

```text
DESIGN                           PASS
IMPLEMENTATION                   PASS
DETERMINISTIC TESTS              PASS
PR-HEAD SIMCORE CI               PASS
MERGE                            PASS
MERGED-MAIN HEALTH               PASS (or successor-main proof)
NO AUTO-REVERT                   PASS
RELEASE-SIMCORE IMMUTABILITY     PASS
TERMUX MCP PROTOCOL SMOKE        PASS
```

## 17. Expected live smoke target

The current repository contains an exact validation profile for target `0.70.11`, while deployed production remains earlier. Therefore `0.70.11` is the preferred first Termux protocol-smoke input if the repository authority is still in that state when the smoke runs.

The smoke result must be judged against fresh authority at execution time, not this historical design sentence.
