# SimCore Post-3.0M Follow-up Design Catalog — 2026-09-01

Date: 2026-09-01 KST

Status: **FOLLOW-UP DESIGN CATALOG FROZEN · DESIGN-ONLY · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · FOLLOW-UP DESIGN OPTIONS · ROADMAP CATALOG**

## 0. Purpose

3.0M Source Intelligence design has converged for the first-major family set:

```text
LIVE_REACTION
BOARD
NEWS
```

This document catalogs the major follow-up design directions that remain available after 3M-10. It does not authorize implementation, deployment, release, target-host execution, or any `release-simcore` mutation.

Canonical distinction:

```text
FOLLOW-UP DESIGN OPTION
!=
NEXT IMPLEMENTATION TASK
```

## 1. Primary follow-up lanes

Five broad lanes remain.

```text
A. New source-family expansion
B. Candidate C / durable derived-object semantics
C. Multi-family orchestration
D. User interaction / external materialization
E. Legacy migration / compatibility cleanup
```

A sixth lane exists only to prepare a future runtime implementation:

```text
F. Runtime-enabling contracts
```

Lane F is not a new product family; it exists to close 3M-10 G1–G8 when implementation is separately authorized.

## 2. Lane A · New source-family expansion

### A1 · SOCIAL_FEED

Purpose:

```text
profile-like actor surface
post
reply
repost / quote
reaction metrics when semantically authorized
feed-oriented presentation grammar
```

Why it is valuable:

- it is the most natural next family after BOARD;
- it tests actor/profile semantics and non-tree relationship edges;
- it materially differentiates presentation from BOARD and NEWS.

Main design pressure:

```text
snapshot-local actor identity
vs
cross-turn account identity
```

The first safe design should default to snapshot-only unless durable account continuity is explicitly required.

Candidate C pressure:

- low if snapshot-only;
- high if accounts, posts, or repost graphs persist across turns.

Recommended priority: **HIGH**.

### A2 · PUBLIC_KNOWLEDGE settlement

Purpose:

Define when an exposed/public claim may become a settled public-reference projection rather than merely a report/reaction.

Required questions:

```text
what counts as settled?
what remains attributed-but-unsettled?
what is contested?
what is corrected / withdrawn?
can repeated NEWS reports raise settlement? (default: no)
what authority owns settlement?
how does invalidation work?
```

Canonical rule:

```text
NEWS EXISTS
!=
PUBLIC KNOWLEDGE SETTLED
```

Candidate C pressure:

- moderate to high if public-reference documents survive or revise across turns.

Recommended priority: **HIGH, but after SOCIAL_FEED unless settlement is immediately needed**.

## 3. Lane B · Candidate C / durable derived-object semantics

3M-6 froze Candidate C as conditionally ready but not activated. This lane should open only when a concrete product requirement crosses one of the C1–C8 conditions.

### B1 · Source History Store / Controlled Re-entry

Triggered by:

```text
source-derived content intentionally survives into future turns
or
source-derived content is deliberately re-injected into model context
```

Design questions:

```text
what survives?
for how long?
under what identity?
what proves freshness?
what invalidates it after reroll/edit?
what exact bytes may re-enter context?
how is legacy <COMMUNITY> duplication prevented?
```

This activates Candidate C C1/C6.

### B2 · Stable Source Identity

Triggered by persistent BOARD/SOCIAL_FEED actors, posts, articles, or threads.

Design questions:

```text
stable ID owner
scope and lifetime
reroll/edit generation
replacement semantics
identity reuse rules
```

This activates C2.

### B3 · Item-level mutation / reroll / edit / delete

Examples:

```text
reroll one post
edit one reply
remove one source-local item
append a new reply to an existing thread
```

This activates C3/C4 and requires explicit descendant invalidation and reconciliation semantics.

### B4 · Partial descendant survival

Triggered when source authority changes but some derived children must remain valid.

Current first-major policy is whole-projection invalidation. Partial survival would activate C7 and require a real derived lineage contract.

Recommended priority for Lane B: **CONDITIONAL ONLY**. Do not open it speculatively.

## 4. Lane C · Multi-family orchestration

### C1 · Simultaneous source families

Example:

```text
one current event
→ LIVE_REACTION
+ BOARD
+ NEWS
```

3M-9 forbids this by default.

A follow-up design would need:

```text
scheduler / authority owner
family fanout limits
shared source support without shared truth ownership
cost budget
partial family failure behavior
presentation ordering
cancellation / reroll behavior
```

Canonical rule must remain:

```text
FAMILY A OUTPUT
!=
FAMILY B TRUTH AUTHORITY
```

Recommended priority: **MEDIUM**.

### C2 · Cross-family propagation

Example:

```text
BOARD rumor
→ later NEWS story as attributed rumor
```

This is not equivalent to simultaneous fanout. It creates derived-to-derived lineage pressure and activates Candidate C C5.

Design must prove whether the later family consumes:

```text
canonical/current authority
or
an attributed derived-source object
```

without upgrading derived content into canon.

