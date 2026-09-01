# SimCore Post-3.0M Legacy Migration / Runtime-Enabling Master Design — 2026-09-01

Date: 2026-09-01 KST

Status: **MASTER DESIGN FROZEN · DESIGN-ONLY · PROSPECTIVE LEGACY RETIREMENT · STRUCTURED OWNER MIGRATION · G1–G8 STAGED ENABLEMENT · NO RUNTIME AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · LEGACY COMMUNITY MIGRATION · RUNTIME ENABLEMENT · MASTER DESIGN**

## 0. Purpose

This document freezes the overall architecture for the user-selected post-3M follow-up lane:

```text
Legacy / Runtime-enabling
```

It answers, at architecture level:

```text
How does SimCore move from legacy model-generated <COMMUNITY>
toward structured LIVE_REACTION without creating two semantic owners?

How can visible presentation change without silently rewriting model context?

How should old chats containing <COMMUNITY> remain readable?

How does new legacy context stop growing without dangerous transcript surgery?

How are the existing 3M-10 G1–G8 gates packaged into staged runtime readiness?

How does first-major read-only runtime stay independent from later Candidate C interaction durability?

What transaction boundaries and evidence are required for each migration step?
```

This is a design-only checkpoint.

It does not implement or deploy any part of the design.

## 1. Authority chain

This master design consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_POST_3M_FOLLOWUP_DESIGN_CATALOG_2026-09-01.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_EXPOSURE_M1_TARGET_HOST_PREFLIGHT_OPERATOR_PACKET_2026-09-01.md
```

It also respects current post-3M design authorities already present on main for:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE settlement
Candidate C durable derived objects
Multi-Family Orchestration
Interaction / Materialization
```

Production runtime remains independently authoritative on `release-simcore`.

## 2. Current production authority at design time

At this design transaction:

```text
production branch = release-simcore
production commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production version = v0.70.1
```

This exact identity is evidence for the current design transaction only.

Any future implementation must re-run G1 against then-current production.

## 3. Product destination

The preferred long-term destination is:

```text
STRUCTURED SOURCE SEMANTICS
→ validated current projection
→ structured Presentation Renderer
→ source-local UI
```

with:

```text
NO AUTOMATIC STRUCTURED SOURCE HISTORY
NO AUTOMATIC STRUCTURED SOURCE RE-ENTRY
NO NEW LEGACY <COMMUNITY> GENERATION
OLD LEGACY HISTORY PRESERVED
LEGACY OLD-CHAT READER RETAINED
```

Canonical destination:

```text
legacy Community
→ historical compatibility format

not

legacy Community
→ ongoing semantic owner
```

## 4. This migration is not deletion

The design does not define migration as:

```text
delete <COMMUNITY>
```

It defines migration as four independent authority transitions:

```text
semantic producer
presentation producer
host-context growth
historical read compatibility
```

The final architecture may still recognize old `<COMMUNITY>` while never producing a new one.

## 5. Four-axis migration model

The migration owns four orthogonal axes.

### Axis S · semantic ownership

```text
S0 LEGACY_NATIVE_SEMANTIC
S1 STRUCTURED_VALIDATED_SEMANTIC
```

### Axis P · presentation ownership

```text
P0 LEGACY_COMMUNITY_PRESENTATION
P1 STRUCTURED_LIVE_REACTION_PRESENTATION
```

### Axis H · host-context growth

```text
H0 LEGACY_CONTEXT_GROWING
H1 LEGACY_CONTEXT_BRIDGE_ONLY
H2 LEGACY_CONTEXT_PREEXISTING_ONLY
```

`H2` means no new legacy source context is added by migrated turns.

It does not mean historical bytes were deleted.

### Axis R · legacy read compatibility

```text
R0 LEGACY_READ_WRITE_COMPAT
R1 LEGACY_READ_ONLY_COMPAT
R2 LEGACY_PARSER_RETIRED
```

`R2` is not required for the first successful migration.

## 6. Current conceptual state

Current production is conceptually:

```text
S0 + P0 + H0 + R0
```

Meaning:

```text
legacy Community is model-produced
legacy Community is user-visible
legacy Community is part of ordinary assistant transcript/history
legacy Community is an active format
```

These are conceptual migration labels, not claims about exact runtime enum names.

## 7. Target conceptual state

Preferred stable target:

```text
S1 + P1 + H2 + R1
```

Meaning:

```text
structured validated semantics own new LIVE_REACTION
structured renderer owns new visible source presentation
new migrated turns do not append legacy Community source context
old historical Community remains readable but cannot create new source authority
```

## 8. Central transition law

The master migration law is:

```text
SEMANTIC OWNER FIRST
→ PRESENTATION SECOND
→ HOST-CONTEXT RETIREMENT LAST
```

Reason:

```text
presentation is allowed to depend on validated semantics
host context must not silently decide semantic authority
```

## 9. Forbidden all-at-once migration

Do not use one release transaction that simultaneously:

```text
changes model prompt semantics
adds structured transport
changes validator authority
mounts new DOM
hides legacy Community
stops legacy transcript growth
removes legacy parser behavior
```

That would destroy attribution and rollback clarity.

Default policy:

```text
ONE MIGRATION RESPONSIBILITY
→ ONE BOUNDED TRANSACTION
```

unless a later impact scope proves two changes are inseparable.

## 10. Migration state machine

The master design freezes five operational migration states plus one stable compatibility state.

