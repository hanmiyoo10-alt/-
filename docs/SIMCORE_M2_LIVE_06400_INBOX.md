# SimCore v0.64.0 M2-2 — Live Diagnostic Inbox

Purpose: immediate append-only forensic capture for `v0.64.0 — M2-2 Representation Ownership Split`. Entries here are recorded as soon as live diagnostics expose a useful regression-control sample or a suspicious condition. Confirmed results can later be promoted into `SIMCORE_M2_LIVE_EVIDENCE.md` / `SIMCORE_DEFERRED_LEDGER.md`; first specimens must not be lost while waiting for a paired next-turn diagnostic.

## Runtime mt2qjgt5-9oi0sk — first v0.64.0 long-chat sequence

Production: `v0.64.0`
Runtime boot: `2026-08-21T09:16:48.473Z`

### Representation ownership cold-init smoke test

Status: `REGRESSION_CONTROL / PARTIAL LIVE GATE`

Request `@2006` → output `@2007`, Mode C:

```text
Session load: COLD_INIT
character: 698 ms
Edit reconcile: SAME_FAST · 0.0 ms · snapshot UNCHANGED
Prior representation: UNAVAILABLE
Edit origin: NONE
shape: NEW_VISIBLE_REPRESENTATION
Output representation: EXACT
Representation ownership: REPRESENTATION · ledger 1 · mirror TRANSPORT_ONLY
Deferred mirror: COMMITTED
Warnings: 0
```

Interpretation: the new Representation ledger correctly begins memory-empty after cold init while canonical session state can still take the existing SAME_FAST path. `Prior representation: UNAVAILABLE` is therefore not, by itself, evidence of edit corruption. The first new output is recorded by Representation and mirrors exactly.

### Ordinary exact-carryover controls

Status: `REGRESSION_CONTROL`

Same runtime subsequently produced ordinary exact carryover across C and A/C mode changes:

```text
@2012 request:
Prior representation: EXACT
current match: FRESH_CHAT
shape: FRESH_EXACT_CARRYOVER
Edit reconcile: SAME_FAST · 1.0 ms
Output representation: EXACT
Representation ownership: ledger 4
Deferred mirror: COMMITTED

@2014 request (Mode A):
Prior representation: EXACT
shape: FRESH_EXACT_CARRYOVER
Edit reconcile: SAME_FAST · 1.0 ms
THOUGHTS_COMPAT: STRIPPED · SAFE_ENVELOPE_COMPAT
Output representation: EXACT
Representation ownership: ledger 5
Deferred mirror: COMMITTED

@2016 request (short C):
Prior representation: EXACT
shape: FRESH_EXACT_CARRYOVER
Edit reconcile: SAME_FAST · 1.0 ms
Output representation: EXACT
Representation ownership: ledger 6
Deferred mirror: COMMITTED
```

No false manual rebuild has appeared in these exact paths. Representation ownership is visibly active while Runtime Mirror remains transport-only.

### Short-C / evidence boundary regression control

Status: `REGRESSION_CONTROL`

Request `@2016` → output `@2017`:

```text
Short-C source lock: ON
Request lineage: CHAIN · root A@2014 · parent A@2014 · depth 1
Source handoff: FIRST
Evidence shape: TRANSFORMED
Evidence mode: ROOT_ONLY
Evidence root fence: APPLIED
Evidence source fence: SKIPPED · transformed delta 5 · unsafe-source-boundary
Continuity summary: PASS
Frame sequence: PASS
Warnings: 0
```

Interpretation: source-fence fail-closed behavior remains intact; M2-2 did not force an unsafe transformed source boundary merely to preserve source reuse.

### Natural v0.64.0 representation mismatch — paired next-turn evidence pending

Status: `DIRECT_EVIDENCE / NEXT_TURN_PENDING`

Request `@2018` → output `@2019`, Mode C:

```text
Prior representation: EXACT
Edit reconcile: SAME_FAST · 1.0 ms · snapshot UNCHANGED
Output provenance:
  CANONICAL 3578:8bd4314
  FRESH_CHAT 3574:5eee8b4
  Δchars -4
Output representation: DIFFERENT
Deferred mirror: OUTPUT_MISMATCH · setChat 0
Representation ownership: REPRESENTATION · ledger 7 · mirror TRANSPORT_ONLY
Stability: OBSERVED
Warnings: 0
```

This is the first natural `CANONICAL != FRESH_CHAT` sample captured after the M2-2 ownership split. Conservative mirror behavior is correct so far. The critical paired gate is the next ordinary request:

```text
Prior representation: OUTPUT_MISMATCH
current visible == prior FRESH_CHAT exact
→ Edit origin: REPRESENTATION_DRIFT_CORRELATED
→ Edit reconcile: REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED
```

Do not mark the M2-2 fast-reconcile live gate complete until that next-turn evidence exists.

### SUSPECTED narrative-tail coverage recurrence — separate from M2-2 attribution

Status: `SUSPECTED / NON_BLOCKING / CROSS-CHECK NEXT NATURAL TIME ADVANCEMENT`

Mode-A request `@2014` → output `@2015` began at:

```text
⏱️[2030-12-29 (Sun) 8:15 PM]
```

The RAW body then depicted the full multi-song halftime performance through its ending and included an explicit elapsed-duration cue (`4분 0초` for the final song), but emitted no later canonical timestamp. Diagnostic state remained:

```text
Narrative clock: ADVANCED
previous 2030-12-28 10:15 PM
frame/committed 2030-12-29 8:15 PM
scenes 0
tail FRAME_ONLY
Narrative tail coverage: FRAME_ONLY · RAW prose cross-check required
Warnings: 0
```

The following short-C turn used `08:30 PM` as its frame and committed that later time, so no persistent chronology rollback is established by this sample. However, because the RAW body contains explicit elapsed/end-of-performance cues while the A output has no terminal canonical timestamp beyond the opening frame, preserve this as a possible v0.63.58 generation-contract coverage recurrence. Do not attribute it to Representation M2-2 without repeated evidence.

### Cache / prefix observation during this sequence

Status: `OBSERVE_ONLY`

After the cold-init BASELINE, local prefix telemetry converged to:

```text
COMMON_PREFIX ~89.3–89.4% by chars
frontier advances +2 messages per request
Host prefix: STABLE · SAME_FAMILY
SimCore contribution: NOT_FIRST_BREAK
Cache break: PRE_SIMCORE · CHAT_HISTORY
provider cache: UNVERIFIED
```

The user separately observed caching on later requests. That observation is compatible with the growing local reuse window, but SimCore telemetry still must not claim provider-cache behavior without provider evidence.

### Current verdict

```text
M2-2 physical ownership diagnostic visible        PASS
cold-init Representation memory behavior          PASS
ordinary EXACT carryover                          PASS
SAFE_ENVELOPE_COMPAT exact path                    PASS
short-C source/evidence fail-closed behavior       PASS
natural output mismatch conservative handling     PASS SO FAR
next-turn Representation Fast Reconcile            PENDING
possible narrative-tail contract recurrence        SUSPECTED / NON-BLOCKING
provider cache attribution                         UNVERIFIED
```
