# App API Mod Lab Targets

This directory is the bounded target namespace for App API Mod Lab.

The lab may contain zero targets. Zero targets is the valid bootstrap state until a real app/service/API target is selected from evidence.

## Layout

```text
targets/
├── risu/
│   └── <target-id>/
└── standalone/
    └── <target-id>/
```

- `risu/<target-id>` means the target belongs to or requires the Risu ecosystem.
- `standalone/<target-id>` means the target is independent of Risu.
- `app / api / hybrid` is metadata in `TARGET.json`, not another required directory layer.
- `category` is the target's primary product/domain grouping metadata and is also not a directory layer.

Do not create empty target directories. A concrete target begins when its target root and `TARGET.json` can truthfully identify the target and its bounded modification/validation surface.

## Required target metadata

Each concrete target root must contain `TARGET.json` with:

- `schema_version: 1`
- target `id` matching the directory name
- non-empty `display_name`
- `ecosystem: risu | standalone`, matching the parent directory
- `kind: app | api | hybrid`
- required primary `category` from the reviewed category vocabulary in `target-contract.json`
- `authority.source_upstream`
- `authority.release`
- `authority.deployment`
- `scope.owned_surfaces`
- `scope.preserve_surfaces`
- `privacy.credentials_in_git: false`
- one or more `validation_surfaces`

Authority fields may explicitly use `UNKNOWN` or `UNASSIGNED` when evidence is genuinely missing. A structurally valid target is not automatically implementation-ready: the canonical guideline still requires the needed authority/scope facts to be resolved before mutation.

## Example shape

```json
{
  "schema_version": 1,
  "id": "example-target",
  "display_name": "Example Target",
  "ecosystem": "standalone",
  "kind": "hybrid",
  "category": "utility",
  "authority": {
    "source_upstream": "UNKNOWN",
    "release": "UNKNOWN",
    "deployment": "UNKNOWN"
  },
  "scope": {
    "owned_surfaces": ["example/surface"],
    "preserve_surfaces": ["neighboring behavior"]
  },
  "privacy": {
    "credentials_in_git": false
  },
  "validation_surfaces": ["static contract check"]
}
```

This is a format example only. It does not declare a real target or authority.

The primary category is for deterministic browsing/indexing. Reclassification changes metadata, not the target path. Future multi-domain needs should use a separately reviewed secondary/tag field rather than making the primary category ambiguous.

## Shared extraction

Do not create a generic shared framework from one target.

A reusable adapter, tool, or fixture moves into a future `shared/**` area only after at least two concrete targets demonstrate the same stable contract.

## Validation

Run:

```text
node products/app-api-mod-lab/validate-targets.mjs
```

The validator checks the target contract and every concrete target directory. It accepts the legitimate zero-target bootstrap state.

Validation PASS proves structural target metadata only. It does not prove external authority, runtime correctness, release readiness, or production state.
