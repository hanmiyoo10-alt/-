# SimCore MCP-03 Documentation Drift Verifier Design

Date: 2026-09-06 KST
Tracking: #1705
Classification: TOOLING · MCP · READ_ONLY · DESIGN_FIRST

## 1. Goal

Add a third dedicated SimCore MCP tool:

`simcore_check_docs_drift()`

MCP-01 answers broad operational status. MCP-02 verifies deployed production identity. MCP-03 verifies that the current documentation authority has not drifted from the machine-owned manifest/state contract.

The tool is a read-only verifier. It reports drift; it never repairs it.

## 2. Authority boundary

MCP-03 reads only `main` documentation authority.

Primary authorities:

- `product-manifest.json`: machine-readable declared production identity and current operational state;
- manifest `development_memory`: path of the current development continuity document;
- the machine-managed `SIMCORE_SYNC:PRODUCTION_SNAPSHOT` block inside that document;
- the single machine-managed `SIMCORE_RELEASE_STATE:*` block inside that document;
- the active human current-state section only for closure-integrity / identity-duplication checks.

Historical ledgers are not judged for semantic freshness. Historical exact identities are intentionally allowed outside the active human current-state section.

## 3. Existing invariant reused

`products/simcore/tests/suites/closure-integrity.test.mjs` already defines the active human section as the text beginning at:

`# 1. Current Operational State`

and ending at `## Historical validated precursor`, or the `# 2.` fallback when the historical marker is absent.

MCP-03 must use the same boundary model so the MCP contract does not invent a competing interpretation of `CURRENT_DEVELOPMENT.md`.

The durable human-prose rule remains:

- machine-managed blocks own exact current identity;
- active human prose explains meaning and next actions;
- active human prose must not duplicate exact runtime version / commit-like identity / current-priority authority.

## 4. Inputs

No normal tool arguments.

Environment is inherited from the existing `GitHubReader`:

- `SIMCORE_GITHUB_REPO`
- `SIMCORE_GITHUB_TOKEN` / `GITHUB_TOKEN`
- `SIMCORE_MAIN_BRANCH`
- `SIMCORE_GITHUB_API`
- `SIMCORE_GITHUB_TIMEOUT_SECONDS`

No release-branch read is required for MCP-03. MCP-02 remains the deployed-identity verifier.

## 5. Read sequence

1. Read `product-manifest.json` from `main`.
2. Validate manifest `development_memory` as a non-empty string.
3. Read the declared development-memory document from `main`.
4. Locate exactly one production snapshot begin/end pair.
5. Parse bounded `- Key: value` fields inside the production snapshot block.
6. Locate exactly one release-state begin/end pair and require matching marker mode.
7. Parse bounded release-state fields.
8. Extract the active human current-state section using the established closure-integrity boundary.
9. Evaluate deterministic checks in fixed order.

A failed earlier read does not fabricate later health. Later checks receive `actual: null` / false as appropriate and the read failure is preserved in `errors`.

## 6. Production snapshot contract

The machine-managed production snapshot must contain exactly one bounded block and must match manifest-owned fields:

| Snapshot label | Manifest key |
| --- | --- |
| `Product` | `product` |
| `Version` | `production_version` |
| `Release` | `release_name` |
| `Release branch` | `release_branch` |
| `Release commit` | `release_commit` |
| `Release blob` | `release_blob` |
| `Declared validation status` | `validation_status` |
| `Major update milestone` | `major_update_milestone` |
| `Major update phase` | `major_update_phase` |
| `Major update checkpoint` | `major_update_checkpoint` |

Backticks around Markdown values are presentation only and are stripped for comparison.

Each field receives its own deterministic check code so a caller can identify the exact drift without reparsing prose.

## 7. Release-state contract

MCP-03 requires exactly one begin marker and one end marker of the form:

`<!-- SIMCORE_RELEASE_STATE:<MODE>:BEGIN -->`

`<!-- SIMCORE_RELEASE_STATE:<MODE>:END -->`

The modes must match.

The verifier checks two manifest-owned values that should not become stale in that machine-managed block:

- `Production commit` == manifest `release_commit`;
- `Validation status` == manifest `validation_status`.

MCP-03 intentionally does **not** require release-state `Current priority / live gate` to equal manifest `current_priority`. Current-development policy explicitly allows the terminal release-state block to preserve a handoff-selected priority while the manifest owns the current operational priority after terminal handoff.

