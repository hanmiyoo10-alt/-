# SimCore Post-3.0M LRE-9 BOARD / NEWS Runtime Enablement Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-9 DESIGN FROZEN · DESIGN-ONLY · BOARD THEN NEWS STANDALONE FAMILY PROFILES FROZEN · BOARD/NEWS G6 CAP PROFILES FROZEN · NEWS BREAKING-ONLY G7 PROFILE FROZEN · RUNTIME ACTIVATION / RELEASE / TARGET-HOST PASS NOT AUTHORIZED OR CLAIMED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-9 · BOARD / NEWS · FAMILY ACTIVATION DESIGN · G6 / G7 / G8**

## 0. Purpose

LRE-9 freezes the runtime-enabling contracts for the two new first-major Source Intelligence families after the LIVE_REACTION migration design:

```text
BOARD
→ NEWS
```

The checkpoint answers:

```text
How does the LRE-2 semantic-control lane dispatch family-specific packets without one giant schema?
How is BOARD's participant-label exposure gap closed in the first runtime profile?
What exact bounded caps close the BOARD and NEWS G6 design gaps?
How is NEWS G7 made executable without creating a second clock or arbitrary maturity timer?
What family-specific G8 evidence is required?
What transaction boundaries must future BOARD and NEWS implementation preserve?
What still prevents BOARD_STAGE_READY / NEWS_STAGE_READY from being claimed today?
```

This document is design-only.

It does not implement selector code, producer prompts, transport parsing, validator code, presentation adapters, DOM/CSS, persistent state, Source history, Candidate C durability, network/media, deployment, target-host execution, or `release-simcore` mutation.

## 1. Authority chain

LRE-9 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE5_SEMANTIC_OWNER_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE6_PRESENTATION_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE7_PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE8_OLD_CHAT_MIXED_ERA_COMPATIBILITY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE9_BOARD_NEWS_RUNTIME_ENABLEMENT_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_8_NEWS_PUBLICATION_MATURITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_NARRATIVE_CLOCK_PERMANENT_FIXTURE_DESIGN_2026-08-26.md
```

The frozen Multi-Family Orchestration design is a compatibility constraint only. LRE-9 does not activate fanout.

Production runtime authority remains `release-simcore`.

## 2. LRE-8 prerequisite closure

Before LRE-9 detailed design began, LRE-8 had closed at design level with:

```text
legacy historical Community = READ-ONLY COMPATIBILITY
current structured Source authority = provenance/current-request based
manual edit != new Source generation
reroll = new generation under then-current runtime stage
reload without live provenance = passive / no Source authority
history-driven Source activation = forbidden
```

LRE-9 inherits these constraints unchanged.

BOARD and NEWS activation must not reopen legacy-history authority.

## 3. LRE-9 transaction model

LRE-9 freezes two future implementation transactions, not one combined rollout.

### Transaction E · `LRE_9A_BOARD_ACTIVATION`

Owns only:

```text
BOARD family runtime profile
BOARD packet / assembler
BOARD cap enforcement
BOARD Exposure / hierarchy validation path
BOARD G8 evidence
BOARD_THREAD_V1 dispatch
```

### Transaction F · `LRE_9B_NEWS_ACTIVATION`

May begin only after the BOARD activation transaction has its own required evidence.

Owns only:

```text
NEWS family runtime profile
NEWS packet / assembler
NEWS cap enforcement
NEWS Exposure + maturity path
G7 breaking-only maturity builder
NEWS G8 evidence
NEWS_ARTICLE_V1 dispatch
```

Neither transaction owns:

```text
legacy migration mechanics
multi-family fanout
interactive Source mutation
persistent Source history
Candidate C durability
SOCIAL_FEED
PUBLIC_KNOWLEDGE
repo/release-system restructuring
```

## 4. BOARD-before-NEWS is rollout sequencing only

Canonical law:

```text
BOARD activates before NEWS
```

means:

```text
prove generalized standalone family machinery with the structurally simpler family first
```

It does not mean:

```text
NEWS derives from BOARD
BOARD is evidence for NEWS
BOARD must exist in the same user turn
```

Every family continues to derive independently from current trusted authority.

## 5. Shared runtime dispatch seam

LRE-9 freezes the conceptual static registry:

```text
SourceFamilyRuntimeProfileRegistryV1
```

First entries:

```text
LIVE_REACTION
BOARD
NEWS
```

A profile contains only bounded dispatch ownership such as:

```text
family
packetSchema
assembler
policyPipeline
capProfile
presentationAdapter
maturityContextBuilder?  // NEWS only
```

The registry does not hold semantic payloads or mutable Source state.

Canonical law:

```text
COMMON FAMILY DISPATCH
!=
ONE COMMON SOURCE SEMANTIC SCHEMA
```

## 6. Family request authority

The runtime profile is selected from a trusted current prepared fact, conceptually:

```text
CurrentSourceFamilyRequestV1
  activationBasis
  family
