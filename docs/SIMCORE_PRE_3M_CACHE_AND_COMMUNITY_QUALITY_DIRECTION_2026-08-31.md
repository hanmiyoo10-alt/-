# SimCore Pre-3.0M Cache-First Direction

Date: 2026-08-31 KST
Status: DIRECTION UPDATED · CACHE PROGRAM FIRST · 3.0M SCOPE UNFROZEN · NO IMPLEMENTATION AUTHORITY
Classification: PRODUCT ROADMAP / PRE-3M CACHE PROGRAM / IDEA PARKING

## Context

The 2.0M M-series architecture is complete and frozen at M2-6. A separate candidate map records possible future 3.0M themes, including Source Intelligence.

The current product priority is now clarified:

```text
finish the current v0.70.1 live gate
→ complete the currently justified cache/cost program
→ only then begin the next major 3.0M design in earnest
```

The previously discussed HunterNet-like Community upgrade remains an idea/reference direction only. It is not scheduled as a mandatory pre-3.0M release and is not part of a frozen 3.0M scope.

## 1. Cache-first program rule

Caching is no longer treated merely as one optional mini before 3.0M. The preferred roadmap is to keep working the cache/cost lane until the **SimCore-owned, source-proven caching work is closed cleanly**.

This does not mean chasing an impossible notion of perfect caching forever. Closure means that every currently justified cache surface has reached one of these terminal states:

```text
FIXED
PROVEN NOT SIMCORE-OWNED
DEFERRED WITH EXPLICIT EXTERNAL/PROVIDER BOUNDARY
BLOCKED BY MISSING AUTHORITATIVE TELEMETRY
```

Only after that closure should a new broad 3.0M product-major program be frozen.

## 2. Why cache first

The motivation is both operational and monetary.

A future Source/Sidecar major may increase prompt complexity or eventually introduce auxiliary semantic work. It is therefore preferable to understand and reduce avoidable input/cache cost before expanding the product surface.

The desired outcome is:

```text
same or better correctness
same or better main-model quality
less avoidable unstable prefix
more provider-cache reuse when the provider supports it
lower billed input cost when authoritative billing evidence confirms it
```

Cost reduction must never outrank correctness, state safety, or main-model isolation.

## 3. Existing cache foundation

SimCore already contains substantial cache-readiness and attribution infrastructure:

```text
Prompt Cache First guidance
CHAT_HISTORY / CURRENT_USER / SIMCORE_RUNTIME first-break ownership
stable / slow / volatile / full compiler tiers
runtime-cache and runtime-cache-candidates ownership
cache topology timing
cache candidate cost observation
history representation fingerprinting
Current Task / history stability controls
v0.70.1 bounded post-onSend attribution for CACHE_TOPOLOGY / CACHE_CANDIDATE
```

Therefore the cache program should begin from exact request-shape/source evidence, not by inventing another generic cache subsystem.

## 4. Hard cache distinction

Keep these separate at all times:

```text
LOCAL PREFIX STABILITY
!= LOCAL JAVASCRIPT CACHE
!= GATEWAY CACHE
!= PROVIDER PROMPT CACHE
!= BILLED CACHED TOKENS
```

Provider cache remains `UNVERIFIED` without authoritative provider/gateway telemetry or billing evidence.

A local fingerprint match may prove that SimCore produced a stable prefix. It does not, by itself, prove monetary savings.

## 5. First cache question

Every cache optimization should first answer:

```text
Where is the earliest avoidable request-prefix break,
and who owns it?
```

If the earliest meaningful break is consistently outside SimCore, for example:

```text
PRE_SIMCORE / HOST_PREFIX
CHAT_HISTORY representation controlled by the host
provider-side behavior not exposed to the plugin
```

then SimCore must not manufacture a runtime rewrite merely to improve a local cache metric.

If exact audit identifies SimCore-owned avoidable volatility, only that bounded surface should be changed.

## 6. Cache program work classes

Potentially valid cache work, subject to evidence:

- remove semantically unnecessary volatility from compiler tiers;
- preserve byte/representation stability for semantically identical SimCore prompt components;
- reduce duplicate cache-topology/history work when the same bounded evidence is already available;
- preserve existing history identity where SimCore owns it;
- identify avoidable prefix breaks introduced by runtime metadata or diagnostics;
- measure cache-attribution cost so diagnostics do not erase the benefit they measure;
- capture provider/gateway cached-token receipts if the host exposes them safely;
- correlate authoritative billing/cache evidence with stable request shapes where possible.

Forbidden shortcuts:

- moving the verified runtime prompt placement solely for a cache metric;
- weakening Deferred Mirror, edit-reconcile, or history identity safety;
- direct historical-chat rewrite to fabricate stable prefixes;
- dropping needed context merely to increase cache reuse;
- claiming provider-cache hits from local equality alone;
- adding provider/network calls merely to interrogate cache state;
- combining cache work with unrelated Community/Source feature development in one release.

## 7. Cache completion gate

Before the roadmap considers the cache program closed, the evidence should answer the following as far as the host/provider permits:

