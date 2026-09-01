# SimCore 3M-1 Source Projection Envelope + Legacy Community Compatibility Design — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-1 DESIGN FROZEN · LEGACY COMMUNITY COMPATIBILITY CONTRACT FROZEN · IMPLEMENTATION NOT AUTHORIZED · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-1 · SOURCE PROJECTION ENVELOPE · LIVE_REACTION · LEGACY COMMUNITY COMPATIBILITY**

## 0. Purpose

3M-1 is the first concrete design checkpoint under the frozen 3.0M Source Intelligence master design.

Its purpose is deliberately narrow:

```text
represent current SimCore <COMMUNITY>
as
SourceProjectionEnvelope(family = LIVE_REACTION)
without changing current semantics, output bytes, prompt bytes, persistence, model traffic, or state authority
```

3M-1 is not the first new social feature.

It is the compatibility bridge that proves the existing Community surface can live inside the future Source Intelligence architecture before BOARD, SOCIAL_FEED, NEWS, PUBLIC_KNOWLEDGE, structured assertion schemas, or source-specific presentation changes are introduced.

Canonical success definition:

```text
OLD COMMUNITY BEHAVIOR
==
NEW ENVELOPE VIEW OF OLD COMMUNITY BEHAVIOR
```

The envelope may describe and bind existing behavior. It may not widen or rewrite that behavior in 3M-1.

---

## 1. Authority chain

3M-1 derives from:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_MODE_A_ERRATUM_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_TOTAL_SYNTHESIS_2026-09-01.md
docs/SIMCORE_LIGHTBOARD_MINIBOARD_DESIGN_CANDIDATE_SHORTLIST_2026-09-01.md
docs/SIMCORE_CONTEXT_PROJECTION_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_PROMPT_RUNTIME_BOUNDARY_COHESION_REVIEW_2026-08-26.md
```

Exact production runtime authority inspected for this design:

```text
release-simcore
production release = v0.70.1 Cold First-Turn Tail Attribution
production commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
```

This exact identity is evidence for the design transaction only. Runtime/deployment authority remains `release-simcore`.

---

## 2. 3M-1 non-goals

3M-1 does **not** authorize:

```text
new source family beyond LIVE_REACTION
BOARD implementation
SOCIAL_FEED implementation
NEWS implementation
PUBLIC_KNOWLEDGE implementation
new DOM/CSS presentation
new <SOURCE> output syntax
replacement of <COMMUNITY>
prompt wording changes
Exposure E6 production installation
new public/private classifier
new structured assertion extraction
new provenance ledger
new source identity registry
new persistent source database
new source-history retention
new automatic context exclusion
new auxiliary model request
network/media materialization
historical-chat rewrite
release-system changes
S7 / v0.70.3 scope changes
```

The checkpoint is successful only if it remains boring from the user's perspective.

---

## 3. Exact current production ownership readback

3M-1 must build on current owners rather than replacing them.

### 3.1 Lifecycle / mode owner

Current high-level mode model remains:

```text
A
B
C
```

with B expressed through runtime phases:

```text
B_START
B_CONTINUE
B_END
```

Current mode behavior relevant to Community:

```text
A          → ordinary/default path
B_START    → broadcast start phase
B_CONTINUE → broadcast continuation phase
B_END      → explicit broadcast end phase
C          → Community/source-oriented request path
```

3M-1 does not create new core modes.

### 3.2 Existing expected Community count owner

Production `expectedCommunityBlocks(mode)` owns the count contract.

Current contract:

```text
A          → 0
B_START    → 1
B_CONTINUE → 1
B_END      → 2
C          → 1
```

3M-1 must query or consume this existing result.

It must not duplicate the count table as an independent semantic authority in runtime code.

### 3.3 Community owner

The current `community` module owns parsing and Community-local representation semantics.

Current `<COMMUNITY>` extraction remains based on the existing block syntax:

```text
<COMMUNITY>
...
</COMMUNITY>
```

The module currently recognizes Community-local structure such as:

```text
platform header
TOP COMMENTS
REPLIES
highlight
logical comment/reply units
```

It also contains the current platform taxonomy, including families such as:

```text
NATIONAL
WORKPLACE_BLIND
CELEBRITY_FAN
PREMIUM_PRIVATE
INTERNATIONAL
```

Critical 3M-1 rule:

```text
CURRENT COMMUNITY PLATFORM FAMILY
!=
3.0M SOURCE INTELLIGENCE FAMILY
```

All current Community platform variants map to:

```text
SourceProjectionEnvelope.family = LIVE_REACTION
```

The old platform classification remains Community-owned compatibility metadata.

Do not turn NATIONAL, WORKPLACE_BLIND, or other current platform labels into new Source Intelligence families.

### 3.4 Reaction owner

The current `reaction` module owns reaction-tag semantics and RT numbering.

It parses / validates / normalizes the existing reaction marker grammar, including `[RT N]` behavior.

3M-1 must not introduce:

```text
source reaction clock
source sequence counter
projection RT number
```

that competes with Reaction.

Canonical rule:

```text
LIVE_REACTION envelope observes Reaction result.
LIVE_REACTION envelope does not own Reaction result.
```

### 3.5 Structure owner

Current Structure validation owns the required output-shape judgment, including expected Community count and terminal placement relationships.

Current state-commit safety includes separate checks for:

```text
structureSafe
reactionSafe
communitySafe
clockSafe
```

and only existing owners decide whether output is safe to commit.

3M-1 must not make an envelope valid merely because it can be constructed.

Canonical order:

```text
legacy Community / Reaction / Structure authority
→ compatibility envelope may describe accepted result
```

not:

```text
envelope constructed
→ therefore legacy output becomes accepted
```

### 3.6 Handoff owner

Current Handoff owns the bounded short-C source bridge and source-handoff registry.

Current contract includes `COMMUNITY_SOURCE_HANDOFF_V1` and a bounded persisted registry.

Handoff can establish bounded structural facts such as:

```text
eligible
root mode/index/fingerprint
source assistant index/fingerprint
current user relation
short-request identity
source-lock eligibility
```

3M-1 may reference these facts where already available.

It must not create a second source bridge or duplicate persistent handoff registry.

### 3.7 Evidence owner

Current Evidence owns exact request-message mapping/fencing for the eligible source path.

Its current bounded request evidence can identify:

```text
root user
source assistant
current user
```

with exact indices/fingerprints and fenced request content under its existing eligibility contract.

3M-1 must not scan history independently to rediscover those messages.

### 3.8 Prompt owner

Prompt remains a serializer of owner-decided facts.

3M-1 does not add SourceProjectionEnvelope prompt lines.

The first compatibility implementation must target:

```text
PROMPT_BYTES_DELTA = 0
```

This keeps 3M-1 from accidentally becoming a new model-behavior release.

---

## 4. 3M-1 product decision

The first Source Intelligence family is frozen as:

```text
LIVE_REACTION
```

Its purpose in 3M-1 is compatibility only.

Conceptual mapping:

```text
existing <COMMUNITY>
        ↓
