# SimCore v0.70.10 Lens 2 Terminal Replacement-Set Transition / Causality Audit

Date: 2026-09-06 KST
Status: **LENS 2 PASS FOR OBSERVED CONTROLS + EXISTING FIX + PERFORMANCE WATCH + EVIDENCE DEFER · NEW BLOCKER NONE**
Release: `v0.70.10 Host-Local Telemetry Set Cost Attribution`
Production: `release-simcore@ecc55f026315c6482c34d267aba2adb97527cdbc`
Production blob: `53f6959039c57f8673c355fcc1c22b573150e4a7`
Generation: `mtpaobnf-gx39fr`
Tracking: `#1666`
Protocol: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`
Lens-1 progress authority: `docs/SIMCORE_LIVE_07010_LENS1_REPLACEMENT_MATRIX_PROGRESS_2026-09-06.md`
Lens-1 terminal authority: `docs/SIMCORE_LIVE_07010_LENS1_TERMINAL_MATRIX_CLOSE_2026-09-06.md`
Prior Lens-2 generation audit: `docs/SIMCORE_07010_LENS2_COHERENT_SET_TRANSITION_CAUSALITY_2026-09-06.md`

## 1. Review boundary

This record performs **Lens 2 only** for the newly accepted terminal replacement evidence.

Question:

```text
What does the newly supplied replacement-generation evidence mean as one operator/action flow,
and what causal claims are actually supported by the durable evidence?
```

This record does not re-score Lens 1 and does not perform Lens 3.

It does not infer raw diagnostic fields that were not preserved in the durable Lens-1 records.

The earlier Lens-2 record for generation `mtp6ixup-wzmr63` remains valid for that generation. This document extends Lens-2 coverage to the terminal replacement generation and does not supersede the earlier generation-specific conclusions.

## 2. Supplied specimen binding

The newly accepted supplied diagnostics are:

```text
E @3198 -> @3199
  fresh first ordinary
  Mode A
  Session COLD_INIT
  generation mtpaobnf-gx39fr

F @3200 -> @3201
  same-generation warm ordinary
  Mode C
  Session LOCATION_REUSE

G @3202 -> @3203
  same-generation warm ordinary
  Mode C
  Session LOCATION_REUSE

H @3206 -> @3207
  same-generation warm ordinary
  Mode C
  Session LOCATION_REUSE