```

The first-safe activation basis is:

```text
EXPLICIT_CURRENT_REQUEST
```

The exact target-host producer of this fact remains a G3 runtime-proof obligation.

The family is not selected from:

```text
model packet contents
family words appearing incidentally in prose
old Source cards
old <COMMUNITY>
history search
presentation state
model preference
```

If the packet shape does not match the already-selected family profile:

```text
FAMILY_PACKET_SCHEMA_MISMATCH
→ packet unusable
```

No packet field may switch the family.

## 7. Outer transport remains unchanged

All three first-major families reuse:

```text
TRANSIENT_TAIL_CARRIER_V1
```

with the same delimiters:

```text
<<<SIMCORE_SOURCE_DRAFT_V1>>>
{ strict family-specific JSON }
<<<END_SIMCORE_SOURCE_DRAFT_V1>>>
```

The outer transport remains pre-transcript and tail-only.

No family-specific delimiters are introduced.

The selected family profile determines which strict JSON schema is legal.

## 8. Common transport safety remains binding

For BOARD and NEWS:

```text
carrier-bearing raw bytes
→ never trusted host representation

cleanContent
→ existing visible output pipeline

carrier persisted chars
→ 0
```

The LRE-2 transient-carrier fingerprint FIX remains mandatory.

## 9. BOARD runtime proposal packet

Frozen model-facing packet:

```text
BoardSourceProposalPacketV1
  schemaVersion = 1
  jobToken
  participants[]
  entries[]
```

Participant proposal:

```text
BoardParticipantProposalV1
  participantOrdinal
```

Entry proposal:

```text
BoardEntryProposalV1
  entryOrdinal
  kind = POST | REPLY
  authorParticipantOrdinal
  parentEntryOrdinal
  mode
  title
  content
  supportBasis
  supportQuote
```

Unknown fields invalidate the packet.

The packet does not include:

```text
family selector
sourceAuthorityRef
displayName
ALLOW / DENY / HOLD
consumerDisposition
persistent identity
```

## 10. BOARD participant-label FIX closure

LRE-9 impact identified:

```text
FIX · BOARD_PARTICIPANT_LABEL_EXPOSURE_GAP
```

The first runtime profile resolves it with:

```text
BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1
```

The model does not author participant display labels.

Trusted assembly maps each accepted participant ordinal to a deterministic family-local anonymous label.

Conceptual semantic label source:

```text
participantOrdinal = 0 → anonymous ordinal label 1
participantOrdinal = 1 → anonymous ordinal label 2
...
```

A renderer may localize the static prefix, for example equivalent UI text to `익명 1`, without creating a world identity.

Canonical law:

```text
ANONYMOUS ORDINAL LABEL
= FAMILY-LOCAL PRESENTATION/SEMANTIC AFFORDANCE
!=
CANONICAL CHARACTER IDENTITY
```

Named participant profiles are deferred.

## 11. BOARD participant structural rules

Frozen first-runtime rules:

```text
participantOrdinal = unique integer 0..7
participant count = 0..8
```

Every entry references one existing participant ordinal.

If:

```text
entries = []
```

then:

```text
participants = []
```

Unused participant proposals do not enter the validated participant projection.

No participant count or label from quarantined-only entries reaches ordinary presentation.

## 12. BOARD entry ordering / graph rules

Frozen:

```text
entryOrdinal = unique integer 0..11
```

Counts:

```text
POST  <= 4
REPLY <= 8
TOTAL <= 12
```

For POST:

```text
parentEntryOrdinal = null
title = non-empty
```

For REPLY:

```text
parentEntryOrdinal = existing POST ordinal
title = null
```

No reply-to-reply nesting.

No future parent, self-parent, or cross-projection parent.

Maximum accepted/drafted direct replies per POST:

```text
4
```

The validator rejects invalid graphs rather than reparenting them.

## 13. `BOARD_CAP_PROFILE_V1`

Frozen engineering ceilings:

```text
MAX_SOURCE_PRODUCER_CONTRACT_CHARS          = 3072

MAX_PARTICIPANTS                            = 8
MAX_PARTICIPANT_ORDINAL                     = 7

MAX_ENTRIES                                 = 12
MAX_ENTRY_ORDINAL                           = 11
MAX_POSTS                                   = 4
MAX_REPLIES                                 = 8
MAX_REPLIES_PER_POST                        = 4

