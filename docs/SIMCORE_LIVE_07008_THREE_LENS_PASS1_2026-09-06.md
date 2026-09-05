# SimCore v0.70.8 Three-Lens Real Long-Chat Review — Pass 1

Date: 2026-09-06 KST
Status: **HUMAN REAL-LONG-CHAT REVIEW COMPLETE · LENS 1 PASS · TARGET NATURAL PATH NOT EXERCISED · TERMINAL CONVERGENCE NOT PERFORMED**
Release: **v0.70.8 Repeat-Send Representation Rewind Guard**
Tracking: `#1544`
Review authority: `docs/SIMCORE_DIAGNOSTIC_REVIEW_THREE_LENS_PROTOCOL_2026-09-06.md`
Design authority: `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_DESIGN_2026-09-06.md`
Implementation evidence: `docs/SIMCORE_07008_IMPLEMENTATION_EVIDENCE_2026-09-06.md`
Publication evidence: `docs/SIMCORE_07008_PUBLICATION_EVIDENCE_2026-09-06.md`

## 1. Fresh authority readback

At review time:

```text
main = 628ca1c1288a1ad4fefaa28d00b42d83d09063f4
production version = 0.70.8
production release = Repeat-Send Representation Rewind Guard
release-simcore = 01010564649a033e02a0658a167f5f38a6a23632
release blob = 97fc98c076a1b93026a05697bfa26be87f86d5cc
machine validation state = PENDING_REAL_LONG_CHAT
machine live gate = 07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_REAL_LONG_CHAT
```

Fresh deployed source reports `//@version 0.70.8`, and the release commit is the expected v0.70.8 publication commit.

This review is evidence-only. It does not mutate `release-simcore`, plugin bytes, release-state machinery, or product manifest.

## 2. Operator-supplied coherent set

All five accepted diagnostics are from one runtime generation:

```text
runtime generation = mtom5tgq-rbmuf3
runtime boot = 2026-09-05T16:45:09.098Z
format = raw-lineage-v2
version = 0.70.8
```

### Specimen A — ordinary A turn

```text
request user @3150
output assistant @3151
mode A
stability PASS
Edit reconcile SAME_FAST
snapshot UNCHANGED
Warnings 0
Continuity PASS
```

This is the fresh-generation ordinary control.

### Specimen B — ordinary C continuation

```text
request user @3152
output assistant @3153
mode C
Prior representation EXACT
current match FRESH_CHAT
shape FRESH_EXACT_CARRYOVER
Edit reconcile SAME_FAST
snapshot UNCHANGED
Deferred mirror COMMITTED
Warnings 0
Continuity PASS
```

This proves ordinary exact carryover remains healthy after v0.70.8.

### Specimen C — operator-confirmed reroll / repeat-send

```text
request user @3152
output assistant @3153
operator action = reroll / repeat-send
Pre snapshot REPEAT-SEND · READ HIT · 790.0 ms
Prior representation EXACT
canonical == fresh == current
Edit origin NONE
Edit reconcile SAME_SNAPSHOT · 774.0 ms
snapshot UNCHANGED
History mutation NONE
Cache topology STABLE 62/62 100%
Warnings 0
Continuity PASS
```

This is a clean reroll negative control.

It does **not** exercise the release-specific natural target precondition:

```text
priorRepresentation = OUTPUT_MISMATCH
current = exact prior Fresh
repeat-send rewind geometry
```

Therefore the new live marker:

```text
fresh-exact-repeat-send-rewind
```

is **NOT_EXERCISED naturally in this set**.

The exact target geometry remains primarily proven by the direct-owner executable regression recorded in the implementation evidence, as explicitly allowed by the frozen design when Host mismatch cannot be manufactured on demand.

### Specimen D — operator-confirmed genuine hand edit

```text
request user @3154
output assistant @3155
operator action = hand edit of prior visible assistant
Prior representation EXACT
canonical/fresh = 5187:c66bac19
current = 5186:d8654556
Edit delta = -1 char
shape NEW_VISIBLE_REPRESENTATION
Edit origin USER_EDIT_CANDIDATE
Edit reconcile MANUAL_EDIT_REBUILT · 1.937 s
snapshot UPDATED
Manual edit commit = 339.0 ms EXACT
retention = INLINE_PRUNE_SKIPPED · SAME_OUT_KEY_OVERWRITE
Warnings 0
Continuity PASS
```

This is the required genuine-edit negative control. The new rewind exception did not capture the third representation.

