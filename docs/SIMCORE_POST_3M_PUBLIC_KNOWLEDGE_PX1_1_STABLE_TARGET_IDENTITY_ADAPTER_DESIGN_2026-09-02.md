# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-1 Stable Target Identity Adapter Design — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-1 DESIGN FROZEN · UPSTREAM-OWNED STABLE TARGET IDENTITY · STATELESS LEAST-AUTHORITY ADAPTER · COLLISION-SAFE OPAQUE TARGET IDENTITY REF · SNAPSHOT FALLBACK PRESERVED · C1+C2 ONLY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-1 · STABLE TARGET IDENTITY · ADAPTER · NO IMPLEMENTATION AUTHORITY**

## 0. Purpose

PK-X1 requires a durable `pageIdentity` keyed by a trusted stable `targetIdentityRef`.

PX1-1 freezes the contract that supplies that stable target identity without turning PUBLIC_KNOWLEDGE into a second canonical entity registry.

The product requirement is narrow:

```text
for an already-authorized current PUBLIC_KNOWLEDGE target,
prove whether the target has an admitted stable machine identity
that remains the same across the PK-X1 conversation lifetime
```

This is design-only. It does not implement an entity registry, canonical ID system, storage backend, target resolver, parser, prompt transport, runtime schema, model call, network call, DOM/CSS, release, S7/v0.70.3, or `release-simcore` mutation.

## 1. Inherited authority separation

PX1-1 preserves the frozen authority stack:

```text
Frame / Continuity / Time
→ canonical/current world semantics where already owned

current target authority
→ which target the current PK job addresses

Evidence / Lineage / Handoff
→ exact current support / relationship bindings

3M-2 Exposure
→ public assertion eligibility

PK-1 Settlement Context
→ public-record standing evidence

PK-2 Validator
→ final current public-reference disposition

Candidate C CC-1
→ durable derived-object identity vocabulary

PK-X1 Page Identity Owner
→ durable PUBLIC_KNOWLEDGE page identity only
```

PX1-1 adds no world-truth owner.

Canonical invariant:

```text
TARGET SAMENESS AUTHORITY
!=
WORLD FACT AUTHORITY
!=
PUBLIC EXPOSURE AUTHORITY
!=
SETTLEMENT AUTHORITY
!=
PAGE IDENTITY AUTHORITY
```

## 2. Final architecture decision

Selected architecture:

```text
UPSTREAM_OWNED_STABLE_TARGET_IDENTITY
+
STATELESS_STABLE_TARGET_IDENTITY_ADAPTER
```

Conceptual flow:

```text
TRUSTED current PublicKnowledgeDocumentTargetContext
+
TRUSTED current PK-X1 lifetimeScopeRef
+
OPTIONAL TRUSTED upstream StableTargetIdentityBinding
        ↓
StableTargetIdentityAdapter
        ↓
StableTargetIdentityAdmission
        ↓ READY only
PK-X1 page identity resolve / first mint
```

The adapter consumes identity authority. It does not manufacture semantic identity.

## 3. Underlying target identity owner

PX1-1 deliberately does not create one universal owner called `SimCoreEntityRegistry` or similar.

For any admitted target kind, the semantic target identity must come from the upstream component that already owns that target's stable machine identity under the host/world contract.

Possible concrete owners may differ by product/target kind.

PX1-1 requires only this contract:

```text
one admitted upstream owner
can issue an exact stable machine identity binding
for the current target
for at least the current PK-X1 lifetime scope
```

If no such owner exists:

```text
snapshot PUBLIC_KNOWLEDGE remains possible
PK-X1 durability is unsupported
```

This is legal degradation, not a reason to invent identity heuristics.

## 4. Why PUBLIC_KNOWLEDGE cannot own target identity

Rejected flow:

```text
PK sees title "A"
→ creates entity A
→ stores aliases
→ decides later "A" is same entity
→ uses that registry to mint/reuse pageIdentity
```

That would make a derived public-reference family the owner of canonical target sameness.

Canonical rule:

```text
PUBLIC_KNOWLEDGE MAY ADDRESS A TARGET
PUBLIC_KNOWLEDGE MAY NOT DEFINE THE TARGET'S CANONICAL SAMENESS
```

## 5. Why Candidate C cannot own underlying target identity