MAX_ANONYMOUS_LABEL_CHARS                   = 24
MAX_POST_TITLE_CHARS                        = 120
MAX_POST_CONTENT_CHARS                      = 480
MAX_REPLY_CONTENT_CHARS                     = 320
MAX_AGGREGATE_ENTRY_SEMANTIC_CHARS          = 4096

MAX_SUPPORT_QUOTE_CHARS                     = 256
MAX_AGGREGATE_SUPPORT_QUOTE_CHARS           = 2048

MAX_JOB_TOKEN_CHARS                         = 128
MAX_PACKET_JSON_CHARS                       = 16384
MAX_PROTOCOL_ZONE_CHARS                     = 17408

MAX_VALIDATION_RECEIPT_ROWS                 = 12
MAX_TRUSTED_SOURCE_REGION_SCAN_CHARS        = 32768
MAX_SOURCE_TURN_EVIDENCE_SERIALIZED_CHARS   = 4096
```

Counts use the same implementation counting primitive chosen for the applicable LRE runtime profile.

## 14. BOARD semantic-size accounting

`MAX_AGGREGATE_ENTRY_SEMANTIC_CHARS` includes:

```text
all POST titles
+ all POST content
+ all REPLY content
```

It does not include deterministic anonymous labels.

The aggregate ceiling intentionally prevents every field from simultaneously hitting its per-field maximum.

## 15. BOARD cap failure policy

No cap can be repaired by truncation.

Examples:

```text
13 entries
→ ENTRY_COUNT_EXCEEDED
→ packet unusable

5th POST
→ POST_COUNT_EXCEEDED
→ packet unusable

5th reply to one POST
→ REPLIES_PER_POST_EXCEEDED
→ packet unusable

481-char POST
→ POST_CONTENT_OVERSIZE
→ packet unusable
```

Forbidden:

```text
first 12 entries only
trim title
trim supportQuote
remove extra reply and keep rest
```

Canonical law:

```text
CAP EXCEEDED
→ FAIL CLOSED AT OWNING LAYER
```

## 16. BOARD assembler

Conceptual owner:

```text
BoardSourceDraftAssemblerV1
```

Input:

```text
strict BoardSourceProposalPacketV1
trusted current SourceJobSelection / family request
trusted SourceAuthorityContextV1
```

Output:

```text
BoardSemanticSidecarDraftV1
```

The assembler:

```text
attaches trusted sourceAuthorityRef
copies structural/semantic entry proposal fields
creates deterministic anonymous participant labels
removes support proof material from semantic object
```

The assembler does not:

```text
repair graph errors
rewrite content
change assertion mode
invent participant identities
```

## 17. BOARD Exposure proof

Each entry gets exactly one support-proof / policy-context lane using the LRE-2 vocabulary:

```text
CURRENT_BROADCAST_FACT
SOURCE_COMMUNITY_ATTRIBUTED
VISIBLE_BROADCAST_CUE
SOURCE_KNOWLEDGE_CONTEXT
UNKNOWN
```

Exact quote membership is checked only in the current trusted direct-B-root structural regions.

Participant ordinal labels do not require a separate Exposure proof because they contain no model/world identity content in the first runtime profile.

## 18. BOARD policy and hierarchy order

Frozen runtime order:

```text
1. current family selection = BOARD
2. transport / token / packet schema / caps
3. trusted source authority exact join
4. participant structural checks
5. POST/REPLY graph checks
6. per-entry support proof
7. per-entry 3M-2 Exposure policy
8. parent visibility dependency
9. visible participant projection
10. validated Board sidecar
11. support-at-use currentness gate
12. BOARD_THREAD_V1 presentation
```

A reply with own ALLOW but non-visible parent remains:

```text
QUARANTINED_PARENT_NOT_ELIGIBLE
```

## 19. BOARD validation accounting

Required conservation:

```text
entryCount
= allowedEntryCount
+ deniedEntryCount
+ heldEntryCount
+ parentQuarantinedCount
```

A child whose own policy is DENY/HOLD is counted by that own disposition, not again as parent-quarantined.

`parentQuarantinedCount` is reserved for:

```text
own policy = ALLOW
parent not eligible
```

No double counting.

## 20. BOARD G8 extension

Latest-turn bounded evidence may add:

```text
family = BOARD
participantCount
entryCount
postCount
replyCount
allowedEntryCount
deniedEntryCount
heldEntryCount
parentQuarantinedCount
validatedParticipantCount
validatedThreadCount
presentationItemCount
capStatus
```

It may not store:

```text
title
entry content
supportQuote
anonymous label strings
quarantined semantic text
```

## 21. BOARD presentation contract

Input:

```text
ValidatedBoardSemanticSidecarV1
```

Adapter:

```text
BOARD_THREAD_V1
```

Mount/binding uses the already-frozen LRE-6 exact-current presentation architecture.

BOARD does not use legacy `<COMMUNITY>` as presentation fallback or compatibility bridge.

For a migrated BOARD turn:

```text
newLegacyContextCharsThisTurn = 0
structuredReentryChars = 0
```

## 22. BOARD activation design acceptance

`BOARD_G6_DESIGN` is closed only if:

```text
all cap constants above are frozen
packet/assembler shape is frozen
anonymous participant FIX is applied
G8 count conservation is frozen
legacy bridge remains prohibited
```

This document closes that **design** obligation.

It does not close runtime G2/G3/G4/G5/G6/G8 evidence.

## 23. NEWS runtime proposal packet

Frozen model-facing packet:

```text
NewsSourceProposalPacketV1
  schemaVersion = 1
  jobToken
  stories[]
