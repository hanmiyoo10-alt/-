# Termux Standalone Product Family

Status: `T0_FAMILY_LANDING / NON_PRODUCTION`

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

T0 does not move child source. The current Termux children remain under `plugins/termux/**`:

- `background-gpt/**`
- `large-doc-editor/**`
- `response-watch/**`
- `screen-on/**`
- `taskbridge/**`

The existing `plugin:termux-large-doc-editor` owner continues to classify the current Large Doc Editor path during T0. Other old-root children are not silently reclassified merely because this family landing exists.

## Staged migration

Child relocation is separately staged under #2801:

`T1 response-watch → T2 background-gpt → T3 screen-on → T4 taskbridge → T5 large-doc-editor → T6 legacy-route retirement review`

Each later stage requires its own fresh authority, impact, consumer, validation, and compatibility review. T0 authorizes no child physical move.

## Operating guidance

Repository and Termux work must follow:

- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- current repository control-plane and Work System contracts when those surfaces are affected

Unknown production/release facts remain UNKNOWN until an owning contract and evidence establish them.
