# SimCore Reference Analysis - LightBoard HunterNet 4.0.0

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 💠헌터넷 4.0.0
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-30/
```

Archived artifact SHA-256:

```text
ae7ecb090e5def555cfbef28b2e9c4d55b09ffaeb6443d9796ecc6d0b87f3f81
```

Related reference analyses:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_MINIBOARD_4_1_1_2026-08-30.md
```

This document analyzes HunterNet as an external idea source only. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, the architecture contract, or the frozen v0.70.1 design.

A public source-correlated implementation was inspected at:

```text
repo: enzi221/risumo
commit: a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f
path: lb-hn/*
```

The public source identifies the frontend as `🔦라이트보드 💠헌터넷 4.0.0`, namespace `lb-hn`, with `lowLevelAccess=false`. The archived user-supplied artifact remains the local reference authority.

---

## 1. Executive finding

HunterNet is useful because it tests whether the earlier LightBoard findings are merely generic forum ideas or can form a broader source-projection model.

The answer is: **the broader model survives, and HunterNet adds an important missing dimension.**

Comments and Miniboard emphasized:

```text
what the audience can know
how exposed an event is
how audience assertions remain non-canonical
how much old sidecar data stays in future context
```

HunterNet adds:

```text
whether the communication channel itself is reachable
and whether enough propagation time has elapsed for that channel to react
```

The strongest new research candidates are therefore:

1. **Channel Reachability Contract**
2. **Reaction Propagation Window**
3. **Audience Projection Envelope v2**
4. **Source-Local Identity Affordance**

The first three are the main value.

HunterNet also reinforces prior findings:

- Epistemic Sidecar Quarantine;
- Graded Audience Exposure;
- Bounded Context Aperture;
- Stable semantic payload + structure validation;
- Least-privilege frontend ownership;
- DO NOT TRANSFER historical chat mutation.

---

## 2. Frontend anatomy

Version-correlated HunterNet declares:

```text
name           = 🔦라이트보드 💠헌터넷 4.0.0
namespace      = lb-hn
version        = 4.0.0
lowLevelAccess = false
```

Its manifest remains small:

```text
identifier = lb-hn
authorsNote = false
charDesc = true
loreBooks = true
personaDesc = true
rerollBehavior = remove-prev
```

Its frontend responsibilities are similar to Miniboard:

```text
HunterNet semantic instructions
structured TOON payload
interaction update instructions
output validator
output normalizer
HunterNet renderer / button handling
presentation CSS / filters
configuration toggles
```

The shared LightBoard backend still owns the generic request lifecycle.

This again supports the architectural observation that feature semantics can remain low-privilege while generic privileged orchestration lives in a shared owner.

Classification:

```text
REINFORCES EXISTING · LEAST_PRIVILEGE_FRONTEND_CAPABILITY
```

---

## 3. Stable HunterNet semantic payload

HunterNet uses a stable wrapper:

```text
<lb-hn name="..." currenttime="YYYY-MM-DD HH:MM:SS">
  posts
    author
    id
    title
    time
    views
    upvotes
    content
    comments
      author
      content
</lb-hn>
```

The output validator checks only that:

```text
1. an <lb-hn> node exists
2. its body decodes as TOON
```

The output normalizer keeps the final HunterNet node and removes surrounding model chatter.

This repeats the useful pattern:

```text
model generation
→ structure acceptance
→ canonical source-local payload
→ presentation
```

The renderer is not semantic authority.

Classification:

```text
REINFORCES EXISTING · STRUCTURE_AS_ACCEPTANCE_AUTHORITY
```

---

## 4. Channel Reachability Contract

### 4.1 HunterNet rule

HunterNet is not represented as an omnipresent abstract reaction layer.

The reference defines a concrete medium:

```text
anonymous internet board for Awakened Hunters
accessible from Hunter terminals / smartphones / PCs
inaccessible inside Gates
```

That means even if HunterNet users would theoretically care about an event, a HunterNet reaction is not automatically valid in every narrative location or connectivity state.

A source must first be **reachable**.

### 4.2 Why this is distinct from knowledge boundary

These are different questions:

```text
KNOWLEDGE BOUNDARY
Can an audience know this fact?

CHANNEL REACHABILITY
Can this source/platform currently receive or transmit that knowledge at all?
```

Example:

```text
A Hunter witnesses something inside a Gate.

world fact = yes
witness knowledge = yes
HunterNet channel reachable inside Gate = no
immediate HunterNet post = invalid
later post after exiting Gate = potentially valid
```

This is not merely privacy.

It is a medium/topology constraint.

### 4.3 SimCore relevance

