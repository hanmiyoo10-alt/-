# SimCore 3M-3 Structured Sidecar + Validation Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · FIRST 3M-3 DESIGN SEAM SELECTED · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-3 PRE-DESIGN · STRUCTURED SEMANTIC SIDECAR · VALIDATOR-FIRST · READ ONLY**

## 0. Purpose

This document performs the required source-backed impact scope before freezing the concrete 3M-3 `Structured Sidecar + Validation` design.

It answers only:

```text
If 3M-1's SourceProjectionEnvelope
and 3M-2's assertion/exposure policy
are represented as a structured semantic sidecar,
which current owners and boundaries must be preserved,
and what is the narrowest safe first design seam?
```

This transaction does not choose a runtime transport, alter model output syntax, implement a sidecar, add a persistent schema, change Prompt bytes, change visible output, add a renderer, modify S7/v0.70.3, or touch `release-simcore`.

## 1. Authority snapshot

Design/evidence authority used here:

```text
main parent = a51d1c7056606a10013c18421154cd5ce3011b72
```

Deployed runtime authority remains:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version         = 0.70.1 Cold First-Turn Tail Attribution
latest.js       = install.js
```

The common `plugin-impact-scope` second-scope held-out question was frozen before this human impact map existed. Its candidate eval snapshot remains the earlier main `e4daaa427ed902ca6f8368c45d509f7fd0f26d42`; this document must not be added to that future eval context.

## 2. Inherited 3M contracts

### 3M-1

Current compatibility envelope remains:

```text
family = LIVE_REACTION
assertions[] = []
sourceAuthorityRef ∈ {
  LEGACY_MODE_CONTEXT,
  HANDOFF_EVIDENCE,
  UNRESOLVED_LEGACY_C
}
contextReentryPolicy = LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY
presentationIntent = LEGACY_COMMUNITY
```

3M-1 explicitly forbids extracting structured assertions from arbitrary legacy Community prose.

### 3M-2

The first assertion-policy lane remains:

```text
family = LIVE_REACTION
request = eligible short C
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
```

Assertion modes:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

Policy result:

```text
SourceAssertionPolicyReceipt
  eligibilityState = ALLOW | DENY | HOLD
  reasonCode
```

3M-2 freezes the deterministic policy target but does not claim arbitrary natural-language semantic classification is mechanically proven.

## 3. New common-layer constraints that are binding inputs

3M-3 must explicitly satisfy:

```text
RCR-D11 · narrowest capable semantic owner
RCR-D12 · map producer/data/effect flow before mutation
RCR-D13 · validate cross-boundary joins, not files alone
RCR-C09 · validator before replacement/shared writer
```

Two common Agent Skill eval lessons are also promoted design inputs:

```text
EVIDENCE EXISTS
!=
EVIDENCE IS COMPATIBLE WITH THIS CLAIM TYPE
```

and:

```text
MODEL MAY DECLARE SEMANTIC FIELDS
VALIDATOR DERIVES ACCEPTANCE / DISPOSITION
```

A model-authored `isValid`, `isPublic`, `safeToRenderAsFact`, or equivalent field cannot become authority merely by being present.

## 4. Exact current output path

The deployed runtime currently follows this relevant path:

```text
main model output
   ↓
Session.processOutput
   ↓
Output Compat.prepareOutput
   - strip current broadcast control tags
   - canonicalize response envelope
   - normalize tail placement
   ↓
Structure.validateStructure
   ↓
Output Finalize.finalizePreparedOutput
   - Frame continuity enforcement
   - timestamp canonicalization
   - Structure.stateCommitSafety
   - Reaction record/normalization when Community-safe
   - Community state accounting
   ↓
state/content result
   ↓
Output Compat safe envelope boundary confirmation
   ↓
