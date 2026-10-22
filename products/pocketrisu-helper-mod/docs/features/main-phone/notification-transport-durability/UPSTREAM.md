# Upstream PR dossier — notification-transport-durability

Feature-ID: `notification-transport-durability`
Area: `main-phone`
PR status: `LOCAL_VALIDATED`
Isolation status: `CLEAN`
Deployment status: `NOT_READY`

## Problem / motivation

PocketRisu on M intentionally runs without the broad shared Termux `runsvdir`. Natural operation proved that standalone relay and notify-tunnel service-specific supervisors can disappear after boot-time recovery, while the separately owned core SSH transport recovers because it has an independent guard/anchor ring.

The initiating Android kill cause of the current recurrence remains unknown. This feature addresses only the proven durability gap.

## Minimal upstream scope

Local helper-mod scope only:
- one fixed notification-transport guard;
- one fixed Termux:Boot/anchor launcher;
- one synthetic durability contract;
- PocketRisu helper validator wiring;
- this feature dossier.

No PocketRisu application source, server source, Android policy, shared runit tree, or private SSH target is changed.

## Dependencies

- #3513 exact installed relay launcher contract;
- existing device-local `pocketrisu-notify-tunnel` run identity;
- main-ssh-tunnel guard/anchor design as precedent only;
- #3711 / #3709 natural evidence;
- #3231 remains a separate Android process-policy owner.

## Local implementation anchors

- branch/commit: `laptop/pocketrisu-notification-transport-durability-3712`; exact SHA recorded after commit.
- rollback: remove only the newly installed guard + Boot launcher after backup; preserve existing relay/tunnel/core bytes.
- local-only wiring: notify-tunnel private destination remains only in the existing device-local run file and is never committed here.

## Verification evidence

- syntax/build: both production shell sources + focused test `sh -n`: PASS.
- tests: notification transport durability focused contract: PASS.
- product validator: PASS, and it executes both the existing relay supervisor contract and the new durability contract.
- runtime: NONE during IMPLEMENTATION_PR.
- restart/persistence: later EXPERIMENT_CLOSE only.
- regression: existing notify relay supervisor focused contract: PASS.
- static boundary: no shared `runsvdir` / `service-daemon` / Android phantom-policy primitive; no private SSH target material.
- `git diff --check`: pending final staged diff readback.

## Upstream pitch

- summary: local M-only durability owner for selective Termux supervisor loss.
- why upstream: not proposed for official PocketRisu; this is a device-specific helper-mod operating layer.
- user-visible behavior: notification transport recovers after selective standalone supervisor loss without restoring the broad service tree.
- risks/tradeoffs: one extra guard + anchor pair; does not solve whole-Termux/process-domain loss.

## Review / PR state

- PR URL:
- head SHA:
- latest result: local implementation + focused/product validation PASS; commit/PR pending.
- next action: exact 7-path staged diff check, commit, non-closing PR, exact-head CI/Required.
