# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-1 Settlement Context Authority Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-1 DESIGN FROZEN · SETTLEMENT CONTEXT OWNER SELECTED · STATELESS CURRENT-PROJECTION COMPOSER · EVIDENCE-BOUND PUBLIC-RECORD STANDING · CANDIDATE C NOT ACTIVATED · IMPLEMENTATION NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-1 · SETTLEMENT CONTEXT AUTHORITY · DESIGN-ONLY**

## 0. Purpose

PK-0 froze PUBLIC_KNOWLEDGE as a public-reference projection and intentionally left one blocker:

```text
WHO MAY PRODUCE PublicKnowledgeSettlementContextV1?
```

PK-1 answers that question without implementing runtime code.

The core problem is to create a trusted settlement input without creating a second world-truth owner.

Canonical invariant:

```text
CANONICAL WORLD SUPPORT
!=
EXPOSURE ELIGIBILITY
!=
PUBLIC-RECORD STANDING
!=
PUBLIC_KNOWLEDGE VALIDATOR VERDICT
```

## 1. Final ownership decision

PK-1 selects a new conceptual current-projection policy adapter:

```text
PublicKnowledgeSettlementContextComposer
```

Ownership:

```text
Source Intelligence policy layer
```

Its authority is narrow:

```text
trusted bounded inputs
→ exact joins
→ settlement basis entries
```

It is not allowed to create facts, public exposure, source identity, or final document disposition.

## 2. Authority matrix

### Frame / Continuity / Time

Own already-defined canonical/current narrative facts and temporal currentness.

They do not decide PUBLIC_KNOWLEDGE settlement.

### Evidence / Lineage / Handoff

Own current exact support binding and the machine evidence references that can be joined to current source/target authority.

PK-1 additionally assigns the raw public-record-standing evidence boundary to the Evidence side of this authority chain.

Conceptual upstream evidence object:

```text
PublicRecordStandingEvidenceV1
```

This is a design boundary, not an implemented schema.

### Exposure Policy

Owns whether an assertion may be publicly/source asserted.

Exposure never becomes settlement evidence merely because it returns ALLOW.

### Settlement Context Composer

Owns only mechanical composition of trusted current-turn evidence into bounded basis entries.

### PUBLIC_KNOWLEDGE Validator

Owns final reference state and final per-assertion disposition.

### Main model / semantic producer

Owns natural-language semantic proposal only.

It cannot mint public-record standing, basis authority, or final settlement state.

### Presentation Renderer

Owns status-preserving presentation only.

It cannot upgrade or erase settlement state.

## 3. The Evidence-owned public-record-standing boundary

The PUBLIC_KNOWLEDGE family requires a semantic signal stronger than simple exposure.

A trusted upstream Evidence-side adapter may expose bounded current public-record standing when upstream machine semantics actually support it.

It may not infer standing from prose style or popularity.

Canonical rule:

```text
EVIDENCE MAY BIND PUBLIC-RECORD STANDING

but

EVIDENCE DOES NOT BECOME A SECOND WORLD-TRUTH DATABASE
```

The Evidence-side signal must be a view over already-authoritative current facts/public-record relations, not a persistent encyclopedia registry.

If current upstream authority cannot express the needed public-record standing:

```text
NO TRUSTED STANDING SIGNAL
→ no settlement basis
→ HOLD / UNKNOWN
```

## 4. Composer runtime shape

Future conceptual function:

```text
composePublicKnowledgeSettlementContext(
  CurrentSourceAuthorityContext,
  CurrentDocumentTargetContext,
  CurrentCanonicalSupportBindings,
  CurrentExposureBindings,
  CurrentPublicRecordStandingEvidence
)
→ PublicKnowledgeSettlementContextV1
```

This signature is conceptual only.

The composer is:

```text
PURE / STATELESS IN FIRST SCOPE
CURRENT_PROJECTION_ONLY
BOUNDED
DETERMINISTIC
FAIL-CLOSED
```

