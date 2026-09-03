# SimCore Post-3.0M LRE-7 Prospective Legacy Context Retirement Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-7 IMPACT SCOPE FROZEN · LC4 HOST-CONTEXT RETIREMENT ONLY · DIRECT-B-ROOT MODE C LIVE_REACTION MIGRATED LANE · NO OLD-TRANSCRIPT SURGERY · NO STRUCTURED RE-ENTRY · DESIGN-ONLY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-7 · PROSPECTIVE LEGACY CONTEXT RETIREMENT · IMPACT SCOPE**

## 0. Purpose

LRE-7 maps the narrowest context-growth change surface required to move the first migrated LIVE_REACTION lane from LC3 to LC4.

The target is not deletion of historical `<COMMUNITY>`.

The target is:

```text
for a newly generated migrated direct-B-root Mode C turn:
new legacy Source context bytes added to assistant transcript = 0
```

while preserving:

```text
S1 structured validated semantic ownership
P1 structured LIVE_REACTION presentation
old historical <COMMUNITY> bytes
legacy old-chat read compatibility
zero structured Source re-entry
```

This checkpoint is design-only.

It does not change prompts, serializers, output handlers, validators, stored messages, DOM/UI, persistence, release artifacts, or target-host state.

## 1. Authority chain

Consumes:

```text
LRE master
LRE-2 Semantic Control
LRE-3 Caps + Instrumentation
LRE-5 Semantic-Owner Cutover
LRE-6 Structured Presentation Cutover
3M-7 Context Re-entry / Source History
3M-9 Integration / Source-Irrelevant Baseline
```

Runtime production remains independently authoritative on `release-simcore`.

## 2. Design snapshots

```text
main = 71716063fbbfaf1fc2dedaa69b52ab798c7b68f6
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1
```

These identities are evidence only for this design transaction.

A runtime transaction must re-run G1 against then-current production/host.

## 3. LC4 target axes

