# SimCore Post-3.0M SOCIAL_FEED SF-3 Assertion + Validation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · SF-3 VALIDATOR SEAM SELECTED · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-3 · ASSERTION + VALIDATION · IMPACT SCOPE**

## 0. Purpose

Before freezing the detailed SF-3 contract, this checkpoint maps the semantic owners and protected boundaries for SOCIAL_FEED assertion validation.

The question is:

```text
Given one structurally well-formed current SOCIAL_FEED snapshot,
its SF-1 actor table + PUBLIC_FEED reachability,
its SF-2 item graph,
and current 3M-2 exposure-policy inputs,
where may semantic content be proposed,
where must authority be joined,
and where must ALLOW / DENY / HOLD be derived?
```

This document does not implement runtime schemas, validators, model output, transport, persistence, DOM/CSS, or release changes.

## 1. Fresh authority baseline

Impact scope is frozen against:

```text
main = 827e510e3c4463270c2d0df7c77fdf5454a5b3ca
```

which contains SF-2 Feed Graph Semantics.

Production authority remains separate on `release-simcore`.

## 2. Upstream semantic owners

SF-3 must consume, not replace:

```text
3M-2
  assertion-mode / audience-exposure policy

3M-3
  untrusted semantic draft vs trusted authority vs policy-context split
  validator-derived disposition
  validated sidecar vs bounded receipt

SF-1
  actorOrdinal identity
  displayName / handle semantic-label status
  PUBLIC_FEED reachability gate
  quarantined-only actor removal

SF-2
  itemOrdinal / timelineOrdinal split
  POST / REPLY / REPOST / QUOTE graph semantics
  targetItemOrdinal as sole edge authority
  structural-invalidity vs semantic-quarantine split
  recursive dependency closure requirement
```

SF-3 may compose these owners but may not silently widen them.

## 3. Selected seam

Chosen conceptual seam:

```text
SOCIAL_FEED_CURRENT_SNAPSHOT_STRUCTURED_SEMANTIC_VALIDATION
```

Input boundary:

```text
A. untrusted SOCIAL_FEED semantic draft
B. trusted current source / reachability / graph context
C. trusted claim-specific exposure-policy contexts
```

Output boundary:

```text
validated SOCIAL_FEED semantic sidecar
+
bounded validation receipt
```

No output bytes, persistent state, or presentation surface are changed by this design transaction.

## 4. Layer map

Conceptual flow:

```text
current source-job authority
        ↓
SF-1 reachability + actor structure
        ↓
SF-2 graph structure
        ↓
untrusted semantic item/actor draft
        +
claim-specific exposure contexts
        ↓
SF-3 pure validator
        ↓
per-claim ALLOW / DENY / HOLD
        ↓
item semantic disposition
        ↓
recursive target dependency closure
        ↓
validated actors + validated items
        +
bounded receipt
        ↓
SF-4 presentation later
```

## 5. Producer boundary

A future semantic producer may propose only semantic material such as:

```text
actor display labels
item body/commentary text
assertion mode
claim-local content
```

It must not self-declare:

```text
isPublic
isValid
safeToRender
eligibilityState
consumerDisposition
truthAuthority
reachabilityState
dependencyAccepted
```

Canonical rule:

```text
PRODUCER PROPOSES SEMANTICS
!=
PRODUCER GRANTS AUTHORITY
```

## 6. Actor-label impact

SF-1 already freezes:

```text
ACTOR LABELS ARE SOURCE SEMANTICS
```

Therefore SF-3 must not validate only item bodies.

Potential leak surfaces include:

```text
displayName
handle
```

Example:

```text
harmless post body
+
displayName = "Secret Patient Alice"
```

can still expose hidden information.

This requires actor-label semantic compliance evidence before that actor is copied into ordinary validated output.

String shape checks alone cannot prove semantic safety.

## 7. Item-kind impact

### POST

Content-bearing root.

Requires semantic validation for its own content/assertions.

### REPLY

Content-bearing dependent.

Requires:

```text
own semantic acceptance
+
target accepted
```

### QUOTE

Content-bearing dependent.

Requires independent validation of quoting commentary/assertions plus target acceptance.

### REPOST

Relationship-only in SF-2 V1.

It has no freeform commentary body, but the social action itself remains semantic:

```text
actor X is represented as reposting target Y
```

Therefore REPOST cannot bypass validation merely because it lacks body text.

## 8. Repost authority boundary

