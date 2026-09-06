# SimCore MCP-05 Post-Merge Health — Implementation Evidence

Date: 2026-09-06
Tracking: #1728
Classification: TOOLING · MCP · READ_ONLY

## 1. Scope

This document records implementation evidence for MCP-05:

```text
simcore_postmerge_health(commit_sha)
```

MCP-05 is a read-only post-merge observer. It does not merge, rerun workflows, edit documentation, mutate release state, modify HUMAN_EVIDENCE, or deploy production.

## 2. Design authority

Design document:

```text
docs/SIMCORE_MCP_05_POSTMERGE_HEALTH_DESIGN_2026-09-06.md
```

Design PR:

```text
#1732
```

Design branch head:

```text
dab8b487e71f43c2f2c4080ee1e6e776aee546bc
```

Design merge commit:

```text
91b6aaf0d5d5ee2a01a8695199b39c252103a2c3
```

PR-head SimCore CI:

```text
#8240
Verify: success
Required: success
```

Merged-main SimCore CI:

```text
#8242
Verify: success
Required: success
```

## 3. Live design-merge concurrency case

The exact-target Canonical Main Documentation Stream run for the design merge commit was cancelled.

This was preserved on #1728 as:

```text
WATCH · MCP-05_POSTMERGE_CANONICAL_DOCS_CANCELLED · NO_RUNTIME_IMPACT
```

At initial observation time, no descendant successor existed, so the design target did not yet have sufficient canonical-docs evidence under the MCP-05 contract.

After the implementation merge, the implementation merge commit became a descendant of the design merge and its exact Canonical Main Documentation Stream run succeeded. Therefore the design target now has a proven successful descendant-successor under MCP-05's bounded concurrency rule.

This is direct live evidence for the contract distinction between:

```text
hard exact failure -> must remain failed
cancelled/skipped/absent exact run -> may use proven successful descendant
```

## 4. Implementation authority

Implementation branch:

```text
feat/simcore-mcp-05-postmerge-health-20260906
```

Implementation PR:

```text
#1733
```

Implementation PR head:

```text
faa48b0c05244926fd45872099b06336b6d141af
```

Implementation merge commit:

```text
767b9cce3a46af7e8bf6cd07c538a8d09be6f692
```

## 5. Changed surface

GitHub reported exactly five changed files in #1733:

```text
tools/simcore-mcp/README.md
tools/simcore-mcp/simcore_mcp/github_reader.py
tools/simcore-mcp/simcore_mcp/postmerge_health.py
tools/simcore-mcp/simcore_mcp/server.py
tools/simcore-mcp/tests/test_postmerge_health.py
```

No SimCore plugin/runtime file was changed by MCP-05 implementation.

## 6. Reader additions

The existing GET-only GitHub reader gained bounded read primitives:

```text
get_commit(sha)
compare_commits(base, head)
list_workflow_runs(workflow_path, branch, event="push", max_pages=3)
```

No POST, PUT, PATCH, DELETE, merge, workflow-dispatch, rerun, release, issue, or pull-request mutation primitive was added to the MCP server.

## 7. Verifier behavior

MCP-05 implements the ordered top-level checks defined by the design:

```text
TARGET_COMMIT_SHA_VALID
TARGET_COMMIT_AVAILABLE
MAIN_HEAD_AVAILABLE
TARGET_REACHABLE_FROM_MAIN
NO_EXPLICIT_REVERT_OF_TARGET
SIMCORE_CI_POSTMERGE_SUCCESS
CANONICAL_DOCS_POSTMERGE_SUCCESS
TARGET_MANIFEST_AVAILABLE
PRODUCTION_BASELINE_VERSION_MATCH
PRODUCTION_BASELINE_RELEASE_BRANCH_MATCH
PRODUCTION_BASELINE_RELEASE_COMMIT_MATCH
PRODUCTION_BASELINE_RELEASE_BLOB_MATCH
CURRENT_PRODUCTION_IDENTITY_PASS
CURRENT_DOCS_DRIFT_PASS
```