Forbidden dependencies:

```text
model call
network call
host transcript scan
source-family history scan
persistent settlement store
search index
revision database
social metric aggregation
NEWS article counting
```

## 5. Exposure binding is non-upgrading

The composer may bind current Exposure receipts so context entries are tied to the same current assertion/source scope.

However:

```text
EXPOSURE ALLOW
!=
SETTLEMENT BASIS
```

Exposure remains an independent validator prerequisite.

A basis cannot rescue Exposure DENY/HOLD.

Likewise Exposure ALLOW cannot create `ESTABLISHED_PUBLIC_RECORD_BASIS` by itself.

## 6. Context status

PK-1 freezes conceptual context-level statuses:

```text
CONTEXT_READY
CONTEXT_READY_EMPTY
CONTEXT_HOLD_INSUFFICIENT_EVIDENCE
CONTEXT_INVALID_BINDING
CONTEXT_UNSUPPORTED_SCOPE
```

Meaning:

### CONTEXT_READY

At least one structurally valid trusted settlement basis exists for the current target/source scope.

### CONTEXT_READY_EMPTY

The trusted producer successfully evaluated the current scope and found no eligible basis entries.

This does not mean every assertion is false or private.

### CONTEXT_HOLD_INSUFFICIENT_EVIDENCE

The current scope is structurally supported but required public-record standing evidence is unavailable, incomplete, or ambiguous.

### CONTEXT_INVALID_BINDING

A supplied trusted-looking binding does not exact-match current source/target/support authority.

### CONTEXT_UNSUPPORTED_SCOPE

The request is outside the first frozen direct-B-root/current-projection scope.

Exact implementation enums remain future runtime work.

## 7. Basis entry conceptual shape

PK-1 freezes the information categories a basis entry must support, without preempting PK-2 exact schema:

```text
PublicKnowledgeSettlementBasisV1
  basisRef
  basisClass
  sourceAuthorityRef
  targetRef
  canonicalSupportRef?
  publicRecordStandingRef
  attributionRef?
  relationRefs?          // correction / contest / withdrawal as applicable
```

Important:

```text
basisRef
= opaque trusted join handle

basisRef
!= semantic truth by itself
```

The model cannot gain authority by guessing a basisRef string.

## 8. Frozen first basis classes

```text
ESTABLISHED_PUBLIC_RECORD_BASIS
ATTRIBUTED_PUBLIC_RECORD_BASIS
CONTESTED_PUBLIC_RECORD_BASIS
CORRECTED_PUBLIC_RECORD_BASIS
WITHDRAWN_PUBLIC_RECORD_BASIS
```

These basis classes are trusted evidence classes, not the final rendered reference states.

The validator still maps basis + assertion mode + exposure result into the PK-0 states:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
UNKNOWN_SETTLEMENT
```

Canonical split:

```text
BASIS CLASS
!=
FINAL REFERENCE STATE
```

## 9. ESTABLISHED_PUBLIC_RECORD_BASIS

Purpose:

```text
support a candidate ordinary settled public-reference assertion
```

Required first-scope conditions:

```text
current source authority exact-match
current target exact-match
trusted canonical/current support exists
trusted public-record standing explicitly says established
all referenced support is current
```

Exposure ALLOW is still separately required by the validator.

Forbidden substitutes:

```text
many reports
many likes
high viewCount
trendRank
viralityScore
old age
model confidence
official-looking source label
```

### Key anti-collapse rule

```text
CANONICAL SUPPORT EXISTS
+
EXPOSURE ALLOW
+
NO ESTABLISHED PUBLIC-RECORD STANDING
→ NOT ESTABLISHED BASIS
```

This preserves settlement as a real third axis.

## 10. ATTRIBUTED_PUBLIC_RECORD_BASIS

Purpose:

```text
represent that a bounded attributable public record/claim exists
without settling the underlying proposition
```

Required:

```text
trusted current source/target binding
trusted attributable public-record existence evidence
```

Optional:

```text
trusted attributionRef / attributionLabel
```

The attribution label is semantic data and must come from trusted authority.

If the public claim exists but no specific trusted label is available, the basis may remain generic.

Canonical rule:

```text
ATTRIBUTED CLAIM EXISTENCE
!=
ATTRIBUTED CLAIM TRUTH
```

## 11. CONTESTED_PUBLIC_RECORD_BASIS

Purpose:

```text
represent a material current public dispute / conflicting public record
```

Required:

```text
explicit trusted contest standing
+
bounded trusted contest relation reference
+
current source/target binding
```

The contest relation may point to bounded machine references rather than duplicate natural-language claim text.

Forbidden contest discovery:

```text
NEWS history mining
BOARD disagreement counting
SOCIAL_FEED sentiment analysis
engagement threshold
keyword contradiction search
model says "controversial"
```

### No numeric controversy heuristic

Even valid SOCIAL_FEED metrics remain orthogonal:

```text
replyCount = huge
viralityScore = huge
trendRank = 1