A REPOST action does not establish:

```text
endorsement
agreement
truth
consensus
canonicality
```

SF-3 must preserve:

```text
REPOST ACTION VALIDITY
!=
TARGET CLAIM VALIDITY
```

and:

```text
TARGET ACCEPTED
is necessary for ordinary repost visibility
but does not cause a repost to become a truth vote
```

## 9. Claim granularity

The 3M-2 policy is claim-specific.

Therefore one content-bearing SOCIAL_FEED item may contain multiple claims with different dispositions.

SF-3 must not assume:

```text
one item = one assertion
```

unless it deliberately freezes a narrower V1 contract.

Impact finding:

A claim list beneath each content-bearing item is the least ambiguous fit with existing 3M-2/3 semantics.

## 10. Item text vs assertions

Two layers should remain distinct:

```text
visible semantic text
claim-level assertion records
```

A validator can mechanically validate assertion mode / policy inputs, but cannot prove arbitrary natural-language text is semantically equivalent to those structured claims.

Therefore detailed SF-3 must freeze a model semantic-compliance boundary rather than pretending string structure proves prose safety.

Canonical rule:

```text
STRUCTURED ASSERTION PASS
!=
ARBITRARY PROSE SEMANTIC PASS
```

## 11. Exposure-policy reuse

SF-3 should reuse the frozen 3M-2 assertion modes:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

and its policy dispositions:

```text
ALLOW
DENY
HOLD
```

No SOCIAL_FEED-specific truth-strength aliases are needed in the first design.

## 12. Reachability remains earlier authority

SF-1 order remains binding:

```text
PUBLIC_FEED
→ may continue to semantic validation

UNKNOWN
→ projection-level HOLD

RESTRICTED
→ unsupported scope
```

SF-3 cannot rescue a projection that failed reachability.

```text
ASSERTION ALLOW
!=
PUBLIC REACHABILITY PROOF
```

## 13. Structural graph remains earlier authority

SF-2 structural failures remain whole-draft failures.

Examples:

```text
duplicate item ordinal
bad target
cycle
unknown actor
orphan actor
unsupported item kind
```

SF-3 semantic policy must not repair them.

## 14. Dependency closure

After own semantic disposition is derived, ordinary item visibility requires recursive target acceptance.

Conceptual relation:

```text
ownAccepted(item)
AND
dependencyAccepted(item)
→ ordinaryAccepted(item)
```

where:

```text
POST dependencyAccepted = true
REPLY/QUOTE/REPOST dependencyAccepted = ordinaryAccepted(target)
```

Because SF-2 guarantees acyclicity, this may be evaluated over the bounded target DAG without inventing ancestor state.

## 15. Dependency quarantine reason must be derived

A dependent item can be semantically valid on its own yet still be quarantined because its target is not ordinary-visible.

This is not the same as an own semantic DENY/HOLD.

Detailed SF-3 should distinguish at least:

```text
OWN_POLICY_DENY
OWN_POLICY_HOLD
DEPENDENCY_QUARANTINE
```

without copying hidden target content into diagnostics.

## 16. Actor survival closure

After item dispositions are final:

```text
ordinary validated actor set
=
actors referenced by at least one ordinary accepted item
```

An actor referenced only by quarantined items must not survive in ordinary validated actor data.

Diagnostic receipts must not copy quarantined displayName/handle merely for convenience.

## 17. Empty-output boundary

A structurally valid SOCIAL_FEED draft may end with zero ordinary accepted items after policy/dependency quarantine.

Impact finding:

SF-3, not SF-2, should own the exact validated-sidecar state for this case.

Likely semantic family:

```text
VALID_EMPTY
QUARANTINED
VALID_WITH_QUARANTINE
VALID
```

Exact rules belong to the detailed design.

## 18. Validation receipt privacy

The receipt should preserve bounded observability while avoiding hidden semantic retention.

Safe diagnostic shape should prefer metadata such as:

```text
itemOrdinal
kind
claimOrdinal
assertionMode
eligibilityState
reasonCode
contentLength
consumerDisposition
```

It should not duplicate:

```text
quarantined item body
quarantined actor labels
raw source body
hidden target text
```

## 19. Authority-join impact

Any future SOCIAL_FEED semantic draft must be joined against trusted current facts, not accepted by self-reference.

At minimum the validator seam must bind to the same current projection for:

```text
family = SOCIAL_FEED
mode = C
projection ordinal
source authority
reachability context
actor table
item graph
policy contexts
```

