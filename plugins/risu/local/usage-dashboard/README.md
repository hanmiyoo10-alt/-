# Local Usage Dashboard compatibility landing

This directory is a Local-family navigation and compatibility landing for Local Usage Dashboard.

Current owner: `plugin:usage-dashboard`

Current lifecycle: `production`

## Production authority remains unchanged

This landing is **not** the production source/runtime root.

Current production authority remains:

- production root: `plugins/usage-dashboard/**`
- release branch: `release-usage-dashboard`
- production manifest: `plugins/usage-dashboard/runtime/product-manifest.json`
- plugin artifact: `plugins/usage-dashboard/latest.js`
- release specifications: `.github/usage-dashboard/releases/**`
- project guideline: `docs/USAGE_DASHBOARD_GUIDELINES.md`

The existing product compatibility root at `products/usage-dashboard/**` also remains in place.

## Update and runtime boundary

Current update/runtime consumers still point directly at `release-usage-dashboard/plugins/usage-dashboard/**`.

This landing does not replace or redirect:

- the plugin `//@update-url`;
- runtime manifest URLs;
- Bridge Engine / Bridge Manager / bootstrap artifact URLs;
- Bridge Manager release prefixes;
- release workflows, materializers, validators, or publishers;
- main/release exact-byte production artifacts.

A later physical relocation requires a separately reviewed compatibility/release migration.

## MCP boundary

Usage Dashboard MCP remains read-only and continues to read:

- `plugins/usage-dashboard/runtime/product-manifest.json`
- `plugins/usage-dashboard/latest.js`

from `main` and `release-usage-dashboard`.

This landing does not change MCP read locators.

## Authority boundary

This compatibility path owns no independent production version, release identity, runtime deployment, updater target, MCP truth, or real-device acceptance state.

Current production and physical validation facts must continue to come from the owning Usage Dashboard authority chain. Unknown physical verification remains UNKNOWN until owning evidence resolves it.
