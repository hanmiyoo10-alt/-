# SimCore CACHE-A0 / CACHE-A1 — Fresh Authority Preflight + Shadow Cache Manifest

Date: 2026-09-03 KST
Status: **DESIGN FROZEN · SHADOW CLASSIFICATION ONLY · RUNTIME BYTES UNCHANGED · NO CACHE TRANSPORT AUTHORIZATION**
Classification: **SIMCORE CACHE PROGRAM · CACHE-A0 · CACHE-A1 · PRODUCTION PROMPT INVENTORY · SHADOW SEGMENT MANIFEST**

## 1. Decision

CACHE-A0 and CACHE-A1 are closed at design/shadow-manifest level against the exact current production runtime.

The purpose of this checkpoint is not to redesign the prompt.

The purpose is to take the prompt that already works, identify who owns each current request/prompt region, classify its intended cache lifetime using the T0–T6 architecture vocabulary, and freeze that current working shape as the input baseline for CACHE-A2 exact-byte fixtures.

Repository-wide change doctrine applies directly:

```text
WORKING + VERIFIED
→ PRESERVE

UNKNOWN
→ OBSERVE / ATTRIBUTE / VERIFY

BROKEN OR MISSING
→ TARGETED REPAIR AT THE NARROWEST CORRECT OWNER / BOUNDARY

VERIFIED REPAIR
→ NEW PRESERVED BASELINE
```

Therefore this checkpoint makes **zero runtime byte changes** and authorizes **zero prompt placement changes**.

---

## 2. Exact authority baseline

Fresh authority at this checkpoint:

```text
main
= 3d6d632a396a74064134bef59681089deb5529a7

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff

production SimCore
= v0.70.1 Cold First-Turn Tail Attribution

production latest/install blob
= 8f332cfceed316d35954e353c2eaca38c2f34d95

PROMPT_COMPILER_VERSION
= 4

runtimePromptPlacement
= TAIL_AFTER_CURRENT_USER

runtimePromptPolicy
= OBSERVE_ONLY

providerCache
= UNVERIFIED
```

Production authority remains `release-simcore`.

Nothing in this checkpoint changes production.

The closed 3M / Post-3M design corpus remains design-only with respect to this production prompt. No Source Intelligence runtime family, Candidate C persistence, source history, provider adapter, or cache transport is activated here.

---

## 3. Governing cache architecture

This checkpoint is governed by:

- `docs/SIMCORE_PROMPT_CACHE_ABI_PROGRAM_MASTER_DESIGN_2026-09-02.md`
- `docs/SIMCORE_PROMPT_CACHE_ABI_CROSS_VERSION_COMPATIBILITY_CONTRACT_2026-09-02.md`
- `docs/SIMCORE_CACHE_ARCHITECTURE_MASTER_DESIGN_2026-09-03.md`
- repository common-rule authority, especially RCR-D01
- exact production source on `release-simcore`

The governing target remains:

```text
ONE SEMANTIC PROMPT
→ ONE CACHE PLAN
→ IMPLICIT OR EXPLICIT PROVIDER CACHE TRANSPORT
```

and:

```text
SAME SEMANTICS
→ SAME STABLE PREFIX

SEMANTIC CHANGE
→ ONLY OWNED CACHE BREAK
```

CACHE-A1 does not claim that current production already has the final target physical ordering.

---

## 4. Critical distinction — logical lifetime is not current physical placement

The T0–T6 classes describe semantic/cache lifetime and ownership.

They do **not** claim that current production physically emits request material in T0→T5 order.

Current production explicitly freezes:

```text
runtimePromptPlacement = TAIL_AFTER_CURRENT_USER
```

and appends the compiled SimCore prompt as a final `system` message after the existing request material.

The current topology observer already distinguishes:

```text
HOST_PREFIX
CHAT_HISTORY
CURRENT_USER
SIMCORE_RUNTIME
POST_CURRENT_USER
```

with ownership:

```text
PRE_SIMCORE
SIMCORE_RUNTIME
POST_SIMCORE
```

Therefore a logically T1 SimCore contract can currently be physically located after T4/T5 material.

That condition is recorded as a possible `CACHE_SHADOW` topology risk.

It is **not** an authorization to move the prompt.

---

## 5. Existing production compiler is an asset, not a rewrite target

Production already has a useful ownership split inside `compileRuntimePromptParts(state)`.

The live compiler does:

```text
state
→ stateReconcile.reconcileState(state)
→ pending active check
→ compileStableContract()
→ compileSlowState(s, p)
→ compileModeState(s, p, communityExpected)
→ compileConditionalGuidance(s, p, communityExpected)
→ compileHotState(s, communityExpected)
→ compileFooter(communityExpected)
→ exact ordered join
```

The resulting exact current byte order is:

```text
stableLines
slowLines
modeLines
conditionalLines
hotLines
footerLines
```

Production also already exports compiler-native identity tiers:

```text
identityTiers.stable
identityTiers.slow
identityTiers.volatile
```

where:

```text
stable   = stableLines
slow     = slowLines
volatile = modeLines + conditionalLines + hotLines + footerLines
```

This is preserved.

CACHE-A1 does not replace the production three-tier observer model. It adds a shadow architectural interpretation using T0–T6 so later cache work has explicit lifetime and authority semantics.

---

## 6. Shadow manifest vocabulary

CACHE-A1 freezes the conceptual descriptor:

```text
ShadowPromptSegmentDescriptorV1
```

Fields:

```text
segmentId
owner
physicalAnchor
lifetimeClass
modelVisible
semanticRole
inputDependencies
volatilityClassification
expectedBreakAuthority
currentPlacement
cacheShadowRisk
preservationRule
evidenceAnchor
```

Allowed `volatilityClassification` values in this checkpoint:

```text
KNOWN_STABLE
SEMANTICALLY_DYNAMIC
MIXED
UNKNOWN_NEEDS_FIXTURE
NOT_MODEL_VISIBLE
```

A shadow descriptor is metadata only.

It must not alter prompt bytes, request ordering, host messages, runtime state, persistence, or provider transport.

---

## 7. Current physical request topology

The current production topology is frozen as observed by runtime contracts and request-topology instrumentation:

```text
[HOST / LEADING SYSTEM MATERIAL]
          ↓
[CHAT HISTORY]
          ↓
[CURRENT USER]
          ↓
[SIMCORE RUNTIME SYSTEM TAIL]
```

The SimCore tail is appended as:

```text
messages.push({ role: 'system', content: result.promptBlock })
```

and the topology observer receives:

```text
runtimeIndex = messages.length - 1
```

Consequences:

1. current host-leading material is physically before SimCore,
2. unchanged historical messages may participate in provider longest-prefix reuse,
3. current user material appears before the SimCore tail,
4. even stable SimCore bytes can be unreachable to strict provider prefix reuse if an earlier host/history/current-user byte differs,
5. this is structural evidence for possible Cache Shadow, not proof of monetary loss and not proof that placement should change.

---

## 8. T0 — Host-fixed prefix outside SimCore

### Descriptor `HOST_FIXED_PREFIX`

```text
owner
= HOST / EXTERNAL

physicalAnchor
= leading request/system material before conversation body where present

lifetimeClass
= T0

modelVisible
= YES when supplied to the model by the host

volatilityClassification
= UNKNOWN_NEEDS_FIXTURE from SimCore's authority boundary

expectedBreakAuthority
= HOST / EXTERNAL

currentPlacement
= PRE_SIMCORE

cacheShadowRisk
= HIGH if volatile host material changes before reusable downstream content
```

Production request topology explicitly distinguishes `HOST_PREFIX` from `CHAT_HISTORY`, `CURRENT_USER`, and `SIMCORE_RUNTIME`.

SimCore may observe host-prefix changes but does not claim authority to rewrite host-owned material.

### Preservation rule

```text
HOST PREFIX OBSERVATION
!=
HOST PREFIX MUTATION AUTHORITY
```

CACHE-A1 records the region only.

---

## 9. T4 — Conversation append-only prefix

### Descriptor `HOST_CHAT_HISTORY`

```text
owner
= HOST + EXISTING RECONCILIATION CONTRACT

physicalAnchor
= historical request messages before current user

lifetimeClass
= T4

modelVisible
= YES

volatilityClassification
= SEMANTICALLY_DYNAMIC ACROSS EDIT/REROLL/RECONCILE,
  APPEND-REUSABLE ACROSS ORDINARY CONTINUATION WHEN REPRESENTATION REMAINS STABLE

expectedBreakAuthority
= history mutation / edit / reroll / reconciliation owner

currentPlacement
= PRE_SIMCORE

cacheShadowRisk
= YES for all downstream SimCore bytes when history breaks earlier
```

