# SimCore Implicit Prompt Cache Idea Lab

Date: 2026-08-25
Status: `IDEA LAB · NO RUNTIME CHANGE · POST-v0.64.7 RESEARCH TRACK`
Current production line: `v0.64.7 — Cross-Reload Cache Observer Continuity`

## 1. Purpose

Explore how SimCore can better cooperate with gateway/provider **implicit prompt caching** without weakening correctness, changing request semantics blindly, or confusing local prefix stability with authoritative cache hits.

This document records research ideas only. It does not activate a release or change production.

## 2. Existing constitutional constraints

Current verified request order:

```text
CHAT_HISTORY
→ CURRENT_USER
→ SIMCORE_RUNTIME
```

Current runtime placement:

```text
TAIL_AFTER_CURRENT_USER
```

Provider/gateway cache authority remains:

```text
UNVERIFIED
```

Current compiler identity tiers:

```text
stable / slow / volatile / full
```

Correctness and state safety outrank cache efficiency.

## 3. Key implication — Cache Shadow

For a strict longest-prefix implicit cache, `CURRENT_USER` is normally a per-turn changing boundary before `SIMCORE_RUNTIME`.

Therefore:

```text
stable SimCore tail bytes
≠ automatically larger reusable provider prefix
```

because the reusable prefix may already end at the current-user boundary or earlier.

This means the highest-value cache work is likely to be:

1. prevent unnecessary mutation before CURRENT_USER,
2. obtain authoritative gateway/provider cache receipts when available,
3. guard byte-stability of genuinely cache-critical early prompt regions,
4. only later consider moving immutable SimCore material earlier, under a dedicated semantic regression campaign.

Working name:

```text
CACHE_SHADOW
= a stable block located after an unavoidable earlier prefix break
```

Cache Shadow is not a defect; it is an optimization-limit observation.

## 4. Candidate A — Gateway Cache Receipt Adapter

Highest-value observability candidate.

If the host/gateway exposes authoritative cache metadata in response usage, headers, or normalized provider metadata, SimCore may read it without changing the request.

Conceptual normalized result:

```ts
{
  authority: "GATEWAY" | "PROVIDER" | "NONE",
  cacheReadTokens: number | null,
  cacheWriteTokens: number | null,
  cachedPromptTokens: number | null,
  totalPromptTokens: number | null,
  scope: string | null,
  source: string
}
```

Rules:

```text
no authoritative field → provider cache UNVERIFIED
field present → report only what the gateway/provider actually reports
never infer a hit from local prefix stability alone
no request mutation in v1
```

Value:

- turns cache discussion from heuristic to evidence,
- allows real A/B measurement across reload/update,
- makes future cache optimization attributable.

### 4A. Feasibility finding — Local Usage Dashboard already observes the required class of evidence

Repository evidence from `plugins/usage-dashboard` confirms that the local Usage Dashboard already owns an independent, privacy-bounded cache observer over authenticated sanitized `LLMGateway /logs`.

Its existing parser recognizes gateway/provider cache fields including:

```text
cachedTokens
cacheWriteTokens
cacheWrite5mTokens
cacheWrite1hTokens
cacheReadInputTokens
cacheCreationInputTokens
cachedContentTokenCount
OpenAI cached-token detail fields
```

The observer deliberately separates:

```text
gateway request HIT / replay semantics
provider cache Read tokens
provider cache Write tokens
cached total
unknown / unavailable
```

A particularly important fidelity rule already exists:

```text
LLMGateway `cachedTokens`
→ treated as explicit provider cache Read only when the object is clearly an LLMGateway log row
   (request identity + request timestamp + gateway log cache fields)
```

Generic cached-token fields are not blindly promoted to explicit Read authority.

This materially changes Candidate A feasibility:

```text
CACHE_RECEIPT_DATA_AVAILABILITY
= VERIFIED IN LOCAL USAGE DASHBOARD

SIMCORE_INTEGRATION_BOUNDARY
= NOT YET FROZEN
```

Usage Dashboard 5.50 also intentionally removed its earlier Provider Manager IPC dependency and moved to its own independent bridge observer. Therefore there is no current architectural basis for casually making SimCore depend on Usage Dashboard as a required runtime service.

Preferred research boundary:

```text
Usage Dashboard
= reference implementation + independent gateway/cache evidence authority

SimCore
= remains independent
= provider cache stays UNVERIFIED unless a bounded supported receipt path is explicitly designed
```

Possible future integration choices, in order of preference:

```text
A. manual/cross-diagnostic correlation only
   → zero plugin coupling

B. optional bounded read-only receipt surface
   → only if a supported plugin IPC/public bridge contract is deliberately added
   → Usage Dashboard absence must degrade to UNVERIFIED

C. duplicate LLMGateway /logs observer inside SimCore
   → avoid by default because it duplicates auth/parser/network ownership
```

Do not copy the Usage Dashboard bridge wholesale into SimCore.
Do not add a required SimCore→Usage Dashboard dependency during an unrelated mini.

## 5. Candidate B — Cache ABI / Prefix Stability CI Gate

Use existing compiler tiers as release contracts.

Introduce a build-time fixture that snapshots byte-identical cache-critical compiler output across representative modes.

Conceptual gate:

```text
compatible patch release
→ stable tier MUST remain byte-identical
→ slow tier may change only with explicit semantic approval
→ volatile/full may change according to fixtures
```

Possible CI output:

```text
CACHE_ABI stable SAME
CACHE_ABI slow SAME
CACHE_ABI volatile EXPECTED_CHANGED
CACHE_PREFIX_BREAK before-current-user NONE
```

Unexpected stable/slow mutation fails CI unless the release explicitly declares a cache ABI change.

