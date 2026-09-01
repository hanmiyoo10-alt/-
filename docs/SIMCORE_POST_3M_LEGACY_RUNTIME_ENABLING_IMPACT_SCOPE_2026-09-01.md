# SimCore Post-3.0M Legacy Migration / Runtime-Enabling Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · LEGACY COMMUNITY MIGRATION + RUNTIME-ENABLING CONTROL PLANE · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · LEGACY COMPATIBILITY · RUNTIME ENABLEMENT · IMPACT SCOPE**

## 0. Purpose

The user selected the sixth post-3M follow-up lane for an overall design:

```text
Legacy / Runtime-enabling
```

This impact scope determines the narrowest coherent master-design surface before any detailed migration or implementation work.

It does not implement, deploy, hide, remove, rewrite, serialize, mount, or persist anything.

## 1. Fresh authority snapshot

At impact-scope start:

```text
main
= 3b9fcf890c61d318cd6cedec4304feef8ce34e5f

release-simcore
= 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

`release-simcore` remains production runtime authority.

`main` remains design/evidence/roadmap/admin authority.

The current main already contains later post-3M design inputs, including:

```text
SOCIAL_FEED design
PUBLIC_KNOWLEDGE settlement design
Candidate C durable-derived-object master design
Multi-Family Orchestration design
Interaction / Materialization master design
```

These are design inputs only and do not change current production.

## 2. Authority chain

This impact scope consumes at minimum:

```text
docs/SIMCORE_POST_3M_FOLLOWUP_DESIGN_CATALOG_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
docs/SIMCORE_POST_3M_CANDIDATE_C_DURABLE_DERIVED_OBJECT_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_MULTI_FAMILY_ORCHESTRATION_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_INTERACTION_MATERIALIZATION_MASTER_DESIGN_2026-09-01.md
```

The exact Candidate C / Multi-Family / Interaction filenames on current main are authoritative where present; this document does not duplicate their contracts.

## 3. Problem decomposition

The sixth follow-up item actually contains **two different architecture problems**:

```text
Plane E · Legacy Community migration / compatibility cleanup
Plane F · 3.0M runtime-enabling contracts
```

They are related but not the same.

Canonical distinction:

```text
LEGACY MIGRATION
!=
RUNTIME ENABLEMENT
```

Runtime can become structurally ready before legacy retirement is complete.

Legacy retirement cannot safely begin before enough structured runtime behavior exists to replace the role being retired.

## 4. Selected master seam

The narrowest coherent master-design seam is:

```text
LEGACY_COMMUNITY_MIGRATION_AND_RUNTIME_ENABLEMENT_CONTROL_PLANE
```

The central transition principle is:

```text
SEMANTIC OWNER FIRST
→ PRESENTATION SECOND
→ HOST-CONTEXT RETIREMENT LAST
```

This ordering prevents one UI migration toggle from silently changing semantic production, host history, model context, and compatibility at once.

## 5. Why one `legacyEnabled` boolean is rejected

Legacy Community currently spans multiple responsibilities.

At minimum the migration must distinguish:

```text
A. semantic production
B. visible presentation
C. host transcript / future-context carriage
D. historical parsing / read compatibility
```

Therefore this is forbidden architecture:

```text
legacyCommunityEnabled = false
→ stop generation
→ hide UI
→ strip history
→ delete parser
```

Those are four separate authority decisions.

## 6. Four migration axes

The master design should treat these independently.

### Axis S · Semantic producer

```text
LEGACY_NATIVE_SEMANTIC
STRUCTURED_VALIDATED_SEMANTIC
```

### Axis P · Presentation

```text
LEGACY_COMMUNITY_PRESENTATION
STRUCTURED_LIVE_REACTION_PRESENTATION
```

### Axis H · Host context / transcript growth

```text
LEGACY_CONTEXT_GROWING
LEGACY_CONTEXT_PREEXISTING_ONLY
NO_NEW_SOURCE_CONTEXT
```

### Axis R · Historical read compatibility

```text
LEGACY_READ_WRITE_COMPAT
LEGACY_READ_ONLY_COMPAT
LEGACY_PARSER_RETIRED
```

No axis grants authority to another.

## 7. Current state

Current production is conceptually:

```text
S = LEGACY_NATIVE_SEMANTIC
P = LEGACY_COMMUNITY_PRESENTATION
H = LEGACY_CONTEXT_GROWING
R = LEGACY_READ_WRITE_COMPAT
```

This document does not claim those names exist in runtime code.

They are migration-state labels only.

## 8. Preferred target direction

The preferred long-term target is **prospective retirement**, not retroactive transcript surgery.

Conceptually:

```text
S = STRUCTURED_VALIDATED_SEMANTIC
P = STRUCTURED_LIVE_REACTION_PRESENTATION
H = LEGACY_CONTEXT_PREEXISTING_ONLY / NO NEW LEGACY SOURCE CONTEXT
R = LEGACY_READ_ONLY_COMPAT
```

Meaning:

```text
new source turns stop appending new legacy <COMMUNITY> blocks
old historical <COMMUNITY> bytes are not rewritten
old chats remain readable
new structured source payload does not automatically re-enter future model context
```

## 9. Why prospective retirement is preferred

3M-7 already proved that host transcript history and structured Source Intelligence memory are different concerns.

The historical Context Projection research also preserved:

```text
structurally removable prefix
!=
semantically self-contained boundary
```

Therefore this impact scope rejects a migration whose first move is:

```text
scan old transcript
→ delete old <COMMUNITY>
```

The existing `ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY` concern remains relevant.

## 10. No retroactive transcript rewrite in the first migration

First migration scope should freeze:

```text
OLD LEGACY HISTORY
= PRESERVE BY DEFAULT
```

No first-pass migration should:

```text
rewrite old assistant messages
strip old <COMMUNITY> blocks
renumber old messages
mutate old visible bodies
silently alter edit-reconcile fingerprints
```

If a future host exposes a semantically safe block-local context exclusion mechanism, it may be separately evaluated.

## 11. Legacy presentation and context must not be conflated

A source block can be:

```text
visible but not future-context authority
```

or:

```text
historically present but no longer the primary current presentation
```

Therefore CSS hiding alone is not a migration.

Forbidden proof:

```text
legacy block hidden in DOM
→ legacy context retired
```

That only proves a presentation effect.

## 12. Structured semantic authority must precede compatibility serialization

If a temporary legacy bridge is ever required after structured activation, the bridge must be derived from **validated structured LIVE_REACTION semantics**.

Required direction:

```text
Validated LIVE_REACTION
        ↓