existing parsing / Reaction / Structure authority
        ↓
3M-1 compatibility adapter
        ↓
SourceProjectionEnvelope
  family = LIVE_REACTION
        ↓
legacy presentation/output path unchanged
```

No new source behavior is produced by the adapter.

---

## 5. Source Projection Envelope contract for 3M-1

The master design froze the conceptual minimum:

```text
family
sourceAuthorityRef
exposureScope
reachability
publicationMaturity
assertions[]
contextReentryPolicy
presentationIntent
```

3M-1 now freezes how those fields are interpreted for the legacy compatibility checkpoint.

### 5.1 `family`

Frozen value:

```text
LIVE_REACTION
```

No other Source Intelligence family is legal in 3M-1.

### 5.2 `sourceAuthorityRef`

This is a reference to existing authority, not a new source identity.

Allowed 3M-1 authority classes:

```text
LEGACY_MODE_CONTEXT
HANDOFF_EVIDENCE
UNRESOLVED_LEGACY_C
```

#### `LEGACY_MODE_CONTEXT`

Used when current runtime mode/output contract is sufficient to explain why a Community block is expected, but no stronger source identity is required or currently proven.

Typical compatibility use:

```text
B_START
B_CONTINUE
B_END
```

This does not claim a new canonical event/source identity.

#### `HANDOFF_EVIDENCE`

Used only when existing Handoff/Evidence already proves the bounded eligible C source relationship.

The envelope references their existing receipt/indices/fingerprints where structurally available.

It does not copy raw source bodies into persistent envelope state.

#### `UNRESOLVED_LEGACY_C`

Used for a current legal C compatibility output where the stronger short-C Handoff/Evidence source identity is unavailable or ineligible.

This value is intentionally conservative.

Canonical rule:

```text
absence of Handoff/Evidence proof
!= permission to invent source provenance
```

### 5.3 `exposureScope`

Frozen 3M-1 value:

```text
LEGACY_COMMUNITY_POLICY_UNCHANGED
```

Meaning:

- 3M-1 does not install the new Exposure E6 candidate;
- 3M-1 does not widen or narrow public-knowledge eligibility;
- current production Community guidance remains the only active behavior;
- Exposure research stays separately evidence-gated.

### 5.4 `reachability`

Frozen 3M-1 value:

```text
LEGACY_EXPECTED_BY_MODE
```

Meaning:

- Lifecycle already decides whether Community output is expected by current mode;
- the envelope does not introduce a new channel-delivery simulation;
- HunterNet-like propagation/reachability semantics are future-family work.

### 5.5 `publicationMaturity`

Frozen 3M-1 value:

```text
IMMEDIATE_REACTION
```

This is appropriate to the compatibility family and does not imply publication/news maturity.

### 5.6 `assertions[]`

Frozen 3M-1 value:

```text
[]
```

Rationale:

Current Community text is not yet a structured source assertion schema.

Trying to infer assertions from arbitrary legacy Community prose in 3M-1 would introduce a semantic parser and new authority.

Structured source assertions belong to 3M-3.

Canonical rule:

```text
legacy Community prose
!= automatically extracted source assertions
```

### 5.7 `contextReentryPolicy`

Frozen 3M-1 value:

```text
LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY
```

This distinction is essential.

The long-term 3.0M master design prefers derived source sidecars not to automatically re-enter future model context.

However current `<COMMUNITY>` is part of the assistant output/history and may therefore naturally appear in later host history under existing behavior.

3M-1 is a compatibility checkpoint and must not silently delete or rewrite that history.

Therefore:

```text
current host-history behavior = unchanged
new envelope itself = no additional re-entry path
```

Actual source-history exclusion/re-entry redesign remains 3M-7 work.

### 5.8 `presentationIntent`

Frozen 3M-1 value:

```text
LEGACY_COMMUNITY
```

No new CSS/DOM renderer is active in 3M-1.

The first future presentation split happens in 3M-4 after structured semantic boundaries exist.

---

## 6. Compatibility binding is not semantic authority

The envelope must be able to point at the corresponding current Community block without copying that raw body into a new durable state object.

3M-1 therefore freezes a separate, ephemeral compatibility binding concept:

```text
LegacyCommunityBinding
  blockOrdinal
  expectedBlockCount
  observedBlockCount
  communityBlockRef
  platformFamily
  legacyValidationStatus
