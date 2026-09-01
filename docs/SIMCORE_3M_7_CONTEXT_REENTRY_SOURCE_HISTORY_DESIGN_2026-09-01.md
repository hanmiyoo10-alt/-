# SimCore 3M-7 Context Re-entry / Source-History Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-7 DESIGN FROZEN · STRUCTURED SOURCE HISTORY = CURRENT PROJECTION ONLY · AUTOMATIC STRUCTURED RE-ENTRY = NONE · LEGACY COMMUNITY TRANSCRIPT COMPATIBILITY PRESERVED · C6 NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-7 · CONTEXT RE-ENTRY FIREWALL · SOURCE-HISTORY HORIZON · MAIN-MODEL ISOLATION**

## 0. Purpose

3M-7 freezes future-context and source-history behavior for the Source Intelligence objects designed through 3M-6.

It answers:

```text
What is the active lifetime of a structured source projection?
Does a validated source object automatically enter later model prompts?
How does legacy <COMMUNITY> transcript compatibility differ from Source Intelligence memory?
What may remain visible in UI without becoming model context?
When does a future re-entry request activate Candidate C gate C6?
```

This checkpoint is design-only.

It does not implement transcript filtering, source-history persistence, prompt injection, retrieval, context projection, runtime transport, DOM/CSS, S7/v0.70.3 changes, release publication, or `release-simcore` mutation.

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_3M_DESIGN_ONLY_LANGUAGE_CLARIFICATION_2026-09-01.md
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Primary decision

The frozen 3M-7 contract is:

```text
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTOMATIC_REENTRY = NONE
STRUCTURED_SOURCE_HISTORY_STORE = NONE
STRUCTURED_SOURCE_RETRIEVAL = NONE
CANDIDATE_C_C6 = NOT_ACTIVATED
```

Legacy compatibility remains separately:

```text
LEGACY_COMMUNITY_HOST_HISTORY
= UNCHANGED_COMPATIBILITY
```

Canonical summary:

```text
NEW STRUCTURED SOURCE INTELLIGENCE
DOES NOT CREATE A NEW MODEL MEMORY CHANNEL
```

## 3. Terminology

### 3.1 Host transcript history

Existing user/assistant message history supplied by the host/current request path.

This history predates Source Intelligence and has its own representation/request ownership.

### 3.2 Structured source semantic history

A cross-turn collection of validated Source Intelligence objects such as:

```text
ValidatedSourceSemanticSidecarV1
ValidatedBoardSemanticSidecarV1
```

Current contract:

```text
NONE
```

### 3.3 Context re-entry

A derived source field or object being intentionally injected into a later model request because it was previously generated/validated as Source Intelligence data.

Current contract:

```text
NONE
```

### 3.4 Presentation retention

A source surface remaining visible or navigable in UI after its creation turn.

Presentation retention is not context re-entry.

### 3.5 User reintroduction

The user explicitly supplies text in the current input that resembles or quotes prior source content.

This is current user input, not resurrection of the old derived object.

## 4. History-domain taxonomy

3M-7 freezes four independent domains.

```text
H1 HOST TRANSCRIPT
H2 STRUCTURED SOURCE SEMANTIC HISTORY
H3 PRESENTATION RETENTION
H4 DIAGNOSTIC RECEIPTS
```

Rules:

```text
H1 may exist under current host behavior
H2 = NONE
H3 may exist in future UI but has no semantic authority
H4 is bounded diagnostics only and never model memory
```

No domain automatically authorizes another.

## 5. Legacy `<COMMUNITY>` policy

The legacy compatibility path remains:

```text
contextReentryPolicy
= LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY
```

Meaning:

- current `<COMMUNITY>` output may remain part of ordinary assistant transcript history exactly as today;
- Source Intelligence adds no second copy of that Community payload to later prompts;
- the existence of Community text in transcript does not create a new structured source-history owner;
- 3M-7 does not strip or rewrite historical Community transcript bytes.

