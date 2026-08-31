# SimCore Reference Analysis — LightBoard Light Status Window 2.1.0 (Inner Thoughts Toggle)

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
[🔦😋가벼운 상태창 2.1.0 - 속마음 온오프].module.charx
```

Original bytes: `29046`

Original SHA-256:

```text
20f5e14296a81db164adf2c6ca3dc710630e0d85521649a948fe461919f42bc9
```

Archive authority:

```text
references/simcore-plugin-idea-drop-2026-09-01/
```

This is a user-supplied LightBoard-family reference delivered in the same 2026-09-01 Proton Drive ZIP bundle as 2.0.0. It is analyzed as a reference and as a direct differential successor to the already archived 2.0.0 artifact. No production or release authority is implied.

---

## 1. Outer CHARX anatomy

The artifact contains the same four-entry package shape as 2.0.0:

```text
x_meta/main.json              15 bytes
assets/icon/image/main.png   624 bytes
module.risum               12432 bytes
card.json                  15442 bytes
```

Card identity:

```text
spec         = chara_card_v3
spec_version = 3.0
name         = [🔦😋가벼운 상태창 2.1.0 - 속마음 온오프]
creator_notes= 라이트보드 연동 속마음 온오프로 표시하는 간단 상태창
```

RisuAI extension still declares:

```text
lowLevelAccess = true
viewScreen     = none
utilityBot     = false
```

The visible toggle surface adds exactly one new axis:

```text
mestatusme.innerthoughts = 속마음 = 켜기 / 끄기
```

The prior axes remain:

```text
mestatusme.mode   = 끄기 / 메인 / 보조
mestatusme.lazy   = 즉시 / 누르면
mestatusme_lang   = 영어 / 한국어 / 일본어
mestatusme_status = 끄기 / 켜기
```

---

## 2. Embedded module anatomy

`module.risum` decodes successfully with the same RPack shape.

```text
name        = [🔦😋가벼운 상태창 2.1.0 - 속마음 온오프] Module
id          = 5b991ebb-a44f-4154-a03e-fa38764baddf
6 lorebooks
1 regex
1 trigger
0 embedded module assets
```

As in 2.0.0, the outer card's six `character_book` entries are string-identical to the six embedded module lorebooks. The duplicate-authority drift risk therefore remains.

---

## 3. Exact 2.0.0 → 2.1.0 change surface

The update is deliberately narrow.

Unchanged semantic/runtime pieces:

```text
manifest.lb          unchanged
mestatusme.lb.job    unchanged
mestatusme.lb.onOutput unchanged
lazy-button regex    unchanged
icon bytes           unchanged
```

Changed pieces:

```text
mestatusme.lb.format     conditional innerthoughts field
mestatusme.lb            conditional generation/output contract
mestatusme.lb.onValidate conditional validator contract
renderer trigger         conditional display of innerthoughts row
card toggle declaration  adds mestatusme.innerthoughts
module/card identity     version/name/id metadata
```

This is useful because the feature change crosses every layer that owns the optional field without perturbing unrelated parts.

Classification:

```text
P1 · STRONG · VERTICAL_FEATURE_GATE_CLOSURE
```

---

## 4. End-to-end optional projection field

2.0.0 always required `innerthoughts`. 2.1.0 turns it into a true optional projection dimension.

When enabled (`toggle value 0`):

```text
prompt format includes innerthoughts
→ generation rules require innerthoughts
→ validator requires a non-empty innerthoughts string
→ renderer displays the inner-thought row
```

When disabled (`toggle value 1`):

```text
prompt format omits innerthoughts
→ generation rules forbid producing inner thoughts
→ validator rejects an unexpected innerthoughts key
→ renderer suppresses the row
```

This is much stronger than a CSS-only hide toggle because semantic generation, validation, and presentation agree on the same feature boundary.

Potential SimCore abstraction:

```text
FEATURE POLICY
→ PROJECTION SCHEMA
→ GENERATION CONTRACT
→ VALIDATOR CONTRACT
→ PRESENTATION CONTRACT
```

A disabled semantic field should normally cease to exist upstream rather than merely be hidden downstream.

Classification:

```text
P1 · STRONG · CONTRACT_CLOSED_OPTIONAL_FIELD
```

---

## 5. Improvement over 2.0.0: inner-thought optionality is now real

The 2.0.0 renderer had an optional CSS class for `innerthoughts`, but the validator always required the field to be non-empty. Thus the renderer's optional path could not represent a validator-approved omitted thought field.

2.1.0 resolves that specific contradiction:

```text
2.0.0:
renderer can hide missing row
BUT validator requires row data

