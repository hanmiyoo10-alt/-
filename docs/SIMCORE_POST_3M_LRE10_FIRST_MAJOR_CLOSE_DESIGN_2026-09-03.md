# SimCore Post-3.0M LRE-10 First-Major Integration / Release / Real-Validation Close Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-10 DESIGN FROZEN · LEGACY / RUNTIME-ENABLING DESIGN PROGRAM CONVERGED · DESIGN-ONLY · RUNTIME NOT READY / NOT IMPLEMENTED · RELEASE / TARGET-HOST / REAL-VALIDATION NOT CLAIMED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-10 · FIRST-MAJOR CONVERGENCE · RELEASE / VALIDATION PROTOCOL**

## 0. Purpose

LRE-10 closes the **design program** that began with the Legacy / Runtime-enabling master and continued through LRE-1..9.

It does not close runtime work.

It freezes:

```text
first-major target state
stage order
G1-G8 stage dependencies
release transaction boundaries
rollback / stop rules
real-validation protocol
final verdict vocabulary
```

The first-major runtime family set is:

```text
LIVE_REACTION
BOARD
NEWS
```

## 1. Authority chain

This design consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE3_CAPS_INSTRUMENTATION_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE4_STRUCTURED_SHADOW_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE5_SEMANTIC_OWNER_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE6_PRESENTATION_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE7_PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE8_OLD_CHAT_MIXED_ERA_COMPATIBILITY_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE9_BOARD_NEWS_RUNTIME_ENABLEMENT_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE10_FIRST_MAJOR_CLOSE_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01.md
```

Production runtime authority remains the then-current `release-simcore`.

## 2. LRE design convergence verdict

After LRE-10:

```text
LRE-0  Master architecture                         = FROZEN
LRE-1  Production host coupling                    = FROZEN
LRE-2  Semantic control / transient carrier        = FROZEN
LRE-3  Caps / instrumentation                      = FROZEN
LRE-4  Structured shadow                           = FROZEN
LRE-5  Semantic owner cutover                      = FROZEN
LRE-6  Structured presentation cutover             = FROZEN
LRE-7  Prospective legacy-context retirement       = FROZEN
LRE-8  Old-chat / mixed-era compatibility          = FROZEN
LRE-9  BOARD then NEWS runtime profiles            = FROZEN
LRE-10 Integration / release / validation close    = FROZEN

LEGACY_RUNTIME_ENABLING_DESIGN_PROGRAM = CONVERGED
```

This verdict is design-only.

## 3. Runtime truth remains separate

The following remain false / unclaimed after design convergence:

```text
RUNTIME_IMPLEMENTED = NO
RUNTIME_READY = NO
RELEASED = NO
TARGET_HOST_PASS = NO
REAL_LONG_CHAT_PASS = NO
```

No design document may convert these to PASS.

## 4. First-major stable destination

For newly migrated LIVE_REACTION turns, the preferred stable compatibility state remains:

```text
S1 = STRUCTURED_VALIDATED_SEMANTIC
P1 = STRUCTURED_PRESENTATION
H2 = LEGACY_CONTEXT_PREEXISTING_ONLY
R1 = LEGACY_READ_ONLY_COMPAT
```

Meaning:

```text
new LIVE_REACTION semantic authority = structured validated sidecar
new visible source presentation = structured renderer
new migrated turns append no legacy Community source context
old historical Community remains readable but passive
```

BOARD and NEWS are standalone structured families and do not use legacy Community compatibility serialization.

## 5. First-major stage machine

LRE-10 freezes the conceptual rollout machine:

```text
FM0 CURRENT_PRODUCTION_BASELINE
 ↓
FM1 STRUCTURED_SUBSTRATE_READY
 ↓
FM2 LIVE_REACTION_SHADOW
 ↓
FM3 LIVE_REACTION_SEMANTIC_PRIMARY
 ↓
FM4 LIVE_REACTION_PRESENTATION_PRIMARY
 ↓
FM5 LIVE_REACTION_LEGACY_CONTEXT_RETIRED
 ↓
FM6 LEGACY_READ_ONLY_COMPAT_STABLE
 ↓
