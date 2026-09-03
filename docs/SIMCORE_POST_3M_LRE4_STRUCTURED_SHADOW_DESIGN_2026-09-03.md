# SimCore Post-3.0M LRE-4 LIVE_REACTION Structured Shadow Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-4 DESIGN FROZEN · LC1 STRUCTURED_SHADOW TRANSACTION FROZEN · DIRECT-B-ROOT LIVE_REACTION ONLY · G2 STILL HOLD · RUNTIME ACTIVATION NOT AUTHORIZED · DESIGN-ONLY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-4 · LIVE_REACTION · STRUCTURED SHADOW · LC1**

## 0. Purpose

LRE-4 freezes how the already-designed Source semantic-control pieces compose into one LC1 `STRUCTURED_SHADOW` transaction.

It answers:

```text
When does one shadow transaction begin and end?
What does the shadow coordinator own?
How are transport / authority / support / policy / validation outcomes mapped into one bounded request-local result?
What remains production authority at LC1?
What does a successful or failed shadow result actually mean?
How is legacy compatibility observed without parsing legacy prose back into trusted semantics?
What evidence is required before any future LC1 runtime activation or LRE-5 semantic-owner cutover?
```

This checkpoint is design-only.

It does not implement runtime code, change prompt bytes, add transport parsing, activate SHADOW, mutate `release-simcore`, publish a release, run target-host evidence, mount structured presentation, persist Source objects, or change future model context.

## 1. Authority chain

LRE-4 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE4_STRUCTURED_SHADOW_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

Production runtime authority remains independently owned by `release-simcore`.

## 2. Design-time authority snapshot

At LRE-4 design start:

```text
main = a48ce273c6ae620541378d029da58c663e0d466c
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production stage = legacy native / structured Source OFF
```

Exact implementation authority must be freshly re-preflighted if runtime work is later authorized.

## 3. LC1 meaning

LC1 remains:

```text
LC1 STRUCTURED_SHADOW

production semantic owner = legacy native
production presentation    = legacy Community path
legacy transcript behavior = unchanged
structured semantics       = shadow/evaluation only
structured presentation    = none
structured persistence     = none
structured context re-entry= none
```

Canonical law:

```text
SHADOW EXECUTES
!=
SHADOW OWNS PRODUCTION SEMANTICS
```

## 4. First supported shadow slice

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

No other Source family/scope becomes shadow-capable from this design.

## 5. `StructuredShadowCoordinatorV1`

LRE-4 freezes one narrow conceptual orchestration owner:

```text
StructuredShadowCoordinatorV1
```

It owns only:

```text
single-turn stage sequencing
stage-entry / stage-exit classification
request-local shadow result assembly
handoff of bounded counters/statuses into SourceTurnEvidenceV1
request-local cleanup
```

It does not own:

```text
current Source authority
semantic content generation
transport grammar
support-proof semantics
Exposure policy
3M-3 validation policy
legacy Community semantics
visible output
presentation DOM
persistence
future context
```

## 6. No new mega-pipeline authority

The coordinator composes existing owners. It may not rewrite their decisions.

```text
selector says DORMANT
→ coordinator cannot force ACTIVE

transport says TOKEN_MISMATCH
→ coordinator cannot rebind packet

support builder has no positive proof
→ coordinator cannot invent exposure

validator says DENY/HOLD
→ coordinator cannot downgrade/relabel assertion
```

Canonical law:

```text
COORDINATOR = SEQUENCER / OBSERVER
NOT SEMANTIC REPAIRER
```

## 7. Full LC1 shadow transaction

Frozen conceptual flow:

```text
CURRENT REQUEST
  ↓
Lifecycle / Lineage / Handoff / Evidence
  ↓
SourceJobSelectorV1
  ├─ not ACTIVE
  │    ↓
  │  no Source semantic work
  │
  └─ ACTIVE
       ↓
conditional producer contract in existing main-model request
       ↓
existing MAIN MODEL call
       ↓
visible legacy-compatible prefix + transient carrier tail
       ↓
TransientSourceTransportV1
  ├─ cleanContent
  │     ↓
  │  existing Output Compat → Structure → Finalize
  │     ↓
  │  legacy production output path
  │
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
      StructuredShadowCoordinatorV1 result classification
        ↓
      SourceTurnEvidenceV1 latest-turn evidence
```

