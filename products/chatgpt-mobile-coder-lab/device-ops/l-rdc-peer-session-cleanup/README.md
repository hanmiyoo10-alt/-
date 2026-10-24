# MCL L RDC direct-peer session cleanup v1

This owner is the narrowly reviewed process-effect companion to
`mcl-l-rdc-session-evidence.v2` for physical L.

It exists for one case only: the current verified Desktop Commander command agent is
healthy, the current command root is known, and one or more *direct peer command
shell trees* remain under that same agent while the operator explicitly confirms that
no other intentional L RDC work should remain active.

It is not a generic process manager, abandonment timer, takeover owner, service
controller, recovery writer, or packet/lease authority.

## Public surface

```text
node mcl-l-rdc-peer-session-cleanup.cjs inspect
node mcl-l-rdc-peer-session-cleanup.cjs cleanup
node mcl-l-rdc-peer-session-cleanup.cjs cleanup --confirm-no-other-intentional-l-rdc-work
```

`cleanup` without the fixed confirmation is a bounded `BLOCKED` result and performs
no process read or effect. No PID, session, agent, process-name, command, timeout,
repository, packet, lease, holder, or arbitrary selector is accepted.

## Read-only inspect

`inspect` uses the same fixed Windows process observation as the merged
`mcl-l-rdc-session-evidence.v2` owner.

Normal output contains only bounded counts/dispositions/reason codes. PID/PPID,
command lines, process-tree bytes, Windows account/session/device identity, process
environment, WSL command contents, credentials and coordination claims are withheld.

## Cleanup admission

A peer is eligible only when all of the following are true under one fresh process
table:

1. exactly one current command-agent candidate and current command root are proven;
2. the peer is a direct fixed shell child of that exact agent;
3. the peer is not on the current owner/probe ancestor chain;
4. the agent-to-peer CreationTime relation is valid;
5. the peer has exactly one direct `conhost.exe` and one direct `wsl.exe`;
6. every direct child relation is CreationTime-valid;
7. neither the peer nor any descendant carries Desktop Commander agent markers;
8. unreadable agent-like descendants fail closed;
9. current-agent direct topology contains no unexpected child;
10. same-lineage wrapper topology is exact and contains no wrapper peer shell;
11. alternate-agent evidence is exact ABSENT;
12. the current session-evidence classification is exactly
    `PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT`.

All peers must pass the same rules. A mixed eligible/blocked set blocks the whole
cleanup transaction.

Topology does not prove abandonment. The effect also requires the fixed operator
confirmation:

`--confirm-no-other-intentional-l-rdc-work`

This confirmation grants no authority over the current root, Desktop Commander
agent/wrapper, alternate agents, unrelated processes, services, startup/logon,
repository state, coordination, network or security state.

## Fixed process effect

The cleanup owner no longer uses PID-only `taskkill`.

Its only effect primitive is one fixed PowerShell/C# Win32 helper embedded by the
owner. The helper receives internally derived guard material through child stdin, never
through public CLI arguments. For the current root/agent-wrapper anchors and the full
target peer tree it:

1. opens all required Windows process handles;
2. reads each handle-bound creation FILETIME with `GetProcessTimes` and normalizes both sides to the CIM-owned 1-microsecond precision boundary;
3. compares every FILETIME to the private guard identity captured by the fixed process
   observer;
4. performs **no termination at all** unless every required handle validates;
5. terminates only through the already-open validated target handles, deepest
   descendants first;
6. waits boundedly for each terminated handle and closes every handle on every path.

`OpenProcess`, `GetProcessTimes`, `TerminateProcess`, `WaitForSingleObject` and
`CloseHandle` are the fixed primitive. There is no PID-only `taskkill` fallback,
kill-by-name path, `/F` escalation, arbitrary PowerShell/CMD, or caller-selected target.

The fixed private observer adds a non-public `CreationFileTime` identity to its process
rows while preserving the shared session-evidence `CreationTimeMs` contract. The two
representations must agree at millisecond precision before a row can enter cleanup
admission. `CreationFileTime` is retained only in process memory and is never emitted
in public receipts.

Before every effect the owner also re-reads the complete topology and requires exact
current anchor identity, remaining candidate-tree identity, parent/name/CreationTime,
and private FILETIME identity. An unavailable mandatory pre-effect observation remains
`UNKNOWN`; it is never rewritten as determinate drift.

After the helper returns, the owner re-reads topology and requires **every guarded
identity in the target tree** to be absent before incrementing `effectCount`. A vanished
root with surviving guarded `conhost.exe`, `wsl.exe`, or deeper descendant is
`PARTIAL / GUARDED_TREE_STILL_PRESENT`, never success. Lost helper acknowledgement is
recovered only by this full-tree readback and is never blindly retried.

## Success proof

A helper return code is not success proof.

The owner reports `PEER_SESSION_CLEANUP_COMPLETE` only when fresh final evidence
shows:

- the original current agent and current root identities are still exact;
- no direct peer cleanup candidates remain;
- the exact session-evidence classifier returns
  `ABSENT / SOLE_RDC_COMMAND_SESSION`.

A separate caller still owns the ordinary RDC reachability readback required by the
live #3594 experiment. This owner does not authorize #3592 completion or #3583 E
admission by itself.

## Authority boundary

The receipt keeps all repository/device/merge/release/production authority flags
false. They are non-delegation flags, not a claim that a successful `cleanup`
invocation had no bounded process effect.

This owner never:
- kills by executable name;
- accepts caller PID/session/agent selectors;
- uses elapsed/idle age as abandonment;
- restarts Desktop Commander;
- changes Startup/logon, packages, Node/undici, network or Tailscale;
- writes Git/repository/ref/index/worktree state;
- mutates D-013/D-014/holder state;
- runs arbitrary shell/PowerShell/CMD.

## Validation

```text
node --check products/chatgpt-mobile-coder-lab/device-ops/l-rdc-peer-session-cleanup/mcl-l-rdc-peer-session-cleanup.cjs
node --test products/chatgpt-mobile-coder-lab/device-ops/l-rdc-peer-session-cleanup/tests/test-mcl-l-rdc-peer-session-cleanup.cjs
git diff --check
```

Live `cleanup` remains forbidden until #3597 reaches reviewed merge,
POSTMERGE_CONVERGENCE, and EXPERIMENT_CLOSE authority.
