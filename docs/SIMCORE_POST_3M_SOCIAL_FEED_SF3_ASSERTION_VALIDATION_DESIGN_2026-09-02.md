# SimCore Post-3.0M SOCIAL_FEED SF-3 Assertion + Validation Design — 2026-09-02

Date: 2026-09-02 KST

Status: **SF-3 DESIGN FROZEN · CLAIM-LEVEL EXPOSURE POLICY · ACTOR-LABEL SEMANTIC GATE · ITEM-ATOMIC QUARANTINE · RECURSIVE TARGET DEPENDENCY CLOSURE · VALIDATED SIDECAR / BOUNDED RECEIPT · CANDIDATE C NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOCIAL_FEED · SF-3 · ASSERTION + VALIDATION · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

SF-3 freezes the first detailed semantic-validation contract for the SOCIAL_FEED family.

It answers:

```text
What semantic material may an untrusted SOCIAL_FEED producer propose?
How are actor labels prevented from becoming hidden-data leak surfaces?
How are claims joined to the existing 3M-2 exposure policy?
How is freeform item text checked against its structured claim set?
How is a REPOST validated without treating it as truth or endorsement?
How are own-policy failures separated from target-dependency failures?
Which actors/items survive into ordinary validated SOCIAL_FEED data?
What may a bounded diagnostic receipt retain?
```

This is design-only.

It does not implement model output, runtime schemas, validators, structured transport, persistent state, DOM/CSS, network/media behavior, user interaction, or release changes.

## 1. Authority chain

SF-3 consumes:

```text
SIMCORE_POST_3M_SOCIAL_FEED_MASTER_DESIGN_2026-09-01.md
SIMCORE_POST_3M_SOCIAL_FEED_SF1_ACTOR_IDENTITY_REACHABILITY_DESIGN_2026-09-01.md
SIMCORE_POST_3M_SOCIAL_FEED_SF2_FEED_GRAPH_DESIGN_2026-09-02.md
SIMCORE_POST_3M_SOCIAL_FEED_SF3_ASSERTION_VALIDATION_IMPACT_SCOPE_2026-09-02.md
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

SF-3 does not reopen any upstream semantic owner.

## 2. Scope freeze

SF-3 applies only to the first SOCIAL_FEED family slice:

```text
mode = C
family = SOCIAL_FEED
source shape = DIRECT CURRENT SOURCE AUTHORITY
first intended origin = direct B root
reachability = PUBLIC_FEED
projection lifetime = CURRENT_PROJECTION_ONLY
actor lifetime = CURRENT SNAPSHOT ONLY
item lifetime = CURRENT SNAPSHOT ONLY
```

Still excluded:

```text
private/follower-only feeds
remote social lookup
historical feed retrieval
cross-turn account identity
cross-turn post identity
append/edit/delete
interactive reply/repost mutation
stable engagement metrics
media materialization
future context re-entry
```

## 3. Validator architecture

SF-3 preserves the Source Intelligence authority split:

```text
INPUT A
untrusted semantic draft

INPUT B
trusted current source + reachability authority

INPUT C
trusted semantic-policy / compliance contexts

        ↓

pure SOCIAL_FEED validator

        ↓

validated semantic sidecar
+
bounded validation receipt
```

Canonical rule:

```text
STRUCTURED PRODUCER OUTPUT
!=
AUTHORITY
```

and:

```text
FINAL DISPOSITION
IS VALIDATOR-DERIVED
```

## 4. Input A · untrusted SOCIAL_FEED semantic draft

Frozen conceptual root:

```text
SocialFeedSemanticSidecarDraftV1
  schemaVersion = 1
  family = SOCIAL_FEED
  projectionOrdinal = 0
  sourceAuthorityRef
  actors[]
  items[]
```

Strict posture:

```text
unknown fields = invalid draft
```

The draft may propose source semantics.
It may not declare whether those semantics are safe, public, true, reachable, or renderable.

## 5. Source authority reference

The first SOCIAL_FEED direct-current-source slice reuses the existing current Handoff/Evidence authority shape conceptually:

```text
HandoffEvidenceAuthorityRefV1
  kind = HANDOFF_EVIDENCE
  rootMode = B
  parentMode = B
  rootIndex
  parentIndex
  depth = 1
  rootFingerprint
  sourceAssistantIndex
  sourceAssistantFingerprint
  currentUserIndex
  currentUserFingerprint
```

The draft does not own these facts.

The validator must exact-join them against Input B current authority.

Mismatch:

```text
INVALID_AUTHORITY_JOIN
```

No spoofed field is repaired by overwriting it with trusted data.

## 6. Actor draft

SF-3 consumes the SF-1 actor shape unchanged:

```text
SocialActorDraftV1
  actorOrdinal
  displayName
  handle
