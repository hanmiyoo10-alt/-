# SimCore 3M-9 Integration / Performance / Source-Irrelevant Baseline Impact Scope — 2026-09-01

Date: 2026-09-01 KST

Status: **3M-9 READ-ONLY IMPACT SCOPE COMPLETE · INTEGRATION SEAM SELECTED · SOURCE-IRRELEVANT ZERO-SEMANTIC-BURDEN BASELINE SELECTED · DESIGN-ONLY · PRODUCTION / S7 UNCHANGED**

Classification: **3.0M SOURCE INTELLIGENCE · 3M-9 · INTEGRATION · PERFORMANCE · SOURCE-IRRELEVANT BASELINE · CROSS-FAMILY ISOLATION**

## 0. Purpose

3M-9 adds no new source family and no new semantic capability.

It asks whether the designs frozen through 3M-8 can coexist as one bounded system without weakening ordinary chat.

The checkpoint must answer:

```text
What is the narrow integration seam across LIVE_REACTION, BOARD and NEWS?
What must happen on a source-irrelevant request?
Which costs may exist only when a source family is actually selected?
How are source invalidation, policy quarantine and presentation failure kept independent?
Can the same event be projected into different families without derived-to-derived truth promotion?
What conditions must 3M-10 later prove in real long chat?
```

This is design/research only.

It does not implement runtime code, model-output transport, source generation, prompt injection, DOM/CSS, persistence, source history, network/media, new model calls, S7/v0.70.3 changes, release publication, or `release-simcore` mutation.

## 1. Authority chain

Inputs:

```text
docs/SIMCORE_GUIDELINES.md
docs/SIMCORE_CONTRACTS_V2.md
docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_MAIN_MODEL_CAPABILITY_ISOLATION_NOTE_2026-08-31.md
docs/SIMCORE_3M_1_SOURCE_PROJECTION_ENVELOPE_LEGACY_COMMUNITY_COMPATIBILITY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_2_SOURCE_ASSERTION_EXPOSURE_BOUNDARY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_4_PRESENTATION_RENDERER_ARCHITECTURE_DESIGN_2026-09-01.md
docs/SIMCORE_3M_5_BOARD_SOURCE_FAMILY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_8_NEWS_PUBLICATION_MATURITY_DESIGN_2026-09-01.md
```

Fresh common-layer input also considered:

```text
PROJECTED-RECORD-WRITES-PRESERVE-UNOWNED-METADATA
```

This common invariant does not authorize any SimCore host write. It only strengthens the future integration requirement that Source Intelligence must not reconstruct or erase richer host/representation metadata it does not own.

Production runtime remains independently authoritative on `release-simcore`.

## 2. Master 3M-9 goal

The master design defines 3M-9 as:

```text
prove ordinary chat remains healthy
prove source work is bounded
prove no context/state accumulation
```

Therefore 3M-9 is an integration and acceptance-contract checkpoint, not a feature-expansion checkpoint.

## 3. Frozen family set for integration

3M-9 integrates only already-designed families:

```text
LIVE_REACTION
BOARD
NEWS
```

Not integrated because not yet designed/authorized:

```text
SOCIAL_FEED
PUBLIC_KNOWLEDGE
```

No placeholder implementation path is created for deferred families.

## 4. Integration seam selection

The selected conceptual seam is:

```text
CURRENT_REQUEST_SOURCE_ORCHESTRATION_GATE
```

It sits above family-specific validators/renderers and below the ordinary current-task/source owner that may explicitly establish a current source job.

Conceptual shape:

```text
current request / current task
        ↓
current source-job selection authority
        ↓
CURRENT_REQUEST_SOURCE_ORCHESTRATION_GATE
        ├─ DORMANT_SOURCE_PATH
        └─ ACTIVE_CURRENT_PROJECTION
              ↓
        selected family contract only
```

3M-9 does **not** freeze the runtime producer or transport that will establish a source job.

It only freezes what the integrated subsystem may do after an explicitly authorized current source job exists, and what it must not do otherwise.

## 5. Source relevance must not be inferred by broad history search

The integration gate must not discover source relevance by:

