# SimCore Post-3.0M LRE-4 Structured Shadow Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-4 IMPACT SCOPE FROZEN · DESIGN-ONLY · LIVE_REACTION DIRECT-B-ROOT SHADOW TRANSACTION ONLY · NO RUNTIME AUTHORITY · G2 STILL HOLD · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-4 · IMPACT SCOPE · STRUCTURED SHADOW**

## 0. Purpose

LRE-4 maps the minimum semantic/control surface needed to assemble one LC1 `STRUCTURED_SHADOW` transaction for the first supported LIVE_REACTION slice without changing production semantic ownership, legacy presentation, transcript behavior, persistence, or future model context.

This document is impact scope only. It does not implement runtime code, mutate prompts, add transport parsing, activate SHADOW, run target-host evidence, change release-simcore, or authorize deployment.

## 1. Current authority snapshot

At scope freeze:

```text
main = 3303d68d72de2ebb5d6111e9335d2573f18354e7
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

Production remains independently authoritative on `release-simcore`.

## 2. Consumed design authorities

```text
SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03
SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03
SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03
SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03
SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01
SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01
SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01
```

## 3. First shadow scope

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

All broader families/scopes remain out of LRE-4.

## 4. Primary impact decision

LRE-4 must not create a new semantic engine. It composes already-frozen owners into one request-local shadow transaction.

Required flow:

```text
current request authority
→ SourceJobSelectorV1
→ conditional existing-main-model producer contract
→ TransientSourceTransportV1
→ SourceDraftAssemblerV1
→ ExposurePolicyContextBuilderV1
→ 3M-3 Validator
→ request-local ShadowTransactionResultV1
→ SourceTurnEvidenceV1 latest-turn observation
```

Legacy production path continues separately from carrier-free visible content.

## 5. Narrow owner surface

### Existing owners reused unchanged

```text
Lifecycle / current request facts
Lineage / Handoff / Evidence
Prompt/current source facts
Output Compat / Structure / Finalize
Representation / Edit Reconcile
3M-2 Exposure policy
3M-3 Validator
LRE-3 SourceTurnEvidence contract
```

### New LRE-4 conceptual owner

One narrow orchestration owner is sufficient:

```text
StructuredShadowCoordinatorV1
```

It owns transaction sequencing and result classification only.

It must not own source truth, exposure policy, validation policy, legacy parsing, persistent history, presentation, or model-context re-entry.

## 6. Shadow result is not semantic authority

Conceptual request-local result:

```text
ShadowTransactionResultV1
  status
  family
  projectionOrdinal
  transportStatus
  validatorSummary
  validatedAssertionCount
  reasonCode