```

Story:

```text
NewsStoryProposalV1
  storyOrdinal
  requestedMaturity
  reportKind
  headline
  bodyAssertions[]
```

Headline and body components use:

```text
SourceAssertionProposalV1
  ordinal
  mode
  content
  supportBasis
  supportQuote
```

The packet contains no model-owned maturity verdict or source authority reference.

## 24. NEWS ordinal profile

Frozen first-runtime scheme:

```text
storyOrdinal = unique integer 0..1
```

Within each story:

```text
headline.ordinal = 0
body assertion ordinals = unique integers 1..4
```

Thus a semantic component is request-locally joined by:

```text
(storyOrdinal, assertionOrdinal)
```

No ordinal is a persistent article/claim identity.

## 25. NEWS report/maturity enums

Report-kind vocabulary remains exactly:

```text
DIRECT_REPORT
OFFICIAL_STATEMENT
ATTRIBUTED_CLAIM
RUMOR
OPINION_COLUMN
ADVERTORIAL
CORRECTION
```

Requested maturity remains exactly:

```text
BREAKING_COARSE
DEVELOPING_DETAIL
FOLLOWUP_ANALYSIS
```

LRE-9 does not rename the inherited assertion-mode vocabulary.

## 26. `NEWS_CAP_PROFILE_V1`

Frozen engineering ceilings:

```text
MAX_SOURCE_PRODUCER_CONTRACT_CHARS          = 4096

MAX_STORIES                                 = 2
MAX_STORY_ORDINAL                           = 1

MAX_BODY_ASSERTIONS_PER_STORY               = 4
MAX_SEMANTIC_COMPONENTS_TOTAL               = 10

MAX_HEADLINE_CHARS                          = 160
MAX_BODY_ASSERTION_CHARS                    = 480
MAX_AGGREGATE_NEWS_SEMANTIC_CHARS           = 4096

MAX_SUPPORT_QUOTE_CHARS                     = 256
MAX_AGGREGATE_SUPPORT_QUOTE_CHARS           = 2048

MAX_JOB_TOKEN_CHARS                         = 128
MAX_PACKET_JSON_CHARS                       = 16384
MAX_PROTOCOL_ZONE_CHARS                     = 17408

MAX_RECEIPT_STORY_ROWS                      = 2
MAX_RECEIPT_COMPONENT_EVALUATIONS           = 10
MAX_TRUSTED_SOURCE_REGION_SCAN_CHARS        = 32768
MAX_SOURCE_TURN_EVIDENCE_SERIALIZED_CHARS   = 4096
```

`MAX_SEMANTIC_COMPONENTS_TOTAL` counts:

```text
one headline per story
+ all body assertions
```

## 27. NEWS semantic-size accounting

Aggregate semantic chars count:

```text
all headline content
+ all body assertion content
```

SupportQuote bytes are separately bounded proof material and are not included in the validated semantic aggregate.

No semantic or proof truncation is permitted.

## 28. NEWS cap failure policy

Examples:

```text
3 stories
→ STORY_COUNT_EXCEEDED

5 body assertions in one story
→ BODY_ASSERTION_COUNT_EXCEEDED

headline > 160 chars
→ HEADLINE_OVERSIZE

body assertion > 480 chars
→ BODY_ASSERTION_OVERSIZE