```text
LC0 LEGACY_NATIVE
 ↓
LC1 STRUCTURED_SHADOW
 ↓
LC2 STRUCTURED_SEMANTIC_PRIMARY
 ↓
LC3 STRUCTURED_PRESENTATION_PRIMARY
 ↓
LC4 PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT
 ↓
LC5 LEGACY_READ_ONLY_COMPAT_STABLE
```

Transitions are evidence-gated.

Skipping a state requires a later explicit impact proof.

## 11. LC0 · `LEGACY_NATIVE`

Axes:

```text
S = S0 LEGACY_NATIVE_SEMANTIC
P = P0 LEGACY_COMMUNITY_PRESENTATION
H = H0 LEGACY_CONTEXT_GROWING
R = R0 LEGACY_READ_WRITE_COMPAT
```

This represents current production behavior.

Structured Source Intelligence designs exist in repository authority only.

No runtime structured semantics are assumed.

## 12. LC1 · `STRUCTURED_SHADOW`

Purpose:

```text
exercise structured semantic generation / transport / validation
without changing ordinary user-visible behavior
```

Axes remain externally:

```text
S = S0 production semantic owner
P = P0
H = H0
R = R0
```

Additional shadow lane:

```text
current request
→ structured draft candidate
→ source authority join
→ exposure policy
→ validator
→ bounded shadow receipt
```

The shadow result has **no production semantic authority** yet.

### LC1 invariants

```text
legacy visible output unchanged
legacy transcript behavior unchanged
structured source automatic re-entry = 0
structured source persistence = 0
structured presentation mount = 0 by default
extra source history scan = 0
```

### LC1 model-call rule

First runtime-enabling scope should not introduce an auxiliary model merely to run shadow source generation.

```text
EXTRA AUXILIARY SOURCE MODEL CALL
= NOT AUTHORIZED BY THIS MASTER DESIGN
```

Any future auxiliary model topology requires separate design.

## 13. LC1 evidence purpose

LC1 compares **semantic contract outcomes**, not byte-identical prose.

It must test whether structured machinery correctly preserves:

```text
current source authority
exposure restraint
private/unexposed denial
attributed-social status
visible-cue inference status
stale support invalidation
family identity
bounded payloads
```

It does not require:

```text
legacy Community text == structured reaction text
```

## 14. LC2 · `STRUCTURED_SEMANTIC_PRIMARY`

This is the most important migration cut.

Axes:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P0 legacy-style presentation may remain temporarily
H = H0 or H1 depending proven compatibility consumer
R = transitional read/write compatibility
```

At LC2, **structured validated LIVE_REACTION becomes the sole semantic owner for new migrated source turns**.

Canonical rule:

```text
STRUCTURED SEMANTIC PRIMARY
→ legacy native model-generated Community is no longer an independent source authority
```

## 15. LC2 requires one semantic owner

Forbidden:

```text
model generates trusted structured source
+
model independently generates trusted <COMMUNITY>
```

If both are generated independently, disagreement becomes impossible to resolve safely.

Therefore LC2 must use:

```text
ONE structured semantic owner
```

and, only if needed:

```text
ONE compatibility representation derived from it
```

## 16. Conceptual `LegacyCommunityCompatibilitySerializer`

LC2 may use a temporary compatibility serializer **only if a concrete compatibility consumer requires it**.

Conceptual direction:

```text
Validated LIVE_REACTION
        ↓
LegacyCommunityCompatibilitySerializer
        ↓
legacy-compatible plain-text <COMMUNITY> representation
```

The serializer is:

```text
representation-only
bounded
deterministic over validated payload
family = LIVE_REACTION only
no model call
no authority upgrade
no quarantine-content access beyond approved presentation metadata
```

Exact runtime schema/function name is not frozen here.

## 17. Serializer source restrictions

The compatibility serializer may consume only validated, presentation-eligible LIVE_REACTION semantics.

Forbidden input:

```text
untrusted draft
DENY assertion content
HOLD assertion content
validation receipt hidden semantics
Knowledge-only private facts
raw legacy Community prose parsed back into assertions
```

## 18. Serializer output restrictions

The serializer must not invent:

```text
new reaction claims
new actors
new facts
new timestamps
new metrics
new social reachability
new publication status
```

It formats existing validated reaction semantics only.

## 19. No generic legacy serializer

The compatibility serializer must reject:

```text
BOARD
NEWS
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

Canonical rule:

```text
<COMMUNITY>
= LIVE_REACTION LEGACY FORMAT
!= UNIVERSAL SOURCE FALLBACK
```

## 20. LC2 bridge is transitional

A compatibility bridge is not a destination architecture.

```text
BRIDGE EXISTS
→ because a proven consumer needs temporary compatibility
```

not:

```text
BRIDGE EXISTS
→ because old code once had Community
```

A future dependency inventory must identify the exact reason for any retained bridge.

## 21. LC2 prompt / producer responsibility

The semantic-owner cutover transaction is the transaction allowed to change source-generation semantics.

It owns any future changes required to:

```text
stop treating independent legacy Community prose as semantic authority
produce the structured draft through the authorized G4 path
preserve current main-model semantic-generation role
apply bounded source contract bytes
```

It should not simultaneously own the new presentation mount or context retirement.

## 22. LC2 failure rule

Once a request enters structured-semantic-primary mode, runtime must not silently fall back per-request to independent legacy semantic generation after a validation failure.

Required behavior is fail-closed according to the structured source contract.

Rollback from LC2 should occur at an explicit release/config transaction boundary, not through fuzzy mixed authority inside one request.

## 23. LC3 · `STRUCTURED_PRESENTATION_PRIMARY`

Axes:

```text
S = S1
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = H0 / H1 only if temporary compatibility context remains proven necessary
R = transitional compatibility
```