Production already has dedicated history-frontier, representation, and mutation attribution work.

CACHE-A1 does not reopen that work.

The historical request representation remains the current T4 baseline.

### Preservation rule

```text
CURRENT VERIFIED HISTORY MATERIALIZATION / RECONCILIATION
→ PRESERVE
```

A T4 break is not automatically a defect. It is a defect only when the break is earlier or broader than the owning semantic/reconciliation change requires.

---

## 10. T5 — Current user

### Descriptor `HOST_CURRENT_USER`

```text
owner
= HOST / CURRENT USER REQUEST

physicalAnchor
= current user message before SimCore runtime tail

lifetimeClass
= T5

modelVisible
= YES

volatilityClassification
= SEMANTICALLY_DYNAMIC

expectedBreakAuthority
= current user input

currentPlacement
= PRE_SIMCORE, immediately before later SimCore tail under current contract

cacheShadowRisk
= YES for downstream SimCore bytes under strict longest-prefix caching
```

The current user is expected to change and owns a legitimate break.

CACHE-A1 must not classify current-user variation as accidental cache churn.

---

## 11. T1 — `compileStableContract()`

### Descriptor `SIMCORE_STABLE_CONTRACT`

```text
owner
= SIMCORE PROMPT COMPILER

physicalAnchor
= first region inside current SimCore runtime tail

lifetimeClass
= T1

modelVisible
= YES

volatilityClassification
= KNOWN_STABLE by current compiler construction

expectedBreakAuthority
= explicit stable semantic / Prompt Cache ABI change only

currentPlacement
= SIMCORE_RUNTIME tail after CURRENT_USER

cacheShadowRisk
= YES, structurally shadowed by any earlier T0/T4/T5 break
```

Production `compileStableContract()` contains the long-lived model-visible contract, including current anchors for:

- authoritative SimCore core-state opening marker,
- required response frame,
- response envelope continuity,
- period continuity,
- current-input authority,
- prior-answer continuity/reference boundary,
- character/reference-source policy,
- Knowledge requirement and final placement,
- Community structural contract,
- reaction shape/floor/history contract.

Representative production anchors include:

```text
[SIMCORE CORE STATE — AUTHORITATIVE]
required_frame=...
response_envelope=exactly_one_no_restart
current_input_task=primary_generation_authority
prior_assistant_output=continuity_reference_context_not_current_task_authority
reference_sources=character_card+currently_exposed_lore_if_present
knowledge_required=1
knowledge_position=final_output_block
required_knowledge_block=exactly_one_complete_<Knowledge>...</Knowledge>
community_format_contract_condition=community_blocks_expected>0
community_comment_shape=4_top_level+1_nested_reply_exactly
reaction_required=each_comment_and_reply
reaction_floor_scope=per_platform_family
reaction_history_shared_across_modes=1
```

### A1 decision

The existing production stable contract is the **T1 baseline candidate**.

Do not rewrite it for aesthetics, naming consistency, section adjacency, or speculative provider benefit.

CACHE-A2 must first freeze exact bytes for representative fixtures.

### Cross-version consequence

A normal SimCore release-version bump must not, by itself, own a T1 rewrite.

---

## 12. T2 — Additive stable extension lane

### Descriptor `SIMCORE_STABLE_EXTENSION_LANE`

```text
owner
= FUTURE SIMCORE FEATURE / PROMPT ABI OWNER

physicalAnchor
= NONE IN CURRENT PRODUCTION

lifetimeClass
= T2

modelVisible
= NO CURRENT BYTES

volatilityClassification
= NOT_APPLICABLE UNTIL FEATURE EXISTS

expectedBreakAuthority
= explicit additive stable feature activation/design

currentPlacement
= ABSENT

cacheShadowRisk
= NOT_APPLICABLE CURRENTLY
```

Important:

```text
T2 IS A LOGICAL RESERVED LANE
!=
PREALLOCATED EMPTY PROMPT TEXT
```

CACHE-A1 does not insert placeholders, empty markers, future schemas, 3M source-family definitions, or reserved bytes.

Future stable features should prefer T2 additive extension when semantics permit, preserving historical T1 bytes.

---

## 13. Existing `slowLines` — mixed T3/T5 shadow region

Production `compileSlowState(s, p)` currently emits:

```text
korean_age_offset
current_korean_age   [conditional]
world_year
secondary_configured
secondary_active
episode_no
```