```

Lens 1 accepted all four for their legal release roles and completed the v0.70.10 matrix.

## 3. Evidence-shape boundary

H reports:

```text
Hook activity = request 5 / output 5
```

The supplied replacement diagnostics identify E, F, G, and H as request/output pairs 1, 2, 3, and 5 in the generation. Therefore one natural request/output pair occurred after G and before H without a separately supplied diagnostic.

Disposition:

```text
E_F_G_PREFIX = COHERENT SUPPLIED PREFIX
G_TO_H_DIRECT_EDGE = NOT DIRECTLY OBSERVED
MISSING_INTERVENING_SPECIMEN = DEFER FOR DIRECT TRANSITION CLAIMS
PRODUCT_DEFECT = NO
LENS1_MATRIX_IMPACT = NONE
```

The missing diagnostic was not required by the frozen Lens-1 acceptance matrix. Lens 2 nevertheless must not fabricate a direct G -> H causal edge.

## 4. E fresh-runtime first output

E is mechanically the first real request/output in the replacement generation:

```text
Hook activity = request 1 / output 1
Session = COLD_INIT
request @3198 -> output @3199
Mode A
output = COMMITTED
Warnings = 0
```

E ends with:

```text
Deferred mirror = OUTPUT_MISMATCH
Stability = OBSERVED
```

This is a fail-closed representation observation rather than evidence of unsafe mirror mutation. The output itself committed, and the later supplied warm controls return to stable committed mirror state.

The durable Lens-1 summaries do not preserve the exact F request-side representation fields needed to re-assert a particular E -> F reconcile marker such as `REPRESENTATION_FAST_RECONCILED`.

Therefore:

```text
E_OUTPUT_COMMIT = PASS
E_MIRROR_FAIL_CLOSED = PASS
E_OUTPUT_MISMATCH_AS_CORRECTNESS_FAILURE = NO
E_TO_F_EXACT_RECONCILE_CLASS = NOT CLAIMED FROM DURABLE SUMMARY
NEW_REPRESENTATION_FIX = NONE FROM THIS EVIDENCE
```

The earlier generation-specific Lens-2 audit already proved one separate real A -> B exact-Fresh forward recovery path. That prior evidence is a comparator, not a substitute for missing current-generation raw fields.

## 5. F and G warm ordinary controls

F reports:

```text
request @3200 -> output @3201
Mode C
Session = LOCATION_REUSE
Stability = PASS
output = COMMITTED
mirror = COMMITTED
Warnings = 0
```

G reports:

```text
request @3202 -> output @3203
Mode C
Session = LOCATION_REUSE
Stability = PASS
output = COMMITTED
mirror = COMMITTED
Warnings = 0
```

These are clean same-generation natural warm controls after the fresh-runtime E specimen.

Disposition:

```text
F_WARM_OUTPUT = PASS
G_WARM_OUTPUT = PASS
F_MIRROR_COMMIT = PASS
G_MIRROR_COMMIT = PASS
F_G_VISIBLE_CORRECTNESS_REGRESSION = NONE OBSERVED
```

No stronger request-side reconcile, lineage, source-handoff, cache, chronology, or storage-leaf conclusion is created where the terminal durable summaries do not retain those fields.

## 6. H terminal supplied warm control

H reports:

```text
request @3206 -> output @3207
Mode C
Session = LOCATION_REUSE
Stability = PASS
binding = BOUND
output = COMMITTED
mirror = COMMITTED
Warnings = 0
```

Its request-side controls are explicitly preserved:

```text
Edit reconcile = SAME_FAST
snapshot = UNCHANGED
Prior representation = EXACT
Edit origin = NONE
current == FRESH_CHAT
Pre snapshot = FORWARD / SKIPPED
```

Therefore H is a clean natural exact-carryover control at the point it was captured.

Disposition:

```text
H_NATURAL_WARM_CONTROL = PASS
H_PRIOR_REPRESENTATION_EXACT = PASS
H_SAME_FAST = PASS
H_SNAPSHOT_UNCHANGED = PASS
H_MANUAL_EDIT_FALSE_POSITIVE = NONE
H_REROLL_PATH = NOT EXERCISED
```

Because the intervening request/output #4 is not separately supplied, these facts describe H's immediate observed request state but do not authorize reconstructing the missing G -> H transition.

## 7. Visible `internal:` planning-control alias

E visibly contains two standalone planning-like lines using the wrong-key alias `internal:`.

That finding is already durably owned by:

```text
#1660 SimCore visible inline `internal:` planning-control alias leaks under v0.70.10
```

The frozen v0.70.9 compatibility grammar removes exact reserved `internal_memo:` lines only. Therefore the E observation is not evidence that the exact `INLINE_INTERNAL_MEMO_V1` implementation regressed. It is a separate visible-output hygiene family.

The final H RAW body does not visibly reproduce the `internal:` alias.

Disposition:

```text
E_VISIBLE_OUTPUT_CONTAMINATION = CONFIRMED
EXACT_INLINE_INTERNAL_MEMO_V1_REGRESSION = NO
NEW_INTERNAL_ALIAS_FAMILY = FIX #1660
H_NON_REPRODUCTION_CONTROL = PRESENT
RECURRENCE_FREQUENCY = NOT ESTABLISHED
FIX_1660_CLOSED_BY_NON_REPRODUCTION = NO
BLIND_GLOBAL_INTERNAL_STRIP = NOT AUTHORIZED
```

Lens 2 therefore carries forward the existing FIX rather than creating a duplicate issue or silently downgrading it.

## 8. Host-local set timing as one same-generation sequence

Exact v0.70.10 Host-local attribution samples in this generation are:

```text
E 4,099 chars · acquire 0 ms · set 3,735 ms · total 3,735 ms · residual 0 ms
F 4,456 chars · acquire 0 ms · set    50 ms · total    50 ms · residual 0 ms
G 4,312 chars · acquire 0 ms · set    46 ms · total    46 ms · residual 0 ms
H 4,483 chars · acquire 0 ms · set 6,432 ms · total 6,432 ms · residual 0 ms
```

The maximum exact set span is approximately 140x the minimum exact set span within one runtime generation, while serialized sizes remain in a relatively narrow roughly 4.1k to 4.5k-character range.

Every materially slow sample closes on the actual `RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM` span:

```text
acquire = 0
residual = 0
host total = set span
```

Disposition:

```text
HOST_SET_LATENCY_VARIANCE = WATCH #1588 / STRONGLY STRENGTHENED
HOST_SET_SLOW_OWNER = EXACTLY OBSERVED IN SLOW SAMPLES
HOST_ACQUIRE_DOMINANT = NOT SUPPORTED
RESIDUAL_DOMINANT = NOT SUPPORTED
PAYLOAD_SIZE_AS_SOLE_EXPLANATION = NOT SUPPORTED
HOST_BACKEND_INTERNAL_REASON = UNKNOWN
PROVIDER_CACHE_CAUSE = UNVERIFIED / NOT CLAIMED
```

This evidence does not authorize changing OUTPUT_COMMIT durability, making Host-local publication fire-and-forget, adding retries/polling, adding another storage key, or claiming a Host-internal mechanism that has not been observed.

## 9. Previously tracked performance lanes not re-scored here

The prior generation-specific Lens-2 audit tracked additional performance observations including:

```text
#1651 manual-edit residual-other latency
#1652 Deferred Mirror chat/setChat latency
#1653 post-onSend prompt-accounting latency
#1587 output snapshot-set variance
#1626 Turn-storage variance
#1619 historical ambiguous-edit prune latency
```

The durable terminal replacement summaries do not retain enough corresponding fields for a legal new E-H verdict on each of those lanes.

Therefore:

```text
NEW_E_H_VERDICT_FOR_1651 = NOT CLAIMED
NEW_E_H_VERDICT_FOR_1652 = NOT CLAIMED
NEW_E_H_VERDICT_FOR_1653 = NOT CLAIMED
NEW_E_H_VERDICT_FOR_1587 = NOT CLAIMED
NEW_E_H_VERDICT_FOR_1626 = NOT CLAIMED
NEW_E_H_VERDICT_FOR_1619 = NOT CLAIMED
```

Their existing repository dispositions remain unchanged.

## 10. Lens-2 terminal replacement-set verdict

```text
LENS_2_REPLACEMENT_SET = PASS FOR OBSERVED RUNTIME CONTROLS
COHERENT_PREFIX_E_F_G = YES
H_SAME_GENERATION_TERMINAL_CONTROL = YES
G_TO_H_DIRECT_CAUSAL_EDGE = DEFER / INTERVENING SPECIMEN NOT SUPPLIED

