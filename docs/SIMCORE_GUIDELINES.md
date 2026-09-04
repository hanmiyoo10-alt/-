# SimCore Development & Operations Guidelines

> Canonical development guidance for SimCore
>
> This document is the living source of truth for SimCore development, diagnostics, optimization, regression prevention, versioning, and release work.
> It is intentionally editable. As SimCore architecture and verified runtime behavior evolve, this document must evolve with them.

---

## Repository common-rules inheritance

This project guideline inherits the applicable repository-wide shared policy from `docs/REPOSITORY_COMMON_RULES.md` by reference; do not copy the common-rule body into this document.

Repository `HARD_INVARIANT` rules remain binding and must not be silently weakened. This project may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior when its own contract or evidence requires a more specific rule.

The common-rules layer does not own this project's mutable production, release, runtime, deployment, device, or validation truth; those facts remain owned by the project-specific authority/evidence declared here.

## 0. Document Authority

### Source of Truth

Use the following priority order when working on SimCore:

1. Current production behavior and production code
2. `docs/SIMCORE_GUIDELINES.md`
3. Real long-chat diagnostics from the current version
4. Current version release notes
5. Historical diagnostics and design notes
6. Hypotheses and assumptions

If production code and this document conflict, do not blindly assume either side is correct. Verify current behavior, identify whether the divergence was intentional, and bring code and guidance back into sync.

### Living Document Rule

This is not an immutable specification. Changes fall into four classes:

- **Constitutional** — stable principles that should rarely change
- **Architectural** — may change when runtime structure changes
- **Operational** — expected to change as current priorities and diagnostics change
- **Historical** — records of past decisions and verified behavior; prefer appending or superseding rather than silently rewriting history

Whenever a SimCore update changes architecture, verified assumptions, protected subsystems, diagnostics, cache strategy, or release workflow, review this document in the same update.

---

# Part I — Separation of Responsibilities

## 1. SimCore Role

SimCore is the **state, policy, boundary, validation, and runtime coordination layer**.

Its responsibilities include:

- determining runtime mode (`B_START`, `B_CONTINUE`, `B_END`, `C`)
- managing broadcast lifecycle and end authority
- maintaining Frame, Continuity, Evidence, Lineage, Source Handoff, Recurrence, and related state
- compiling and injecting runtime guidance
- enforcing user-control and exposure boundaries
- protecting Deferred Mirror safety
- maintaining Recovery behavior
- preserving prompt/cache-friendly structure where possible
- observing runtime topology and diagnostics
- validating output/state transitions
- committing state only when allowed by current safety and consistency rules

SimCore should define **what the main model is allowed and expected to do**, not write the final prose on the model's behalf.

## 2. Main Model Role

The main model is the **renderer**.

Its responsibilities include:

- consuming the current SimCore runtime state and constraints
- rendering scenes, dialogue, broadcast footage, community reactions, and natural-language output
- producing `<COMMUNITY>` where required
- producing `<Knowledge>` where required
- following the current mode, lifecycle, authority, evidence, exposure, and character-control boundaries
- preserving requested style and narrative continuity inside those boundaries

The main model must not independently override SimCore state decisions.

Examples:

- If SimCore says `Broadcast end authority: DENIED`, the model must not end the broadcast because the scene merely feels conclusive.
- If a secondary character is inactive for the current input, the model must not carry that character forward from a previous turn.
- If information is not exposed, the model must not let `<COMMUNITY>` know it early.

## 3. Responsibility Boundary

Canonical flow:

```text
User input
   ↓
SimCore
(state / authority / boundaries / runtime guidance)
   ↓
Main model
(actual rendered response)
   ↓
SimCore
(validation / state commit / diagnostics / mirror handling)
```

Core rule:

> SimCore is not the prose author. It is the system that makes sure the prose is generated under the correct conditions.

Avoid moving renderer work into SimCore unless there is a strong, measured reason.

---

# Part II — Core Development Principles

## 4. Stable First

Every update starts from the currently verified production version.

Preferred workflow:

```text
Stable production
    ↓
Real long-chat diagnostic
    ↓
Issue isolation
    ↓
Minimal localized change
    ↓
Regression verification
    ↓
Version bump
    ↓
Production deployment
```

