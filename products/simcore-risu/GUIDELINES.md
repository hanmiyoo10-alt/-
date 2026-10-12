# SimCore Risu Development Guidelines

Status: **INITIAL PRODUCT GUIDELINE · DESIGN-ONLY BOOTSTRAP**

SimCore Risu inherits `docs/REPOSITORY_COMMON_RULES.md`.

## Authority

Until separately promoted:
1. `products/simcore-risu/product.json` declares this product root and its non-production posture.
2. `products/simcore-risu/CURRENT.md` records active design work.
3. `products/simcore-risu/BOUNDARIES.md` defines ownership separation.
4. Existing SimCore and PocketRisu authorities remain authoritative inside their scopes.

This guideline does not create release, deployment or production authority.

## Hard product rules

- Preserve current working SimCore and PocketRisu baselines.
- Do not move production/release authority merely because native integration is designed.
- Fusion contracts remain host-agnostic.
- Prefer native host evidence over inference when native integration becomes available.
- Keep plugin compatibility as a deliberate adapter/fallback, not an accidental duplicate implementation.
- One semantic field still has one canonical writer.
- Do not keep donor hook/database/model owners after their capability has been transplanted into the proper Fusion owner.
- Every selected donor capability needs a traceable destination or explicit proven supersession.
- Treat GPL/provenance review as a gate before third-party code reuse.
- Do not commit credentials, private backups, DB contents or raw user chat data.

## Work staging

Normal sequence:

```text
AUTHORITY_SCOPE
→ HOST_BASELINE_AUDIT
→ HOST_FIT_SPIKE
→ ARCHITECTURE_FREEZE
→ IMPLEMENTATION
→ VALIDATION
→ REAL_DEVICE_ACCEPTANCE
→ RELEASE_DESIGN
→ QUALIFIED_RELEASE
```

An unfinished required stage is not complete.
