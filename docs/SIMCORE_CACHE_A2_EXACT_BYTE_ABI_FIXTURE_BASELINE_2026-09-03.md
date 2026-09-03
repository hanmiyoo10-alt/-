# SimCore CACHE-A2 — Exact-Byte ABI Fixture Baseline

Date: 2026-09-03 KST
Status: **CLOSED · EXACT-BYTE BASELINE FROZEN · PRODUCTION RUNTIME UNCHANGED · PROVIDER CACHE STILL UNVERIFIED**
Classification: **SIMCORE CACHE PROGRAM · CACHE-A2 · PROMPT ABI GOLDEN FIXTURES · COMPILER BYTE EVIDENCE**

## 1. Decision

CACHE-A2 is closed against exact current production SimCore v0.70.1.

This checkpoint does not redesign, reorder, normalize, or optimize the production prompt.

It executes the existing production Prompt compiler against representative semantic states and freezes the resulting bytes as the compatibility baseline for later cache architecture work.

The governing rule is:

```text
CURRENT VERIFIED PRODUCTION BYTES
→ GOLDEN FIXTURE
→ FUTURE CHANGE MUST EXPLAIN ITS OWNED BREAK
```

and:

```text
EXACT-BYTE FIXTURE
!=
PROVIDER CACHE HIT CLAIM
```

Provider truth remains external and `UNVERIFIED`.

---

## 2. Exact authority

Fresh authority used by this checkpoint:

```text
main base used for A2 branch
= 4f9a79299f1701906b4a399a8d4bd39310ebbb0a

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

production SimCore
= v0.70.1 Cold First-Turn Tail Attribution

production plugins/simcore/latest.js Git blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

production source SHA-256
= 2d86adef490835e35e56e6135a35521a99029298f1a04b239cc9c96838037abf

PROMPT_COMPILER_VERSION
= 4

runtimePromptPlacement
= TAIL_AFTER_CURRENT_USER

runtimePromptPolicy
= OBSERVE_ONLY

providerCache
= UNVERIFIED
```

`release-simcore` remains the production runtime authority.

No release transaction is opened by A2.

---

## 3. A2 artifacts

Permanent A2 artifacts:

```text
scripts/simcore-cache-a2-exact-byte-fixtures.mjs
fixtures/simcore/cache-a2-prompt-fixtures-v0701.json
```

The harness loads the real modules from one supplied production plugin file:

```text
kernel
community
recurrence
lineage
handoff
state-reconcile
time
lifecycle
prompt
```

and calls the real production:

```text
prompt.compileRuntimePromptParts(state)
```

There is no fixture-specific prompt serializer and no copied prompt template.

The golden file records:

- exact full prompt text,
- exact UTF-8 byte length,
- exact line count,
- full prompt SHA-256,
- exact `stable` tier text / bytes / SHA-256,
- exact `slow` tier text / bytes / SHA-256,
- exact `volatile` tier text / bytes / SHA-256,
- broadcast end authority result,
- pairwise first changed byte,
- pairwise first changed line,
- expected owner/relation metadata.

The frozen schema is:

```text
SimCoreCacheA2ExactByteFixtureBaselineV1
```

---

## 4. Capture and replay proof

A branch-only capture workflow checked out production `release-simcore` separately and generated the candidate golden directly from:

```text
.cache-a2-production/plugins/simcore/latest.js
```

The captured Actions artifact was:

```text
artifact
= simcore-cache-a2-v0701

artifact digest
= sha256:6e6b16c880b73d7eaf2c28e70d22f2be90301219b7803795c151226870bcd0f7
```

After committing the golden file, the same harness was rerun in `--verify` mode against a fresh checkout of `release-simcore`.

Result:

```text
production identity assertion
= PASS

exact-byte golden verification
= PASS
```

The temporary capture/verify workflow is not part of the final permanent A2 surface.

---

## 5. Fixture inventory

A2 freezes 18 concrete fixture records covering the A1 F0–F14 minimum families.

The families that require a pair are intentionally represented as two concrete records.

```text
F0_INACTIVE_PENDING
F1_MODE_A_ORDINARY
F2_MODE_B_START
F3_MODE_B_CONTINUE
F4_MODE_B_END
F5_MODE_C_COMMUNITY
F6_SECONDARY_CONFIGURED_INACTIVE
F7_SECONDARY_ACTIVE
F8A_AGE_OFFSET_INACTIVE
F8B_AGE_OFFSET_ACTIVE
F9_NARRATIVE_TIMELINE_ANCHOR
F10_RECURRENCE_REPEATED
F11_SHORT_COMMUNITY_LINEAGE_HANDOFF
F12A_REACTION_MAX_ORDER_ABC
F12B_REACTION_MAX_ORDER_CBA
F13_RELOAD_EQUIVALENT_STATE
F14A_T6_NOISE_REQUEST_A
F14B_T6_NOISE_REQUEST_B
```