Candidate C CC-1 owns durable **derived-object** identity semantics.

PK-X1 `pageIdentity` is such a derived identity.

But the target being described may be a canonical character, event, organization, place, or another host/world object.

Therefore:

```text
Candidate C pageIdentity
!=
underlying target identity
```

Candidate C consumes the upstream target anchor; it does not mint the anchor.

## 6. Current target context remains authoritative for current addressing

Current PUBLIC_KNOWLEDGE target context remains conceptually:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

`targetRef` answers:

```text
which exact target does this current PK projection address?
```

It remains projection/current-authority scoped.

PX1-1 does not retroactively redefine `targetRef` as durable identity.

## 7. Stable target binding conceptual input

PX1-1 freezes the required information categories of an upstream binding without freezing a runtime serialization:

```text
StableTargetIdentityBindingV1
  identityAuthorityRef
  identityDomain
  opaqueTargetId
  currentTargetRef
  validForLifetimeScopeRef
  bindingState
```

This is conceptual vocabulary only.

### `identityAuthorityRef`

Names the admitted semantic owner/issuer of the stable identity.

### `identityDomain`

Prevents IDs from unrelated authority domains/object namespaces from colliding.

PX1-1 does not define a global universal domain enum.

### `opaqueTargetId`

The upstream owner's stable machine identifier within its domain.

Consumers must not parse semantic meaning from it.

### `currentTargetRef`

Exact current target binding for this activation.

### `validForLifetimeScopeRef`

Explicit statement that this stable identity contract covers the current PK-X1 lifetime scope.

### `bindingState`

Must mechanically indicate a current exact binding, not a fuzzy or historical candidate.

Exact runtime field/enumeration names remain future implementation authority.

## 8. Collision-safe `targetIdentityRef`

PK-X1 stores one opaque `targetIdentityRef`.

PX1-1 freezes its semantic construction rule:

```text
targetIdentityRef
= collision-safe opaque locator over
  identityAuthorityRef
  + identityDomain
  + opaqueTargetId
```

The physical encoding is not frozen.

Canonical rule:

```text
BARE opaqueTargetId
!=
PK-X1 targetIdentityRef
```

Reason:

```text
owner A / domain CHARACTER / id 42
owner B / domain EVENT     / id 42
```

must never collide merely because the local token is equal.

The adapter may normalize trusted components into the opaque locator. This is locator construction, not semantic identity creation.

## 9. Opaque means non-semantic

Consumers may compare `targetIdentityRef` for exact equality.

They may not depend on parsing:

```text
character name
event date
creation turn
source root
settlement state
page title
revision
```

from the identifier.

Canonical rule:

```text
TARGET IDENTITY REF
= SAME-TARGET LOCATOR
NOT A SEMANTIC FACT CONTAINER
```

## 10. First stability horizon

PK-X1 first lifetime is:

```text
CONVERSATION_SCOPED_PUBLIC_REFERENCE_IDENTITY
```

PX1-1 therefore requires an upstream identity binding whose declared validity covers the exact current `lifetimeScopeRef`.

First-scope comparison is intentionally simple:

```text
binding.validForLifetimeScopeRef
==
current PK-X1 lifetimeScopeRef
```

No hierarchy such as global > account > conversation is required by V1.

A globally stable upstream ID may still be issued/bound for the current conversation scope by its owner.

Canonical rule:

```text
STABLE FOR PK-X1 LIFETIME
!=
GLOBALLY PERMANENT
```

## 11. No inferred scope coverage

Forbidden:

```text
ID looked stable for 30 turns
→ assume conversation stability
```

or:

```text
ID is called UUID
→ assume global stability
```

The upstream identity contract must explicitly cover the current lifetime scope.

## 12. Exact current target join

Adapter admission requires:

```text
trusted binding.currentTargetRef
==
trusted current PublicKnowledgeDocumentTargetContext.targetRef
```

Missing or mismatched exact binding cannot become READY.

The adapter does not resolve names to IDs.

## 13. Display labels remain presentation/current semantic data

`displayLabel` is never an identity key.

Legal:

```text
Turn 10
  targetIdentityRef = T
  displayLabel = "Old Name"

Turn 40
  targetIdentityRef = T
  displayLabel = "New Name"
```