Prefer a small, explainable diff over a broad rewrite.

## 5. One Release, One Primary Goal

A mini update should have one primary purpose.

Good:

```text
0.63.44 — History Mutation Attribution
0.63.45 — History Rebuild Attribution
0.63.46 — Prompt Prefix Stabilization
```

Avoid combining unrelated work such as cache changes, Broadcast changes, Mirror changes, UI changes, storage changes, and Continuity changes in one mini release.

## 6. Evidence Before Repair

Do not repair an uncertain cause.

Preferred sequence:

```text
Observe
→ Attribute
→ Correlate
→ Verify
→ Stabilize
→ Measure
```

If causality is still unclear, create a diagnostic release rather than a behavioral repair release.

## 7. Priority Order

Default priority:

```text
Correctness
→ Safety
→ State stability
→ Prompt stability
→ Cache efficiency
→ Performance
→ Convenience
```

Never trade correctness or safety for a nicer cache metric.

---

# Part III — Prompt and Cache Architecture

## 8. Prompt Cache First

For cache optimization, prioritize stability of the **full request prefix**, not only the SimCore runtime string.

Canonical request ordering:

```text
CHAT_HISTORY
    ↓
CURRENT_USER
    ↓
SIMCORE_RUNTIME
```

A stable runtime prompt does not help much if CHAT_HISTORY changes earlier in the request.

Always ask first:

> Where is the first break?

## 9. Local Prefix Stability Is Not Provider Cache

Keep these concepts separate:

- local prompt-prefix stability
- gateway cache behavior
- provider prompt-cache behavior
- billed cached-token behavior

Without gateway/provider evidence, keep the diagnostic language explicit:

```text
provider cache UNVERIFIED
```

Never claim a cache hit solely because a local prefix is stable.

## 10. Cache Break Ownership

At minimum, classify first break ownership as:

```text
CHAT_HISTORY
CURRENT_USER
SIMCORE_RUNTIME
UNKNOWN
```

If diagnostics show:

```text
PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
```

then do not immediately rewrite runtime compiler logic.

## 11. History Representation Stability

The same historical message should remain representation-stable between requests whenever possible.

Track compact metadata such as:

- index
- role
- kind
- length
- fingerprint
- representation class

Relevant representation classes include:

```text
HOST_RAW
CANONICAL
FRESH_CHAT
```

Identity evidence and causal evidence are different.

## 12. History Mutation Attribution

For a history mutation, inspect in this order:

```text
first-break index
→ role/kind
→ previous fingerprint
→ current fingerprint
→ mutation shape
→ known representation correlation
```

Supported mutation-shape vocabulary may include:

```text
SAME_SLOT_CHANGED
ROLE_OR_KIND_CHANGED
LIKELY_INSERTION
LIKELY_REMOVAL
NONE
```

## 13. Rebuild Before Stabilization

If `MANUAL_EDIT_REBUILT` or another rebuild path appears, do not immediately force canonicalization.

First distinguish possible causes such as:

```text
HOST_RAW_CHANGED
SNAPSHOT_STALE
MESSAGE_COUNT_CHANGED
ROLE_KIND_CHANGED
REPRESENTATION_CHANGED
CONTENT_CHANGED
UNKNOWN
```

Determine whether rebuild is the cause of the prefix mutation, a consequence of it, or merely correlated.

---

# Part IV — Runtime Compiler

## 14. Runtime Placement

Current verified runtime placement:

```text
TAIL_AFTER_CURRENT_USER
```

Do not change this without strong evidence and a dedicated regression plan.

## 15. Compiler Tiers

Preserve the semantic distinction between:

```text
stable
slow
volatile
full
```

For intentional mode/lifecycle changes, this can be normal:

```text
stable    SAME
slow      SAME
volatile  CHANGED
full      CHANGED
```

Do not label every `full CHANGED` event as a cache regression.

---

# Part V — Broadcast Runtime

## 16. Runtime Modes

Canonical modes:

```text
B_START
B_CONTINUE
B_END
C
```

## 17. Broadcast Lifecycle

Expected flow:

```text
B_START      → OPEN
B_CONTINUE   → OPEN
B_END        → ENDING / close
C after end  → CLOSED
```

