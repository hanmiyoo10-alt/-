# SimCore Post-3.0M LRE-3 Family Caps + Integration Instrumentation Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-3 DESIGN FROZEN · DESIGN-ONLY · LIVE_REACTION CAP PROFILE V1 FROZEN · COMMON G8 TURN-EVIDENCE CONTRACT FROZEN · BOARD/NEWS NUMERIC CAPS DEFERRED TO LRE-9 FAMILY ACTIVATION · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-3 · G6 / G8 · SAFETY CAPS · DORMANCY · BOUNDED EVIDENCE**

## 0. Purpose

LRE-3 freezes the numeric safety/performance caps and bounded integration evidence required before the first structured LIVE_REACTION shadow may be considered runtime-ready.

It answers:

```text
What exact first-family limits bound the LRE-2 producer/transport/validator path?

Where are those limits enforced?

What happens when a cap is exceeded?

How does SimCore prove DORMANT means zero Source semantic burden?

What bounded evidence is captured for selector, prompt contribution, transport,
support proof, validation, sidecar, context growth, side effects, and latency?

How do diagnostics remain evidence rather than a second semantic/source-history store?

Which parts of G6/G8 close now and which remain family-stage runtime proof?
```

This checkpoint does not implement or deploy any cap, counter, timing checkpoint, transport parser, prompt change, DOM/CSS, persistence, or release change.

## 1. Authority chain

LRE-3 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_06411_BOUNDED_TELEMETRY_CAPSULE_COMPACTION_ACTIVATION.md
```

Production runtime remains independently authoritative on `release-simcore`.

Any future implementation must re-run G1 against then-current production rather than relying on this design-time source snapshot.

## 2. Primary decision

LRE-3 freezes **family-stage cap closure**, not one guessed global numeric policy.

```text
LIVE_REACTION
→ concrete first-runtime cap profile = FROZEN NOW

BOARD
→ cap categories compatible with common G8 schema
→ concrete numbers = LRE-9 before BOARD activation

NEWS
→ cap categories compatible with common G8 schema
→ concrete numbers = LRE-9 before NEWS activation
```

Canonical rule:

```text
FAMILY DESIGN EXISTS
!=
FAMILY NUMERIC CAP PROFILE IS READY
```

This is consistent with the staged readiness labels already frozen by the Legacy / Runtime-enabling master.

## 3. Cap profiles are engineering ceilings

All LRE-3 numeric values are:

```text
safety ceilings
performance ceilings
protocol boundedness limits
```

They are not:

```text
simulated audience population
platform realism
social-network limits
canonical world facts
presentation aesthetics
```

Changing a cap later requires an explicit bounded design/evidence amendment.

No model or user prompt may dynamically raise these limits.

## 4. Frozen first-family profile

Conceptual profile name:

```text
LIVE_REACTION_CAP_PROFILE_V1
```

Frozen constants:

```text
MAX_SOURCE_PRODUCER_CONTRACT_CHARS        = 2048

MAX_PROPOSAL_ASSERTIONS                   = 8
MIN_PROPOSAL_ORDINAL                      = 0
MAX_PROPOSAL_ORDINAL                      = 7

MAX_ASSERTION_CONTENT_CHARS               = 320
MAX_AGGREGATE_ASSERTION_CONTENT_CHARS     = 2048

MAX_SUPPORT_QUOTE_CHARS                   = 256
MAX_AGGREGATE_SUPPORT_QUOTE_CHARS         = 1536

MAX_JOB_TOKEN_CHARS                       = 128
MAX_PACKET_JSON_CHARS                     = 8192
MAX_PROTOCOL_ZONE_CHARS                   = 9216

MAX_VALIDATION_RECEIPT_ROWS               = 8
MAX_TRUSTED_SOURCE_REGION_SCAN_CHARS      = 32768

