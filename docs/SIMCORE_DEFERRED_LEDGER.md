# SimCore Deferred / Error Ledger

Purpose: preserve deferred validation items, watch-only anomalies, confirmed-but-nonblocking defects, and regression controls so they are not lost while M2 proceeds. This file is additive evidence memory; it does not replace `SIMCORE_GUIDELINES.md`, `CURRENT_DEVELOPMENT.md`, `SIMCORE_M2_LIVE_EVIDENCE.md`, or `SIMCORE_ANOMALY_WATCH.md`.

## Immediate diagnostic capture rule

This ledger is part of the normal diagnostic-review workflow, not a document that is updated only at release time.

Whenever a real SimCore diagnostic or copied RAW turn exposes **any suspicious behavior, contradiction, unexplained mismatch, probable defect, or new regression-control sample**, record it immediately before moving on to unrelated development work.

Do not wait for recurrence before preserving the first specimen. Recurrence controls promotion priority, not whether the evidence is recorded.

Minimum capture flow:

```text
full diagnostic review
→ RAW / state / next-turn cross-check
→ suspicious or defective behavior observed
→ classify immediately
→ append evidence to this ledger or SIMCORE_ANOMALY_WATCH.md
→ only then decide WATCH / DEFER / FIX / DISMISS / REGRESSION_CONTROL
```

Use the narrowest applicable status:

```text
SUSPECTED                    evidence exists, cause not established
WATCH_ONLY                   one-off or low-confidence anomaly preserved for recurrence
DIRECT_EVIDENCE              observable defect is real, attribution may still be open
DEFERRED_NON_BLOCKING        real or useful validation item intentionally not blocking current work
CONFIRMED_BLOCKING           must be repaired before the active architectural step continues
MITIGATED                    production patch exists; preserve as a regression target
REGRESSION_CONTROL           verified healthy behavior that future updates must preserve
DISMISSED_NO_DEFECT          suspicion was resolved as expected behavior; retain the reason
```

Every new entry should preserve, when available:

```text
production version
runtime/generation ID
user / assistant turn indices
mode
exact suspicious diagnostic fields
relevant RAW evidence
cross-field contradiction or reason for suspicion
whether reroll/regeneration reproduced or cleared it
whether the next turn inherited the suspect state
confidence / attribution status
```

A suspicious item must not be silently dropped merely because the rest of the diagnostic says `PASS`, `Warnings: 0`, `COMMITTED`, or `REPAIRED`. Those labels remain scoped signals and must be cross-checked against RAW and neighboring state.

If later evidence disproves the suspicion, update the existing entry to `DISMISSED_NO_DEFECT` with the resolving evidence rather than deleting the specimen. If it recurs, append the new runtime/turn evidence and promote classification as appropriate.

Operational rule:

> **See something suspicious in a diagnostic → capture it immediately. Do not rely on chat memory to remember it later.**

## Current baseline

```text
Production: v0.64.7 — Cross-Reload Cache Observer Continuity
Production validation: PENDING_REAL_LONG_CHAT
Primary current phase: close 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT before any later runtime release or physical M2-3 implementation
Next physical architecture move: M2-3 Edit Reconcile extraction only after the v0.64.7 live gate is classified and closed
Safe parallel non-runtime state: original NR design/harvest, R doc-apply, and four-item permanent-fixture queues are exhausted; a separate system-idea NON_RUNTIME design sweep is ACTIVE and may proceed while the live gate is pending, with apply/implementation held until that sweep closes or priority changes
System-idea sweep state: 21/52 designs FROZEN; scoped next design = SYS-04 Status Vocabulary Linter
Genuine-edit baseline: v0.64.5 DIRECT LIVE PASS established before M2-3; post-M2-3 direct recheck remains required before M2-4
Natural B_END revalidation: DEFERRED / NON-BLOCKING
R2.1 delegated release operation: ACTIVE / PERMANENT-CI PASS / genuine release end-to-end proof PENDING on the next genuine runtime release
```

The v0.63.59 natural B_END gate is intentionally no longer a blocker. B_END is rare enough that waiting for another natural occurrence would stall M2. When a natural B_END appears later, capture it as bonus production confirmation.