Presentation Renderer
        ↓
structured UI

Validated LIVE_REACTION
        ↓ optional compatibility serializer
legacy <COMMUNITY> representation
```

Forbidden:

```text
model generates structured sidecar
+
model independently generates legacy <COMMUNITY>
→ both treated as semantic authority
```

Canonical rule:

```text
ONE SOURCE PROJECTION
→ ONE SEMANTIC OWNER
→ ZERO OR MORE COMPATIBILITY REPRESENTATIONS
```

## 13. Compatibility bridge is not automatically required

The master design should not assume a permanent legacy serializer.

A bridge may exist only if a concrete current consumer requires it.

Default preference:

```text
NO PROVEN LEGACY CONSUMER
→ DO NOT INVENT PERMANENT BRIDGE
```

A compatibility bridge that merely preserves historical architecture forever defeats migration.

## 14. Scope of `<COMMUNITY>` migration

Legacy `<COMMUNITY>` corresponds only to the LIVE_REACTION compatibility lane.

It must never become a universal fallback renderer/serializer for:

```text
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Forbidden:

```text
unsupported source family
→ serialize into <COMMUNITY>
```

## 15. Multi-family implication

The post-3M Multi-Family Orchestration design may produce sibling projections from one current authority.

Legacy compatibility, if temporarily retained, may apply only to the LIVE_REACTION sibling.

