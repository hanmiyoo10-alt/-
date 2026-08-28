# SimCore v0.65.0 Live Packet 4 — Clean Forward Control + Host-local TTL Window

Date: 2026-08-28

Status: **DIAG_REVIEW_COMPLETE_FINDING_PRESERVED · PRE-REFRESH CONTROL PASS · HOST-LOCAL WRITE REAL · CURRENT WRITE WINDOW EXPIRED BEFORE REVIEW · DO NOT REFRESH FROM THIS STALE CHECKPOINT**

Parent evidence:

- `docs/SIMCORE_LIVE_06500_PREFRESH_IDENTITY_AND_HOST_WRITE_2026-08-28.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `docs/SIMCORE_06500_COMBINED_IDENTITY_M2_3_RELEASE_DECISION_2026-08-28.md`

Production authority at review time remains:

```text
v0.65.0 — M2-3 Edit Reconcile Ownership Extraction + Runtime Identity Convergence
release-simcore commit c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
```

## 1. Packet identity

```text
Version: 0.65.0
Captured: 2026-08-28T14:53:11.170Z
Runtime boot: 2026-08-28T13:03:29.861Z
generation: mtcypydh-c8k8co
request user @2262
output assistant @2263
Mode C
Stored last mode C
```

This is the same runtime generation already used by the earlier v0.65.0 pre-refresh natural specimens. Therefore this packet is **not** post-refresh evidence and cannot close `06500_SUBGATE_A_POSTREFRESH_ADOPTION`.

Classification:

```text
PACKET_4_PHASE
= SAME_GENERATION
= PRE_REFRESH
= CLEAN_FORWARD_NATURAL_CONTROL
```

## 2. Identity / binding / runtime safety

Packet-local facts:

```text
Probe context CURRENT TURN
Request hook SEEN
Core handshake FOUND
Runtime ACTIVE · output COMMITTED
binding BOUND
mirror COMMITTED
stale drops 0
hook cleanup NAMED
UI parts 2
```

Verdict:

```text
IDENTITY_BINDING = PASS
RUNTIME_COMMIT = PASS
DEFERRED_MIRROR = PASS
RELOAD_SAFETY_LOCAL = PASS
```

Visible runtime version remains correctly converged to `0.65.0`.

## 3. Request path / edit-reconcile control

The packet is a clean forward request:

```text
Pre snapshot: FORWARD · SKIPPED
Edit reconcile: SAME_FAST · 0.0 ms
snapshot UNCHANGED
Prior representation: EXACT
canonical 2673:1a756d28
fresh     2673:1a756d28
Edit origin: NONE
shape FRESH_EXACT_CARRYOVER
```

This is another valid live control for the frozen M2-3 ordinary exact-carryover contract:

```text
Prior EXACT
→ SAME_FAST
→ snapshot UNCHANGED
→ no manual rebuild
```

It remains supporting evidence only until ordered Subgate A post-refresh adoption closes.

Request timing is dominated by turn persistence:

```text
onSend 249 ms
turn storage 247 ms
request hotspot TURN_STORAGE 89.5%
```

This reinforces the existing Store latency WATCH. No correctness failure is established.

## 4. Output path / representation / compatibility

Output processing:

```text
state MEMORY_FAST
process 805 ms
storage 788 ms
output hotspot OUT_STORAGE 90.3%
Deferred mirror COMMITTED
```

Representation:

```text
HOST_RAW   6605:f8df5c6
CANONICAL  3867:bc2f10b
FRESH_CHAT 3867:bc2f10b
match CANONICAL
CANONICAL <-> FRESH EXACT
raw bodies NOT RETAINED
```

Preamble handling:

```text
THOUGHTS_COMPAT
2738 chars / 42 lines
action STRIPPED
policy SILENT_COMPAT
candidate 1 / selected 1
Warnings 0
Compatibility diagnostics 0
```

The visible canonical output is healthy. The larger HOST_RAW fingerprint is explained by the stripped compatibility preamble and does not represent a Fresh mismatch.

## 5. RAW semantic review

Previous source turn @2260 -> @2261 establishes the film:

```text
Aethergard / Eldian
neutral third-faction High Elf leader
blond appearance
telekinesis + bow + spirits
protects World Tree / spirits
punishes poachers and invading soldiers
establishes the Third Kingdom at the end
```

Current user @2262 requests only:

```text
[커뮤니티] 영화 반응
```

Current assistant @2263 transforms the immediately preceding film material into community reactions across:

```text
더쿠
에펨코리아
Reddit
```

The response consistently references exposed source facts from @2261: Eldian's appearance, third-faction role, spirit protection, bow/telekinesis action, quotes, and Third Kingdom ending.

No earlier unrelated scene replaces the current source. No partial previous-turn replay symptom is visible.

Verdict:

```text
USER_INTENT_MATCH = PASS
SOURCE_SELECTION = PASS
COMMUNITY_TRANSFORMATION = PASS
PARTIAL_PREVIOUS_TURN_REPLAY = NOT OBSERVED
```

## 6. Community / Reaction control

The visible COMMUNITY output contains three platform sections. Each section preserves the expected four top-level comments plus one nested reply and every visible comment/reply has one supported reaction tag.

Packet result:

```text
Warnings: 0
Compatibility diagnostics: 0
```

This is additional natural regression evidence that the old multiline Reaction/Structure warning family resolved in v0.64.5 is not recurring in this specimen.

It does not reopen the superseded historical v0.65.1 Reaction Validator candidate.

## 7. Cache / history attribution

Current packet reports:

```text
Cache topology: COMMON_PREFIX
11/42 messages
64,222/117,616 chars
54.6%
first change @11 assistant->assistant

