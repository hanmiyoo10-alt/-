# SimCore Diagnostic Reason-Code Stability Contract — Idea / Research

Date: 2026-08-25
Status: `IDEA RECORDED · DIAGNOSTIC REASON-CODE VOCABULARY / STABILITY CONTRACT · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Related:
- `docs/SIMCORE_DIAGNOSTIC_ATTRIBUTION_CLARITY_IDEA.md`
- `docs/SIMCORE_DIAGNOSTIC_SNAPSHOT_FRESHNESS_CONTRACT_IDEA.md`
- `docs/SIMCORE_WARNING_NOTIFICATION_DESIGN.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_GUIDELINES.md`

## 1. Purpose

Define stability rules for diagnostic reason codes so SimCore can explain existing semantic results consistently across:

```text
diagnostic panel
copied diagnostic report
future warning-detail surfaces
static fixtures
repo evidence
```

without turning diagnostics into a second semantic authority.

The previous Diagnostic Attribution Clarity design separates:

```text
RESULT
REASON
OWNER
SOURCE
FRESHNESS
```

This document narrows only the `REASON` dimension.

Primary question:

```text
How can one diagnostic reason keep a stable machine identity
while human wording, formatting and presentation evolve safely?
```

This is an observability/data-contract design only.

It does not authorize:

```text
new semantic validators
new runtime decisions
new warning severity
new SnapshotStore state
new prompt semantics
new network calls
new timers
work-branch implementation
release-simcore deployment
```

## 2. Core split: identity vs presentation

A diagnostic reason must conceptually separate machine identity from human presentation.

```text
reasonId
= stable machine-readable semantic identity

humanLabel
= compact reader-facing wording

description
= optional bounded explanatory wording
```

Example shape:

```ts
{
  reasonId: "PROBE_VISIBLE_INDEX_MISMATCH",
  owner: "DIAGNOSTIC_BINDING",
  sourceClass: "MECHANICAL_DERIVED",
  humanLabel: "probe and visible turn differ"
}
```

The exact runtime representation is not frozen here.

Important:

```text
human wording change
!= reason identity change

reason identity change
= semantic contract change
```

## 3. Reason code is not the semantic result

Do not collapse `result` and `reasonId`.

Example:

```text
result:
  NOT_EXERCISED

reasonId:
  PROBE_VISIBLE_INDEX_MISMATCH
```

is different from:

```text
result:
  NOT_EXERCISED

reasonId:
  NO_CURRENT_REQUEST_CONTEXT
```

Likewise:

```text
result:
  REPRESENTATION_FAST_RECONCILED

reasonId:
  PRIOR_FRESH_REPRESENTATION_MATCH
```

The result remains owned by the original semantic producer.

The reason code only explains why that owned result is shown.

## 4. Authority rule

Reason IDs may originate from only three source classes defined by the Attribution Clarity contract:

```text
OWNER_DIRECT
MECHANICAL_DERIVED
UNATTRIBUTED
```

### OWNER_DIRECT

The semantic owner already exposes or deterministically owns the underlying reason discriminator.

Examples:

```text
not-direct-post-b-end-c
explicit-b-end
b-end-terminal-after-narrative
```

A diagnostic stability layer may normalize these into stable reason IDs, but must preserve the owner's meaning.

### MECHANICAL_DERIVED

A bounded diagnostic rule maps explicit existing facts to a reason code without re-running semantics.

Example:

```text
probe index != visible current index
→ PROBE_VISIBLE_INDEX_MISMATCH
```

### UNATTRIBUTED

The result is known but no defensible cause is available.

Example:

```text
STORE_BACKEND_SET spike
→ internal host/backend cause unknown
→ UNATTRIBUTED
```

Do not invent a more specific reason merely to avoid `UNATTRIBUTED`.

## 5. Stable reasonId rules

A `reasonId` should be:

```text
UPPER_SNAKE_CASE
short but specific
content-free
owner-aligned
stable across panel/copy/widget formatting
stable across localization
stable across wording cleanup
```

Prefer predicate/outcome semantics rather than implementation helper names.

Good:

```text
PROBE_VISIBLE_INDEX_MISMATCH
NO_CURRENT_REQUEST_CONTEXT
PRIOR_OUTPUT_EXACT_MATCH
PRIOR_FRESH_REPRESENTATION_MATCH
VISIBLE_BODY_DIVERGED_FROM_CANONICAL_AND_FRESH
EXPLICIT_B_END
NOT_DIRECT_POST_B_END_C
B_END_TERMINAL_AFTER_NARRATIVE
OUTPUT_CALLBACK_NOT_CURRENT
DOM_SURFACE_UNAVAILABLE
```

Avoid:

```text
CHECK_17_FAILED
SESSION_HELPER_FALSE
HANDLEPREV_BRANCH_4
TEMP_FIX_PATH
OLD_CODE_REASON
```

Reason IDs describe meaning, not source-line topology.

## 6. Namespace discipline without unnecessary verbosity

Do not require every reason ID to repeat its owner name if the ID is already unambiguous.

For example:

```text
EDIT_RECONCILE_PRIOR_FRESH_REPRESENTATION_MATCH
```

may be unnecessarily verbose when the attribution record already contains:

```text
owner = EDIT_RECONCILE
reasonId = PRIOR_FRESH_REPRESENTATION_MATCH
```

Use an owner prefix only when two real owners would otherwise produce semantically different reasons with the same apparent ID.

Goal:

```text
stable + specific
not globally verbose by default
```

## 7. Human wording is presentation ABI, not semantic ABI

Human-facing wording may evolve for clarity without changing `reasonId` when semantics are unchanged.

Example:

```text
reasonId:
PROBE_VISIBLE_INDEX_MISMATCH

