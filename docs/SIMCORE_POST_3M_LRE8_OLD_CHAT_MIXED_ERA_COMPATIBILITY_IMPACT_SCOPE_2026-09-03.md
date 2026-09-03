# SimCore Post-3.0M LRE-8 Old-Chat / Mixed-Era Compatibility Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-8 IMPACT SCOPE FROZEN · DESIGN-ONLY · LC5 READ-ONLY COMPATIBILITY TARGET · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-8 · OLD CHAT · MIXED ERA · READ COMPATIBILITY**

## 0. Purpose

LRE-8 maps the smallest compatibility surface required after capability-local LC4 prospective legacy-context retirement.

Question:

```text
How can pre-migration assistant messages containing legacy <COMMUNITY>
coexist safely with new structured-era messages,
without old prose becoming current Source authority,
without converting history,
and without confusing passive read, manual edit, reroll, reload, or chat navigation?
```

This checkpoint is design-only. It does not implement or deploy any change.

## 1. Authority chain

Consumes:

```text
LRE master
LRE-1 Production + Host Coupling
LRE-5 Structured Semantic-Owner Cutover
LRE-6 Structured Presentation Cutover
LRE-7 Prospective Legacy Context Retirement
3M-6 Current Projection Support / Invalidation
3M-7 Context Re-entry / Source History
3M-9 Source-Irrelevant Baseline
M2 Edit Reconcile / Representation ownership contracts
current production Community reader/parser behavior
```

Production authority remains `release-simcore`.

## 2. Fresh design snapshot

```text
main = 3a39fcc5aba149284cd281a6f294b24fc7434510
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1
```

Any runtime implementation must re-run G1 against then-current production and target host.

## 3. Target LC5 state

The master target after LRE-8 is conceptually:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC for migrated capability
P = P1 STRUCTURED PRESENTATION for migrated capability
H = H2 LEGACY_CONTEXT_PREEXISTING_ONLY for migrated capability
R = R1 LEGACY_READ_ONLY_COMPAT STABLE
```

LRE-8 primarily closes R and mixed-era lifecycle semantics.

## 4. Central law

```text
HISTORICAL LEGACY READABILITY
!=
CURRENT SOURCE AUTHORITY
```

Old Community may remain visible and present in ordinary host transcript.

It may not become:

```text
trusted structured assertion input
current Source-job trigger
current public-exposure proof
current provenance descendant
structured Source persistence seed
mutation target for structured interaction
```

## 5. Era is provenance, not message position

A message is not classified merely by index, age, or visual location.

Canonical law:

```text
ERA CLASSIFICATION
= generation / migration provenance
NOT
= messageIndex threshold
```

Therefore:

```text
old stored message passively reopened
→ historical legacy era

old message manually edited
→ historical/user-edited legacy representation
→ no new structured generation

old message rerolled and a new assistant generation commits
→ classify the replacement by THEN-CURRENT runtime/stage/capability
→ may become a structured-era generation even at an old message index
```

## 6. Candidate compatibility owner

Select:

```text
MixedEraCompatibilityClassifierV1
```

This owner classifies only bounded message/runtime compatibility state.

It is not a Source semantic classifier.

Candidate states:

```text
LEGACY_HISTORICAL
LEGACY_HISTORICAL_USER_EDITED
STRUCTURED_CURRENT_RUNTIME
STRUCTURED_COMMITTED_NO_LIVE_BINDING
UNMIGRATED_LEGACY_CURRENT
UNKNOWN_COMPATIBILITY
```

Exact names remain design-level until implementation preflight.

## 7. Read-only legacy owner

Select:

```text
LegacyCommunityReadOnlyAdapterV1
```

Allowed:

```text
recognize structurally bounded historical <COMMUNITY>
preserve old visible representation
support old-chat compatibility diagnostics
leave historical bytes untouched
```

Forbidden:

```text
parse prose into SourceAssertion
infer current exposure
create SourceProjectionEnvelope
create Candidate C object
rewrite old message into structured schema
append new replies/mutations to old Community
```

## 8. Passive read / reload

Passive opening or reload must not perform migration writes.

Expected mixed-era asymmetry:

```text
old legacy message
→ stored Community remains readable

