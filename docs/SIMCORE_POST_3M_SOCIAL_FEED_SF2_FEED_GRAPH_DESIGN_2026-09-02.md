# SimCore Post-3.0M SOCIAL_FEED SF-2 Feed Graph Semantics Design — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-2 DESIGN FROZEN · SNAPSHOT-LOCAL ACYCLIC FEED GRAPH · SINGLE TARGET AUTHORITY · NO DURABLE ITEM IDENTITY · CANDIDATE C CAPABILITIES NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-2 · FEED GRAPH SEMANTICS · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-2 freezes the structural feed graph beneath SOCIAL_FEED V1.

It answers:

```text
What is an item inside one current feed snapshot?
Which field owns item identity?
Which field owns feed order?
Which kinds may target which other kinds?
What does REPOST structurally mean?
How are cycles and unknown targets handled?
How does graph dependency hand off to SF-3 policy validation?
When would this graph require durable Candidate C semantics?
```

This is design-only. It does not implement model output, runtime schemas, graph code, validation code, persistence, transport, DOM/CSS, media, user interaction, or release changes.

## 1. Authority chain

SF-2 consumes:

```text
SOCIAL_FEED SF-0 master design
SOCIAL_FEED SF-1 Actor Identity + Reachability design
SOCIAL_FEED SF-2 impact scope
3M-2 Source Assertion / Exposure boundary
3M-3 structured sidecar / validator split
3M-6 current-projection support invalidation
3M-7 zero automatic structured source re-entry
3M-9 current-projection cost / dormancy
3M-10 design convergence
current Candidate C durable-derived-object master architecture
repository common baseline-preservation doctrine
```

Candidate C has a design architecture in the repository, but SF-2 does not activate any durable capability.

## 2. Scope freeze

SF-2 applies only to:

```text
mode = C
family = SOCIAL_FEED
reachability = PUBLIC_FEED
projection lifetime = CURRENT_PROJECTION_ONLY
graph lifetime = CURRENT SNAPSHOT ONLY
```

Still excluded:

```text
historical posts
cross-turn post identity
persistent account graph
append / edit / delete
post permalinks
remote post lookup
private/follower-only feeds
future context re-entry
```

## 3. Structural item shell

Frozen conceptual graph shell:

```text
SocialFeedGraphItemDraftV1
  itemOrdinal
  timelineOrdinal
  kind
  actorOrdinal
  targetItemOrdinal?
```

This is a design vocabulary, not an authorized runtime schema.

Semantic content/assertion fields are deliberately not frozen here. SF-3 owns that payload contract.

## 4. Item identity

`itemOrdinal` is the only structural item key in one current SOCIAL_FEED snapshot.

Required semantics:

```text
bounded integer-like ordinal
unique inside current snapshot
used by targetItemOrdinal references
not a durable post ID
not a permalink
not a reroll lineage ID
not a timestamp
not a cross-turn anchor
```

Canonical rule:

```text
CURRENT SNAPSHOT ITEM IDENTITY
!=
DURABLE SOCIAL POST IDENTITY
```

Duplicate `itemOrdinal` is structurally invalid. The graph validator must not merge or renumber records by guessing intent.

## 5. Timeline order

`timelineOrdinal` owns only deterministic feed display order inside the current projection.

It is separate from identity:

```text
itemOrdinal != timelineOrdinal
```

It is also separate from time:

```text
timelineOrdinal != publishedAt
timelineOrdinal != event chronology
timelineOrdinal != canonical world time
```

For V1 design determinism, the accepted draft shape expects `timelineOrdinal` to form one dense permutation:

```text
0..N-1
```

No gaps and no duplicates are permitted in the conceptual V1 contract.

This does not authorize a runtime schema or establish a real timestamp.

## 6. Timeline direction is presentation policy

SF-2 freezes ordering labels but does not decide whether `0` appears visually at the top or bottom.

For example:

```text
0 = first semantic feed position
```

may be rendered by a future adapter in the selected visual grammar.

The renderer may not reinterpret the ordinals as dates or generate timestamps from them.

## 7. Item kinds

Frozen V1 graph kinds:

```text
POST
REPLY
REPOST
QUOTE
```

No aliases or platform-specific kinds are accepted at this design layer.

## 8. Kind semantics

### POST

```text
content-bearing root
no target
```

### REPLY

```text
content-bearing dependent
exactly one target
own semantic assertions evaluated independently in SF-3
```

### REPOST

```text
relationship-only dependent
exactly one target
no freeform commentary payload in V1
```

### QUOTE

```text
content-bearing dependent
exactly one target
own commentary/assertions evaluated independently in SF-3
```

This distinction prevents an ambiguous “repost with text” object from quietly becoming either REPOST or QUOTE depending on renderer behavior.

