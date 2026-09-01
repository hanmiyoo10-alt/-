# SimCore Common-Layer Refresh Review — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY REFRESH COMPLETE · 3M-0/1/2 REMAIN VALID · 3M-3 DESIGN INPUT UPDATED · NO IMPLEMENTATION AUTHORITY**

Classification: **SIMCORE · COMMON RULES / COMMON TOOLING REFRESH · 3.0M SOURCE INTELLIGENCE DESIGN INPUT**

## 0. Purpose

This document refreshes SimCore against repository-wide/common plugin information that landed after the earlier:

```text
docs/SIMCORE_COMMON_RULES_AND_PLUGIN_SKILL_METHODOLOGY_IMPACT_2026-09-01.md
```

The question is intentionally narrow:

```text
Did the common layer acquire any new rule, validated workflow pattern,
or shared host/plugin invariant that changes the current 3.0M Source Intelligence design direction?
```

Result:

```text
3M-0 MASTER DESIGN = STILL VALID
3M-1 COMPATIBILITY DESIGN = STILL VALID
3M-2 ASSERTION / EXPOSURE DESIGN = STILL VALID
3M-3 DESIGN INPUT = STRENGTHENED
RUNTIME / RELEASE AUTHORITY = UNCHANGED
```

This review changes no SimCore runtime, production branch, prompt, persistence, release, S7/v0.70.3 scope, or implementation authority.

---

## 1. Fresh authority boundary

SimCore inherits repository common behavioral/governance rules by reference from:

```text
docs/REPOSITORY_COMMON_RULES.md
```

while mutable SimCore production truth remains project-owned.

Fresh repository main at review start:

```text
main = 9333a513bb46b92f2e443c41dbb80a208001623c
```

Fresh deployed SimCore authority remains independently owned by:

```text
release-simcore
```

No common-layer document or Agent Skill is allowed to become a second SimCore runtime/release authority.

---

## 2. New common rules since the previous SimCore common-methodology review

The previous SimCore common review consumed the then-new:

```text
RCR-D07
RCR-D08
RCR-D09
RCR-D10
RCR-C07
RCR-C08
```

A later RisuAI-derived common-rule promotion added four more canonical repository rules:

```text
RCR-D11 · Choose the narrowest capable semantic owner/effect surface
RCR-D12 · Map state/data/effect flow before multi-layer mutation
RCR-D13 · Validate contracts across boundaries, not files in isolation
RCR-C09 · Prefer validators before introducing replacement/shared writers
```

These are now present in canonical `docs/REPOSITORY_COMMON_RULES.md` and are therefore inherited by SimCore through its existing guideline inheritance boundary.

### 2.1 RCR-D11 relevance to 3.0M

This strongly supports the existing 3.0M choice:

```text
NO new core modes for SNS / BOARD / NEWS
NO generic second lineage platform
NO generic audience-memory database
NO broad new persistent social-state owner by default
```

For each 3.0M semantic job, choose the smallest existing or newly justified owner.

Examples:

```text
current source identity         → reuse Handoff / Evidence where sufficient
legacy Community parsing       → keep Community ownership
reaction numbering             → keep Reaction ownership
output shape safety            → keep Structure ownership
source assertion validation    → add one bounded validator owner only when 3M-3 needs it
presentation                   → renderer layer, not semantic authority
```

Disposition:

```text
PASS · 3M_ARCHITECTURE_ALREADY_ALIGNED_WITH_RCR_D11
```

### 2.2 RCR-D12 relevance to 3.0M

The rule requires an explicit semantic flow before multi-layer mutation:

```text
input/event
→ semantic owner
→ state/data transform
→ persistence if any
→ consumer/presentation
→ validation
```

The 3M master pipeline already follows this shape:

```text
User / current event
→ SimCore authority + exposure/source eligibility
→ SourceProjectionEnvelope / semantic sidecar
→ main-model semantic generation
→ validation
→ presentation renderer
→ source-scoped DOM/CSS
```

3M-3 should now treat the exact producer/consumer flow as a first-class design artifact rather than only naming a schema.

Disposition:

```text
PASS · 3M_3_MUST_FREEZE_EXACT_STATE_DATA_EFFECT_FLOW
```

### 2.3 RCR-D13 relevance to 3.0M

3M-3 validation must prove joins, not just individual objects.

Expected future boundary checks include:

```text
sourceAuthorityRef
↔ actual Handoff/Evidence authority class

assertionMode
↔ allowed exposure disposition

exposure policy receipt
↔ assertion eligibility

validated semantic payload
↔ renderer registry family

renderer output
↔ semantic payload identity without mutation

canonical source invalidation
↔ derived object invalidation/rebuild when later required
```

A schema-valid assertion with an invalid authority join must fail.

Disposition:

```text
PASS · CROSS_BOUNDARY_VALIDATION_BECOMES_EXPLICIT_3M_3_REQUIREMENT
```

### 2.4 RCR-C09 relevance to 3.0M

When an authority-bearing writer/replacement mechanism is proposed, establish a validator first.

This matches the current 3M sequencing unusually well:

```text
3M-1 compatibility envelope
→ 3M-2 assertion eligibility contract
→ 3M-3 structured sidecar + validator
→ 3M-4 presentation renderer
→ later family writers/interactions only when justified
```

Therefore 3M-3 should not start by building a persistent source writer or UI mutation owner.

Preferred first executable form remains:

```text
structured object construction
+ deterministic validation
+ shadow/offline equivalence where possible
```

before broader active writers or persistence.

Disposition:

```text
PASS · VALIDATOR_FIRST_DIRECTION_CONFIRMED
```

---

## 3. Common Agent Skill status changed materially

The earlier SimCore common review classified:

```text
plugin-impact-scope = DIRECTLY RELEVANT METHODOLOGY / MANUAL PILOT FIRST
```

Since then the repository has implemented the skill itself under:

```text
.agents/skills/plugin-impact-scope/
```

with:

```text
SKILL.md
scripts/discover_impact.py
scripts/validate_impact_map.py
evals/*
```

However its validated scope remains explicitly:

```text
plugin:usage-dashboard
```

and the skill itself rejects other plugin scopes as `UNVALIDATED_SCOPE`.

Therefore:

```text
PLUGIN_IMPACT_SCOPE_IMPLEMENTED = YES
SIMCORE_VALIDATED_SCOPE = NO
SIMCORE_AUTO_USE_AUTHORITY = NO
```

SimCore may continue to borrow the methodology manually, as already done by Context Projection and Exposure impact scoping, but must not claim the common skill has been validated for SimCore.

Classification:

```text
WATCH · COMMON_PLUGIN_IMPACT_SCOPE_SIMCORE_SCOPE_UNVALIDATED
```

Possible future action only if useful:

```text
Usage Dashboard pilot evidence
→ explicit second-scope SimCore compatibility review
→ bounded SimCore eval
→ only then validated-scope expansion
```

This is not required for 3M-3 design and must not block current 3.0M document work.

---

## 4. New Agent Skill eval lesson: claim-specific evidence compatibility

Recent `plugin-impact-scope` output-eval work discovered that merely requiring a registered evidence ID is insufficient.

A model could reuse a real evidence ID for a semantically unrelated claim and still look structurally grounded.

The common eval tooling therefore added claim-specific evidence compatibility.

Conceptual rule:

```text
EVIDENCE EXISTS
!=
EVIDENCE IS VALID FOR THIS CLAIM TYPE
```

This is directly useful to 3M-3.

A future SourceAssertion must not be considered valid merely because it contains some valid `sourceAuthorityRef`.

The validator should require compatible evidence/authority for the exact claim class.

Examples:

```text
CONFIRMED_FACT
→ requires an exposure/public basis compatible with confirmed-fact eligibility

ATTRIBUTED_SOCIAL
→ requires attributed social-context support

INFERENCE_OPINION
→ requires visible-cue / permissible inference support for the bounded first slice

HANDOFF_EVIDENCE
→ proves source relationship, but does not by itself prove audience exposure
```

Canonical 3M implication:

```text
VALID AUTHORITY REF
!=
VALID ASSERTION AUTHORITY FOR EVERY ASSERTION MODE
```

Disposition:

```text
ADOPT_AS_3M_3_VALIDATOR_DESIGN_INPUT
```

No runtime change is authorized by this review.

---

## 5. New Agent Skill eval lesson: derived verdict, not model-owned verdict

The newest common Agent Skill eval repair removed a redundant model-authored top-level impact verdict.

Instead, the validator mechanically derives the verdict from already validated evidence bases.

The important general lesson is:

```text
MODEL PRODUCES SEMANTIC CONTENT / DECLARED FIELDS
VALIDATOR DERIVES SAFETY / ACCEPTANCE DISPOSITION
```

not:

```text
MODEL SAYS "PASS"
→ SYSTEM TRUSTS PASS
```

This aligns strongly with the intended SimCore role boundary.

For 3M-3, preferred direction:

```text
main model emits bounded source semantic fields
→ parser/normalizer
→ validator checks schema + authority compatibility + exposure policy
→ validator derives acceptance/disposition
→ renderer consumes validated payload only
```

The model should not be the final authority for fields conceptually equivalent to:

```text
isValid
isPubliclyAllowed
safeToRenderAsFact
canonicalTruth
```

unless those fields are treated as untrusted proposals and independently recomputed.

Candidate future validator dispositions may be mechanically derived from 3M-2 policy and structural checks rather than model-declared.

