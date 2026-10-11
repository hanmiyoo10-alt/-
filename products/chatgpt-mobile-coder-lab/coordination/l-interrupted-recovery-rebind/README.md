# MCL L interrupted recovery rebind

Coordination-only owner for an L IMPLEMENTATION_PR already classified
ABANDONED_LEASE_RELEASE.

Flow:

    fresh exact classification
    -> old D-013 release/readback
    -> old holder cleanup-stale
    -> same packet/scope/workspace/base D-013 reacquire
    -> exact recovery-rebind D-014 + HANDOFF_READY
    -> prove tracked dirty diff unchanged
    -> prove new holder absent
    -> stop

CLI:

    node mcl-l-interrupted-recovery-rebind.cjs inspect --target '#N'
    node mcl-l-interrupted-recovery-rebind.cjs apply --target '#N' --apply

Only the target packet is caller-selected. Repository, route, executor, lease,
manifest, branch, worktree, base, paths and recovery disposition come from
current evidence.

The owner never edits/stages/resets/stashes/cleans/commits/pushes/merges source,
never creates or updates a PR, and never claims the new holder. The target
implementation must claim that holder in-process before its next source effect.

Replay safety uses one secret-free worktree-local activation journal plus fresh
ledger/comment/holder readback after every irreversible coordination boundary.
Raw holder claim/digest, process/session identity and credentials never enter
durable output. All authority flags remain false.
