# SimCore live evidence — v0.65.0 reroll stale-probe fail-closed bonus

Date: 2026-08-28

Status: **BONUS OBSERVABILITY RECURRENCE · INPUT-REROLL STALE PROBE FAIL-CLOSED · CURRENT-TURN FIELDS NOT FABRICATED · NO GATE REOPEN · NO RUNTIME CHANGE**

Runtime:

```text
Version: 0.65.0
boot: 2026-08-28T15:06:17.830Z
generation: mtd33vja-616y70
```

## Operator clarification

The operator did **not** edit or reroll the visible assistant output. The previous assistant representation was left untouched.

Only the user input was rerolled/reissued through the host UI. After that input-only reroll, diagnostics were copied.

This distinction matters: the specimen is not evidence about output-reroll or assistant-representation mutation. It is an input-reroll / diagnostic-freshness boundary specimen.

## Direct freshness evidence

```text
Probe context: STALE · probe user @2322 · current user @2320
Request hook: n/a
Core handshake: n/a
Runtime status: n/a · output n/a
Mode: n/a
Turn binding: request user @n/a · output assistant @n/a
Stability: NOT_EXERCISED
Edit reconcile: n/a
Output provenance: n/a
Frame sequence: n/a
Frame guard: n/a
```

The most conservative interpretation is:

```text
input-only reroll/reissue creates or advances a runtime probe identity to user @2322
while the diagnostic/current-visible snapshot still resolves user @2320
→ probe user != current visible user
→ Probe context STALE
→ current-turn runtime fields collapse to n/a / NOT_EXERCISED
```

The report therefore refuses to project the advanced input-reroll probe onto the older/current visible snapshot as if they were one coherent current turn.

This is the expected fail-closed behavior defined by the diagnostic snapshot freshness contract.

## What this packet does NOT prove

Because the probe is explicitly STALE, this packet does not prove a fresh request/output lifecycle for @2322 and must not be used to classify:

```text
Edit Reconcile result for @2322
output commit/mirror result for @2322
current Mode for @2322
current Frame guard for @2322
assistant-output mutation caused by reroll
```

The operator clarification specifically excludes the last item: the assistant output was not touched.

## What remains observable

The stale report still exposes bounded non-current-turn / retained facts such as:

```text
Representation ownership: REPRESENTATION · ledger 16
Telemetry continuity: ADOPTED · via host-local
Telemetry capsule: COMPACT_V2 · 4150/16384 · OK
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot CONSUMED
RAW frame continuity: volume 80→80 · chapter 11→12 · Chatindex 1131→1132 · RAW regression NONE
Stored broadcast: UNLOCKED
```

These lines must not be interpreted as a fresh request/output execution for the input-reroll probe itself. In particular, aggregate hook counters and the retained telemetry checkpoint do not prove a current-turn request lifecycle when the report explicitly marks the probe STALE.

## Classification

```text
06500_INPUT_REROLL_STALE_PROBE
= WATCH / OBSERVABILITY BONUS
= INPUT-ONLY REROLL
= ASSISTANT OUTPUT UNTOUCHED BY OPERATOR
= FAIL-CLOSED CORRECT
= FALSE CURRENT-TURN BINDING PREVENTED
= STATE CORRUPTION NOT OBSERVED
= REQUEST/OUTPUT CORRECTNESS DEFECT NOT ESTABLISHED
= NO M2-3 GATE IMPACT
```

This specimen is consistent with `SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`, which requires stale/unbound reports to degrade current-turn authority rather than fabricate binding.

## Promotion boundary

This input-reroll-triggered stale specimen is a meaningful recurrence of the stale-freshness class, but it does not by itself prove the exact UI sequence `panel-open snapshot -> later copy snapshot` because the panel-open/copy timing was not independently captured.

It does, however, add a distinct natural trigger shape to the evidence set:

```text
input-only reroll/reissue
→ advanced probe identity
→ visible/current snapshot mismatch
→ STALE fail-closed
```

Therefore:

```text
stale freshness class recurrence = YES
input-reroll trigger shape = DIRECTLY OBSERVED
future diagnostic UX investigation support = STRENGTHENED
strict promotion-trigger A (panel-open -> later copy) = NOT PROVEN BY THIS PACKET ALONE
runtime/UI implementation authorization = NONE
```

No release gate is reopened. v0.65.0 Subgate A/B acceptance remains closed.