```

This binding is:

```text
memory-only
ephemeral
non-persistent
non-canonical
non-model-context
non-source-identity
```

`communityBlockRef` may be an in-memory reference/index/receipt produced by existing parsing.

It must not require storing another full copy of the raw Community body.

`platformFamily` is copied/read only as compatibility metadata from Community ownership.

---

## 7. Per-mode compatibility mapping

### 7.1 Mode A

```text
expected Community = 0
expected LIVE_REACTION envelope = 0
Source Intelligence compatibility path = DORMANT
```

3M-1 must impose near-zero semantic burden on ordinary Mode A chat.

No empty envelope should be persisted merely to prove Source Intelligence exists.

### 7.2 B_START

```text
expected Community = 1
expected LIVE_REACTION envelope = 1
sourceAuthorityRef = LEGACY_MODE_CONTEXT
```

The envelope describes the existing single Community result only after current validation/normalization ownership has run.

### 7.3 B_CONTINUE

```text
expected Community = 1
expected LIVE_REACTION envelope = 1
sourceAuthorityRef = LEGACY_MODE_CONTEXT
```

No separate long-lived broadcast social ledger is introduced.

### 7.4 B_END

Current protected contract:

```text
expected Community = 2
```

3M-1 maps these to two `LIVE_REACTION` compatibility envelopes by **ordinal only**.

```text
blockOrdinal = 0
blockOrdinal = 1
```

3M-1 deliberately does not invent semantic names such as:

```text
CURRENT_SCENE_REACTION
EPISODE_WIDE_REACTION
FINALE_REACTION
```

unless an existing owner later exposes such a contract explicitly.

The current B_END Structure/Community distinctions remain authoritative.

The envelope does not reinterpret them.

### 7.5 Mode C

```text
expected Community = 1
expected LIVE_REACTION envelope = 1
```

If current Handoff/Evidence source eligibility is proven:

```text
sourceAuthorityRef = HANDOFF_EVIDENCE
```

Otherwise:

```text
sourceAuthorityRef = UNRESOLVED_LEGACY_C
```

The latter is still a compatibility envelope around a currently legal C output.

It is not stronger provenance.

---

## 8. Two-phase compatibility assembly

3M-1 freezes a two-phase conceptual assembly so the new layer cannot become an early authority producer.

### Phase 1 · Projection expectation

Inputs:

```text
mode
Lifecycle expectedCommunityBlocks(mode)
existing bounded Handoff eligibility receipt if already available
```

Output:

```text
LegacyLiveReactionProjectionPlan
```

The plan may contain only bounded expectations such as:

```text
active
family = LIVE_REACTION
expectedBlockCount
mode
handoffEligibilityClass
```

It does not contain source prose.

It does not approve output.

It does not alter Prompt.

### Phase 2 · Post-output compatibility resolution

Inputs:

```text
projection plan
existing Community parsed blocks
existing Reaction result
existing Structure result
existing Handoff/Evidence receipts if available
```

Output:

```text
0..N ephemeral SourceProjectionEnvelope views
+ LegacyCommunityBinding receipts
```

Canonical rule:

```text
resolve only from existing owner results
never re-scan history to manufacture authority
```

---

## 9. New module ownership target

If 3M-1 is later authorized for implementation, the preferred new module is a narrow, pure compatibility/application module conceptually named:

```text
source-projection
```

Its ownership is limited to:

```text
assembling SourceProjectionEnvelope views
binding envelopes to already-parsed legacy Community blocks
reporting bounded compatibility/equivalence metadata
```

It does **not** own:

```text
mode classification                → Lifecycle
Community parsing/platform family  → Community
reaction tags/RT                   → Reaction
output structure safety            → Structure
source bridge/registry             → Handoff
exact request-message source map   → Evidence
canonical world state              → existing state owners
prompt wording                     → Prompt
history placement                  → Runtime/Host
persistence                        → no 3M-1 owner
presentation DOM/CSS               → no 3M-1 new renderer
```

Preferred dependency direction:

```text
owner-produced bounded receipts/views
→ source-projection
```

Avoid direct Host/Store/history access inside `source-projection`.

---

## 10. No new persistence contract

3M-1 persistent schema delta is frozen as:

```text
NONE
```

Specifically, do not add:

```text
state.sourceIntelligence
state.sourceProjection
state.sourceHistory
state.sourceAssertions
pluginStorage source envelope registry
new source ID registry
```

Existing bounded Handoff persistence remains untouched.

Current Community persistent fields remain current owners' state, not a new Source Intelligence database.

---

## 11. No new model/network/timer contract

3M-1 effect delta is frozen as:

```text
new model calls      = 0
new network calls    = 0
new timers           = 0
new polling loops    = 0
new media calls      = 0
new chat rewrites    = 0
```

The adapter is local compatibility logic only.

---

## 12. Prompt/output byte-equivalence target

The first implementation proof must target:

```text
PROMPT_BYTES_DELTA = 0
VISIBLE_OUTPUT_BYTES_DELTA = 0
```

This means:

- no new prompt source-family instructions;
- no new tags around Community;
- no renamed Community block;
- no extra metadata printed into assistant output;
- no changed Reaction normalization caused by SourceProjectionEnvelope;
- no renderer change.

3M-1 is an architecture insertion behind existing behavior.

---

## 13. Shadow-first activation strategy

The first implementation, if later authorized, should begin as:

```text
SOURCE_PROJECTION_EXECUTION = SHADOW_COMPAT_ONLY
```

Required initial receipt fields may include bounded metadata equivalent to:

```text
mode
family
expectedBlockCount
observedBlockCount
envelopeCount
legacyStructureSafe
legacyCommunitySafe
legacyReactionSafe
handoffAuthorityClass
compatibilityEquivalent
applied = false
visibleMutation = false
promptMutation = false
persistentMutation = false
```

No raw Community body is required in the receipt.

Promotion from shadow to internal active compatibility routing requires differential equivalence evidence.

Even active compatibility routing must still preserve legacy visible output during 3M-1.

---

## 14. Fail-open compatibility rule

The 3M-1 adapter is not allowed to break an output that existing production would otherwise accept.

If the adapter cannot assemble a safe envelope view:

```text
adapter status = UNRESOLVED
active SourceProjectionEnvelope use = disabled
legacy Community path = unchanged
```

If existing Community/Reaction/Structure rejects or quarantines an output:

```text
envelope must not upgrade it to valid
```

Canonical distinction:

```text
new compatibility adapter failure
→ fall back to existing behavior

