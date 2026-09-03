# SimCore Post-3.0M LRE-9 BOARD / NEWS Runtime Enablement Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · DESIGN-ONLY · BOARD THEN NEWS STANDALONE ACTIVATION SEAMS SELECTED · BOARD PARTICIPANT-LABEL EXPOSURE GAP CLASSIFIED FIX · NEWS BREAKING-ONLY G7 PROFILE SELECTED · NO RUNTIME / RELEASE AUTHORITY**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-9 · BOARD / NEWS · FAMILY-STAGE ACTIVATION · G6 / G7 · IMPACT SCOPE**

## 0. Purpose

LRE-9 is the first legacy/runtime-enabling checkpoint whose primary purpose is to add new first-major Source families after the LIVE_REACTION migration design has converged.

The master requires separate bounded activation transactions in this order:

```text
BOARD
→ NEWS
```

This impact scope answers:

```text
What exact standalone runtime surfaces must widen beyond LIVE_REACTION?
Which existing owners remain authoritative?
How should family-specific proposal packets extend LRE-2 without one giant source schema?
What BOARD-specific runtime gap must be fixed before activation?
What concrete BOARD / NEWS cap categories must close G6?
What is the narrowest defensible G7 NEWS maturity profile without inventing new time authority?
What remains blocked until target-host / runtime proof?
```

This is design-only.

It does not implement selector code, prompt bytes, transport parsing, validators, DOM/CSS, presentation mounting, history, persistence, Candidate C, network/media, release publication, or `release-simcore` mutation.

## 1. Authority chain

LRE-9 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE6_PRESENTATION_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE7_PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE8_OLD_CHAT_MIXED_ERA_COMPATIBILITY_DESIGN_2026-09-03.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_8_NEWS_PUBLICATION_MATURITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
```

Compatibility-only inputs:

```text
docs/SIMCORE_POST_3M_MULTI_FAMILY_ORCHESTRATION_MASTER_DESIGN_2026-09-01.md
```

The multi-family design does not become runtime scope here.

Production runtime authority remains `release-simcore`.

## 2. Design-time repository snapshot

At LRE-9 entry:

```text
LRE-8 detailed design = merged
main = 9a8cf8d1d5b39d7f5b7a72583ccfc51a76ce669a
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production runtime = unchanged v0.70.1 lane
```

The LRE-8 exact-main `Verify` and `Required` checks passed.

Future implementation must re-run G1 against then-current production.

## 3. Selected LRE-9 scope

Only these family activation seams are selected:

```text
Transaction E
DIRECT_B_ROOT_MODE_C_BOARD_RUNTIME_V1

Transaction F
DIRECT_B_ROOT_MODE_C_NEWS_RUNTIME_V1
```

Both remain:

```text
CURRENT PROJECTION ONLY
READ-ONLY
NON-PERSISTENT
NO AUTOMATIC CONTEXT RE-ENTRY
NO HISTORICAL SOURCE RETRIEVAL
NO DERIVED-TO-DERIVED AUTHORITY
NO USER MUTATION
NO REQUIRED NETWORK / MEDIA
```

## 4. Explicit exclusions

LRE-9 does not activate:

```text
multi-family fanout
SOCIAL_FEED
PUBLIC_KNOWLEDGE
interactive BOARD mutation
stable participant/article identity
source archive/history
reload replay of Source cards
cross-family propagation
Candidate C durability
legacy Community migration mechanics
new core mode
```

LRE-7/LRE-8 mixed-era protections remain unchanged.

## 5. Activation order is a rollout order, not truth dependency

Required order:

```text
BOARD transaction closes
→ then NEWS transaction may be attempted
```

Reason:

BOARD is the first new non-LIVE family and proves the generalized family-profile / structured transport extension with less policy complexity.

NEWS then adds publication maturity on top.

Canonical separation:

```text
BOARD MUST ACTIVATE FIRST FOR ROLLOUT SAFETY
!=
NEWS CONSUMES BOARD SEMANTICS
```

NEWS still derives independently from current trusted source authority.

## 6. Existing owners that must remain unchanged

LRE-9 must reuse, not replace:

```text
Lifecycle
Lineage
Source Handoff
Evidence
Time
current prepared request/source authority
3M-2 Exposure policy
3M-3 validator ownership
3M-6 support-at-use invalidation
LRE-6 presentation binding profile
LRE-8 mixed-era isolation
```

No new source root resolver, clock owner, history resolver, or canonical truth owner is justified.

## 7. Smallest new common seam

The smallest common runtime extension is a static family profile registry, conceptually:

```text
SourceFamilyRuntimeProfileRegistryV1
  LIVE_REACTION
  BOARD
  NEWS