```

Structural rules remain SF-1 authority:

```text
actorOrdinal = snapshot-local key
displayName = bounded non-empty plain semantic text
handle = bounded non-empty plain semantic text
handle unique inside current snapshot
actor labels are not canonical identity
```

SF-3 adds semantic eligibility, not new actor identity.

## 7. Actor labels remain semantic data

SF-1 already froze:

```text
ACTOR LABELS ARE SOURCE SEMANTICS
NOT FREE UI DECORATION
```

SF-3 makes that boundary operational at design level.

The following may leak hidden information even if item body text is harmless:

```text
displayName
handle
```

Therefore ordinary validated actor data requires independent actor-label semantic-compliance evidence.

Canonical rule:

```text
ITEM CLAIM ALLOW
!=
ACTOR LABEL ALLOW
```

## 8. No canonical-account promotion

Actor-label validation proves only that the current source-local labels are eligible for this current projection.

It does not prove:

```text
real account ownership
canonical character identity
cross-turn account continuity
platform verification
persistent handle uniqueness
```

Canonical rule:

```text
SAFE SOURCE-LOCAL ATTRIBUTION
!=
CANONICAL SUBJECT BINDING
```

## 9. Feed item draft

SF-3 extends the already-frozen SF-2 structural shell with semantic payload fields.

Frozen conceptual type:

```text
SocialFeedItemDraftV1
  itemOrdinal
  timelineOrdinal
  kind
  actorOrdinal
  targetItemOrdinal?
  content?
  assertions[]
```

Structural ownership remains SF-2.

Semantic ownership begins here at `content` and `assertions[]`.

## 10. Kind-specific semantic payload

### POST

```text
content = required non-empty bounded plain semantic text
assertions[] = zero or more structured claims
no target
```

### REPLY

```text
content = required non-empty bounded plain semantic text
assertions[] = zero or more structured claims
exactly one legal SF-2 target
```

### QUOTE

```text
content = required non-empty bounded plain semantic text
assertions[] = zero or more structured claims
exactly one legal SF-2 target
```

### REPOST

```text
content = null
assertions[] = []
exactly one legal SF-2 target
```

A REPOST with commentary is not repaired into QUOTE.
It is invalid against the frozen V1 schema.

## 11. Assertion draft

Content-bearing items may carry claim-level structured assertions.

Frozen conceptual type:

```text
SocialFeedAssertionDraftV1
  claimOrdinal
  mode
  content
```

### `claimOrdinal`

```text
bounded integer-like local ordinal
unique inside one item
not a persistent claim ID
not a cross-turn identity
not semantic ordering authority
```

The full claim key is:

```text
(itemOrdinal, claimOrdinal)
```

### `mode`

Exactly one existing 3M mode:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

SOCIAL_FEED introduces no fourth truth class.

### `content`

```text
non-empty bounded plain semantic proposition text
untrusted
not HTML
not raw source-body storage
```

## 12. Why claim-level assertions are used

Unlike the first BOARD contract, a social post may naturally combine multiple propositions.

SF-3 therefore freezes:

```text
ONE ITEM
MAY CONTAIN
MULTIPLE CLAIMS
```

This avoids forcing one epistemic label across a mixed-claim post.

However:

```text
CLAIM LIST
!=
AUTOMATIC PROOF OF FREEFORM CONTENT COVERAGE
```

That gap is handled separately below.

## 13. Non-assertive content is allowed conservatively

A content-bearing item may have:

```text
assertions[] = []
```

only when trusted semantic-compliance context classifies the visible content as containing no proposition that requires 3M-2 assertion treatment.

Examples may include purely expressive or non-propositional text.

The producer cannot self-declare that status.

Canonical rule:

```text
NO STRUCTURED CLAIMS
!=
AUTOMATICALLY SAFE TEXT
```

## 14. Input B · trusted current validation context

Conceptually Input B contains current owner results such as:

```text
SocialFeedValidationAuthorityContextV1
  sourceAuthorityContext
  reachabilityContext
```

The validator also reuses the already-validated structural facts derived from the current draft under SF-1/SF-2 rules.

Input B is not model-authored.

## 15. Reachability exact join

The current `SocialFeedReachabilityContextV1` must bind to the exact same projection/source authority.

Frozen outcomes remain SF-1 authority:

```text
PUBLIC_FEED
→ REACHABLE_PUBLIC

UNKNOWN
→ HOLD_UNPROVEN_PUBLIC_REACHABILITY