MAX_SOURCE_TURN_EVIDENCE_SERIALIZED_CHARS = 4096
```

All char counts are JavaScript/string-code-unit engineering counts unless a later implementation preflight freezes a different already-owned counting primitive.

The same counting primitive must be used consistently inside one runtime profile.

## 5. Why these numbers are intentionally conservative

The first runtime slice is:

```text
one current direct-B-root LIVE_REACTION projection
one current proposal packet
one existing main-model call
no source history
no persistence
```

The profile therefore favors small current-projection payloads over future family generality.

The limits leave room for:

```text
up to 8 short semantic assertions
bounded exact support anchors
strict JSON field overhead
one bounded job token
transport delimiters / whitespace headroom
```

while preventing a shadow/eval sidecar from quietly becoming another long assistant response.

The numbers are not claims that eight reactions or 320 characters are the best final product presentation.

Presentation density remains a later renderer/product concern.

## 6. Producer-contract cap

The Source-specific prompt overlay added only when the selector is ACTIVE must satisfy:

```text
sourceProducerContractChars <= 2048
```

This count includes the new Source-specific serialization/support instructions owned by the runtime-enabling path.

It does not reclassify already-existing source/event provenance bytes as new producer-contract cost.

For DORMANT:

```text
sourceProducerContractChars = 0
```

### Build/config rule

A static/frozen producer contract that exceeds 2048 chars is a release/config defect.

Required disposition:

```text
PROMPT_CONTRACT_OVERSIZE
→ Source capability cannot be treated ACTIVE
```

Do not silently truncate instructions to fit.

## 7. Assertion-count cap

The proposal packet may contain:

```text
0..8 assertions
```

More than 8:

```text
ASSERTION_COUNT_EXCEEDED
→ whole proposal packet structurally unusable
```

No first-N salvage.

Zero assertions remains a structurally representable empty proposal and is judged by the existing validator contract as applicable.

## 8. Ordinal bound

Every proposal assertion ordinal must be an integer in:

```text
0..7
```

and remain unique in the packet.

Out-of-range or duplicate ordinal:

```text
ASSERTION_ORDINAL_INVALID
→ whole packet unusable
```

Ordinal is request-local only and never becomes persistent identity.

## 9. Assertion-content caps

Each assertion:

```text
1 <= content.length <= 320
```

Aggregate semantic content:

```text
sum(assertion.content.length) <= 2048
```

Failure classes:

```text
ASSERTION_CONTENT_EMPTY
ASSERTION_CONTENT_OVERSIZE
ASSERTION_CONTENT_AGGREGATE_EXCEEDED
```

All are structural packet failures.

The parser/validator does not shorten content.

## 10. Support-quote caps

For every non-UNKNOWN support basis:

```text
1 <= supportQuote.length <= 256
```

For UNKNOWN:

```text
supportQuote.length = 0
```

Aggregate support quote budget:

```text
sum(supportQuote.length) <= 1536
```

Failure classes:

```text
SUPPORT_QUOTE_REQUIRED
SUPPORT_QUOTE_FORBIDDEN_FOR_UNKNOWN
SUPPORT_QUOTE_OVERSIZE
SUPPORT_QUOTE_AGGREGATE_EXCEEDED
```

Support quote text remains transient proof material and must not enter validated sidecar or long-term state.

## 11. Why aggregate support is tighter than 8 × per-item maximum

The per-item ceiling allows one assertion to cite a moderately sized exact anchor when needed.

The aggregate ceiling prevents every assertion from simultaneously consuming the per-item maximum.

This keeps the transport/current-proof horizon bounded without forcing every individual quote to be tiny.

## 12. Job-token cap

The correlation token must satisfy:

```text
1 <= jobToken.length <= 128
```

An oversize token is not accepted as correlation evidence.

```text
JOB_TOKEN_OVERSIZE
→ packet unusable
```

The token remains correlation, not authority.

## 13. Packet JSON cap

The strict packet JSON body must satisfy:

```text
packetJsonChars <= 8192
```

The check occurs before full semantic object use.

If the JSON body exceeds the cap:

```text
PACKET_JSON_OVERSIZE
→ transport status = OVERSIZE
→ proposal packet = null
```

No partial parse / prefix parse / first-N assertion salvage.

## 14. Protocol-zone cap

From the first reserved start delimiter through the raw-response tail:

```text
protocolZoneChars <= 9216
```

This includes:

```text
start delimiter
JSON body
close delimiter
allowed trailing whitespace
```

Oversize protocol zone:

```text
TRANSPORT_PROTOCOL_ZONE_OVERSIZE
→ proposal packet = null
→ cleanContent = visible prefix before reserved start marker
```

The protocol zone still does not become stored transcript.

## 15. Relationship between packet and protocol caps

The profile deliberately reserves approximately one KiB of headroom between:

```text
MAX_PACKET_JSON_CHARS = 8192
MAX_PROTOCOL_ZONE_CHARS = 9216
```

for protocol framing and bounded whitespace.

The larger protocol cap never authorizes a packet JSON body above 8192.

Both checks must pass.

## 16. Validation-receipt row cap

Because the packet itself contains at most eight assertions:

```text
MAX_VALIDATION_RECEIPT_ROWS = 8
```

A receipt needing more rows indicates an internal contract violation rather than normal content variability.

Required disposition:

```text
RECEIPT_ROW_LIMIT_EXCEEDED
→ diagnostics/integration contract failure
```

It must not change an already-derived semantic disposition.

## 17. Trusted current source-region scan cap

Support proof may inspect only the current trusted direct-B-root source representation.

The total source-region text admitted to support-proof membership work is capped at:

```text
32768 chars
```

This is **not** permission to scan 32768 chars of arbitrary history.

Allowed horizon:

```text
current trusted source/root message only
→ structural BROADCAST_VISIBLE / SOURCE_COMMUNITY / SOURCE_KNOWLEDGE regions
```

Forbidden:

```text
whole chat
nearest historical source
all prior B turns
old Source cards
persistent archive
```

## 18. Source-region oversize behavior

If the current trusted source regions exceed the scan cap:

```text
support proof status = SOURCE_REGION_OVERSIZE
positive support signals = none
```

The packet does not gain authority from a truncated source view.

Do not:

```text
truncate the source region
→ search only the prefix
→ treat a match as complete support proof
```

A structurally valid proposal may continue to the conservative 3M-2 policy with no positive support basis.

Thus:

```text
SOURCE PROOF BOUNDEDNESS FAILURE
!=
PACKET STRUCTURAL FAILURE
```

## 19. No semantic truncation rule

Across all caps:

```text
semantic content is never shortened into validity
support quote is never shortened into a match
source region is never shortened into positive authority
packet is never partially salvaged into a trusted prefix
```

Canonical law:

```text
CAP EXCEEDED
→ FAIL CLOSED AT THE OWNING LAYER
```

not:

```text
CAP EXCEEDED
→ MODIFY SEMANTICS UNTIL IT FITS
```

## 20. Family cap registry concept

LRE-3 freezes a conceptual static registry:

```text
SourceFamilyCapRegistryV1

