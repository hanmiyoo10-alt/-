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