!=
CONTESTED PUBLIC RECORD
```

## 12. CORRECTED_PUBLIC_RECORD_BASIS

Purpose:

```text
represent a current corrected public-record relation
```

Required conceptual evidence:

```text
trusted current corrected-record standing
current replacement/support reference
superseded/corrected record reference
current source/target binding
```

The composer must be able to establish that the relation is current and explicit.

Forbidden:

```text
newer timestamp alone
later NEWS publication alone
changed wording alone
model-authored "correction" label
```

### No revision-history invention

PK-1 correction is snapshot-only.

It does not create:

```text
revision IDs
old document retrieval
revision diff
undo / restore
persistent article history
```

### Current replacement rule

The corrected current assertion must bind to current support.

The superseded record reference exists only to establish correction semantics; it does not automatically re-enter the validated document as current truth.

## 13. WITHDRAWN_PUBLIC_RECORD_BASIS

Purpose:

```text
represent that a bounded prior public claim/record has been explicitly withdrawn or retracted
```

Required conceptual evidence:

```text
trusted withdrawal/retraction standing
trusted withdrawn-record relation
current source/target binding
```

Forbidden inference:

```text
claim disappeared
source stopped mentioning it
time passed
engagement fell
new source omitted it
→ withdrawn
```

Withdrawal must be explicit in trusted evidence.

## 14. One resolved primary standing per V1 basis

First scope intentionally avoids compound epistemic states.

For one basis entry, upstream standing must resolve to exactly one of the five first basis classes.

If current trusted evidence yields incompatible simultaneous states without an explicit upstream resolution:

```text
CORRECTED + CONTESTED unresolved
ESTABLISHED + WITHDRAWN unresolved
ATTRIBUTED + ESTABLISHED ambiguous identity
```

then:

```text
NO BASIS EMITTED
CONTEXT / ASSERTION → HOLD_AMBIGUOUS_PUBLIC_RECORD_STANDING
```

The composer must not invent a precedence order.

Compound states remain deferred.

## 15. Basis construction decision table

Conceptual first table:

| Trusted current evidence | Composer result |
| --- | --- |
| source/target binding invalid | `CONTEXT_INVALID_BINDING` |
| scope unsupported | `CONTEXT_UNSUPPORTED_SCOPE` |
| no public-record standing signal | no basis / `HOLD_INSUFFICIENT_EVIDENCE` |
| established standing + canonical current support | `ESTABLISHED_PUBLIC_RECORD_BASIS` |
| established standing but canonical support absent/stale | no basis / HOLD |
| attributable public record standing | `ATTRIBUTED_PUBLIC_RECORD_BASIS` |
| explicit contest standing + valid contest relation | `CONTESTED_PUBLIC_RECORD_BASIS` |
| contest standing without valid relation | no basis / HOLD |
| correction standing + current replacement + superseded relation | `CORRECTED_PUBLIC_RECORD_BASIS` |
| correction missing replacement/relation | no basis / HOLD |
| withdrawal standing + explicit withdrawn relation | `WITHDRAWN_PUBLIC_RECORD_BASIS` |
| withdrawal without explicit relation | no basis / HOLD |
| incompatible multiple standings | no basis / `HOLD_AMBIGUOUS_PUBLIC_RECORD_STANDING` |

This is design vocabulary, not executable code.

## 16. Public-record standing signal identity

The Evidence-side standing signal must be machine-bound, not freeform prose.

Conceptual categories:

```text
standingRef
standingKind
sourceAuthorityRef
targetRef
supportRefs[]
relationRefs[]
```

The exact schema is intentionally deferred to the producer/PK-2 implementation contract.

What matters in PK-1 is ownership and mechanical joinability.

## 17. Evidence producer constraints

The upstream Evidence-side adapter may only emit standing evidence from already-authoritative bounded inputs.

It must not:

```text
crawl conversation history
count source mentions
call a model to decide consensus
query the network
maintain a wiki DB
persist standing across turns
promote derived family output into source evidence
```

If a real future consumer needs any of those, it is a new design problem rather than an implicit extension of PK-1.

## 18. Exact join rules

A basis is invalid when any required binding fails exact current equality.

Conceptually:

```text
basis.sourceAuthorityRef == current.sourceAuthorityRef
basis.targetRef == current.targetRef
supportRef ∈ current trusted support set
standingRef ∈ current trusted standing evidence set
```

No fuzzy fallback:

```text
same title
same visible name
similar paragraph
same handle
same old document text
```

cannot repair a failed join.

## 19. Currentness

Currentness remains an upstream semantic property owned by existing Frame / Time / Continuity / Evidence contracts.

The composer may consume a currentness-compatible support reference.

It may not infer currentness from:

```text
latest-looking timestamp text
position in conversation
render order
model wording
```

A stale correction or stale established standing cannot be promoted because it looks newer.

## 20. Attribution label safety

A specific source/actor attribution label is itself a semantic claim.

Therefore:

```text
trusted attributionRef present
→ renderer may show trusted label