existing persistence / representation / host path
```

Important current-source facts:

- `Output Compat` is compatibility/canonicalization, not semantic Source Intelligence authority.
- `Structure` is judge-only and currently validates response/output integrity, not arbitrary epistemic truth.
- `Output Finalize` composes deterministic prepared-output to committed-state/content transitions and has no I/O ownership of its own.
- `Reaction` owns RT numbering/history maxima.
- `Community` owns Community parsing/platform taxonomy.
- `Representation` owns host/canonical/Fresh identity provenance, not world/source semantic provenance.

## 5. Current owner map for 3M-3

| Concern | Current owner | 3M-3 implication |
| --- | --- | --- |
| runtime mode / expected Community count | Lifecycle | consume; never duplicate |
| current source root/parent/depth | Lineage | consume existing source identity |
| short-C source relationship | Handoff | consume existing receipt / do not create second registry |
| exact root/source request mapping | Evidence | consume source refs / no second history scan |
| Community blocks/platform taxonomy | Community | legacy compatibility only; not assertion truth |
| RT grammar/history | Reaction | not part of new assertion authority |
| response shape/state-commit safety | Structure | remain existing judge; do not absorb semantic claim checker casually |
| output envelope canonicalization | Output Compat | transport compatibility only |
| deterministic output/state transition | Output Finalize | future integration seam only after validator is proven |
| host/canonical/Fresh identity | Representation | must not be reused as semantic source truth |
| persistence mechanics | Store | first 3M-3 design should require none |
| prompt serialization | Prompt | first 3M-3 design should require no prompt change |
| orchestration | Session | later integration consumer, not assertion-policy owner |

## 6. Exact semantic gap

Production has no current structured object that can represent:

```text
bounded source semantic content
+ assertion mode
+ source/provenance reference
+ declared exposure basis
+ mechanically derived 3M-2 disposition
```

Current `<COMMUNITY>` is natural-language presentation and cannot safely be treated as that object.

Therefore:

```text
legacy Community prose
!=
trusted structured assertion source
```

and:

```text
current Structure PASS
!=
semantic assertion exposure PASS
```

## 7. Producer problem: three possible lanes

### Option A · Parse legacy Community prose into assertions

Rejected.

Would require regex/heuristic/embedding/LLM semantic extraction from already-rendered natural language and violates the 3M-2 non-extraction boundary.

```text
REJECT · LEGACY_PROSE_ASSERTION_EXTRACTION
```

### Option B · Add an in-band model sidecar block immediately

Examples include a sibling JSON/tag block or metadata embedded into model-visible output.

Potential benefit:

- one main-model generation could produce visible prose and structured semantics together.

Current blast radius:

```text
Prompt contract
Output Compat envelope/tail handling
Structure Knowledge-final/output-count rules
Output Finalize canonical content
Representation/Edit Reconcile fingerprints
host-visible assistant history
Deferred Mirror / canonical-vs-host identity
future context re-entry
visible-output stripping/quarantine semantics
```

Because current `prepareOutput()` does not generically strip arbitrary new tags, a new in-band sidecar transport is not presentation-neutral by default.

Disposition:

```text
DEFER · RUNTIME_SIDECAR_TRANSPORT
```

It needs a dedicated transport/integration amendment after the semantic schema/validator is independently proven.

### Option C · Transport-independent structured draft + pure validator

This lane defines the semantic object and validation behavior independently of how a future model/runtime supplies it.

It can be exercised with static fixtures and the existing Exposure corpus without changing production request/output bytes.

Disposition:

```text
SELECTED FIRST 3M-3 DESIGN SEAM
```

Working target:

```text
DIRECT_B_ROOT_LIVE_REACTION_STRUCTURED_SIDECAR_VALIDATION
```

First executable mode:

```text
OFFLINE / SHADOW_STRUCTURED_ONLY
```

## 8. Narrowest connected semantic flow

The first design should freeze this flow only:

```text
structured source-assertion draft
   ↓
source/provenance ref shape check
   ↓
claim-specific evidence compatibility
   ↓
3M-2 policy evaluation
   ↓
validator-derived assertion disposition
   ↓
validated/quarantined semantic sidecar receipt
   ↓