The structured sidecar is not consumed by production presentation or future prompt assembly at LC1.

## 8. Transaction lifetime

One shadow transaction exists only for the current prepared Source job.

Its lifetime is bounded by:

```text
current request preparation
→ current model response
→ current output processing
→ current shadow result/evidence completion
```

After completion:

```text
proposal packet body = discard
supportQuote bodies = discard
policy contexts = discard
validated sidecar = discard after bounded evidence/authorized test capture
shadow coordinator state = replace/clear
```

No persistent Source object is created.

## 9. Runtime-generation binding

The transaction is bound to the LRE-2 current job token and runtime generation.

If reload/replacement/reroll invalidates the current job before structured use:

```text
old packet = stale
old shadow transaction = unusable
```

No persistent pending-shadow registry is introduced.

## 10. Shadow transaction result

Frozen conceptual shape:

```text
ShadowTransactionResultV1
  version = 1
  status
  family
  projectionOrdinal
  selectorStatus
  transportStatus
  validatorState
  assertionCount
  allowedCount
  deniedCount
  heldCount
  validatedAssertionCount
  primaryReasonCode
  legacyPathPreserved
  carrierLeakDetected
```

The object contains no semantic bodies.

It is request-local diagnostic/evaluation state only.

## 11. Closed shadow status vocabulary

LRE-4 freezes:

```text
NOT_RUN_STAGE_OFF
NOT_RUN_DORMANT
NOT_RUN_UNSUPPORTED
NOT_RUN_BLOCKED_CAPABILITY
SHADOW_AVAILABLE
SHADOW_EMPTY
SHADOW_QUARANTINED
SHADOW_UNAVAILABLE_TRANSPORT
SHADOW_UNAVAILABLE_AUTHORITY
SHADOW_CAP_BLOCKED
SHADOW_INTEGRATION_FAILURE
```

A later implementation may use exact enum constants with the same semantics, but must not collapse these domains into one generic failure bit.

## 12. `NOT_RUN_STAGE_OFF`

When:

```text
SourceSemanticAuthorityStageV1 = OFF
```

then:

```text
structured producer contract = not applied
transport expected = false
support proof = not invoked
validator = not invoked
shadow result = NOT_RUN_STAGE_OFF
```

This remains current production posture.

## 13. `NOT_RUN_DORMANT`

When the selector returns DORMANT:

```text
shadow result = NOT_RUN_DORMANT
```

and the LRE-3 DORMANT zero-work contract applies.

No response scan for carrier delimiters is allowed merely to produce this status.

## 14. `NOT_RUN_UNSUPPORTED`

When the current request is Source-like but outside the frozen first slice:

```text
selector = UNSUPPORTED
shadow result = NOT_RUN_UNSUPPORTED
```

The coordinator must not silently fall back to a different family/root/window.

## 15. `NOT_RUN_BLOCKED_CAPABILITY`

When the direct-B-root shape matches but an applicable release capability is not enabled:

```text
selector = BLOCKED_CAPABILITY
shadow result = NOT_RUN_BLOCKED_CAPABILITY
```

Current design-time example:

```text
G2 target-host/model-compliance gate is still HOLD
```

A static producer-contract oversize defect also prevents capability ACTIVE rather than allowing a knowingly invalid shadow request.

## 16. `SHADOW_AVAILABLE`

A request may be classified `SHADOW_AVAILABLE` only when:

```text
selector = ACTIVE
transport packet structurally valid
current Source authority exact join valid
3M-3 validator completed
validatedAssertionCount >= 1
```

This means only:

```text
one or more structured assertions survived current validation
```

It does not mean:

```text
legacy output is wrong
structured output should be shown
LC2 cutover is safe
model semantic entailment has been machine-proven
```