Canonical rule:

```text
LEGACY TRANSCRIPT PRESENCE
!=
STRUCTURED SOURCE MEMORY CONTRACT
```

## 6. Structured LIVE_REACTION policy

For a future fully structured LIVE_REACTION path independent of legacy transcript bytes:

```text
contextReentryPolicy
= NO_STRUCTURED_REENTRY
```

A validated LIVE_REACTION sidecar is current-projection data only.

After the projection lifetime ends, it has no automatic right to enter a later prompt.

## 7. BOARD policy

For BOARD V1:

```text
contextReentryPolicy
= NO_STRUCTURED_REENTRY
```

Therefore BOARD V1 does not promise:

```text
same thread continues next turn
same participantOrdinal survives next turn
old post can be looked up by ID
old replies are injected into a later prompt
old Board snapshot is appended to
```

The Board is a bounded source snapshot, not conversational memory.

## 8. No double-entry rule

During any future migration period where legacy Community text and structured semantic data coexist:

```text
legacy transcript already supplies visible Community text
+
structured sidecar exists
```

must not become:

```text
legacy Community text
+
additional serialized structured Community copy
→ both injected into later prompt
```

Canonical rule:

```text
COMPATIBILITY COEXISTENCE
!=
DUPLICATE CONTEXT ENTRY
```

The selected 3M-7 design avoids this by authorizing zero additional structured re-entry.

## 9. Active source horizon

The first bounded structured source horizon is:

```text
CURRENT_PROJECTION_ONLY
```

This means one structured source object is relevant only to the request/projection lifecycle that created and validated it, plus its immediate presentation read model where applicable.

No `last N source projections` count is frozen.

Reason:

```text
no concrete consumer requires N > 0
```

A guessed history window would be accidental product semantics.

## 10. Fresh generation in a later turn

A later request may create a fresh source projection from then-current authority.

Required conceptual flow:

```text
current request
→ current Lineage / Handoff / Evidence
→ current exposure/policy classification
→ new draft
→ new validation
→ new current source projection
```

This does not reuse the old sidecar.

Canonical distinction:

```text
FRESH REGENERATION
!=
SOURCE HISTORY REENTRY
```

## 11. User reintroduction boundary

If the user explicitly supplies prior-looking source text in the current request, that text is available because the **current user supplied it**.

Example:

```text
"아까 게시판에서 'X'라고 했는데, 이걸 보고 반응해줘"
```

The literal quoted text may participate as current-user request context under ordinary authority rules.

But it does not prove:

```text
that a prior Board object still exists
that the quoted author identity is durable
that the prior Board source support is still current
that the old object may be mutated or appended
```

Canonical rule:

```text
CURRENT USER TEXT AUTHORITY
!=
PRIOR DERIVED OBJECT PROVENANCE
```

## 12. Deictic historical requests

A request such as:

```text
"아까 게시판 이어서"
"저번 댓글 다시 보여줘"
```

without an authorized structured source-history path does not permit Source Intelligence to:

```text
scan arbitrary transcript history
fuzzy-match old content
reconstruct old participant identities
invent a source object ID
pretend a regenerated object is the exact historical object
```

Exact historical continuity is intentionally unsupported by current structured V1 families.

## 13. No second history resolver

3M-7 preserves the existing owner boundary:

```text
Source Intelligence
→ must not rescan arbitrary history to recover source memory
```

Current-source identity remains owned by existing Lineage / Handoff / Evidence paths.

If historical retrieval is later required, it needs a dedicated history/provenance owner rather than a hidden scan inside Prompt or Presentation.

## 14. Presentation retention firewall

A future host may keep old source UI visible.

Examples:

```text
old Board card remains in transcript UI
old live-reaction panel remains expandable
user scrolls back to an earlier source surface
```

This does not authorize:

```text
prompt injection
canonical truth promotion
source object freshness
persistent participant identity
```

