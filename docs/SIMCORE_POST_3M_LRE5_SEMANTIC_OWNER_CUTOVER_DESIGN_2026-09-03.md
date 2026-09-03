# SimCore Post-3.0M LRE-5 Structured Semantic-Owner Cutover + Optional Legacy Bridge Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-5 DESIGN FROZEN · LC2 STRUCTURED_SEMANTIC_PRIMARY CONTRACT FROZEN · DIRECT-B-ROOT LIVE_REACTION ONLY · TEMPORARY LEGACY BRIDGE CONTRACT FROZEN · G2 STILL HOLD · RUNTIME PRIMARY ACTIVATION NOT AUTHORIZED · DESIGN-ONLY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-5 · LC2 · SEMANTIC OWNER CUTOVER · LEGACY COMMUNITY COMPATIBILITY**

## 0. Purpose

LRE-5 freezes the semantic-owner handoff from LC1 legacy-owned shadow operation to the future LC2 `STRUCTURED_SEMANTIC_PRIMARY` state.

It answers:

```text
What exactly changes when structured LIVE_REACTION becomes the production semantic owner?
How is one semantic owner enforced even if the model emits legacy Community anyway?
When is a legacy compatibility bridge allowed?
What may the bridge consume and emit?
What happens when structured semantics are empty, quarantined, unavailable, malformed, stale, or over cap?
How do existing Community/Structure/Finalize compatibility consumers survive temporarily without regaining semantic authority?
What evidence and rollback rules apply before LRE-6 presentation cutover?
```

This checkpoint is design-only.

It does not implement runtime code, activate PRIMARY, change prompt bytes, create a serializer in code, change Community/Structure/Finalize behavior, deploy, publish, mount structured UI, retire legacy context, persist Source state, or run target-host validation.

## 1. Authority chain

LRE-5 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE4_STRUCTURED_SHADOW_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE5_SEMANTIC_OWNER_CUTOVER_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_PROVENANCE_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Design-time snapshot

LRE-5 impact scope was frozen from:

```text
main = 97676663a22dfe7f92946a47a0b2bfbcf29ae477
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
runtime semantic stage = OFF
```

The impact-scope merge became:

```text
4aa55c272c867b149ab25219676e5c325c60ec62
```

Any later runtime work must re-run G1 against then-current production.

## 3. LC2 is a semantic-owner cut

Migration axes at LC2:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P0 LEGACY COMPATIBILITY PRESENTATION
H = H0 / transitional legacy context growth may still exist
R = transitional legacy compatibility
```

Canonical law:

```text
LC2 PRIMARY
→ validated structured LIVE_REACTION is the sole Source semantic owner for migrated turns
```

The old native Community path may remain only as a representation/compatibility consumer.

## 4. Primary stage is release-scoped

`SourceSemanticAuthorityStageV1` remains:

```text
OFF
SHADOW
PRIMARY
```

At LRE-5 target state:

```text
stage = PRIMARY
family capability = LIVE_REACTION / direct-B-root C only
```

Stage is not selected opportunistically per request.

Forbidden:

```text
PRIMARY
→ structured request fails
→ this request only uses native legacy Community authority
```

Rollback to SHADOW/OFF is a separate release/config transaction.

## 5. First PRIMARY slice

Exactly:

```text
family = LIVE_REACTION
mode = C
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projectionOrdinal = 0
```

No other family or broader source window is authorized by this design.

## 6. Full PRIMARY transaction

Frozen conceptual flow:

```text
CURRENT REQUEST
  ↓
Lifecycle / Lineage / Handoff / Evidence
  ↓
SourceJobSelectorV1
  ├─ DORMANT / UNSUPPORTED / BLOCKED
  │    ↓
  │  no active Source semantic transaction
  │
  └─ ACTIVE
       ↓
PRIMARY producer contract in existing main-model request
       ↓
existing MAIN MODEL call
       ↓
ordinary visible response prefix
+ transient structured carrier tail
       ↓
TransientSourceTransportV1
  ├─ carrier-free cleanContent
  └─ SourceProposalPacketV1
       ↓