LIVE_REACTION
  profile = LIVE_REACTION_CAP_PROFILE_V1
  state = FROZEN

BOARD
  profile = none
  state = PENDING_LRE9

NEWS
  profile = none
  state = PENDING_LRE9
```

This is release configuration/design authority, not persistent chat state.

A family without a frozen cap profile cannot become runtime ACTIVE.

## 21. BOARD / NEWS numeric defer is explicit

The following remain deferred:

```text
BOARD participant count
BOARD entry count
BOARD per-entry / aggregate semantic chars
BOARD receipt rows

NEWS story count
NEWS headline/body component counts
NEWS per-story / aggregate semantic chars
NEWS receipt rows
```

These values must be frozen before the respective LRE-9 activation transaction.

They may reuse the common G8 evidence dimensions but must not inherit LIVE_REACTION numbers by convenience.

## 22. G8 evidence object

LRE-3 freezes a conceptual request/turn-local diagnostic object:

```text
SourceTurnEvidenceV1
```

It is evidence, not semantic authority.

It is allowed to describe:

```text
what path ran
how much bounded work occurred
what structural/policy outcomes were counted
whether forbidden side effects stayed zero
```

It is not allowed to store Source content.

## 23. Evidence retention model

First runtime design:

```text
retention = latest completed Source integration sample only
location = runtime memory / existing diagnostics owner when implemented
history array = none
persistent Source telemetry table = none
```

A new completed request replaces the previous diagnostic sample.

Runtime unload/reload may discard it.

Operator-driven validation may capture the displayed/exported sample externally as repository evidence.

## 24. No semantic text in G8

`SourceTurnEvidenceV1` must not contain:

```text
assertion content
support quote body
raw Source region
raw packet JSON
raw Community block
raw Knowledge block
raw assistant body
raw user body
```

If debugging requires semantic examples, use separately controlled test fixtures/evidence packets, not always-on telemetry.

## 25. Evidence serialized cap

If the latest-turn evidence is serialized for a diagnostic/export surface:

```text
serialized chars <= 4096
```

This is independent from the old telemetry handoff capsule's whole-capsule cap.

LRE-3 does not authorize adding this evidence to durable telemetry handoff.

If a later implementation proposes that integration, the existing telemetry budget must be re-preflighted first.

## 26. Frozen `SourceTurnEvidenceV1` field groups

Conceptual shape:

```text
SourceTurnEvidenceV1
  version = 1

  control
  prompt
  transport
  support
  validation
  context
  effects
  timing
  capState
