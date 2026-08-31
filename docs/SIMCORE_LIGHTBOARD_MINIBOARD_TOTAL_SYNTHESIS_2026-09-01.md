# SimCore LightBoard / MiniBoard Total Synthesis — 2026-09-01

Date: 2026-09-01 KST

Status: **REFERENCE SYNTHESIS · 16 ANALYZED ARTIFACTS · 16 EXACT SOURCE ARCHIVES · RESEARCH BACKLOG · NO IMPLEMENTATION AUTHORITY**

## 1. Purpose

This document is the current total synthesis for the LightBoard / MiniBoard family after the original nine-source catalog, SNS Forme 0.3.1, and the completed post-SNS six-artifact intake.

It preserves the older nine-source catalog as a historical snapshot rather than rewriting its original scope.

This document is not a runtime RFC, feature authorization, dependency approval, or release plan. It does not modify `release-simcore`, `plugins/simcore/latest.js`, `plugins/simcore/install.js`, persistent runtime schema, the active S7 release lane, or frozen M2 architecture boundaries.

## 2. Current source set

Sixteen LightBoard / MiniBoard-family artifacts have now been individually analyzed.

| # | Artifact | Main contribution |
| --- | --- | --- |
| 1 | LightBoard Comments 4.0.0 | Audience Knowledge Boundary, bounded context aperture, structured sidecar |
| 2 | LightBoard Core 4.1.1 | owner-scoped context projection, effect/capability ownership |
| 3 | LightBoard MiniBoard 4.1.1 | graded exposure, source-local semantic sidecar |
| 4 | LightBoard HunterNet 4.0.0 | channel reachability, propagation delay, source identity |
| 5 | LightBoard News 4.0.0 | publication maturity, field projection, assertion provenance |
| 6 | LightBoard KakaoTalk V1.3 / 3.0.0 Popover | failure quarantine, shared parse ABI, progressive disclosure |
| 7 | MiniBoard Renderer · MomoTalk 1.0.0 | intent-only renderer, ephemeral UI state, render isolation |
| 8 | LightBoard Status Window 4.0.0 | derived checkpoint + recent delta, projection non-authority |
| 9 | LightBoard Annotations 4.0.0 | source anchoring, reroll-aware lineage truncation, context re-entry firewall |
| 10 | SNS Forme 0.3.1 | orthogonal projection axes, source-specific representation, media materialization boundary, optional enrichment degradation |
| 11 | LightBoard Interview 2.0 | contextual persona projection, question-source separation, sidecar re-entry control |
| 12 | LightBoard Alter Store 1.03.1 | transaction-event vs state-projection separation, canonical ledger ownership |
| 13 | LightBoard Live Chat | semantic payload / renderer separation, audience-knowledge anti-pattern evidence |
| 14 | LightBoard Namuwiki 1.8.0 | public-knowledge projection, navigation as projection replacement |
| 15 | Light Status Window 2.0.0 | schema-first derived scene snapshot, conservative continuity, private-state provenance gate |
| 16 | Light Status Window 2.1.0 | vertical feature-gate closure, policy-aware validation, contract-closed optional field |

Separate supporting references also exist for the upstream LightBoard agent skill and the RisuAI scripting skill. They are not counted as LightBoard/MiniBoard product artifacts in the sixteen-source set.

## 3. Archive state

Exact source archives are confirmed for all sixteen analyzed LightBoard / MiniBoard product artifacts.

The archive authorities are split across the original intake directories plus the dedicated SNS Forme closure archive:

```text
references/simcore-plugin-idea-drop-2026-08-30/
references/simcore-plugin-idea-drop-2026-08-31/
references/simcore-plugin-idea-drop-2026-09-01/
references/simcore-lightboard-sns-forme-0.3.1-archive-2026-09-01/
```

SNS Forme 0.3.1 was re-supplied on 2026-09-01 and matched the previously analyzed identity exactly:

```text
original bytes  = 114438
original SHA-256 = b65acf7529c70de1145eef76e191cc6dffa061a33c71764084e38fe6dbfac0cb
```

Its dedicated archive stores a deterministic gzip/base64 transport in nine independently verified text parts. Each linked part's Git blob SHA matches the locally computed identity, and the verified local round trip reconstructs the exact original source.

The earlier archive gap is therefore closed:

```text
CLOSED · SNS_SOURCE_ARCHIVE_GAP
16_EXACT_SOURCE_ARCHIVES_CONFIRMED
```