```

It contains no assertion bodies, supportQuote bodies, raw packet JSON, Community prose, Knowledge prose, or canonical-world facts.

Canonical law:

```text
SHADOW RESULT
!=
PRODUCTION SEMANTIC AUTHORITY
```

## 7. Legacy production remains authoritative at LC1

For LC1:

```text
S = legacy native production semantic owner
P = legacy Community presentation
H = legacy transcript behavior
R = legacy read/write compatibility
```

The structured path may succeed, deny, hold, or fail without changing those axes.

## 8. No legacy prose semantic back-parsing

LRE-4 must not compare shadow semantics by parsing legacy `<COMMUNITY>` prose back into trusted assertions.

Forbidden:

```text
legacy Community prose
→ parser / model / regex
→ structured semantic object
→ compare against shadow
```

Reason:

```text
RAW LEGACY PROSE
!=
TRUSTED STRUCTURED AUTHORITY
```

Legacy compatibility evidence is about preservation/ownership and target-host behavior, not semantic promotion of old prose.

## 9. What shadow evidence may compare

Permitted comparison domains:

```text
structured source authority binding
structured exposure-policy disposition
structured validator disposition
cap compliance
transport hygiene
DORMANT/ACTIVE selector correctness
legacy visible/stored path preservation
no persistence/re-entry/network/extra-model/background work
```

Not required:

```text
legacy wording == structured wording
legacy reaction count == structured assertion count
legacy Community semantics parsed into an oracle
```

## 10. Shadow transaction states

The detailed design should distinguish at least:

```text
NOT_RUN_STAGE_OFF
NOT_RUN_DORMANT
NOT_RUN_UNSUPPORTED
NOT_RUN_BLOCKED_CAPABILITY
SHADOW_AVAILABLE
SHADOW_EMPTY
SHADOW_UNAVAILABLE_TRANSPORT
SHADOW_UNAVAILABLE_AUTHORITY
SHADOW_QUARANTINED
SHADOW_CAP_BLOCKED
```

Exact spelling may be refined in the detailed design, but distinct failure domains must remain observable.

## 11. Transaction atomicity boundary

Bad packet structure must not partially populate trusted shadow semantics.

```text
bad packet / bad token / malformed carrier
→ no trusted proposal object
→ no validated sidecar from that packet
```

Policy DENY/HOLD remains assertion-local after a structurally valid packet.

## 12. Request-local lifetime

All LRE-4 semantic objects remain request/runtime-local:

```text
Source job
proposal packet
support proof
policy contexts
validated sidecar
shadow transaction result
```

No new persistent table, source history, shadow archive, or cross-turn identity is authorized.

## 13. G2 boundary

Current state remains:

```text
G2 = HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

Therefore:

```text
LRE-4 DESIGN MAY FREEZE LC1 SHADOW TRANSACTION
LRE-4 DESIGN MAY NOT AUTHORIZE RUNTIME SHADOW ACTIVATION
```

Combined Exposure + serialization/model-compliance evidence remains required before a deployed SHADOW lane can be treated as supported.

## 14. G3/G4/G6/G8 relationship

Design contracts are already frozen by LRE-2/LRE-3, but runtime proof is not.

LRE-4 detailed design must consume, not redefine:

```text
G3 selector contract
G4 producer/transport contract
G6 LIVE_REACTION_CAP_PROFILE_V1
G8 SourceTurnEvidenceV1
```

## 15. Legacy preservation surface

A future LC1 implementation must prove:

```text
carrier-free cleanContent enters existing output pipeline
legacy semantic owner remains unchanged
legacy Community path remains production path
carrier never enters canonical transcript
raw carrier fingerprint never becomes trusted host representation
structured sidecar never changes visible output at LC1
structured sidecar never changes future model context
```

## 16. DORMANT isolation

On ordinary source-irrelevant turns:

```text
StructuredShadowCoordinatorV1
→ terminates after bounded selector result
```

No transport parse, source-region scan, validator call, shadow result allocation requiring semantic data, or historical Source lookup is permitted.

## 17. Shadow discrepancy is evidence, not repair authority

If future target-host evidence shows:

```text
legacy visible behavior appears plausible
but structured validator DENY/HOLDs
```

or the inverse, LRE-4 does not repair either side automatically.

Disposition is evidence for migration readiness.

Forbidden:

```text
shadow disagrees
→ rewrite legacy output
→ downgrade assertion mode
→ run second model
→ choose whichever output looks better
```

## 18. Required future detailed-design evidence classes

The LRE-4 detailed design should define bounded evidence for:

```text
transaction entered / not entered
selector state
transport status
support-proof aggregate
validator ALLOW / DENY / HOLD counts
validated assertion count
cap failure class
legacy-path preserved yes/no
carrier contamination detected yes/no
structured persistence/re-entry counts = 0
network/extra-model/background counts = 0
```

No raw semantic text is needed in the default runtime evidence surface.

## 19. Candidate C

LRE-4 does not activate Candidate C.

Reason:

```text
request-local shadow object
no persistence
no cross-turn source identity
no derived-to-derived authority
no future re-entry
no item mutation
```

