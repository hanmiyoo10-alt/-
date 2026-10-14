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
private_mirror_writer_rotate(expected_key_id, expected_secret_updated_at, cleanup_receipt?)
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

Before the secret PUT is attempted, a later failure may roll back the newly-created deploy key when its identity is unambiguous. **Once the secret PUT is attempted, any request exception is treated as an unknown write outcome:** the deploy key is preserved and bootstrap returns `PARTIAL / SECRET_WRITE_OUTCOME_UNKNOWN`. The operator must reconcile that retained-key state from fresh metadata before retrying; it is never replayed blindly.

### Rotation

Rotation requires the exact currently observed deploy-key ID and secret `updated_at` value. It creates the replacement key, updates the environment secret, proves secret metadata advanced and the replacement key is visible, and only then deletes the prior key.

Once the secret PUT is attempted, **any request exception preserves the replacement key and returns `PARTIAL`**. A transport error cannot prove whether GitHub applied the write, and whole-second metadata timestamps cannot disambiguate a same-second update. If the secret update succeeds but old-key deletion fails, the result is `PARTIAL / OLD_KEY_REVOCATION_PENDING`. After GitHub positively acknowledges the secret PUT, the server immediately issues a signed opaque `cleanupReceipt`; a failed or ambiguous secret PUT never receives that capability. If secret metadata later advances, the receipt is strengthened by binding that observed post-write `updatedAt`. If GitHub keeps the same whole-second timestamp despite a successful PUT, the acknowledged-write receipt still provides bounded recovery evidence. Retry rotation with the returned `cleanupReceipt` plus its returned `secretUpdatedAt`. The receipt is HMAC-authenticated server evidence binding the exact old/new key IDs and pre/post secret metadata, so caller-supplied IDs alone can never authorize old-key deletion. Final rotation returns `PASS` only after a fresh status read proves exactly one enabled replacement key and the advanced secret metadata.

### Revocation

Revocation requires exact current metadata. It deletes the environment secret first and then the exact deploy key. If the secret deletion succeeds but key deletion fails, a retry with the same exact key ID may complete that one-key/no-secret partial state. There is no wildcard or delete-all-key operation.

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
REPO_ADMIN_MCP_RECEIPT_SIGNING_KEY=<32+ byte server-only HMAC key>
PORT=<provided by Railway>
```

- `/health` is the only anonymous endpoint and returns only `{"status":"ok"}`.
- all other HTTP paths, including `/mcp`, require the fixed bearer token;
- deploy one Railway replica for V1 so the in-process mutation lock represents the complete mutation surface;
- the Railway bearer secret is supplied at plugin connection time and must not be embedded in the plugin package;
- the receipt-signing key stays server-side in Railway variables and is never returned through MCP; only opaque signed cleanup receipts are model-visible.

The existing Railway Repo Cockpit project is a separate owner and must not host this service.

## Memory custody

The implementation avoids model-visible private-key material and overwrites its app-owned private-key `bytearray` after use. Python and cryptographic libraries may create transient internal copies, so this is best-effort application-level scrubbing rather than a claim of physical memory zeroization.

## Private plugin source

`plugin-src/` contains the portable plugin identity and operating skill only. The canonical portable manifest remains at `plugin-src/plugin.json`, with a synchronized Codex compatibility overlay at `plugin-src/.codex-plugin/plugin.json`. It intentionally has **no `mcp.json` yet**. Add the verified Railway streamable-HTTP endpoint only after the hosted service exists and has passed authenticated tool discovery. Do not invent or predeclare a placeholder endpoint.

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


### Race and ambiguous-effect handling

- key generation failures are converted to sanitized `BLOCKED` results;
- each deploy-key title includes UTC microseconds so an ambiguous POST can be reconciled against one exact title;
- if a deploy-key POST response is lost, the tool returns `PARTIAL`, attempts an exact-title readback, and removes only that uniquely observed pre-secret key when possible;
- rotation re-reads the fixed secret metadata and matching-key inventory immediately before the secret PUT; any drift aborts before the PUT and removes only the new replacement key;
- partial old-key rotation cleanup is recoverable only with the signed `cleanupReceipt` issued after the server itself observed an advanced secret timestamp; exact IDs without that receipt are insufficient;
- partial revoke-key deletion remains recoverable only through the exact one-key/no-secret state.


### Final policy/race guards

- bootstrap re-reads the fixed secret metadata and matching deploy-key inventory immediately before the first secret PUT; it requires no secret plus exactly the newly created enabled write key;
- revocation re-reads both secret metadata and the matching-key inventory immediately before deletion and requires the exact expected enabled singleton;
- a pending rotation cleanup accepts both the exact two-key retry state and the idempotent one-replacement-key state when the old-key DELETE already succeeded but its response was lost;
- GitHub deploy-key `enabled` is preserved from REST responses. A disabled matching key is never classified as configured, even when it has write access and the secret exists.

### Metadata validity

- a matching environment secret must carry a non-empty string `updated_at`; malformed/missing timestamps fail closed instead of being classified as configured;
- replacement-key readback after secret update requires `enabled=true` before the old key can be revoked.

### Cleanup receipt strength

- an acknowledged successful secret PUT receives an HMAC-signed receipt before any subsequent metadata/key readback;
- if GitHub reports an advanced secret timestamp, a strengthened receipt binds that exact post-write timestamp before replacement-key inventory is read;
- same-second successful PUTs remain recoverable through the acknowledged-write receipt while failed/ambiguous PUTs receive no receipt at all;
- the server-side signing key is never returned; the opaque receipt is the only retry capability.


### Final delete-window guards

- rotation re-reads the fixed secret metadata and exact two-key enabled inventory immediately before deleting the old key; any drift preserves both keys and returns a receipt-bearing PARTIAL result;
- a failed response from the environment-secret DELETE is always treated as an ambiguous mutation outcome, never a clean block. The tool returns `PARTIAL / SECRET_DELETE_OUTCOME_UNKNOWN`, and a fresh status determines whether revocation should retry the configured delete or complete the one-key/no-secret cleanup path.