NO renderer yet
NO persistence
NO prompt injection
NO output/history mutation
```

A future active producer/transport can plug into the draft boundary only after a separate integration contract.

## 9. Required authority joins

3M-3 must validate joins, not merely field shape.

At minimum:

```text
family
↔ first-slice family authorization

sourceAuthorityRef.kind
↔ 3M-1 / 3M-2 authority-class eligibility

sourceAuthorityRef structural identity
↔ existing Handoff/Evidence receipt shape when required

assertionMode
↔ compatible exposure-basis class

exposure-basis class
↔ 3M-2 policy disposition

validator result
↔ rendered/consumer eligibility later
```

Canonical guard:

```text
VALID SOURCE REF
!=
VALID BASIS FOR EVERY ASSERTION MODE
```

Example:

```text
HANDOFF_EVIDENCE
→ can prove source relationship
→ cannot alone authorize CONFIRMED_FACT audience exposure
```

## 10. Semantic-proof boundary

The validator may deterministically prove:

```text
schema shape
enum legality
bounded field presence
source-ref structural compatibility
basis-type / assertion-mode compatibility
3M-2 ALLOW / DENY / HOLD result
no forbidden authority-class promotion
```

It cannot, without a separately proven semantic producer, prove:

```text
the natural-language proposition truly means what its declared mode says
that the cited source span semantically entails the proposition
that a model-declared public-disclosure label is factually correct
that an inference is reasonable rather than merely syntactically labeled
```

Therefore future evidence language must preserve:

```text
STRUCTURED_VALIDATION_PASS
!=
MODEL_SEMANTIC_COMPLIANCE_PASS
```

## 11. Persistence boundary

First 3M-3 design recommendation:

```text
persistent schema delta = 0
SnapshotStore new key = 0
source database = NONE
source ledger = NONE
```

Reason:

- no current consumer requires cross-turn durable sidecar state;
- 3M-4 presentation can initially consume current-output validated data;
- 3M-6 provenance/invalidation activates only if a concrete derived object proves existing refs insufficient;
- 3M-7 owns controlled context/source-history re-entry.

If later persistence becomes necessary, schema meaning/migration and host read-your-write rules require a new contract.

## 12. Context/history boundary

First design must enforce conceptually:

```text
sidecar receipt
→ no ordinary model-context re-entry
→ no host-history rewrite
→ no additional assistant-message body
```

The existing legacy `<COMMUNITY>` history behavior remains unchanged until 3M-7.

This avoids creating a second hidden history stream while compatibility output still exists.

## 13. Request identity / I/O / performance preservation

First structured-validator work must target:

```text
request identity delta = 0
model calls delta = 0
network calls delta = 0
history scans delta = 0
persistent writes delta = 0
prompt bytes delta = 0
visible output bytes delta = 0
new timers/workers = 0
```

Static/offline validation may use repository fixtures/scripts only.

## 14. Validation architecture choice

RCR-C09 and current architecture favor a narrow judge rather than a new writer.

Preferred design direction:

```text
new semantic sidecar draft/value object
+
new pure source-assertion validator
```

The validator must remain judge-only:

```text
NO world-state mutation
NO Handoff/Evidence mutation
NO Community rewrite
NO reaction-number repair
NO prompt compilation
NO persistence
NO renderer DOM/CSS
```

Whether the validator becomes a new physical Validation-layer module or a pure sub-owner under a later source-projection module belongs to the 3M-3 design transaction. The impact scope does not pre-authorize a module name.

## 15. Representation boundary

Do not confuse two provenance systems:

```text
Representation provenance
= CANONICAL / HOST_RAW / FRESH_CHAT identity relations

