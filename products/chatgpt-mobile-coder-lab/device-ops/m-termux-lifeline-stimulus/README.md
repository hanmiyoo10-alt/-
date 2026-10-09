# MCL M Termux lifeline stimulus v1

This owner provides one narrow loss stimulus for the physical M whole-Termux
recovery experiment owned by #2756.

It does not recover Termux, prove recovery, force-stop an Android package,
reboot the phone, change Android settings, grant permissions, or expose a
generic process-kill interface.

## Operations

The public CLI accepts exactly one token:

```text
python mcl-m-termux-lifeline-stimulus.py check
python mcl-m-termux-lifeline-stimulus.py fire
```

There is no caller-selected PID, package, signal, timeout, path, retry count, or
fallback.

`check` is read-only. It validates the current package/process boundary and
emits a bounded receipt without sending any signal.

`fire` is an effectful experiment primitive and is **not** authorized merely
because this file exists. It may be used only after merge/postmerge and fresh
#2792/#2756 EXPERIMENT_CLOSE admission.

## Fixed target and preservation boundary

The owner first requires the current Android UID package family to equal exactly:

```text
com.termux
com.termux.api
com.termux.boot
```

The fixed package query is scoped to the current UID. Any extra/missing package,
UID disagreement, malformed output, or unreadable process identity fails closed.

The owner then takes one bounded snapshot of current-UID processes from
`/proc`.

Preserved roots are only processes whose first cmdline token equals exactly:

```text
com.termux.api
com.termux.boot
```

Those roots and their descendants are excluded from the target set. Every other
current-UID process is part of the Termux process-domain target, including the
stimulus process itself.

This deliberately avoids a UID-wide kill because Termux:API and Termux:Boot
share the Android UID with ordinary Termux.

## Effect contract

`fire` additionally requires the existing ordinary M RDC route marker:

```text
DC_REMOTE_DEVICE=true
```

Before any terminating signal, the owner performs one signal-0 capability
preflight for every target from the frozen snapshot.

If that preflight passes:

1. each target peer receives exactly one fixed `SIGTERM`;
2. a target that already disappeared is not retried;
3. the stimulus process receives the same fixed `SIGTERM` last;
4. there is no SIGKILL escalation, retry loop, process-group kill, force-stop,
   reboot, package mutation, settings mutation, or network reset.

The stimulus never claims that `fire` succeeded. Before the first terminating
signal it emits only an admission receipt with:

```text
effect=external_proof_required
result=external_proof_required
```

The dying caller's output is not recovery evidence.

## External proof boundary

#2756 remains the owner of experiment truth.

A later authorized live experiment must use an independently surviving
observation path to prove all required facts, including:

- the ordinary Termux/RDC process domain actually disappeared;
- the Android Termux package remained installed and not force-stopped;
- the separately reviewed lifeline path issued at most its bounded recovery
  effect;
- heartbeat and required M control-plane health returned without manually
  opening Termux;
- Termux:API/Boot preservation and all neighboring safety contracts remained
  intact.

Partial or ambiguous loss is evidence, not success.

## Receipt

Normal output contains only semantic fields:

```text
schema=mcl-m-termux-lifeline-stimulus.v1
operation=<check|fire|invalid>
package_family=<exact|unknown>
process_snapshot=<exact|unknown>
preserved_domain=<exact|unknown>
target_domain=<admitted|unknown>
route=<not_required|verified|blocked>
effect=<none|external_proof_required>
result=<pass|blocked|unknown|external_proof_required>
details=withheld
```

No PID, UID, cmdline, package-private path, process tree, environment, raw
package output, log, session identity, or command stderr is emitted.

Exit codes for ordinary terminating paths:

- `0`: read-only `check` passed;
- `3`: fail-closed blocked precondition;
- `4`: unknown local evidence/failure;
- `64`: unsupported invocation.

A real admitted `fire` is expected to terminate its own caller. If it returns
because the final self-signal did not terminate the process, the fallback exit
is non-success and still requires external proof.

## Validation

Repository implementation validation:

```sh
python3 -m py_compile \
  products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline-stimulus/mcl-m-termux-lifeline-stimulus.py

python3 -m unittest discover \
  -s products/chatgpt-mobile-coder-lab/device-ops/m-termux-lifeline-stimulus/tests -v

git diff --check
```

These checks prove only the bounded source contract. They do not authorize or
execute `fire` on M.
