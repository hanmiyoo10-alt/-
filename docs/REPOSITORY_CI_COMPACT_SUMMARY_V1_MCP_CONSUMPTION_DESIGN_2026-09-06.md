# Repository CI Compact Summary v1 · Phase 5 MCP Consumption Design

Date: 2026-09-06
Status: DESIGN
Tracking: #1717, #1738
Authority branch: `main`

## 1. Purpose

Phase 5 adds a read-only MCP consumption surface for the already-live `CI_SUMMARY_V1` compact CI contract.

The MCP layer does not create a new CI verdict. It retrieves the bounded compact summary already rendered by a workflow and returns that result inline so a human, ChatGPT, or another MCP consumer can make the first operational verdict without downloading artifacts or reading full logs.

The first tool is:

```text
repo_ci_summary(workflow?, ref?, run_id?)
```

The implementation target is a separate repository-level package:

```text
tools/repo-ci-mcp/
```

It must not be added to SimCore runtime code, Usage Dashboard runtime code, Termux runtime code, or any release branch.

## 2. Why a separate repository MCP

`repo_ci_summary` spans multiple product and repository workflow families. It is therefore not owned by `tools/simcore-mcp/` or `tools/usage-dashboard-mcp/`.

A dedicated repository CI MCP keeps product-specific MCP ownership narrow while preserving the existing official MCP Python SDK v2 pattern already proven in this repository:

- Python package
- `mcp>=2,<3`
- `MCPServer`
- stdio default transport
- read-only GitHub REST adapter isolated from MCP registration

## 3. Durable source available today

The canonical compact JSON is runner-local. Current integrations intentionally do not require a dedicated summary artifact for normal operation.

Every integrated workflow does, however, emit the deterministic rendered compact block to its job log using stable markers:

```text
CI_SUMMARY_V1_BEGIN
...
CI_SUMMARY_V1_END
```

The Phase 5 MCP may consume this block because it is already the bounded transport representation produced from canonical `CI_SUMMARY_V1` JSON.

This is not permission to semantically parse arbitrary product logs. The MCP must ignore all unrelated console prose and accept only exact normalized marker lines plus the bounded content between them.

A later version may read a retained `summary.json` artifact if the repository deliberately adopts that retention policy. MCP-01 does not require changing the existing artifact policy.

## 4. Supported workflow registry

MCP-01 is fail-closed and supports only workflows that already contain the compact summary integration on current `main`.

Initial registry:

| key | workflow path | display name |
| --- | --- | --- |
| `simcore` | `.github/workflows/simcore-ci.yml` | `SimCore CI` |
| `plugin-control-plane` | `.github/workflows/plugin-control-plane-ci.yml` | `Plugin Control Plane CI` |
| `usage-dashboard` | `.github/workflows/reusable-usage-dashboard-validate.yml` | `Reusable Usage Dashboard Validate` |
| `canonical-main-proof-bundle` | `.github/workflows/canonical-main-proof-bundle.yml` | `Canonical Main Proof Bundle` |
| `agent-skills` | `.github/workflows/agent-skills-ci.yml` | `Agent Skills CI` |
| `termux-response-watch` | `.github/workflows/termux-response-watch.yml` | `Termux Response Watch` |
| `termux-background-gpt` | `.github/workflows/termux-background-gpt.yml` | `Termux Background GPT` |
| `termux-large-doc-prototype` | `.github/workflows/termux-large-doc-prototype.yml` | `Termux Large Doc Prototype` |
| `termux-taskbridge` | `.github/workflows/termux-taskbridge.yml` | `Termux TaskBridge` |

The tool may accept an exact registry key, exact workflow path, or exact display name. Fuzzy matching is out of scope for MCP-01.

Unknown workflows fail closed with a bounded supported-workflow list.

## 5. Selection semantics

### 5.1 Default ref

If `ref` is omitted, use `main`.

The ref is passed only as a GitHub Actions run selection filter. MCP-01 does not resolve arbitrary refs into a claim of product authority.

### 5.2 Latest mode

If `run_id` is omitted:

1. resolve the requested supported workflow;
2. request workflow runs for the requested ref;
3. select the newest returned run by GitHub run ordering;
4. inspect that run only.

The tool must not silently skip a newest red, cancelled, incomplete, or marker-missing run in favor of an older green run.

This rule prevents stale-success substitution.

### 5.3 Exact run mode

If `run_id` is provided:

1. fetch that exact run;
2. verify its workflow path is the requested supported workflow;
3. if `ref` was explicitly provided, verify the run is compatible with that ref using GitHub run metadata;
4. inspect only that run.

A mismatch fails closed. The MCP must never relabel a run as belonging to another workflow.

