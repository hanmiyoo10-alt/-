# MCL L interrupted recovery rebind

Coordination-only recovery for an L IMPLEMENTATION_PR classified
ABANDONED_LEASE_RELEASE.

Flow: classify -> old D-013 release -> stale-holder cleanup -> exact reacquire ->
recovery D-014 + HANDOFF_READY -> dirty preservation proof -> holder absent.

CLI selects only target packet; all repository/workspace identities are derived.
No source/index/ref/PR mutation or new holder claim belongs here.

A worktree-local exclusive lock and secret-free atomic journal serialize retries.
Release is freshly reclassified; RECOVERY_REBOUND requires exact handoff readback.
All authority flags remain false.
