# SimCore Module Cohesion & Extraction Guideline

Status: `ARCHITECTURAL MAINTENANCE RULE · LIVING GUIDANCE · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

SimCore modules should remain understandable, cohesive, and ownership-safe as the plugin grows.

A module that becomes too large or begins accumulating unrelated responsibilities should be proactively reviewed for extraction into an independent module or a narrower submodule.

This is an architectural maintenance rule, not a line-count threshold.

Canonical principle:

```text
module size is a signal
ownership cohesion is the authority
```

A large module may remain intact when it still owns one coherent responsibility and has a clear dependency boundary.

A smaller module may still require extraction when unrelated responsibilities, lifecycle phases, host dependencies, persistence logic, diagnostics, or application orchestration become entangled.

## 2. Extraction triggers

A module should be treated as an extraction candidate when one or more of these become materially true:

```text
one module owns multiple independently describable responsibilities
unrelated changes repeatedly touch the same module
new dependencies are being added for a separate concern
runtime / host-facing logic leaks into a core/domain owner
persistence, diagnostics, rendering policy, or application orchestration become mixed
one lifecycle phase becomes independently testable and independently changeable
safe testing requires large unrelated setup because boundaries are too broad
future work repeatedly needs to modify only one recognizable region of the module
reviewing the module requires reasoning across unrelated invariants
```

No single trigger automatically authorizes a split. The split must improve ownership clarity without changing behavior accidentally.

## 3. Non-triggers

Do not split a module merely because:

```text
it crossed an arbitrary line count
one helper function became long
a file looks aesthetically large
splitting would create more files with no clearer ownership
another architecture style prefers smaller files
```

Avoid fragmentation for its own sake.

Canonical anti-pattern:

```text
large coherent owner
→ many tiny pass-through modules
→ more dependency edges
→ less obvious authority
```

## 4. Extraction rule

When extraction is justified, prefer moving a complete responsibility boundary rather than slicing by file size.

Good extraction:

```text
existing mixed module
→ identify one stable responsibility
→ define owns / does-not-own boundary
→ move the complete responsibility
→ preserve public behavior and ordering
→ keep compatibility facade only when needed
```

Bad extraction:

```text
first 500 lines → module A
next 500 lines  → module B
```

Physical location follows semantic ownership.

## 5. SimCore constitutional boundaries remain authoritative

Extraction must preserve the existing architectural direction:

```text
SimCore
= state / policy / boundary / validation / runtime coordination

Main Model
= renderer
```

Module splitting must not move renderer responsibilities into SimCore.

Likewise, core/domain modules must not gain direct host/runtime dependencies merely because a large module is being reorganized.

Contracts v2 dependency direction remains authoritative.

## 6. Separate extraction from feature changes

A module split is normally a mechanical architecture task.

Do not combine:

```text
module extraction
+
new semantic behavior
+
performance optimization
+
release-system redesign
```

in one work item unless a separate explicit plan proves that separation is impossible.

Preferred sequence for an extraction task:

```text
main design / ownership evidence
→ dedicated work branch
→ mechanical extraction
→ static + permanent regression verification
→ release-simcore only if runtime artifact changes
→ real long-chat validation when production runtime changed
→ main documentation / durable-memory sync
```

If a desired feature exposes an oversized or mixed module, first decide whether the feature can be implemented safely without extraction. If extraction is needed, record it as its own architectural work item rather than smuggling the refactor into the feature patch.

## 7. Compatibility and behavior preservation

A mechanical split should preserve, unless an explicit behavioral task says otherwise:

```text
public API / facade contract
state schema
storage behavior
request/output ordering
prompt bytes
visible output semantics
diagnostic meaning
host-call behavior
cache/provider claims
```

Temporary compatibility facades are allowed when they reduce migration risk, as long as ownership has actually moved and the facade does not become a second owner.

## 8. Test expectation

Before extracting a responsibility, identify the permanent regression controls that protect it.

If direct executable coverage already exists, reuse it.

If the current boundary is HYBRID_TRANSITIONAL because ownership is not yet exposed, extraction may be the event that allows the existing stable fixtures to become EXECUTABLE.

Do not invent duplicate suites merely because ownership moves to a new physical module.

Canonical rule:

```text
semantic fixture identity survives physical module movement
```

## 9. Ongoing maintenance behavior

During future SimCore work, proactively notice module growth and ownership drift.

When a module becomes materially oversized or mixed:

```text
1. preserve the observation in the repository
2. identify the responsibilities currently co-located
3. classify whether the problem is SIZE_ONLY or OWNERSHIP_DRIFT
4. if SIZE_ONLY and still cohesive → keep / WATCH
5. if OWNERSHIP_DRIFT → propose a narrow extraction
6. perform extraction separately from unrelated feature work
```

Suggested classifications:

```text
COHESIVE_LARGE
WATCH_EXTRACTION
EXTRACTION_CANDIDATE
EXTRACTION_REQUIRED
```

These are planning/documentation labels, not required runtime enums.

## 10. Frozen maintenance principle

```text
DO NOT LET A MODULE BECOME A GRAVITY WELL

When growth starts pulling unrelated responsibilities into one owner,
extract the responsibility boundary before further growth makes the coupling expensive.

Split by ownership, not by line count.
Preserve behavior first.
Keep feature work and architectural extraction separate.
```
