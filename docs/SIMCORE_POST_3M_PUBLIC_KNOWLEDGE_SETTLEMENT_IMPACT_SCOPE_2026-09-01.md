# SimCore Post-3.0M PUBLIC_KNOWLEDGE Settlement Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · PUBLIC_KNOWLEDGE SETTLEMENT SEAM SELECTED · DESIGN-ONLY · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · SOURCE FAMILY EXPANSION · PUBLIC_KNOWLEDGE · SETTLEMENT**

## 0. Purpose

This document scopes the user-selected post-3.0M follow-up lane:

```text
PUBLIC_KNOWLEDGE settlement
```

It does not implement runtime code, prompt/output transport, persistence, DOM/CSS, source history, target-host execution, release publication, S7/v0.70.3 changes, or `release-simcore` mutation.

The design question is not:

```text
How do we render a wiki-looking card?
```

It is:

```text
When may a public/exposed assertion be presented as part of a public-reference document,
and how must unsettled, contested, corrected, or withdrawn public material remain visibly non-settled?
```

Canonical boundary:

```text
PUBLICLY ELIGIBLE
!=
PUBLIC-REFERENCE SETTLED
```

## 1. Authority chain

This scope reuses and does not replace:

```text
Lineage / Handoff / Evidence
→ current source support

3M-2 Exposure Policy
→ whether an assertion may be publicly/source asserted

Frame / Time / Continuity
→ canonical/current narrative facts and timing where already owned

3M-3 Validator pattern
→ producer is untrusted; validator derives disposition

3M-4 Presentation Renderer
→ semantic payload and DOM/CSS remain separated

3M-6 Current Projection Support Gate
→ whole-projection invalidation when source authority becomes stale

3M-7 Re-entry Firewall
→ no structured source memory or automatic future prompt injection

3M-8 NEWS
→ publication maturity is not settlement

3M-9 Integration
→ source-irrelevant turns remain dormant; families do not become truth authority for one another
```

Reference input:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_NAMUWIKI_1_8_0_2026-09-01.md
```

The Namuwiki reference strongly supports a public collaborative encyclopedia projection, semantic-document / renderer separation, and document-navigation-as-projection-replacement. It does not provide a complete universal settlement policy and therefore remains reference-only.

## 2. The missing semantic axis

Existing 3.0M families answer different questions:

```text
LIVE_REACTION
→ may this audience react to this exposed information?

BOARD
→ may this bounded public/social thread assert or discuss this information?

NEWS
→ may this source publish this kind/detail of report now?
```

PUBLIC_KNOWLEDGE introduces a stronger question:

```text
may this assertion occupy a public-reference document,
and under what settlement status?
```

This must be orthogonal to both exposure and world truth.

```text
EXPOSURE
!=
SETTLEMENT

SETTLEMENT
!=
CANONICAL WORLD TRUTH
```

A convincing encyclopedia layout cannot grant truth authority.

## 3. NEWS repetition is not settlement

The most important anti-laundering rule is:

```text
NEWS EXISTS
!=
PUBLIC KNOWLEDGE SETTLED
```

Also forbidden:

```text
many NEWS stories
→ settled

many BOARD posts
→ settled

high reaction count
→ settled

source appears authoritative
→ settled

old claim survived many turns
→ settled
```

No repetition count, popularity metric, presentation style, age heuristic, or derived-family agreement may independently upgrade settlement.

If a future product requirement wants derived-source consensus to influence settlement, that is a separate cross-family provenance design and would activate Candidate C pressure rather than silently enter V1.

## 4. First selected seam

The narrowest first seam is:

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
```

First structural scope:

```text
mode = C
family = PUBLIC_KNOWLEDGE
source root = direct B root
sourceAuthorityRef = HANDOFF_EVIDENCE
lifetime = current projection only
persistence = none
automatic re-entry = none
navigation history = none
```

Not authorized by this scope:

```text
A-root PUBLIC_KNOWLEDGE
INLINE_C ancestry
generic multi-source consensus
NEWS-derived settlement
BOARD-derived settlement
cross-turn document identity
persistent article revision
```

## 5. Settlement must be validator-owned

The main model / future semantic producer may propose document content, but must not self-certify:

```text
isSettled
isPublicReference
isContested
isCorrected
isWithdrawn
safeToRender
```

