# MCL L RDC peer-session cleanup

Fixed L-only owner for removing only reviewed direct peer RDC command-session trees
under the currently verified Desktop Commander command agent.

## Public surface

```text
inspect
cleanup
cleanup --confirm-no-other-intentional-l-rdc-work
```

There is no PID, PPID, process, session, agent, command, path, timeout, repository,
packet, lease or holder selector. Cleanup without the exact confirmation performs no
process effect.

## Admission

A peer is eligible only when all evidence is fresh and exact:

- one verified current command agent and current command-session root;
- peer is a direct reviewed shell child of that exact agent;
- every parent/child CreationTime relation in the admitted peer tree is valid;
- exact direct `conhost.exe + wsl.exe` shape;
- no marker-bearing or unreadable plausible agent descendant;
- no alternate-agent or unexpected-child ambiguity;
- current root/agent/wrapper are structurally excluded;
- shared v2 evidence is exactly `PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT`.

Any ambiguity blocks. Elapsed/idle time never proves abandonment.

## Identity-bound effect

Private guard material contains PID plus high-resolution creation identity, but is never
published. The fixed helper:

1. starts a private process-start monitor;
2. takes a fresh exact target-tree snapshot after monitoring is active;
3. rejects tree expansion, disconnected targets or stale descendant relations;
4. opens and identity-validates every anchor/target handle before the first termination;
5. revalidates every required anchor handle as live immediately before effect;
6. terminates only through already-validated target handles, deepest first;
7. uses a finite target ceiling and timeout derived from the complete sequential wait
   budget plus startup/event-drain/result margins;
8. rejects any process-start event whose ancestry reaches the guarded target lineage;
9. closes every handle and event subscription on all paths.

This closes the #3598 late-descendant review gap: absence of only the original snapshot
is never enough for COMPLETE. A late descendant event makes the result PARTIAL even if
later public topology looks clean.

## Add-Type environment

The helper receives only one owner-created private writable directory through
`TEMP` and `TMP`. It accepts no caller temp path and no arbitrary inherited
environment. The directory is removed on every return path and never appears in the
public receipt. Preparation or cleanup failure is fail-closed.

## Completion

One target-tree effect counts as complete only after the helper and fresh readback agree.
Final success additionally requires exact shared session evidence:

```text
PASS / ABSENT / SOLE_RDC_COMMAND_SESSION
```

Guard survivors, late descendants, helper timeout, anchor death, identity drift,
tree expansion, partial termination or unavailable evidence can never be promoted to
COMPLETE by a later clean-looking observation. Lost acknowledgement may be recovered
only from full exact readback when no non-recoverable safety reason was observed.

## Privacy and authority

Public receipts contain only bounded counts, dispositions and reason codes. Never emit
PID/PPID, command line, process tree, creation identity, temp path, Windows account,
session/device identity, environment or credentials.

All repository/device/merge/release/production authority flags remain false. The owner
does not mutate Git, D-013/D-014/holder state, Desktop Commander service/startup,
networking or security configuration.

## #3799 five-P1 successor

#3799 supersedes closed/unmerged #3597 / PR #3598 and repairs only:

- invalid links anywhere in descendant trees;
- descendants created after the guarded snapshot;
- writable controlled TEMP/TMP for Windows PowerShell Add-Type;
- anchor liveness immediately before termination;
- total helper deadline sizing.

IMPLEMENTATION_PR is process-effect-free. Real cleanup is allowed only after reviewed
merge, POSTMERGE_CONVERGENCE and fresh EXPERIMENT_CLOSE admission.
