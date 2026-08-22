# SimCore Product Root

Owner root for SimCore repository state and release automation.

Current compatibility paths remain:

- Runtime source: `plugins/simcore/`
- Durable manifest: `product-manifest.json`
- Development memory: `docs/CURRENT_DEVELOPMENT.md`
- Guidelines: `docs/SIMCORE_GUIDELINES.md`
- Release channel: `release-simcore`

These legacy locations are intentionally retained during the first isolation phase so existing release tooling and project-source artifacts do not break.

## Isolation contract

- SimCore workflows may modify only SimCore-owned runtime/state files plus shared repository infrastructure explicitly documented in `products/README.md`.
- Main-writing SimCore jobs must use the shared `repo-main-write` concurrency group.
- SimCore release-channel writes remain independent of Local Usage Dashboard release-channel writes.
- Future migration of durable state into this directory must preserve compatibility until all consumers are updated.
