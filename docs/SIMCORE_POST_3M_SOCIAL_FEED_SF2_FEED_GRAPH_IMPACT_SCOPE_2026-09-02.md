# SimCore Post-3.0M SOCIAL_FEED SF-2 Feed Graph Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-2 IMPACT SCOPE FROZEN · DESIGN-ONLY · CURRENT-SNAPSHOT GRAPH ONLY · CANDIDATE C CAPABILITIES NOT ACTIVATED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-2 · FEED GRAPH · IMPACT SCOPE · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-2 scopes only the structural relationship grammar for one current SOCIAL_FEED snapshot:

```text
POST / REPLY / REPOST / QUOTE
item identity
feed ordering
target references
cycle prevention
dependency-closure handoff
```

It does not implement runtime schemas, model output, validators, persistence, transport, DOM/CSS, media, interaction, network access, or release changes.

## 1. Current authority inputs

SF-2 consumes the frozen SF-0/SF-1 contracts plus 3M-2/3/6/7/9/10.

The repository now also contains a design-only Candidate C durable-derived-object master architecture. That architecture does not itself activate durability.

SF-2 capability profile remains:

```text
C1 cross-turn survival       = no
C2 stable durable identity   = no
C3 item mutation             = no
C4 append / merge            = no
C5 derived lineage           = no
C6 context re-entry          = no
C7 partial survival          = no
C8 delayed effect            = no
```

Therefore SF-2 remains current-snapshot only.

## 2. Preserve-working-baseline rule

The narrow missing owner is feed graph structure. SF-2 preserves actor identity ownership, reachability ownership, Exposure ownership, presentation ownership, Candidate C activation policy, and production/release authority.

## 3. Primary seam

Selected seam:

```text
CURRENT_SOCIAL_FEED_SNAPSHOT_RELATION_GRAPH
```

Conceptual flow:

```text
SF-1 actor table
+ current item draft shells
        ↓
SF-2 structural graph validation
        ↓
well-formed current feed graph
        ↓
SF-3 assertion / exposure validation
        ↓
relationship dependency closure
```

## 4. Identity and ordering are separate

Frozen direction:

```text
itemOrdinal != timelineOrdinal
```

`itemOrdinal` is the current-snapshot structural item key.

`timelineOrdinal` is deterministic projection-local feed order.

Neither field is a durable ID, real timestamp, or canonical world chronology.

## 5. Item kinds

Exactly four V1 graph kinds remain in scope:

```text
POST
REPLY
REPOST
QUOTE
```

No platform-specific item kinds are added.

## 6. Canonical target edge

Selected relationship representation:

```text
targetItemOrdinal
```

Kind rules:

```text
POST   → no target
REPLY  → exactly one target
REPOST → exactly one target
QUOTE  → exactly one target
```

Targets resolve only inside the same current snapshot.

No external post ID, historical source lookup, handle join, array-position fallback, or fuzzy content match is allowed.

## 7. Content-bearing target kinds

First safe target rule:

```text
REPLY / REPOST / QUOTE may target:
POST
REPLY
QUOTE
```

Pure `REPOST` is relationship-only in V1 and is not itself a target surface. Repost-of-repost should resolve to the underlying content-bearing target rather than adding redundant indirection.

## 8. Semantic relationship classes

SF-2 freezes the graph-level distinction only:

```text
POST   = content-bearing root
REPLY  = content-bearing dependent
REPOST = relationship-only dependent; no freeform commentary
QUOTE  = content-bearing dependent with commentary
```

The exact assertion payload schema remains SF-3 work.

## 9. Repost is not endorsement or truth upgrade

A repost means only that the source-local actor is represented as reposting an accepted target item.

It does not prove agreement, endorsement, truth, canonical evidence, consensus, or public settlement.

Multiple repost edges do not strengthen assertion authority.

## 10. Quote and reply do not inherit truth

Canonical rules:

```text
QUOTE COMMENTARY AUTHORITY != TARGET ASSERTION AUTHORITY
REPLY ASSERTION AUTHORITY   != TARGET ASSERTION AUTHORITY
```

A quote or reply may agree, disagree, question, or reference its target, but SF-3 evaluates its own semantic assertions independently.

## 11. One relationship authority

`targetItemOrdinal` is the canonical relationship edge.

SF-2 must not introduce independent authoritative `replies[]`, `reposts[]`, or `quotes[]` lists. Any nested/grouped presentation is derived later from accepted target edges.

## 12. Graph class

Each dependent item has exactly one target edge and POST has none. Many items may target the same content-bearing item.

A valid graph is a bounded directed acyclic target graph whose chains ultimately terminate in POST nodes.

```text
EVERY TARGET CHAIN MUST TERMINATE AT POST
```