## 17. Partial quarantine under `SHADOW_AVAILABLE`

If one packet contains both ALLOW and DENY/HOLD results:

```text
validatedAssertionCount >= 1
→ status may remain SHADOW_AVAILABLE
```

while evidence separately preserves:

```text
deniedCount
heldCount
```

No denied/held semantic body enters the validated sidecar.

## 18. `SHADOW_EMPTY`

When a structurally valid packet contains zero assertion candidates and validation completes without a semantic assertion:

```text
assertionCount = 0
validatedAssertionCount = 0
→ SHADOW_EMPTY
```

Empty is distinct from transport failure or policy quarantine.

## 19. `SHADOW_QUARANTINED`

When:

```text
assertionCount >= 1
allowedCount = 0
and validator completes with DENY/HOLD outcomes
```

then:

```text
SHADOW_QUARANTINED
```

This is a successful execution of conservative policy machinery, not a transport/runtime crash.

## 20. `SHADOW_UNAVAILABLE_TRANSPORT`

Transport-layer failures include:

```text
MISSING
MALFORMED
OVERSIZE
TOKEN_MISMATCH
SCHEMA_INVALID
```

when transport was expected for an ACTIVE shadow job.

Result:

```text
trusted proposal object = none
validated sidecar = none
shadow status = SHADOW_UNAVAILABLE_TRANSPORT
```

Legacy carrier-free visible output path remains production authority.

## 21. `SHADOW_CAP_BLOCKED`

Post-generation cap violations owned by packet/transport/support/evidence boundedness map to:

```text
SHADOW_CAP_BLOCKED
```

when they prevent a valid structured shadow result.

Examples:

```text
ASSERTION_COUNT_EXCEEDED
PACKET_JSON_OVERSIZE
TRANSPORT_PROTOCOL_ZONE_OVERSIZE
JOB_TOKEN_OVERSIZE
```

Source-region oversize is different when packet structure remains valid: it removes positive support proof and lets policy fail closed rather than automatically making the packet structurally invalid.

## 22. `SHADOW_UNAVAILABLE_AUTHORITY`

Whole-shadow authority unavailability includes cases where the required current Source authority exact join itself cannot be established.

Examples:

```text
current HANDOFF/EVIDENCE source identity unavailable
root/source binding stale before trusted assembly
required current authority context missing
```

This is distinct from one assertion's supportQuote mismatch.

## 23. Assertion-local proof failure remains policy input failure

For a structurally valid proposal:

```text
QUOTE_MISMATCH
REGION_MISSING
UNKNOWN_BASIS
SOURCE_REGION_OVERSIZE
```

normally means:

```text
positive proof signal = none for affected assertion
→ 3M-2 derives conservative DENY/HOLD
```

It does not automatically become whole-transaction authority failure.

## 24. `SHADOW_INTEGRATION_FAILURE`

Reserved for violations of integration accounting/ownership rather than ordinary model output variability.

Examples:

```text
ALLOW + DENY + HOLD != assertionCount
validatedAssertionCount != ALLOW count
receipt rows exceed contract after semantic disposition already derived
carrierLeakDetected = true
shadow result attempts to mutate legacy output
forbidden Source side effect counter becomes non-zero
```

These require investigation before migration progression.

## 25. Legacy path at LC1

The carrier-free `cleanContent` remains the only pre-canonical visible representation passed into the existing output pipeline.

```text
cleanContent
→ Output Compat
→ Structure
→ Output Finalize
→ legacy production result
```

The structured sidecar is not inserted into this path.

## 26. Meaning of `legacyPathPreserved`

`legacyPathPreserved=true` means the frozen ownership/path invariants held:

```text
cleanContent used by existing visible-output pipeline
legacy semantic owner remained production owner
structured sidecar did not rewrite visible result
structured presentation did not mount
structured re-entry did not occur
carrier did not survive into canonical transcript
```

It does **not** mean byte-identical output to an OFF control generation.

## 27. Prompt-side observer effect is acknowledged