when upstream identity authority explicitly binds both current targets to the same stable identity.

Canonical rule:

```text
LABEL CHANGED
DOES NOT REQUIRE NEW IDENTITY
IF UPSTREAM OWNER SAYS SAME TARGET
```

## 14. Same label does not imply same identity

Legal:

```text
Target A displayLabel = "Alex"
Target B displayLabel = "Alex"
```

with:

```text
targetIdentityRef(A) != targetIdentityRef(B)
```

No title/display collision repair is permitted.

## 15. Adapter ownership

Selected conceptual component:

```text
PublicKnowledgeStableTargetIdentityAdapter
```

Location:

```text
PUBLIC_KNOWLEDGE / PK-X1 policy boundary
```

Its authority is limited to:

```text
validate admitted binding shape
validate currentTargetRef exact join
validate exact lifetimeScopeRef coverage
validate one admitted authoritative binding
construct/normalize collision-safe targetIdentityRef
return bounded admission status
```

It does not:

```text
mint opaqueTargetId
resolve names
search aliases
merge entities
split entities
persist target mappings
rewrite canonical identities
create page content
validate settlement
mint pageIdentity
```

## 16. Adapter is pure/stateless

First-scope adapter contract:

```text
PURE
STATELESS
CURRENT-PROJECTION-ONLY
BOUNDED
DETERMINISTIC GIVEN TRUSTED INPUTS
FAIL-CLOSED
```

Forbidden dependencies:

```text
model call
network call
host transcript scan
PK page history scan
NEWS / BOARD / SOCIAL_FEED scan
persistent target mapping registry
semantic similarity search
background sync
```

## 17. Evidence may transport but not mint identity

Evidence / Lineage / Handoff may carry or exact-bind upstream identity references when another owner has already established them.

But:

```text
EVIDENCE TRANSPORTS / BINDS OWNER DATA
!=
EVIDENCE OWNS TARGET SAMENESS
```

A source fingerprint or Handoff relation cannot be promoted into stable target identity merely because it is exact.

## 18. Model output cannot supply trusted identity

Any model-authored field such as:

```text
targetIdentityRef
canonicalEntityId
sameEntity
stableId
```

is untrusted unless independently exact-joined to the trusted upstream binding.

The first design does not need the semantic producer to emit target identity at all.

Preferred architecture:

```text
model proposes page semantics
trusted target/identity context stays out-of-band
```

## 19. Derived source families cannot substitute

The following are never stable target identity authority:

```text
NEWS headline/entity wording
BOARD displayName/title/body
SOCIAL_FEED handle/profile/displayName
LIVE_REACTION nickname/text
old PUBLIC_KNOWLEDGE title/body/citation
sibling family agreement
```

Even unanimous derived-source naming does not prove canonical sameness.

## 20. Admission output conceptual shape

PX1-1 freezes bounded result categories, not a serialized runtime object:

```text
StableTargetIdentityAdmissionV1
  status
  currentTargetRef
  lifetimeScopeRef
  targetIdentityRef?      // READY only
  identityAuthorityRef?   // bounded diagnostic/validation metadata
  reasonCode
```

No semantic target facts or display text are copied into the receipt merely for identity resolution.

## 21. Admission statuses

Frozen conceptual states:

```text
READY_EXACT
UNSUPPORTED_TARGET_IDENTITY
HOLD_IDENTITY_UNAVAILABLE
HOLD_IDENTITY_AMBIGUOUS
HOLD_IDENTITY_CONFLICT
INVALID_TARGET_BINDING
INVALID_SCOPE_BINDING
INVALID_IDENTITY_AUTHORITY
INVALID_IDENTITY_LOCATOR
```

Exact runtime enum spellings remain implementation-authority work.

## 22. `READY_EXACT`

Requirements:

```text
one admitted upstream identity authority
one current exact stable identity binding
currentTargetRef exact-match
validForLifetimeScopeRef exact-match
collision-safe identity components present
binding state current/exact
```

Then:

```text
adapter may emit targetIdentityRef
```

This does not mint `pageIdentity`; PX1-2 owns that later contract.

## 23. `UNSUPPORTED_TARGET_IDENTITY`

Meaning:

```text
current target is valid for snapshot PK
but no stable identity capability exists for this target kind/owner
```

Result:

```text
snapshot PK may continue
PK-X1 durable identity does not mint/reuse through guessed continuity
```

This is expected graceful degradation.

## 24. `HOLD_IDENTITY_UNAVAILABLE`

Meaning:

```text
an admitted stable identity path is expected,
but required current binding evidence is temporarily unavailable/incomplete
```

Result:

```text
do not mint
do not guess
do not delete existing pageIdentity
```

A later current activation may succeed.

## 25. `HOLD_IDENTITY_AMBIGUOUS`

Meaning:

```text
trusted current inputs cannot resolve exactly one stable target identity
```

Examples:

```text
one current targetRef maps to multiple unresolved candidate stable IDs
upstream owner marks relation ambiguous
```

Forbidden:

```text
choose first
choose most recent
choose label-similar
choose source-popular
```

## 26. `HOLD_IDENTITY_CONFLICT`

Meaning:

```text
two admitted authoritative bindings assert incompatible stable target identities
for the same current target/scope
```

PX1-1 does not reconcile competing identity authorities.

The condition is a blocking identity-authority conflict for durability.

## 27. Invalid states

### `INVALID_TARGET_BINDING`

Current binding targetRef does not exact-match trusted current target context.

### `INVALID_SCOPE_BINDING`

Stable identity is not explicitly valid for the current PK-X1 lifetime scope.

### `INVALID_IDENTITY_AUTHORITY`

Binding issuer/owner is not admitted for the supplied identity relation.

### `INVALID_IDENTITY_LOCATOR`

Binding cannot produce a collision-safe owner/domain-qualified locator.

Invalid states fail closed.

## 28. Bare local IDs are invalid for PK-X1

Example:

```text
opaqueTargetId = "42"
identityAuthorityRef = missing
identityDomain = missing
```

cannot become `targetIdentityRef`.

Reason:

```text
local uniqueness
!= cross-domain uniqueness
```

## 29. Exactly one admitted identity relation per admission

First scope does not compose identity consensus.

Canonical requirement:

```text
one current target
→ one admitted authoritative stable identity relation
→ one targetIdentityRef
```

If multiple refs are present but an upstream owner has not explicitly canonicalized them into one identity relation:

```text
HOLD / CONFLICT
```

not heuristic aliasing.

## 30. Alias / rekey / split / merge remain deferred

PX1-1 does not define:

```text
alias A → B
merge identities A + B
split A → B,C
rekey old ID → new ID
transfer pageIdentity across targetIdentityRef
```

If upstream target identity changes incompatibly:

```text
old pageIdentity is not silently rebound
```

A future target-identity migration contract is required.

## 31. Existing page identity when identity proof disappears

Legal state:

```text
Durable pageIdentity P exists
bound to targetIdentityRef T

later current activation
→ stable target identity proof unavailable
```

PX1-1 result:

```text
HOLD_IDENTITY_UNAVAILABLE
```

PK-X1 owner retains P for its normal lifetime.

Forbidden:

```text
use old title to recover T
use old body to recover T
use pageIdentity itself to assert current target sameness
```

## 32. Existing page identity when current identity differs

Suppose current trusted adapter result is:

```text
T2
```

while an explicitly addressed old pageIdentity is bound to:

```text
T1
```

PX1-1 does not say they are aliases.

Conceptual later-use result:

```text
T1 != T2
→ no current exact reuse
```

PX1-3 owns the full pageIdentity/current-view join, but PX1-1 freezes the non-coercion rule.

## 33. Page identity cannot prove target identity backward

Forbidden inversion:

```text
pageIdentity P
→ stored T
→ therefore current target must be T
```

Correct separation:

```text
pageIdentity P resolves stored targetIdentityRef T
AND
current adapter independently emits current targetIdentityRef T
→ exact identity match candidate for PX1-3
```

The current target authority remains necessary.

## 34. First-mint integration

PK-X1 first mint gate becomes conceptually:

```text
usable current validated PUBLIC_KNOWLEDGE page
+
PX1-1 READY_EXACT targetIdentityRef
+
trusted lifetimeScopeRef
        ↓
PX1-2 resolve-or-mint may be attempted
```

Without `READY_EXACT`:

```text
no durable page mint
```

Snapshot presentation may still succeed when its own authorities are valid.