Canonical rule:

```text
VISIBLE / INTERACTIVE UI HISTORY
!=
MODEL CONTEXT MEMORY
```

Presentation-only state remains ephemeral/non-authoritative under 3M-4.

## 15. Diagnostics firewall

Validation receipts and support diagnostics must never be repurposed as source history.

Forbidden:

```text
receipt rows → future prompt memory
quarantine counts → semantic history
old support reason codes → historical source reconstruction
```

Diagnostics may describe a past decision for operators, not recreate semantic content for the model.

## 16. Source invalidation relationship

Because structured source objects do not re-enter later prompts, the current 3M-6 support-at-use gate remains sufficient for their current lifetime.

No later prompt needs to prove old-object freshness because no old object is injected.

Therefore:

```text
C6 remains closed
```

If a future design introduces later reuse, support must be re-proven at that later use boundary before prompt construction.

## 17. Candidate C activation gate for re-entry

Any non-zero derived-source context re-entry immediately changes the design state to:

```text
C6 · CONTROLLED_FUTURE_CONTEXT_REENTRY = ACTIVATED
```

Before such a design may be authorized, it must freeze at minimum:

```text
1. concrete surviving source object
2. exact fields allowed to re-enter
3. why each field is needed
4. source/derived identity owner
5. existing authority refs supporting the object
6. freshness proof at later prompt construction
7. edit/reroll/source-replacement invalidation behavior
8. bounded retention horizon
9. bounded item/character/token budget
10. prompt insertion owner and exact ordering
11. duplicate-entry prevention against host transcript
12. fallback when support cannot be proven
13. whether descendants may survive parent replacement
14. diagnostics that do not retain hidden semantic bodies
```

No generic provenance schema is frozen by 3M-7.

## 18. Candidate C activation is minimum-consumer scoped

If a future requirement needs only a tiny bounded re-entry field, Candidate C should design only the metadata needed for that field.

Example:

```text
one validated publication identifier must re-enter
```

would not automatically authorize:

```text
persistent social graph
Board database
full source archive
cross-family lineage graph
```

The consumer-driven rule from 3M-6 remains authoritative.

## 19. Structured archive retrieval gate

A future requirement to retrieve exact old source objects by user request is outside current 3M-7 authority.

Such a feature likely crosses:

```text
C1 cross-turn survival
C2 stable source-local identity
C6 future-context re-entry
```

and may cross C3/C4 depending mutation/append semantics.

It must receive a dedicated impact/design transaction.

## 20. Legacy transcript migration remains separate

3M-7 does not remove old `<COMMUNITY>` content from ordinary host transcript construction.

Reason:

- compatibility behavior already exists;
- removing it could change later semantic dependencies;
- Context Projection proved structural boundaries are not semantic self-containment proof;
- transcript/request construction has separate ownership from structured Source Intelligence history.

Disposition:

```text
DEFER · LEGACY_COMMUNITY_HOST_HISTORY_MIGRATION · SEPARATE DESIGN
```

This defer does not weaken the zero-new-reentry rule for structured families.

## 21. Context Projection relationship

Frozen distinctions:

```text
ZERO STRUCTURED SOURCE REENTRY
!=
OLD TRANSCRIPT MAY BE DELETED
```

and:

```text
CURRENT SOURCE OBJECT IS EPHEMERAL
!=
OLD CONVERSATION PREFIX IS SEMANTICALLY IRRELEVANT
```

The parked `ACTIVE_ROOT_PREFIX_CUT_SEMANTIC_DEPENDENCY` blocker remains unchanged.

## 22. Main-model isolation

3M-7 strengthens the 3M-0 invariant:

```text
source sidecar exists
!=
main model consumes source history
```

When source surfaces are irrelevant, no accumulated structured source history is added to ordinary generation burden.

This is both a correctness and long-chat stability property.

## 23. Source-history cost model

Selected V1 cost:

```text
new persistent source-history reads  = 0
new persistent source-history writes = 0
new source-history scans             = 0
new source-history prompt bytes      = 0
new model calls                      = 0
new network calls                    = 0
```

Legacy host transcript cost remains pre-existing behavior and is not duplicated by structured Source Intelligence.

## 24. Future family inheritance

New source families inherit:

```text
AUTO_CONTEXT_REENTRY = NONE
```

unless their own concrete design explicitly crosses C6 and satisfies the promotion gate.

Family name or perceived formality does not grant memory authority.

Therefore:

```text
NEWS is more formal
!=
NEWS automatically re-enters future prompts

PUBLIC_KNOWLEDGE looks durable
!=
PUBLIC_KNOWLEDGE automatically becomes model memory
```

3M-8 must respect this default.

## 25. Failure policy

When old structured source context would be convenient but is not authorized:

```text
DO NOT HIDDEN-RETRIEVE
DO NOT FUZZY-RECONSTRUCT
DO NOT SILENTLY PROMOTE UI HISTORY
DO NOT CLAIM EXACT CONTINUITY
```

A fresh current projection may be generated if current authority supports it.

If exact historical continuity is required by the user experience, that requirement must activate the appropriate Candidate C gates rather than be approximated invisibly.

## 26. Design invariants

```text
I1  structured source history horizon is current projection only
I2  no automatic structured source re-entry
I3  legacy transcript compatibility is not precedent for new source memory
I4  no duplicate context entry during legacy/structured coexistence
I5  UI retention does not create context authority
I6  diagnostics do not create semantic memory
I7  user-supplied text is current input, not old-object provenance
I8  no hidden history scan or fuzzy source resurrection
I9  fresh regeneration is not history reuse
I10 C6 activates before any non-zero derived-source future re-entry
I11 no generic provenance schema before a concrete C6 consumer
I12 Context Projection blocker remains untouched
```

## 27. Design-only validation scenarios

Future static/design evidence should preserve scenarios such as:

```text
legacy COMMUNITY appears in host transcript
→ no additional structured duplicate injected

structured BOARD created on turn N
→ turn N+1 gets zero Board sidecar bytes by default

old Board UI remains visible
→ model-context authority remains zero

user explicitly quotes old-looking Board text
→ current user text available; old Board provenance not resurrected

user says only "아까 게시판 이어서"
→ no hidden structured archive lookup

current source supports a new Board
→ fresh Board may be generated; not claimed as same old thread

future design proposes one prior Board field in prompt
→ C6 activates before authorization
```

No runtime test/tool implementation is authorized by this document.

## 28. Explicit non-goals

```text
NO source memory database
NO structured source archive
NO historical source retrieval
NO cross-turn Board identity
NO automatic prior-source prompt block
NO transcript filtering implementation
NO root-prefix deletion
NO new history resolver
NO Candidate C implementation
NO runtime implementation
NO release transaction
```

## 29. Frozen verdict

```text
3M_7 = DESIGN_FROZEN
SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_AUTO_REENTRY = NONE
STRUCTURED_HISTORY_STORE = NONE
LEGACY_COMMUNITY_TRANSCRIPT = UNCHANGED_COMPATIBILITY
PRESENTATION_RETENTION_AUTHORITY = NONE
CANDIDATE_C_C6 = NOT_ACTIVATED
RUNTIME_IMPLEMENTATION = NOT_AUTHORIZED
```

## 30. Next checkpoint handoff

The next master checkpoint is:

```text
3M-8 · Publication-Maturity Families
```

Candidate families:

```text
NEWS
PUBLIC_KNOWLEDGE
```

3M-8 inherits the 3M-7 firewall:

```text
more durable-looking publication form
!=
automatic persistence
!=
automatic future-context re-entry
```

If a publication-maturity design genuinely needs durable/reentrant source objects, it must explicitly declare the Candidate C gates it crosses before expanding the architecture.