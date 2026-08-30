# DEPLOYMENT-CONTAINER-ENGINE-IDENTITY

Status: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai@a8e0357b251d38544b69375d892461cfd9f7ddc0` added Docker/Podman selection as a deployment-lifecycle concern rather than a one-command toggle. The selected engine is persisted, reused by later lifecycle commands, and an in-place engine switch is rejected as unsafe. Tests exercise explicit selection, reuse, fallback when Docker is unusable, and switch refusal.

The transferable lesson is not “PocketRisu should adopt Podman.” It is: when a deployment substrate materially changes compose/network/volume/service semantics, the chosen substrate must be explicit deployment identity and must not silently change under an existing installation.

## Classification

- System impact: `SYSTEM_UPDATE_REQUIRED`
- Importance: `MEDIUM`
- Difficulty: `MEDIUM`
- Size: `M`
- Evidence: `MEDIUM`
- Risk: `HIGH`
- Dependencies: explicit PocketRisu requirement for a second supported container engine; host capability/support matrix; compose/network/volume parity tests; documented migration or reinstall path between engines
- Priority: `P2`
- Lifecycle status: `DESIGN_NEEDED`

## Minimal safe scope

No host/runtime modification is authorized by this dossier. The first possible engineering slice, only after a concrete requirement exists, is contract/test work that models container-engine identity and proves lifecycle commands reuse it. It must not install Podman/Docker, change service managers, migrate volumes, rewrite host networking, or switch an existing installation in place.

## Ownership boundaries

- Deployment CLI/script: parses explicit engine choice and resolves persisted identity.
- Deployment state/config: owns the selected engine identifier for an installation.
- Engine adapter: owns engine-specific executable/compose invocation details.
- Host/device: remains outside autonomous modification scope.
- Application/browser/server persistence: unaffected.

## Proposed mechanism

1. Define a small deployment-engine identity contract, initially supporting the current engine only.
2. Make lifecycle operations resolve that persisted identity before invoking engine-specific commands.
3. If a second engine is ever supported, select it only during install/bootstrap or an explicit separately reviewed migration flow.
4. Refuse an in-place identity mismatch unless a dedicated migration/reinstall path proves volumes, networks, permissions, and service ownership safe.
5. Keep capability detection advisory; it may choose among engines only for a fresh installation with no persisted identity.

## Compatibility / invariants

- Existing PocketRisu deployments continue to use their current container/runtime path without behavior change.
- runit remains the service-manager guardrail; PM2 is never introduced.
- No Android notification is created on the server phone.
- No forced DB flush is added on `visibilitychange` / `pagehide`.
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed.
- Current save/integrity and targeted V3 plugin reload behavior are untouched.
- External engine semantics are evidence, never automatic authority.

## Validation / acceptance

Before any implementation can be called ready:

- fresh-install explicit selection test;
- fresh-install auto-selection test with one engine unavailable;
- persisted identity reused by start/stop/restart/update/logs/status commands;
- mismatched requested engine is rejected before destructive or mutating work;
- missing persisted engine fails with actionable diagnostics rather than silently switching;
- network, volume, bind mount, user/rootless, compose project-name, env-file, and health-check parity matrix for every supported engine;
- reinstall/migration rollback documented and tested on disposable fixtures;
- no changes to PocketRisu application DB/save/plugin invariants.

Acceptance requires reproducible fixtures for every supported engine and a documented reason PocketRisu needs the additional engine.

## Risk / blast radius

Risk is `HIGH` because deployment-engine changes can strand volumes, alter network namespaces, change rootless permissions, change compose compatibility, or leave lifecycle commands operating on different resource sets. A false auto-detection decision can turn a simple restart/update into an apparent data-loss incident even if the data still exists under the other engine.

## Rollback / fallback

The safe fallback is the currently supported deployment engine and existing lifecycle path. A failed second-engine experiment must be removable without converting an installed environment. Existing installations should be recovered by selecting their persisted original engine; cross-engine recovery/migration is a separate explicit operation.

## Dependencies

1. Concrete user/project requirement for supporting a second container engine.
2. Inventory of current PocketRisu deployment scripts and persisted deployment state.
3. Capability/support matrix for candidate engines on the actual server-phone/self-host targets.
4. Parity fixtures for compose, volume, network, service, update, and rollback semantics.
5. Explicit migration/reinstall policy.

Until these are resolved, the lifecycle remains `DESIGN_NEEDED` and cannot advance to `READY_TO_PORT`.

## PR decomposition

1. Test/contract-only PR: model current deployment-engine identity and prove lifecycle reuse without adding a new engine.
2. Optional engine-adapter seam PR with no host package installation or behavior change.
3. Only under later explicit user authorization: second-engine support for fresh installs, with parity tests.
4. Separate, independently reviewed migration/reinstall tooling if ever needed; never hide migration inside normal lifecycle commands.
