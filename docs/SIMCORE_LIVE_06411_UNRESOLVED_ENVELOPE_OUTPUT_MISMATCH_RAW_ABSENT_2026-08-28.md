# SimCore live evidence — v0.64.11 unresolved envelope / output mismatch / copied RAW assistant absent

Date: 2026-08-28

Status: **DIRECT EVIDENCE · WATCH / OPEN ATTRIBUTION · SEPARATE FROM 06411 IDENTITY BLOCKER**

## Specimen identity

Captured diagnostic reports:

```text
Diagnostic format: raw-lineage-v2
Version: 0.64.10  # known stale runtime identity literal in v0.64.11 production
Captured: 2026-08-28T10:41:18.101Z
Runtime boot: 2026-08-28T09:59:09.960Z
generation: mtcs4wi0-lrlsg6
request user @2238
output assistant @2239
mode C
```

Production authority at the time is v0.64.11. The `Version: 0.64.10` line belongs to the already-preserved `06411_RUNTIME_IDENTITY_SPLIT` defect and must not be used to relabel this specimen as v0.64.10 production.

## User request

The user requested a detailed 2031 annual activity summary divided by music, acting, variety, ambassador, awards, and other activity categories, with exact values/ranks/counts and major records.

## Direct diagnostic facts

The output hook committed an output, but representation and structure were abnormal:

```text
Runtime status: ACTIVE · output COMMITTED
Stability: OBSERVED
binding BOUND
mirror OUTPUT_MISMATCH
stale 0

Deferred mirror: OUTPUT_MISMATCH
HOST_RAW 7036:8abc818
CANONICAL 7035:b6f2609
FRESH_CHAT 4470:ce2dd3e
match MISMATCH
CANONICAL↔FRESH Δchars -2565 · DIFFERENT
```

Envelope detection failed open:

```text
Preamble provenance: UNRESOLVED
chars 7036
lines 127
action UNRESOLVED
policy FAIL_OPEN
envelope offset n/a
candidates 0
```

The diagnostic emitted eight warnings:

```text
- 응답 envelope: # 응답 시작점 없음
- 공통 # 응답 헤더 누락
- 공통 볼륨 헤더 누락
- 공통 챕터 헤더 누락
- 공통 Chatindex 헤더 누락
- 공통 timestamp 누락
- Mode C에 서사·행동·대사로 보이는 본문이 있음
- state quarantine: response=0, COMMUNITY=1/1
```

The copied diagnostic packet's `최근 턴 (RAW)` section contains the full user request but shows:

```text
ASSISTANT (RAW):

```

with no assistant body reproduced after the label.

This creates an important bounded observation:

```text
output hook observed a non-empty body
canonical/fresh representations diverged materially
structure validator quarantined the response
copied recent-turn RAW assistant body was absent
```

The packet alone does **not** distinguish whether:

1. the user-visible assistant turn itself became blank by diagnostic-copy time;
2. the chat API returned an empty assistant body while another presentation surface still showed output;
3. the diagnostic RAW extraction path failed to retrieve/reproduce the assistant body;
4. a host-side representation transition occurred between output commit and diagnostic copy.

Do not choose among these without neighboring UI evidence or recurrence.

## State protection / unaffected surfaces

Despite the malformed output shape, state protection remained active:

```text
state quarantine: response=0, COMMUNITY=1/1
Narrative clock: MISSING TIMESTAMP
committed n/a
Narrative tail coverage: NO_TAIL_PROMOTION · MISSING
Continuity summary: PASS
Frame sequence: PASS
Frame guard: PASS
```

This specimen therefore demonstrates **validator/quarantine visibility**, not canonical state corruption.

The telemetry compaction/host-local transport also remained healthy:

```text
Telemetry capsule: COMPACT_V2 · 4,444/16,384 chars
prompt 1,331/4,096
topology 2,237/6,144
trajectory 562/2,048
OK

Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 4444 chars
```

Therefore this specimen does not invalidate the already-proven v0.64.11 compaction/write result.

## Relationship to existing anomaly families

### GENERATION_SEMANTIC_EXCURSION

Do **not** merge automatically.

The existing `GENERATION_SEMANTIC_EXCURSION` watch is characterized by a semantic/source-boundary violation while diagnostics are otherwise healthy (`Warnings: 0`, canonical/fresh exact, mirror committed). This specimen has the opposite diagnostic shape: eight structure/envelope warnings, output mismatch, unresolved preamble, quarantine, and missing copied RAW assistant body.

Classification: **not enough evidence to call recurrence of GENERATION_SEMANTIC_EXCURSION**.

### Structure / Reaction watch

The existing Structure/Reaction watch concerns recurrent COMMUNITY reaction-tag contract failures. This specimen is broader: common envelope/header/frame structure is missing and the copied assistant RAW body is absent. Do not collapse it into the reaction-tag family.

### M2-3 attribution

M2-3 has not yet been released in this production specimen. Therefore:

```text
M2-3 cause attribution = IMPOSSIBLE / NOT APPLICABLE
M2-3 blocker = NO, at current single-specimen WATCH classification
```