SourceDraftAssemblerV1
       ↓
ExposurePolicyContextBuilderV1
       ↓
3M-3 Validator
       ↓
ValidatedSourceSemanticSidecarV1
       ↓
PrimarySourceCutoverCoordinatorV1
  ├─ primary semantic disposition
  ├─ PrimaryLegacySourceGuardV1 result
  ├─ optional LegacyCommunityCompatibilitySerializerV1
  └─ bounded G8 evidence
       ↓
legacy-compatible output composition only while LC2 P0 remains
       ↓
existing Output Compat / Structure / Finalize
```

## 7. `PrimarySourceCutoverCoordinatorV1`

The coordinator owns only:

```text
PRIMARY stage sequencing after validator result
closed primary-disposition derivation
legacy-source guard enforcement result handling
bridge-eligibility decision
bridge invocation when allowed
bounded G8 cutover evidence assembly
request-local cleanup
```

It does not own:

```text
Source authority
model semantic generation
transport parsing grammar
Exposure policy
assertion validation
Community semantic interpretation
presentation DOM
persistence
future context
```

Canonical rule:

```text
PRIMARY COORDINATOR = OWNER-SWITCH ORCHESTRATOR
NOT A SECOND SEMANTIC JUDGE
```

## 8. Primary prompt contract

When the selector is ACTIVE and the stage is PRIMARY, the model contract must require:

```text
ordinary non-Source visible response as applicable
+
structured Source proposal carrier
```

and must no longer request an independently authored trusted `<COMMUNITY>` block for the migrated LIVE_REACTION projection.

The existing main model remains the semantic content generator.

No auxiliary Source model is introduced.

## 9. Why prompt instruction is insufficient alone

Model compliance is probabilistic.

Therefore:

```text
"do not emit <COMMUNITY>"
```

cannot by itself enforce one-owner semantics.

A deterministic post-generation source guard is required before current legacy Community machinery may interpret the visible prefix.

## 10. `PrimaryLegacySourceGuardV1`

Conceptual owner:

```text
PrimaryLegacySourceGuardV1
```

Input:

```text
carrier-free cleanContent
current semantic stage = PRIMARY
current migrated Source job = LIVE_REACTION
```

Output:

```text
legacyGuardStatus
legacyNativeCommunityBlockCount
sourceCleanContent
```

Closed status vocabulary:

```text
NOT_APPLICABLE
NONE_FOUND
SUPPRESSED_NATIVE_COMMUNITY
GUARD_FAILURE
```

## 11. Guard law

At PRIMARY, any independently model-generated `<COMMUNITY>` block in `cleanContent` is **not trusted Source semantics**.

Required behavior:

```text
structurally identify legacy Community block(s)
→ remove them from the migrated Source representation path
→ do not parse their prose into structured assertions
→ record bounded guard evidence
```

The guard is allowed to suppress the structural legacy source block because PRIMARY has already moved semantic ownership.

It is not allowed to reinterpret its content.

## 12. Guard suppression versus semantic disposition

A safely suppressed native Community block does not automatically destroy an otherwise valid structured Source result.

Example:

```text
validated structured assertions exist
+
model also emitted forbidden native Community
+
guard deterministically suppresses native block
→ primaryDisposition may still be PRIMARY_AVAILABLE
→ legacyGuardStatus = SUPPRESSED_NATIVE_COMMUNITY
```

However repeated guard suppression is model-compliance evidence debt and may block migration acceptance under G2 even if runtime safety is preserved.

## 13. Guard failure

If the guard cannot establish deterministic structural suppression when a forbidden native Community representation is present:

```text
legacyGuardStatus = GUARD_FAILURE
primaryDisposition = PRIMARY_INTEGRATION_FAILURE
```

No legacy semantic fallback is allowed.

## 14. No legacy prose back-parsing

Forbidden:

```text
suppressed native Community
→ parse content
→ compare to validated structured semantics
→ salvage matching reactions
```

The suppressed block is discarded as an unauthorized semantic representation for that migrated Source job.

## 15. Closed PRIMARY disposition taxonomy

Exactly:

```text
NOT_RUN_STAGE_NON_PRIMARY
NOT_RUN_DORMANT
NOT_RUN_UNSUPPORTED
NOT_RUN_BLOCKED_CAPABILITY

