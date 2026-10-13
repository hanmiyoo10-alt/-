# Repository Admin MCP

Narrow privileged MCP surface for one credential lifecycle only: the private promotion writer from the canonical repository to the private `myang` mirror.

This is intentionally **not** a generic GitHub admin client.

## Fixed scope

The server is hard-wired to:

- canonical repository: `hanmiyoo10-alt/-`
- mirror repository: `hanmiyoo10-alt/myang`
- canonical environment: `public-distribution-publisher`
- Actions secret: `MYANG_DISTRIBUTION_SSH_KEY`
- matching deploy-key title prefix: `myang-private-promotion-writer`

Callers cannot supply another repository, environment, secret name, REST path, HTTP method, or arbitrary GitHub payload.

## Tools

```text
private_mirror_writer_status()
private_mirror_writer_bootstrap()
private_mirror_writer_rotate(expected_key_id, expected_secret_updated_at)
private_mirror_writer_revoke(expected_key_id, expected_secret_updated_at)
```

The model-visible surface returns sanitized metadata and bounded reason codes only. It never returns GitHub tokens, App private keys, SSH private keys, environment public-key bytes, encrypted secret ciphertext, Authorization headers, or raw GitHub payloads.

## Credential lifecycle

### Bootstrap

Bootstrap runs only from a proven clean absent state.

```text
status
→ read fixed environment public key
→ generate Ed25519 keypair
→ register public half as one write deploy key on myang
→ sealed-box encrypt private half locally
→ write only the fixed Actions environment secret
→ read back metadata
→ best-effort scrub app-owned plaintext bytearray
```

If the secret write fails after creating the deploy key, the server deletes that newly-created key when its identity is unambiguous. Ambiguous or failed compensation remains `PARTIAL`; it is never replayed blindly.

### Rotation

Rotation requires the exact currently observed deploy-key ID and secret `updated_at` value. It creates the replacement key, updates the environment secret, proves secret metadata advanced and the replacement key is visible, and only then deletes the prior key.

Once the secret PUT is attempted, **any request exception preserves the replacement key and returns `PARTIAL`**. A transport error cannot prove whether GitHub applied the write, and whole-second metadata timestamps cannot disambiguate a same-second update. If the secret update succeeds but old-key deletion fails, the result is `PARTIAL / OLD_KEY_REVOCATION_PENDING`. Final rotation returns `PASS` only after a fresh status read proves exactly one replacement key and the advanced secret metadata.

### Revocation

Revocation requires exact current metadata. It deletes the environment secret first and then the exact deploy key. There is no wildcard or delete-all-key operation.

## Authentication

Production preference is a GitHub App installed only on the two fixed repositories. The server mints **separate installation tokens** so each runtime request carries only the permission required by its owner:

- mirror token: repository `myang` only, `administration: read` for status or `administration: write` for mutation;
- canonical token: repository `-` only, `environments: read` for status or `environments: write` for mutation.

No single runtime installation token carries both repository write permissions.

A separately authorized fine-grained token may be supplied through `REPO_ADMIN_GITHUB_TOKEN` for **status/read-only diagnostics only**. Bootstrap, rotation, and revocation require GitHub App authentication. This prevents durable deploy keys from being coupled to the lifetime of a personal access token. Credential material belongs in the runtime secret store, never in Git, plugin archives, tests, issues, or MCP results.

GitHub App runtime variables:

```text
REPO_ADMIN_GITHUB_APP_ID
REPO_ADMIN_GITHUB_INSTALLATION_ID
REPO_ADMIN_GITHUB_APP_PRIVATE_KEY
```

Status-only diagnostic token variable:

```text
REPO_ADMIN_GITHUB_TOKEN
```

The status-only token is never accepted for credential mutation.

## Transport and Railway

Local development defaults to stdio:

```bash
repo-admin-mcp
```

Railway uses streamable HTTP:

```text
REPO_ADMIN_MCP_TRANSPORT=streamable-http
REPO_ADMIN_MCP_ACCESS_TOKEN=<connection-only bearer secret>
PORT=<provided by Railway>
```

- `/health` is the only anonymous endpoint and returns only `{"status":"ok"}`.
- all other HTTP paths, including `/mcp`, require the fixed bearer token;
- deploy one Railway replica for V1 so the in-process mutation lock represents the complete mutation surface;
- the Railway bearer secret is supplied at plugin connection time and must not be embedded in the plugin package.

The existing Railway Repo Cockpit project is a separate owner and must not host this service.

## Memory custody

The implementation avoids model-visible private-key material and overwrites its app-owned private-key `bytearray` after use. Python and cryptographic libraries may create transient internal copies, so this is best-effort application-level scrubbing rather than a claim of physical memory zeroization.

## Private plugin source

`plugin-src/` contains the portable plugin identity and operating skill only. It intentionally has **no `mcp.json` yet**. Add the verified Railway streamable-HTTP endpoint only after the hosted service exists and has passed authenticated tool discovery. Do not invent or predeclare a placeholder endpoint.

## Development validation

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e tools/repo-admin-mcp
python -m compileall -q tools/repo-admin-mcp/repo_admin_mcp
python -m unittest discover -s tools/repo-admin-mcp/tests -v
```

Tests use an injected fake GitHub client and synthetic key material only. No live GitHub mutation is part of the source test suite.


### Fail-closed delete and authentication semantics

- a secret DELETE `404` is not treated as proof of absence because GitHub may use `404` to conceal private resources when authentication or permission is insufficient;
- revocation therefore keeps the deploy key whenever secret deletion is not positively confirmed;
- missing/partial GitHub App configuration is returned as a sanitized MCP `UNKNOWN` or `BLOCKED` result rather than an unhandled tool exception.