RESTRICTED
→ UNSUPPORTED_RESTRICTED_SCOPE
```

SF-3 cannot convert UNKNOWN or RESTRICTED into public merely because item claims would otherwise be safe.

## 16. Public reachability grants no truth privilege

Canonical rules:

```text
REACHABLE_PUBLIC
!=
ALLOW_KNOWN_PUBLIC_FACT
```

and:

```text
PUBLIC_FEED
MUST NOT AUTO-SET
broadcastExposed
```

Reachability and exposure remain separate axes.

## 17. Input C · trusted semantic-policy / compliance contexts

The third authority lane contains three bounded context classes:

```text
A. actor-label semantic-compliance contexts
B. item semantic-compliance contexts
C. claim exposure-policy contexts
```

All are current-projection-only and externally supplied by a trusted evaluation/policy lane.

They are not model-owned fields inside the draft.

No active runtime classifier is authorized by this design.

## 18. Actor-label semantic-compliance context

Frozen conceptual type:

```text
SocialActorLabelComplianceContextV1
  actorOrdinal
  semanticEvidenceState
```

where:

```text
semanticEvidenceState ∈ {
  SUPPORTED,
  CONFLICTING,
  UNPROVEN
}
```

Meaning:

### SUPPORTED

The exact current `displayName + handle` pair has semantic-compliance evidence sufficient to use it as source-local attribution in this projection.

### CONFLICTING

Evidence indicates the label bundle introduces unsupported/hidden semantics or otherwise conflicts with the current eligible source projection.

### UNPROVEN

Current evidence cannot establish label eligibility.

The context must be bound to the exact current label bundle, not merely to `actorOrdinal` in the abstract.

Exact future fingerprint encoding is an implementation detail and is not authorized here.

## 19. Actor-label disposition

Validator-derived mapping:

```text
SUPPORTED
→ ALLOW / ALLOW_SOCIAL_ACTOR_LABEL_SUPPORTED

CONFLICTING
→ DENY / DENY_SOCIAL_ACTOR_LABEL_CONFLICT

UNPROVEN
→ HOLD / HOLD_SOCIAL_ACTOR_LABEL_UNPROVEN
```

One actor-label context is required for every drafted actor.

Missing, duplicate, extra, or stale/mismatched contexts are structural policy-input failures rather than silent defaults.

## 20. Item semantic-compliance context

Every drafted item requires one exact current semantic-compliance context.

Frozen conceptual type:

```text
SocialItemSemanticComplianceContextV1
  itemOrdinal
  sourceFidelityState
  contentCoverageState
```

The context must bind to the exact current item semantic unit, including the relevant actor attribution, kind, target relation, content, and assertion set.

Again, exact future fingerprint syntax is implementation detail.

## 21. `sourceFidelityState`

Frozen enum:

```text
SUPPORTED
CONFLICTING
UNPROVEN
```

Meaning:

### SUPPORTED

The proposed source-local semantic unit has evidence of faithful representation of the current source job.

For a REPOST, this includes the source-local action:

```text
actor X reposts target Y
```

For REPLY/QUOTE, it includes the proposed relationship attribution as well as authorship/source-local framing.

### CONFLICTING

The semantic unit conflicts with current source support.

### UNPROVEN

Faithful source representation is not established.

Canonical rule:

```text
SOURCE FIDELITY SUPPORTED
!=
UNDERLYING CLAIM IS CANONICALLY TRUE
```

It proves projection fidelity only.

## 22. Source-fidelity disposition

Validator mapping:

```text
SUPPORTED
→ ALLOW / ALLOW_SOCIAL_ITEM_SOURCE_FIDELITY

CONFLICTING
→ DENY / DENY_SOCIAL_ITEM_SOURCE_CONFLICT

UNPROVEN
→ HOLD / HOLD_SOCIAL_ITEM_SOURCE_UNPROVEN
```

A REPOST cannot bypass this gate merely because it has no body text.

## 23. `contentCoverageState`

For POST / REPLY / QUOTE:

```text
contentCoverageState ∈ {
  COVERED_BY_ASSERTIONS,
  NONASSERTIVE_ONLY,
  CONFLICTING_WITH_ASSERTIONS,
  UNPROVEN
}
```

For REPOST:

```text
contentCoverageState = NOT_APPLICABLE
```

### COVERED_BY_ASSERTIONS

Every assertive proposition in visible `content` is represented by the current structured assertion set without known mode-strength laundering.

### NONASSERTIVE_ONLY

The visible content contains no proposition requiring 3M-2 assertion treatment.

This state is valid only when:

```text
assertions[] = []
```

### CONFLICTING_WITH_ASSERTIONS

Evidence shows visible content contains claim semantics not faithfully represented by the structured assertion set, or the structured modes understate/alter the visible semantics.

### UNPROVEN

Coverage cannot be established.

## 24. Content-coverage disposition

For content-bearing items:

```text
COVERED_BY_ASSERTIONS
→ ALLOW / ALLOW_SOCIAL_CONTENT_ASSERTION_COVERAGE