Recommended priority: **LATER / HIGH RISK**.

## 5. Lane D · User interaction / external materialization

### D1 · Interactive BOARD

Potential actions:

```text
write post
reply
edit
remove
reroll one item
react / recommend
```

These are intent and mutation semantics, not mere UI controls.

Most of them activate Candidate C C2–C4.

Recommended priority: **MEDIUM after snapshot families are mature**.

### D2 · Interactive SOCIAL_FEED

Potential actions:

```text
post
reply
quote/repost
follow-like local intent
reaction
```

This should not be designed before SOCIAL_FEED semantic ownership is frozen.

### D3 · Network / media materialization

Examples:

```text
remote image fetch
generated avatar/image
external media attachment
asynchronous article asset
```

This activates delayed-side-effect concerns and Candidate C C8 when results must attach back to an exact semantic object.

Required design:

```text
operation identity
late-result ownership
stale-result rejection
cleanup
failure isolation
network/media budget
```

Recommended priority: **LOW until core semantic families are proven**.

## 6. Lane E · Legacy migration / compatibility cleanup

### E1 · Legacy `<COMMUNITY>` host-history migration

3M-7 intentionally preserved current host transcript behavior.

A follow-up design may ask whether legacy Community should stop automatically occupying future host context once structured source presentation exists.

This is not a Source Intelligence memory feature. It crosses:

```text
host request construction
representation
edit reconcile
legacy compatibility
Context Projection semantic-safety proof
```

The existing `ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY` blocker remains relevant.

Recommended priority: **LATER, after structured runtime exists and coexistence evidence is available**.

### E2 · Legacy Community presentation convergence

Question:

```text
when structured LIVE_REACTION exists,
should legacy <COMMUNITY> remain user-visible,
be transformed,
or become compatibility-only?
```

This requires migration semantics and must not silently change future context behavior.

Recommended priority: **LATER**.

## 7. Lane F · Runtime-enabling contracts

These are not post-3M feature families. They are the design gates required before a future 3.0M runtime implementation.

3M-10 already freezes:

```text
G1 then-current production re-preflight
G2 Exposure target-host mechanics / model compliance
G3 current source-job selector authority
G4 structured sidecar producer / transport
G5 presentation host mount authority
G6 concrete family hard caps
G7 NEWS trusted maturity-context producer
G8 integration evidence instrumentation
```

Do not confuse this lane with product expansion.

## 8. Recommended sequencing

If the goal is to continue **design exploration** rather than prepare implementation, the recommended order is:

```text
1. SOCIAL_FEED family design
2. PUBLIC_KNOWLEDGE settlement design
3. reassess whether either design actually activates Candidate C
4. multi-family orchestration
5. interactive source mutation
6. legacy Community migration
7. network/media materialization
```

Reason:

```text
new semantic families first
→ learn actual product needs
→ activate persistence/provenance only when demanded
```

This preserves the 3.0M rule:

```text
DO NOT BUILD DURABLE SOURCE INFRASTRUCTURE
BEFORE A CONCRETE CONSUMER REQUIRES IT
```

## 9. Practical choice matrix

```text
Want the most visually/socially interesting next family?
→ SOCIAL_FEED

Want the deepest truth/knowledge architecture problem?
→ PUBLIC_KNOWLEDGE

Want source objects to remember and evolve across turns?
→ Candidate C / Source History / Stable Identity

Want several source surfaces at once?
→ Multi-family Orchestration

Want users to write/reply/edit inside source UI?
→ Interactive Source Mutation

Want image/media/network effects?
→ External Materialization

Want to clean up old <COMMUNITY> behavior?
→ Legacy Migration
```

## 10. Current recommendation

For the next design-only transaction:

```text
PRIMARY RECOMMENDATION = SOCIAL_FEED
SECONDARY              = PUBLIC_KNOWLEDGE SETTLEMENT
```

Why SOCIAL_FEED first:

- it extends the current semantic family system without immediately requiring persistence;
- it exercises richer identity and relationship structure than BOARD;
- it gives the Presentation Renderer architecture a materially different surface;
- it lets us discover whether stable account identity is truly needed before activating Candidate C.

## 11. Frozen state

```text
POST_3M_FOLLOWUP_CATALOG       = FROZEN
RUNTIME_IMPLEMENTATION         = NOT_AUTHORIZED
NEXT_DESIGN_REQUIRED           = USER_SELECTED
DEFAULT_RECOMMENDATION         = SOCIAL_FEED
PUBLIC_KNOWLEDGE               = AVAILABLE NEXT OPTION
CANDIDATE_C                     = CONDITIONAL / CLOSED UNTIL TRIGGERED
MULTI_FAMILY_FANOUT             = DEFERRED
SOURCE_HISTORY / RETRIEVAL      = DEFERRED
NETWORK / MEDIA                 = DEFERRED
LEGACY_COMMUNITY_MIGRATION      = DEFERRED
PRODUCTION                      = UNCHANGED
release-simcore                 = UNCHANGED
```
