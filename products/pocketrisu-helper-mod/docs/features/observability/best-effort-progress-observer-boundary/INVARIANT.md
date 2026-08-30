# BEST-EFFORT-PROGRESS-OBSERVER-BOUNDARY

Status: `HOLD`

## Problem / evidence

`PocketRisu-Alter/PocketRisu-Alter@026f7a08de8312c37b4f6f71f90d020e62231efa` added per-stage progress for a multi-step server pipeline. The important transferable mechanism is that progress reporting is explicitly best-effort: the observer callback is optional and exceptions from it are swallowed so the primary workflow cannot fail because the status sink failed.

## Minimal safe scope

Only apply this invariant when PocketRisu has a real multi-stage server workflow and a user-visible status/progress transport. Do not introduce such a workflow merely to use this pattern.

The first safe slice is:

1. define a small typed progress-event contract owned by the workflow;
2. wrap the observer invocation in a no-throw boundary;
3. forward events additively through the existing status transport;
4. add regression tests proving the underlying job result is unchanged when observation is absent, broken, delayed, duplicated, or dropped.

## Ownership boundaries

- workflow owner: authoritative stage lifecycle and final success/failure;
- observer adapter: converts lifecycle transitions into typed progress events;
- transport: forwards events but does not own workflow correctness;
- UI: renders best-effort state and tolerates missing/out-of-order/duplicate events.

## Mechanism

A workflow may call an optional observer with typed events such as stage-set announcement, start, completion, skip, or failure. Observer invocation must be isolated with a no-throw wrapper. The primary result path must not await UI acknowledgement and must not derive success from telemetry delivery.

## Compatibility / invariants

- same workflow input must produce the same authoritative result with observer enabled or disabled;
- observer exceptions must not fail generation, persistence, or cleanup;
- dropped progress events must degrade only UX/diagnostics;
- event payloads must not expose secrets or full provider error bodies without separate review;
- no Android notifications on the server phone;
- keep runit; no PM2/runtime migration;
- no DB flush/save-integrity behavior changes;
- external variant architecture is evidence, not authority.

## Validation / acceptance

Required cases if activated:

- no observer;
- observer throws on every event;
- transport silently drops events;
- duplicate/out-of-order events;
- skipped stage;
- stage error with workflow fail-open and fail-closed modes as applicable;
- successful completion.

Acceptance: authoritative job outcome and durable state must match the observer-disabled baseline in every case where telemetry is intended to be non-critical.

## Risk / blast radius

Low when constrained to an existing workflow/status boundary. The main risk is accidentally turning a diagnostic callback into a correctness dependency or leaking sensitive errors through status payloads.

## Rollback / fallback

Remove or disable the observer adapter and continue the primary workflow unchanged. Because status transport owns no durable state, rollback should not require data migration.

## Dependencies / PR decomposition

Dependency: matching PocketRisu multi-stage server workflow/status transport and explicit ownership of the stage lifecycle.

Suggested single-feature PR if ever activated: typed event contract + no-throw observer wrapper + focused tests. UI polish or new workflow features belong in separate PRs.