LC1 adds a future conditional producer/serialization contract to the existing main-model request.

Therefore even while production ownership is unchanged:

```text
SHADOW prompt overlay
may influence model wording
```

Canonical distinction:

```text
PRODUCTION OWNER UNCHANGED
!=
STOCHASTIC MODEL BYTES GUARANTEED IDENTICAL
```

This is why combined Exposure + serialization target-host/model-compliance evidence remains mandatory.

## 28. No legacy semantic back-parsing

LRE-4 forbids:

```text
legacy <COMMUNITY> prose
→ regex/parser/model
→ trusted assertions
→ compare with structured sidecar
```

The old representation lacks the structured provenance/policy receipts required by 3M-3.

Therefore the default shadow evaluator does not produce a `legacySemanticMatch` field.

## 29. What shadow actually compares

Shadow evidence compares **contract outcomes** against current authority and frozen evaluation expectations.

Permitted dimensions:

```text
correct current source binding
Exposure restraint
private/unexposed denial
attributed-social handling
visible-cue inference handling
stale support invalidation
transport hygiene
cap compliance
validator accounting
DORMANT isolation
legacy-path preservation
forbidden side-effect zeros
```

The main comparison target for semantic correctness is the frozen policy/oracle fixture, not reinterpreted legacy prose.

## 30. Natural live turns without an oracle

A natural real-host Source turn may provide valuable operational evidence even when no deterministic semantic oracle exists.

Such a turn may prove:

```text
selector/authority binding
carrier transport/strip
boundedness
current support mechanics
validator execution
legacy preservation
no forbidden side effects
```

It may not by itself prove arbitrary natural-language semantic correctness.

Operator/model-compliance review remains necessary where the frozen evaluation protocol requires it.

## 31. Shadow discrepancy law

Any disagreement discovered in structured evaluation is evidence, not repair authority.

Forbidden:

```text
shadow DENY but legacy looks plausible
→ force ALLOW

shadow ALLOW but operator dislikes prose
→ rewrite legacy output

shadow transport missing
→ second model retry

shadow assertion mode fails
→ auto-downgrade mode
```

Required behavior:

```text
preserve legacy production behavior
record bounded failure/evidence class
classify WATCH / FIX / BLOCKER in repository before migration progression
```

## 32. No hidden second judge

LRE-4 does not add:

```text
auxiliary model
post-output semantic classifier
embedding comparison
legacy-vs-structured similarity scorer
```

The first shadow exists specifically to test the frozen single-model + deterministic-validator architecture.

## 33. SourceTurnEvidence mapping

`SourceTurnEvidenceV1` remains the bounded runtime evidence surface.

LRE-4 maps coordinator outcomes into existing groups without enlarging the object into semantic history.

### control

```text
semanticAuthorityStage
selectorStatus
selectorReasonCode
family
projectionOrdinal
```

### transport

```text
transportExpected
transportInvoked
transportStatus
protocolZoneChars
packetJsonChars
packetAssertionCount
carrierStripped
carrierLeakDetected
```

### support

Aggregate proof counters only.

### validation

```text
assertionCount
allowedCount
deniedCount
heldCount
validatedAssertionCount
primaryFailureCode
```

### context / effects

Must preserve first-major zeros where applicable.

## 34. Shadow status in G8

LRE-4 permits one bounded coordinator-level field to be exposed through an existing diagnostics/evaluation surface:

```text
shadowStatus
```

It is a closed enum from section 11.

If adding this field would make the serialized `SourceTurnEvidenceV1` exceed its 4096-char cap, evidence export fails its cap rather than dropping arbitrary fields silently.

No shadow semantic body is added.

## 35. DORMANT evidence

For a DORMANT request:

```text
shadowStatus = NOT_RUN_DORMANT
selectorInvoked = true
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

No raw response scan is allowed to prove the absence of a carrier.

## 36. ACTIVE shadow evidence

For an ACTIVE shadow request, the evidence surface must make it possible to distinguish:

```text
selector entered
producer overlay applied
transport extracted/failed
support proof entered/failed
validator entered
ALLOW / DENY / HOLD counts
validated sidecar count
carrier strip status
cap status
forbidden side-effect zeros
```

No semantic content needs to be retained to prove those integration facts.

## 37. Carrier contamination is BLOCKER

If a future target host stores the reserved carrier bytes in assistant transcript:

```text
carrierLeakDetected = true
shadowStatus = SHADOW_INTEGRATION_FAILURE
```

Classification:

```text
BLOCKER · SHADOW_TRANSIENT_CARRIER_ENTERED_HOST_TRANSCRIPT
```

Do not silently strip it later through Edit Reconcile and call the shadow successful.

## 38. Fingerprint rule inherited

When carrier-capable runtime exists:

```text
outputFingerprint
= fingerprint(canonical result.content)

hostOutputFingerprint
= fingerprint(carrier-free cleanContent)
```

The carrier-bearing raw response is never a trusted normal host generation representation.

## 39. No presentation dependency

LC1 shadow does not require G5.

```text
structured presentation mount = 0
```

Legacy Community remains visible.

A structured DOM/card may not be used as proof that the underlying structured semantics are valid.

## 40. No Candidate C

Candidate C remains off because LC1 creates no durable derived object.

```text
cross-turn source identity = none
persistent source object = none
mutation = none
revision = none
derived-to-derived lineage = none
future re-entry = none
```

## 41. No structured context growth

At LC1:

```text
structuredReentryChars = 0
```

Proposal packet, support quote, sidecar, receipt, and shadow result are not automatically inserted into future model context.

Legacy transcript growth remains the pre-existing compatibility behavior to be addressed later by LRE-7.

## 42. No structured persistence

First shadow stores no Source semantic database or archive.

Permitted retention:

```text
latest bounded SourceTurnEvidence sample in runtime diagnostics
external operator capture into repository evidence when explicitly validating
```

The external evidence packet is administrative test evidence, not runtime Source memory.

## 43. Future LC1 runtime activation preconditions

LRE-4 does not create a new gate system.

Before a runtime candidate may actually set:

```text
SourceSemanticAuthorityStageV1 = SHADOW
```

all applicable existing gates must be satisfied for LIVE_REACTION:

```text
G1 then-current production preflight PASS
G2 combined Exposure + structured-producer target-host/model-compliance PASS
G3 selector implementation/static proof PASS
G4 producer/transport implementation + host-strip proof PASS
G6 LIVE_REACTION cap implementation proof PASS
G8 bounded instrumentation implementation proof PASS
latest.js == install.js
no contradictory BLOCKER open
```

G5 presentation is not required for LC1.

G7 NEWS maturity is irrelevant to LIVE_REACTION LC1.

## 44. Current activation disposition

At design freeze:

```text
G2 = HOLD_TARGET_HOST_EVIDENCE_REQUIRED
runtime semantic-control implementation = absent
SourceSemanticAuthorityStageV1 = OFF
```

Therefore:

```text
LC1_RUNTIME_ACTIVATION = NOT_AUTHORIZED
```

LRE-4 freezes the transaction contract only.

## 45. Deterministic shadow fixture matrix

A future implementation must cover at least:

```text
S0 stage OFF → NOT_RUN_STAGE_OFF
S1 ordinary DORMANT → NOT_RUN_DORMANT / zero Source semantic work
S2 unsupported source-like shape → NOT_RUN_UNSUPPORTED
S3 matched shape but capability blocked → NOT_RUN_BLOCKED_CAPABILITY
S4 valid public confirmed fact → structured ALLOW / SHADOW_AVAILABLE
S5 Knowledge-only confirmed secret → DENY / SHADOW_QUARANTINED
S6 source Community attributed-social → eligible attributed handling
S7 visible broadcast cue inference → eligible inference handling
S8 unknown confirmed fact → DENY
S9 packet with mixed ALLOW + DENY/HOLD → SHADOW_AVAILABLE with quarantine counts
S10 valid zero-assertion packet → SHADOW_EMPTY
S11 malformed carrier → SHADOW_UNAVAILABLE_TRANSPORT
S12 token mismatch → SHADOW_UNAVAILABLE_TRANSPORT
S13 packet cap violation → SHADOW_CAP_BLOCKED
S14 current source authority stale/unavailable → SHADOW_UNAVAILABLE_AUTHORITY
S15 support quote mismatch → conservative policy result, not packet repair
S16 source-region oversize → no positive support proof
S17 carrier leak → SHADOW_INTEGRATION_FAILURE / BLOCKER
S18 accounting mismatch → SHADOW_INTEGRATION_FAILURE
S19 forbidden Source side effect non-zero → SHADOW_INTEGRATION_FAILURE
S20 reload/reroll invalidates old job token
```

These tests prove machinery, not arbitrary natural-language model compliance.

## 46. Exposure / laundering fixture inheritance

Future target-host/model-compliance evidence must include the existing Exposure adversarial corpus plus LRE-2 combined-contract laundering classes, including:

```text
SUPPORT_ANCHOR_LAUNDERING
MODE_LAUNDERING
PRIVATE_FACT_WITH_UNRELATED_PUBLIC_QUOTE
COMMUNITY_RUMOR_AS_FACT_WITH_VALID_COMMUNITY_QUOTE
KNOWLEDGE_FACT_WITH_GENERIC_BROADCAST_QUOTE
```

The combined serialization instructions must be present during the relevant model-compliance test because serialization can change model behavior.

## 47. Future target-host shadow evidence packet

A captured LC1 evidence packet must identify at least:

```text
runtime/release identity
release-simcore exact commit
latest.js blob
install.js blob
latest.js == install.js
runtime generation/boot identity when available
Source semantic authority stage
current source/root authority identity as permitted by diagnostics
frozen test/fixture identifier when applicable
SourceTurnEvidenceV1 bounded sample
operator result / blind-review result where required
```

It must not persist secret semantic bodies merely because shadow mode is diagnostic.

## 48. Target-host LC1 operational lanes

At minimum a future real shadow validation should exercise:

```text
R0 ordinary DORMANT before Source use
R1 direct B → C public/eligible LIVE_REACTION
R2 direct B → C private/unexposed negative
R3 attributed-social case
R4 visible-cue inference case
R5 reroll/reload stale-token/currentness behavior
R6 ordinary DORMANT immediately after Source-active turn
R7 repeated Source-active / ordinary alternation for no accumulation
```

Model-compliance fixtures and operational host lanes are complementary, not substitutes.

## 49. No byte-identical legacy baseline requirement

Because model generation is stochastic and LC1 introduces a conditional prompt overlay, LRE-4 does not require:

```text
OFF generation bytes == SHADOW generation bytes
```

Instead compatibility evidence checks:

```text
legacy output grammar remains valid
legacy production owner remains unchanged
no structured semantic text leaks into visible output
no carrier leaks
no ordinary-chat regression attributable to Source path
```

If paired controls are used, they are evidence aids rather than a byte-equality gate.

## 50. Ordinary-chat quality remains BLOCKER-sensitive

If SHADOW activation causes source-irrelevant ordinary chat regression in:

```text
Current Task Primacy
continuity
stale-topic replay
source leakage
instruction competition
context pressure
latency attributable to Source path
```

classification remains:

```text
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