FM7 BOARD_STANDALONE_PRIMARY
 ↓
FM8 NEWS_STANDALONE_PRIMARY
 ↓
FM9 FIRST_MAJOR_RUNTIME_CLOSE
```

These are conceptual stage labels, not runtime enum names.

## 6. No stage skipping by convenience

Default law:

```text
STAGE N
→ required evidence
→ explicit release/config boundary
→ STAGE N+1
```

Skipping a stage requires a fresh impact proof that preserves attribution and rollback safety.

No implementation may assume the whole stage machine can be collapsed because the design program is already converged.

## 7. FM0 · Current production baseline

Purpose:

```text
establish then-current release-simcore truth before implementation begins
```

Requirements:

```text
fresh G1
exact production version / commit
ordinary-chat baseline
legacy Community baseline where applicable
current reload/edit/reroll behavior
current telemetry / latency baseline
```

No historical production SHA may substitute for this proof.

## 8. FM1 · Structured substrate ready

FM1 is the minimum shared runtime substrate before any semantic cutover.

It conceptually contains only bounded mechanisms proven necessary by LRE-1..3:

```text
current source-job authority seam
bounded producer contract
transient tail carrier
strict parse / schema / cap enforcement
trusted source authority join
Exposure policy path
bounded G8 evidence
zero persisted carrier bytes
```

FM1 must not itself make structured Source user-visible or semantically primary.

## 9. FM2 · LIVE_REACTION structured shadow

Equivalent to LC1 purpose.

Externally:

```text
legacy behavior remains production-visible
```

Shadow lane:

```text
current request
→ structured proposal
→ trusted assembly
→ Exposure / validation
→ bounded receipt
```

Shadow output has no production semantic authority and no ordinary structured mount.

## 10. FM2 acceptance purpose

FM2 proves the semantic machinery can run without changing ordinary behavior.

It must test:

```text
current authority exactness
support quote grounding
Exposure ALLOW / DENY / HOLD
stale support invalidation
packet / cap fail-closed behavior
source-irrelevant dormancy
no persisted carrier residue
```

It does not require prose identity with legacy Community.

## 11. FM3 · LIVE_REACTION semantic primary

Equivalent to LC2 semantic cut.

At FM3:

```text
structured validated LIVE_REACTION
= sole semantic owner for new migrated source turns
```

Forbidden:

```text
structured primary fails
→ independently regenerate trusted legacy Community for that request
```

Any temporary legacy-compatible representation must be derived from validated LIVE_REACTION and remain representation-only.

## 12. FM3 rollback law

Once FM3 is active, semantic rollback is allowed only through an explicit release/config transition.

Per-request fallback that creates two semantic owners is prohibited.

## 13. FM4 · LIVE_REACTION presentation primary

Equivalent to LC3.

At FM4:

```text
validated structured semantics
→ LIVE_REACTION_STREAM_V1
→ primary user-visible source presentation
```

The default UI must not show both:

```text
legacy Community
+
structured LIVE_REACTION card
```

for the same projection outside bounded diagnostics.

## 14. FM4 requires real G5 host proof

G5 must prove more than "a DOM node can be inserted".

Required host facts include:

```text
mount location
binding to exact current assistant/source turn
edit reconciliation
reroll reconciliation
reload reconciliation
cleanup lifecycle
whether mount mutates assistant transcript bytes
whether hidden compatibility text remains model-visible
unowned host metadata preservation
```

## 15. FM5 · Prospective legacy-context retirement

Equivalent to LC4.

At FM5:

```text
new migrated LIVE_REACTION turns
→ new legacy Community source-context chars = 0
```

Old chat bytes remain untouched.

Structured Source history and automatic re-entry remain zero under 3M-7.

## 16. FM6 · Legacy read-only compatibility stable

Equivalent to LC5 stable compatibility.

At FM6:

```text
new legacy semantic generation = 0
old legacy Community remains readable
old legacy Community cannot reactivate Source authority
manual edit of old text != new Source generation
reload of old chat != new Source authority
```

Hard removal of the legacy reader is not required.

## 17. FM7 · BOARD standalone primary

BOARD activates only after the generalized standalone family machinery has already been proven through LIVE_REACTION migration stages.

BOARD is:

```text
read-only
snapshot-only
anonymous ordinal participant profile
BOARD_THREAD_V1 presentation
no legacy Community fallback
no Candidate C persistence
```

LRE-9 frozen caps and hierarchy rules apply unchanged.

## 18. FM7 family independence

BOARD must derive from current trusted authority directly.

Forbidden:

```text
LIVE_REACTION output → BOARD truth authority
old Community → BOARD truth authority
old BOARD card → current BOARD activation
```

## 19. FM8 · NEWS standalone primary

NEWS activates after BOARD has proven the family registry / dispatch / presentation path with the structurally simpler family.

NEWS remains first-profile:

```text
read-only
snapshot-only
BREAKING_COARSE only
story-atomic validation
NEWS_ARTICLE_V1
no legacy Community fallback
```

## 20. FM8 G7 restriction

The first NEWS runtime profile must not invent arbitrary elapsed-time maturity thresholds.

G7 must produce only the trusted maturity context frozen by LRE-9.

If the required trusted maturity fact is unavailable:

```text
NEWS maturity-dependent activation
→ fail closed
```

## 21. FM9 · First-major runtime close

FM9 may be claimed only after:

```text
LIVE_REACTION stable migration evidence
BOARD standalone runtime evidence
NEWS standalone runtime evidence
ordinary-chat no-regression evidence
mixed-era compatibility evidence
performance / boundedness evidence
release rollback evidence
```

Design convergence alone cannot produce FM9.

## 22. G1-G8 stage matrix

Legend:

```text
REQ = required before stage may be claimed
N/A = not applicable to that stage
DES = design contract exists but runtime proof still required when stage is executed
```

| Stage | G1 | G2 | G3 | G4 | G5 | G6 | G7 | G8 |
|---|---|---|---|---|---|---|---|---|
| FM0 baseline | REQ | N/A | N/A | N/A | N/A | N/A | N/A | REQ |
| FM1 substrate | REQ | REQ | REQ | REQ | N/A | REQ | N/A | REQ |
| FM2 LR shadow | REQ | REQ | REQ | REQ | N/A | REQ | N/A | REQ |
| FM3 LR semantic primary | REQ | REQ | REQ | REQ | N/A | REQ | N/A | REQ |
| FM4 LR presentation primary | REQ | REQ | REQ | REQ | REQ | REQ | N/A | REQ |
| FM5 context retirement | REQ | REQ | REQ | REQ | REQ | REQ | N/A | REQ |
| FM6 read-only compat | REQ | REQ | REQ | REQ | REQ | REQ | N/A | REQ |
| FM7 BOARD | REQ | REQ | REQ | REQ | REQ | REQ | N/A | REQ |
| FM8 NEWS | REQ | REQ | REQ | REQ | REQ | REQ | REQ | REQ |
| FM9 close | REQ | REQ | REQ | REQ | REQ | REQ | REQ | REQ |

The table does not authorize implementation. It defines evidence dependencies.

## 23. G1 is per transaction, not once forever

Canonical law:

```text
G1 passed for earlier release
!=
G1 automatically passed for later release
```

Every runtime transaction begins from then-current `release-simcore` and rechecks changed authority surfaces.

## 24. G2 closure rule

G2 requires target-host / model-compliance evidence for Exposure mechanics.

Prompt-level design confidence is insufficient.

G2 must cover at least:

```text
private Knowledge-only denial
current broadcast fact
attributed social claim
visible broadcast cue inference
unsupported / unknown evidence
model contract compliance on target host
```

## 25. G3 closure rule

G3 proves the current request/family activation fact comes from a trusted current authority.

Forbidden selector inputs:

```text
incidental prose words
old source cards
old Community
model-chosen family field
history fuzzy search
```

## 26. G4 closure rule

G4 proves:

```text
producer contract
transient carrier
strict parser
job-token binding
schema selection
trusted assembly
carrier removal
persisted carrier chars = 0
```

Family packets may vary, outer transport does not.

## 27. G5 closure rule

G5 proves exact-current presentation ownership and host lifecycle.

A screenshot alone is insufficient.

Evidence must include:

```text
turn binding
mount lifecycle
reroll rebinding
edit reconciliation
reload behavior
cleanup
host metadata preservation
transcript/context coupling characterization
```

## 28. G6 closure rule

G6 has two layers:

```text
DESIGN G6
= concrete caps frozen