At LC3, the user-facing primary source surface is the 3M-4 Presentation Renderer.

Legacy visible Community is no longer the default source presentation.

## 24. No dual-visible default

LC3 must not normally show:

```text
legacy Community block
+
structured LIVE_REACTION card
```

for the same source projection.

Dual presentation is permitted only in bounded diagnostics/evaluation tooling.

## 25. Host coupling determines bridge placement

Before LC3, G5 must characterize whether the target host can separate:

```text
visible source presentation
from
assistant transcript/context representation
```

Two host profiles are possible.

### Profile A · `SEPARABLE_HOST`

The host can mount structured presentation independently from transcript text.

A temporary legacy context bridge may remain without remaining visible.

### Profile B · `COUPLED_HOST`

Visible assistant representation and future transcript context are effectively coupled.

Then presentation cutover and new-legacy-context retirement may need a tighter transition.

The master design does not assume Profile A exists.

## 26. G5 must prove coupling, not only DOM mount

G5 evidence therefore includes, in addition to mount lifecycle:

```text
where visible source UI lives
whether source UI changes assistant transcript bytes
whether hidden compatibility text remains model-visible
whether edit/reroll/reload rebind the correct source card
whether mount cleanup preserves unrelated host metadata
```

This is additional evidence within G5, not a new G gate.

## 27. Structured text fallback is not legacy semantic fallback

If Presentation Renderer cannot mount while structured semantics are valid, a future implementation may define a bounded **structured text fallback**.

If such fallback is designed, it must be:

```text
derived from validated structured semantics
presentation-only
not a return to legacy-native semantic generation
```

No such fallback is runtime-authorized by this master design.

## 28. LC4 · `PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT`

Axes:

```text
S = S1
P = P1
H = H2 LEGACY_CONTEXT_PREEXISTING_ONLY
R = R1 LEGACY_READ_ONLY_COMPAT
```

This is the key context migration.

New migrated source turns stop appending new legacy `<COMMUNITY>` source context.

## 29. Prospective, not retroactive

LC4 means:

```text
NEW MIGRATED TURNS
→ no new legacy Community source serialization

OLD LEGACY TURNS
→ unchanged
```

It does **not** mean:

```text
scan old chat
→ remove old Community blocks
```

## 30. Why LC4 is a real semantic product change

Legacy Community currently exists in assistant transcript history.

Therefore stopping new legacy transcript growth changes **implicit source recall behavior**.

Canonical distinction:

```text
ARCHITECTURE CLEANUP
!=
NO USER-OBSERVABLE SEMANTIC CHANGE
```

LC4 must be validated as a product behavior change, not treated as housekeeping.

## 31. Source recall contract after LC4

The structured source recall model remains the 3M-7 contract:

```text
CURRENT_PROJECTION_ONLY
NO STRUCTURED SOURCE HISTORY
NO AUTOMATIC STRUCTURED RE-ENTRY
NO HIDDEN SOURCE RETRIEVAL
```

Therefore a later user message such as:

```text
"아까 게시판/반응 이어서"
```

must not cause hidden source history reconstruction solely because an old source card remains visible.

## 32. Current-user re-disclosure remains valid

If the user quotes or re-states source content in the current input, that current input may be processed normally according to existing authority rules.

Canonical distinction:

```text
USER RE-QUOTED TEXT
!=
OLD SOURCE OBJECT AUTOMATICALLY REACTIVATED
```

## 33. Mixed-era chats are expected

After LC4, an existing chat may contain:

```text
old turns with legacy <COMMUNITY>
+
new turns with structured source UI and no new legacy Community
```

This is an intentional mixed-era state.

It is preferable to rewriting historical messages.

## 34. Mixed-era context behavior

Old historical Community may still be present in host context for some existing chats until ordinary host truncation/history behavior removes it.

Therefore LC4 cannot honestly claim:

```text
ALL LEGACY COMMUNITY CONTEXT = ZERO
```

It can claim only:

```text
NEW LEGACY COMMUNITY CONTEXT GROWTH = ZERO
```

## 35. LC5 · `LEGACY_READ_ONLY_COMPAT_STABLE`

Stable target axes:

```text
S = S1
P = P1
H = H2
R = R1
```

Legacy handling becomes read-only compatibility for historical records.

## 36. Legacy reader contract

The legacy reader may recognize old `<COMMUNITY>` records so old chats remain usable.

It must not:

```text
promote old prose into trusted structured assertions
create current source-job authority
create durable Candidate C objects
create mutation targets
infer current exposure
reconstruct structured provenance
```

This preserves the earlier 3M rule:

```text
RAW LEGACY COMMUNITY PROSE
→ trusted assertions[]
```

is forbidden.

## 37. No automatic retro-conversion of old Community

Old legacy Community is not automatically transformed into a structured LIVE_REACTION semantic object on reload.

Reason:

```text
legacy prose lacks the trusted structured provenance / policy receipts required by 3M-3
```

Historical legacy presentation may remain historical legacy presentation.

## 38. Hard legacy parser removal is optional

The first successful migration does not require:

```text
R2 LEGACY_PARSER_RETIRED
```

Hard parser removal should occur only if:

```text
old-chat compatibility is no longer required
or
an explicit safe data migration has been designed and proven
```

Default long-term stance:

```text
READ-ONLY LEGACY COMPATIBILITY IS CHEAPER THAN HISTORICAL DATA SURGERY
```

## 39. Runtime-enabling plane reuses G1–G8

This master design does not create another independent readiness gate system.

It packages the existing 3M-10 gates:

```text
G1 then-current production re-preflight
G2 Exposure target-host mechanics / model compliance
G3 current source-job selector authority
G4 structured sidecar producer / transport
G5 presentation host mount authority
G6 explicit family hard caps
G7 NEWS trusted maturity-context producer
G8 integration evidence instrumentation
```

## 40. Dependency graph

Canonical dependency direction:

```text
G1
 ↓
current-production grounded impact scope
 ↓
G2 + G3 + G4 + G6 + G8
 ↓
family semantic stage readiness
 ↓
G5
 ↓
visible presentation stage readiness
 ↓
G7 before NEWS activation
```

G7 does not block LIVE_REACTION or BOARD family staging.

## 41. Gate class A · current-production grounding

### G1

Before any implementation work:

```text
fetch then-current release-simcore
prove exact release identity
prove latest.js == install.js
re-map current module ownership
re-check prompt/output/representation/state invariants
```

Historical 2026-09-01 line numbers are not implementation authority.

## 42. Gate class B · semantic activation

The semantic path needs:

```text
G2 Exposure proof
G3 selector authority
G4 producer/transport
G6 family caps
G8 bounded evidence instrumentation
```

All must be closed for the applicable family stage before a structured semantic path is treated as supported runtime behavior.

## 43. G2 remains separate target-host evidence

Current research remains:

```text
HOLD_TARGET_HOST_EVIDENCE_REQUIRED
```

Repository-only semantic design cannot substitute for:

```text
actual target-host mechanics
model-compliance smoke
blind semantic review
cleanup / unload proof
```

This master design does not run that evidence.

## 44. G3 selector contract direction

Current source-job selection must come from current request authority.

Forbidden selector signals include:

```text
old <COMMUNITY> exists
old source card exists
word "news" appears
word "board" appears
fuzzy historical source match
```

Legacy migration must not weaken the 3M-9 dormancy contract.

## 45. G4 producer / transport contract direction

G4 must establish:

```text
who produces structured semantic draft
how it is separated from visible assistant prose
how malformed / missing structured data fails
how prompt/output bytes are bounded
how one semantic owner is established
```

The design still forbids assuming an unproven hidden in-band JSON/tag transport.

## 46. G6 hard-cap rule

Before family activation, concrete bounded constants must exist for:

```text
items
participants where applicable
characters per item
aggregate semantic characters
receipt entries
```

Caps are runtime safety limits, not simulated audience/population facts.

## 47. G8 evidence rule

Instrumentation must expose enough bounded evidence to prove:

```text
DORMANT ordinary path
family activation
structured prompt/output contribution
history-scan zero/bounds
validation/quarantine counts
presentation counts
persistent source reads/writes
network calls
extra model calls
background work
source-path latency
legacy bridge activity
new legacy context growth
structured re-entry growth
```

Exact field names remain implementation-detail design.

## 48. Gate class C · presentation activation

G5 must prove:

```text
actual mount seam
DOM lifecycle
reroll/edit/reload remount lifecycle
cleanup
failure isolation
unowned host metadata preservation
visible/transcript coupling profile
```

Until G5 passes, LC3 cannot activate.

## 49. Gate class D · NEWS-specific maturity

G7 is required only before NEWS runtime activation.

It must derive trusted maturity context from existing owners such as:

```text
Frame
Time
Continuity
source reachability
```

NEWS may not own the clock.

## 50. Family-stage readiness labels

This master freezes **stage labels**, not new gates.

### `LIVE_REACTION_SHADOW_STAGE_READY`

Requires applicable closure of:

```text
G1
G2
G3
G4
G6 LIVE_REACTION caps
G8
```

### `LIVE_REACTION_PRESENTATION_STAGE_READY`

Requires:

```text
LIVE_REACTION_SHADOW_STAGE_READY
+ G5
```

### `BOARD_STAGE_READY`

Requires:

```text
G1
G2 where exposure applies
G3
G4
G5
G6 BOARD caps
G8
```

### `NEWS_STAGE_READY`

Requires:

```text
G1
G2
G3
G4
G5
G6 NEWS caps
G7
G8
```

These labels do not replace 3M-10's complete runtime-major close rule.

## 51. Read-only Tier A remains narrow

First-major runtime enablement is still allowed to be:

```text
read-only
current projection only
non-persistent
no source history
no item mutation
```

This is Tier A.

## 52. Interactive Tier B is separately capability-gated

Current post-3M Interaction design has concretely triggered Candidate C for mutation such as:

```text
BOARD_APPEND_REPLY
```

Tier B may therefore require:

```text
stable target identity
revision semantics
mutation policy
stale-operation rejection
possibly C6 / C8 for later model/media operations
```

But:

```text
TIER B REQUIREMENT
!=
TIER A PREREQUISITE
```

Do not delay or complicate read-only Source runtime by forcing full interaction durability into it.

## 53. SOCIAL_FEED / PUBLIC_KNOWLEDGE fence

Current main may contain completed designs for these families.

They remain **post-first-major expansion families** unless separately amended into runtime scope.

Legacy Community migration must not:

```text
serialize them through <COMMUNITY>
use Community as fallback presentation
use old Community history as their reachability/settlement evidence
```

## 54. Multi-Family Orchestration fence

Current post-3M Multi-Family design is a separate orchestration extension.

Base legacy migration must work with one-family activation.

If multi-family fanout is later enabled:

```text
LIVE_REACTION sibling
→ may participate in temporary legacy bridge

BOARD/NEWS/SOCIAL_FEED/PUBLIC_KNOWLEDGE siblings
→ never bridge through <COMMUNITY>
```