Canonical pattern:

```text
UNTRUSTED DOCUMENT DRAFT
+
TRUSTED CURRENT SOURCE AUTHORITY
+
3M-2 EXPOSURE CONTEXT
+
TRUSTED SETTLEMENT CONTEXT
        ↓
PUBLIC_KNOWLEDGE VALIDATOR
        ↓
mechanically derived reference state
```

This follows the common rule already adopted by 3M-3:

```text
MODEL DECLARATION
!=
VALIDATOR VERDICT
```

## 6. Trusted settlement context is a new required producer boundary

Current 3.0M owners do not yet expose one universal machine-checkable object that means:

```text
this claim is settled enough for public-reference projection
```

Therefore PUBLIC_KNOWLEDGE must not fake settlement from prose or NEWS history.

A future runtime would require a trusted input conceptually like:

```text
PublicKnowledgeSettlementContextV1
```

Its producer must be explicitly authorized before runtime implementation.

The settlement context may summarize already-owned canonical/public evidence, but it must not become a second world-truth owner.

Canonical rule:

```text
SETTLEMENT CONTEXT
= PUBLIC-REFERENCE ELIGIBILITY / STATUS EVIDENCE

SETTLEMENT CONTEXT
!=
WORLD CANON DATABASE
```

If trusted settlement evidence is unavailable:

```text
HOLD_UNKNOWN_SETTLEMENT
```

Fail closed; do not guess.

## 7. First settlement vocabulary

The first design should support at least these validator-derived reference states:

```text
SETTLED_PUBLIC_REFERENCE
ATTRIBUTED_BUT_NOT_SETTLED
CONTESTED_PUBLIC_RECORD
CORRECTED_CURRENT_RECORD
WITHDRAWN_OR_RETRACTED_RECORD
UNKNOWN_SETTLEMENT
```

Exact implementation names may be refined in the full design, but these semantic distinctions are required.

### 7.1 SETTLED_PUBLIC_REFERENCE

The assertion may be presented as ordinary public-reference content.

This does not make the derived document canonical world truth.

### 7.2 ATTRIBUTED_BUT_NOT_SETTLED

The public record contains the claim, but SimCore must preserve attribution / unsettled status.

It must never be rendered as an unqualified settled fact.

### 7.3 CONTESTED_PUBLIC_RECORD

Trusted settlement context indicates an active public dispute or materially conflicting public record.

The document may represent the dispute only with an explicit contested state.

### 7.4 CORRECTED_CURRENT_RECORD

A current corrected public-reference statement is available.

V1 may render the current corrected state without requiring persistent access to the old document revision.

### 7.5 WITHDRAWN_OR_RETRACTED_RECORD

A prior public claim is withdrawn/retracted.

It must not be rendered as a current settled fact. If represented, it must remain explicitly historical/withdrawn.

### 7.6 UNKNOWN_SETTLEMENT

Insufficient trusted settlement evidence.

Disposition:

```text
HOLD
```

## 8. Settlement state does not replace 3M-2 assertion mode

Existing assertion modes remain authoritative:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

Settlement state is another axis.

Examples:

```text
CONFIRMED_FACT
+ SETTLED_PUBLIC_REFERENCE
→ ordinary reference fact candidate

ATTRIBUTED_SOCIAL
+ ATTRIBUTED_BUT_NOT_SETTLED
→ attributed public-record candidate

ATTRIBUTED_SOCIAL
+ CONTESTED_PUBLIC_RECORD
→ contested-record candidate
```

Forbidden:

```text
ATTRIBUTED_SOCIAL
+ SETTLED label invented by model
→ confirmed fact
```

## 9. Public reference may contain non-settled material only if status-bearing

A useful public document can mention rumors, controversies, disputed interpretations, and corrections.

The safe abstraction is not:

```text
PUBLIC_KNOWLEDGE contains settled facts only
```

but:

```text
PUBLIC_KNOWLEDGE may contain multiple public-record states,
provided the validator preserves each status and the renderer cannot erase it.
```

Thus:

```text
UNSETTLED / CONTESTED / WITHDRAWN
MAY BE REPRESENTABLE

but

MUST NOT APPEAR AS SETTLED
```

## 10. Document shape pressure

The Namuwiki reference demonstrates a rich article grammar. The first SimCore V1 should remain much narrower.