## 9. Canonical edge

The only authoritative relationship field is:

```text
targetItemOrdinal
```

There is no second authoritative edge registry such as:

```text
replies[]
reposts[]
quotes[]
children[]
```

Those may be derived for presentation or diagnostics, but they cannot disagree with `targetItemOrdinal` because they do not own semantic graph truth.

## 10. Target cardinality by kind

Frozen matrix:

| kind | target cardinality |
| --- | --- |
| POST | forbidden |
| REPLY | exactly 1 |
| REPOST | exactly 1 |
| QUOTE | exactly 1 |

A POST with a target is invalid.

A REPLY/REPOST/QUOTE without a target is invalid.

## 11. Target kind matrix

Frozen V1 target matrix:

| source kind | POST target | REPLY target | QUOTE target | REPOST target |
| --- | --- | --- | --- | --- |
| REPLY | allow | allow | allow | deny |
| REPOST | allow | allow | allow | deny |
| QUOTE | allow | allow | allow | deny |

A pure REPOST is not a content-bearing target surface.

Canonical rule:

```text
REPOST_OF_REPOST
→ target underlying content-bearing item instead
```

This keeps attribution and dependency depth bounded and explicit.

## 12. Same-snapshot target resolution

Every target must resolve by exact `itemOrdinal` inside the same current draft snapshot.

Forbidden fallback mechanisms:

```text
same handle
same displayName
same text
array position
previous SOCIAL_FEED snapshot
host transcript
historical source archive
external URL
fuzzy similarity
```

Unknown target means structural invalidity.

## 13. Actor binding

Every graph item references exactly one existing SF-1 `actorOrdinal`.

Unknown actor reference is structurally invalid.

The graph never joins actors by handle or display name.

SF-2 also freezes the no-profile-directory invariant:

```text
every drafted actor must be referenced by at least one drafted item
```

An unused actor record is an `ORPHAN_SOCIAL_ACTOR` structural failure, rather than hidden profile state waiting outside the feed.

## 14. Graph shape

Because every dependent item has exactly one outgoing target edge and POST has none, the graph is a bounded directed target graph with possible fan-in.

Valid example:

```text
POST 0
├ REPLY 1
│  └ REPLY 5
├ REPLY 2
├ REPOST 3
└ QUOTE 4
   └ REPLY 6
```

The structural invariant is:

```text
EVERY TARGET CHAIN
MUST TERMINATE AT POST
```

## 15. Cycle prohibition

The following are structurally invalid:

```text
A → A
A → B → A
A → B → C → A
```

Cycle detection uses the target graph itself.

It must not rely on:

```text
timelineOrdinal ordering
array ordering
itemOrdinal numeric comparison
```

because those fields do not prove dependency chronology.

## 16. Feed order and graph order are independent

A timeline can legally place a dependent before its target in visual/feed order.

Example, newest-first semantics:

```text
timeline 0: QUOTE 9 → POST 2
timeline 1: POST 2
```

This is structurally legal if the graph is acyclic.

Therefore:

```text
TARGET MUST APPEAR EARLIER IN TIMELINE
```

is not an SF-2 rule.

## 17. Repost meaning

A REPOST edge means only:

```text
actor X is represented in this source snapshot as reposting target Y
```

It does not mean:

```text
X agrees with Y
X endorses Y
Y is true
Y is more credible
Y has become canonical
Y is settled public knowledge
```

Multiple repost edges remain multiple source-local social actions, not a truth vote.

## 18. Quote meaning

A QUOTE has two separate semantic layers:

```text
target relation
+
quoting actor's own content/assertions
```

Canonical rule:

```text
QUOTE COMMENTARY AUTHORITY
!=
TARGET ASSERTION AUTHORITY
```

The quote may praise, reject, mock, question, contextualize, or merely reference its target.

SF-3 validates the quoting actor's own semantic content independently.

## 19. Reply meaning

A REPLY likewise has its own semantic content.

Canonical rule:

```text
REPLY ASSERTION AUTHORITY
!=
TARGET ASSERTION AUTHORITY
```

A reply relationship means contextual dependency, not truth inheritance.

## 20. Dependency closure

SF-2 freezes the graph input needed for SF-3 dependency closure.

For ordinary visibility, SF-3 must derive recursively:

```text
POST accepted
iff own semantic policy accepted

REPLY/REPOST/QUOTE accepted
iff own applicable semantic policy accepted
AND target accepted
```

For REPOST, “own semantic policy” includes the semantic safety of the source-local action/attribution fields even though it has no freeform commentary payload.

The target condition recursively closes through the chain.

No separate ancestor list is authoritative.

## 21. Hidden-target leakage prevention

