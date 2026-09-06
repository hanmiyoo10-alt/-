# Repository CI Compact Summary v1 · Phase 5 MCP-01 Implementation Evidence

Date: 2026-09-06
Status: IMPLEMENTATION EVIDENCE · REAL-DEVICE CLOSEOUT PENDING
Tracking: #1717, #1738
Authority branch: `main`

## 1. Scope

Phase 5 MCP-01 adds the first repository-wide read-only MCP consumer for the already-live `CI_SUMMARY_V1` compact CI transport.

Tool:

```text
repo_ci_summary(workflow?, ref?, run_id?)
```

Implementation package:

```text
tools/repo-ci-mcp/
```

This evidence records design, implementation, automated validation, merge, and production isolation. It is not final closeout evidence. Tracking issue #1738 remains open until a real Termux MCP protocol smoke is recorded and final closeout verification is complete.

## 2. Design authority

Design PR: #1739

Design document:

```text
docs/REPOSITORY_CI_COMPACT_SUMMARY_V1_MCP_CONSUMPTION_DESIGN_2026-09-06.md
```

Design head:

```text
b2a73a2a301799658e05f3ebec85bb542cdb2c92
```

Design merge:

```text
0b7fd9a0fd4e2b6ac75069f751ab6f080c98d508
```

Design validation:

- PR-head SimCore CI #8253: SUCCESS
- `Verify`: SUCCESS
- `Required`: SUCCESS
- merged-main SimCore CI #8254: SUCCESS
- `Verify`: SUCCESS
- `Required`: SUCCESS

## 3. Implementation identity

Implementation PR: #1744

Implementation branch base before PR:

```text
867770903c8b2da6fed92d7b1fe29d5ec7ca81b6
```

Implementation commit:

```text
c54dd5b4a0db48ee01a84d78453ad74857773199
```

Implementation merge:

```text
d6473a9cfbd772063480d2250fee6d421b4310e5
```

Pre-PR compare was exactly:

- behind: 0
- ahead: 1
- changed files: 8
- all changed files below `tools/repo-ci-mcp/`
- workflow changes: 0
- product/runtime/plugin/release changes: 0

Changed files:

1. `tools/repo-ci-mcp/pyproject.toml`
2. `tools/repo-ci-mcp/README.md`
3. `tools/repo-ci-mcp/repo_ci_mcp/__init__.py`
4. `tools/repo-ci-mcp/repo_ci_mcp/github_reader.py`
5. `tools/repo-ci-mcp/repo_ci_mcp/summary.py`
6. `tools/repo-ci-mcp/repo_ci_mcp/server.py`
7. `tools/repo-ci-mcp/tests/test_summary.py`
8. `tools/repo-ci-mcp/tests/test_github_reader.py`

## 4. Local validation

Before repository write:

- `python -m compileall`: PASS
- unit tests: 49/49 PASS

The test matrix covers:

- exact workflow key/path/display-name resolution for the nine supported workflow families;
- unsupported workflow and missing-input failure;
- newest-run-only selection with no stale-green substitution;
- exact-run workflow/ref mismatch failure;
- nonterminal-run refusal;
- exact normalized compact marker extraction;
- ANSI and GitHub timestamp normalization without accepting shell marker literals;
- PASS, FAIL, NOOP, and incomplete rendered transports;
- missing, duplicate, nested, reversed, and malformed marker failure;
- rendered run-id and commit-prefix binding to GitHub metadata;
- bounded jobs and job-log failure handling;
- skipped-job behavior;
- cross-origin `Authorization` stripping on job-log redirects;
- same-origin credential retention;
- token redaction in bounded transport errors;
- timeout bounds.

## 5. PR and merged-main CI

PR-head SimCore CI:

```text
run number: 8263
run id: 34040860897
head: c54dd5b4a0db48ee01a84d78453ad74857773199
conclusion: SUCCESS
Verify: SUCCESS
Required: SUCCESS
```

Merged-main SimCore CI:

```text
run number: 8264
run id: 34041047706
head: d6473a9cfbd772063480d2250fee6d421b4310e5
Verify: SUCCESS
Required: SUCCESS
```

The merge was performed only after the PR remained mergeable, the PR head remained exact, main had not advanced past the PR base, and PR-head Verify + Required were green.

## 6. Read-only and fail-closed invariants

MCP-01 is observational only.

- GitHub reads only.
- No issue or pull-request mutation tool is exposed by the MCP server.
- No workflow dispatch or rerun surface is exposed.
- No product/runtime/release mutation is performed.
- Only nine compact-summary workflow families are accepted.
- Latest mode inspects the newest matching run only.
- Exact-run mode verifies workflow and explicit ref compatibility.
- Arbitrary product-log prose is ignored.
- Only exact normalized `CI_SUMMARY_V1_BEGIN` / `CI_SUMMARY_V1_END` transport blocks are accepted.
- A valid compact FAIL remains faithfully visible and does not become a transport error.
- Missing, ambiguous, malformed, or metadata-mismatched compact transports fail visibly.
- Job/log/block reads are bounded.
- Cross-origin redirects remove `Authorization`.

## 7. Production isolation

After implementation merge, production remained unchanged:

```text
release-simcore head:
ecc55f026315c6482c34d267aba2adb97527cdbc

plugins/simcore/latest.js blob:
53f6959039c57f8673c355fcc1c22b573150e4a7

plugins/simcore/install.js blob:
53f6959039c57f8673c355fcc1c22b573150e4a7

SimCore production version:
v0.70.10
```

`latest.js` and `install.js` remain identical at the production blob above.

## 8. Remaining closeout gate

Phase 5 MCP-01 is implemented and merged, but #1738 must remain OPEN until all remaining gates pass:

1. this implementation-evidence PR passes PR-head CI and merges;
2. merged-main or a qualifying successor fresh-main SimCore CI passes;
3. production identity is reconfirmed unchanged;
4. a real Termux device installs/loads the package and calls `repo_ci_summary` through the MCP protocol;
5. exact live output is recorded without fabrication;
6. final closeout evidence is merged with CI;
7. production is reconfirmed unchanged after closeout.
