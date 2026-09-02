# SimCore Post-3.0M PUBLIC_KNOWLEDGE PK-1 Settlement Context Authority Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PK-1 IMPACT SCOPE FROZEN · DESIGN-ONLY · TRUSTED SETTLEMENT PRODUCER SEAM SELECTED · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-1 · SETTLEMENT CONTEXT AUTHORITY · IMPACT SCOPE**

## 0. Purpose

PK-0 froze the PUBLIC_KNOWLEDGE family and intentionally left one runtime-readiness blocker unresolved:

```text
WHO MAY PRODUCE PublicKnowledgeSettlementContextV1?
```

PK-1 scopes that authority without implementing it.

The design must preserve:

```text
CANONICAL WORLD SUPPORT
!=
EXPOSURE / PUBLIC ASSERTION ELIGIBILITY
!=
PUBLIC-REFERENCE SETTLEMENT
```

and must not create a second truth database.

## 1. Selected authority seam

The narrowest safe seam is a new current-projection, stateless policy adapter:

```text
PublicKnowledgeSettlementContextComposer
```

It is conceptually owned by the Source Intelligence policy layer.

It consumes only bounded trusted machine references from existing owners and produces bounded settlement-basis context for the PUBLIC_KNOWLEDGE validator.

It does not own world truth.

It does not own final PUBLIC_KNOWLEDGE disposition.

Canonical split:

```text
Frame / Continuity / Time
→ fact/currentness authority where already owned

Evidence / Lineage / Handoff
→ exact support bindings and trusted public-record evidence bindings

Exposure
→ public/source assertion eligibility

Settlement Context Composer
→ mechanical current-turn join/classification only

PUBLIC_KNOWLEDGE Validator
→ final reference state and disposition

Presentation Renderer
→ status-preserving UI only
```

## 2. Why a composer instead of a new store

Forbidden architecture:

```text
new global settlement DB
persistent public-fact registry
wiki truth cache
history-derived consensus engine
model-authored settlement flag
```

The composer must be:

```text
STATELESS
CURRENT_PROJECTION_ONLY
BOUNDED
DETERMINISTIC OVER TRUSTED INPUTS
NO MODEL CALL
NO NETWORK
NO HISTORY SCAN
NO PERSISTENT READ/WRITE
NO DERIVED-FAMILY SEARCH
```

If required trusted inputs do not exist, the result is HOLD/UNKNOWN rather than guessed settlement.

## 3. Existing owners are not collapsed

PK-1 must not redefine existing authority.

### Canonical/currentness owners

Existing Frame / Continuity / Time / Evidence responsibilities remain authoritative for facts and current narrative state where already defined.

### Exposure owner

3M-2 remains the owner of whether an assertion may be publicly/source asserted.

### Source support owner

Lineage / Handoff / Evidence remain the owner of current source binding and exact support identity.

### Settlement consumer owner

PUBLIC_KNOWLEDGE validator remains the only component that converts trusted settlement basis + assertion mode + exposure result into final reference disposition.

## 4. Required trusted public-record evidence boundary

Canonical fact support plus exposure is not sufficient by itself to claim settlement.

```text
CANONICAL TRUE + PUBLICLY EXPOSED
!=
AUTOMATICALLY SETTLED
```

Therefore the composer additionally requires trusted public-record standing evidence bound to the current assertion/target/source authority.

That evidence must be emitted through an Evidence-owned machine binding or an explicitly authorized equivalent upstream evidence adapter.

The PUBLIC_KNOWLEDGE family may consume such evidence, but may not invent it from prose.

## 5. First accepted basis classes

PK-1 selects the first conceptual settlement-basis classes:

```text
ESTABLISHED_PUBLIC_RECORD_BASIS
ATTRIBUTED_PUBLIC_RECORD_BASIS
CONTESTED_PUBLIC_RECORD_BASIS
CORRECTED_PUBLIC_RECORD_BASIS
WITHDRAWN_PUBLIC_RECORD_BASIS
```

