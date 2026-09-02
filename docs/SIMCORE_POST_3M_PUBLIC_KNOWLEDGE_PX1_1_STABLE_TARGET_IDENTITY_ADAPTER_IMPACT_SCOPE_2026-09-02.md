# SimCore Post-3.0M PUBLIC_KNOWLEDGE PX1-1 Stable Target Identity Adapter Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **PX1-1 IMPACT SCOPE FROZEN · STABLE TARGET IDENTITY ADAPTER SEAM SELECTED · UPSTREAM IDENTITY AUTHORITY CONSUMER ONLY · NO ENTITY REGISTRY · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · PUBLIC_KNOWLEDGE · PK-X1 · PX1-1 · STABLE TARGET IDENTITY · IMPACT SCOPE**

## 0. Purpose

PK-X1 froze a durable PUBLIC_KNOWLEDGE page identity shell whose uniqueness key includes a trusted `targetIdentityRef`.

PX1-1 answers the next narrow question:

```text
who may prove that the current target is the same durable target across turns?
```

The purpose of this impact scope is to identify the least-authority seam before freezing the detailed design.

No runtime code, store, target registry, ID allocator, parser, prompt transport, DOM/CSS, release, S7/v0.70.3, or `release-simcore` change is authorized.

## 1. Fresh authority findings

Current frozen contracts already establish:

```text
PublicKnowledgeDocumentTargetContextV1
  targetRef
  displayLabel
```

for current-projection PUBLIC_KNOWLEDGE validation.

PK-X1 additionally requires:

```text
targetIdentityRef
```

with the explicit invariant:

```text
targetRef
!=
targetIdentityRef
!=
pageIdentity
```

Candidate C CC-1 also requires that derived identity not substitute for canonical/world identity and forbids convenience promotion of display names, fingerprints, ordinals, transcript positions, or canonical IDs without an explicit mapping contract.

## 2. The missing seam

Current PUBLIC_KNOWLEDGE target context proves:

```text
this is the current document target
```

It does not by itself prove:

```text
this current target is the same logical target as a target from another turn
```

PK-X1 therefore needs one additional current trusted binding, but must not solve that need by building a new universal entity registry.

## 3. Selected impact seam

Selected seam:

```text
UPSTREAM_STABLE_TARGET_IDENTITY_BINDING
        ↓
StableTargetIdentityAdapter
        ↓
PX1 targetIdentityRef admission
```

The adapter is a least-authority current-projection policy adapter.

It consumes an explicit stable identity binding owned upstream and exposes only the bounded identity handle needed by PK-X1.

Canonical rule:

```text
PX1 ADAPTER CONSUMES IDENTITY AUTHORITY
PX1 ADAPTER DOES NOT CREATE IDENTITY AUTHORITY
```

## 4. Owner boundary

PX1-1 does not select PUBLIC_KNOWLEDGE, Candidate C, Evidence, or Presentation as the owner of underlying target identity.

The stable target identity must be owned by the component that already owns the semantic identity of that target kind in the current world/host contract.

Examples may include a canonical character/entity/event owner when such a machine identity actually exists, but PX1-1 does not invent or standardize those owners.

If no admitted upstream owner exists for a target kind:

```text
snapshot PUBLIC_KNOWLEDGE may remain legal
PK-X1 durability = unsupported / hold
```

## 5. Why no generic entity registry

Rejected architecture:

```text
PUBLIC_KNOWLEDGE needs stable target IDs
→ create SimCore GlobalEntityRegistry
→ infer every character/event/org/place identity
→ persist aliases
→ use registry as truth owner
```

This would create a second world-state/identity database and expand PK-X1 far beyond durable page identity.

Selected architecture keeps the adapter stateless and current-projection-only.

## 6. Required current binding relation

The adapter must receive a trusted machine relation conceptually equivalent to:

```text
current targetRef
↔ admitted upstream stable target identity
↔ current lifetime scope coverage
```

The adapter may normalize that relation into a single opaque `targetIdentityRef` suitable for PK-X1, but the semantic identity must originate upstream.

## 7. Opaque locator requirement

`targetIdentityRef` must not be a bare local ID whose namespace/issuer is guessed by consumers.

Conceptually the trusted locator must distinguish:

```text
identity authority / domain
+
object kind or namespace where needed
+
opaque stable target ID
```

The physical serialization is not frozen.

The PK-X1 durable record may still store one opaque `targetIdentityRef`; the composition details remain hidden behind the upstream/adapter contract.

## 8. Stability horizon