## 35. Existing-identity reuse integration

For later durable page use:

```text
current PK job
→ current target context
→ PX1-1 READY_EXACT targetIdentityRef
→ PX1-2 exact page identity resolve
→ PX1-3 current semantic revalidation
```

No old semantic content is needed for identity resolution.

## 36. Privacy / enumeration boundary

PX1-1 has no operation to:

```text
list all target identities
search targets by label
count stable identities
inspect alias history
enumerate known characters/events/orgs
```

It responds only to an already-authorized current target context.

Canonical rule:

```text
IDENTITY ADMISSION
!= ENTITY DIRECTORY
```

## 37. Dormancy

When no current PK-X1 durable identity decision is needed:

```text
PX1-1 adapter invocation = 0
identity lookup = 0
identity normalization = 0
history scan = 0
network = 0
model call = 0
```

A durable page registry does not cause proactive target identity refresh.

## 38. No persistent identity mapping in PX1-1

The adapter does not store:

```text
targetRef → targetIdentityRef
label → targetIdentityRef
old alias → new alias
canonical owner records
```

The durable PK-X1 page identity store may persist its own `targetIdentityRef`, but that is a consumer record, not an upstream identity mapping database.

## 39. Cache boundary

A cache may accelerate upstream identity-owner resolution under that owner's future contract.

PX1-1 itself does not treat cache hit/miss as identity evidence.

```text
CACHE HIT
!= AUTHORITY UNLESS OWNER CONTRACT SAYS SO

CACHE MISS
!= TARGET HAS NO STABLE IDENTITY
```

## 40. Support / settlement independence

A stable target identity proves only target sameness.

It does not prove:

```text
current source support
public exposure
public-record settlement
citation validity
current page content
```

Canonical rule:

```text
SAME TARGET
!= SAME FACTS
!= CURRENT VALID PAGE
```

This is why PX1-3 must revalidate semantics on each activation.

## 41. Source replacement independence

A new source root may support the same stable target later.

Legal:

```text
source S1 → target T
source S2 → target T
```

with the same `targetIdentityRef` when upstream target authority says same target.

Source authority is not part of target identity.

## 42. No Candidate C expansion beyond C1+C2

PX1-1 does not require:

```text
C3 mutation
C4 append/merge
C5 derived lineage
C6 context re-entry
C7 historical survival
C8 delayed effects
```

It supplies the upstream stable anchor already required by PK-X1 C1+C2.

## 43. Failure locality

PX1-1 failure affects durable identity only unless another current PK authority independently fails.

Examples:

```text
valid snapshot target + no stable ID
→ snapshot legal, durability unsupported

valid snapshot target + identity binding temporary unavailable
→ snapshot legal, durability hold

invalid current target binding
→ current durable identity path invalid
```

No fallback may weaken current PK semantic validation.

## 44. Future implementation acceptance matrix

A future implementation must prove at minimum:

```text
A1 same upstream identity + same lifetime + changed displayLabel
   → same targetIdentityRef

A2 different upstream identities + same displayLabel
   → different targetIdentityRefs

A3 currentTargetRef mismatch
   → INVALID_TARGET_BINDING

A4 no stable identity capability
   → UNSUPPORTED_TARGET_IDENTITY
   → snapshot path remains usable when otherwise valid

A5 temporarily unavailable admitted binding
   → HOLD_IDENTITY_UNAVAILABLE
   → no guessed mint/reuse

A6 ambiguous upstream identity
   → HOLD_IDENTITY_AMBIGUOUS

A7 conflicting authoritative identities
   → HOLD_IDENTITY_CONFLICT

A8 bare local token without owner/domain qualification
   → INVALID_IDENTITY_LOCATOR

A9 identity valid for another lifetime scope only
   → INVALID_SCOPE_BINDING

A10 model-authored stable ID
    → ignored as authority

A11 NEWS/BOARD/SOCIAL_FEED/LIVE_REACTION label agreement
    → does not create target identity

A12 existing pageIdentity + missing current identity proof
    → pageIdentity retained
    → current durable reuse held

A13 existing page T1 + current exact identity T2
    → no silent rebind

A14 no PK-X1 current job
    → no PX1-1 work

A15 stable target identity does not alter Exposure/settlement/referenceState
```

No runtime evidence is claimed by this document.