### Specimen E — natural turn after the genuine edit

```text
request user @3156
output assistant @3157
mode C
Prior representation EXACT
Edit reconcile SAME_FAST
snapshot UNCHANGED
Warnings 0
Continuity PASS
```

This proves post-edit convergence returned to the ordinary exact path without persistent representation damage.

## 3. Lens 1 — version / release contract

Frozen question:

```text
Did v0.70.8 repair the bounded repeat-send rewind misclassification
without weakening genuine edit semantics?
```

### Required live controls

| Control | Result | Evidence |
|---|---|---|
| ordinary exact carryover | PASS | Specimen B `SAME_FAST`, snapshot unchanged |
| clean reroll / repeat-send | PASS | Specimen C `SAME_SNAPSHOT`, snapshot unchanged |
| genuine manual edit | PASS | Specimen D `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT`, snapshot updated |
| no healthy-control snapshot rewrite | PASS | A/B/C/E unchanged |
| no new correctness warning/blocker | PASS | Warnings 0 throughout; stability/continuity pass |
| natural target `OUTPUT_MISMATCH + exact Fresh + rewind` | NOT_EXERCISED | Host did not produce mismatch in this set |
| deterministic direct-owner target geometry | PASS / PREEXISTING QUALIFICATION | implementation evidence direct-owner matrix |

### Lens 1 verdict

```text
LENS_1 = PASS
TARGET_NATURAL_RECURRENCE = NOT_EXERCISED
TARGET_PRIMARY_PROOF = DIRECT_OWNER_EXECUTABLE_REGRESSION / PASS
GENUINE_EDIT_SEMANTICS = PASS
HEALTHY_REROLL_SEMANTICS = PASS
NEW_CORRECTNESS_FIX_OR_BLOCKER = NONE OBSERVED
```

The frozen design explicitly permits deterministic direct-owner regression as primary proof when the Host mismatch cannot be naturally reproduced on demand. Natural target recurrence would increase confidence, but is not required to be fabricated.

This document does not itself perform terminal HUMAN_EVIDENCE release-state convergence.

## 4. Lens 2 — coherent-set transition / causality

The accepted sequence is coherent:

```text
ordinary A
-> ordinary C exact carryover
-> operator reroll of the same C request
-> regenerated C output
-> operator genuine hand edit of that prior output
-> next natural C request
```

Observed transition semantics:

```text
ordinary exact carryover
-> SAME_FAST / UNCHANGED

clean reroll with prior EXACT
-> SAME_SNAPSHOT / UNCHANGED

third visible representation after hand edit
-> USER_EDIT_CANDIDATE
-> MANUAL_EDIT_REBUILT / UPDATED

next natural turn
-> SAME_FAST / UNCHANGED
```

No false manual-edit rebuild was observed on the clean reroll. No genuine edit was swallowed by the new v0.70.8 exception.

### Lens 2 verdict

```text
LENS_2 = PASS + PERFORMANCE WATCHES
CORRECTNESS_SEQUENCE = COHERENT
REROLL_CONTROL = PASS
GENUINE_EDIT_CONTROL = PASS
POST_EDIT_CONVERGENCE = PASS
TARGET_NATURAL_REWIND_MARKER = NOT_EXERCISED
```

Separate performance findings are preserved outside this release-specific record:

```text
#1556 repeat-send pre-snapshot READ HIT latency recurrence
SIMILAR_SIZE_HIGH_VARIANCE output snapshot set latency recurrence
HOST_LOCAL_TELEMETRY_CHECKPOINT_LATENCY_SPIKE
```

They do not establish v0.70.8 correctness failure.

## 5. Lens 3 — raw-lineage-v2 element inventory

Allowed states follow the adopted protocol. This ledger is set-wide; action-specific notes identify the specimen that exercised the element.