new LC4 structured-era message
→ stored Community absent
→ ephemeral structured card may be absent after reload
```

This asymmetry is accepted by first-major read-only architecture.

## 9. Manual edit boundary

Manual edit of a historical legacy message is a representation mutation, not a new Source generation.

Required:

```text
old legacy message edited
→ preserve as legacy/history representation
→ invalidate any stale presentation/runtime binding associated with that message
→ do not synthesize structured Source semantics
→ do not backfill Source provenance
```

If the edit removes or changes Community, the historical message simply reflects the user's edit.

## 10. Reroll boundary

Reroll/re-generation is different from manual edit.

A newly generated assistant replacement is evaluated under current runtime authority.

Required:

```text
reroll event
→ old runtime/presentation binding invalid
→ new request/generation gets new current authority evaluation
→ current SourceJobSelector and migration stage decide whether structured lane applies
```

Forbidden:

```text
old message contained Community
→ reroll must preserve Community because index is old
```

or:

```text
old Community prose
→ seed new structured proposal
```

## 11. Historical Community in ordinary model context

LRE-8 does not rewrite host history before model request construction.

Therefore old Community may still appear in ordinary host context.

Canonical distinction:

```text
MODEL MAY SEE HISTORICAL COMMUNITY THROUGH NORMAL TRANSCRIPT
!=
SIMCORE MAY USE HISTORICAL COMMUNITY AS CURRENT SOURCE AUTHORITY
```

No special Source-history scan or re-entry path is added.

## 12. Navigation isolation

Chat/branch/character navigation must not carry current structured binding across scopes.

Required:

```text
switch chat / branch / character
→ current ephemeral Source presentation binding from previous scope unusable
→ old Community in destination remains passive legacy content
→ no Source activation caused by destination history alone
```

## 13. Identical-content isolation

Legacy and structured-era messages may contain identical ordinary prose.

Content equality cannot determine era.

Forbidden:

```text
same content hash
→ same compatibility era
→ same Source binding
```

Use provenance/current runtime receipts and host identity/currentness where available.

## 14. Old parser retirement boundary

LRE-8 does not require deleting the legacy Community parser.

First stable target:

```text
R1 LEGACY_READ_ONLY_COMPAT
```

not:

```text
R2 LEGACY_PARSER_RETIRED
```

Parser/adapter code may remain for old-chat read compatibility so long as it cannot write or create Source authority.

## 15. No historical normalization job

Forbidden:

```text
scan all old chats
→ label every message era
→ rewrite metadata
```

LRE-8 uses lazy/bounded current-surface classification where needed.

No persistent era database is introduced.

## 16. Source-irrelevant baseline

Ordinary chats and messages with no current Source job must not trigger:

```text
whole-history Community scan
mixed-era migration pass
legacy-to-structured conversion
Source validator
network/model/background work
```

Historical compatibility is passive unless the host is actually rendering/reading the relevant old message.

## 17. Edit Reconcile relationship

Existing Representation / Edit Reconcile remains authority for host-message representation mutation.

LRE-8 must not become a second edit-repair owner.

Required ownership split:

```text
Representation/Edit Reconcile
→ did stored message representation change?

MixedEraCompatibilityClassifier
→ what compatibility policy applies to the now-current representation?

Source Intelligence
→ only current authorized generation may create current structured Source semantics
```

## 18. Candidate mixed-era receipt

A bounded diagnostic receipt may contain only state, never prose:

```text
MixedEraCompatibilityReceiptV1
  messageScope
  eraClass
  operation
  legacyBlockCount
  structuredBindingStatus
  sourceActivationFromHistory = false
  historicalRewritePerformed = false
  disposition
