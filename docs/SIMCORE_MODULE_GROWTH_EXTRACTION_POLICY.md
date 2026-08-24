# SimCore Module Growth & Extraction Policy

Date: 2026-08-24
Status: **ACTIVE ARCHITECTURE PRINCIPLE · DESIGN ONLY · NON-RUNTIME**
Scope: SimCore internal module growth, extraction, and future modularization decisions

## 1. Decision

A SimCore module may be split or promoted into an independent internal module when continued growth creates a real ownership boundary.

The trigger is **not file size alone**.

The preferred rule is:

> Split when responsibilities, change reasons, dependency boundaries, or validation needs become independently meaningful.

A large but cohesive module may remain one module. A smaller module with two unrelated ownership domains may deserve extraction earlier.

## 2. Why this matches current SimCore architecture

SimCore already uses staged ownership extraction rather than whole-system rewrites.

Existing examples include:

```text
recovery
→ output-compat
→ bootstrap-migration

outer/runtime-mirror representation responsibility
→ representation

outer shell + CoreRulesetSession edit decision tree
→ edit-reconcile (planned)
```

These are ownership splits, not style-driven file splitting.

The same principle should govern future growth.

## 3. Extraction signals

Treat the following as signals that a module should be reviewed for extraction.

### Strong signals

```text
1. Multiple independent reasons to change
2. Two or more distinct ownership domains in one module
3. A responsibility needs a different dependency boundary
4. A responsibility can be tested as a deterministic unit
5. One section is reused by multiple callers while the rest is not
6. Changes repeatedly touch only one isolated region of the module
7. A hot path and cold/migration path are coupled only by physical location
8. Failure evidence repeatedly points to one responsibility hidden inside a larger module
9. The module has become an orchestration/god layer rather than a bounded owner
10. Architecture contract exceptions are growing because the module owns too much
```

### Weak signals only

```text
line count
character count
number of helper functions
visual ugliness
personal preference for smaller files
```

Weak signals may trigger review but must not by themselves authorize a split.

## 4. Extraction decision test

Before creating a new module, answer:

```text
A. Can the new module's ownership be stated in one short sentence?
B. Can its non-goals be stated clearly?
C. Does it have a smaller/cleaner allowed dependency set?
D. Can callers consume it through a bounded interface?
E. Can existing behavior be preserved mechanically?
F. Can regression evidence prove equivalence?
G. Does the split reduce ownership ambiguity instead of merely moving code?
```

If most answers are no, do not split yet.

## 5. Preferred extraction method

For current SimCore installable architecture, "independent module" normally means a separate internal `SimCore.define(...)` ownership unit first, while production still ships through the canonical installable artifacts.

Do not automatically turn every extracted responsibility into a separate package, repository, plugin, or deployment artifact.

Physical source-file modularization may be considered separately when Release System / source modularization work explicitly authorizes it.

## 6. Mechanical-first rule

A module extraction should normally be behavior-preserving first.

Preferred sequence:

```text
record ownership/design/evidence
→ dedicated work branch
→ mechanically extract responsibility
→ update Contracts/architecture guard
→ static + CI equivalence validation
→ production release through the active release authority
→ real long-chat validation
→ main evidence/state synchronization
```

Do not combine a responsibility extraction with unrelated feature semantics unless explicitly approved as a separate work item.

## 7. Module size policy

No hard LOC threshold is currently adopted.

Reason:

```text
large + cohesive != bad
small + mixed ownership != good
```

However, sustained growth should trigger an architecture review when the module begins accumulating multiple independent change reasons or dependency roles.

A future evidence-backed threshold may be added if repeated SimCore work shows that a measurable size/fan-out threshold predicts ownership failures reliably.

## 8. Dependency rule

Extraction should usually make the dependency graph narrower.

A proposed split is suspicious if it:

```text
creates circular ownership
adds upward core → runtime dependencies
requires broad host access
requires unrelated persistent-state access
widens Contracts v2 exceptions
creates a pass-through module with no ownership
```

A good extraction should reduce or freeze dependency ambiguity.

## 9. Performance and reliability rule

Do not split modules on the assumption that more modules are automatically faster.

Runtime performance benefit must be evidence-based.

Valid performance/reliability reasons for extraction include:

```text
isolating expensive fallback paths
separating cold migration from hot request paths
making caching/lifetime boundaries explicit
making retained-reference ownership bounded
making failure handling independently testable
```

The architectural benefit is primarily ownership and testability; performance improvement is optional and must be measured.

## 10. Relationship to current roadmap

This policy does not alter the current sequencing priority.

Current intent remains:

```text
finish/harden R (Release System v2)
→ resume the next planned SimCore product version
→ use R for real releases
→ preserve feedback and harden R from evidence
```

Future runtime module extraction should therefore be scheduled as its own product/refactor work after the current R work reaches its required completion gate.

It must not be mixed into the current R infrastructure work.

## 11. Existing architecture examples / controls

Current Contracts v2 already establishes the intended direction:

```text
Representation = first-class bounded subsystem
Edit Reconcile = one application service
Session = identity/current-state holder + bounded orchestration target
Runtime Mirror = host Fresh observation + strict gates + mirror scheduling
Recovery = compatibility facade over phase-specific modules
```

Future extractions should follow the same ownership-first pattern.

## 12. Long-term goal

As SimCore grows, complexity should be absorbed into explicit bounded owners instead of accumulating in Session, Runtime shell, or another god module.

Desired result:

> SimCore may gain capability over time without making any single module increasingly difficult to reason about, validate, release, or repair.

The purpose of modularization is not to maximize module count.

The purpose is to keep each important responsibility independently understandable, testable, and safely changeable.
