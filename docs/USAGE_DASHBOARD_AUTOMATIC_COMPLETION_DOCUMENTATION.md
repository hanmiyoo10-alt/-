# Local Usage Dashboard — Automatic Completion Documentation Contract

Status: ACTIVE OPERATING PRINCIPLE

Recorded: 2026-08-24

Scope: all work whose primary target is `plugins/usage-dashboard/` or its release/control infrastructure.

## Completion definition

A Local Usage Dashboard task is not complete merely because code, tests, PR, merge, or deployment finished.

Normal completion is:

`implementation -> regression -> PR/CI -> merge -> release/promotion when applicable -> post-state verification -> repository documentation -> DONE`

Repository documentation is part of the work, not an optional follow-up request.

The assistant must not ask the user whether documentation should be added after ordinary plugin work. It should update the appropriate repository record automatically when the technical work is complete.

## What to document

Choose the smallest durable record that accurately represents the completed work.

For a feature/release, record at least:

- the final shipped behavior and explicit non-goals;
- final Product / Engine / Manager / contract tuple when changed;
- the authoritative PR/merge/release evidence;
- important regressions or incidents discovered during implementation;
- real-device verification status, distinguishing VERIFIED from pending device evidence;
- any durable operating rule created by the release.

For release-infrastructure or maintenance work, record at least:

- the control-plane behavior that changed;
- preserved security/permission boundaries;
- CI proof and migration/fallback status;
- whether production bytes/version remained unchanged;
- any follow-up operational proof still required.

For a diagnostics-only investigation, preserve the existing project rule: the diagnostic turn itself is analysis-only. Documentation may record diagnostic evidence, but it must not silently begin a new repair/release without a later user request.

## Documentation targets

Prefer existing durable authorities instead of creating duplicate notes.

Typical targets include:

- `docs/USAGE_DASHBOARD_GUIDELINES.md` for durable project memory and current operating rules;
- release-specific implementation/closure/retrospective documents when the work materially changes a release or workflow;
- focused principle documents for rules that must survive beyond one release;
- release specs/manifests only when their own contract requires a change.

Do not modify machine-maintained release-state text by hand when an existing synchronization tool owns it.

## Evidence contract

Documentation must be written from the actual repository state after the work completes.

Do not claim:

- a PR is merged before it is merged;
- CI is GREEN before the final relevant run succeeds;
- production is deployed before `release-usage-dashboard` proves it;
- exact-byte parity without comparing the actual artifacts/blobs;
- device success before real-device evidence exists.

Pending device verification must remain explicitly pending.

## Automation-first behavior

The expected assistant behavior for plugin work is:

1. perform the technical work without asking the user to run development commands;
2. complete all repository-side validation, merge, and deployment steps available through current tools;
3. re-read final repository/release state;
4. update the durable documentation automatically;
5. create/merge the documentation change through the normal safe repository path;
6. only then report the repository-side work as complete.

If a documentation update would alter production bytes unexpectedly, stop and treat that as a release-safety problem rather than forcing the documentation change.

## User interaction

Documentation work is not a reason to call the user back.

The user should normally be needed only for real Android/PocketRisu evidence that cannot be obtained from repository tooling. Repository-side closure documentation remains the assistant's responsibility.

## Relationship to module splitting

When completed work introduced or changed internal module boundaries, the closure documentation should record the new responsibility boundary when it is architecturally meaningful. Internal module splitting refers to modules inside the single `plugins/usage-dashboard/` plugin and does not imply splitting the product into multiple plugins.

## Closure rule

Before saying a plugin task is fully closed, ask internally:

- Is the final repository state verified?
- Is deployment state verified when this was a release?
- Is real-device status described truthfully?
- Is the durable repository documentation updated?

If the documentation answer is no, the repository-side work is not yet DONE.
