# SimCore 3M-3 Structured Sidecar + Validation Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-3 DESIGN FROZEN · OFFLINE / SHADOW STRUCTURED VALIDATION ONLY · RUNTIME PRODUCER / TRANSPORT NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-3 · STRUCTURED SEMANTIC SIDECAR · VALIDATOR-FIRST · DIRECT B-ROOT LIVE_REACTION**

## 0. Purpose

3M-3 freezes the first concrete structured semantic contract under Source Intelligence.

It answers:

```text
Given an untrusted structured source-semantic draft,
existing trusted source-authority facts,
and already-classified 3M-2 exposure-policy inputs,
what exact object may survive as validated Source Intelligence data?
```

3M-3 does not yet decide how the main model emits the draft in production.
It does not add a hidden JSON block, new output tag, provider structured-output mode, persistent source store, source renderer, or future-context path.

The first executable authority is intentionally:

```text
OFFLINE / SHADOW_STRUCTURED_ONLY
```

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_COMMON_LAYER_REFRESH_REVIEW_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
```

Deployed runtime remains independently authoritative on `release-simcore`.

## 2. First-slice scope

The only supported 3M-3 design scope is:

```text
family = LIVE_REACTION
mode = C
source = direct B root
sourceAuthorityRef.kind = HANDOFF_EVIDENCE
rootMode = B
parentMode = B
parentIndex = rootIndex
depth = 1
projection block ordinal = 0
```

All other source families / authority classes / multi-B windows remain unsupported by this validator version.

Canonical outcome for unsupported scope:

```text
UNSUPPORTED_SCOPE
```

not guessed compatibility.

## 3. Three-input authority model

A key 3M-3 decision is to keep three inputs separate.

### Input A · untrusted semantic draft

Conceptual type:

```text
SourceSemanticSidecarDraftV1
```

This may eventually come from the main model or another explicitly authorized semantic producer.

It is never authority merely because it is structured.

### Input B · trusted current source-authority context

Conceptual type:

```text
SourceAuthorityContextV1
```

This is composed only from existing current owners such as Handoff / Evidence / Lineage for the first slice.

The draft cannot create or strengthen this context.

### Input C · trusted assertion policy contexts

Conceptual type:

```text
SourceAssertionPolicyContextV1[]
```

Each policy context carries the already-classified 3M-2 semantic-oracle signals for one assertion ordinal.

For the first offline implementation these contexts come from deterministic fixtures / Exposure corpus annotations.

No production runtime classifier is authorized yet.

Canonical separation:

```text
MODEL / PRODUCER MAY PROPOSE ASSERTION CONTENT + MODE

SIMCORE CURRENT OWNERS PROVIDE SOURCE AUTHORITY

SEPARATE POLICY CONTEXT PROVIDES CLASSIFIED EXPOSURE BASIS

VALIDATOR DERIVES FINAL DISPOSITION
```

## 4. Draft schema

Frozen conceptual schema:

```text
SourceSemanticSidecarDraftV1
  schemaVersion = 1
  family = LIVE_REACTION
  projectionOrdinal = 0
  sourceAuthorityRef
  assertions[]
```

Strict rule:

```text
unknown fields = invalid draft
```

This prevents arbitrary model-generated metadata from quietly acquiring meaning.

### 4.1 `sourceAuthorityRef`

First-slice shape:

```text
HandoffEvidenceAuthorityRefV1
  kind = HANDOFF_EVIDENCE
  rootMode = B
  parentMode = B
  rootIndex
  parentIndex
  depth = 1
  rootFingerprint
  sourceAssistantIndex
  sourceAssistantFingerprint
  currentUserIndex
  currentUserFingerprint
```

These values are references to existing owner results.

The validator must compare them against trusted `SourceAuthorityContextV1`; the producer cannot self-certify them.

No raw root/source/current-user body may be embedded into this reference.

## 5. Assertion draft schema

Frozen shape:

```text
SourceAssertionDraftV1
  ordinal
  mode
  content