```

No persistent receipt history is authorized.

## 19. Closed operation vocabulary

```text
PASSIVE_READ
RELOAD
MANUAL_EDIT
REROLL_REGENERATION
CHAT_SWITCH
BRANCH_SWITCH
CHARACTER_SWITCH
```

## 20. Core impact seam

Selected seam:

```text
ERA_PROVENANCE_READ_ISOLATION_V1
```

Meaning:

1. legacy old-chat reader stays read-only;
2. era follows provenance, not index/content;
3. passive history never triggers current Source authority;
4. manual edit stays representation-only;
5. reroll is a new generation and is evaluated under current stage;
6. navigation invalidates current ephemeral bindings;
7. no history rewrite or persistent era ledger.

## 21. Protected non-impact boundaries

LRE-8 must not:

```text
change Source semantics
change Exposure policy
change LC4 zero-write law
re-enable legacy bridge
persist structured sidecars
activate Candidate C
add automatic Source context re-entry
change unmigrated B-family legacy ownership
rewrite historical messages
add a global history scanner
```

## 22. BLOCKER candidates

```text
BLOCKER · HISTORICAL_COMMUNITY_PROMOTED_TO_CURRENT_SOURCE_AUTHORITY
BLOCKER · ERA_INFERRED_FROM_MESSAGE_INDEX_ONLY
BLOCKER · ERA_INFERRED_FROM_CONTENT_EQUALITY
BLOCKER · MANUAL_EDIT_AUTO_CONVERTS_LEGACY_TO_STRUCTURED_SOURCE
BLOCKER · REROLL_REUSES_OLD_COMMUNITY_AS_STRUCTURED_SEED
BLOCKER · CHAT_NAVIGATION_LEAKS_EPHEMERAL_SOURCE_BINDING
BLOCKER · OLD_CHAT_OPEN_TRIGGERS_HISTORY_MIGRATION_WRITE
BLOCKER · LEGACY_READER_GAINS_WRITE_AUTHORITY
BLOCKER · MIXED_ERA_COMPAT_ADDS_PERSISTENT_ERA_DB
BLOCKER · HISTORY_SCAN_GROWS_WITH_CHAT_LENGTH
```

## 23. WATCH / DEFER

```text
WATCH · HISTORICAL_COMMUNITY_REMAINS_IN_NORMAL_MODEL_TRANSCRIPT
WATCH · STRUCTURED_EPHEMERAL_CARD_MAY_NOT_REAPPEAR_AFTER_RELOAD
WATCH · EQUAL_VALUE_MANUAL_EDIT_EVENT_SIGNAL_REMAINS_HOST_DEPENDENT

DEFER · R2 LEGACY PARSER REMOVAL
DEFER · DURABLE STRUCTURED CARD REPLAY / CANDIDATE C
DEFER · GLOBAL B_START/B_CONTINUE/B_END LEGACY RETIREMENT
DEFER · BULK HISTORICAL CONVERSION
```

## 24. Acceptance direction

LRE-8 detailed design must provide a matrix proving at design level:

```text
legacy historical × passive read/reload/edit
structured current × render/reroll/edit/reload
mixed-era × chat/branch navigation
reroll at historical index × current-stage reevaluation
```

and preserve:

```text
historical rewrite count = 0
Source activation from history = 0
structured re-entry = 0
persistent era writes = 0
history-proportional scan = 0
```

## 25. Runtime / production status

```text
LRE_8_IMPACT_SCOPE = FROZEN
LRE_8_IMPLEMENTATION = NOT_AUTHORIZED
LC5_RUNTIME = NOT_AUTHORIZED
G2/G5_TARGET_HOST_PROOF = STILL REQUIRED
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

Next after this impact scope:

```text
LRE-8 detailed Old-Chat / Mixed-Era Compatibility design
```