NONASSERTIVE_ONLY + assertions[] = []
→ ALLOW / ALLOW_SOCIAL_NONASSERTIVE_CONTENT

CONFLICTING_WITH_ASSERTIONS
→ DENY / DENY_SOCIAL_CONTENT_ASSERTION_MISMATCH

UNPROVEN
→ HOLD / HOLD_SOCIAL_CONTENT_COVERAGE_UNPROVEN
```

Contradictory context shapes are invalid, for example:

```text
NONASSERTIVE_ONLY
+
non-empty assertions[]
```

The validator does not guess which side is correct.

## 25. Claim policy context

Every structured claim requires exactly one matching family wrapper around the frozen 3M-2 signal vocabulary.

Conceptual type:

```text
SocialFeedClaimPolicyContextV1
  itemOrdinal
  claimOrdinal
  broadcastExposed
  sourceCommunityContext
  sourceKnowledgeContext
  referenceContext
  currentUserExplicitPublicDisclosure
  currentUserMentionOnly
  outsideRootHistoryOnly
  visibleCueExposed
```

The context must be claim-specific and bound to the exact current claim proposition.

The model does not own these booleans.

Missing values are not silently treated as false.

## 26. Claim-policy contradiction handling

At minimum, existing 3M-3 contradiction protection remains:

```text
currentUserExplicitPublicDisclosure = true
AND
currentUserMentionOnly = true
→ invalid policy context
```

Any additional contradiction must be explicitly evidenced/frozen before use.

The validator does not invent precedence to repair contradictory semantic inputs.

## 27. Exact 3M-2 claim policy

SF-3 reuses the current 3M-2 decision function without SOCIAL_FEED-specific truth promotion.

### CONFIRMED_FACT

```text
broadcastExposed OR currentUserExplicitPublicDisclosure
→ ALLOW / ALLOW_KNOWN_PUBLIC_FACT

else currentUserMentionOnly
→ DENY / DENY_MERE_MENTION_PUBLICATION

else outsideRootHistoryOnly
→ DENY / DENY_EVENT_SCOPE_EXPOSURE_PROMOTION

else sourceCommunityContext
→ DENY / DENY_DERIVED_SOCIAL_PROMOTION

else sourceKnowledgeContext OR referenceContext
→ DENY / DENY_UNEXPOSED_PRIVATE_CONFIRMATION

else
→ DENY / DENY_UNKNOWN_PUBLIC_FACT
```

### ATTRIBUTED_SOCIAL

```text
sourceCommunityContext
→ ALLOW / ALLOW_ATTRIBUTED_SOCIAL_CONTEXT

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

### INFERENCE_OPINION

```text
visibleCueExposed
→ ALLOW / ALLOW_VISIBLE_CUE_INFERENCE

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

Canonical rule:

```text
SOCIAL-FEED FORM
GRANTS NO EXTRA EPISTEMIC PRIVILEGE
```

## 28. Claim-level consumer disposition

Each valid structured claim derives:

```text
ALLOW
→ ELIGIBLE

DENY
→ QUARANTINED_DENY

HOLD
→ QUARANTINED_HOLD
```

The producer cannot set this state.

## 29. Item atomicity

Visible SOCIAL_FEED content is an item-level presentation unit.

SF-3 freezes a conservative atomic rule:

```text
IF ANY STRUCTURED CLAIM IN AN ITEM IS DENY OR HOLD
THAT WHOLE ITEM CANNOT REMAIN ORDINARY-VISIBLE
```

The validator does not delete one unsafe proposition from freeform text and preserve the rest.

Reason:

```text
CLAIM QUARANTINE
without semantic text rewriting
cannot safely excise the matching natural-language clause
```

Canonical rule:

```text
NO PARTIAL FREEFORM CONTENT REPAIR
```

## 30. Own-policy item state

Before target dependency is considered, every item receives an `ownEligibilityState` from four independent gates:

```text
A. actor-label eligibility
B. item source-fidelity eligibility
C. content-coverage eligibility, if applicable
D. all claim-policy dispositions, if any
```

Lattice:

```text
if any own gate = DENY
→ ownEligibilityState = DENY

else if any own gate = HOLD
→ ownEligibilityState = HOLD

