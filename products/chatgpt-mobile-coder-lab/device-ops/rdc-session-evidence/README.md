# MCL RDC session evidence v1

`mcl-rdc-session-evidence` is a read-only, device-local projection for one bounded
question: under the verified Desktop Commander command agent, is there another
direct RDC command-session root besides the current command-session root?

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

## Command-agent identity

The process reader parses `cmdline` as NUL-delimited argv. A command agent is
recognized only when one argv token is the exact Desktop Commander
`node_modules/@wonderwhy-er/desktop-commander/dist/index.js` script under one
of these reviewed wrappers:

- `desktop-commander-remote` (legacy direct-S/M profile);
- `desktop-commander-remote-termux` (current S-Termux ingress).

The parent server whose final argv token is `remote` remains excluded. Marker
text embedded inside another argv token, such as a caller script body, does not
become command-agent identity.

## Command-session roots

Existing direct shell roots remain unchanged.

For executor `S` only, the current S-Termux→Ubuntu PRoot ingress also admits a
direct command-agent child as a session root only when it is the exact Termux
`proot` executable and carries the reviewed fixed PRoot-Distro launcher
fingerprint:

```text
/data/data/com.termux/files/usr/bin/proot
--kill-on-exit
--link2symlink
--sysvipc
--rootfs=.
--cwd=/root
/bin/bash
-c
```

This is topology evidence, not command authorization. The owner does not inspect
or export the nested command payload.

A second direct shell or second exact fixed S PRoot root under the same verified
command agent is a peer command session. Near-match PRoot children, arbitrary
direct children, unreadable topology, or use of the PRoot form under executor
`M` remain `UNKNOWN`.

## Projection

```text
verified command agent + no peer reviewed command-session root
→ PASS / ABSENT / SOLE_RDC_COMMAND_SESSION

verified command agent + one-or-more peer reviewed command-session roots
→ PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT

ambiguous/read-failed topology
→ UNKNOWN / UNKNOWN / RDC_AGENT_TOPOLOGY_AMBIGUOUS
```

`PRESENT` proves only that another RDC command session exists. It never proves
that the session owns a packet, lease, holder, source effect, or recovery right.

The outward receipt never exports PID/PPID, argv/cmdline, process tree,
account/session/device identity, PRoot path details, environment, duration,
credentials, or free-form diagnostics.

## Recovery compatibility

The existing S-only effect-recovery inspector imports this owner. Its historical
fail-closed semantics stay unchanged:

```text
ABSENT  → existing sessionState=ABSENT
PRESENT → existing sessionState=UNKNOWN / OTHER_RDC_COMMAND_SESSION_PRESENT
UNKNOWN → existing sessionState=UNKNOWN
```

This bridge supplies stronger positive evidence for the current fixed S-Termux
transport only. It does not widen generic recovery semantics.

## Validation

```text
node products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs
node products/chatgpt-mobile-coder-lab/coordination/effect-recovery/tests/test-effect-recovery-inspect.cjs
node --check products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/mcl-rdc-session-evidence.cjs
node --check products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs
```

Synthetic `/proc` injection exists only through module APIs for deterministic
contract tests. It is not a public runtime selector.
