# SimCore Post-3.0M LRE-2 Semantic-Control Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · DIRECT B-ROOT LIVE_REACTION FIRST SLICE · SOURCE-JOB / PRODUCER / TRANSIENT TRANSPORT / EXPOSURE POLICY-CONTEXT BOUNDARIES MAPPED · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-2 · IMPACT SCOPE**

## 0. Purpose

LRE-2 is the semantic-control checkpoint after LRE-1 host coupling.

This impact scope answers only:

```text
Which existing owners decide whether a current request is source-eligible?
Which new narrow owners are actually required for runtime structured shadow?
Where may the main model produce structured semantic proposal bytes?
Where must those bytes be removed before stored assistant transcript?
Who constructs trusted Exposure policy context?
Who remains final semantic acceptance/quarantine authority?
Which existing output/representation owners must remain unaware of the sidecar?
```

It does not implement any runtime behavior.

## 1. Authority chain

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

Production runtime authority remains `release-simcore`.

## 2. Fresh authority snapshot

At this transaction:

```text
main = c1667f7006dd04900b7ab2422fd8566cbf5c4e8e
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production version = v0.70.1
```

Production `latest.js` and `install.js` remain byte-identical at the already-qualified production blob.

No runtime file is changed by this scope.

## 3. Current host/runtime facts that constrain LRE-2

LRE-1 froze:

```text
beforeRequest = request mutation phase
editoutput = stored assistant output phase
chat output listener = committed message identity observation
editdisplay = presentation-only phase
```

The current production `CoreRulesetSession.processOutput(...)` performs:

```text
raw handler content
→ outputCompat.prepareOutput(...)
→ Structure validation
→ Output Finalize
→ result.content
→ state/output fingerprint commit
```

Therefore any structured transport that must not enter transcript must be consumed **before** existing visible-output preparation/validation/finalization.

Canonical boundary:

```text
STRUCTURED TRANSPORT EXTRACTION
→ clean visible content
→ existing output pipeline
```

not:

```text
existing output pipeline
→ hidden structured bytes remain in result.content
```

## 4. Existing semantic owners that remain authoritative

LRE-2 does not create replacement owners for current request/source identity.

Existing prepared facts remain owned by the current stack:

```text
Lifecycle
Lineage
Source Handoff
Evidence
Prompt prepared facts
```

The deployed direct-B-root short-C path already exposes the narrow entry facts:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
communitySourceHandoffRootIndex >= 0
communitySourceHandoffParentIndex >= 0
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
```

LRE-2 must consume these facts. It must not re-scan history or parse old Community merely to rediscover them.

## 5. First supported semantic-control scope

The first LRE-2 scope remains exactly the 3M-3 first slice:

```text
family = LIVE_REACTION
mode = C
source = direct B root
source authority = HANDOFF_EVIDENCE
projection ordinal = 0
```

Out of scope:

```text
A-root
INLINE_C root
multi-B parent/root mismatch
depth != 1
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
multi-family fanout
interactive/durable source mutation
```

## 6. New owner inventory

The impact map finds exactly three new runtime semantic-control responsibilities that are not already owned.

### A. `SourceJobSelector`

Responsibility:

```text
current prepared request facts
+ release capability posture
→ DORMANT / UNSUPPORTED / BLOCKED / ACTIVE
```

It does not produce semantics.

### B. `TransientSourceTransport`

Responsibility:

```text
bounded main-model transient carrier
→ extract packet
→ remove carrier bytes before normal output pipeline
→ produce clean visible content + untrusted proposal packet + transport receipt
```

It does not accept semantic truth.

### C. `ExposurePolicyContextBuilder`

Responsibility:

```text
trusted current source authority
+ structurally classified current-source support region availability
+ untrusted bounded producer support hint
→ trusted 3M-2 SourceAssertionPolicyContextV1
```

It does not decide final ALLOW/DENY/HOLD.

Final acceptance remains 3M-3 Validator authority.

## 7. Owner flow

Preferred minimum flow:

```text
CURRENT REQUEST
  ↓
Lifecycle / Lineage / Handoff / Evidence
  ↓
SourceJobSelector
  ↓
ACTIVE only for supported current scope
  ↓
Main model, existing call only
  ↓
ordinary visible legacy output + transient structured proposal carrier
  ↓
TransientSourceTransport
  ├─ clean visible output
  └─ untrusted structured proposal
        ↓
Source draft assembler
  + trusted current SourceAuthorityContext
        ↓
ExposurePolicyContextBuilder
        ↓
3M-3 Validator
  ├─ validated current sidecar
  └─ bounded receipt/quarantine