The release-state mode and observed current-priority text are still returned for diagnosis.

## 8. Active human prose contract

The active human section must:

- exist using the established boundary;
- contain `## How to read current operational state`;
- not contain `## Production verdict`;
- contain no explicit runtime version literal matching `v0.<n>.<n>`;
- contain no 40-hex SHA/blob-like literal;
- not duplicate the exact non-empty manifest `current_priority` literal.

This is deliberately narrower than semantic natural-language staleness detection. MCP-03 does not try to decide whether arbitrary human prose is philosophically outdated.

## 9. Deterministic ordered checks

Expected ordered codes:

1. `MANIFEST_AVAILABLE`
2. `DEVELOPMENT_MEMORY_PATH_VALID`
3. `DEVELOPMENT_MEMORY_AVAILABLE`
4. `PRODUCTION_SNAPSHOT_MARKERS_UNIQUE`
5. `SNAPSHOT_PRODUCT_MATCH`
6. `SNAPSHOT_VERSION_MATCH`
7. `SNAPSHOT_RELEASE_NAME_MATCH`
8. `SNAPSHOT_RELEASE_BRANCH_MATCH`
9. `SNAPSHOT_RELEASE_COMMIT_MATCH`
10. `SNAPSHOT_RELEASE_BLOB_MATCH`
11. `SNAPSHOT_VALIDATION_STATUS_MATCH`
12. `SNAPSHOT_MILESTONE_MATCH`
13. `SNAPSHOT_PHASE_MATCH`
14. `SNAPSHOT_CHECKPOINT_MATCH`
15. `RELEASE_STATE_MARKERS_VALID`
16. `RELEASE_STATE_COMMIT_MATCH`
17. `RELEASE_STATE_VALIDATION_MATCH`
18. `ACTIVE_HUMAN_SECTION_AVAILABLE`
19. `ACTIVE_HUMAN_GUIDE_PRESENT`
20. `ACTIVE_HUMAN_PRODUCTION_VERDICT_ABSENT`
21. `ACTIVE_HUMAN_VERSION_LITERAL_ABSENT`
22. `ACTIVE_HUMAN_40HEX_LITERAL_ABSENT`
23. `ACTIVE_HUMAN_CURRENT_PRIORITY_LITERAL_ABSENT`

Every failed check is appended to `violations` with `severity: hard`.

## 10. Output contract

```text
{
  pass,
  repository,
  main: {
    branch,
    manifest_blob,
    development_memory_path,
    development_memory_blob
  },
  declared: {
    product,
    production_version,
    release_name,
    release_branch,
    release_commit,
    release_blob,
    validation_status,
    major_update_milestone,
    major_update_phase,
    major_update_checkpoint,
    current_priority
  },
  observed: {
    production_snapshot,
    release_state_mode,
    release_state,
    active_human: {
      available,
      has_guide,
      has_production_verdict,
      version_literals,
      hex40_literals,
      duplicates_current_priority
    }
  },
  checks,
  violations,
  errors
}
```

`pass` is true only when both `errors` and `violations` are empty.

## 11. Error policy

Read / JSON / malformed-block failures are visible and fail closed.

Errors use the existing shape:

```text
{ source, message }
```

No missing value is replaced with a guessed healthy value.

## 12. Implementation target

Add under `tools/simcore-mcp/` only:

- `simcore_mcp/docs_drift.py`
- registration in `simcore_mcp/server.py`
- deterministic unit tests in `tests/test_docs_drift.py`
- README tool/output/smoke documentation

No changes to plugin runtime, release builder, manifest, release-state workflow, or production files.

## 13. Required deterministic tests

At minimum:

1. healthy manifest + document passes;
2. manifest read failure is visible and fails closed;
3. missing/invalid development-memory path fails closed;
4. document read failure is visible;
5. duplicate/missing snapshot markers fail;
6. each snapshot mismatch family is observable;
7. release-state mode mismatch fails;
8. release-state commit/validation mismatch fails;
9. human version literal fails;
10. human 40-hex literal fails;
11. exact current-priority duplication fails;
12. historical identity literals outside active human section do not fail.

## 14. Acceptance gate

MCP-03 is COMPLETE only after:

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

## 15. Future composition

A later `simcore_release_preflight()` may compose:

- MCP-02 production-identity verifier;
- MCP-03 documentation-drift verifier;
- release-candidate-specific checks.

MCP-03 itself stays read-only and narrow.
