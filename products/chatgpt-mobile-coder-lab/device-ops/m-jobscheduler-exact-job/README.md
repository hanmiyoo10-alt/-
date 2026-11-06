# M JobScheduler exact-job projection

This owner is a fixed read-only projection for the Mobile Coder Lab JobScheduler lifeline candidate.

It answers one bounded question on the physical main phone M:

```text
Does com.termux.api job 34070 not exist,
or does the exact existing job match the reviewed #3467 identity and constraints?
```

It does not schedule, cancel, update, run, trigger, install, pair, connect, disconnect, or repair anything.

## Fixed identity

V1 is hard-bound to:

- target model: `SM-S938N`;
- package: `com.termux.api`;
- job id: `34070`;
- script: `/data/data/com.termux/files/home/.local/lib/mcl-m-termux-lifeline-job/job.sh`;
- period: `900000` ms;
- network requirement: none;
- persisted: true;
- battery-not-low: false;
- storage-not-low: false;
- charging: false.

No target, serial, package, job id, command, path, or constraint is caller-selectable.

## Transport

The owner reuses the existing reviewed exact-M Wireless-ADB target-selection discipline from:

`../m-phantom-process-budget/mcl-m-phantom-process-budget.cjs`

The selector requires the already user-authorized Wireless ADB connection and exact model `SM-S938N`. The selected serial remains process-local and is never emitted.

V1 then performs exactly:

1. fixed `cmd jobscheduler get-job-state com.termux.api 34070`;
2. only when that proves the job exists, fixed package-filtered
   `dumpsys jobscheduler com.termux.api`.

A missing exact job returns `result=absent` without running the dump.

The dump is parsed only for the unique registered job block with id 34070. Raw scheduler text never leaves the local Windows process.

## Receipt

```text
schema=mcl-m-jobscheduler-exact-job.v1
job=34070
presence=<absent|present|unknown>
script=<match|mismatch|unknown>
period=<match|mismatch|unknown>
network=<none|other|unknown>
persisted=<match|mismatch|unknown>
battery_not_low=<false|other|unknown>
storage_not_low=<false|other|unknown>
charging=<false|other|unknown>
result=<absent|managed|collision|unknown>
details=withheld
```

`managed` requires every fixed identity/constraint to match. Any determinate mismatch is `collision`. Missing or ambiguous structural evidence is `unknown`.

The parser binds the script through Termux:API's fixed persisted extra key `com.termux.api.jobscheduler_script_path`, requires the exact JobScheduler service component, requires a 900000ms periodic interval and persisted marker, and proves network-none only from an exact job block that carries no network requirement/constraint.

## Boundaries

The owner must not:

- run ADB connect/pair/disconnect;
- accept a caller-selected serial;
- expose generic ADB shell, dumpsys, cmd, package, job-id, path, or constraint passthrough;
- enumerate unrelated scheduler state in its receipt;
- schedule, cancel, run, trigger, or mutate a JobScheduler job;
- install/update/re-sign Termux or Termux:API;
- change Android settings, permissions, app-ops, security controls, network, auth/session, or services;
- expose raw scheduler output, serial/address/pairing material, UID/PID, device identity, or private payloads.

This owner supplies the narrow collision/idempotency projection needed by #3467. It does not itself authorize #3467 registration, recovery, reboot, or live mutation.

## Commands

```sh
node mcl-m-jobscheduler-exact-job.cjs status
```

Any other argument shape fails closed.

## Validation

```sh
node --check mcl-m-jobscheduler-exact-job.cjs
node tests/test-mcl-m-jobscheduler-exact-job.cjs
```
