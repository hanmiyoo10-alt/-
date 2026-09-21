---
name: mcl-soak-alert
description: >-
  Classify one current mcl-sm-soak-watch.v1 receipt against an optional
  explicitly supplied prior receipt into bounded degradation, recovery, and
  evidence-loss alert evidence for an external condition-watch. Preserve
  UNKNOWN and never create health, causality, repair, scheduler, or storage
  authority.
---

# MCL S/M Soak Alert

Pure deterministic alert-policy adapter for Mobile Coder Lab B1.

This skill consumes bounded `mcl-sm-soak-watch.v1` receipts. It does not collect
device state itself. Natural-soak interpretation and B1 closure remain owned by
#2143. Snapshot and prior-vs-current comparison remain owned by
`mcl-soak-watch`.

The intended composition is:

```text
mcl-soak-watch current receipt
+ optional explicit prior receipt
→ mcl-soak-alert classifier
→ separately authorized external condition-watch
→ #2143 bounded evidence only when an alert actually fires
```
## Hard boundaries

- Read current repository and Mobile Coder Lab authority before using this skill.
- Accept current/prior evidence only as bounded `mcl-sm-soak-watch.v1` receipts.
- The current receipt is required. The prior receipt is optional and must be
  supplied explicitly by the caller.
- Never search Git, files, issues, chat history, device state, or external
  services for an implicit prior receipt.
- Do not invoke Remote Desktop Commander, devices, GitHub, Gmail, network APIs,
  schedulers, daemons, services, or repair tools from this classifier.
- Do not create or mutate a state file, database, issue, workflow, timer, or
  notification channel.
- Do not restart, repair, fail over, dispatch, route, fetch, sync, or mutate Git.
- Never emit aggregate `health`, `ready`, `result`, `safe_to_work`,
  severity, root-cause, or repair-action fields.
- Repository cleanliness fields remain preservation context only and never
  trigger a continuous-soak alert.
- Missing, malformed, ambiguous, or unavailable evidence stays `unknown`.
- A notification decision never explains why a field changed.

## Source receipt validation
The current receipt and any supplied prior receipt must use exactly this ordered
`mcl-sm-soak-watch.v1` shape:

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

Reject a receipt as malformed when its schema, key set/order, enum vocabulary, or
`details=withheld` contract is invalid. This classifier does not partially trust
a malformed current receipt.

The source receipt's `change` and `changed_fields` values are not alert
authority. Recompute alert transitions only from the reviewed source fields below.
## Alert-bearing fields and value classes

Alert-bearing fields are fixed in this order:

```text
rdc_s
rdc_s_termux
rdc_m
roundtrip_s
roundtrip_s_termux
roundtrip_m
s_termux_profile
m_rdc_supervision
```

Classify values only as follows:

- `rdc_s|rdc_s_termux|rdc_m`: `online=good`, `offline=degraded`,
  `unknown=unknown`.
- `roundtrip_s|roundtrip_s_termux|roundtrip_m`: `pass=good`,
  `fail=degraded`, `unknown=unknown`.
- `s_termux_profile`: `pass=good`, `fail=degraded`,
  `unknown=unknown`.
- `m_rdc_supervision`: `running=good`;
  `missing|operator_down|service_missing=degraded`; `unknown=unknown`.

Do not classify `s_repo_dirty` or `m_repo_dirty` as alert-bearing. Their
changes alone must produce `notify=no`.
## Transition semantics

When both current and prior receipts are valid, classify every alert-bearing
field independently:

- current `degraded` + prior not `degraded` -> `degraded_fields`;
- prior `degraded` + current `good` -> `recovered_fields`;
- prior known/non-`unknown` + current `unknown` ->
  `evidence_loss_fields`;
- prior `unknown` + current `good` -> no recovery claim;
- unchanged degraded -> no new transition;
- unchanged good/unknown -> no new transition.

A degraded-to-unknown transition is evidence loss, not recovery. A
good-to-unknown transition is also evidence loss. Never emit causality.

With no prior receipt:
- list every current explicit degraded alert-bearing field in
  `degraded_fields`;
- set recovery/evidence-loss lists to `none`;
- notify only when at least one explicit degradation exists;
- good or unknown-only initial observations produce `notify=no`.

Field lists must follow the fixed alert-bearing order with no duplicates.
## Malformed evidence behavior

Malformed current receipt:
- `notify=unknown`;
- all three transition lists are `unknown`;
- do not make a positive alert claim.

Malformed supplied prior with a valid current receipt:
- current explicit degraded fields may still be listed as current degradation
  evidence;
- `recovered_fields=unknown`;
- `evidence_loss_fields=unknown`;
- if current explicit degradation exists, `notify=yes`;
- otherwise `notify=unknown`.

This preserves prior uncertainty without hiding a directly observed current
degradation. It never invents recovery or evidence-loss transitions from a
malformed prior.

## Notification decision

For valid current evidence with no prior or a valid prior:
- any non-empty degraded/recovered/evidence-loss list -> `notify=yes`;
- all three lists `none` -> `notify=no`.

Multiple categories may coexist in one receipt. Preserve them separately rather
than collapsing them into a whole-system state.
## Receipt contract

Emit exactly these ordered lines:

```text
schema=mcl-sm-soak-alert.v1
notify=<yes|no|unknown>
degraded_fields=<ordered-reviewed-list|none|unknown>
recovered_fields=<ordered-reviewed-list|none|unknown>
evidence_loss_fields=<ordered-reviewed-list|none|unknown>
details=withheld
```

There is deliberately no aggregate health/readiness field, severity score,
root-cause label, device identity, repair instruction, or scheduler state.

## Privacy boundary

Never emit device/session/account identifiers, authentication state, credentials,
PIDs, absolute paths, command lines, environment dumps, raw RDC responses, raw
Git output, private logs, email addresses, or free-form diagnostics.

Only reviewed field names from the bounded receipt may appear in transition
lists. Values remain represented by the classifier category, not copied raw into
an alert explanation.
## External condition-watch boundary

This skill does not schedule itself.

A separately authorized ChatGPT condition-watch may invoke the already-reviewed
soak-watch collection and this classifier. The platform automation owns cadence
and user notification delivery; this repository skill owns only deterministic
classification semantics.

When the platform can explicitly supply the previous successful receipt, use the
transition semantics above. If it cannot, do not create hidden state in Git,
issues, files, devices, or services. Fall back to no-prior semantics so only
current explicit degradation can alert. Recovery/dedup capability then remains a
separate capability limitation.

No natural outage, supervisor loss, or roundtrip failure may be manufactured to
test the standing alert.

## Durable evidence boundary

When an external condition-watch actually emits an alert, a separately
authorized caller may append one bounded sanitized evidence comment to #2143.
No-change checks must not create hourly comments. #2143 remains the owner of
natural-soak interpretation and closure.
## Versioning

The exact output key order, alert-bearing field order, value classes, transition
rules, malformed-evidence behavior, repo-dirty exclusion, privacy boundary,
no-causality rule, and absence of scheduler/storage/repair authority are the
`mcl-sm-soak-alert.v1` compatibility contract.

Incompatible semantic changes require reviewed migration and should prefer a new
schema version over silent v1 drift.