2.1.0:
feature toggle decides whether row exists
AND validator follows same decision
```

This is a useful example of closing a latent presentation/schema mismatch through one explicit policy owner.

Classification:

```text
P1 · POSITIVE DELTA · VALIDATION_PRESENTATION_ALIGNMENT
```

---

## 6. Private-state provenance remains the central caution

The new toggle improves control but does not solve the epistemic issue by itself.

When enabled, the prompt still asks the model to infer a private thought for each active character. Therefore:

```text
TOGGLE ON
!=
PRIVATE THOUGHT BECOMES CANONICAL FACT
```

A future SimCore version should separate at least:

```text
explicitly established private state
inferred private-state projection
unknown / withheld private state
```

and preserve provenance so a generated thought cannot feed back into canonical continuity merely because it appeared in a polished status panel.

Classification:

```text
P1 PRINCIPLE · PRIVATE_STATE_PROVENANCE_GATE
DO_NOT_TRANSFER · INFERRED_PRIVATE_THOUGHT_AS_CANONICAL_FACT
```

---

## 7. Schema-first scene snapshot remains strong

The five always-required fields remain:

```text
date
time
location
characters
others
```

`innerthoughts` becomes conditionally present.

The artifact therefore evolves from a fixed six-field schema to a small policy-shaped schema while retaining the useful boundary:

```text
RECENT NARRATIVE STATE
→ BOUNDED DERIVED OBJECT
→ VALIDATION
→ PRESENTATION
```

This reinforces the 2.0.0 `Schema-First Derived Scene Snapshot` finding rather than replacing it.

---

## 8. Conservative continuity rules are unchanged

The same continuity policy remains intact:

```text
recent explicit facts
> conservative inference
> stale older-scene details
```

The feature update does not couple private-thought visibility to date, time, location, clothing, presence, or other scene continuity fields. This is a good example of keeping projection axes orthogonal.

Classification:

```text
P1/P2 · REINFORCEMENT · ORTHOGONAL_PROJECTION_AXIS
```

---

## 9. Validation-before-presentation remains useful

The validator still rejects missing `<mestatusme>`, multiple nodes, malformed JSON, or empty required fields.

2.1.0 additionally verifies the conditional field contract:

```text
inner thoughts enabled  → field required and non-empty
inner thoughts disabled → field must be absent
```

This is stronger than silently ignoring a semantically forbidden field.

Potential SimCore lesson:

```text
if policy disables a field,
validator may reject its presence instead of letting hidden semantic residue survive
```

Classification:

```text
P1 · STRONG · POLICY_AWARE_VALIDATION
```

---

## 10. Escaped presentation materialization is unchanged

The renderer still normalizes line breaks, runs semantic strings through `prelude.escEntities`, then converts newlines to `<br>`.

That remains a better pattern than directly interpolating model-originated strings into HTML.

Classification:

```text
P1/P2 · REINFORCING · ESCAPED_PRESENTATION_MATERIALIZATION
```

---

## 11. Bounded render horizon and failure quarantine remain unchanged

Historical panels older than roughly five chat positions are not richly re-rendered. The display transformation is wrapped in `pcall`, and malformed data degrades to either a bounded error panel or original data rather than mutating canonical state.

These continue to reinforce:

```text
BOUNDED_RENDER_HORIZON
PRESENTATION_FAILURE_QUARANTINE
```

---

## 12. WATCH · no-extra-keys validator gap still remains

The prompt says:

```text
Do not use any additional keys.
```

The validator checks the five required fields and treats `innerthoughts` specially, but it still does not iterate through the object and reject every unknown key.

Therefore a payload with an extra unrelated key can still pass static validator logic.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_VALIDATOR_EXTRA_KEY_GAP
NOT A SIMCORE DEFECT
```

This was already present conceptually in 2.0.0 and remains unresolved in 2.1.0.

---