Source semantic provenance
= what source/event/exposure basis supports a derived assertion
```

3M-3 must not reuse Representation fingerprints as if they prove semantic assertion support.

Existing Handoff/Evidence/Lineage refs remain the preferred source identity basis for the first slice.

## 16. Structure boundary

Current Structure remains the existing output/state-commit judge.

Do not expand `Structure.validateStructure()` into an arbitrary natural-language fact checker.

The new sidecar validator may later contribute one bounded integration disposition, but first design should prove itself independently.

Potential later join:

```text
legacy structure safe
AND structured sidecar required by activated feature
AND sidecar validation acceptable
→ future feature-specific render/commit path eligible
```

This is not authorized in the first offline design.

## 17. Test/evidence map

The concrete 3M-3 design should declare at least these fixture families:

### Schema/mechanical

- legal minimum LIVE_REACTION direct-B-root draft;
- unknown field / invalid enum;
- missing authority ref;
- forbidden authority class (`LEGACY_MODE_CONTEXT` / `UNRESOLVED_LEGACY_C`) for first-slice assertions;
- duplicate/ambiguous assertion identity if identity exists;
- oversized/unbounded raw-source-body embedding rejected;
- mutation-shaped fields such as model-owned `isValid` ignored/rejected.

### Claim/evidence compatibility

- CONFIRMED_FACT + broadcast exposure → ALLOW;
- CONFIRMED_FACT + Knowledge only → DENY;
- CONFIRMED_FACT + prior Community only → DENY;
- ATTRIBUTED_SOCIAL + source Community context → ALLOW;
- INFERENCE_OPINION + visible cue → ALLOW;
- unsupported combinations → HOLD.

These can reuse the existing 12-case Exposure semantic corpus as oracle inputs without claiming model compliance.

### Boundary regressions

- no prompt byte change;
- no visible-output change;
- no persistent-state key/version change;
- no additional model/network/storage calls;
- no history scan;
- latest/install production unchanged in design/offline work;
- architecture dependency rules preserved if/when a module is later implemented.

## 18. Release/materializer surface

This impact-scope transaction is docs-only and has no shipped-byte effect.

A future offline evaluator/script on `main` is also not automatically a product release.

Runtime integration, if later authorized, must re-preflight from then-current production and follow the normal SimCore release sequence. Do not assign a 3.0M semver identity from this design checkpoint.

## 19. Explicit defers

```text
DEFER · RUNTIME_SIDECAR_TRANSPORT
DEFER · MODEL_STRUCTURED_OUTPUT_PROMPT_CONTRACT
DEFER · SIDECAR_STRIP_FROM_VISIBLE_OUTPUT
DEFER · SIDECAR_PERSISTENCE
DEFER · SOURCE_HISTORY_REENTRY
DEFER · SOURCE_RENDERER
DEFER · BOARD_SOCIAL_FEED_NEWS_PUBLIC_KNOWLEDGE_SCHEMA
DEFER · MULTI_B_SOURCE_EXPOSURE_WINDOW
DEFER · GENERIC_PROVENANCE_LEDGER
```

No defer blocks the offline schema/validator design.

## 20. Selected next design target

```text
3M3_FIRST_DESIGN_TARGET
= DIRECT_B_ROOT_LIVE_REACTION_STRUCTURED_SIDECAR_VALIDATION

execution authority
= OFFLINE / SHADOW_STRUCTURED_ONLY

runtime producer transport
= NOT SELECTED
```

The dedicated design may now freeze:

1. the minimum draft assertion/sidecar schema;
2. which fields are model/producer-declared versus validator-derived;
3. claim-specific evidence compatibility;
4. deterministic 3M-2 policy integration;
5. validator dispositions and quarantine behavior;
6. bounded fixtures and offline evaluator shape;
7. explicit transport/persistence non-goals.

## 21. Final disposition

```text
3M_3_IMPACT_SCOPE = COMPLETE
CURRENT_RUNTIME_STRUCTURED_SOURCE_SIDECAR = NONE
LEGACY_COMMUNITY_ASSERTION_EXTRACTION = REJECTED
IN_BAND_RUNTIME_TRANSPORT_AS_FIRST_STEP = DEFERRED
FIRST_DESIGN_SEAM = OFFLINE / SHADOW STRUCTURED SIDECAR + PURE VALIDATOR
PERSISTENT_SCHEMA = NONE
PROMPT / OUTPUT BYTES = UNCHANGED
PRODUCTION / RELEASE = UNCHANGED
IMPLEMENTATION AUTHORITY = NONE
```
