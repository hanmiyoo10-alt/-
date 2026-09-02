# NARRATIVE-MEMORY-REBUILD-CHECKPOINT-IDENTITY

Lifecycle: `DESIGN_NEEDED`

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `MEDIUM`
- Dependencies: future PocketRisu narrative-memory rebuild/staging subsystem; explicit source-batch identity; publish authority; checkpoint versioning contract
- Priority: `P1`

## Source evidence

- `rpaddict/RisuBard` existing staging/rebuild work including `3ae4501b`
- `rpaddict/RisuBard` `8f855433d169f6dfd089d6b4fc121e7a65e3e366` — legacy reboot-checkpoint recovery with narrow source-ID normalization and mismatch cleanup
- `rpaddict/RisuBard` `f86449ef643806d3ccbb8eec81d7f1ee46a6df6c` — v0.9.18 finalization/release

## Problem / benefit

Resumable rebuild work needs to distinguish representation compatibility from logical identity. A checkpoint created by an older format may still be reusable if a documented normalization maps it to the same exact source batch, but a stale completed receipt must never be replayed against a different message/event group.

Benefit: crash-safe resumability without turning stale recovery metadata into live-state authority.

## Minimal safe scope

If PocketRisu later gains a narrative-memory rebuild subsystem, the first slice should contain only:

1. versioned checkpoint envelope;
2. deterministic ordered source-batch identity;
3. explicit narrow legacy adapters;
4. fail-closed mismatch behavior;
5. idempotent completion/cleanup.

No automatic canon merge/delete/rewrite and no destructive restore belongs in this feature.

## Ownership / invariants

- Current chat/source identity is authoritative over recovery metadata.
- Staged output is not live until an explicit publish transition succeeds.
- Compatibility adapters may normalize representation but may not broaden accepted logical identity.
- Cross-character, cross-chat, or cross-batch checkpoint reuse is forbidden.
- Unknown or malformed versions fail closed.
- Completed stale receipts are discarded/quarantined rather than replayed.
- Cleanup and completion are idempotent.
- PocketRisu guardrails remain unchanged: no forced lifecycle DB flush, keep `flushServerDbKeepalive()` no-op, preserve save/integrity optimization and targeted V3 reload, keep runit, no PM2, no Android notifications on the server phone.

## Validation / acceptance

Require focused tests for exact-format resume, one explicitly supported legacy fixture, order/source/event-group mismatch rejection, chat/character mismatch rejection, unknown/malformed version rejection, stale completed-checkpoint cleanup, crash points before/after receipt and publish, double-cleanup/double-completion, and no cross-chat recovery bleed.

## Risk / rollback

Risk is contained only if live state is untouched before publish. Rollback is to disable resume compatibility, preserve the previous live memory state, discard/quarantine incompatible staging state, and restart from source. Never guess-repair an unknown checkpoint.

## PR decomposition

- PR 1: pure source-batch identity helpers + fixtures/tests.
- PR 2: versioned recovery envelope + exact current-format resume.
- PR 3: one narrowly justified legacy adapter + negative fixtures.
- PR 4: diagnostics/cleanup hardening if separately needed.

Keep prompt/model changes, retrieval policy, canonical taxonomy, and unrelated storage refactors out of these PRs.

## Current decision

Remain `DESIGN_NEEDED`. The design and rollback are concrete, but PocketRisu does not yet expose the owning rebuild/staging subsystem and its source/publish authority. No autonomous implementation branch or PR is authorized yet.

Durable idea-pipeline design draft: `hanmiyoo10-alt/PocketRisu@notes/external-risu-dev-watch:notes/design-drafts/narrative-memory-rebuild-checkpoint-identity.md`.
