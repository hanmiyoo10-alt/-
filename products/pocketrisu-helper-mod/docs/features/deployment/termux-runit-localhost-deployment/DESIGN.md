# TERMUX-RUNIT-LOCALHOST-DEPLOYMENT — design draft

Feature-ID: `TERMUX-RUNIT-LOCALHOST-DEPLOYMENT`
Lifecycle: `DESIGN_NEEDED`

## Problem / evidence

`nevaeh5379/HaejeokRisuai` commit `75d3da1a03b30ae934dbb8939dad5740264728a1` adds a first-class Android/Termux server deployment. Its useful evidence is not the installer verbatim but the deployment boundary: a private PostgreSQL cluster, Node server, `termux-services`/runit, localhost-only default listen address, explicit LAN opt-in, release-bundled runtime, and validation of deployment scripts in CI.

This is relevant to PocketRisu's server-phone workflow, but it is a host/runtime/package/database deployment change and therefore is not eligible for autonomous implementation.

## Minimal safe scope

Design-only until explicitly authorized. If later implemented, decompose into independently reviewable slices:

1. document current PocketRisu server-phone ownership and existing runit service topology;
2. add a localhost-only listen-address invariant/test without changing package/runtime ownership;
3. define release bundle contents and reproducibility/checksum contract;
4. only then design installation/update scripts and any private database provisioning.

Do not introduce PM2. Do not create Android notifications.

## Ownership boundaries

- Android/Termux host packages and runtime
- runit / `termux-services` service definitions
- Node server listen/bind configuration
- database service and data directory
- release artifact/build pipeline
- PocketRisu application data and backup/restore ownership
- optional LAN exposure controls

## Proposed mechanism

Prefer a self-contained released runtime bundle whose application files are distinct from persistent data. Keep services under runit. Bind the application server to `127.0.0.1` by default. Any LAN mode must be explicit, reversible, and visibly report the exposure state. Database and application data paths must survive application updates and must be included in the backup/restore contract before update automation is allowed.

Package installation, runtime migration, PostgreSQL provisioning, and device-level configuration are separate high-risk actions; the application must not silently perform them during a normal PocketRisu update.

## Compatibility / invariants

- keep runit; never introduce PM2;
- server phone must not create Android notifications;
- localhost-only networking is the safe default;
- LAN exposure is opt-in and reversible;
- application updates must not delete or relocate persistent data implicitly;
- backup/restore ownership must be explicit before database/runtime migration;
- existing PocketRisu save/integrity optimizations remain unchanged;
- no forced DB flush on `visibilitychange` / `pagehide`;
- `flushServerDbKeepalive()` remains a no-op unless separately reviewed;
- targeted V3 plugin reload behavior is unaffected.

## Validation / acceptance

Before implementation can become execution-ready, require:

- clean-device install test from a supported current Termux version;
- reboot/service restart test proving runit ownership and no duplicate processes;
- localhost bind assertion and negative remote-connect test by default;
- explicit LAN enable/disable test;
- interrupted install/update recovery test;
- upgrade and rollback test with persistent data preserved;
- backup + clean-context restore round trip for all required data domains;
- disk-space and package-failure handling;
- checksum/release-artifact verification;
- resource measurements on the target server phone (RSS, CPU, storage growth, idle load);
- confirmation that no Android notification path is introduced.

Acceptance requires deterministic recovery from a failed update without destructive guessing.

## Risk / blast radius

High. A faulty implementation can break startup, expose the server to the network, corrupt or strand database data, consume device storage, or leave package/runtime state inconsistent. The design therefore remains `DESIGN_NEEDED` and `SYSTEM_UPDATE_REQUIRED`.

## Rollback / fallback

Keep the currently supported server-phone deployment as the fallback until a Termux path has passed clean-install, upgrade, rollback, and restore tests. Runtime bundles must be versioned so the prior known-good application bundle can be restored without changing persistent data. Database schema/runtime changes need their own explicit rollback or forward-recovery plan.

## Dependencies

- inventory of the current PocketRisu server-phone deployment and runit services;
- authoritative persistent-data and backup-domain inventory;
- supported Termux/Node/PostgreSQL version policy;
- listen-address / LAN exposure ownership;
- release artifact signing/checksum policy;
- explicit user authorization for any future system/package/runtime migration.

## PR decomposition

1. documentation + invariants/tests for listen-address and service ownership;
2. release bundle contract/build-only changes;
3. installer/update mechanism behind explicit system-update authorization;
4. database provisioning/migration only as a separately reviewed high-risk PR;
5. LAN exposure controls as a separate security-reviewed PR.

One feature per branch/PR; do not mix unrelated cleanup.