Example:

```text
LIVE_REACTION → optional legacy bridge
BOARD         → no legacy Community fallback
NEWS          → no legacy Community fallback
```

## 16. Interaction implication

Current post-3M Interaction / Materialization design has concretely triggered Candidate C for semantic mutation work such as `BOARD_APPEND_REPLY`.

That does **not** make legacy `<COMMUNITY>` a durable mutation target.

Frozen impact rule:

```text
LEGACY COMMUNITY REPRESENTATION
= READ / COMPATIBILITY SURFACE ONLY
= NOT MUTATION TARGET
```

Interaction events must target current structured semantic objects through the interaction control plane.

No hidden DOM attribute or legacy text position may become durable source identity.

## 17. Candidate C split

Current design landscape now has two different tiers.

### Tier A · first-major read-only Source runtime

```text
LIVE_REACTION
BOARD
NEWS
current projection only
no structured source history
no mutation
```

Candidate C is not required merely to enable this tier.

### Tier B · post-3M durable / interactive extensions

Examples:

```text
BOARD_APPEND_REPLY
cross-turn source identity
item edit / reroll
exact-object async media
future context re-entry
```

These may require Candidate C capabilities already triggered/designed by later post-3M work.

The legacy/runtime-enabling master must not force Tier B durability into Tier A.

## 18. Runtime-enabling plane inherits G1–G8

3M-10 already freezes:

```text
G1 then-current production re-preflight
G2 Exposure target-host mechanics / model compliance
G3 current source-job selector authority
G4 structured sidecar producer / transport
G5 presentation host mount authority
G6 concrete family hard caps
G7 NEWS trusted maturity-context producer
G8 integration evidence instrumentation
```

This follow-up should **order and package** these gates.

It should not replace them with a second gate system.

## 19. Runtime-enable dependency classes

The gates naturally separate into four dependency classes.

### Class A · current-production grounding

```text
G1
```

Everything else must be designed against the then-current production authority.

### Class B · semantic generation and safety

```text
G2
G3
G4
G6
```

These are required before an active structured source semantic path may be trusted.

### Class C · presentation activation

```text
G5
```

Required before structured source UI becomes a supported live surface.

### Class D · family / evidence completion

```text
G7  NEWS-specific
G8  integration/performance evidence
```

## 20. Readiness should be staged, not one giant switch

The master design should define staged readiness such as:

```text
READY_FOR_STRUCTURED_SHADOW
READY_FOR_STRUCTURED_PRESENTATION
READY_FOR_BOARD
READY_FOR_NEWS
READY_FOR_LEGACY_PRESENTATION_CONVERGENCE
READY_FOR_PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT
```

These names are conceptual and may be refined by the master design.

The purpose is to avoid:

```text
all G1–G8 closed
→ everything turns on at once
```

## 21. First runtime-enabling target should be LIVE_REACTION compatibility-first

3M-10 already recommends LIVE_REACTION compatibility-first implementation.

That remains the narrowest bridge between current production and structured architecture because current `<COMMUNITY>` behavior provides a real comparison surface.

Preferred future activation order remains:

```text
LIVE_REACTION
→ BOARD
→ NEWS
```

Post-3M SOCIAL_FEED / PUBLIC_KNOWLEDGE activation is separate and does not block first-major runtime enablement.

## 22. Shadow stage must preserve user-visible output

The safest first active structured stage is conceptually:

```text
current legacy output unchanged
+
structured semantic path evaluated / instrumented in shadow
```

No visible structured UI or host-history migration is required merely to prove semantic machinery.

However shadow structured semantics must not acquire production authority merely because diagnostics look plausible.

## 23. Presentation convergence must not wait for host-history retirement

