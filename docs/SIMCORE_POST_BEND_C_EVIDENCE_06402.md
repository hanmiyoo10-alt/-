# SimCore v0.64.2 — Post-B_END C Evidence

Captured: 2026-08-22
Production: `v0.64.2 — Diagnostic Copy Resilience`
Runtime generation: `mt4bcgc3-5556z8`
Turn: user `@2080` → assistant `@2081`
Previous completed broadcast root: `B@2066`, terminal parent `B@2078`

Purpose: preserve the first natural C follow-up after the captured 2031-03-07 B_END sequence. This evidence is separate from the confirmed v0.64.3 diagnostic-builder defect. It must not be silently folded into the builder mini or M2-3.

## 1. Healthy runtime/binding control

```text
Probe context: CURRENT TURN
Core handshake: FOUND
Runtime status: ACTIVE · output COMMITTED
Mode: C
Stored last mode: C
Turn binding: request user @2080 · output assistant @2081
Stability: PASS · binding BOUND · out COMMITTED · mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 1
Frame sequence: PASS
Frame guard: PASS
Continuity summary: PASS
Stored broadcast: UNLOCKED · airtime 2031-03-07 09:55 PM · start 2031-03-07 08:50 PM
```

The turn is therefore suitable for interpreting the post-broadcast clock/provenance observations below; this is not another handshake/binding failure.

---

## 2. Third and strongest natural Representation Fast Reconcile control

The immediately preceding B_END visible output had a large canonical/Fresh representation divergence:

```text
Prior representation: OUTPUT_MISMATCH
canonical 9524:c3fbb4a2
fresh 7932:4398a0aa
current 7932:4398a0aa
Edit delta: vs canonical -1592 · vs fresh +0
shape FRESH_EXACT_CARRYOVER
```

The current request correctly took the frozen v0.63.55 fast path:

```text
Edit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms
snapshot UNCHANGED
Edit origin: REPRESENTATION_DRIFT_CORRELATED
current match: FRESH_CHAT
raw bodies NOT RETAINED
```

This is materially stronger than the earlier +1/zero-length-delta broadcast samples because the representation body lengths differ by 1,592 chars while exact Fresh identity still prevents a false manual rebuild.

Classification:

```text
status: DIRECT POSITIVE CONTROL
path: REPRESENTATION_FAST_RECONCILED
representation delta: -1592 chars
manual rebuild: NONE
snapshot mutation: NONE
M2-3 differential fixture: GOLDEN / CRITICAL
```

M2-3 must preserve the fast-path predicate and result independent of representation delta magnitude.

---

## 3. Post-B_END C cross-clock regression candidate

The completed broadcast is anchored one week later than the persisted non-broadcast narrative clock:

```text
B_END stored broadcast airtime: 2031-03-07 09:55 PM
C @2080 narrative previous:     2031-02-28 10:45 PM
C @2081 visible frame:          2031-02-28 10:45 PM
C @2081 narrative committed:    2031-02-28 10:45 PM
Narrative clock: SAME
```

The C request is explicitly a community reaction to the just-completed episode, and the RAW response header visibly uses the old 2031-02-28 timestamp even though the source broadcast has already completed on 2031-03-07.

This is different from the already-known `B_MODE_STALE_NARRATIVE_CLOCK_PROBE` observability issue. Here the stale narrative timestamp is actually serialized into a new current C response.

### Source correlation

Current Lifecycle intentionally separates the two clock domains during B:

```text
B mode:
  narrativeTimestampPrevious = null
  broadcast airtime owns B timestamp semantics
```

When a non-B request begins later, current code resumes:

```text
narrativeTimestampPrevious = state.narrativeTimestamp
current_timeline_anchor = narrativeTimestampPrevious
```

There is no observed post-B_END bridge that advances the non-broadcast/community clock floor from a completed broadcast terminal time. This explains why a C follow-up can inherit the pre-broadcast narrative timestamp even when its subject is the later completed broadcast.

