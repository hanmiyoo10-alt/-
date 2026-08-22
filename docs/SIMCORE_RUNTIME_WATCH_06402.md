# SimCore v0.64.2 Runtime Watch

Purpose: preserve natural production anomalies and adjacent recovery evidence immediately when they appear during v0.64.2 live use. This is additive evidence memory under the existing `SIMCORE_DEFERRED_LEDGER.md` immediate-capture rule. Entries are evidence first; they do not authorize a runtime patch by themselves.

## Capture rule

Whenever a natural SimCore diagnostic exposes a suspicious mismatch, transient failure, stale/boundary condition, or useful regression-control sample:

```text
capture the first specimen immediately
→ preserve exact diagnostic fields + RAW/neighboring-turn context when available
→ classify narrowly
→ do not silently delete if a later turn recovers
→ append recurrence/resolution evidence to the same entry
→ only promote to FIX/BLOCKING when evidence establishes a narrow attributable defect
```

Do not weaken fail-closed behavior or change M2 architecture from a one-off host/prompt/observability anomaly.

---

## CORE_HANDSHAKE_TRANSIENT_MISS

First observed: 2026-08-22
Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Turn: user `@2062`

### Direct diagnostic evidence

```text
Request hook: SEEN
Core handshake: NOT FOUND
Runtime status: INACTIVE · output BYPASSED
Mode: n/a
Stored last mode: B_END
Turn binding: request user @2062 · output assistant @n/a
Stability: OBSERVED · binding REQUEST_ONLY · out BYPASSED · mirror NOT_EXERCISED
Hook activity: request 1 · output 1
```

The plugin runtime and hooks were alive, but the current request did not expose the Core handshake to SimCore. The request therefore failed closed to an inactive Core runtime instead of inheriting the prior active state.

The user reported that an immediately subsequent new request worked normally again without intentionally changing the plugin toggle or prompt configuration. No copied follow-up diagnostic was captured yet, so exact recovered-turn handshake/topology fields remain unavailable.

### Current classification

```text
status: WATCH_ONLY / DIRECT_EVIDENCE_FOR_TRANSIENT_MISS
runtime hooks: ACTIVE
Core runtime for affected turn: INACTIVE / FAIL-CLOSED
recurrence: NOT YET ESTABLISHED
recovery: USER-REPORTED IMMEDIATE NEXT REQUEST NORMAL
cause: UNESTABLISHED
working attribution: HOST/PROMPT COMPOSITION WATCH
v0.64.2 diagnostic-copy causality: NOT SUPPORTED
M2 blocker: NO
```

### Important non-actions

Do **not**:

- carry previous-turn `ACTIVE` state forward when the current handshake is missing;
- weaken the explicit handshake requirement;
- patch Core Ruleset syntax from this single transient specimen;
- attribute the miss to PocketRisu/RisuAI or SimCore without adjacent request-composition evidence;
- interrupt M2-3 solely because of this one-off miss.

### Recurrence trigger

If another natural request reports `Core handshake: NOT FOUND` while the plugin hook is `SEEN` and neighboring requests are active, capture the failed turn plus the nearest good turn(s) and compare:

```text
prompt scan stats
host-prefix attribution/delta
request topology
runtime prompt presence/placement
telemetry continuity
current indices/location key
whether the same prompt/preset/toggle was in use
```

Promote only if recurrence establishes a stable SimCore-scanner or host-composition failure mode.

---

## DIAGNOSTIC_PANEL_SNAPSHOT_FRESHNESS_MISMATCH

First observed: 2026-08-22
Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Captured: `2026-08-22T12:08:04.201Z`

### Direct diagnostic evidence

```text
Probe context: STALE · probe user @2062 · current user @2060
Request hook: n/a
Core handshake: n/a
Runtime status: n/a · output n/a
Mode: n/a
Stored last mode: C
Turn binding: request user @n/a · output assistant @n/a
Stability: NOT_EXERCISED · binding NOT_EXERCISED · out NOT_EXERCISED · mirror NOT_EXERCISED
Representation ownership: REPRESENTATION · ledger 1 · mirror TRANSPORT_ONLY · raw bodies NOT RETAINED
Hook activity: request 2 · output 2
Telemetry continuity: FRESH · no-compatible-handoff
RAW frame continuity: volume 77→77 SAME · chapter 3→3 SAME · Chatindex 1001→1002 ADVANCED
RAW frame regression: NONE
Stored broadcast: UNLOCKED · airtime 2031-02-28 09:55 PM · start 2031-02-28 08:50 PM
```

The report's live telemetry remembers a later request probe at `@2062`, while the chat snapshot used to build the copied RAW sections resolves the visible current user to `@2060` and assistant to `@2061`. The report correctly refuses to present stale probe data as current-turn facts and collapses current-turn runtime fields to `n/a` / `NOT_EXERCISED`.

### Code correlation

The current diagnostics panel obtains `chat` and Core state when `openPanel()` runs, then the copy button later calls the report builder with those captured objects rather than unconditionally fetching a fresh chat/state immediately before copy:

```text
openPanel()
→ host.currentIndices()
→ host.getChat(...)
→ runtimeSession.loadCoreForChat(...)
→ capture chat + state
...
copy click
→ copyLastTurnDiagnostic(captured chat, captured state)
```

This establishes a plausible observability-level freshness boundary, but it does **not** yet prove whether this specimen came from a panel-open snapshot becoming stale, an actual visible-chat rewind/branch movement, host snapshot timing, or another composition transition.

### Existing safety behavior

The diagnostic builder's stale check worked conservatively:

```text
probe @2062 != current visible user @2060
→ Probe context STALE
→ do not bind request/output/runtime-mode diagnostics to the visible turn
```

SimCore Session also has a separate request-side rewind restore path (`sendIndex < previousOutputIndex → restoreReason=rewind`), so a genuine visible-chat rewind should be distinguished from panel/report snapshot staleness using a subsequent active request diagnostic.

### Current classification

```text
status: WATCH_ONLY / DIRECT_EVIDENCE
surface: OBSERVABILITY
runtime correctness defect: NOT ESTABLISHED
state corruption: NOT OBSERVED
stale data falsely presented as current: PREVENTED
cause: PARTIALLY ESTABLISHED / MULTIPLE PLAUSIBLE SOURCES
M2 blocker: NO
```

### Resolution discriminator

On the next natural active request after a similar specimen, inspect:

```text
Pre snapshot: REWIND · READ HIT/MISS
vs
Pre snapshot: FORWARD
```

Interpretation:

- `REWIND` supports an actual visible-chat branch/rewind event handled by Session restore logic.
- `FORWARD` while copied diagnostics again show an older visible chat strongly increases the probability of panel/chat snapshot freshness debt.

If the mismatch recurs without an actual rewind, consider a diagnostic-only repair that refreshes `host.getChat()` and current Core state immediately before report construction. Keep that work separate from M2 runtime semantics.

---

## v0.64.2 diagnostic-copy live control

The same production session successfully produced and copied complete diagnostic reports after the v0.64.2 release. This is positive evidence for general Diagnostic Copy Resilience, but the original B_END-specific builder path remains naturally un-revalidated until a future current-turn `B_END` copy exercises that branch directly.

Current verdict:

```text
general diagnostic copy: LIVE PASS
B_END-specific copy revalidation: NOT EXERCISED
M2-3 start: NOT BLOCKED BY THESE WATCH ITEMS
```