trusted attributionRef absent
→ renderer may show generic status only
```

Forbidden fallback:

```text
"officials"
"experts"
"multiple reports"
"the public"
```

unless those labels are themselves trusted semantic data.

## 21. Ambiguity is not consensus

When multiple trusted basis candidates exist for the same assertion identity, the composer must not use majority voting.

Forbidden:

```text
3 established signals vs 1 contested signal
→ established wins
```

First scope instead requires explicit upstream resolution or produces HOLD.

This prevents an evidence-counting heuristic from sneaking settlement back in through the side door.

## 22. NEWS relationship

NEWS publication maturity and PUBLIC_KNOWLEDGE settlement remain independent.

```text
BREAKING_COARSE
DEVELOPING_DETAIL
FOLLOWUP_ANALYSIS
```

are NEWS maturity concepts, not settlement signals.

Even repeated `FOLLOWUP_ANALYSIS` does not create a settlement basis.

The same underlying current world/public evidence may independently support NEWS and PUBLIC_KNOWLEDGE, but:

```text
NEWS OUTPUT
!=
SETTLEMENT INPUT
```

## 23. SOCIAL_FEED relationship

The reserved SOCIAL_FEED metric surface remains valid as social-source semantics.

But none of these are settlement basis classes:

```text
likeCount
reactionCount
repostCount
quoteCount
replyCount
viewCount
impressionCount
bookmarkCount
followerCount
followingCount
engagementScore
trendRank
viralityScore
```

Canonical rule:

```text
SOCIAL IMPORTANCE
!=
PUBLIC-REFERENCE SETTLEMENT
```

## 24. User/public disclosure relationship

A current user explicit public disclosure may satisfy an Exposure path where 3M-2 allows it.

It does not automatically mint established public-record standing.

Likewise text such as:

```text
"everyone knows this now"
"this is common knowledge"
```

does not self-certify settlement unless upstream trusted machine authority separately establishes public-record standing.

## 25. Context completeness

A settlement context is bounded and need not contain a basis for every draft assertion.

```text
missing basis for assertion X
→ X may HOLD
```

It does not imply the whole current context is malformed unless the structural/binding contract itself is invalid.

This preserves per-assertion epistemic quarantine while keeping source-support invalidation separate.

## 26. Context lifetime

Frozen first lifetime:

```text
CURRENT SOURCE JOB
CURRENT DOCUMENT TARGET
CURRENT PROJECTION ONLY
```

No persistence:

```text
SettlementStore = NONE
SettlementHistory = NONE
SettlementCache across turns = NONE
```

The context may exist as a transient current-request object only.

## 27. Invalidation

The context inherits 3M-6 support-at-use rules.

If current source authority or target authority changes:

```text
old settlement context
→ STALE
→ not repairable by title/history matching
```

The next valid projection must compose from current trusted inputs again.

V1 does not partially preserve old basis entries across source replacement.

## 28. Navigation boundary

Same-request future navigation may eventually select a new target, but PK-1 does not authorize it.

If target changes:

```text
old target settlement context
!=
new target settlement context
```

No cross-target basis reuse.

PK-4 owns navigation reassessment.

## 29. Candidate C status

PK-1 does not activate Candidate C.

```text
C1 cross-turn derived survival       = NO
C2 stable derived identity           = NO
C3 item mutation                     = NO
C4 append / merge / revision         = NO
C5 derived-to-derived lineage        = NO
C6 future context re-entry           = NO
C7 partial descendant survival       = NO
C8 delayed semantic side effect      = NO
```

Candidate C pressure appears only if a later requirement adds durable settlement identity, revision history, derived-source propagation, or future retrieval.

## 30. Failure taxonomy

PK-1 preserves separate failure domains:

```text
SOURCE SUPPORT FAILURE
PUBLIC-RECORD EVIDENCE FAILURE
EXPOSURE DENY/HOLD
SETTLEMENT BASIS HOLD/AMBIGUITY
PK-2 DOCUMENT VALIDATION FAILURE
PRESENTATION FAILURE
```

Examples:

```text
sourceAuthorityRef stale
→ source support failure

