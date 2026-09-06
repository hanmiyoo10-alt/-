# Repository CI Compact Summary v1

Date: 2026-09-06
Status: DESIGN
Tracking: #1717
Authority branch: `main`

## 1. Purpose

Repository CI Compact Summary v1 defines a common, bounded, read-only result layer for repository CI.

The goal is not to replace raw logs, test reports, or product-specific machine reports. The goal is to make the first operational verdict small enough that a human, ChatGPT, or an MCP tool can understand the result without reading hundreds or thousands of lines.

The normal interaction must not require a user to download or upload a file.

The v1 user-facing rule is:

> inline first, files only when explicitly useful.

## 2. Problem

The repository has several validation systems with very different output shapes.

Examples include:

- SimCore CI, which already emits a bounded structured report.
- Plugin Control Plane CI, which executes many contract tests in one job.
- Usage Dashboard validation, which performs materialization, reconciliation, syntax checks, full tests, and candidate validation in a long shell-driven lane.
- Canonical Main, release, agent-skill, and other workflows with their own reports and evidence paths.

Today a successful run can require reading a large amount of output even when the only meaningful result is:

```text
PASS
19/19 checks passed
no warnings
no blockers
```

This is wasteful for humans and especially wasteful for LLM context windows.

## 3. Design principles

### 3.1 Inline-first

The primary human surface is GitHub Actions Step Summary and compact console output.

The primary ChatGPT/MCP surface is a compact structured result rendered directly into the conversation.

The user should not need to attach `summary.txt` or another file for routine review.

### 3.2 Machine-canonical

A small `summary.json` is the canonical compact summary representation for automation.

It is derived data, not product authority.

Product-specific reports, test results, release manifests, and workflow conclusions remain authoritative for their own domains.

### 3.3 File-optional

No text file is required for normal operation.

Optional artifacts may be retained for debugging or evidence, but they are not the normal handoff mechanism to ChatGPT.

### 3.4 Adapter-first, log-parser-last

Structured source reports must be consumed directly whenever available.

Regex parsing of raw console logs is allowed only when the underlying workflow exposes no safer structured result.

The preferred layering is:

```text
product-specific source report
        |
        v
thin adapter
        |
        v
CI_SUMMARY_V1 JSON
        |
        +--> GitHub Step Summary
        +--> compact console text
        +--> MCP / ChatGPT inline result
        +--> optional artifact
```

### 3.5 Read-only and non-authoritative

The summary layer must not mutate production, release state, issue state, manifests, source files, or test outputs.

A summary must never reinterpret a failed authoritative gate as a pass.

### 3.6 Fail visible, not fail noisy

On failure the summary should expose the smallest useful diagnosis:

- overall result,
- failing job or phase,
- first actionable failure,
- reason codes,
- exact source report or drill-down location.

Full logs should be fetched only when the compact result is insufficient.

## 4. Repository layout

The target shared implementation is:

```text
.github/tooling/ci-summary/
  render.py
  schema.json
  adapters/
    simcore.py
    plugin_control_plane.py
    usage_dashboard.py
  tests/
    test_render.py
    test_simcore_adapter.py
    test_plugin_control_plane_adapter.py
    test_usage_dashboard_adapter.py
    fixtures/
```

The exact language remains Python 3 because Python is already available in the relevant major workflows and is suitable for strict JSON validation and deterministic text rendering.

No external Python dependency is required in v1.

## 5. CI_SUMMARY_V1 contract

### 5.1 Canonical JSON shape

The compact internal result uses this logical shape:

```json
{
  "schemaVersion": 1,
  "workflow": "SimCore CI",
  "run": {
    "id": "123456789",
    "attempt": 1,
    "event": "pull_request",
    "sha": "0123456789abcdef0123456789abcdef01234567"
  },
  "scope": {
    "product": "SimCore",
    "profile": "PR_MAIN"
  },
  "result": "PASS",
  "counts": {
    "passed": 19,
    "total": 19,
    "failed": 0,
    "warnings": 0
  },
  "checks": [
    {"name": "production_identity", "result": "PASS"},
    {"name": "docs_drift", "result": "PASS"}
  ],
  "reasonCodes": [],
  "firstFailure": null,
  "source": {
    "kind": "report",
    "path": ".simcore-ci/simcore-ci-report.json"
  },
  "complete": true
}
```

