# SimCore PARTIAL_PREVIOUS_TURN_REPLAY — Natural Recurrence Evidence — 2026-08-27

Status: **RECURRENCE_CONFIRMED · SYMPTOM HIGH-CONFIDENCE · CAUSE UNPROVEN · NON_BLOCKING · NO RUNTIME CHANGE**
Production at new specimen: `v0.64.7 — Cross-Reload Cache Observer Continuity`
Runtime generation: `mtbgdju1-fwtefm`
New natural specimen: user `@2160` → assistant `@2161`, first generation before same-input retry
Owning recurrence contract: `SYS-16 Anomaly Recurrence Correlator`
Historical family memory: `SIMCORE_DEFERRED_LEDGER.md` → `PARTIAL_PREVIOUS_TURN_REPLAY`

## 1. Family definition already preserved

The repository already preserves one natural `PARTIAL_PREVIOUS_TURN_REPLAY` specimen with this bounded observable shape:

```text
new user turn
→ first generation replays a large semantic prefix/frame from the preceding turn
→ output later incorporates the new requested content
→ recurrence telemetry remains FIRST / NO MATCH
→ reroll of the same input removes the replay
```

The historical source explicitly says to escalate only on natural recurrence.

## 2. New v0.64.7 natural specimen

### Preceding turn

User `@2158` requested a full program-final-performance summary, including exact metrics such as broadcast period, ratings, clips/shorts, popularity, overseas/OTT, PPL and personal impact.

Assistant `@2159` answered in a broad final-summary frame beginning with:

```text
[종합] tvN 「청춘일기」 방영 종료 후 최종 성과 및 차시우 파급력 총정리
```

and then emitted a metrics-heavy structured summary.

### New user input

User `@2160` did **not** ask for another full metrics summary. The new request focused on audience reactions to:

```text
- every-day dawn/morning-cam attendance
- the couple's charm being revealed by the show
- relationship and post-marriage thinking
- trust in the protagonist's long build-up style
- the claim that he is not a perfectionist but has no fixed ceiling/standard
- chemistry being both realistic and ideal
- the show feeling non-performative / not like a broadcast
```

### First generation symptom

The first assistant `@2161` nevertheless opened by replaying the preceding turn's broad final-summary semantic frame and again led with:

```text
[종합] tvN 「청춘일기」 방영 종료 후 최종 성과 및 차시우 파급력 총정리
```

It then repeated many preceding-turn categories and statistics—broadcast period, ratings, roles, clip/short views, popularity ranking, overseas distribution, PPL and economic effect—before incorporating the new input's dawn-cam / chemistry / build-up themes.

This is not a verbatim byte replay, but it is a strong **semantic-prefix / response-frame replay** of the immediately preceding turn before continuation into the new requested content.

## 3. Same-input retry control

The same user turn `@2160` was then retried/regenerated.

The later diagnostic reports:

```text
Pre snapshot: REPEAT-SEND · READ HIT
Template recurrence: FIRST · family C
Recurrence history match: NO MATCH · hash 0xcc6e505a
Cache topology: STABLE · 60/60 messages · 100.0%
Cache integrity: STABLE
Cache break: NONE
History mutation: NONE
Runtime identity: stable SAME / slow SAME / volatile SAME / full SAME 0c8a72c7
SimCore contribution: NO_BREAK
Cache trajectory: ESTABLISHED · last RETRY
Warnings: 0
Compatibility diagnostics: 0
```

The retry output no longer begins with the previous metrics-summary frame. Instead it directly follows the new input, centering on the dawn-cam routine, no-ceiling baseline mindset, relationship/future planning, build-up style and realistic/ideal chemistry.

This retry is `IND-02 SAME_INPUT_REROLL_OR_REGEN` under SYS-16. It is a control showing symptom clearance, **not** a second natural recurrence specimen by itself.

## 4. Attribution boundary

The retry control materially narrows attribution.

Observed together:

```text
same user turn/index
same request recurrence hash
repeat-send read hit
history mutation NONE
cache topology 100% stable
runtime identities SAME
SimCore contribution NO_BREAK
same runtime generation
→ output semantic framing changes on regeneration
```

Therefore the current evidence does not support explaining the correction by a SimCore history mutation, cache-topology repair, runtime-prompt identity change or reload transition between the two generations.

The narrowest supported interpretation is generation/result variability under the same preserved request/runtime state.

This does **not** establish which model/provider mechanism caused the replay, nor does it prove a prompt compiler defect.

`Template recurrence: FIRST / NO MATCH` is not itself contradictory evidence: that subsystem tracks request-template recurrence and is not a semantic output-replay detector.

## 5. SYS-16 recurrence classification

Historical specimen:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
natural first generation
same-input reroll clears
```

New specimen:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
v0.64.7 / runtime mtbgdju1-fwtefm
natural first generation @2160→@2161
same-input retry clears
```