## 13. Cycle prevention

Reject structurally:

```text
self target
A → B → A
A → B → C → A
```

Cycle failure is graph invalidity, not semantic quarantine.

## 14. Timeline ordering

`timetableOrdinal` is not used; the selected term is `timelineOrdinal`.

Required properties:

```text
unique inside snapshot
deterministic total order
projection-local presentation order
not posting time
not event chronology
```

Targets do not need to appear earlier in timeline order. A newest-first feed may display a quote before its older target. Therefore acyclicity cannot be inferred from feed order.

Dense `0..N-1` ordering is recommended for V1; exact runtime enforcement remains future implementation work.

## 15. Actor references

Every item references exactly one existing SF-1 `actorOrdinal`.

Unknown actor references are structurally invalid.

SF-2 also inherits the SF-1 no-profile-directory boundary:

```text
every drafted actor must be referenced by at least one drafted feed item
```

Validated visible-actor filtering remains SF-3.

## 16. Dependency closure handoff

SF-2 owns graph reachability, not policy eligibility.

SF-3 must later enforce:

```text
dependent visible
iff
own semantic policy passes
AND
target is ordinary-accepted
```

Since target acceptance itself depends on its ancestors, this yields transitive dependency closure without storing ancestor arrays.

This prevents hidden-target leakage through replies, reposts, or quote commentary.

## 17. Structural invalidity vs semantic quarantine

Frozen distinction:

```text
malformed graph
→ whole current SOCIAL_FEED draft INVALID

well-formed graph + Exposure DENY/HOLD
→ item-level quarantine in SF-3
```

Structural failures include:

```text
duplicate itemOrdinal
duplicate timelineOrdinal
unknown actorOrdinal
unknown targetItemOrdinal
missing dependent target
unexpected POST target
target kind = REPOST
self target
cycle
unsupported item kind
orphan actor
```

The validator must not guess repairs.

## 18. Same-target fan-in is legal

Example:

```text
POST 0
├ REPLY 1
├ REPLY 2
├ REPOST 3
└ QUOTE 4
```

This is legal. It does not create engagement-count authority. SF-2 must not derive claims such as `4 replies`, `viral`, or `trending` from graph cardinality.

## 19. No persistent item identity

`itemOrdinal` is current-snapshot only.

It is not a post ID, permalink, durable target ID, reroll lineage ID, or cross-turn reply anchor.

Same ordinal in a later snapshot has no continuity relationship.

## 20. Candidate C boundary

SF-2 does not activate Candidate C.

Candidate C must be revisited before any requirement such as:

```text
reply to an older snapshot post
repost/quote a durable historical post
append into an existing social object
reroll/edit/delete one persistent item
preserve descendants after source replacement
future-context re-entry of social targets
```

## 21. Source invalidation and cost

If current source support becomes stale, the entire current social graph becomes invalid. No edge survives source replacement in V1.

When SOCIAL_FEED is inactive, feed-graph work is zero. When active, target lookup and cycle detection are bounded by the current projection and future family hard caps only. No old social snapshots are scanned.

## 22. Presentation boundary

SF-2 defines no DOM/CSS.

SF-4 may derive reply indentation, quoted-target cards, repost attribution rows, or thread grouping from accepted graph edges, but presentation may not create or alter semantic target edges.

## 23. Candidate structural reason vocabulary

The detailed design should freeze bounded structural reasons including:

```text
INVALID_SOCIAL_ITEM_ORDINAL
DUPLICATE_SOCIAL_ITEM_ORDINAL
INVALID_SOCIAL_TIMELINE_ORDINAL
DUPLICATE_SOCIAL_TIMELINE_ORDINAL
UNKNOWN_SOCIAL_ACTOR_REF
INVALID_SOCIAL_ITEM_KIND
MISSING_SOCIAL_TARGET
UNEXPECTED_SOCIAL_TARGET
UNKNOWN_SOCIAL_TARGET
UNSUPPORTED_REPOST_TARGET
SELF_SOCIAL_TARGET
SOCIAL_TARGET_CYCLE
ORPHAN_SOCIAL_ACTOR
```

## 24. Impact conclusion

Selected direction:

```text
SNAPSHOT_LOCAL_SINGLE_TARGET_ACYCLIC_FEED_GRAPH
```

with:

```text
itemOrdinal       = structural identity
timelineOrdinal   = projection-local order
targetItemOrdinal = canonical relationship edge
```

and:

```text
POST   = root/content-bearing
REPLY  = content-bearing dependent
REPOST = relation-only dependent
QUOTE  = content-bearing dependent
```

No Candidate C capability is activated.

Next transaction after this impact scope passes:

```text
SF-2 Feed Graph Semantics detailed design
```
