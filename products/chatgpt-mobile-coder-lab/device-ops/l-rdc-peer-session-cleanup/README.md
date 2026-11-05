# MCL L RDC peer-session cleanup

Fixed L-only owner for removing reviewed peer RDC command-session trees under the
currently verified Desktop Commander command agent.

## Public surface

```text
inspect
cleanup
cleanup --confirm-no-other-intentional-l-rdc-work
```

No caller PID, PPID, process, session, agent, command, path or timeout selector exists.
Cleanup without the exact confirmation performs no process effect.

## Admission and effect

A peer is eligible only from fresh exact evidence: one verified current command
agent/root; a reviewed direct shell child; exact direct `conhost.exe + wsl.exe`
shape; valid CreationTime parent links through the full candidate tree; no
marker-bearing/unreadable plausible alternate agent; and no unexpected child or
current-agent/root/wrapper target.

The fixed helper starts a private process-start monitor before the final target
snapshot, rejects tree expansion or stale relations, opens identity-bound
anchor/target handles, rechecks every required anchor as live immediately before
effect, terminates only through those handles deepest-first, and uses a finite
target-scaled total deadline.

Add-Type receives only one owner-created private writable directory via `TEMP` and
`TMP`; arbitrary inherited environment and caller temp paths are forbidden. The
directory, handles and event subscription are cleaned on every path.

## WSL bounded multi-peer-tree pidfd profile

The fixed L WSL2 profile composes the existing read-only
`mcl-l-rdc-session-evidence.v2` admission with a bounded peer-forest effect
ceiling. It admits reviewed direct peer roots together with their fully observed
descendants only when the complete target forest fits the source-enforced target
ceiling. Unreadable/ambiguous topology, marker-bearing or agent-like descendants,
unexpected direct children, excess target cardinality, or PID/PPID/start-time
identity drift fails closed.

The WSL effect never uses a process group or session group because the natural L
topology does not isolate peers on those boundaries. It uses fixed
`/usr/bin/python3` and pidfds for the exact agent, current root, and every
process in the reviewed peer forest. Private guards bind PID + PPID + Linux
`/proc/<pid>/stat` start-time identity.

Immediately before termination, the helper:
1. opens exact pidfds for the agent, current root, and every target in the peer forest and revalidates all guards;
2. proves the complete direct-child set is exactly current-root plus the reviewed peer roots and every target's direct-child set equals the reviewed tree;
3. sends `SIGSTOP` only through every exact target pidfd and requires the full target forest to become stopped;
4. while the complete target forest is frozen, rechecks all guards and the full reviewed topology;
5. resumes every stopped target that has not received the terminal effect and fails closed on any pre-effect mismatch;
6. only after the frozen-topology barrier passes, sends the terminal signal through exact target pidfds in deepest-first order and waits boundedly for every target pidfd to exit.

The frozen-topology barrier prevents any admitted peer tree from expanding while
another target is being removed. Missing/ambiguous helper acknowledgement cannot
manufacture completion. Outer helper failure attempts exact guard-bound resume
for every target that may have been stopped and remains UNKNOWN even when
recovery succeeds.

The WSL profile accepts no caller PID, process, signal, helper, path, or timeout
selector and exposes no generic process-group or session-group effect. The
existing exact confirmation `--confirm-no-other-intentional-l-rdc-work`
remains mandatory before any live cleanup effect.

## Descendant-monitoring proof

Every attempted termination requires a completed event drain. The helper enumerates
the event queue and filters the fixed private source identifier in memory, so zero
matching events is a normal successful observation.

Private helper output carries strict boolean `monitoringComplete`. It becomes true
only after drain/filter/lineage checking completes. A late descendant remains
non-recoverable `LATE_DESCENDANT_OBSERVED`; monitoring failure remains
`DESCENDANT_MONITORING_INCOMPLETE`.

After any possible effect, the JS owner may increment completed effect count or
recover an uncertain acknowledgement only when `monitoringComplete === true`.
Missing/invalid helper output therefore cannot become COMPLETE merely because the
original guarded targets later disappear.

Final success still requires fresh shared session evidence:

```text
PASS / ABSENT / SOLE_RDC_COMMAND_SESSION
```

## Safety, privacy and authority

No elapsed/idle abandonment, PID-only/taskkill/kill-by-name fallback, Desktop
Commander restart, Startup/logon, repository coordination, network or security
mutation is owned here. Public receipts contain only bounded counts/dispositions/
reason codes and never expose process/session/creation/temp identity.

Repository/device/merge/release/production authority flags remain false.

## Repair lineage

#3803 preserves the five-P1 and two-P1 safety design from closed/unmerged predecessor
PRs and repairs only the #3802 review findings: empty event queues are valid completed
monitoring observations, and lost/invalid helper acknowledgements require affirmative
monitoring-complete proof.

IMPLEMENTATION_PR is process-effect-free. Real cleanup is allowed only after reviewed
merge, POSTMERGE_CONVERGENCE and fresh EXPERIMENT_CLOSE admission.