Classification:

```text
ADOPT_AS_3M_3_CORE_VALIDATION_PRINCIPLE
```

---

## 6. Keep qualitative model-eval truth separate from mechanical pair validity

The common Agent Skill eval harness also keeps:

```text
mechanical pair validity
!=
qualitative winner / semantic quality
```

A pair can be mechanically valid while neither response is good enough.

This mirrors Exposure work:

```text
CORPUS PASS
!=
MODEL COMPLIANCE PASS
```

and should carry into future Source Intelligence validation:

```text
SCHEMA_VALID
!=
SEMANTICALLY_GOOD_OUTPUT

HOST_CAPTURE_VALID
!=
MODEL_FOLLOWS_POLICY

RENDERER_VALID
!=
SOURCE_ASSERTION_CORRECT
```

Disposition:

```text
PASS · EXISTING_3M_EXPOSURE_EVIDENCE_MODEL_ALREADY_ALIGNED
```

---

## 7. Shared host/plugin invariants newly worth carrying forward

The repository now preserves several PocketRisu-derived plugin invariants reviewed by other plugins.

They are not automatically SimCore contracts, but some are relevant future guardrails.

### 7.1 Performance cache is not semantic authority

General lesson:

```text
cache residency / cache equality
!=
semantic provenance / identity / user intent / source truth
```

3.0M relevance is high in principle because source presentation may eventually cache derived views.

Do not allow a renderer/source cache to become authority for:

```text
source identity
exposure status
assertion validity
whether a source changed
whether a reroll descendant remains supported
```

Classification:

```text
ADOPT_AS_3M_ARCHITECTURAL_GUARDRAIL
```

### 7.2 Serialized schema keys retain historical meaning

General lesson:

```text
existing persisted key
must not be reused for a new semantic meaning
merely because the value type fits
```

3M-1 and 3M-2 currently add no persistent schema, so there is no immediate action.

If a later source family introduces persistence, allocate explicit source-state fields or a reviewed migration rather than reinterpreting old Community/Core state slots.

Classification:

```text
DEFER · 3M_PERSISTENT_SCHEMA_COMPATIBILITY_UNTIL_A_REAL_PERSISTENCE_REQUIREMENT
```

### 7.3 Pending intent outranks stale cache/server state while persistence is in flight

This host storage rule is relevant only if Source Intelligence later owns persisted mutable state.

Current 3M foundation prefers zero new persistent schema, so no port or local storage owner is justified now.

Classification:

```text
DEFER · SOURCE_STORAGE_READ_YOUR_WRITE_UNTIL_PERSISTENT_SOURCE_STATE_EXISTS
```

### 7.4 Optimistic rollback requires operation generation/token ownership

A newly preserved PocketRisu invariant shows that value equality is insufficient rollback ownership proof.

For overlapping same-key writes, a stale failed operation may roll back only while its unique operation generation/token is still current.

This is potentially important if a future Source Intelligence UI introduces optimistic mutable state such as:

```text
source-local edits
source post creation
source reroll replacement
optimistic source UI writes
persistent derived state
```

But current 3M-1/2 and intended first 3M-3 foundation do not need such a writer.

Classification:

```text
DEFER · SOURCE_OPTIMISTIC_WRITE_GENERATION_UNTIL_AN_ACTUAL_MUTABLE_SOURCE_WRITER_EXISTS
```

Do not prebuild a generation subsystem just because the pattern exists.

### 7.5 Persist before host runtime reload

The host owns durable save/reload sequencing.

3.0M must not invent a second host flush/reload mechanism merely for source state.

Classification:

```text
PASS · HOST_RELOAD_AUTHORITY_REMAINS_EXTERNAL / NO_LOCAL_REPLACEMENT
```

### 7.6 Permission identity remains host-owned and capability-specific

If a future renderer/source family needs additional host APIs, rely on host permission authority rather than caching or inventing local permission grants.

No current 3M checkpoint needs a new host capability.

Classification:

```text
DEFER · NO_NEW_HOST_CAPABILITY_REQUIRED
```

---

## 8. Does any new common information invalidate 3M-0 / 3M-1 / 3M-2?

No.

### 3M-0

The Source Intelligence master design already:

```text
separates semantic and presentation authority
reuses existing owners
avoids generic persistence
keeps source-derived content non-canonical
requires bounded validation
```

The new common rules strengthen this direction.

### 3M-1

The legacy compatibility envelope already:

```text
uses existing Community / Reaction / Structure / Handoff / Evidence owners
assertions[] = []
no persistent schema
no prompt/output byte change
first runtime form = SHADOW_COMPAT_ONLY if later authorized
```

This is strongly consistent with RCR-D11/C09.

### 3M-2

The assertion/exposure contract already separates:

```text
source/event support
!=
audience exposure
```

and refuses to pretend arbitrary natural-language exposure semantics are mechanically proven.

The new common claim/evidence compatibility and mechanically-derived-verdict patterns strengthen the future validator shape, but do not require reopening 3M-2.

Canonical verdict:

```text
REOPEN_3M_0 = NO
REOPEN_3M_1 = NO
REOPEN_3M_2 = NO
```

---

## 9. Updated 3M-3 design requirements from this refresh

The next 3M design checkpoint remains:

```text
3M-3 · STRUCTURED SIDECAR + VALIDATION
```

Add these explicit requirements to its design input:

1. **Narrow owner**
   - do not create a generic semantic graph or second Lineage system.

2. **Exact flow map**
   - freeze producer → normalization → policy/authority validation → validated sidecar → renderer consumer.

3. **Cross-boundary joins are first-class**
   - validate authority-reference compatibility, assertion-mode compatibility, exposure disposition, and family/renderer joins.

4. **Claim-specific evidence compatibility**
   - a valid evidence reference cannot authorize every claim class.

5. **Derived validator disposition**
   - final accept/deny/hold/safe-to-render disposition should be mechanically derived from validated fields/policy, not trusted from a model self-verdict.

6. **No automatic canonical promotion**
   - validated source assertion remains derived unless an existing canonical owner independently establishes truth.

7. **Validator before writer**
   - no persistent source writer, shared publisher, or active UI mutation owner is required for the first 3M-3 proof.

8. **Mechanical validity and model quality remain separate**
   - schema/validator PASS cannot substitute for semantic model-compliance evidence.

9. **No new persistence by default**
   - storage/read-your-write/write-generation lessons remain deferred until a concrete source family proves persistence necessary.

10. **Cache remains non-authority**
    - any future source/render cache must be performance-only unless a separately reviewed semantic owner contract says otherwise.

---

## 10. Classifications

### PASS

```text
PASS · 3M_0_REMAINS_VALID
PASS · 3M_1_REMAINS_VALID
PASS · 3M_2_REMAINS_VALID
PASS · RCR_D11_D12_D13_C09_ALIGNMENT
PASS · VALIDATOR_FIRST_DIRECTION
PASS · EXISTING_EXPOSURE_EVIDENCE_SEPARATION
```

### WATCH

```text
WATCH · COMMON_PLUGIN_IMPACT_SCOPE_SIMCORE_SCOPE_UNVALIDATED
```

This does not block 3M work. Manual source-backed impact methodology remains valid.

### DEFER

```text
DEFER · PLUGIN_IMPACT_SCOPE_SIMCORE_SECOND_SCOPE_EVAL
DEFER · 3M_PERSISTENT_SCHEMA_COMPATIBILITY_UNTIL_REQUIRED
DEFER · SOURCE_STORAGE_READ_YOUR_WRITE_UNTIL_PERSISTENCE_EXISTS
DEFER · SOURCE_OPTIMISTIC_WRITE_GENERATION_UNTIL_MUTABLE_WRITER_EXISTS
DEFER · NEW_HOST_PERMISSION_CAPABILITY_UNTIL_REQUIRED
```

### FIX / BLOCKER

```text
FIX = NONE
BLOCKER = NONE
```

---

## 11. Final refresh state

```text
COMMON_LAYER_REFRESH                       = COMPLETE
NEW_PROMOTED_COMMON_RULES                  = RCR-D11 / RCR-D12 / RCR-D13 / RCR-C09
PLUGIN_IMPACT_SCOPE_SKILL                  = IMPLEMENTED
PLUGIN_IMPACT_SCOPE_VALIDATED_SCOPE        = plugin:usage-dashboard ONLY
SIMCORE_SKILL_SCOPE                        = UNVALIDATED / NON_BLOCKING
CLAIM_SPECIFIC_EVIDENCE_COMPATIBILITY      = ADOPT AS 3M-3 DESIGN INPUT
MECHANICALLY_DERIVED_VERDICT_PATTERN       = ADOPT AS 3M-3 CORE VALIDATION INPUT
PERFORMANCE_CACHE_AS_SEMANTIC_AUTHORITY    = FORBIDDEN GUARDRAIL
PERSISTENT_SOURCE_STATE                    = STILL NOT JUSTIFIED
OPTIMISTIC_SOURCE_WRITE_GENERATION         = DEFER UNTIL REAL WRITER EXISTS
3M_0_REOPEN                                = NO
3M_1_REOPEN                                = NO
3M_2_REOPEN                                = NO
NEXT_3M_DESIGN                             = 3M-3 STRUCTURED SIDECAR + VALIDATION
PRODUCTION                                 = UNCHANGED
S7 / v0.70.3                               = UNCHANGED
release-simcore                            = UNCHANGED
```