PRIMARY_AVAILABLE
PRIMARY_EMPTY
PRIMARY_QUARANTINED
PRIMARY_UNAVAILABLE_TRANSPORT
PRIMARY_UNAVAILABLE_AUTHORITY
PRIMARY_CAP_BLOCKED
PRIMARY_INTEGRATION_FAILURE
```

## 16. `PRIMARY_AVAILABLE`

Requirements:

```text
selector ACTIVE
transport structurally usable
current Source authority exact join valid
3M-3 validator completed
validatedAssertionCount >= 1
no fatal integration failure
```

Meaning:

```text
one or more structured LIVE_REACTION assertions are production Source semantics for this request
```

It does not mean every proposal assertion survived.

DENY/HOLD candidates remain quarantined and absent from the validated payload.

## 17. `PRIMARY_EMPTY`

When a valid packet contains zero assertion candidates and validation completes:

```text
assertionCount = 0
validatedAssertionCount = 0
→ PRIMARY_EMPTY
```

Semantic consequence:

```text
there is no migrated Source semantic payload for this request
```

No fake reaction is generated.

## 18. `PRIMARY_QUARANTINED`

When candidates exist but all resolve to DENY/HOLD:

```text
assertionCount >= 1
allowedCount = 0
→ PRIMARY_QUARANTINED
```

This is a successful fail-closed policy outcome.

It is not transport failure.

It does not permit legacy semantic fallback.

## 19. `PRIMARY_UNAVAILABLE_TRANSPORT`

When ACTIVE PRIMARY expected a packet but transport returns:

```text
MISSING
MALFORMED
OVERSIZE
TOKEN_MISMATCH
SCHEMA_INVALID
```

and no trusted packet can be assembled:

```text
PRIMARY_UNAVAILABLE_TRANSPORT
```

The non-Source visible response prefix may continue if the ordinary output path remains valid.

No independent legacy Source semantics are substituted.

## 20. `PRIMARY_UNAVAILABLE_AUTHORITY`

When required current Handoff/Evidence source support cannot be established or becomes stale before use:

```text
PRIMARY_UNAVAILABLE_AUTHORITY
```

No descendant semantic salvage and no old Community fallback.

## 21. `PRIMARY_CAP_BLOCKED`

Owned structural/boundedness failures that prevent a trusted Source result map to:

```text
PRIMARY_CAP_BLOCKED
```

The same no-semantic-truncation law remains:

```text
cap exceeded
→ fail closed
```

not:

```text
truncate until valid
```

## 22. `PRIMARY_INTEGRATION_FAILURE`

Reserved for ownership/integration invariant violations including:

```text
carrier entered stored transcript
raw carrier fingerprint treated as normal host representation
ALLOW + DENY + HOLD accounting mismatch
validated count mismatch
forbidden Source side effect non-zero
legacy guard failure
bridge consumes disallowed data
bridge round-trip regains semantic authority
primary Source result mutates unrelated host metadata
```

A PRIMARY integration failure is release-blocking evidence.

It does not enable per-request native fallback.

## 23. Fail-closed Source availability law

At PRIMARY:

```text
PRIMARY_EMPTY
PRIMARY_QUARANTINED
PRIMARY_UNAVAILABLE_TRANSPORT
PRIMARY_UNAVAILABLE_AUTHORITY
PRIMARY_CAP_BLOCKED
```

all mean:

```text
no valid migrated Source semantic representation for this request
```

They do not mean:

```text
retry model
use native Community
parse old Community
borrow previous Source projection
```

## 24. Core response is not automatically discarded

Source unavailability does not necessarily invalidate the ordinary assistant response body.

Canonical separation:

```text
SOURCE PROJECTION FAILURE
!=
CORE RESPONSE FAILURE
```

If the core response satisfies its existing Output/Structure contracts, it may continue without a Source compatibility block.

This avoids turning optional Source projection failure into whole-response loss.

## 25. No fake empty-state semantics

The system must not synthesize statements such as:

```text
"No reactions were available."
"The audience stayed silent."
```

merely because the structured Source payload is empty or quarantined.

Those sentences are semantic claims and require their own authority.

## 26. Why a temporary bridge is justified at LC2

LRE master separates semantic and presentation cutovers.

LC2 changes:

```text
S0 → S1
```

while keeping:

```text
P0
```

until LRE-6.

Therefore there is a concrete bounded compatibility consumer during the LC2 interval:

```text
existing legacy Community presentation/output path
```

This is enough to justify a **temporary LIVE_REACTION-only serializer**.

It does not justify a permanent bridge.

## 27. `LegacyCommunityCompatibilitySerializerV1`

Input:

```text
family = LIVE_REACTION
primaryDisposition = PRIMARY_AVAILABLE
ValidatedSourceSemanticSidecarV1
ALLOW-only assertions
```

Output:

```text
LegacyCommunityCompatibilityRepresentationV1
  family = LIVE_REACTION
  blockCount = 1
  serializedCommunityText
