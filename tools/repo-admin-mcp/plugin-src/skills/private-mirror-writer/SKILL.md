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
2. Treat `UNKNOWN` and `CONFLICT` as fail-closed. Treat `PARTIAL` as fail-closed unless that exact rotation result contains an opaque `cleanupReceipt`; a receipt-bearing partial authorizes only the bounded cleanup retry described below, never a new rotation.
3. Call `private_mirror_writer_bootstrap()` only when status proves `ABSENT`.
4. `CONFIGURED_METADATA_ONLY` proves GitHub-side metadata shape only. It does not prove SSH publication behavior. The owning publication workflow remains responsible for behavioral proof.
5. For rotation or revocation, carry exact observed metadata. If any rotation partial contains `cleanupReceipt` (including `OLD_KEY_REVOCATION_PENDING`, `SECRET_METADATA_NOT_ADVANCED`, `SECRET_METADATA_READBACK_UNKNOWN`, replacement-key readback partials, or `ROTATION_CLEANUP_RECEIPT_STRENGTHENED`), call status again and retry rotation only with the original old-key ID, the fresh fixed-secret `updatedAt`, and that exact receipt. If the tool returns a strengthened receipt, repeat the same bounded cleanup flow with the new receipt. Never synthesize cleanup from key IDs or reuse stale timestamps.
6. If revocation returns `SECRET_DELETE_OUTCOME_UNKNOWN`, call status again. If the secret is absent with the same exact key remaining, retry revocation with that key ID to complete cleanup. If the exact configured state still exists, retry only with the freshly observed fixed-secret `updatedAt`. If revocation returns `DEPLOY_KEY_REVOCATION_PENDING`, retry revocation with the same exact key ID; the tool accepts only the one-key/no-secret partial state. After any mutation, read status again before handing control to another workflow.
7. Never request, display, reconstruct, copy, persist, or log GitHub tokens, App private keys, SSH private keys, environment public-key bytes, sealed ciphertext, Authorization headers, or cleanup receipts outside the active retry flow.

## Boundaries

This skill does not authorize:
- arbitrary GitHub administration;
- another repository, environment, secret, or deploy key family;
- Cloudflare deployment;
- repository visibility changes;
- consumer URL changes;
- release or production mutation.

The owning repository, CI, release, and project authorities remain authoritative.