public-record standing missing
→ settlement basis HOLD

Exposure DENY
→ policy quarantine regardless of valid basis

renderer crash
→ validated semantics remain valid
```

## 31. Security / laundering invariants

```text
MODEL CONFIDENCE
!= SETTLEMENT

NEWS REPETITION
!= SETTLEMENT

SOCIAL POPULARITY
!= SETTLEMENT

SOURCE PRESTIGE
!= SETTLEMENT

ELAPSED TIME
!= SETTLEMENT

CANONICAL TRUTH ALONE
!= SETTLEMENT

EXPOSURE ALLOW ALONE
!= SETTLEMENT

CONVINCING WIKI PRESENTATION
!= SETTLEMENT
```

## 32. Runtime-readiness result

PK-1 resolves the design owner question:

```text
SETTLEMENT CONTEXT PRODUCER OWNER
= Source Intelligence Settlement Context Composer
  over Evidence-bound current public-record standing
```

But runtime remains not authorized because no executable producer/transport has been implemented or evidenced.

Future runtime readiness still requires:

```text
actual machine producer for PublicRecordStandingEvidenceV1
actual transient context transport
PK-2 exact sidecar + validator contract
concrete hard caps
host presentation mount authority
real target-host / model-compliance evidence
```

## 33. BLOCKER classification

```text
BLOCKER · SETTLEMENT_COMPOSER_CREATES_WORLD_FACTS
BLOCKER · EVIDENCE_STANDING_IS_DERIVED_FROM_PROSE_OR_POPULARITY
BLOCKER · CANONICAL_PLUS_EXPOSURE_AUTO_SETTLES
BLOCKER · MODEL_MINTS_BASISREF_OR_FINAL_STATE_AUTHORITY
BLOCKER · COMPOSER_MAJORITY_VOTES_CONFLICTING_STANDINGS
BLOCKER · CONTEST_WITHOUT_TRUSTED_RELATION
BLOCKER · CORRECTION_WITHOUT_CURRENT_REPLACEMENT_AND_SUPERSEDED_RELATION
BLOCKER · WITHDRAWAL_WITHOUT_EXPLICIT_TRUSTED_RELATION
BLOCKER · DERIVED_FAMILY_OUTPUT_USED_AS_SETTLEMENT_INPUT
BLOCKER · STALE_CONTEXT_REUSED_AFTER_SOURCE_OR_TARGET_CHANGE
```

## 34. WATCH classification

```text
WATCH · PUBLIC_RECORD_STANDING_EVIDENCE_PROVIDER_MUST_REMAIN_STATELESS_FIRST_SCOPE
WATCH · ATTRIBUTION_LABEL_IS_SEMANTIC_SOURCE_IDENTITY
WATCH · COMPOUND_CONTESTED_CORRECTION_STATE_DEFERRED
WATCH · ESTABLISHED_STANDING_REQUIRES_REAL_UPSTREAM_MACHINE_SEMANTICS_BEFORE_RUNTIME
WATCH · EXPOSURE_BINDING_MUST_REMAIN_NON_UPGRADING
```

## 35. DEFER classification

```text
DEFER · COMPOUND_EPISTEMIC_STATES
DEFER · SETTLEMENT_BY_DERIVED_SOURCE_CONSENSUS
DEFER · MULTI_B_SETTLEMENT_WINDOW
DEFER · PERSISTENT_SETTLEMENT_REGISTRY
DEFER · REVISION_HISTORY
DEFER · CROSS_TURN_SETTLEMENT_SEARCH
DEFER · NETWORK_REFERENCE_LOOKUP
```

## 36. Frozen PK-1 decisions

```text
PK-1 OWNER
= PublicKnowledgeSettlementContextComposer