## 18. Broadcast End Authority

While a broadcast is open:

```text
Broadcast end authority: DENIED · active-broadcast
```

Only an explicit `B_END` may grant:

```text
Broadcast end authority: ALLOWED · explicit-b-end
```

The renderer must not invent a broadcast/episode ending during `B_START` or `B_CONTINUE` merely because the scene feels complete.

## 19. Community Mode

Mode C does not acquire broadcast-end authority on its own.

After a completed broadcast, the normal closed state is:

```text
Broadcast lifecycle: CLOSED
Broadcast end authority: NOT_APPLICABLE
```

---

# Part VI — Character Control

## 20. Protagonist Authority

The protagonist is user-controlled.

The renderer must not independently overwrite core protagonist intent, decisions, or user-established state.

## 21. Secondary Character Activation

A secondary character activates only when the configured activation keyword is literally present in the **current user input**.

```text
keyword present → active for this response
keyword absent  → inactive for this response
```

Activation is turn-local and never carries automatically into the next request.

---

# Part VII — Community and Knowledge

## 22. Knowledge

`<Knowledge>` remains mandatory wherever required by the active Core Ruleset.

## 23. Community Exposure Boundary

`<COMMUNITY>` may reference **EXPOSED information only**.

Do not leak:

- unbroadcast information
- hidden production/state information
- internal reasoning
- future knowledge
- private/unexposed state

Community knowledge must follow what viewers could actually know.

---

# Part VIII — Protected Stability Layers

## 24. Independent Subsystems

Treat these as independent stability layers:

```text
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure
Broadcast Lifecycle
Recovery
Deferred Mirror
Compiler
```

Do not modify unrelated layers just because one subsystem is under investigation.

## 24A. Continuity State Safety vs Visible Output

Treat persisted-state continuity and user-visible chronology as separate guarantees. A diagnostic such as `FLOOR CLAMPED`, `SKIPPED_NON_MONOTONIC`, or `Continuity summary: REPAIRED` may prove that canonical state was protected without proving that already-generated scene timestamps or era-specific character state were repaired in the visible body.

When investigating chronology faults, inspect both:

```text
persisted narrative/frame state
visible scene timestamps + current-era character state
```

Do not claim complete continuity repair from state protection alone. Avoid broad semantic/date rewrites unless a deterministic repair is proven; prefer authoritative pre-generation constraints plus explicit post-generation diagnostics.

## 25. Frame Integrity

Continue validating progression of:

```text
volume
chapter
Chatindex
```

Detect regressions independently from normal advancement.

---

# Part IX — Deferred Mirror

## 26. Mirror Safety Before Cache

Deferred Mirror safety is more important than cache efficiency.

Core rule:

```text
CANONICAL ↔ FRESH_CHAT

EXACT
→ commit may proceed under existing acceptance rules

MISMATCH
→ unsafe write is blocked
```

## 27. Never Weaken Mismatch Protection

Do not weaken strict mismatch protection for:

- cache efficiency
- lower latency
- history normalization
- easier diagnostics

Mismatch remains fail-open / no-unsafe-write under the current acceptance design.

## 28. Representation Correlation Is Not Causality

Example:

```text
FRESH_MISMATCH_HISTORY_MATCH · HIGH
```

This means the current historical fingerprint exactly matches a known prior divergent `FRESH_CHAT` representation under the diagnostic rules.

It does **not** by itself prove that Deferred Mirror caused the history mutation.

Always distinguish representation identity evidence from causal evidence.

---

# Part X — Reload and Persistence

## 29. Runtime Reload Is Normal

Treat reload/new-generation behavior as a supported runtime condition.

Always inspect:

```text
Runtime boot
generation
epoch
```

before joining telemetry across turns.

## 30. Persistent vs Memory-Only State

Typical persistent/recoverable state may include:

```text
Stored broadcast state
Frame state
Core persistent state
```

Memory-only diagnostic state may include:

```text
Provenance ledger
Cache trajectory
Runtime probes
Temporary correlation state
```

A reload may reset memory-only telemetry without losing persistent broadcast/frame state.

---

# Part XI — Diagnostics

## 31. Diagnostics Must Be Observational

Diagnostic code should not materially alter runtime behavior.