Candidate first semantic document shape:

```text
PublicKnowledgeDocumentDraftV1
├─ targetRef / current document target authority
├─ title
├─ lead assertions[]
└─ sections[]
   ├─ heading
   └─ assertions[]
```

Not required in V1:

```text
infobox
categories
backlinks
recent documents
related documents
complete member enumeration
footnote graph
remote media
user-authored arbitrary templates
```

Reason:

```text
FIRST PROVE SETTLEMENT
THEN EXPAND DOCUMENT GRAMMAR
```

## 11. Title and headings are semantic policy-bearing fields

A wiki title or section heading can leak private information even if body assertions are filtered.

Therefore:

```text
title
section heading
lead/body assertions
```

must all be treated as semantic fields rather than harmless presentation labels.

Forbidden:

```text
body private assertion quarantined
but
heading = "Secret Disease"
→ render
```

## 12. Partial document behavior requires explicit completeness status

Unlike NEWS story-atomic validation, a public-reference document may contain several independent sections.

The safer first direction is hierarchical validation:

```text
invalid title / target
→ whole document quarantined

invalid section heading
→ whole section quarantined

invalid assertion
→ assertion quarantined
```

If any semantic material is quarantined while the document still renders, the validator must derive a completeness state such as:

```text
COMPLETE_VALIDATED_PROJECTION
PARTIAL_VALIDATED_PROJECTION
```

This status means only that some candidate material was omitted by validation. It must not expose the contents or count/details of hidden private assertions to normal UI unless separately safe.

## 13. No completeness fantasy

The Namuwiki reference sometimes requests exhaustive category enumeration. SimCore must not transfer that rule.

Forbidden:

```text
ALL members
ALL related documents
complete world encyclopedia
```

unless completeness is separately proven.

First default:

```text
BOUNDED REPRESENTATIVE PUBLIC-REFERENCE PROJECTION
```

A document may be valid without claiming exhaustive coverage.

## 14. Correction and withdrawal are snapshot semantics in V1

V1 remains current-projection-only.

It may show:

```text
current corrected public-reference statement
or
current public record that a prior claim was withdrawn
```

It does not support:

```text
find old article revision
mutate old article
revision diff
revision history
restore revision
```

Those would create durable document lineage / mutation pressure and should activate Candidate C conditions first.

## 15. Candidate C impact

The first PUBLIC_KNOWLEDGE design can remain below C1-C8 if it is strictly snapshot-only:

```text
cross-turn document survival = no
stable article identity = no
item mutation = no
append/merge = no
derived-from-derived settlement = no
future context re-entry = no
partial descendant survival across source replacement = no
async semantic target = no
```

Therefore first-slice verdict:

```text
CANDIDATE_C = NOT ACTIVATED
```

Candidate C pressure becomes real if later design adds:

```text
persistent document identity
revision history
cross-turn search/navigation
stored backlinks
NEWS→PUBLIC_KNOWLEDGE propagation
item-level correction mutation
future prompt re-entry
```

## 16. Document navigation is deferred from settlement V1

The Namuwiki reference shows a strong pattern:

```text
navigation intent
→ replace current document projection
```

That is promising, but settlement V1 should not simultaneously solve:

```text
search
internal links
related docs
recent docs
history stack
```

First scope:

```text
CURRENT TARGET
→ ONE CURRENT PUBLIC_KNOWLEDGE PROJECTION
```

Later same-request projection replacement may remain Candidate-C-free if no durable identity/history is introduced, but it needs its own target-authority contract.

## 17. Presentation target

Likely presentation adapter:

```text
PUBLIC_REFERENCE_DOCUMENT_V1
```

Conceptual grammar:

```text
public-reference document
├─ title
├─ lead
└─ sections
   ├─ heading
   └─ status-bearing validated assertions
```

Presentation may derive:

```text
table of contents
heading numbering
collapse state
responsive layout
```

Those remain presentation-only and non-canonical.

Renderer must not hide `ATTRIBUTED`, `CONTESTED`, `CORRECTED`, or `WITHDRAWN` status in a way that visually upgrades claims into settled facts.

## 18. Media remains isolated

No remote images, generated image URLs, external fact lookup, or network enrichment are required for settlement correctness.

```text
SEMANTIC PUBLIC-REFERENCE VALIDITY
!=
MEDIA MATERIALIZATION SUCCESS
```