```

### `ordinal`

- integer-like bounded local ordinal;
- unique only inside the current sidecar;
- not a persistent ID;
- not reroll lineage authority;
- not a cross-turn source identity.

### `mode`

Exactly one of:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

### `content`

- non-empty plain semantic text;
- treated as untrusted plain text, never trusted HTML;
- presentation escaping belongs to the later renderer;
- bounded per assertion and in aggregate by explicit implementation constants;
- must not contain an embedded raw source body or arbitrary nested metadata.

The design intentionally does not freeze product/UI character limits. Offline implementation must choose conservative safety caps and record them as validator constants/evidence, not social-platform semantics.

## 6. Forbidden model/producer-owned fields

The draft must not contain authority-like fields such as:

```text
isValid
valid
canonicalTruth
isPublic
publicFact
safeToRender
safeToRenderAsFact
eligibilityState
reasonCode
validationState
consumerDisposition
```

Because unknown fields are invalid, these are rejected by default.

Canonical rule:

```text
MODEL DECLARES CONTENT / MODE
!=
MODEL DECLARES ACCEPTANCE
```

## 7. Trusted source-authority context

`SourceAuthorityContextV1` is not part of the model draft.

Conceptually it contains the current normalized facts necessary to verify the first-slice gate:

```text
family = LIVE_REACTION
mode = C
handoffEligible = true
rootMode = B
parentMode = B
rootIndex
parentIndex
depth = 1
rootFingerprint
sourceAssistantIndex
sourceAssistantFingerprint
currentUserIndex
currentUserFingerprint
```

Authority join rules:

```text
draft.kind == HANDOFF_EVIDENCE
trusted.handoffEligible == true
draft.rootMode == trusted.rootMode == B
draft.parentMode == trusted.parentMode == B
draft.rootIndex == trusted.rootIndex
draft.parentIndex == trusted.parentIndex == trusted.rootIndex
draft.depth == trusted.depth == 1
all referenced indices/fingerprints == trusted existing-owner values
```

Any mismatch returns:

```text
INVALID_AUTHORITY_JOIN
```

The validator must not repair the draft by overwriting spoofed authority fields.

## 8. Assertion policy context

Each assertion ordinal requires exactly one externally supplied policy context.

Frozen signal shape reuses 3M-2 exactly:

```text
SourceAssertionPolicyContextV1
  ordinal
  broadcastExposed
  sourceCommunityContext
  sourceKnowledgeContext
  referenceContext
  currentUserExplicitPublicDisclosure
  currentUserMentionOnly
  outsideRootHistoryOnly
  visibleCueExposed
```

All signals are explicit booleans for the first design.
Missing signal fields are invalid policy context rather than silently assumed false.

Policy contexts are **not model-owned** in the first design.

Offline fixture metadata may provide them.
A future active runtime contract must separately prove who classifies them and how.

### Contradiction checks

At minimum reject impossible self-contradictory contexts such as:

```text
currentUserExplicitPublicDisclosure = true
AND
currentUserMentionOnly = true
```

and any future contradiction explicitly frozen by the 3M-2 semantic contract.

The validator must not invent a semantic precedence rule to rescue contradictory policy inputs.

## 9. Policy evaluation

After schema and authority joins pass, the validator runs the exact 3M-2 policy function.

### `CONFIRMED_FACT`

```text
broadcastExposed OR currentUserExplicitPublicDisclosure
→ ALLOW / ALLOW_KNOWN_PUBLIC_FACT

else currentUserMentionOnly
→ DENY / DENY_MERE_MENTION_PUBLICATION

else outsideRootHistoryOnly
→ DENY / DENY_EVENT_SCOPE_EXPOSURE_PROMOTION

else sourceCommunityContext
→ DENY / DENY_DERIVED_SOCIAL_PROMOTION

else sourceKnowledgeContext OR referenceContext
→ DENY / DENY_UNEXPOSED_PRIVATE_CONFIRMATION

else
→ DENY / DENY_UNKNOWN_PUBLIC_FACT
```

### `ATTRIBUTED_SOCIAL`

```text
sourceCommunityContext
→ ALLOW / ALLOW_ATTRIBUTED_SOCIAL_CONTEXT

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

### `INFERENCE_OPINION`

```text
visibleCueExposed
→ ALLOW / ALLOW_VISIBLE_CUE_INFERENCE

otherwise
→ HOLD / HOLD_UNPROVEN_POLICY_COMBINATION
```

