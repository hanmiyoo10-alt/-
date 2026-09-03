# SimCore Post-3.0M LRE-5 Semantic-Owner Cutover + Legacy Bridge Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-5 IMPACT SCOPE FROZEN · DESIGN-ONLY · LC2 STRUCTURED_SEMANTIC_PRIMARY TARGET · DIRECT-B-ROOT LIVE_REACTION ONLY · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-5 · LC2 · SEMANTIC OWNER CUTOVER · LEGACY BRIDGE**

## 0. Purpose

This checkpoint maps the minimum ownership and compatibility surface for a future LC1 → LC2 semantic-owner cutover.

It does not implement PRIMARY, change prompt/output bytes, create a serializer, modify Community parsing, change persistence, mount presentation, retire context, deploy, or run target-host evidence.

## 1. Authority snapshot

At design start:

```text
main = 97676663a22dfe7f92946a47a0b2bfbcf29ae477
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
runtime semantic stage = OFF
```

Runtime work, if separately authorized later, must repeat G1 against then-current production.

## 2. Upstream contracts consumed

```text
LRE master
LRE-1 host coupling
LRE-2 semantic control / PRIMARY law
LRE-3 caps + G8
LRE-4 structured shadow
3M-2 Exposure
3M-3 validator
3M-7 zero structured re-entry
3M-9 dormancy
```

## 3. Core migration law

LC2 is a release-scoped semantic-owner change:

```text
S0 LEGACY_NATIVE_SEMANTIC
→
S1 STRUCTURED_VALIDATED_SEMANTIC
```

It is not a per-request preference.

Canonical rule:

```text
PRIMARY
→ validated structured LIVE_REACTION is the sole semantic owner
```

Forbidden:

```text
PRIMARY request
→ structured failure
→ independent model-generated <COMMUNITY> becomes authority for only that request
```

Rollback from PRIMARY occurs only through an explicit release/config transaction.

## 4. First cutover slice

Exactly:

```text
family = LIVE_REACTION
mode = C
source = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projectionOrdinal = 0
```

BOARD / NEWS / SOCIAL_FEED / PUBLIC_KNOWLEDGE are outside this checkpoint.

## 5. Ownership surface

LRE-5 needs only four new/cutover responsibilities conceptually:

```text
1. SourceSemanticAuthorityStageV1 = PRIMARY
2. PrimarySourceCutoverCoordinatorV1
3. PrimaryLegacySourceGuardV1
4. LegacyCommunityCompatibilitySerializerV1, only while a proven LC2 compatibility consumer exists
```

Existing owners remain authoritative for selector, transport, authority, Exposure, validator, output compatibility, Structure, Finalize, Lineage/Handoff/Evidence, and state commit.

## 6. `PrimarySourceCutoverCoordinatorV1`

Narrow ownership:

```text
consume current validated LIVE_REACTION outcome
select source semantic disposition for this request
invoke compatibility serializer only when allowed/needed
ensure independent legacy source prose is not treated as authority
map bounded PRIMARY evidence into G8
```

It must not rejudge Exposure, repair model assertions, create Source facts, or become a second validator.

## 7. Primary request flow

Conceptually:

```text
current request authority
→ SourceJobSelectorV1
→ existing main-model call with PRIMARY producer contract
→ TransientSourceTransportV1
→ SourceDraftAssemblerV1
→ ExposurePolicyContextBuilderV1
→ 3M-3 Validator
→ validated structured LIVE_REACTION
→ PrimarySourceCutoverCoordinatorV1
   ├─ validated semantic result
   ├─ optional legacy compatibility representation
   └─ bounded G8 evidence
→ existing output path
```

The semantic-owner decision happens before presentation migration.

## 8. Prompt-side cutover

At PRIMARY the main model may still generate ordinary visible prose and the transient structured proposal.

It must no longer be instructed to independently create a trusted legacy `<COMMUNITY>` semantic block for migrated turns.

Canonical rule:

```text
ONE MODEL CALL
→ ONE STRUCTURED SOURCE PROPOSAL PATH
→ ONE VALIDATOR
→ ONE SOURCE SEMANTIC OWNER
```

## 9. Independent legacy Community is forbidden at PRIMARY

A model-emitted `<COMMUNITY>` block in the carrier-free visible prefix cannot become a second authority.

Required future enforcement direction:

```text
PRIMARY + independently model-generated <COMMUNITY>
→ structural legacy-source guard detects the block
→ block is excluded from trusted migrated Source representation
→ bounded violation evidence is recorded
```

The guard may identify/remove the legacy block structurally. It may not parse its prose into trusted assertions.

## 10. Why a guard is required

Prompt compliance alone cannot prove one-owner semantics.

Without a deterministic guard:

```text
model ignores PRIMARY instruction
→ emits <COMMUNITY>
→ existing Community parser/state path accepts it
→ dual semantic ownership silently returns
```

This is a migration blocker.

## 11. Compatibility bridge decision

The bridge is **transitional and consumer-driven**.

At LC2 presentation remains P0 until LRE-6.

Therefore the first LC2 profile has one concrete temporary compatibility need:

```text
validated structured LIVE_REACTION
→ legacy-compatible Community representation
→ preserve the existing legacy presentation/output consumer while semantic ownership has already moved
```

This proves a bounded V1 bridge need for the LC2 → LRE-6 interval only.

It does not authorize a permanent serializer.

## 12. `LegacyCommunityCompatibilitySerializerV1`

First scope:

```text
family = LIVE_REACTION only
source = validated ALLOW-only sidecar
output = one legacy-compatible <COMMUNITY> representation for the current direct-B-root C projection
```

The serializer is:

```text
deterministic
bounded
representation-only
no model call
no network
no persistence
no context retrieval
no semantic authority
```

## 13. Serializer input restrictions

May consume only:

```text
validated ALLOW assertions
family identity
bounded presentation-safe metadata already authorized by the structured payload contract
```

May not consume:

```text
DENY/HOLD semantic body
untrusted proposal
supportQuote
raw Knowledge
raw legacy Community
validation receipt hidden semantics
```

## 14. Serializer output restrictions

May not invent:

```text
actor names
timestamps
metrics
extra reactions
facts
rumors
social reachability
publication state
```

If the structured semantic schema does not contain a field, the legacy bridge cannot fabricate it merely to mimic historical Community aesthetics.

## 15. Bridge output is representation, not source authority

Canonical law:

```text
Validated LIVE_REACTION
= semantic owner

serialized <COMMUNITY>
= compatibility representation only
```

If serializer output is later reparsed by legacy Community machinery, that parser result must not be promoted back above its structured source.

## 16. No round-trip authority

Forbidden:

```text
validated structured source
→ serializer
→ <COMMUNITY>
→ legacy parser
→ new trusted Source semantic object
```

The round trip may exist only for narrow legacy presentation/state compatibility, never for semantic authority regeneration.

## 17. Failure classes at PRIMARY

PRIMARY must distinguish:

```text
PRIMARY_AVAILABLE
PRIMARY_EMPTY
PRIMARY_QUARANTINED
PRIMARY_UNAVAILABLE_TRANSPORT
PRIMARY_UNAVAILABLE_AUTHORITY
PRIMARY_CAP_BLOCKED
PRIMARY_INTEGRATION_FAILURE
```

These mirror the meaningful LC1 machinery domains but change semantic consequences because structured semantics now own the source lane.

## 18. Fail-closed law

At PRIMARY:

```text
structured source unavailable / empty / fully quarantined
→ no valid migrated Source semantic representation for that request
→ no independent legacy semantic fallback
```

Ordinary non-Source visible prose may still proceed through the existing core output path if its own contracts remain valid.

LRE-5 does not require the whole assistant response to fail merely because the optional Source projection is unavailable.

## 19. Empty/quarantined compatibility behavior

The bridge must not invent a neutral reaction such as:

```text
"No public reactions available"
```

unless such content later becomes an explicitly authorized semantic assertion.

Default V1 direction:

```text
no validated Source semantics
→ no serialized semantic Community payload
```

Any existing mandatory-Community output expectation must therefore be amended to accept an explicit PRIMARY source-unavailable/empty disposition rather than forcing fake content or legacy fallback.

## 20. Existing output/Structure implication

Current Community/Structure/Finalize logic historically expects legacy Community according to mode/state rules.

LRE-5 implementation planning must therefore map one narrow compatibility change:

```text
PRIMARY structured-source disposition
→ current-output expectation / state-commit safety
```

so that:

```text
valid serialized bridge present
→ legacy compatibility consumer may observe one bridge block

PRIMARY empty/quarantined/unavailable
→ absence is explicitly authorized by structured Source disposition
```

This is a contract adjustment, not a broad Structure rewrite.

## 21. State/counter boundary

Legacy Community counters/classifier state may remain temporarily observable for compatibility while P0 exists.

They cannot become semantic authority over the structured sidecar.

Any counter increment caused by a serialized compatibility block means only:

```text
legacy representation observed
```

not:

```text
legacy semantics own the source
```

## 22. No presentation cutover here

LRE-5 does not mount structured DOM/cards.

```text
P = P0 legacy compatibility presentation
```

remains until LRE-6.

## 23. No context retirement here

LRE-5 does not claim:

```text
newLegacyContextCharsThisTurn = 0
```

If the compatibility bridge is stored in the host transcript at LC2, legacy context may still grow temporarily.

That is owned by LRE-7 after presentation cutover/host binding work.

## 24. No Candidate C

