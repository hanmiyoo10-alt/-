# MCL RDC session evidence v1

`mcl-rdc-session-evidence` is a read-only, device-local projection for one bounded
question: under the verified Desktop Commander command agent, is there another
direct RDC command-session shell besides the current command-session root?

It is not a session registry, packet owner, recovery writer, process controller,
heartbeat, takeover mechanism, or abandonment authority.

## Public surface

```text
node mcl-rdc-session-evidence.cjs inspect
```

No public executor, repository path, process id, `/proc` path, command, shell,
agent selector, timeout, TTL, session id, or arbitrary host argument exists.

The owner infers one fixed execution profile from the current working directory:

- `S`: `/root/nyang-repo/**` or `/root/nyang-worktrees/**`
- `M`: `/data/data/com.termux/files/home/nyang-repo/**` or
  `/data/data/com.termux/files/home/nyang-worktrees/**`

Unsupported context is `UNKNOWN / EXECUTION_PROFILE_UNKNOWN`.

## Projection

```text
verified command agent + no peer direct shell
→ PASS / ABSENT / SOLE_RDC_COMMAND_SESSION

verified command agent + one-or-more peer direct shells
→ PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT

ambiguous/read-failed topology
→ UNKNOWN / UNKNOWN / RDC_AGENT_TOPOLOGY_AMBIGUOUS
```

`PRESENT` proves only that another RDC command session exists. It never proves
that the session owns a packet, lease, holder, source effect, or recovery right.

The implementation distinguishes the command agent from the parent RDC `remote`
server and never exports PID/PPID, cmdline, process tree, account/session/device
identity, environment, duration, credentials, or free-form diagnostics.

## Recovery compatibility

The existing S-only effect-recovery inspector imports this owner. For its
historical fail-closed semantics:

```text
ABSENT  → existing sessionState=ABSENT
PRESENT → existing sessionState=UNKNOWN / OTHER_RDC_COMMAND_SESSION_PRESENT
UNKNOWN → existing sessionState=UNKNOWN
```

The recovery inspector remains S-only as a whole. This owner does not widen
generic recovery semantics.

## Validation

```text
node products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs
node products/chatgpt-mobile-coder-lab/coordination/effect-recovery/tests/test-effect-recovery-inspect.cjs
node --check products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/mcl-rdc-session-evidence.cjs
node --check products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs
```

Synthetic `/proc` injection exists only through module APIs for deterministic
contract tests. It is not a public runtime selector.