Cache integrity: DEGRADED
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
Host prefix attribution: STABLE · HIGH
History mutation: @11 SAME_SLOT_CHANGED
Mutation attribution: NO_PROVENANCE_MATCH · LOW
Rebuild attribution: PREEXISTING_REQUEST_MUTATION · HIGH · edit same-fast
```

The first break occurs before SimCore runtime placement and the host prefix remains stable. The packet does not support attributing this history frontier movement to SimCore.

Classification:

```text
PRE_SIMCORE_HOST_HISTORY_FRONTIER
= EXISTING WATCH / OBSERVE_ONLY
= NO NEW FIX PROMOTION
= PROVIDER CACHE UNVERIFIED
```

The local exposure proxy remains a local diagnostic proxy only.

## 8. Telemetry / Host-local transport

Boot-time continuity for this generation remains:

```text
Telemetry continuity: FRESH · host-local-incompatible
Host-local boot: INCOMPATIBLE
```

This is **boot history**, not the status of the mailbox written by the current turn. The generation originally booted against an older incompatible capsule and retains that boot classification in later diagnostics from the same generation.

The current output checkpoint itself is healthy:

```text
Telemetry capsule: COMPACT_V2 · 4206/16384 chars
prompt     1413/4096
 topology   1920/6144
trajectory  560/2048
prompt precision LINE_BOUND
topology precision COMPLETE_PREFIX
OK

MEMORY WRITTEN
SESSION UNAVAILABLE
HOST_LOCAL WRITTEN
4206 chars
host 40 ms
42 ms total
trigger OUTPUT_COMMIT
```

Therefore:

```text
CURRENT_VERSION_COMPACT_EXPORT = PASS
CURRENT_VERSION_HOST_LOCAL_WRITE = PASS
SESSION_UNAVAILABLE_FALLBACK = EXPECTED
```

There is no new `host-local-incompatible` product failure in this packet.

## 9. Critical TTL finding

The packet exposes its own evidence age:

```text
Diagnostic age: 3724.371 s
```

The output was committed approximately at:

```text
2026-08-28T13:51:06.799Z
```

while the diagnostic was captured at:

```text
2026-08-28T14:53:11.170Z
```

Difference:

```text
3724.371 s
= about 62 minutes 4 seconds
```

The existing telemetry handoff contract has a 10-minute maximum age / TTL. Therefore the Host-local capsule written by this turn is already outside the admissible adoption window by the time this diagnostic was copied/reviewed.

Classification:

```text
06500_HOST_LOCAL_TTL_WINDOW_EXPIRED_BEFORE_REFRESH
= OPERATOR_GATE_TIMING
= NOT_RUNTIME_DEFECT
= NOT_TRANSPORT_WRITE_FAILURE
= PRE_REFRESH_STOP
```

This packet remains valid evidence that the writer worked. It is **not** currently eligible as the capsule to use for the refresh-adoption proof.

Important distinction:

```text
write success evidence does not expire as historical evidence
but
mailbox adoption eligibility does expire under the 10-minute TTL
```

## 10. Frame / continuity review

Visible frame progression is:

```text
Volume 79 -> 79 SAME
Chapter 8 -> 8 SAME
Chatindex 1102 -> 1103 ADVANCED
RAW frame regression NONE
```

The diagnostic also reports:

```text
Continuity summary: REPAIRED
Frame sequence: REPAIRED
Frame guard: REPAIRED · CHATINDEX_SAME
```

The final visible response has the correct Chatindex 1103. This is consistent with a safe continuity repair path. The packet does not establish a visible frame regression.

Keep the known diagnostic wording/repair-attribution clarity debt separate; do not attribute it to telemetry, M2-3, or this current gate.

## 11. Evidence / lineage / handoff

```text
Request lineage: CHAIN
root A@2260
parent A@2260
depth 1