semantic total > 4096 chars
→ NEWS_SEMANTIC_AGGREGATE_EXCEEDED
```

Any structural packet cap failure makes the packet unusable.

No story/claim salvage is allowed from a structurally oversize packet.

## 29. NEWS assembler

Conceptual owner:

```text
NewsSourceDraftAssemblerV1
```

It:

```text
attaches trusted current sourceAuthorityRef
copies strict story semantic fields
copies headline/body ordinal/mode/content only into semantic assertions
routes supportBasis/supportQuote only to proof construction
```

It cannot:

```text
set maturity verdict
rewrite requested maturity
fabricate publication time
create byline/outlet identity
```

## 30. G7 profile selection

The first runtime NEWS profile is frozen as:

```text
DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
```

The profile intentionally proves only coarse breaking publication from the same already-current public direct-B-root source.

It does not attempt arbitrary publication realism.

## 31. G7 owner boundary

Conceptual owner:

```text
NewsPublicationMaturityContextBuilderV1
```

It consumes only trusted current data from existing owners.

Allowed inputs:

```text
exact current direct-B-root Handoff/Evidence authority
exact current B-root message
existing Time canonical timestamp primitives
current Narrative/Time canonical floor/current timestamp
structural BROADCAST_VISIBLE region
```

It does not own:

```text
clock
source history
publication archive
model timing claims
real-world network latency
```

## 32. Source-root time extraction

The builder may inspect only the exact current trusted B-root representation after identity/currentness join succeeds.

The source-root canonical time must be derived through existing Time-owned timestamp parsing/sequence primitives or an already prepared equivalent Time authority fact.

Forbidden:

```text
regex a plausible time from arbitrary prose and call it canonical
search prior messages for nearest timestamp
model-supplied publishedAt
NEWS-local stopwatch
```

If no canonical source-root time is available:

```text
basisState = UNKNOWN
```

## 33. Current-time authority

Current comparison time must come from existing current Narrative/Time authority.

If:

```text
current canonical time missing
or source/current timestamps incomparable
or trusted time facts contradictory
```

then:

```text
basisState = UNKNOWN
```

The maturity builder does not repair time authority.

## 34. Breaking-only trusted maturity mapping

When all trusted basis conditions pass:

```text
eventOccurredByCurrentFrame
= sourceRootTime <= currentNarrativeTime

sourceReachedByCurrentFrame
= eventOccurredByCurrentFrame
  AND exact current direct-B-root join
  AND BROADCAST_VISIBLE region is non-empty

coarsePublicationReady
= sourceReachedByCurrentFrame

detailedPublicationReady
= false

followupPublicationReady
= false
```

When basis cannot be proven:

```text
basisState = UNKNOWN
```

Otherwise:

```text
basisState = PROVEN
```

with the booleans above.

## 35. NEWS maturity outcomes in first runtime profile

Therefore:

```text
BREAKING_COARSE
+ proven/reached current source
→ ALLOW_BREAKING_COARSE

DEVELOPING_DETAIL
→ HOLD_DETAIL_AHEAD_OF_MATURITY

FOLLOWUP_ANALYSIS
→ HOLD_DETAIL_AHEAD_OF_MATURITY
```

If basis is unknown:

```text
HOLD_UNKNOWN_PUBLICATION_MATURITY
```

If source time is future relative to current time:

```text
HOLD_FUTURE_NARRATIVE_EVENT
```

If the root is not current/reached:

```text
HOLD_SOURCE_NOT_REACHED
```

No downgrade from requested detail to breaking is performed.

## 36. Why breaking readiness may be immediate here

This profile is a product-specific generic first NEWS source, not a claim about all newspapers.

The first source is permitted to form a coarse report when the exact current direct-B-root broadcast evidence is already audience-visible and current.

Canonical limitation:

```text
DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
= bounded first-runtime publication profile
!= universal publication propagation model
```

No minute/hour threshold is invented.

## 37. NEWS Exposure remains per component

Every headline/body component gets its own LRE-2 support-proof and 3M-2 policy context.

Maturity ALLOW never substitutes for Exposure ALLOW.

Canonical law:

```text
MATURITY_ALLOW
!=
PUBLIC FACT AUTHORITY
```

## 38. NEWS story-atomic acceptance remains binding

A story reaches the validated sidecar only if:

```text
source exact join = valid
maturity = ALLOW
headline Exposure = ALLOW
all body Exposure = ALLOW
```

Otherwise:

```text
whole story = QUARANTINED_STORY
```

No partial article salvage.

## 39. NEWS validation order

Frozen runtime order:

```text
1. current family selection = NEWS
2. transport / token / packet schema / caps
3. trusted source authority exact join
4. per-component support proof
5. per-component 3M-2 Exposure policy
6. trusted G7 maturity-context construction
7. 3M-8 maturity policy
8. story-atomic acceptance
9. validated NEWS sidecar
10. support-at-use currentness gate
11. NEWS_ARTICLE_V1 presentation
```

Neither renderer nor model can bypass the maturity gate.

## 40. NEWS validation accounting

Required story conservation:

```text
storyCount
= acceptedStoryCount
+ quarantinedStoryCount
```

Required component accounting:

```text
headline evaluations = storyCount
body evaluations = total body assertion count
component evaluations <= 10
```

Exposure counts must conserve independently across:

```text
ALLOW / DENY / HOLD
```

Maturity counts must conserve across:

```text
ALLOW / HOLD
```

## 41. NEWS G8 extension

Latest-turn bounded evidence may add:

```text
family = NEWS
storyCount
bodyAssertionCount
componentEvaluationCount
acceptedStoryCount
quarantinedStoryCount
maturityAllowCount
maturityHoldCount
headlineAllowCount
headlineDenyCount
headlineHoldCount
bodyAllowCount
bodyDenyCount
bodyHoldCount
maturityBasisProvenCount
maturityBasisUnknownCount
presentationStoryCount
capStatus
```

No semantic text, timestamp strings, supportQuote, or quarantined content is stored in this evidence object.

## 42. NEWS presentation contract

Input:

```text
ValidatedNewsSemanticSidecarV1
```

Adapter:

```text
NEWS_ARTICLE_V1
```

Mount uses LRE-6 exact-current presentation binding.

No legacy Community bridge exists for NEWS.

For a migrated NEWS turn:

```text
newLegacyContextCharsThisTurn = 0
structuredReentryChars = 0
```

## 43. Family profile dispatch table

Frozen conceptual table:

```text
LIVE_REACTION
  packet      = SourceProposalPacketV1
  validator   = 3M-3 flat assertion path
  caps        = LIVE_REACTION_CAP_PROFILE_V1
  renderer    = LIVE_REACTION_STREAM_V1
  maturity    = none