```text
scan full history for old source words
scan old BOARD/NEWS text
fuzzy match previous source surfaces
retrieve hidden source archive
inspect renderer DOM for semantic intent
```

3M-7 already freezes structured source history/retrieval to NONE.

Therefore the integrated subsystem receives current source relevance from a bounded current owner/job contract rather than manufacturing it from historical artifacts.

## 6. Source-irrelevant baseline selection

The selected baseline is:

```text
SOURCE_IRRELEVANT_ZERO_SEMANTIC_BURDEN
```

Meaning, when the current request has no authorized Source Intelligence job:

```text
source semantic draft generation      = none
source authority join                = none
exposure-policy evaluation           = none
publication-maturity evaluation      = none
source validation                    = none
family renderer dispatch             = none
source DOM mount                     = none
structured source history read       = none
structured source history write      = none
source persistence read/write        = none
source network/media work            = none
extra model call                     = none
source-derived future-context bytes  = 0
source-specific prompt/history bytes = 0
visible source output bytes          = 0
```

A future implementation may perform only a bounded constant-time/local activation check necessary to determine that the subsystem is dormant.

Canonical principle:

```text
SOURCE FEATURE EXISTENCE
!=
ORDINARY CHAT SEMANTIC BURDEN
```

## 7. Why "zero CPU" is not frozen

3M-9 does not claim a literal zero-instruction implementation.

A plugin may need one bounded branch/feature-gate check.

The required non-regression is semantic and architectural:

```text
no scans
no payload
no validation work
no rendering work
no model/network fanout
no state accumulation
```

for source-irrelevant requests.

Actual latency/CPU deltas belong to implementation evidence and 3M-10 real acceptance.

## 8. Active-current-projection rule

When a current source job is explicitly selected, exactly one selected family contract is active for one current projection unless a later design explicitly authorizes multi-family simultaneous generation.

First integration preference:

```text
one current source job
→ one selected family
→ one current projection
```

This avoids hidden fanout such as:

```text
one event
→ automatically generate LIVE_REACTION + BOARD + NEWS together
```

Cross-family comparison remains a validation scenario, not an automatic production fanout contract.

## 9. Common family pipeline

All integrated families preserve this order:

```text
explicit current source job
      ↓
family/scope eligibility
      ↓
trusted source-authority exact join
      ↓
family semantic policy
      ↓
validated semantic payload
      ↓
support-at-use gate
      ↓
presentation adapter
      ↓
view-local presentation
```

Family semantic policy means:

```text
LIVE_REACTION → 3M-2 exposure policy
BOARD         → 3M-2 exposure + parent eligibility
NEWS          → 3M-2 exposure + 3M-8 publication maturity + story atomicity
```

No later layer may repair or override an earlier authority verdict.

## 10. No universal semantic super-schema

3M-9 does not collapse all family schemas into one giant object.

Shared concepts remain shared only where genuinely common:

```text
family
projectionOrdinal
sourceAuthorityRef
validation state
presentation dispatch
current-projection lifetime
```

Family-specific semantics remain family-specific:

```text
LIVE_REACTION assertions
BOARD participants / POST / REPLY hierarchy
NEWS story / headline / reportKind / publication maturity
```

Canonical rule:

```text
COMMON ORCHESTRATION
!=
COMMON SEMANTIC SHAPE FOR EVERYTHING
```

## 11. Integrated failure-domain matrix

Three failure classes remain independent.

### F1 Source support invalidation

```text
trusted current source authority no longer matches
→ whole current projection invalid
```

### F2 Semantic policy quarantine

```text
source remains current
but claim/story cannot be consumed
→ claim/story quarantine according to family contract
```

### F3 Presentation failure

```text
validated semantics remain valid
but adapter/mount/display fails
→ presentation failure only
```

Forbidden promotions:

```text
F3 success → cannot prove F1/F2 correctness
F2 deny   → cannot imply F1 stale source
F1 match  → cannot imply every F2 claim is public/eligible
```

## 12. Integrated family quarantine behavior