Representative whole-prompt observations:

| Fixture | Lines | UTF-8 bytes | SHA-256 |
|---|---:|---:|---|
| F0 inactive | 0 | 0 | `e3b0c44298fc...` |
| F1 ordinary A | 32 | 1680 | `dcc252301f36...` |
| F2 B_START | 40 | 1868 | `b33b14db7e01...` |
| F3 B_CONTINUE | 49 | 2365 | `37ce65e02edd...` |
| F4 B_END | 54 | 2710 | `7daf95dc4c06...` |
| F5 C | 37 | 1912 | `d1cd4dcb3502...` |
| F9 timeline anchor | 38 | 2123 | `ebca491c219c...` |
| F10 recurrence | 38 | 2003 | `926cf60f1edb...` |
| F11 lineage handoff | 52 | 3276 | `463f1623ccfa...` |
| F12 reordered reaction map | 37 | 1952 | `4c556b519512...` |

The full exact values remain in the machine-readable golden rather than being duplicated in prose.

---

## 6. T1 stable contract result

The most important A2 observation is that every active fixture shares one exact compiler-stable tier.

```text
active fixture count
= 17

unique active stable-tier SHA-256 count
= 1

stable-tier SHA-256
= eb120b401add80522a802971d905ce00856849b7bbb353d00f361155678b6537
```

F0 inactive correctly has an empty stable tier.

Therefore, across the A2 representative active state matrix:

```text
mode changes
secondary configuration changes
secondary current-turn activation
age-offset changes
world-year / timeline changes
recurrence guidance
lineage handoff guidance
reaction_max values/order
reload-equivalent state
T6 operational noise

→ DO NOT CHANGE CURRENT T1 BYTES
```

A2 therefore upgrades the A1 `T1 BASELINE CANDIDATE` posture to:

```text
compileStableContract()
= T1 EXACT-BYTE BASELINE FROZEN FOR v0.70.1
```

This is a compatibility baseline, not an instruction to move T1 physically.

Current physical placement remains after the current user inside the SimCore runtime tail.

---

## 7. `slowLines` is proven mixed

A1 classified production `slowLines` as `T3/T5 MIXED` pending fixture proof.

A2 confirms that classification.

Ordinary A emits:

```text
korean_age_offset=+0
world_year=unknown
secondary_configured=0
secondary_active=0
episode_no=0
```

The current compiler-native `slow` tier is useful observationally, but it is not one pure architectural lifetime class.

---

## 8. Secondary configuration vs current activation

### F1 → F6

Changing only secondary configuration produces:

```text
same stable tier
= YES

same slow tier
= NO

same volatile tier
= YES

first changed line
= 22

owner
= secondary configuration
```

Production source derives `secondaryConfigured` from stable prompt-probe configuration:

```text
secondaryName + secondaryKeyword
```

A2 resolution:

```text
secondary_configured
= T3 SESSION/CONFIGURATION SEMANTIC STATE
```

### F6 → F7

Changing only current secondary activation produces:

```text
same stable tier
= YES

same slow tier
= NO

same volatile tier
= YES

first changed line
= 23
```

Production source derives:

```text
secondaryActive
= secondaryConfigured
  && current input contains current secondaryKeyword
```

A2 resolution:

```text
secondary_active
= T5 CURRENT-TURN SEMANTIC STATE
```

This is the clearest proof that:

```text
compiler-native slow tier
!=
one architectural cache lifetime
```

A later descriptor/serializer may model these values separately, but A2 does not split or move production bytes.

---

## 9. Age-offset pair

F8A → F8B changes only age semantic state.

Observed:

```text
same stable tier
= YES

same slow tier
= NO

same volatile tier
= YES

first changed line
= 20
```

Active age offset adds the exact derived line:

```text
current_korean_age=character_reference_age+2;past_event_age_not_current=1
```

A2 resolution:

```text
korean_age_offset
= T3 PERSISTED / SLOW SEMANTIC STATE

current_korean_age
= T3 DERIVATIVE OF THAT STATE
```

No T1 rewrite is required for age progression.

---

## 10. `world_year` UNKNOWN is resolved

F1 → F9 changes world-year/timeline state.

Observed:

```text
same stable tier
= YES

same slow tier
= NO

same volatile tier
= NO

first changed line
= 21
```

The slow-tier change is:

```text
world_year=unknown
→
world_year=2031
```

Current production owns `worldYear` in reconciled persistent semantic state.

