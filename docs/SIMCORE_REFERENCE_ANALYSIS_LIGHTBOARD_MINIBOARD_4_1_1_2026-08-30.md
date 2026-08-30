# SimCore Reference Analysis - LightBoard Miniboard 4.1.1

Date: 2026-08-30 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🔦라이트보드 ♦️미니보드 4.1.1
```

Archived source authority:

```text
references/simcore-plugin-idea-drop-2026-08-30/
```

Archived artifact SHA-256:

```text
dc3eb38d9b4195ccaaf079bb761aa4f5c35b489f761ac7ad1f6e034170341236
```

Related analyses:

```text
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_COMMENTS_4_0_0_2026-08-30.md
docs/SIMCORE_REFERENCE_ANALYSIS_LIGHTBOARD_CORE_4_1_1_2026-08-30.md
```

This document analyzes the archived reference as an idea source. It does not authorize copying third-party implementation and does not alter SimCore runtime behavior, `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, the architecture contract, or the frozen v0.70.1 design.

A public source-correlated implementation was also inspected at:

```text
repo: enzi221/risumo
commit: a3f2cc1531e1c0d116ce73a0bb25c7631a9ccb8f
path: lb-mini/*
```

The public source identifies the frontend as version 4.1.1 and is useful for architecture correlation. The archived user-supplied artifact remains the local reference authority.

---

## 1. Executive finding

Miniboard is the clearest demonstration so far that the LightBoard backend really is a frontend framework rather than a collection of independent monolithic plugins.

The Miniboard frontend is comparatively narrow. It declares its semantic needs, provides a structured board schema, validates and normalizes that schema, renders it, and adds a small set of board-specific interactions. The backend continues to own request orchestration, model routing, bounded context construction, validation retry, LBDATA placement, reroll routing, and generic interaction handling.

The most valuable SimCore-relevant ideas extracted from Miniboard are:

1. **Audience Projection Envelope**
2. **Epistemic Sidecar Quarantine**
3. **Semantic Payload / Renderer Decoupling**
4. **Least-Privilege Frontend Capability**
5. **Bounded Display/Context Aperture**

The first item is a synthesis of the previous Comments/Core analyses rather than a direct copy of one Miniboard mechanism.

The strongest new Miniboard contribution is that audience visibility is not treated as binary. It has explicit graded exposure policy and separately treats generated board content as potentially false, rumor-like, or socially distorted.

---

## 2. Frontend anatomy

Version-correlated Miniboard declares:

```text
name           = 🔦라이트보드 ♦️미니보드 4.1.1
namespace      = lb-mini
version        = 4.1.1
lowLevelAccess = false
```

It contains approximately these frontend responsibilities:

```text
manifest
board-generation instructions
structured TOON data format
interaction instructions
validation callback
output-normalization callback
renderer
board-specific delete button handler
presentation CSS / regexes
user toggles
```

It does not independently own the LightBoard backend lifecycle.

Its manifest is small:

```text
identifier = lb-mini
authorsNote = false
charDesc = true
loreBooks = true
personaDesc = true
rerollBehavior = remove-prev
```

This is an important contrast with the backend's `lowLevelAccess=true` declaration.

The frontend itself remains low-privilege while delegating generic privileged orchestration to the shared backend.

---

## 3. Stable semantic payload

Miniboard's model-facing payload uses one stable wrapper and one structured board schema:

```text
<lb-mini name="...">
  posts
    author
    title
    time
    upvotes
    downvotes
    content
    comments
      author
      time
      content
</lb-mini>
```

The concrete encoding is TOON-like structured text.

The validator performs two conceptually narrow checks:

```text
1. an <lb-mini> node exists
2. its content decodes as the expected structured format
```

The output callback then discards surrounding model chatter and retains only the last Miniboard node.

This creates a useful ownership chain:

```text
model semantic generation
      ↓
structure validator
      ↓
canonical Miniboard node
      ↓
renderer
```

The renderer is not the semantic source of truth.

### Classification

```text
REINFORCES EXISTING · STRUCTURE_AS_ACCEPTANCE_AUTHORITY
```

SimCore already has a judge-only Structure owner and strong representation contracts. Miniboard reinforces that generated semantic data and presentation should not be conflated.

---

## 4. Semantic Payload / Renderer Decoupling

### 4.1 Mechanism

The Miniboard trigger parses the stable `<lb-mini>` payload and passes a normalized render data object to a renderer.

The default renderer is a separate lorebook module.

A user may enable a custom renderer. If loading the custom renderer fails, the frontend falls back to the default renderer.

The renderer receives conceptually:

```text
board attributes
structured post/comment data
chat index
light/dark mode
accent/theme information
```