Important constraint: `broadcast airtime != depicted scene/event time` remains a frozen contract. Any future repair must therefore be scoped specifically to current/post-broadcast community time authority, not globally copy broadcast airtime into narrative scene time.

### Current classification

```text
id: POST_BEND_C_CLOCK_DOMAIN_GAP
status: HIGH WATCH / DIRECT VISIBLE CORRECTNESS EVIDENCE
visible chronology issue: YES across clock-domain handoff
persistent state corruption: NOT ESTABLISHED
B clock semantics defect: NO
non-B current-timeline anchor coverage gap: LIKELY
exact repair contract: NOT YET FROZEN
v0.64.3 builder-mini scope: EXCLUDED
M2-3 scope: EXCLUDED
```

Do not patch this inside v0.64.3. After the builder mini is validated, decide a separate narrow clock-authority mini before M2-3 if contract review confirms that immediate post-B_END C must not predate the broadcast it is reacting to.

A likely design question for that mini is whether an immediate C whose lineage/source is the just-completed B_END should receive a dedicated `post_broadcast_time_floor` derived from the terminal broadcast airtime while keeping ordinary A/C narrative-scene semantics independent.

---

## 4. Host/history frontier regression after steady growth

The preceding session had established a moving compact-assistant frontier that grew monotonically through approximately `@37`. The current C request then sharply regressed:

```text
Cache topology: COMMON_PREFIX · messages 10/39 · chars 64,009/134,012 · ratio 47.8%
Cache effect: REUSE_WINDOW_SHRINKING
Cache trajectory: REGRESSED
Frontier movement: @37→@10 · Δmessages -27 · Δchars -58,718
Cache break: PRE_SIMCORE · CHAT_HISTORY · @10 user→user
History mutation: @10 · SAME_SLOT_CHANGED · prev user/text 415:d608497d → current user/text 537:c084c499
Host prefix: STABLE · SAME_FAMILY
History alignment/stabilization: OBSERVE_ONLY · request/persistent mutation NONE
Representation correlation: NO_MATCH
Rebuild attribution: OUT_OF_WINDOW · LOW
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

This is a new phase of the existing host/history watch: the reusable prefix did not merely continue its +2-message moving frontier; the request history topology appears to have been compacted/reprojected to a much shorter frontier.

Classification remains host/history observability WATCH because:

- the stable system-prefix family did not reset;
- SimCore remained after the first break;
- no request/persistent history mutation was performed by the observer;
- the active C turn itself bound and committed normally;
- provider cache behavior remains unverified.

Do not infer provider cache eviction/hit behavior from this local proxy alone.

---

## 5. Storage performance recurrence

The same healthy C turn again shows storage-dominated SimCore-local timing:

```text
Request total: 295 ms
TURN_STORAGE: 248 ms · 84.1%

Output total: 375 ms
OUT_STORAGE: 346 ms · 92.3%
```

This strengthens the existing performance recurrence but does not change its classification. No Store optimization is authorized during v0.64.3 or M2-3.

---

## Operational consequence

```text
Immediate next release remains:
v0.64.3 B_END Diagnostic Builder Binding Repair

M2-3 detailed design remains frozen.

New unresolved gate preserved separately:
POST_BEND_C_CLOCK_DOMAIN_GAP
→ do not mix into v0.64.3
→ contract-review immediately after v0.64.3 live close
→ if confirmed, narrow clock-authority mini before M2-3 implementation

M2-3 golden controls now include:
- ordinary SAME_FAST exact carryover
- +1 representation mismatch → fast reconcile
- large -1592 representation mismatch → fast reconcile
```

Related evidence:

- `SIMCORE_LIVE_06402_BROADCAST_SEQUENCE.md`
- `SIMCORE_HOST_HISTORY_WATCH_06402.md`
- `SIMCORE_NEXT_RELEASE_GATE_06403.md`