`time.applyWorldYear(state, year)` changes it monotonically and also advances Korean age offset when the year advances.

The current turn may own the transition trigger, but the resulting `worldYear` remains semantic state after the turn.

A2 resolution:

```text
world_year
= T3 LIFECYCLE-SLOW PERSISTED SEMANTIC STATE

world_year transition authority
= Time / explicit or committed timeline-year transition
```

The accompanying current timeline guidance remains T5 and correctly changes the volatile tier.

Thus:

```text
T3 STATE CHANGE
+
T5 CURRENT GUIDANCE CHANGE
→ slow + volatile break
→ T1 remains exact
```

---

## 11. `episode_no` UNKNOWN is resolved

F1 → F2 changes the episode lifecycle and current mode.

Observed:

```text
same stable tier
= YES

same slow tier
= NO

same volatile tier
= NO

first changed line
= 24
```

Production Lifecycle increments `state.episodeNo` when a new broadcast starts.

The value remains in reconciled semantic state across later turns and is also reconstructed during bounded bootstrap history recovery.

A2 resolution:

```text
episode_no
= T3 LIFECYCLE-SLOW PERSISTED SEMANTIC STATE

episode transition authority
= Lifecycle broadcast-start boundary
```

The simultaneous B_START mode/guidance remains T5.

Therefore:

```text
new episode
→ intended T3 episode break
  + intended T5 mode/guidance break
→ no T1 break
```

---

## 12. Deterministic `reaction_max` serialization proof

F12A and F12B construct the same semantic platform-max map in opposite insertion orders.

Observed:

```text
same full prompt bytes
= YES

same stable tier
= YES

same slow tier
= YES

same volatile tier
= YES

first changed byte
= NONE

first changed line
= NONE

whole prompt SHA-256
= 4c556b519512d4e23b03ed81ac1fd5c4022fcd562ea638f0cb39f4dc7097f9e6
```

This validates the existing production stable-key-order repair.

A2 preservation rule:

```text
CURRENT reaction_max DETERMINISTIC SERIALIZATION
→ WORKING
→ PRESERVE
```

No replacement canonical serializer is justified for this seam.

---

## 13. Reload equivalence proof

F13 is a JSON round-tripped semantic copy of ordinary Mode A state.

Compared with F1:

```text
same full prompt bytes
= YES

same stable tier
= YES

same slow tier
= YES

same volatile tier
= YES

whole prompt SHA-256
= dcc252301f36b25a9c59eed8ff8912a4d2c6dceb7d5c7a5fe3602dd844710834
```

Therefore the current compiler does not introduce reload-only prompt byte drift for this representative state.

This does not claim that every host request prefix is reload-stable. It proves the SimCore compiler-output side for the fixture.

---

## 14. T6 volatility firewall proof

F14A and F14B use identical semantic state with different synthetic operational metadata:

```text
requestId
generatedAt
latencyMs
```

That metadata is deliberately not passed into the semantic compiler.

Observed:

```text
same full prompt bytes
= YES

same stable tier
= YES

same slow tier
= YES

same volatile tier
= YES

whole prompt SHA-256
= dcc252301f36b25a9c59eed8ff8912a4d2c6dceb7d5c7a5fe3602dd844710834
```

A2 therefore freezes the current firewall:

```text
T6 OPERATIONAL NOISE
→ ZERO PROMPT-BYTE AUTHORITY
```

This is exactly the desired cache-ABI behavior.

---

## 15. Break-localization matrix

The frozen pair matrix is:

| Pair | Intended owner | Stable | Slow | Volatile | First changed line |
|---|---|---|---|---|---:|
| F1 → F6 | T3 secondary configuration | SAME | CHANGED | SAME | 22 |
| F6 → F7 | T5 secondary activation | SAME | CHANGED | SAME | 23 |
| F8A → F8B | T3 age state | SAME | CHANGED | SAME | 20 |
| F1 → F9 | T3 world-year + T5 timeline | SAME | CHANGED | CHANGED | 21 |
| F1 → F2 | T3 episode + T5 mode | SAME | CHANGED | CHANGED | 24 |
| F12A → F12B | deterministic serialization | SAME | SAME | SAME | none |
| F1 → F13 | reload equivalence | SAME | SAME | SAME | none |
| F14A → F14B | T6 firewall | SAME | SAME | SAME | none |

This matrix is now the first exact evidence for an owned break frontier inside the current production Prompt compiler.

---

## 16. A2 refinement of A1 manifest

A1 posture:

```text
compileStableContract
= T1 BASELINE CANDIDATE

compileSlowState
= T3/T5 MIXED

world_year
= UNKNOWN_NEEDS_FIXTURE

episode_no
= UNKNOWN_NEEDS_FIXTURE

secondary_active
= T5 CANDIDATE
```

