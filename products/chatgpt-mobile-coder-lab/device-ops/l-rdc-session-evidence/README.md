# MCL L RDC session evidence v1

`mcl-l-rdc-session-evidence` is a read-only Windows-side evidence owner for one
bounded question on the physical L route:

> Under the verified Desktop Commander command agent, is there another direct
> RDC command-session shell besides the current command-session root?

It exists because the existing `device-ops/rdc-session-evidence/**` owner is
intentionally Linux/Termux `/proc` based and cannot prove the Windows side of
the L Windows→WSL execution boundary.

This owner is evidence only. It is not a session registry, packet owner,
abandonment timer, takeover mechanism, process controller, recovery writer, or
lease/holder authority.

## Public surface

```text
node mcl-l-rdc-session-evidence.cjs inspect
```

No public PID, process, session, agent, query, path, timeout, shell, command,
repository, lease, holder, packet, or recovery selector exists.

The production execution profile is fixed to Windows `win32 x64`. Other
platform/architecture pairs return `UNKNOWN / EXECUTION_PROFILE_UNKNOWN`.

## Fixed Windows observation

The owner runs one fixed absolute Windows PowerShell executable:

```text
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe
```

with one compile-time encoded read-only script. The script fixes Windows
PowerShell stdout to UTF-8 before JSON serialization, then performs only:

```text
Get-CimInstance Win32_Process
→ project ProcessId / ParentProcessId / Name / CommandLine / CreationTimeMs
→ convert CreationDate to bounded Unix milliseconds
→ bounded JSON returned to the owner process
```

The per-row command-line bound admits the reviewed Windows ceiling of 32,767
characters while the aggregate child-process output remains bounded separately.

The raw process table is internal evidence. It is never part of the normal
receipt or durable repository evidence.

## Command-agent classification

The owner first walks at most 16 ancestors from its own runtime PID.

A current command-agent candidate must satisfy both:

1. its normalized command line contains both compile-time markers
   `@wonderwhy-er/desktop-commander` and `/dist/index.js`;
2. the next process below it in the current ancestor chain is a direct shell
   child named exactly `cmd.exe`, `powershell.exe`, or `pwsh.exe`.

Exactly one current-chain candidate is required.

Every parent-child edge used for the ancestor chain, command-agent relation,
peer-shell classification, or alternate-agent classification must also prove:

```text
parent CreationTimeMs <= child CreationTimeMs
```

This rejects stale `ParentProcessId` relationships after Windows PID reuse.
Missing, malformed, or contradictory creation-time evidence fails closed to
`UNKNOWN`; no timestamp age or inactivity inference is introduced.

After current-agent admission, the owner reuses the **same bounded process
table** to inventory every row carrying the fixed Desktop Commander agent
markers. It does not run a second process query and does not accept a caller
agent/PID/session selector.

The current shell root must be one direct child of the verified current agent.
Other direct children of the current agent are classified as follows:

- another fixed shell name → peer RDC command session;
- `conhost.exe` → fixed Windows console-host sibling and ignored;
- anything else → topology ambiguous / UNKNOWN.

For alternate-agent admission:

- one or more marker-bearing alternate agents with valid direct fixed-shell
  children → `PRESENT`;
- marker-bearing alternate agents with missing/stale/unclassifiable child
  topology → `UNKNOWN`;
- if another process has the exact same executable name as the verified current
  agent but its Windows `CommandLine` value is unavailable/null/empty, treat
  it as a plausible unreadable alternate agent and return `UNKNOWN`;
- a readable same-executable process whose command line does not contain the
  fixed agent markers may be excluded normally;
- an unreadable unrelated executable name does not become an agent candidate
  merely because its command line is unavailable;
- no alternate marker-bearing or unreadable plausible same-executable agent is
  required before `ABSENT` is eligible.

Command-line readability is retained only as internal evidence and is never
exposed in the public receipt.

Therefore v1 `ABSENT` is deliberately stronger and fail-closed: the current
verified agent must be the only safely eligible/plausible Desktop Commander
agent in the bounded table, with no peer shell or ambiguous direct child.
Historical pre-repair ABSENT receipts remain agent-local historical evidence
and must not be reinterpreted as global absence.

There is no elapsed-time, idle-time, latest-wins, PID-age, shell-duration, or
ownership inference.

## Receipt

Normal output is bounded to:

```text
schema=mcl-l-rdc-session-evidence.v1
status=<PASS|UNKNOWN>
executor=L
sessionState=<ABSENT|PRESENT|UNKNOWN>
reasonCode=<bounded reason>
owner=mcl-l-rdc-session-evidence
details=withheld
authority=<all false>
```

Semantics:

- `PASS / ABSENT / SOLE_RDC_COMMAND_SESSION` means the current verified
  Desktop Commander agent is the only marker-eligible command agent in the
  bounded Windows process table and no peer direct command shell exists under
  it.
- `PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT` means the owner has
  definite evidence of at least one additional direct RDC command shell,
  either under the current agent or under another marker-eligible agent. It
  does **not** prove that shell owns a packet, lease, holder, source effect, or
  recovery right.
- alternate marker-bearing agent topology that cannot safely prove a live
  direct command shell remains
  `UNKNOWN / RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS`.
- missing, duplicate, malformed, unreadable, unsupported, stale, or unexpected
  topology remains `UNKNOWN`.

The owner never emits `LIVE` and never converts session presence into current
operation authority.

## Privacy and authority boundary

Normal output never contains PID/PPID, raw command line, process tree,
Windows account/session/device identity, duration, environment, credentials,
holder claim/digest, GitHub data, or free-form diagnostics.

The implementation never terminates/restarts a process, steals a session,
changes a service/configuration, writes a repository/ref/index/worktree,
mutates a lease/holder/manifest, changes network state, or performs recovery.

All repository, device, merge, release and production authority flags are false.

## Relationship to #3481

#3486 is the reviewed repair successor to #3482 and implements only this
evidence prerequisite. #3482 / PR #3485 remain preserved as the unmerged
review-blocked predecessor evidence.

After #3486 merge/postmerge, #3481 still requires a separately reviewed L
interrupted-effect recovery inspector/composition before this evidence can be
used to classify an abandoned lease or authorize any release/rebind sequence.

In particular:

```text
L session evidence
≠ abandonment
≠ takeover
≠ D-013 release
≠ holder cleanup
≠ source continuation
```

## Validation

```text
node --check   products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs

node --test   products/chatgpt-mobile-coder-lab/device-ops/l-rdc-session-evidence/tests/test-mcl-l-rdc-session-evidence.cjs

git diff --check
```

The focused fixtures prove classification and privacy contracts. A live L
Windows `inspect` remains required by #3486 acceptance before IMPLEMENTATION_PR
is considered complete.
