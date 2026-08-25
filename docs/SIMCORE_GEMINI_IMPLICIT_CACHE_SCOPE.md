# SimCore Gemini Implicit Cache Scope

Date: 2026-08-25
Status: `OPERATING SCOPE FROZEN · IDEA/RESEARCH ONLY · NO RUNTIME CHANGE`
Related: `docs/SIMCORE_IMPLICIT_PROMPT_CACHE_IDEA_LAB.md`

## 1. Operating assumption

The intended SimCore cache-research environment is Gemini-focused rather than multi-provider.

```text
provider target: Gemini
primary provider mechanism: implicit prompt/context caching
SimCore optimization concern: prompt-cache friendliness / prefix stability
explicit cache management: OUT OF SCOPE by default
```

This intentionally removes pressure to build a generic cross-provider cache abstraction inside SimCore.

### 1A. Frozen two-axis scope

For SimCore cache work, the active concern is deliberately limited to two coupled axes:

```text
AXIS A — GEMINI IMPLICIT CACHING
= what Gemini / the gateway actually reuses
= observed through authoritative cached-token/cache receipt evidence when available

AXIS B — PROMPT CACHING FRIENDLINESS
= how well SimCore preserves a large reusable prompt prefix
= byte stability / first-break ownership / compiler cache ABI / prompt layout
```

The product goal is not to build a cache manager. It is:

```text
make the prompt naturally cache-friendly
+
measure whether Gemini's implicit cache actually reused it
```

All future cache ideas should first be evaluated against these two axes. Work that does not materially improve or explain either axis is out of scope unless separately justified.

## 2. Why implicit-first

Current Gemini documentation states that implicit caching is enabled automatically on Gemini 2.5+ models and recommends:

```text
large/common content toward the beginning of the prompt
similar request prefixes within a relatively short interval
```

The response usage surface can expose the amount of cached tokens, depending on the Gemini API surface/gateway normalization.

Explicit caching introduces additional operational ownership such as explicit cache-resource creation and lifetime/TTL management. SimCore does not need to assume that responsibility for the intended workflow unless later evidence creates a compelling case.

Therefore:

```text
implicit cache cooperation = PRIMARY
prompt cache friendliness = PRIMARY
explicit cache orchestration = NON-GOAL / DEFERRED
```

## 3. Existing local evidence source

The repository-local Usage Dashboard already contains an independent, sanitized LLMGateway cache observer and Gemini-aware parsing. Its parser recognizes Gemini cached-content token metadata as one provider cache evidence shape.

This means the research problem is not primarily “how do we scrape cache data?” anymore.

The remaining problem is:

```text
Usage Dashboard = actual gateway/provider cache receipt evidence
SimCore = request-prefix / compiler / first-break evidence

How do we correlate those two evidence planes safely?
```

Do not make Usage Dashboard a mandatory SimCore runtime dependency merely because it already observes the gateway.

## 4. Gemini-first receipt model

For research, prefer a deliberately small Gemini receipt rather than a generic provider schema.

Conceptual fields:

```text
request correlation identity
model / bounded route family if available
prompt/input tokens
cached tokens / cache-read evidence exposed by the actual gateway schema
cache-write evidence if the gateway exposes it
captured timestamp
metric source / authority
```

Unknown fields remain unknown.

Do not infer a provider cache hit from SimCore prefix fingerprints alone.

## 5. Main optimization target

Because Gemini implicit caching is prefix-oriented, the optimization question becomes:

```text
How much large/common prefix remains byte-stable before the first meaningful mutation?
```

Priority:

```text
1. preserve stable early prefix bytes
2. identify PRE_SIMCORE vs SIMCORE-owned first break
3. correlate with actual Gemini cached-token evidence
4. protect cache ABI in CI
5. only then consider structural prompt placement changes
```

Current `TAIL_AFTER_CURRENT_USER` remains protected. A large stable SimCore block placed after an earlier per-turn break may be `CACHE_SHADOW`; do not move it earlier without a dedicated regression campaign.

## 6. Research candidates under Gemini-only scope

```text
A. Gemini cache receipt correlation
   HIGH VALUE / OBSERVABILITY FIRST

B. Cache ABI CI for SimCore stable/slow compiler tiers
   HIGH VALUE / LOW RUNTIME RISK

C. Prefix Mutation Budget
   HIGH VALUE / LOW RISK

D. deterministic serialization hardening
   EVIDENCE-GATED

E. Gemini route/cache-scope correlation
   ONLY IF gateway exposes bounded evidence

F. Two-Plane Prompt Architecture
   POST-MAJOR / HIGH RISK / DEDICATED REGRESSION CAMPAIGN
```

## 7. Explicit non-goals

```text
multi-provider compatibility layer for its own sake
explicit Gemini cache object creation/TTL orchestration
synthetic requests merely to warm cache
history rewriting to manufacture reuse
weakening correctness/Mirror/Representation safety for cache metrics
claiming cache HIT without authoritative receipt evidence
```

## 8. Current decision

```text
SIMCORE_CACHE_RESEARCH_PROVIDER_SCOPE = GEMINI_ONLY_FOR_CURRENT_OPERATION
SIMCORE_CACHE_AXIS_A = GEMINI_IMPLICIT_CACHING
SIMCORE_CACHE_AXIS_B = PROMPT_CACHING_FRIENDLINESS
SIMCORE_CACHE_STRATEGY = IMPLICIT_FIRST
EXPLICIT_CACHE = DEFERRED / NON-GOAL
USAGE_DASHBOARD = EXISTING EVIDENCE SOURCE, NOT REQUIRED DEPENDENCY
NEXT RESEARCH VALUE = REQUEST-LEVEL CORRELATION + CACHE ABI
```

No production version is assigned by this document.