Production intentionally classifies this entire output as compiler-native `slow` identity tier.

CACHE-A1 must preserve that existing observer classification.

Architecturally, however, the region is not yet proven to be one pure T3 lifetime class.

### Descriptor `SIMCORE_SLOW_STATE`

```text
owner
= SIMCORE STATE / PROMPT COMPILER

physicalAnchor
= after compileStableContract, before current mode lines

lifetimeClass
= MIXED T3 / T5

modelVisible
= YES

volatilityClassification
= MIXED

expectedBreakAuthority
= owning state/config/lifecycle change

currentPlacement
= SIMCORE_RUNTIME tail

cacheShadowRisk
= YES
```

### Current subfield posture

#### `korean_age_offset`

```text
provisional lifetime
= T3 CANDIDATE

reason
= semantic configuration/state expected to change much less frequently than turn-local request data
```

#### `current_korean_age`

```text
provisional lifetime
= T3 CANDIDATE

reason
= derived from the age-offset semantic state when active
```

#### `world_year`

```text
provisional lifetime
= T3 OR T5 DEPENDING ON ACTUAL TIMELINE LIFECYCLE

status
= UNKNOWN_NEEDS_FIXTURE
```

Do not freeze it as session-stable until A2/A3 evidence demonstrates the required lifecycle.

#### `secondary_configured`

```text
provisional lifetime
= T3 CANDIDATE

reason
= configuration-like semantic state
```

#### `secondary_active`

```text
provisional lifetime
= T5 CANDIDATE

reason
= activation may depend on the current request/turn semantics
```

#### `episode_no`

```text
provisional lifetime
= T3 / LIFECYCLE-OWNED DYNAMIC

status
= UNKNOWN_NEEDS_FIXTURE
```

### A1 decision

Do not split, move, reorder, or relabel the production `slowLines` bytes yet.

CACHE-A2 must produce exact-byte and change-matrix fixtures that show which subfields actually remain stable across:

- ordinary continuation,
- mode changes,
- episode transitions,
- secondary activation/deactivation,
- timeline/year progression,
- reload,
- reroll/edit where applicable.

Only then may a narrower T3 boundary be frozen.

---

## 14. T5 — `compileModeState()`

Production `compileModeState(s, p, communityExpected)` emits:

```text
mode
broadcast_locked
community_blocks_expected
```

### Descriptor `SIMCORE_MODE_STATE`

```text
owner
= SIMCORE LIFECYCLE / MODE STATE

physicalAnchor
= after slowLines

lifetimeClass
= T5

modelVisible
= YES

volatilityClassification
= SEMANTICALLY_DYNAMIC

expectedBreakAuthority
= current mode/lifecycle transition

currentPlacement
= SIMCORE_RUNTIME tail

cacheShadowRisk
= expected local dynamic tail behavior
```

These values describe current execution state and are not candidates for T1 stability merely because some consecutive turns may repeat them.

Repeated value equality is reuse opportunity, not a change of semantic ownership.

---

## 15. T5 — `compileConditionalGuidance()`

### Descriptor `SIMCORE_CONDITIONAL_GUIDANCE`

```text
owner
= SIMCORE LIFECYCLE / CURRENT CONTEXT / EVIDENCE / RECURRENCE / HANDOFF POLICY

physicalAnchor
= after modeLines

lifetimeClass
= T5

modelVisible
= YES

volatilityClassification
= SEMANTICALLY_DYNAMIC / CONDITIONALLY PRESENT

expectedBreakAuthority
= the specific condition owner that activates/deactivates the guidance

currentPlacement
= SIMCORE_RUNTIME tail

cacheShadowRisk
= normal turn-local variation; may also extend existing shadow after earlier breaks
```

Current production conditionally emits guidance for multiple bounded semantic owners, including:

- broadcast session end authority,
- Mode C immediate Community behavior,
- current timeline anchor/current character status,
- broadcast airtime/current broadcast lifecycle,
- narrative timestamp semantics,
- recurring request-template protection,
- short-Community lineage/source handoff,
- current root/source evidence precedence,
- platform/source restrictions,
- Community/Knowledge placement requirements.

Representative current production anchors include:

```text
broadcast_session_state=...
broadcast_end_authority=...
mode_c_after_frame=...
current_timeline_anchor=...
request_template_recurs_from_prior_history=1
prior_answer_is_not_a_content_template=1
reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1
do_not_mechanically_reuse_prior_answer_composition_or_wording=1
short_community_request_context_is_current_lineage=1
short_community_source_selector=current_lineage_root_turn
current_root_evidence=CURRENT_ROOT_EVIDENCE_when_present;...
current_source_evidence=CURRENT_SOURCE_EVIDENCE_when_present;...
event_fact_precedence=...
source_event_identity_and_facts=...
```

### A1 decision

Conditional presence is an **owned semantic change**, not accidental serialization instability.

CACHE-A2 fixtures must distinguish expected conditional appearance/disappearance from unintended byte churn inside an unchanged condition.

---

## 16. T5 — `compileHotState()`

Production `compileHotState(s, communityExpected)` emits `reaction_max` only when Community output is expected.

The underlying object is serialized through a stable-key-order helper before JSON serialization.

### Descriptor `SIMCORE_HOT_STATE`

```text
owner
= SIMCORE COMMUNITY CURRENT STATE

physicalAnchor
= after conditionalLines

lifetimeClass
= T5

modelVisible
= YES WHEN EMITTED

volatilityClassification
= SEMANTICALLY_DYNAMIC WITH EXISTING DETERMINISTIC KEY ORDER

expectedBreakAuthority
= current Community state / platform maxima

currentPlacement
= SIMCORE_RUNTIME tail

cacheShadowRisk
= expected dynamic tail
```

### Preservation rule

The existing deterministic top-level key ordering is already a proven anti-churn repair.

```text
WORKING DETERMINISTIC SERIALIZATION
→ PRESERVE
```

Do not replace it merely because a future canonical serializer exists.

---

## 17. Footer — mixed stable framing + T5 value

Production `compileFooter(communityExpected)` emits:

```text
final_required_blocks=COMMUNITY:${communityExpected},Knowledge:1_last
[/SIMCORE CORE STATE]
```

### Descriptor `SIMCORE_FOOTER`

```text
owner
= SIMCORE PROMPT COMPILER

physicalAnchor
= final lines of SimCore runtime tail

lifetimeClass
= MIXED T1 FRAMING + T5 VALUE

modelVisible
= YES

volatilityClassification
= MIXED

expectedBreakAuthority
= communityExpected for first line; stable compiler contract for closing marker

currentPlacement
= SIMCORE_RUNTIME tail

cacheShadowRisk
= downstream of all preceding breaks
```

The footer is intentionally not physically split in A1.

A2 exact-byte fixtures must preserve the current order and line form.

A later serializer architecture may model the stable/dynamic subfields separately only if exact semantic/byte equivalence is first proved.

---

## 18. T6 — observer, topology and transport-only evidence

Production already keeps cache observation outside the model-visible prompt.

Current examples include:

- runtime prompt cache observation,
- compiler identity tiers passed to the observer,
- `sendIndex`,
- observer timestamp via `Date.now()`,
- request topology observation,
- `runtimeIndex`,
- diagnostic location key,
- first-break owner/zone,
- provider posture `UNVERIFIED`.

### Descriptor `SIMCORE_CACHE_OBSERVABILITY`

```text
owner
= SIMCORE DIAGNOSTICS / OBSERVER

physicalAnchor
= runtime bookkeeping around request preparation

lifetimeClass
= T6

modelVisible
= NO

volatilityClassification
= NOT_MODEL_VISIBLE

expectedBreakAuthority
= NONE OVER MODEL-VISIBLE PROMPT

currentPlacement
= OUTSIDE PROMPT CONTENT

cacheShadowRisk
= NONE DIRECTLY
```

### Critical firewall

```text
T6 CHANGE
→ MUST NOT CHANGE T1/T2/T3/T4/T5 SEMANTIC BYTES
```

Request IDs, timestamps, telemetry, cache hints, and receipt correlation must remain outside stable model-visible regions unless a separately proven semantic contract explicitly requires otherwise.

---

## 19. Current shadow manifest summary