The dependency rule prevents shapes such as:

```text
hidden POST
→ visible REPLY that reveals its topic
```

or:

```text
hidden POST
→ visible REPOST attribution
```

or:

```text
hidden QUOTE
→ visible REPLY that reconstructs the quote
```

A dependent item cannot survive as ordinary-visible when its required target is quarantined.

## 22. Structural invalidity vs policy quarantine

SF-2 freezes this hard boundary:

```text
STRUCTURAL INVALIDITY
→ WHOLE CURRENT SOCIAL_FEED DRAFT INVALID
```

Examples:

```text
duplicate structural key
bad dense timeline order
unknown actor
a missing or illegal target
cycle
orphan actor
unsupported kind
```

By contrast:

```text
WELL-FORMED GRAPH
+ SF-3 DENY/HOLD
→ ITEM QUARANTINE / DEPENDENCY QUARANTINE
```

A semantic policy failure on one well-formed item does not automatically make the graph structurally malformed.

## 23. No guessed repair

Structural invalidity is not repaired by:

```text
renumbering duplicate ordinals
dropping one duplicate item
retargeting to a similar post
rewriting a REPOST into QUOTE
flattening a cycle
inventing a missing actor
```

Unknown or malformed structure fails closed.

## 24. Structural disposition vocabulary

Frozen conceptual reason codes:

```text
INVALID_SOCIAL_ITEM_ORDINAL
DUPLICATE_SOCIAL_ITEM_ORDINAL
INVALID_SOCIAL_TIMELINE_ORDINAL
DUPLICATE_SOCIAL_TIMELINE_ORDINAL
NON_DENSE_SOCIAL_TIMELINE
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

Exact runtime encoding remains future implementation work.

## 25. Empty graph boundary

SF-2 does not invent final `VALID_EMPTY` sidecar semantics.

That belongs to SF-3 validated-sidecar design.

Structural rule for a draft snapshot is only:

```text
if items are empty,
actors must also be empty
```

A non-empty actor table with zero feed items is invalid because it becomes an unauthorized profile directory.

Whether an empty/empty draft is accepted, held, or normalized later is deferred to SF-3 orchestration semantics.

## 26. Same-target fan-in

Many items may target one item.

Example:

```text
POST 0
← REPLY 1
← REPLY 2
← REPOST 3
← QUOTE 4
```

This is legal and useful.

However graph degree does not create metric claims.

## 27. No metric inference

SF-2 graph structure must not be converted into semantic claims such as:

```text
4 replies
10 reposts
viral
trending
popular
ratioed
```

Metrics and popularity semantics remain SF-5 reassessment work.

## 28. No platform chronology invention

SF-2 provides no:

```text
postedAt
relative time
account age
thread age
view time
```

A renderer may not display “2m ago” merely from `timelineOrdinal`.

Trusted temporal semantics would require a separate authority source.

## 29. Current-projection invalidation

SF-2 inherits the 3M-6 support-at-use contract.

If the current source authority no longer supports the SOCIAL_FEED projection:

```text
whole current graph
→ invalid
```

No individual item or edge survives source replacement in snapshot-only V1.

## 30. No cross-turn graph continuity

A later SOCIAL_FEED snapshot may reuse numeric ordinals, handles, text, or similar relationship shapes.

None of those imply continuity.

```text
SAME itemOrdinal LATER
!= SAME POST

SAME target SHAPE LATER
!= SAME THREAD
```

Cross-turn identity requires Candidate C durable identity semantics first.

## 31. Candidate C status

SF-2 itself activates none of C1-C8.

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

The Candidate C architecture remains conditionally available, not active.

## 32. Explicit durability triggers

Candidate C must be opened before supporting requirements such as:

```text
"지난 턴 그 게시물에 답글 달아"
"저 포스트를 다음 피드에서도 같은 포스트로 유지해"
"이 리포스트만 지워"
"기존 피드에 새 게시물 append해"
"원본이 바뀌어도 이 댓글은 살려"
"아까 SNS 포스트를 다음 모델 컨텍스트에 넣어"
```

The exact capability combination depends on the requirement, but SF-2 does not smuggle any of these in.

## 33. Performance boundary

When SOCIAL_FEED is not the current authorized source job:

```text
SF-2 graph work = 0
```

When active, work is bounded by the current actor/item snapshot only.

A future implementation must set concrete caps for at least:

```text
max actors
max items
max target-chain depth or equivalent bounded traversal
```

No numeric cap is invented in this design checkpoint.

No previous feed snapshot may be scanned to validate the current graph.

## 34. Presentation handoff

SF-4 may derive presentation structures from the accepted graph:

```text
reply indentation
reply-to attribution
quote target card
repost attribution row
thread grouping
```

But:

```text
PRESENTATION DERIVATION
!=
SEMANTIC EDGE CREATION
```

The renderer may not invent a reply target, change a target, collapse distinct items into one identity, or infer durable thread membership.

## 35. SF-3 handoff

SF-3 receives:

```text
well-formed actor table
well-formed item shells
exact target graph
acyclicity proven structurally
current PUBLIC_FEED reachability result
```

SF-3 must then freeze:

```text
content/assertion payload schema
actor-label semantic safety
item assertion policy joins
REPOST attribution/action policy
own-item ALLOW/DENY/HOLD
recursive target dependency disposition
ordinary validated actor filtering
validated SOCIAL_FEED sidecar status
quarantine receipt boundaries
```

SF-2 does not pre-decide those semantic verdicts.

## 36. SF-4 handoff

SF-4 later consumes only validated graph data and does not receive authority to restore quarantined targets or actors.

## 37. SF-5 handoff

SF-5 may reassess metrics/media, but graph cardinality alone cannot become metric truth.

## 38. Design evaluator matrix

Future evaluation should cover at least:

```text
A. unique items + dense timeline + POST root
→ structurally valid