clean visible output
  ↓
existing outputCompat → Structure → Output Finalize
```

The two paths join only through current request/source identity and bounded receipts.

## 8. Main-model role

The main model remains the natural-language semantic proposal generator.

First runtime-enabling topology must use:

```text
existing main model call = 1
auxiliary source model calls = 0
```

The model may propose:

```text
assertion ordinal
assertion mode
assertion content
one bounded support-basis hint
```

The model may not declare:

```text
public fact authority
ALLOW/DENY/HOLD
validation success
canonical truth
safe-to-render
source-authority ownership
```

## 9. Why the 3M-3 draft should not be emitted verbatim by the model

3M-3 `SourceSemanticSidecarDraftV1` includes trusted-source reference fields.

Making the model redundantly echo every trusted index/fingerprint would:

```text
increase prompt/output bytes
increase malformed-draft rate
encourage authority-looking model fields
```

Preferred boundary for later detailed design:

```text
model emits semantic proposal packet
SimCore assembler attaches family/projection/sourceAuthorityRef from existing trusted owners
3M-3 Validator still verifies the assembled authority join
```

This is construction from trusted owners, not repair of a spoofed model authority field.

## 10. Transient transport candidate

The narrowest feasible current-host transport candidate is:

```text
TRANSIENT_TAIL_CARRIER_V1
```

Properties:

```text
same main-model response
strictly tail-positioned
one reserved carrier maximum
bounded packet
consumed by SimCore output handler before outputCompat
carrier bytes absent from result.content
carrier bytes absent from stored assistant transcript
no second model call
no provider-specific structured-output dependency
```

This is a candidate selected for detailed LRE-2 design, not runtime authorization.

## 11. Why a transient carrier is different from forbidden hidden transcript metadata

Forbidden:

```text
model output contains JSON/tag
→ SimCore returns it in result.content
→ host stores it
→ UI merely hides it
```

Candidate:

```text
model output contains reserved transient tail
→ SimCore consumes it before visible-output preparation
→ only clean visible output enters current stored-output pipeline
```

Canonical distinction:

```text
TRANSIENT RESPONSE BYTES
!=
STORED ASSISTANT BYTES
```

LRE-1 host evidence makes this path structurally plausible, but future implementation must prove it on target host.

## 12. Transport packet boundary

The transport packet is not the validated sidecar.

Conceptual wrapper:

```text
SourceDraftTransportPacketV1
  transportVersion
  currentJobToken
  proposals[]
```

Each proposal is conceptually:

```text
ordinal
mode
content
supportBasisHint
```

The wrapper is entirely untrusted.

## 13. Current-job binding

A transport packet must bind to the current source job.

Required conceptual input to a future short token:

```text
family
projection ordinal
current send/user identity
trusted source indices/fingerprints
runtime generation
```

The model echoes the token.

Rule:

```text
JOB TOKEN MATCH
= correlation proof only
!= semantic authority
!= security authentication
!= persistent source identity
```

No Candidate C identity is introduced.

## 14. Exposure policy-context problem

3M-3 deliberately deferred the runtime producer for `SourceAssertionPolicyContextV1`.

LRE-2 therefore must not pretend that arbitrary prose can be semantically classified by a generic regex/classifier.

The first runtime profile should consume only **structurally grounded support classes**.

## 15. First support-basis candidate vocabulary

Recommended detailed-design subset:

```text
CURRENT_BROADCAST_FACT
SOURCE_COMMUNITY_ATTRIBUTED
VISIBLE_BROADCAST_CUE
SOURCE_KNOWLEDGE_CONTEXT
UNKNOWN
```

These are producer hints, not policy decisions.

The builder may map them only after confirming the corresponding current source region actually exists under the trusted direct-B-root source message.

Conceptual mapping:

```text
CURRENT_BROADCAST_FACT
→ broadcastExposed = true

SOURCE_COMMUNITY_ATTRIBUTED
→ sourceCommunityContext = true

VISIBLE_BROADCAST_CUE
→ visibleCueExposed = true

SOURCE_KNOWLEDGE_CONTEXT
→ sourceKnowledgeContext = true

