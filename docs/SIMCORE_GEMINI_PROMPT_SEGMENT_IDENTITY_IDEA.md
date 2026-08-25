# SimCore Gemini Prompt Segment Identity — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CACHE-ABI EXPLAINABILITY · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_STABLE_PREFIX_BUDGETER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Make Cache ABI changes explainable below the coarse `stable / slow / volatile / full` tier level.

The current tier model can answer:

```text
stable changed
slow stayed same
```

Prompt Segment Identity should allow diagnostics and CI to answer:

```text
stable changed
→ segment: CORE_EXPOSURE_CONTRACT
→ previous digest: ...
→ candidate digest: ...
→ byte length: 2140 → 2198
→ change intent: UNDECLARED
```

The design is observational/build-time metadata. It does not alter model prose or prompt semantics.

## 2. Constitutional boundary

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

Segment Identity may identify compiler-owned prompt pieces and compare their serialized bytes. It must never:

```text
write model prose
rewrite user/assistant history
change renderer responsibilities
weaken correctness/state protections
move prompt sections automatically
manage Gemini explicit caches
```

Any semantic prompt change remains a separate design/release decision.

## 3. Critical rule — identities must be sidecar metadata

Do not serialize diagnostic segment labels into the model prompt merely to make segments observable.

Wrong:

```text
<SEGMENT id="CORE_EXPOSURE_CONTRACT">
...
</SEGMENT>
```

if those wrappers do not already belong to the semantic prompt contract.

Adding observability markers to the prompt would itself change prompt bytes, potentially alter semantics, and damage the cache behavior being measured.

Required model:

```text
compiled prompt bytes
+
sidecar segment manifest
```

The manifest is not injected into the main-model request unless a segment label is already part of the genuine semantic contract.

## 4. Identity is not digest

Keep two concepts separate:

```text
segmentId
= stable semantic/machine-readable identity

digest
= fingerprint of the actual serialized segment bytes
```

Example:

```text
segmentId: CORE_EXPOSURE_CONTRACT
baseDigest:  a1b2...
candidateDigest: f9e8...
```

The identity remains meaningful even when the bytes change.

Do not use a content hash as the segment identity. A hash-only identity would make the most important diagnostic question impossible:

```text
Which logical contract changed?
```

## 5. Initial identity vocabulary

Exact inventory must be derived from the current compiler before implementation. Candidate identities may look like:

```text
CORE_ROLE_CONTRACT
CORE_EXPOSURE_CONTRACT
BROADCAST_LIFECYCLE_CONTRACT
CHARACTER_CONTROL_CONTRACT
COMMUNITY_KNOWLEDGE_CONTRACT
FRAME_CONTINUITY_CONTRACT
RECOVERY_MIRROR_CONTRACT
RUNTIME_MODE_FACTS
RUNTIME_TIME_FACTS
RUNTIME_OUTPUT_CONSTRAINTS
```

These names are examples only until mapped to actual compiler ownership.

Rules for identities:

```text
stable names
human-readable
machine-readable
semantic rather than implementation-file based
not tied to line numbers
not tied to function names unless function identity is itself the contract
```

Renaming an implementation helper must not automatically rename the segment.

## 6. Segment manifest

Conceptual sidecar entry:

```ts
{
  segmentId: "CORE_EXPOSURE_CONTRACT",
  tier: "stable",
  ordinal: 3,
  owner: "compiler",
  sourceClass: "STABLE",
  byteLength: 2140,
  digest: "...",
  cacheCritical: true
}
```

Optional future fields may include:

```text
parentSegmentId
schemaVersion
changeIntent
firstByteOffsetInTier
lastByteOffsetInTier
```

Do not retain raw segment bodies in long-lived telemetry merely for identity diagnostics.

## 7. Granularity rule

Do not split every line or interpolation into a segment.

Too coarse:

```text
STABLE_ALL
```

→ not useful enough.

