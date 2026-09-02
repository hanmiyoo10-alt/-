# MODEL-JOB-RECOVERY-PRESERVES-CHRONOLOGICAL-ORDER

Status: `ADOPTED`

## Problem / evidence

Official PocketRisu commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` fixed recovery of multiple terminal, unclaimed main-generation jobs. Recovery appends job results to the chat in retrieval order, so newest-first retrieval could insert a later reply above an earlier one. Current `develop` retains ascending `created_at` order for this recovery view.

## Minimal safe scope

This invariant applies only to replay/recovery ordering of terminal, unclaimed `kind = 'main'` model jobs. It does not authorize changes to job execution, cancellation, storage layout, provider behavior, or auxiliary-job recovery.

## Ownership boundary

- Server Node model-job journal owns durable job state and recovery enumeration.
- Chat recovery owns conversion of eligible terminal main jobs into visible chat messages.
- Auxiliary jobs are not chat messages and remain outside this replay stream.

## Mechanism

Enumerate eligible terminal, unclaimed main jobs oldest-to-newest before appending recovered results to chat. Once claimed, a job must not replay again.

## Compatibility / invariants

- Multiple recovered replies preserve creation chronology.
- Auxiliary jobs never become recovered chat messages.
- Claimed jobs are not duplicated.
- Existing PocketRisu save/integrity behavior remains unchanged.
- No visibility/pagehide flush behavior is introduced.
- `flushServerDbKeepalive()` remains untouched.
- runit remains the service manager; no PM2.
- No Android notification behavior is added.

## Validation / acceptance

A focused regression fixture should create at least two terminal unclaimed main jobs for the same chat with distinct timestamps, recover them, and assert oldest-to-newest append order. It should also include an auxiliary job and a claimed main job and assert neither is replayed.

Acceptance fails if retrieval order can invert visible chronology, if recovery duplicates a claimed row, or if auxiliary work is inserted into chat.

## Risk / blast radius

Risk is low and localized to recovery enumeration, but wrong ordering is user-visible correctness corruption after restart/crash recovery.

## Rollback / fallback

If a future queue redesign cannot prove deterministic chronological replay, retain the current ascending recovery view and old recovery path rather than switching ordering by assumption.

## Dependencies

`NONE` for the existing invariant. Any future storage/schema redesign must preserve equivalent ordering and eligibility semantics.

## PR decomposition

No implementation PR is required now because official PocketRisu already adopts the invariant. If regression occurs, use one isolated PR containing only the recovery-order fix and focused regression tests.
