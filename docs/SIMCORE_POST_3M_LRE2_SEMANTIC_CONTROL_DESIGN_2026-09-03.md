# SimCore Post-3.0M LRE-2 Semantic-Control Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-2 DESIGN FROZEN · DESIGN-ONLY · DIRECT-B-ROOT LIVE_REACTION FIRST SLICE · SELECTOR / MAIN-MODEL PROPOSAL / TRANSIENT PRE-TRANSCRIPT TRANSPORT / EXPOSURE SUPPORT-PROOF BUILDER / 3M-3 VALIDATOR FLOW FROZEN · G2 STILL PENDING · G3/G4 DESIGN FROZEN BUT RUNTIME PROOF PENDING · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-2 · SEMANTIC CONTROL · DETAILED DESIGN**

## 0. Purpose

LRE-2 freezes the semantic-control contracts required before the first structured LIVE_REACTION shadow can exist in runtime.

It answers:

```text
Who decides whether the current request has a Source job?

Which model call may produce the structured semantic proposal?

How can that proposal cross the host response boundary without becoming stored assistant transcript?

How is a model support hint converted into a bounded trusted Exposure policy input without trusting the hint itself?

Who assembles trusted Source authority into the 3M-3 draft?

Who owns final ALLOW / DENY / HOLD and validated-sidecar acceptance?

How do LC1 shadow and later LC2 semantic-primary differ on missing/malformed structured output?

How must the existing output/edit-reconcile fingerprint contract change if a transient carrier is ever activated?
```

This checkpoint does not implement or deploy the design.

It does not add Prompt bytes, a transport parser, Source state, DOM/CSS, a model call, host metadata, persistence, or a release change.

## 1. Authority chain

LRE-2 consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

It also respects the frozen post-3M current-projection, presentation, context-reentry, performance, and first-major convergence designs.

Production runtime authority remains `release-simcore`.

## 2. Design-time evidence snapshot

At the beginning of the LRE-2 design sequence:

```text
production branch = release-simcore
production commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production version = v0.70.1
production latest.js blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
production install.js blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
latest.js == install.js = YES
```

Main advanced during the docs-only design sequence because an unrelated PocketRisu documentation invariant was promoted.

That unrelated main advance changes no SimCore semantic conclusion.

Future implementation must re-run G1 against then-current production.

## 3. LRE-1 host facts inherited unchanged

LRE-1 froze:

```text
Phase Q = beforeRequest
Phase O = editoutput / stored assistant output
Phase I = committed chat output identity observer
Phase D = editdisplay / presentation-only transform candidate
```

Central inherited law:

```text
STORED OUTPUT
!=
DISPLAY OUTPUT
```

but:

```text
DISPLAY CALLBACK
!=
EXACT MESSAGE IDENTITY
```

LRE-2 therefore does not solve G5 presentation mounting.

It owns only semantic-control and transport up to validated current sidecar / shadow evidence.

## 4. Current production output pipeline inherited

The current production `CoreRulesetSession.processOutput(...)` begins its active output path as:

```text
raw handler content
→ outputCompat.prepareOutput(...)
→ Structure validation
→ Output Finalize
→ canonical result.content
→ output identity/state commit
```

LRE-2 freezes that structured transport must be consumed **before** this existing visible-output pipeline.

Canonical future ordering:

```text
raw response
→ Source transient transport extraction
→ carrier-free visible content
→ existing output pipeline
```

## 5. First supported scope

The first LRE-2 semantic-control slice remains exactly:

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

Not supported by this design version:

```text
A-root source
INLINE_C root
multi-B source window
depth != 1
BOARD
SOCIAL_FEED
NEWS
PUBLIC_KNOWLEDGE
multi-family orchestration
interactive Source mutation
historical Source replay
```

## 6. Existing Source authority owners remain unchanged

LRE-2 reuses current authority from:

```text
Lifecycle
Lineage
Source Handoff
Evidence
current prepared Prompt facts
```

It does not create a parallel root/source resolver.

It does not parse historical `<COMMUNITY>` to discover a current Source job.

It does not search old cards or scan history for fuzzy matches.

Canonical rule:

```text
CURRENT PREPARED SOURCE AUTHORITY
→ SELECTOR INPUT
```

not:

```text
OLD REPRESENTATION
→ NEW SOURCE AUTHORITY
```

## 7. Semantic authority stage

LRE-2 freezes a release-scoped conceptual stage:

```text
SourceSemanticAuthorityStageV1

OFF
SHADOW
PRIMARY
```

This is a semantic-control configuration concept, not a new persistent user/session state field.

### `OFF`

```text
structured Source producer = disabled
structured transport expected = no
legacy production behavior = unchanged
```

### `SHADOW`

```text
structured proposal/transport/validation may execute
validated result = evaluation/shadow authority only
legacy production semantics/presentation = unchanged
```

### `PRIMARY`

```text
validated structured LIVE_REACTION
= sole semantic owner for migrated new source turns
```

Independent model-generated legacy Community may not remain a second semantic authority at PRIMARY.

### Current repository/runtime disposition

```text
configured runtime stage = OFF
runtime activation authority = NONE
```

LRE-4 may later authorize SHADOW after applicable gates.

LRE-5 owns any later PRIMARY semantic-owner cutover.

## 8. Stage is not per-request fallback state

Forbidden:

```text
PRIMARY request
→ structured validation fails
→ switch this one request back to independent legacy semantic authority
```

Stage changes occur at explicit release/config transaction boundaries.

Canonical rule:

```text
SEMANTIC OWNER
= RELEASE-SCOPED CONTROL DECISION
```

not an opportunistic per-request rescue mechanism.

## 9. `SourceJobSelectorV1`

LRE-2 freezes a pure selector owner.

Conceptual input:

```text
current pending/prepared request facts
current SourceSemanticAuthorityStageV1
current release capability posture
```

Conceptual output:

```text
SourceJobSelectionV1
  status
  family
  projectionOrdinal
  reasonCode
  sourceAuthorityClass
```