BOARD
  packet      = BoardSourceProposalPacketV1
  validator   = Board Exposure + hierarchy path
  caps        = BOARD_CAP_PROFILE_V1
  renderer    = BOARD_THREAD_V1
  maturity    = none

NEWS
  packet      = NewsSourceProposalPacketV1
  validator   = News Exposure + maturity + story-atomic path
  caps        = NEWS_CAP_PROFILE_V1
  renderer    = NEWS_ARTICLE_V1
  maturity    = DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
```

## 44. Family profile immutability inside one request

Once the trusted current selector freezes a family profile for a Source job:

```text
family profile cannot change inside that request
```

A malformed BOARD packet cannot be retried as LIVE_REACTION.

A NEWS maturity HOLD cannot be switched into BOARD presentation.

No family substitution fallback.

## 45. DORMANT baseline remains zero Source burden

If there is no trusted current family request/source job:

```text
SourceJobSelector = DORMANT
family packet parser = 0
BOARD assembler/validator = 0
NEWS assembler/maturity/validator = 0
presentation work = 0
Source history scan = 0
persistent Source read/write = 0
network = 0
extra model call = 0
```

Registered families do not run simply because they exist.

## 46. No history-proportional family work

BOARD and NEWS costs depend only on:

```text
current proposal packet
current trusted source root
current bounded policy context
```

They must not scale with prior Board/News projections.

No archive is introduced.

## 47. Persistence / Candidate C

For LRE-9 Tier A:

```text
persistent Source schema delta = 0
Board DB = NONE
News archive = NONE
stable participant identity = NONE
stable article identity = NONE
cross-turn append = NONE
structured source re-entry = NONE
```

Therefore LRE-9 itself adds no new Candidate C durability requirement.

The separately designed interactive BOARD mutation lane remains Tier B and independent.

## 48. Legacy / mixed-era fence

LRE-9 must preserve LC5:

```text
historical <COMMUNITY> readable
historical <COMMUNITY> not Source authority
unknown historical provenance passive-only
no automatic retro-conversion
```

BOARD/NEWS Source activation cannot originate from historical legacy material.

## 49. Multi-family fence

Even though standalone family profiles are designed to be reusable later, LRE-9 activates only one family per current Source projection.

```text
ACTIVE_SINGLE only
```

No fanout packet, shared aggregate budget, sibling scheduler, or cross-family result graph is introduced.

## 50. BOARD future implementation acceptance packet

Before a BOARD runtime transaction may claim `BOARD_STAGE_READY`, evidence must prove at least:

```text
B1 G1 then-current production re-preflight PASS
B2 G2 Exposure target-host/model-compliance PASS for BOARD producer contract
B3 G3 exact current family-request authority PASS
B4 G4 Board packet transport / token / strip / carrier hygiene PASS
B5 BOARD_CAP_PROFILE_V1 enforcement PASS
B6 anonymous-participant profile / no named identity leak PASS
B7 POST/REPLY graph and parent quarantine PASS
B8 source mismatch/reroll invalidation PASS
B9 G5 target-host BOARD_THREAD_V1 exact mount PASS
B10 edit/reload/navigation lifecycle according to current G5 contract PASS
B11 G8 accounting/conservation PASS
B12 new legacy context growth = 0
B13 structured re-entry = 0
B14 DORMANT ordinary path PASS
```

## 51. NEWS future implementation acceptance packet

Before NEWS may claim `NEWS_STAGE_READY`, evidence must prove at least:

```text
N1 G1 then-current production re-preflight PASS
N2 G2 NEWS producer/model-compliance PASS
N3 G3 exact current family-request authority PASS
N4 G4 News packet transport / token / strip / carrier hygiene PASS
N5 NEWS_CAP_PROFILE_V1 enforcement PASS
N6 G7 trusted source/time maturity builder PASS
N7 BREAKING_COARSE positive case PASS
N8 DEVELOPING_DETAIL HOLD case PASS
N9 FOLLOWUP_ANALYSIS HOLD case PASS
N10 future/incomparable/unknown time fail-closed cases PASS
N11 headline/private-fact Exposure trap PASS
N12 story-atomic quarantine PASS
N13 source mismatch/reroll invalidation PASS
N14 G5 target-host NEWS_ARTICLE_V1 exact mount PASS
N15 edit/reload/navigation lifecycle PASS
N16 G8 story/component conservation PASS
N17 new legacy context growth = 0
N18 structured re-entry = 0
N19 DORMANT ordinary path PASS
```

## 52. Release ordering

If implementation is later authorized, the default sequence is:

```text
LRE-9A BOARD implementation branch
→ static / CI
→ release-simcore BOARD-capability deployment
→ target-host BOARD validation
→ real bounded / long-chat BOARD evidence
→ main docs sync

