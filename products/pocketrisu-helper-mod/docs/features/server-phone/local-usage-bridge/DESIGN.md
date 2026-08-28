# Feature-ID: SERVER-LOCAL-USAGE-BRIDGE

Status: **DESIGN_READY / IMPLEMENTATION_NOT_STARTED**

Date: 2026-08-29

## Goal

Keep the existing Usage Dashboard / DevPass bridge as an independent product and add only a narrow PocketRisu server-side adapter for the data PocketRisu actually needs.

The browser must not need the raw bridge credential and must not need a separate direct connection to the bridge port for this integration.

## Confirmed current boundaries

Inspected PocketRisu personal fork `hanmiyoo10-alt/PocketRisu` and current official `PocketRisu/PocketRisu:develop`.

Relevant PocketRisu surfaces:
- `server/node/server.cjs` already supports feature-owned route modules through `createX(...).registerRoutes(app, { auth, ... })`, e.g. model jobs and request logs.
- `src/ts/storage/nodeStorage.ts` owns NodeOnly authenticated browser -> PocketRisu server requests using server-issued JWTs plus `x-session-id`.
- V3 plugin `nativeFetch` ultimately uses PocketRisu `fetchNative`; sensitive request headers are currently allowed but explicitly warned about.
- `src/ts/network/localNetwork.ts` recognizes localhost/private-network targets, but direct browser local-network fetch still makes the browser/device own that network path.
- PocketRisu already has `/api/request-logs/usage`, but that is PocketRisu's own provider request telemetry. It is not the same contract as LLMGateway/DevPass credits, orgs, runway, or bridge diagnostics.

Existing Usage Dashboard bridge surfaces:
- bridge default `127.0.0.1:39117`
- manager default `127.0.0.1:39119`
- bridge auth header `X-DevPass-Bridge-Key` with legacy-compatible `X-Local-Bridge-Key`
- unauthenticated internal bridge health: `/health`
- authenticated read APIs include `/snapshot`, `/activity`, `/analytics`, `/orgs`, `/usage-scopes`, `/analytics-scopes`
- original plugin calls the bridge with `Risuai.nativeFetch(...)`

## Chosen architecture

```text
📱 메인폰 Firefox
        |
        | existing PocketRisu SSH/core path only
        v
📱 서버폰 PocketRisu :6001
        |
        | authenticated same-origin PocketRisu API
        v
server/node/local-usage-adapter.cjs
        |
        | exact allowlisted localhost requests
        | bridge token added only here
        v
127.0.0.1:39117 Usage/DevPass Bridge
        |
        v
LLMGateway / DevPass sources
```

The PocketRisu adapter is a dependency boundary, not a copy of the whole Usage Dashboard runtime.

## Why server-side instead of plugin -> bridge direct

1. The bridge token does not need to live in PocketRisu browser/plugin storage.
2. `127.0.0.1` is unambiguous: it means the server phone from PocketRisu's Node process.
3. No new browser-facing bridge tunnel is required for PocketRisu integration.
4. Bridge failure can be reported as an optional dependency failure without changing PocketRisu core health.
5. The adapter can strictly allowlist routes and query parameters instead of becoming an arbitrary localhost proxy.

## Server module boundary

Proposed source file:

```text
server/node/local-usage-adapter.cjs
```

Proposed factory shape, following existing PocketRisu server modules:

```text
createLocalUsageAdapter({
  baseUrl,
  tokenProvider,
  timeoutMs,
  logger,
}).registerRoutes(app, { auth })
```

Do not place the bridge implementation inside `server.cjs`. `server.cjs` should only construct/register the module.

## PocketRisu API v1

Phase 1 is read-only.

### `GET /api/local-usage/health`

Outer PocketRisu auth: required.

Behavior:
- call internal bridge `/health`
- never include the bridge token
- return adapter/dependency status separately
- do not make failure affect PocketRisu `/api/health`

Suggested response:

```json
{
  "ok": true,
  "dependency": "local-usage-bridge",
  "bridge": {
    "ok": true,
    "version": "...",
    "protocolVersion": "..."
  }
}
```

