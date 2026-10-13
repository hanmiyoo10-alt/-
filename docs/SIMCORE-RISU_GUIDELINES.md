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
- For owner-supplied donor artifacts explicitly designated for the owner's private build, source-level inspection, adaptation and selective transplant are permitted under the recorded private-source policy.
- Preserve donor provenance, upstream identity, attribution and applicable notices even when private source reuse is permitted.
- Public/shared redistribution remains license/provenance-gated and must not be inferred from private-use authorization.
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