Too fine:

```text
one segment per line / field / whitespace token
```

→ noisy, brittle, expensive, and likely tied to implementation details.

Preferred granularity:

```text
one segment per meaningful semantic contract or compiler-owned prompt unit
```

Segment boundaries should be stable enough that a refactor which preserves the semantic prompt structure does not create dozens of artificial identity changes.

## 8. Ordering is part of the ABI

For longest-prefix caching, segment order matters.

Therefore the manifest should detect separately:

```text
SEGMENT_BYTES_CHANGED
SEGMENT_ADDED
SEGMENT_REMOVED
SEGMENT_REORDERED
SEGMENT_TIER_CHANGED
```

Example:

```text
CORE_ROLE_CONTRACT digest SAME
CORE_EXPOSURE_CONTRACT digest SAME
but ordinal 2 → 4

→ SEGMENT_REORDERED
```

Even byte-identical segments can change the resulting prefix if their order changes.

## 9. Guardian integration

Cache ABI Guardian should compare segment manifests before falling back to an opaque whole-tier diff.

Desired CI output:

```text
Cache ABI Guardian: FAIL
Tier: stable

Changed segments:
- CORE_EXPOSURE_CONTRACT
  digest: CHANGED
  length: 2140 → 2198
  intent: UNDECLARED

Unchanged segments:
- CORE_ROLE_CONTRACT
- CHARACTER_CONTROL_CONTRACT
- COMMUNITY_KNOWLEDGE_CONTRACT
```

This is much more actionable than:

```text
stable hash changed
```

Whole-tier digest remains useful as a final invariant; segment-level evidence explains why it changed.

## 10. Budgeter integration

Stable Prefix Budgeter answers whether a source with a given volatility class is allowed into a tier.

Prompt Segment Identity provides the unit on which that rule can be expressed.

Example:

```text
segment: CORE_EXPOSURE_CONTRACT
expected source class: STABLE
actual dependency added: runtimeGeneration
actual source class: VOLATILE

→ STABILITY_CLASS_INTRUSION
```

Thus:

```text
Budgeter
= source/admission correctness

Segment Identity
= named semantic unit

Guardian
= final serialized byte compatibility
```

## 11. Prefix Map integration

Runtime Prefix Map may use segment identities for SimCore-owned regions when available.

Example:

```text
SIMCORE stable
  CORE_ROLE_CONTRACT          SAME
  CORE_EXPOSURE_CONTRACT      FIRST_SIMCORE_DRIFT
  CHARACTER_CONTROL_CONTRACT  AFTER_BREAK
```

However, runtime instrumentation should remain bounded. If per-segment runtime comparison adds meaningful cost, detailed segment manifests can remain primarily CI/build-time while runtime reports only the first relevant segment identity.

No second expensive compiler pass should be added only for diagnostics.

## 12. Opportunity Analyzer integration

Segment Identity makes optimization candidates concrete.

Instead of:

```text
optimize stable tier
```

Analyzer can produce:

```text
HIGH_VALUE_CANDIDATE
segment: CORE_EXPOSURE_CONTRACT
repeated first SimCore break: 9 comparable requests
estimated recoverable prefix: high
declared semantics: unchanged
risk: low-medium
```

The Analyzer still does not modify the segment automatically.

## 13. Declared changes

When a semantic contract intentionally changes, declaration should be narrow.

Conceptual form:

```text
CACHE_ABI_INTENT = CHANGE_DECLARED
segment = CORE_EXPOSURE_CONTRACT
tier = stable
reason = <design/evidence reference>
```

Avoid broad declarations such as:

```text
allow all stable changes
```

A declaration should name the affected segment(s) whenever segment identity is available.

## 14. Segment schema version vs prompt ABI

Changing sidecar metadata schema does not necessarily change model prompt bytes.

Keep separate identities:

```text
SEGMENT_MANIFEST_SCHEMA
PROMPT_CACHE_ABI
```

