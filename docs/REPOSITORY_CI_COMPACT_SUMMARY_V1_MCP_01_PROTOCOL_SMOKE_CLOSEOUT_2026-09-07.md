# Repository CI Compact Summary v1 — MCP-01 Protocol Smoke Closeout

Date: 2026-09-07
Tracking issue: #1738
Parent tracking: #1717
Tool: `repo_ci_summary(workflow?, ref?, run_id?)`
Package: `tools/repo-ci-mcp/`

## Verdict

`REAL_DEVICE_PROTOCOL_PASS`

Repository CI Compact Summary v1 Phase 5 MCP-01 has passed its real-device Termux protocol smoke in exact-run mode. The tool retrieved and validated a live compact SimCore CI summary from GitHub Actions without downloading or uploading a user-facing file.

This closeout does not grant CI authority to the MCP. GitHub workflow reports and product-specific CI reports remain authoritative.

## Design and implementation authority

- Design PR #1739 merged as `0b7fd9a0fd4e2b6ac75069f751ab6f080c98d508`.
- Design PR-head SimCore CI #8253: Verify SUCCESS / Required SUCCESS.
- Design merged-main SimCore CI #8254: Verify SUCCESS / Required SUCCESS.
- Implementation PR #1744 merged as `d6473a9cfbd772063480d2250fee6d421b4310e5`.
- Implementation changed exactly 8 files under `tools/repo-ci-mcp/`.
- Local implementation validation: `python -m compileall` PASS and unittest 49/49 PASS.
- Implementation PR-head SimCore CI #8263: Verify SUCCESS / Required SUCCESS.
- Implementation merged-main SimCore CI #8264: Verify SUCCESS / Required SUCCESS.
- Implementation evidence PR #1745 merged as `59796de0bc4c188f4fdaeb8149af817ca824aa70`.
- Evidence PR-head SimCore CI #8265: Verify SUCCESS / Required SUCCESS.
- Evidence merged-main SimCore CI #8266, run `34041330813`: Verify SUCCESS / Required SUCCESS.

## Exact real-device smoke target

The real-device proof intentionally used exact-run mode to avoid latest-run races.

- repository: `hanmiyoo10-alt/-`
- workflow key: `simcore`
- workflow path: `.github/workflows/simcore-ci.yml`
- workflow name: `SimCore CI`
- run id: `34041330813`
- run number: `8266`
- event: `push`
- head branch: `main`
- head SHA: `59796de0bc4c188f4fdaeb8149af817ca824aa70`
- run status: `completed`
- run conclusion: `success`
- source job id: `101508515220`
- source job name: `Verify`

The target Verify log was pre-checked to contain one normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` transport block bound to this exact run and commit.

## Real Termux protocol smoke

### 1. Code/import check

After pulling current `main`, the package was installed editable under Termux and imported successfully:

```text
REPO CI MCP CODE PASS
```

### 2. Unauthenticated exact-run attempt

Before a GitHub token was exported, both `REPO_CI_GITHUB_TOKEN` and `GITHUB_TOKEN` were unset.

The first exact-run MCP call returned:

```text
IS_ERROR: False
ok: False
error code: JOB_LOG_UNAVAILABLE
job: 101508515220
GitHub HTTP 403: Forbidden
```

The run metadata was still selected exactly and no stale successful run or fabricated summary was substituted. This is the expected fail-closed behavior for an unavailable job log.

### 3. Authenticated exact-run attempt

The device already had a GitHub CLI session. The token value was never copied into chat or repository evidence. It was exported locally with:

```text
export REPO_CI_GITHUB_TOKEN="$(gh auth token)"
```

The same MCP call then returned:

```text
IS_ERROR: False
ok: True
summary.result: PASS
summary.complete: True
errors: []
```

The validated compact body was:

```text
CI_SUMMARY_V1_BEGIN
CI SUMMARY · SimCore CI
Result: PASS
Checks: 6/6 PASS
Product: SimCore
Profile: MAIN_HEALTH
Static: PASS
Arch: PASS
Regression: PASS
State: PASS
Coordination: PASS
Legacy compat: PASS
Warnings: 0
Reason codes: none
Run: 34041330813 · attempt 1
Commit: 59796de0bc4c
CI_SUMMARY_V1_END
```

The returned source was `github_actions_job_log_compact_block`, job `101508515220` (`Verify`).

## Safety properties exercised by the live proof

The live protocol evidence confirms:

1. MCP transport remains successful while tool-level retrieval failures are represented structurally.
2. Exact-run selection does not fall back to an older green run.
3. A job-log 403 fails closed as `JOB_LOG_UNAVAILABLE`.
4. Authentication can be supplied locally without recording a token value in evidence.
5. The returned block is bounded and marker-delimited.
6. The rendered run id and commit prefix are bound to GitHub run metadata.
7. A valid compact PASS is returned inline through MCP rather than as a user-facing file.
8. No issue, PR, release, workflow, runtime, plugin, or production mutation is performed by `repo_ci_summary`.

## Transport and credential boundary

`GitHubReader` resolves `REPO_CI_GITHUB_TOKEN` first and `GITHUB_TOKEN` second. Its redirect handler strips `Authorization` when a GitHub job-log download redirects across origins. Unit coverage also verifies same-origin retention, token redaction in errors, and bounded timeout behavior.

## Tooling anomaly during closeout bookkeeping

During closeout bookkeeping, an accidental test write was made only to the non-production branch `noop-do-not-use`, path `NOOP`.

- accidental commit: `0d530fd4a2e2285996c209352450f861f14283a5`
- immediate cleanup commit: `f7aa3fd5945b089d191591469380d700bc444216`
- cleanup readback: `NOOP` absent (404)
- audit issue: #1746, closed completed
- no force update used
- `main` and `release-simcore` were not changed by the anomaly

This anomaly is unrelated to MCP execution and is preserved here for auditability.

## Production isolation before closeout PR

At closeout preparation time:

- `main`: `59796de0bc4c188f4fdaeb8149af817ca824aa70`
- `release-simcore`: `ecc55f026315c6482c34d267aba2adb97527cdbc`
- production version: `0.70.10`
- `plugins/simcore/latest.js` blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
- `plugins/simcore/install.js` blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
- production file parity: identical

Final completion still requires this closeout document to merge with PR-head and merged-main SimCore CI green, followed by one final production identity recheck and closure of #1738.