### 5.4 Nonterminal run

If the selected run is not terminal, return the run metadata and a bounded `RUN_NOT_TERMINAL` condition. Do not search backward for an older summary.

## 6. Job and log retrieval

For the selected run:

1. list its jobs;
2. read job logs through the GitHub Actions job-log endpoint;
3. scan only for exact normalized `CI_SUMMARY_V1_BEGIN` and `CI_SUMMARY_V1_END` marker lines;
4. collect bounded candidate blocks;
5. require exactly one valid compact block across the run.

A shell command shown in a GitHub log may itself contain the marker string. That must not count.

The extractor therefore normalizes each log line by:

- removing the GitHub timestamp prefix when present;
- removing ANSI control sequences;
- trimming surrounding whitespace;

Only a normalized line exactly equal to the marker is authoritative.

## 7. Compact block validation

MCP-01 does not reconstruct the full canonical `summary.json` from rendered prose.

It validates only the transport invariants needed for a safe inline first verdict:

- begin/end marker pair is ordered and unique;
- block line count remains within the renderer bound plus marker overhead;
- first body line starts with `CI SUMMARY · `;
- exactly one `Result:` line exists;
- result is one of `PASS`, `NOOP`, `FAIL`, `INFRA_ERROR`, `CANCELLED`, `UNKNOWN`;
- exactly one `Run:` line exists and its run id matches the selected GitHub run id;
- exactly one `Commit:` line exists and its commit prefix matches the selected run `head_sha`;
- if `Summary complete: false` is present, expose `complete=false`; otherwise expose `complete=true` only as a rendered-transport inference, not as a reconstruction of the original JSON object.

The returned text must remain byte-for-byte the normalized compact block, aside from normalized line endings and one final newline.

## 8. Multiple or missing block behavior

The tool fails visible and bounded when:

- no exact compact block is present;
- more than one valid compact block is found across jobs;
- a marker pair is malformed;
- run id does not match;
- commit prefix does not match;
- result vocabulary is invalid;
- log retrieval fails;
- a configured byte bound is exceeded.

It must not infer PASS from GitHub `conclusion=success` when the compact block is absent.

GitHub workflow conclusion and compact result are reported as separate fields.

## 9. Bounded I/O

MCP-01 uses bounded GitHub reads.

Recommended first implementation bounds:

- workflow-run page size: 100, first page only for latest mode;
- job count accepted: <= 100;
- per-job decoded log read: <= 8 MiB;
- compact block: <= 64 lines and <= 64 KiB;
- returned error text: bounded to a few hundred characters per error;
- no unbounded pagination;
- no repository tree scan;
- no issue scan;
- no raw product report download unless a future explicit tool adds it.

If a bound prevents a safe verdict, return incomplete/error state rather than guessing.

## 10. Redirect and token safety

GitHub job-log download uses a temporary redirect to a signed storage URL.

If an optional GitHub token is configured, the HTTP layer must not forward the `Authorization` header to a different redirect host.

MCP-01 must use a redirect policy that strips authorization on cross-host redirects.

The token is never returned in tool output or logs.

Environment variables may follow the repository MCP naming convention:

```text
REPO_CI_GITHUB_REPO
REPO_CI_GITHUB_API
REPO_CI_GITHUB_TOKEN
REPO_CI_GITHUB_TIMEOUT_SECONDS
```

`GITHUB_TOKEN` may remain an optional fallback.

## 11. Tool output contract

Healthy example shape:

```json
{
  "ok": true,
  "repository": "hanmiyoo10-alt/-",
  "selection": {
    "mode": "latest",
    "workflow_key": "termux-taskbridge",
    "workflow_path": ".github/workflows/termux-taskbridge.yml",
    "workflow_name": "Termux TaskBridge",
    "ref": "main"
  },
  "run": {
    "id": 34032083561,
    "run_number": 31,
    "event": "push",
    "head_branch": "main",
    "head_sha": "37b49b13bc26d9d70d39fd591a17ca138de10e65",
    "status": "completed",
    "conclusion": "success"
  },
  "summary": {
    "result": "PASS",
    "complete": true,
    "text": "CI_SUMMARY_V1_BEGIN\n...\nCI_SUMMARY_V1_END\n"
  },
  "source": {
    "kind": "github_actions_job_log_compact_block",
    "job_id": 101483349161,
    "job_name": "test"
  },
  "errors": []
}
```

The MCP result is a read-only view. `ok=true` means the requested compact transport was retrieved and validated, not that the CI result itself is PASS.

For example, a valid compact `FAIL` result still has `ok=true` because retrieval succeeded and the failure was faithfully preserved.

## 12. Error contract

Expected bounded error codes include:

```text
WORKFLOW_UNSUPPORTED
RUN_NOT_FOUND
RUN_WORKFLOW_MISMATCH
RUN_REF_MISMATCH
RUN_NOT_TERMINAL
JOBS_UNAVAILABLE
JOB_LOG_UNAVAILABLE
JOB_LOG_TOO_LARGE
SUMMARY_BLOCK_MISSING
SUMMARY_BLOCK_AMBIGUOUS
SUMMARY_BLOCK_INVALID
SUMMARY_RUN_ID_MISMATCH
SUMMARY_COMMIT_MISMATCH
```

Errors are transport/selection failures. They are not product verdicts.

## 13. MCP package shape

Proposed implementation:

```text
tools/repo-ci-mcp/
  pyproject.toml
  README.md
  repo_ci_mcp/
    __init__.py
    github_reader.py
    summary.py
    server.py
  tests/
    test_summary.py
    test_github_reader.py
```

`summary.py` owns workflow resolution, run selection, compact block extraction, validation, and output shaping.

`github_reader.py` owns bounded read-only GitHub REST transport only.

`server.py` owns MCP registration only.

## 14. MCP registration

The server uses the repository-proven MCP SDK v2 pattern:

```python
from mcp.server import MCPServer

mcp = MCPServer("Repository CI MCP", ...)
```

The first MCP tool is conceptually:

```python
@mcp.tool()
def repo_ci_summary(
    workflow: str | None = None,
    ref: str | None = None,
    run_id: int | None = None,
) -> dict[str, Any]:
    ...
```

If all three inputs are omitted, MCP-01 should fail closed rather than guessing which of nine workflow families the user intended.

At least `workflow` or `run_id` must be supplied.

If only `run_id` is supplied, the tool may infer the supported workflow from the fetched run path. If that path is not in the supported registry, fail closed.

## 15. Test matrix

Unit tests must cover at least:

1. exact workflow key resolution;
2. exact workflow path resolution;
3. exact display-name resolution;
4. unsupported workflow;
5. latest run selects newest only;
6. latest run does not skip newest failure/cancellation/incomplete run;
7. exact run happy path;
8. exact run workflow mismatch;
9. exact run ref mismatch;
10. nonterminal run;
11. exact marker extraction despite shell-script marker literals elsewhere in the log;
12. PASS block;
13. FAIL block with first failure/reason codes retained in text;
14. NOOP block;
15. `Summary complete: false` inference;
16. missing block;
17. duplicate block across jobs;
18. malformed marker order;
19. invalid result vocabulary;
20. run-id mismatch;
21. commit-prefix mismatch;
22. job-log size bound;
23. GitHub read failure is bounded and fail-closed;
24. cross-host redirect strips authorization;
25. same-host redirect may preserve ordinary safe request headers without exposing credentials in output.

No unit test performs a GitHub write.

## 16. Live acceptance

After implementation is merged, real-device Termux validation must use the official MCP client protocol against `MCPServer`, not a direct function call only.

Minimum live smoke:

1. install/update `tools/repo-ci-mcp/` in editable mode;
2. import `repo_ci_mcp.server.mcp` successfully;
3. call `repo_ci_summary` for one current integrated workflow, initially `termux-taskbridge` on `main`;
4. receive `is_error=False` from the MCP protocol;
5. receive `ok=true` from the tool result;
6. returned run id/head SHA must match the live GitHub-selected run;
7. returned compact text must contain one exact marker pair and a valid result;
8. no GitHub mutation occurs.

The exact current run values are recorded from the live device output. They must not be pre-filled from stale design-time examples.

## 17. Production and authority boundary

MCP-01 must not modify:

- `release-simcore`;
- SimCore latest/install files;
- Usage Dashboard release state;
- Termux product code;
- CI conclusions;
- issues or PRs;
- workflow dispatch state;
- HUMAN_EVIDENCE;
- product manifests.

The MCP never becomes release authority, CI authority, or evidence authority.

It is a compact observation surface only.

## 18. Completion gate

MCP-01 is complete only when all are true:

1. this design is merged from a fresh-main branch;
2. implementation changes are isolated to `tools/repo-ci-mcp/` plus durable MCP evidence documentation if needed;
3. local compile and unit tests pass;
4. PR-head SimCore CI passes;
5. merged-main SimCore CI passes, or a proven descendant-successor run is used only if exact-main CI was superseded/cancelled;
6. real Termux MCP protocol smoke passes;
7. exact live output is recorded in #1738 and durable closeout evidence;
8. production identity is reconfirmed unchanged;
9. #1738 is closed as completed only after those gates.

Parent #1717 remains open until Phase 5 disposition for Repository CI Compact Summary v1 is complete.