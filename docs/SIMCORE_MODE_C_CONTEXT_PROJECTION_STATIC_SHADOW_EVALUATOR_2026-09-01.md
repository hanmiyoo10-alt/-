# SimCore Mode C Context Projection Static Shadow Evaluator — 2026-09-01

Date: 2026-09-01 KST

Status: **OFFLINE STATIC SHADOW EVALUATOR IMPLEMENTED · LOCAL REGRESSION PASS · NO RUNTIME AUTHORITY**

Classification: **CONTEXT PROJECTION · ROOT_PREFIX_CUT · OFFLINE / STATIC / SHADOW ONLY**

This document records the first implementation-adjacent artifact authorized by the frozen `Mode C Lineage-Scoped Context Projection Contract`.

It does not modify the SimCore plugin runtime, `release-simcore`, S7, request construction, persistent state, provider behavior, or active request pruning.

---

## 1. Authority

Primary design authority:

- `docs/SIMCORE_MODE_C_LINEAGE_SCOPED_CONTEXT_PROJECTION_CONTRACT_2026-09-01.md`
- `docs/SIMCORE_CONTEXT_PROJECTION_IMPACT_SCOPE_2026-09-01.md`

Current production remains independently owned by `release-simcore`; this evaluator does not consume or mutate deployed plugin bytes.

The branch was started from current `main` after the frozen projection contract. The only intervening main change after that contract was unrelated backup-snapshot design documentation, so no SimCore runtime/S7/common-rule premise changed before this transaction.

---

## 2. Files

```text
products/simcore/tooling/context-projection-shadow-evaluator.mjs
products/simcore/tooling/context-projection-shadow-evaluator.test.mjs
docs/SIMCORE_MODE_C_CONTEXT_PROJECTION_STATIC_SHADOW_EVALUATOR_2026-09-01.md
```

The implementation follows the existing SimCore tooling convention of a small deterministic `.mjs` helper plus a sibling `node:assert/strict` regression file.

---

## 3. Scope boundary

The evaluator models exactly one frozen candidate:

```text
ROOT_PREFIX_CUT
```

It does not discover semantic relevance, search history, select a source, infer Lineage, or reproduce production Evidence mapping.

Instead, an offline fixture supplies already-resolved authority facts:

```text
mode
sourceAnchoredShortC
evidenceDisposition
rootIndex
sourceIndex
currentUserIndex
messages[]
```

These names are **evaluator fixture fields, not production runtime API fields**.

That distinction is intentional. The evaluator consumes a hypothetical already-authorized Evidence/Lineage result rather than becoming a second Evidence/Lineage implementation.

---

## 4. Role classification

For static fixtures only, request rows are conservatively classified as:

```text
user                 -> USER
assistant / char     -> ASSISTANT
system               -> NON_CONVERSATION
developer            -> NON_CONVERSATION
tool                  -> NON_CONVERSATION
function              -> NON_CONVERSATION
anything else         -> UNKNOWN
```

Policy:

```text
UNKNOWN = KEEP
NON_CONVERSATION = KEEP
```

Only ordinary `USER` / `ASSISTANT` rows can ever become a `ROOT_PREFIX_CUT` candidate.

`char` is accepted as an assistant-class fixture role so host-shaped offline examples can be modeled without granting it any new runtime meaning.

---

## 5. Eligibility

A fixture can produce an eligible shadow plan only when:

```text
mode = C
sourceAnchoredShortC = true
evidenceDisposition = DUAL
root/source/current indices are valid
root role = USER
source role = ASSISTANT
current role = USER
root < source < current user
claimed source is the first assistant-class row after the root
```

Otherwise the result is either:

```text
INELIGIBLE
```

for a non-target contract path, or:

```text
FALLBACK
```

for malformed/unsafe supplied authority.

Neither path produces candidate exclusions.

---

## 6. Frozen projection rule

For an eligible fixture:

```text
index < rootIndex
  + role USER/ASSISTANT
    -> CANDIDATE_EXCLUDE

index < rootIndex
  + NON_CONVERSATION/UNKNOWN
    -> KEEP

index >= rootIndex
    -> KEEP unconditionally
```

Therefore the complete root-to-request-tail slice is preserved.

That includes, when present in a fixture:

```text
root evidence
source evidence
same-lineage follow-ups
current user
post-current system/runtime tail
unknown host metadata
```

The evaluator performs no selective pruning inside the root-to-current lineage slice.

---

## 7. Shadow-only result contract

Every result explicitly carries:

```text
executionMode = SHADOW_ONLY
applied = false
activeProjectionAuthorized = false
```

Eligible plans also report bounded static metadata:

```text
originalMessages
originalContentChars
projectedMessages
projectedContentChars
candidateExcludedMessages
candidateExcludedContentChars
candidateExcludedIndices
keptIndices
unknownKeptCount
contentReductionRatio
semanticSafety
```

Important precision boundary:

`ContentChars` counts fixture message-content characters only. It is not a claim about provider tokenization, serialized API-body bytes, billing, or cache behavior.

When a candidate cut exists:

```text
semanticSafety = UNPROVEN_REVIEW_REQUIRED
```

The evaluator never converts structural reducibility into semantic safety.

---

## 8. Hypothetical materialization

`materializeHypotheticalProjection()` exists only to let offline tests inspect the shape of the candidate view.

It does not mutate the supplied fixture or authorize runtime request materialization.

For ineligible/fallback/no-reduction cases it returns a shallow copy of the original message array.

For an eligible shadow plan it filters only the already-computed candidate indices.