The selector does not produce semantic content.

It does not validate model output.

It does not inspect DOM or presentation state.

## 10. Selector statuses

Exactly four semantic-control statuses are frozen:

```text
DORMANT
UNSUPPORTED
BLOCKED_CAPABILITY
ACTIVE
```

### `DORMANT`

The current request is not a supported Source-job shape.

Expected Source work:

```text
producer contract bytes = 0
structured packet expected = no
Source history scan = 0
Source network/model extras = 0
```

### `UNSUPPORTED`

The request is structurally source-like but outside the first supported scope.

Examples:

```text
multi-B parent/root mismatch
depth != 1
unsupported source root/family
```

### `BLOCKED_CAPABILITY`

The first-scope request shape matches, but an applicable release gate is not enabled.

Current important example:

```text
G2 target-host / model-compliance evidence pending
```

### `ACTIVE`

All first-slice structural and release capability gates required for the current stage have been explicitly satisfied.

No ACTIVE runtime path is authorized by this design document.

## 11. Selector first-slice entry contract

A future first-slice ACTIVE candidate requires:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
communitySourceHandoffRootIndex >= 0
communitySourceHandoffParentIndex >= 0
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
source authority class == HANDOFF_EVIDENCE
```

This reuses already-prepared facts.

No history reconstruction is permitted merely to satisfy the selector.

## 12. Selector reason-code direction

The detailed design freezes the reason vocabulary class, while exact code spelling may remain implementation-local if semantics are preserved.

Required distinct reasons include:

```text
STAGE_OFF
MODE_NOT_C
SOURCE_HANDOFF_NOT_ELIGIBLE
ROOT_MODE_NOT_B
PARENT_MODE_NOT_B
INVALID_ROOT_INDEX
INVALID_PARENT_INDEX
MULTI_B_SOURCE_WINDOW_REQUIRED
DIRECT_B_ROOT_DEPTH_NOT_ONE
SOURCE_AUTHORITY_CLASS_UNSUPPORTED
G2_CAPABILITY_NOT_ENABLED
DIRECT_B_ROOT_ACTIVE
```

Do not collapse unsupported scope into ordinary DORMANT.

## 13. Selector complexity boundary

`SourceJobSelectorV1` must be:

```text
pure
bounded
O(1) over already-prepared current facts
no host I/O
no storage I/O
no network
no timers
no history scan
```

If an implementation needs history to decide Source activation, ownership has drifted and must be re-designed.

## 14. Main-model producer topology

The first runtime-enabling Source producer remains the existing main model call.

Frozen topology:

```text
main model calls per request = existing 1
new auxiliary Source model calls = 0
new post-generation classifier model calls = 0
```

The model remains the natural-language semantic proposal generator.

SimCore remains authority over:

```text
whether Source generation applies
which source authority is current
which structured contract is allowed
which exposure proof is accepted
which assertions survive validation
```

## 15. Producer authority boundary

The model may propose:

```text
assertion ordinal
assertion mode
assertion content
bounded support-basis hint
bounded support quote
current job token echo
```

The model may not authoritatively declare:

```text
ALLOW / DENY / HOLD
publicFact
isValid
canonicalTruth
safeToRender
validationState
consumerDisposition
source authority indices/fingerprints
current Source identity ownership
```

Canonical rule:

```text
MODEL PROPOSES SEMANTICS
!=
MODEL GRANTS AUTHORITY
```

## 16. Why the model does not emit the full 3M-3 authority reference

The 3M-3 conceptual draft includes trusted Source reference fields.

LRE-2 chooses not to ask the model to echo them.

Reason:

```text
trusted indices/fingerprints already exist in SimCore
model echo adds bytes
model echo adds malformed surface
model echo looks falsely authoritative
```

Instead:

```text
model proposal
+
trusted current authority context
→ SourceDraftAssembler
→ 3M-3 draft
```

This is trusted construction by the authority owner, not validator repair of a spoofed authority field.

## 17. Selected transport profile

LRE-2 selects the detailed-design transport profile:

```text
TRANSIENT_TAIL_CARRIER_V1
```

This selection is design authority only.

No runtime implementation is authorized.

## 18. Core transport law

The carrier exists only in the transient main-model response observed by the output handler.

Required lifecycle:

```text
model response
= visible assistant prefix
+ transient Source carrier