E_MIRROR_FAIL_CLOSED = PASS
F_WARM_STABILITY = PASS
G_WARM_STABILITY = PASS
H_SAME_FAST_EXACT_CARRYOVER = PASS
OUTPUT_COMMIT_CONTINUITY = PASS FOR SUPPLIED SPECIMENS
MIRROR_SAFETY = PASS FOR SUPPLIED SPECIMENS

FIX #1660 visible internal alias = REMAINS OPEN
WATCH #1588 Host-local set latency = STRENGTHENED
NEW_RUNTIME_FIX_BEYOND_1660 = NONE
NEW_BLOCKER = NONE
```

This is intentionally not a clean global PASS because Lens 2 must preserve the confirmed `#1660` FIX and the evidence-shape `DEFER` rather than erasing them behind successful runtime controls.

## 11. Advancement boundary

Current review state after this transaction is bounded as:

```text
Lens 1 = PASS / release-specific matrix complete
Lens 2 prior generation = PASS + WATCHES
Lens 2 terminal replacement generation = PASS FOR OBSERVED CONTROLS + FIX #1660 + WATCH #1588 + DEFER
Lens 3 terminal replacement evidence = STILL REQUIRED
R2.8 HUMAN_EVIDENCE terminal convergence = NOT EXECUTED
```

Existing unresolved FIX owners remain independent advancement constraints, including at least:

```text
#1656 CURRENT_DEVELOPMENT human current-state drift
#1657 stale operator release card
#1660 visible standalone internal: planning-control alias
```

No next runtime advancement is authorized merely because Lens 1 is complete or because the observed runtime controls in this Lens-2 set pass.

## 12. Production boundary

This transaction is evidence-only and documentation-only.

```text
runtime mutation = NONE
release-simcore mutation = NONE
release-state mutation = NONE
product-manifest mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
```

Production remains:

```text
v0.70.10 Host-Local Telemetry Set Cost Attribution
release-simcore = ecc55f026315c6482c34d267aba2adb97527cdbc
blob = 53f6959039c57f8673c355fcc1c22b573150e4a7
```