## 13. WATCH · `others` optional-render path is still contract-inconsistent

The renderer still marks `others` as `mestatusme-optional` and `addRow` skips empty values.

But the validator still requires `others` to be a non-empty string, with `None` used when nobody qualifies.

Thus the renderer has an empty/missing presentation path that a valid semantic payload normally cannot exercise.

2.1.0 fixes this mismatch for `innerthoughts` but not for `others`.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_OTHERS_OPTIONALITY_DRIFT
NOT A SIMCORE DEFECT
```

---

## 14. WATCH · duplicate card/module lorebook authority remains

All six lorebook contents are still serialized twice:

```text
outer card character_book
embedded module.risum lorebook
```

They match in this artifact, but any future edit can drift unless one copy is generated from or verified against the other.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_DUPLICATE_CONTRACT_AUTHORITY
```

---

## 15. WATCH · broad low-level permission remains

The card and trigger still declare `lowLevelAccess=true`. Static evidence in the decoded renderer primarily shows lorebook lookup, rendering, edit-display listening, and bounded UI interaction. This does not establish that the broad permission is required.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_PRIVILEGE_SCOPE
```

---

## 16. WATCH · icon extension/encoding drift remains identical

The icon path remains:

```text
assets/icon/image/main.png
```

but the bytes are WebP (`RIFF ... WEBP`). The icon bytes are exactly unchanged from 2.0.0.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_ASSET_EXTENSION_ENCODING_DRIFT
```

---

## 17. Dynamic prelude dependency remains a non-transfer pattern

The trigger still resolves `lightboard-prelude` by lorebook name and executes its text with `load()`.

Positive lesson:

```text
shared helper dependency has a named contract point
```

But SimCore should prefer a versioned, explicit capability surface rather than dynamically executing unversioned lorebook text.

Classification:

```text
DO_NOT_TRANSFER · UNVERSIONED_DYNAMIC_EXECUTABLE_DEPENDENCY
```

---

## 18. 2.0.0 vs 2.1.0 conclusion

The important lesson is not the existence of a checkbox. It is how narrowly and consistently the checkbox is carried through the system.

```text
2.0.0
fixed six-field derived snapshot

2.1.0
five-field core snapshot
+ policy-gated private-state field
+ aligned generation
+ aligned validation
+ aligned presentation
```

This is a strong reference for future SimCore optional projections, debug fields, audience-specific fields, or capability-gated sidecar sections.

Best reusable rule:

```text
A semantic feature toggle should own the field from generation boundary to renderer boundary.
Do not generate forbidden data merely to hide it later.
```

---

## 19. Final classification

```text
REFERENCE_ONLY
PRODUCTION_UNCHANGED
NO_IMPLEMENTATION_AUTHORITY
```

Promising concepts:

```text
P1  VERTICAL_FEATURE_GATE_CLOSURE
P1  CONTRACT_CLOSED_OPTIONAL_FIELD
P1  VALIDATION_PRESENTATION_ALIGNMENT
P1  POLICY_AWARE_VALIDATION
P1  PRIVATE_STATE_PROVENANCE_GATE
P1  SCHEMA_FIRST_DERIVED_SNAPSHOT reinforcement
P1/P2 ORTHOGONAL_PROJECTION_AXIS reinforcement
P1/P2 ESCAPED_PRESENTATION_MATERIALIZATION reinforcement
P2  BOUNDED_RENDER_HORIZON reinforcement
```

Do not transfer directly:

```text
INFERRED_PRIVATE_THOUGHT_AS_CANONICAL_FACT
UNVERSIONED_DYNAMIC_EXECUTABLE_DEPENDENCY
DISPLAY_STRINGS_AS_CANONICAL_STATE
```

WATCH:

```text
UPSTREAM_REFERENCE_VALIDATOR_EXTRA_KEY_GAP
UPSTREAM_REFERENCE_OTHERS_OPTIONALITY_DRIFT
UPSTREAM_REFERENCE_DUPLICATE_CONTRACT_AUTHORITY
UPSTREAM_REFERENCE_PRIVILEGE_SCOPE
UPSTREAM_REFERENCE_ASSET_EXTENSION_ENCODING_DRIFT
```

No SimCore runtime or release change is authorized by this analysis.
