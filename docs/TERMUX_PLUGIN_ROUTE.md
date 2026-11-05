# Termux Plugin Route

Date: 2026-08-24
Status: RETIRED · NON-RUNTIME
Scope: retired legacy route `plugins/termux/`

## Retirement state

The staged migration under #2801 is complete through T6.

All current Termux child source now lives under:

`products/standalone/termux/**`

The legacy `plugins/termux/**` route is retired and must remain absent from current source. Do not recreate it merely as a compatibility placeholder or future fixed plugin root.

## Durable operating contract

All Termux development, diagnostics, evidence, regression, release planning, and production-handling work must follow:

- `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- `docs/TERMUX_REPO_AUTOMATION.md`

Conversation memory remains context only. Current production/release truth must be re-read from the owning repository evidence.

## Current authority boundary

- Product family: `product:termux`
- Canonical source root: `products/standalone/termux/`
- Lifecycle: prototype / NON-PRODUCTION
- Production release branch: UNKNOWN — not established
- Production manifest: UNKNOWN — not established
- Production version: UNKNOWN — not established

Retiring the old route does not create a release branch, production artifact, deployment path, updater, runtime state, or device authority.
