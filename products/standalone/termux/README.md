# Termux Standalone Product Family

Status: `T6_LEGACY_ROUTE_RETIRED / NON_PRODUCTION`

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

The legacy `plugins/termux/**` route has been retired. No current source or compatibility placeholder remains there. Response Watch, Background GPT, Screen On, TaskBridge, and Large Doc Editor are all owned through the `product:termux` family root.

## Staged migration

Child relocation is separately staged under #2801:

`T1 response-watch (complete) → T2 background-gpt (complete) → T3 screen-on (complete) → T4 taskbridge (complete) → T5 large-doc-editor (complete) → T6 legacy-route retirement (complete)`

Each later stage requires its own fresh authority, impact, consumer, validation, and compatibility review. T0 authorizes no child physical move.

## Migration tooling

For future bounded child-path moves, use the read-only repository validator:

- `products/standalone/termux/tools/migration_validator.py`
- contract and example plan: `products/standalone/termux/tools/README.md`

The validator checks authorized changed-file ceilings, old/new inventories,
byte-parity expectations, old-root residue, and location-sensitive path-depth
references. It is advisory validation only and does not replace Work System,
Required, Control Plane, merge, release, production, runtime, or device
authority.

## Operating guidance

Repository and Termux work must follow:

- `docs/REPOSITORY_COMMON_RULES.md`
- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- current repository control-plane and Work System contracts when those surfaces are affected

Unknown production/release facts remain UNKNOWN until an owning contract and evidence establish them.
