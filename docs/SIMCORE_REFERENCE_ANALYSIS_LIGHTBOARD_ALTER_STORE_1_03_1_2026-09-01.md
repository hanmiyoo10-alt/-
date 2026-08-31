# SimCore Reference Analysis — LightBoard Alter Store 1.03.1

Date: 2026-09-01 KST

Status: **REFERENCE ANALYSIS · IDEA EXTRACTION ONLY · NO IMPLEMENTATION AUTHORITY**

Subject:

```text
🛒라이트보드 알터 스토어 Ver.1.03.1.risum
```

Original bytes: `46348`

Original SHA-256:

```text
c4dae1d170b6c9cd506f15f1c646a51639e745cbeb8851d30342f97714ca1bd9
```

Archive authority:

```text
references/simcore-plugin-idea-drop-2026-09-01/
```

This is a user-supplied LightBoard-family reference. The analysis does not authorize code reuse, does not change SimCore runtime/release state, and does not modify `release-simcore`, `plugins/simcore/latest.js`, or `plugins/simcore/install.js`.

---

## 1. Decode and artifact anatomy

The file is a legacy RisuAI `.risum` module and decoded successfully using the RPack container shape.

Decoded identity:

```text
name            = 🛒라이트보드 알터 스토어 Ver.1.03
description     = 얼터너티브 헌터 시스템 상점 모듈
namespace       = lb-store
id              = a6385b1d-26a4-4754-80a3-c147a5c114e9
lowLevelAccess  = false
displayOrder    = 2300
```

Observed components:

```text
6 lorebooks
6 regex scripts
1 trigger script
0 assets
```

The toggle surface exposes:

```text
mode       = 끄기 / 메인 / 보조
lazy       = 즉시 / 누르면
quantity   = 3-5 / 5-8 / 8-12
categories = free text
rarity     = 자유 / 일반위주 / 레어위주 / 희귀위주
context    = 포함 / 제거
diversity  = X / 강화
darkness   = 설정 / 해제
```

The manifest declares:

```text
identifier=lb-store
authorsNote=false
charDesc=true
loreBooks=true
rerollBehavior=preserve-prev
lazy=true
```

The semantic sidecar shape is:

```text
<lb-store name="..." desc="...">
[BALANCE:...]
[Item]Name:...|Price:...|Rarity:...|Category:...|Stock:...|Description:...|Effect:...
...
</lb-store>
```

Visible interactions include:

```text
Buy
Detail
Refresh
RequestItem
Loan
Reroll
```

---

## 2. Executive finding

Alter Store is particularly useful as a reference because it combines **derived inventory projection, user interaction, fictional currency transition, bounded historical lookup, and renderer affordance gating** without broad low-level access.

Approximate pipeline:

```text
world/status context
+ optional recent narrative context
→ generated store projection
→ structured item/balance sidecar
→ renderer parses current projection
→ user emits typed store intent
→ interaction generation emits transition markers + refreshed projection
→ presentation hides machine-facing transition tags
```

The strongest transferable ideas are:

1. **Transaction Event / Projection Separation**
2. **Affordance Derived from Current Projection**
3. **Typed Interaction Intent Instead of Direct UI Mutation**
4. **Context-Aware vs Context-Free Generation as an Orthogonal Axis**
5. **Bounded State Recovery from Recent History**
6. **Graceful Renderer Failure Quarantine**
7. **Least-Privilege Presentation Runtime**

The strongest caution is:

> A model-generated projection must not become the authority for canonical balance, inventory, debt, or other state merely because the UI renders it consistently.

---

## 3. Transaction event and projection are separate concepts

A purchase interaction produces both a transition marker and a new store projection:

```text
[COIN:-3500:구매]
...
<lb-store>
[BALANCE:11500]
...
</lb-store>
```

A loan similarly emits:

```text
[COIN:+5000:대출]
[LOAN:원금:5000:이자:500:상환일:...]
...
<lb-store>
[BALANCE:...]
...
</lb-store>
```

This reveals a useful architecture distinction:

```text
TRANSACTION EVENT
!=
CURRENT PROJECTION
```

A transaction expresses a requested/accepted change. A projection expresses what the derived view now claims the state to be.

Potential SimCore form:

```text
user intent
→ owning semantic transaction
→ canonical state transition
→ derived projection/render
```

The event should be validated and applied by the owner of canonical state. The LLM-produced display projection should not be the transaction authority.

Classification:

```text
P1 · PROMISING · STATE/INTERACTION ARCHITECTURE
```

---

## 4. Dual-authority hazard in BALANCE handling

The module asks the model to:

1. recover prior `[BALANCE:xxx]`,
2. subtract purchase price or add loan amount,
3. emit the new balance,
4. emit a separate `[COIN:...]` transition marker.

The renderer then trusts `[BALANCE]` to decide whether a purchase button is visually affordable.

This creates two representations of the same logical change:

```text
transition marker
+
derived balance arithmetic
```

They can disagree if generation or arithmetic drifts.

Safer SimCore rule:

```text
ONE CANONICAL STATE OWNER

transaction intent/event
→ owner validates and applies
→ canonical balance/state
→ renderer receives projection
```

Do not ask a generative sidecar to maintain canonical arithmetic state across turns.

Classification:

```text
DO_NOT_TRANSFER · MODEL_AUTHORED_CANONICAL_LEDGER
PROMISING · TRANSACTION/PROJECTION SPLIT
```

---

## 5. Affordance gating from semantic projection

The renderer parses item price and the current projected coin balance and derives UI state:

```text
canAfford = currentCoin >= itemPrice
```

It then changes presentation:

```text
affordable   → 구매
affordance
unaffordable → 💸 부족 + disabled styling
```

The useful principle is not the exact coin logic. It is:

```text
SEMANTIC STATE
→ DERIVED UI AFFORDANCE
```

The presentation layer does not invent a separate purchase rule. It derives availability from the semantic object it receives.

For SimCore, any future interactive sidecar should prefer owner-provided capability/eligibility state over duplicating business rules in the renderer.

Classification:

```text
P1/P2 · PROMISING · PRESENTATION CONTRACT
```

---

## 6. Typed interaction intents

Buttons emit narrow action-shaped messages such as:

```text
Buy/{item} ...
Detail/{item} ...
Refresh/...
RequestItem/...
Loan/...
```

The renderer itself does not call `setChat`, mutate historical data, or write canonical store state.

This is substantially cleaner than broad UI mutation patterns found in some other references.

Transferable principle:

```text
UI
→ typed/narrow intent
→ semantic owner
→ validated state/output
```

A future SimCore implementation should improve this further by using opaque target identity or structured intent rather than embedding human-readable item names in magic action strings.

Classification:

```text
P1 · PROMISING · INTENT_ONLY_INTERACTION
```

---

## 7. Context-aware vs context-free generation

The module exposes an explicit context axis:

```text
context = 포함
→ use recent situation, character needs and world context

context = 제거
→ produce a generic catalog without current-scene dependence
```

This is a clean example of separating **generation policy** from **presentation type**.

Potential SimCore lesson:

```text
CONTEXT PARTICIPATION
should be explicit and owner-scoped
```

The same output surface can have different context apertures without becoming different subsystem types.

This reinforces:

- Owner-Scoped Context Projection,
- Bounded Context Aperture,
- Orthogonal Projection Axes.

Classification:

```text
P1/P2 · PROMISING · REINFORCES CONTEXT PROJECTION
```

---

## 8. Bounded historical recovery

When the current store block lacks `[BALANCE]`, the renderer scans only a bounded recent range:

```text
searchRange = min(chatLen, 20)
```

This is preferable to unbounded full-chat scanning.

Transferable principle:

```text
RECOVERY LOOKBACK SHOULD BE BOUNDED
```

However, the renderer is still recovering semantic state from rendered/chat text rather than from an owner-provided state object. That is a reference limitation, not the preferred SimCore architecture.

Classification:

```text
PROMISING PRINCIPLE · BOUNDED_RECOVERY
DO_NOT_TRANSFER · CHAT_TEXT_AS_CANONICAL_DATABASE
```

---

## 9. Multi-lifetime behavior

The module distinguishes at least three lifetimes:

```text
semantic/store data lifetime
model-context lifetime
active rendered lifetime
```

Evidence:

- `Ignore Old` gates store blocks in later prompt processing to a recent window,
- display rendering returns raw data unchanged for sufficiently old messages,
- lazy generation is independently available,
- reroll preserves previous data according to manifest behavior.

This reinforces the LightBoard-family principle:

```text
stored lifetime
!= model-context lifetime
!= render lifetime
```

Classification:

```text
P2 · STRONG REINFORCEMENT · MULTI_LIFETIME_SIDECAR
```

---

## 10. Renderer failure quarantine

The trigger protects both extraction and rendering using `pcall`.

At the outer display layer:

```text
failure → return original data
```

Within an individual block:

```text
block failure → emit bounded error marker
```

This limits presentation failure blast radius and preserves upstream semantic content.

Classification:

```text
P1 · PROMISING · PRESENTATION_FAILURE_QUARANTINE
```

---

## 11. Least-privilege runtime behavior

The module declares:

```text
lowLevelAccess = false
```

The observed trigger performs bounded chat reads for balance recovery and presentation rendering, but no historical `setChat` rewrite or other broad mutation was observed.

This is a useful contrast with references that request broad low-level authority merely to support presentation interaction.

Transferable principle:

```text
INTERACTIVE UI DOES NOT IMPLY BROAD MUTATION AUTHORITY
```

Classification:

```text
P1 · POSITIVE REFERENCE · LEAST_PRIVILEGE
```

---

## 12. Fictional loan mechanics expose state-authority requirements

The Loan flow asks the model to derive:

```text
rank-based maximum
10% weekly interest
current in-game date + 7 days
debuff consequences
new balance
```

As game flavor, this is coherent. Architecturally, it demonstrates why generated state transitions need an explicit owner.

A future SimCore sidecar must not invent canonical due dates, balances, penalties or state transitions simply because a prompt supplies arithmetic rules.

Safer abstraction:

```text
sidecar proposes/requests transaction
→ canonical owner validates time/rank/rules
→ owner commits transition
→ sidecar renders result
```

Classification:

```text
DESIGN LESSON · CANONICAL_OWNER_REQUIRED
DO_NOT_TRANSFER · GENERATIVE_TRANSACTION_AUTHORITY
```

---

## 13. Delimiter-heavy payload remains non-canonical

The module uses compact text protocols:

```text
[BALANCE:...]
[COIN:...:...]
[LOAN:...]
[Item]Name:...|Price:...|...
```

This is practical for a bounded plugin but fragile as canonical state because user/generated text can contain delimiters, fields can drift, and validation is limited.

Classification:

```text
DO_NOT_TRANSFER AS CANONICAL SIMCORE STATE
```

If equivalent semantics become necessary, prefer typed/validated data with explicit identity and provenance.

---

## 14. Item identity is name-based

Purchase/detail intents identify an item by visible item name:

```text
Buy/{item.Name}
Detail/{item.Name}
```

That works when names are unique and stable, but name text is presentation data rather than a strong semantic identity.

Potential safer pattern:

```text
item_id → semantic record
item_name → presentation label
```

Classification:

```text
WATCH · PRESENTATION_NAME_AS_TARGET_IDENTITY
```

---

## 15. WATCH · version label drift

The uploaded filename is:

```text
Ver.1.03.1
```