| Diagnostic element | Set disposition | Review note |
|---|---|---|
| Diagnostic format | PASS | raw-lineage-v2 on every specimen |
| Version | PASS | 0.70.8 throughout |
| Captured timestamp | PASS | present/current for each copy |
| Runtime boot / generation | PASS | one stable generation `mtom5tgq-rbmuf3` |
| Reload safety | PASS | ARMED, epoch 1, stale drops 0, UI 2, cleanup NAMED |
| Probe context | PASS | CURRENT TURN |
| Request hook | PASS | SEEN on all specimens |
| Core handshake | PASS | FOUND |
| Runtime status / output commit | PASS | ACTIVE / COMMITTED |
| Mode / stored last mode | PASS | A then C; stored mode agrees |
| Turn binding | PASS | BOUND and exact user/output indices |
| Stability summary | PASS | PASS on all specimens |
| Request timing | PASS | complete bounded timestamps |
| Handshake breakdown | PASS | complete and closes to total |
| Session load | PASS | COLD_INIT first, LOCATION_REUSE thereafter |
| Post-handshake breakdown | PASS | complete bounded accounting |
| Edit reconcile semantics | PASS | SAME_FAST / SAME_SNAPSHOT / MANUAL_EDIT_REBUILT as action requires |
| Prior representation | PASS | UNAVAILABLE first generation; EXACT thereafter |
| Edit origin | PASS | NONE on controls; USER_EDIT_CANDIDATE on hand edit |
| Edit delta / shape | PASS | exact carryover controls and -1-char third representation distinguished |
| Manual edit attribution | PASS | exercised on Specimen D; bounded breakdown present |
| Manual edit commit | PASS | 339 ms, confidence EXACT |
| Manual edit retention | PASS | INLINE_PRUNE_SKIPPED / SAME_OUT_KEY_OVERWRITE |
| onSend breakdown | PASS | complete accounting |
| Pre snapshot mode | PASS | FORWARD on ordinary; REPEAT-SEND on reroll |
| Pre snapshot correctness | PASS | reroll READ HIT and correct SAME_SNAPSHOT state |
| Pre snapshot latency | WATCH | 790 ms recurrence; tracked in #1556 |
| Turn storage semantics | PASS | one authoritative set; finite payload/timing |
| Turn storage latency | WATCH | 26–496 ms variation; correctness intact |
| Request hotspot | PASS | hotspot identity matches measured dominant span |
| Output timing | PASS | output seen/committed timestamps coherent |
| Output handler breakdown | PASS | complete bounded accounting |
| Output process state source | PASS | MEMORY_FAST throughout |
| Output recovery / validate / finalize | PASS | finite and small; no correctness issue |
| Output snapshot set semantics | PASS | exact API owner, inline prune disabled, confidence EXACT |
| Output snapshot set latency | WATCH | same-size 13,002–13,003-char payloads show 1.014–2.104 s set variance |
| Output mirror critical path | PASS | DEFERRED / 0 ms critical path |
| Deferred mirror | PASS | COMMITTED for every output |
| Output provenance | PASS | HOST_RAW/CANONICAL/FRESH present |
| Output representation | PASS | CANONICAL↔FRESH EXACT on accepted outputs |
| Representation ownership | PASS | REPRESENTATION owner, mirror TRANSPORT_ONLY, raw bodies not retained |
| Envelope recovery | NOT_APPLICABLE | no envelope repair needed |
| Envelope boundary | NOT_APPLICABLE | no recovery boundary action |
| Safe-envelope reconcile | NOT_APPLICABLE | no safe-envelope repair path exercised |
| Safe-envelope boundary | NOT_APPLICABLE | no safe-envelope repair path exercised |
| Output hotspot | PASS | exact dominant span identified |
| Hook activity | PASS | request/output counts advance together, no stale hook evidence |
| Diagnostic age | PASS | bounded copy age only; no stale-context mismatch |
| Warnings | PASS | 0 on all five specimens |
| Compatibility diagnostics | PASS | Thoughts compatibility stripping only where present |
| Preamble provenance | PASS | THOUGHTS_COMPAT stripped safely; policy recorded |
| Prompt prefix | PASS | baseline/percentage/stable states reported |
| Cache posture | PASS | FROZEN, TAIL_AFTER_CURRENT_USER, provider UNVERIFIED |
| Cache topology | PASS | baseline/common-prefix/stable states internally coherent |
| Cache integrity | PASS | degraded only when pre-SimCore history changed; stable on reroll |
| Cache break | PASS | PRE_SIMCORE history break when present; NONE on reroll |
| Cache effect | PASS | local reuse-window observation only; provider not inferred |
| Host prefix attribution | PASS | stable high-confidence system0 prefix |
| Host prefix delta | PASS | SAME_FAMILY and stable system0 |
| History mutation | PASS | NONE on reroll; same-slot changes on later naturally changed history |
| History alignment | PASS | OBSERVE_ONLY; request mutation NONE |
| History stabilization | PASS | OBSERVE_ONLY, no persistent mutation |
| Reconcile frontier | PASS | not applicable on stable reroll; bounded when history break exists |
| Frontier movement | PASS | baseline/not-applicable or measured forward movement |
| Repeated break | PASS | NONE on reroll; observed history signature later without SimCore causality claim |
| Representation correlation | PASS | NONE/NO_MATCH when no ledger match; no fabricated attribution |
| Mutation attribution | PASS | NONE or NO_PROVENANCE_MATCH with LOW confidence as appropriate |
| Rebuild attribution | PASS | NOT_APPLICABLE on controls; preexisting request mutation attribution on later turn |
| Local exposure proxy | PASS | explicitly local proxy only |
| Runtime compiler identity | PASS | stable/slow tiers stable; volatile/full vary with mode/request as expected |
| SimCore contribution | PASS | NO_BREAK on reroll; NOT_FIRST_BREAK when pre-SimCore history changed |
| Cache placement | PASS | current user/runtime placement reported relative to prefix break |
| Cache cadence | PASS | bounded metadata only |
| Cache trajectory | PASS | baseline/observing/established transitions coherent |
| Telemetry continuity | PASS | FRESH with truthful foreign-location boot disposition |
| Telemetry capsule | PASS | COMPACT_V2 under 16,384-char cap |
| Handoff precision | NOT_APPLICABLE | no adopted reload handoff specimen in this set |
| Session surface | PASS | WINDOW/GLOBAL_THIS ACCESS_ERROR truthfully reported |
| Host-local transport | PASS | API PRESENT / store USABLE / clear REMOVE |
| Telemetry checkpoint correctness | PASS | MEMORY + HOST_LOCAL written, output remains committed |
| Telemetry checkpoint latency | WATCH | one output checkpoint host-local write = 6.337 s |
| Post-onSend attribution | PASS | bounded named attribution closes |
| First-request cold prompt-accounting latency | WATCH | first request prompt accounting 8.970 s; no correctness failure |
| Cache topology cost | PASS | 2–4 ms warm samples |
| Runtime prompt size | PASS | bounded 2,362–3,824 chars / 41–56 lines |
| Broadcast lifecycle | PASS | CLOSED in A/C set |
| Broadcast end authority | NOT_APPLICABLE | no open broadcast |
| End boundary | NOT_APPLICABLE | no B_END |
| Broadcast closure | NOT_APPLICABLE | no B_END |
| Broadcast terminal coverage | NOT_APPLICABLE | no B_END |
| Short-C source lock | PASS | ON only for short C handoff case; OFF otherwise |
| Summary scope | NOT_APPLICABLE | NONE / INELIGIBLE |
| Template recurrence | PASS | FIRST/INELIGIBLE as input shape requires |
| Recurrence guidance | PASS | OFF |
| Recurrence history match | PASS | NO MATCH / INELIGIBLE, no false reuse |
| Request lineage | PASS | ROOT A@3150 then C chain depth progression |
| Source handoff | PASS | NEW SOURCE on short C, otherwise ineligible with reason |
| RAW frame continuity | PASS | volume/chapter/chatindex progression valid |
| RAW frame regression | PASS | NONE |
| Continuity summary | PASS | PASS throughout |
| Calendar transition | NOT_APPLICABLE | INELIGIBLE in supplied turns |
| Frame sequence | PASS | expected and observed frame agree |
| Frame guard | PASS | NONE / no repair needed |
| Evidence shape | PASS / NOT_APPLICABLE | exercised on short C dual-evidence turn; otherwise n/a |
| Evidence boundary | PASS / NOT_APPLICABLE | exact/transformed bounded anchors on exercised C turn |
| Evidence mode | PASS / NOT_APPLICABLE | DUAL only when applicable |
| Evidence root fence | PASS / NOT_APPLICABLE | APPLIED exact root on exercised C turn |
| Evidence source fence | PASS / NOT_APPLICABLE | APPLIED transformed source on exercised C turn |
| Narrative clock | PASS | monotonic advancement |
| Post-B_END clock handoff | NOT_APPLICABLE | not direct post-B_END C |
| Current-time authority | PASS | NARRATIVE |
| Narrative tail coverage | PASS | FRAME_ONLY truthfully reports no later canonical terminal timestamp |
| Visible chronology | PASS | PASS_OR_NOT_APPLICABLE |
| Stored broadcast state | PASS | UNLOCKED; prior airtime retained without contaminating narrative authority |
| Warnings detail | PASS | none |
| Compatibility detail | PASS | none or Thoughts compatibility note only |
| COMMUNITY structure/output | PASS | C outputs structurally accepted; no warning/blocker |
| Reaction/platform diagnostics | NOT_EXERCISED | no dedicated reaction-validator anomaly surfaced in copied set |
| v0.70.8 natural rewind provenance marker | NOT_EXERCISED | prior representation remained EXACT on reroll |
| Repository/document authority | FIX | existing #1545 CURRENT_DEVELOPMENT human current-state drift remains open |