### 5.2 Required fields

Every v1 summary must contain:

- `schemaVersion`
- `workflow`
- `run.id`
- `run.attempt`
- `run.event`
- `run.sha`
- `result`
- `reasonCodes`
- `source`
- `complete`

### 5.3 Result vocabulary

Allowed top-level results are:

```text
PASS
NOOP
FAIL
INFRA_ERROR
CANCELLED
UNKNOWN
```

Adapters must not invent product-specific synonyms at the top level.

Product-specific conclusions may be retained inside `checks` or `details` when useful.

### 5.4 Completeness

`complete=true` means the adapter observed enough authoritative source material to produce a bounded first-pass verdict.

`complete=false` does not necessarily mean the underlying CI failed.

It means the summary is incomplete and the consumer should drill down into the source workflow or report.

## 6. Inline rendering contract

`render.py` must deterministically turn the JSON into a short Markdown/text block.

### 6.1 PASS example

```text
CI SUMMARY · SimCore CI
Result: PASS
Checks: 19/19 PASS
Profile: PR_MAIN
Production identity: PASS
Docs drift: PASS
Warnings: 0
Reason codes: none
Run: 123456789 · attempt 1
Commit: 0123456789ab
```

Routine PASS output should normally remain within about 10 to 30 lines.

### 6.2 FAIL example

```text
CI SUMMARY · SimCore CI
Result: FAIL
Checks: 18/19 PASS
Failed: 1

First failure:
- phase: validation_profile
- code: VALIDATION_PROFILE_VERSION_MISMATCH

Reason codes:
- VALIDATION_PROFILE_VERSION_MISMATCH

Drill down:
- .simcore-ci/simcore-ci-report.json

Run: 123456789 · attempt 1
Commit: 0123456789ab
```

Failure output may be longer than PASS output but should remain bounded.

### 6.3 Console markers

For easy terminal copying and later log extraction, the compact console block should be surrounded by stable markers:

```text
CI_SUMMARY_V1_BEGIN
...
CI_SUMMARY_V1_END
```

The block must not contain the full raw report.

## 7. GitHub Actions integration

Each participating workflow adds an `if: always()` summary step after the authoritative validation work.

Conceptually:

```yaml
- name: Render compact CI summary
  if: always()
  shell: bash
  run: |
    python3 .github/tooling/ci-summary/render.py ...
    cat .ci-summary/inline.md >> "$GITHUB_STEP_SUMMARY"
    cat .ci-summary/inline.txt
```

The renderer may create temporary workspace files such as:

```text
.ci-summary/summary.json
.ci-summary/inline.md
.ci-summary/inline.txt
```

These files are runner-local derived outputs.

They are not intended to be committed to the repository.

The presence of `inline.txt` on the runner does not mean the user must download or upload it. It only exists as a convenient rendering intermediate if needed by the workflow implementation.

## 8. ChatGPT and MCP interaction

The intended default interaction is:

```text
User: 방금 CI 결과 봐줘
```

The assistant or MCP reads the compact structured summary and responds inline:

```text
SimCore CI: PASS
19/19 checks passed
Production identity: PASS
Docs drift: PASS
Warnings: 0
Blockers: 0
```

No attachment is required.

If the result is FAIL, the assistant first consumes only:

- result,
- first failure,
- reason codes,
- drill-down source.

Only then should it fetch a full source report or job log when necessary.

This creates a two-stage context policy:

```text
Stage 1: compact summary
Stage 2: targeted detail only on demand or failure
```

## 9. Artifact policy

### 9.1 Default

Do not require a summary artifact for the normal human or ChatGPT workflow.

### 9.2 Optional retention

A workflow may upload `summary.json` as a small artifact when one of these applies:

- later MCP/API retrieval needs a stable run artifact,
- compliance or evidence retention benefits from it,
- the underlying workflow already has a natural artifact bundle.

### 9.3 No file-first UX

Documentation and operator guidance must not say that users should routinely download `summary.txt` and upload it to ChatGPT.

If a user explicitly asks for a file, a file representation may be produced separately.

## 10. Adapter contracts

### 10.1 SimCore adapter

Source of truth:

```text
.simcore-ci/simcore-ci-report.json
```

The adapter should directly map the bounded SimCore report into `CI_SUMMARY_V1`.

It must not re-parse the entire SimCore console log.

Expected mappings include:

- workflow profile,
- conclusion,
- reason codes,
- bounded check counts when available,
- production identity/parity indicators when present,
- source path.

If the SimCore report is missing, the summary should become `INFRA_ERROR` or incomplete according to the authoritative workflow state.

### 10.2 Plugin Control Plane adapter

The current workflow runs many discrete contract commands but does not have one equivalent bounded result report.

The v1 adapter should not scrape arbitrary prose from a long log.

Instead the workflow should wrap contract execution so each contract records a minimal structured receipt:

```json
{"name":"canonical-main-contract","result":"PASS"}
```

The adapter then counts receipts and reports the first failure.

The contract test itself remains authoritative.

### 10.3 Usage Dashboard adapter

Usage Dashboard validation contains several phases:

- candidate identity,
- release-spec resolution,
- materialization,
- reconciliation,
- syntax checks,
- full test suite,
- release candidate validation,
- cleanliness/integrity checks.

The adapter should consume phase receipts created by the workflow or by existing validator outputs.

Raw log regex parsing should be avoided.

The compact summary should expose phase-level status plus the existing test-suite pass count when deterministically available.

## 11. Failure and cancellation semantics

The summary step runs with `if: always()` so it can report failures from earlier steps.

However v1 must distinguish:

- product/test failure,
- summary generation failure,
- infrastructure failure,
- workflow cancellation.

A failure of the summary renderer must not silently convert a failed product run into PASS.

During the pilot, a renderer failure should also not turn an otherwise authoritative PASS product run into FAIL.

Recommended pilot behavior:

```text
underlying gate result: unchanged
summary renderer problem: visible warning / incomplete summary
```

After stabilization, the repository may add a separate required `CI Summary Contract` check without coupling it to product release authority.

## 12. Security boundaries

v1 is read-only.

It must not:

- write to repository branches,
- change issues or PRs,
- change releases,
- modify production artifacts,
- use repository write tokens,
- execute privileged follow-up workflows,
- treat untrusted log text as shell input.

The renderer must use explicit file arguments and strict JSON parsing.

Any text copied into Markdown must be escaped or bounded so untrusted test names cannot generate unsafe HTML or huge summaries.

## 13. Size limits

The compact layer must remain compact by contract.

Recommended v1 limits:

- `summary.json`: maximum 64 KiB
- rendered PASS output: target <= 30 lines
- rendered FAIL output: target <= 60 lines
- `reasonCodes`: maximum 20 entries
- `checks`: maximum 100 entries in JSON
- rendered detailed checks: only failures plus selected high-value PASS checks
- first failure message: maximum 500 characters

If a source exceeds the bound, the adapter truncates detail while preserving:

- result,
- count,
- first failure,
- reason codes,
- drill-down source.

## 14. Determinism

For identical source reports and run metadata, the renderer must produce byte-stable JSON and text except for explicitly varying run metadata.

Ordering rules:

- reason codes sorted unless source order is semantically authoritative,
- check order defined by adapter contract,
- JSON emitted with stable key ordering,
- no timestamps generated by the renderer unless passed as source metadata.

## 15. Token-efficiency objective

The design does not claim a guaranteed fixed token reduction for every failure mode.

The expected behavior is:

- routine PASS runs: often more than 90 percent less context than full logs,
- routine known FAIL runs: substantial reduction because only the first actionable failure and reason codes are consumed,
- unknown infrastructure failures: compact result first, targeted log retrieval second.