output handler
→ consumes carrier
→ obtains clean visible content
→ carrier bytes never enter canonical result.content
```

Canonical rule:

```text
TRANSIENT RESPONSE BYTES
!=
STORED ASSISTANT BYTES
```

## 19. Frozen carrier delimiters

The first design freezes reserved delimiters:

```text
<<<SIMCORE_SOURCE_DRAFT_V1>>>
{strict JSON packet}
<<<END_SIMCORE_SOURCE_DRAFT_V1>>>
```

The close delimiter must be the final non-whitespace transport content.

The carrier must begin on its own line after the visible assistant prefix.

No content is allowed after the close delimiter except whitespace.

These literals are protocol markers, not user-visible presentation tags.

## 20. Tail-only grammar

Valid carrier shape:

```text
VISIBLE OUTPUT BYTES
\n<<<SIMCORE_SOURCE_DRAFT_V1>>>
{...strict JSON...}
<<<END_SIMCORE_SOURCE_DRAFT_V1>>>
[whitespace only]
```

The transport parser must not search arbitrary nested locations and collect multiple packets.

Exactly one tail carrier is the maximum.

## 21. Why tail-only is selected

Tail-only placement minimizes ambiguity with:

```text
existing response envelope
Knowledge final placement
Community blocks
visible prose
output normalization
```

It also gives one deterministic strip boundary:

```text
visiblePrefixEnd
```

No general-purpose embedded-tag parser is required.

## 22. Carrier parsing status

A future transport receipt must distinguish at least:

```text
NOT_EXPECTED
MISSING
EXTRACTED
MALFORMED
OVERSIZE
TOKEN_MISMATCH
SCHEMA_INVALID
```

LRE-3 may add bounded instrumentation dimensions without changing these semantics.

## 23. `NOT_EXPECTED`

When the Source job is DORMANT/UNSUPPORTED/OFF:

```text
carrier expected = no
```

The Source semantic parser must not promote random marker-looking visible text into Source authority.

A later implementation may still use a bounded reserved-marker safety check to prevent accidental protocol leakage if Source producer bytes were incorrectly emitted.

Such safety handling must not create Source semantics on a DORMANT turn.

## 24. `MISSING`

When ACTIVE and no valid start delimiter exists:

```text
proposal packet = null
clean visible content = original raw response
```

Stage-specific semantic consequences are defined later in this document.

No retry model call is authorized.

## 25. Malformed protocol-zone safety

When ACTIVE and a reserved start delimiter is present, the bytes from the first reserved start delimiter through the raw response tail are the **protocol zone**.

If the protocol zone is malformed:

```text
proposal packet = null
transport status = MALFORMED / OVERSIZE / SCHEMA_INVALID as applicable
clean visible content = prefix before the reserved start delimiter
```

The malformed protocol zone must not be returned as ordinary stored assistant text.

Reason:

```text
transport failure
must not become transcript contamination
```

## 26. No hidden-transcript fallback

Forbidden:

```text
carrier parse failed
→ return raw response unchanged
→ host stores broken Source JSON/marker
```

Also forbidden:

```text
store carrier and hide it with CSS/display transform
```

The carrier is pre-transcript transport, not metadata embedded in transcript.

## 27. Packet schema

The model-facing transport packet is deliberately smaller than the trusted 3M-3 draft.

Frozen conceptual shape:

```text
SourceProposalPacketV1
  schemaVersion = 1
  jobToken
  assertions[]
```

Unknown fields are invalid.

## 28. Proposal assertion schema

Each packet assertion is:

```text
SourceAssertionProposalV1
  ordinal
  mode
  content
  supportBasis
  supportQuote
```

Unknown fields are invalid.

The packet may not carry arbitrary metadata bags.

## 29. Proposal `ordinal`

The ordinal is:

```text
bounded
unique within the packet
request-local only
not a persistent ID
not a reroll lineage ID
not Candidate C identity
```

It exists only to join:

```text
proposal assertion
↔ support proof
↔ 3M-3 policy context
↔ validator receipt
```

inside one current Source job.

## 30. Proposal `mode`

Allowed modes reuse 3M-2 / 3M-3 exactly:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

No new mode is introduced by LRE-2.

Mode is a model proposal, not a proof of claim type correctness.

## 31. Proposal `content`

`content` is:

```text
plain semantic text
untrusted
non-empty
bounded by future LRE-3 constants
not HTML
not a raw source body
```

Presentation escaping remains LRE-6 / Presentation Renderer ownership.

## 32. Support-basis vocabulary

The first runtime-capable design permits only:

```text
CURRENT_BROADCAST_FACT
SOURCE_COMMUNITY_ATTRIBUTED
VISIBLE_BROADCAST_CUE
SOURCE_KNOWLEDGE_CONTEXT
UNKNOWN
```

These are **support hints** from the producer.

They are not policy verdicts.

## 33. Support quote

For every support basis except `UNKNOWN`:

```text
supportQuote = required non-empty bounded exact source substring candidate
```

For `UNKNOWN`:

```text
supportQuote = empty
```

The quote is transport-only proof material.

It is not persisted in validated Source sidecar or long-term state.

It should not be duplicated into normal validation receipts beyond bounded length/hash evidence later authorized by LRE-3.

## 34. Why basis-only hints are insufficient

Forbidden trust flow:

```text
model says CURRENT_BROADCAST_FACT
→ set broadcastExposed = true
```

The model could simply relabel a hidden private assertion.

Therefore:

```text
SUPPORT BASIS HINT
+ CURRENT TRUSTED SOURCE REGION
+ EXACT SUPPORT QUOTE MEMBERSHIP
→ MAY PRODUCE ONE POLICY-BASIS SIGNAL
```

The hint alone produces no positive authority.

## 35. Current-job token

Each ACTIVE current Source job receives one transient correlation token.

Conceptual token input includes:

```text
transport version
family
projection ordinal
semantic authority stage
current send/user identity
trusted root/source indices and fingerprints
current runtime generation
```

The exact serialization/hash primitive is implementation-preflight detail and should reuse an existing deterministic fingerprint owner where safe.

## 36. Job token authority boundary

The model echoes the token.

A token match proves only:

```text
packet claims to belong to the current prepared job
```

It does not prove:

```text
claim truth
public exposure
security authenticity
persistent source identity
reroll lineage authority
```

Canonical rule:

```text
JOB TOKEN MATCH
= CORRELATION
!= AUTHORITY UPGRADE
```

## 37. Token mismatch

If a packet is otherwise parseable but token mismatches current job:

```text
transport status = TOKEN_MISMATCH
proposal packet = unusable
validated sidecar = none from that packet
```

The packet must not be rebound to the nearest matching historical request.

No fuzzy token recovery.

## 38. `SourceDraftAssemblerV1`

LRE-2 freezes a narrow assembler responsibility.

Input:

```text
validated transport packet shape
current SourceJobSelectionV1
current trusted SourceAuthorityContextV1
```

Output:

```text
3M-3 SourceSemanticSidecarDraftV1
```

The assembler supplies trusted fields:

```text
schemaVersion
family = LIVE_REACTION
projectionOrdinal = 0
sourceAuthorityRef from current trusted owners
```

and copies only model proposal:

```text
ordinal
mode
content
```

Support basis/quote do not enter the semantic assertion object.

They go to policy-context proof construction.

## 39. Assembler is not validator repair

The model never supplied the trusted authority fields, so attaching current owner data is not repair of a spoofed field.

If the packet contains forbidden authority-like fields, strict packet validation fails.

Canonical rule:

```text
TRUSTED OWNER CONSTRUCTION
!=
MODEL FIELD REPAIR
```

## 40. Trusted source-region availability

Exposure proof requires a current source representation whose identity still matches current trusted authority.

Before any positive support signal is constructed:

```text
current source/root message identity
must match Handoff/Evidence fingerprints/indices
```

If support identity is stale:

```text
positive support proof = none
```

No search for a replacement historical message is allowed.

## 41. Structural support regions

For the direct-B-root source message, LRE-2 recognizes conceptual regions:

```text
BROADCAST_VISIBLE
SOURCE_COMMUNITY
SOURCE_KNOWLEDGE
```

These regions must be derived through existing structural/representation ownership or an explicitly bounded adapter over those existing grammars.

LRE-2 does not authorize a generic semantic prose classifier.

## 42. Region semantics

### `BROADCAST_VISIBLE`

Audience-visible broadcast/event prose for the current direct B root.

### `SOURCE_COMMUNITY`

Existing legacy Community region from the trusted source message.

This is derived social context, not event-fact/public-knowledge authority.

### `SOURCE_KNOWLEDGE`

Existing Knowledge continuity/private-context region from the trusted source message.

This is not public exposure authority.

## 43. Exact support-quote membership

A positive structural support proof requires the bounded `supportQuote` to occur in the claimed current trusted region after only minimal deterministic newline normalization.

Forbidden matching:

```text
semantic similarity
embedding search
fuzzy edit distance
case-insensitive paraphrase matching
cross-region concatenation
whole-chat search
```

Canonical first rule:

```text
EXACT REGION MEMBERSHIP
```

## 44. `ExposurePolicyContextBuilderV1`

The builder consumes:

```text
current trusted Source authority
current trusted structural support regions
one assertion supportBasis hint
one assertion supportQuote
```

and produces one bounded 3M-2 `SourceAssertionPolicyContextV1`.

The builder does not decide ALLOW/DENY/HOLD.

## 45. Positive-signal construction

Only a proven region match may create the following signal:

```text
CURRENT_BROADCAST_FACT
+ exact quote in BROADCAST_VISIBLE
→ broadcastExposed = true