```

The representation object is request-local and non-authoritative.

Exact runtime object names remain implementation details unless later frozen by code preflight.

## 28. Serializer determinism

Given the same validated sidecar and same serializer version:

```text
serializer output must be deterministic
```

No:

```text
model call
randomness
network
clock dependency
history scan
external asset
```

is permitted.

## 29. Serializer semantic containment

The serializer may emit only semantic text already present in validated ALLOW assertions.

It may add only fixed protocol/formatting punctuation required for the legacy representation.

It may not invent:

```text
speaker identity
username
platform name
reaction count
likes/views
clock time
extra commentary
bridge-only summary
```

unless such metadata becomes separately validated structured semantics in a future schema.

## 30. Serializer input firewall

Forbidden reads:

```text
untrusted proposal assertion body after quarantine
DENY/HOLD content
supportQuote body
raw Source region
Knowledge-only private context
legacy Community prose
validation receipt hidden semantic content
historical Source data
```

The serializer should be unable to see these by construction where feasible.

## 31. One bridge block for first LC2 slice

The first PRIMARY slice is direct-B-root Mode C and freezes:

```text
PRIMARY_AVAILABLE
→ at most one compatibility <COMMUNITY> block
```

This does not generalize B_END ordinal-two-block behavior into the first LC2 slice.

B_END and other legacy shapes require separate scope if later migrated.

## 32. Bridge formatting and final Knowledge placement

The serializer owns the Community representation body, not arbitrary whole-response rewriting.

Compatibility composition must preserve existing output structural laws, including terminal Knowledge placement.

Required direction:

```text
carrier-free primary core content
+
serialized compatibility Community block
→ existing owned compatibility/structure insertion seam
→ final output with legacy Community in the authorized legacy slot
→ Knowledge placement still valid
```

Forbidden:

```text
append bridge after final Knowledge
```

or:

```text
regex-rebuild the entire assistant response in a new Source module
```

The exact implementation seam must be re-preflighted against then-current Output Compat / Structure ownership.

## 33. Bridge use matrix

```text
PRIMARY_AVAILABLE
→ bridge MAY be used while P0 compatibility consumer exists

PRIMARY_EMPTY
→ no bridge semantic block

PRIMARY_QUARANTINED
→ no bridge semantic block

PRIMARY_UNAVAILABLE_TRANSPORT
→ no bridge semantic block

PRIMARY_UNAVAILABLE_AUTHORITY
→ no bridge semantic block

PRIMARY_CAP_BLOCKED
→ no bridge semantic block