These are distinct natural operational events, not duplicate references or rerolls of one event.

Under the current broad family contract, mode/version/runtime differences do not define the symptom identity; the required observable discriminator is the previous-turn semantic-prefix replay followed by same-input reroll clearance.

Therefore:

```text
family: PARTIAL_PREVIOUS_TURN_REPLAY
independent natural specimens: >= 2
recurrence posture: RECURRENCE_CONFIRMED
symptom confidence: HIGH
root cause: UNPROVEN
severity: NOT DERIVED
runtime FIX authority: NONE
BLOCKER: NO
v0.64.7 attribution: UNPROVEN
```

`RECURRENCE_CONFIRMED` means only that the same reviewed symptom family has recurred naturally. It does not automatically mean FIX, BLOCKER, regression attribution, reproducibility on demand or release failure.

## 6. Relationship to GENERATION_SEMANTIC_EXCURSION

This specimen belongs more narrowly to `PARTIAL_PREVIOUS_TURN_REPLAY` than to the broader `GENERATION_SEMANTIC_EXCURSION` family because the anomalous output remains related to the current request but begins by reusing the immediately preceding turn's response frame/content categories.

Do not merge the two families merely because both may clear on reroll.

Potential cross-family relation remains review-only until additional paired evidence exists.

## 7. Relationship to the v0.64.7 live gate

This recurrence was observed during the v0.64.7 real-long-chat evidence window, but it is not evidence that the v0.64.7 cross-reload telemetry transport failed.

The supplied packets still remain in one runtime generation and continue to show:

```text
Telemetry continuity: FRESH · no-compatible-handoff
```

So the required v0.64.7 reload boundary still has not been demonstrated.

Current release-gate effect:

```text
PARTIAL_PREVIOUS_TURN_REPLAY recurrence: PRESERVED / ACTIVE INVESTIGATION TRIGGER
06407 cross-reload live gate: STILL OPEN / INCOMPLETE EVIDENCE
runtime release change: NOT AUTHORIZED
M2-3 implementation: STILL WAIT FOR 06407 GATE CLOSE
```

## 8. Next investigation lane

If investigated separately, compare source-backed natural specimens for:

```text
preceding-turn response-frame similarity
new input semantic distance from preceding input
first-generation replay extent
whether new requested content eventually appears
same-input reroll clearance/reproduction
runtime prompt identity
request/history mutation state
provider/model context if independently observable
```

Prefer evidence that distinguishes long-chat generation/context-selection behavior from SimCore request-state mutation before considering any runtime repair.

## 9. References

- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_SYS16_ANOMALY_RECURRENCE_CORRELATOR_DESIGN.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `release-simcore/plugins/simcore/latest.js`

---

## 10. Additional natural recurrence specimen — v0.64.11 runtime / @2240 → @2241

Date observed: 2026-08-28
Production authority: `v0.64.11 — Bounded Telemetry Capsule Compaction`
Diagnostic runtime generation: `mtcs4wi0-lrlsg6`
Diagnostic header: `Version: 0.64.10` due already-preserved stale `SIMCORE_RUNTIME_VERSION` identity defect
Natural request: user `@2240` → assistant `@2241`

### 10.1 Immediate preceding response frame

Before @2240, the operator rerolled the anomalous @2238 generation and obtained a healthy replacement @2239. That rerolled response answered a broad **2031 annual total-activity summary** request and was organized around these major categories:

```text
가수·앨범 활동
배우 활동
예능 활동
엠버서더 활동
시상식 수상 성과
기타 개인 활동·화제성
```

The rerolled @2239 therefore established a broad annual-career-summary response frame immediately before the next natural request.

### 10.2 Current natural input is materially narrower

User @2240 asked specifically for **platform-by-platform 2031 metrics** and named only these requested domains:

```text
유튜브
인스타그램
COSMIC 소통 앱
틱톡
주식
```

The requested comparison contract was also explicit:

```text
2030.12.31 baseline
→ 2031.12.31 cumulative value
→ increase amount
→ increase rate
→ platform-specific records / first-most / buzz
```

The user did **not** ask @2240 for another general music/acting/variety/ambassador annual summary.

### 10.3 Output begins correctly, then replays the preceding response frame

Assistant @2241 initially follows the current input and provides sections for:

```text
유튜브
인스타그램
COSMIC 공식 소통 앱
틱톡
CSW ENT 주식 성장률
```

This portion is responsive to @2240.

After completing the requested platform/stock sections, however, the output continues with unrelated broad annual-career sections:

```text
🎤 [가수·앨범 활동]
🎬 [배우 활동]
📺 [예능 활동]
👔 [엠버서더 및 기타 개인 활동]
```

Those categories directly mirror the immediately preceding @2239 annual-activity-summary frame rather than the narrower @2240 platform-only request.

The replay is semantic/frame-level rather than byte-identical: the output does not simply paste @2239 verbatim, but it reintroduces the preceding turn's category structure and corresponding career content after the current requested task has already been answered.