PK-X1 first lifetime is conversation-scoped.

Therefore PX1-1 requires only an identity contract whose guaranteed stability covers the selected `lifetimeScopeRef`.

Canonical rule:

```text
STABLE FOR CURRENT PK-X1 LIFETIME
!=
GLOBALLY PERMANENT ID
```

A target identity valid only for the current projection is insufficient.

A globally permanent identity is not required by PX1-1.

## 9. Exact current-target binding

The adapter must exact-bind the stable identity to the current trusted `targetRef`.

Forbidden:

```text
same displayLabel
same title
same source text
same content fingerprint
same host message
semantic similarity
historical co-occurrence
→ same targetIdentityRef
```

The adapter is not a fuzzy entity resolver.

## 10. Rename behavior

A display-label rename is compatible with stable identity only when upstream identity authority explicitly keeps the same stable target identity.

```text
same trusted stable target identity
+ changed displayLabel
→ same targetIdentityRef
```

The adapter does not infer rename continuity from text similarity.

## 11. Identity split / merge / rekey

PX1-1 does not define target identity migration.

If upstream authority reports that identity mapping changed, split, merged, aliased, or became ambiguous:

```text
DO NOT silently rebind old pageIdentity
```

Target alias/rekey migration remains a later explicit lifecycle design.

## 12. Current availability

An already-minted page identity may exist while current stable target binding is unavailable.

Legal state:

```text
pageIdentity exists
+
current stable target identity binding unavailable
→ current durable-page reuse HOLD
```

The system must not recover by comparing old titles or old page contents.

## 13. Proposed adapter properties

The selected PX1-1 adapter should be:

```text
PURE / STATELESS
CURRENT_PROJECTION_ONLY
BOUNDED
DETERMINISTIC GIVEN TRUSTED INPUTS
FAIL-CLOSED
NO MODEL CALL
NO NETWORK CALL
NO HISTORY SCAN
NO PERSISTENT IDENTITY MAPPING STORE
NO FUZZY MATCHING
```

Persistence remains owned by the PK-X1 page identity layer, not by this adapter.

## 14. Proposed adapter result classes

Detailed enum names are future design/runtime work, but the impact scope requires distinct outcomes for at least:

```text
READY_EXACT
UNSUPPORTED_TARGET_IDENTITY
HOLD_IDENTITY_UNAVAILABLE
HOLD_IDENTITY_AMBIGUOUS
INVALID_SCOPE_COVERAGE
INVALID_CURRENT_TARGET_BINDING
INVALID_IDENTITY_AUTHORITY
```

The adapter must not collapse ambiguity into a guessed READY result.

## 15. Snapshot fallback boundary

PX1-1 failure is local to durability.

If current PUBLIC_KNOWLEDGE snapshot validation has valid current target authority but no stable durable target identity:

```text
SNAPSHOT PK = may continue
DURABLE PAGE IDENTITY = do not mint / do not reuse through guessed target continuity
```

This preserves graceful degradation.

## 16. No source-family substitution

Stable target identity may not be manufactured from derived sibling families.

Forbidden identity evidence:

```text
NEWS headline/person label
BOARD username/title
SOCIAL_FEED handle/profile label
LIVE_REACTION text
old PUBLIC_KNOWLEDGE title
```

Derived family agreement does not establish canonical target sameness.

## 17. No identity authority from Evidence alone

Evidence / Lineage / Handoff may prove current exact source/support bindings.

That does not automatically make them owners of durable semantic target identity.

Evidence may transport or exact-bind an upstream identity reference when explicitly authorized, but it may not create the semantic target identity merely because PK-X1 needs one.

## 18. No model authority

The semantic producer may not declare:

```text
sameEntity = true
targetIdentityRef = "..."
canonicalEntityId = "..."
```

and gain durable identity authority.

Model output remains untrusted semantic proposal.

## 19. No pageIdentity inversion

Forbidden logic:

```text
pageIdentity P used before
→ therefore current target must be old target T
```

A page locator may resolve to its stored targetIdentityRef, but current activation must independently prove that the current trusted target authority binds to that stable target identity.

This exact later-use join is consumed by PX1-3.

## 20. Privacy / existence boundary

The adapter must not enumerate stable targets or expose a target registry.

PX1-1 requires only exact current-target binding for an already authorized current PUBLIC_KNOWLEDGE job.

No:

```text
list all known target identities
count target identities
search identity aliases
query arbitrary historical targets
```

is part of this seam.

## 21. Cost boundary