PRIMARY_INTEGRATION_FAILURE
→ no successful bridge classification
```

## 34. `LegacyCommunityBridgeModeV1`

Conceptual release-scoped compatibility mode:

```text
OFF
P0_COMPAT_SERIALIZER
```

Initial LC2 candidate profile:

```text
semantic stage = PRIMARY
bridge mode = P0_COMPAT_SERIALIZER
```

because LRE-6 presentation cutover has not occurred yet.

Bridge mode is not per-request fallback authority.

## 35. Bridge mode does not choose semantics

Forbidden:

```text
structured Source unavailable
→ bridge mode emits native Community instead
```

Bridge mode only answers:

```text
should already-validated structured semantics be represented in legacy Community form?
```

## 36. No round-trip semantic authority

If existing Community parser/reaction compatibility machinery sees the serialized block, any outputs from that machinery are downstream compatibility observations only.

Canonical law:

```text
validated structured semantics
→ bridge
→ legacy parser / counters
```

must never become:

```text
legacy parser result
→ override / regenerate structured semantics
```

## 37. Legacy Community counters during LC2

Existing counters such as Community activation/count/classifier diagnostics may temporarily continue while bridge representation exists.

Their semantics during LC2 are explicitly downgraded to:

```text
legacy representation compatibility evidence
```

not:

```text
Source semantic authority
```

## 38. Expected legacy block count becomes derived compatibility state

For the first LC2 slice:

```text
primaryDisposition = PRIMARY_AVAILABLE
AND bridge mode = P0_COMPAT_SERIALIZER
→ expectedLegacyCommunityBlocks = 1

otherwise
→ expectedLegacyCommunityBlocks = 0
```

This value must be derived mechanically.

The model cannot decide it.

## 39. Structure / Finalize adaptation boundary

Current legacy logic historically judges expected Community presence based on mode/episode state.

LC2 requires one bounded contract adjustment:

```text
PRIMARY Source disposition
+ bridge mode
→ expected legacy compatibility block count
```

Structure/Finalize may consume that expected count as already-authoritative integration metadata.

They must not rejudge Source semantics.

## 40. Absence under PRIMARY is legitimate

When expected legacy block count is zero because structured semantics are empty/quarantined/unavailable, Structure/Finalize must not automatically classify missing Community as a legacy semantic defect.

Canonical rule:

```text
PRIMARY EXPLICIT SOURCE-ABSENT DISPOSITION
→ MISSING LEGACY COMMUNITY IS EXPECTED
```

This is required to avoid fake content or per-request fallback.

## 41. Output-state commit law

Only the current canonical output may commit representation-compatible state.

Bridge counters may commit only when the bridge block actually survives normal output validation/commit.

A failed or suppressed native model Community block must not increment successful compatibility counts merely because it appeared transiently.

## 42. Native Community suppression accounting

G8 may expose bounded fields:

```text
legacyGuardStatus
legacyNativeCommunityBlocksSuppressed
```

No suppressed semantic body is retained.

## 43. Bridge accounting

G8 context/effects may reuse existing bounded fields:

```text
legacyCompatibilityBridgeUsed
legacyCompatibilityBridgeChars
legacyCommunityBlocksThisTurn
legacyCommunityCharsThisTurn
newLegacyContextCharsThisTurn
```

and add a bounded closed enum if needed:

```text
primaryDisposition
```

No semantic body is added to `SourceTurnEvidenceV1`.

## 44. SourceTurnEvidence at PRIMARY

Expected control fields include:

```text
semanticAuthorityStage = PRIMARY
selectorStatus
family = LIVE_REACTION
primaryDisposition
```

Transport/support/validation groups remain inherited from LRE-3/LRE-4.

Context/effects must still prove:

```text
structuredReentryChars = 0
sourcePersistentReads = 0
sourcePersistentWrites = 0
sourceNetworkCalls = 0
sourceExtraModelCalls = 0
sourceTimersScheduled = 0
sourceBackgroundJobs = 0
```

## 45. LC2 legacy context may still grow

Because P0 compatibility representation may still be stored as ordinary assistant output:

```text
newLegacyContextCharsThisTurn
may be > 0
```

at LC2.

This is known migration debt, not a failure of LRE-5.

LRE-7 owns prospective context retirement.

## 46. No structured re-entry

Even though structured semantics now own the Source projection:

```text
structuredReentryChars = 0
```

remains mandatory.

PRIMARY semantic ownership does not imply Source memory.

## 47. No persistence / Candidate C

LC2 first-major semantics remain request-local/current-projection-only.

```text
Source DB = none
Source history = none
cross-turn Source identity = none
item mutation = none
revision ledger = none
future structured context retrieval = none
```

Candidate C is not activated by this cutover.

## 48. DORMANT remains dormant at PRIMARY release

A release configured PRIMARY does not run Source work on ordinary requests.

```text
PRIMARY release
+
selector DORMANT
→ no producer overlay
→ no transport parse
→ no support proof
→ no validator
→ no bridge
```

The 3M-9 dormancy firewall remains unchanged.

## 49. UNSUPPORTED / BLOCKED requests

A source-like request outside the migrated direct-B-root LIVE_REACTION slice does not opportunistically use native legacy authority merely because PRIMARY exists for another slice.

Disposition follows selector capability policy.

Expansion requires an explicit later family/scope activation transaction.

## 50. Reroll / reload currentness

PRIMARY uses the same current-request token/authority binding rules as LRE-4.

```text
reroll
reload generation change
source/root replacement
stale Handoff/Evidence
→ old Source job cannot be reused
```

No bridge may be serialized from a stale validated sidecar.

## 51. Support-at-use check before bridge

Before compatibility serialization, the validated sidecar must still satisfy the current support/invalidation gate.

```text
validated once
!=
valid forever during current async lifecycle
```

If current Source authority no longer matches, no bridge is emitted.

## 52. Presentation remains legacy-primary during LC2

LRE-5 deliberately does not mount `LIVE_REACTION_STREAM_V1`.

User-facing source representation remains the temporary legacy compatibility block when one is available.

This keeps semantic cutover and presentation cutover in separate transactions.

## 53. LRE-6 handoff

LRE-6 may rely on LRE-5 contracts that:

```text
structured validated LIVE_REACTION is the sole semantic owner
independent native Community is no longer trusted
legacy Community, when present, is derived compatibility output
primary Source disposition is explicit
bridge usage is bounded and observable
structured persistence/re-entry remains zero
```

LRE-6 then owns:

```text
P0 → P1 structured presentation cutover
identity-bearing host presentation binding
legacy-visible presentation disablement
```

It does not need to redesign Source semantic authority.

## 54. Bridge retirement direction

Once LRE-6 proves structured presentation, the P0 bridge should be re-evaluated.

Possible later states:

```text
presentation no longer needs bridge
but temporary host-context compatibility still proven necessary
→ separate context compatibility question for LRE-7

