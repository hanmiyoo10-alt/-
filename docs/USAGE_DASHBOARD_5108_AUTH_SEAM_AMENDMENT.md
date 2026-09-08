# Local Usage Dashboard 5.108 — Authenticated Capture Seam Amendment

Date: 2026-09-08 KST  
Feature authority: #1899  
Supersedes only the ambiguous `no new CLI operation` wording in the issue/source-truth addendum. All other 5.108 frozen truth/privacy/UI/release boundaries remain unchanged.

## Implementation-time finding

Fresh current Engine readback shows the safe authenticated read pattern already proven by Credits Gateway Limits:

```text
Engine parent
-> managed/direct existing CLI `orgs list --json` session
-> capture tap observes the authenticated official origin/request headers in child memory
-> capture tap performs one bounded extra authenticated GET
-> immediate sanitizer/projection
-> capture file contains only bounded sanitized result
-> parent Engine cache/local route
```

The parent Engine intentionally does not retain or expose the authenticated upstream headers/session. Therefore fetching `/keys/api` directly from the parent without a capture session would weaken the existing credential boundary.

## Corrected I/O contract

5.108 authorizes:

- **no new CLI command family**;
- **no new CLI package/runtime/credential owner**;
- reuse of the existing `orgs list --json` authenticated capture session pattern for a lazy API-key plan-limit cache fill;
- at most one such lazy capture-session fill per exact project cache key inside the >=5 minute source TTL, subject to existing single-flight/circuit behavior;
- the extra upstream request inside that session is only `GET /keys/api?projectId=<exact>&filter=mine`;
- only `planLimits.currentCount` and `planLimits.maxKeys` may cross the capture boundary.

This means a cache miss may create an **additional invocation of the already-owned `orgs list --json` command**. That invocation is allowed and must be observable through existing CLI timing/launcher diagnostics rather than hidden.

## Still forbidden

- adding a new CLI subcommand or helper executable;
- placing `/keys/api` on the normal 60-second snapshot path;
- polling it periodically;
- forwarding upstream auth headers/session material to Plugin state;
- persisting auth/session material;
- keeping returned API-key rows, IDs, masked tokens, creator/IAM/budget metadata or `plan`;
- bypassing the capture seam with a second credential owner;
- retries outside existing bounded cache/single-flight/circuit rules.

## Why this is narrower and safer

Alternative designs were rejected:

1. **Parent Engine direct fetch** would require exporting/reusing authentication material outside the proven child capture seam.
2. **Normal snapshot piggyback** would turn a lazy >=5 minute source into recurring foreground work.
3. **New dedicated CLI command** would add a new command/ownership surface when the existing authenticated session is sufficient.

The amended boundary therefore preserves the original design goals: lazy read, five-minute minimum source freshness, no secret expansion, no new command family, and fail-closed UNKNOWN.

## Regression amendment

P75 must additionally prove:

- the source cache fill reuses `orgs list --json` through the existing capture tap;
- no new CLI command family is introduced;
- the extra existing-command invocation occurs only on bounded lazy cache fill, never every snapshot;
- existing CLI diagnostics can account for the invocation;
- auth/session headers remain child-memory-only and are absent from capture output, Plugin state, persistence and Diagnostics.

## Physical acceptance impact

None. Physical acceptance remains normal `+` update, DevPass `API Keys · 조직 한도` screenshot and bounded `API key org limit` Diagnostics. No API-key mutation or artificial traffic is required.