RUNTIME G6
= those caps actually enforced fail-closed
```

LRE-3/LRE-9 close the design layer only.

Runtime proof must include boundary cases at and above each relevant ceiling.

No truncation-based repair is permitted unless separately designed.

## 29. G7 closure rule

G7 applies only to NEWS in the first major.

It proves the trusted maturity-context producer and breaking-only profile actually operate without:

```text
model-owned maturity
arbitrary second clock
elapsed-time guesswork
future narrative knowledge
```

## 30. G8 closure rule

G8 evidence must remain bounded and non-semantic.

Allowed examples:

```text
family
packet bytes
validated item counts
ALLOW / DENY / HOLD counts
cap status
mount status
carrier persisted chars
new legacy context chars
source re-entry chars
stage / failure reason
latency spans
```

Forbidden ordinary retained evidence:

```text
full source content
support quotes
quarantined text
hidden facts
long-lived Source history
```

## 31. Release transaction boundaries

Each ownership-changing stage is a separate release/config transaction by default.

Recommended transaction classes:

```text
T0 BASELINE / PREFLIGHT
T1 STRUCTURED SUBSTRATE + SHADOW
T2 LIVE_REACTION SEMANTIC PRIMARY
T3 LIVE_REACTION PRESENTATION PRIMARY
T4 LEGACY CONTEXT RETIREMENT + READ-ONLY COMPAT STABILIZATION
T5 BOARD STANDALONE PRIMARY
T6 NEWS STANDALONE PRIMARY
T7 FIRST-MAJOR CLOSE / EVIDENCE ONLY
```

A later impact proof may split these further.

Merging them together requires explicit proof; convenience is not proof.

## 32. Future semantic version selection

LRE-10 intentionally freezes no release number.

At execution time:

```text
read then-current production version
→ choose monotonic successor according to release governance
```

Historical parked design labels must not force version regression.

## 33. Stage stop rule

If a stage fails required evidence:

```text
STOP at current known-good stage
```

Do not automatically advance with a reduced evidence bar.

Examples:

```text
G5 mount proof fails
→ semantic primary may remain separately evaluated
→ presentation primary not claimed

