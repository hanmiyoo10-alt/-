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

### Natural v0.64.0 representation mismatch — paired next-turn evidence

Status: `REGRESSION_CONTROL / FAST-RECONCILE LIVE GATE PASS`

Request `@2018` → output `@2019`, Mode C first produced:

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

The next ordinary request `@2020` then supplied the required paired proof:

```text
Prior representation: OUTPUT_MISMATCH
mirror: MISMATCH
canonical 3578:8bd4314
fresh     3574:5eee8b4

current 3574:5eee8b4
match FRESH_CHAT
Edit delta: vs canonical -4 · vs fresh +0
shape FRESH_EXACT_CARRYOVER
Edit origin: REPRESENTATION_DRIFT_CORRELATED
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
representation fresh-exact-carryover
```

Interpretation: the exact v0.63.55 regression control survives the physical M2-2 ownership split in a natural long-chat mismatch. Representation owns the provenance facts, Runtime Mirror remains transport-only, and the prior Fresh carryover is accepted without the old multi-second false manual rebuild. This closes the M2-2 live fast-reconcile gate.

### New output mismatch after successful fast reconcile

Status: `DIRECT_EVIDENCE / CONSERVATIVE PATH PASS SO FAR`

The same `@2020` request produced a new output-side mismatch:

```text
Output provenance:
  CANONICAL 4172:b76580f
  FRESH_CHAT 4148:46b1421
  Δchars -24
Output representation: DIFFERENT
Deferred mirror: OUTPUT_MISMATCH · setChat 0
Safe-envelope reconcile: REJECTED
Preamble: THOUGHTS_COMPAT · STRIPPED · SAFE_ENVELOPE_COMPAT
Representation ownership: REPRESENTATION · ledger 8 · mirror TRANSPORT_ONLY
Warnings: 0
```

This is not a regression by itself. Conservative write blocking is correct. A later ordinary request may provide a second natural fast-reconcile pair if its visible prior assistant exactly matches this Fresh representation.

### HOST_PREFIX family reset / local cache collapse

Status: `SUSPECTED HOST-SIDE CHANGE / OBSERVE_ONLY / NON-M2-ATTRIBUTED`

The `@2020` request also produced a sharp cache-topology reset not seen in the preceding same-runtime requests:

```text
previous request topology: 37/68 messages · 433,042/485,019 chars · 89.3%
current request topology:   0/40 messages · 0/448,777 chars · 0.0%

Cache effect: PREFIX_COLLAPSE
Cache break: PRE_SIMCORE · HOST_PREFIX · @0 system→system
frontier movement: @37 → @0 · -37 messages / -433,042 chars

Host prefix attribution: DELTA_LOCALIZED
shape: INSERTION_LIKE
confidence: MEDIUM
previous system0 332167:afc9a9b6
current  system0 336013:57277cd8
Δchars +3,846
family 52ee112a → bb4ec352
RESET_CORRELATED

SimCore contribution: NOT_FIRST_BREAK
runtime prompt: 2140 chars / 38 lines
provider cache: UNVERIFIED
```

The simultaneous message-count contraction (`68 → 40`) means this event is better preserved as a possible **host context rebase/compaction plus system-prefix family reset**, not merely a single changed system string. The diagnostic does not prove the host mechanism, so attribution remains suspected. The first break is before the SimCore runtime tail and the SimCore runtime prompt size did not grow; do not attribute this cache collapse to M2-2 Representation without further evidence. Watch whether the new `bb4ec352` family stabilizes on following requests.

### Standalone C lineage over-chain candidate

Status: `SUSPECTED / NON_BLOCKING / LINEAGE WATCH`

Request `@2020` is a self-contained annual-summary instruction covering `2030.1.1.~12.31.` and does not use a short-C source reference. Yet diagnostics report:

```text
Short-C source lock: OFF
Template recurrence: FIRST · family C
Request lineage: CHAIN · root A@2014 · parent C@2018 · depth 3
Source handoff: INELIGIBLE · reason template-recurrence-owned
Evidence: n/a
```

