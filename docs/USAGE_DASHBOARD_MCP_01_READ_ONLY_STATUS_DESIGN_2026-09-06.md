# Local Usage Dashboard MCP-UD-01 — read-only status pilot

Date: 2026-09-06 KST
Tracking: #1694
Status: DESIGN FROZEN FOR REVIEW · IMPLEMENTATION NOT STARTED

## 1. Decision

Use MCP for Local Usage Dashboard, but do **not** embed MCP into the plugin/runtime/release path.

MCP-UD-01 should be a repository-owned, read-only adapter under a separate tooling boundary, modeled after the already validated `tools/simcore-mcp/` pattern.

Tentative implementation location:

- `tools/usage-dashboard-mcp/`

First MCP tool:

- `usage_dashboard_status`

The MCP server is an observer. It is not a product authority, release authority, updater, bridge manager, or HUMAN_EVIDENCE authority.

## 2. Why MCP is useful here

Today a human can inspect Local Usage Dashboard through the PocketRisu UI and copy diagnostics into a chat. MCP can reduce that manual copy/paste for machine-readable status checks while preserving the existing UI and runtime.

Useful questions for an MCP client:

- What Product / Engine / Manager / CLI / Models tuple is production currently serving?
- Are `main` and `release-usage-dashboard` aligned for the deployed product?
- Is the same-device local bridge healthy?
- What is the latest sanitized snapshot readiness / health / error state?
- Is there authority or deployment drift that needs investigation?

## 3. Existing precedent

The repository already has `tools/simcore-mcp/` with MCP-01:

- one read-only tool (`simcore_status`)
- MCP Python SDK v2
- stdio transport
- status aggregation separated from MCP transport for deterministic tests
- no GitHub write methods
- Termux / Android validation already recorded

MCP-UD-01 should reuse that architecture instead of introducing a second MCP framework.

## 4. Authority sources

### GitHub / release authority

Read-only:

- `main` head
- `release-usage-dashboard` head
- `plugins/usage-dashboard/runtime/product-manifest.json`
- deployed `plugins/usage-dashboard/latest.js`
- deployed runtime/manager artifacts only when needed for tuple/parity evidence

### Same-device runtime authority

Optional local probe when the MCP server runs on the same Termux device:

- bridge default: `127.0.0.1:39117`
- unauthenticated `/health`
- authenticated `/snapshot`

The existing bridge auth boundary remains authoritative:

- `X-DevPass-Bridge-Key`
- compatible `X-Local-Bridge-Key`

The MCP adapter may read an existing local credential through the established local ownership path, but must never return, print, log, persist, or include the credential in structured MCP output.

## 5. MCP-UD-01 output contract

`usage_dashboard_status` should return one structured object with bounded fields such as:

```text
product:
  version
  engineVersion
  managerVersion
  cliVersion
  modelsVersion
  contracts

github:
  mainHead
  releaseHead
  releaseVersion
  parityState

localRuntime:
  available
  health
  readiness
  activeErrors
  failures
  staleModules
  bridgeVersion
  snapshotAge

source:
  github
  localBridge

warnings: []
errors: []
```

Exact names may change during implementation, but the following semantics are frozen:

- missing data stays unknown/null; never infer zero/false
- local bridge failure does not fabricate GitHub failure
- GitHub failure does not fabricate local runtime failure
- partial reads remain partial
- raw organization identifiers are not returned
- access tokens / bridge credentials are not returned

## 6. Read-only boundary

MCP-UD-01 MUST NOT:

- write GitHub files/branches/issues/PRs
- merge PRs
- mutate `release-usage-dashboard`
- trigger exact-byte promotion
- call bridge manager sync/adopt/restart/update endpoints
- trigger a manual Usage Dashboard refresh
- modify PocketRisu/plugin/runtime state
- execute release decisions
- mark physical acceptance PASS/FAIL

Any future write-capable MCP tool requires a new design and explicit authority; it is not an extension hidden inside MCP-UD-01.

## 7. Transport and runtime

Reuse the SimCore MCP-01 runtime shape unless implementation evidence requires otherwise:

- Python 3.10+
- MCP Python SDK v2 (`mcp>=2,<3`)
- stdio transport for the first pilot
- status logic independent from the MCP SDK so tests do not require a live transport

Termux compatibility should reuse the already validated SimCore dependency path where possible rather than invent a second stack.

## 8. Security and privacy

- localhost bridge remains bound to localhost
- no arbitrary HTTP proxy surface
- exact allowlist of bridge reads
- bridge credential never enters MCP output
- GitHub token never enters MCP output
- raw Credits organization IDs and other account identifiers must be removed from returned structured data
- diagnostics should expose state/health summaries, not secrets

## 9. Failure behavior

MCP-UD-01 is fail-closed for claims, not fail-hard for the whole tool.

Examples:

- GitHub OK + local bridge unavailable -> return GitHub status plus `localRuntime.available=false`
- local bridge OK + GitHub unavailable -> return local status plus GitHub read errors
- `/snapshot` auth failure -> report authenticated snapshot unavailable; do not retry with guessed credentials
- field missing -> unknown/null; do not infer

## 10. Validation gate

Before calling MCP-UD-01 implemented:

1. deterministic unit tests for authority/parity/partial-failure logic
2. MCP import smoke
3. in-memory MCP client call to `usage_dashboard_status`
4. Termux / Android protocol smoke
5. proof that no product/runtime/release branch changed during MCP validation
6. credential redaction test
7. unknown-preservation test

## 11. Relationship to Product releases

MCP-UD-01 is tooling, not a Local Usage Dashboard Product feature release.

Therefore this design:

- reserves no Product version
- reserves no P-number
- does not alter current `release-usage-dashboard`
- does not change the 5.101 product design authority

If MCP later becomes user-visible product functionality, that must enter the normal Product design -> implementation -> regression -> release -> physical acceptance loop as a separate scope.

## 12. Next implementation step

If implemented, copy the proven SimCore MCP skeleton into a new isolated package and replace the status aggregator with Usage Dashboard authority/local-bridge readers. Keep the first tool count at exactly one (`usage_dashboard_status`) until real use proves a second tool is needed.
