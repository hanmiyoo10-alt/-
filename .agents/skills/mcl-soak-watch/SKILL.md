---
name: mcl-soak-watch
description: >-
  Produce one bounded read-only Mobile Coder Lab S/M natural-soak snapshot and,
  when a prior valid receipt is supplied, compare only reviewed receipt fields.
  Use for B1 soak-watch snapshots, repeated S/S-Termux/M transport checks, or
  previous-vs-current soak observations. Delegate current state to sm-status,
  preserve UNKNOWN, and never create aggregate health, repair, or causality.
---

# MCL S/M Soak Watch

Read-only observation adapter for `products/chatgpt-mobile-coder-lab` B1.

This skill composes existing current-state owners with three bounded Remote
Desktop Commander roundtrip observations. It is not a device-health authority,
channel monitor, watchdog owner, scheduler, state store, repair surface, or B1
closure authority. Natural-soak interpretation and durable evidence remain
owned by #2143 or another separately authorized observer.

## Hard boundaries

- Read `docs/REPOSITORY_COMMON_RULES.md` and current Mobile Coder Lab authority first.
- Run the existing `sm-status` skill as the current-state projection. Do not reconstruct its fields from raw device state.
- Match RDC endpoints only by the exact public names `S`, `S-Termux`, and `M`.
- Do not expose device IDs, session IDs, auth state, credentials, PIDs, paths, command lines, environment dumps, or private logs.
- Do not parse raw channel logs, process tables, watchdog state, shared `runsvdir`, or provider/session state into this receipt.
- Do not fetch or mutate Git, restart/repair services, install anything, switch routes, or change device/runtime state.
- Do not create or update a scheduler, daemon, background watcher, notification loop, GitHub issue, state file, or database.
- Never emit aggregate `health`, `ready`, `result`, `safe_to_work`, or root-cause labels.
- A successful roundtrip proves only one transport/tool-delivery roundtrip at observation time.
- A failed or unavailable roundtrip does not identify Wi-Fi, Android, Tailscale, provider, RDC, channel, supervisor, watchdog, or authentication cause.
- Missing, malformed, ambiguous, or unavailable evidence stays `unknown` in the affected field.

## Collection order

### 1. Collect the current owner projection

Invoke `sm-status` once and accept only a valid ordered `schema=mcl-sm-status.v1`
receipt. Project only the fields listed below. If the child receipt is malformed,
missing, or unavailable, use `unknown` for every projected child field rather
than rebuilding them from lower-level observations.

Project:

```text
rdc_s
rdc_s_termux
rdc_m
s_termux_profile
m_rdc_supervision
s_repo_dirty
m_repo_dirty
```

The child receipt remains the authority for those values. This skill does not
reinterpret `offline`, `dirty`, `missing`, or `unknown` into a stronger label.

### 2. Observe one bounded roundtrip per endpoint

For each exact public endpoint `S`, `S-Termux`, and `M`, at most once per snapshot,
request one harmless fixed marker roundtrip through the existing RDC tool surface.
Use the same constant marker for all three endpoints; do not derive it from device
metadata or caller input. Accept only exact marker return as `pass`.
Classify roundtrip fields as:

```text
pass     exact fixed marker returned from the addressed public endpoint
fail     an attempted roundtrip returns an explicit transport/tool-delivery failure
unknown  no trustworthy attempted-roundtrip result is available
```

If `sm-status` says an endpoint is `offline`, do not manufacture a failed
roundtrip when no attempt was made; keep the roundtrip field `unknown`.
Presence and roundtrip are separate observations.

Do not include the marker, command, endpoint metadata, or raw tool response in
the outward receipt.

### 3. Validate an optional prior receipt

A prior receipt is optional and must be supplied explicitly by the caller. Never
search Git, device state, issue history, chat history, or local files for an
implicit prior receipt.

A valid prior receipt must have exactly the documented ordered keys, exact
`schema=mcl-sm-soak-watch.v1`, `details=withheld`, and only documented enum
values. `changed_fields` must be `none`, `unknown`, or a comma-separated list of
reviewed comparable keys in the documented key order with no duplicates.

If no prior receipt is supplied, set `change=no_prior` and
`changed_fields=none`. If a supplied prior receipt is malformed, set
`change=unknown` and `changed_fields=unknown`; do not partially trust it.

### 4. Compare reviewed fields only

Comparable keys are, in order:

```text
rdc_s,rdc_s_termux,rdc_m,
roundtrip_s,roundtrip_s_termux,roundtrip_m,
s_termux_profile,m_rdc_supervision,s_repo_dirty,m_repo_dirty
```
Compare current and prior values literally over those keys. Current `unknown` is
still an observed enum value and may therefore count as a field change relative
to a different valid prior value. Comparison never explains why a field changed.

- no differing comparable keys -> `change=same`, `changed_fields=none`;
- one or more differing keys -> `change=changed`, with changed keys emitted in the documented order;
- invalid supplied prior -> `change=unknown`, `changed_fields=unknown`.

## Receipt contract

Emit exactly these ordered lines:

```text
schema=mcl-sm-soak-watch.v1
rdc_s=<online|offline|unknown>
rdc_s_termux=<online|offline|unknown>
rdc_m=<online|offline|unknown>
roundtrip_s=<pass|fail|unknown>
roundtrip_s_termux=<pass|fail|unknown>
roundtrip_m=<pass|fail|unknown>
s_termux_profile=<pass|fail|unknown>
m_rdc_supervision=<running|missing|operator_down|service_missing|unknown>
s_repo_dirty=<yes|no|unknown>
m_repo_dirty=<yes|no|unknown>
change=<same|changed|no_prior|unknown>
changed_fields=<reviewed-comma-list|none|unknown>
details=withheld
```

There is deliberately no aggregate health or readiness field. A fully formed
receipt may contain `offline`, `fail`, `dirty`, `missing`, or any number of
`unknown` values without turning the snapshot into a whole-system verdict.

## Drill-down rule

A changed or non-pass field is evidence for targeted read-only drill-down only
when the user's question requires it. Delegate drill-down to the owning surface.
Do not infer causality or trigger repair from this comparison receipt.
Examples of drill-down owners include `sm-status`, `rdc-local-control/**`,
`m-rdc-supervisor/**`, and #2143 natural-soak evidence. Raw/private diagnostic
surfaces remain outside this skill unless separately authorized.

## Statelessness and scheduling boundary

This skill stores nothing. Repeated observation requires an external caller to
supply any prior receipt each time. A platform condition-watch or scheduled
invocation, if separately requested and authorized, is outside repository
source authority and must not be represented as functionality of this skill.

## Versioning

The exact receipt key order, comparable-key order, enum meanings, owner
delegation, privacy boundary, read-only behavior, stateless prior handling,
no-causality rule, and absence of aggregate health are the
`mcl-sm-soak-watch.v1` compatibility contract. Incompatible changes require a
reviewed migration and should prefer a new schema version over silent v1 drift.