## 55. Interaction fence

Legacy Community representation is never a semantic mutation target.

Forbidden:

```text
user clicks legacy reaction DOM
→ mutate structured source item by text position
```

Any future semantic interaction must resolve through the current structured interaction control plane.

## 56. Preferred runtime-enabling program

The master recommends the following future design/implementation program if implementation is later authorized.

```text
LRE-0 master design                           ← this document
LRE-1 current-production + host coupling preflight
LRE-2 Exposure / selector / producer / transport contracts
LRE-3 family caps + integration instrumentation
LRE-4 LIVE_REACTION structured shadow
LRE-5 structured semantic-owner cutover + optional legacy bridge
LRE-6 structured presentation cutover
LRE-7 prospective legacy-context retirement
LRE-8 old-chat / mixed-era compatibility close
LRE-9 BOARD then NEWS family activation
LRE-10 first-major integration / release / real-validation close
```

This is a roadmap, not runtime authorization.

## 57. LRE-1 · current-production / host coupling preflight

Purpose:

```text
re-establish exact implementation authority
and characterize the actual target-host seams
```

Must cover:

```text
release-simcore exact bytes
latest == install
request construction
assistant representation
host transcript coupling
source mount possibility
reload/edit/reroll lifecycle
```

## 58. LRE-2 · semantic-control contracts

Freeze exact runtime owners for:

```text
current source-job selector
structured producer
transport
malformed/missing behavior
Exposure enforcement
semantic-owner cutover
```

No DOM/CSS change belongs in this checkpoint.

## 59. LRE-3 · bounds and observability

Freeze concrete caps and bounded evidence dimensions before active family generation.

No source semantic database may be introduced under the label of instrumentation.

## 60. LRE-4 · structured shadow

Future transaction goal:

```text
prove structured semantics alongside unchanged legacy behavior
```

No user-visible source replacement yet.

No host-history migration yet.

## 61. LRE-5 · semantic-owner cutover

Future transaction goal:

```text
structured validated LIVE_REACTION becomes the only new semantic source owner
```

If legacy visible/context compatibility is still required, use only the bounded compatibility serializer derived from structured validated semantics.

This transaction should remove independent legacy semantic generation authority.

## 62. LRE-6 · presentation cutover

Future transaction goal:

```text
structured LIVE_REACTION Presentation Renderer becomes primary user-visible surface
```

No new semantic policy should be introduced here.

## 63. LRE-7 · prospective context retirement

Future transaction goal:

```text
stop new legacy <COMMUNITY> source context growth
```

No old transcript rewrite.

No structured source re-entry.

This is a context behavior transaction and must be separately attributable.

## 64. LRE-8 · old-chat / mixed-era close

Must prove:

```text
old chat reload works
historical Community remains readable
old Community does not become current source authority
mixed old/new chat remains healthy
ordinary turns remain healthy
no false current-source activation
no mutation target resurrection
```

## 65. LRE-9 · BOARD / NEWS activation

After LIVE_REACTION structured migration is stable, activate new first-major families in separate bounded transactions.

Preferred order remains:

```text
BOARD
→ NEWS
```

NEWS requires G7.

Do not combine legacy context retirement and new family activation in one default transaction.

## 66. LRE-10 · first-major convergence

Only after applicable gates and family stages close:

```text
static / CI convergence
→ release-simcore deployment
→ real target-host validation
→ long-chat acceptance
→ main docs / durable-memory sync
```

This preserves the normal SimCore workflow.

## 67. Transaction isolation table

```text
Transaction A · SHADOW
owns: producer/transport shadow path
must not own: visible UI or context retirement

Transaction B · SEMANTIC CUTOVER
owns: structured source semantic authority + optional bridge
must not own: new UI mount or old-history rewrite

Transaction C · PRESENTATION CUTOVER
owns: structured source presentation
must not own: assertion policy or source memory

Transaction D · CONTEXT RETIREMENT
owns: stop new legacy context growth
must not own: source semantics or new family activation

Transaction E · BOARD ACTIVATION
owns: BOARD family runtime
must not own: legacy migration mechanics

Transaction F · NEWS ACTIVATION
owns: NEWS family runtime + maturity producer
must not own: legacy migration mechanics
```

## 68. Rollback philosophy

Each migration transaction needs a clean rollback direction.

### LC1 rollback

```text
turn off structured shadow
→ legacy behavior unchanged
```

### LC2 rollback

Rollback the whole semantic-owner cutover transaction to the previous release/config state.

Do not use per-request independent semantic fallback.

### LC3 rollback

Rollback presentation to the prior supported presentation while preserving one semantic owner.

### LC4 rollback

If real long-chat proves context retirement causes unacceptable regression, a controlled rollback may restore **compatibility serialization derived from structured semantics**.

It must not restore independent legacy semantic generation unless the whole semantic-owner migration is also explicitly rolled back.

## 69. No fuzzy rollback

Forbidden:

```text
structured path failed once
→ secretly ask model for old Community this turn
```

Rollback is an explicit control/release state transition.

## 70. Migration evidence matrix

Migration evidence is split into eight dimensions.

```text
M1 semantic safety
M2 authority / invalidation
M3 presentation
M4 host-context behavior
M5 old-chat compatibility
M6 ordinary dormancy
M7 reroll/edit/reload lifecycle
M8 performance / accumulation
```

## 71. M1 · semantic safety

Required cases include:

```text
public exposed fact allowed
Knowledge-only private fact denied
mention-only not upgraded
visible-cue inference remains inference
attributed social context not upgraded to fact
```

