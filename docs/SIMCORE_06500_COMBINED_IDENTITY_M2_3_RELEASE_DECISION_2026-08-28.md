# SimCore v0.65.0 Combined Identity + M2-3 Release Decision

Status: **DECISION RECORDED · ROADMAP/GATE SEMANTICS · NON_RUNTIME · NO RELEASE-SIMCORE MUTATION**

Date: **2026-08-28**

## 1. Decision

The next genuine SimCore product release may combine the narrow runtime-identity convergence repair discovered during the v0.64.11 live gate with the already planned M2-3 Edit Reconcile ownership extraction in a single release.

Planned release identity:

```text
v0.65.0
M2-3 Edit Reconcile Ownership Extraction
+ Runtime Identity Convergence prerequisite adjunct
```

A separate v0.64.12 identity-only product release is **not required by policy**.

This decision changes release packaging and live-gate ordering only. It does not retroactively close the active v0.64.11 product live gate and does not authorize M2-3 live acceptance before the identity/reload prerequisite is proven.

## 2. Triggering evidence

Current production is v0.64.11 Bounded Telemetry Capsule Compaction.

The v0.64.11 pre-refresh long-chat evidence proved all of the following:

```text
COMPACT_V2                     LIVE PROVEN
whole capsule <= 16,384       LIVE PROVEN
component budgets             LIVE PROVEN
Host-local API/store/clear    LIVE PROVEN
HOST_LOCAL WRITTEN            LIVE PROVEN
ordinary output semantics     healthy in supplied packets
```

The same production artifact also exposed a release identity split:

```text
//@version                     0.64.11
HOST_COMPAT_VERSION            0.64.11
SIMCORE_RUNTIME_VERSION        0.64.10
```

Because the telemetry capsule uses `SIMCORE_RUNTIME_VERSION` as its `sourceVersion`, the successful pre-refresh host-local capsule is stamped as v0.64.10 while the v0.64.11 boot classifier requires v0.64.11. Therefore the current capsule is not eligible to prove post-refresh host-local adoption.

Classification:

```text
06411_RUNTIME_IDENTITY_SPLIT
= BLOCKER
= FIX
= RELEASE_BUILDER_VERSION_STAMP
= HANDOFF_COMPATIBILITY
= PRE_REFRESH_STOP
```

Primary evidence:

- `docs/SIMCORE_LIVE_06411_PRE_REFRESH_COMPACTION_PASS_RUNTIME_IDENTITY_SPLIT_2026-08-28.md`
- `docs/SIMCORE_06411_BOUNDED_TELEMETRY_CAPSULE_COMPACTION_ACTIVATION.md`

## 3. Combined release slices

The combined v0.65.0 implementation must preserve two separately attributable slices.

### Slice A — Runtime Identity Convergence

Required convergence:

```text
userscript metadata version
== SIMCORE_RUNTIME_VERSION
== HOST_COMPAT_VERSION
== declared release version
== release manifest / candidate intent version
```

The release builder must stamp every runtime identity field from one release-version authority or must permanently assert their exact equality.

This slice is intentionally narrow. It must not change telemetry capsule schema, Host-local mailbox semantics, TTL/location/consume rules, cache semantics, edit behavior, or output semantics except where the version identity itself is represented.

Permanent regression requirement:

```text
build candidate
→ inspect produced latest/install bytes
→ metadata version == runtime version == host-compat version == declared version
→ fail release CI on any split
```

### Slice B — M2-3 Edit Reconcile Ownership Extraction

M2-3 remains an ownership/mechanical extraction, not permission to redesign edit behavior.

Frozen behavioral controls include:

```text
normal exact carryover
→ SAME_FAST
→ Edit origin NONE

prior OUTPUT_MISMATCH + current exact prior Fresh carryover
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

prior exact representation + genuine user change matching neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Representation remains the representation/provenance authority. Runtime Mirror remains transport-only. M2-3 must not weaken identity/location/staleness/fingerprint acceptance gates.

## 4. Ordered live subgates inside one release

A combined release does **not** mean the two acceptance questions become one undifferentiated PASS/FAIL.

The same installed v0.65.0 artifact must be evaluated in this order.

### Subgate A — identity + durable reload handoff closure

Before M2-3 live acceptance can be evaluated, the combined release must prove:

```text
Version: 0.65.0
Telemetry capsule: COMPACT_V2 · <= 16,384 · OK
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN
```

Then, on an operator-observed same-tab refresh:

```text
runtime generation changes
Host-local capsule is compatible with v0.65.0
Host-local boot consumes the matching-location one-shot capsule
Telemetry continuity: ADOPTED · via host-local
```

The next natural request must continue without repeated adoption/reset and must write a fresh bounded checkpoint again.

If Subgate A fails, stop M2-3 live acceptance immediately and preserve/classify the failure. M2-3 code may be present in the artifact, but no M2-3 live PASS may be claimed from that run.

### Subgate B — M2-3 ownership acceptance

Only after Subgate A passes may the same installed artifact proceed to M2-3 behavioral controls.

Required controls:

1. ordinary A/C/B natural requests remain bound/committed with expected mirror/stale behavior;
2. normal exact carryover remains `SAME_FAST` / `Edit origin NONE`;
3. a natural exact Fresh carryover from a prior representation mismatch still reaches `REPRESENTATION_FAST_RECONCILED`;
4. a genuine hand edit still reaches `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`;
5. no new regression appears in Recovery, timeline, Broadcast closure, Frame, Evidence/Lineage/Handoff/Recurrence, Structure/COMMUNITY, cache/history observation, or persistent-schema boundaries.

## 5. Interpretation of the existing M2-3 blocker wording

Existing current-development wording says that M2-3 remains blocked until the active product live gate closes.

For the combined-release path, this decision defines the intended meaning precisely:

```text
blocked
≠ M2-3 code may not be packaged in the same candidate

blocked
= M2-3 live acceptance / checkpoint advancement may not be claimed
  until the prerequisite identity + reload continuity subgate has passed
```

Therefore one v0.65.0 publication may carry both slices while retaining the original evidence-first safety rule.

## 6. Attribution rule

The release must remain diagnosable as two slices.

If a failure occurs before or during Host-local adoption, classify it first against Slice A / telemetry/reload identity boundaries. Do not automatically attribute it to M2-3.

If Subgate A has passed and a later edit/reconcile behavioral control fails, classify it against Slice B / M2-3 ownership movement unless contrary evidence exists.

Shared symptoms still require complete episode review; `PASS`, `Warnings: 0`, `STABLE`, or `COMMITTED` are not substitutes for semantic review.

## 7. Release-system requirements

The combined release must still obey normal release discipline:

- `release-simcore` remains actual production authority;
- `main` remains design/evidence/roadmap authority;
- `latest.js == install.js` is mandatory;
- the exact approved candidate must be the exact published production artifact;
- runtime identity equality must be a permanent build/release fixture;
- durable release evidence remains authoritative over workflow-run narration;
- provider cache remains `UNVERIFIED` unless direct evidence changes it.

## 8. Operator UX requirement

The in-plugin update/release card for v0.65.0 should present the combined experiment as two ordered stages, not as a single vague checklist.

Recommended card summary:

```text
v0.65.0 — M2-3 + Runtime Identity Convergence

Stage A — Reload continuity
1. natural request; confirm Version 0.65.0 + COMPACT_V2 + HOST_LOCAL WRITTEN
2. copy diagnostic
3. same-tab refresh
4. first natural request; copy diagnostic; expect ADOPTED via host-local
5. second natural request; copy diagnostic; expect clean continuation

Stage B — M2-3 controls
6. normal exact carryover control
7. representation-fast reconcile control when naturally available
8. genuine hand-edit positive control
```

Any Stage A blocker means stop before Stage B acceptance.

## 9. Superseded planning interpretation

A previous conservative planning suggestion treated the runtime-identity repair as a separate final v0.64.x stabilization release followed by v0.65.0 M2-3.

This recorded decision supersedes that packaging suggestion.

The evidence requirement itself is not relaxed: identity/reload continuity must still be proven before M2-3 checkpoint advancement, but it may be proven as the first live subgate of the same v0.65.0 combined release.

## 10. Current state after this decision

```text
production                 v0.64.11
active product gate        still pending / blocked by runtime identity split
release-simcore mutation   NONE in this decision
v0.65.0 implementation     NOT STARTED by this document
next packaging             combined identity convergence + M2-3
live ordering              Subgate A before Subgate B acceptance
M2-3 checkpoint advance    prohibited until Subgate A PASS
```

This document is the durable planning record for the combined-release decision. Current production identity and active lifecycle remain governed by the machine-managed blocks in `docs/CURRENT_DEVELOPMENT.md` until a later release transaction changes them.