old label:
"stale probe"

new label:
"runtime probe does not match the visible turn"
```

This is a presentation-only change.

However, a wording change that quietly changes meaning is not presentation-only.

Example:

```text
reasonId:
PROBE_VISIBLE_INDEX_MISMATCH

label changed to:
"host chat rewound"
```

is invalid because the existing evidence does not establish a host rewind.

Human wording must remain no stronger than the reason code's authority.

## 8. Stable IDs must not be recycled

Once a reason ID has shipped as a durable diagnostic contract, do not reuse it later for a different meaning.

Forbidden:

```text
v1
NO_CURRENT_REQUEST_CONTEXT
= no request-bound probe exists

later
NO_CURRENT_REQUEST_CONTEXT
= request exists but output callback is stale
```

These are different reasons and require different IDs.

Rule:

```text
same reasonId
→ same semantic meaning
```

Implementation ownership may move during architecture work if meaning is preserved, but that owner transfer must be explicit and mechanically verified.

## 9. Rename and deprecation policy

A reason ID rename should be rare.

Rename only when the old identity itself is misleading, ambiguous or violates the frozen owner boundary.

Conceptual migration states:

```text
ACTIVE
DEPRECATED_ALIAS
RETIRED
```

Example:

```text
oldId: STALE_PANEL
newId: PROBE_VISIBLE_INDEX_MISMATCH
status: DEPRECATED_ALIAS
```

If an alias is temporarily accepted for compatibility:

```text
old ID may be read
new producer emits only canonical new ID
fixtures prefer canonical ID
new docs use canonical ID
```

Do not maintain aliases forever merely to avoid cleanup.

## 10. Semantic-change rule

If the underlying reason meaning changes, do not silently preserve the old ID.

Possible outcomes:

```text
same meaning, new wording
→ same reasonId

same meaning, implementation moved
→ same reasonId + explicit owner-transfer evidence if owner changes

narrower or broader semantic predicate
→ review required; usually new reasonId

different semantic cause
→ new reasonId

old reason no longer applicable
→ RETIRED
```

Reason stability must protect meaning, not textual spelling.

## 11. Owner transfer during M2 architecture work

Architecture extraction may move implementation responsibility while preserving external behavior.

Example:

```text
prior owner path:
Session / Runtime reconcile decision tree

future owner:
edit-reconcile application service
```

If the semantic predicate remains exactly:

```text
current == prior Fresh representation
under the protected representation-drift conditions
```

then:

```text
reasonId = PRIOR_FRESH_REPRESENTATION_MATCH
```

may remain stable while the recorded `owner` changes to the new canonical owner.

This requires differential/equivalence evidence.

Do not change the reason ID merely because code moved modules.

Do not keep the old owner label after authority transfer is completed.

## 12. Reason vocabulary should be producer-aligned, not formatter-owned

Panel, copy report and widget must not maintain independent private reason dictionaries.

Preferred conceptual flow:

```text
existing owner fact / bounded diagnostic binding fact
        ↓
