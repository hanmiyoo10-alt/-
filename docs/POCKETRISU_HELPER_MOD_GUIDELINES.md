# PocketRisu Helper Mod — Development & Operations Guidelines

This document is the canonical bootstrap/operating contract for the `pocketrisu-helper-mod` product scope. It does not replace the product's existing operational checkpoint.

- Canonical product root: `products/pocketrisu-helper-mod/`
- Current-state evidence: `products/pocketrisu-helper-mod/CURRENT.md`
- Product manifest locator: `products/pocketrisu-helper-mod/product.json`
- Durable-memory profile: `check-only`

`CURRENT.md` remains the detailed operational checkpoint. `product.json` remains the declared product manifest locator. Bootstrap registration does not promote either file into a new release authority and does not add a main writer.

## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference; do not copy the common-rule body into this document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth; those facts remain owned by the project-specific authority/evidence declared here.

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