and returns display HTML.

Changing presentation therefore need not change the model data format.

### 4.2 SimCore relevance

The transferable principle is:

> Semantic identity should remain stable even if presentation changes.

This fits existing SimCore Representation ownership better than it suggests a new runtime subsystem.

Potential future uses could include diagnostics or optional UI surfaces where the same semantic receipt is rendered differently without changing its acceptance/provenance identity.

### Classification

```text
PROMISING / REINFORCING · SEMANTIC_PAYLOAD_RENDERER_DECOUPLING
```

No dynamic renderer system is authorized.

The useful idea is the separation boundary, not dynamic execution of third-party renderer code.

---

## 5. Audience Projection Envelope

The three LightBoard references analyzed so far expose four distinct questions that are easy to collapse into one vague "Community context" concept.

They should remain separate:

```text
1. Knowledge boundary
   What information is the audience capable of knowing?

2. Exposure level
   Even if an event exists, how publicly observable / discussion-worthy is it?

3. Epistemic status
   Is generated audience content fact, rumor, joke, speculation, distortion, or noise?

4. Context aperture
   How much old audience data should remain visible to the model on later turns?
```

Together these form a useful future research abstraction:

```text
Audience Projection Envelope
```

Conceptually:

```text
world / narrative facts
      ↓ knowledge boundary
publicly exposable facts
      ↓ exposure policy
facts appropriate for this audience/source
      ↓ reaction generation
rumor / reaction / social interpretation
      ↓ epistemic quarantine
non-canonical audience sidecar
      ↓ context aperture
bounded future-context contribution
```

This is more precise than treating Community output as ordinary world state.

### Classification

```text
PROMISING · AUDIENCE_PROJECTION_ENVELOPE
```

This is a research abstraction only. It is not a v0.70.1 implementation candidate.

---

## 6. Graded exposure policy

### 6.1 Miniboard pattern

Miniboard exposes a privacy/exposure selector with multiple levels ranging conceptually from protagonist-centered public attention through increasingly strict protection to complete protagonist exclusion.

Its generation instructions distinguish situations such as:

```text
public action with witnesses
private / remote action without witnesses
public aftermath of a private event
famous / notorious figure status
mundane sighting of an unimportant person
major world-impacting event
mild rumor versus detailed insider knowledge
complete protagonist-topic exclusion
```

The important architectural idea is not the exact five-level UI.

The important idea is:

```text
EXISTS IN WORLD
!=
PUBLICLY OBSERVABLE
!=
DISCUSSION-WORTHY
!=
KNOWN IN DETAIL
```

### 6.2 SimCore adaptation

A future SimCore Community projection should probably not copy a manual five-position privacy toggle.

A more native adaptation would derive bounded audience exposure from existing evidence such as:

```text
current source authority
source handoff
camera/publication exposure
witnessability
location/public-vs-private evidence
character fame/importance only when established
narrative aftermath evidence
current Community platform family
```

Potential abstract result:

```text
HIDDEN
AFTERMATH_ONLY
RUMOR_LEVEL
PUBLIC_COARSE
PUBLIC_DIRECT
```

These exact names are illustrative only.

The key is that any future level must be evidence-derived and source-bounded, not invented merely to add configuration.

### Classification

```text
PROMISING · GRADED_AUDIENCE_EXPOSURE
WATCH · DO_NOT_COPY_MANUAL_PRIVACY_POLICY_DIRECTLY
```

---

## 7. Epistemic Sidecar Quarantine

### 7.1 Miniboard rule

When Miniboard data is allowed into the main-model context, an accompanying instruction explains that board content can include social noise such as rumors, jokes, memes, trolling, and false claims.

The main narrative should not automatically steer itself toward those claims merely because they appeared in the board.

That means the system distinguishes:

```text
board says X
```

from:

```text
X is canonically true
```

### 7.2 SimCore relevance

This directly reinforces existing SimCore Community quarantine philosophy.

A Community reaction is evidence of what a simulated audience said or believed, not automatic evidence that the underlying proposition is true.

Future prompt/reaction architecture should preserve a rule equivalent to:

```text
COMMUNITY_ASSERTION
!=
WORLD_FACT
```

unless an independent authoritative source establishes the fact.

This also pairs with Current Task Primacy. Old audience speculation should not become a hidden task frame or future-world-state instruction merely because it remained in history.

### Classification

```text
REINFORCES EXISTING · COMMUNITY_EPISTEMIC_QUARANTINE
```

No new runtime authority is created by this reference.

---

## 8. Bounded Context Aperture

Miniboard makes display persistence and model-context persistence separate choices.