### Lens 3 verdict

```text
LENS_3_RELEASE_CORRECTNESS = PASS
LENS_3_TARGET_NATURAL_MARKER = NOT_EXERCISED
LENS_3_PERFORMANCE = WATCH ITEMS PRESENT
LENS_3_REPOSITORY_AUTHORITY = EXISTING FIX #1545
NEW_RUNTIME_CORRECTNESS_FIX_OR_BLOCKER = NONE
```

The repository-authority FIX is non-runtime and already tracked separately. It must not be buried inside runtime acceptance evidence.

## 6. Separate findings and routing

### 6.1 Repeat-send pre-snapshot latency

```text
Specimen C READ HIT = 790.0 ms
correctness = PASS
classification = WATCH / RECURRENCE
owner record = #1556
```

### 6.2 Output snapshot set variance

Same generation, nearly identical payload size:

```text
13,002 chars -> 1.430 s -> 109.98 ms/1K
13,003 chars -> 1.014 s -> 77.98 ms/1K
13,003 chars -> 2.104 s -> 161.81 ms/1K
13,003 chars -> 1.468 s -> 112.90 ms/1K
13,002 chars -> 2.011 s -> 154.67 ms/1K
```

This independently reinforces the already-established v0.70.7 verdict:

```text
SIMILAR_SIZE_HIGH_VARIANCE = STRONGLY SUPPORTED
PAYLOAD_SIZE_AS_SOLE_DOMINANT_EXPLANATION = NOT SUPPORTED
HOST_INTERNAL_CAUSE = NOT CLAIMED
PROVIDER_CACHE_CAUSE = NOT CLAIMED
```