Avoid introducing:

```text
second full history scan
large raw-body retention
persistent debug payloads
extra network calls
high-frequency timers
provider-cache mutation
```

## 32. Bounded Telemetry

Prefer bounded metadata:

```text
index
role
kind
length
fingerprint
timestamp
representation
small bounded provenance metadata
```

Do not retain entire conversation or raw model bodies longer than necessary for normal runtime behavior.

## 33. Diagnostic Cost Must Be Measured

Track cost such as:

```text
Cache topology cost
candidate cost
additional scan count
additional storage cost
```

Diagnostics must not become the performance problem they are measuring.

## 33A. Diagnostic Forensics and Cross-Validation

A long SimCore diagnostic is not a status dashboard to skim. Every field exists to expose a different failure mode or attribution boundary. When a full diagnostic is supplied, inspect it as a connected forensic record rather than selecting only the lines that look important.

Never treat labels such as `PASS`, `REPAIRED`, `SAME`, `COMMITTED`, or `Warnings: 0` as sufficient proof by themselves. Their scope must be checked against the actual RAW turn content and against neighboring state.

For each diagnostic, cross-validate at least these layers:

```text
1. User RAW intent / event facts
2. Previous assistant RAW result
3. Request/session/edit state entering the current turn
4. Output provenance / recovery / mirror result
5. Frame / Continuity / Narrative clock state committed by SimCore
6. Current assistant RAW visible result
7. What state the next turn actually inherits, when available
```

The key question is not only:

```text
What does the diagnostic claim?
```

but also:

```text
Does the RAW output actually match that claim?
Did SimCore commit the state implied by the visible event?
Did the next turn inherit the state that the prior visible output established?
```

Cross-check related fields instead of reading them independently. Examples include:

```text
Narrative clock + scenes + tail
↔ visible timestamps and prose-level elapsed time
↔ next-turn timestamp

Frame sequence / Frame guard
↔ RAW Volume / Chapter / Chatindex before and after repair

Broadcast lifecycle / end authority
↔ whether the visible renderer actually starts, continues, or ends the broadcast correctly

Evidence / Lineage / Handoff
↔ whether the current COMMUNITY output actually uses the intended source and only exposed facts

Output provenance / Deferred Mirror
↔ the representation visible to the user
↔ the representation seen on the following request

Edit reconcile
↔ whether the visible prior assistant was genuinely edited or merely changed representation
```

A diagnostic may therefore be internally correct while still exposing a product-level gap. For example, `Narrative clock: SAME` can be correct under a line-level timestamp parser even when the visible prose explicitly advances from 01:00 to 03:00 and the following turn incorrectly reuses 01:00. In that case the correct conclusion is not “Continuity PASS”; it is that the diagnostic has revealed an **intra-turn semantic time advancement coverage gap**.

Likewise, `Continuity summary: REPAIRED` may mean persisted state was protected while the visible body still contains a regression. Always state exactly **what was repaired, what was merely detected, and what remained visible or stale**.

Default review rule:

> **Read every diagnostic section once, then perform cross-field and RAW-to-state consistency checks before declaring a turn healthy.**

Do not optimize for a short review at the cost of missing a contradiction that the diagnostic was specifically built to expose.

---

# Part XII — Performance

## 34. Generation Time Is Not Plugin Time

Keep total generation latency separate from SimCore processing latency.

`request→output gap` includes external/model/gateway waiting.

SimCore-specific performance should be evaluated through measurements such as:

```text
Request timing
Handshake
Edit reconcile
onSend
Output handler
Storage
Mirror
Cache topology
```

Do not blame SimCore for a long model-generation gap without plugin-side evidence.

## 35. Optimize Measured Hotspots

Optimize only observed bottlenecks.

Examples:

```text
TURN_STORAGE
OUT_STORAGE
EDIT_RECONCILE
HANDSHAKE
SESSION_LOAD
```

Avoid speculative optimization of code paths that are not measured as significant.

---

# Part XIII — Release Engineering

## 36. Mini Update Workflow

```text
Production stable
↓
Diagnostic evidence
↓
One narrow target
↓
Minimal patch
↓
Syntax validation
↓
Behavior regression checks
↓
Diff inspection
↓
Version bump
↓
Release deployment
↓
Real long-chat validation
```