Its process filter can retain only recent Miniboard blocks in model context, and a user toggle can remove Miniboard payloads from the main-model context entirely.

The current reference keeps Miniboard data only near the recent tail when inclusion is enabled.

Separately, display rendering is skipped for sufficiently old chat positions to reduce rendering cost.

This yields three independent lifetimes:

```text
semantic data lifetime in stored chat
model-context lifetime
active renderer lifetime
```

These are not automatically the same.

### SimCore relevance

This strongly reinforces the earlier Comments finding:

```text
VISIBLE HISTORY
!=
FUTURE PROMPT CONTRIBUTION
```

A future SimCore design could potentially keep older Community responses visible to the user while giving them little or no direct weight in later semantic decisions, relying instead on bounded continuity facts owned elsewhere.

### Classification

```text
PROMISING · BOUNDED_CONTEXT_APERTURE
DEFER · UI_RENDER_DISTANCE_OPTIMIZATION
```

The latter is a LightBoard UI concern and is not presently a SimCore runtime target.

---

## 9. Least-Privilege Frontend Capability

The backend requires low-level access, while Miniboard itself declares low-level access disabled.

The frontend still performs rich behavior because generic privileged operations are centralized in the framework and the frontend mostly supplies declarative semantics plus narrow UI behavior.

This reinforces the Effect-Class Contract extracted from the core analysis.

A future static SimCore architecture metadata scheme could profit from distinguishing:

```text
semantic ownership
host observation privilege
host write privilege
persistent write privilege
history mutation privilege
```

rather than allowing an owner to inherit broad capabilities just because it participates in a complex feature.

### Classification

```text
PROMISING / REINFORCING · LEAST_PRIVILEGE_OWNER_CAPABILITY
```

Best first form, if ever promoted:

```text
static architecture metadata + CI enforcement
```

not a dynamic runtime permission engine.

---

## 10. Preset as semantic lens

Miniboard reuses one board schema for multiple semantic lenses, including:

```text
generic community
world-setting-compatible board
single-character inner diary
character emotions as posters
user/other-subject inner diary variants
```

The underlying post/comment schema remains largely stable while the generation lens changes.

This shows an attractive property:

```text
same representation
+ different semantic lens
= reusable UI / interaction machinery
```

However, direct SimCore adoption would be dangerous if it encouraged unrelated modes to share a representation merely for convenience.

SimCore ownership boundaries should remain semantic-first.

### Classification

```text
WATCH · SEMANTIC_LENS_REUSE
```

Adopt only where two modes truly share authority and invariants, not because they can be rendered with the same template.

---

## 11. Target-local interaction preservation

Miniboard interactions include operations equivalent to:

```text
add comment to one post
add new post
change board
reroll board
```

The interaction instruction explicitly says that untargeted data is out of scope and should remain unchanged, apart from bounded culling where the board becomes too large.

This is a useful transaction principle:

```text
TARGET ONE SEMANTIC REGION
PRESERVE UNRELATED REGIONS
```

The concept aligns with SimCore's preference for bounded ownership and differential repair.

### Classification

```text
DEFER / PROMISING · TARGET_LOCAL_SEMANTIC_TRANSACTION
```

It would require a first-class structured sidecar owner before it becomes relevant to SimCore runtime.

---

## 12. Stable community identities

Miniboard explicitly asks new nicknames to look like identities that existed before the current event, rather than labels invented from the current post topic. It also encourages reuse of established nicknames and voice consistency.

This matches the earlier Comments finding.

The useful principle is:

```text
IDENTITY FIRST
REACTION SECOND
```

instead of:

```text
REACTION SUMMARY -> FAKE USERNAME
```

### Classification

```text
WATCH · STABLE_COMMUNITY_IDENTITY
```

Potential benefit:

```text
more convincing recurring community texture
```

Risk:

```text
extra long-chat identity/state surface without proven product value
```

No persistent identity subsystem is authorized.

---

## 13. Direct history mutation remains non-transferable

Miniboard implements manual deletion of a displayed post/comment by:

```text
read historical chat
parse <lb-mini>
remove targeted structured item
re-encode board
setChat historical chat with modified data
```

For LightBoard this is a practical UI interaction.

For SimCore this is a poor fit with frozen lineage / representation / edit-reconcile contracts.

It could confuse:

```text
manual edit detection
Fresh identity comparison
canonical representation
reroll lineage
turn binding
stale probe interpretation
history provenance
```

### Classification

```text
DO NOT TRANSFER · HISTORICAL_CHAT_MUTATION_FOR_UI_STATE
```

Any future SimCore sidecar interaction must have its own explicit authority/provenance model rather than silently rewriting assistant history.