SimCore already owns source handoff and Community platform classification.

A future source-projection design could model source validity more explicitly as:

```text
SOURCE REQUEST
   ↓
channel reachable?
   ↓
source has exposure path?
   ↓
audience can know?
   ↓
reaction generation
```

Potential evidence inputs could include:

```text
current source authority
location / scene context
broadcast/publication state
witnessability
network/medium availability when canonically established
source handoff
explicit user-selected Community platform
```

The system should not invent network outages or medium restrictions without source/world evidence.

Classification:

```text
PROMISING · CHANNEL_REACHABILITY_CONTRACT
```

This is a research abstraction only, not an implementation authorization.

---

## 5. Reaction Propagation Window

### 5.1 HunterNet rule

HunterNet explicitly requires narrative time awareness.

Board users need time to react unless they were present at the event.

The payload additionally carries:

```text
currenttime="YYYY-MM-DD HH:MM:SS"
```

This makes source reaction a time-dependent phenomenon rather than a timeless transformation of the current scene.

### 5.2 Distinct questions

A valid reaction can require all of:

```text
1. event happened
2. event became observable
3. information reached the source
4. sufficient propagation / posting time elapsed
5. the current audience/source is eligible to react
```

The first three LightBoard analyses covered much of 1, 2 and 5.

HunterNet makes 3 and 4 explicit.

### 5.3 SimCore relevance

SimCore already has Frame / Time / Continuity and Source Handoff ownership.

A future Community projection could use existing narrative time facts to avoid impossible instant reactions.

Potential abstract classes could be:

```text
LIVE_DIRECT
NEAR_REALTIME
DELAYED_PROPAGATION
OFFLINE_UNTIL_REACHABLE
```

These names are illustrative only.

The important rule is:

> Source reaction timing should be constrained by the medium and established narrative chronology, not generated as if every platform were omniscient and instantaneous.

Classification:

```text
PROMISING · REACTION_PROPAGATION_WINDOW
```

No new clock system is needed by this reference. Any future implementation should consume the existing time owner rather than create a parallel timeline.

---

## 6. Audience Projection Envelope v2

The accumulated LightBoard findings can now be expressed more precisely.

Earlier synthesis:

```text
Knowledge Boundary
→ Exposure
→ Reaction
→ Epistemic Quarantine
→ Context Aperture
```

HunterNet extends it to:

```text
Channel Reachability
        ↓
Knowledge Boundary
        ↓
Graded Exposure
        ↓
Reaction Propagation Window
        ↓
Source-Local Reaction Generation
        ↓
Epistemic Quarantine
        ↓
Bounded Context Aperture
```

Or as questions:

```text
A. Is this source/channel currently usable?
B. What facts can this audience know?
C. How public / detailed / discussion-worthy are those facts?
D. Has enough time passed for this source to receive and react?
E. What source-local voices/identities are plausible?
F. Which generated claims remain rumor/noise rather than canon?
G. How much of this old sidecar should influence later turns?
```

This appears broader than a forum-specific abstraction.

It can describe:

```text
internet boards
live broadcast comments
local parent communities
news/social reactions
closed occupational communities
future source-specific Community families
```

Classification:

```text
PROMISING · AUDIENCE_PROJECTION_ENVELOPE_V2
```

This supersedes neither current Community contracts nor v0.70 Current Task Primacy. It is a future research model only.

---

## 7. Source-local identity affordance

HunterNet encodes identity differently from generic Miniboard.

Examples include:

```text
guest nickname + partial IP
fixed / semi-fixed nickname
visible Hunter rank for assigned identities
no visible rank for guests
rank-distribution expectations
```

The semantic point is not the exact nickname syntax.

The useful concept is:

> A Community/source family may expose different identity metadata and credibility/social-status cues.

For HunterNet, a visible A/B/C rank changes how readers interpret a post.

For another platform, comparable source-local identity affordances could be:

```text
verified badge
local-area identity
moderator status
known professional role
anonymous account
long-lived community nickname
```

SimCore relevance:

This could eventually help source-specific Community texture, but it risks state growth and overfitting.

Classification:

```text
WATCH / PROMISING · SOURCE_LOCAL_IDENTITY_AFFORDANCE
```

Do not add persistent identity state merely because HunterNet demonstrates the idea.

---

## 8. Source semantics are not game semantics

HunterNet strongly distinguishes the in-world medium from a meta/game framing.

The reference explicitly states:

```text
HunterNet is an internet board, not combat communications.
The world is not a game.
Hunters are real people who can die.
Skills/gates/monsters are not game-system abstractions to the participants.
```

