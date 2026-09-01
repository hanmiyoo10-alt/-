# SimCore Prompt Cache ABI — Cross-Version Compatibility Contract

Date: 2026-09-02 KST
Status: **DESIGN FROZEN · DESIGN ONLY · NO RUNTIME AUTHORIZATION**
Classification: **SIMCORE PROMPT CACHE ABI · CROSS-VERSION COMPATIBILITY · LONG-LIVED SKELETON · CACHE CONTINUITY**

## 1. Decision

This document extends the authority of:

- `SIMCORE_PROMPT_CACHE_ABI_PROGRAM_MASTER_DESIGN_2026-09-02.md`

with a cross-version compatibility contract.

The long-term target is not merely that one SimCore release be cache-friendly.

The target is:

```text
SIMCORE VERSION CHANGES
!=
PROMPT SKELETON CHURN
!=
CACHE RESET
```

SimCore should be able to evolve across many runtime releases while preserving the long-lived prompt skeleton and the reusable prefix owned by that skeleton.

A release-number change alone must not own cache invalidation.

The stable prompt structure should change only when an owned semantic contract requires that change.

This document does **not** authorize runtime implementation, prompt placement changes, provider-specific cache controls, release publication, 3.0M runtime activation, Candidate C, or source persistence.

---

## 2. Program relationship

The master Cache ABI program already establishes:

```text
SAME SEMANTICS
→ SAME STABLE PREFIX

SEMANTIC CHANGE
→ ONLY OWNED CACHE BREAK

PROVIDER SUPPORT EXISTS
→ CACHE REUSE SHOULD BE THE NORMAL CASE
```

This contract adds the temporal dimension:

```text
SAME STABLE SEMANTICS ACROSS RELEASES
→ SAME LONG-LIVED PROMPT SKELETON
→ SAME REUSABLE PREFIX WHERE HOST / PROVIDER SEMANTICS PERMIT
```

The Prompt Cache ABI is therefore a compatibility surface that outlives individual SimCore runtime versions.

---

## 3. Core distinction — Release version is not Cache ABI identity

The most important cross-version rule is:

```text
SIMCORE RELEASE VERSION
!=
PROMPT CACHE ABI REVISION
```

A runtime may move from:

```text
v0.70.x
→ v0.71.x
→ v0.8x
→ v1.x
```

without changing the Prompt Cache ABI if the stable prompt semantics and stable serialization contract remain compatible.

Therefore a literal release-version bump must not automatically invalidate the stable cache prefix.

If model-visible release metadata is needed for diagnostics or behavior, its placement must not silently convert every release into a full stable-prefix break.

Preferred ownership:

```text
releaseVersion
= deployment / diagnostics identity

promptCacheAbiRevision
= stable prompt semantic compatibility identity
```

`promptCacheAbiRevision` changes only when the stable prompt ABI itself changes.

---

## 4. Long-lived skeleton invariant

The intended durable shape is conceptually:

```text
[LONG-LIVED STABLE CORE]
        ↓
[APPEND-ONLY STABLE EXTENSION LANE]
        ↓
[CACHE ABI BOUNDARY]
        ↓
[DYNAMIC EXECUTION TAIL]
```

The exact host representation is not authorized here.

The invariant is structural:

1. existing stable core sections keep their order and meaning unless a semantic ABI break is required,
2. new stable features prefer additive extension after existing stable content rather than insertion/reordering before it,
3. dynamic turn-local values remain outside the long-lived stable core,
4. release metadata does not acquire stable-prefix break authority merely because a new version was published.

---

## 5. Cross-version invariants

### CVA-1 — Version bump alone is not a cache-break reason

```text
release version changed
+
stable semantics unchanged
→ stable prompt cache identity unchanged
```

A version number is metadata, not semantic proof.

### CVA-2 — Stable skeleton churn requires semantic necessity

Before changing an existing stable section, the design must answer:

```text
Does the old stable text now express incorrect semantics?
```

If **NO**, the existing stable section should remain byte-stable where practical.

Implementation convenience, cosmetic rewriting, reformatting, or code refactoring do not by themselves authorize a stable-prefix rewrite.

### CVA-3 — Additive evolution is preferred

When a new capability can be represented without changing existing stable semantics:

```text
NEW STABLE FEATURE
→ APPEND / OWNED EXTENSION

NOT
→ REWRITE / REORDER EXISTING STABLE CORE
```

This preserves the longest reusable prefix across releases.

### CVA-4 — Dormant feature evolution must not perturb unrelated requests

A newly introduced feature that is dormant for a request must not inject turn-local noise into the stable prefix.

Preferred property:

```text
feature introduced in new SimCore version
+
feature dormant for scenario
+
existing stable semantics unchanged
→ existing stable prefix remains identical
```

### CVA-5 — Cache ABI revision changes only for stable semantic incompatibility

A future implementation may maintain an explicit conceptual identity such as:

```text
PromptCacheAbiRevision
```

It must not be incremented merely because:

- the release version changed,
- internal modules were refactored,
- diagnostics changed,
- telemetry changed,
- UI changed,
- test infrastructure changed,
- code organization changed,
- a backward-compatible dynamic feature was added.

It changes only when the stable model-visible semantic contract requires an incompatible change.

### CVA-6 — Stable serialization is part of compatibility

Cross-version compatibility includes bytes, not only concepts.

If stable semantics remain the same:

```text
same stable semantics
across release N and N+1
→ same canonical stable serialization
```

Accidental whitespace, ordering, omission, escaping, label, or formatting churn is a cache ABI regression.

### CVA-7 — New stable content should preserve the old prefix

When a new stable definition must be added, prefer:

```text
OLD STABLE CORE
+ NEW STABLE EXTENSION
+ DYNAMIC TAIL
```

rather than:

```text
REORDERED / REWRITTEN CORE
+ NEW FEATURE
+ DYNAMIC TAIL
```

Under longest-prefix reuse, preserving the historical core prefix maximizes continuity even when the new release extends the prompt.

### CVA-8 — Dynamic changes must not migrate upstream without cause

A value that belongs to current execution state must not be moved into an earlier stable section merely for implementation convenience.

Examples include:

- current mode selection,
- current source family selection,
- request identity,
- generation identity,
- current user content,
- current conversation-dependent facts,
- telemetry values,
- latency values,
- current authority references.

### CVA-9 — Cache continuity never overrides semantic correctness

```text
SEMANTICS FIRST
COMPATIBILITY SECOND
CACHE CONTINUITY THIRD
```

If stable semantics genuinely change, SimCore must allow the owned cache break.

The program must never preserve stale bytes merely to retain a cache hit.

### CVA-10 — Breaking cache ABI changes are explicit events

A true stable ABI break must be treated as an explicit design event rather than incidental release churn.

Required record:

```text
old Prompt Cache ABI identity
new Prompt Cache ABI identity
semantic reason for break
first owned changed section
expected provider cache consequence
migration / rollback boundary
validation evidence
```

---

## 6. Stable core vs stable extension lane

The long-lived stable prompt is not required to remain eternally frozen in total size.

It is expected to evolve additively.

Conceptually:

```text
Stable Core
├─ foundational SimCore semantics
├─ authority rules
├─ long-lived mode/protocol definitions
└─ stable host-facing semantic contract

Stable Extension Lane
├─ later stable feature definition A
├─ later stable feature definition B
└─ later stable feature definition C

Dynamic Tail
├─ current selection
├─ current turn state
└─ current request data
```

The key property is historical prefix preservation.

If version N emits:

```text
CORE_A
CORE_B
DYNAMIC
```

and version N+1 adds a stable capability, prefer:

```text
CORE_A
CORE_B
NEW_STABLE_C
DYNAMIC
```

rather than rewriting `CORE_A` or reordering `CORE_B` merely to make the new feature aesthetically adjacent.

Prompt layout is an ABI, not a prose document whose chapters may be freely reorganized.

---

## 7. Release identity placement

A literal runtime version string is highly volatile by definition.

Therefore future Cache ABI work must explicitly classify model-visible version data.

Three possible outcomes are permitted only after host/semantic analysis:

### A. Not model-visible

If the release version is purely diagnostic, keep it outside the model-visible prompt.

### B. Dynamic / late model-visible metadata

If the model needs the value but it does not define stable semantics, place it after the stable reusable region where host semantics permit.

### C. Stable ABI identity