```

Each profile owns only dispatch metadata such as:

```text
expected proposal packet kind
family draft assembler
family policy pipeline
cap profile
presentation adapter
optional family-specific trusted policy builder
```

This registry is not:

```text
one giant Source semantic schema
persistent family state
family truth authority
user preference storage
multi-family scheduler
```

Canonical rule:

```text
COMMON DISPATCH
!=
COMMON SEMANTIC OBJECT
```

## 8. Family selection remains trusted current-request input

LRE-2 froze that family activation must come from current prepared authority rather than history or lexical residue.

LRE-9 preserves this.

Conceptual prepared fact:

```text
CurrentSourceFamilyRequestV1
  activationBasis
  family
```

First-safe activation basis:

```text
EXPLICIT_CURRENT_REQUEST
```

The selector must not choose BOARD / NEWS because:

```text
word "board" or "news" appears incidentally
old card exists
old Community exists
model chooses a favorite family
renderer asks for a family
```

The exact target-host mechanism that produces the trusted prepared family request remains runtime proof work under G3.

Classification:

```text
BLOCKER · TRUSTED_FAMILY_REQUEST_INPUT_NOT_TARGET_HOST_PROVEN
```

This blocks runtime stage claims, not LRE-9 design.

## 9. Transport extension principle

LRE-2 froze one generic transient carrier envelope:

```text
<<<SIMCORE_SOURCE_DRAFT_V1>>>
{ strict JSON }
<<<END_SIMCORE_SOURCE_DRAFT_V1>>>
```

LRE-9 should reuse that outer transport.

Do not add one delimiter family per Source family.

But the strict packet inside must remain family-specific.

Canonical direction:

```text
trusted selector family
→ selects expected strict packet schema
→ parser validates exactly that schema
```

not:

```text
model packet says family=NEWS
→ model changes runtime family
```

## 10. BOARD proposal packet seam

Selected conceptual packet:

```text
BoardSourceProposalPacketV1
  schemaVersion = 1
  jobToken
  participants[]
  entries[]
```

Model-facing participant proposal is deliberately narrower than the 3M-5 semantic participant object:

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

Trusted `sourceAuthorityRef` is attached by the assembler, never echoed by the model.

## 11. FIX · BOARD participant-label exposure gap

3M-5 froze:

```text
BoardParticipantDraftV1
  participantOrdinal
  displayName
