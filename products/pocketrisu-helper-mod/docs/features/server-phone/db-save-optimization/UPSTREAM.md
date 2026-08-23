# Upstream PR dossier — db-save-optimization

Feature-ID: `db-save-optimization`
Area: `server-phone`
PR status: `NOT_PREPARED`
Isolation status: `LEGACY_MIXED`
Deployment status: `NOT_READY`
## Problem / motivation
Large /api/patch whole-hash/clone/ETag cost.
## Minimal upstream scope
TODO: reconstruct incremental hash/selective clone/opaque ETag as minimal independent patches.
## Dependencies
PocketRisu server patch/save implementation.
## Verification evidence
README has synthetic hash/atomicity, performance and restart persistence evidence.
## Upstream pitch
High-value candidate; likely split into prerequisite-sized PRs.
## Review / PR state
- next action: reconstruct exact feature-only diff from upstream base, not mixed local history.
