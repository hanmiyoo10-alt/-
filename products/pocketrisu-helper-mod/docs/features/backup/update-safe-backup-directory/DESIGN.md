# Feature design — update-safe backup directory ownership

Feature-ID: `BACKUP-UPDATE-SAFE-DIRECTORY-OWNERSHIP`

## Problem / evidence

External evidence from `PocketRisu-Alter/PocketRisu-Alter@922bd30f70989a9a4af01d4d7b017fe6c05b8226` shows a destructive-update failure class: a user-configured backup directory located inside the application tree can be mistaken for updater-owned files and removed during replacement. Alter mitigates this by separating managed application roots from user-owned backup roots and making updater preservation explicit.

Evidence for direct PocketRisu applicability is not yet established. Current code search did not find the same `server-backup-path` ownership boundary or Alter's updater file, so this remains design-only.

## Classification

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `MEDIUM`
- `Size`: `S`
- `Evidence`: `MEDIUM`
- `Risk`: `HIGH`
- `Dependencies`: INSPECT_ONLY audit of current PocketRisu self-update/replacement ownership and configurable server backup path semantics
- `Priority`: `P1`
- lifecycle: `DESIGN_NEEDED`

## Minimal safe scope

Do not add new updater or custom-backup functionality merely to apply this design. If PocketRisu already has an applicable update-replacement boundary, the first change should only make user-data/app-data ownership explicit for that existing path and add fail-closed tests. No unrelated updater cleanup.

## Ownership boundaries

- updater/replacement code owns application artifacts it installs or replaces;
- backup subsystem owns backup destinations and their durable configuration;
- user-owned data must not become updater-owned solely because it is below the installation root;
- any bridge between backup configuration and a dependency-light updater must be explicit, minimal, and independently validated;
- ambiguous ownership is a stop condition before destructive replacement.

## Proposed mechanism

Prefer a declarative owned-path model over ad-hoc keep lists. Canonicalize candidate paths, determine whether they intersect updater-managed roots, and reject unsafe overlap before backup configuration is accepted or before an update begins. If an updater cannot read the canonical backup configuration directly, use the smallest non-secret durable ownership hint that can be independently checked against the authoritative configuration; disagreement must fail closed rather than guessing.

Do not blindly copy Alter's plaintext marker. The exact mechanism depends on current PocketRisu update/backup architecture.

## Compatibility / invariants

- existing update rollback and failure semantics remain intact;
- application binaries/scripts must never be preserved merely because a user-data keep rule is too broad;
- outside-install backup paths are untouched by updater replacement;
- install-root itself and updater-managed roots are invalid backup destinations when destructive replacement can reach them;
- canonicalization/traversal/symlink or reparse-point ambiguity must not bypass ownership checks;
- no forced DB flush on `visibilitychange`/`pagehide`;
- `flushServerDbKeepalive()` remains no-op unless separately reviewed;
- targeted V3 plugin reload remains unchanged;
- runit remains the service manager; no PM2;
- server phone creates no Android notifications.

## Validation / acceptance

If the applicability audit finds a real boundary, require focused tests for: safe dedicated user-data directory; updater-managed `server`, `dist`, `scripts`, `bin`, dependency/temp roots as applicable; application root; outside-root destination; normalized `..` paths; symlink/reparse-point ambiguity where supported; missing/stale/contradictory ownership metadata; update failure before destructive replacement on ambiguity; rollback restoring the pre-update application state without touching user backups.

Acceptance requires demonstrating both sides: a safe backup directory survives an update, and updater-owned application files are still replaced normally.

## Risk / blast radius

`Risk: HIGH` because a wrong rule can delete backups or preserve stale executable/application files. Path handling also intersects security-sensitive canonicalization. Keep changes localized and fail before replacement when ownership cannot be proven.

## Rollback / fallback

Rollback is removal of the ownership integration and restoration of the previous updater behavior, but only after confirming user backups are outside destructive replacement scope. If safe rollback cannot be guaranteed for an installed layout, disable the affected update path and require a manual migration rather than guessing.

## Dependencies

1. Inspect current PocketRisu update/replacement implementation.
2. Inspect whether server backup destination is configurable and whether it may reside inside install root.
3. Identify authoritative source of path ownership and the updater's dependency/runtime constraints.

## PR decomposition

- PR 1 (only if applicability is proven): pure ownership/canonicalization helper + tests, no destructive wiring.
- PR 2: wire the proven helper into backup-path admission/update preflight with explicit fail-closed behavior.

Do not combine with restore changes, backup-format changes, service/runtime migration, or updater refactors.

## Readiness

Remain `DESIGN_NEEDED`. `READY_TO_PORT` requires the dependency audit to find a concrete PocketRisu call site, direct tests proving the failure class or equivalent ownership ambiguity, and a concrete rollback path.