```

and correctly made `displayName` non-canonical.

However, the first design did not assign an independent Exposure policy context to participant display labels.

A model-proposed label could therefore leak a private/canonical identity while the referenced entry itself passes policy.

Example:

```text
participant displayName = hidden canonical identity
entry content = harmless allowed reaction
→ identity leak through author label
```

Classification:

```text
FIX · BOARD_PARTICIPANT_LABEL_EXPOSURE_GAP
```

## 12. Selected first-runtime BOARD participant fix

The narrowest safe first-runtime profile is:

```text
BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1
```

Rules:

```text
model does not propose displayName
participantOrdinal remains projection-local identity
trusted assembler supplies deterministic non-world-identifying anonymous label
renderer may localize that anonymous ordinal label
named/canonical participant labels are not first-runtime capability
```

Therefore:

```text
MODEL-GENERATED PARTICIPANT IDENTITY = NONE
```

This resolves the gap without inventing a generic identity Exposure subsystem.

A future named-participant profile requires a separate semantic/policy contract.

## 13. BOARD policy flow remains unchanged otherwise

Selected flow:

```text
Board proposal packet
→ strict schema / caps
→ trusted source authority exact join
→ deterministic anonymous participant assembly
→ per-entry support proof
→ per-entry 3M-2 Exposure policy
→ POST/REPLY graph validation
→ parent-visibility dependency
→ validated Board sidecar
→ support-at-use
→ BOARD_THREAD_V1
```

No legacy Community parser participates.

## 14. BOARD G6 categories to close in LRE-9 detailed design

Concrete numbers must be frozen for:

```text
producer contract chars
participant count
entry count
POST count
REPLY count
replies per POST
anonymous label chars
POST title chars
POST content chars
REPLY content chars
aggregate semantic chars
support quote chars / aggregate
job token
packet JSON
protocol zone
receipt rows
trusted source scan
G8 evidence export
```

No first-N salvage or semantic truncation may be used.

## 15. NEWS proposal packet seam

Selected conceptual packet:

```text
NewsSourceProposalPacketV1
  schemaVersion = 1
  jobToken
  stories[]
```

Story proposal:

```text
NewsStoryProposalV1
  storyOrdinal
  requestedMaturity
  reportKind
  headline
  bodyAssertions[]
```

Each headline/body component uses the LRE-2 proposal proof shape:

```text
SourceAssertionProposalV1
  ordinal
  mode
  content
  supportBasis
  supportQuote
```

Ordinals are story-local and are joined using:

```text
(storyOrdinal, assertionOrdinal)
```

The model does not supply maturity verdicts or source authority refs.

## 16. NEWS G7 problem statement

3M-8 requires trusted `NewsPublicationMaturityPolicyContextV1` from existing Time / continuity / reachability owners.

LRE-9 must not solve this by inventing arbitrary elapsed-time realism constants without current authority.

The direct-B-root first runtime slice has a useful narrower option:

```text
DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
```

## 17. Selected first-runtime NEWS maturity profile

The first NEWS runtime profile should intentionally support coarse immediate publication only.

Conceptual trusted builder:

```text
NewsPublicationMaturityContextBuilderV1
```

Allowed inputs:

```text
current exact direct-B-root Handoff/Evidence authority
current exact B-root message only
existing Time canonical timestamp primitives
structural BROADCAST_VISIBLE region
current narrative timestamp/floor
```

No whole-history scan.

No NEWS-owned clock.

## 18. G7 trusted basis derivation

For the first direct-B-root profile, `basisState = PROVEN` only when all applicable current facts are available and internally consistent, including:

```text
source root exact join is current
source root is committed mode B
canonical source-root narrative timestamp/floor can be resolved by existing Time ownership
current narrative timestamp/floor is canonical and comparable
source-root time <= current narrative time
current root has a non-empty BROADCAST_VISIBLE structural region
```

Otherwise:

```text
basisState = UNKNOWN
```

and the frozen 3M-8 policy yields:

```text
HOLD_UNKNOWN_PUBLICATION_MATURITY
```

## 19. First NEWS reachability / readiness mapping

For the narrow generic publication profile:

```text
eventOccurredByCurrentFrame
= sourceRootTime <= currentNarrativeTime

sourceReachedByCurrentFrame
= eventOccurredByCurrentFrame
  AND exact direct-B-root currentness
  AND BROADCAST_VISIBLE exists

coarsePublicationReady
= sourceReachedByCurrentFrame

detailedPublicationReady
= false

followupPublicationReady
= false
```

This is a deliberately narrow first-runtime product profile.

It does not claim every real publication receives every broadcast instantly.

It says only that the generic first NEWS source may produce a coarse current report from the same already-public direct-B-root evidence.

## 20. Consequence for requested maturity

Under the first runtime profile:

```text
BREAKING_COARSE
→ may ALLOW when trusted basis passes