Once structured semantics and host mount are proven, structured LIVE_REACTION presentation may become primary **before** old historical `<COMMUNITY>` bytes are removed.

This is why presentation and context are separate axes.

Canonical ordering:

```text
structured semantic owner proven
→ structured presentation proven
→ stop growing new legacy context when safe
→ preserve old historical bytes
```

## 24. Context retirement is prospective by default

Preferred first context-migration target:

```text
NEW STRUCTURED SOURCE TURNS
→ no new automatic legacy <COMMUNITY> host-context payload

OLD LEGACY TURNS
→ unchanged historical bytes
```

This creates a bounded non-growing legacy tail instead of risky transcript rewriting.

## 25. Legacy parser target

The preferred final parser state is not immediate deletion.

```text
LEGACY PARSER / READER
→ READ_ONLY_COMPAT
```

It may remain able to recognize old historical chats while new structured source turns no longer produce legacy blocks.

Hard parser removal is a later cleanup question, not required for successful migration.

## 26. Old-chat reload contract

A successful migration must preserve the ability to reload chats containing historical legacy Community output without:

```text
runtime crash
message corruption
false source activation
source history resurrection
unexpected mutation target creation
```

Historical recognition does not grant current source authority.

## 27. No legacy residue activation

After structured migration, the existence of old `<COMMUNITY>` in history must never by itself activate:

```text
LIVE_REACTION
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

3M-9 current-request source authority remains controlling.

## 28. No duplicate context

During any coexistence stage:

```text
legacy Community transcript
+
structured sidecar automatic re-entry
```

is forbidden.

3M-7 remains authoritative:

```text
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
```

## 29. No dual-visible duplication by default

User-facing coexistence must not default to:

```text
legacy Community block
+
structured LIVE_REACTION card
```

showing the same projection twice.

Dual visible surfaces are permitted only in bounded diagnostics/evaluation, never as the default user experience.

## 30. Semantic equivalence does not require byte equality

When comparing legacy Community and structured LIVE_REACTION during migration:

```text
natural-language byte equality
```

is not required.

Required evidence concerns:

```text
source authority
exposure restraint
no private leakage
family identity
bounded assertion semantics
current-turn support
```

The old and new renderer may phrase reactions differently.

## 31. Migration acceptance dimensions

A future migration must separately prove:

```text
M1 semantic safety
M2 source authority / stale invalidation
M3 visible presentation correctness
M4 host-history/context behavior
M5 old-chat read compatibility
M6 ordinary-chat dormancy
M7 reroll/edit/reload lifecycle
M8 performance / no accumulation
```

No single screenshot closes all dimensions.

## 32. Runtime-enabling evidence must remain non-semantic

G8 instrumentation must be bounded observability.

It must not become:

```text
source history database
semantic cache authority
model memory
```

Diagnostics may report counts/fingerprints/statuses but should not persist unbounded source content.

## 33. No runtime implementation in this follow-up

This impact scope and its follow-up master design must not modify:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
release-simcore
prompt bytes
visible assistant output
DOM/CSS
persistent schema
host history
network/model-call topology
```

## 34. Product / release separation

The current S7 / v0.70.3 product lane remains separate.

No legacy migration/runtime-enabling design checkpoint assigns a new semver or authorizes release publication.

A later implementation must re-preflight the then-current `release-simcore` authority.

## 35. Blocker set for the master design

The master design must explicitly prevent:

```text
BLOCKER · LEGACY_AND_STRUCTURED_BECOME_INDEPENDENT_SEMANTIC_OWNERS
BLOCKER · CSS_HIDING_CLAIMED_AS_CONTEXT_MIGRATION
BLOCKER · RETROACTIVE_LEGACY_TRANSCRIPT_REWRITE_WITHOUT_SEMANTIC_PROOF
BLOCKER · LEGACY_COMMUNITY_USED_AS_GENERIC_FAMILY_FALLBACK
BLOCKER · LEGACY_REPRESENTATION_BECOMES_MUTATION_TARGET
BLOCKER · STRUCTURED_REENTRY_DUPLICATES_LEGACY_TRANSCRIPT_CONTEXT
BLOCKER · LEGACY_BRIDGE_SERIALIZES_UNVALIDATED_DRAFT
BLOCKER · PRESENTATION_SUCCESS_CLAIMED_AS_SEMANTIC_OR_CONTEXT_PASS
BLOCKER · HISTORICAL_LEGACY_RESIDUE_ACTIVATES_CURRENT_SOURCE_JOB
BLOCKER · LEGACY_PARSER_REMOVAL_BREAKS_OLD_CHAT_COMPATIBILITY
BLOCKER · RUNTIME_ENABLEMENT_BYPASSES_3M10_GATES
BLOCKER · TIER_A_READ_ONLY_RUNTIME_FORCED_TO_ADOPT_TIER_B_DURABILITY
BLOCKER · LATEST_INSTALL_DIVERGENCE_IN_FUTURE_RUNTIME_TRANSACTION
```

## 36. WATCH / DEFER

```text
WATCH · OLD_LEGACY_CONTEXT_TAIL_MAY_PERSIST_IN_LONG_EXISTING_CHATS
WATCH · STRUCTURED_VS_LEGACY_MODEL_COMPLIANCE_REQUIRES_TARGET_HOST_EVIDENCE
WATCH · HOST_SUPPORT_FOR_BLOCK_LOCAL_CONTEXT_CONTROL_UNPROVEN
WATCH · LEGACY_PRESENTATION_CONSUMER_DEPENDENCIES_NOT_YET_INVENTORIED

DEFER · RETROACTIVE_OLD_TRANSCRIPT_CLEANUP
DEFER · HARD_LEGACY_PARSER_REMOVAL
DEFER · GENERIC_HOST_HISTORY_PROJECTION_FILTER
DEFER · RUNTIME_IMPLEMENTATION
DEFER · RELEASE / SEMVER ASSIGNMENT
DEFER · INTERACTIVE_CANDIDATE_C_RUNTIME
```

## 37. Selected master-design questions

The follow-up master design must answer:

```text
1. What are the exact migration states?
2. Which axis changes in each state?
3. When does structured LIVE_REACTION become the sole semantic owner?
4. Is a legacy compatibility serializer ever required, and under what proof?
5. When can structured presentation become primary?
6. When does new legacy transcript growth stop?
7. What historical legacy bytes remain untouched?
8. What old-chat read compatibility remains?
9. How do G1–G8 map to staged readiness?
10. Which gates apply only to NEWS or post-3M extensions?
11. What evidence moves the system from one stage to the next?
12. What rollback direction exists if structured presentation or context migration fails?
```

## 38. Frozen impact conclusion

```text
POST_3M_LANE_6_SCOPE
= LEGACY_COMMUNITY_MIGRATION_AND_RUNTIME_ENABLEMENT_CONTROL_PLANE

DESIGN PRINCIPLE
= SEMANTIC OWNER FIRST
→ PRESENTATION SECOND
→ HOST-CONTEXT RETIREMENT LAST

LEGACY MIGRATION TARGET
= PROSPECTIVE RETIREMENT
= OLD HISTORY PRESERVED
= LEGACY READ-ONLY COMPAT PREFERRED

RUNTIME ENABLEMENT
= REUSE / ORDER 3M-10 G1–G8
= NO SECOND GATE SYSTEM

TIER_A READ_ONLY SOURCE RUNTIME
= MUST NOT REQUIRE INTERACTIVE CANDIDATE C

TIER_B DURABLE / INTERACTIVE SOURCE
= MAY REQUIRE CURRENT POST-3M CANDIDATE C CONTRACTS

IMPLEMENTATION
= NOT AUTHORIZED

PRODUCTION
= UNCHANGED

release-simcore
= UNCHANGED
```
