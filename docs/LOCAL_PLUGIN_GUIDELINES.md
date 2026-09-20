# Local — Development & Operations Guidelines

This document is the operating contract for the Local compatibility family.

Canonical repository: `hanmiyoo10-alt/-`

Canonical compatibility path: `plugins/risu/local/`

Lifecycle: `compatibility-family`

Durable-memory profile: `check-only`

## Repository common-rules inheritance

This scope inherits `docs/REPOSITORY_COMMON_RULES.md` and the canonical-main shared interaction contract by reference.
Repository hard invariants remain binding. This document does not replace child production, release, runtime, deployment, or validation authority.

## Current authority posture

The Local parent is evidence/navigation only. Its authority evidence is `plugins/risu/local/README.md`.

Current child authorities remain independent:
- `plugin:usage-dashboard` owns current Usage Dashboard production/release truth.
- `plugin:devpass` owns the declared DevPass update-channel evidence.
- `plugin:voyage-token-check` owns current Voyage design/evidence truth.

## Migration contract

Family/path consolidation must not be confused with authority collapse.

Do not change child release/update URLs, move child implementation, retire child labels/status views, or manufacture missing production state merely because `plugin:local` exists.

Usage Dashboard relocation requires a separately proven compatibility/release migration because current production artifacts and runtime bootstrap refer directly to `release-usage-dashboard/plugins/usage-dashboard/**`.

DevPass missing artifact/version state remains UNKNOWN where current evidence is missing.

Voyage production source/build/release identity remains UNKNOWN until its owning evidence establishes it.

Provider-neutral observability extraction composes with #2582. Invocation/routing/credential authority composes with #2589 and is not granted here.

## Automation boundary

Canonical-main may validate this compatibility parent and publish a derived status view.
While the profile is `check-only`, it has no writable durable-memory outputs and no production publisher.

## Completion boundary

Creating this parent does not complete Local consolidation.
Each child absorption or relocation requires its own authority scope, compatibility proof, validation, and post-merge convergence.

## Nested child routing

The Local family may expose nested compatibility paths while preserving independent child authority.

Current bridge:
- parent-owned direct surface: `plugins/risu/local/*`
- parent-owned guideline: `docs/LOCAL_PLUGIN_GUIDELINES.md`
- Voyage child bridge: `plugins/risu/local/voyage/**` → `plugin:voyage-token-check`

The broad family directory is therefore not itself an ownership claim over every descendant. Child paths must route to the child owner when explicitly registered.

For Voyage, the current evidence authority remains `voyage-token-check/DESIGN_STATUS.md` until a later reviewed physical-relocation slice proves and switches that locator.