This is low-risk because it protects serialization stability without changing runtime behavior.

## 6. Candidate C — Deterministic Serialization Hardening

Audit cache-critical prompt builders for unnecessary byte churn:

```text
object/key order
whitespace
newline shape
optional-field ordering
version banners
runtime boot IDs
timestamps
random/debug metadata
```

Stable/slow material should not include values that change every process/turn unless semantically required.

Rule:

> If two requests carry the same stable semantic contract, the stable serialized bytes should be identical.

Do not normalize user/history text to achieve this.

## 7. Candidate D — Two-Plane Prompt Architecture

High-value but high-risk future research.

Split SimCore guidance conceptually into:

```text
STABLE CONTRACT PLANE
- immutable/rarely-changing semantic rules
- potentially placed in an earlier cache-critical prompt region

TURN RUNTIME PLANE
- mode
- lifecycle
- timestamps
- current authority
- per-turn derived facts
- remains TAIL_AFTER_CURRENT_USER
```

Potential benefit:

```text
large immutable SimCore contract becomes reusable before the per-turn break
while volatile authority remains close to the current user turn
```

Hard constraints:

- do not duplicate contradictory rules,
- do not move current authority away from the current-user boundary casually,
- no placement change inside an ordinary mini,
- requires full behavior differential across B_START/B_CONTINUE/B_END/C, Summary, secondary activation, Exposure, Community, Edit/Representation, and long-chat live gates.

Classification:

```text
RESEARCH / POST-MAJOR / DEDICATED REGRESSION CAMPAIGN
```

## 8. Candidate E — Prefix Mutation Budget

Extend cache diagnostics from one first-break line into a bounded prefix-mutation budget.

Example:

```text
Prefix budget:
host/system       358,694 chars · SAME
stable rules       12,400 chars · SAME
history reusable  63 messages   · SAME
first mutation    @64 assistant  · PRE_SIMCORE
current user      after break
runtime tail      CACHE_SHADOW
```

This makes it obvious which byte region is worth optimizing.

No raw bodies retained.

## 9. Candidate F — Cache Family / Route Affinity Observation

If gateway metadata exposes provider route/model/cache scope identity, record a bounded family key.

Goal:

```text
same prompt prefix but route/cache-scope changed
→ distinguish ROUTE_AFFINITY_RESET from prompt mutation
```

Do not attempt provider pinning until an actual supported gateway control is verified and measured.

Potential diagnostic:

```text
Gateway cache scope: SAME / CHANGED / UNAVAILABLE
Route family: SAME / CHANGED / UNAVAILABLE
```

Classification:

```text
OBSERVE FIRST
```

## 10. Candidate G — TTL / Cadence Correlation

Current cache trajectory already tracks request cadence.

If authoritative gateway/provider TTL/cache-age metadata becomes available, correlate:

```text
request cadence
↔ cache receipt
↔ prefix family
```

Then distinguish:

```text
prefix changed
vs
cache expired
vs
route/cache-scope changed
```

Without authoritative TTL metadata, keep this heuristic-only and do not label expiration as fact.

## 11. Candidate H — Cache Health Mini-Widget

Possible later UI sibling to the Warning mini-widget.

Healthy/default state should remain quiet.

Optional expanded diagnostic surface could show only bounded fields:

```text
Prefix reuse 85%
First break PRE_SIMCORE
Gateway cache VERIFIED/UNVERIFIED
Cross-reload continuity RESTORED/FRESH
```

Do not create a permanent noisy dashboard unless actual long-chat use justifies it.

## 12. Explicit non-candidates / rejected shortcuts

Do not pursue without extraordinary evidence:

```text
synthetic model requests solely to warm cache
rewriting chat history to manufacture prefix reuse
weakening Deferred Mirror or Representation safety for cache stability
moving the entire runtime before CURRENT_USER merely for cache metrics
claiming provider hits from local fingerprints
adding large persistent raw prompt snapshots
changing routing/provider automatically based on cache heuristics
```

## 13. Proposed research order

Updated after Usage Dashboard evidence:

```text
v0.64.7 live close
→ use Usage Dashboard as the existing gateway/cache evidence source
→ characterize which receipt fields are available in actual long-chat requests
→ decide whether manual correlation is sufficient or an optional bounded receipt surface is justified
→ Candidate B: Cache ABI CI gate
→ Candidate C: deterministic serialization audit
→ observe real first-break distribution against actual provider Read/Write evidence
→ only if early SimCore-owned bytes are a measured limiter:
   Candidate D: Two-Plane Prompt Architecture research
```

This ordering follows:

```text
Observe
→ Attribute
→ Correlate
→ Verify
→ Stabilize
→ Optimize
```

## 14. Current classification

```text
CACHE_RECEIPT_DATA           VERIFIED AVAILABLE VIA LOCAL USAGE DASHBOARD
CACHE_RECEIPT_INTEGRATION    DESIGN OPEN / KEEP PLUGINS DECOUPLED BY DEFAULT
CACHE_ABI_CI                 HIGH VALUE / LOW RUNTIME RISK
DETERMINISTIC_SERIALIZATION  MEDIUM-HIGH VALUE / EVIDENCE-GATED
TWO_PLANE_PROMPT             POTENTIALLY VERY HIGH VALUE / HIGH RISK
PREFIX_MUTATION_BUDGET       OBSERVABILITY / LOW RISK
ROUTE_AFFINITY               GATEWAY-DEPENDENT / VERIFY FIELDS FIRST
TTL_CORRELATION              GATEWAY-DEPENDENT / OBSERVE FIRST
CACHE_HEALTH_WIDGET          UX CANDIDATE / LATER
```

No item in this document is an active production change yet.
