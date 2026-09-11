# App API Mod Lab — Development & Operations Guidelines

This document is the canonical bootstrap/operating contract for the `app-api-mod-lab` product scope.

- Canonical product root: `products/app-api-mod-lab/`
- Current-state evidence: `products/app-api-mod-lab/CURRENT.md`
- Product locator: `products/app-api-mod-lab/product.json`
- Durable-memory profile: `check-only`

`CURRENT.md` owns this lab's current work-state evidence. Registration and bootstrap metadata do not create source, runtime, deployment, production, or release authority for any external app or API.

## Repository common-rules inheritance

This project inherits `docs/REPOSITORY_COMMON_RULES.md` by reference. Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened.

## Operating contract

1. Read `CURRENT.md` before resuming work in this scope.
2. Before modifying a concrete app/API target, identify its current source/upstream or other owning authority and record the bounded target scope.
3. Keep one primary target/goal per bounded work unit; unrelated apps, APIs, discoveries, or experiments must not hitchhike on the same change.
4. Prefer the narrowest capable change surface and preserve verified neighboring behavior.
5. Define the strongest practical validation surface before declaring a modification complete.
6. Keep credentials, tokens, session/auth material, private account/device data, and unsanitized sensitive payloads/logs out of Git.
7. Do not create release branches, deployment paths, runtime writers, or synthetic production facts merely to make repository registration green.
8. Shared-infrastructure changes require their own authority/impact check and must not be treated as implicitly owned by this product root.

## Target onboarding contract

A concrete target is implementation-ready only after the work record identifies, as applicable:

- target app/service/API identity;
- source/upstream or owning authority;
- exact code/API surface to change;
- explicit non-goals and neighboring surfaces to preserve;
- authentication/privacy boundary;
- regression/static/runtime/device validation surface;
- release/deployment authority if one actually exists.

Missing facts remain `UNKNOWN` or `UNASSIGNED`; they must not be guessed for convenience.

## Automation boundary

Canonical-main may classify and validate the registered product paths and bootstrap health. It does not gain mutation authority over external apps/services or create a deployment/release channel for this lab.