A2 posture:

```text
compileStableContract
= T1 EXACT-BYTE BASELINE FROZEN

compileSlowState
= PROVEN T3/T5 MIXED PHYSICAL REGION

korean_age_offset
= T3

current_korean_age
= T3 DERIVED

world_year
= T3 LIFECYCLE-SLOW PERSISTED STATE

secondary_configured
= T3 CONFIGURATION

secondary_active
= T5 CURRENT-TURN

episode_no
= T3 LIFECYCLE-SLOW PERSISTED STATE
```

Important:

```text
ARCHITECTURAL SUBFIELD CLASSIFICATION
!=
AUTHORIZATION TO REORDER CURRENT slowLines
```

Current prompt bytes remain the baseline.

---

## 17. What A2 does not prove

A2 does not prove:

- provider cache reads,
- provider cache writes,
- provider cache hit rate,
- provider cached-token accounting,
- provider implicit-cache retention duration,
- explicit cache-control support,
- that current T1 placement is monetarily harmful,
- that moving T1 before history/user is semantically safe,
- that every host prefix is stable,
- that every possible SimCore semantic state is represented by the fixture set.

A2 proves the current Prompt compiler byte behavior for the frozen representative matrix.

Provider truth remains:

```text
UNVERIFIED
```

---

## 18. Runtime and release invariants

A2 changes no production runtime file.

Frozen invariants remain:

```text
release-simcore
= unchanged

production version
= 0.70.1

PROMPT_COMPILER_VERSION
= 4

runtimePromptPlacement
= TAIL_AFTER_CURRENT_USER

runtimePromptPolicy
= OBSERVE_ONLY

providerCache
= UNVERIFIED

prompt wording
= unchanged

prompt line order
= unchanged

request order
= unchanged

persistent schema
= unchanged

provider transport metadata
= unchanged

Candidate C / source persistence
= inactive
```

---

## 19. Compatibility consequence

Future cache work now has a real byte oracle.

Before any compiler/serializer/placement change, run the A2 harness against the candidate and determine:

```text
which fixture changed?
which tier changed?
what is the first changed byte?
what is the first changed line?
who owns the semantic change?
was the break intended?
```

An unexplained stable-tier drift is a cache-ABI defect candidate.

A known semantic incompatibility may intentionally change the baseline only through an explicit compatibility decision.

---

## 20. Closure result

CACHE-A2 checks:

```text
exact production source selected
= PASS

production v0.70.1 identity asserted
= PASS

F0-F14 minimum family coverage
= PASS

exact full prompt bytes captured
= PASS

exact tier bytes captured
= PASS

whole/tier fingerprints captured
= PASS

first changed byte/line captured
= PASS

T1 active-state identity across matrix
= PASS

reaction_max reordered-construction identity
= PASS

reload-equivalent identity
= PASS

T6 noise firewall
= PASS

world_year UNKNOWN resolved
= PASS / T3 LIFECYCLE-SLOW

episode_no UNKNOWN resolved
= PASS / T3 LIFECYCLE-SLOW

secondary_active T5 classification
= PASS

runtime byte mutation
= 0

release-simcore mutation
= 0

provider cache claim
= 0
```

Result:

```text
CACHE-A2
= CLOSED / EXACT-BYTE ABI FIXTURE BASELINE FROZEN
```

---

## 21. Next technical seam

A2 does not automatically authorize a new runtime cache release.

The master cache architecture's next safe technical seam is to use this golden corpus as the compatibility oracle for a **canonical equivalence / prompt-segment descriptor harness**.

The next work must preserve:

```text
current verified semantic fixture
→ current verified bytes
```

before any serializer ownership or physical placement change is considered.

Provider receipt correlation and Cache Shadow evidence remain separate later gates.

---

## 22. Final frozen invariant

```text
THE CURRENT WORKING PROMPT IS NOW A BYTE-LEVEL ORACLE.

SAME REPRESENTATIVE SEMANTICS
→ SAME GOLDEN BYTES.

T1 IS EXACT ACROSS THE ACTIVE A2 MATRIX.

slowLines IS PROVEN MIXED:
T3 PERSISTED/CONFIGURATION STATE
+
T5 CURRENT-TURN STATE.

T6 NOISE HAS ZERO PROMPT-BYTE AUTHORITY.

DETERMINISTIC SERIALIZATION THAT ALREADY WORKS
STAYS WORKING.

NO PROVIDER HIT IS CLAIMED.
NO PROMPT IS MOVED.
NO RUNTIME IS CHANGED.
```