```

Each group is bounded and contains only enums, booleans, numbers, or fixed-count records.

No open-ended metadata bag is permitted.

## 27. `control` group

Required fields:

```text
semanticAuthorityStage = OFF | SHADOW | PRIMARY
selectorInvoked
selectorStatus = DORMANT | UNSUPPORTED | BLOCKED_CAPABILITY | ACTIVE
selectorReasonCode
family = NONE | LIVE_REACTION | BOARD | NEWS
projectionOrdinal = null | 0
```

For the first runtime slice:

```text
ACTIVE family may only be LIVE_REACTION
```

until later family activation designs amend the registry.

## 28. `prompt` group

Required fields:

```text
sourceProducerContractApplied
sourceProducerContractChars
```

Optional host/provider token count may be exposed only when the host already provides a trustworthy count without a new tokenizer dependency.

Otherwise:

```text
sourceProducerContractTokens = null / UNAVAILABLE
```

LRE-3 does not add a tokenizer just for telemetry.

## 29. `transport` group

Required fields:

```text
transportExpected
transportInvoked
transportStatus
rawResponseChars
cleanContentChars
protocolZoneChars
packetJsonChars
packetAssertionCount
carrierStripped
carrierLeakDetected
```

Allowed transport statuses preserve LRE-2 semantics and may add bounded cap-specific status detail:

```text
NOT_EXPECTED
MISSING
EXTRACTED
MALFORMED
OVERSIZE
TOKEN_MISMATCH
SCHEMA_INVALID
```

`carrierLeakDetected=true` is always a host/transport failure signal, not compatibility success.

## 30. DORMANT transport accounting

For DORMANT:

```text
transportExpected = false
transportInvoked = false
protocolZoneChars = 0
packetJsonChars = 0
packetAssertionCount = 0
carrierStripped = false
```

The implementation must not scan the raw response for Source delimiters merely to populate telemetry.

`rawResponseChars` / `cleanContentChars` may remain owned by existing generic output telemetry rather than duplicated here if obtaining them would require extra DORMANT work.

## 31. `support` group

Required fields:

```text
supportProofInvoked
trustedSourceReads
sourceRegionCharsScanned
supportQuoteCharsTotal
```

and fixed counters for the closed proof-status vocabulary:

```text
matchCount
unknownBasisCount
unsupportedBasisCount
sourceStaleCount
regionMissingCount
quoteMismatchCount
sourceRegionOversizeCount
```

No per-assertion support quote body is retained.

## 32. `validation` group

Required fields:

```text
validatorInvoked
validatorState
assertionCount
allowedCount
deniedCount
heldCount
validatedAssertionCount
validatedSemanticChars
```

The evidence object may carry one bounded `primaryFailureCode` from the closed validator/integration reason vocabulary.

It must not duplicate every per-assertion semantic body or build an unbounded reason list.

## 33. `context` group

Required fields:

```text
sourceHistoryScanCount
structuredReentryChars
legacyCommunityBlocksThisTurn
legacyCommunityCharsThisTurn
newLegacyContextCharsThisTurn
legacyCompatibilityBridgeUsed
legacyCompatibilityBridgeChars
```

Important phase rule:

- LC1/SHADOW: legacy behavior remains existing production behavior.
- LC2/LC3: compatibility bridge activity may become relevant.
- LC4+: `newLegacyContextCharsThisTurn` is expected to converge to zero for migrated turns.

These counters must be derived from already-owned current-turn facts/metadata where possible.

They must not trigger an extra DORMANT history/output scan merely to measure zero.

If a value cannot be obtained without violating the dormancy firewall, it may be `null / UNAVAILABLE` until the owning path naturally exposes it.

## 34. `effects` group

Required counters:

```text
sourcePersistentReads
sourcePersistentWrites
sourceNetworkCalls
sourceExtraModelCalls
sourceTimersScheduled
sourceBackgroundJobs
```

First-major Tier A expected values:

```text
all = 0
```

A non-zero value is not normalized away.

It must trigger investigation against the owning contract.

## 35. `timing` group

Bounded local spans:

```text
selectorMs
transportMs
supportRegionMs
policyContextMs
validatorMs
sourceLocalTotalMs
```

Timing fields may be null when the corresponding stage did not run.

No unbounded timeline/event list is allowed.

## 36. Timing is attribution, not semantic authority

A slow Source path does not change ALLOW/DENY/HOLD.

A fast Source path does not make an invalid packet valid.

Canonical rule:

```text
PERFORMANCE EVIDENCE
!=
SEMANTIC AUTHORITY
```

## 37. No device-independent millisecond pass threshold

Repository design cannot honestly freeze one universal millisecond threshold across target devices/hosts.

Therefore LRE-3 freezes deterministic cost invariants and captures timing evidence, while same-host baseline comparison later determines practical latency regression.

Hard deterministic rules are stronger where available:

```text
DORMANT adds no Source await
DORMANT adds no Source host/storage read
DORMANT adds no transport parse
DORMANT adds no support/source-body scan
ACTIVE collections cannot exceed cap profile
ACTIVE cost horizon remains current projection only
```

## 38. `capState` group

Required fields:

```text
capProfile
capViolation
capReasonCode
```

For first family:

```text
capProfile = LIVE_REACTION_CAP_PROFILE_V1
```

`capReasonCode` is null when no cap violation occurred.

## 39. Cap reason-code classes

Closed minimum set:

```text
PROMPT_CONTRACT_OVERSIZE
ASSERTION_COUNT_EXCEEDED
ASSERTION_ORDINAL_INVALID
ASSERTION_CONTENT_EMPTY
ASSERTION_CONTENT_OVERSIZE
ASSERTION_CONTENT_AGGREGATE_EXCEEDED
SUPPORT_QUOTE_REQUIRED
SUPPORT_QUOTE_FORBIDDEN_FOR_UNKNOWN
SUPPORT_QUOTE_OVERSIZE
SUPPORT_QUOTE_AGGREGATE_EXCEEDED
JOB_TOKEN_OVERSIZE
PACKET_JSON_OVERSIZE
TRANSPORT_PROTOCOL_ZONE_OVERSIZE
SOURCE_REGION_OVERSIZE
RECEIPT_ROW_LIMIT_EXCEEDED
SOURCE_TURN_EVIDENCE_OVERSIZE
```

These are bounded structural/performance reasons, separate from 3M-2 semantic reason codes.

## 40. Failure-domain preservation

LRE-3 preserves:

```text
cap failure
!=
transport grammar failure
!=
support proof failure
!=
validator structural failure
!=
policy DENY/HOLD
!=
model semantic-compliance failure
!=
presentation failure
```

No single `sourceFailed` flag is sufficient.

## 41. DORMANT deterministic acceptance contract

When selector status is DORMANT, the Source-specific evidence must prove:

```text
sourceProducerContractChars = 0
transportInvoked = false
supportProofInvoked = false
validatorInvoked = false
sourceHistoryScanCount = 0
structuredReentryChars = 0
sourcePersistentReads = 0
sourcePersistentWrites = 0
sourceNetworkCalls = 0
sourceExtraModelCalls = 0
sourceTimersScheduled = 0
sourceBackgroundJobs = 0
```

Additionally the Source integration must introduce:

```text
new Source awaits = 0
new Source host/storage reads = 0
new Source JSON parse = 0
new Source current-body scan = 0
```

The pure O(1) selector branch is the permitted Source work.

## 42. DORMANT previous-source cases

The same acceptance applies when the immediately prior turn was source-active.

Required matrix includes:

```text
ordinary after LIVE_REACTION
ordinary after BOARD once BOARD exists
ordinary after NEWS once NEWS exists
ordinary after repeated mixed source turns
unrelated prose containing source-family words
```

Historical residue may not wake the Source path.

## 43. ACTIVE / SHADOW evidence contract

For the first direct-B-root SHADOW candidate, a successful structured sample should be able to show:

```text
selectorStatus = ACTIVE
family = LIVE_REACTION
sourceProducerContractApplied = true
sourceProducerContractChars in 1..2048
transportExpected = true
transportStatus = EXTRACTED
carrierStripped = true
packetAssertionCount in 0..8
sourceHistoryScanCount = 0
sourcePersistentReads/Writes = 0
sourceNetworkCalls = 0
sourceExtraModelCalls = 0
sourceTimersScheduled/backgroundJobs = 0
validatorInvoked = true
allowed + denied + held = assertionCount
validatedAssertionCount = allowedCount
```

A malformed/denied/held sample has different expected statuses but the same boundedness/side-effect rules.

## 44. Count conservation invariants

For every structurally valid assertion set:

```text
allowedCount + deniedCount + heldCount = assertionCount
validatedAssertionCount = allowedCount
validatedSemanticChars <= MAX_AGGREGATE_ASSERTION_CONTENT_CHARS
```

Support proof count total must not exceed assertion count.

Receipt rows must not exceed assertion count or eight.

Any count contradiction is an instrumentation/integration defect.

## 45. Transport conservation invariants

When transport status is EXTRACTED:

```text
carrierStripped = true
packetJsonChars <= 8192
protocolZoneChars <= 9216
packetAssertionCount <= 8
```

When transport is NOT_EXPECTED:

```text
transportInvoked = false
packetAssertionCount = 0
protocolZoneChars = 0
```

When malformed/oversize protocol zone begins at a reserved start marker:

```text
carrier/protocol zone must still not survive into cleanContent
```

## 46. Fingerprint FIX evidence

G8 must be able to prove the LRE-2 fingerprint correction indirectly through bounded booleans/counts:

```text
carrierStripped = true
carrierLeakDetected = false
```

and future dedicated regression must prove:

```text
hostOutputFingerprint derives from cleanContent
raw carrier-bearing fingerprint is never trusted
```

Do not place full fingerprints in SourceTurnEvidence merely to duplicate existing identity diagnostics.

## 47. Legacy-context growth evidence

The Legacy / Runtime-enabling program needs prospective, not retroactive, evidence.

LRE-3 therefore tracks current-turn growth concepts:

```text
newLegacyContextCharsThisTurn
structuredReentryChars
legacyCompatibilityBridgeChars
```

It does not scan or total the entire historical transcript.

Canonical rule:

```text
PROVE NEW GROWTH STOPPED
!=
RECOUNT OR REWRITE ALL OLD HISTORY
```

## 48. LC1 expectations

At structured SHADOW:

```text
structured semantic authority = shadow only
legacy production output/context = unchanged
newLegacyContextCharsThisTurn may remain > 0
structuredReentryChars = 0
```

This is not a migration failure.

LRE-7 later owns making new legacy context growth zero.

## 49. Evidence object overflow behavior

`SourceTurnEvidenceV1` contains only fixed fields and closed records, so exceeding 4096 chars indicates a diagnostics contract defect.

Required behavior:

```text
SOURCE_TURN_EVIDENCE_OVERSIZE
→ do not export/persist the oversized full evidence object
→ Source semantic result remains unchanged
→ expose a minimal diagnostic overflow sentinel if safely possible
```

Instrumentation failure must not rewrite semantic authority.

## 50. Existing telemetry handoff boundary

Prior SimCore telemetry established:

```text
rich same-generation observer state
!=
durable compact handoff state
```

and a whole-capsule serialized ceiling.

LRE-3 does not consume new durable capsule budget.

First profile:

```text
SourceTurnEvidence persistent handoff = NONE
```

If real validation later requires reload-surviving Source diagnostics, that is a separate telemetry-budget transaction and must not carry semantic text.

## 51. No per-turn evidence history

Forbidden:

```text
sourceEvidenceHistory.push(turnEvidence)
```

or:

```text
persist every support/validator receipt for later analytics
```

First runtime retains only the latest bounded sample in runtime diagnostics.

Longitudinal evidence is created by the operator/repository validation process, not by a hidden runtime semantic log.

## 52. No new Source persistence

LRE-3 keeps:

```text
persistent Source database = NONE
Source receipt store = NONE
Source telemetry history store = NONE
Source cache = NONE
Source re-entry ledger = NONE
```

Instrumentation cannot be used as a back door for Candidate C.

## 53. No network / model / background observability side effects

Telemetry itself must not cause the effects it measures.

Forbidden:

```text
network upload for telemetry
second model call for grading
background aggregation worker
timer-driven telemetry flush
history scan for statistics
```

G8 is local bounded evidence only.

## 54. Implementation owner preference

When implementation is separately authorized, prefer:

```text
existing diagnostics / runtime-telemetry control plane
+
owner-local counters returned from selector/transport/support/validator
```

rather than introducing a parallel global telemetry framework.

But existing telemetry module ownership/budgets must be re-preflighted against then-current production before modification.

This design freezes semantics/shape, not the final module name.

## 55. Runtime timing instrumentation rule

Timing checkpoints must be synchronous/local and must not hide new awaits.

A timing helper may wrap existing local stages but cannot:

```text
change stage order
introduce host calls
introduce storage calls
retry failed work
keep unbounded event arrays
```

## 56. G6 disposition after LRE-3

Design-level gate status becomes:

```text
G6_LIVE_REACTION_CAP_DESIGN = FROZEN
G6_LIVE_REACTION_RUNTIME_PROOF = PENDING