The visible output successfully produced a broad annual summary, so no user-visible source restriction or state corruption is established. However, `A@2014` is the Super Bowl performance root and is not an obvious semantic root for a new full-year standalone summary. Preserve this as a possible stale/over-inherited lineage classification. A useful natural follow-up is whether a later short-C reaction to the annual summary chooses the current annual-summary turn as source/root or incorrectly continues the old Super Bowl chain.

Do not attribute this to Representation M2-2 unless recurrence or cross-module evidence establishes an ownership interaction.

### Annual-only versus cumulative-YoY summary scope ambiguity

Status: `SUSPECTED / USER-VISIBLE QUALITY DEFECT / NON-BLOCKING / SCOPE WATCH`

User clarification after inspecting `@2020`:

- the `2030.1.1.~12.31.` input is intended to contain **only achievements attributable to that single target year**;
- prior-year / earlier-career achievements should not be silently promoted as current-year achievements;
- at the same time, the user has another similar-looking input whose intent is explicitly **cumulative totals plus comparison against the previous year and growth delta**;
- therefore these two request families are semantically distinct even though both are large year-end summaries.

Observed user-visible symptom family: annual-only summaries can omit achievements that should be present for the target year while also pulling in prior/earlier achievements. The current `@2020` standalone-C over-chain (`root A@2014`) is a possible contributing factor, but causality is not established; broad long-chat retrieval/aggregation and prompt scope ambiguity are also candidates.

Preserve two separate conceptual contracts for later design instead of merging them:

```text
ANNUAL_ONLY
- authority window = target year only
- include achievements/events that occurred or materially changed during target year
- earlier career facts may appear only as labeled context/comparison, never as target-year achievements
- ongoing roles may include start date as metadata, but annual activity/results must be target-year scoped
- year-end cumulative counters may be reported only when clearly labeled as end-of-year snapshot; do not confuse them with achievements from earlier years

CUMULATIVE_YOY
- authority = cumulative state as of target year-end
- previous year-end snapshot is an explicit comparison baseline
- output current cumulative total + previous cumulative total + absolute/percentage growth where evidence exists
- earlier achievements remain part of cumulative history when relevant
```

Do not patch Lineage or summary generation from this single clarification alone. First collect the similar cumulative-YoY input/diagnostic and compare how Lineage, source/handoff, visible omissions, and prior-year inclusion differ between the two scopes. If both request classes receive the same source-chain treatment despite opposite temporal authority, promote to a scoped aggregation/lineage design issue.

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

The `@2020` year-summary output is a useful negative control: it is framed at `2030-12-31 11:50 PM` and contains summary statistics rather than an in-scene elapsed/current/end-time progression, so its `FRAME_ONLY` state does not add evidence to the suspected narrative-tail recurrence.

### Cache / prefix observation during this sequence

Status: `OBSERVE_ONLY`

Before the host-prefix family reset, local prefix telemetry had converged to:

```text
COMMON_PREFIX ~89.3–89.4% by chars
frontier advances +2 messages per request
Host prefix: STABLE · SAME_FAMILY
SimCore contribution: NOT_FIRST_BREAK
Cache break: PRE_SIMCORE · CHAT_HISTORY
provider cache: UNVERIFIED
```

At `@2020`, the host system prefix changed by +3,846 chars, the host-visible message set contracted from 68 to 40, and the local common prefix fell to 0%, creating a new cache family baseline. Provider cache behavior remains unverified; only the local topology/family reset is established.

### Current verdict

```text
M2-2 physical ownership diagnostic visible        PASS
cold-init Representation memory behavior          PASS
ordinary EXACT carryover                          PASS
SAFE_ENVELOPE_COMPAT exact path                    PASS
short-C source/evidence fail-closed behavior       PASS
natural output mismatch conservative handling     PASS
next-turn Representation Fast Reconcile            PASS — LIVE GATE CLOSED
new -24 mismatch conservative handling             PASS SO FAR / paired follow-up optional
possible narrative-tail contract recurrence        SUSPECTED / NON-BLOCKING
host-prefix +3,846 + context contraction           OBSERVED / HOST-SIDE WATCH
standalone C lineage over-chain                     SUSPECTED / NON-BLOCKING
annual-only vs cumulative-YoY summary scope         SUSPECTED / USER-VISIBLE QUALITY WATCH
provider cache attribution                         UNVERIFIED
```