existing semantic/structure failure
→ existing failure remains authoritative
```

---

## 15. B_END compatibility rule

B_END is a protected golden behavior and receives explicit 3M-1 safeguards.

Required invariants:

```text
expected Community count remains 2
existing six-platform-group distinction remains where current contract requires it
Structure remains closure-shape owner
Broadcast terminal authority remains independent from Community warning status
Reaction remains RT owner
envelope count can never legitimize malformed Community structure
```

A B_END output with malformed Community structure may still produce existing diagnostic quarantine behavior.

3M-1 must not change Broadcast authority semantics to make the envelope appear healthy.

---

## 16. Existing Community platform taxonomy compatibility

Current platform families are retained exactly under Community ownership.

Conceptual nesting:

```text
Source Intelligence family
  LIVE_REACTION
    └─ legacy Community platform representation
         NATIONAL
         WORKPLACE_BLIND
         CELEBRITY_FAN
         PREMIUM_PRIVATE
         INTERNATIONAL
         ...current production variants
```

This prevents taxonomy collision.

Future BOARD/SOCIAL_FEED families may define their own source-local representation contracts later.

3M-1 does not generalize the old platform enum into a universal source enum.

---

## 17. Source authority strength ladder

3M-1 freezes a conservative authority-strength interpretation for diagnostics only:

```text
HANDOFF_EVIDENCE
  > LEGACY_MODE_CONTEXT
  > UNRESOLVED_LEGACY_C