The key metric is not raw compression alone.

The key metric is:

> percentage of CI reviews completed without fetching full logs.

## 16. Pilot rollout

### Phase 0: contract only

- merge this design,
- keep all workflows unchanged.

### Phase 1: shared engine and tests

Add:

```text
.github/tooling/ci-summary/render.py
.github/tooling/ci-summary/schema.json
.github/tooling/ci-summary/tests/
```

Test:

- PASS rendering,
- FAIL rendering,
- cancellation,
- infra error,
- missing source,
- malformed adapter output,
- size bounds,
- deterministic output,
- Markdown safety.

### Phase 2: three-workflow pilot

Integrate, one workflow at a time:

1. SimCore CI
2. Plugin Control Plane CI
3. Reusable Usage Dashboard Validate

Each integration gets its own PR and post-merge verification.

Do not edit all repository workflows in one blast-radius-heavy PR.

### Phase 3: observe

Measure:

- summary completeness,
- false PASS/FAIL count,
- summary generation failures,
- number of reviews requiring raw logs,
- practical line/token reduction.

### Phase 4: expand

Only after the pilot is stable, expand to suitable workflows such as:

- Canonical Main,
- release validation,
- agent-skill evaluation,
- Termux tooling,
- other plugin CI lanes.

### Phase 5: MCP consumption

Add a read-only MCP surface that returns the latest compact summary inline.

Possible future tool:

```text
repo_ci_summary(workflow?, ref?, run_id?)
```

This tool should return the compact JSON-derived result, not a file attachment.

## 17. Non-goals for v1

v1 does not:

- replace GitHub Actions logs,
- replace product-specific reports,
- delete existing artifacts,
- automatically fix failed CI,
- automatically merge PRs,
- automatically release products,
- centralize all workflows behind `workflow_run`,
- require users to upload summary files to ChatGPT,
- attempt semantic summarization with an LLM inside CI.

## 18. Acceptance criteria

The design is successfully implemented when all of the following are true:

1. A shared deterministic renderer exists under `.github/tooling/ci-summary/`.
2. The compact JSON conforms to `CI_SUMMARY_V1`.
3. The normal human surface is GitHub Step Summary plus compact console text.
4. The normal ChatGPT/MCP surface is inline text/structured data, not an uploaded file.
5. SimCore uses its existing bounded machine report rather than raw-log parsing.
6. Plugin Control Plane produces structured contract receipts rather than relying on arbitrary prose regexes.
7. Usage Dashboard exposes phase receipts or structured validator results.
8. Summary generation runs on PASS and FAIL paths where the runner reaches the summary step.
9. Product CI gating semantics are unchanged.
10. Renderer failure cannot manufacture a PASS.
11. Pilot integrations are isolated into separate PRs.
12. Production and release branches are untouched by summary implementation.
13. A PASS run can normally be reviewed from the compact inline output alone.
14. A FAIL run identifies the first actionable failure and exact drill-down source.
15. No operator documentation requires routine file download/upload for ChatGPT review.

## 19. Final architecture

```text
                       existing authoritative CI
                                 |
             +-------------------+-------------------+
             |                   |                   |
             v                   v                   v
      SimCore report       contract receipts    UD phase receipts
             |                   |                   |
             +--------- product-specific adapters ---+
                                 |
                                 v
                         CI_SUMMARY_V1 JSON
                                 |
              +------------------+------------------+
              |                  |                  |
              v                  v                  v
       GitHub Step Summary   console inline     MCP / ChatGPT
              |                  |                  |
              +------------------+------------------+
                                 |
                          no file required

       optional artifact only for evidence/debug/retrieval
```

## 20. Decision

Repository CI Compact Summary v1 is approved for implementation with these invariant choices:

- inline-first,
- file-optional,
- machine-canonical,
- adapter-first,
- read-only,
- bounded,
- deterministic,
- pilot before repo-wide rollout,
- no production/release mutation,
- full logs fetched only when the compact result is insufficient.
