# SimCore Post-3.0M LRE-7 Prospective Legacy Context Retirement Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-7 DESIGN FROZEN · LC4 MIGRATED-LANE H2 CONTRACT · DIRECT-B-ROOT MODE C LIVE_REACTION FIRST SLICE · NEW LEGACY COMMUNITY WRITE AUTHORITY = NONE · HISTORICAL READ COMPAT PRESERVED · STRUCTURED RE-ENTRY = NONE · DESIGN-ONLY · RUNTIME / RELEASE UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-7 · LC4 · PROSPECTIVE LEGACY CONTEXT RETIREMENT · DESIGN**

## 0. Purpose

LRE-7 freezes the detailed host-context retirement contract for the first already-migrated LIVE_REACTION lane.

It answers:

```text
How does a new migrated turn stop writing legacy <COMMUNITY> bytes?
Which producer instruction and compatibility bridge permissions are retired?
How is zero new legacy Source context enforced even if the model emits Community anyway?
How do Structure / Finalize stop treating Community absence as an error?
How does structured presentation continue with no stored bridge?
What remains visible/readable from old chats?
How is zero-growth proven without scanning or rewriting history?
What rollback boundary applies if LC4 fails?
```

This checkpoint is design-only.

It does not modify prompts, serializers, Community/Structure/Finalize code, output handlers, stored messages, DOM/UI, persistent state, `latest.js`, `install.js`, `release-simcore`, or target-host runtime.

## 1. Authority chain

Consumes:

```text
LRE master
LRE-2 Semantic Control
LRE-3 Caps + Instrumentation
LRE-5 Structured Semantic-Owner Cutover
LRE-6 Structured Presentation Cutover
LRE-7 Prospective Legacy Context Retirement Impact Scope
3M-7 Context Re-entry / Source History
3M-9 Integration / Performance / Source-Irrelevant Baseline
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Design-time snapshot

```text
impact-scope base main = 71716063fbbfaf1fc2dedaa69b52ab798c7b68f6
impact-scope merge = 33abef7bb9e6a56badc080becd007e9d900f211d
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1
```

Any runtime work must re-run G1 against then-current production and target host.

## 3. LC4 first-slice state

LRE-7 assumes future successful LC2/LC3 prerequisites for the same capability slice.

First-slice axes:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = H2 LEGACY_CONTEXT_PREEXISTING_ONLY
R = R1 LEGACY_READ_ONLY_COMPAT
```

Capability:

```text
family = LIVE_REACTION
mode = C
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
semantic stage = PRIMARY
presentation stage = structured P1
```

LRE-7 changes only H.

## 4. Capability-local H2

The first LC4 transaction establishes H2 only for the migrated direct-B-root C lane.

```text
MIGRATED DIRECT-B-ROOT C
→ no newly stored legacy Source context
```

It does not claim:

```text
all B_START/B_CONTINUE/B_END turns have migrated
all historical Community is gone
all Source families are legacy-free
```

Canonical law:

```text
CAPABILITY-LOCAL MIGRATION MUST NOT RETIRE AN UNMIGRATED OWNER
```

## 5. `MigratedTurnLegacyWritePolicyV1`

LRE-7 freezes one policy object conceptually:

```text
MigratedTurnLegacyWritePolicyV1
  schemaVersion = 1
  capability = DIRECT_B_ROOT_MODE_C_LIVE_REACTION
  semanticOwner = STRUCTURED_PRIMARY
  presentationOwner = STRUCTURED_LIVE_REACTION
  legacyProducerInstruction = RETIRED
  legacyCompatibilityBridge = DISABLED
  legacyNativeGuard = ENFORCE_ZERO
  expectedLegacyCommunityBlocks = 0
  storedLegacySourcePolicy = ZERO_NEW_STRUCTURAL_BLOCKS
  historicalReadPolicy = READ_ONLY_PRESERVE
  structuredReentryPolicy = NONE
```

This policy is stage/capability derived.

It is not model-owned and is not inferred from output prose.

## 6. LC4 request transaction

Frozen conceptual flow:

```text
CURRENT REQUEST
  ↓
Lifecycle / Lineage / Handoff / Evidence
  ↓
SourceJobSelectorV1
  ↓ ACTIVE migrated capability
MigratedTurnLegacyWritePolicyV1
  ↓
PRIMARY prompt contract
  ├ ordinary visible response contract
  └ transient structured Source proposal contract
     [NO independent legacy Community output instruction]
  ↓
existing MAIN MODEL call
  ↓
raw response
  ↓
TransientSourceTransportV1
  ├ cleanContent
  └ SourceProposalPacketV1
  ↓
3M-3 validation / PRIMARY semantic disposition
  ↓
PrimaryLegacySourceGuardV1
  ↓
NO compatibility serializer
  ↓
existing Output Compat / Structure / Finalize
  [expected legacy blocks = 0]
  ↓
LC4 stored-output postcondition
  ↓
carrier-free / Community-free stored assistant output
  + request-local validated sidecar for LRE-6 presentation
```

## 7. Prompt ownership cut

At LC4 migrated turns the request must not ask the model to author an independent `<COMMUNITY>` block.

Allowed Source-generation instruction:

```text
structured transient proposal contract
```

Retired instruction:

```text
produce mandatory / ordinary legacy <COMMUNITY> Source block for this migrated projection
```

The model remains the semantic content generator for the structured proposal.

No auxiliary model is added.

## 8. Historical Community in model context is not removed here

Old assistant transcript may still contain `<COMMUNITY>` from pre-migration turns.

LRE-7 does not delete, mask, or rewrite those historical messages before request construction.

Therefore the model may still see old Community examples through normal host history.

Canonical distinction:

```text
NO NEW COMMUNITY OUTPUT INSTRUCTION
!=
NO HISTORICAL COMMUNITY TEXT IN HOST CONTEXT
```

This is one reason the deterministic legacy guard remains necessary.

## 9. `PrimaryLegacySourceGuardV1` becomes defense-in-depth for H2

Inherited guard remains active for the migrated capability.

Input:

```text
carrier-free cleanContent
stage = PRIMARY
legacy write policy = ZERO_NEW_STRUCTURAL_BLOCKS
```

If no structural native Community is present:

```text
legacyGuardStatus = NONE_FOUND
```

If one or more independently model-generated structural Community blocks are present and can be deterministically identified:

```text
remove them from Source/output representation before storage path
legacyGuardStatus = SUPPRESSED_NATIVE_COMMUNITY
```

Their prose is not parsed, compared, salvaged, or promoted.

## 10. Guard failure remains fatal to LC4 Source integration

If a suspected native Community representation cannot be structurally bounded safely:

```text
legacyGuardStatus = GUARD_FAILURE
→ PRIMARY_INTEGRATION_FAILURE
→ LC4 write postcondition not certified
```

The system must not store an ambiguous legacy Source block merely to preserve output continuity.

Exact runtime error presentation belongs to implementation/preflight, but LC4 PASS cannot be claimed.

## 11. Compatibility serializer retirement

For this migrated LC4 capability:

```text
LegacyCommunityCompatibilitySerializerV1
= NOT INVOKED
```

This is stronger than:

```text
serializer invoked then output discarded
```

Required evidence:

```text
legacyCompatibilityBridgeUsed = false
legacyCompatibilityBridgeChars = 0
```

## 12. No per-request bridge resurrection

Forbidden under LC4:

```text
structured sidecar empty
→ bridge on

structured sidecar quarantined
→ bridge on

transport failure
→ bridge on

presentation mount failure
→ bridge on
```

LC4 write authority is release/stage scoped.

A compatibility bridge may return only through an explicit rollback to an earlier approved migration stage.

## 13. Structure expectation ownership

The Community/Structure compatibility contract must consume a mechanically derived expectation from the current migration/capability state.

For first LC4 migrated turns:

```text
expectedLegacyCommunityBlocks = 0
```

This overrides historical mode-only assumptions for the migrated capability.

Canonical law:

```text
MODE C
DOES NOT BY ITSELF REQUIRE LEGACY COMMUNITY
AFTER THAT CAPABILITY HAS MIGRATED TO H2
```

## 14. No mode-global shortcut

The implementation must not change generic Mode C semantics globally before all relevant Mode C Source lanes are migrated.

Required shape:

```text
mode
+ source capability
+ migration stage
→ expected legacy representation
```

not:

```text
mode == C
→ always 0 Community
```

This protects unmigrated legacy behavior.