No model-authored verdict participates in this decision.

## 10. Claim-specific evidence compatibility

3M-3 adopts the common rule:

```text
VALID SOURCE AUTHORITY
!=
VALID ASSERTION AUTHORITY FOR EVERY CLAIM MODE
```

The compatibility relation is therefore:

```text
HANDOFF_EVIDENCE
→ source relationship gate only

CONFIRMED_FACT
→ positive public basis required

ATTRIBUTED_SOCIAL
→ source Community context required for current proven ALLOW

INFERENCE_OPINION
→ visible cue basis required for current proven ALLOW
```

A valid Handoff/Evidence reference cannot convert Knowledge-only content into a public fact.

## 11. Structural validation vs semantic truth

The validator can prove:

```text
schema validity
authority-ref equality with trusted current facts
first-slice scope eligibility
policy-context shape / contradiction freedom
assertion-mode legality
3M-2 policy result
consumer quarantine rules
```

It cannot prove from structure alone:

```text
that assertion content semantically follows from the cited source
that a producer correctly classified a proposition into CONFIRMED_FACT
that visible-cue wording is a reasonable inference
that an explicit-public-disclosure classifier is semantically correct
```

Therefore:

```text
SIDECAR_VALIDATION_PASS
!=
MODEL_SEMANTIC_COMPLIANCE_PASS
```

The Exposure model-compliance lane remains separate evidence.

## 12. Per-assertion validator result

For every structurally valid assertion, derive:

```text
ValidatedAssertionDispositionV1
  ordinal
  mode
  eligibilityState = ALLOW | DENY | HOLD
  reasonCode
  consumerDisposition
```

where:

```text
ALLOW → ELIGIBLE
DENY  → QUARANTINED_DENY
HOLD  → QUARANTINED_HOLD
```

The producer cannot set `consumerDisposition`.

## 13. Validated sidecar vs validation receipt

3M-3 separates renderable semantic data from diagnostic validation evidence.

### 13.1 `ValidatedSourceSemanticSidecarV1`

Contains only `ALLOW` assertions:

```text
schemaVersion = 1
family = LIVE_REACTION
projectionOrdinal = 0
sourceAuthorityRef = validator-confirmed trusted ref
assertions[] = accepted SourceAssertionViewV1
```

Each accepted view may carry:

```text
ordinal
mode
content
reasonCode
```

`reasonCode` is validator-derived.

No DENY/HOLD assertion content is copied into the validated sidecar.

### 13.2 `SourceSemanticSidecarValidationReceiptV1`

Contains bounded judgment metadata:

```text
validationState
assertionCount
allowedCount
deniedCount
heldCount
perAssertion[]
```

Each `perAssertion` receipt carries only bounded fields such as:

```text
ordinal
mode
eligibilityState
reasonCode
consumerDisposition
contentLength
```

The receipt does not need to duplicate full assertion content or raw source bodies.

This preserves bounded observability without creating a hidden semantic history store.

## 14. Mechanically derived sidecar state

The validator derives exactly one overall state:

```text
VALID_EMPTY
VALID
VALID_WITH_QUARANTINE
QUARANTINED
UNSUPPORTED_SCOPE
INVALID
```

Rules:

```text
schema / authority / policy-context structural failure
→ INVALID

first-slice scope not supported
→ UNSUPPORTED_SCOPE

zero assertions, otherwise valid
→ VALID_EMPTY

all assertions ALLOW
→ VALID

at least one ALLOW and at least one DENY/HOLD
→ VALID_WITH_QUARANTINE

zero ALLOW and at least one DENY/HOLD
→ QUARANTINED
```

The model does not output this state.

## 15. Failure behavior

### Structural invalidity

Fail whole sidecar:

```text
INVALID
validated sidecar = null
```

Examples:

- unknown field;
- duplicate ordinal;
- missing/malformed policy context;
- spoofed/mismatched authority ref;
- invalid family/mode;
- contradictory policy context;
- unbounded/forbidden raw-body-shaped payload.

### Policy DENY/HOLD

Do not fail the whole sidecar automatically.

Quarantine the affected assertion and derive the overall state mechanically.

This distinction is important:

```text
BAD STRUCTURE / BAD AUTHORITY JOIN
!=
SEMANTIC POLICY SAYS DO NOT RENDER THIS ASSERTION
```