but the decoded internal module name is:

```text
🛒라이트보드 알터 스토어 Ver.1.03
```

No separate internal version field was observed that resolves this difference.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_VERSION_LABEL_DRIFT
NOT A SIMCORE DEFECT
```

Do not patch the archived source.

---

## 16. WATCH · rarity toggle appears unwired

The visible toggle surface declares:

```text
lb-store.rarity=등 급=select=자유,일반위주,레어위주,희귀위주
```

But no reference to `toggle_lb-store.rarity` was found in the decoded lorebook prompts, trigger, or CSS.

Other custom controls such as quantity, categories, context, diversity and darkness have observable consumers.

This suggests the rarity preference control may be stale/unwired in this artifact.

Classification:

```text
WATCH · UPSTREAM_REFERENCE_RARITY_TOGGLE_UNWIRED
NOT A SIMCORE DEFECT
```

Live RisuAI behavior was not executed here, so this remains a static-source finding.

---

## 17. Relationship to existing LightBoard research

Alter Store reinforces:

```text
Owner-Scoped / Bounded Context Projection
Semantic Payload / Renderer Decoupling
Intent-Only Renderer Boundary
Presentation Failure Quarantine
Multi-Lifetime Sidecar
Least-Power UI Surface
```

It adds an especially useful stateful-interaction refinement:

```text
A. TRANSACTION_EVENT != CURRENT_PROJECTION
B. CANONICAL_STATE_OWNER must validate/apply the transaction
C. UI affordance should derive from owner-provided semantic eligibility
D. bounded history recovery is better than unbounded scanning, but not a substitute for state ownership
```

This is one of the stronger LightBoard references for thinking about future **interactive derived sidecars** because it makes the authority problem visible without relying on broad runtime privilege.

---

## 18. Final classification

```text
REFERENCE QUALITY                         = HIGH
DIRECT CODE REUSE AUTHORITY               = NONE
SIMCORE FEATURE AUTHORITY                 = NONE

TRANSACTION_EVENT_PROJECTION_SPLIT        = P1 PROMISING
CANONICAL_STATE_OWNER_REQUIREMENT         = P1 PROMISING PRINCIPLE
INTENT_ONLY_INTERACTION                   = P1 PROMISING
PRESENTATION_FAILURE_QUARANTINE           = P1 PROMISING
LEAST_PRIVILEGE_RUNTIME                   = P1 POSITIVE REFERENCE
CONTEXT_AWARE_CONTEXT_FREE_AXIS           = P1/P2 PROMISING
AFFORDANCE_FROM_SEMANTIC_STATE            = P1/P2 PROMISING
BOUNDED_HISTORY_RECOVERY                  = P2 PROMISING PRINCIPLE
MULTI_LIFETIME_SIDECAR                    = P2 REINFORCING

MODEL_AUTHORED_CANONICAL_LEDGER           = DO_NOT_TRANSFER
GENERATIVE_TRANSACTION_AUTHORITY          = DO_NOT_TRANSFER
CHAT_TEXT_AS_CANONICAL_DATABASE           = DO_NOT_TRANSFER
DELIMITER_CANONICAL_STATE                 = DO_NOT_TRANSFER
PRESENTATION_NAME_AS_TARGET_IDENTITY      = WATCH
VERSION_LABEL_DRIFT                       = WATCH / UPSTREAM
RARITY_TOGGLE_UNWIRED                     = WATCH / UPSTREAM
```

No runtime implementation is authorized by this analysis.

---

## 19. Suggested catalog delta

When the LightBoard-only idea catalog is next re-synthesized, consider adding or strengthening:

```text
LB-Ixx · Transaction Event / Projection Separation
LB-Ixx · Canonical State Owner for Interactive Sidecars
LB-Ixx · Semantic Eligibility → UI Affordance
```

These should remain research concepts until a concrete SimCore product problem requires an interactive stateful sidecar.
