---
name: private-mirror-writer
description: >
  Inspect and operate the fixed canonical-to-myang private mirror writer credential.
  Use when private promotion is blocked by its writer credential, when rotating or
  revoking that credential, or when checking its sanitized metadata state.
---

# Private mirror writer

Use the Nyang Repository Admin MCP only for the fixed private-mirror writer lifecycle.

## Procedure

1. Call `private_mirror_writer_status()` first.
2. Treat `UNKNOWN`, `PARTIAL`, or `CONFLICT` as fail-closed. Do not mutate until the exact state is resolved.
3. Call `private_mirror_writer_bootstrap()` only when status proves `ABSENT`.
4. `CONFIGURED_METADATA_ONLY` proves GitHub-side metadata shape only. It does not prove SSH publication behavior. The owning publication workflow remains responsible for behavioral proof.
5. For rotation or revocation, carry the exact observed deploy-key ID and secret `updatedAt` into the mutation call. If rotation returns `OLD_KEY_REVOCATION_PENDING`, retry only with its returned opaque `cleanupReceipt` and its returned `secretUpdatedAt`. Never try to synthesize cleanup from key IDs alone. Never guess or reuse stale metadata.
6. If revocation returns `DEPLOY_KEY_REVOCATION_PENDING`, retry revocation with the same exact key ID; the tool accepts only the one-key/no-secret partial state. After any mutation, read status again before handing control to another workflow.
7. Never request, display, reconstruct, copy, persist, or log GitHub tokens, App private keys, SSH private keys, environment public-key bytes, sealed ciphertext, or Authorization headers.

## Boundaries

This skill does not authorize:
- arbitrary GitHub administration;
- another repository, environment, secret, or deploy key family;
- Cloudflare deployment;
- repository visibility changes;
- consumer URL changes;
- release or production mutation.

The owning repository, CI, release, and project authorities remain authoritative.