| Segment | Current owner | Logical class | Current physical zone | Model-visible | Current posture |
|---|---|---:|---|---|---|
| Host fixed/leading systems | Host/external | T0 | PRE_SIMCORE / HOST_PREFIX | Yes when supplied | Observe only |
| Prior chat history | Host + reconciliation | T4 | PRE_SIMCORE / CHAT_HISTORY | Yes | Preserve existing behavior |
| Current user | Host/current request | T5 | PRE_SIMCORE / CURRENT_USER | Yes | Legitimate dynamic break |
| `compileStableContract` | SimCore prompt compiler | T1 | SIMCORE_RUNTIME tail | Yes | Long-lived baseline candidate |
| T2 extension lane | Future owned features | T2 | No current bytes | No current bytes | Reserved logically only |
| `compileSlowState` | SimCore state/compiler | T3/T5 mixed | SIMCORE_RUNTIME tail | Yes | Preserve; refine with A2 fixtures |
| `compileModeState` | SimCore lifecycle | T5 | SIMCORE_RUNTIME tail | Yes | Dynamic |
| `compileConditionalGuidance` | Multiple current semantic owners | T5 | SIMCORE_RUNTIME tail | Yes | Conditional dynamic |
| `compileHotState` | Community current state | T5 | SIMCORE_RUNTIME tail | Yes when present | Dynamic; deterministic key order already preserved |
| `compileFooter` | SimCore compiler | T1/T5 mixed | SIMCORE_RUNTIME tail | Yes | Preserve exact current bytes |
| Cache observer/topology/telemetry | SimCore diagnostics | T6 | Non-prompt bookkeeping | No | Observe only |

---

## 20. Existing production identity tier → shadow architecture mapping

The current production identity model is kept intact.

Mapping:

```text
compiler stable tier
→ T1 baseline candidate

compiler slow tier
→ T3/T5 mixed shadow region pending A2 fixture proof

compiler volatile tier
→ primarily T5 current execution state

host prefix
→ T0

chat history
→ T4

current user
→ T5

observer / topology metadata
→ T6
```

This is an architectural interpretation, not a runtime rename.

No existing diagnostic contract is removed or redefined by A1.

---

## 21. Break-frontier posture

Current production already has first-break attribution by request zone.

CACHE-A1 adds the expected architectural interpretation:

### Host fixed change

```text
expected class
= T0

expected owner
= HOST / EXTERNAL

SimCore action
= OBSERVE, DO NOT CLAIM REPAIR AUTHORITY
```

### Historical edit/reconciliation

```text
expected class
= T4

expected owner
= HISTORY / EDIT / REROLL / RECONCILIATION CONTRACT
```

### New current user turn

```text
expected class
= T5

expected owner
= CURRENT USER
```

### Stable contract drift without semantic ABI change

```text
expected class
= T1

posture
= DEFECT CANDIDATE / UNINTENDED EARLY BREAK
```

### Slow-state change

```text
expected class
= T3 OR T5

posture
= MUST MATCH SUBFIELD OWNER;
  A2 FIXTURE REQUIRED BEFORE NARROWER CLAIM
```

### Mode/conditional/hot change

```text
expected class
= T5

posture
= LEGITIMATE WHEN CURRENT SEMANTIC CONDITION CHANGED
```

### T6 telemetry change causing prompt-byte change

```text
posture
= FIREWALL VIOLATION
```

---

## 22. Cache Shadow posture

The current physical layout contains an intentional historical constraint:

```text
CHAT_HISTORY
→ CURRENT_USER
→ SIMCORE_RUNTIME
```

Therefore:

```text
stable T1 SimCore bytes exist
+
current user naturally changes earlier
→ strict longest-prefix provider may not reach T1 bytes
```

This is a structural Cache Shadow possibility.

A1 does **not** conclude:

- that provider cache reuse is absent,
- that provider cache cost is material,
- that T1 must move before history/user,
- that host semantics allow such movement,
- that an explicit provider cache control should be added.

Provider truth remains:

```text
UNVERIFIED
```

Placement remains:

```text
TAIL_AFTER_CURRENT_USER
```

The later placement gate remains:

```text
repeated Cache Shadow
+
provider receipt evidence
+
material cost/latency loss
+
SimCore-owned placement cause
+
semantic-safe equivalent alternative
→ placement repair may be considered
```

---

## 23. CACHE-A0 preflight result

CACHE-A0 checks:

```text
fresh main authority known
= PASS

fresh release-simcore authority known
= PASS

production runtime source exact
= PASS

production compiler identity known
= PASS

S7 publication not silently assumed
= PASS

provider cache not overclaimed
= PASS

Post-3M design not treated as production
= PASS

current cache architecture master present
= PASS
```

Result:

```text
CACHE-A0 = CLOSED / PASS
```

No release transaction is opened.

---

## 24. CACHE-A1 closure result