The master defines LC4 as:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = H2 LEGACY_CONTEXT_PREEXISTING_ONLY
R = R1 LEGACY_READ_ONLY_COMPAT
```

LRE-7 changes only H for the already migrated first lane.

Canonical law:

```text
LRE-7 CUTS NEW LEGACY CONTEXT GROWTH
LRE-7 DOES NOT REOPEN SEMANTIC OWNERSHIP
LRE-7 DOES NOT REOPEN PRESENTATION OWNERSHIP
LRE-7 DOES NOT DELETE OLD TRANSCRIPT
LRE-7 DOES NOT CREATE STRUCTURED SOURCE MEMORY
```

## 4. First-slice capability scope

Selected first slice:

```text
family = LIVE_REACTION
mode = C
source scope = direct B root
semantic stage = PRIMARY, future precondition
presentation stage = structured P1, future precondition
host-context stage target = H2 for this migrated lane
```

Out of scope for this first slice:

```text
legacy-native B_START / B_CONTINUE / B_END retirement
A-root Source paths
BOARD / NEWS / SOCIAL_FEED / PUBLIC_KNOWLEDGE
old-chat rewriting
persistent Source history
Candidate C context re-entry
```

Therefore:

```text
MIGRATED_LANE_H2
!=
GLOBAL_ALL_MODES_LEGACY_ZERO
```

## 5. Current transitional dependency inherited from LC2/LC3

LRE-5 permits an optional one-way compatibility serializer:

```text
validated LIVE_REACTION
→ LegacyCommunityCompatibilitySerializerV1
→ stored/displayable <COMMUNITY> bridge
```

LRE-6 may hide that bridge in presentation while leaving transcript bytes unchanged.

Therefore LC3 may still have:

```text
newLegacyContextCharsThisTurn > 0
```

for a migrated turn.

LRE-7 exists to remove that final *new-turn host-context* dependency.

## 6. Selected narrow seam

LRE-7 selects:

```text
MIGRATED_TURN_LEGACY_WRITE_FIREWALL_V1
```

Conceptual responsibilities:

```text
1. migrated-lane prompt no longer requests independent legacy <COMMUNITY>
2. LegacyCommunityCompatibilitySerializerV1 is disabled for the migrated LC4 lane
3. PrimaryLegacySourceGuardV1 remains defense-in-depth against unauthorized native <COMMUNITY>
4. Structure / Finalize derive expected new legacy Community blocks = 0 for that lane
5. clean stored assistant output contains no newly produced structural <COMMUNITY> Source block
6. LRE-6 structured presentation still consumes the validated current sidecar through its ephemeral binding
7. no structured sidecar bytes enter transcript or future context
8. old historical <COMMUNITY> remains untouched/readable
```

This is a write firewall, not a history scrubber.

## 7. Producer contract retirement

At LC4 migrated turns, the main model must not be instructed to independently emit a legacy `<COMMUNITY>` block.

The active Source-generation instruction for the migrated lane is the structured transient Source proposal contract frozen by LRE-2/LRE-5.

Canonical distinction:

```text
RETIRE LEGACY COMMUNITY OUTPUT INSTRUCTION
!=
REMOVE ALL COMMUNITY-RELATED HISTORICAL CONTEXT FROM THE PROMPT
```

Historical host transcript handling remains a separate compatibility concern.

## 8. Compatibility bridge disposition

For the first migrated LC4 lane:

```text
LegacyCommunityCompatibilitySerializerV1
= DISABLED FOR NEW MIGRATED TURNS
```

No ordinary consumer may require a newly stored legacy bridge after P1 structured presentation is active.

If a concrete consumer still proves a hard dependency on newly stored bridge bytes, LC4 is not ready and must HOLD rather than silently keeping H1.

## 9. Primary legacy guard remains

Even after the legacy prompt instruction and serializer are retired, `PrimaryLegacySourceGuardV1` remains a defense-in-depth boundary.

If the model emits an unauthorized structural `<COMMUNITY>` block anyway:

```text
PRIMARY migrated turn
+ native structural <COMMUNITY>
→ suppress before stored output
→ record guard status
→ do not parse it into Source semantics
```

Repeated guard intervention remains G2 model-compliance debt.

## 10. Structure / Finalize expectation change

For the migrated LC4 lane, expected newly stored legacy Source blocks become mechanically:

```text
expectedLegacyCommunityBlocks = 0
```

This must derive from capability/stage/disposition, not from model prose.

Legacy Structure/Finalize checks that previously required Community for this migrated turn must be narrowed so absence is the correct state, not a repair target.

## 11. No repair regeneration

Forbidden:

```text
expected Community = 0
but Community missing
→ repair by generating / restoring Community
```

Also forbidden:

```text
structured presentation unavailable
→ store legacy Community as fallback
```

Presentation failure does not reopen H1 or S0.

## 12. Stored output contract

For one successful migrated LC4 turn:

```text
stored assistant Source bytes
  legacy <COMMUNITY> = 0
  transient structured carrier = 0
  display protocol/beacon bytes = 0
