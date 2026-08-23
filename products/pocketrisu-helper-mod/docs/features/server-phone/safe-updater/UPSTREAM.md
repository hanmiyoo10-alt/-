# Upstream PR dossier — safe-updater

Feature-ID: `safe-updater`
Area: `server-phone`
PR status: `NOT_PREPARED`
Isolation status: `CLEAN`
Deployment status: `NOT_READY`
AUTO_DEPLOY_GATE: `DISABLED`

## Problem / motivation
Need safe pull-based update/deploy with compatibility checks and rollback.

## Minimal upstream scope
Not implemented yet; start as isolated feature.

## Dependencies
server-service; main notification relay only for user notification wiring.

## Verification evidence
- AUTO_DEPLOY_VERIFIED: `NO`
- rollback verification: TODO
- runit/health verification: TODO
- persistence sanity: TODO

## Upstream pitch
Potential deployment-tooling candidate after local proof.

## Review / PR state
- next action: design and implement pull-based merge-SHA deployment contract.
- gate rule: `AUTO_DEPLOY_GATE` may become `ENABLED` only after local backup/apply/verify/rollback tests pass and `AUTO_DEPLOY_VERIFIED` becomes `YES`.