However this specimen is a useful frozen regression control for v0.65.0: the M2-3 combined release must not weaken conservative `OUTPUT_MISMATCH` handling, state quarantine, or raw-lineage observability.

## Current classification

```text
UNRESOLVED_ENVELOPE_OUTPUT_MISMATCH_RAW_ABSENT
symptom evidence: DIRECT
representation divergence: DIRECT
structure contract failure: DIRECT
state quarantine: DIRECT / WORKING
canonical state corruption: NOT OBSERVED
exact host/generation/diagnostic cause: OPEN
recurrence: NOT YET ESTABLISHED
runtime repair authority: NONE
current disposition: WATCH
current M2-3 blocker: NO
```

## Promotion / correlation trigger

Promote to active investigation if another natural turn shows one or more of the following in the same episode family:

```text
Preamble UNRESOLVED / FAIL_OPEN
OUTPUT_MISMATCH with a large CANONICAL↔FRESH delta
common # 응답 / volume / chapter / Chatindex / timestamp warnings together
state quarantine caused by whole-response structure failure
copied 최근 턴 ASSISTANT (RAW) absent despite output hook observing a non-empty body
```

On recurrence preserve, before retry/edit/reload if possible:

- what the user actually saw in the UI (blank vs nonblank, and whether partial content was visible);
- exact full copied diagnostic;
- neighboring previous and next natural turns;
- whether reroll/regeneration corrects it;
- whether `CANONICAL`, `FRESH_CHAT`, and copied RAW assistant become exact again;
- generation ID and whether a reload/edit happened between output and diagnostic copy.

## Release discipline

Do not patch this inside the narrow v0.64.11 identity convergence adjunct merely because it occurred on the same production release.

For the planned combined v0.65.0 release:

```text
Subgate A identity/host-local continuity remains separately authoritative.
Subgate B M2-3 ownership acceptance remains separately authoritative.
This WATCH becomes a regression observation, not an automatic combined-release scope expansion.
```

If recurrence establishes a deterministic producer/host/diagnostic cause, promote a separate narrow repair unless the evidence proves direct overlap with an existing release owner.

---

## Neighboring natural-turn recovery control — @2240 → @2241

A later natural turn in the **same runtime generation** provides a strong recovery/control specimen:

```text
Captured: 2026-08-28T10:59:34.696Z
Runtime boot: 2026-08-28T09:59:09.960Z
generation: mtcs4wi0-lrlsg6
request user @2240
output assistant @2241
mode C
```

The current turn itself returned to a fully healthy representation shape:

```text
Stability: PASS
binding BOUND
out COMMITTED
mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 0
Preamble provenance: THOUGHTS_COMPAT · action STRIPPED · policy SILENT_COMPAT
CANONICAL 5759:b20b02a
FRESH_CHAT 5759:b20b02a
match CANONICAL
CANONICAL↔FRESH Δchars +0 · EXACT
```

More importantly, the prior-turn view for the previously anomalous assistant @2239 was no longer absent:

```text
Prior representation: EXACT
mirror CANONICAL
canonical 4908:80f34fae
fresh 4908:80f34fae

Edit origin: NONE
current 4908:80f34fae
match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
```

The copied `직전 턴 (RAW)` section in this later diagnostic also reproduced a full non-empty assistant body for @2239.

This changes the bounded interpretation materially:

```text
@2239 was absent from copied RAW in the immediate anomalous diagnostic
@2239 was non-empty and exact by the next natural request
same runtime generation
no retry/edit/reload was reported between these packets
```

Therefore the evidence now argues **against a persistent empty assistant turn** and supports a transient representation/observation divergence somewhere between output processing, host-visible chat representation, and diagnostic-copy observation.

However, the exact transition is still not proven. The immediate anomalous packet reported:

```text
CANONICAL 7035
FRESH_CHAT 4470
copied RAW absent
```

while the neighboring request later observed the prior turn as:

```text
canonical 4908
fresh 4908
copied RAW non-empty
```

The three sizes are different. This proves that the representation visible to SimCore changed after the original output-hook snapshot, but it does **not** prove which host or SimCore action produced the 4908-character converged representation.

Updated bounded hypothesis order:

```text
persistent blank turn                         = weakened by control
transient host/chat representation transition = more plausible
transient diagnostic-copy extraction race     = still plausible
producer-only malformed response               = insufficient alone
exact root                                    = OPEN
```

Do not promote to a runtime fix from this control alone. Preserve the episode as WATCH and correlate any recurrence with the same immediate-vs-next-request representation sequence.

The control also independently confirms that telemetry remained healthy after the anomaly:

```text
Telemetry capsule: COMPACT_V2 · 4,610/16,384 chars · OK
Host-local transport: API PRESENT · store USABLE · clear REMOVE · boot EMPTY
Telemetry checkpoint: MEMORY WRITTEN · SESSION UNAVAILABLE · HOST_LOCAL WRITTEN · 4610 chars
```

So the anomaly remains separate from telemetry compaction/Host-local transport and from the known v0.64.11 runtime identity split.