UNKNOWN
→ no positive signal
```

All other 3M-2 signals default to false/unsupported for this first runtime profile unless separately proven.

## 16. Conservative omission of current-user disclosure classification

The abstract 3M-2 policy allows:

```text
currentUserExplicitPublicDisclosure = true
→ confirmed fact may be ALLOW
```

But distinguishing explicit public disclosure from mere mention is semantic classification.

First LRE-2 runtime profile should therefore **not** manufacture that positive signal from the current user text.

Disposition:

```text
DEFER · CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE_RUNTIME_CLASSIFIER
```

This narrows runtime capability without changing the abstract 3M-2 policy contract.

## 17. Semantic entailment remains model-compliance evidence

Even when a producer declares `CURRENT_BROADCAST_FACT` and the referenced current source contains a visible broadcast region:

```text
STRUCTURAL SUPPORT CLASS EXISTS
!=
ASSERTION CONTENT SEMANTICALLY FOLLOWS FROM THAT REGION
```

This is not a reason to add a second semantic classifier.

It remains part of G2 target-host/model-compliance evidence.

## 18. SourceJobSelector outcomes

Detailed design should preserve four distinct outcomes:

```text
DORMANT
UNSUPPORTED
BLOCKED_CAPABILITY
ACTIVE
```

### DORMANT

Ordinary non-source request. No source contract bytes and no source output parsing beyond an unavoidable reserved-marker safety check if implemented.

### UNSUPPORTED

Structurally source-like shape outside the first scope, such as multi-B/depth expansion.

### BLOCKED_CAPABILITY

The first-scope request shape matches, but required release evidence/capability gates such as G2 are not enabled.

### ACTIVE

Only after all applicable release capability gates are explicitly satisfied.

Current repository status remains:

```text
G2 target-host/model evidence = pending
```

so no active runtime path is authorized now.

## 19. Stage-dependent missing/malformed behavior

LRE-2 must separate LC1 shadow behavior from later LC2 semantic-primary behavior.

### LC1 structured shadow

```text
missing/malformed/invalid structured packet
→ structured shadow unavailable/quarantined
→ legacy visible behavior unchanged
→ no semantic authority transfer
```

### LC2 structured semantic primary

```text
missing/malformed/invalid structured packet
→ no valid structured source semantics for that request
→ no silent fallback to independent model-generated legacy Community authority
```

Any compatibility representation at LC2 must derive only from validated structured semantics.

## 20. Existing output owners remain clean-content owners

The following current owners should consume only carrier-free visible content:

```text
Output Compat
Structure
Output Finalize
Representation / Edit Reconcile
host transcript
```

They should not learn Source transport grammar merely to tolerate it.

This minimizes cross-boundary mutation.

## 21. Candidate future insertion seam

Current production `processOutput(...)` begins the semantic output path with:

```text
outputCompat.prepareOutput(content, base.pending)
```

Therefore the narrowest future semantic-control seam is conceptually:

```text
raw content
→ sourceTransport.extract(...)
→ cleanContent
→ outputCompat.prepareOutput(cleanContent, base.pending)
```

No implementation is authorized here.

## 22. Source context reconstruction / history boundary

The Source path must not scan whole chat history on every output.

Preferred inputs are:

```text
already-prepared pending Handoff/Evidence facts
+ at most exact current root/source/current-user message reads required to classify structural support regions
```

If an implementation cannot reconstruct the required current source context after runtime reload without broad history scanning or new persistent Source state, it must fail closed or receive a separate persistence/recovery design.

## 23. Persistence boundary

For Tier A / first-major read-only Source:

```text
new persistent Source DB = 0
new source history = 0
new assertion ledger = 0
new context re-entry = 0
```

A transient job token, draft packet, policy context, validated sidecar, and receipt are request/current-projection data only.

## 24. Prompt boundary

LRE-2 detailed design may freeze bounded producer-contract bytes, but this impact-scope transaction changes no Prompt.

Any future active producer contract must be:

```text
conditional on ACTIVE source job
volatile/current-turn only
bounded
absent on DORMANT ordinary turns
```

It must not cause unconditional Source prompt growth.

## 25. Protected non-impact boundaries

This checkpoint must not alter:

```text
DOM/CSS/presentation mount
LRE-1 G5 identity problem
host-history retirement
old-chat parser behavior
persistent Core schema
SnapshotStore keys
network calls
auxiliary model calls
background workers/timers
BOARD/NEWS activation
Candidate C durability
S7/v0.70.3
release-simcore
```

## 26. Candidate change surface for future implementation

Narrowest likely implementation surface:

```text
request/runtime prompt compiler
new pure source-job selector module
new pure transient transport parser/stripper
new pure policy-context builder
3M-3 validator integration seam
CoreRulesetSession.processOutput pre-outputCompat seam
bounded telemetry in LRE-3
```

Avoid changes to:

```text
Lineage owner
Handoff owner
Evidence owner
Structure grammar
Community parser semantics
Presentation renderer
state persistence
```

unless later source evidence proves a missing contract.

## 27. Cross-boundary contracts to validate later

```text
prepared Handoff/Evidence → SourceJobSelector
SourceJobSelector → conditional producer prompt
model proposal → transient transport parser
transport parser → Source draft assembler
support hint + trusted region availability → policy context builder
assembled draft + policy contexts → 3M-3 Validator
clean visible content → existing output pipeline
validated sidecar → later LRE-4 shadow receipt only
```

Each edge requires its own fixtures. File-level syntax alone is insufficient.

## 28. Main risks

```text
BLOCKER · SOURCE_JOB_SELECTOR_READS_LEGACY_COMMUNITY_HISTORY_AS_ACTIVATION
BLOCKER · TRANSIENT_CARRIER_SURVIVES_IN_STORED_RESULT_CONTENT
BLOCKER · MODEL_SUPPORT_HINT_TREATED_AS_TRUSTED_POLICY_RESULT
BLOCKER · GENERIC_PROSE_CLASSIFIER_INVENTED_TO_CLOSE_EXPOSURE
BLOCKER · CURRENT_USER_MENTION_PROMOTED_TO_PUBLIC_DISCLOSURE
BLOCKER · SOURCE_TRANSPORT_PARSED_AFTER_STRUCTURE/FINALIZE
BLOCKER · MALFORMED_SHADOW_PACKET_CHANGES_LEGACY_VISIBLE_OUTPUT
BLOCKER · LC2_VALIDATION_FAILURE_FALLS_BACK_TO_INDEPENDENT_LEGACY_SEMANTIC_OWNER
BLOCKER · SECOND_MODEL_CALL_ADDED_FOR_SOURCE_DRAFT
BLOCKER · DORMANT_TURNS_RECEIVE_UNCONDITIONAL_SOURCE_PROMPT_BYTES
BLOCKER · SOURCE_PATH_SCANS_FULL_HISTORY_PER_OUTPUT
```

## 29. WATCH / DEFER

```text
WATCH · G2_TARGET_HOST_MODEL_COMPLIANCE_STILL_PENDING
WATCH · TRANSIENT_TAIL_STRIP_MUST_BE_PROVEN_ON_THEN_CURRENT_HOST
WATCH · RUNTIME_RELOAD_BETWEEN_REQUEST_AND_OUTPUT_NEEDS_FAIL_CLOSED_PROOF
WATCH · CANONICAL_DOC_PROMOTION_CONTROL_PLANE_CLASSIFICATION_DRIFT