When no current PK-X1 durable target resolution is requested:

```text
stable target identity adapter work = 0
```

No background identity synchronization or proactive target discovery is allowed.

## 22. Candidate C effect

PX1-1 supports the already-selected PK-X1 profile:

```text
C1 = YES
C2 = YES
C3-C8 = NO
```

The adapter itself does not add another Candidate C gate.

It supplies the stable upstream anchor required for C2 page identity uniqueness.

## 23. Impacted conceptual owners

Primary affected contracts:

```text
PUBLIC_KNOWLEDGE current DocumentTargetContext
PK-X1 durable page identity owner
Candidate C CC-1 identity vocabulary
upstream target/canonical identity owner interface
host/SimCore lifetimeScopeRef authority
```

Explicit non-owners:

```text
Presentation Renderer
CSS/DOM
settlement validator
NEWS/BOARD/SOCIAL_FEED/LIVE_REACTION payloads
model output
cache
host transcript text
```

## 24. First acceptance questions for detailed design

PX1-1 detailed design must answer:

```text
A. What exact trusted input categories are admitted?
B. How is issuer/domain collision prevented while keeping targetIdentityRef opaque?
C. What stability horizon must upstream authority guarantee?
D. How is current targetRef exact-bound to the stable identity?
E. What happens when the binding is missing, ambiguous, stale, or scope-incompatible?
F. How do label changes preserve identity without text heuristics?
G. How does an existing page identity behave while current identity proof is unavailable?
H. How is snapshot-only fallback preserved?
I. What identity migration cases remain deferred?
```

## 25. BLOCKER / WATCH / DEFER

```text
BLOCKER · PX1_ADAPTER_MINTS_SEMANTIC_TARGET_IDENTITY
BLOCKER · TARGET_IDENTITY_RECOVERED_FROM_LABEL_TITLE_OR_CONTENT
BLOCKER · BARE_LOCAL_ID_COLLIDES_ACROSS_IDENTITY_DOMAINS
BLOCKER · PROJECTION_LOCAL_TARGET_REF_PROMOTED_TO_DURABLE_ID_WITHOUT_CONTRACT
BLOCKER · AMBIGUOUS_BINDING_COERCED_TO_READY
BLOCKER · OLD_PAGE_CONTENT_USED_TO_RECONSTRUCT_TARGET_IDENTITY
BLOCKER · MODEL_DECLARATION_CREATES_TARGET_IDENTITY
BLOCKER · DERIVED_SOURCE_LABEL_CREATES_TARGET_IDENTITY
BLOCKER · IDENTITY_LOOKUP_WAKES_ON_SOURCE_IRRELEVANT_TURNS

WATCH · UPSTREAM_STABLE_IDENTITY_COVERAGE_BY_TARGET_KIND
WATCH · HOST_CONVERSATION_SCOPE_IDENTITY_STABILITY
WATCH · EXISTING_TARGET_CONTEXT_MAY_NEED_OPTIONAL_STABLE_IDENTITY_BINDING
WATCH · PAGE_LOCATOR_TO_CURRENT_TARGET_EXACT_JOIN_FOR_PX1_3

DEFER · TARGET_ALIAS_REKEY_MIGRATION
DEFER · GLOBAL_CROSS_CONVERSATION_TARGET_IDENTITY
DEFER · GENERIC ENTITY SEARCH / REGISTRY
DEFER · PK-X2 PUBLIC_REFERENCE_SEARCH
DEFER · PK-D2 REVISIONED_PAGE
```

## 26. Selected impact verdict

```text
PX1_1_IMPACT_SCOPE                 = FROZEN
SELECTED_SEAM                      = STABLE_TARGET_IDENTITY_ADAPTER
UNDERLYING_IDENTITY_OWNER          = EXISTING / ADMITTED UPSTREAM TARGET IDENTITY OWNER
ADAPTER_ROLE                        = LEAST-AUTHORITY CURRENT BINDING PROJECTION
NEW_GLOBAL_ENTITY_REGISTRY         = NO
PERSISTENT_IDENTITY_MAPPING_STORE  = NO
TEXT / FUZZY IDENTITY RECOVERY     = NO
SNAPSHOT_FALLBACK                  = PRESERVED
CANDIDATE_C_DELTA                  = NONE BEYOND PK-X1 C1+C2
RUNTIME_IMPLEMENTATION             = NOT AUTHORIZED
PRODUCTION                         = UNCHANGED
release-simcore                    = UNCHANGED
NEXT                               = PX1-1 DETAILED DESIGN
```