DEVELOPING_DETAIL
→ HOLD_DETAIL_AHEAD_OF_MATURITY

FOLLOWUP_ANALYSIS
→ HOLD_DETAIL_AHEAD_OF_MATURITY
```

The producer contract should request `BREAKING_COARSE` by default.

The parser may still recognize all 3M-8 enums so adversarial/wrong-level proposals fail through the existing maturity policy rather than a hidden downgrade.

## 21. Why no minute thresholds are frozen now

A threshold design such as:

```text
15 minutes → detail
60 minutes → follow-up
```

would be arbitrary in the current direct-B-root scope and could falsely imply realism authority.

Widening beyond breaking coverage requires a later explicit design proving:

```text
broader source lifetime / reachability
trusted elapsed-time basis
product-defined maturity profile
no current-task replay
```

LRE-9 does not smuggle that expansion into first runtime enablement.

## 22. NEWS G6 categories to close in detailed design

Concrete numbers must be frozen for:

```text
producer contract chars
story count
headline chars
body assertions per story
total semantic components
body assertion chars
aggregate semantic chars
support quote chars / aggregate
job token
packet JSON
protocol zone
receipt story rows / component accounting
trusted source scan
G8 evidence export
```

## 23. Presentation reuse

BOARD and NEWS reuse the LRE-6 exact presentation-binding architecture.

Conceptually:

```text
validated family sidecar
→ family presentation adapter
→ current HostPresentationBindingRefV1
→ exact-current display binding
```

Adapters remain:

```text
BOARD_THREAD_V1
NEWS_ARTICLE_V1
```

No family may use content equality or DOM order as identity.

G5 target-host execution proof remains pending.

## 24. LC4 / LC5 compatibility remains intact

BOARD and NEWS never serialize through legacy `<COMMUNITY>`.

For new migrated family turns:

```text
legacyCompatibilityBridge = disabled
newLegacyContextCharsThisTurn = 0
structuredReentryChars = 0
```

Historical Community remains read-only compatibility only.

LRE-9 must not reopen LC2/LC3 bridge behavior for BOARD or NEWS.

## 25. G8 evidence extension

Common `SourceTurnEvidenceV1` remains latest-turn bounded only.

LRE-9 adds family-safe counters/statuses, not semantic text.

BOARD examples:

```text
participantCount
entryCount
postCount
replyCount
allowedEntryCount
deniedEntryCount
heldEntryCount
parentQuarantinedCount
```

NEWS examples:

```text
storyCount
acceptedStoryCount
quarantinedStoryCount
maturityAllowCount
maturityHoldCount
headlinePolicyAllow/deny/hold counts
bodyPolicyAllow/deny/hold counts
```

No title/body/headline/supportQuote text enters telemetry.

## 26. Dormancy contract

Source-irrelevant turns remain identical in principle to 3M-9 / LRE-3:

```text
family request absent
→ Source selector DORMANT
→ BOARD work = 0
→ NEWS work = 0
```

No scan of old Board/News cards or old Community is allowed to choose a family.

## 27. Candidate C status

Tier A BOARD and NEWS remain snapshot-only.

Therefore LRE-9 does not require new Candidate C durability.

```text
cross-turn survival = no
stable identity = no
item mutation = no
append/merge = no
derived-to-derived lineage = no
future context re-entry = no
```

Interactive BOARD work remains a separate Tier B program.

## 28. Multi-family fence

Current main contains a separately frozen Multi-Family Orchestration design.

LRE-9 standalone runtime profiles must remain usable with:

```text
ACTIVE_SINGLE
```

only.

Do not add fanout or aggregate multi-family budgets in the same transaction.

A future orchestration implementation may reuse the proven family profiles after separate authority.

## 29. Selected transaction split

### LRE-9A · BOARD activation design / future implementation

Owns:

```text
BOARD family profile
BOARD packet / assembler
anonymous ordinal participant fix
BOARD caps
BOARD G8 counters
BOARD_THREAD_V1 dispatch
```

Must not own:

```text
NEWS maturity
legacy migration
multi-family fanout
interaction durability
```

### LRE-9B · NEWS activation design / future implementation

Owns:

```text
NEWS family profile
NEWS packet / assembler
NEWS caps
G7 breaking-only maturity builder
NEWS G8 counters
NEWS_ARTICLE_V1 dispatch
```

Must not own:

```text
BOARD semantics
legacy migration
multi-family fanout
PUBLIC_KNOWLEDGE
```

## 30. Runtime-readiness classifications after this impact scope

```text
BOARD_STAGE_READY
= NOT CLAIMED