Target-host/model-compliance evidence remains required for claims about model behavior.

## 72. M2 · authority / invalidation

Required:

```text
source authority mismatch invalidates structured projection
reroll/source replacement cannot preserve stale semantic object
legacy historical existence does not rescue stale structured support
```

## 73. M3 · presentation

Required:

```text
one user-visible primary representation
structured text treated safely
renderer failure isolated from semantic truth
legacy compatibility representation never becomes source authority
```

## 74. M4 · host context

Required by stage:

```text
LC1: legacy context unchanged, structured re-entry zero
LC2/LC3: at most one compatibility source representation enters host context
LC4+: new legacy context growth zero, structured re-entry zero
```

## 75. M5 · old-chat compatibility

Required:

```text
old legacy chat reload
mixed-era chat reload
legacy parser read-only behavior
no retro-conversion into trusted assertions
no false current activation
```

## 76. M6 · ordinary dormancy

Required:

```text
ordinary turn before source
ordinary turn after LIVE_REACTION
ordinary turn after BOARD
ordinary turn after NEWS
long ordinary request after mixed source history
```

Expected Source Intelligence behavior remains DORMANT without current source authority.

## 77. M7 · lifecycle

Required:

```text
source reroll
visible user edit
runtime reload
presentation remount
legacy old-message reload
```

These must not create duplicate cards, duplicate source context, stale bridge output, or stale mutation targets.

## 78. M8 · performance / accumulation

Required:

```text
source-irrelevant baseline comparison
source-active path measurement
repeated source turns
mixed legacy/structured long chat
no new structured source history growth
no unbounded legacy bridge growth after LC4
```

## 79. Mixed-era validation lanes

At minimum, future real validation should include:

```text
ME1 old chat containing many legacy Community turns → reload → ordinary turn
ME2 old chat → new structured LIVE_REACTION → ordinary turn
ME3 old chat → structured BOARD / NEWS later → ordinary turn
ME4 clean post-migration chat → repeated structured source turns
ME5 user references old visible source without quoting → no hidden retrieval
ME6 user quotes old source text in current input → current-input semantics allowed
```

## 80. Clean-post-migration validation lane

A brand-new chat created after LC4 should prove:

```text
no automatic <COMMUNITY> generation
no structured source history
no structured source re-entry
structured presentation works
ordinary chat remains source-dormant
```

## 81. Legacy-tail validation lane

An old chat after LC4 may still have old Community in transcript.

Required interpretation:

```text
OLD LEGACY CONTEXT TAIL PRESENT
= compatibility residue
!= migration failure
```

provided:

```text
new legacy context growth = 0
no false source activation occurs
```

## 82. Context quality risks

Prospective retirement may expose behavior previously masked by legacy transcript recall.

Potential observations:

```text
model no longer implicitly remembers old audience reaction
user asks to continue source conversation without re-providing content
old and new chats behave differently during transition tail
```

These are real product observations and must be classified honestly.

## 83. Product rule for source memory

This master confirms the 3M-7 direction:

```text
SOURCE UI
!=
AUTOMATIC MODEL MEMORY
```

If future product requirements demand source recall, do not reintroduce it through legacy Community.

Open a Candidate C / controlled re-entry design instead.

## 84. Context-retirement blocker

Therefore LC4 is blocked if stakeholders require persistent source recall but no explicit Candidate C/re-entry design exists.

Forbidden workaround:

```text
keep hidden legacy Community forever
→ call that source memory
```

## 85. Compatibility bridge lifetime

A bridge must have an explicit exit condition.

Conceptual receipt:

```text
bridge reason
consumer identity/category
introduced stage
retirement gate
```

Exact runtime metadata is not frozen.

A bridge without an exit condition is architecture debt, not migration.

## 86. No hidden semantic copy in DOM

Structured presentation must not preserve legacy source semantics in hidden HTML merely for future parsing.

DOM is presentation state, not semantic authority or history storage.

## 87. No legacy bridge in persistent source DB

The first-major migration must not create a persistent source DB to retain legacy Community compatibility.

If durability is later required by interaction, use the separate Candidate C architecture for the concrete consumer.

## 88. No old-history scan for current activation

Legacy read compatibility may parse a specific historical message when the host displays/loads that message.

It must not authorize:

```text
scan all old Community history every request
→ infer active current source
```

3M-9 bounded current-request activation remains authoritative.

## 89. Representation / edit-reconcile protection

No first migration step may silently rewrite historical visible assistant bodies because that can change representation fingerprints and edit-reconcile classification.

Any future historical rewrite proposal must independently prove compatibility with:

```text
Representation
Edit Reconcile
State Reconcile
host message identity
```

## 90. Host metadata protection

Any future mount or projected write must preserve unowned host metadata.

Canonical rule:

```text
SOURCE MIGRATION OWNS SOURCE FIELDS ONLY
```

It may not rebuild an entire host record and accidentally delete unrelated plugin/host metadata.

## 91. Failure-domain separation

Migration must preserve independent failure domains.

```text
semantic invalid
→ source semantic failure

compatibility serializer failure
→ compatibility representation failure

presentation mount failure
→ presentation failure

host-context migration failure
→ context migration failure

old parser failure
→ legacy read-compat failure
```

A later failure must not upgrade or rescue an earlier semantic stage.

## 92. Diagnostics must name the stage

Future evidence should always identify which migration stage is active.

A screenshot without semantic/presentation/context stage identity is insufficient migration evidence.

Conceptual dimensions:

```text
semantic owner
presentation owner
legacy bridge active/inactive
new legacy context chars/count
structured re-entry chars/count
legacy read mode
```

