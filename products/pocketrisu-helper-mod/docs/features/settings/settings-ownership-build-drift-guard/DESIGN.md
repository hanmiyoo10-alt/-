# Feature-ID: SETTINGS-OWNERSHIP-BUILD-DRIFT-GUARD

Status: DESIGN_NEEDED

## Problem / evidence

HaejeokRisuai commit `969612bf7548be13db67bb3feec6ffd2b878899b` (merged by `25f026ee1af744d83ba8b8acd929cbbbe3015b8f`) moved setting/domain ownership metadata toward a single generated contract and made build/check entrypoints verify it. The motivating failure mode is silent drift between runtime setting definitions, deferred-setting groups, store ownership, protocol types, and generic setting accessors. A stale or duplicated list can route a key to the wrong store, skip hydration, or compile successfully while runtime ownership is wrong.

Evidence is external and code-level; this has not yet been reproduced in PocketRisu.

## Minimal safe scope

First slice is validation-only: inventory PocketRisu's duplicated setting-key/ownership lists and, only where a canonical source already exists, generate or compare derived type/key lists during `check`/CI. Do not change runtime setting semantics, persistence routing, hydration, or defaults in the first PR.

## Ownership boundaries

- canonical runtime setting/schema source: owns key existence and metadata;
- domain stores: own runtime read/write authority for their declared keys;
- protocol/type artifacts: derived consumers, never independent authority;
- build/check tooling: detects drift and fails closed on stale generated output;
- UI renderer/search/index: consumes ownership-aware accessors rather than assuming one global store.

## Proposed mechanism

1. Map all PocketRisu setting key sets and classify each as authoritative or derived.
2. Pick one existing canonical source per ownership dimension; do not invent a parallel registry.
3. Generate type/key unions or deterministic snapshots from that source.
4. Add a staleness check to the normal typecheck/CI path; normalize line endings before comparison so CRLF/LF does not create false failures.
5. Keep generated files clearly marked and deterministic.
6. Only in later PRs, if concrete drift is found, route generic access through explicit ownership-aware accessors.

## Compatibility / invariants

- No runtime behavior change in the first slice.
- No DB format, migration, service-manager, Android-notification, or system-package change.
- Preserve PocketRisu save/integrity optimizations, targeted V3 plugin reload, runit, and all lifecycle flush guardrails.
- Generated artifacts must be reproducible on Windows/Linux checkouts; comparison must normalize CRLF/LF.
- A missing/unknown ownership mapping must fail the check rather than silently default to the wrong store.

## Validation / acceptance

- Fresh checkout: generated/check output is clean.
- Deliberately add a setting key to the canonical source without updating a derived artifact: check must fail.
- Regenerate: check must pass.
- CRLF-converted generated file with identical logical content: check must not fail solely on line endings.
- Existing runtime/settings tests pass unchanged.
- Acceptance for READY_TO_PORT: PocketRisu's actual canonical sources and duplicated derived lists are identified, the first validation-only slice is isolated, and no runtime ownership migration is required.

## Risk / blast radius

Risk is LOW for the validation-only slice: failure mode is CI/build rejection, not data mutation. Risk rises to MEDIUM if runtime routing/accessors are changed; keep that out of the first PR unless separately reviewed.

## Rollback / fallback

Remove the check/generator hook and generated artifact. No persistent data rollback is required because the first slice changes no runtime state or storage format.

## Dependencies

- PocketRisu settings/ownership inventory.
- Confirmation of a canonical source for each generated list.
- Existing CI/check entrypoint where validation can run without changing production behavior.

## PR decomposition

1. `SETTINGS-OWNERSHIP-BUILD-DRIFT-GUARD-A`: inventory + deterministic validation/generation only.
2. `...-B` only if needed: replace duplicated derived lists with generated artifacts.
3. Separate feature/PR for any runtime ownership-aware accessor or store-routing change.

## Source evidence

- `nevaeh5379/HaejeokRisuai@969612bf7548be13db67bb3feec6ffd2b878899b` — enforce settings ownership and validation in builds.
- merge `25f026ee1af744d83ba8b8acd929cbbbe3015b8f`.
- follow-up `6f4cc11dcc0c216469d05d4d7c0312820e1a77b2` — normalize line endings in the staleness check to avoid Windows false failures.
