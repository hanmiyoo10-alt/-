---
name: mcl-preflight
description: >-
  Run the bounded Mobile Coder Lab first-pass preflight after D-012 has already
  selected a semantic route and exact executor. Delegate to the current S, M,
  S-Termux, PRIVATE LAB, VM LAB, or S-private owner without choosing a route,
  repairing state, reserving work, or manufacturing aggregate readiness.
---

# Mobile Coder Lab Preflight

Read-only orchestration skill for `products/chatgpt-mobile-coder-lab`.

This skill consumes a route decision. It never creates one. Read
`docs/REPOSITORY_COMMON_RULES.md`, current Mobile Coder Lab authority, and
`docs/device-routing.md` before using remembered route or owner semantics.

## Required input

Require both:

```text
route=<D-012 route>
executor=<exact selected execution surface>
```

Supported route classes are `S`, `M`, `S_TERMUX`, `M_PRIVATE_LAB`,
`M_VM_LAB`, and `S_PRIVATE_LOCAL`. Preserve `UNSUPPORTED / SEPARATE_AUTHORITY`
and `UNKNOWN` without inventing an executor.

Route `S` permits executor `S` or the already-documented ordinary-repository
fallback `M`. Every context-specific route requires its matching executor.
Missing, ambiguous, or conflicting route/executor evidence is `UNKNOWN` and
blocks route-conditioned preflight rather than triggering a new routing choice.
## Owner mapping

Use only the narrow current owner needed for the selected route.

### `S` with executor `S`

Invoke `device-ops/s-family-status/s-env-status status` when directly available
from the selected S repository context. Accept only the documented ordered
`schema=mcl-s-env-status.v1` receipt. It proves bounded Ubuntu environment,
GitHub CLI auth classification, and fixed repository accessibility only.

Do not infer branch cleanliness, `origin/main` freshness, free worktree,
collision safety, lease ownership, or mutation readiness from this receipt.

### `S` with executor `M`

This is legal only when D-012 already selected the documented ordinary
repository fallback. Use current M-family evidence appropriate to that phase,
starting with `mcl-env-status status` when its bounded fields answer the
question. Do not call M availability a new route decision.

### `S_TERMUX`

Use the existing S-Termux semantic owner, such as
`mcl-rdcctl status --profile s-termux`, when its contract answers the required
preflight question. Do not assume an Ubuntu-style repository path on S-Termux.
### `M`

Use `mcl-env-status status` when the fixed M-family projection is sufficient.
If the task needs more specific host evidence, drill into the existing semantic
owner rather than expanding or reinterpreting the M-family receipt.

### `M_PRIVATE_LAB`

Use `mcl-env-status status` as a first pass for PRIVATE LAB substrate/analysis
fields, then read `device-ops/private-lab/**` only when owner-specific evidence
is required. PRoot evidence is not VM/kernel-isolation evidence.

### `M_VM_LAB`

Use `mcl-env-status status` as a first pass for VM preparation/admission, then
use the existing VM owner/admission path if more exact evidence is required.
Never recompute VM admission from raw host memory or invent QEMU authority.

### `S_PRIVATE_LOCAL`

Consume only an already-authorized fixed sanitized private-runner receipt. Do
not construct, transmit, recover, or inspect a sensitive command, token,
session payload, private log, or provider state merely to complete preflight.
If the fixed producer/receipt is unavailable, preserve blocked/unsupported or
`UNKNOWN` according to its owner instead of improvising a replacement.

## Optional host-resource preflight

When the already-selected phase explicitly requires phone-host capacity or pressure
evidence, invoke the sibling `mcl-host-resource-preflight` only after the normal
route-conditioned owner observation. Pass the same already-selected route/executor
and exact host target. Capacity floors remain caller/packet-owned.

Do not invoke the host-resource sibling merely because a task exists. Tiny, ordinary,
or read-only work that does not need resource evidence keeps the existing first-pass
flow unchanged. A child `pass`, `below_floor`, `unknown`, battery value, thermal value,
load value, or swap value is scoped evidence only and never becomes aggregate
readiness or mutation permission. VM admission remains owned by the VM owner.

## Unknown and blocked evidence

Owner evidence remains scoped. `missing`, `blocked`, `offline`, `stale`,
`not_ready`, malformed output, or transport failure never authorizes repair,
sync, route fallback, worktree creation, lease acquisition, or repository write.
Malformed or unrecognized child receipts remain `UNKNOWN`; do not pass through
free-form child diagnostics.
## Mutable-work guard sequence

A bounded owner observation is first-pass evidence, not permission to mutate.
For repository-backed mutable work, preserve this separate sequence:

```text
D-012 semantic route and exact executor
→ bounded owner preflight/status evidence
→ current packet/PR write-scope overlap proof
→ D-013 lease acquire and read-back validation
→ Git/worktree/currentness guards
→ separately authorized repository mutation
```

Never skip, absorb, or synthesize a later guard because a status field looks
healthy. This skill does not run Git fetch/pull/sync/reset/checkout/stash/clean,
create or remove a worktree, acquire/release a lease, push, open or merge a PR,
publish a release, or mutate production.

## Reporting contract

Report the already-selected `route` and `executor`, the bounded owner evidence
actually consumed, any owner-specific drill-down still required, and the
remaining separate guards before mutation. Preserve field-level uncertainty.

Do not emit a new aggregate `PASS`, `READY`, `healthy`, `safe_to_mutate`, or
whole-cluster verdict. `sm-status` remains the whole-cluster read-only
projection; this skill is one-route preflight composition only.

## Privacy and non-goals

Do not expose device IDs, RDC/session IDs, ChatGPT/account identifiers, token or
auth scope data, private logs, command lines, PIDs, environment dumps, or raw
provider state. Public D-012 semantic route names are allowed.
This skill is not a router, dispatcher, scheduler, queue, central task database,
health authority, work-reservation owner, worktree lifecycle helper, service
repair tool, or release/production controller. It does not rewrite
`mcl-env-status v1`, `mcl-rdcctl v1`, `sm-status v1`, D-012, or D-013.

If current owner evidence cannot answer the bounded question, name the missing
owner evidence and stop at `UNKNOWN` or the owner's blocked state. Do not widen
the effect surface merely to keep the workflow moving.