Dedicated recurrence record is separate from this release acceptance document.

### 6.3 Host-local telemetry checkpoint latency spike

Specimen B output handler:

```text
Output handler other = 6.338 s
Telemetry checkpoint host = 6.337 s
trigger = OUTPUT_COMMIT
HOST_LOCAL WRITTEN
output correctness = COMMITTED / PASS
```

The numerical closure makes the Host-local telemetry write the direct owner of this particular output-side `other` spike. This is a performance WATCH only; no telemetry correctness failure is established.

Dedicated performance record is separate from this release acceptance document.

### 6.4 CURRENT_DEVELOPMENT human-state drift

Fresh main still contains machine-managed v0.70.8 `PENDING_REAL_LONG_CHAT` authority while the human current-state paragraph underneath still describes an older already-closed live gate and R2.11 immediate action.

This is the already-open `#1545` non-runtime FIX. It is not repaired in this transaction.

## 7. Overall review verdict

```text
V07008_LENS_1 = PASS
V07008_LENS_2 = PASS + PERFORMANCE WATCHES
V07008_LENS_3 = RELEASE CORRECTNESS PASS / TARGET NATURAL PATH NOT_EXERCISED
TARGET_DIRECT_OWNER_REGRESSION = PASS / EXISTING QUALIFICATION
GENUINE_EDIT_CONTROL = PASS
CLEAN_REROLL_CONTROL = PASS
POST_EDIT_CONVERGENCE = PASS
WARNINGS = 0
NEW_RUNTIME_CORRECTNESS_FIX_OR_BLOCKER = NONE
RELEASE_SPECIFIC_HUMAN_EVIDENCE = SUFFICIENT FOR LIVE_PASS CANDIDATE
TERMINAL_RELEASE_STATE_CONVERGENCE = NOT PERFORMED BY THIS DOC TRANSACTION
```

Do not manufacture an `OUTPUT_MISMATCH` Host specimen. If a natural target recurrence occurs later, record it as an additional confidence upgrade and require the `fresh-exact-repeat-send-rewind` marker with snapshot unchanged.

## 8. Production boundary

```text
runtime mutation = NONE
release-simcore mutation = NONE
latest.js mutation = NONE
install.js mutation = NONE
release-system mutation = NONE
product-manifest mutation = NONE
```