Exact diagnostic UI is deferred to implementation design.

## 93. Static acceptance requirements

Before any candidate deployment, static/CI must prove at minimum:

```text
latest.js == install.js
no duplicate family registration
legacy serializer accepts LIVE_REACTION only
legacy serializer cannot consume quarantined content
structured re-entry remains disabled unless separately amended
no persistent source history introduced by migration
no retroactive transcript rewrite routine in first migration
legacy old-chat reader cannot create current source authority
DORMANT ordinary path has no legacy/structured source activation from residue
```

## 94. Shadow-specific static acceptance

LC1 candidate must prove:

```text
visible output unchanged by shadow path
legacy transcript unchanged by shadow path
shadow receipts bounded
no extra history scan
no auxiliary model call unless separately authorized
```

## 95. Semantic-cutover static acceptance

LC2 candidate must prove:

```text
one semantic owner
independent model-native legacy Community source authority absent
compat serializer, if present, derives only from validated LIVE_REACTION
no family fallback into Community
```

## 96. Presentation-cutover static acceptance

LC3 candidate must prove:

```text
structured renderer key bound to LIVE_REACTION
source-scoped DOM/CSS
plain-text safe rendering
no dual-visible default
mount cleanup
unowned metadata preservation
```

## 97. Context-retirement static acceptance

LC4 candidate must prove:

```text
new migrated source turns append zero legacy Community compatibility payload
structured automatic re-entry remains zero
old messages are not rewritten
legacy read compatibility remains available
```

## 98. Runtime deployment order

When implementation is eventually authorized, deployment still follows normal SimCore workflow:

```text
main design/evidence
→ work branch implementation
→ static / CI verification
→ release-simcore deployment
→ real long-chat validation
→ main documentation / durable-memory sync
```

No migration checkpoint bypasses `release-simcore` authority.

## 99. Release transaction separation

Default future release discipline:

```text
structured shadow
!=
semantic-owner cutover
!=
presentation cutover
!=
context retirement
!=
BOARD activation
!=
NEWS activation
```

Do not merge all into one release merely because the final architecture is known.

## 100. Exact version identity remains unfrozen

This master design does not assign:

```text
v0.70.x
v0.71.x
3.0.0
```

or any other semver to the future runtime.

Version identity belongs to then-current release planning.

## 101. Anomaly classification during future runtime work

Any real observation must be recorded immediately as:

```text
WATCH
DEFER
FIX
BLOCKER
```

before proceeding.

Migration-specific examples:

```text
WATCH · OLD_LEGACY_CONTEXT_TAIL_PRESENT
WATCH · STRUCTURED_PRESENTATION_MINOR_LAYOUT_DRIFT

FIX · DUPLICATE_VISIBLE_LIVE_REACTION
FIX · LEGACY_BRIDGE_FORMAT_INCOMPATIBILITY

BLOCKER · PRIVATE_FACT_LEAK_AFTER_STRUCTURED_CUTOVER
BLOCKER · DUAL_SEMANTIC_OWNERS_ACTIVE
BLOCKER · OLD_CHAT_RELOAD_CORRUPTION
BLOCKER · NEW_LEGACY_CONTEXT_STILL_GROWS_AFTER_LC4
```

## 102. Blocker registry

```text
BLOCKER · LEGACY_AND_STRUCTURED_BECOME_INDEPENDENT_SEMANTIC_OWNERS
BLOCKER · LEGACY_NATIVE_MODEL_GENERATION_SURVIVES_SEMANTIC_OWNER_CUTOVER_AS_FALLBACK
BLOCKER · LEGACY_BRIDGE_CONSUMES_UNVALIDATED_OR_QUARANTINED_SEMANTICS
BLOCKER · LEGACY_COMMUNITY_USED_AS_GENERIC_SOURCE_FAMILY_FALLBACK
BLOCKER · PRESENTATION_CUTOVER_CLAIMED_TO_RETIRE_HOST_CONTEXT_WITHOUT_HOST_PROOF
BLOCKER · CSS_HIDING_CLAIMED_AS_MIGRATION
BLOCKER · OLD_TRANSCRIPT_REWRITTEN_WITHOUT_SEMANTIC_AND_REPRESENTATION_PROOF
BLOCKER · STRUCTURED_AUTOMATIC_REENTRY_DUPLICATES_LEGACY_CONTEXT
BLOCKER · OLD_LEGACY_RESIDUE_ACTIVATES_CURRENT_SOURCE_JOB
BLOCKER · LEGACY_READER_PROMOTES_RAW_PROSE_TO_TRUSTED_STRUCTURED_ASSERTIONS
BLOCKER · LEGACY_REPRESENTATION_BECOMES_MUTATION_TARGET
BLOCKER · READ_ONLY_FIRST_MAJOR_FORCED_TO_ADOPT_INTERACTIVE_DURABILITY
BLOCKER · G1_G8_APPLICABLE_RUNTIME_GATES_BYPASSED
BLOCKER · SOURCE_MIGRATION_OVERWRITES_UNOWNED_HOST_METADATA
BLOCKER · NEW_LEGACY_CONTEXT_GROWTH_NONZERO_AFTER_LC4
BLOCKER · LATEST_INSTALL_DIVERGENCE
```

## 103. WATCH registry