### `GET /api/local-usage/snapshot`

Outer PocketRisu auth: required.

Allowlisted query only:
- `profile=light|full`
- optional `creditsOrgId`, length-bounded

Adapter calls bridge `/snapshot`, injecting the bridge token server-side.

No arbitrary upstream path, URL, header, method, or body may be supplied by the browser.

## Deferred API

Add only after snapshot use proves useful:
- `/api/local-usage/activity`
- `/api/local-usage/analytics`
- `/api/local-usage/orgs`
- `/api/local-usage/usage-scopes`
- `/api/local-usage/analytics-scopes`

Bridge Manager `:39119` mutation/control APIs are explicitly out of phase 1. No automatic sync, adopt, restart, update, or runtime ownership changes.

## Credential ownership

The browser never receives the raw bridge token.

Preferred configuration:
- server-side token provider reads the existing bridge token from a configured local file path or environment-provided secret location
- token value is never committed
- token value is never returned in API responses
- token-bearing headers are never written to PocketRisu logs

Do not silently copy the token into PocketRisu DB/plugin storage.

## Failure mapping

Dependency failure must be structured and isolated.

Recommended mapping:
- bridge unreachable / timeout -> `503 LOCAL_USAGE_UNAVAILABLE`
- bridge internal auth failure -> `502 LOCAL_USAGE_AUTH_FAILED`
- malformed bridge JSON -> `502 LOCAL_USAGE_BAD_RESPONSE`
- invalid outer PocketRisu auth -> existing PocketRisu auth response
- invalid client query -> `400 LOCAL_USAGE_BAD_REQUEST`

Do not include token, credential file path, LLMGateway cookie/session/config contents, or raw sensitive headers in errors.

## Timeout / resource policy

- short bounded connection/request timeout; initial target 2-3 seconds
- no unbounded retries inside a single browser request
- adapter does not add a second circuit breaker in phase 1 because the existing bridge already owns its dependency/cache/circuit behavior
- response size should be bounded before parsing/forwarding if the bridge contract grows unexpectedly

## Relationship to PocketRisu request logs

Keep these domains separate:

```text
/api/request-logs/usage
  = usage measured from PocketRisu's own provider requests

/api/local-usage/*
  = LLMGateway/DevPass/credits/org/bridge-backed external usage state
```

Do not merge the databases or pretend one source is authoritative for the other.

## Frontend boundary

Backend PR does not add a large UI panel.

First client validation may use a tiny authenticated caller to the same-origin PocketRisu route. If UI is later desired, create a separate UI Feature-ID/PR.

Do not reuse V3 plugin `nativeFetch` to send the raw bridge token from the browser when the server adapter exists.

## Validation before implementation merge

Unit tests with a fake local bridge on an ephemeral port:
1. valid health passthrough
2. valid authenticated snapshot passthrough
3. bridge token inserted internally and absent from returned JSON
4. no arbitrary path forwarding
5. invalid `profile`/oversized `creditsOrgId` rejected before dependency call
6. timeout returns structured 503
7. bridge 401 maps to internal dependency-auth failure without leaking token
8. malformed/oversized dependency response is rejected safely
9. adapter failure does not alter PocketRisu core health
10. no Android notification behavior on server phone

## Rollout order

1. INSPECT_ONLY/runtime verification: confirm bridge is actually listening on the server phone and identify the existing token-file ownership without printing the token.
2. Add `local-usage-adapter.cjs` + isolated tests in personal fork branch.
3. Register only health + snapshot routes.
4. Verify auth/failure isolation locally.
5. No deployment until code review/checks pass.
6. Add optional UI separately.
7. Add further read endpoints only from demonstrated need.

## Later internalization option

If maintaining the separate bridge process becomes a proven operational burden, a later Feature-ID may selectively port bridge acquisition/cache logic into PocketRisu. That is not this feature.

Any such move must preserve the existing Usage Dashboard project and its contracts, and must not be disguised as a small adapter PR.
