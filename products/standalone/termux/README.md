# Termux Standalone Product Family

Status: `T5_LARGE_DOC_EDITOR_MIGRATED / NON_PRODUCTION`

This root establishes the repository-level standalone Termux product-family identity selected by #2595 and authorized for T0 by #2801. It is an evidence and routing surface only.

## Authority boundary

- Product owner label: `product:termux`
- Lifecycle: `prototype`
- Evidence authority: this README
- Production version: `UNKNOWN — no production release established yet`
- Release branch: `UNKNOWN — not established yet`
- Production manifest: `UNKNOWN — not established yet`

This T0 landing is **not a production release**. It does not create or imply production, release, deployment, updater, device, runtime, or installation authority.

## Current source compatibility

T5 has moved Response Watch, Background GPT, Screen On, TaskBridge, and Large Doc Editor under `products/standalone/termux/**` as `product:termux` source.

No unmigrated runnable child implementation remains under `plugins/termux/**`. The legacy `plugin:termux-large-doc-editor` owner is intentionally retained only as compatibility metadata until T6, with a compatibility/evidence README at `plugins/termux/large-doc-editor/README.md`. No compatibility copy remains for Response Watch, Background GPT, Screen On, or TaskBridge; those old paths stay intentionally unclassified/fail-closed.

## Staged migration

Child relocation is separately staged under #2801:

`T1 response-watch (complete) → T2 background-gpt (complete) → T3 screen-on (complete) → T4 taskbridge (complete) → T5 large-doc-editor (complete) → T6 legacy-route retirement review`

Each later stage requires its own fresh authority, impact, consumer, validation, and compatibility review. T0 authorizes no child physical move.

## Operating guidance

Repository and Termux work must follow:

- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- current repository control-plane and Work System contracts when those surfaces are affected

Unknown production/release facts remain UNKNOWN until an owning contract and evidence establish them.
