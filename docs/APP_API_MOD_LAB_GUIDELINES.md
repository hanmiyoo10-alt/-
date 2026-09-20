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

## Internal target taxonomy

Concrete targets use the bounded target namespace owned by this product:

```text
products/app-api-mod-lab/targets/
├── risu/<target-id>/
└── standalone/<target-id>/
```

The Risu O/X classification applies to each concrete target, not permanently to the whole lab. A target's `app / api / hybrid` kind is metadata in its `TARGET.json`, not another required path layer.

Do not create placeholder target directories. Until a target can be named truthfully, the valid state is zero targets.

Every concrete target root must satisfy `products/app-api-mod-lab/target-contract.json` and pass:

`node products/app-api-mod-lab/validate-targets.mjs`

A structural PASS does not prove source/upstream authority, release/deployment authority, runtime correctness, or implementation readiness. Those claims remain governed by the target onboarding contract and direct evidence.

Reusable target code or fixtures should move into a shared area only after at least two concrete targets prove the same reusable contract.

## Legacy candidate reconciliation

Historical app/API modification work may exist outside the current target namespace, such as issue-only reconnaissance or a dedicated legacy branch.

Such work must first be recorded in `products/app-api-mod-lab/legacy-candidates.json` as locator-only evidence.

The candidate inventory may record:
- a proposed Risu O/X ecosystem;
- a proposed `app / api / hybrid` kind;
- issue/branch/path locators;
- a proposed future target root.

It must not manufacture source, runtime, deployment, production, or release authority. While a candidate is non-materialized, both `materialized` and `migration_authorized` remain false and its proposed target root must not exist.

Before materialization:
1. re-read the candidate's current evidence locator;
2. re-establish current source/upstream authority and scope;
3. confirm the proposed ecosystem/kind still matches;
4. authorize migration explicitly;
5. create the concrete `TARGET.json` under the normal target contract.

Run `node products/app-api-mod-lab/validate-legacy-candidates.mjs` to validate the inventory. The validator proves only inventory structure and non-materialization boundaries.

## Automation boundary

Canonical-main may classify and validate the registered product paths and bootstrap health. It does not gain mutation authority over external apps/services or create a deployment/release channel for this lab.
