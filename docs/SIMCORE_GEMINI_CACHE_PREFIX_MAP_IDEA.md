# SimCore Gemini Cache Prefix Map — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · OBSERVABILITY-FIRST · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Make prompt-cache behavior explainable at request-prefix level.

The Cache Prefix Map does not generate content and does not change main-model rendering. It is a bounded SimCore observability surface that answers:

```text
Which request regions remained reusable?
Where did the first meaningful prefix mutation occur?
Who owns that break?
Was the remaining SimCore runtime already in cache shadow?
```

It exists to support Gemini implicit caching research and attribution.

## 2. Responsibility boundary

Constitutional rule remains:

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Therefore Prefix Map may inspect bounded request topology and fingerprints, but must never:

```text
write prose for the model
rewrite user/history content
move prompt sections automatically
change semantic authority
change model output to improve cache metrics
```

Any future cache optimization suggested by the map is a separate design/release item.

## 3. Core model — request as cache regions

Represent a request as ordered regions rather than one opaque prompt.

Conceptual map:

```text
[HOST / SYSTEM PREFIX]
        ↓
[CHAT HISTORY 0..N]
        ↓
[CURRENT USER]
        ↓
[SIMCORE STABLE]
        ↓
[SIMCORE SLOW]
        ↓
[SIMCORE VOLATILE]
        ↓
[SIMCORE FULL / TAIL]
```

The exact host serialization may differ, so this is an attribution model rather than an assertion that the gateway exposes identical physical blocks.

## 4. Map semantics

For each bounded region, record only metadata such as:

```text
region id
owner
role/kind
message/index range where applicable
chars / token estimate if available
fingerprint
same/changed vs prior comparable request
cache-critical yes/no
```

No raw message bodies are retained for map history.

Primary classifications:

```text
STABLE_REUSE
CHANGED
FIRST_BREAK
AFTER_BREAK
CACHE_SHADOW
UNKNOWN
```

`CACHE_SHADOW` means the region may itself be stable but appears after an earlier unavoidable prefix mutation, so its local stability may not increase a strict longest-prefix cache hit.

## 5. Example rendering

Compact diagnostic example:

```text
Cache Prefix Map

HOST/SYSTEM       128k · SAME
CHAT_HISTORY      402k · SAME through @2142
CHAT_HISTORY @2143     · FIRST_BREAK · PRE_SIMCORE
CURRENT_USER            · AFTER_BREAK
SIMCORE stable          · SAME · CACHE_SHADOW
SIMCORE slow            · SAME · CACHE_SHADOW
SIMCORE volatile        · CHANGED · AFTER_BREAK

First break ownership: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
Gemini provider cache: correlate with external receipt
```

Alternate SimCore-owned example:

```text
HOST/SYSTEM       SAME
CHAT_HISTORY      SAME
CURRENT_USER      expected new turn boundary
SIMCORE stable    CHANGED · FIRST_SIMCORE_DRIFT
SIMCORE slow      SAME

Attribution: SIMCORE_STABLE_ABI_DRIFT
```

The map must distinguish an expected new current-user message from an unexpected earlier mutation. It should not naively call every new turn a regression.

## 6. First-break ownership

Reuse existing SimCore ownership vocabulary where possible:

```text
PRE_SIMCORE · HOST/SYSTEM
PRE_SIMCORE · CHAT_HISTORY
CURRENT_USER_EXPECTED
SIMCORE · STABLE
SIMCORE · SLOW
SIMCORE · VOLATILE
UNKNOWN
```

The map should preserve the existing constitutional rule:

```text
PRE_SIMCORE break
→ SimCore must not claim responsibility
→ do not rewrite runtime compiler merely to improve a metric
```

## 7. Reusable-prefix budget

Add a bounded derived view:

```text
Reusable Prefix Budget

comparable prefix chars     522,180
first-break offset          487,902
reusable-before-break       93.4%
SimCore-owned bytes before break  0
SimCore stable after break  CACHE_SHADOW
```

This is a local structural metric only.

It is not equivalent to Gemini cached-token ratio.

Correct language:

```text
local reusable prefix = OBSERVED
Gemini cached tokens   = EXTERNAL RECEIPT / UNVERIFIED if absent
```

## 8. Gemini receipt correlation

When Usage Dashboard or another approved evidence source provides the matching Gemini cache receipt, correlate rather than merge authorities.

Conceptual pair:

```text
Prefix Map
→ reusable-before-break 93%
→ first break PRE_SIMCORE @2143

Gemini receipt
→ input 510k
→ cached 441k
→ cached ratio 86%
```