If a version-like value genuinely defines stable prompt semantics, use a stable ABI identity whose lifecycle is semantic rather than release-based.

The forbidden shortcut is:

```text
every deployment version
→ embedded at beginning of stable prompt
→ whole-prefix invalidation
```

unless a semantic requirement proves that placement necessary.

---

## 8. Feature evolution contract

Every future SimCore feature that can affect model-visible prompt bytes should be classified during design.

Minimum questions:

```text
1. Does this change existing stable semantics?
2. Can it be represented as a new stable extension?
3. Is it only current execution state?
4. What is the earliest byte/section it needs to change?
5. Does it force a Prompt Cache ABI revision?
6. Can unrelated dormant scenarios preserve the old stable prefix exactly?
```

The preferred answer pattern for backward-compatible features is:

```text
existing stable core
→ unchanged

new feature definition
→ owned additive extension

current activation state
→ dynamic tail
```

---

## 9. 3.0M integration implication

3.0M remains **DESIGN ONLY**.

When any Source Intelligence runtime work is separately authorized, Cache ABI compatibility becomes an input constraint from the beginning.

For example, stable definitions for:

- `LIVE_REACTION`,
- `BOARD`,
- `NEWS`,
- validator contracts,
- presentation semantics,

should not cause unrelated historical stable core sections to be reordered or rewritten merely because the feature was introduced.

Current selections such as:

```text
activeFamily = NEWS
currentProjection = ...
```

remain dynamic candidates.

A future source feature must not silently convert every SimCore upgrade into a full cache reset.

This statement is architectural only and does not authorize 3.0M runtime implementation.

---

## 10. Candidate C separation

Cross-version Prompt Cache ABI continuity does not create source persistence.

```text
PROMPT CACHE CONTINUITY
!=
SOURCE HISTORY CONTINUITY
```

Candidate C remains inactive.

No durable source identity, source history store, reentry cache, or cross-turn source object may be inferred from this contract.

---

## 11. Compatibility classification for future releases

Each future model-visible SimCore release should eventually be classifiable as one of:

### CACHE_ABI_COMPATIBLE

```text
stable semantic contract unchanged
+
stable historical prefix preserved
```

Normal case.

### CACHE_ABI_COMPATIBLE_WITH_ADDITIVE_EXTENSION

```text
historical stable prefix preserved
+
new owned stable material appended
```

Expected for many new features.

### CACHE_ABI_LOCALIZED_BREAK

```text
owned stable semantic section changed
+
earlier stable prefix preserved
+
break scope explicitly bounded
```

Allowed with evidence.

### CACHE_ABI_BREAK_REQUIRED

```text
stable semantic incompatibility requires foundational rewrite
```

Exceptional case.

Requires explicit design review and ABI revision.

The release version itself does not determine this classification.

---

## 12. Cross-version regression suite

Prompt Cache ABI reliability must eventually include release-to-release comparisons.

Minimum conceptual matrix:

### X1 — Patch release, no stable semantic change

```text
release N
release N+1
same semantic fixture
→ stable bytes identical
```

### X2 — Internal refactor only

```text
implementation changed
model-visible stable semantics unchanged
→ stable bytes identical
```

### X3 — Diagnostic / telemetry change

```text
diagnostics changed
stable semantics unchanged
→ stable bytes identical
```

### X4 — New dormant feature

```text
new feature exists
feature dormant in fixture
→ historical stable prefix identical
```

### X5 — New stable additive feature

```text
historical stable core
→ identical
new stable extension
→ appended at owned boundary
```

### X6 — Dynamic behavior change only

```text
stable definitions unchanged
dynamic current state changed
→ stable prefix identical through ABI boundary
```

### X7 — Intentional stable ABI break

```text
semantic incompatibility exists
→ explicit Prompt Cache ABI revision
→ first changed section identified
→ break accepted intentionally
```

### X8 — Reload across same release semantics

```text
supported reload
same stable semantics
→ stable prefix identical
```

### X9 — Upgrade / rollback pair

Where operationally supported:

```text
release N
→ compatible release N+1
→ rollback N
```

should not require semantic cache identity churn beyond provider-owned cache lifecycle behavior if the stable ABI remained compatible.

---

## 13. Provider reality boundary

