# SimCore 3M-7 Context Re-entry / Source-History Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **READ-ONLY IMPACT SCOPE COMPLETE · ZERO ADDITIONAL STRUCTURED SOURCE RE-ENTRY SELECTED · LEGACY COMMUNITY HOST TRANSCRIPT UNCHANGED · C6 NOT ACTIVATED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-7 PRE-DESIGN · CONTEXT RE-ENTRY FIREWALL · SOURCE-HISTORY BOUNDARY**

## 0. Purpose

This document performs the read-only impact scope before freezing 3M-7.

It answers:

```text
Do current LIVE_REACTION / BOARD source objects need to survive as future model context?
What exactly counts as Source Intelligence re-entry versus pre-existing host transcript history?
What source-history horizon is justified by current product requirements?
Would any proposed behavior activate Candidate C gate C6?
```

This is design/research/document work only.

It does not implement source-history storage, prompt injection, transcript filtering, history deletion, context projection, provenance persistence, runtime transport, DOM/CSS, S7/v0.70.3 changes, release publication, or `release-simcore` mutation.

## 1. Authority snapshot

Design/evidence authority at impact-scope start:

```text
main = 95edaff55e18c3c5ada00fb1c96b0bf14a64683a
```

Production authority remains independently on `release-simcore`.

Inherited authority chain:

```text
3M-0 master
→ default derived-source re-entry = NONE

3M-1 legacy compatibility
→ LEGACY_HOST_HISTORY_UNCHANGED_NO_ADDITIONAL_REENTRY

3M-3 structured sidecar
→ persistent source history = NONE
→ future context re-entry = NONE

3M-5 BOARD
→ snapshot only
→ future context re-entry = NONE

3M-6 support/invalidation
→ any non-zero controlled future-context re-entry activates C6
```

## 2. Concrete source objects entering 3M-7

Current designed objects are:

```text
ValidatedSourceSemanticSidecarV1   # LIVE_REACTION
ValidatedBoardSemanticSidecarV1    # BOARD
family presentation read models
```

Their current lifetime contract is:

```text
current projection only
non-persistent
non-mutable
non-reentrant
no cross-turn stable source-object identity
```

No current consumer requires an old structured source object to be reused in a later prompt.

## 3. Four history domains must not be conflated

### H1 · Host transcript history

Existing assistant/user message history owned by the host/current request path.

Legacy `<COMMUNITY>` is part of assistant output and may therefore already exist in later host transcript context under current behavior.

This is **pre-existing compatibility behavior**, not a new Source Intelligence history store.

### H2 · Structured Source Intelligence semantic history

A hypothetical archive of validated LIVE_REACTION/BOARD semantic objects across turns.

Current state:

```text
NONE
```

### H3 · Presentation retention

A future host may keep previously rendered source surfaces visible for UI/history purposes.

This does not grant model-context authority.

```text
VISIBLE IN UI
!=
RE-ENTERED INTO MODEL CONTEXT
```

### H4 · Diagnostics / validation receipts

Receipts exist for bounded observability only.

They must never become source-semantic memory or prompt context by convenience.

## 4. Why legacy transcript history is not precedent

3M must not reason:

```text
legacy <COMMUNITY> is visible in host history
therefore structured BOARD should also be automatically reinjected
```

That would convert a compatibility constraint into a new architecture rule.

Canonical distinction:

```text
PRE-EXISTING HOST TRANSCRIPT BEHAVIOR
!=
NEW STRUCTURED SOURCE RE-ENTRY AUTHORITY
```

3M-7 may document and later migrate legacy behavior, but it must not duplicate it into new source families without evidence.

## 5. Candidate behaviors assessed

### Option A · Zero additional structured-source re-entry

```text
structured source history horizon = CURRENT_PROJECTION_ONLY
future prompt injection = NONE
source history store = NONE
```

Benefits:

- preserves main-model isolation;
- no new persistent schema;
- no C6 provenance requirement;
- no source-history token accumulation;
- no second history resolver;
- no stale old Board/Reaction object reuse;
- matches all current LIVE_REACTION/BOARD consumer requirements.

### Option B · Automatically re-enter the previous validated source projection

Would require at minimum:

```text
cross-turn survival
freshness proof at later prompt construction
bounded retention semantics
prompt-placement ownership
stale invalidation on edit/reroll/source replacement
```

This activates:

```text
C1 + C6
```

No concrete current consumer proves this complexity is needed.

Disposition:

```text
DEFER · AUTO_PREVIOUS_SOURCE_REENTRY
```

### Option C · User-requested retrieval from a structured source archive

Examples:

```text
"아까 게시판 다시 보여줘"
"저번 댓글 반응 이어서 보여줘"
```

A real retrieval contract would require:

```text
persistent source object identity
bounded archive ownership
query/selection semantics
freshness support proof
context injection policy
```

Likely activation:

```text
C1 + C2 + C6
```

No such archive currently exists.

Disposition:

```text
DEFER · STRUCTURED_SOURCE_ARCHIVE_RETRIEVAL
```

### Option D · Strip legacy `<COMMUNITY>` from future host history

This is attractive for long-chat isolation but is not a narrow 3M-7 change.

It would intersect:

```text
legacy output compatibility
host transcript/request construction
representation/edit reconcile
Context Projection semantic-dependency limits
```

The parked Context Projection result already proves structural removability is not sufficient semantic proof.

Disposition:

```text
DEFER · LEGACY_COMMUNITY_HOST_HISTORY_MIGRATION
```

It is not a prerequisite for keeping **new structured Source Intelligence** non-reentrant.