THEN

LRE-9B NEWS implementation branch
→ static / CI
→ release-simcore NEWS-capability deployment
→ target-host NEWS validation
→ real bounded / long-chat NEWS evidence
→ main docs sync
```

Do not deploy BOARD and NEWS for the first time in one feature transaction.

## 53. Rollback boundaries

BOARD failure:

```text
rollback BOARD family capability at explicit release/config boundary
```

must not:

```text
reopen independent legacy Community semantic generation
```

NEWS failure:

```text
rollback NEWS family capability
```

must not require rolling back already-proven BOARD unless a shared common-family dispatch defect is demonstrated.

## 54. Failure isolation

A family-specific failure must remain family-local where the common transport/control plane is healthy.

Examples:

```text
NEWS maturity basis unknown
→ NEWS holds
→ BOARD contract unchanged

BOARD graph invalid
→ BOARD unavailable for that job
→ LIVE_REACTION contract unchanged
```

Shared transport/profile-registry defects are common-plane failures and must be classified separately.

## 55. WATCH / FIX / DEFER ledger

### FIX closed by this design

```text
FIX · BOARD_PARTICIPANT_LABEL_EXPOSURE_GAP
→ first-runtime resolution = BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1
```

The historical 3M-5 named `displayName` field remains a broader conceptual family design field, but it is not allowed in the first runtime proposal profile.

### WATCH

```text
WATCH · BOARD_TITLE_BODY_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · SOURCE_SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · NEWS_BREAKING_ONLY_PROFILE_IS_INTENTIONALLY_NARROW
WATCH · G5_EQUAL_VALUE_MANUAL_EDIT_SIGNAL_REMAINS_TARGET_HOST_DEPENDENT
```

### DEFER

```text
DEFER · NAMED_BOARD_PARTICIPANT_PROFILE
DEFER · NEWS_DEVELOPING_DETAIL_RUNTIME_PROFILE
DEFER · NEWS_FOLLOWUP_ANALYSIS_RUNTIME_PROFILE
DEFER · PERSISTENT_BOARD_THREAD_IDENTITY
DEFER · PERSISTENT_NEWS_ARTICLE_IDENTITY
DEFER · MULTI_FAMILY_RUNTIME
DEFER · SOCIAL_FEED_RUNTIME
DEFER · PUBLIC_KNOWLEDGE_RUNTIME
```

## 56. BLOCKER ledger

Runtime activation remains blocked by unresolved proof, including:

```text
BLOCKER · TRUSTED_FAMILY_REQUEST_INPUT_NOT_TARGET_HOST_PROVEN
BLOCKER · G2_TARGET_HOST_MODEL_COMPLIANCE_NOT_PROVEN
BLOCKER · G4_FAMILY_PACKET_RUNTIME_TRANSPORT_NOT_PROVEN
BLOCKER · G5_TARGET_HOST_PRESENTATION_BINDING_NOT_PROVEN
BLOCKER · MODEL_PACKET_SELECTS_OR_CHANGES_FAMILY
BLOCKER · BOARD_MODEL_GENERATED_PARTICIPANT_IDENTITY_IN_FIRST_RUNTIME
BLOCKER · BOARD_HIDDEN_PARENT_OR_PARTICIPANT_METADATA_LEAK
BLOCKER · BOARD_DENY_HOLD_CHILD_ENTERING_VALIDATED_PAYLOAD
BLOCKER · NEWS_MODEL_OWNED_MATURITY_VERDICT
BLOCKER · NEWS_INVENTED_TIME_AUTHORITY
BLOCKER · NEWS_PARTIAL_STORY_SALVAGE
BLOCKER · FAMILY_CAP_TRUNCATION_INTO_VALIDITY
BLOCKER · BOARD_OR_NEWS_LEGACY_COMMUNITY_BRIDGE
BLOCKER · BOARD_OR_NEWS_STRUCTURED_REENTRY
BLOCKER · MULTI_FAMILY_FANOUT_MIXED_INTO_LRE9
```

These block runtime claims, not design freeze.

## 57. Gate disposition after LRE-9 design

```text
BOARD packet / assembler design             = FROZEN
BOARD participant first-runtime profile     = FROZEN
BOARD G6 cap design                         = FROZEN
BOARD G8 extension design                   = FROZEN

