# SimCore 3M-6 Provenance / Invalidation Reassessment Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · CANDIDATE C REASSESSED · DEDICATED DERIVED-LINEAGE SUBSYSTEM NOT CURRENTLY REQUIRED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-6 PRE-DESIGN · PROVENANCE / INVALIDATION · CANDIDATE C GATE**

## 0. Purpose

This document performs the source-backed reassessment required before freezing 3M-6.

It answers only:

```text
Given the concrete derived objects now designed by 3M-3 and 3M-5,
do they require a new dedicated provenance / reroll-lineage subsystem,
or are existing Evidence / Lineage / Source Handoff references sufficient?

If they are sufficient today,
what exact invalidation boundary must be frozen,
and what future product requirement must force Candidate C to reopen?
```

This is design/research/document work only.

It does not implement provenance storage, change Lineage/Evidence/Handoff runtime behavior, add persistence, alter prompt/output syntax, add reroll behavior, mount UI, change S7/v0.70.3, publish a release, or mutate `release-simcore`.

## 1. Authority snapshot

Design/evidence authority at impact-scope start:

```text
main = d19e70dbb79c141ba6e383882e831e70b68134ec
```

Deployed runtime authority remains independently:

```text
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version         = 0.70.1 Cold First-Turn Tail Attribution
```

3.0M remains design-only.

## 2. Candidate C original intent

The LightBoard/MiniBoard shortlist defines Candidate C as:

```text
Derived Provenance and Reroll Lineage Contract
```

with the intended shape:

```text
source identity + locator/span + owner + lineage
→ derived assertion/object
→ edit/reroll/source replacement
→ invalidate or truncate unsupported descendants
```

Its warning is equally important: activating it too early can create a second identity/lineage system before a concrete consumer proves the need.

3M-3 and 3M-5 now provide concrete derived objects, so reassessment is justified. Reassessment does not imply automatic activation.

## 3. Concrete derived objects now available

### 3.1 LIVE_REACTION structured sidecar

3M-3 freezes:

```text
ValidatedSourceSemanticSidecarV1
  family = LIVE_REACTION
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed Handoff/Evidence ref
  assertions[] = ALLOW assertions only
```

Lifetime:

```text
persistent storage = NONE
future context re-entry = NONE
cross-turn identity = NONE
item mutation = NONE
```

### 3.2 BOARD thread snapshot

3M-5 freezes:

```text
ValidatedBoardSemanticSidecarV1
  family = BOARD
  projectionOrdinal = 0
  sourceAuthorityRef = validator-confirmed Handoff/Evidence ref
  participants[] = projection-local visible participants
  entries[] = accepted POST/REPLY entries
```

Lifetime:

```text
snapshot only
persistent Board DB = NONE
cross-turn append = NONE
stable participant identity = NONE
semantic interaction = NONE
future context re-entry = NONE
item-level reroll = NONE
```

### 3.3 Validation receipts and presentation models

Validation receipts are bounded diagnostic metadata only.

3M-4 / 3M-5 presentation read models are presentation-only derivatives with no semantic or persistence authority.

## 4. Existing support reference is already bounded

The current source slice reuses:

```text
HandoffEvidenceAuthorityRefV1
  kind = HANDOFF_EVIDENCE
  rootMode
  parentMode
  rootIndex
  parentIndex
  depth
  rootFingerprint
  sourceAssistantIndex
  sourceAssistantFingerprint
  currentUserIndex
  currentUserFingerprint
```

The validator joins it exactly against trusted current `SourceAuthorityContextV1` values produced from existing owners.

Therefore the current derived object already carries a bounded pointer to existing authority without inventing a new canonical source identity.

```text
SOURCE AUTHORITY REF
!=
NEW SOURCE IDENTITY SYSTEM
```

## 5. Exact current invalidation question

For all currently designed Source Intelligence objects, the necessary question is:

```text
Does this derived object's sourceAuthorityRef still exactly match the trusted authority context for the use being attempted now?
```

If yes:

```text
SUPPORTED_FOR_CURRENT_USE
```

If no:

```text
UNSUPPORTED
→ do not use as current semantic or ordinary presentation input
```

No current product requirement asks a partially surviving descendant to remain after support changes.

## 6. Narrowest safe model: support-at-use

Selected model:

```text
CURRENT TRUSTED AUTHORITY CONTEXT
        ↕ exact join
DERIVED sourceAuthorityRef
        ↓
MATCH
→ SUPPORTED_FOR_CURRENT_USE

MISMATCH / MISSING / STALE
→ INVALIDATE_WHOLE_PROJECTION
```

This is **support-at-use validation**, not a stored invalidation ledger.

Do not add:

```text
semantic diff of source prose
partial assertion salvage
fuzzy source matching
participant identity migration
reply reparenting
cross-source merge
```

## 7. Whole-projection invalidation is sufficient today

Current Source Intelligence objects are bounded snapshots.

Therefore:

```text
EPHEMERAL CURRENT-PROJECTION OBJECT
+ SOURCE AUTHORITY MISMATCH
→ DROP WHOLE OBJECT
```

This is preferable to attempting to prove which old fields might still be semantically valid.

## 8. Edit / reroll / source replacement cases

### Current C reroll

No old structured result is persistent authority. Re-derive from current authority.

### B source edit/reroll

If the source assistant representation/fingerprint changes, an old derived ref no longer exactly matches current trusted authority.

```text
OLD DERIVED PROJECTION
→ UNSUPPORTED
```

### New root/source replacement

Existing Lineage/Handoff recomputes root/parent/source facts. Old projections do not migrate automatically.

### Current user replacement

The current-user fingerprint is part of the bounded support ref because user disclosure/request scope can participate in exposure policy. A different request cannot automatically reuse the prior source projection.

## 9. BOARD intra-object dependency is not Candidate C

BOARD already has:

```text
REPLY eligibility depends on visible parent POST eligibility
```

That dependency is resolved within one validator run.

```text
parent POST quarantined
→ child REPLY = QUARANTINED_PARENT_NOT_ELIGIBLE
```

This is current-snapshot validation, not cross-turn derived lineage.

## 10. Presentation invalidation boundary

Presentation is downstream.

```text
semantic source no longer supported
→ presentation read model no longer current
→ stale mounted presentation must unmount or be ignored
```

Presentation Renderer cannot decide semantic freshness itself.

A future host implementation must couple view lifecycle to validated source support and current runtime generation.

## 11. Generic provenance ledger is not justified today

No current design requires:

```text
persistent descendant graph
cross-turn source object ID
append-only derived ledger
multi-parent provenance graph
source-to-source propagation chain
partial stale-descendant truncation
persistent invalidation tombstones
```

Therefore:

```text
NO generic DerivedProvenanceStore
NO generic SourceLineageLedger
NO second Evidence system
NO persistent object graph
```

## 12. Candidate C current verdict

```text
CANDIDATE_C = CONDITIONALLY_READY
DEDICATED_C_ACTIVATION = NOT REQUIRED FOR CURRENT 3M-3 / 3M-5 OBJECTS
```

Current sufficiency basis:

```text
existing sourceAuthorityRef
+ trusted exact join
+ ephemeral lifetime
+ whole-projection invalidation
```

This is **not-yet-required**, not rejection.

## 13. Candidate C mandatory activation gates

Candidate C must reopen before authorizing any of the following.

### C1 · Cross-turn semantic survival

The same derived source object survives beyond the request/projection that created it.

### C2 · Stable derived identity across turns

The same source-local participant/post/article must be recognized later.

### C3 · Item-level reroll or mutation

Examples:

```text
reroll one Board post
edit/delete one reply
replace one derived media asset while semantic object survives
```

### C4 · Append / merge / partial survival

Examples:

```text
append replies to an old Board
preserve some old entries after source refresh
merge source projections into one persistent object
```

### C5 · Derived-from-derived propagation

Examples:

```text
BOARD → SOCIAL_FEED
SOCIAL_FEED → NEWS
NEWS → PUBLIC_KNOWLEDGE
```

when downstream objects must preserve which derived parent supports them.

### C6 · Controlled future-context re-entry

If source material can re-enter later prompts, its support/freshness must be provable at that later request.

### C7 · Source replacement while descendants survive

If some descendants intentionally survive source edit/reroll, whole-object invalidation is no longer enough.

### C8 · Delayed/asynchronous materialization tied to semantic identity

Example:

```text
later image-generation result must attach to the exact still-current semantic post
```

Late effects need stable target/support identity rather than positional guessing.

## 14. Activation must remain consumer-driven

Even after one gate opens, Candidate C must begin with minimum metadata for the concrete surviving object.

It must not automatically become:

```text
generic semantic graph DB
world-event identity replacement
second Lineage runtime
second Evidence store
social-network persistence engine
unbounded provenance history
```

Rule:

```text
FIRST CONCRETE SURVIVING DERIVED OBJECT
→ MINIMUM EXTRA PROVENANCE NEEDED FOR THAT OBJECT
```

## 15. Future metadata questions, not a frozen schema

When Candidate C actually activates, the design must answer only what the concrete object needs:

```text
which authoritative source ref supports it?
which local derived locator identifies it?
which source revision/generation was it derived from?
what operation invalidates or replaces it?
can descendants survive parent replacement?
what bounded proof is required before reuse/re-entry?
```

No `DerivedProvenanceV1` schema is frozen now.

## 16. Context Projection relationship

Candidate C freshness cannot solve the parked Context Projection blocker.

```text
DERIVED OBJECT FRESHNESS
!=
WHOLE-CONVERSATION SEMANTIC SELF-CONTAINMENT
```

Do not use provenance as an excuse for blanket prefix cuts.

## 17. 3M-7 gate

The roadmap places context re-entry/source history after 3M-6.

3M-6 therefore freezes:

```text
ordinary derived source re-entry remains NONE
```

If 3M-7 proposes non-zero re-entry, Gate C6 automatically opens and Candidate C must be explicitly revisited before such re-entry can be authorized.

## 18. Rejected alternatives

```text
ACTIVATE_GENERIC_C_NOW              → REJECT
INDICES_AS_DURABLE_PROVENANCE       → REJECT
FUZZY_SOURCE_SIMILARITY_FOR_SALVAGE → REJECT
PRESENTATION_DECIDES_STALENESS      → REJECT
PERSIST_OLD_SIDECARS_FOR_DEBUGGING  → REJECT
```

## 19. Selected 3M-6 design seam

```text
CURRENT_PROJECTION_SUPPORT_INVALIDATION_GATE
```

It must freeze:

```text
exact existing-authority join at use boundary
whole-projection invalidation on mismatch
presentation invalidation follows semantic invalidation
no persistent invalidation ledger for ephemeral objects
explicit Candidate C mandatory activation gates
```

## 20. Non-impact boundary

3M-6 first design must not change:

```text
Lineage runtime semantics
Evidence runtime semantics
Handoff runtime semantics
Representation/Edit-Reconcile semantics
persistent state
Prompt bytes
assistant visible output
Community / Reaction
DOM/CSS
S7 / v0.70.3
release-simcore
```

## 21. Impact verdict

```text
FIRST_3M6_SEAM = CURRENT_PROJECTION_SUPPORT_INVALIDATION_GATE
CANDIDATE_C_CURRENT_STATE = CONDITIONALLY_READY / NOT ACTIVATED
CURRENT_OBJECT_INVALIDATION = WHOLE_PROJECTION_ON_AUTHORITY_MISMATCH
NEW_PERSISTENCE_REQUIRED = NO
NEW_LINEAGE_OWNER_REQUIRED = NO
NEW_EVIDENCE_OWNER_REQUIRED = NO
DESIGN_ONLY = YES
```

Next design transaction may freeze this support/invalidation contract and Candidate C activation matrix without implementing runtime behavior.