```text
WATCH · OLD_LEGACY_CONTEXT_TAIL_PERSISTS_IN_EXISTING_CHATS
WATCH · IMPLICIT_SOURCE_RECALL_CHANGES_AFTER_LC4
WATCH · HOST_VISIBLE_CONTEXT_COUPLING_PROFILE_UNPROVEN_UNTIL_G5
WATCH · LEGACY_CONSUMER_INVENTORY_NOT_YET_EXECUTED
WATCH · SHADOW_STRUCTURED_PROMPT_OUTPUT_COST_UNMEASURED
WATCH · TARGET_HOST_MODEL_COMPLIANCE_PENDING
WATCH · MIXED_ERA_CHAT_BEHAVIOR_UNMEASURED
```

## 104. DEFER registry

```text
DEFER · RETROACTIVE_OLD_COMMUNITY_TRANSCRIPT_CLEANUP
DEFER · HARD_LEGACY_PARSER_REMOVAL
DEFER · GENERIC_HOST_CONTEXT_PROJECTION_FILTER
DEFER · AUTOMATIC_OLD_COMMUNITY_TO_STRUCTURED_CONVERSION
DEFER · SOURCE_HISTORY / RETRIEVAL
DEFER · AUXILIARY_SOURCE_MODEL
DEFER · INTERACTIVE_CANDIDATE_C_RUNTIME
DEFER · NETWORK_MEDIA_RUNTIME
DEFER · SOCIAL_FEED / PUBLIC_KNOWLEDGE RUNTIME ACTIVATION
DEFER · SEMVER / RELEASE IDENTITY
```

## 105. Child design checkpoints

This master freezes the recommended child-design sequence.

```text
LRE-1 · Then-Current Production + Host Coupling Preflight
LRE-2 · Source Job Selector + Structured Producer / Transport
LRE-3 · Family Caps + Integration Instrumentation
LRE-4 · LIVE_REACTION Structured Shadow
LRE-5 · Semantic Owner Cutover + Legacy Compatibility Bridge
LRE-6 · Structured Presentation Cutover
LRE-7 · Prospective Legacy Context Retirement
LRE-8 · Old-Chat / Mixed-Era Compatibility
LRE-9 · BOARD / NEWS Runtime Enablement
LRE-10 · First-Major Integration / Release / Real Validation
```

Each child remains design-only until separately authorized for implementation.

## 106. Recommended first child

The first child should be:

```text
LRE-1 · THEN-CURRENT PRODUCTION + HOST COUPLING PREFLIGHT DESIGN
```

Reason:

```text
all later runtime-enabling choices depend on actual release/runtime owners
and on whether the target host separates presentation from transcript/context
```

It is the narrowest next design step.

## 107. Final architecture before migration

```text
main model
   ↓
legacy Community prose
   ↓
legacy presentation
   ↓
host assistant transcript
   ↓
future context as ordinary history
```

## 108. Final architecture during LC2 bridge

```text
main model / structured producer contract
   ↓
untrusted structured draft
   ↓
validator / source authority / exposure
   ↓
Validated LIVE_REACTION
   ├─→ legacy compatibility serializer (temporary, if proven needed)
   │      ↓
   │   legacy-compatible representation
   │
   └─→ structured presentation later
```

Only the validated structured payload owns new source semantics.

## 109. Final architecture after LC4

```text
current request
   ↓
current source-job authority
   ↓
structured producer / transport
   ↓
validator / policy
   ↓
Validated LIVE_REACTION
   ↓
Presentation Renderer
   ↓
structured source UI

structured automatic context re-entry = 0
new legacy Community context growth    = 0
old legacy history                     = preserved
legacy parser                          = read-only compatibility
```

## 110. Frozen master state

```text
POST_3M_LEGACY_RUNTIME_ENABLEMENT_MASTER = FROZEN
DESIGN_ONLY                              = YES
RUNTIME_IMPLEMENTATION                   = NOT_AUTHORIZED

MIGRATION_MODEL
= FOUR AXES
  semantic / presentation / host-context / read-compat

MIGRATION_ORDER
= SEMANTIC OWNER FIRST
→ PRESENTATION SECOND
→ HOST-CONTEXT RETIREMENT LAST

MIGRATION_STATES
= LC0 LEGACY_NATIVE
→ LC1 STRUCTURED_SHADOW
→ LC2 STRUCTURED_SEMANTIC_PRIMARY
→ LC3 STRUCTURED_PRESENTATION_PRIMARY
→ LC4 PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT
→ LC5 LEGACY_READ_ONLY_COMPAT_STABLE

LEGACY RETIREMENT
= PROSPECTIVE
= OLD TRANSCRIPT PRESERVED
= NO AUTOMATIC RETROACTIVE REWRITE

LEGACY COMMUNITY
= LIVE_REACTION COMPATIBILITY ONLY
= NOT GENERIC FAMILY FALLBACK
= NOT MUTATION TARGET

RUNTIME ENABLEMENT
= REUSES 3M-10 G1–G8
= STAGED BY FAMILY / MIGRATION RESPONSIBILITY

TIER A
= FIRST-MAJOR READ-ONLY SOURCE RUNTIME
= CANDIDATE C DURABILITY NOT REQUIRED BY DEFAULT

TIER B
= POST-3M DURABLE / INTERACTIVE EXTENSIONS
= APPLICABLE CANDIDATE C CONTRACTS REQUIRED

STRUCTURED SOURCE HISTORY
= NONE BY DEFAULT

STRUCTURED AUTOMATIC REENTRY
= NONE

PREFERRED FINAL LEGACY STATE
= READ_ONLY_COMPAT

NEXT DESIGN
= LRE-1 THEN-CURRENT PRODUCTION + HOST COUPLING PREFLIGHT

PRODUCTION
= UNCHANGED

S7 / v0.70.3
= UNCHANGED

release-simcore
= UNCHANGED
```