A good shadow Source result cannot compensate for this.

## 51. Migration-readiness evidence, not migration authority

A healthy LC1 shadow may establish evidence that the structured architecture is viable.

It does not by itself authorize LC2.

Canonical law:

```text
LC1 SHADOW PASS
→ MAY SUPPORT LRE-5 DESIGN/IMPLEMENTATION READINESS

LC1 SHADOW PASS
!=
AUTOMATIC SEMANTIC-OWNER CUTOVER
```

## 52. LRE-5 entry evidence categories

Before any separately authorized LRE-5 semantic-primary transaction, the evidence record should prove:

```text
applicable G1/G2/G3/G4/G6/G8 gates PASS
DORMANT zero-work matrix PASS
transport/carrier hygiene PASS
no carrier transcript contamination
source authority exact-join behavior PASS
Exposure trap/control behavior PASS
combined laundering fixtures PASS
ALLOW/DENY/HOLD accounting PASS
support-at-use/currentness behavior PASS
no structured persistence/re-entry
no extra model/network/background work
legacy production path remained owner throughout LC1
no unresolved LC1 BLOCKER
```

No fixed count of arbitrary natural chats is invented here; the required semantic/operational classes must be covered with trustworthy evidence.

## 53. Shadow evidence failure classifications

### WATCH

