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
Production: v0.64.1 — Summary Scope Authority (M2-2 correctness insert)
Primary current phase: M2-2 final live validation + v0.64.1 summary-scope validation
Next physical move: Edit Reconcile extraction may begin after diagnostic-copy hardening
v0.64.x genuine-edit direct revalidation: DEFERRED_NON_BLOCKING; required before M2-3 closes or M2-4 begins
Natural B_END revalidation: DEFERRED / NON-BLOCKING
```

The v0.63.59 natural B_END gate is intentionally no longer a blocker. B_END is rare enough that waiting for another natural occurrence would stall M2. When a natural B_END appears later, capture it as bonus production confirmation.

## Deferred / non-blocking validation

### v0.64.x genuine visible user-edit direct revalidation

Status: `DEFERRED_NON_BLOCKING`

The direct v0.64.x positive-control sample remains useful but no longer blocks **starting** M2-3.

Expected behavior remains frozen:

```text
Prior representation: EXACT
current visible fingerprint != canonical
current visible fingerprint != Fresh
→ Edit origin: USER_EDIT_CANDIDATE
→ Edit reconcile: MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

Why deferral is acceptable:

```text
- genuine hand-edit behavior already has historical live positive evidence before M2-2;
- M2-2 moved Representation ownership mechanically and retained the genuine-edit decision markers/semantics;
- v0.64.0 live evidence directly proved the complementary representation-drift fast path after the ownership move;
- ordinary exact carryover, B lifecycle, reload continuity, Deferred Mirror and Representation ownership have direct v0.64.x live controls;
- forcing an artificial hand edit solely to satisfy sequencing would stall the architectural step without evidence of current edit corruption.
```

Risk retained by deferral:

```text
A failure discovered later cannot be attributed as cleanly to pre-M2-3 versus the M2-3 extraction itself.
```

Therefore this is a **start-gate deferral, not a deletion of the control**. Capture the sample naturally if it occurs earlier; otherwise perform one deliberate harmless visible edit before M2-3 is declared complete. M2-4 must not begin until the direct v0.64.x/M2-3-line genuine-edit control has passed.

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

v0.63.59 addresses the exact B_END closure boundary. Natural revalidation remains desirable but does not block M2-2 live validation or, by itself, justify delaying the Representation ownership checkpoint.

### Legacy/bootstrap migration path

Status: `DEFERRED_NON_BLOCKING`

Ordinary COLD_INIT and reload behavior have been observed, but a true legacy/history-bootstrap schema migration path has not been meaningfully exercised. Do not force destructive state mutation solely to obtain this sample. M2-2 did not touch migration ownership. Revisit only when a later checkpoint changes bootstrap/migration coordination or a natural legacy path exposes new evidence.

### Explicit past-scene allowance under Current Timeline Authority

Status: `DEFERRED_NATURAL_SAMPLE`

v0.63.57 current-era containment has positive evidence. A natural explicit flashback/past-scene allowance sample remains useful, but is not a blocker unless chronology ownership is changed.

### Summary Scope Authority live validation

Status: `DEFERRED_NON_BLOCKING / ACTIVE_MINI_VALIDATION`

v0.64.1 adds request-scoped `ANNUAL_ONLY` versus `CUMULATIVE_YOY` temporal authority after direct long-chat evidence of annual-scope omission/contamination and an internally inconsistent historical baseline in a YoY summary. Re-run the natural annual-only and cumulative-YoY request families. Keep the repeated standalone-C lineage over-chain on WATCH; v0.64.1 intentionally does not patch Lineage/Recurrence implementation so the live result can separate temporal-scope authority from source-chain debt.

## WATCH_ONLY anomalies

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

Preserve these behaviors through M2-2 and M2-3:

```text
normal canonical == Fresh EXACT                         PASS
small output representation mismatch                   OBSERVED
next-turn REPRESENTATION_FAST_RECONCILED               PASS
genuine user hand-edit -> USER_EDIT_CANDIDATE          PASS (historical live control; direct v0.64.x recheck deferred)
genuine user hand-edit -> MANUAL_EDIT_REBUILT          PASS (historical live control; direct v0.64.x recheck deferred)
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
Harden diagnostic-copy observability without changing runtime semantics.
Then M2-3 Edit Reconcile extraction may begin.
The direct v0.64.x genuine-edit positive control is deferred from the M2-3 start gate to the M2-3 close gate.
Do not begin M2-4 until that control passes.
Capture natural B_END and Summary Scope confirmations whenever they occur without stalling M2.
```