---

## 9. Regression matrix implemented

The sibling test covers:

### Eligible root-prefix cut

```text
pre-root user + assistant -> candidate exclude
pre-root system/tool -> keep
pre-root unknown -> keep
root/source/current/runtime tail -> keep
shadow planner -> input unchanged
candidate char accounting -> exact
```

### No-reduction positive control

```text
system before first conversation root -> keep
no pre-root conversation -> ELIGIBLE_NO_REDUCTION
```

### Isolation / fail-open

```text
Evidence ROOT_ONLY -> INELIGIBLE
Mode A -> INELIGIBLE
source anchor not proven -> INELIGIBLE
invalid source index -> FALLBACK
claimed source not first assistant after root -> FALLBACK
```

### Host-shaped conservative roles

```text
char -> assistant-class conversation fixture
unknown role -> KEEP
 developer -> KEEP
```

### Recomputed boundary

A fixture with a changed supplied root proves that the candidate boundary is recomputed from current authority rather than reusing a prior shadow plan.

---

## 10. Local execution evidence

The exact authored files were executed locally with:

```text
node context-projection-shadow-evaluator.test.mjs
```

Result:

```text
context-projection-shadow-evaluator: PASS
```

The local test was rerun after adding exact candidate-character accounting assertions.

This is deterministic offline evidence only; it is not live/runtime evidence.

---

## 11. What this implementation proves

It proves that the frozen static contract can be represented without ambiguity as a deterministic fixture algorithm:

```text
MUST_KEEP non-conversation/unknown
MUST_KEEP root-to-tail slice
candidate-only pre-root ordinary conversation
DUAL-only entry
unsafe supplied anchors fail open
input remains unchanged
bounded reduction accounting is deterministic
```

It also proves the evaluator can remain outside production runtime and outside S7.

---

## 12. What it does not prove

It does **not** prove:

```text
pre-root facts are semantically unnecessary
active request pruning is safe
ROOT_PREFIX_CUT improves model quality
ROOT_PREFIX_CUT improves latency
ROOT_PREFIX_CUT improves provider cache behavior
fixture roles exactly reproduce every host request shape
production Evidence should change
production Lineage should change
runtime shadow implementation is currently authorized
```

The central unresolved question remains semantic dependency across the root boundary.

---

## 13. Active-promotion boundary remains frozen

The design contract still requires pre-root dependency-trap evidence before any active pruning amendment.

Examples remain:

```text
relationship established only before root
nickname/entity identity established only before root
"as before" anaphora
cross-source comparison/recap/reuse
numeric baseline established before root
```

This evaluator intentionally cannot decide those semantic questions.

It can only identify the exact prefix that a future shadow observation would ask humans/tests to evaluate.

---

## 14. Runtime/S7 boundaries

This transaction changes:

```text
release-simcore                       = NO
plugins/simcore/latest.js             = NO
plugins/simcore/install.js            = NO
persistent state/schema               = NO
request hook/runtime behavior         = NO
TAIL_AFTER_CURRENT_USER               = NO
Evidence runtime semantics            = NO
Lineage runtime semantics             = NO
Handoff runtime semantics             = NO
S7 candidate/design                   = NO
v0.70.2 / v0.70.3 identity            = NO
```

Only offline tooling/test/documentation is added on `main`.

---

## 15. Classification of findings

### FIX

None discovered in the final authored evaluator after local regression.

### WATCH

`WATCH · STATIC_ROLE_MODEL_IS_FIXTURE_ONLY`

The role classifier is deliberately an offline fixture abstraction. A future runtime-shadow preflight must freshly re-read then-current host/request role shapes and production Evidence mapping rather than importing this fixture classification as runtime authority.

### DEFER

```text
runtime shadow probe
real long-chat shadow observations
pre-root dependency-trap classification
active projection amendment
broader Summary/A/B/C projection
```

### BLOCKER

None for the offline evaluator itself.

Active pruning remains blocked by design, not by an evaluator failure.

---

## 16. Next legitimate Context Projection action

The offline evaluator closes the implementation-adjacent static phase.

The next Context Projection action should **not** be active pruning.

Depending on release/S7 disposition at that time, the next bounded action is one of:

```text
A. build additional supplied-fixture/dependency-trap corpus around this evaluator
or
B. after the required production/S7 preflight, design a runtime SHADOW-ONLY observer
```

Any runtime observer must begin from fresh production authority and must preserve the actual request byte/order contract.

---

## 17. Final state

```text
MODE_C_PROJECTION_CONTRACT              = DESIGN_FROZEN
OFFLINE_STATIC_SHADOW_EVALUATOR         = IMPLEMENTED
OFFLINE_REGRESSION                       = PASS
PROJECTION_CANDIDATE                    = ROOT_PREFIX_CUT
STATIC_ENTRY                             = C + SOURCE_ANCHORED_SHORT_C + DUAL
STATIC_UNKNOWN_POLICY                    = KEEP
STATIC_NON_CONVERSATION_POLICY           = KEEP
STATIC_ROOT_TO_TAIL_POLICY               = KEEP
INPUT_MUTATION                           = NONE
ACTIVE_PROJECTION                        = NOT_AUTHORIZED
PERSISTENT_SCHEMA                        = NONE
RUNTIME_CHANGE                           = NONE
PRODUCTION_CHANGE                        = NONE
S7_CHANGE                                = NONE
NEXT                                     = DEPENDENCY_TRAP_FIXTURES_OR_POST_S7_RUNTIME_SHADOW_PREFLIGHT
```