canonical attribution projection
        ↓
reasonId
        ↓
panel formatter
copy formatter
future detail UI
```

Forbidden:

```text
panel reason vocabulary A
copy reason vocabulary B
widget reason vocabulary C
```

The formatter may choose different human wording density, but the canonical `reasonId` must remain the same.

## 13. No reverse parsing

Never treat rendered human text as the source of reason identity.

Forbidden:

```text
"Probe context: STALE"
→ regex
→ infer PROBE_VISIBLE_INDEX_MISMATCH
```

because `STALE` may later have more than one defensible reason.

Correct direction:

```text
bounded source facts
→ reasonId
→ rendered text
```

not:

```text
rendered text
→ reasonId
```

## 14. UNKNOWN / UNATTRIBUTED / NOT_APPLICABLE stability

These are not interchangeable fallbacks.

Recommended distinction:

```text
UNATTRIBUTED
= result known; cause not defensibly known

UNKNOWN_REASON
= a reason is expected but current diagnostic evidence cannot determine which one

NOT_APPLICABLE
= no reason is required because the subject/path does not apply

UNAVAILABLE
= required observation source is absent
```

Exact machine schema belongs to implementation design if this track is promoted.

Do not encode all four as empty string or `n/a`.

## 15. Reason ID and severity must remain separate

A reason ID does not inherently define operational severity.

For example:

```text
PROBE_VISIBLE_INDEX_MISMATCH
```

may explain a safe diagnostic binding refusal without implying a runtime correctness failure.

Likewise:

```text
DOM_SURFACE_UNAVAILABLE
```

may describe a UI-only fallback.

Do not build:

```text
reasonId prefix
→ Critical / High / Medium severity
```

unless a future separate severity authority is explicitly designed and evidence-backed.

The existing Warning authority remains unchanged.

## 16. Reason ID and WATCH/FIX/BLOCKER must remain separate

Repository triage classification is operational evidence management, not the same contract as runtime diagnostic reasons.

```text
reasonId
= why one observed result exists

WATCH / DEFER / FIX / BLOCKER
= repo-level disposition of an evidence family
```

Do not encode repository triage into runtime reason IDs.

Example:

```text
PROBE_VISIBLE_INDEX_MISMATCH
```

may currently belong to a `WATCH_ONLY / OBSERVABILITY` evidence family, but `WATCH_ONLY` is not part of the reason ID.

## 17. Privacy and content boundary

Reason IDs and labels must remain content-free.

Allowed:

```text
semantic predicate names
owner names
binding/freshness state
bounded structural categories
```

Forbidden:

```text
raw user text embedded into reasonId
assistant body fragments
system prompt fragments
unbounded exception text
private host payloads
```

Parameterized explanation, if ever needed, must use bounded typed fields separate from the stable reason ID.

Example:

```text
reasonId: PROBE_VISIBLE_INDEX_MISMATCH
probeIndex: 2062
visibleIndex: 2060
```

rather than:

```text
reasonId: "PROBE_2062_VISIBLE_2060_MISMATCH"
```

## 18. Versioning model

Do not create one giant reason-vocabulary version that forces unrelated owners to rev together.

Preferred model if machine-readable material is later implemented:

```text
attributionEnvelopeVersion
+ optional reasonVocabularyVersion for transport/registry shape
+ stable reasonId semantics per entry
```

A new reason can usually be additive.

Changing the meaning of an existing reason ID is a breaking semantic change even if the outer registry schema version does not change.

The reason vocabulary version is not:

```text
SimCore runtime version
SnapshotStore schema version
Prompt Cache ABI
Gemini cache ABI
release-system version
```

These version domains remain separate.

## 19. Candidate registry shape — CI/docs first

If implementation is later justified, prefer a static/CI-first registry rather than a runtime service.

Conceptual row:

```ts
{
  reasonId: "PRIOR_FRESH_REPRESENTATION_MATCH",
  owner: "EDIT_RECONCILE",
  sourceClass: "OWNER_DIRECT",
  status: "ACTIVE",
  semanticSummary: "Current visible prior assistant matches the trusted prior Fresh representation under the protected representation-drift predicate.",
  humanLabel: "prior Fresh representation matched"
}
```

Possible checks:

```text
duplicate reasonId
missing owner
unknown owner
retired ID still emitted
alias cycle
same ID mapped to conflicting semantic summaries
human wording stronger than semantic summary
consumer private reason not registered
```

Do not add a dynamic reason-code registry service/event bus solely for diagnostics.

## 20. Candidate CI failures

Future static validation may use narrow failure classes such as:

```text
DIAGNOSTIC_REASON_DUPLICATE_ID
DIAGNOSTIC_REASON_UNKNOWN_ID
DIAGNOSTIC_REASON_OWNER_MISMATCH
DIAGNOSTIC_REASON_MEANING_DRIFT
DIAGNOSTIC_REASON_RETIRED_ID_EMITTED
DIAGNOSTIC_REASON_ALIAS_CYCLE
DIAGNOSTIC_REASON_UNDECLARED_RENAME
DIAGNOSTIC_REASON_HUMAN_WORDING_OVERCLAIM
DIAGNOSTIC_REASON_PRIVATE_CONSUMER_VOCABULARY
DIAGNOSTIC_REASON_REVERSE_PARSE_DEPENDENCY
DIAGNOSTIC_REASON_PRIVACY_BOUNDARY_VIOLATION
```

These are future CI/design concepts, not runtime warning strings.

## 21. Candidate fixture matrix

If this design is implemented later, useful static fixtures include:

```text
1. same reasonId renders differently in compact panel vs copied report
   → semantic identity remains identical