## 15. Finalize / commit contract

For a migrated LC4 turn, absence of legacy Community is normal and must not trigger:

```text
missing Community error
legacy repair
activation-count expectation based on old mode-only rule
compatibility serializer fallback
```

Any legacy Community counter that survives for old-chat compatibility must no longer treat a migrated H2 turn as requiring a new block.

## 16. LC4 stored-output postcondition

Immediately before host storage authority is considered satisfied, the migrated current output must meet:

```text
structuralLegacyCommunityBlocks = 0
transientCarrierBytes = 0
displayProtocolBytes = 0
```

This postcondition concerns the current output only.

It must not scan previous chat messages.

## 17. `LegacyWriteReceiptV1`

LRE-7 freezes a bounded current-turn receipt conceptually:

```text
LegacyWriteReceiptV1
  schemaVersion = 1
  capability
  migrationStage
  producerInstructionStatus
  legacyGuardStatus
  legacyNativeCommunityBlockCountBeforeGuard
  bridgeStatus
  expectedLegacyCommunityBlocks
  finalLegacyCommunityBlockCount
  finalLegacyCommunityChars
  newLegacyContextCharsThisTurn
  carrierPersistedChars
  displayProtocolPersistedChars
  structuredReentryChars
  disposition
```

Closed disposition vocabulary:

```text
NOT_APPLICABLE
LC4_ZERO_WRITE_CERTIFIED
LC4_GUARD_INTERVENED_ZERO_WRITE_CERTIFIED
LC4_WRITE_FIREWALL_BREACH
LC4_INTEGRATION_FAILURE
```

The receipt contains no Community prose, assertion prose, support quote, or raw carrier.

## 18. Zero-growth accounting

For a successful migrated LC4 turn:

```text
finalLegacyCommunityBlockCount = 0
finalLegacyCommunityChars = 0
newLegacyContextCharsThisTurn = 0
carrierPersistedChars = 0
displayProtocolPersistedChars = 0
structuredReentryChars = 0
```

If the guard intervened but final storage is clean:

```text
LC4_GUARD_INTERVENED_ZERO_WRITE_CERTIFIED
```

This is runtime-safe but remains G2 compliance debt.

## 19. Do not measure zero-growth by whole-history diff

Forbidden evidence strategy:

```text
scan entire chat before request
scan entire chat after request
count all Community bytes
```

Reason:

- history-proportional work violates 3M-9;
- old transcript is intentionally preserved;
- current-turn ownership already provides the narrow evidence surface.

Use current finalized output plus bounded current-turn counters only.

## 20. Structured presentation without bridge

At LC4 LRE-6 consumes the current validated sidecar through request/runtime-local presentation binding.

For migrated H2 turns:

```text
legacyBridgeExpectation = 0
legacy suppression = NOT_NEEDED
structured presentation materialization = eligible if G5/current binding passes
```

The transformed display is built from ordinary clean assistant display plus structured Source UI.

No stored legacy placeholder is necessary.

## 21. Presentation failure cannot restore legacy write authority

If structured presentation cannot mount:

```text
stored transcript remains Community-free for the migrated turn
semantic owner remains structured
presentation failure is recorded separately
```

Forbidden:

```text
mount failed
→ append Community to message.data
```

This keeps S/P/H axes independent.

## 22. Ephemeral card consequence

Until durable replay is separately designed, reload may remove the structured card while the stored migrated assistant message remains Community-free.

This is an explicit first-slice tradeoff:

```text
reload
→ current ephemeral Source UI may disappear
→ no legacy Source card reappears from stored transcript for that new migrated turn
```

Classification:

```text
WATCH · LC4_EPHEMERAL_UI_NOT_RESTORED_AFTER_RELOAD
```

LRE-8 owns mixed-era/old-chat close; Candidate C owns any future durable Source replay requirement.

## 23. No structured memory replacement

LRE-7 does not answer “if Community is gone, what remembers it?” with a new hidden Source archive.

Required:

```text
structured Source history = NONE
persistent sidecar = NONE
future automatic Source re-entry = NONE
structuredReentryChars = 0
```

Candidate C C6 is not activated by LC4 first-major read-only runtime.

## 24. Historical R1 behavior

Old `<COMMUNITY>` remains a legacy read-only compatibility format.