BOARD proof fails
→ NEWS does not proceed merely to "try another family"
```

## 34. Rollback hierarchy

Preferred rollback scope:

```text
current stage transaction
```

not:

```text
entire Source Intelligence architecture
```

unless evidence shows shared substrate corruption.

Rollback must preserve the last proven semantic-owner state.

## 35. No per-request semantic fallback

Once a stage is semantic-primary:

```text
validation/mount failure
→ family-specific fail-closed/fallback presentation contract
```

not:

```text
secretly invoke old semantic owner for one request
```

This law prevents mixed authority.

## 36. Validation lane V0 · Production baseline

Capture before first runtime transaction:

```text
ordinary request latency / output
legacy Source-active request behavior
reroll
manual edit
reload
long-chat continuity
current telemetry footprint
```

## 37. Validation lane V1 · Source-irrelevant dormancy

On ordinary requests:

```text
current Source job = none
→ no source proposal
→ no source parse/validation
→ no source mount
→ no source persistence
→ no source history scan
```

Bounded activation checks are allowed.

## 38. Validation lane V2 · LIVE_REACTION shadow positive

Use current public support.

Require:

```text
valid packet
current authority join
expected ALLOW outcomes
bounded receipt
legacy visible behavior unchanged
```

## 39. Validation lane V3 · Exposure negative

Use Knowledge-only / unsupported / unreached content.

Require:

```text
DENY or HOLD as applicable
no hidden semantic content in presentation/receipt
no legacy semantic fallback
```

## 40. Validation lane V4 · Stale support invalidation

Procedure:

```text
produce current projection
→ reroll/replace supporting authority
→ attempt use of old projection
```

Require old projection invalidation.

## 41. Validation lane V5 · Carrier cleanliness

For every structured-active family:

```text
raw carrier may exist transiently
clean visible assistant content has no carrier
persisted carrier chars = 0
future prompt carrier chars = 0
```

## 42. Validation lane V6 · Presentation lifecycle

Exercise:

```text
mount
reroll
manual edit
reload
turn removal/replacement if host supports it
```

Require exact-current binding and cleanup without unrelated metadata loss.

## 43. Validation lane V7 · Prospective context retirement

After FM5:

```text
new migrated LIVE_REACTION turn
→ newLegacyContextChars = 0
→ structuredReentryChars = 0
```

Old historical Community remains untouched and readable.

## 44. Validation lane V8 · Mixed-era old chat

Open chat containing old legacy Community plus new structured-era turns.

Require:

```text
old Community readable
old Community passive
no hidden source resurrection
new structured turn uses current authority only
manual edits do not create source authority
```

## 45. Validation lane V9 · BOARD positive

Require:

```text
family selector = trusted BOARD
anonymous ordinal participants only
valid POST/REPLY graph
parent visibility dependency
LRE-9 cap enforcement
BOARD_THREAD_V1 mount
no legacy bridge
```

## 46. Validation lane V10 · BOARD negative / cap

Exercise:

```text
unknown participant
reply-to-reply
missing/future parent
entry count > cap
field oversize
5th reply to a post
```

Require fail-closed rejection without truncation/reparenting.

## 47. Validation lane V11 · NEWS positive

Require:

```text
trusted NEWS family selection
BREAKING_COARSE trusted maturity context
headline + body Exposure pass
story-atomic validation
NEWS_ARTICLE_V1 mount
no legacy bridge
```

## 48. Validation lane V12 · NEWS negative / maturity

Exercise:

```text
future event
source not reached
unknown maturity
requested detail ahead of maturity
headline leakage
one body assertion non-eligible
```

Require appropriate HOLD/quarantine and no partial misleading story.

## 49. Validation lane V13 · Sequential cross-family isolation

Use one public event in separate requests:

```text
LIVE_REACTION
then BOARD
then NEWS
```

Require each to derive independently from current authority.

Forbidden evidence flow:

```text
projection A
→ truth authority for projection B
```

## 50. Validation lane V14 · Repeated-use no accumulation

Across long chat with intermittent source-active turns, require cost to remain bounded by current projection rather than number of past source projections.

Check:

```text
source history scan = 0
structured re-entry = 0
no growing hidden Source store
ordinary dormant turns return to dormant budget
```

## 51. Validation lane V15 · Failure isolation

Inject family-specific failures.

Examples:

```text
BOARD packet invalid
NEWS maturity unavailable
presentation adapter fails
```

Require unrelated assistant response and unrelated family/runtime state not to be corrupted.

Semantic validity, source validity, and presentation failure remain distinct failure classes.

## 52. Validation lane V16 · Explicit rollback

For every ownership-changing release/config stage:

```text
activate stage
→ verify stage
→ execute approved rollback procedure
→ verify prior known-good state restored
```

Rollback proof is required before treating a stage as safe to advance from.

## 53. Validation lane V17 · Reload residue

After structured Source use and app/runtime reload:

Require:

```text
no carrier residue
no automatic Source job resurrection
old UI does not create semantic authority
current runtime epoch/currentness binding preserved
```

## 54. Validation lane V18 · Long-chat first-major close

A real close run must include a mixed sequence such as:

```text
ordinary turns
LIVE_REACTION turn
ordinary turns
reroll
manual edit
reload
BOARD turn
ordinary turns
NEWS turn
old-chat reopen
ordinary turns
```

Exact content is not frozen here.

The lane must prove both Source functionality and ordinary-chat non-regression.

## 55. Real-validation evidence packet

A future evidence packet should identify:

```text
release version / commit
host identity / version if available
stage
mode/family
request/turn binding identifiers permitted by existing diagnostics
G1-G8 status
validation lane
counts / bytes / timings
failure reason if any
rollback result if applicable
```

It must not retain private semantic payloads merely for convenience.

## 56. First-major PASS rule

Future runtime first-major PASS requires all of:

```text
G1-G8 applicable proofs PASS
FM0-FM8 reached in authorized staged order
required V0-V18 lanes PASS or explicitly N/A by owning contract
ordinary-chat baseline preserved
LIVE_REACTION stable migration state proven
BOARD standalone state proven
NEWS standalone state proven
rollback proof present
no unresolved BLOCKER/FIX in owned runtime scope
```

## 57. PARTIAL rule

If the structured substrate works but later stages remain unproven:

```text
FIRST_MAJOR_RUNTIME = PARTIAL
```

Examples:

```text
LIVE_REACTION migrated but BOARD not proven
BOARD proven but NEWS G7 fails
presentation mount unresolved
old-chat compatibility not proven
```

Do not promote PARTIAL to PASS through prose optimism.

## 58. FAIL rule

Any material contradiction such as:

```text
two semantic owners
private content leakage
stale projection accepted as current
carrier persisted into transcript
history-driven activation
new legacy context continues after claimed retirement
family output used as truth authority for another family
unbounded ordinary-turn Source work
```

forces runtime close FAIL until repaired and revalidated.

## 59. DESIGN PASS rule

LRE-10 itself may claim only:

```text
LEGACY_RUNTIME_ENABLING_DESIGN_PROGRAM = CONVERGED
```

because:

```text
LRE-0..10 design contracts are frozen
stage machine is frozen
G mapping is frozen
release boundaries are frozen
validation protocol is frozen
```

## 60. Runtime readiness at design close

At this design checkpoint:

```text
G1 then-current runtime preflight          = NOT RUN FOR IMPLEMENTATION
G2 target-host/model compliance            = PENDING
G3 trusted current selector proof          = PENDING
G4 live producer/transport proof           = PENDING
G5 live host presentation proof            = PENDING
G6 live cap enforcement proof              = PENDING
G7 live NEWS maturity producer proof       = PENDING
G8 live integration instrumentation proof  = PENDING