Store/report the relationship as an observation:

```text
PREFIX_MAP_CORRELATED_WITH_GEMINI_RECEIPT
```

Do not infer that 93% local prefix must equal 86% provider cached ratio. Tokenization, gateway framing, provider policy, TTL, route/cache scope, and hidden request material may differ.

## 9. Sentinel relationship

The Cache Regression Sentinel should consume Prefix Map attribution rather than invent a second prefix parser.

Flow:

```text
Gemini cached-token regression detected
→ Cache Prefix Map for same request pair
→ determine first break / owner / cache shadow
→ classify WATCH / host-history / SimCore-owned candidate
```

Examples:

```text
cached ratio collapse
+ first break PRE_SIMCORE
+ stable/slow SAME
→ HOST_HISTORY_OR_EXTERNAL_CACHE_WATCH
```

```text
cached ratio collapse
+ first SimCore break stable
+ Guardian had declared stable change
→ DECLARED_CACHE_ABI_IMPACT_OBSERVED
```

```text
cached ratio collapse
+ first SimCore break stable
+ Guardian expected PRESERVE
→ CACHE_ABI_REGRESSION_CANDIDATE
```

## 10. Guardian relationship

Guardian is pre-release, Prefix Map is request/runtime observability.

```text
Cache ABI Guardian
→ production P vs candidate C deterministic fixture bytes

Cache Prefix Map
→ actual consecutive long-chat request topology
```

They answer different questions:

```text
Guardian: did our release change stable/slow bytes?
Prefix Map: where did this real request's reusable prefix actually break?
```

## 11. Privacy and boundedness

Hard limits:

```text
NO raw system prompt body retention
NO raw user message retention
NO raw assistant body retention
NO COMMUNITY text retention
NO full request snapshots
NO unbounded per-turn ledger
```

Prefer:

```text
fingerprints
lengths
roles/kinds
indices
small enums
bounded first-diff metadata
```

Existing long-chat telemetry retention bounds should be reused where possible.

## 12. Performance constraints

The map must not become the cache-performance problem it measures.

Desired implementation properties:

```text
reuse existing runtime-topology/history fingerprint work
no second full history scan if avoidable
no network
no polling
no extra SnapshotStore write solely for the map
bounded comparison state only
```

If exact token counts require a high-cost tokenizer, prefer existing gateway token counts or a cheap character/known-token approximation for local topology.

## 13. UI / diagnostics candidate

First version should live in diagnostic text, not a permanent widget.

Possible compact rendering:

```text
Cache map: reusable 93% · first break PRE_SIMCORE @2143 · SimCore CACHE_SHADOW
```

Expanded diagnostic panel may show region rows.

A visual mini-widget is a later UX candidate only if long-chat use proves value.

## 14. Required future fixtures

A future implementation should test at least:

```text
1. identical comparable prefix
   → no unexpected first break

2. one historical assistant representation mutation
   → exact history slot first break

3. expected new current-user turn only
   → not misclassified as regression

4. stable SimCore tier drift
   → SIMCORE stable attribution

5. volatile-only change after an earlier user/history break
   → CACHE_SHADOW / not first break

6. reload with restored telemetry
   → prior request comparable immediately

7. reload without compatible handoff
   → comparison UNKNOWN/FRESH, no invented first break

8. no raw bodies retained

9. no second full history scan where existing topology data is available

10. no provider cache HIT claim without receipt

11. Sentinel consumes Prefix Map attribution rather than duplicate logic

12. Renderer boundary unchanged
```

## 15. Non-goals

```text
prompt rewriting
history canonicalization for cache metrics
automatic prompt relocation
Gemini explicit cache management
provider route pinning
renderer behavior changes
main-model prose generation
provider cache guarantee
```

## 16. Research order

Recommended sequence:

```text
v0.64.7 live close
→ collect actual Gemini receipt samples via Usage Dashboard
→ prototype Prefix Map from existing topology metadata
→ correlate several healthy and degraded cache samples
→ validate attribution usefulness
→ then decide whether Sentinel/Guardian integration should be activated
```

Do not ship all cache ideas as one release.

## 17. Current classification

```text
GEMINI_CACHE_PREFIX_MAP
= HIGH VALUE
= LOW SEMANTIC RISK
= OBSERVABILITY-FIRST
= REQUEST-LEVEL ATTRIBUTION LAYER
= IDEA / DESIGN CANDIDATE

runtime mutation:
NONE today

renderer responsibility change:
NONE

provider authority:
NONE without external receipt
```