Source handoff: NEW SOURCE
reason same-short-request-new-source

Evidence shape: TRANSFORMED
root NORMALIZED
source assistant TRANSFORMED
Evidence root fence APPLIED
Evidence source fence APPLIED
Evidence mode DUAL
```

The visible COMMUNITY response uses the intended film source. The transformed source representation does not leak an unrelated earlier event and the evidence fences report safe whole-message anchoring.

Verdict:

```text
LINEAGE = CONSISTENT
SOURCE_HANDOFF = CONSISTENT
EVIDENCE_FENCE = PASS IN THIS SPECIMEN
```

## 12. Narrative / lifecycle review

```text
Broadcast lifecycle CLOSED
Mode C
Broadcast end authority NOT_APPLICABLE
Short-C source lock ON
Summary NONE
Template recurrence INELIGIBLE family C
Narrative clock SAME
Current-time authority NARRATIVE
Visible chronology PASS_OR_NOT_APPLICABLE
Stored broadcast UNLOCKED
```

The community-only response contains no new scene progression that requires advancing the narrative timestamp. `FRAME_ONLY` chronology is therefore consistent with the visible output.

No Broadcast or chronology defect is established.

## 13. Packet 4 verdict

```text
identity / binding                    PASS
clean forward request                  PASS
M2-3 ordinary SAME_FAST control        PASS
visible semantics                      PASS
COMMUNITY / Reaction                   PASS
output representation                  PASS
Deferred Mirror                        PASS
Warnings                               0
Compatibility diagnostics              0
COMPACT_V2                              PASS
Host-local current write               PASS
PRE_SIMCORE history break attribution  WATCH ONLY / NOT_SIMCORE_FIRST_BREAK
post-refresh adoption                  NOT EXERCISED
current mailbox TTL eligibility        EXPIRED BEFORE REVIEW
new product blocker                    NONE
```

Review completion:

```text
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
```

The preserved finding is an operator gate-timing constraint, not a runtime repair item.

## 14. Correct next live sequence

Do **not** refresh using the stale packet-4 checkpoint.

Required sequence now:

```text
1. issue one new ordinary natural request without refresh
2. copy/inspect its diagnostic promptly
3. require:
   - Version 0.65.0
   - same current generation before refresh
   - clean current turn
   - COMPACT_V2 <= 16384
   - HOST_LOCAL WRITTEN
4. refresh the same tab within 10 minutes of that output checkpoint
5. issue one ordinary natural request
6. copy diagnostic
   require compatible Host-local boot/consume and
   Telemetry continuity ADOPTED via host-local
7. issue a second ordinary request without another refresh
8. verify no repeated adoption/replay/reset and normal same-generation observer behavior resumes
9. only after Subgate A closes may Subgate B M2-3 acceptance be finalized
```

If the new pre-refresh packet is already older than the TTL by the time refresh is attempted, repeat only the fresh-checkpoint step. Do not classify a TTL-expired mailbox as a transport defect.
