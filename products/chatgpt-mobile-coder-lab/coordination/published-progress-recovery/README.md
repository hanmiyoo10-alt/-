# MCL published-progress validation recovery

This directory owns the Phase 8.6.5b published-progress recovery surfaces.

The read-only inspector adapts current Mobile Coder Lab evidence into the pure published-progress recovery classifier:

node mcl-published-progress-recovery-inspect.cjs inspect --packet #N --format agent-view

The caller cannot select a repository, host, worktree, branch, PR, process, session state, executable, or command.

The inspector reads the current packet, D-013 ledger, D-014 manifest, workspace-holder identity, the reviewed RDC session-evidence owner, clean Git state, exact local/remote/open-PR head identity, exact PR changed files, descendant proof from the lease base, and the existing read-only D-013 release planner.

Only PASS/ABSENT from the reviewed session owner becomes normalized ABSENT. PRESENT never becomes takeover authority.

## Fixed effect coordinator

The effect coordinator is admitted only after the landed inspector returns:

PUBLISHED_PROGRESS_REBIND_ELIGIBLE

Its public surface is fixed:

node mcl-published-progress-recovery-apply.cjs inspect --packet #N --format agent-view
node mcl-published-progress-recovery-apply.cjs apply --packet #N --apply --format agent-view

The caller cannot select repository, PR, branch, worktree, lease, manifest, holder, session, route, executor, head, base, scopes, command, argv, currentization method, or effect primitive.

The coordinator preserves the exact published PR/head and composes only existing reviewed owners:

old D-013 release
→ old lease absence
→ exact stale-holder cleanup
→ old D-014 PARTIAL recovery evidence
→ fresh main/#485 and COMPLETE overlap
→ fresh D-013 on the same branch/worktree at the preserved PR head
→ fresh VALIDATION_MERGE D-014
→ holder absent
→ RECOVERY_REBIND_READY

It stops before holder claim, currentization, source edit, commit, push, PR mutation, merge, device/runtime effect, release, or production.

Every apply rereads external truth. Exact previously completed effects are reused by semantic identity; conflicting identities fail closed. Time, TTL, latest-comment-wins, and comment ordering are never recovery authority.

The deterministic recovery identity is bound to packet, VALIDATION_MERGE, old lease, old manifest, exact PR, and preserved PR head. It is not an execution run ID and does not create a mutable recovery registry.