Old Community may be:

```text
rendered/read by existing old-chat compatibility behavior
preserved in old assistant transcript
present in future host context if ordinary host history includes it
```

But it may not:

```text
create current Source authority
be parsed into trusted assertions
become a new Source job
be mutated as a structured Source object
be copied into a new migrated turn as a bridge
```

## 25. Mixed-era chat contract

After capability-local LC4, the same chat may contain both eras:

```text
PRE-LC4 message
  stored legacy <COMMUNITY>

LC4 migrated message
  no stored <COMMUNITY>
  structured LIVE_REACTION may be visible only in current runtime presentation
```

No automatic conversion is performed between them.

## 26. Unmigrated B-family legacy turns

B_START / B_CONTINUE / B_END remain outside this first H2 cut unless separately migrated through semantic and presentation ownership first.

LRE-7 must not use its zero-write policy to suppress legitimate legacy behavior in those lanes.

This keeps the master ordering:

```text
SEMANTIC OWNER FIRST
→ PRESENTATION SECOND
→ HOST-CONTEXT RETIREMENT LAST
```

per capability.

## 27. DORMANT behavior

When the Source selector is DORMANT:

```text
no migrated Source prompt bytes
no Source transport
no Source guard scan beyond existing bounded stage determination
no legacy migration history scan
no presentation binding
no Source persistent work
```

LRE-7 does not add an always-on transcript sanitizer.

## 28. Failure taxonomy

### `LC4_ZERO_WRITE_CERTIFIED`

No native legacy block observed; no bridge; final current output contains zero legacy Source blocks.

### `LC4_GUARD_INTERVENED_ZERO_WRITE_CERTIFIED`

Native legacy block was structurally suppressed; final output is clean. Safe result, G2 debt.

### `LC4_WRITE_FIREWALL_BREACH`

A structural legacy Source block or protocol bytes would enter stored current output. Runtime/release blocker.

### `LC4_INTEGRATION_FAILURE`

Expectations/counters/ownership state are internally inconsistent.

## 29. No silent late repair authority

The final postcondition is primarily certification, not a second semantic parser.

Implementation should arrange the guard/bridge/Structure ordering so forbidden legacy Source bytes cannot reach the storage boundary.

If final certification still sees forbidden bytes, that is an integration breach requiring explicit handling/rollback, not an invitation to invent another heuristic cleaner.

## 30. Fingerprint compatibility

The LRE-2 carrier fingerprint fix remains required.

At LC4:

```text
host-visible/stored fingerprint candidates
must be derived from carrier-free and guard-cleaned content
```

A fingerprint of raw carrier-bearing or forbidden-Community-bearing bytes cannot become trusted host representation authority.

## 31. `latest.js` / `install.js` future implementation law

Any future runtime implementation that touches SimCore release code must preserve:

```text
plugins/simcore/latest.js
==
plugins/simcore/install.js
```

LRE-7 design itself does not modify either file.

## 32. Activation preconditions

LC4 runtime activation is forbidden until at least:

```text
G1 then-current production preflight PASS
G2 target-host/model-compliance evidence sufficient for PRIMARY lane
G3 selector runtime proof
G4 transport runtime proof
G5 structured presentation target-host proof
G6 LIVE_REACTION caps runtime proof
G8 instrumentation runtime proof
LC2 semantic-owner evidence accepted
LC3 presentation-owner evidence accepted
```

LRE-7 design completion is not runtime readiness.

## 33. Runtime acceptance scenarios for future execution

Minimum LC4 evidence suite:

```text
C1 normal migrated PRIMARY_AVAILABLE turn stores zero Community
C2 model emits forbidden native Community; guard suppresses; storage remains zero
C3 PRIMARY_EMPTY stores zero Community and no fake empty Source text
C4 PRIMARY_QUARANTINED stores zero Community
C5 transport unavailable does not resurrect bridge
C6 presentation failure does not append legacy Source bytes
C7 old pre-LC4 message remains byte-preserved
C8 new LC4 message and old legacy message coexist in one chat
C9 reroll creates a new Community-free migrated output
C10 manual edit does not cause automatic legacy bridge resurrection
C11 reload does not create hidden Source/history bytes
C12 ordinary DORMANT turn adds no Source migration work
C13 structuredReentryChars remains zero
C14 no carrier/display protocol bytes persist
C15 unmigrated legacy B lane remains unaffected
```

