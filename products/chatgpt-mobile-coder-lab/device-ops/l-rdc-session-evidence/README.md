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

The owner walks at most 16 ancestors from its own runtime PID.

A command-agent candidate must satisfy both:

1. its normalized command line contains both compile-time markers
   `@wonderwhy-er/desktop-commander` and `/dist/index.js`;
2. the next process below it in the current ancestor chain is a direct shell
   child named exactly `cmd.exe`, `powershell.exe`, or `pwsh.exe`.

Exactly one such candidate is required.

Every parent-child edge used for the ancestor chain, command-agent relation,
peer-shell classification, or unexpected-child classification must also prove:

```text
parent CreationTimeMs <= child CreationTimeMs
```

This rejects stale `ParentProcessId` relationships after Windows PID reuse.
Missing, malformed, or contradictory creation-time evidence fails closed to
`UNKNOWN`; no timestamp age or inactivity inference is introduced.

This intentionally distinguishes the active command-agent relation from other
Desktop Commander processes that may contain the same package path.

The current shell root must be one direct child of that agent. Other direct
children are classified as follows:

- another fixed shell name → peer RDC command session;
- `conhost.exe` → fixed Windows console-host sibling and ignored;
- anything else → topology ambiguous / UNKNOWN.

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

- `PASS / ABSENT / SOLE_RDC_COMMAND_SESSION` means no peer direct command
  shell was observed under that exact verified command agent.
- `PASS / PRESENT / OTHER_RDC_COMMAND_SESSION_PRESENT` means at least one
  peer direct shell exists. It does **not** prove that shell owns a packet,
  lease, holder, source effect, or recovery right.
- missing, duplicate, malformed, unreadable, unsupported, or unexpected
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