A rejected monolithic/binary transport attempt produced mismatched blob identities during intake. Those orphan blobs were never linked into the authoritative archive tree. The final bounded text-part representation is authoritative.

Classification:

```text
FIX · SNS_BINARY_BLOB_TRANSPORT_MISMATCH
CLOSED · NO RESIDUAL ARCHIVE GAP
NOT A SIMCORE RUNTIME DEFECT
```

## 4. Architecture convergence

Across the sixteen artifacts, the family converges on the following safe architecture shape:

```text
AUTHORITATIVE SOURCE / CANONICAL OWNER
        ↓
EXPOSURE / SOURCE / OWNER PROJECTION
        ↓
BOUNDED CONTEXT APERTURE
        ↓
STRUCTURED DERIVED SEMANTICS
        ↓
VALIDATION + PROVENANCE / SOURCE ANCHOR
        ↓
OPTIONAL DERIVED CHECKPOINT
        ↓
PRESENTATION ADAPTER
        ↓
INTENT-ONLY USER INTERACTION
        ↓
OPTIONAL MATERIALIZATION SIDE EFFECT
        ↓
EXPLICIT CONTEXT RE-ENTRY POLICY
```

The central lesson is not “add more UI.”

The central lesson is:

```text
source authority
!= derived semantics
!= persistence
!= presentation
!= interaction
!= expensive side effects
!= future model context
```

The safer designs are the ones that keep those contracts distinct.

## 5. Highest-value SimCore research principles

### P1-A · Owner-Scoped Context Projection

```text
full available history
→ current semantic owner
→ minimum owner-relevant projection
```

This has the strongest direct connection to long-chat pressure. It can reduce completed-task replay and unrelated sidecar burden without deleting canonical continuity.

### P1-B · Audience / Public Knowledge Boundary

```text
WORLD FACT
!=
FACT THIS AUDIENCE / PUBLICATION / CHANNEL MAY KNOW
```

Comments, HunterNet, News, Live Chat, and Namuwiki collectively show why continuity authority must not imply audience omniscience.

A future Community projection should derive reaction-eligible facts from exposure/source evidence.

### P1-C · Source-Anchored Derived Metadata + Lineage

Derived assertions should retain:

```text
source identity
source span / locator
lineage identity
semantic owner
```

Reroll/edit/source replacement must truncate or invalidate derived descendants that no longer have a valid source anchor.

### P1-D · Context Re-entry Firewall

Derived display data needs an explicit rule for whether, when, and how it can re-enter future model context.

Default-safe interpretation:

```text
derived display artifact
→ excluded from ordinary future context
unless an explicit owner-bounded re-entry contract exists
```

### P1-E · Private-State Provenance / Visibility Gate

Visible action and private mental state are different authority classes.

```text
private-state assertion
→ provenance / owner check
→ visibility policy
→ optional projection
```

Generated or inferred thoughts must never silently become canonical character truth.

### P1-F · Schema-First Derived Snapshot + Validation

The status-window pair demonstrates a strong sequence:

```text
bounded semantic schema
→ machine validation
→ escaped renderer materialization
```

The validator, not prompt prose, should be authoritative for exact schema policy.

### P1-G · Presentation Failure Quarantine

Renderer failure should not destroy semantic/source data.

```text
invalid presentation state
→ bounded failure / fallback
→ preserve upstream semantic object
```

### P1-H · Intent-Only Renderer Boundary

A renderer should display state and emit narrow intents. It should not own semantic mutation or canonical state transitions.

### P1-I · Orthogonal Projection Axes

Execution timing, source/channel, subject, context participation, persistence, presentation, and expensive materialization are separate policy questions. Do not collapse them into one generic mode.

### P1-J · Vertical Feature-Gate Closure

The 2.0.0 → 2.1.0 status-window diff gives a particularly clean implementation lesson:

```text
feature OFF
→ do not generate field
→ validator rejects accidental field
→ renderer hides field

feature ON
→ generator owns field
→ validator requires field
→ renderer may display field
```

A feature gate is strongest when generation, validation, and presentation agree end to end.

## 6. Important P2 design assets

These are valuable but should not be promoted before a concrete SimCore need exists:

- Derived Checkpoint + Recent Delta
- Semantic Payload / Renderer Decoupling
- Shared Parse ABI
- Progressive Disclosure / Lazy Optional Enrichment
- Ephemeral UI State Plane
- Per-Render Instance Isolation
- Source Projection Envelope
- Source-Specific Representation Policy
- Media Materialization Boundary
- Optional Enrichment Degradation
- Targeted Derived Asset Reroll
- Source-Local Identity Affordance
- Bounded Render Horizon
- Presentation Localization Without Schema Mutation
- Deterministic presentation-only identity/color derivation
- Navigation as Projection Replacement
- Transaction Event vs State Projection separation

## 7. Strong direct-transfer rejects

The family also supplies useful negative examples. Do not transfer these patterns into SimCore without a separate security/architecture justification:

```text
broad lowLevelAccess by default
historical chat rewrite as ordinary state management
raw generated text concatenated into HTML
prompt text encoded directly inside button/action strings
unversioned dynamically loaded executable prelude/helper code
LLM-maintained duplicate canonical ledgers
inferred private thoughts promoted to world truth
off-record persona answers promoted to canonical character truth
channel/public projection promoted back into canonical world truth
delimiter-heavy text protocol used as canonical semantic state
global DOM/style mutation
unbounded “emit everything” enumeration
network/media materialization coupled to semantic validity
presentation strings used as canonical identity
textual order used as the only lineage/precedence mechanism
```

## 8. Repeating WATCH classes

The individual analyses repeatedly exposed the same categories of upstream drift:

```text
retention-window drift
validator vs prompt-schema drift
optional renderer vs required-validator drift
duplicated serialized contract authority
broad permission scope
namespace/config wiring drift
version-label drift
presentation label vs semantic meaning drift
asset metadata vs actual encoding drift
identity lifecycle without persistent authority
partial epistemic-boundary coverage
```

These are not SimCore defects. They are evidence for stronger ownership and machine-checked contracts if a concept is ever promoted.

## 9. Upstream agent-skill lessons

The separately investigated upstream LightBoard agent skill reinforces developer practices rather than runtime features:

```text
Axiom of Doubt / contract-first reading
Progressive-disclosure reference routing
Explicit phase/effect documentation
Namespace isolation
Least-power capability choice
Contract-shaped deliverables
Semantic/presentation separation
Fail-closed presentation behavior
```

Classification remains:

```text
PROMISING · DEVELOPER_PRACTICE_REFERENCE
NO_RUNTIME_DEPENDENCY
NO_GENERIC_RUNTIME_SUBSYSTEM
NO_IMPLEMENTATION_AUTHORITY
```

## 10. What the research does NOT authorize

The sixteen-source convergence does not justify:

- a generic “LightBoard subsystem” inside SimCore,
- importing third-party runtime implementation,
- adding auxiliary-model traffic just because upstream uses it,
- moving UI/presentation concerns into canonical session ownership,
- expanding persistent schema without a source-proven product need,
- starting media/image features before core provenance/context problems are solved,
- changing the S7/release transaction.

## 11. Recommended promotion order

If this research is promoted into real SimCore design work, the safest order is:

```text
1. Owner-Scoped Context Projection
2. Audience / Public Knowledge Boundary
3. Source-Anchored Derived Metadata + Reroll-Aware Lineage
4. Context Re-entry Firewall
5. Private-State Provenance / Visibility Gate
6. Schema-First Derived Snapshot + Validation
```

The first two are the strongest candidates because they address existing long-chat / Community correctness problems without requiring a new generic runtime subsystem.

Presentation and media ideas should remain downstream until those semantic boundaries are stable.

## 12. Current project position

The LightBoard / MiniBoard research line is now:

```text
original source preservation
→ individual artifact analysis
→ nine-source initial catalog
→ upstream LightBoard skill investigation
→ cross-domain developer-practice extraction
→ SNS Forme analysis
→ six-artifact post-SNS intake and analysis
→ post-SNS batch closure
→ sixteen-source total synthesis
→ SNS Forme exact-source archive gap closure   ← CURRENT
```

Current classification:

```text
16_ARTIFACTS_ANALYZED
16_EXACT_SOURCE_ARCHIVES_CONFIRMED
SNS_SOURCE_ARCHIVE_GAP_CLOSED
TOTAL_SYNTHESIS_COMPLETE
RESEARCH_BACKLOG_ONLY
PRODUCTION_UNCHANGED
S7_UNCHANGED
```

The next legitimate step is not implementation by default. It is a separate promotion/design transaction for one or two P1 ideas with a concrete SimCore problem statement, owner/effect boundaries, lineage behavior, schema impact, and validation plan.