CACHE-A1 checks:

```text
current physical request topology recorded
= PASS

host prefix classified
= T0

chat history classified
= T4

current user classified
= T5

stable compiler contract classified
= T1 BASELINE CANDIDATE

stable extension lane classified
= T2 ABSENT / LOGICAL ONLY

slow state classified
= EXPLICIT T3/T5 MIXED, REQUIRES FIXTURE

mode state classified
= T5

conditional guidance classified
= T5

hot state classified
= T5

footer classified
= EXPLICIT T1/T5 MIXED

observer/topology metadata classified
= T6

provider truth
= UNVERIFIED

runtime byte change
= 0

prompt reorder
= 0

provider cache directive
= 0

persistent schema change
= 0

source persistence
= 0
```

Result:

```text
CACHE-A1 = CLOSED / SHADOW MANIFEST FROZEN
```

---

## 25. Anti-goals

This checkpoint does not authorize:

- moving `compileStableContract()` before chat history,
- changing `TAIL_AFTER_CURRENT_USER`,
- splitting `slowLines` in production,
- changing prompt line order,
- rewriting prompt wording,
- changing `PROMPT_COMPILER_VERSION`,
- changing release version/name,
- introducing `PromptCacheAbiRevision` into production bytes,
- adding provider cache-control directives,
- adding explicit cache keys,
- adding a Usage Dashboard bridge,
- claiming provider read/write/hit/miss,
- replacing the existing runtime prompt observer,
- changing request history reconciliation,
- creating a local response cache,
- activating 3M/Post-3M runtime semantics,
- activating Candidate C,
- creating source history or source/object cache.

---

## 26. Required preservation baseline

The following current production facts become A2 preservation inputs:

```text
PROMPT_COMPILER_VERSION = 4

compile order
= stableLines
  → slowLines
  → modeLines
  → conditionalLines
  → hotLines
  → footerLines

compiler identity tiers
= stable / slow / volatile

runtime placement
= TAIL_AFTER_CURRENT_USER

runtime policy
= OBSERVE_ONLY

provider cache
= UNVERIFIED

existing reaction_max deterministic top-level key order
= PRESERVE

existing history/reconcile topology diagnostics
= PRESERVE
```

A2 may observe exact bytes for fixtures.

A2 may not silently improve or normalize them.

---

## 27. CACHE-A2 handoff

The next checkpoint is:

```text
CACHE-A2
= EXACT-BYTE ABI FIXTURE BASELINE
```

Goal:

> Prove what current production actually emits for representative semantic states, and freeze exact expected bytes / changed regions before any serializer or placement work.

Minimum fixture families should include:

```text
F0 inactive pending
F1 ordinary Mode A
F2 Mode B START
F3 Mode B CONTINUE
F4 Mode B END
F5 Mode C / Community
F6 secondary configured inactive
F7 secondary active
F8 age offset inactive/active
F9 narrative timeline anchor
F10 recurrence repeated
F11 short-Community lineage handoff
F12 Community reaction_max with reordered source object construction
F13 reload-equivalent semantic state
F14 same semantics with T6 telemetry/time/request identity changed
```

For each fixture record:

```text
exact prompt text
exact byte fingerprint
exact line count
compiler stable fingerprint
compiler slow fingerprint
compiler volatile fingerprint
expected T1/T3/T5 change set
actual first changed line/byte against paired fixture
```

A2 must particularly resolve the current A1 `UNKNOWN_NEEDS_FIXTURE` items in `slowLines` without changing runtime bytes.

---

## 28. Final frozen invariant

CACHE-A0/A1 closes with:

```text
THE CURRENT WORKING PROMPT IS THE BASELINE,
NOT A PROBLEM TO BE REWRITTEN.

CLASSIFY FIRST.
FREEZE EXACT BYTES NEXT.

LOGICAL CACHE LIFETIME
!=
CURRENT PHYSICAL PLACEMENT.

KNOWN STABLE MATERIAL
MAY CURRENTLY BE CACHE-SHADOWED,
BUT SHADOW ALONE DOES NOT AUTHORIZE MOVEMENT.

WORKING BEHAVIOR STAYS.
UNKNOWN BOUNDARIES GET FIXTURES.
ONLY PROVEN CACHE GAPS GET TARGETED REPAIR.
```

Next:

```text
CACHE-A2 · EXACT-BYTE ABI FIXTURE BASELINE
```
