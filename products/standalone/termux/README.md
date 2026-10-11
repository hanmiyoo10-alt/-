# Termux Standalone Product Family

Status: `T3_SCREEN_ON_MIGRATED / NON_PRODUCTION`

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

T3 has moved Response Watch, Background GPT, and Screen On to `products/standalone/termux/response-watch/**`, `products/standalone/termux/background-gpt/**`, and `products/standalone/termux/screen-on/**` under `product:termux`.

The unmigrated children remain under `plugins/termux/**`:

- `large-doc-editor/**`
- `taskbridge/**`

The existing `plugin:termux-large-doc-editor` owner continues to classify the current Large Doc Editor path. No compatibility copy remains at `plugins/termux/response-watch/**`, `plugins/termux/background-gpt/**`, or `plugins/termux/screen-on/**`; those old paths stay intentionally unclassified/fail-closed.

## Staged migration

Child relocation is separately staged under #2801:

`T1 response-watch (complete) → T2 background-gpt (complete) → T3 screen-on (complete) → T4 taskbridge → T5 large-doc-editor → T6 legacy-route retirement review`

Each later stage requires its own fresh authority, impact, consumer, validation, and compatibility review. T0 authorizes no child physical move.

## Operating guidance

Repository and Termux work must follow:

- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- current repository control-plane and Work System contracts when those surfaces are affected

Unknown production/release facts remain UNKNOWN until an owning contract and evidence establish them.