This is a useful reminder for SimCore source-specific Community generation:

```text
PLATFORM STYLE
must not overwrite
WORLD ONTOLOGY
```

A forum can look game-like while the represented reality remains literal and dangerous.

Classification:

```text
REINFORCES EXISTING · SOURCE_STYLE_MUST_NOT_REWRITE_WORLD_ONTOLOGY
```

This aligns with Current Task Primacy and source authority: formatting/style context must not silently become semantic world authority.

---

## 9. Epistemic Sidecar Quarantine remains intact

HunterNet's main-model context instruction says the board may contain:

```text
trolls
jokes
memes
false rumors
fake news
```

and posts are not necessarily true.

Therefore HunterNet independently reinforces:

```text
SOURCE_ASSERTION != WORLD_FACT
```

This is especially important for occupational communities where participants may sound authoritative.

An A-rank Hunter posting a claim may increase plausibility inside the simulated social layer, but it still does not create canonical truth without independent world/source evidence.

Classification:

```text
REINFORCES EXISTING · COMMUNITY_EPISTEMIC_QUARANTINE
```

---

## 10. Graded audience exposure remains transferable

HunterNet uses the same broad privacy/exposure ladder as Miniboard.

It distinguishes:

```text
private activity
public sighting
important aftermath
famous/notorious status
mild rumor
insider-level detail
complete protagonist exclusion
```

This further supports the earlier conclusion that:

```text
EXISTS IN WORLD
!= PUBLICLY OBSERVABLE
!= SOURCE-REACHABLE
!= DISCUSSION-WORTHY
!= KNOWN IN DETAIL
```

Classification:

```text
REINFORCES PROMISING · GRADED_AUDIENCE_EXPOSURE
WATCH · DO_NOT_COPY_MANUAL_PRIVACY_POLICY_DIRECTLY
```

A future SimCore adaptation should derive exposure from evidence where possible rather than add another manual user policy surface.

---

## 11. Bounded Context Aperture varies by source

HunterNet's old-data process filter retains only a bounded recent tail when context inclusion is enabled.

The current source-correlated rule uses a different window from Miniboard.

That matters conceptually:

```text
CONTEXT APERTURE MAY BE SOURCE-SPECIFIC
```

A fast-moving anonymous board may need a different semantic retention window from a slower community or a persistent status surface.

This suggests a future design should avoid one global Community-history aperture if evidence eventually proves source families need different bounded retention.

Classification:

```text
PROMISING · SOURCE_BOUNDED_CONTEXT_APERTURE
```

However:

```text
DEFER · PER_PLATFORM_RUNTIME_RETENTION_POLICY
```

because SimCore does not currently have source-proven need for multiple runtime retention policies.

---

## 12. Target-local interaction contract

HunterNet interactions follow the same useful semantic rule seen in Miniboard:

```text
update the specifically targeted post/comment
keep unrelated textual data unchanged
allow bounded culling only when needed
subtly advance counters / engagement
```

This is essentially a small structured transaction contract.

It is attractive for interactive sidecars because the model is instructed not to rewrite unrelated data.

SimCore classification remains:

```text
DEFER · TARGET_LOCAL_SEMANTIC_TRANSACTION
```

Reason:

The concept is useful, but current SimCore authority is built around conversation turns, not mutable embedded UI records.

No implementation should be attempted until a real SimCore feature needs target-local structured mutation.

---

## 13. Historical chat mutation remains forbidden for SimCore transfer

HunterNet's delete flow:

```text
get target historical chat
parse <lb-hn>
remove post/comment
re-encode payload
setChat(target index, rewritten data)
```

This is appropriate for LightBoard's interactive sidecar UX, but conflicts with SimCore's existing historical identity and reconciliation model.

Risks include:

```text
Fresh/canonical identity ambiguity
manual-edit attribution ambiguity
reroll lineage disturbance
stale probe confusion
turn-binding confusion
representation/mirror reconciliation complexity
```

Classification:

```text
DO NOT TRANSFER · HISTORICAL_SETCHAT_MUTATION_MODEL
```

If SimCore ever gains mutable sidecars, the state must be owned separately rather than silently rewriting historical assistant output as UI storage.

---

## 14. Dynamic runtime source code remains forbidden for direct transfer

HunterNet loads shared LightBoard prelude/runtime code dynamically from lorebook content.

This is consistent with the LightBoard extension model but remains opposite to SimCore's static module graph and architecture checker.

Classification:

```text
DO NOT TRANSFER · DYNAMIC_RUNTIME_CODE_LOADING
```

Conceptual patterns may be adapted, but executable third-party callback/renderer loading is not a SimCore direction.