NEWS_STAGE_READY
= NOT CLAIMED
```

Remaining runtime proof includes at least:

```text
G1 then-current production re-preflight
G2 target-host / model-compliance
G3 trusted family request runtime proof
G4 family packet transport runtime proof
G5 target-host presentation proof
G6 runtime cap enforcement proof
G8 instrumentation proof
and for NEWS: G7 runtime maturity-builder proof
```

## 31. BLOCKER set

```text
BLOCKER · TRUSTED_FAMILY_REQUEST_INPUT_NOT_TARGET_HOST_PROVEN
BLOCKER · MODEL_PACKET_SELECTS_OR_CHANGES_FAMILY
BLOCKER · BOARD_MODEL_GENERATED_PARTICIPANT_IDENTITY_IN_FIRST_RUNTIME
BLOCKER · BOARD_HIDDEN_PARENT / HIDDEN_PARTICIPANT_METADATA_LEAK
BLOCKER · BOARD_DENY_HOLD_CHILD_ENTERING_VALIDATED_PAYLOAD
BLOCKER · NEWS_MODEL_OWNED_MATURITY_VERDICT
BLOCKER · NEWS_INVENTED_ELAPSED_TIME_OR_TIMESTAMP_AUTHORITY
BLOCKER · NEWS_PARTIAL_STORY_SALVAGE
BLOCKER · FAMILY_CAP_TRUNCATION_INTO_VALIDITY
BLOCKER · BOARD_OR_NEWS_LEGACY_COMMUNITY_BRIDGE
BLOCKER · BOARD_OR_NEWS_STRUCTURED_REENTRY
BLOCKER · MULTI_FAMILY_FANOUT_MIXED_INTO_LRE9
```

## 32. WATCH / DEFER set

```text
FIX   · BOARD_PARTICIPANT_LABEL_EXPOSURE_GAP
       resolution selected = BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1

WATCH · BOARD_TITLE_BODY_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · SOURCE_SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · NEWS_BREAKING_ONLY_PROFILE_IS_INTENTIONALLY_NARROW

DEFER · NAMED_BOARD_PARTICIPANT_PROFILE
DEFER · NEWS_DEVELOPING_DETAIL_RUNTIME_PROFILE
DEFER · NEWS_FOLLOWUP_ANALYSIS_RUNTIME_PROFILE
DEFER · NEWS_PERSISTENT_ARTICLE_IDENTITY
DEFER · BOARD_PERSISTENT_THREAD_IDENTITY
DEFER · MULTI_FAMILY_RUNTIME
DEFER · PUBLIC_KNOWLEDGE_RUNTIME
```

## 33. Selected detailed-design seam

The LRE-9 detailed design should freeze:

```text
SourceFamilyRuntimeProfileRegistryV1
BoardSourceProposalPacketV1
BOARD_ANONYMOUS_ORDINAL_PARTICIPANTS_V1
BOARD_CAP_PROFILE_V1
NewsSourceProposalPacketV1
DIRECT_B_ROOT_BREAKING_ONLY_MATURITY_V1
NEWS_CAP_PROFILE_V1
family-specific G8 evidence extensions
BOARD → NEWS transaction acceptance rules
```

No runtime implementation authority is granted by this impact scope.
