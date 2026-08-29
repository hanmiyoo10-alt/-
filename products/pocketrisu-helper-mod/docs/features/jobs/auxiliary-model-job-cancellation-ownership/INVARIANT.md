# Feature-ID: AUXILIARY-MODEL-JOB-CANCELLATION-OWNERSHIP

## Problem / evidence

`rpaddict/RisuBard@c1259e98bbb6b27697e2e891a96b5cb230c5bff8` wires a single cancellation signal from its long-running BardWiki job owner through model analysis requests, retry/follow-up paths, and resumable reboot state. User cancellation stops work rather than being reported as an ordinary failure.

## Minimal safe scope

Only apply this invariant when PocketRisu has a clearly owned long-running auxiliary-model job. Do not retrofit unrelated primary chat generation or broad provider plumbing without a concrete owner.

## Ownership boundary

The job coordinator owns cancellation. Provider adapters consume a scoped `AbortSignal`; retry and publish/finalization paths must observe the same job state. Resumable job persistence owns the cancelled/paused lifecycle transition.

## Mechanism

A scoped controller is created when the auxiliary job starts. Its signal is threaded to every model request belonging to that job. Before retries or final publication, code re-checks cancellation. A resumable job records cancellation as paused/cancelled and retains enough state to resume safely.

## Compatibility / invariants

- Primary chat generation remains independent unless explicitly owned by the same job.
- Cancellation must stop retries and post-request publication, not just UI animation.
- User cancellation is not a storage or model failure.
- Existing PocketRisu save/integrity, targeted V3 reload, runit, and server-phone notification guardrails remain unchanged.

## Validation / acceptance

1. Reproduce a cancellable auxiliary job in PocketRisu.
2. Prove provider request receives abort.
3. Prove no retry or final publish occurs after cancellation.
4. Prove unrelated chat generation remains active.
5. For resumable jobs, prove persisted state is paused/cancelled and can resume without duplicate application.

## Risk / blast radius

Low when scoped to one job owner. Mis-scoped cancellation could abort unrelated work or leave partial finalization, so cross-job ownership tests are required.

## Rollback / fallback

Remove the scoped cancellation path and retain previous job behavior. No storage migration or system update is involved.

## Dependencies

A matching PocketRisu-owned long-running auxiliary-model job with explicit retry/publish or resumable lifecycle.

## PR decomposition

First slice: failing lifecycle test plus one scoped `AbortSignal` propagation path. Add resumable-state handling only if that job actually persists resumable progress.

Current lifecycle: `HOLD`.