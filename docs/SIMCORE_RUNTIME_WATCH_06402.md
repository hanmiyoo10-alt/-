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

The user reported that an immediately subsequent new request worked normally again without intentionally changing the plugin toggle or prompt configuration.

### Adjacent recovered-turn evidence

A later copied diagnostic from the same runtime generation directly confirms recovery without runtime reload:

```text
Version: 0.64.2
Runtime boot: 2026-08-22T11:46:59.379Z
Runtime generation: mt4bcgc3-5556z8
Request user @2064 → output assistant @2065
Request hook: SEEN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stored last mode: C
Stability: PASS · binding BOUND · out COMMITTED · mirror COMMITTED
Pre snapshot: FORWARD · SKIPPED
Warnings: 0
Compatibility diagnostics: 0
```

This upgrades the recovery evidence from user report to direct same-runtime diagnostic evidence. The miss is therefore demonstrably transient in this session. It does not establish whether the affected request lacked the handshake in host-composed messages or whether another request-composition boundary caused the scanner not to receive it.

### Current classification

```text
status: WATCH_ONLY / DIRECT_EVIDENCE_FOR_TRANSIENT_MISS
runtime hooks: ACTIVE
Core runtime for affected turn: INACTIVE / FAIL-CLOSED
recurrence: NOT YET ESTABLISHED
recovery: DIRECTLY CONFIRMED IN SAME RUNTIME
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

This establishes a plausible observability-level freshness boundary.

### Adjacent follow-up evidence

The subsequent active diagnostic from the same runtime generation reports:

```text
Probe context: CURRENT TURN
Request user @2064 → output assistant @2065
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Pre snapshot: FORWARD · SKIPPED
```

Its copied RAW predecessor is the earlier `@2062 → @2063` C turn. Therefore the later report again sees the `@2062/@2063` turn that the stale report's chat snapshot failed to expose as current-visible history. No `REWIND` restore appears in the subsequent active request.

This substantially strengthens the panel/chat-snapshot freshness interpretation relative to a durable visible-chat rewind. It still does not prove whether the stale object originated specifically from panel-open timing, host `getChat()` snapshot timing, UI branch navigation, or another transient host snapshot boundary, so attribution remains observability/host-freshness rather than a confirmed exact root cause.

### Existing safety behavior

The diagnostic builder's stale check worked conservatively:

```text
probe @2062 != current visible user @2060
→ Probe context STALE
→ do not bind request/output/runtime-mode diagnostics to the visible turn
```

No stale request data was falsely presented as current-turn authority.

### Current classification

```text
status: WATCH_ONLY / DIRECT_EVIDENCE
surface: OBSERVABILITY
runtime correctness defect: NOT ESTABLISHED
state corruption: NOT OBSERVED
stale data falsely presented as current: PREVENTED
likely family: PANEL / HOST CHAT SNAPSHOT FRESHNESS
exact root cause: UNESTABLISHED
actual durable rewind: NOT SUPPORTED BY ADJACENT FOLLOW-UP
M2 blocker: NO
```

### Recurrence / repair discriminator

If the mismatch recurs, capture whether the panel remained open across a request and compare the chat snapshot at panel-open versus copy-click time if diagnostics are extended later.

A future diagnostic-only repair candidate is:

```text
copy click
→ refresh current indices
→ refresh host.getChat()
→ refresh current Core state
→ build report from the newly bound snapshot
```

Do not implement that solely from this specimen while M2 runtime semantics remain frozen. Promote only if recurrence confirms that copied diagnostics repeatedly become stale without an actual user-visible rewind.

---

## ACTIVE_C_STORAGE_DOMINANCE_SAMPLE

First observed: 2026-08-22
Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Turn: user `@2064` → assistant `@2065`

### Direct performance evidence

Healthy active Mode C request/output semantics were accompanied by storage-dominated local plugin timing:

```text
Request total: 213 ms
Turn storage: 22,253 chars · set 181 ms · set/1K 8.13 ms
Request hotspot: TURN_STORAGE · 181 ms · 85.4%

Output handler total: 365 ms
Output process: 347 ms
Out storage: 341 ms
Output hotspot: OUT_STORAGE · 341 ms · 93.4%
```

The immediately preceding inactive specimen had also shown a larger one-off turn-storage cost (`19,945 chars · set 680 ms · 90.5%`). The new active sample therefore establishes that storage can remain the dominant measured SimCore-local cost even when the absolute latency is much lower and runtime semantics are healthy.

### Current classification

```text
status: WATCH_ONLY / PERFORMANCE EVIDENCE
correctness defect: NO
storage corruption: NO
request semantic regression: NO
provider cache attribution: NONE
recurrence family: STORAGE DOMINANCE OBSERVED ACROSS >1 SAMPLE
M2 blocker: NO
```

Do not optimize storage from these samples alone. Preserve payload size, set latency, set/1K cost, request/output hotspot share, and runtime mode on future samples. Promote only if repeated natural evidence establishes materially harmful latency with a narrow storage-side optimization boundary.

---

## v0.64.2 healthy compatibility regression control — C @2064

The same active C turn provides a useful positive control for several frozen paths:

```text
Edit reconcile: SAME_FAST · 0 ms · snapshot UNCHANGED
Prior representation: EXACT
current == canonical == Fresh
Deferred mirror: COMMITTED
Output representation: EXACT
Warnings: 0
Compatibility diagnostics: 0
Frame sequence: PASS
Frame guard: PASS
Continuity summary: PASS
```

The host output also contained a large Thoughts-compatible preamble that was stripped successfully:

```text
Preamble provenance: THOUGHTS_COMPAT · chars 2833 · action STRIPPED · policy SILENT_COMPAT
HOST_RAW 5001 chars
CANONICAL 2165 chars
FRESH_CHAT 2165 chars
CANONICAL == FRESH_CHAT · EXACT
```

This is positive natural evidence that the existing Thoughts/SILENT_COMPAT envelope handling can remove a large host preamble while converging to exact canonical/Fresh identity. Preserve it as a regression control; it does not by itself justify broadening compatibility normalization.

---

## v0.64.2 diagnostic-copy live control

The same production session successfully produced and copied complete diagnostic reports after the v0.64.2 release. This is positive evidence for general Diagnostic Copy Resilience, but the original B_END-specific builder path remains naturally un-revalidated until a future current-turn `B_END` copy exercises that branch directly.

Current verdict:

```text
general diagnostic copy: LIVE PASS
B_END-specific copy revalidation: NOT EXERCISED
M2-3 start: NOT BLOCKED BY THESE WATCH ITEMS
```