---

## 14. Dynamic renderer execution remains non-transferable

Miniboard can load renderer code from lorebooks at runtime.

This is appropriate for an extensible LightBoard ecosystem.

It conflicts with SimCore's preference for a statically inspectable module graph and CI-enforced architecture authority.

### Classification

```text
DO NOT TRANSFER · DYNAMIC_RUNTIME_RENDERER_LOADING
```

The renderer-separation concept is useful. Dynamic code loading is not.

---

## 15. Relationship to previous reference findings

### Comments 4.0.0

```text
Audience Knowledge Boundary       PROMISING
Display / Model Context Separation PROMISING
Structured Sidecar Contract       DEFER
Targeted Interaction Transaction  DEFER
Stable Community Identity         WATCH
```

### Core 4.1.1

```text
Owner-Scoped Context Projection   PROMISING
Effect-Class Contract             PROMISING
Declarative Capability Manifest   WATCH / PROMISING
```

### Miniboard 4.1.1 adds

```text
Graded Audience Exposure          PROMISING
Epistemic Sidecar Quarantine      REINFORCES EXISTING
Semantic Payload/Renderer Split   PROMISING / REINFORCING
Least-Privilege Capability        PROMISING / REINFORCING
Bounded Context Aperture           PROMISING
```

### Emerging synthesis

```text
Owner-Scoped Context Projection
        +
Audience Knowledge Boundary
        +
Graded Audience Exposure
        +
Epistemic Sidecar Quarantine
        +
Bounded Context Aperture
        =
Audience Projection Envelope
```

This synthesis is the strongest cross-reference research idea after three LightBoard artifacts.

---

## 16. SimCore adoption map

```text
PROMISING
  AUDIENCE_PROJECTION_ENVELOPE
  GRADED_AUDIENCE_EXPOSURE
  BOUNDED_CONTEXT_APERTURE
  SEMANTIC_PAYLOAD_RENDERER_DECOUPLING
  LEAST_PRIVILEGE_OWNER_CAPABILITY

REINFORCES EXISTING
  COMMUNITY_EPISTEMIC_QUARANTINE
  STRUCTURE_AS_ACCEPTANCE_AUTHORITY

WATCH
  SEMANTIC_LENS_REUSE
  STABLE_COMMUNITY_IDENTITY
  MANUAL_PRIVACY_POLICY_AS_CONFIGURATION

DEFER
  TARGET_LOCAL_SEMANTIC_TRANSACTION
  UI_RENDER_DISTANCE_OPTIMIZATION
  CUSTOM_RENDERER_PRODUCT_SURFACE

DO NOT TRANSFER
  HISTORICAL_CHAT_MUTATION_FOR_UI_STATE
  DYNAMIC_RUNTIME_RENDERER_LOADING
```

---

## 17. Relationship to v0.70.1

None of the ideas in this document alter the frozen next-version design.

v0.70.1 remains:

```text
Cold First-Turn Tail Attribution
```

This reference analysis must not add:

```text
auxiliary LLM requests
parallel semantic jobs
new Community behavior
new prompt projections
new renderer system
new host/history mutation
new architecture metadata
```

to that performance-attribution release.

If any idea here is promoted later, it requires a separate source-proven design and separate release scope.

---

## 18. Next reference target

The next most useful artifact is:

```text
라이트보드 헌터넷 4.0.0
```

Reason:

- Comments and Miniboard have now shown two different community/data frontends on the same backend;
- Hunternet can reveal whether the same framework remains clean when the simulated surface becomes more specialized and domain-heavy;
- comparison can test whether Audience Projection Envelope is genuinely general or merely a board/community artifact;
- any specialized cross-world/search/feed semantics may expose new context/evidence boundaries relevant to SimCore.

---

## 19. Final verdict

Miniboard confirms that the most transferable LightBoard ideas are not its visual board widgets.

The strongest cross-system lesson is:

> A simulated audience should receive a deliberately projected view of the world, generate non-canonical social interpretation inside that view, and contribute only a bounded amount of that interpretation back into future model context.

For SimCore, the likely future research stack is therefore:

```text
CURRENT SOURCE AUTHORITY
        ↓
OWNER-SCOPED CONTEXT PROJECTION
        ↓
AUDIENCE KNOWLEDGE BOUNDARY
        ↓
GRADED EXPOSURE
        ↓
COMMUNITY / AUDIENCE REACTION
        ↓
EPISTEMIC QUARANTINE
        ↓
BOUNDED CONTEXT APERTURE
```

This is a reference-derived research direction only.

No implementation, release, schema, runtime, deployment, or architecture mutation is authorized by this document.
