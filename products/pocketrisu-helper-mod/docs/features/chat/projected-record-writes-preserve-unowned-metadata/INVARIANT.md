# PROJECTED-RECORD-WRITES-PRESERVE-UNOWNED-METADATA

Status: ADOPTED invariant
Source: `PocketRisu/PocketRisu@86f2fe41f109662438e4686bffcf190f67de4741`

## Problem / evidence

The scripting `setFullChat` compatibility surface accepted a narrow message projection containing `role` and `data`, then rebuilt each richer internal message object from only those two fields. Existing per-message metadata was therefore discarded even though the scripting contract had never acquired ownership of those fields. The adopted fix snapshots the previous message array and preserves prior fields before applying the script-owned content values.

## Minimal safe scope / ownership boundary

A projected compatibility write may replace only fields that its contract explicitly owns. For the adopted `setFullChat` behavior:

- the script payload owns `role` and `data`;
- richer message metadata remains owned by the internal message model / feature that created it;
- omission of metadata is not deletion intent.

## Mechanism

Preserve the previous richer record and overlay the projected writable fields. Do not reconstruct a rich record solely from a partial compatibility representation unless destructive/full replacement is explicitly part of the API contract.

## Compatibility / invariants

- Existing message metadata must survive ordinary `setFullChat` rewrites.
- Script-provided `role` and `data` remain authoritative for the rewritten message content.
- The current implementation uses positional/index correspondence. This must not be generalized to arbitrary reorders, insertions, or deletions without a stable identity/operation contract.
- No save-path, DB-flush, V3 reload, service-manager, or Android-notification behavior is changed by this invariant.

## Validation / acceptance

1. Seed messages with representative non-content metadata.
2. Perform a `setFullChat` rewrite with changed `role`/`data` at the same positions.
3. Verify the content fields change and the unowned metadata remains intact.
4. Characterize length-change and reorder behavior before expanding the API contract; reject assumptions that could attach metadata to the wrong logical message.

## Risk / blast radius

Risk is MEDIUM because silent metadata loss can corrupt feature/plugin state attached to chat messages, while an incorrect preservation strategy could also retain metadata on the wrong message if identity semantics change. The adopted fix is localized and low-difficulty under the existing positional contract.

## Rollback / fallback

If a future richer rewrite model cannot prove positional identity, fall back to an explicit operation/stable-ID API rather than either dropping metadata or guessing ownership by index.

## Dependencies

None for preserving the current adopted invariant. Any future reorder/insert/delete support depends on explicit logical message identity semantics.

## PR decomposition

No implementation PR is required because the invariant is already adopted in official PocketRisu. Future changes to chat scripting compatibility writes should cite this Feature-ID and include the acceptance cases above.
