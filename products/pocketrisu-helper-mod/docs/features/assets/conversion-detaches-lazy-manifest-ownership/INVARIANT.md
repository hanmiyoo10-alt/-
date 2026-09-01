# CONVERSION-DETACHES-LAZY-MANIFEST-OWNERSHIP

## Status

`ADOPTED` in official PocketRisu.

## Problem / evidence

Official `PocketRisu/PocketRisu` commit `dd718991c4e5344f50f1a7c61f04d3b64c86487e` fixed a conversion bug where character↔module conversion copied a lazy asset-manifest descriptor. The converted object therefore referenced the source object's backing manifest until reload, so editing the converted object's assets could rewrite the source owner's manifest.

## Invariant

When a copy/convert/export-for-edit operation creates a logically independent persisted object, lazy/externalized storage descriptors that carry backing-store identity must not be blindly copied. Materialize/copy the field and remove the source backing identity before the new object becomes independently editable. Descriptor reuse is allowed only when shared ownership is explicit and validated.

## Compatibility / ownership boundary

- source object keeps its own manifest/backing identity;
- converted object receives a plain independently owned asset list before later persistence assigns its own representation;
- legacy plain-array paths retain equivalent matching/behavior semantics;
- async hydration failures must not leave a half-created converted object;
- repeated conversion activation is bounded while hydration is in flight.

## Validation / acceptance

A regression test or equivalent characterization should prove:

1. convert a manifest-backed source object;
2. mutate the converted object's assets before reload;
3. verify source assets/manifest are unchanged;
4. verify converted assets reflect the mutation;
5. force hydration failure and verify no partial object is published;
6. verify repeated activation while conversion is running creates at most one object.

## Risk / blast radius

`MEDIUM`: violating ownership can corrupt persisted assets across objects. The adopted detachment mechanism is localized, but eager hydration can temporarily increase memory/IO for very large asset sets.

## Rollback / fallback

If a future lazy-storage implementation cannot detach safely, fail the copy/convert operation rather than publish an object sharing unintended backing identity. A plain materialized copy is the compatibility fallback.

## Dependencies

None for preserving the current invariant. Future externalized domains must define whether each copy-like operation transfers, shares, or detaches storage ownership.

## PR decomposition

No new PR required for the already-adopted character/module path. For future domains, keep each ownership-boundary correction in the feature PR that introduces the lazy/externalized representation or in one isolated regression-fix PR.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `HIGH`
- Difficulty: `LOW`
- Size: `XS`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P0`
- lifecycle status: `ADOPTED`