```

This is **not** a canonical truth ranking.

It only describes how much structural source attribution the compatibility adapter can safely reference.

No field may use this ladder to promote a rumor/private/unknown fact to public truth.

Exposure semantics remain separately owned/evidence-gated.

---

## 18. Provenance relationship

3M-1 does not activate Candidate C as a generic provenance platform.

Current rule:

```text
reuse Handoff / Evidence / Lineage references where available
```

Because 3M-1 envelopes are ephemeral and `assertions[] = []`, there is no new persisted derived descendant that requires a new stable source identity.

Candidate C should be reconsidered at 3M-3 when structured source objects exist, or later when one of these becomes real:

```text
persisted source assertion
stable reply/repost identity
cross-turn source object
source replacement invalidation
controlled context re-entry
```

---

## 19. Edit / reroll behavior in 3M-1

Because no envelope is persisted:

```text
edit/reroll
→ current request/output owners recompute as they do today
→ prior ephemeral envelope view disappears with its request/runtime observation
```

3M-1 therefore introduces no new stale descendant to repair.

It must not write envelope identities into history or storage.

Future persisted source objects require a separate invalidation design.

---

## 20. Context behavior

3M-1 preserves current host history exactly.

It adds no new context payload.

Frozen rules:

```text
no automatic envelope serialization into Prompt
no envelope append to chat history
no envelope raw-body duplicate in state
no legacy Community deletion from history
no new source-history projection
```

Therefore the compatibility adapter itself has zero new context-growth surface.

The existing Community-in-assistant-history behavior remains unchanged and is explicitly deferred to 3M-7 for any future redesign.

---

## 21. Static compatibility matrix

A future implementation must freeze fixtures at minimum for the following matrix.

### 21.1 Mode count parity

```text
A          → legacy expected 0 → envelope 0
B_START    → legacy expected 1 → envelope 1
B_CONTINUE → legacy expected 1 → envelope 1
B_END      → legacy expected 2 → envelope 2
C          → legacy expected 1 → envelope 1
```

### 21.2 Valid Community parity

For each legal mode:

```text
legacy Community parse result unchanged
legacy platform classification unchanged
legacy logical comment/reply units unchanged
legacy Reaction result unchanged
legacy Structure result unchanged
legacy stateCommitSafety unchanged
```

### 21.3 Invalid Community controls

At minimum:

```text
missing required Community
extra Community block
malformed Community closing boundary
invalid logical reaction unit
invalid Reaction tag placement
B_END expected 2 but observed 1
B_END expected 2 but observed 3
```

Expected 3M-1 result:

```text
adapter cannot convert invalid legacy structure into valid output
```

### 21.4 Mode C authority controls

```text
eligible short-C Handoff/Evidence
→ HANDOFF_EVIDENCE

ineligible long-C
→ UNRESOLVED_LEGACY_C

missing/invalid Handoff source relation
→ no provenance invention