```text
LIVE_REACTION
→ assertion-level ALLOW survives
→ DENY/HOLD assertion content omitted from validated sidecar

BOARD
→ entry-level policy + hierarchical parent dependency
→ child cannot survive invisible parent

NEWS
→ story-atomic acceptance
→ any headline/body exposure HOLD/DENY or maturity HOLD quarantines whole story
```

3M-9 preserves these differences rather than normalizing them away.

## 13. Same-event cross-family authority rule

A signature integration scenario may project the same exposed event into multiple family **test runs**.

Required authority model:

```text
same canonical/current source evidence
  ├─ independently validate LIVE_REACTION
  ├─ independently validate BOARD
  └─ independently validate NEWS
```

Forbidden authority chain:

```text
BOARD exists
→ NEWS trusts BOARD as truth

NEWS exists
→ PUBLIC_KNOWLEDGE settlement implied

LIVE_REACTION rumor repeats many times
→ canonical fact
```

Until Candidate C C5 is separately activated, family-to-family derived lineage is not an authority source.

## 14. Source family does not mutate core mode

Integration keeps axes orthogonal:

```text
MODE                 = A / B / C
SOURCE FAMILY        = LIVE_REACTION / BOARD / NEWS
EXPOSURE              = separate policy axis
PUBLICATION MATURITY = NEWS-only separate policy axis
PRESENTATION          = separate adapter axis
```

No family may create a new mode or overwrite stored core mode.

## 15. No structured source accumulation

Across repeated source uses:

```text
projection N ends
→ no structured semantic source history retained by 3.0M
→ projection N+1 starts from current authority
```

No hidden:

```text
lastSources[]
recentBoards[]
newsArchive[]
sourceMemory[]
```

is authorized.

This remains true even if a future presentation surface visually retains old cards in host/UI history.

## 16. Repeated-use performance invariant

Repeated source use must cost approximately per **current projection**, not per accumulated conversation length.

Required design direction:

```text
cost(source projection N)
≈ bounded work(current projection N)

not

cost(source projection N)
≈ scan/merge all source projections 1..N
```

The exact measured runtime slope is future implementation evidence.

## 17. Expected cost dimensions

3M-9 freezes these cost dimensions for future implementation evidence:

```text
request scans
history scans
prompt chars/tokens
source semantic payload size
validator work
presentation-model work
DOM/render work
persistent storage
network calls
model calls
background/timer work
```

Every active implementation checkpoint must report them explicitly.

## 18. Source-irrelevant expected budget

Frozen design budget:

```text
history scans                  = 0
source request/body scans       = 0 beyond current explicit activation contract
source-specific prompt chars    = 0
source-derived re-entry chars   = 0
source payload construction     = 0
validator item evaluations      = 0
presentation-model construction = 0
source DOM/render items         = 0
persistent reads/writes         = 0
network calls                   = 0
extra model calls               = 0
polling/timers/background jobs  = 0
```

Only bounded activation dispatch overhead may remain.

Failure to preserve this in a future runtime is:

```text
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
```

## 19. Source-relevant common expected budget

For one authorized current projection, first-major preference remains:

```text
new history scans              = 0
structured history retrieval   = 0
persistent source writes       = 0
network calls                  = 0
auxiliary model calls          = 0
background workers             = 0
polling loops                  = 0
```

Validation and rendering are bounded local work over the current projection only.

Any current-request prompt/transport delta needed to produce the semantic draft is not invented by 3M-9 because runtime producer/transport is still unauthorized. Future activation must measure and bound that delta separately.

## 20. Complexity shape by family

No exact product caps are invented in design-only 3M-9, but work must remain linear in the bounded current object.

Conceptual complexity:

```text
LIVE_REACTION
→ O(A) for A current assertions

BOARD
→ O(P + E) for P participants + E entries
→ parent eligibility lookup must remain bounded/current-local

NEWS
→ O(S + C) for S stories + C headline/body semantic components
→ one maturity evaluation per story
```

Forbidden:

```text
nested full-history scans
cross-family archive scans
unbounded recursive reply graphs
unbounded article revision traversal
```

## 21. Main-model isolation acceptance lane

Any future active Source Intelligence implementation must preserve an explicit ordinary-chat lane covering:

```text
Current Task Primacy
long-chat continuity
stale-topic replay absence
source-to-world fact leakage absence
source-specific instruction competition absence
context/token pressure
latency attribution
```

A source feature is not accepted merely because its own sidecar/UI looks correct.

## 22. Prompt/context contamination firewall

Source-irrelevant turns must not receive:

```text
source family catalog instructions
old source sidecars
renderer metadata
CSS/UI metadata
quarantine receipts
publication maturity receipts
Board participant metadata
News reportKind metadata
```

unless a separately authorized current semantic job requires a bounded subset.

Presentation/diagnostic metadata never receives automatic model-context authority.

## 23. Representation / host metadata ownership

3M-9 adds no chat-write API.

However future integration with host records must obey:

```text
projected Source Intelligence write owns only explicitly contracted fields
omitted host metadata != deletion intent
```

If future presentation/reconciliation requires writing a partial host record, unowned richer metadata must be preserved rather than reconstructing the record from the source projection.

This is a compatibility constraint, not new implementation authority.

## 24. Legacy Community coexistence

Legacy `<COMMUNITY>` fallback remains independently supported during migration.

Integration must prove:

```text
legacy Community path active
→ no duplicate structured re-entry
→ no double source memory
→ no required new renderer path
```

A source-irrelevant ordinary turn after a legacy Community turn must still satisfy the zero-additional-structured-burden contract.

## 25. Renderer isolation

Renderer selection is family-keyed and consumes only validated semantic payload.

```text
LIVE_REACTION → LIVE_REACTION_STREAM_V1
BOARD         → BOARD_THREAD_V1
NEWS          → NEWS_ARTICLE_V1
```

A renderer switch/test must not mutate semantic payload, source authority, exposure verdict, publication maturity verdict, core mode, or canonical continuity.

## 26. UI retention does not create source work

If host UI retains an older source card:

```text
old card visible
!=
old sidecar active
!=
old source validator reruns
!=
old source enters next prompt
```

Presentation retention must not create repeated semantic cost.

## 27. Reroll/edit/source replacement integration

Current contracts require:

```text
source authority replacement
→ old projection fails support-at-use
→ whole old current projection not reused
```

No item-level salvage or descendant lineage is authorized.

If future edit behavior needs a derived object to survive/reconcile across source replacement, Candidate C activation must occur first.

## 28. Candidate C integration status

Current integrated families still cross none of the activation gates:

```text
C1 cross-turn derived survival       = no
C2 stable derived identity           = no
C3 item mutation                     = no
C4 append/merge                      = no
C5 derived-to-derived lineage        = no
C6 future context re-entry           = no
C7 descendant partial survival       = no
C8 delayed semantic-target sidefx    = no
```

Therefore:

```text
CANDIDATE_C = CONDITIONALLY_READY / NOT ACTIVATED
```

## 29. Integration fixture matrix required before 3M-10

3M-9 design must prepare these classes for the final real validation checkpoint:

```text
I1 source-irrelevant ordinary request
I2 source-irrelevant long-chat request after prior source usage
I3 direct-B-root LIVE_REACTION allow/deny mix
I4 direct-B-root BOARD parent/child quarantine
I5 direct-B-root NEWS exposure allow + maturity hold
I6 direct-B-root NEWS all gates allow
I7 source authority replacement invalidates old projection
I8 presentation adapter failure preserves validated semantics
I9 same exposed event independently projected as LIVE_REACTION / BOARD / NEWS
I10 legacy Community fallback coexistence without duplicate structured re-entry
I11 renderer switch changes presentation only
I12 repeated source usage shows no structured history accumulation
```

## 30. Negative integration fixtures

Required traps:

```text
N1 old BOARD text makes next unrelated request source-active
N2 visible old NEWS card causes next-turn context re-entry
N3 NEWS report is treated as canonical source for BOARD
N4 renderer success rescues invalid authority join
N5 one denied BOARD reply invalidates source root
N6 publication maturity ALLOW upgrades rumor to fact
N7 source-irrelevant turn receives source prompt/catalog bytes
N8 repeated source usage grows hidden source store
N9 presentation layer overwrites unowned host metadata
N10 source family changes core mode
```