## 6. Selected first 3M-7 design seam

The narrowest safe seam is:

```text
ZERO_ADDITIONAL_STRUCTURED_SOURCE_REENTRY_FIREWALL
```

Frozen impact conclusion:

```text
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
STRUCTURED_SOURCE_AUTO_REENTRY = NONE
STRUCTURED_SOURCE_HISTORY_STORE = NONE
CANDIDATE_C_C6 = NOT_ACTIVATED
LEGACY_COMMUNITY_HOST_HISTORY = UNCHANGED_COMPATIBILITY
```

## 7. Current-turn regeneration is not history reuse

A later C request may create a **new** source projection from then-current authoritative inputs.

Conceptually:

```text
new current request
→ current Lineage / Handoff / Evidence
→ current exposure/policy basis
→ newly validated source projection
```

This is allowed by the architecture and does not require old sidecar reuse.

Canonical rule:

```text
REGENERATE FROM CURRENT AUTHORITY
!=
REUSE OLD SOURCE HISTORY
```

## 8. User text reintroduction is not derived-object resurrection

If the user explicitly quotes or supplies prior-looking source content in the current input, that text is current-user-provided request context.

It may be interpreted under the ordinary current-user authority rules.

But:

```text
USER QUOTES OLD BOARD TEXT
!=
PROOF THAT A PRIOR BoardSemanticSidecar STILL EXISTS OR IS CURRENT
```

The system must not silently reconstruct a persistent source object from resemblance or user wording.

A vague reference such as:

```text
"아까 게시판 이어서"
```

without an authorized history/archive contract does not justify hidden source-history recovery.

## 9. Exact continuity is intentionally unsupported for structured families V1

Current structured family V1 does not promise:

```text
same Board thread continues next turn
same participantOrdinal survives next turn
same source post can be reopened by ID
old reaction list can be fetched by Source Intelligence
```

Those are persistence/identity/re-entry features, not presentation features.

If product requirements later demand them, Candidate C must activate before design proceeds.

## 10. Source-history horizon

The first bounded horizon is intentionally the minimum possible:

```text
ACTIVE STRUCTURED SOURCE HORIZON
= CURRENT PROJECTION ONLY
```

No arbitrary N-turn retention constant is frozen because no current consumer requires one.

This avoids turning a guessed number into hidden product semantics.

## 11. Prompt ownership impact

Selected seam requires no new prompt owner.

```text
no source-history prompt block
no prior Board serialization
no prior LIVE_REACTION serialization
no hidden source memory lines
no source archive retrieval injection
```

The main model therefore does not receive a new accumulating source-history channel.

## 12. Existing owner impact

### Lineage / Handoff / Evidence

Remain current-source authorities only.

3M-7 must not ask them to become a historical source archive.

### Prompt / request construction

No new structured-source re-entry path in the selected seam.

### Representation / Edit Reconcile

No new structured source history ownership.

Legacy host transcript compatibility remains unchanged.

### Presentation

May eventually retain visible old source surfaces according to host UI capability, but retained UI is never model-context authority by itself.

### Persistent state

No new state key, store, ledger, or migration.

## 13. Failure / uncertainty behavior

If a later request would benefit from old source content but no authorized history path exists:

```text
NO HIDDEN RECOVERY
NO FUZZY SEARCH
NO SOURCE RESURRECTION
```

The system may generate a fresh current projection when current authority supports one.

It must not pretend that a new projection is the exact historical object.

## 14. Candidate C decision

For the selected seam:

```text
C6 = NOT ACTIVATED
Candidate C = CONDITIONALLY_READY / CLOSED
```

Mandatory reopening examples remain:

```text
old source object survives across turns
exact historical Board/thread retrieval
stable cross-turn source identity
old source fields enter a later prompt
partial historical source reuse
```

## 15. Context Projection relationship

3M-7 does not authorize deletion of old transcript context.

Canonical separations:

```text
NO NEW STRUCTURED REENTRY
!=
DELETE LEGACY TRANSCRIPT HISTORY

SOURCE HISTORY BOUNDED
!=
ARBITRARY ROOT PREFIX SAFE TO REMOVE
```

The existing semantic-dependency blocker remains intact.

## 16. Design risks if the boundary is violated

### Risk A · silent source-memory accumulation

Every source surface is reserialized into future prompts.

Result: long-chat token growth and main-model contamination.

### Risk B · stale social facts

Old Board/Reaction data survives source edit/reroll without later freshness proof.

### Risk C · presentation becomes memory authority

Visible UI is treated as proof that model context should include it.

### Risk D · second history resolver

Source Intelligence scans arbitrary transcript history to reconstruct old source objects.

All are forbidden in the first 3M-7 seam.

## 17. Impact verdict

```text
3M_7_IMPACT_SCOPE = COMPLETE
SELECTED_SEAM = ZERO_ADDITIONAL_STRUCTURED_SOURCE_REENTRY_FIREWALL
STRUCTURED_SOURCE_HISTORY_HORIZON = CURRENT_PROJECTION_ONLY
C6 = NOT_ACTIVATED
LEGACY_COMMUNITY_HOST_TRANSCRIPT = UNCHANGED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED
```

## 18. Next design transaction

The 3M-7 design should freeze:

```text
history-domain taxonomy
zero-reentry contract
current-projection-only horizon
legacy compatibility exception
user-reintroduction distinction
UI-retention non-authority rule
C6 activation gate
future non-zero re-entry promotion requirements
```

It must not implement transcript filtering or source-history persistence.