## 37. Freeze Declaration

Each release should clearly separate:

```text
Changed
Diagnostics added
Behavior changed
Frozen
Known limitations
Verification
```

## 38. Production Definition

A code edit alone is not a completed update.

Minimum completion should normally include:

```text
node --check
latest.js / install.js consistency
version verification
git diff inspection
release commit
release branch deployment
production source verification
runtime test
```

The exact validation set may grow as the system evolves.

---

# Part XIV — Evidence Language

## 39. Evidence Levels

Use three default confidence classes:

### VERIFIED

Directly measured, exact, or independently confirmed.

### SUPPORTED HYPOTHESIS

Multiple observations support the explanation, but causality is not fully established.

### UNKNOWN

Current telemetry cannot resolve the question.

## 40. No Provider Claims Without Provider Evidence

Do not write claims such as:

```text
cache HIT confirmed
provider reused prompt
gateway cache worked
```

without real gateway/provider evidence.

Use language such as:

```text
local prefix stable
provider cache UNVERIFIED
```

when that is all the evidence supports.

---

# Part XV — Multi-Environment Development

## 41. GitHub Is Durable Shared State

When development happens from multiple GPT/server environments, local containers are not the source of truth.

```text
Environment A
    ↘
     GitHub
    ↗
Environment B
```

Durable work belongs in the repository.

## 42. Environment Tools Are Ephemeral

These may differ or disappear between environments:

```text
gh CLI
installed packages
temporary clones
environment variables
runtime caches
```

Check capabilities at the start of work rather than assuming persistence.

## 43. Branch Safety

Avoid concurrent direct modification of the production release branch from multiple environments.

Prefer:

```text
work branch
→ verification
→ release integration
→ production branch
```

unless a deliberate narrow connector-backed change has a safer direct path.

---

# Part XVI — Current Strategic Direction

> This section is intentionally mutable and should track the current production investigation.

## 44. Current Production Baseline

Current production family at the time this document was created:

<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->
```text
SimCore v0.70.4 — Manual Edit Rebuild Attribution
Release commit: df282f18a0035b03be30af8d0ee2174f58b3bcd3
```
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->

Do not treat this number as permanently current; update this section when production advances.

## 45. Current Operational Source

Release-specific investigation state is intentionally **not duplicated** in this guideline.

Use:

```text
product-manifest.json
→ machine-readable current release identity / current priority

docs/CURRENT_DEVELOPMENT.md
→ VERIFIED / SUPPORTED HYPOTHESIS / UNKNOWN
→ current live validation gate
→ current repair/measurement target
→ next candidate
```

This separation prevents durable development principles from becoming stale when a mini release advances.

## 46. Current Cache Strategy

The durable strategy remains:

```text
PROMPT PREFIX STABILITY
```

Focus first on the earliest request-prefix break and preserve the distinction between local prefix evidence and actual gateway/provider cache evidence.

The exact current diagnostic or repair stage must be read from `docs/CURRENT_DEVELOPMENT.md`, not inferred from an older version-specific section in this file.

## 47. Current Hard Freeze

Unless new evidence directly requires otherwise, keep these areas frozen during the current M2-2 live-validation checkpoint and any parallel cache observation:

```text
Broadcast End Authority
Frame
Continuity
Evidence
Lineage
Source Handoff
Reaction
Recurrence
Structure
Runtime prompt placement
Compiler tier semantics
Deferred Mirror strict mismatch safety
Persistent storage schema
Network policy
Timer policy
```

## 47A. Representation Ownership Boundary

As of M2-2, representation identity/provenance is a first-class memory-only boundary.

```text
Representation owns
- bounded CANONICAL / HOST_RAW / FRESH_CHAT fingerprint provenance
- prior representation taxonomy
- exact current carryover classification
- fingerprint delta / carryover shape metadata

Runtime Mirror owns
- Fresh host observation
- strict location / identity / staleness guards
- mirror transport and write scheduling

Edit Reconcile owns (current implementation location may still be transitional)
- the decision to accept a known representation alias or rebuild state
```

Non-negotiable invariant:

> **Fresh is identity evidence, never a body source.**

