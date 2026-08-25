# PocketRisu Helper Mod — Development & Operations Guidelines

This document is the canonical bootstrap/operating contract for the `pocketrisu-helper-mod` product scope. It does not replace the product's existing operational checkpoint.

- Canonical product root: `products/pocketrisu-helper-mod/`
- Current-state evidence: `products/pocketrisu-helper-mod/CURRENT.md`
- Product manifest locator: `products/pocketrisu-helper-mod/product.json`
- Durable-memory profile: `check-only`

`CURRENT.md` remains the detailed operational checkpoint. `product.json` remains the declared product manifest locator. Bootstrap registration does not promote either file into a new release authority and does not add a main writer.

## Current production snapshot

<!-- PLUGIN_RELEASE_STATE_START -->
- Product: `UNKNOWN — resolve from registered product evidence`
- Release branch: `UNKNOWN`
- Source: `products/pocketrisu-helper-mod/CURRENT.md`
<!-- PLUGIN_RELEASE_STATE_END -->

This block is intentionally not machine-written while the profile remains `check-only`.

## Operating contract

1. Read `CURRENT.md` before resuming product work; treat it as current operational evidence, not as permission to mutate production automatically.
2. Preserve the existing feature-boundary and safe-updater rules documented by the product.
3. Do not create a release branch, updater, deployment path, or durable-memory writer merely to satisfy canonical bootstrap registration.
4. Keep secrets, database/snapshot payloads, raw logs, backup originals, and device-specific private material out of Git.
5. A future transition to a writable memory profile requires explicit authority proof, output allowlists, deterministic rendering, Required gating, and no production mutation from memory sync.

## Automation boundary

Canonical-main may validate the registered product paths and report their bootstrap health. Product runtime/deployment authority remains outside canonical-main bootstrap.