else
→ ownEligibilityState = ALLOW
```

This is deterministic and does not rely on an arbitrary single primary reason.

## 31. Own-policy reason collection

The validation receipt may record a bounded validator-derived set:

```text
ownReasonCodes[]
```

ordered by fixed category:

```text
actor label
source fidelity
content coverage
claim policy
```

No reason text is model-authored.

This avoids pretending one simultaneous failure is the only cause.

## 32. REPOST own-policy behavior

A REPOST has:

```text
actor-label gate
+
source-fidelity gate
```

and no content coverage / claim policy gates.

If both pass:

```text
ownEligibilityState = ALLOW
```

Only then does target dependency determine final eligibility.

Canonical rules:

```text
REPOST ACTION ALLOW
!=
TARGET CLAIM TRUTH UPGRADE
```

and:

```text
REPOST ACTION ALLOW
!=
ENDORSEMENT
```

## 33. Dependency closure input

SF-2 guarantees a structurally valid acyclic target graph before SF-3 semantic closure.

Therefore final item disposition may be derived over the bounded DAG without creating a second relationship authority.

No authoritative:

```text
ancestors[]
children[]
replyTree[]
```

is introduced.

## 34. Final item eligibility

Frozen rule:

### POST

```text
final ELIGIBLE
iff
ownEligibilityState = ALLOW
```

### REPLY / QUOTE / REPOST

```text
final ELIGIBLE
iff
ownEligibilityState = ALLOW
AND
target final disposition = ELIGIBLE
```

If own policy already DENY/HOLD, that own disposition remains the final quarantine class.

If own policy is ALLOW but target is not eligible:

```text
final consumerDisposition
= QUARANTINED_TARGET_NOT_ELIGIBLE
```

with validator reason:

```text
QUARANTINED_SOCIAL_TARGET_NOT_ELIGIBLE
```

## 35. Dependency quarantine does not inherit target truth reason

The dependent-item receipt does not need to copy the target's hidden semantic reason or content.

Canonical diagnostic boundary:

```text
dependent item may record
TARGET_NOT_ELIGIBLE

but must not copy
hidden target text
hidden target actor label
hidden target claim content
```

This preserves causal diagnostics without creating a covert semantic store.

## 36. Recursive closure

Because target chains may be nested:

```text
POST
← QUOTE
← REPLY
← REPOST
```

one upstream quarantine may recursively quarantine all ordinary-visible dependents whose understanding requires that target.

This is expected current-snapshot filtering.

It is not Candidate C durable partial-survival semantics.

## 37. Quote target is mandatory in V1

The SOCIAL_FEED master left open a possible future standalone-quote exception.

SF-2 did not authorize that exception.

SF-3 therefore freezes:

```text
QUOTE target not eligible
→ quote not ordinary-visible
```

No semantic-standalone bypass exists in V1.

## 38. Actor survival closure

After final item dispositions are known:

```text
validated actors
=
actors referenced by at least one final ELIGIBLE item
```

An actor referenced only by quarantined items is omitted from ordinary validated actor data.

Even a semantically allowed actor label does not create an independent profile surface.

Canonical rule:

```text
ACTOR ELIGIBLE
+
ZERO ELIGIBLE ITEMS
→ ACTOR NOT PRESENTED
```

## 39. No actor renumbering

After actor filtering, ordinal gaps are legal.

Example:

```text
draft actors: 0,1,2
actor 1 only has quarantined items
validated actors: 0,2
```

The validator must not renumber actor 2 to actor 1.

Structural identity remains snapshot-local original identity.

## 40. No item/timeline renumbering

After item quarantine, gaps are also legal in validated semantic output.

Example:

```text
draft timelineOrdinal: 0,1,2,3
item at 1 quarantined
validated timelineOrdinal: 0,2,3
```

The draft's dense `0..N-1` requirement is a structural input invariant.

Filtering does not authorize semantic repair/renumbering.

SF-4 may derive a non-authoritative presentation index if needed, while preserving semantic ordinals.

## 41. Empty draft

If:

```text
actors = []
items = []
```

and all required source/reachability joins are otherwise valid, SF-3 derives:

```text
VALID_EMPTY
```

Policy/compliance context collections must also be empty.

Extra orphan contexts are invalid rather than silently ignored.

## 42. All-items-quarantined case

If the draft is structurally valid and non-empty but zero items survive semantic/dependency closure:

```text
validationState = QUARANTINED
validated actors = []
validated items = []
```

No hidden item or actor semantic text is retained in the ordinary validated sidecar.

## 43. Mixed accepted/quarantined case

If at least one item survives and at least one drafted item is quarantined:

```text
validationState = VALID_WITH_QUARANTINE
```

Validated actor projection is derived only from surviving items.

## 44. All accepted case

If every drafted item survives and all structural/policy contexts are valid:

```text
validationState = VALID
```

## 45. Unsupported scope

Examples:

```text
family != SOCIAL_FEED
unsupported source authority shape
restricted/private reachability requiring ACL state
cross-turn target/reference semantics
```

produce:

```text
UNSUPPORTED_SCOPE
```

where appropriate rather than guessed compatibility.

## 46. UNKNOWN reachability

When source/reachability context is structurally valid but:

```text
reachabilityClass = UNKNOWN
```

the projection cannot proceed to ordinary visibility.

Conceptual result:

```text
validationState = QUARANTINED
projectionReason = HOLD_UNPROVEN_PUBLIC_REACHABILITY
validated actors = []
validated items = []
```

The validator does not pretend assertion ALLOW can compensate for missing public-reachability proof.

## 47. Structural invalidity remains whole-draft invalidity

Any SF-1/SF-2 structural failure remains:

```text
INVALID
validated sidecar = null
```

Examples include:

```text
duplicate actor ordinal
duplicate handle
unknown actor ref
orphan actor
invalid item ordinal
non-dense draft timeline
illegal target
cycle
unsupported item kind
```

SF-3 adds structural semantic-contract failures such as:

```text
unknown semantic field
invalid claim ordinal
duplicate claim ordinal
invalid assertion mode
unexpected REPOST content
unexpected REPOST assertion
missing/duplicate actor-label context
missing/duplicate item semantic context
missing/duplicate claim policy context
orphan policy/compliance context
mismatched semantic-evidence binding
contradictory content-coverage context
malformed claim policy context
```

## 48. No guessed repair

The validator is judge-only.

It does not:

```text
rewrite content
remove one unsafe sentence
change claim mode
invent a missing claim
invent exposure signals
rewrite actor labels
retarget an item
convert REPOST to QUOTE
renumber ordinals
promote HOLD to ALLOW
```

A new semantic proposal requires a separately authorized future producer flow.

## 49. Validated SOCIAL_FEED sidecar

Frozen conceptual ordinary semantic output:

```text
ValidatedSocialFeedSemanticSidecarV1
  schemaVersion = 1
  family = SOCIAL_FEED
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed trusted ref
  reachabilityState = REACHABLE_PUBLIC
  actors[]
  items[]