Therefore Representation must not retain raw Fresh bodies, mutate chat/history, create persistent Core fields, or add host/network/timer surfaces. Runtime Mirror must not regain bounded provenance/taxonomy ownership merely for convenience. When ownership moves again, diagnostics and Contracts v2 must move with it.

---

# Part XVII — Guideline Update Protocol

## 48. When to Update This Document

During each SimCore update, ask:

```text
Did architecture change?
Did a previous hypothesis become verified or disproved?
Did a frozen subsystem change?
Did a diagnostic become obsolete?
Did the primary optimization target change?
Did release procedure change?
Did SimCore/Main Model responsibility boundaries change?
```

If any answer is yes, update this document alongside the implementation or release work.

## 49. Avoid Full Rewrites

Maintain sections according to their class:

```text
Constitutional → preserve unless a foundational decision changes
Architectural  → update only when architecture changes
Operational    → update freely as current work changes
Historical     → append/supersede rather than silently erase
```

Prefer small documentation diffs that explain why guidance changed.

---

# Part XVIII — Non-Negotiable Rules

> **Do not sacrifice correctness for cache efficiency.**
>
> **Do not weaken safety gates for performance.**
>
> **Do not change production behavior merely to make diagnostics easier.**
>
> **Do not repair a cause that has not been sufficiently isolated.**
>
> **Do not modify already-stable subsystems without evidence.**
>
> **Do not claim provider cache behavior without provider evidence.**
>
> **Do not blur SimCore's state/policy role with the main model's rendering role without an explicit architectural decision.**
>
> **Validate production changes again in a real long-chat environment.**

---

# Guideline Changelog

## 2026-08-21 — v0.64.0 M2-2 Representation Ownership Split

- Advanced the production baseline to `v0.64.0 — M2-2 Representation Ownership Split`.
- Promoted Representation from a planned Contracts v2 boundary to a physical memory-only subsystem.
- Moved bounded CANONICAL/HOST_RAW/FRESH_CHAT provenance ownership and exact carryover classification out of Runtime Mirror while keeping Fresh observation and mirror transport there.
- Preserved the `REPRESENTATION_FAST_RECONCILED` and genuine `USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT` paths as frozen live regression controls.
- Reaffirmed that Fresh is identity evidence, never a raw-body source, and that no persistent schema/host/network/timer surface was added.

## 2026-08-21 — Diagnostic Forensics and Cross-Validation

- Added the rule that full diagnostics must be reviewed as connected forensic records rather than skimmed status summaries.
- Required RAW input/output, committed state, diagnostic labels, and next-turn inheritance to be cross-validated before declaring a turn healthy.
- Explicitly documented that `PASS`, `REPAIRED`, `SAME`, `COMMITTED`, and `Warnings: 0` have bounded scopes and can coexist with user-visible or state-inheritance gaps.
- Added intra-turn narrative-time advancement as a concrete example: visible prose can advance time while a line-level clock remains stale.
- Advanced the guideline's current production baseline to v0.63.57.

## 2026-08-19 — v0.63.45 History Rebuild Frontier Attribution

- Advanced the production baseline from v0.63.44 to v0.63.45.
- Made bounded PRE_RECONCILE / POST_RECONCILE / FINAL request-representation attribution the current cache investigation.
- Added the four-turn `B_START → B_CONTINUE → B_END → C` live validation gate.
- Kept Prompt Prefix Stability as the primary optimization goal and retained provider-cache status as `UNVERIFIED`.
- Preserved Broadcast, compiler tier semantics, Continuity/Evidence, Deferred Mirror strict mismatch safety, persistent storage schema, network policy, and timer policy under the current hard freeze.

## 2026-08-19 — Initial Consolidated Guideline

- Created the canonical SimCore development and operations guideline.
- Formalized SimCore vs Main Model separation of responsibilities.
- Established prompt-prefix stability as the current primary optimization target.
- Formalized local-prefix vs gateway/provider-cache evidence separation.
- Preserved strict Deferred Mirror mismatch protection as non-negotiable.
- Formalized `VERIFIED`, `SUPPORTED HYPOTHESIS`, and `UNKNOWN` evidence language.
- Added multi-environment GitHub workflow guidance.
- Marked the document as a living source of truth that should evolve with future releases.
