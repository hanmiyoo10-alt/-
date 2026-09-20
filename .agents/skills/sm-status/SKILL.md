---
name: sm-status
description: >-
  Produce one bounded read-only status receipt for the ChatGPT Mobile Coder Lab
  S, S-Termux, and M development cluster. Use when the user asks for sm-status,
  unified S&M status, device presence, repository branch/dirty/freshness state,
  S-Termux RDC local-profile state, M RDC supervision, or M PRIVATE LAB/VM state.
  Preserve each owning source, uncertainty, and privacy boundary. Never repair,
  sync, fetch device Git refs, restart services, or manufacture aggregate health.
---

# S&M Status

Read-only orchestration skill for `products/chatgpt-mobile-coder-lab`.

`sm-status` is a projection over existing owners. It is not a shell command on one
phone and it is not a new device, Git, RDC, runtime, lab, release, or production
authority.

## Hard boundaries

- Read `docs/REPOSITORY_COMMON_RULES.md` and the current Mobile Coder Lab authority before relying on remembered paths or semantics.
- Treat Remote Desktop Commander as transport and presence evidence only.
- Do not expose device IDs, session IDs, auth-token state, account identifiers, command lines, PIDs, private logs, environment dumps, or provider credentials.
- Do not run `git fetch`, pull, merge, reset, checkout, switch, clean, stash, or any write while collecting status.
- Do not restart, repair, install, activate, kill, or mutate RDC, runit, Termux, Android, PRIVATE LAB, VM LAB, or any unrelated service.
- Do not infer whole-system PASS, READY, healthy, or safe-to-work from this receipt.
- Missing tools, paths, malformed child receipts, transport failures, and ambiguous observations become `unknown` in the affected field only.

## Current owning surfaces

Use the current Mobile Coder Lab contract to confirm these locators before a live run:

```text
S repository          /root/nyang-repo
M landing worktree    /data/data/com.termux/files/home/nyang-worktrees/mainphone-work
S-Termux local owner  device-ops/rdc-local-control/mcl-rdcctl
M family owner        device-ops/m-family-status/mcl-env-status
M RDC owner           device-ops/m-rdc-supervisor/m-rdc-supervisor-guard
```

The repository source path is a locator, not proof that the corresponding device
has an installed executable. Prefer an already-authorized installed command when
one exists. Otherwise, use the current device worktree source only when it is
already reachable in the required execution context. If neither is available,
report `unknown`; do not install or copy anything during status collection.

## Collection order

### 1. Establish current GitHub main

Read the current protected `main` branch SHA from GitHub. Keep the exact SHA only
for this receipt's freshness comparison. Do not cache it as durable product truth.

### 2. Project RDC device presence

List connected RDC devices once. Match only the exact public device names `S`,
`S-Termux`, and `M`. Project only `online`, `offline`, or `unknown`.
Ignore all other returned metadata in the receipt and prose.

### 3. Observe S Git state

On device `S`, inspect only `/root/nyang-repo` with absolute-path Git commands.
Collect current branch, whether `git status --porcelain` is empty, and the local
`origin/main` commit when resolvable. Never fetch first.

Classify `s_origin_main_tracking` as:

```text
same     local origin/main exactly equals the GitHub main SHA captured in step 1
stale    both SHAs are known and differ
unknown  either SHA cannot be established
```

A `stale` tracking ref says only that the local remote-tracking ref differs from
current GitHub main. It does not say the worktree is broken and does not authorize sync.

### 4. Observe S-Termux bounded local profile

On device `S-Termux`, invoke only the existing bounded owner command
`mcl-rdcctl status --profile s-termux` when that owner is directly available in
the Termux execution context. Accept only the documented ordered
`schema=mcl-rdcctl.v1` receipt and project its `result` as
`pass`, `fail`, or `unknown`.

Do not reconstruct this field from raw runit output, package files, provider state,
or private receipt sources. If the bounded owner cannot be invoked, use `unknown`.

### 5. Observe M Git state

On device `M`, inspect the fixed landing worktree
`/data/data/com.termux/files/home/nyang-worktrees/mainphone-work`, not the ordinary
`nyang-repo` checkout. Collect branch, dirty state, and local `origin/main` exactly
as for S, without fetch or branch movement.

### 6. Observe M family state

On device `M`, invoke `mcl-env-status status` through the existing installed owner
when available. Otherwise, the current M landing worktree's repository-owned
`device-ops/m-family-status/mcl-env-status` may be used if executable and current
for that worktree. Accept only the exact ordered `schema=mcl-m-family-status.v1`
receipt.

Project only these fields:

```text
private_lab_substrate -> m_private_lab_substrate
private_lab_analysis  -> m_private_lab_analysis
vm_lab                -> m_vm_lab
vm_admission          -> m_vm_admission
```

Malformed output, extra free-form child output, or an unrecognized enum makes the
corresponding projected field `unknown`. Do not reinterpret VM thresholds or
recompute admission from raw host memory.

### 7. Observe M RDC supervision

On device `M`, invoke `m-rdc-supervisor-guard --check` through the existing installed
owner when available. Otherwise, use the current M landing worktree source only if
it is directly executable. Accept only `schema=mcl-m-rdc-supervisor.v1` and project
its `supervision` field.

Do not turn channel health, provider presence, or watchdog observations into this
field. They are separate owners. `sm-status` v1 intentionally has no watchdog field
because no bounded watchdog receipt is part of this contract.

## Receipt contract

Emit exactly these ordered key/value lines. Branch values may contain only an
observed Git branch name or `unknown`; do not normalize an unexpected branch into pass/fail.

```text
schema=mcl-sm-status.v1
rdc_s=<online|offline|unknown>
rdc_s_termux=<online|offline|unknown>
rdc_m=<online|offline|unknown>
s_termux_profile=<pass|fail|unknown>
m_rdc_supervision=<running|missing|operator_down|service_missing|unknown>
s_repo_branch=<observed-branch|unknown>
s_repo_dirty=<yes|no|unknown>
s_origin_main_tracking=<same|stale|unknown>
m_repo_branch=<observed-branch|unknown>
m_repo_dirty=<yes|no|unknown>
m_origin_main_tracking=<same|stale|unknown>
m_private_lab_substrate=<pass|fail|unknown>
m_private_lab_analysis=<pass|missing|blocked|unknown>
m_vm_lab=<prepared|not_prepared|blocked|unknown>
m_vm_admission=<pass|blocked|unknown|not_ready>
details=withheld
```

A successfully formed receipt may contain any number of `unknown`, `offline`,
`stale`, `dirty`, `blocked`, `missing`, or `not_ready` values. Those values do not
make receipt formation fail. There is deliberately no aggregate `result` field.

## Drill-down rule

After the receipt, drill into an owner only when the user's question requires more
specific evidence or a projected field is insufficient. Keep the drill-down read-only
unless a separate authorized work stage explicitly permits mutation.

Examples of owner drill-down include `rdc-local-control/**`, `m-family-status/**`,
`m-rdc-supervisor/**`, `private-lab/**`, and `vm-lab/**`. The projection never
becomes stronger evidence than the owner it consumed.

## Versioning

The exact field order, enum meanings, privacy boundary, read-only behavior, no-fetch
Git rule, source delegation, unknown preservation, and lack of aggregate health are
the `mcl-sm-status.v1` compatibility contract. Incompatible semantic changes require
a reviewed migration and should prefer a new schema version over silent v1 drift.
