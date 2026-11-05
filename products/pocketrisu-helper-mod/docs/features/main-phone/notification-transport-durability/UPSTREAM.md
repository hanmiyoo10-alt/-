# Upstream PR dossier — notification-transport-durability

Feature-ID: `notification-transport-durability`
Area: `main-phone`
PR status: `MERGED / CLOSED`
Isolation status: `CLEAN`
Deployment status: `DEPLOYED / LIVE_PROVEN`

## Problem / motivation

PocketRisu on M intentionally runs without the broad shared Termux `runsvdir`. Natural operation proved that standalone relay and notify-tunnel service-specific supervisors can disappear after boot-time recovery, while the separately owned core SSH transport can self-recover through a guard/anchor ring.

The initiating Android kill cause of the current recurrence remains unknown. This feature addresses only the proven notification-transport durability gap.

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
- #3231 remains a separate Android process-policy owner;
- #3715 remains a separate core-orphan/runit reconciliation owner.

## Local implementation anchors

- branch/commit: PR #3713 repaired head `0b50688000d0fd6ffd7d1b855c6854e2dfb3ddcf`; primary merge `5231ad79c77f61622eb04b92665232089f5968b0`; final main after test/docs repair #3714 `e559dc09b3c030f31defc74aec6f1d19e7855a2f`.
- rollback: remove only the newly installed guard + Boot launcher after fresh admission; preserve existing relay/tunnel/core bytes. Prior install targets were ABSENT.
- local-only wiring: notify-tunnel private destination remains only in the existing device-local run file and is never committed here.

## Verification evidence

- syntax/build: production guard + Boot/anchor + focused test syntax PASS.
- tests: durability focused contract PASS, including zombie guard/anchor regressions and guard↔anchor mutual recovery.
- product validator: PASS and executes existing relay supervisor + durability focused contracts.
- review: valid P1 zombie stale-lock finding repaired and thread resolved.
- merged-main repair: focused operator-down test ordering race repaired in test/docs-only PR #3714; production guard/anchor blobs preserved.
- final repository: PocketRisu docs + SimCore Verify/Required + Proof Bundle PASS; #485 CLEAR / STABLE / UNKNOWN NONE.
- runtime: physical-M exact merged install PASS.
- restart/persistence: independent guard/anchor mutual controlled hard-loss recovery PASS.
- regression: relay and notify dedicated-runsv controlled loss preserve one exact healthy PID1 orphan and create no duplicate.
- notification integration: real S→M POST HTTP 200 + M Android notification PASS.
- shared service-tree boundary: top-level `runsvdir` remained absent.
- Android policy: unchanged.
- canonical closure: #3712 EXPERIMENT_CLOSE receipt `b984851ee29d5466cd4b999bd403ea534137a3625606b02246d936e75f6835f7`, checkpoint `8cf6d574e9e81320642fbb46dacb302c02b78a4e31966ee55abbebc4d2b73d11`.

## Upstream pitch

- summary: local M-only durability owner for selective Termux notification-supervisor loss.
- why upstream: not proposed for official PocketRisu; this is a device-specific helper-mod operating layer.
- user-visible behavior: notification transport recovers after selective standalone supervisor loss without restoring the broad service tree.
- risks/tradeoffs: one extra guard + anchor pair; does not solve whole-Termux/process-domain loss.

## Review / PR state

- PR URL: #3713 primary; #3714 postmerge test/docs repair.
- head SHA: primary repaired `0b50688000d0fd6ffd7d1b855c6854e2dfb3ddcf`.
- latest result: final main `e559dc09b3c030f31defc74aec6f1d19e7855a2f`; physical-M `LIVE_PROVEN / DONE`; #3712 CLOSED.
- next action: no further merge/deploy for this Feature-ID. Observe naturally; route core orphan reconciliation to #3715 and Android process-loss policy to #3231.
