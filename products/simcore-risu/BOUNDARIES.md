# SimCore Risu Product Boundaries

## Purpose

Keep the native application product separate from current SimCore production and PocketRisu operational ownership while preserving a clean future migration into MYANG.

## Current coordination owner

Until the MYANG migration is explicitly completed:

```text
hanmiyoo10-alt/-
└ products/simcore-risu/
```

owns design/coordination records only.

It does not own a SimCore Risu release or production runtime.

## Future application repository

Target:

```text
hanmiyoo10-alt/myang
```

After MYANG existing-content relocation and an explicit authority bootstrap, MYANG is intended to own:
- SimCore Risu application source;
- native Fusion host adapter;
- integrated application UI;
- app/server SQL, migrations and jobs;
- model broker integration;
- desktop/mobile/web/Termux packaging;
- application CI, updater and release system;
- migration/import/export implementation.

No ownership transfers merely because this target is documented.

## Upstream integration repository

```text
hanmiyoo10-alt/PocketRisu
```

remains the preferred owner integration/staging fork for upstream PocketRisu changes, isolated host modifications, compatibility experiments and upstream contribution preparation.

It is not automatically the final product repository.

## Does not own

### Current SimCore production

```text
plugins/simcore/**
release-simcore
product-manifest.json
```

remain owned by current SimCore authority until a separately proven cutover.

### PocketRisu Helper Mod

```text
products/pocketrisu-helper-mod/**
```

continues to own existing owner-fork/device/Termux operational evidence and Feature-ID workflows.

Proven capabilities may later be transplanted through explicit migration work; ownership is not moved by omission.

### MYANG existing content

Existing MYANG content remains independently owned until the owner completes its relocation.

SimCore Risu work must not overwrite or delete it by assumption.

### Upstream and donor projects

PocketRisu, HaejeokRisu, RisuBard, LightBoard, LoreQAcustom and other donors remain external/reference authorities for their own source.

SimCore Risu does not silently claim their code or identity.

## Architectural rule

Fusion semantic contracts stay host-agnostic.

```text
Fusion Core
├ Compatibility Plugin Adapter
└ Native SimCore Risu Adapter
```

A native host may provide better evidence and lifecycle hooks, but it does not gain permission to rewrite semantic ownership.

## License/provenance rule

No third-party source-code transplant occurs until the applicable license/provenance path is explicitly reviewed.

GPL obligations and attribution must be preserved where reuse is authorized.

## Migration completion rule

The monorepo product root may become a thin external-product locator only after:
1. MYANG relocation prerequisite is complete;
2. MYANG product authority exists;
3. the source/authority handoff is explicit;
4. no duplicate mutable truth owner remains.