The verifier composes MCP-02 and MCP-03 rather than reimplementing their authority rules.

## 8. Deterministic local validation

Before upload, the implementation was compiled and tested locally:

```text
python -m compileall -q simcore_mcp tests
PASS

python -m unittest discover -s tests -v
PASS 23/23
```

Coverage included:

- exact current-main success;
- ancestor target with newer main;
- cancelled exact workflow resolved by proven successful descendant;
- hard exact workflow failure not masked by successor success;
- pending exact workflow not replaced by successor evidence;
- target not reachable from main;
- explicit revert detection using target SHA;
- explicit conventional revert-subject detection;
- malformed input fail-close;
- target commit read failure;
- partial workflow API failure while preserving other workflow evidence;
- target manifest failure;
- production baseline version mismatch;
- release commit/blob baseline mismatch;
- MCP-02 component failure propagation;
- MCP-03 component failure propagation;
- incomplete successor/revert scan fail-close;
- unrelated main advancement remaining healthy;
- legitimate later production advancement becoming a baseline mismatch rather than historical-corruption claim;
- unknown exact workflow conclusion fail-close;
- GET reader commit/compare/workflow pagination behavior.

## 9. Uploaded blob integrity

The locally verified files were compared against their GitHub branch blobs.

```text
GitHubReader
81b88a2a9ad32a09ee6854cf1ffc739120bb7a8b

postmerge_health.py
f82da99b21b26b465f4bcee7b18b442a3ac64c27

test_postmerge_health.py
b58d93b1eedf85d8edeef07c40ed56a3e5a1afb3
```

The local Git object hashes matched the uploaded GitHub blob SHAs for all three verified files.

## 10. PR-head CI

Implementation PR #1733 ran SimCore CI:

```text
#8243
Verify: success
Required: success
```

Plugin Control Plane PR observation also completed successfully.

## 11. Merged-main health

Implementation merge commit:

```text
767b9cce3a46af7e8bf6cd07c538a8d09be6f692
```

Exact merged-main SimCore CI:

```text
#8244
Verify: success
Required: success
```

Exact Canonical Main Documentation Stream for the implementation merge also completed successfully.

At the evidence checkpoint, fresh `main` still pointed to the implementation merge commit, so no auto-revert was observed.

## 12. Production immutability

MCP-05 implementation did not change deployed SimCore production.

Observed production after implementation merge:

```text
release-simcore head:
ecc55f026315c6482c34d267aba2adb97527cdbc

latest.js blob:
53f6959039c57f8673c355fcc1c22b573150e4a7

install.js blob:
53f6959039c57f8673c355fcc1c22b573150e4a7

userscript version:
0.70.10
```

Therefore:

```text
latest.js == install.js
production authority unchanged
```

## 13. Administrative tooling anomalies

During MCP-05 setup, two unintended stray issues were created by assistant-side GitHub action routing after the real tracking issue already existed:

```text
#1729
#1730
```

Both were immediately reclassified as:

```text
TOOLING · FIX · ROUTING_ANOMALY · NO_RUNTIME_IMPACT
```

and closed as `not_planned` after transparent preservation.

They caused no code, runtime, release, manifest, release-state, or HUMAN_EVIDENCE mutation.

## 14. Current verdict

```text
DESIGN                     PASS
LOCAL IMPLEMENTATION       PASS
LOCAL COMPILE              PASS
DEDICATED TESTS            PASS 23/23
UPLOAD BLOB INTEGRITY      PASS
PR-HEAD CI                 PASS
MERGED-MAIN SIMCORE CI     PASS
MERGED-MAIN CANONICAL DOCS PASS
PRODUCTION IMMUTABILITY    PASS
MCP PROTOCOL SMOKE         PENDING_TERMUX
```

MCP-05 is implemented and repository-validated. Tracking issue #1728 must remain open until a real MCP protocol call succeeds on Termux and that live evidence is merged into the repository.