```

Only final ELIGIBLE actors/items are copied.

## 50. Validated actor view

Accepted actor view:

```text
SocialActorViewV1
  actorOrdinal
  displayName
  handle
```

No profile metadata is added.

No diagnostic reason code is needed for presentation semantics.

## 51. Validated item view

Accepted item view:

```text
SocialFeedItemViewV1
  itemOrdinal
  timelineOrdinal
  kind
  actorOrdinal
  targetItemOrdinal?
  content?
  assertions[]
```

For accepted dependent items, the target necessarily also exists in validated `items[]`.

No dangling ordinary-visible edge is possible.

## 52. Validated assertion view

Accepted structured claim view:

```text
SocialFeedAssertionViewV1
  claimOrdinal
  mode
  content
```

Every claim in an accepted item is policy ALLOW.

DENY/HOLD claim content is never copied into the validated sidecar because the containing item is atomic and quarantined.

## 53. Sidecar is semantic, receipt is diagnostic

SF-3 tightens the separation:

```text
VALIDATED SIDECAR
= ordinary semantic data

VALIDATION RECEIPT
= diagnostic disposition metadata
```

The presentation renderer should not need policy reason codes to render a valid feed.

This prevents diagnostic classifications from becoming presentation semantics.

## 54. Validation receipt

Frozen conceptual diagnostic object:

```text
SocialFeedSemanticValidationReceiptV1
  validationState
  projectionReason?
  draftedActorCount
  draftedItemCount
  draftedClaimCount
  acceptedActorCount
  acceptedItemCount
  deniedItemCount
  heldItemCount
  dependencyQuarantinedCount
  perActor[]
  perItem[]
  perClaim[]
```

All arrays are bounded by current-draft limits.

## 55. Per-actor receipt

May contain only bounded metadata such as:

```text
actorOrdinal
eligibilityState
reasonCode
```

It must not copy:

```text
displayName
handle
```

for quarantined-only actors.

## 56. Per-item receipt

May contain bounded metadata such as:

```text
itemOrdinal
kind
ownEligibilityState
ownReasonCodes[]
finalConsumerDisposition
finalReasonCode
claimCount
contentLength
```

It should not copy:

```text
content
actor labels
target content
```

A dependency-quarantined record may say that the required target was not eligible without reproducing that target's hidden semantics.

## 57. Per-claim receipt

May contain:

```text
itemOrdinal
claimOrdinal
mode
eligibilityState
reasonCode
consumerDisposition
contentLength
```

It must not duplicate claim text for DENY/HOLD items.

## 58. Receipt is not hidden history

The receipt is current-run bounded diagnostics only.

SF-3 does not authorize:

```text
persistent validation ledger
cross-turn receipt retrieval
hidden social source archive
future model-context insertion
```

## 59. Semantic-compliance evidence boundary

Mechanical validation can prove:

```text
schema shape
source-authority equality
reachability binding
actor/item/claim key integrity
SF-1/SF-2 structure
policy-context cardinality and contradiction freedom
exact 3M-2 decision function
item atomicity
recursive dependency closure
bounded sidecar/receipt construction
```

Mechanical validation cannot prove from syntax alone:

```text
that actor labels contain no hidden semantic fact
that item content faithfully reflects the current source
that the selected relationship is semantically correct
that every visible proposition is represented by the assertion set
that a producer selected the correct assertion mode
```

Those require separate semantic-compliance evidence.

Canonical rule:

```text
VALIDATOR PASS
!=
MODEL / PRODUCER SEMANTIC COMPLIANCE PROVEN
```

## 60. Evidence compatibility is claim-specific

Evidence valid for one surface cannot automatically authorize another.

Examples:

```text
claim exposure ALLOW
!= actor label semantic evidence