Absence, incompatible binding, or ambiguity produces no accepted basis.

Conceptual fallback:

```text
NO_TRUSTED_SETTLEMENT_BASIS
→ UNKNOWN / HOLD
```

Exact runtime enums remain PK-2 / implementation work.

## 6. ESTABLISHED_PUBLIC_RECORD_BASIS

This is the only first-scope basis eligible to support ordinary settled-reference treatment.

It requires bounded trusted evidence for all applicable joins, including:

```text
current source support
current target binding
current canonical/factual support
public assertion eligibility
explicit public-record standing evidence
```

It must not be derived merely from:

```text
claim age
source prestige
NEWS count
social engagement
model confidence
repeated mention
```

## 7. ATTRIBUTED_PUBLIC_RECORD_BASIS

Represents that a bounded attributable public claim/record exists without settlement of its underlying proposition.

It may carry a trusted attribution label when one exists.

It does not require or imply that the attributed proposition is canonically true.

```text
TRUSTED ATTRIBUTION EXISTENCE
!=
ATTRIBUTED CLAIM TRUTH
```

## 8. CONTESTED_PUBLIC_RECORD_BASIS

Contest status must come from explicit trusted public-record evidence.

Forbidden discovery methods:

```text
scan prior NEWS
count disagreeing BOARD posts
compare SOCIAL_FEED sentiment
keyword-match contradictions
infer controversy from high engagement
```

The context may consume a bounded trusted contest relation, but PUBLIC_KNOWLEDGE does not discover that relation itself.

If multiple incompatible standing signals are supplied without an explicit trusted resolution:

```text
HOLD_AMBIGUOUS_PUBLIC_RECORD_STANDING
```

## 9. CORRECTED_PUBLIC_RECORD_BASIS

Correction requires an explicit trusted correction relation.

Conceptually it must bind:

```text
current corrected statement/support
+
record being superseded/corrected
+
current source/target authority
```

Correction does not create revision history.

It means only that the current snapshot has a trusted corrected public-record relation.

Forbidden:

```text
newer-looking text
→ correction

later NEWS story
→ correction

model says "correction"
→ correction
```

## 10. WITHDRAWN_PUBLIC_RECORD_BASIS

Withdrawal/retraction requires explicit trusted withdrawal evidence bound to the attributable prior public record.

Silence, disappearance, low engagement, or elapsed time are not withdrawal evidence.

A withdrawn claim may be represented as a withdrawn public record but must not survive as a current settled fact.

## 11. No multi-state synthesis in V1

PK-1 first scope requires one resolved primary public-record standing per basis entry.

If the current trusted evidence simultaneously implies incompatible V1 states, such as unresolved `CORRECTED + CONTESTED`, the composer does not invent precedence.

Default:

```text
AMBIGUOUS STANDING
→ no accepted basis
→ HOLD
```

A later checkpoint may intentionally support compound epistemic states if a real consumer requires them.

## 12. Conceptual context output

PK-1 does not freeze the exact PK-2 schema, but the context must be able to bind at least:

```text
basisRef
basisClass
sourceAuthorityRef
targetRef
trusted support references
trusted attribution label?  // only when upstream-authorized
```

The composer must not emit producer-owned final fields such as:

```text
safeToRender
canonical
isTrue
finalDisposition
```

The PUBLIC_KNOWLEDGE validator derives final reference state later.

## 13. Exact-join requirement

Every accepted basis must exact-join current trusted authority.

```text
basis sourceAuthorityRef != current sourceAuthorityRef
→ invalid basis

basis targetRef != current targetRef
→ invalid basis

unknown support reference
→ invalid basis
```

No fuzzy title matching, handle matching, paragraph similarity, or historical search is allowed.

## 14. Lifetime and invalidation

The settlement context is current-projection-only.

```text
context lifetime = current source job / current target
persistence = none
cross-turn reuse = none
context re-entry = none
```

