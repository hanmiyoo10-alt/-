# SimCore Gemini Prompt Stability Manifest — Idea / Design Candidate

Date: 2026-08-25
Status: `IDEA RECORDED · CACHE-STABILITY CONTRACT · CI/RELEASE METADATA · NO RUNTIME CHANGE · GEMINI IMPLICIT CACHE TRACK`
Related:
- `docs/SIMCORE_GEMINI_IMPLICIT_CACHE_SCOPE.md`
- `docs/SIMCORE_GEMINI_PROMPT_SEGMENT_IDENTITY_IDEA.md`
- `docs/SIMCORE_GEMINI_STABLE_PREFIX_BUDGETER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_ABI_GUARDIAN_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_PREFIX_MAP_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_BASELINE_PROFILE_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGRESSION_SENTINEL_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_REGIME_LEDGER_IDEA.md`
- `docs/SIMCORE_GEMINI_CACHE_OPPORTUNITY_ANALYZER_IDEA.md`
- `docs/SIMCORE_RENDERER_BOUNDARY_CONSTITUTION.md`

## 1. Purpose

Create one machine-readable release/CI contract describing the prompt-stability shape of a SimCore build.

The Prompt Stability Manifest should answer:

```text
Which semantic prompt segments exist?
Which tier does each segment belong to?
What volatility class is allowed to feed each segment?
What is the segment order?
What are the serialized byte digests and lengths?
Was any stable/slow Cache ABI change intentionally declared?
Is the candidate compatible with the production prompt-stability contract?
```

The manifest unifies the metadata needed by:

```text
Prompt Segment Identity
Stable Prefix Budgeter
Cache ABI Guardian
```

without becoming a second semantic authority.

## 2. Authority rule — manifest is derived, not sovereign

The manifest must not become a hand-maintained alternative source of truth for prompt semantics.

Required authority model:

```text
design + compiler/runtime contracts
= semantic authority

Prompt Stability Manifest
= derived cache-stability contract / evidence surface
```

The manifest describes what the compiler actually emits and what stability contract was explicitly declared for the release.

It must not silently override compiler behavior.

If the manifest disagrees with compiler reality:

```text
MANIFEST_MISMATCH
→ CI failure / tooling defect
```

Do not resolve such a mismatch by trusting the manifest over the compiler.

## 3. Constitutional responsibility boundary

```text
SimCore
= state / policy / boundary / validation / runtime coordination / observability

Main Model
= renderer
```

The manifest is build/release metadata only. It must never:

```text
write model prose
rewrite user/assistant history
move prompt sections automatically
change model instructions at runtime
weaken correctness/state protections
manage Gemini explicit cache resources
select provider routes
```

The cache contract can describe or reject a release; it cannot take over rendering or semantic authority.

## 4. No prompt-byte contamination

The manifest must remain sidecar metadata.

Do not inject manifest IDs, digests, labels, comments, or diagnostic wrappers into the model request merely for cache tooling.

Required relationship:

```text
actual compiled prompt bytes
+
derived Prompt Stability Manifest
```

not:

```text
prompt bytes containing extra cache-debug metadata
```

Observability must not change the cache surface being observed.

## 5. Conceptual manifest shape

Illustrative only:

```json
{
  "schemaVersion": 1,
  "promptContractVersion": "...",
  "cacheAbiIntent": "PRESERVE",
  "runtimePlacement": "TAIL_AFTER_CURRENT_USER",
  "tiers": {
    "stable": {
      "digest": "...",
      "byteLength": 12480,
      "segments": [
        {
          "segmentId": "CORE_ROLE_CONTRACT",
          "ordinal": 1,
          "sourceClass": "STABLE",
          "allowedSourceClass": "STABLE",
          "digest": "...",
          "byteLength": 1820,
          "cacheCritical": true
        },
        {
          "segmentId": "CORE_EXPOSURE_CONTRACT",
          "ordinal": 2,
          "sourceClass": "STABLE",
          "allowedSourceClass": "STABLE",
          "digest": "...",
          "byteLength": 2140,
          "cacheCritical": true
        }
      ]
    },
    "slow": {
      "digest": "...",
      "byteLength": 3180,
      "segments": []
    }
  },
  "declaredChanges": []
}
```

Exact schema is implementation-time work and must be generated from real compiler inventory rather than copied blindly from this example.

## 6. Core fields

The first useful schema should remain small and explainable.

Candidate top-level fields:

```text
schemaVersion
promptContractVersion or compatible build identity
runtimePlacement
cacheAbiIntent
stable tier digest / length
slow tier digest / length
segment manifests
bounded declared-change records
```

Per-segment candidate fields:

```text
segmentId
tier
ordinal
sourceClass
allowedSourceClass
byteLength
digest
cacheCritical
```

Optional later fields:

```text
parentSegmentId
firstByteOffsetInTier
lastByteOffsetInTier
changeReasonCode
changeEvidenceRef
```

Do not retain raw segment bodies in long-lived manifests.

## 7. Cache ABI intent

Default release posture:

```text
CACHE_ABI_INTENT = PRESERVE
```

Meaning:

```text
undeclared stable drift → FAIL
undeclared slow drift   → FAIL
```

Intentional changes require narrow declarations.

Conceptual declaration:

```json
{
  "segmentId": "CORE_EXPOSURE_CONTRACT",
  "tier": "stable",
  "changeType": "SEMANTIC_CONTRACT_CHANGE",
  "intent": "CHANGE_DECLARED",
  "evidence": "docs/..."
}
```

Do not support a universal bypass such as:

```text
allowCacheChanges = true
```

A declaration must identify the affected tier/segment and point to design evidence.

## 8. Segment ordering contract

For longest-prefix implicit caching, order is part of the cache contract.

The manifest comparison must distinguish:

```text
SEGMENT_BYTES_CHANGED
SEGMENT_ADDED
SEGMENT_REMOVED
SEGMENT_REORDERED
SEGMENT_TIER_CHANGED
SOURCE_CLASS_CHANGED
ALLOWED_SOURCE_CLASS_CHANGED
```

Two byte-identical segments reordered are not cache-equivalent at the request-prefix level.

## 9. Stable Prefix Budgeter integration

The Budgeter should derive its construction-time checks from the same segment metadata rather than maintaining a separate map.

Example:

```text
segment: CORE_EXPOSURE_CONTRACT
allowedSourceClass: STABLE
observedSourceClass: VOLATILE

→ STABILITY_CLASS_INTRUSION
```

The manifest should preserve only the bounded classification/result needed for CI evidence.

It should not expose or retain raw dynamic values.

## 10. Cache ABI Guardian integration

The Guardian should compare production and candidate manifests before falling back to opaque whole-tier byte differences.

Desired output:

```text
Cache ABI Guardian: FAIL
intent: PRESERVE

tier: stable
segment: CORE_EXPOSURE_CONTRACT
change: SEGMENT_BYTES_CHANGED
base length: 2140
candidate length: 2198
base digest: ...
candidate digest: ...
declaration: NONE
```

If segment manifests are identical but the whole-tier digest differs, classify a likely serializer/separator/assembly issue:

```text
TIER_ASSEMBLY_DRIFT
```

This creates a useful distinction between semantic segment changes and compiler assembly changes.

## 11. Production vs candidate comparison

The canonical CI comparison is:

```text
production manifest P
vs
candidate manifest C
```

for the same deterministic fixture/state family.

Comparison dimensions:

```text
segment inventory
segment tier membership
segment order
segment byte digest
segment source-class contract
whole stable digest
whole slow digest
runtime placement contract
change declarations
```

Do not compare unrelated fixtures as if they were ABI-compatible states.

## 12. Fixture-aware manifests

A single global manifest may be insufficient because some prompt units are conditional.

Preferred model:

```text
base contract manifest
+
fixture/state materializations
```

Candidate fixture families may include:

```text
Mode C ordinary
B_START
B_CONTINUE
B_END
post-B_END C
secondary inactive / active
Summary representative state
Community representative state
Frame/Continuity representative state
```

The exact permanent fixture matrix should reuse existing regression fixtures and must not invent synthetic semantics merely for cache metrics.

## 13. Generated artifact vs committed artifact

Default preference:

```text
source annotations/contracts
→ deterministic generator
→ manifest artifact
→ CI compare
```

Avoid a workflow where engineers manually edit a JSON manifest independently of compiler changes.

Two possible implementation modes may be researched:

```text
A. generated during CI only
B. generated and committed as a reviewable golden artifact
```

If committed, CI must regenerate it and fail when the checked-in copy is stale.

Do not decide A vs B until repository ergonomics and artifact noise are measured.

## 14. Determinism requirements

The manifest itself must be deterministic.

Same source + same fixture + same declared contract must produce byte-identical manifest serialization except for explicitly excluded non-contract metadata.

Do not embed volatile values such as:

```text
build timestamp
runtime boot id
random UUID
generation id
wall-clock date
machine path
```

inside the canonical comparison payload.

If provenance is useful, store it outside the digest-covered contract portion.

## 15. Schema evolution

Manifest schema changes are not automatically Cache ABI changes.

Keep separate concepts:

```text
manifestSchemaVersion
= tooling metadata format

prompt/cache ABI
= actual prompt stability contract
```

A schema upgrade that preserves all prompt bytes must not create a fake Gemini cache-regime change.

Compatibility readers may support the immediately previous schema if useful, but no broad migration framework is needed at idea stage.

## 16. Privacy and boundedness

Manifest must contain metadata only.

Never store:

```text
raw system prompt body
raw user text
raw assistant text
raw COMMUNITY output
full request snapshots
secrets/auth material
```

Allowed bounded evidence:

```text
semantic segment IDs
tier/source-class enums
digests
byte lengths
ordinals
change intent
evidence document reference
```

## 17. Relationship to runtime observability

The Prompt Stability Manifest is primarily build/release evidence.

Runtime components may consume a compact compatible identity, for example:

```text
stable ABI digest
slow ABI digest
segment schema identity
```

but should not carry the full CI manifest per request unless measured value justifies the cost.

Prefix Map can use compatible segment identities when available, while keeping runtime overhead bounded.

## 18. Relationship to Cache Regime Ledger

An intentional stable/slow ABI change may become evidence for a new cache regime, but not automatically.

Correct flow:

```text
Manifest / Guardian
→ declared cache ABI change

real Gemini receipts + Baseline Profile
→ observe whether cache behavior actually moves to a sustained new level

Regime Ledger
→ confirm new CACHE_REGIME only with runtime evidence
```

Do not infer provider cache behavior solely from manifest changes.

## 19. Relationship to Opportunity Analyzer

When a regression is observed, the Analyzer may use manifest evidence to ask:

```text
Was this segment change intentional?
Was the affected segment early and cache-critical?
Did the change repeat across real requests?
Is the region actually recoverable or already in CACHE_SHADOW?
```

The manifest is evidence, not an automatic optimization order.

## 20. Required future fixtures / CI proofs

A future implementation should prove at least:

```text
1. identical compiler + fixture
   → identical manifest

2. implementation refactor with identical serialized prompt
   → manifest cache contract SAME

3. one stable segment byte change, undeclared
   → Guardian FAIL with exact segmentId

4. declared stable semantic change
   → declaration recognized, no generic bypass

5. segment reorder with unchanged per-segment digests
   → SEGMENT_REORDERED

6. segment tier move stable → slow
   → SEGMENT_TIER_CHANGED

7. volatile source admitted into stable segment
   → STABILITY_CLASS_INTRUSION

8. all segment digests SAME but tier digest changed
   → TIER_ASSEMBLY_DRIFT

9. manifest schema version change only
   → not falsely classified as prompt Cache ABI change

10. manifest generation contains no timestamps/random/runtime IDs in canonical payload

11. no raw prompt/body retention

12. no prompt bytes changed merely by enabling manifest generation

13. renderer responsibility unchanged

14. latest.js == install.js remains an independent release invariant
```

## 21. Non-goals

```text
automatic prompt rewriting
automatic segment relocation
explicit Gemini cache management
provider route pinning
renderer behavior changes
semantic authority duplication
manual JSON bureaucracy for every turn
runtime full-manifest emission per request
```

## 22. Implementation sequencing if promoted

This idea must not be bundled with unrelated runtime semantic work.

Recommended future sequence:

```text
current cache-research evidence collection
→ compiler segment inventory
→ sidecar Segment Identity prototype
→ Budgeter observation-only classification
→ deterministic manifest generator
→ Guardian manifest comparison
→ permanent CI fixture promotion
→ only later runtime compact identity reuse if measured useful
```

Do not mix this with M2-3 semantic extraction or deployment-system restructuring in one work item.

## 23. Current classification

```text
GEMINI_PROMPT_STABILITY_MANIFEST
= HIGH VALUE
= CI / RELEASE CONTRACT LAYER
= LOW RUNTIME RISK IF BUILDTIME-ONLY
= DERIVED, NOT SEMANTIC AUTHORITY
= IDEA / DESIGN CANDIDATE

runtime mutation:
NONE today

prompt byte mutation:
NONE by design

renderer responsibility change:
NONE

provider cache claim:
NONE without external Gemini receipt
```