First LC2 LIVE_REACTION remains current-projection-only:

```text
persistence = none
cross-turn Source identity = none
mutation = none
revision = none
future structured re-entry = none
```

Candidate C is not activated by semantic-owner cutover alone.

## 25. Cutover evidence boundary

LRE-5 is not authorized merely because LRE-4 design exists.

A future PRIMARY candidate requires trustworthy LC1 evidence showing applicable G1/G2/G3/G4/G6/G8 gates and no open shadow blocker.

This document designs that future cutover; it does not assert those runtime proofs exist today.

## 26. Required PRIMARY fixtures

Future implementation/evidence must cover at least:

```text
P0 stage SHADOW remains legacy-owned
P1 valid public assertion → PRIMARY_AVAILABLE
P2 valid mixed packet → ALLOW-only semantics/bridge
P3 all private/unexposed → PRIMARY_QUARANTINED / no legacy fallback
P4 valid zero assertions → PRIMARY_EMPTY
P5 malformed/missing carrier → PRIMARY_UNAVAILABLE_TRANSPORT
P6 stale authority → PRIMARY_UNAVAILABLE_AUTHORITY
P7 cap violation → PRIMARY_CAP_BLOCKED
P8 independently model-generated <COMMUNITY> at PRIMARY → guard violation; no semantic promotion
P9 serializer output contains only validated structured semantics
P10 serializer never reads DENY/HOLD/supportQuote/Knowledge body
P11 absence of Source payload is explicitly accepted under PRIMARY fail-closed disposition
P12 DORMANT ordinary chat remains zero Source semantic work
P13 reroll/reload invalidates old job/currentness
P14 no persistence/re-entry/network/extra model
```

## 27. BLOCKER set

```text
BLOCKER · PRIMARY_PER_REQUEST_LEGACY_SEMANTIC_FALLBACK
BLOCKER · DUAL_STRUCTURED_AND_NATIVE_COMMUNITY_SEMANTIC_AUTHORITY
BLOCKER · MODEL_GENERATED_COMMUNITY_SURVIVES_PRIMARY_AS_TRUSTED_SOURCE
BLOCKER · LEGACY_BRIDGE_REPARSED_INTO_NEW_SEMANTIC_AUTHORITY
BLOCKER · LEGACY_BRIDGE_CONSUMES_DENY_OR_HOLD_CONTENT
BLOCKER · LEGACY_BRIDGE_INVENTS_SOURCE_SEMANTICS
BLOCKER · PRIMARY_EMPTY_FORCES_FAKE_REACTION_CONTENT
BLOCKER · PRIMARY_FAILURE_RETRIES_WITH_SECOND_MODEL
BLOCKER · PRIMARY_CUTOVER_MIXED_WITH_PRESENTATION_CUTOVER
BLOCKER · PRIMARY_CUTOVER_MIXED_WITH_CONTEXT_RETIREMENT
BLOCKER · PRIMARY_ACTIVATED_WITHOUT_LC1/G2_EVIDENCE
```

## 28. WATCH set

```text
WATCH · EXACT_LEGACY_PRESENTATION_CONSUMER_SURFACE_NEEDS_THEN_CURRENT_RUNTIME_PREFLIGHT
WATCH · LEGACY_COMMUNITY_COUNTERS_REMAIN_REPRESENTATION_COMPATIBILITY_DEBT_DURING_LC2
WATCH · PRIMARY_PROMPT_COMPLIANCE_REMAINS_MODEL_BEHAVIOR_EVIDENCE_DEPENDENT
WATCH · EMPTY/QUARANTINED_VISIBLE_USER_EXPERIENCE_NEEDS_REAL_HOST_REVIEW
```

## 29. DEFER set

```text
DEFER · STRUCTURED_PRESENTATION_PRIMARY → LRE-6
DEFER · PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT → LRE-7
DEFER · HARD LEGACY PARSER REMOVAL → LRE-8+
DEFER · BOARD/NEWS SEMANTIC CUTOVER → LRE-9
DEFER · PERMANENT LEGACY SERIALIZER
```

## 30. Selected LRE-5 design seam

```text
DIRECT_B_ROOT_LIVE_REACTION_PRIMARY_OWNER_CUTOVER_V1
```

with:

```text
structured validated semantics = sole Source authority
legacy bridge = temporary representation-only compatibility adapter
independent model-generated Community = structurally barred from authority
per-request fallback = none
presentation cutover = none
context retirement = none
```

## 31. Next step

Freeze the detailed LC2 design over this impact scope, including:

```text
PRIMARY stage transaction
closed primary disposition taxonomy
legacy-source guard law
compatibility serializer V1 contract
empty/quarantine/unavailable behavior
legacy state/output compatibility contract
G8 cutover evidence
rollback boundary
LRE-6 handoff
```