SOURCE_COMMUNITY_ATTRIBUTED
+ exact quote in SOURCE_COMMUNITY
→ sourceCommunityContext = true

VISIBLE_BROADCAST_CUE
+ exact quote in BROADCAST_VISIBLE
→ visibleCueExposed = true

SOURCE_KNOWLEDGE_CONTEXT
+ exact quote in SOURCE_KNOWLEDGE
→ sourceKnowledgeContext = true
```

`UNKNOWN` creates no positive signal.

## 46. One proof class does not imply another

The builder must not infer:

```text
broadcastExposed
→ visibleCueExposed automatically
```

or:

```text
SOURCE_COMMUNITY quote
→ public fact exposure
```

or:

```text
SOURCE_KNOWLEDGE quote
→ confirmed fact eligibility
```

Each signal is claim-specific support evidence for the proposed assertion and mode.

## 47. First runtime policy-context omissions

The first LRE-2 runtime profile does not positively produce:

```text
currentUserExplicitPublicDisclosure
currentUserMentionOnly
outsideRootHistoryOnly
referenceContext
```

They remain false/unproven for the first runtime-capable subset.

This is a capability narrowing, not a change to the abstract 3M-2 policy.

## 48. Current-user disclosure classifier is deferred

Distinguishing:

```text
explicit public disclosure
vs
mere mention
```

is semantic classification.

LRE-2 refuses to add a lexical/regex classifier merely to widen confirmed-fact ALLOW.

Disposition:

```text
DEFER · CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE_RUNTIME_CLASSIFIER
```

A confirmed fact relying only on this unimplemented route fails closed under current proven inputs.

## 49. Builder proof failure

If:

```text
support region missing
support quote not found
source fingerprint stale
support basis unsupported
```

then the builder does **not** rewrite the proposal and does not invent another basis.

For that assertion:

```text
positive policy signals = none
```

with a bounded builder proof status.

The downstream 3M-2 function then mechanically yields the conservative DENY/HOLD result appropriate to the proposed mode.

## 50. Suggested builder proof statuses

A future bounded receipt must distinguish at least:

```text
MATCH
UNKNOWN_BASIS
UNSUPPORTED_BASIS
SOURCE_STALE
REGION_MISSING
QUOTE_MISMATCH
```

Exact telemetry field names belong to LRE-3.

## 51. Structural support is not semantic entailment

Even when:

```text
supportBasis = CURRENT_BROADCAST_FACT
supportQuote exists exactly in BROADCAST_VISIBLE
```

SimCore has not mechanically proven that the assertion content semantically follows from that quote.

Frozen law:

```text
STRUCTURAL SUPPORT ANCHOR PASS
!=
SEMANTIC ENTAILMENT PASS
```

This is a model-compliance evidence boundary.

## 52. Support-anchor laundering threat

Adversarial example:

```text
visible broadcast contains an unrelated public sentence
private Knowledge contains the hidden fact
model asserts the hidden fact as CONFIRMED_FACT
model cites the unrelated visible sentence as CURRENT_BROADCAST_FACT
```

The structural anchor would exist, but semantic entailment would be false.

Therefore:

```text
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
```

## 53. No second semantic judge

LRE-2 does not solve the entailment WATCH by adding:

```text
second model call
embedding classifier
keyword classifier
post-output semantic fact checker
```

The intended proof route is G2 target-host/model-compliance evaluation with adversarial fixtures.

## 54. Required future G2 laundering fixtures

Before structured shadow activation, combined-contract evaluation should include at least:

```text
SUPPORT_ANCHOR_LAUNDERING
MODE_LAUNDERING
PRIVATE_FACT_WITH_UNRELATED_PUBLIC_QUOTE
COMMUNITY_RUMOR_AS_FACT_WITH_VALID_COMMUNITY_QUOTE
KNOWLEDGE_FACT_WITH_GENERIC_BROADCAST_QUOTE
```

These supplement, not replace, the existing Exposure trap corpus.

## 55. 3M-3 Validator remains final acceptance owner

After assembler and policy-context building:

```text
3M-3 Validator
→ schema/authority/policy validation
→ per-assertion ALLOW / DENY / HOLD
→ validated sidecar + bounded receipt
```

The builder may prove a policy input.

It may not set the final disposition.

The transport may parse a packet.

It may not set the final disposition.

The model may propose a mode/content.

It may not set the final disposition.

## 56. Validated sidecar content remains ALLOW-only

LRE-2 preserves the 3M-3 quarantine law:

```text
ALLOW assertion
→ eligible for validated sidecar