## 20. Presentation

G5 / structured presentation remains outside LRE-4.

LC1 requires no structured DOM/card mount.

Legacy Community remains the visible source representation.

## 21. Change surface

Future runtime implementation, if separately authorized after applicable gates, should be limited to the LRE-2 semantic-control seam plus one narrow coordinator/evidence integration.

It must not be mixed with:

```text
LRE-5 semantic-primary cutover
LRE-6 presentation mount
LRE-7 legacy-context retirement
BOARD/NEWS activation
repo/release-system redesign
persistent Source history
```

## 22. BLOCKER set

```text
BLOCKER · LEGACY_COMMUNITY_PROSE_PARSED_INTO_TRUSTED_SHADOW_SEMANTICS
BLOCKER · SHADOW_RESULT_MUTATES_PRODUCTION_SEMANTIC_OWNER
BLOCKER · SHADOW_RESULT_MUTATES_VISIBLE_OUTPUT
BLOCKER · SHADOW_RESULT_AUTOMATICALLY_REENTERS_MODEL_CONTEXT
BLOCKER · SHADOW_RESULT_OR_SIDECAR_PERSISTED_AS_SOURCE_HISTORY
BLOCKER · SHADOW_DISCREPANCY_TRIGGERS_AUTOMATIC_REPAIR_OR_SECOND_MODEL
BLOCKER · SHADOW_USES_PRESENTATION_MOUNT_TO_PROVE_SEMANTIC_VALIDITY
BLOCKER · G2_HOLD_BYPASSED_BY_REPOSITORY_ONLY_EVIDENCE
BLOCKER · BAD_PACKET_PARTIALLY_POPULATES_TRUSTED_SHADOW
BLOCKER · DORMANT_TURN_RUNS_SOURCE_SEMANTIC_WORK
```

## 23. WATCH / DEFER

```text
WATCH · G2_TARGET_HOST_MODEL_COMPLIANCE_PENDING
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · SHADOW_PROMPT_MAY_CHANGE_LEGACY_VISIBLE_WORDING_EVEN_WHILE OWNERSHIP IS UNCHANGED
WATCH · TARGET_HOST_CARRIER_STRIP_AND_STORAGE_BEHAVIOR_REQUIRES REAL PROOF

DEFER · LEGACY_VS_STRUCTURED_NATURAL_LANGUAGE_SEMANTIC_EQUIVALENCE_SCORER
DEFER · SECOND_MODEL_SHADOW_JUDGE
DEFER · STRUCTURED_PRESENTATION_MOUNT
DEFER · SEMANTIC_PRIMARY_CUTOVER
DEFER · LEGACY_CONTEXT_RETIREMENT
DEFER · BOARD / NEWS SHADOW
```

## 24. Detailed-design handoff

LRE-4 detailed design must freeze:

```text
StructuredShadowCoordinatorV1 sequencing
single-turn shadow result taxonomy
request-local lifetime / cleanup
LC1 production-preservation law
missing/malformed/cap/policy result mapping
G8 evidence mapping
shadow discrepancy handling
G2 hold / activation preconditions
static + deterministic fixture matrix
future target-host shadow evidence packet
handoff criteria to LRE-5
```

## 25. Final scope

```text
LRE_4_IMPACT_SCOPE = FROZEN
FIRST_FAMILY = LIVE_REACTION
FIRST_SCOPE = DIRECT_B_ROOT_MODE_C
NEW_OWNER = STRUCTURED_SHADOW_COORDINATOR_ONLY
LEGACY_SEMANTIC_OWNER = UNCHANGED
LEGACY_PRESENTATION = UNCHANGED
STRUCTURED_PRESENTATION = NONE
STRUCTURED_PERSISTENCE = NONE
STRUCTURED_REENTRY = NONE
CANDIDATE_C = OFF
G2 = HOLD
RUNTIME_ACTIVATION = NOT_AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```