A non-authoritative uncertainty that does not violate frozen safety/ownership invariants.

### FIX

A bounded implementation/test defect whose repair does not require architecture change.

### BLOCKER

Any violation of semantic ownership, exposure authority, transcript hygiene, dormancy, or forbidden side effects that makes migration unsafe.

Every real anomaly must be recorded before proceeding.

## 54. BLOCKER set

```text
BLOCKER · G2_HOLD_BYPASSED_FOR_SHADOW_ACTIVATION
BLOCKER · LEGACY_COMMUNITY_PROSE_PARSED_INTO_TRUSTED_SHADOW_SEMANTICS
BLOCKER · SHADOW_RESULT_BECOMES_PRODUCTION_SEMANTIC_AUTHORITY
BLOCKER · SHADOW_RESULT_REWRITES_VISIBLE_LEGACY_OUTPUT
BLOCKER · SHADOW_TRANSIENT_CARRIER_ENTERED_HOST_TRANSCRIPT
BLOCKER · RAW_CARRIER_FINGERPRINT_TREATED_AS_HOST_GENERATION_TRUST
BLOCKER · BAD_PACKET_PARTIALLY_POPULATES_TRUSTED_SHADOW
BLOCKER · SHADOW_DISCREPANCY_TRIGGERS_AUTOMATIC_REPAIR
BLOCKER · SECOND_MODEL_OR_CLASSIFIER_ADDED_AS_SHADOW_JUDGE
BLOCKER · DORMANT_TURN_RUNS_SOURCE_SEMANTIC_WORK
BLOCKER · STRUCTURED_SHADOW_AUTOMATIC_CONTEXT_REENTRY
BLOCKER · STRUCTURED_SHADOW_PERSISTED_AS_SOURCE_HISTORY
BLOCKER · FORBIDDEN_SOURCE_SIDE_EFFECT_NONZERO
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

## 55. WATCH set

```text
WATCH · G2_TARGET_HOST_MODEL_COMPLIANCE_STILL_PENDING
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · SHADOW_PROMPT_MAY_CHANGE_LEGACY_VISIBLE_WORDING_WITHOUT_OWNERSHIP_CHANGE
WATCH · TARGET_HOST_CARRIER_STRIP_STORAGE_BEHAVIOR_REQUIRES_REAL_PROOF
WATCH · RUNTIME_RELOAD_BETWEEN_REQUEST_AND_OUTPUT_FAIL_CLOSED_NEEDS_EXECUTION_PROOF
WATCH · NATURAL_LIVE_TURN_WITHOUT_ORACLE_CANNOT_PROVE_ARBITRARY_SEMANTIC_CORRECTNESS
```

## 56. DEFER set

```text
DEFER · LEGACY_VS_STRUCTURED_SEMANTIC_EQUIVALENCE_SCORER
DEFER · SECOND_MODEL_SHADOW_JUDGE
DEFER · MODEL_RETRY_ON_SHADOW_FAILURE
DEFER · STRUCTURED_PRESENTATION_MOUNT
DEFER · SEMANTIC_PRIMARY_CUTOVER
DEFER · LEGACY_COMPATIBILITY_SERIALIZER
DEFER · LEGACY_CONTEXT_RETIREMENT
DEFER · BOARD_SHADOW
DEFER · NEWS_SHADOW
DEFER · PERSISTENT_SOURCE_OBJECTS
DEFER · CANDIDATE_C
```

## 57. Future implementation transaction boundary

If runtime implementation is separately authorized after applicable preconditions, the LC1 transaction may own only:

```text
LRE-2 SourceJobSelector
conditional producer contract
TransientSourceTransport
SourceDraftAssembler
ExposurePolicyContextBuilder
3M-3 validator integration
LRE-2 cleanContent fingerprint FIX
LRE-3 cap enforcement
LRE-3 SourceTurnEvidence integration
LRE-4 StructuredShadowCoordinator
release-scoped stage = SHADOW
```

It must not simultaneously own:

```text
LRE-5 semantic-primary cutover
legacy Community serializer/cutover
structured DOM presentation
legacy context retirement
BOARD/NEWS activation
persistent Source history
repo/release-system restructuring
```

## 58. Static acceptance direction

A future LC1 implementation candidate must statically prove at least:

```text
latest.js == install.js
semantic authority stage enum closed
SHADOW family registry admits only LIVE_REACTION first slice
DORMANT has zero Source producer contract bytes
no auxiliary model call
no network dependency
no Source persistence/re-entry
carrier extracted before Output Compat
cleanContent fingerprint boundary present
raw carrier fingerprint not trusted
LIVE_REACTION_CAP_PROFILE_V1 constants present once
SourceTurnEvidence bounded/no semantic bodies
legacy production owner not switched at SHADOW
```

## 59. Completion criterion

LRE-4 design is complete when these are frozen:

```text
LC1 transaction semantics
StructuredShadowCoordinatorV1 ownership
single-turn lifetime
shadow status taxonomy
transport / cap / authority / policy result mapping
legacy production preservation semantics
no legacy semantic back-parsing
G8 shadow mapping
carrier contamination blocker
G2 hold / activation preconditions
deterministic fixture matrix
target-host evidence lanes
LRE-5 evidence handoff
```

All are frozen by this document.

## 60. Handoff to LRE-5

Next checkpoint:

```text
LRE-5
Structured Semantic-Owner Cutover + Optional Legacy Bridge
```

LRE-5 must answer:

```text
When can structured validated LIVE_REACTION become the sole semantic owner for new migrated turns?
Does any concrete compatibility consumer still require legacy <COMMUNITY> representation?
If yes, can it be derived only from validated structured semantics?
How does LC2 fail closed when structured semantics are unavailable?
How is independent model-generated legacy semantic authority removed without breaking old-chat read compatibility?
```

LRE-5 must not assume LC1 runtime PASS merely because LRE-4 design is frozen.

## 61. Final freeze

```text
LRE_4_DESIGN                         = FROZEN
MIGRATION_STATE                      = LC1 STRUCTURED_SHADOW CONTRACT FROZEN
FIRST_FAMILY                         = LIVE_REACTION
FIRST_SCOPE                          = DIRECT_B_ROOT_MODE_C
NEW_OWNER                            = StructuredShadowCoordinatorV1
LEGACY_PRODUCTION_SEMANTIC_OWNER     = UNCHANGED
LEGACY_PRESENTATION                  = UNCHANGED
STRUCTURED_SHADOW_SEMANTIC_AUTHORITY = EVALUATION_ONLY
STRUCTURED_PRESENTATION              = NONE
STRUCTURED_PERSISTENCE               = NONE
STRUCTURED_CONTEXT_REENTRY           = NONE
CANDIDATE_C                          = OFF
G2                                   = HOLD_TARGET_HOST_EVIDENCE_REQUIRED
G3/G4/G6/G8                          = DESIGN FROZEN / RUNTIME PROOF PENDING
G5                                   = NOT REQUIRED FOR LC1
CURRENT_RUNTIME_STAGE                = OFF
LC1_RUNTIME_ACTIVATION               = NOT AUTHORIZED
PRODUCTION                           = UNCHANGED
release-simcore                      = UNCHANGED
NEXT                                 = LRE-5 SEMANTIC-OWNER CUTOVER DESIGN
```
