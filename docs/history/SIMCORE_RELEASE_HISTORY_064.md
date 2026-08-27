# SimCore Release History — 0.64.x

Date created: 2026-08-27
Primary role: `POINT_IN_TIME_EVIDENCE`
Current-authority status: **NON_AUTHORITATIVE**
Migration status: `ROLLED_OVER`

This file is the release-family historical manifest for SimCore `0.64.x` history that no longer belongs in the living `docs/CURRENT_DEVELOPMENT.md` body.

The active member of the family, if any, is still governed only by `docs/CURRENT_DEVELOPMENT.md` machine-managed current-state blocks. This history file must never be used as a fallback current authority.

## Provenance envelope

```text
Source path: docs/CURRENT_DEVELOPMENT.md
Source commit: ec52c7510f9a12a24c6d1bac6cf655a7b645193b
Source blob: 0d1413ebc0da79a5a7274f17ff4786bc9d850eb5
Exact source snapshot: docs/history/CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md
Migration destination: docs/history/SIMCORE_RELEASE_HISTORY_064.md
Migration class: DOCUMENT_ARCHITECTURE / NON_RUNTIME
```

The exact pre-rollover snapshot reuses the original source blob byte-for-byte. The entries below are a release-family evidence view, not a rewrite of that source.

---

## v0.64.0 — M2-2 Representation Ownership Split

Original bounded section identity:

```text
# 2. Historical Validation Release Ledger
## v0.64.0 — M2-2 Representation Ownership Split
```

Recorded historical identity:

```text
release commit: d0407c5cd7441a978f815db068344219f8c15027
release blob: 6d7ed75b14ad042cc8bfab1be16fc3c97069f5bb
parent: v0.63.59 Broadcast End Closure Contract
```

Historical role:

- mechanical M2-2 ownership checkpoint;
- moved bounded representation provenance/taxonomy ownership into the Representation module;
- kept Runtime Mirror focused on Fresh observation, strict transport guards, and mirror scheduling;
- preserved the existing fast-reconcile/genuine-edit behavior;
- did not change persistent schema or protected host/network/timer surfaces.

Current operative residue is preserved under `docs/CURRENT_DEVELOPMENT.md` **Active Regression Controls**.

---

## v0.64.1 — Summary Scope Authority

Original bounded section identity:

```text
# 2. Historical Validation Release Ledger
## v0.64.1 — Summary Scope Authority
```

Recorded historical identity:

```text
release commit: 0cd0b01440e0d8654a84b64362541a9fbfcb03b3
release blob: 2d5d0acf4d2da52874aafaa5bbd074a81c7f7b52
parent: v0.64.0 M2-2 Representation Ownership Split
```

Historical trigger came from paired year-end Mode-C summary requests where target-year scope and requested comparison baselines could be overrun by older historical/recurrence values.

Historical contract introduced the request scope classifier:

```text
NONE
ANNUAL_ONLY
CUMULATIVE_YOY
```

and established:

```text
Summary factual authority > Recurrence factual carryover
```

This remains an active regression control and is therefore summarized in the living current document.

---

## v0.64.2 — Diagnostic Copy Resilience

Original bounded section identity:

```text
# 2. Historical Validation Release Ledger
## v0.64.2 — Diagnostic Copy Resilience
```

Recorded historical identity:

```text
release commit: 7a1f1692920abbc890c6663b40e38a24676c3de9
release blob: 3058e5bafa7f3abd15277ceabd0bd9d8518f52dc
parent: v0.64.1 Summary Scope Authority
```

Historical contract:

```text
build report exactly once
primary Clipboard API
fallback temporary textarea + execCommand('copy')
result vocabulary:
  COPIED
  COPIED_FALLBACK
  REPORT_BUILD_FAILED
  CLIPBOARD_WRITE_FAILED
```

The patch was diagnostic-copy transport hardening, not runtime semantic behavior change.

---

## v0.64.3 — B_END Diagnostic Builder Binding Repair

Original bounded section identity:

```text
# 2. Historical Validation Release Ledger
## v0.64.3 — B_END Diagnostic Builder Binding Repair
```

Recorded historical identity:

```text
release commit: d7fd45cd193ef1ff187c73761ded958d89558ebf
release blob: ff481aa904340b844ef29b0d89aa20bd6286286d
parent: v0.64.2 Diagnostic Copy Resilience
```

Historical role:

- repaired outer diagnostic builder binding for B_END reporting;
- preserved builder body and Broadcast/Time semantics;
- kept diagnostic-copy result vocabulary unchanged;
- did not broaden the release into the later post-B_END clock-authority gap.

---

## v0.64.4 — COMMUNITY Reaction Validator Attribution

Historical production commit from the `release-simcore` lineage:

```text
c11216310938a090f5c81cc6e81e9ca8535e002f
```

Release name:

```text
COMMUNITY Reaction Validator Attribution
```

Historical role:

- attribution-only Reaction/Structure diagnostic mini;
- old validator acceptance semantics stayed unchanged;
- frozen runtime surfaces remained protected.

Dedicated historical evidence/navigation includes:

- `../SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md`
- `../SIMCORE_06404_COMMUNITY_REACTION_ATTRIBUTION_PLAN.md`

---

## v0.64.5 — COMMUNITY Multiline Reaction Unit Validation Repair

Historical production commit from the `release-simcore` lineage:

```text
6c43c8167375b836a87277c005c63f93b028dde4
```

Release name:

```text
COMMUNITY Multiline Reaction Unit Validation Repair
```

Historical role:

- repaired logical multiline comment/reply unit validation;
- preserved Reaction grammar/normalization and Structure judge-only behavior;
- did not alter Broadcast/Time/Frame semantics, persistence, host surfaces, or M2-3 ownership boundaries.

Dedicated historical evidence/navigation includes:

- `../SIMCORE_LIVE_06405_VALIDATION.md`

---

## v0.64.6 — Post-B_END C Clock Handoff Authority

The `release-simcore` lineage contains the v0.64.6 clock-handoff release and a same-version closure-completion eligibility hardening before v0.64.7.

Historical release commits in that lineage include:

```text
4badfd3cf25a1aab89d274cb7941c90a7a331f0e  initial published v0.64.6 form
f77af7ad180fc7f1806a759e73e68cfdadc0e712  merged production lineage form
47969d24771f6cc188df6e32150fc6fde519182d  final v0.64.6 hardening parent of v0.64.7
```

Historical contract:

```text
request-scoped Post-B_END current-time floor
preserve explicit historical scenes
preserve later Narrative tails
preserve Source Handoff independence
preserve Representation/Edit/Reaction/COMMUNITY behavior
```

The later same-version hardening tightened closure-completion eligibility without changing the v0.64.6 product identity.

Current operative residue is the frozen post-B_END C clock-handoff behavior in `docs/CURRENT_DEVELOPMENT.md`.

---

## v0.64.7 — Cross-Reload Cache Observer Continuity

Historical production identity:

```text
release commit: a7ce8ce33a97797630f885c6753415e4b2ccc7fc
release blob: 676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0
release: Cross-Reload Cache Observer Continuity
```

Historical objective:

Preserve bounded cache-observer telemetry across compatible runtime reload boundaries using memory first and same-tab `sessionStorage` fallback without claiming provider cache state.

Real-long-chat validation on 2026-08-27 produced a clean runtime boundary but no compatible handoff:

```text
pre-refresh generation:  mtbgdju1-fwtefm
post-refresh generation: mtbjm1kl-1lbkiq
first post-refresh:  Telemetry continuity FRESH · no-compatible-handoff
second post-refresh: Telemetry continuity FRESH · no-compatible-handoff
```

Source review then confirmed the narrow released defect:

```text
frozen design:
OUTPUT-COMPLETE CHECKPOINT + ONUNLOAD LAST-CHANCE CHECKPOINT

released v0.64.7:
ONUNLOAD PUBLISH ONLY

classification:
OUTPUT_CHECKPOINT_CALLSITE_OMITTED
= FIX / BLOCKER
```

The v0.64.7 live gate therefore closed as `FAIL / CONFIRMED_BLOCKING` and directly activated v0.64.8.

Dedicated evidence:

- `../SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `../SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `../SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`

Provider cache remained `UNVERIFIED` throughout.

---

## v0.64.8 — current-family boundary, not historical authority

At migration time, v0.64.8 is the active production release and therefore **is not rolled over as a closed release record**.

Current production/gate truth must be read from `docs/CURRENT_DEVELOPMENT.md`.

Historical context for the repair is available in:

- `../SIMCORE_06408_OUTPUT_COMPLETE_TELEMETRY_CHECKPOINT_REPAIR_ACTIVATION.md`
- `../SIMCORE_06408_IMPLEMENTATION_EVIDENCE.md`

Migration-time current identity was:

```text
Version: 0.64.8
Release: Output-Complete Telemetry Checkpoint Repair
release-simcore commit: f5e29464452728f859a1a6a8191a846468353531
release blob: bed3d5faff9641071cdd9003b67c45d42b3e32ee
live gate: 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
validation: PENDING_REAL_LONG_CHAT
```

This block is historical context about migration time only. It must not be treated as a permanent current-state source.

---

# Current-authority boundary

The following must always be resolved from `docs/CURRENT_DEVELOPMENT.md` machine-managed blocks and active sections, never from this file:

```text
current production version
current release commit/blob
current live gate
current priority
current stop/advance condition
current hard freeze
```

This family manifest is evidence/navigation only and never authorizes publication, live-gate closure, or runtime modification.
