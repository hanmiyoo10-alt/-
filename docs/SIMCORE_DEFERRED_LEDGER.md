# SimCore Deferred / Error Ledger

Purpose: preserve deferred validation items, watch-only anomalies, confirmed-but-nonblocking defects, and regression controls so they are not lost while M2 proceeds. This file is additive evidence memory; it does not replace `SIMCORE_GUIDELINES.md`, `CURRENT_DEVELOPMENT.md`, `SIMCORE_M2_LIVE_EVIDENCE.md`, or `SIMCORE_ANOMALY_WATCH.md`.

## Current baseline

```text
Production: v0.63.59 — Broadcast End Closure Contract
Primary next phase: M2-2 Representation Ownership Split
Natural B_END revalidation: DEFERRED / NON-BLOCKING
```

The v0.63.59 natural B_END gate is intentionally no longer a blocker. B_END is rare enough that waiting for another natural occurrence would stall M2. When a natural B_END appears later, capture it as bonus production confirmation.

## Deferred / non-blocking validation

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

v0.63.59 addresses the exact B_END closure boundary. Natural revalidation is desirable but does not block M2-2.

### Legacy/bootstrap migration path

Status: `DEFERRED_NON_BLOCKING`

Ordinary COLD_INIT and reload behavior have been observed, but a true legacy/history-bootstrap schema migration path has not been meaningfully exercised. Do not force destructive state mutation solely to obtain this sample. Revisit if M2-2 touches migration ownership.

### Explicit past-scene allowance under Current Timeline Authority

Status: `DEFERRED_NATURAL_SAMPLE`

v0.63.57 current-era containment has positive evidence. A natural explicit flashback/past-scene allowance sample remains useful, but is not a blocker unless chronology ownership is changed.

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

Preserve these behaviors through M2-2:

```text
normal canonical == Fresh EXACT                         PASS
small output representation mismatch                   OBSERVED
next-turn REPRESENTATION_FAST_RECONCILED               PASS
genuine user hand-edit -> USER_EDIT_CANDIDATE          PASS
genuine user hand-edit -> MANUAL_EDIT_REBUILT          PASS
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

Do not stop M2-2 for every new anomaly. Promote a deferred/watch item into a blocking fix only when natural evidence establishes one of the following:

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
Proceed with M2-2 — Representation Ownership Split.
Use this ledger plus SIMCORE_M2_LIVE_EVIDENCE.md as regression baselines.
Natural B_END confirmation remains on hold and should be captured whenever it appears, without delaying M2.
```