When current source/target support changes, old context is not repaired or partially reused.

```text
CURRENT SUPPORT CHANGED
→ old settlement context stale
→ current PUBLIC_KNOWLEDGE projection invalid/recomputed from current authority
```

## 15. Derived families are not accepted evidence origins

First-scope accepted evidence does not originate from:

```text
LIVE_REACTION output
BOARD output
NEWS output
SOCIAL_FEED output
PUBLIC_KNOWLEDGE output
```

The same underlying canonical/public event may independently feed several families, but one derived family does not become another family's settlement authority.

Any future derived-to-derived settlement propagation is Candidate C C5 territory and requires a separate design.

## 16. Interaction with SOCIAL_FEED metrics

The reserved SOCIAL_FEED metric capability does not affect settlement authority.

```text
likeCount
viewCount
repostCount
replyCount
followerCount
trendRank
viralityScore
```

may later be valid source-local social semantics, but:

```text
HIGH SOCIAL METRIC
!=
SETTLEMENT EVIDENCE
```

This remains true even when the metric values themselves are legitimately simulated or observed.

## 17. Candidate C

PK-1 does not activate Candidate C.

```text
persistent settlement registry = no
cross-turn basis identity = no
revision history = no
cross-family lineage = no
future context re-entry = no
```

Current settlement basis refs are projection-local trusted bindings.

## 18. Runtime-readiness impact

PK-1 can close the architectural owner seam, but does not authorize implementation.

Future runtime still requires at least:

```text
actual upstream machine producer for trusted public-record evidence
actual context transport
PK-2 exact sidecar/validator schema
hard caps
host integration
real validation evidence
```

## 19. BLOCKER classification

```text
BLOCKER · SETTLEMENT_COMPOSER_BECOMES_SECOND_WORLD_TRUTH_OWNER
BLOCKER · CANONICAL_PLUS_EXPOSURE_AUTO_SETTLES_WITHOUT_PUBLIC_RECORD_BASIS
BLOCKER · MODEL_OR_RENDERER_MINTS_SETTLEMENT_BASIS
BLOCKER · NEWS_OR_SOCIAL_REPETITION_USED_AS_SETTLEMENT_BASIS
BLOCKER · CORRECTION_WITHOUT_TRUSTED_CORRECTION_RELATION
BLOCKER · CONTEST_WITHOUT_TRUSTED_CONTEST_RELATION
BLOCKER · WITHDRAWAL_INFERRED_FROM_SILENCE_OR_AGE
BLOCKER · STALE_BASIS_REUSED_AFTER_SOURCE_OR_TARGET_CHANGE
```

## 20. WATCH classification

```text
WATCH · ESTABLISHED_PUBLIC_RECORD_BASIS_REQUIRES_EXPLICIT_UPSTREAM_STANDING_SIGNAL
WATCH · ATTRIBUTION_LABEL_CAN_CREATE_SOURCE_IDENTITY_CLAIM
WATCH · COMPOUND_CORRECTED_AND_CONTESTED_STATE_DEFERRED
WATCH · PUBLIC_RECORD_EVIDENCE_ADAPTER_MUST_NOT_GROW_INTO_PERSISTENT_REGISTRY
```

## 21. DEFER classification

```text
DEFER · COMPOUND_EPISTEMIC_STATES
DEFER · MULTI_B_SETTLEMENT_CONSENSUS
DEFER · DERIVED_SOURCE_CONSENSUS
DEFER · CROSS_TURN_SETTLEMENT_HISTORY
DEFER · REVISION_LINEAGE
DEFER · NETWORK_PUBLIC_RECORD_LOOKUP
```

## 22. Selected next design seam

After this impact scope, PK-1 detailed design should freeze:

```text
PublicKnowledgeSettlementContextComposer ownership
accepted basis input requirements
basis construction decision table
ambiguity / fail-closed rules
correction / contest / withdrawal relation requirements
context status / invalidation semantics
```

It must not implement runtime code.