NEWS packet / assembler design              = FROZEN
NEWS G6 cap design                          = FROZEN
NEWS G7 breaking-only maturity design       = FROZEN
NEWS G8 extension design                    = FROZEN

G2 target-host/model compliance             = PENDING
G3 trusted family request runtime proof     = PENDING
G4 family packet runtime proof              = PENDING
G5 presentation target-host proof           = PENDING
G6 runtime enforcement proof                = PENDING
G7 runtime maturity-builder proof           = PENDING
G8 runtime instrumentation proof            = PENDING

BOARD_STAGE_READY                           = NOT CLAIMED
NEWS_STAGE_READY                            = NOT CLAIMED
```

## 58. No runtime authorization

Nothing in this design means:

```text
implement BOARD now
implement NEWS now
change prompt now
change release-simcore now
run target-host validation now
```

Any implementation requires a separately authorized LRE-9A or LRE-9B transaction beginning with a fresh G1 production preflight.

## 59. Next checkpoint

After LRE-9 design convergence, the Legacy / Runtime-enabling roadmap reaches:

```text
LRE-10 · First-Major Integration / Release / Real-Validation Close
```

LRE-10 must not claim deployment or real validation merely because LRE-0..9 design contracts are frozen.

Its design role is to converge the release/validation ordering and acceptance package across:

```text
LIVE_REACTION
BOARD
NEWS
legacy mixed-era compatibility
Source dormancy
presentation lifecycle
context-growth retirement
```

before any separately authorized implementation/release program can claim the first runtime major closed.

## 60. Final freeze

```text
LRE_9_DESIGN                                  = FROZEN
LRE_9_RUNTIME_IMPLEMENTATION                  = NOT_AUTHORIZED

FAMILY_ACTIVATION_ORDER                       = BOARD → NEWS
COMMON_FAMILY_DISPATCH                        = SourceFamilyRuntimeProfileRegistryV1
OUTER_TRANSPORT                               = TRANSIENT_TAIL_CARRIER_V1

BOARD_PACKET                                  = BoardSourceProposalPacketV1
BOARD_PARTICIPANTS                            = BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1
BOARD_CAP_PROFILE                             = BOARD_CAP_PROFILE_V1
BOARD_PRESENTATION                            = BOARD_THREAD_V1

NEWS_PACKET                                   = NewsSourceProposalPacketV1
NEWS_CAP_PROFILE                              = NEWS_CAP_PROFILE_V1
NEWS_MATURITY_PROFILE                         = DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
NEWS_PRESENTATION                             = NEWS_ARTICLE_V1

PERSISTENCE                                   = NONE
STRUCTURED_SOURCE_REENTRY                     = NONE
LEGACY_COMMUNITY_BRIDGE_BOARD_NEWS            = NONE
MULTI_FAMILY_RUNTIME                          = NOT_IN_SCOPE
CANDIDATE_C_NEW_REQUIREMENT                   = NONE

BOARD_STAGE_READY                             = NOT_CLAIMED
NEWS_STAGE_READY                              = NOT_CLAIMED
PRODUCTION                                    = UNCHANGED
release-simcore                               = UNCHANGED
NEXT_DESIGN                                   = LRE-10 FIRST-MAJOR CONVERGENCE
```