## Deferred / non-blocking validation

### M2-3 genuine visible user-edit direct control

Status: `PRE_M2_3_BASELINE_ESTABLISHED / POST_M2_3_RECHECK_REQUIRED`

The current v0.64.x line now has direct positive-control evidence, including the v0.64.5 real-long-chat sample:

```text
Prior representation: EXACT
current visible fingerprint != canonical
current visible fingerprint != Fresh
→ Edit origin: USER_EDIT_CANDIDATE
→ Edit reconcile: MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

The v0.64.5 sample is recorded in `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md` as `DIRECT LIVE PASS / REGRESSION_CONTROL / M2-3 GOLDEN`. It confirms that the pre-extraction production line still distinguishes genuine visible edits from Representation drift and returns to a healthy exact output afterward.

This removes the old documentation state in which a direct v0.64.x positive control was still merely deferred.

The remaining requirement is different:

```text
M2-3 physical extraction lands and stabilizes
→ run one direct harmless genuine visible edit against the post-M2-3 line
→ require USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT → snapshot UPDATED
→ only then may M2-4 begin
```

This post-M2-3 recheck is an extraction-close control, not a reason to repeat the pre-M2-3 baseline now.

### B_END closure natural revalidation

Status: `DEFERRED_NON_BLOCKING`

Triggering v0.63.58 evidence:

```text
broadcast start: 2030-09-08 09:00 AM
B_END frame:      2030-09-09 08:30 AM
visible prose:    30 minutes remaining -> 5 minutes remaining -> broadcast end
expected terminal airtime: 09:00 AM
stored airtime:            08:30 AM
```

The same B_END output also violated the structure contract:

```text
required: 2 COMMUNITY blocks x 3 platform sections
observed: 1 COMMUNITY block x 6 sections
warnings: 8
state quarantine: response=1, COMMUNITY=1/2
```

v0.63.59 addresses the exact B_END closure boundary. Natural revalidation remains desirable but does not block the current v0.64.7 live close or M2-3 after that gate. The separate permanent `broadcast-closure` expansion is now complete and does not substitute for a future natural sample.

### Legacy/bootstrap migration path

Status: `DEFERRED_NON_BLOCKING`

Ordinary COLD_INIT and reload behavior have been observed, but a true legacy/history-bootstrap schema migration path has not been meaningfully exercised. Do not force destructive state mutation solely to obtain this sample. M2-2 did not touch migration ownership. Revisit only when a later checkpoint changes bootstrap/migration coordination, Recovery retirement reaches migration callers, schema evolution requires it, or a natural legacy path exposes new evidence.

### Explicit past-scene allowance under Current Timeline Authority

Status: `DEFERRED_NATURAL_SAMPLE`

v0.63.57 current-era containment has positive evidence. A natural explicit flashback/past-scene allowance sample remains useful, but is not a blocker unless chronology ownership is changed.

### Summary Scope Authority rendered-semantics validation

Status: `DEFERRED_NATURAL_SAMPLE / VALIDATION_ONLY`

v0.64.1 established the deterministic request-scoped `ANNUAL_ONLY` versus `CUMULATIVE_YOY` temporal authority contract. Broad fixture research is closed and the `summary-scope` deterministic permanent fixture is now implemented as an `EXECUTABLE / required / goldenGate` suite. Its permanent-CI success establishes deterministic classifier/authority regression protection but does not promote rendered natural semantics to LIVE PASS.

Natural annual-only and cumulative-YoY outputs remain useful for renderer-semantic validation, but they are no longer the active production mini gate. Keep the repeated standalone-C lineage over-chain on WATCH and do not patch Lineage/Recurrence without new attributable evidence.

## WATCH_ONLY anomalies

### NR standalone tooling-test discovery coverage

Status: `WATCH_ONLY / VERIFICATION_COVERAGE / NON_RUNTIME / NON_BLOCKING`

Observed during the S-10 and S-11 SAFE_NON_RUNTIME harvests on 2026-08-26.

Both work items added focused standalone test sources:

```text
products/simcore/tooling/authority-drift-check.test.mjs
products/simcore/tooling/stale-pr-hygiene.test.mjs
```

Their PR-level SimCore CI workflows completed successfully, but the current path classifier does not register arbitrary new `products/simcore/tooling/*.test.mjs` files as semantic test lanes. The permanent verifier therefore treated the new standalone tooling paths as outside the planned SimCore gates; it did not automatically execute those focused semantic test files.

Preserved evidence:

```text
S-10 PR #396
SimCore CI run 32890770492
Verify PASS
Required PASS
standalone S-10 semantic test execution by current CI: NOT CLAIMED

S-11 PR #398
SimCore CI run 32891014549
Verify PASS
Required PASS
standalone S-11 semantic test execution by current CI: NOT CLAIMED
```

Dedicated implementation evidence:

```text
docs/SIMCORE_S10_AUTHORITY_DRIFT_IMPLEMENTATION_EVIDENCE_2026-08-26.md
docs/SIMCORE_S11_STALE_PR_HYGIENE_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

Current disposition:

```text
runtime correctness impact: NONE
release-simcore impact: NONE
implementation blocker: NO
current NR easy-tier close blocker: NO
```

Do not silently widen the permanent CI classifier, harness registry, or release-gate policy inside S-10/S-11 just to erase this WATCH. If generalized standalone tooling-test discovery becomes desirable, design it as a separate repository/CI item so CI authority changes are not mixed with product/tool harvest work.

### NR Difficulty-3 focused verification coverage

Status: `WATCH_ONLY / VERIFICATION_COVERAGE / NON_RUNTIME / NON_BLOCKING`

The completed Difficulty-3 harvest also preserves focused-execution coverage limits under:

```text
docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md
```

Current non-claims:

```text
M-11 architecture snapshot mode direct permanent-CI execution = NOT CLAIMED
M-10 focused fixture-skeleton standalone test direct CI execution = NOT CLAIMED
M-13 focused evidence-index standalone test direct CI execution = NOT CLAIMED
M-13 evidence-index --check direct CI execution = NOT CLAIMED
```

These do not affect runtime correctness, `release-simcore`, the completed current NR harvest, M2-3 readiness after the live gate, or v0.64.7 live validation. Do not widen CI/harness authority inside unrelated work merely to erase this WATCH.

### GENERATION_SEMANTIC_EXCURSION

One first generation abandoned an explicit source/scene-only boundary and produced an unrelated continuation. Regeneration corrected it. Diagnostics were otherwise healthy. Preserve as generation-semantic evidence; do not attribute to Recovery/Representation without recurrence.

### SILENT_COMPAT representation mismatch family

Observed examples include a `CANONICAL/FRESH` mismatch such as `-80` chars. The following request proved exact Fresh carryover and Representation Fast Reconcile now avoids the false manual-edit rebuild. The output-side transformation cause remains unknown. Do not broaden normalization from this alone.

### B_END unresolved Thoughts + malformed COMMUNITY correlation

One natural B_END simultaneously showed:

```text
THOUGHTS_COMPAT: UNRESOLVED
preamble: ~4200 chars
CANONICAL/FRESH delta: ~-4189 chars
COMMUNITY: malformed 1 x 6 shape
```

The numerical proximity is worth preserving, but causality is unproven. The visible COMMUNITY body independently violated its contract.

### PARTIAL_PREVIOUS_TURN_REPLAY

One B_CONTINUE first generation replayed a large semantic prefix from the preceding turn before continuing with the new requested content. Recurrence telemetry reported `FIRST / NO MATCH`. Reroll of the same input removed the replay. Escalate only on natural recurrence.

### COMMUNITY platform-family diversity

A C output used three named sites but only two distinct platform families (`여초 + SNS + 여초`), producing a true-positive Structure warning. This is direct structural evidence, but recurrence threshold for an independent mini-release has not been met.

### Reaction normalization stale-scale fallback

One B_CONTINUE produced a `stale_scale_fallback` reaction-normalization warning and successfully normalized the values. No repeated correctness failure established. Observe only.

### Diagnostic clarity: repaired RAW/frame wording

Some diagnostics can show final RAW frame progression as already advanced while separately reporting `Frame guard: REPAIRED · CHATINDEX_SAME`. Treat as diagnostic-clarity debt, not a behavior defect, unless misleading attribution causes real debugging errors.

## Confirmed defects already mitigated / regression targets

### Visible current-era rollback / historical-context takeover

Status: `MITIGATED_IN_0.63.57`

Persisted state floor protection had succeeded while visible output could still regress into an unrequested historical era. Current Timeline Authority was added. Preserve the distinction: state repair does not imply visible repair.

### Intra-turn narrative time advancement lost

Status: `MITIGATED_IN_0.63.58`

A scene began at `01:00`, visibly progressed to `03:00` only in prose, and persisted `01:00`, causing stale next-turn inheritance. Narrative Tail Time Contract requires explicit canonical terminal time rather than arbitrary prose-time inference.

### B_END terminal airtime closure gap

Status: `PATCHED_IN_0.63.59 / NATURAL_REVALIDATION_DEFERRED`

B_END could unlock successfully while retaining the opening frame airtime instead of the visible terminal time. v0.63.59 adds B_END terminal timestamp authority and closure diagnostics.

## Validated M2 regression controls

Preserve these behaviors through M2-3 and later narrowing work:

```text
normal canonical == Fresh EXACT                         PASS
small output representation mismatch                   OBSERVED
next-turn REPRESENTATION_FAST_RECONCILED               PASS
genuine user hand-edit -> USER_EDIT_CANDIDATE          PASS (direct v0.64.5 live control; post-M2-3 recheck required)
genuine user hand-edit -> MANUAL_EDIT_REBUILT          PASS (direct v0.64.5 live control; post-M2-3 recheck required)
same-turn reroll replacement                           PASS
historical response-variant restore                    PASS
historical restore -> reroll returns to new authority  PASS
natural B_START / B_CONTINUE / B_END lifecycle         PASS
premature broadcast end denied                         PASS
explicit B_END authority allowed                       PASS
runtime COLD_INIT during active broadcast              PASS
broadcast date rollover                                PASS
Deferred Mirror exact commit                           PASS
Frame progression / deterministic repair               PASS
```

## Escalation rule

Do not stop M2 for every new anomaly. Promote a deferred/watch item into a blocking fix only when natural evidence establishes one of the following:

```text
hard state corruption
broadcast lifecycle regression
real user-edit corruption/misclassification
repeatable chronology corruption
repeatable representation ownership corruption
repeatable structural failure with a narrow attributable cause
```

One-off semantic generation anomalies, cache/provider uncertainty, diagnostic-clarity debt, and rare natural-validation gaps remain non-blocking unless recurrence changes the evidence.

## Next action

```text
1. Close v0.64.7 with 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT and classify PASS / WATCH / FIX / BLOCKER.
2. Preserve any live anomaly immediately before moving on and keep living current-state documents synchronized under SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md.
3. Original current gate-open NR design = NONE and original NR harvest queue = EMPTY. Seven gated/future original NR items remain and must wait for their legitimate gates.
4. Separate system-idea NON_RUNTIME design sweep = ACTIVE; 21/52 system designs are currently FROZEN and the scoped next design is SYS-04 Status Vocabulary Linter. Frozen SYS application/implementation remains HOLD while that sweep is active.
5. The four-item non-runtime permanent-fixture expansion portfolio is COMPLETE: summary-scope, narrative-clock, frame, broadcast-closure expansion. There is no next item in that bounded portfolio.
6. Current gate-open R design = NONE and R DOC APPLY queue = EMPTY; S-04 document prep is already APPLIED.
7. After the v0.64.7 gate closes, M2-3 Edit Reconcile becomes the next physical architecture checkpoint.
8. After M2-3 lands, run the direct genuine-edit post-extraction close control before M2-4.
9. R2.1 end-to-end delegated release proof belongs to the next genuine runtime release and remains non-blocking for the current live gate.
10. Capture natural B_END, explicit flashback, Summary Scope rendered-semantics, Reaction/Community and other WATCH samples when informative without stalling M2.
```
