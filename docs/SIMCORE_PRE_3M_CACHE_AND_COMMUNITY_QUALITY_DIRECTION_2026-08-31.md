# SimCore Pre-3M Cache-First Direction

Date: 2026-08-31 KST
Status: DIRECTION CORRECTED · TOKEN-MILESTONE CADENCE CLARIFIED · CACHE PROGRAM FIRST · 3M MAJOR GATED BY CACHE CLOSURE · NO IMPLEMENTATION AUTHORITY
Classification: PRODUCT ROADMAP / TOKEN-MILESTONE CADENCE / PRE-3M CACHE PROGRAM / IDEA PARKING

## 0. Terminology correction

In this roadmap vocabulary, `M` milestones refer to the user's long-chat cumulative token count, **not** to the SimCore runtime version number.

Canonical interpretation:

```text
1.0M tokens  ~= 1,000,000 cumulative chat tokens
1.5M tokens  ~= 1,500,000 cumulative chat tokens
2.0M tokens  ~= 2,000,000 cumulative chat tokens
2.5M tokens  ~= 2,500,000 cumulative chat tokens
3.0M tokens  ~= 3,000,000 cumulative chat tokens
```

SimCore runtime versions continue independently on their normal `v0.x` line.

Therefore:

```text
MILESTONE LABEL != RUNTIME VERSION NUMBER
```

## 1. General token-milestone update cadence

The project's update cadence is anchored to cumulative long-chat token milestones:

```text
whole-million milestone
1M / 2M / 3M / 4M / ...
→ major-update planning landmark

half-million milestone
1.5M / 2.5M / 3.5M / ...
→ medium-update planning landmark
```

This is a scheduling/planning rhythm, not an automatic implementation authority.

A milestone says **when the project normally considers a larger update**, not that unresolved prerequisite work must be abandoned to hit the ceremony exactly.

Canonical rule:

```text
TOKEN_MILESTONE_REACHED = planning landmark
PREREQUISITE_GATES_CLOSED = required before the corresponding update begins
```

This also explains why a major update can naturally absorb work that might otherwise have become the following medium update. If the major program already solves those medium-scale goals as necessary prerequisites, the project does not preserve artificial work merely to satisfy the half-million milestone.

## 2. Current 3M priority

For the upcoming 3M token milestone, the current product priority is:

```text
finish the current production/live gate
→ complete the currently justified cache/cost program
→ only after cache closure begin the 3M major update in earnest
```

If the long chat reaches or passes approximately 3,000,000 cumulative tokens before caching is closed, the 3M major update remains blocked.

Canonical rule:

```text
TOKEN_MILESTONE_3M_REACHED = informational/planning landmark
CACHE_PROGRAM_CLOSED = required gate

if token milestone reached && cache program open:
    continue cache program
    do not start 3M major
```

## 3. Cache-first program rule

Caching is not treated as one optional mini. Continue the cache/cost lane until the **currently justified SimCore-owned, source-proven cache work is closed cleanly**.

Closure does not mean chasing impossible perfect caching forever. Every currently justified cache surface must reach one terminal state:

```text
FIXED
PROVEN NOT SIMCORE-OWNED
DEFERRED WITH EXPLICIT EXTERNAL/PROVIDER BOUNDARY
BLOCKED BY MISSING AUTHORITATIVE TELEMETRY
```

Only after that closure may the 3M product-major program begin.

## 4. Why cache first

The motivation is both operational and monetary.

A future major feature program may increase prompt complexity or eventually introduce auxiliary semantic work. It is preferable to understand and reduce avoidable input/cache cost before expanding the product surface.

Desired outcome:

```text
same or better correctness
same or better main-model quality
less avoidable unstable prefix
more provider-cache reuse when supported
lower billed input cost when authoritative evidence confirms it
```

Cost reduction never outranks correctness, state safety, or main-model isolation.

## 5. Existing cache foundation

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

The cache program should begin from exact request-shape/source evidence, not from inventing another generic cache subsystem.

## 6. Hard cache distinction

Keep these separate:

```text
LOCAL PREFIX STABILITY
!= LOCAL JAVASCRIPT CACHE
!= GATEWAY CACHE
!= PROVIDER PROMPT CACHE
!= BILLED CACHED TOKENS
```

Provider cache remains `UNVERIFIED` without authoritative provider/gateway telemetry or billing evidence.

A local fingerprint match can prove SimCore produced a stable prefix. It does not by itself prove monetary savings.

## 7. First cache question

Every cache optimization first asks:

```text
Where is the earliest avoidable request-prefix break,
and who owns it?
```

If the earliest meaningful break is outside SimCore, for example:

```text
PRE_SIMCORE / HOST_PREFIX
CHAT_HISTORY representation controlled by the host
provider-side behavior not exposed to the plugin
```

then SimCore must not manufacture a runtime rewrite merely to improve a local cache metric.

If exact audit identifies SimCore-owned avoidable volatility, only that bounded surface should change.

## 8. Cache program work classes

Potentially valid work, subject to evidence:

- remove semantically unnecessary volatility from compiler tiers;
- preserve byte/representation stability for semantically identical SimCore prompt components;
- reduce duplicate cache-topology/history work when bounded evidence already exists;
- preserve history identity where SimCore owns it;
- identify avoidable prefix breaks introduced by runtime metadata or diagnostics;
- measure cache-attribution cost so diagnostics do not erase the benefit they measure;
- capture provider/gateway cached-token receipts if exposed safely;
- correlate authoritative billing/cache evidence with stable request shapes where possible.

Forbidden shortcuts:

- moving verified runtime prompt placement solely for a cache metric;
- weakening Deferred Mirror, edit-reconcile, lineage, or history identity safety;
- direct historical-chat rewrite to fabricate stable prefixes;
- dropping required context merely to increase cache reuse;
- claiming provider-cache hits from local equality alone;
- adding provider/network calls merely to interrogate cache state;
- combining cache work with unrelated Community/Source feature development in one release.

## 9. Cache completion gate

Before the roadmap considers the cache program closed, evidence should answer the following as far as the host/provider permits:

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
   cold/warm, ordinary, reroll/edit, and long-history behavior remain healthy for touched surfaces

H. DOCUMENT CLOSURE
   remaining WATCH / DEFER / external boundaries recorded before moving on
```

The cache program may span multiple narrow runtime releases if evidence reveals independent owners. Do not force unrelated cache findings into one giant release.

## 10. 3M token milestone gate

The 3M long-chat token milestone is the normal major-update landmark, but not an override of the cache prerequisite.

```text
< 3,000,000 tokens + cache open
→ work cache

>= 3,000,000 tokens + cache open
→ still work cache
→ 3M major remains blocked

>= 3,000,000 tokens + cache closed
→ 3M major design may begin, subject to fresh design selection
```

Crossing the token milestone must not pressure the project into leaving cache debt behind.

Likewise, cache closure does not automatically freeze a specific major theme. The future 3M major theme is selected from fresh post-cache evidence.

## 11. Community / HunterNet-like idea posture

The HunterNet reference remains useful inspiration, but it is **parked as an idea** rather than scheduled work.

Preferred product interpretation remains:

```text
not: add a universal HUNTERNET primitive

instead, if promoted later:
upgrade existing <COMMUNITY> quality
through generic source/community texture
```

Potential reusable ideas include:

```text
source-local voice diversity
anonymous / pseudonymous / role-visible identity texture
post ↔ comment coherence
source-appropriate slang and status cues
reaction timing / reachability
fact vs rumor vs joke vs opinion quarantine
bounded old-Community context
```

None currently create implementation or scheduling authority.

## 12. Main-model boundary for any later Community work

If Community Quality is promoted later, preserve:

```text
SimCore plugin
  owns source policy / exposure / timing / state / validation / bounded context

main model
  renders natural language inside those constraints
```

A richer Community surface must not justify injecting large historical sidecar state into the primary model request.

## 13. Updated roadmap

```text
1. close current production/live gate

2. CACHE / COST PROGRAM
   investigate exact first-break ownership
   implement only source-proven bounded fixes
   validate each release independently
   continue until currently justified SimCore-owned cache work is closed
   preserve provider-cache UNVERIFIED where external telemetry is absent

3. CACHE PROGRAM CLOSE
   record FIX / WATCH / DEFER / external-provider boundaries
   confirm semantic and long-chat non-regression

4. 3M TOKEN MILESTONE / MAJOR UPDATE
   approximately 3,000,000 cumulative long-chat tokens is the normal major landmark
   major work may begin only after cache closure
   token count alone never authorizes it
   re-open candidate map with fresh post-cache evidence

PARKED IDEA
   HunterNet-like Community quality upgrade
```

## Disposition

```text
MILESTONE_SYSTEM = LONG_CHAT CUMULATIVE TOKEN COUNT
WHOLE_MILLION_MILESTONE = MAJOR-UPDATE PLANNING LANDMARK
HALF_MILLION_MILESTONE = MEDIUM-UPDATE PLANNING LANDMARK
MILESTONE_SYSTEM != RUNTIME VERSION NUMBER

3M_MEANING = LONG_CHAT CUMULATIVE TOKEN MILESTONE (~3,000,000)
PRE_3M_PRIMARY_PROGRAM = CACHE / COST
CACHE_PROGRAM = REQUIRED GATE BEFORE 3M MAJOR
TOKEN_3M_REACHED_WHILE_CACHE_OPEN = CONTINUE CACHE / DO NOT START MAJOR
CACHE_WORK MAY SPAN MULTIPLE NARROW RELEASES

COMMUNITY_QUALITY = PARKED IDEA / REFERENCE-BACKED OPTION
HUNTERNET_AS_SEPARATE_PRODUCT_PRIMITIVE = NOT PREFERRED
HUNTERNET_QUALITY_PATTERNS = PRESERVED AS GENERIC COMMUNITY INSPIRATION

CACHE + COMMUNITY IN ONE RELEASE = FORBIDDEN
3M FEATURE SCOPE = UNFROZEN
IMPLEMENTATION AUTHORITY = NONE
```

No runtime, `release-simcore`, `latest.js`, `install.js`, release-system, current runtime semantics, cache implementation, Community implementation, or 3M implementation authority is changed by this direction correction.
