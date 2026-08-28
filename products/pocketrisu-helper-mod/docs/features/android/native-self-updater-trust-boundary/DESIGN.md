# Feature-ID: ANDROID-NATIVE-SELF-UPDATER-TRUST-BOUNDARY

Status: DESIGN_NEEDED
System impact: SYSTEM_UPDATE_REQUIRED

## Problem / evidence

`nevaeh5379/HaejeokRisuai@af1d48cc9f8fe6d1f4350558b70f424cbb92830f` adds an Android in-app updater with `REQUEST_INSTALL_PACKAGES`, bounded release metadata/APK downloads, SHA-256 verification, package/version checks, and package-installer handoff.

This is useful evidence for a future native PocketRisu client, but current `hanmiyoo10-alt/PocketRisu` has no matching Capacitor/native Android runtime surface. The source implementation therefore cannot be treated as a direct port.

## Minimal safe scope

Design-only until a native Android client is an explicit PocketRisu direction. The first eventual implementation slice must be verification-only: parse and validate signed/provenance-verifiable update metadata and a downloaded package without invoking installation. Installer permission and handoff belong in a later isolated PR.

## Ownership boundaries

- release CI: emits immutable versioned artifacts plus authenticity/provenance metadata;
- update client: downloads bounded metadata/artifact and verifies all trust properties;
- Android package manager: owns user authorization and installation;
- PocketRisu application state: must not be migrated or mutated by the updater before the new package is accepted;
- server phone: this feature must not introduce Android notification behavior.

## Proposed mechanism

1. Fetch metadata from a pinned release channel with strict response-size and timeout limits.
2. Verify metadata authenticity independently of the artifact transport. A hash delivered by the same mutable origin is integrity evidence, not sufficient release authority by itself.
3. Reject downgrade/replay and require monotonic version identity under an explicit channel policy.
4. Download to an app-private temporary file with a hard byte cap and cleanup on every failure/cancel path.
5. Verify digest, package name, version, and signing-certificate identity before making the file installable.
6. Publish/rename the verified artifact atomically inside app-private storage.
7. Only in a separate installer slice, request Android package-install authorization and hand the verified package to the OS installer.

## Compatibility / invariants

- No silent installation or permission bypass.
- No reliance on digest equality alone as authenticity proof.
- No downgrade unless an explicit recovery flow is separately approved.
- No destructive data migration as part of update acquisition.
- Existing PocketRisu save/integrity behavior remains untouched.
- runit/PM2/server deployment behavior is unrelated and must not change.
- Server phone must not create Android notifications.

## Validation / acceptance

Verification-only slice must test:

- oversized/invalid metadata rejection;
- invalid or missing authenticity proof;
- artifact digest mismatch;
- package-name mismatch;
- signing-certificate mismatch;
- manifest/package version mismatch;
- downgrade/replay rejection;
- partial/interrupted download cleanup;
- bounded disk usage and timeout behavior;
- no install intent emitted by the verification-only slice.

Installer slice, if ever authorized separately, must additionally test permission denial/cancel, stale downloaded artifact, OS installer failure, and return-to-app behavior.

## Risk / blast radius

HIGH. A defective updater crosses the package-install and release-supply-chain boundary. Failure can install an unintended build or create an unrecoverable upgrade path. Keep acquisition, verification, permission, and installation decomposed.

## Rollback / fallback

The updater must remain optional. Manual installation from a separately authenticated release remains the fallback. Verification failure must leave the currently installed application and user data untouched. Any installer slice must be removable without changing the data format.

## Dependencies

- explicit native Android PocketRisu product direction;
- release signing/provenance policy;
- pinned package/signing identity;
- version-channel/downgrade policy;
- user-facing installer-permission UX;
- recovery/rollback contract.

## PR decomposition

1. Pure metadata/package verification helpers + fixtures/tests; no installer permission.
2. Bounded downloader + atomic temporary-file publication; still no install intent.
3. Explicit Android permission/installer handoff, only after separate review and user authorization.
4. Optional update UX after failure/cancel/rollback behavior is proven.

Do not move to READY_TO_PORT while the native Android substrate and authenticity/provenance dependencies are unresolved.