## 45. BLOCKER / WATCH / DEFER

```text
BLOCKER · PK_OR_CANDIDATE_C_MINTS_UNDERLYING_SEMANTIC_TARGET_IDENTITY
BLOCKER · TARGET_IDENTITY_FROM_DISPLAY_LABEL_TITLE_CONTENT_OR_FINGERPRINT
BLOCKER · BARE_LOCAL_ID_USED_AS_TARGET_IDENTITY_REF
BLOCKER · AMBIGUOUS_OR_CONFLICTING_IDENTITY_COERCED_TO_READY
BLOCKER · PAGE_IDENTITY_USED_TO_PROVE_CURRENT_TARGET_BACKWARD
BLOCKER · OLD_PAGE_BODY_OR_TITLE_RECOVERS_TARGET_IDENTITY
BLOCKER · MODEL_AUTHORED_IDENTITY_ACCEPTED_AS_TRUSTED
BLOCKER · DERIVED_SOURCE_AGREEMENT_CREATES_IDENTITY
BLOCKER · SCOPE_STABILITY_INFERRED_FROM_OBSERVATION
BLOCKER · PX1_1_PERSISTS_GENERIC_TARGET_MAPPING_REGISTRY
BLOCKER · IDENTITY_ADMISSION_CHANGES_SETTLEMENT_OR_WORLD_FACT_AUTHORITY
BLOCKER · SOURCE_IRRELEVANT_TURN_RUNS_IDENTITY_ADAPTER

WATCH · UPSTREAM_STABLE_TARGET_IDENTITY_COVERAGE_BY_TARGET_KIND
WATCH · CURRENT_TARGET_CONTEXT_INTEGRATION_POINT_FOR_TRUSTED_BINDING
WATCH · HOST_LIFETIME_SCOPE_EXACT_BINDING
WATCH · MULTIPLE_UPSTREAM_IDENTITY_OWNER_CONFLICT_POLICY
WATCH · PX1_3_EXACT_CURRENT_PAGE_REUSE_JOIN

DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · GLOBAL_CROSS_CONVERSATION_TARGET_IDENTITY
DEFER · GENERIC ENTITY DIRECTORY / SEARCH
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
DEFER · PK-D2 REVISIONED_PAGE
```

## 46. Child-sequence effect

PX1-1 closes the prerequisite that PX1-2 needs.

Updated sequence:

```text
PX1-0 Durable Page Identity Master       ✅
PX1-1 Stable Target Identity Adapter     ✅ DESIGN FROZEN
PX1-2 Identity Record + Resolve/Mint     ← NEXT
PX1-3 Current View Revalidation Binding
PX1-4 Lifetime / Cleanup / Presentation
PX1-5 Convergence / Candidate C Reassessment
```

No checkpoint authorizes implementation without a separate user decision.

## 47. Frozen verdict

```text
PX1_1_DESIGN                        = FROZEN
ARCHITECTURE                        = UPSTREAM IDENTITY OWNER + STATELESS ADAPTER
UNDERLYING_TARGET_IDENTITY_OWNER    = ADMITTED EXISTING UPSTREAM OWNER
PK_IDENTITY_ADAPTER                 = LEAST-AUTHORITY CURRENT BINDING ADAPTER
TARGET_IDENTITY_REF                 = OWNER/DOMAIN-QUALIFIED OPAQUE LOCATOR
CURRENT_TARGET_JOIN                 = EXACT targetRef
LIFETIME_COVERAGE                   = EXACT CURRENT PK-X1 lifetimeScopeRef
TEXT / FUZZY RECOVERY               = FORBIDDEN
GENERIC ENTITY REGISTRY             = NONE
PERSISTENT TARGET MAPPING STORE      = NONE
SNAPSHOT FALLBACK                   = PRESERVED
MODEL IDENTITY AUTHORITY            = NONE
DERIVED_FAMILY IDENTITY AUTHORITY   = NONE
CANDIDATE_C                         = C1+C2 ONLY, NO NEW GATE
RUNTIME_IMPLEMENTATION              = NOT AUTHORIZED
PRODUCTION                          = UNCHANGED
release-simcore                     = UNCHANGED
NEXT                                = PX1-2 IDENTITY RECORD + RESOLVE/MINT CONTRACT
```