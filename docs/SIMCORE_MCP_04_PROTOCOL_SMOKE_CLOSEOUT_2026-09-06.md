# SimCore MCP-04 Protocol Smoke Closeout — 2026-09-06

## Scope

This document records the live Termux MCP protocol smoke for MCP-04 `simcore_release_preflight(version)` and closes the final acceptance gate for issue #1710, subject to this document's PR/main CI and post-merge production immutability checks.

Classification: `TOOLING · MCP · READ_ONLY · LIVE_PROTOCOL_EVIDENCE`

This is not a SimCore runtime release and does not authorize or deploy the target release.

## Environment

- host: Android Termux, aarch64
- Python: 3.14.6
- MCP Python SDK v2 installation previously validated in the same Termux environment
- repository checkout: `~/simcore-mcp-repo`
- branch: `main`
- local main fast-forwarded through `bae2a72ad351421abee75429e98620bcc451c817`
- tool: `simcore_release_preflight`
- requested target: `0.70.11`

## Invocation

The live smoke used the MCP v2 in-memory client:

```python
import anyio
from mcp import Client
from simcore_mcp.server import mcp

async def main():
    async with Client(mcp, raise_exceptions=True) as client:
        result = await client.call_tool(
            "simcore_release_preflight",
            {"version": "0.70.11"},
        )
        print("IS_ERROR:", result.is_error)
        print(result.structured_content)

anyio.run(main)
```

Before the protocol call, the Termux import check also passed:

```text
MCP-04 CODE PASS
```

## Protocol result

Observed:

```text
IS_ERROR: False
ready: True
violations: []
errors: []
```

All three component reports passed:

- `production_identity.pass = True`
- `docs_drift.pass = True`
- `validation_profile.pass = True`

The live call observed current production as `0.70.10` and target `0.70.11`.

## Top-level preflight checks

All 12 top-level checks passed:

1. `TARGET_VERSION_VALID`
2. `PRODUCTION_VERSION_AVAILABLE`
3. `TARGET_ADVANCES_PRODUCTION`
4. `VALIDATION_PROFILE_AVAILABLE`
5. `VALIDATION_PROFILE_SCHEMA_SUPPORTED`
6. `VALIDATION_PROFILE_VERSION_MATCH`
7. `VALIDATION_PROFILE_NAME_VALID`
8. `VALIDATION_PROFILE_CONTRACTS_OBJECT`
9. `VALIDATION_PROFILE_REQUIRED_CONTRACTS_PRESENT`
10. `VALIDATION_PROFILE_CONTRACTS_VALID`
11. `PRODUCTION_IDENTITY_PASS`
12. `DOCS_DRIFT_PASS`

## Validation-profile contracts

The live `0.70.11` profile passed all required contracts:

- `reload-cache-continuity`: `INHERIT_BEHAVIOR`, authority `0.69.2`
- `operator-release-card`: `CHANGED_CONTRACT`, authority `0.70.11`
- `host-local-telemetry`: `EXACT_CURRENT_IDENTITY`, authority `0.70.11`, reject `0.70.10`
- `bounded-telemetry-capsule`: `INHERIT_BEHAVIOR`, authority `0.69.2`

Each contract reported `pass = True` and an empty `issues` list.

## Production identity observed by the live MCP call

The protocol result independently observed:

- production version: `0.70.10`
- release branch: `release-simcore`
- release commit: `ecc55f026315c6482c34d267aba2adb97527cdbc`
- release blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
- latest blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
- install blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
- latest/install parity: PASS
- latest/install userscript version: `0.70.10`

The production-identity component reported no violations and no errors.

## Documentation authority observed by the live MCP call

The documentation-drift component reported PASS with no violations or errors. The live call observed the machine-managed production snapshot and release-state block consistent with manifest authority, including current validation state `PENDING_REAL_LONG_CHAT`, milestone `2.0M`, phase `M2`, checkpoint `M2-6`, and the existing current-priority live gate.

## Acceptance verdict

- MCP server import: PASS
- MCP v2 client call: PASS
- transport/protocol result `is_error`: FALSE
- MCP-04 `ready`: TRUE
- top-level checks: PASS 12/12
- production identity component: PASS
- documentation drift component: PASS
- target validation profile component: PASS
- violations: NONE
- errors: NONE

Verdict: **MCP-04 LIVE PROTOCOL SMOKE PASS**.

This proves the read-only advisory preflight can be invoked through the MCP protocol on the validated Termux environment and can successfully evaluate the live repository authority for target `0.70.11`.

It does not stage, materialize, approve, authorize, dispatch, or deploy a release, and it does not alter HUMAN_EVIDENCE.

## Closeout conditions

Issue #1710 may be closed as completed only after:

1. this evidence PR passes SimCore CI;
2. it is merged to `main`;
3. merged-main SimCore CI passes and no auto-revert occurs;
4. `release-simcore` production identity and latest/install parity remain unchanged.

## Administrative anomaly note

During this closeout session, two accidental stray GitHub issues were created by tool routing. They were immediately preserved and classified as tooling-only routing anomalies with no runtime or production impact, then closed as not planned: #1714 and #1715. They are separate from MCP-04 functionality and do not change this protocol result.