DEFER · CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE_RUNTIME_CLASSIFIER
DEFER · REFERENCE_CONTEXT_RUNTIME_SUPPORT
DEFER · OUTSIDE_ROOT_HISTORY_POLICY_SUPPORT
DEFER · MULTI_B_SOURCE_WINDOW
DEFER · PERSISTENT_SOURCE_JOB_CONTEXT
DEFER · PROVIDER_STRUCTURED_OUTPUT
DEFER · AUXILIARY_SOURCE_MODEL
DEFER · PRESENTATION_MOUNT
DEFER · HISTORICAL_SOURCE_REPLAY
```

The canonical documentation promotion WATCH is already recorded separately and is not a SimCore semantic blocker.

## 30. Impact-scope conclusion

```text
LRE2_IMPACT_SCOPE                         = FROZEN
FIRST_FAMILY                              = LIVE_REACTION
FIRST_SCOPE                               = DIRECT_B_ROOT_MODE_C
CURRENT_AUTHORITY_OWNERS                  = REUSE LIFECYCLE/LINEAGE/HANDOFF/EVIDENCE
NEW_SELECTOR_OWNER                        = REQUIRED / NARROW
NEW_TRANSIENT_TRANSPORT_OWNER             = REQUIRED / NARROW
NEW_POLICY_CONTEXT_BUILDER                = REQUIRED / NARROW
MAIN_MODEL                                = EXISTING CALL / SEMANTIC PROPOSAL ONLY
AUXILIARY_MODEL                           = NONE
PREFERRED_TRANSPORT_CANDIDATE             = TRANSIENT_TAIL_CARRIER_V1
TRANSPORT_STORAGE                         = FORBIDDEN
VALIDATOR                                 = 3M-3 FINAL ACCEPTANCE OWNER
CURRENT_USER_PUBLIC_DISCLOSURE_CLASSIFIER = DEFER
PERSISTENCE                               = NONE
CONTEXT_REENTRY                           = NONE
DOM_CSS                                   = NONE
PRODUCTION                                = UNCHANGED
NEXT                                      = LRE-2 DETAILED SEMANTIC-CONTROL DESIGN
```