DENY/HOLD assertion content
→ never enters validated sidecar
```

Diagnostic receipts remain bounded and do not duplicate quarantined full content.

## 57. Full semantic-control flow

Frozen conceptual flow:

```text
CURRENT REQUEST
  ↓
Lifecycle / Lineage / Handoff / Evidence
  ↓
SourceJobSelectorV1
  ↓
ACTIVE only if supported + capability-gated
  ↓
conditional Source producer contract in existing main-model request
  ↓
MAIN MODEL CALL (existing call only)
  ↓
visible response prefix + transient proposal tail
  ↓
TransientSourceTransportV1
  ├─ cleanContent
  │     ↓
  │   existing outputCompat → Structure → Output Finalize
  │
  └─ SourceProposalPacketV1
        ↓
      token/schema validation
        ↓
      SourceDraftAssemblerV1
        ├─ 3M-3 semantic draft
        └─ proposal support hints
                 ↓
      current trusted support-region extraction
                 ↓
      ExposurePolicyContextBuilderV1
                 ↓
      3M-3 Validator
        ├─ ValidatedSourceSemanticSidecarV1
        └─ bounded receipt/quarantine
```

## 58. Producer prompt layering

When a Source job is ACTIVE, the future prompt order should be:

```text
existing current source/event provenance
→ approved Exposure restraint contract
→ structured proposal/transport contract
→ existing new-source guidance
```

The producer contract must not duplicate full raw source bodies merely to describe the schema.

## 59. Conditional prompt law

On DORMANT turns:

```text
Source producer contract bytes = 0
```

On ACTIVE turns:

```text
Source producer contract = volatile/current-turn only
```

No unconditional Source schema should be appended to ordinary A/B/non-source turns.

## 60. Existing E6 evidence is necessary but not sufficient

The existing Exposure E6 evaluation contract tests exposure-restraint instructions.

A future combined producer prompt adds:

```text
serialization grammar
support basis labels
support quote requirement
job token echo
```

These added instructions may change model behavior.

Therefore:

```text
E6 COMPLIANCE PASS
!=
COMBINED E6 + STRUCTURED PRODUCER COMPLIANCE PASS
```

Before SHADOW activation, the combined contract needs bounded target-host/model-compliance evidence.

No new G number is introduced.

This remains part of G2/G4 closure evidence.

## 61. Output-pipeline integration point

The narrow future insertion point is frozen conceptually:

```text
rawContent
→ sourceTransport.extract(rawContent, sourceJob)
→ cleanContent
→ outputCompat.prepareOutput(cleanContent, base.pending)
```

Existing `outputCompat`, Structure, and Output Finalize should remain unaware of Source transport grammar.

## 62. Why transport parsing is before `outputCompat`

If the carrier reached `outputCompat` / Structure / Finalize:

```text
legacy/output grammar would need Source transport exceptions
transport bytes could influence canonical output fingerprints
transport errors could be confused with visible structure errors
```

Therefore:

```text
TRANSPORT GRAMMAR OWNER
!=
VISIBLE OUTPUT GRAMMAR OWNER
```

## 63. Carrier-free visible-content contract

After extraction, `cleanContent` is the only pre-canonical visible representation passed to the existing output pipeline.

The following owners may consume only carrier-free bytes:

```text
Output Compat
Structure
Output Finalize
Representation / Edit Reconcile
host assistant transcript
future ordinary model history
```

## 64. Mandatory fingerprint FIX integration

The separately recorded FIX is incorporated into LRE-2 detailed design.

Once the carrier exists:

```text
raw carrier-bearing model response
→ NOT a valid host generation representation
```

Required fingerprint meanings:

```text
outputFingerprint
= fingerprint(canonical result.content)