2. human wording changes only
   → no semantic ABI failure

3. existing reasonId changes semantic predicate
   → FAIL

4. reasonId reused by different owner with different meaning
   → FAIL

5. architecture owner transfer with proven semantic equivalence
   → reasonId preserved, owner updated

6. deprecated alias accepted as legacy input
   → canonical output emits new ID

7. retired reason emitted by current producer
   → FAIL

8. UNKNOWN/UNATTRIBUTED remains explicit
   → no guessed specific reason

9. warning widget consumes count only
   → no independent reason vocabulary

10. no raw content in ID/label metadata

11. diagnostic freshness reason remains distinct from runtime failure reason

12. existing semantic golden controls unchanged
```

## 22. Relationship to neighboring contracts

```text
Diagnostic Snapshot Freshness Contract
= WHICH observation snapshot is current/bound/stale

Diagnostic Attribution Clarity
= WHAT happened, WHY, WHO owns it, SOURCE, FRESHNESS

Diagnostic Reason-Code Stability Contract
= how WHY receives a durable machine identity without freezing human wording

Warning Notification Surface
= compact exceptional signal; consumes existing warning authority and opens diagnostics for detail
```

None of these contracts may become a second semantic validator.

## 23. Implementation gate

Do not implement a reason registry solely because this design exists.

Implementation becomes worthwhile when:

```text
freshness repair is promoted
warning mini implementation needs shared diagnostic detail
M2 ownership extraction changes reason ownership surfaces
diagnostic wording cleanup is selected as its own scoped mini
repeated panel/copy reason inconsistency appears naturally
```

Even then:

```text
static/typed projection first
runtime service last / probably unnecessary
```

## 24. Current classification

```text
SIMCORE_DIAGNOSTIC_REASON_CODE_STABILITY
= HIGH VALUE DIAGNOSTIC CONTRACT
= STABLE MACHINE ID / FLEXIBLE HUMAN WORDING
= OWNER-ALIGNED
= NO ID RECYCLING
= EXPLICIT RENAME / DEPRECATION
= ARCHITECTURE-TRANSFER AWARE
= NO REVERSE PARSING
= UNKNOWN / UNATTRIBUTED PRESERVING
= SEVERITY-INDEPENDENT
= TRIAGE-INDEPENDENT
= CONTENT-FREE
= CI-FIRST IF PROMOTED
= NO RUNTIME SERVICE REQUIRED

runtime change: NONE
prompt byte change: NONE
SnapshotStore change: NONE
renderer responsibility change: NONE
release-system change: NONE
```