Bounded observable shape:

```text
new natural input @2240 = platform-only annual metrics
output @2241 prefix = current task answered correctly
output @2241 suffix = preceding @2239 broad annual-career frame reintroduced
```

This is a strong `PARTIAL_PREVIOUS_TURN_REPLAY` specimen.

### 10.4 Current-turn instruction-following defects inside the requested platform section

The semantic replay is the primary classification. Independently, the requested platform comparison was not executed uniformly for every requested metric.

Examples directly visible in @2241:

- YouTube average likes: baseline/final values are given, but increase amount/rate are not explicitly calculated.
- Instagram posts/reels/average likes: baseline/final or added counts are shown, but not every requested increase rate is supplied.
- TikTok total likes: `160억 → 190억` is shown without explicit `+30억 / +18.75%` comparison.
- COSMIC attendance says `2,405일 → 2,770일`, a +365-day difference, while prose also says `신혼여행 2주 휴식기` and elsewhere describes uninterrupted attendance; those claims cannot all be simultaneously interpreted as an exact 365-day attendance increase without qualification.
- Stock price `10,000원 → 1,850,000원` is a final price of 185× the listing price; `+18,400%` is the percentage increase, while prose calling it simply `184배` is an imprecise ratio statement unless explicitly referring to increase-over-baseline rather than final/base ratio.

These are response-quality/instruction-precision observations. They should not be conflated with the replay family's root cause, but they strengthen the conclusion that @2241 is not a clean exact execution of the current input.

### 10.5 Diagnostic state

The current @2240→@2241 diagnostic itself is locally healthy:

```text
Stability: PASS
binding BOUND
out COMMITTED
mirror COMMITTED
Warnings: 0
Compatibility diagnostics: 0
Preamble provenance: THOUGHTS_COMPAT · STRIPPED
CANONICAL↔FRESH Δchars +0 · EXACT
```

Telemetry also remains healthy:

```text
Telemetry capsule: COMPACT_V2 · 4,610/16,384 chars · OK
HOST_LOCAL WRITTEN · 4610 chars
```

This means the semantic replay occurred **despite** healthy local representation, mirror, envelope compatibility, warning, and telemetry signals.

Other observations:

```text
Template recurrence: REPEATED · family C
Recurrence history match: MATCH · user @2022 · assistant @2023 · distance 218
Representation correlation: CANONICAL@2227,FRESH_CHAT@2227 · ledger 7
Mutation attribution: AMBIGUOUS_HISTORY_MATCH · MEDIUM
```

Do not treat these fields as proof of replay cause. `Template recurrence` concerns request-template recurrence, and the history/representation correlations do not establish that SimCore injected the immediately preceding response frame into generation.

### 10.6 Relationship to the earlier @2238 anomaly

The operator clarified the physical action sequence:

```text
@2238 first generation
→ unresolved envelope / output mismatch anomaly

operator reroll of same @2238 request
→ healthy replacement @2239

new natural request @2240
→ @2241 partial previous-turn semantic/frame replay
```

Therefore the healthy @2239 is a same-input reroll control for the @2238 representation anomaly. It is also the immediately preceding semantic frame whose categories are partially replayed in @2241.

Do not misread the later exact @2239 representation as spontaneous convergence; the reroll is a material operator action.

### 10.7 Updated family posture

This specimen is independent from the v0.64.7 natural recurrence because it occurs in a different production/runtime episode and on a new natural user request.

It adds another strong natural specimen to the already-confirmed family:

```text
family: PARTIAL_PREVIOUS_TURN_REPLAY
natural recurrence: CONFIRMED previously
new v0.64.11-compatible natural specimen: YES
independent natural specimens: >= 3
symptom confidence: HIGH
current specimen reroll-clear control: NOT YET PROVIDED
root cause: UNPROVEN
provider/model cause: UNPROVEN
SimCore mutation cause: UNPROVEN
M2-3 attribution: NOT APPLICABLE (M2-3 not yet released)
M2-3 blocker: NO at current evidence level
runtime FIX authority: NONE
```

Unlike the earlier family exemplar, the current specimen does not require a same-input reroll result to recognize the symptom: the input/output semantic comparison already directly shows a narrower current task followed by reintroduction of the immediately preceding broad response frame. A reroll of @2240 would be useful as a paired control, but is not required to preserve this natural recurrence evidence.

### 10.8 v0.65.0 regression relevance

The planned v0.65.0 combined identity + M2-3 release must not absorb this anomaly as an assumed M2-3 defect because the specimen predates M2-3.

Use it instead as a frozen semantic regression observation:

```text
current user intent must remain primary
prior-turn semantic frame must not be treated as current-task authority
healthy Warnings/representation telemetry does not imply semantic non-replay
```

Any future fix requires narrower cause attribution than symptom recurrence alone.
