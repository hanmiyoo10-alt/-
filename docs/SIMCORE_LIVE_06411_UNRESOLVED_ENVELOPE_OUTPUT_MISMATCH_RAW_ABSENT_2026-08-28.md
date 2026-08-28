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

## Same-input reroll control — correction to earlier interpretation

A later diagnostic in the same runtime generation showed @2239 as a healthy non-empty exact representation:

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

An earlier revision of this evidence document interpreted that later state as a natural convergence before the next request. **That interpretation is incorrect.** The operator clarified that the anomalous @2238 response was explicitly rerolled/regenerated before the subsequent @2240 natural request.

Correct sequence:

```text
@2238 first generation
→ unresolved envelope / OUTPUT_MISMATCH / copied RAW assistant absent

operator same-input reroll of @2238
→ healthy replacement assistant @2239
→ canonical == fresh == 4908:80f34fae

then new natural request @2240
```

Therefore the healthy @2239 representation is a **same-input reroll control**, not proof of spontaneous host/presentation convergence.

Bounded interpretation after correction:

```text
first generation anomaly: PRESERVED
same-input reroll: CLEARED THE OBSERVED REPRESENTATION/STRUCTURE FAILURE
spontaneous convergence: NOT DEMONSTRATED
exact cause: STILL OPEN
```

This is operationally useful because it parallels the repository's evidence discipline for generation/result variability: a reroll can demonstrate symptom clearance under the same user intent, but it does not by itself identify provider, host, SimCore, or prompt-compiler cause.

The subsequent @2240→@2241 turn is tracked separately as a natural `PARTIAL_PREVIOUS_TURN_REPLAY` specimen because its output reintroduced semantic categories from the rerolled @2239 response despite a narrower platform-only current request.