hostOutputFingerprint
= fingerprint(carrier-free cleanContent)
```

not:

```text
hostOutputFingerprint
= fingerprint(raw carrier-bearing response)
```

## 65. Why `cleanContent` is the lawful host-raw compatibility candidate

Current `hostOutputFingerprint` exists because the host may historically retain the pre-canonical visible response rather than the canonical handler result.

After transport activation, the lawful pre-canonical visible representation is:

```text
cleanContent
```

not transport-bearing raw bytes.

Thus the original compatibility purpose can survive without granting transcript legitimacy to Source transport.

## 66. Carrier contamination is failure, not compatibility

If target host storage ever contains the reserved carrier after an ACTIVE generation:

```text
TRANSPORT / HOST CONTRACT FAILURE
```

The runtime must not treat that representation as a trusted normal generation fast-path merely because it originated from the model response.

Forbidden recovery:

```text
Edit Reconcile sees carrier
→ strips it
→ silently calls the representation compatible
```

Such a repair would hide breach of the transport guarantee.

## 67. Historical fingerprint compatibility

LRE-2 does not rewrite old snapshots.

Old pre-carrier outputs retain their historical fingerprint semantics.

The corrected `cleanContent` rule applies prospectively only once a carrier-capable runtime is enabled.

No persistent schema migration is required by the design.

## 68. LC1 shadow behavior

At LC1 / SHADOW:

```text
legacy production semantics = unchanged
legacy visible output = unchanged
legacy transcript behavior = unchanged
structured path = evaluation/shadow only
```

### Valid packet

```text
→ validate structured sidecar
→ record bounded shadow result
→ no production semantic authority
```

### Missing/malformed/token mismatch/invalid packet

```text
→ structured shadow unavailable/quarantined
→ clean legacy visible output continues
→ no extra model retry
→ no Source semantic authority transfer
```

## 69. LC1 carrier stripping does not mean semantic cutover

Even in SHADOW, the carrier must be stripped from stored output because it is transport-only.

But stripping transport bytes does not change the production semantic owner.

Canonical distinction:

```text
TRANSPORT HYGIENE
!=
SEMANTIC AUTHORITY CUTOVER
```

## 70. LC2 PRIMARY behavior

At a later LRE-5 PRIMARY stage:

```text
validated structured LIVE_REACTION
= only new semantic Source owner
```

If packet/validation fails:

```text
no valid structured Source semantics for that request
```

Forbidden:

```text
fallback to independently model-generated trusted Community semantics
```

Any legacy compatibility representation must be derived from validated structured semantics only.

## 71. PRIMARY and transport failure

A PRIMARY transport failure may still leave ordinary non-Source assistant prose valid if the enclosing mode/output contract allows it.

What fails closed is Source semantic output.

The exact later visible compatibility behavior belongs to LRE-5/LRE-6 transactions.

LRE-2 does not invent a presentation fallback.

## 72. Reload between request and output

The job token is runtime-generation-bound.

If runtime reload/replacement occurs after request preparation and before output processing:

```text
old packet token
!= current runtime job token
```

Default rule:

```text
structured packet = stale / unusable
```

SHADOW consequence:

```text
legacy behavior remains
structured shadow lost
```

PRIMARY consequence:

```text
Source semantics fail closed
```

No persistent pending Source-job database is introduced merely to bridge reload.

## 73. Reroll semantics

A reroll creates a new current Source job binding.

Therefore:

```text
old job token invalid
old proposal invalid
old policy contexts invalid
old validated current sidecar invalid
```

No packet may be rebound because message text happens to match.

## 74. Source/root edit semantics

If the trusted source/root message has been edited so that current fingerprint no longer matches Handoff/Evidence support:

```text
positive support-region proof = invalid
```

The builder fails closed.

It does not search nearby history for a semantically similar root.

## 75. Current-user edit semantics

The first runtime profile does not derive positive current-user public disclosure authority.

Nevertheless, current user identity participates in current-job correlation.

If current user/source binding changes before output use:

```text
job token / authority join must fail closed
```

## 76. No persistent Source job registry

Tier A first-major design remains:

```text
pending Source job = current runtime/request memory only
persistent Source job table = none
persistent packet store = none
persistent policy context store = none
persistent sidecar history = none
```

## 77. No automatic context re-entry

Neither:

```text
proposal packet
support quote
validated sidecar
validation receipt
```

is automatically inserted into future main-model context.

Legacy transcript behavior remains independently governed by the later migration stage until LRE-7.

## 78. No new network/background work

LRE-2 freezes:

```text
new network calls = 0
new auxiliary model calls = 0
new timers = 0
new polling = 0
new background workers = 0
```

## 79. History-scan boundary

The Source semantic path must not scan full chat history per output.

Permitted future inputs are bounded to:

```text
already-prepared current Handoff/Evidence facts
+ exact current source/root/current-user reads if required for support-region proof
```

If required current support cannot be reconstructed safely from those bounded facts after reload, fail closed or open a separate recovery/persistence design.

## 80. Numeric caps belong to LRE-3

LRE-2 freezes that all of these must be bounded:

```text
proposal assertion count
content chars per assertion
support quote chars
aggregate packet chars
transport protocol-zone chars
validation receipt rows
```

Exact numeric constants are intentionally assigned to LRE-3, which owns family caps and integration instrumentation.

No implementation may activate before those caps exist.

## 81. Source-irrelevant baseline

For DORMANT ordinary requests, target behavior is:

```text
selector O(1)
Source producer prompt bytes = 0
no support-region extraction
no Source validation
no Source persistence
no Source history scan
no Source presentation work
```

A future always-present transport function must be an effectively no-op bounded branch when no Source job is expected.

## 82. Failure-domain separation

LRE-2 preserves distinct failure classes:

```text
selector unsupported/capability block
!=
transport malformed/missing
!=
job-token mismatch
!=
support-proof failure
!=
3M-3 structural validation failure
!=
3M-2 policy DENY/HOLD
!=
model semantic-compliance failure
!=
presentation mount failure
```

A single `sourceFailed=true` flag is insufficient evidence.

## 83. Transport failure does not create semantic data

Malformed JSON, unknown fields, duplicate ordinals, extra markers, or token mismatch must not produce a partially trusted assertion set.

Canonical rule:

```text
BAD TRANSPORT / BAD PACKET
→ NO TRUSTED PROPOSAL OBJECT
```

The parser is not a repair engine.

## 84. Policy proof failure is per assertion

By contrast, a structurally valid proposal whose support proof fails may remain a structurally valid assertion proposal.

The builder supplies no positive policy signal and the 3M-2 function derives a conservative disposition.

This preserves:

```text
BAD PACKET STRUCTURE
!=
UNPROVEN ASSERTION SUPPORT
```

## 85. No semantic downgrading repair

Forbidden:

```text
CONFIRMED_FACT lacks public support
→ automatically rewrite as INFERENCE_OPINION
```

or:

```text
private fact denied
→ automatically relabel as attributed rumor
```

The model proposal is judged as proposed.

A new proposal would require a separately authorized new generation attempt, which is not part of first runtime flow.

## 86. Presentation remains downstream

The validated sidecar remains plain semantic data.

LRE-2 does not add:

```text
HTML
CSS
DOM card
avatar
scroll/collapse state
message mount identity
```

G5 remains LRE-6 ownership.

## 87. Legacy Community remains SHADOW production output

LRE-2 does not remove or rewrite legacy Community production behavior.

In LC1:

```text
legacy Community remains existing user-visible/stored behavior
structured proposal is extra transient shadow transport only
```

LRE-5 later owns removal of independent legacy semantic authority.

LRE-7 later owns prospective legacy-context retirement.

## 88. G2 disposition

Current state remains:

```text
G2 = PENDING / HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