Cross-projection borrowing is invalid.

## 20. Unknown-field posture

Existing 3M-3 uses strict unknown-field rejection.

SF-3 should preserve this posture for conceptual structured draft schemas.

Reason:

```text
unknown model metadata
must not quietly become semantic authority
```

## 21. No guessed repair

SF-3 should remain judge-only.

It must not:

```text
rewrite hidden text into safer text
change CONFIRMED_FACT to opinion
invent actor labels
retarget graph edges
drop inconvenient claims and silently preserve prose
invent exposure signals
convert HOLD to ALLOW
```

A malformed or unsafe proposal requires a new proposal in a separately authorized future producer flow.

## 22. Semantic-compliance gap

Mechanical validation can prove:

```text
schema shape
trusted-reference equality
enum legality
policy-context shape
3M-2 decision function
graph dependency closure
bounded receipt construction
```

It cannot prove by itself:

```text
that freeform item text matches accepted structured claims
that an actor label contains no hidden fact
that a claim was placed in the correct assertion mode
that the semantic producer faithfully represented the source
```

Those remain model/producer semantic-compliance evidence requirements.

## 23. Persistence impact

First SF-3 design must remain current-projection-only.

Expected delta:

```text
persistent schema = 0
SnapshotStore keys = 0
Core state version = 0
source database = none
cross-turn post/account identity = none
future context re-entry = none
```

Candidate C remains inactive.

## 24. Transport impact

No in-band assistant-output transport is selected here.

Still excluded:

```text
<SOCIAL_FEED_SIDECAR> tags
hidden JSON in assistant text
HTML comments
persistent message metadata
provider structured-output changes
second model call
post-generation extraction
```

Any active transport requires its own integration impact scope.

## 25. Presentation impact

SF-4 may consume only validated semantic output.

```text
UNTRUSTED SOCIAL DRAFT
→ never presentation input

VALIDATED SOCIAL SIDECAR
→ future presentation input
```

Renderer code may not re-run semantic policy or resurrect quarantined data.

## 26. Metrics/media boundary

SF-3 should not invent:

```text
likes
views
repost counts
follower counts
virality
trending state
avatars
media assets
```

Those remain later SOCIAL_FEED work.

## 27. Candidate C trigger check

Nothing in the selected SF-3 seam requires:

```text
cross-turn survival
stable durable post/account IDs
mutation
append/merge
persistent lineage
context re-entry
partial survival across source replacement
delayed effects
```

Therefore:

```text
Candidate C = NOT ACTIVATED
```

## 28. Performance boundary

When SOCIAL_FEED is dormant:

```text
SF-3 work = 0
```

When active, validation must remain bounded to the current snapshot:

```text
current actors
current items
current claims
current target DAG
```

No prior SOCIAL_FEED history scan is required.

## 29. Detailed-design decisions now ready to freeze

The impact scope supports a detailed SF-3 design for:

```text
1. untrusted semantic draft shell
2. actor-label semantic proposal contract
3. content-bearing item text + assertions relationship
4. REPOST action semantic record
5. exact claim-level ALLOW / DENY / HOLD mapping
6. item-level own-policy disposition
7. recursive dependency quarantine
8. actor survival after item closure
9. validated SOCIAL_FEED sidecar shape
10. bounded validation receipt
11. overall sidecar states
12. structural-invalid vs policy-quarantine separation
13. semantic-compliance evidence boundary
```

## 30. Explicit non-impact boundaries

This checkpoint does not modify:

```text
release-simcore
production runtime
S7
3M-2 policy semantics
3M-3 LIVE_REACTION validator contract
SF-1 actor identity rules
SF-2 graph rules
prompt bytes
assistant output bytes
host history
DOM/CSS
network behavior
persistent storage
```

## 31. Impact conclusion

Selected direction:

```text
well-formed SF-1/SF-2 current snapshot
+
untrusted social semantic proposal
+
trusted current policy contexts
→ pure validator
→ claim dispositions
→ item dispositions
→ target dependency closure
→ actor survival closure
→ validated SOCIAL_FEED sidecar + bounded receipt
```

This is the narrowest design seam that reuses existing Source Intelligence authority correctly without turning SOCIAL_FEED into a new truth owner or persistent social database.

## 32. Next transaction

If this impact scope passes repository verification, the next docs-only transaction is:

```text
SF-3 Assertion + Validation detailed design
```

No implementation authorization is implied.