actor label SUPPORTED
!= item source fidelity

item source fidelity SUPPORTED
!= confirmed-fact exposure

PUBLIC_FEED reachability
!= any of the above
```

No authority laundering across axes is permitted.

## 61. Repost non-endorsement preserved

Even after a REPOST survives all gates:

```text
VALID REPOST
means only
current source projection may represent actor X reposting target Y
```

It still does not mean:

```text
X agrees
X endorses
Y is true
Y is more credible
many reposts form consensus
```

## 62. Quote/reply truth non-inheritance preserved

For accepted QUOTE or REPLY:

```text
own assertions
are validated independently
```

The accepted target does not donate its assertion authority to the dependent item.

Likewise the dependent item does not upgrade the target.

## 63. Source invalidation

SF-3 inherits current-projection support-at-use invalidation.

If the current source authority is replaced or no longer supports this SOCIAL_FEED projection:

```text
whole current validated social sidecar
→ invalid
```

No accepted item survives source replacement as durable derived state.

## 64. No cross-turn continuity

A later snapshot may contain identical:

```text
handle
item text
actor ordinal
item ordinal
relationship shape
```

None proves continuity.

```text
SAME LOOKING SOCIAL OBJECT LATER
!=
SAME DURABLE OBJECT
```

## 65. Candidate C remains inactive

SF-3 activates none of the durable capability set:

```text
C1 cross-turn survival       = no
C2 stable durable identity   = no
C3 item mutation             = no
C4 append / merge            = no
C5 derived lineage           = no
C6 context re-entry          = no
C7 durable partial survival  = no
C8 delayed effect            = no
```

Current-snapshot item filtering is not C7.

C7 pressure begins only when descendants must survive changes to durable persisted parents/sources across revisions or turns.

## 66. Persistence boundary

Frozen delta:

```text
persistent schema = 0
SnapshotStore keys = 0
Core state version = 0
social database = none
account registry = none
post registry = none
validation ledger = none
```

## 67. Context re-entry boundary

Frozen:

```text
ordinary future context re-entry = none
structured social source history = none
host history rewrite = none
hidden retrieval = none
```

Visible SOCIAL_FEED UI does not become future model memory.

## 68. Transport boundary

No active semantic transport is selected or authorized.

Still excluded:

```text
<SOCIAL_FEED> hidden output tag
JSON inside assistant prose
HTML comment sidecar
persistent message metadata
provider structured-output mode
second model call
post-generation extraction
```

A future active producer/transport requires its own integration impact scope and regression evidence.

## 69. Presentation boundary

SF-4 may consume only:

```text
ValidatedSocialFeedSemanticSidecarV1
```

It may not consume:

```text
untrusted draft
DENY/HOLD claim text
quarantined actor labels
validation receipt as semantic content
```

Renderer failure cannot mutate semantic eligibility.

## 70. Metrics/media remain excluded

SF-3 creates no authority for:

```text
likes
views
reply counts
repost counts
follower counts
verification badges
trend rank
avatars
images
video
remote media
```

These remain SF-5 reassessment territory.

## 71. Boundedness requirements

Any future implementation must define explicit conservative caps for at least:

```text
max actors per snapshot
max items per snapshot
max claims per item
max total claims
max displayName chars
max handle chars
max item content chars
max claim content chars
max aggregate semantic chars
max receipt rows
max target-DAG traversal work
```

Exact numeric values are implementation-preflight constants, not product semantics, and are not invented in this design-only checkpoint.

## 72. Dormancy

When SOCIAL_FEED is not the current authorized source job:

```text
SF-3 semantic draft work = 0
SF-3 policy-context work = 0
SF-3 graph closure work = 0
SF-3 receipt work = 0
history scan = 0
persistent I/O = 0
network/media calls = 0
```

When active, work is bounded to the current snapshot only.

## 73. Required evaluation order

Frozen conceptual order:

```text
1. validate root schema / strict unknown fields
2. exact-join current source authority
3. exact-bind reachability context
4. apply PUBLIC_FEED reachability gate
5. validate SF-1 actor structure
6. validate SF-2 item graph structure
7. validate actor-label policy-context cardinality/binding
8. validate item semantic-compliance context cardinality/binding
9. validate claim policy-context cardinality/binding
10. derive actor-label eligibility
11. derive item source-fidelity / content-coverage eligibility
12. run exact 3M-2 policy per claim
13. derive item ownEligibilityState
14. apply recursive target dependency closure
15. derive surviving actor projection
16. construct validated semantic sidecar
17. construct bounded receipt
18. hand accepted semantics to SF-4 only
```

No later step repairs or overrides an earlier authority failure.

## 74. Validation fixtures required before any implementation authorization

A future executable validator should include adversarial fixtures covering at least:

```text
safe actor labels + safe public fact
hidden fact inside displayName
hidden fact inside handle
safe item body + denied claim
mixed ALLOW + HOLD claims in one item
content claims omitted from assertion set
weaker-mode laundering in visible content
nonassertive-only content with zero claims
contradictory NONASSERTIVE context + non-empty claims
REPOST with unexpected commentary
REPOST source-fidelity conflict
REPOST target quarantined
QUOTE target quarantined
REPLY chain dependency quarantine
actor with only quarantined items
one actor with both accepted and quarantined items
all-items-quarantined sidecar
empty/empty valid draft
orphan policy context
stale/mismatched semantic evidence context
PUBLIC_FEED + private confirmed fact
UNKNOWN reachability + otherwise safe claims
RESTRICTED reachability
```

This list is evidence planning only, not implementation authorization.

## 75. Protected non-impact boundaries

SF-3 does not modify:

```text
production runtime
release-simcore
S7 / v0.70.3 plan
3M-2 policy semantics
3M-3 LIVE_REACTION validator semantics
SF-1 actor identity/reachability semantics
SF-2 graph semantics
prompt bytes
assistant output bytes
host history
persistent state
DOM/CSS
network behavior
media behavior
```

## 76. Design decisions frozen

```text
FAMILY                              = SOCIAL_FEED
MODE                                = C
FIRST REACHABILITY                  = PUBLIC_FEED
DRAFT AUTHORITY                     = UNTRUSTED
FINAL DISPOSITION OWNER             = VALIDATOR
ACTOR LABELS                        = SEMANTICALLY GATED
ASSERTION GRANULARITY               = CLAIM-LEVEL INSIDE ITEM
ASSERTION MODES                     = EXISTING 3M-2 THREE MODES
FREEFORM CONTENT                    = REQUIRES COVERAGE EVIDENCE
NONASSERTIVE CONTENT                = ALLOWED ONLY WITH TRUSTED NONASSERTIVE EVIDENCE
REPOST CONTENT                      = NONE
REPOST TRUTH EFFECT                 = NONE
ITEM POLICY                         = ATOMIC
DEPENDENCY                          = RECURSIVE TARGET ELIGIBILITY
QUARANTINED TARGET                  = DEPENDENT QUARANTINE
VALIDATED ACTORS                    = ONLY ACTORS WITH ACCEPTED ITEMS
ORDINAL RENNUMBERING AFTER FILTER   = FORBIDDEN
PERSISTENCE                         = NONE
CONTEXT RE-ENTRY                    = NONE
CANDIDATE C                         = NOT ACTIVATED
RUNTIME IMPLEMENTATION              = NOT AUTHORIZED
PRODUCTION                          = UNCHANGED
```

## 77. SF-4 handoff

SF-4 Presentation Grammar may now assume it receives only:

```text
ValidatedSocialFeedSemanticSidecarV1
```

with:

```text
safe surviving actor labels
safe surviving item content
accepted claims only
no dangling target edges
original snapshot-local ordinals preserved
PUBLIC_FEED reachability already proven
```

SF-4 must not reopen semantic validation.

## 78. Closure

SF-3 closes the semantic safety layer beneath SOCIAL_FEED presentation:

```text
CURRENT SOURCE AUTHORITY
+
PUBLIC FEED REACHABILITY
+
STRUCTURALLY VALID ACTORS / GRAPH
+
UNTRUSTED SOCIAL SEMANTICS
+
TRUSTED LABEL / ITEM / CLAIM POLICY CONTEXTS
        ↓
VALIDATOR-DERIVED CLAIM DISPOSITIONS
        ↓
ITEM-ATOMIC OWN POLICY
        ↓
RECURSIVE TARGET DEPENDENCY CLOSURE
        ↓
SURVIVING ACTOR PROJECTION
        ↓
VALIDATED SOCIAL_FEED SIDECAR
+
BOUNDED PRIVACY-SAFE RECEIPT
```

No persistent social state, durable account/post identity, output transport, or presentation implementation is authorized.

Next design checkpoint:

```text
SF-4 · Presentation Grammar / SOCIAL_TIMELINE_V1
```