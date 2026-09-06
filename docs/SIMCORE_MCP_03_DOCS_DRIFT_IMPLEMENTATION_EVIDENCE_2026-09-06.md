# SimCore MCP-03 Documentation Drift Implementation Evidence

Date: 2026-09-06 KST
Tracking: #1705
Classification: TOOLING · MCP · READ_ONLY · IMPLEMENTATION_EVIDENCE

## 1. Scope

MCP-03 adds the read-only tool:

`simcore_check_docs_drift()`

It verifies that the current SimCore documentation authority remains synchronized with manifest-owned machine state while preserving historical evidence outside the active current-state prose boundary.

No runtime/plugin behavior changed.

## 2. Design qualification

Design document:

`docs/SIMCORE_MCP_03_DOCS_DRIFT_DESIGN_2026-09-06.md`

Design PR:

```text
PR                 = #1706
design head        = 32381d8112b89c1e430b17398fdbbb4fd6623909
PR-head SimCore CI = #8200
Verify             = PASS
Required           = PASS
merge              = f93bbc93cf4b923780a1404561918fa96978bb05
merged-main CI     = #8201
Verify             = PASS
Required           = PASS
```

## 3. Implementation

Implementation PR:

```text
PR          = #1707
head        = 6043d910086e53bc5b08dff619622d038b0c8ee6
merge       = 9be6ea2bba1ccb0bfe170d408671da722dae078e
```

Changed files were limited to `tools/simcore-mcp/`:

1. `README.md`
2. `simcore_mcp/docs_drift.py`
3. `simcore_mcp/server.py`
4. `tests/test_docs_drift.py`

No SimCore plugin runtime file, production file, release builder, release workflow, manifest, or HUMAN_EVIDENCE state was changed.

## 4. Implemented verifier contract

MCP-03 reads:

- `main:product-manifest.json`;
- manifest `development_memory` path;
- that development-memory document on `main`.

It checks a fixed ordered 23-invariant matrix:

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

The active-human boundary reuses the repository's closure-integrity interpretation rather than inventing a second policy.

Historical exact versions, SHAs, and old priority literals outside the active-human section are intentionally allowed.

## 5. Fail-close behavior

The verifier returns:

```text
pass
repository
main
declared
observed
checks
violations
errors
```

`pass` is true only when `violations` and `errors` are both empty.

Missing or malformed authority is visible. No absent value is fabricated as healthy.

The release-state `Current priority / live gate` text is diagnostic only and is not required to equal manifest `current_priority`, because the terminal release-state block may preserve a handoff-selected priority while the manifest owns current operational priority after terminal handoff.

## 6. Local deterministic validation

Before repository upload, the implementation was compiled and exercised in an isolated local test harness.

```text
python compileall         = PASS
MCP-03 unit tests         = PASS 12/12
```

Covered controls:

- healthy authority;
- manifest read failure;
- invalid development-memory path;
- document read failure;
- duplicate snapshot markers;
- field-specific snapshot mismatch;
- release-state mode mismatch;
- release-state commit / validation mismatch;
- active-human version literal leak;
- active-human 40-hex literal leak;
- active-human exact current-priority duplication;
- historical identity literals do not cause false positives.

## 7. PR and merged-main qualification

Implementation PR-head:

```text
SimCore CI = #8202
Verify     = PASS
Required   = PASS
```

Merged implementation:

```text
main merge  = 9be6ea2bba1ccb0bfe170d408671da722dae078e
SimCore CI  = #8203
Verify      = PASS
Required    = PASS
```

Fresh main remained at the implementation merge when this evidence branch was created, so no implementation auto-revert was observed.

## 8. Production immutability

Post-implementation production readback:

```text
release-simcore head = ecc55f026315c6482c34d267aba2adb97527cdbc
latest.js blob       = 53f6959039c57f8673c355fcc1c22b573150e4a7
install.js blob      = 53f6959039c57f8673c355fcc1c22b573150e4a7
latest/install equal = YES
userscript version   = 0.70.10 / 0.70.10
```

Therefore MCP-03 implementation did not mutate deployed SimCore production.

## 9. MCP protocol validation status

The code and repository gates are green, but the real MCP client invocation from the user's Termux environment has not yet been exercised for MCP-03.

```text
MCP-03 CODE / IMPORT          = NOT_EXERCISED_ON_TERMUX
MCP-03 REAL CLIENT CALL       = NOT_EXERCISED
MCP-03 STRUCTURED LIVE OUTPUT = NOT_EXERCISED
```

This is a pending acceptance gate, not a failure.

Issue #1705 must remain open until the real protocol smoke is preserved and the closeout transaction is merged and post-merge qualified.

## 10. Current verdict

```text
DESIGN                         = PASS
IMPLEMENTATION                 = PASS
LOCAL DETERMINISTIC TESTS      = PASS 12/12
PR-HEAD SIMCORE CI             = PASS
IMPLEMENTATION MERGE           = PASS
MERGED-MAIN SIMCORE CI         = PASS
NO AUTO-REVERT                 = PASS AT EVIDENCE CUT
PRODUCTION IMMUTABILITY        = PASS
TERMUX MCP PROTOCOL SMOKE      = PENDING
OVERALL                        = IMPLEMENTED / LIVE MCP VALIDATION PENDING
```

## 11. Next gate

Update the Termux checkout to fresh `main`, import `simcore_mcp.docs_drift`, and call:

`simcore_check_docs_drift`

through the MCP v2 in-memory `Client(mcp)` path.

Healthy acceptance requires:

```text
result.is_error = False
pass            = True
23 checks       = PASS
violations      = []
errors          = []
```

Any real `pass: False` result must be preserved and classified before attempting a documentation repair.
