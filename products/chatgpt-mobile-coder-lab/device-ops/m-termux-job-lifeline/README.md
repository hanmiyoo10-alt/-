# M Termux JobScheduler lifeline v1

This owner is the APK-free Candidate B successor for the M whole-Termux recovery
line. It uses the already-installed Termux:API JobScheduler only through one
fixed job identity and one fixed installed script.

It does not replace Termux:API, modify Android settings or permissions, expose a
generic scheduler, synthesize whole-Termux loss, or claim force-stop recovery.

## Fixed scheduler contract

The only managed job is:

- job id: `2756`;
- script:
  `$HOME/.local/lib/mcl-m-termux-job-lifeline/mcl-m-termux-job-lifeline-run`;
- period: `900000 ms`;
- network: `none`;
- battery-not-low: `false`;
- storage-not-low: `false`;
- charging: `false`;
- persisted: `true`.

Before scheduling, the owner reads all pending jobs. If id 2756 belongs to
another script, or the owned script is present with incompatible visible policy,
the owner fails closed. It never uses `--cancel-all`; cancellation can target
only fixed id 2756.

## Fixed job behavior

The installed run wrapper accepts no arguments and invokes the installed
controller's internal `--job-run` action.

The job-run action performs only:

```text
heartbeat-client.py --status
  healthy -> write healthy/no_action receipt
  inactive -> mcl-m-termux-lifeline-recover
           -> heartbeat-client.py --status
           -> write recovered|failed receipt
```

The existing heartbeat and recovery owners remain unchanged.

## Bounded receipt

The periodic job writes only:

```text
schema=mcl-m-termux-job-lifeline-job.v1
liveness_before=healthy|inactive
recovery_attempted=true|false
liveness_after=healthy|inactive
result=healthy|recovered|failed
details=withheld
```

No PID, Android identity, raw stdout/stderr, environment value, auth/session
material, or arbitrary path is emitted.

## Control commands

Repository source is ordinary mode 100644. Invoke explicitly through Python:

```sh
python mcl-m-termux-job-lifeline.py --check
python mcl-m-termux-job-lifeline.py --install
python mcl-m-termux-job-lifeline.py --schedule
python mcl-m-termux-job-lifeline.py --cancel
python mcl-m-termux-job-lifeline.py --last-result
```

- `--check`: read-only managed install/schedule/result projection;
- `--install`: copies only the fixed controller and fixed run wrapper to the
  fixed private install directory, mode 0700;
- `--schedule`: schedules fixed id 2756 only after collision-safe pending
  readback;
- `--cancel`: cancels id 2756 only when it is already proven managed;
- `--last-result`: emits only the bounded job receipt.

## Live-proof boundary

Source/CI/merge do not register a real job. After postmerge, live acceptance
must separately prove exact merged installation, fixed scheduling and pending
readback, then one natural JobScheduler invocation.

The final whole-Termux loss proof is still gated by #2792. This owner must not
invent a loss event merely to become green. Force-stop remains out of scope.
