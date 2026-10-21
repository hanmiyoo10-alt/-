# Repo Cockpit Aggregator

Read-only repository-status adapter for the fixed canonical repository:

`hanmiyoo10-alt/-`

Canonicalized from `hanmiyoo10-alt/myang@3297a5745740ebb7962d875c5fa96ba8806c7e32` after review findings on the byte-identical relocation candidate.

## Authority boundary

Repo Cockpit is a transport and presentation adapter only.

It reads direct `main` and issue #485 for repository status, and it can read a bounded exact-SHA inventory of push-triggered GitHub Actions runs. It preserves source identities and returns bounded derived status. It does not own repository, CI/Required, release, production, runtime, device, or Idea Hub truth.

It exposes no GitHub write, generic GraphQL/HTTP passthrough, caller-selected repository, branch/ref mutation, workflow dispatch, merge, release, production, or device effect.

## GitHub read authentication

Runtime GitHub REST reads require one dedicated environment variable:

`GITHUB_REPO_READ_TOKEN`

The service has no anonymous GitHub REST fallback.

The token must be separately provisioned with least privilege for read access to the fixed repository. This source packet does not provision or deploy that credential.

The service deliberately does not read `GITHUB_TOKEN`, invoke `gh auth token`, read token files, or return/log the credential.

Missing authentication, or a GitHub 401/403 authentication/permission rejection, fails closed as `BLOCKED_CAPABILITY`.

## Status capture

The snapshot sequence is fixed:

`direct main(first) → #485 → direct main(second)`

PASS eligibility requires both direct-main SHAs to be valid and equal, #485 to be an open issue, the capsule to contain all required fields, and the rendered main SHA to match the stable direct main.

Required capsule evidence includes:
- operator STATE;
- rendered main + Required run;
- convergence;
- production projection;
- Native protection projection;
- explicit UNKNOWN field.

The parser requires exactly one bounded `## Canonical Operator Capsule` with the canonical ordered rows `STATE / MAIN / CHANGE / WHY / NEXT / AUTHORITY / UNKNOWN`. Production and native-protection projection come only from the capsule `AUTHORITY` row, while convergence comes from the immediately following canonical summary-compat block. Stale or unrelated rows elsewhere in issue #485 cannot satisfy capsule completeness.

Main movement, closed/invalid #485, malformed/duplicate/incomplete capsule evidence, or missing required evidence remains UNKNOWN. A rendered-main mismatch or protection disagreement is promoted to a specialized stale/conflict state only after completeness has been proven, so incomplete evidence is never downgraded from UNKNOWN.

## HTTP / MCP safety

`GET /healthz` is local service health and does not require GitHub credentials or network access.

`GET /snapshot`, MCP `repo_snapshot`, and MCP `repo_push_runs` use the authenticated fixed-repository reader.

Authenticated snapshot execution is bounded by one shared per-process gate across its HTTP and MCP surfaces: at most 6 snapshot executions per 60 seconds by default. Push-run inventory has a separate gate of at most 6 executions per 60 seconds by default. Rejected excess requests perform zero additional GitHub reads. The service does not replay cached status or run inventory to satisfy either guard.

MCP request bodies are accumulated as bytes and decoded once as UTF-8, so multibyte characters remain intact across HTTP chunk boundaries. Before a body is read or dispatched, an `Origin` header, when present, must resolve to the configured public domain or a loopback host. Untrusted or malformed origins fail with HTTP 403.

Bodies must decode to a valid JSON-RPC 2.0 request object with a non-empty string method, valid string/number/null identifier when present, and object/array params when present. Invalid request objects return JSON-RPC `-32600 Invalid Request` before dispatch. Malformed JSON keeps parse-error behavior, while valid JSON-RPC notifications omit `id` and receive HTTP 202 with no response body.

The initialize handshake supports protocol revision `2025-06-18`. Initialize params must include a non-empty `protocolVersion`, an object `capabilities`, and `clientInfo` with non-empty `name` and `version`; incomplete params return `-32602`. A client requesting another handshake revision receives `2025-06-18` as the server's supported counter-offer rather than an echoed unsupported value. For subsequent MCP requests, an `MCP-Protocol-Version` header may be omitted for compatibility, but when present it must equal `2025-06-18`; unsupported values fail with HTTP 400 before dispatch or GitHub reads.

The public MCP tools are `repo_snapshot` and `repo_push_runs`.

`repo_snapshot` arguments must be absent or exactly an empty object matching the advertised schema, otherwise the request returns `-32602` before consuming snapshot allowance or GitHub reads. Canonical convergence parsing accepts bare `STABLE` and the repository renderer's detailed `SETTLING` form, including its optional `STALE` suffix and bounded waiting/age detail.

`repo_push_runs` accepts only an optional full 40-hex `sha`. When omitted, the service reads direct current `main` exactly once and then queries GitHub Actions with fixed `head_sha=<resolved-main>&event=push&per_page=100`. When supplied, no main lookup occurs. The response is a compact projection of run/workflow identity, exact head SHA, branch, push event, status/conclusion, run number/attempt, and GitHub run locator. Complete zero results are known-zero observation for that SHA; malformed, incomplete, over-bound, SHA-mismatched, or non-push inventory fails closed. This read never becomes Required, release, or production authority.

## Deployment boundary

Repository implementation and validation do not mutate Railway.

The current Railway source/root, existing staged patch, credential provisioning, and later private-repository cutover are separate effects owned by later work under #3436.

Do not embed a broad PAT, host `gh` token, or another reusable credential in source, plugin files, logs, receipts, or distributed artifacts.

## Validation

```sh
npm test
node --check src/server.mjs
```

Tests use fake GitHub transport and localhost HTTP only. They require no live GitHub credential and perform no GitHub mutation.