G6_BOARD_CAP_DESIGN = PENDING_LRE9
G6_NEWS_CAP_DESIGN = PENDING_LRE9
```

Thus LRE-3 closes the numeric design blocker required for the first LIVE_REACTION shadow only.

It does not claim first-major G6 fully closed for all families.

## 57. G8 disposition after LRE-3

Design-level gate status becomes:

```text
G8_INSTRUMENTATION_DESIGN = FROZEN
G8_RUNTIME_PROOF = PENDING
```

Runtime proof must show the counters are truthful and bounded under the actual host/runtime path.

## 58. LRE-4 readiness relation

LRE-4 structured shadow design may now rely on:

```text
G3 selector design frozen
G4 producer/transport design frozen
G6 LIVE_REACTION cap design frozen
G8 instrumentation design frozen
```

but structured shadow activation still cannot claim readiness until applicable runtime proofs and G2 target-host/model-compliance evidence are satisfied.

Canonical distinction:

```text
LRE-3 DESIGN COMPLETE
!=
LIVE_REACTION SHADOW RUNTIME READY
```

## 59. Required future static tests

Before any runtime SHADOW candidate, static/regression coverage must verify at least:

```text
all LIVE_REACTION cap constants present exactly once
cap profile registry contains no duplicate family
BOARD/NEWS remain inactive without cap profiles
producer-contract chars <= 2048
assertion count 8 pass / 9 fail
ordinal 0..7 pass / out-of-range fail
content 320 pass / 321 fail
aggregate content 2048 pass / 2049 fail
support quote 256 pass / 257 fail
aggregate support 1536 pass / 1537 fail
job token 128 pass / 129 fail
packet JSON 8192 pass / 8193 fail
protocol zone 9216 pass / 9217 fail
receipt rows <= 8
source-region scan <= 32768
source-region oversize yields no positive support proof
no semantic truncation path
DORMANT Source producer chars = 0
DORMANT transport/support/validator invocations = false
DORMANT no new await / history scan / Source I/O
SourceTurnEvidence contains no semantic text fields
SourceTurnEvidence no history array
latest.js == install.js
```

## 60. Required future active tests

For an ACTIVE direct-B-root SHADOW candidate:

```text
valid minimal packet
valid maximum-count bounded packet
mixed ALLOW/DENY/HOLD count conservation
support proof MATCH / mismatch / stale / region oversize
packet/protocol oversize stripping
carrier leak false
cleanContent fingerprint semantics
zero Source persistent/network/extra-model/background effects
current-projection-only source scan
bounded timing fields
latest-turn evidence replacement rather than append
```

## 61. Real-validation evidence use

During later real target-host validation, one captured `SourceTurnEvidenceV1` sample should be interpretable without reading raw semantic content.

A real evidence packet may pair:

```text
bounded SourceTurnEvidenceV1
+
operator-observed visible output
+
separately controlled semantic fixture/oracle when applicable
```

Diagnostics describe mechanics/cost.

Fixture/oracle review judges semantic compliance.

Do not conflate them.

## 62. BLOCKER set

```text
BLOCKER · CAP_FAILURE_TRUNCATES_AND_TRUSTS_SEMANTIC_CONTENT
BLOCKER · PACKET_OVERSIZE_SALVAGES_FIRST_N_ASSERTIONS
BLOCKER · SOURCE_REGION_OVERSIZE_TRUNCATES_INTO_POSITIVE_SUPPORT
BLOCKER · DORMANT_SOURCE_PATH_ADDS_OUTPUT_OR_HISTORY_SCAN
BLOCKER · DORMANT_SOURCE_PATH_ADDS_AWAIT_OR_HOST_STORAGE_IO
BLOCKER · SOURCE_TURN_EVIDENCE_STORES_ASSERTION_CONTENT
BLOCKER · SOURCE_TURN_EVIDENCE_STORES_SUPPORT_QUOTE_OR_RAW_PACKET
BLOCKER · SOURCE_TURN_EVIDENCE_ACCUMULATES_PER_TURN_HISTORY
BLOCKER · TELEMETRY_SIDE_EFFECT_ADDS_NETWORK_MODEL_TIMER_OR_BACKGROUND_WORK
BLOCKER · INSTRUMENTATION_RESULT_CHANGES_SEMANTIC_DISPOSITION
BLOCKER · BOARD_OR_NEWS_ACTIVATES_WITHOUT_FROZEN_FAMILY_CAP_PROFILE
BLOCKER · LIVE_REACTION_CAP_RAISED_SILENTLY_WITHOUT_EVIDENCE_AMENDMENT
```

## 63. WATCH set

```text
WATCH · G2_TARGET_HOST_MODEL_COMPLIANCE_STILL_PENDING
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · DEVICE_DEPENDENT_SOURCE_LATENCY_THRESHOLD_REQUIRES_SAME_HOST_BASELINE
WATCH · SOURCE_DIAGNOSTIC_HANDOFF_WOULD_REQUIRE_EXISTING_TELEMETRY_BUDGET_REPREFLIGHT
WATCH · SOURCE_REGION_32768_CAP_MAY_NEED_EVIDENCE_ADJUSTMENT_IF_REAL_DIRECT_B_ROOTS_EXCEED_IT
```

The last WATCH does not authorize truncation or silent cap growth.

## 64. DEFER set

```text
DEFER · BOARD_CONCRETE_CAP_PROFILE_TO_LRE9
DEFER · NEWS_CONCRETE_CAP_PROFILE_TO_LRE9
DEFER · SOURCE_TURN_EVIDENCE_DURABLE_HANDOFF
DEFER · SOURCE_TELEMETRY_HISTORY
DEFER · PER_ASSERTION_LONGITUDINAL_ANALYTICS
DEFER · DEVICE_INDEPENDENT_LATENCY_THRESHOLD
DEFER · PROVIDER_TOKENIZER_DEPENDENCY
DEFER · DORMANT_RESERVED_MARKER_SCAN
```

## 65. No runtime authority

This document changes none of:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
Prompt bytes
assistant output
Community behavior
SnapshotStore
runtime telemetry
DOM/CSS
release-simcore
production version
S7 / v0.70.3
```