This contract controls SimCore-generated eligibility and continuity.

It does not control provider internals.

Therefore:

```text
CACHE_ABI_COMPATIBLE
!=
PROVIDER_READ_CONFIRMED
```

A provider may evict, expire, shard, disable, or otherwise decline reuse.

SimCore's responsibility is to make eligible reuse structurally normal and unintended self-inflicted breaks exceptional.

Provider receipts remain the authority for actual cache reads/writes.

---

## 14. Cache reliability target

The intended mature state is:

```text
version changes frequently
stable skeleton changes rarely
Prompt Cache ABI revision changes exceptionally
unintended stable-prefix break approaches zero
provider reuse becomes the normal eligible-case outcome
```

The system should eventually be able to answer, for any release transition:

```text
Did the SimCore version change?
→ maybe

Did the stable semantics change?
→ explicitly known

Did the Prompt Cache ABI change?
→ explicitly known

Did the reusable stable prefix change?
→ mechanically measured

Was the break intended?
→ owner/reason identified

Did the provider actually reuse cache?
→ provider evidence only
```

---

## 15. Release-design review gate

Before approving any future runtime change that modifies model-visible prompt material, the release design should eventually record:

```text
Cache ABI classification
Stable core changed? YES / NO
Stable extension added? YES / NO
Dynamic-only change? YES / NO
Earliest intended changed section
Prompt Cache ABI revision changed? YES / NO
Provider cache implication
Regression evidence
```

A release should not acquire `CACHE_ABI_BREAK_REQUIRED` merely because rewriting the prompt is easier than preserving compatibility.

---

## 16. Anti-goals

This contract does not mean:

- never change the prompt,
- never invalidate cache,
- preserve incorrect legacy semantics,
- keep dead rules forever,
- preallocate giant unused prompt blocks,
- insert every future schema into every request,
- make provider cache behavior a SimCore guarantee,
- turn release versioning into cache identity,
- create source history or Candidate C implicitly,
- sacrifice semantic correctness for cache continuity.

The target is **long-lived compatibility**, not immobility.

---

## 17. Design consequence for S7 → Cache ABI handoff

The next Cache ABI preflight must evaluate S7 not only for runtime simplification but also for compatibility surface quality.

The handoff should ask:

```text
1. What existing model-visible sections are truly long-lived core?
2. Which remaining sections are runtime noise?
3. Which values are release metadata rather than semantic ABI identity?
4. Can future stable features append without rewriting the historical core?
5. Is canonical serialization possible without changing semantics?
6. What exact boundary can remain stable across many future releases?
```

This becomes an acceptance input to `CACHE-1 · S7 → PROMPT CACHE ABI HANDOFF RE-PREFLIGHT`.

---

## 18. Final compatibility invariant

The cross-version goal is frozen as:

```text
SIMCORE MAY EVOLVE
WITHOUT REWRITING ITS PROMPT SKELETON BY DEFAULT.

RELEASE VERSION MAY CHANGE
WITHOUT CHANGING PROMPT CACHE ABI BY DEFAULT.

NEW FEATURES SHOULD EXTEND OWNED SURFACES
WITHOUT INVALIDATING UNRELATED HISTORICAL PREFIXES.

REAL SEMANTIC BREAKS MAY BREAK CACHE,
BUT THE BREAK MUST BE EXPLICIT, OWNED, BOUNDED, AND TESTED.
```

Or, compactly:

```text
EVOLVE THE RUNTIME.
PRESERVE THE SKELETON.
LOCALIZE THE BREAK.
KEEP CACHE CONTINUITY AS THE DEFAULT.
```

---

## 19. Current status

At this freeze:

```text
Cross-version compatibility contract
= DESIGN FROZEN

Runtime implementation
= NOT AUTHORIZED

Prompt Cache ABI implementation
= NOT STARTED BY THIS DOCUMENT

Provider cache confirmation
= UNVERIFIED BY THIS DOCUMENT

3.0M runtime
= DESIGN ONLY

Candidate C
= INACTIVE
```

Next checkpoint remains:

```text
CACHE-1
S7 → PROMPT CACHE ABI HANDOFF RE-PREFLIGHT
```

That preflight must now include the cross-version compatibility requirements defined here.