A manifest schema migration must not be misreported as a Gemini prompt cache ABI change if compiled prompt bytes are unchanged.

Conversely, prompt bytes changing while the manifest schema stays the same remains a real prompt ABI event.

## 15. Privacy and boundedness

Persist/report only bounded metadata where possible:

```text
segment id
tier
ordinal
length
digest
change class
small ownership enum
```

Do not persist:

```text
raw system prompt segments
raw user/history bodies
full compiled prompts
unbounded per-turn segment history
```

CI fixtures may hold deterministic expected outputs according to existing test policy, but runtime telemetry should stay privacy-bounded.

## 16. Performance constraints

Preferred implementation shape:

```text
compiler constructs each semantic segment once
→ serialized segment bytes contribute directly to normal tier output
→ digest/length recorded as sidecar during the same construction
```

Avoid:

```text
compile full prompt
→ parse prompt back into segments
```

and avoid a second complete serialization pass merely for observability.

The compiler should be the natural segment authority if implementation evidence supports it.

## 17. Refactor stability

A pure source-code refactor that produces identical prompt bytes should normally yield:

```text
segment ids SAME
segment order SAME
segment digests SAME
whole-tier digest SAME
```

If a refactor changes only internal helper ownership but forces all segment identities to change, the identity scheme is too implementation-coupled.

## 18. Failure vocabulary

Candidate narrow vocabulary:

```text
SEGMENT_BYTES_CHANGED
SEGMENT_ADDED
SEGMENT_REMOVED
SEGMENT_REORDERED
SEGMENT_TIER_CHANGED
SEGMENT_IDENTITY_COLLISION
SEGMENT_MANIFEST_INCOMPLETE
SEGMENT_SCHEMA_INCOMPATIBLE
```

Cache-specific interpretation remains separate:

```text
segment change observed
≠ provider cache regression proven
```

Actual Gemini impact still requires external cache receipt evidence/correlation.

## 19. Required future fixtures

A future implementation should prove at least:

```text
1. identical production/candidate semantic prompt
   → all segment ids/order/digests SAME

2. whitespace-only serialized drift in one segment
   → only that segment digest CHANGED

3. one semantic stable-contract change
   → named segment CHANGED + declared intent accepted

4. undeclared stable segment change
   → Guardian FAIL with segment identity

5. segment reorder with identical segment bodies
   → SEGMENT_REORDERED

6. segment moves stable → slow
   → SEGMENT_TIER_CHANGED

7. implementation helper rename only
   → segment identity remains SAME

8. manifest schema change with prompt bytes SAME
   → no false prompt ABI regression

9. no diagnostic segment markers injected into model prompt

10. no raw segment bodies persisted in runtime telemetry

11. Budgeter can attribute volatility intrusion to a segment

12. Prefix Map can report first SimCore segment drift without duplicate parsing

13. latest.js == install.js remains protected when runtime work eventually occurs

14. Renderer boundary unchanged
```

## 20. Rollout idea

Recommended phased adoption:

```text
Phase 0
inventory current compiler semantic units

Phase 1
sidecar segment manifest in static fixtures only

Phase 2
Guardian reports segment-level diffs

Phase 3
Budgeter attaches source-stability classes to segments

Phase 4
bounded runtime Prefix Map may expose first changed SimCore segment if measured cheap
```

Do not combine all phases with unrelated semantic or deployment-system work.

## 21. Current classification

```text
GEMINI_PROMPT_SEGMENT_IDENTITY
= HIGH VALUE
= LOW SEMANTIC RISK IF SIDECAR-ONLY
= CACHE ABI EXPLAINABILITY LAYER
= CI-FIRST / OBSERVABILITY-FIRST
= IDEA / DESIGN CANDIDATE

runtime mutation:
NONE today

prompt byte mutation:
NONE by design

renderer responsibility change:
NONE
```