Media remains a later external-materialization lane.

## 19. Performance / dormancy boundary

PUBLIC_KNOWLEDGE inherits 3M-9:

```text
source-irrelevant turns
→ zero source semantic burden
```

For an active V1 projection, work should be bounded by the current document only.

No:

```text
scan all prior NEWS
scan all prior BOARD
scan old public documents
count repeated public claims
retrieve archive
```

may be required merely to derive settlement.

This is another reason settlement evidence must come from a trusted bounded context rather than ad-hoc history mining.

## 20. Cross-family boundary

PUBLIC_KNOWLEDGE must not consume other derived family outputs as truth authority in V1.

Forbidden:

```text
NEWS output → settlement proof
BOARD output → settlement proof
LIVE_REACTION output → settlement proof
```

A future attributed derived-source chain would be a separate cross-family propagation design and may activate Candidate C C5.

## 21. Non-impact boundaries

This follow-up must not change:

```text
A/B/C mode semantics
first-major LIVE_REACTION / BOARD / NEWS contracts
legacy <COMMUNITY> behavior
3M-7 zero structured re-entry
3M-10 runtime-readiness gate status
S7 / v0.70.3 lane
current production release
release-simcore
```

## 22. BLOCKER / WATCH / DEFER classification

```text
BLOCKER · PUBLIC_KNOWLEDGE_WITHOUT_TRUSTED_SETTLEMENT_CONTEXT
BLOCKER · NEWS_REPETITION_PROMOTES_SETTLEMENT
BLOCKER · DERIVED_FAMILY_OUTPUT_BECOMES_SETTLEMENT_AUTHORITY
BLOCKER · MODEL_SELF_CERTIFIES_SETTLEMENT
BLOCKER · TITLE_OR_HEADING_BYPASSES_EXPOSURE_SETTLEMENT_POLICY
BLOCKER · RENDERER_HIDES_NON_SETTLED_STATUS
BLOCKER · PUBLIC_KNOWLEDGE_BECOMES_CANONICAL_WORLD_TRUTH
BLOCKER · SOURCE_HISTORY_SCAN_REQUIRED_FOR_SETTLEMENT

WATCH · PARTIAL_DOCUMENT_OMISSION_CAN_CHANGE_INTERPRETATION
WATCH · CORRECTION_WITHOUT_REVISION_HISTORY_MUST_REMAIN_SNAPSHOT_SEMANTICS
WATCH · CONTESTED_STATUS_REQUIRES_TRUSTED_BASIS_NOT_MODEL RHETORIC

DEFER · DOCUMENT_SEARCH
DEFER · INTERNAL_LINK_NAVIGATION
DEFER · RELATED / RECENT DOCUMENTS
DEFER · REVISION_HISTORY
DEFER · BACKLINK_GRAPH
DEFER · CATEGORY_COMPLETENESS
DEFER · PUBLIC_REFERENCE_MEDIA
DEFER · CROSS_FAMILY_SETTLEMENT_PROPAGATION
DEFER · PERSISTENT_DOCUMENT_IDENTITY
DEFER · FUTURE_CONTEXT_REENTRY
```

## 23. Selected full-design seam

The next design transaction should freeze:

```text
DIRECT_B_ROOT_PUBLIC_KNOWLEDGE_SETTLEMENT_V1
```

with responsibilities limited to:

```text
public-reference document semantic shape
trusted settlement context contract
validator-derived settlement state
hierarchical document validation
partial-projection completeness semantics
public-reference presentation grammar
snapshot-only lifetime
zero persistence / zero re-entry
```

## 24. Frozen verdict

```text
PUBLIC_KNOWLEDGE_IMPACT_SCOPE = COMPLETE
FIRST_SCOPE = DIRECT_B_ROOT_MODE_C
SETTLEMENT = NEW SEPARATE POLICY AXIS
SETTLEMENT_OWNER = VALIDATOR_OVER_TRUSTED_SETTLEMENT_CONTEXT
NEWS_REPETITION_SETTLEMENT = FORBIDDEN
DOCUMENT_LIFETIME = CURRENT_PROJECTION_ONLY
CANDIDATE_C = NOT ACTIVATED
RUNTIME_IMPLEMENTATION = NOT AUTHORIZED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```
