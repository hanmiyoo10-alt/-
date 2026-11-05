---
name: private-mirror-writer
description: >
  Inspect and operate the fixed canonical-to-myang private mirror writer credential.
  Use when private promotion is blocked by its writer credential, when preparing a
  replacement, revoking the credential, or checking its sanitized metadata state.
---

# Private mirror writer

Use the Nyang Repository Admin MCP only for the fixed private-mirror writer lifecycle.

## Procedure

1. Call `private_mirror_writer_status()` first.
2. Treat `UNKNOWN`, `CONFLICT`, and `PARTIAL` as fail-closed unless this procedure explicitly names a bounded retry.
3. Call `private_mirror_writer_bootstrap()` only when status proves `ABSENT`.
4. `CONFIGURED_METADATA_ONLY` proves GitHub-side metadata shape only. It does not prove SSH publication behavior. The owning publication workflow remains responsible for behavioral proof.
5. Call `private_mirror_writer_rotate(old_key_id, secret_updated_at)` only from the exact one-key configured state. V1 rotation prepares a replacement but must return `PARTIAL / ROTATION_BEHAVIORAL_PROOF_REQUIRED` instead of deleting the old key when replacement metadata converges. Do not delete or ask another tool to delete the old key from metadata-only evidence. #3675 owns the missing behavioral proof.
6. For `SECRET_DELETE_OUTCOME_UNKNOWN`, call status again. If the fixed secret is absent with the same exact enabled key remaining, retry `private_mirror_writer_revoke(key_id)` without inventing a timestamp. If the exact configured state still exists, retry only with the freshly observed fixed-secret `updatedAt`.
7. For `DEPLOY_KEY_REVOCATION_PENDING`, call status again and retry revocation only when it proves the exact one-key/no-secret cleanup state.
8. After any mutation, call status again before handing control to another workflow.
9. Never request, display, reconstruct, copy, persist, or log GitHub tokens, App private keys, SSH private keys, environment public-key bytes, sealed ciphertext, or Authorization headers.

## Boundaries

This skill does not authorize:
- arbitrary GitHub administration;
- another repository, environment, secret, or deploy-key family;
- metadata-only deletion of an old rotation key;
- Cloudflare deployment;
- repository visibility changes;
- consumer URL changes;
- release or production mutation.

The owning repository, CI, release, and project authorities remain authoritative.