source-lock Prompt byte absent/present
→ unchanged from baseline
```

### 21.5 B_END golden controls

Protect:

```text
explicit terminal behavior
expected Community count = 2
platform-group distinction
closure Structure status
Reaction status
Broadcast authority independence
```

### 21.6 Platform taxonomy controls

Every existing Community platform family fixture must still resolve as:

```text
SourceProjectionEnvelope.family = LIVE_REACTION
```

while preserving the existing Community-local platform label.

---

## 22. Differential implementation gate

Before any active internal routing is authorized, shadow baseline vs candidate must prove:

```text
mode exact parity
expected Community count exact parity
parsed block count exact parity
Community platform exact parity
Reaction status exact parity
Structure status exact parity
stateCommitSafety exact parity
Handoff registry write behavior exact parity
Evidence request mapping exact parity where eligible
Prompt bytes exact parity
assistant visible output exact parity
persistent state exact parity
```

Any mismatch is classified before proceeding.

Recommended classifications:

```text
FIX     · COMPATIBILITY_IMPLEMENTATION_MISMATCH
BLOCKER · LEGACY_AUTHORITY_OWNERSHIP_REGRESSION
BLOCKER · PROMPT_OR_VISIBLE_OUTPUT_DRIFT
BLOCKER · NEW_PERSISTENT_STATE_INTRODUCED
```

---

## 23. Side-effect/static gate

A 3M-1 implementation candidate must prove:

```text
latest.js == install.js
node syntax PASS
architecture/contracts PASS
new pluginStorage call count = 0
new setChat/history-write path = 0
new fetch/network path = 0
new setInterval path = 0
new setTimeout path = 0
new model request path = 0
new full-history scan = 0
new raw-body persistence = 0
Prompt bytes unchanged in A/B_START/B_CONTINUE/B_END/C fixtures
```

The existing Handoff registry calls are baseline behavior and must not be counted as newly authorized Source Intelligence persistence.

---

## 24. Observability design

3M-1 diagnostics should be bounded and observational.

A future debug receipt may expose compact lines equivalent to:

```text
Source projection: SHADOW_COMPAT · family LIVE_REACTION · envelopes 1/1
Source authority: HANDOFF_EVIDENCE | LEGACY_MODE_CONTEXT | UNRESOLVED_LEGACY_C
Legacy parity: PASS | MISMATCH | UNRESOLVED
Presentation: LEGACY_COMMUNITY
Context re-entry: LEGACY_HOST_HISTORY_UNCHANGED · additional NONE
```

Do not retain:

```text
full Community body
full source assistant body
full request body
raw provider body
```

solely for 3M-1 diagnostics.

---

## 25. Real long-chat validation plan

3M-1 implementation, once separately authorized/released, must eventually prove compatibility in real chat.

Required scenarios:

### A. Ordinary Mode A baseline

```text
no Community
no envelope-visible effect
no source diagnostics implying active source work
ordinary chat behavior unchanged
```

### B. B_START

```text
1 legacy Community
1 LIVE_REACTION compatibility envelope
visible output unchanged
```

### C. B_CONTINUE

```text
1 legacy Community
1 LIVE_REACTION compatibility envelope
RT/Community behavior unchanged
```

### D. B_END

```text
2 legacy Community blocks
2 LIVE_REACTION envelopes
closure semantics unchanged
Broadcast authority unchanged
```

### E. Eligible short C

```text
1 Community
existing Handoff/Evidence source relationship retained
sourceAuthorityRef = HANDOFF_EVIDENCE
no wider evidence/source claim
```

### F. Ineligible / ordinary C

```text
1 Community
sourceAuthorityRef = UNRESOLVED_LEGACY_C where stronger proof unavailable
current output still accepted/rejected exactly as baseline
```

### G. Reroll

```text
no stale persistent envelope identity
current request rebuilds ephemeral view
```

### H. Edit

```text
existing Edit Reconcile remains owner
no new source state masks genuine edit or representation drift
```

### I. Long chat

```text
no source-envelope accumulation
no persistent source-history growth
no new context growth
```

---

## 26. Performance budget

3M-1 performance target is intentionally strict because it adds no user-visible capability yet.

Target new costs:

```text
full history scans           = 0
additional model calls       = 0
network calls                = 0
persistent writes            = 0
large string copies          = 0 where avoidable
raw Community reparsing      = 0 if existing parsed result can be reused
raw source-body retention    = 0
background timers            = 0
```

Preferred implementation cost is bounded object/receipt assembly from data already produced by current owners.

If implementation requires another full output or history parse, classify that as design drift and reassess before release.

---

## 27. Presentation boundary

3M-1 does not yet create a plugin DOM/CSS renderer.

Current visible `<COMMUNITY>` remains the presentation contract.

Frozen 3M-1 direction:

```text
presentationIntent = LEGACY_COMMUNITY
```

3M-4 later owns the actual split:

```text
validated semantic sidecar
→ source renderer registry
→ source-scoped DOM/CSS
```

This sequencing prevents presentation work from outrunning semantic compatibility.

---

## 28. Exposure relationship

3M-1 consumes current production behavior only.

The Exposure Knowledge research lane remains:

```text
DIRECT_B_ROOT_EXPOSURE_CONTRACT = DESIGN FROZEN
TARGET_HOST_EVIDENCE = DEFERRED TO v0.70.3 REAL-LONG-CHAT WINDOW
M1 SMOKE = LOCKED
PRODUCTION E6 INSTALL = NONE
```

Therefore 3M-1 must not claim:

```text
new exposure correctness proven
new hidden/private fact filtering active
multi-B source exposure solved
```

3M-2 is the checkpoint that can consume validated Exposure evidence and make source assertion eligibility more explicit.

---

## 29. Context Projection relationship

Prior Context Projection research proved:

```text
structural root boundary
!= semantic self-containment boundary
```

3M-1 therefore performs no history cutting.

It proves a different architectural fact first:

```text
source projection can be represented separately from canonical ownership
without requiring a new context-removal algorithm
```

This is a safer foundation for later field-bounded projection.

---

## 30. WATCH / DEFER / FIX / BLOCKER map

### WATCH

```text
WATCH · LEGACY_COMMUNITY_PLATFORM_VS_SOURCE_FAMILY_NAMING_COLLISION
WATCH · ENVELOPE_OBJECT_COPY_COST
WATCH · EXISTING_COMMUNITY_HISTORY_REENTRY
WATCH · C_WITHOUT_STRONG_HANDOFF_PROVENANCE
WATCH · B_END_TWO_BLOCK_SEMANTIC_OVERINTERPRETATION
```

### DEFER

```text
DEFER · SOURCE_ASSERTION_SCHEMA_TO_3M_3
DEFER · SOURCE_SPECIFIC_DOM_CSS_TO_3M_4
DEFER · BOARD_OR_SOCIAL_FEED_TO_3M_5
DEFER · GENERIC_PROVENANCE_EXPANSION_UNTIL_CONCRETE_CONSUMER
DEFER · SOURCE_HISTORY_REENTRY_REDESIGN_TO_3M_7
DEFER · EXPOSURE_POLICY_CHANGE_UNTIL_EVIDENCE_GATE
```

### FIX discovered during design

No production runtime correctness defect was found by this 3M-1 read-only ownership review.

The previously recorded Mode A master-design documentation omission is already closed separately.

### BLOCKER for implementation

```text
BLOCKER · ENVELOPE_BECOMES_SECOND_COMMUNITY_VALIDATOR
BLOCKER · ENVELOPE_BECOMES_SECOND_SOURCE_IDENTITY_OWNER
BLOCKER · ENVELOPE_CHANGES_PROMPT_OR_VISIBLE_OUTPUT_IN_COMPAT_STAGE
BLOCKER · ENVELOPE_ADDS_PERSISTENT_SOURCE_STATE
BLOCKER · ENVELOPE_UPGRADES_UNRESOLVED_C_TO_PROVEN_SOURCE
BLOCKER · ENVELOPE_CHANGES_B_END_BLOCK_OR_CLOSURE_CONTRACT
BLOCKER · ENVELOPE_ADDS_HISTORY_SCAN_OR_MODEL_CALL
```

---

## 31. 3M-1 implementation-entry gate

This design document does not itself authorize runtime implementation.

A separate implementation authorization may be opened only when:

```text
3M-1 design is merged and CI-clean
S7 / v0.70.3 implementation/release scope remains separate
exact implementation baseline is freshly re-read
source-projection module/effect surface is bounded
no persistent schema delta is confirmed
shadow-equivalence fixture plan is executable
Prompt/output byte-equivalence gate is executable
existing Handoff/Evidence ownership is reused
release-system changes are excluded
```

The preferred first runtime form is:

```text
SHADOW_COMPAT_ONLY
```

not immediate active presentation routing.

---

## 32. 3M-1 close criteria

The design checkpoint is complete when the following are frozen:

```text
FIRST_SOURCE_FAMILY                    = LIVE_REACTION
LEGACY_COMMUNITY_OUTPUT_SYNTAX         = UNCHANGED
MODE_A_SOURCE_PROJECTION               = DORMANT
B_START_ENVELOPE_COUNT                 = 1
B_CONTINUE_ENVELOPE_COUNT              = 1
B_END_ENVELOPE_COUNT                   = 2
C_ENVELOPE_COUNT                       = 1
B_END_BINDING                          = ORDINAL_ONLY
COMMUNITY_PLATFORM_TAXONOMY_OWNER      = COMMUNITY
REACTION_OWNER                         = REACTION
STRUCTURE_OWNER                        = STRUCTURE
SOURCE_BRIDGE_OWNER                    = HANDOFF
EXACT_REQUEST_SOURCE_OWNER             = EVIDENCE
SOURCE_PROJECTION_OWNER                = EPHEMERAL ENVELOPE ASSEMBLY ONLY
ASSERTIONS                             = EMPTY IN 3M-1
EXPOSURE_SCOPE                         = LEGACY_COMMUNITY_POLICY_UNCHANGED
REACHABILITY                           = LEGACY_EXPECTED_BY_MODE
PUBLICATION_MATURITY                   = IMMEDIATE_REACTION
CONTEXT_REENTRY                        = LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY
PRESENTATION_INTENT                    = LEGACY_COMMUNITY
PERSISTENT_SCHEMA_DELTA                = NONE
PROMPT_BYTES_DELTA_TARGET              = ZERO
VISIBLE_OUTPUT_BYTES_DELTA_TARGET      = ZERO
NEW_MODEL_CALLS                        = ZERO
NEW_NETWORK_CALLS                      = ZERO
NEW_HISTORY_SCAN                       = ZERO
FIRST_IMPLEMENTATION_MODE              = SHADOW_COMPAT_ONLY
```

---

## 33. Next checkpoint after 3M-1 design

The next **design** checkpoint in the major sequence remains:

```text
3M-2 · SOURCE ASSERTION / EXPOSURE BOUNDARY
```

However implementation sequencing is independent.

It is legal to continue document-level 3M-2 design while 3M-1 runtime implementation remains unauthorized, as long as no runtime/release scope is mixed with S7.

3M-2 should consume:

```text
Exposure Knowledge research
3M-1 LIVE_REACTION envelope authority classes
existing Handoff/Evidence boundaries
current Community public-knowledge rule
```

and answer one narrower question:

```text
when may a SourceProjectionEnvelope carry a structured assertion as public/source-eligible information?
```

It must not assume 3M-1 has already shipped.

---

## 34. Final 3M-1 design state

```text
3M_1_DESIGN                                  = FROZEN
3M_1_IMPLEMENTATION                          = NOT_AUTHORIZED
3M_1_FAMILY                                  = LIVE_REACTION
SOURCE_PROJECTION_ENVELOPE                   = LEGACY_COMPATIBILITY_SHAPE_FROZEN
LEGACY_COMMUNITY                             = PRESERVED
LEGACY_COMMUNITY_PLATFORM_TAXONOMY           = PRESERVED / COMMUNITY_OWNED
MODE_A                                       = DORMANT_SOURCE_PATH
B_START                                      = 1 LIVE_REACTION ENVELOPE
B_CONTINUE                                   = 1 LIVE_REACTION ENVELOPE
B_END                                        = 2 LIVE_REACTION ENVELOPES / ORDINAL_ONLY
C                                            = 1 LIVE_REACTION ENVELOPE
C_STRONG_SOURCE_REF                          = EXISTING HANDOFF/EVIDENCE ONLY
C_WITHOUT_STRONG_SOURCE_REF                  = UNRESOLVED_LEGACY_C
EXPOSURE_POLICY                              = UNCHANGED
ASSERTIONS                                   = []
CONTEXT_REENTRY                              = LEGACY_HISTORY_UNCHANGED / NO ADDITIONAL REENTRY
PRESENTATION                                 = LEGACY_COMMUNITY
PERSISTENT_SCHEMA                            = UNCHANGED
PROMPT                                       = UNCHANGED
VISIBLE_OUTPUT                               = UNCHANGED
AUXILIARY_MODEL                              = NONE
NETWORK                                      = NONE
NEXT_RUNTIME_FORM_IF_AUTHORIZED              = SHADOW_COMPAT_ONLY
NEXT_3M_DESIGN                               = 3M-2 SOURCE ASSERTION / EXPOSURE BOUNDARY
PRODUCTION                                   = UNCHANGED
S7 / v0.70.3                                 = UNCHANGED
release-simcore                              = UNCHANGED
```