## 16. No repair contract

The first validator is judge-only.

It does not:

```text
rewrite content
change assertion mode
change source refs
invent exposure signals
downgrade CONFIRMED_FACT to opinion
convert DENY to attributed rumor
fill missing fields
repair contradictory policy context
```

If a draft is invalid, the producer must produce a new draft in a separately authorized future flow.

## 17. No persistence / no context re-entry

3M-3 first design freezes:

```text
persistent schema delta = 0
SnapshotStore key delta = 0
Core state version delta = 0
source database = NONE
source ledger = NONE
ordinary future context re-entry = NONE
host history rewrite = NONE
```

The draft, policy context, validated sidecar, and receipt are all ephemeral/offline for the first implementation.

## 18. No production transport yet

The following are explicitly outside 3M-3 first implementation authority:

```text
<SOURCE_SIDECAR> output tag
JSON block inside assistant output
HTML comment transport
COMMUNITY attribute transport
provider structured-output mode
second model call
post-generation semantic extraction
hidden persistent message metadata
```

Why:

Current output path couples assistant bytes to:

```text
Output Compat
Structure
Knowledge final placement
Output Finalize
Representation / Edit Reconcile
host history
Deferred Mirror compatibility
```

A transport must therefore receive its own future integration design and regression evidence.

## 19. Presentation boundary

The validated sidecar is semantic plain text + policy metadata.

It is not HTML.

Future 3M-4 rule:

```text
ValidatedSourceSemanticSidecarV1
→ Presentation Renderer
→ escaped family-specific DOM/CSS
```

The renderer must never consume the unvalidated draft.

## 20. `SourceProjectionEnvelope.assertions[]` compatibility

3M-1 legacy compatibility remains:

```text
assertions[] = []
```

3M-3 does not mutate that current compatibility view in runtime.

Conceptually, a future active structured path may bind:

```text
SourceProjectionEnvelope.assertions[]
→ accepted assertions from ValidatedSourceSemanticSidecarV1
```

but that binding is part of future runtime transport/integration, not the offline validator.

Thus:

```text
LEGACY COMMUNITY PATH
→ assertions[] remains empty

OFFLINE 3M-3 STRUCTURED PATH
→ sidecar exists independently for validation evidence
```

## 21. Boundedness requirements

The offline validator implementation must define explicit constants for:

```text
maximum assertions per sidecar
maximum chars per assertion
maximum aggregate semantic chars
maximum validation receipt rows
```

Requirements for those constants:

- conservative;
- regression-tested;
- no raw source-body retention;
- not represented as platform/product semantics;
- any later enlargement requires evidence rather than silent drift.

Exact numbers are implementation-preflight constants, not frozen by this design because current evidence does not justify a product-semantic count limit.

## 22. Offline fixture matrix

### 22.1 Exposure oracle reuse

Translate all existing 12 Exposure semantic fixtures into structured draft + policy-context cases.

The expected 3M-2 dispositions remain authoritative oracle outputs.

At minimum preserve:

```text
Knowledge-only hidden fact confirmation → DENY
prior Community rumor promoted to fact → DENY
attributed prior rumor → ALLOW ATTRIBUTED_SOCIAL
visible broadcast fact → ALLOW CONFIRMED_FACT
visible cue inference → ALLOW INFERENCE_OPINION
visible cue hidden-state confirmation → DENY/HOLD according to declared mode/policy
explicit current-user public disclosure → ALLOW CONFIRMED_FACT
mere mention → DENY CONFIRMED_FACT
outside-root history only → DENY CONFIRMED_FACT
Knowledge duplicate + independent broadcast exposure → ALLOW CONFIRMED_FACT
unknown exposure → DENY/HOLD according to 3M-2
```

### 22.2 Structural adversarial fixtures

Add cases for:

```text
wrong family
projectionOrdinal != 0
LEGACY_MODE_CONTEXT assertion attempt
UNRESOLVED_LEGACY_C assertion attempt
rootMode != B
parentMode != B
parentIndex != rootIndex
depth != 1
source fingerprint mismatch
current-user fingerprint mismatch
unknown draft field
model-owned isValid field
invalid assertion mode
duplicate ordinal
missing policy context
extra policy context ordinal
missing policy signal
contradictory explicit-public + mention-only
raw-source-body-shaped forbidden field
```

