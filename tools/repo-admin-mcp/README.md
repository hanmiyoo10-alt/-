# Repository Admin MCP

Narrow privileged MCP surface for the canonical repository → private `myang` promotion-writer credential.

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
private_mirror_writer_revoke(expected_key_id, expected_secret_updated_at?)
```

The model-visible surface returns sanitized metadata and bounded reason codes only. It never returns GitHub tokens, App private keys, SSH private keys, environment public-key bytes, encrypted secret ciphertext, Authorization headers, or raw GitHub payloads.

## Bootstrap

Bootstrap runs only from a proven clean absent state.

```text
status
→ read fixed environment public key
→ generate Ed25519 keypair
→ register public half as one enabled write deploy key on myang
→ revalidate no secret + exact new key
→ sealed-box encrypt private half locally
→ PUT only the fixed Actions environment secret
→ metadata readback
→ best-effort scrub app-owned private-key bytearray
```

A secret PUT exception is an ambiguous mutation outcome. The new key is preserved and the tool returns `PARTIAL / SECRET_WRITE_OUTCOME_UNKNOWN`; it never assumes that GitHub did or did not apply the write.

Bootstrap proves metadata shape only. The owning publication workflow remains responsible for behavioral proof that the environment secret actually authenticates.

## Rotation

V1 rotation is deliberately two-phase.

The MCP can safely prepare a replacement:

```text
exact configured metadata
→ create replacement enabled write key
→ revalidate secret timestamp + exact old/new key inventory
→ PUT replacement private half
→ observe post-write metadata/key inventory
→ STOP
```

Even a successful secret PUT plus `updated_at` does not prove the **current secret value** still corresponds to the replacement key when an out-of-band administrator may overwrite the secret. GitHub does not expose secret plaintext or a public-key fingerprint for readback.

Therefore V1 **does not delete the old deploy key from metadata-only evidence**.

A converged replacement preparation returns:

```text
PARTIAL / ROTATION_BEHAVIORAL_PROOF_REQUIRED
proofOwnerIssue = 3675
```

The old key remains installed. There is no metadata cleanup receipt and no hidden caller-controlled override.

Issue #3675 owns the future behavioral proof required before destructive old-key cleanup can be enabled. Until that proof exists, rotation is intentionally fail-closed rather than pretending metadata is stronger evidence than it is.

Other partial rotation outcomes also preserve the old key, including ambiguous secret writes, readback failures, disabled replacement keys, and timestamps that do not advance.

## Revocation

Revocation deletes the fixed secret and matching key only after exact state checks.

Configured revocation requires:

- exactly one matching enabled write key;
- the caller's exact key ID;
- the caller's exact current secret `updatedAt`;
- immediate pre-delete revalidation of secret metadata and key inventory.

After a successful secret DELETE, the tool rechecks secret absence and the exact enabled singleton before deleting the key.

A secret DELETE exception is reported as:

```text
PARTIAL / SECRET_DELETE_OUTCOME_UNKNOWN
```

because GitHub may have applied the DELETE before the response was lost.

A fresh status can then disambiguate:

- one key + no secret → retry revocation with only the exact key ID to complete bounded cleanup;
- exact configured state still present → retry with the freshly observed secret `updatedAt`;
- anything else → fail closed.

This optional timestamp exists only so a proven one-key/no-secret orphan can be cleaned without fabricating a nonexistent secret timestamp.

## Authentication

Mutation requires a GitHub App installed only on the two fixed repositories.

The server mints separate installation tokens:

- mirror token: repository `myang` only, `administration: read/write` as needed;
- canonical token: repository `-` only, `environments: read/write` as needed.

No single runtime installation token carries both repository write permissions.

A separately authorized fine-grained token may be supplied through `REPO_ADMIN_GITHUB_TOKEN` for status/read-only diagnostics only. It is rejected for mutation.

GitHub App runtime variables:

```text
REPO_ADMIN_GITHUB_APP_ID
REPO_ADMIN_GITHUB_INSTALLATION_ID
REPO_ADMIN_GITHUB_APP_PRIVATE_KEY
```

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

- `/health` is the only anonymous endpoint and returns only `{"status":"ok"}`;
- every other HTTP path, including `/mcp`, requires the bearer token;
- use one Railway replica for V1 so the in-process mutation lock represents the complete MCP mutation surface;
- the existing Railway Repo Cockpit project is a separate owner and must remain unchanged.

## Memory custody

The implementation avoids model-visible private-key material and overwrites its app-owned private-key `bytearray` after use. Python and cryptographic libraries may create transient internal copies, so this is best-effort application-level scrubbing rather than a claim of physical memory zeroization.

## Private plugin source

`plugin-src/` contains portable and Codex-compatible plugin identity plus the operating skill. It intentionally has no invented MCP endpoint. Add the real verified Railway streamable-HTTP endpoint only after hosted deployment exists.

## Development validation

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e tools/repo-admin-mcp
python -m compileall -q tools/repo-admin-mcp/repo_admin_mcp
python -m unittest discover -s tools/repo-admin-mcp/tests -v
```

Tests use injected fake GitHub clients and synthetic key material only. No live GitHub deploy key, Actions secret, Railway service, or plugin connection is created by the source test suite.

## Current known blocker

Full destructive rotation cleanup is intentionally disabled pending #3675 behavioral proof. This does not unblock #3669 by itself; the private promotion workflow must still receive and prove the bootstrap credential in the later runtime stage.