Repository design cannot substitute for target-host/model-compliance proof.

LRE-2 additionally requires the combined Exposure + producer/transport instruction set to be evaluated, because serialization instructions may change model behavior.

## 89. G3 disposition

LRE-2 freezes the selector design contract:

```text
G3_SELECTOR_DESIGN = FROZEN
```

But:

```text
G3_RUNTIME_PROOF = PENDING
```

Runtime implementation/evidence must prove DORMANT/UNSUPPORTED/BLOCKED/ACTIVE behavior and zero history-based activation.

## 90. G4 disposition

LRE-2 freezes the producer/transport architecture:

```text
G4_PRODUCER_TRANSPORT_DESIGN = FROZEN
```

But:

```text
G4_RUNTIME_HOST_PROOF = PENDING
```

Required future proof includes:

```text
carrier tail parsing
carrier never stored
malformed protocol-zone stripping
cleanContent fingerprint semantics
no extra model call
no provider-specific structured-output dependency
no visible legacy regression in SHADOW
```

## 91. G6 / G8 disposition

```text
G6 family caps = LRE-3
G8 bounded integration evidence = LRE-3
```

LRE-2 does not invent temporary numeric caps under a different owner.

## 92. G5 disposition

Unchanged from LRE-1:

```text
G5 = NARROWED_BUT_BLOCKED
```

Structured shadow can proceed later without solving visible source-card mounting.

## 93. BLOCKER set

```text
BLOCKER · SOURCE_JOB_SELECTOR_READS_LEGACY_COMMUNITY_HISTORY_AS_ACTIVATION
BLOCKER · DORMANT_TURN_RECEIVES_UNCONDITIONAL_SOURCE_PRODUCER_PROMPT
BLOCKER · SECOND_MODEL_CALL_ADDED_FOR_SOURCE_DRAFT
BLOCKER · MODEL_EMITS_TRUSTED_SOURCE_AUTHORITY_FIELDS
BLOCKER · MODEL_SUPPORT_BASIS_TREATED_DIRECTLY_AS_POLICY_AUTHORITY
BLOCKER · CURRENT_USER_MENTION_PROMOTED_TO_PUBLIC_DISCLOSURE
BLOCKER · GENERIC_PROSE_CLASSIFIER_ADDED_TO_CLOSE_EXPOSURE
BLOCKER · TRANSIENT_CARRIER_PARSED_AFTER_OUTPUT_COMPAT_OR_FINALIZE
BLOCKER · TRANSIENT_CARRIER_SURVIVES_IN_CANONICAL_RESULT_CONTENT
BLOCKER · MALFORMED_PROTOCOL_ZONE_STORED_AS_VISIBLE_TRANSCRIPT
BLOCKER · RAW_CARRIER_BYTES_BECOME_TRUSTED_HOST_OUTPUT_FINGERPRINT
BLOCKER · CARRIER_CONTAMINATION_SILENTLY_REPAIRED_AS_HOST_COMPATIBILITY
BLOCKER · TOKEN_MISMATCH_REBOUND_TO_HISTORICAL_REQUEST
BLOCKER · SUPPORT_QUOTE_SEARCH_SCANS_WHOLE_CHAT
BLOCKER · FAILED_SUPPORT_PROOF_REPAIRED_INTO_ANOTHER_ASSERTION_MODE
BLOCKER · LC2_FAILURE_FALLS_BACK_TO_INDEPENDENT_LEGACY_SEMANTIC_OWNER
BLOCKER · SOURCE_PACKET_OR_SIDECAR_PERSISTED_WITHOUT_SEPARATE_AUTHORITY
BLOCKER · STRUCTURED_SOURCE_AUTOMATIC_CONTEXT_REENTRY_ADDED_IN_LRE2
```

## 94. WATCH set

```text
WATCH · G2_TARGET_HOST_MODEL_COMPLIANCE_STILL_PENDING
WATCH · SUPPORT_ANCHOR_SEMANTIC_ENTAILMENT_NOT_MACHINE_PROVEN
WATCH · COMBINED_EXPOSURE_PLUS_SERIALIZATION_PROMPT_NEEDS_SEPARATE_COMPLIANCE_EVIDENCE
WATCH · TRANSIENT_TAIL_STRIP_MUST_BE_PROVEN_ON_THEN_CURRENT_HOST
WATCH · RUNTIME_RELOAD_BETWEEN_REQUEST_AND_OUTPUT_FAIL_CLOSED_NEEDS_EXECUTION_PROOF
WATCH · SOURCE_STRUCTURAL_REGION_ADAPTER_MUST_NOT_DRIFT_FROM_EXISTING GRAMMAR OWNERS
WATCH · CANONICAL_DOC_PROMOTION_CONTROL_PLANE_CLASSIFICATION_DRIFT
```

The canonical-doc promotion WATCH is repository-admin only and already tracked separately.

## 95. DEFER set

```text
DEFER · CURRENT_USER_EXPLICIT_PUBLIC_DISCLOSURE_RUNTIME_CLASSIFIER
DEFER · CURRENT_USER_MENTION_ONLY_RUNTIME_CLASSIFIER
DEFER · REFERENCE_CONTEXT_RUNTIME_SUPPORT
DEFER · OUTSIDE_ROOT_HISTORY_POLICY_SUPPORT
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
DEFER · A_ROOT_SOURCE
DEFER · INLINE_C_SOURCE
DEFER · PROVIDER_STRUCTURED_OUTPUT
DEFER · AUXILIARY_SOURCE_MODEL
DEFER · POST_OUTPUT_SEMANTIC_CLASSIFIER
DEFER · PERSISTENT_SOURCE_JOB_CONTEXT
DEFER · PERSISTENT_SOURCE_SIDECAR
DEFER · HISTORICAL_SOURCE_REPLAY
DEFER · PRESENTATION_MOUNT
DEFER · BOARD / NEWS / SOCIAL_FEED / PUBLIC_KNOWLEDGE ACTIVATION
```

