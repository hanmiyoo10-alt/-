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