```text
A. REQUEST SHAPE
   earliest break ownership understood for ordinary long chat

B. SIMCORE-OWNED VOLATILITY
   every source-proven avoidable instability fixed or explicitly deferred

C. SEMANTIC NON-REGRESSION
   main response quality / Current Task / continuity / Community / edit / reroll remain correct

D. STATE SAFETY
   no weakening of Deferred Mirror, persistence, lineage, or representation identity

E. LOCAL COST
   cache diagnostics/topology work remains bounded and does not become the latency hotspot

F. PROVIDER / BILLING EVIDENCE
   cached-token or cost effect measured when authoritative telemetry exists
   otherwise provider cache remains explicitly UNVERIFIED

G. REAL LONG-CHAT
   cold/warm, ordinary, reroll/edit, and long-history behavior remain healthy for the surfaces touched

H. DOCUMENT CLOSURE
   remaining WATCH / DEFER / external boundaries are recorded before moving on
```

The cache program may consist of multiple narrow minis if evidence reveals multiple independent owners. Do not force unrelated cache findings into one giant release.

## 8. Relationship between cache work and the 3.0M number

Version cadence and major-product scope are separate concepts.

It is possible that continued cache minis naturally advance the product/version line to the numerical 3.0M neighborhood before a new feature-major scope is frozen.

That is acceptable.

```text
reaching the 3.0M number through cache work
!= automatically freezing a new 3.0M feature architecture
```

Do not hold back justified cache work merely to preserve a clean version-number ceremony. Likewise, do not prematurely declare a broad 3.0M major only because the version counter reaches that boundary.

If cache investigation itself uncovers a genuinely major SimCore-owned architectural capability or change, that must be promoted through a separate evidence/design decision rather than assumed from version arithmetic.

## 9. Community / HunterNet-like idea posture

The HunterNet reference remains useful inspiration, but the current decision is to **park it as an idea rather than schedule it before 3.0M**.

Preferred product interpretation remains:

```text
not: add a universal HUNTERNET primitive

instead, if promoted later:
upgrade existing <COMMUNITY> quality
through generic source/community texture
```

Potential reusable ideas remain:

```text
source-local voice diversity
anonymous / pseudonymous / role-visible identity texture
post ↔ comment coherence
source-appropriate slang and status cues
reaction timing / reachability
fact vs rumor vs joke vs opinion quarantine
bounded old-Community context
```

But none of these currently create implementation or scheduling authority.

## 10. Main-model boundary for any later Community work

If Community Quality is promoted in the future, preserve:

```text
SimCore plugin
  owns source policy / exposure / timing / state / validation / bounded context

main model
  renders natural language inside those constraints
```

A richer Community surface must not turn into a reason to inject large historical sidecar state into the primary model request.

## 11. Updated roadmap hypothesis

```text
1. close current v0.70.1 real-long-chat gate

2. CACHE / COST PROGRAM
   investigate exact first-break ownership
   implement only source-proven bounded fixes
   validate each mini independently
   continue until currently justified SimCore-owned cache work is closed
   preserve provider-cache UNVERIFIED where external telemetry is absent

3. CACHE PROGRAM CLOSE
   record FIX / WATCH / DEFER / external-provider boundaries
   confirm semantic and long-chat non-regression

4. BEGIN 3.0M MAJOR DESIGN IN EARNEST
   re-open candidate map with fresh post-cache evidence
   choose the actual major theme then

PARKED IDEA
   HunterNet-like Community quality upgrade
   no mandatory placement before 3.0M
```

## 12. Why this sequencing is attractive

This ordering removes financial/cache uncertainty before broad feature expansion.

It also prevents the roadmap from forcing a speculative Community or Source feature simply because reference research produced attractive ideas.

The next major can then be selected from a cleaner base:

```text
M-series architecture debt closed
+
current v0.70.x correctness/performance evidence closed
+
cache/cost behavior understood as far as SimCore can control it
+
reference research preserved but not prematurely productized
```

That is a stronger starting point for a real 3.0M design.

## Disposition

```text
PRE_3M_PRIMARY_PROGRAM = CACHE / COST
CACHE_PROGRAM = COMPLETE BEFORE NEW BROAD 3.0M DESIGN FREEZE
CACHE_WORK MAY SPAN MULTIPLE MINI RELEASES
VERSION NUMBER MAY NATURALLY APPROACH/CROSS 3.0M DURING CACHE WORK
VERSION NUMBER != AUTOMATIC MAJOR-SCOPE AUTHORITY

COMMUNITY_QUALITY = PARKED IDEA / REFERENCE-BACKED OPTION
HUNTERNET_AS_SEPARATE_PRODUCT_PRIMITIVE = NOT PREFERRED
HUNTERNET_QUALITY_PATTERNS = PRESERVED AS GENERIC COMMUNITY INSPIRATION

CACHE + COMMUNITY IN ONE RELEASE = FORBIDDEN
3.0M FEATURE SCOPE = UNFROZEN
IMPLEMENTATION AUTHORITY = NONE
```

No runtime, `release-simcore`, `latest.js`, `install.js`, release-system, current v0.70.1 semantics, or future 3.0M implementation authority is changed by this direction update.
