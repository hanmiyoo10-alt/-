# Repo Cockpit Aggregator

Read-only repository-status adapter for the fixed canonical repository:

`hanmiyoo10-alt/-`

Canonicalized from `hanmiyoo10-alt/myang@3297a5745740ebb7962d875c5fa96ba8806c7e32` after review findings on the byte-identical relocation candidate.

## Authority boundary

Repo Cockpit is a transport and presentation adapter only.

It reads direct `main` and issue #485, preserves their source identities, and returns bounded derived status. It does not own repository, release, production, runtime, device, or Idea Hub truth.

It exposes no GitHub write, generic GraphQL/HTTP passthrough, caller-selected repository, branch/ref mutation, workflow dispatch, merge, release, production, or device effect.

## GitHub read authentication

Runtime GitHub REST reads require one dedicated environment variable:

`GITHUB_REPO_READ_TOKEN`

The service has no anonymous GitHub REST fallback.

The token must be separately provisioned with least privilege for read access to the fixed repository. This source packet does not provision or deploy that credential.

The service deliberately does not read `GITHUB_TOKEN`, invoke `gh auth token`, read token files, or return/log the credential.

Missing authentication fails closed before any GitHub network call.

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

Main movement, closed/invalid #485, or missing required evidence remains UNKNOWN.

## HTTP / MCP safety

`GET /healthz` is local service health and does not require GitHub credentials or network access.

`GET /snapshot` and MCP `repo_snapshot` use the authenticated fixed-repository reader.

MCP request bodies must decode to a non-null JSON object. Scalars, arrays, and `null` return JSON-RPC `-32600 Invalid Request` instead of reaching method dispatch.

Malformed JSON keeps JSON-RPC parse-error behavior.

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