B. duplicate itemOrdinal
→ invalid

C. duplicate timelineOrdinal
→ invalid

D. timeline gap
→ invalid V1 ordering

E. POST with target
→ invalid

F. REPLY without target
→ invalid

G. QUOTE target unknown
→ invalid

H. REPOST targets REPOST
→ invalid

I. self target
→ invalid

J. multi-node cycle
→ invalid

K. dependent appears before target in timeline but graph acyclic
→ structurally valid

L. multiple dependents target one POST
→ structurally valid; no metrics inferred

M. unknown actorOrdinal
→ invalid

N. unreferenced actor record
→ invalid

O. same itemOrdinal in later snapshot
→ no continuity inference

P. target later quarantined by SF-3
→ dependent ordinary visibility blocked recursively

Q. many reposts of one claim
→ no truth upgrade
```

## 39. Frozen SF-2 decisions

```text
SF2_STATUS                         = DESIGN FROZEN
GRAPH_SCOPE                        = CURRENT SOCIAL_FEED SNAPSHOT
GRAPH_SHELL                        = SocialFeedGraphItemDraftV1 (conceptual)
ITEM_STRUCTURAL_KEY                = itemOrdinal
TIMELINE_ORDER_KEY                 = timelineOrdinal
TIMELINE_V1                        = DENSE 0..N-1
ITEM_KINDS                         = POST / REPLY / REPOST / QUOTE
RELATIONSHIP_AUTHORITY             = targetItemOrdinal
POST_TARGET                        = FORBIDDEN
DEPENDENT_TARGET                   = EXACTLY ONE
VALID_TARGET_KINDS                 = POST / REPLY / QUOTE
REPOST_AS_TARGET                   = FORBIDDEN
REPOST_CONTENT                     = NONE / RELATION-ONLY
QUOTE_CONTENT                      = OWN COMMENTARY + TARGET
REPLY_CONTENT                      = OWN CONTENT + TARGET
TARGET_JOIN                        = EXACT CURRENT-SNAPSHOT itemOrdinal
CYCLES                             = STRUCTURAL INVALIDITY
TARGET_CHAIN_ROOT                  = POST
TIMELINE_ORDER_PROVES_ACYCLICITY   = NO
GRAPH_INVALIDITY                   = WHOLE DRAFT INVALID
POLICY_FAILURE                     = SF-3 QUARANTINE
METRIC_INFERENCE                   = FORBIDDEN
PERSISTENT_ITEM_IDENTITY           = NONE
HISTORICAL_TARGET_LOOKUP           = NONE
CONTEXT_REENTRY                    = NONE
CANDIDATE_C_CAPABILITIES           = NONE ACTIVATED
RUNTIME IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
```

## 40. Closure

SF-2 closes the structural ambiguity between a chronological-looking feed and a semantic dependency graph.

Final boundary:

```text
SF-1 actor table
        ↓
SocialFeedGraphItemDraftV1 shells
        ↓
exact actor refs
exact targetItemOrdinal refs
        ↓
acyclic current-snapshot graph
        ↓
SF-3 semantic / exposure validation
        ↓
recursive dependency closure
        ↓
validated SOCIAL_FEED
```

Canonical rules:

```text
FEED ORDER
!=
ITEM IDENTITY
!=
WORLD CHRONOLOGY
```

```text
REPOST
!=
ENDORSEMENT
!=
TRUTH UPGRADE
```

```text
DEPENDENT RELATION
!=
TARGET TRUTH INHERITANCE
```

Next design checkpoint:

```text
SF-3 · Assertion + Validation
```
