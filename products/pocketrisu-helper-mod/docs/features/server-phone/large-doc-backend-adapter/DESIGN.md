# Feature-ID: SERVER-LARGE-DOC-BACKEND-ADAPTER

Status: **DESIGN_READY / READ_ONLY_FIRST / IMPLEMENTATION_NOT_STARTED**

Date: 2026-08-29

## Goal

Keep `plugins/termux/large-doc-editor` as an independent working feature while giving PocketRisu a narrow, authenticated server-side path to the same large-document capabilities.

The first PocketRisu integration is intentionally read-only. Editing/saving is a later phase after the session and conflict semantics are proven through the adapter.

## Confirmed source contract

Original backend:
- `plugins/termux/large-doc-editor/server.py`
- binds `127.0.0.1:8765`
- configured workspace root
- allowed suffixes `.txt`, `.md`, `.log`, `.json`
- per-open opaque document session
- default chunk size 12,000 characters
- request JSON cap 2,000,000 bytes
- source-change conflict support (`SOURCE_CHANGED`)

Original routes:
- `GET /api/files`
- `POST /api/open`
- `GET /api/chunk?session=...&index=...`
- `POST /api/chunk`
- `POST /api/save`

The original `/api/files` response includes the absolute workspace path. PocketRisu must not forward that field to the browser.

## Confirmed PocketRisu boundaries

- `server/node/server.cjs` already registers independent route modules such as model jobs and request logs; new large-doc logic should follow that pattern rather than expanding one giant route block.
- NodeOnly browser requests already have authenticated same-origin server semantics through `src/ts/storage/nodeStorage.ts`.
- Existing PocketRisu `/api/read`, `/api/write`, `/api/list` operate on PocketRisu's own KV/file abstraction and are not an arbitrary host filesystem editor. Large-doc must not be smuggled through those routes.
- Writes in NodeOnly can additionally use the existing active-session/write-lock boundary. Large-doc write support should respect that boundary when it is eventually enabled.

## Chosen architecture

Phase 1 reuses the proven localhost large-doc service through a PocketRisu adapter. It does not port Python logic into `server.cjs` yet.

```text
📱 메인폰 Firefox
        |
        | existing PocketRisu connection only
        v
📱 서버폰 PocketRisu :6001
        |
        | authenticated same-origin API
        v
server/node/large-doc-adapter.cjs
        |
        | exact allowlisted localhost calls
        v
127.0.0.1:8765 large-doc-editor
        |
        v
configured workspace only
```

This preserves the existing editor and gives us a compatibility contract before considering a language/runtime port.

## Why proxy/reuse first instead of immediate Python -> Node rewrite

1. The existing path/session/chunk/source-change behavior is already implemented and can act as the reference oracle.
2. Rewriting it immediately would combine integration risk and behavior-port risk in one PR.
3. A server-side adapter proves the PocketRisu UX/API boundary with a very small blast radius.
4. If a later Node-native port is desired, compatibility tests can compare it against the established adapter contract.
5. Original large-doc-editor remains independently usable throughout.

## Server module boundary

Proposed source file:

```text
server/node/large-doc-adapter.cjs
```

Proposed shape:

```text
createLargeDocAdapter({
  baseUrl,
  timeoutMs,
  logger,
}).registerRoutes(app, { auth, activeSession })
```

`server.cjs` should only construct/register it.

## PocketRisu API v1 — read-only

### `GET /api/large-doc/files`

Outer PocketRisu auth: required.

Adapter calls original `GET /api/files` but returns only:

```json
{
  "files": ["relative/path.md"]
}
```

Never return the backend's absolute `workspace` value.

Additional outer validation:
- cap number of returned paths
- only relative normalized paths
- only known allowed suffixes
- reject/suppress absolute paths or traversal-looking entries even if the dependency misbehaves

### `POST /api/large-doc/open`

Outer PocketRisu auth: required.

Body:

```json
{
  "path": "relative/path.md"
}
```

Rules:
- relative path only
- no `..` path segment
- no absolute path
- allowed suffix only
- length bound

Adapter forwards the normalized relative path to original `/api/open`.

Return only the opaque session and document size metadata:

```json
{
  "session": "opaque-session-id",
  "path": "relative/path.md",
  "chunkCount": 10,
  "characterCount": 98765
}
```

### `GET /api/large-doc/chunk`

Outer PocketRisu auth: required.

Allowlisted query:
- `session`: bounded opaque identifier
- `index`: integer >= 0 with a reasonable upper bound

Return:

```json
{
  "index": 0,
  "text": "...",
  "chunkCount": 10,
  "dirty": false
}
```

Phase 1 rejects/does not register PocketRisu write/save routes.

## Phase 2 — explicit editing only after read-only proof

Later routes may be:
- `POST /api/large-doc/chunk`
- `POST /api/large-doc/save`

Additional requirements before enabling them:
- outer PocketRisu `auth`
- PocketRisu `activeSession`/writer-lock guard
- strict request size cap at least as strong as the original backend
- preserve `SOURCE_CHANGED` as HTTP 409
- no automatic save
- user-visible explicit save semantics
- tests proving a stale source cannot be overwritten

## Error mapping

Recommended structured errors:
- dependency unreachable/timeout -> `503 LARGE_DOC_UNAVAILABLE`
- file not found -> `404 LARGE_DOC_FILE_NOT_FOUND`
- invalid/traversal path -> `400 LARGE_DOC_BAD_PATH`
- unknown/restarted dependency session -> `409 LARGE_DOC_SESSION_EXPIRED`
- bad chunk index -> `400 LARGE_DOC_BAD_INDEX`
- original `SOURCE_CHANGED` -> `409 LARGE_DOC_SOURCE_CHANGED`
- malformed/oversized dependency response -> `502 LARGE_DOC_BAD_RESPONSE`

Do not convert dependency failure into PocketRisu core health failure.

## Session lifecycle

The original backend owns document sessions in memory. Therefore:
- PocketRisu adapter treats the session id as opaque
- adapter must not persist sessions into PocketRisu DB
- a large-doc service restart invalidates old sessions
- client should reopen the document instead of guessing/reconstructing session state
- no silent retry of writes against a newly opened session

This restart behavior is part of the contract, not a PocketRisu crash.

## Workspace ownership

The browser may choose only a relative file within the already-configured server-side workspace.

The browser must never provide:
- workspace root
- host absolute path
- alternate filesystem root
- arbitrary URL

PocketRisu adapter is not a generic file browser.

## Security / privacy

- keep `:8765` localhost-only
- no new SSH forward is required for the PocketRisu integration path
- strip absolute workspace path from dependency responses
- exact route allowlist only; never implement `/{path...}` transparent proxying
- cap input strings and response body sizes
- logs use relative path only and should avoid document body/chunk text by default
- no server-phone Android notifications

## Relationship to PocketRisu storage

Do not reuse these routes for large-doc workspace access:
- `/api/read`
- `/api/write`
- `/api/list`
- PocketRisu KV/chunk-store persistence

Those own PocketRisu application data. Large-doc owns an external configured workspace and must remain independently diagnosable.

## Frontend boundary

Backend PR first. No full editor UI in the same PR.

Initial client proof should be minimal:
1. list files
2. select one
3. open
4. read chunks

A full editor surface, search/navigation, autosave, syntax UI, etc. requires a separate UI Feature-ID.

## Validation before implementation merge

Use a fake dependency server on an ephemeral port plus compatibility fixtures from the Python backend.

Tests:
1. files list strips `workspace`
2. traversal/absolute path rejected before dependency call
3. extension allowlist enforced
4. open maps session/metadata only
5. chunk index validation
6. unknown session structured as expired/conflict
7. dependency timeout isolated as 503
8. malformed/oversized response rejected
9. no chunk text emitted to logs by default
10. phase-1 server exposes no write/save route
11. later write tests preserve `SOURCE_CHANGED` 409 and active-session guard
12. core PocketRisu health remains healthy if large-doc dependency is down

## Rollout order

1. INSPECT_ONLY runtime check: confirm whether large-doc service currently runs on server phone and which workspace it owns; do not expose workspace contents unnecessarily.
2. Personal-fork branch for this Feature-ID only.
3. Add `large-doc-adapter.cjs` + isolated tests.
4. Register read-only files/open/chunk routes.
5. Validate through existing PocketRisu auth path.
6. Keep write/save disabled during real-use soak.
7. Add write/save in a separate PR or clearly separate phase only after explicit approval and source-change tests.

## Later Node-native port option

If the extra Python service is later proven to be an operational burden, create a new implementation phase that ports only the reference semantics:
- workspace path confinement
- file enumeration allowlist
- `DocumentSession` chunk model
- dirty state
- source fingerprint/change conflict
- explicit save

The Node-native implementation must pass the same contract fixtures before replacing the proxy adapter. The original large-doc-editor remains maintained independently and is not deleted as part of the PocketRisu port.