no presentation/context consumer remains
→ bridge OFF
```

The bridge is never retained merely because it exists.

## 55. Rollback law

PRIMARY rollback is explicit and release-scoped.

Example:

```text
PRIMARY release encounters migration BLOCKER
→ document anomaly
→ separate release/config rollback transaction
→ stage returns to SHADOW or OFF according to approved rollback plan
```

Forbidden:

```text
same request detects failure
→ silently acts like SHADOW/legacy-native
```

## 56. Rollback does not rewrite history

If a PRIMARY release is later rolled back:

```text
already committed historical messages are not retroactively rewritten
```

Old bridge-derived Community remains historical compatibility representation.

No transcript surgery is authorized.

## 57. Future implementation prerequisites

No PRIMARY runtime implementation may be treated supported unless:

```text
G1 then-current production preflight PASS
LC1 implementation exists and has trustworthy evidence
G2 target-host/model-compliance PASS
G3 selector proof PASS
G4 producer/transport + carrier strip proof PASS
G6 LIVE_REACTION caps proof PASS
G8 bounded instrumentation proof PASS
LRE-4 blocker set clear
latest.js == install.js
no contradictory current BLOCKER
```

G5 presentation remains LRE-6 and is not required for LC2 semantic cutover.

## 58. Required deterministic PRIMARY fixture matrix

At minimum:

```text
P0 non-PRIMARY stage → NOT_RUN_STAGE_NON_PRIMARY
P1 ordinary DORMANT → no Source work
P2 valid public confirmed fact → PRIMARY_AVAILABLE + bridge
P3 mixed ALLOW/DENY/HOLD → ALLOW-only bridge
P4 all private/unexposed → PRIMARY_QUARANTINED + no bridge
P5 valid zero assertion → PRIMARY_EMPTY + no bridge
P6 missing carrier → PRIMARY_UNAVAILABLE_TRANSPORT + no native fallback
P7 malformed carrier → PRIMARY_UNAVAILABLE_TRANSPORT
P8 token mismatch → PRIMARY_UNAVAILABLE_TRANSPORT
P9 cap failure → PRIMARY_CAP_BLOCKED
P10 stale authority → PRIMARY_UNAVAILABLE_AUTHORITY
P11 model emits native Community + valid structured sidecar → native block suppressed, structured owner preserved
P12 model emits native Community + structured failure → native block suppressed, no fallback
P13 guard cannot safely suppress → PRIMARY_INTEGRATION_FAILURE
P14 serializer ALLOW-only containment
P15 serializer DENY/HOLD firewall
P16 serializer deterministic replay
P17 expectedLegacyCommunityBlocks = 1 only for available+bridge
P18 expectedLegacyCommunityBlocks = 0 for empty/quarantine/unavailable
P19 final Knowledge placement preserved
P20 bridge round-trip cannot override structured semantics
P21 reroll invalidates old Source/bridge
P22 reload invalidates old job
P23 no structured re-entry/persistence/network/extra model
```

## 59. Target-host/model-compliance evidence emphasis

PRIMARY raises the cost of producer non-compliance because no independent legacy fallback exists.

G2 evidence must therefore cover at least:

```text
model reliably emits bounded carrier when required
model does not leak carrier into visible prose
model does not routinely emit independent Community under PRIMARY contract
Exposure trap/control fixtures
support-anchor laundering fixtures
ordinary-chat isolation
```

A deterministic guard protects ownership but does not excuse poor model compliance.

## 60. Primary source-visible prose leakage WATCH

The structural guard can detect reserved `<COMMUNITY>` blocks, but arbitrary prose could still semantically resemble social reactions.

LRE-5 does not introduce a natural-language classifier to police all visible prose.

Therefore:

```text
WATCH · PRIMARY_VISIBLE_PROSE_SOURCE_SEMANTIC_CONTAINMENT_REQUIRES_MODEL_COMPLIANCE_EVIDENCE
```

This remains a G2/real-host evidence concern.

## 61. BLOCKER set

```text
BLOCKER · PRIMARY_PER_REQUEST_LEGACY_SEMANTIC_FALLBACK
BLOCKER · DUAL_STRUCTURED_AND_NATIVE_COMMUNITY_SEMANTIC_AUTHORITY
BLOCKER · MODEL_GENERATED_COMMUNITY_REACHES_LEGACY_SEMANTIC_OWNER_AT_PRIMARY
BLOCKER · PRIMARY_LEGACY_SOURCE_GUARD_FAILURE
BLOCKER · LEGACY_BRIDGE_REPARSED_INTO_NEW_SEMANTIC_AUTHORITY
BLOCKER · LEGACY_BRIDGE_CONSUMES_DENY_OR_HOLD_CONTENT
BLOCKER · LEGACY_BRIDGE_CONSUMES_SUPPORT_QUOTE_OR_PRIVATE_KNOWLEDGE
BLOCKER · LEGACY_BRIDGE_INVENTS_SOURCE_SEMANTICS
BLOCKER · PRIMARY_EMPTY_OR_QUARANTINED_FORCES_FAKE_REACTION
BLOCKER · PRIMARY_FAILURE_TRIGGERS_SECOND_MODEL_RETRY
BLOCKER · BAD_PACKET_PARTIALLY_POPULATES_PRIMARY_SEMANTICS
BLOCKER · STALE_SIDECAR_SERIALIZED_INTO_BRIDGE
BLOCKER · RAW_CARRIER_FINGERPRINT_TREATED_AS_HOST_GENERATION_TRUST
BLOCKER · PRIMARY_TRANSIENT_CARRIER_ENTERED_HOST_TRANSCRIPT
BLOCKER · PRIMARY_CUTOVER_MIXED_WITH_STRUCTURED_PRESENTATION_CUTOVER
BLOCKER · PRIMARY_CUTOVER_MIXED_WITH_CONTEXT_RETIREMENT
BLOCKER · PRIMARY_ACTIVATED_WITHOUT_REQUIRED_LC1_G2_EVIDENCE
BLOCKER · DORMANT_PRIMARY_RELEASE_RUNS_SOURCE_SEMANTIC_WORK
BLOCKER · STRUCTURED_PRIMARY_AUTOMATIC_CONTEXT_REENTRY
BLOCKER · STRUCTURED_PRIMARY_PERSISTED_AS_SOURCE_HISTORY
```

## 62. WATCH set

```text
WATCH · EXACT_LEGACY_PRESENTATION_STATE_CONSUMERS_REQUIRE_THEN_CURRENT_RUNTIME_PREFLIGHT
WATCH · LEGACY_COMMUNITY_COUNTERS_REMAIN_COMPATIBILITY_DEBT_DURING_LC2
WATCH · PRIMARY_PROMPT_COMPLIANCE_REQUIRES_REAL_MODEL_EVIDENCE
WATCH · PRIMARY_VISIBLE_PROSE_SOURCE_SEMANTIC_CONTAINMENT_REQUIRES_MODEL_COMPLIANCE_EVIDENCE
WATCH · EMPTY_QUARANTINED_USER_EXPERIENCE_REQUIRES_REAL_HOST_REVIEW
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
```

## 63. DEFER set

```text
DEFER · STRUCTURED PRESENTATION PRIMARY → LRE-6
DEFER · IDENTITY-BEARING SOURCE DISPLAY MOUNT → LRE-6 / G5
DEFER · PROSPECTIVE LEGACY CONTEXT RETIREMENT → LRE-7
DEFER · OLD-CHAT MIXED-ERA COMPATIBILITY CLOSE → LRE-8
DEFER · HARD LEGACY PARSER REMOVAL
DEFER · BOARD/NEWS PRIMARY ACTIVATION → LRE-9
DEFER · PERMANENT LEGACY COMMUNITY SERIALIZER
DEFER · SOURCE HISTORY / CANDIDATE C FOR FIRST-MAJOR READ-ONLY LANE
```

## 64. Frozen final state

```text
LRE_5_DESIGN                         = FROZEN
LRE_5_RUNTIME_IMPLEMENTATION         = NOT_AUTHORIZED
TARGET_MIGRATION_STATE               = LC2 STRUCTURED_SEMANTIC_PRIMARY
FIRST_FAMILY                         = LIVE_REACTION
FIRST_SCOPE                          = DIRECT_B_ROOT_MODE_C
SEMANTIC_OWNER                       = VALIDATED_STRUCTURED_SOURCE ONLY
NATIVE_MODEL_COMMUNITY_AUTHORITY     = FORBIDDEN AT PRIMARY
PRIMARY_LEGACY_SOURCE_GUARD          = REQUIRED
PER_REQUEST_LEGACY_FALLBACK          = NONE
LEGACY_BRIDGE                        = TEMPORARY P0 COMPATIBILITY ONLY
LEGACY_BRIDGE_SOURCE                 = ALLOW-ONLY VALIDATED SIDECAR
LEGACY_BRIDGE_MODEL_CALL             = NONE
LEGACY_BRIDGE_PERSISTENCE            = NONE
STRUCTURED_PRESENTATION              = DEFER LRE-6
LEGACY_CONTEXT_RETIREMENT            = DEFER LRE-7
STRUCTURED_CONTEXT_REENTRY           = 0
SOURCE_PERSISTENCE                   = 0
CANDIDATE_C                          = NOT REQUIRED FOR THIS CUTOVER
G2                                   = STILL HOLD / REAL EVIDENCE REQUIRED
PRODUCTION                           = UNCHANGED
release-simcore                      = UNCHANGED
```

## 65. Next design checkpoint

```text
LRE-6 · Structured Presentation Cutover
```

LRE-6 should consume the LC2 single-owner contract and solve only the next migration axis:

```text
P0 legacy compatibility presentation
→
P1 structured LIVE_REACTION presentation
```

with the LRE-1 identity-bearing host mount blocker as its primary unresolved host concern.