## 96. Future implementation transaction boundary

When implementation is separately authorized, the first implementation transaction should own only the SHADOW semantic-control lane:

```text
SourceJobSelector
conditional producer contract
TransientSourceTransport
SourceDraftAssembler
ExposurePolicyContextBuilder
3M-3 validator integration
mandatory cleanContent fingerprint FIX
```

It must not simultaneously own:

```text
new source UI
legacy semantic-primary cutover
legacy context retirement
BOARD/NEWS activation
repo control-plane repair
release-system redesign
```

## 97. Required future static/regression surfaces

Before SHADOW deployment candidate, direct tests should cover at least:

```text
selector positive/negative/defer matrix
DORMANT zero producer bytes
one valid tail carrier
missing carrier
multiple carriers
non-tail close delimiter
missing close delimiter
invalid JSON
unknown packet field
duplicate ordinal
invalid mode
job token match/mismatch
support basis/quote region matches
quote mismatch
source fingerprint stale
one-hot policy signal construction
3M-2 disposition integration
ALLOW-only validated sidecar
carrier-free cleanContent passed to output pipeline
canonical fingerprint based on result.content
host compatibility fingerprint based on cleanContent
raw carrier fingerprint never trusted
SHADOW malformed packet leaves legacy visible prefix unchanged
reload/reroll stale token failure
no persistence/no extra model/no network/no history scan
```

## 98. Target-host proof additions

LRE-1 H1-H8 remain authoritative for host coupling.

LRE-2 adds semantic-control proof questions:

```text
T1 · carrier emitted only for ACTIVE job
T2 · carrier arrives intact at output handler
T3 · carrier absent from stored assistant message
T4 · malformed carrier protocol zone absent from stored assistant message
T5 · cleanContent remains the host-compatible pre-canonical representation
T6 · carrier-bearing raw bytes cannot pass edit-reconcile generation-time trust
T7 · token stale after reroll/reload is rejected
T8 · DORMANT turns receive no Source producer bytes
```

These are not new G gates.

They are evidence needed to close existing G2/G3/G4 and integration gates.

## 99. Completion criterion

LRE-2 design is complete when the following are frozen:

```text
semantic authority stages
first-slice selector contract
selector status taxonomy
existing-main-model producer ownership
no auxiliary model topology
transient pre-transcript carrier grammar
strict packet schema
current-job correlation token boundary
trusted draft assembly
support basis + exact quote proof contract
runtime policy-context builder scope
current-user public disclosure defer
3M-3 validator final authority
SHADOW vs PRIMARY missing/malformed behavior
mandatory cleanContent fingerprint boundary
reload/reroll/edit invalidation direction
no persistence/reentry/presentation boundary
G2/G3/G4 dispositions
LRE-3 handoff
```

All are frozen by this document.

## 100. Handoff to LRE-3

Next checkpoint:

```text
LRE-3
Family Caps + Integration Instrumentation
```

LRE-3 must freeze concrete bounded constants and evidence dimensions for:

```text
proposal item count
semantic chars
support quote chars
aggregate transport bytes
receipt rows
selector status
transport status
support-proof status
validator counts
DORMANT baseline
prompt/output contribution
history scan counts
model/network/background-work counts
legacy bridge/context-growth evidence
```

LRE-3 must not become a Source database or persistence subsystem.

## 101. Final freeze

```text
LRE_2_DESIGN                              = FROZEN
FIRST_FAMILY                              = LIVE_REACTION
FIRST_SCOPE                               = DIRECT_B_ROOT_MODE_C
SEMANTIC_AUTHORITY_STAGE                  = OFF / SHADOW / PRIMARY CONTRACT FROZEN
CURRENT_RUNTIME_STAGE                     = OFF
SELECTOR                                  = SourceJobSelectorV1
SELECTOR_INPUT_AUTHORITY                  = EXISTING LIFECYCLE / LINEAGE / HANDOFF / EVIDENCE
MAIN_MODEL                                = EXISTING CALL ONLY
AUXILIARY_MODEL                           = NONE
TRANSPORT                                 = TRANSIENT_TAIL_CARRIER_V1
TRANSPORT_POSITION                        = PRE-OUTPUT_COMPAT / PRE-TRANSCRIPT
MODEL_PACKET                              = SourceProposalPacketV1
MODEL_AUTHORITY_FIELDS                    = FORBIDDEN
JOB_TOKEN                                 = CURRENT-JOB CORRELATION ONLY
SUPPORT_PROOF                             = BASIS + EXACT CURRENT-REGION QUOTE
POLICY_CONTEXT_BUILDER                    = ExposurePolicyContextBuilderV1
CURRENT_USER_PUBLIC_DISCLOSURE_RUNTIME    = DEFER
VALIDATOR                                 = 3M-3 FINAL ACCEPTANCE / QUARANTINE OWNER
VALIDATED_SIDECAR                         = ALLOW-ONLY
RAW_CARRIER_HOST_FINGERPRINT              = FORBIDDEN
HOST_COMPAT_FINGERPRINT_INPUT             = carrier-free cleanContent
PERSISTENT_SOURCE_STATE                   = NONE
SOURCE_HISTORY                            = NONE
CONTEXT_REENTRY                           = NONE
DOM_CSS                                   = NONE
G2                                        = PENDING
G3                                        = DESIGN FROZEN / RUNTIME PROOF PENDING
G4                                        = DESIGN FROZEN / RUNTIME HOST PROOF PENDING
G5                                        = NARROWED_BUT_BLOCKED / LRE-6
G6                                        = LRE-3
G8                                        = LRE-3
RUNTIME_IMPLEMENTATION                    = NOT_AUTHORIZED
PRODUCTION                                = UNCHANGED
S7 / v0.70.3                              = UNCHANGED
release-simcore                           = UNCHANGED
NEXT                                      = LRE-3
```