All must fail closed without mutation.

## 23. Validation evidence vocabulary

Offline implementation should report bounded reason codes distinct from 3M-2 semantic reason codes.

Suggested validator-class codes:

```text
INVALID_SCHEMA
INVALID_UNKNOWN_FIELD
INVALID_DUPLICATE_ORDINAL
INVALID_AUTHORITY_JOIN
INVALID_POLICY_CONTEXT
INVALID_POLICY_CONTEXT_CONTRADICTION
UNSUPPORTED_3M3_SCOPE
```

Semantic ALLOW/DENY/HOLD reason codes continue to come from 3M-2 unchanged.

Do not conflate:

```text
validator structural failure
with
assertion semantic policy denial
```

## 24. First implementation target

If separately authorized, 3M-3 implementation should be repository/offline only:

```text
pure validator / evaluator
+ deterministic fixture corpus
+ no runtime import
+ no product builder change
+ no latest.js/install.js change
+ no release branch change
```

Suggested working artifact names are intentionally non-authoritative until implementation preflight, but a shape such as:

```text
products/simcore/tooling/source-semantic-sidecar-validator.mjs
```

is acceptable if it remains offline tooling rather than runtime code.

## 25. Runtime promotion gate

No runtime producer/transport may be selected until all are true:

```text
offline schema/authority tests PASS
Exposure 12-case structured mapping PASS
claim-specific compatibility traps PASS
boundedness regression PASS
no raw-body retention PASS
validator remains pure/no-I/O PASS
3M-2 target-host/model evidence materially understood for producer compliance
separate transport impact scope completed
```

Even then, transport selection is a new design transaction.

## 26. Explicit defers

```text
DEFER · 3M3_RUNTIME_DRAFT_PRODUCER
DEFER · 3M3_RUNTIME_POLICY_CONTEXT_PRODUCER
DEFER · RUNTIME_SIDECAR_TRANSPORT
DEFER · OUTPUT_STRIPPING / HIDDEN_METADATA
DEFER · SIDECAR_PERSISTENCE
DEFER · SOURCE_HISTORY_REENTRY
DEFER · SOURCE_PRESENTATION_RENDERER
DEFER · BOARD / SOCIAL_FEED / NEWS / PUBLIC_KNOWLEDGE STRUCTURED SCHEMAS
DEFER · MULTI_B_SOURCE_WINDOW
DEFER · GENERIC_PROVENANCE_LEDGER
```

## 27. Completion criterion

3M-3 design is complete when the following are frozen:

```text
untrusted draft shape
trusted source-authority context separation
trusted policy-context separation
assertion mode/content contract
strict unknown-field rejection
authority join rules
exact 3M-2 policy integration
validator-derived per-assertion disposition
overall sidecar state derivation
validated-sidecar vs receipt separation
no-repair rule
no persistence/context/transport rule
offline fixture matrix
runtime promotion gate
```

All are frozen by this document.

## 28. Final status

```text
3M_3_DESIGN = FROZEN
FIRST_SCOPE = DIRECT_B_ROOT_LIVE_REACTION
DRAFT = UNTRUSTED
SOURCE_AUTHORITY = EXISTING OWNER INPUT
POLICY_CONTEXT = EXTERNAL TRUSTED/ORACLE INPUT FOR FIRST OFFLINE PHASE
VALIDATOR = FINAL ACCEPTANCE / QUARANTINE OWNER
MODEL_OWNED_VERDICT = FORBIDDEN
PERSISTENCE = NONE
CONTEXT_REENTRY = NONE
RUNTIME_TRANSPORT = DEFERRED
FIRST_EXECUTION = OFFLINE / SHADOW_STRUCTURED_ONLY
PRODUCTION / S7 / v0.70.3 = UNCHANGED
IMPLEMENTATION AUTHORITY = NONE
```

Next legitimate 3M-3 action is a separate repository-only implementation transaction for the pure offline validator and structured fixture corpus. That implementation must not touch `release-simcore`, `latest.js`, `install.js`, Prompt bytes, visible output, or persistent state.
