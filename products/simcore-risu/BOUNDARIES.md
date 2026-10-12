# SimCore Risu Product Boundaries

## Purpose

Keep native-app work separate from existing SimCore and PocketRisu operational ownership.

## Owns only after explicit promotion

- SimCore Risu application/distribution architecture;
- native Fusion host adapter;
- integrated host UI and app-level orchestration;
- native DB/job/model integration specific to SimCore Risu;
- compatibility/migration into the SimCore Risu product.

## Does not own

### SimCore production

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

continues to own existing owner-fork/device/Termux operational evidence and Feature-ID workflows. Proven capabilities may later be transplanted through explicit migration work; ownership is not moved by omission.

### Upstream and donor projects

PocketRisu, HaejeokRisu, RisuBard, LightBoard, LoreQAcustom and other donors remain external/reference authorities for their own source. SimCore Risu does not silently claim their code or identity.

## Architectural rule

Fusion semantic contracts stay host-agnostic.

```text
Fusion Core
├ Plugin Adapter
└ Native SimCore Risu Adapter
```

A native host may provide better evidence and lifecycle hooks, but it does not gain permission to rewrite semantic ownership.

## License/provenance rule

No third-party source-code transplant occurs until the applicable license/provenance path is explicitly reviewed. GPL obligations and attribution must be preserved where code reuse is authorized.
