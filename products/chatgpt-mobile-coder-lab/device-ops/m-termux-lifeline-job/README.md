# M Termux lifeline JobScheduler owner

This owner implements the fixed APK-free Candidate-B scheduler effect for #3467.

The design is split across two reviewed owners:

1. `m-jobscheduler-exact-job` on L/Windows owns the read-only Android 17 projection of the exact physical-M job.
2. This directory owns only the fixed M-side wrapper and the one-shot registration effect when the exact-job projection has freshly proven job 34070 absent.

The split exists because the installed Termux:API Android 17 generic `--pending` formatter cannot safely project a `network=none` job after registration.

## Fixed identity

The registration is hard-bound to:

- package owner: `com.termux.api`;
- job id: `34070`;
- installed wrapper: `~/.local/lib/mcl-m-termux-lifeline-job/job.sh`;
- period: `900000` ms;
- network: `none`;
- persisted: `true`;
- battery-not-low: `false`;
- storage-not-low: `false`;
- charging: `false`.

No field is caller-selectable.

## Composite admission

Before any M-side registration:

1. run the merged `m-jobscheduler-exact-job status` owner on its reviewed L/Windows route;
2. continue only when the fresh receipt is exactly `result=absent`;
3. invoke `mcl-m-termux-lifeline-job-owner --apply` once;
4. immediately run the exact-job owner again;
5. accept registration only when it reports `result=managed`.

If the exact-job projection reports `managed` before step 3, composite apply is already a no-op. `collision|unknown` blocks without an M scheduler effect.

The M-side owner also performs one last local race guard: its generic pending read must be exactly `No jobs found` immediately before registration. This local read is only an empty-namespace precondition. It is never used as post-registration identity authority.

There is no public generic scheduler rollback or cancel surface in V1.

## Scheduled wrapper

`mcl-m-termux-lifeline-job` accepts zero arguments only.

It runs the fixed heartbeat status:

`~/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py --status`

If already active, it records `healthy` and does not invoke recovery. If inactive, it invokes exactly once:

`~/.local/bin/mcl-m-termux-lifeline-recover`

and then requires one fresh heartbeat status before reporting `recovered`.

Child stdout/stderr is discarded. The public/local receipt contains only:

```text
schema=mcl-m-termux-lifeline-job.v1
heartbeat_pre=<active|inactive|unknown>
recovery=<not_run|pass|fail|unknown>
heartbeat_post=<active|inactive|unknown>
result=<healthy|recovered|blocked|unknown>
details=withheld
```

The same bounded receipt is atomically stored at the fixed owner state path so a later read can prove a scheduler firing without exposing raw scheduler or recovery output.

## Owner commands

```sh
sh mcl-m-termux-lifeline-job-owner --check
sh mcl-m-termux-lifeline-job-owner --apply
```

`--check` verifies only the fixed installed wrapper bytes/mode. Scheduler identity is always owned by the exact-job projection.

`--apply` is legal only after the fresh external absent admission described above. It requires an exact empty local pending namespace as a final race guard, installs only the fixed wrapper as mode 0700, clears only this owner's old bounded receipt, and submits exactly the fixed registration.

It does not claim post-registration success. The exact-job projection supplies that proof.

A nonzero scheduler-client exit is an uncertain submission outcome, not proof that Android rejected the job. Android may accept the registration before the client fails while formatting or returning its response. In that case the owner preserves the exact installed wrapper, reports schedule=unknown / result=unknown, and leaves managed-vs-absent/collision/unknown classification to the required exact-job postcheck. It does not delete the wrapper or perform scheduler cleanup from the ambiguous client result.

## Boundaries

This owner does not:

- accept arbitrary job ids, scripts, arguments, constraints, packages, or commands;
- use `--cancel-all`;
- expose a caller-selected scheduler cancellation surface;
- install or update Termux/Termux:API;
- change Android settings, permissions, security controls, network state, auth/session state, or services;
- force-stop or reboot;
- expose raw scheduler, recovery, process, device, or private output.

Physical registration remains an EXPERIMENT_CLOSE effect after repository merge/postmerge.

## Tests

```sh
sh -n mcl-m-termux-lifeline-job
sh -n mcl-m-termux-lifeline-job-owner
sh tests/test-contract.sh
git diff --check
```