```

Ordinary assistant prose/frame/Knowledge behavior remains governed by their existing owners.

LRE-7 is not authorization to strip arbitrary literal text that merely contains the string `<COMMUNITY>` outside the structural legacy Source boundary.

## 13. Presentation continuity without stored bridge

LRE-6 already permits bridge-disabled presentation expectation.

At LC4:

```text
bridge expectation = 0
legacy suppression step = not needed
structured LIVE_REACTION materialization = still eligible from current validated sidecar
```

The card remains ephemeral/current-projection only.

Therefore:

```text
NO STORED LEGACY SOURCE BLOCK
DOES NOT IMPLY
NO CURRENT STRUCTURED SOURCE UI
```

## 14. No structured re-entry substitution

LRE-7 must not replace legacy transcript growth with a new hidden structured memory channel.

Required:

```text
structuredReentryChars = 0
structured Source history store = NONE
persistent sidecar = NONE
```

Canonical law:

```text
RETIRING LEGACY CONTEXT
DOES NOT CREATE STRUCTURED CONTEXT RE-ENTRY AUTHORITY
```

Candidate C C6 remains closed for this first-major lane.

## 15. Historical transcript preservation

LRE-7 does not scan old turns to delete or rewrite `<COMMUNITY>`.

Required:

```text
old stored assistant messages = byte-preserved by LRE-7
old message identity = unchanged
old Community read compatibility = retained
```

Old-chat and mixed-era behavior is owned by LRE-8.

## 16. Mixed-era expectation after LC4

A chat may legitimately contain:

```text
old turn → stored <COMMUNITY>
old turn → stored <COMMUNITY>
------ migration boundary ------
new migrated turn → no stored <COMMUNITY>, structured UI may appear ephemerally
```

This is expected, not corruption.

## 17. Evidence contract

LRE-3 evidence fields become the first machine-checkable LC4 proof surface.

For each successful migrated LC4 turn:

```text
legacyCompatibilityBridgeUsed = false
legacyCompatibilityBridgeChars = 0
legacyCommunityBlocksThisTurn = 0
legacyCommunityCharsThisTurn = 0
newLegacyContextCharsThisTurn = 0
structuredReentryChars = 0
```

In addition:

```text
carrier persisted bytes = 0
display protocol persisted bytes = 0
```

must be proven by target-host/runtime evidence before runtime PASS.

## 18. DORMANT isolation

Ordinary Source-irrelevant turns retain the 3M-9/LRE-3 DORMANT contract.

LRE-7 must not add:

```text
history scans
old Community counting across transcript
persistent migration ledger
background cleanup
network/model work
```

The firewall is current-turn/stage scoped.

## 19. Rollback semantics

LC4 runtime failure must not be repaired per request by re-enabling legacy Source writing.

Required rollback model:

```text
record anomaly
→ explicit release/stage rollback transaction
→ previous approved LC3/LC2 state if required
```

Forbidden:

```text
this request failed
→ silently write legacy Community again
```

## 20. G2 relationship

LRE-7 reduces legacy prompt/output obligations but does not by itself close G2.

Target-host/model-compliance evidence must still establish that the model reliably follows the structured proposal contract and that guard intervention is acceptably bounded.

Repeated native Community emission after prompt retirement is a model-compliance signal, not semantic authority.

## 21. G5 relationship

LRE-7 assumes future LC3 structured presentation readiness.

It does not claim G5 PASS.

If structured presentation is not proven, LC4 activation must not proceed merely because the write firewall itself is structurally sound.

## 22. BLOCKER set

```text
BLOCKER · MIGRATED_LC4_TURN_STORES_NEW_LEGACY_COMMUNITY
BLOCKER · LEGACY_BRIDGE_REENABLED_PER_REQUEST_ON_STRUCTURED_FAILURE
BLOCKER · STRUCTURE_REPAIRS_MISSING_COMMUNITY_WHEN_EXPECTED_COUNT_IS_ZERO
BLOCKER · LEGACY_CONTEXT_RETIREMENT_REPLACED_BY_STRUCTURED_REENTRY
BLOCKER · OLD_TRANSCRIPT_REWRITTEN_AS_PART_OF_LRE7
BLOCKER · LEGACY_NATIVE_B_LANES_RETIRE_BEFORE_THEIR_SEMANTIC_PRESENTATION_CUTOVER
BLOCKER · PRESENTATION_FAILURE_REOPENS_LEGACY_WRITE_AUTHORITY
BLOCKER · CARRIER_OR_DISPLAY_PROTOCOL_BYTES_PERSIST_TO_TRANSCRIPT
```

## 23. WATCH set

```text
WATCH · NATIVE_COMMUNITY_EMITTED_AFTER_PROMPT_RETIREMENT
WATCH · MIXED_ERA_CHAT_REMAINS_VISIBLE_BY_DESIGN
WATCH · EPHEMERAL_STRUCTURED_CARD_DISAPPEARS_AFTER_RELOAD
WATCH · FULL_PRODUCT_LEGACY_ZERO_NOT_YET_CLAIMED_BY_FIRST_SLICE
```

## 24. DEFER set

```text
DEFER · LEGACY_NATIVE_B_LANE_RETIREMENT
DEFER · OLD_CHAT_MIXED_ERA_CLOSE_TO_LRE8
DEFER · HISTORICAL_COMMUNITY_PARSER_FINAL_RETIREMENT
DEFER · DURABLE_SOURCE_UI_REPLAY
DEFER · STRUCTURED_CONTEXT_REENTRY
DEFER · GLOBAL_ALL_FAMILY_LEGACY_ZERO
```

## 25. Selected detailed-design seam

Proceed to detailed LRE-7 design around:

```text
MigratedTurnLegacyWritePolicyV1
+ legacy producer-instruction retirement
+ compatibility serializer disable
+ PrimaryLegacySourceGuardV1 defense-in-depth
+ expectedLegacyCommunityBlocks = 0
+ stored-output zero-legacy assertion
+ LRE-3 LC4 evidence receipt
+ explicit release rollback boundary
```

No runtime implementation is authorized by this impact scope.