## 66. Completion criterion

LRE-3 design is complete when frozen:

```text
family-stage cap closure policy
LIVE_REACTION_CAP_PROFILE_V1 numeric constants
cap enforcement layers
no-truncation / fail-closed behavior
current source-region scan bound
SourceTurnEvidenceV1 bounded field groups
DORMANT deterministic zero-work proof
ACTIVE count conservation
legacy current-turn growth evidence
no semantic telemetry history
G6 staged disposition
G8 design disposition
LRE-4 handoff
```

All are frozen by this document.

## 67. Final status

```text
LRE_3_DESIGN                             = FROZEN
LIVE_REACTION_CAP_PROFILE                = LIVE_REACTION_CAP_PROFILE_V1
LIVE_REACTION_G6_DESIGN                  = FROZEN
LIVE_REACTION_G6_RUNTIME_PROOF           = PENDING
BOARD_G6                                 = PENDING_LRE9
NEWS_G6                                  = PENDING_LRE9
G8_INSTRUMENTATION_DESIGN                = FROZEN
G8_RUNTIME_PROOF                         = PENDING
SOURCE_EVIDENCE_RETENTION                = LATEST_TURN_MEMORY_ONLY
SOURCE_EVIDENCE_PERSISTENCE              = NONE
SOURCE_SEMANTIC_HISTORY                  = NONE
DORMANT_SOURCE_PROMPT_BYTES              = 0
DORMANT_SOURCE_HISTORY_SCAN              = 0
DORMANT_SOURCE_EXTRA_IO                  = 0
DORMANT_SOURCE_EXTRA_MODEL               = 0
PRODUCTION                               = UNCHANGED
release-simcore                          = UNCHANGED
NEXT_DESIGN                              = LRE-4 LIVE_REACTION STRUCTURED SHADOW
```