COMPOSER LIFETIME
= current projection only

COMPOSER STATE
= stateless

RAW PUBLIC-RECORD STANDING BOUNDARY
= Evidence-side trusted machine evidence

FINAL SETTLEMENT VERDICT OWNER
= PUBLIC_KNOWLEDGE Validator

BASIS CLASSES
= ESTABLISHED_PUBLIC_RECORD_BASIS
  ATTRIBUTED_PUBLIC_RECORD_BASIS
  CONTESTED_PUBLIC_RECORD_BASIS
  CORRECTED_PUBLIC_RECORD_BASIS
  WITHDRAWN_PUBLIC_RECORD_BASIS

NO TRUSTED BASIS
= HOLD / UNKNOWN

COMPOUND STANDING
= HOLD in V1 unless explicitly resolved upstream

NEWS OUTPUT AS BASIS
= FORBIDDEN

SOCIAL METRICS AS BASIS
= FORBIDDEN

PERSISTENCE
= NONE

CANDIDATE C
= NOT ACTIVATED

RUNTIME IMPLEMENTATION
= NOT AUTHORIZED
```

## 37. Closure

PK-1 closes the trusted settlement producer ownership problem without collapsing settlement into truth or exposure.

Final conceptual flow:

```text
Frame / Continuity / Time current support
+
Evidence / Lineage / Handoff exact bindings
+
Evidence-side public-record standing
+
Exposure current binding
        ↓
PublicKnowledgeSettlementContextComposer
        ↓
bounded trusted settlement basis context
        ↓
PK-2 PUBLIC_KNOWLEDGE Validator
        ↓
validator-derived public-reference state
```

The next PUBLIC_KNOWLEDGE design checkpoint is:

```text
PK-2 · Document Sidecar + Validator Contract
```

PK-2 must freeze the exact draft/validated schema, basisRef joins, quarantine behavior, and bounded validation receipt without granting implementation authority.