## 31. What 3M-9 does not prove

Design-only 3M-9 does not prove measured performance.

It does not prove:

```text
actual latency delta
actual token delta under future source producer
actual DOM cost
actual provider behavior
model semantic compliance
host mount correctness
long-chat subjective quality
```

Those require implementation/host evidence and 3M-10 real validation.

## 32. Selected 3M-9 design seam

The design checkpoint should freeze:

```text
SOURCE_RELEVANCE_DORMANCY_FIREWALL
+
CURRENT_PROJECTION_INTEGRATION_PIPELINE
+
FAMILY_BOUNDED_COST_LEDGER
+
CROSS_FAMILY_AUTHORITY_ISOLATION
```

No new semantic family is needed.

## 33. BLOCKER conditions

Future implementation must stop on:

```text
BLOCKER · SOURCE_IRRELEVANT_MAIN_MODEL_REGRESSION
BLOCKER · SOURCE_IRRELEVANT_PROMPT_OR_HISTORY_INJECTION
BLOCKER · SOURCE_WORK_REQUIRES_UNBOUNDED_HISTORY_SCAN
BLOCKER · SOURCE_HISTORY_OR_STATE_ACCUMULATES_WITHOUT_AUTHORITY
BLOCKER · FAMILY_TO_FAMILY_DERIVED_ASSERTION_BECOMES_TRUTH_AUTHORITY
BLOCKER · RENDERER_OR_UI_STATE_MUTATES_SEMANTIC_AUTHORITY
BLOCKER · NEWS_MATURITY_UPGRADES_ASSERTION_TRUTH
BLOCKER · SOURCE_INTEGRATION_OVERWRITES_UNOWNED_HOST_METADATA
BLOCKER · INTEGRATION_ACTIVATES_CANDIDATE_C_WITHOUT_DEDICATED_DESIGN
```

## 34. WATCH / DEFER

```text
WATCH · FUTURE_SOURCE_PRODUCER_PROMPT_COST_UNMEASURED
WATCH · FUTURE_HOST_MOUNT_RENDER_COST_UNMEASURED
WATCH · MODEL_COMPLIANCE_REMAINS_SEPARATE_EVIDENCE

DEFER · SOCIAL_FEED_INTEGRATION
DEFER · PUBLIC_KNOWLEDGE_INTEGRATION
DEFER · MULTI_FAMILY_AUTOMATIC_FANOUT
DEFER · SOURCE_HISTORY_STORE
DEFER · SOURCE_RETRIEVAL
DEFER · AUXILIARY_MODEL_FANOUT
DEFER · NETWORK_MEDIA_MATERIALIZATION
DEFER · EXACT_PRODUCT_ITEM_CAPS
```

## 35. Impact conclusion

```text
3M_9_SCOPE                              = SELECTED
NEW_SOURCE_FAMILY                       = NONE
INTEGRATION_SEAM                        = CURRENT_REQUEST_SOURCE_ORCHESTRATION_GATE
SOURCE_IRRELEVANT_BASELINE              = ZERO_SEMANTIC_BURDEN
SOURCE_IRRELEVANT_HISTORY_SCAN          = 0
SOURCE_IRRELEVANT_PROMPT_DELTA           = 0 SOURCE-SPECIFIC BYTES
SOURCE_IRRELEVANT_VALIDATION_RENDER      = 0
SOURCE_IRRELEVANT_MODEL_NETWORK_FANOUT   = 0
STRUCTURED_SOURCE_ACCUMULATION           = NONE
ACTIVE_COST_HORIZON                      = CURRENT PROJECTION ONLY
FAMILY_TO_FAMILY_AUTHORITY               = FORBIDDEN
CANDIDATE_C                              = NOT ACTIVATED
RUNTIME_IMPLEMENTATION                   = NOT AUTHORIZED
PRODUCTION                               = UNCHANGED
S7 / v0.70.3                             = UNCHANGED
release-simcore                          = UNCHANGED
NEXT                                     = 3M-9 INTEGRATION / PERFORMANCE DESIGN
```