These are future execution requirements, not evidence claimed by this design.

## 34. Rollback boundary

If LC4 produces BLOCKER evidence:

```text
record anomaly in repo
→ explicit release/stage rollback transaction
→ return to approved LC3/LC2 configuration as required
```

Per-request fallback is forbidden.

The rollback does not rewrite already stored historical messages.

## 35. BLOCKER set

```text
BLOCKER · MIGRATED_LC4_TURN_STORES_NEW_LEGACY_COMMUNITY
BLOCKER · LEGACY_BRIDGE_REENABLED_PER_REQUEST
BLOCKER · MIGRATED_LC4_PROMPT_STILL_REQUIRES_NATIVE_COMMUNITY
BLOCKER · MODE_ONLY_STRUCTURE_RULE_REQUIRES_COMMUNITY_AFTER_MIGRATION
BLOCKER · MISSING_COMMUNITY_REPAIRED_WHEN_EXPECTED_COUNT_IS_ZERO
BLOCKER · PRESENTATION_FAILURE_APPENDS_LEGACY_SOURCE_BYTES
BLOCKER · LEGACY_ZERO_ACHIEVED_BY_PERSISTENT_STRUCTURED_REENTRY
BLOCKER · OLD_TRANSCRIPT_REWRITTEN_BY_LRE7
BLOCKER · UNMIGRATED_B_LANE_SUPPRESSED_BY_GLOBAL_ZERO_RULE
BLOCKER · CARRIER_OR_DISPLAY_PROTOCOL_BYTES_PERSIST
BLOCKER · RAW_FORBIDDEN_BYTES_BECOME_TRUSTED_HOST_FINGERPRINT
```

## 36. WATCH set

```text
WATCH · NATIVE_COMMUNITY_EMITTED_AFTER_PROMPT_RETIREMENT
WATCH · LC4_EPHEMERAL_UI_NOT_RESTORED_AFTER_RELOAD
WATCH · HISTORICAL_COMMUNITY_REMAINS_IN_OLD_HOST_CONTEXT
WATCH · MIXED_ERA_CHAT_VISIBLE_BY_DESIGN
WATCH · FIRST_SLICE_H2_NOT_GLOBAL_PRODUCT_LEGACY_ZERO
```

## 37. DEFER set

```text
DEFER · B_START/B_CONTINUE/B_END LEGACY RETIREMENT
DEFER · OLD_CHAT / MIXED_ERA CLOSE TO LRE-8
DEFER · LEGACY PARSER FINAL REMOVAL
DEFER · DURABLE STRUCTURED SOURCE REPLAY
DEFER · STRUCTURED FUTURE CONTEXT REENTRY
DEFER · GLOBAL ALL-FAMILY LEGACY ZERO
```

## 38. Final LRE-7 contract

```text
LRE_7_DESIGN                              = FROZEN
LRE_7_RUNTIME                             = NOT_AUTHORIZED
FIRST_CAPABILITY                          = DIRECT_B_ROOT_MODE_C_LIVE_REACTION
SEMANTIC_OWNER                            = STRUCTURED_PRIMARY
PRESENTATION_OWNER                        = STRUCTURED_LIVE_REACTION
LEGACY_PRODUCER_INSTRUCTION               = RETIRED_FOR_MIGRATED_LANE
LEGACY_COMPATIBILITY_SERIALIZER           = DISABLED_FOR_NEW_MIGRATED_TURNS
PRIMARY_LEGACY_GUARD                      = RETAINED_DEFENSE_IN_DEPTH
EXPECTED_NEW_LEGACY_COMMUNITY_BLOCKS      = 0
NEW_LEGACY_CONTEXT_CHARS                  = 0 TARGET
STRUCTURED_REENTRY_CHARS                  = 0
OLD_TRANSCRIPT                            = PRESERVED
LEGACY_OLD_CHAT_COMPAT                    = READ_ONLY
GLOBAL_LEGACY_ZERO                        = NOT_CLAIMED
PRODUCTION                                = UNCHANGED
release-simcore                           = UNCHANGED
NEXT                                      = LRE-8 OLD-CHAT / MIXED-ERA COMPATIBILITY
```