---

## 15. Comparison with previous references

### Comments 4.0.0

Strongest contribution:

```text
Audience Knowledge Boundary
Community Context Aperture
```

### Core 4.1.1

Strongest contribution:

```text
Owner-Scoped Context Projection
Effect-Class Contract
```

### Miniboard 4.1.1

Strongest contribution:

```text
Audience Projection Envelope
Graded Audience Exposure
Epistemic Quarantine
Semantic Payload / Renderer Decoupling
```

### HunterNet 4.0.0

Strongest new contribution:

```text
Channel Reachability
Reaction Propagation Window
Source-local identity affordance
```

HunterNet therefore expands the audience model from purely epistemic visibility to **medium/topology/time validity**.

---

## 16. SimCore candidate research model

The most promising combined future abstraction now looks like:

```text
CURRENT SOURCE / PLATFORM REQUEST
        ↓
CHANNEL REACHABILITY
        ↓
OWNER-SCOPED CONTEXT PROJECTION
        ↓
AUDIENCE KNOWLEDGE BOUNDARY
        ↓
GRADED EXPOSURE
        ↓
REACTION PROPAGATION WINDOW
        ↓
SOURCE-LOCAL COMMUNITY GENERATION
        ↓
STRUCTURE / ACCEPTANCE JUDGE
        ↓
EPISTEMIC QUARANTINE
        ↓
BOUNDED CONTEXT APERTURE
```

Potentially relevant current SimCore owners:

```text
community
handoff
evidence
time
frame
reaction
structure
prompt
```

This mapping is exploratory only.

A future implementation design would have to prove exact ownership from production source before changing anything.

---

## 17. Relationship to current frozen work

This analysis does not change the selected runtime lane.

Current frozen next version remains:

```text
v0.70.1
Cold First-Turn Tail Attribution
```

Do not mix the HunterNet ideas with v0.70.1.

In particular, do not add:

```text
new Community prompt projection
new platform reachability state
new time propagation logic
new retention policy
new provider routing
new auxiliary model call
new UI sidecar system
```

while the cold first-turn tail attribution lane is being isolated.

The current work is reference research only.

---

## 18. Classification ledger

```text
PROMISING
  CHANNEL_REACHABILITY_CONTRACT
  REACTION_PROPAGATION_WINDOW
  AUDIENCE_PROJECTION_ENVELOPE_V2

PROMISING / REINFORCING
  GRADED_AUDIENCE_EXPOSURE
  SOURCE_BOUNDED_CONTEXT_APERTURE
  LEAST_PRIVILEGE_FRONTEND_CAPABILITY
  STRUCTURE_AS_ACCEPTANCE_AUTHORITY

WATCH / PROMISING
  SOURCE_LOCAL_IDENTITY_AFFORDANCE

REINFORCES EXISTING
  COMMUNITY_EPISTEMIC_QUARANTINE
  SOURCE_STYLE_MUST_NOT_REWRITE_WORLD_ONTOLOGY

DEFER
  TARGET_LOCAL_SEMANTIC_TRANSACTION
  PER_PLATFORM_RUNTIME_RETENTION_POLICY
  SOURCE_SPECIFIC_UI_RENDERING

DO NOT TRANSFER
  HISTORICAL_SETCHAT_MUTATION_MODEL
  DYNAMIC_RUNTIME_CODE_LOADING
  LIGHTBOARD_AUXILIARY_MODEL_FRAMEWORK_AS_IS
```

No BLOCKER is established by this reference.

---

## 19. Best next reference

The remaining uploaded reference after the LightBoard artifacts is:

```text
risuai-scripting-skill.zip
```

Unlike the four LightBoard product examples, this is expected to be a scripting/capability reference rather than another end-user module.

That makes it the right next step to answer:

```text
Which LightBoard patterns are product-specific design choices?
Which are actually enabled by general RisuAI scripting primitives?
Which host APIs are safe/unsafe analogues for SimCore?
```

The scripting reference should remain a separate analysis and must not be used to retroactively authorize any LightBoard transfer.

---

## 20. Final verdict

```text
REFERENCE
= LightBoard HunterNet 4.0.0

PRIMARY NEW IDEA
= Channel Reachability Contract

SECONDARY NEW IDEA
= Reaction Propagation Window

SYNTHESIS
= Audience Projection Envelope v2

KEY GENERALIZATION
= source validity depends on medium/topology/time, not only audience knowledge

DIRECT RUNTIME TRANSFER
= NO

V0.70.1 IMPACT
= NONE

NEXT REFERENCE
= risuai-scripting-skill.zip
```