RUNTIME_READINESS = NO
```

## 61. What LRE-10 intentionally leaves open

After design convergence, remaining work is executional or separately scoped:

```text
implementation authorization
fresh G1
runtime code
host proof
model-compliance proof
release selection
real target-host runs
long-chat validation
production deployment
```

Those are not missing LRE design sections.

## 62. Interaction / Materialization remains separate

LRE-10 does not close IM-1..IM-6.

Read-only first-major Source runtime may converge independently from interactive source mutation/materialization.

If interaction is introduced into the first runtime rollout, LRE-10 must be reopened by impact review because Candidate C and operation-generation ownership may become active requirements.

## 63. Post-LRE design status

After this document:

```text
POST-3M PRODUCT DESIGN
├ SOCIAL_FEED V1                     = CONVERGED
├ PUBLIC_KNOWLEDGE V1                = CONVERGED
├ Candidate C                         = CONVERGED DESIGN / CONDITIONAL ACTIVATION
├ Multi-Family Orchestration          = CONVERGED DESIGN / NOT ACTIVE
├ Interaction / Materialization       = DETAIL DESIGN REMAINS
└ Legacy / Runtime-enabling           = CONVERGED DESIGN
```

## 64. Final LRE-10 verdict

```text
LRE10_DESIGN = FROZEN
LEGACY_RUNTIME_ENABLING_DESIGN_PROGRAM = CONVERGED
FIRST_MAJOR_RUNTIME = NOT IMPLEMENTED
FIRST_MAJOR_RUNTIME_READINESS = NO
FIRST_MAJOR_RELEASE = NOT AUTHORIZED
FIRST_MAJOR_REAL_VALIDATION = NOT RUN
NEXT_LRE_DESIGN_CHECKPOINT = NONE
```

Any future LRE change should be opened because new runtime evidence or a newly authorized product requirement invalidates an existing assumption, not because another design checkpoint was left unnamed.
