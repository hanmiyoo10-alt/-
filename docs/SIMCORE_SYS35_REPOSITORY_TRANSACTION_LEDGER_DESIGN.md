# SYS-35 — Repository Transaction Ledger — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · CROSS-WORK REPOSITORY TRANSACTION LINEAGE · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-35
Idea          = Repository Transaction Ledger
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`
- `docs/SIMCORE_SYS31_VERSION_BUMP_BLAST_RADIUS_CHECK_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4A_RELEASE_TRANSACTION_IDENTITY_AUTHORITY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/REPO_MAIN_WRITE_COORDINATION.md`
- `products/simcore/releases/records/`
- Git commit / branch / pull-request immutable repository history

Existing authorities SYS-35 must not replace:
- Git history as exact commit/tree/file mutation authority;
- GitHub PR metadata as PR/merge-state authority;
- release records as one-release lifecycle/identity authority;
- `product-manifest.json` as current synchronized production identity;
- SYS-08 as one bounded work item's close receipt;
- SYS-31 as version/release blast-radius preflight;
- S-11 as stale-PR hygiene classification;
- repository main-write coordination as writer/race-safety policy;
- current development/progress documents as living NEXT/queue authority.

---

## 1. Problem

SimCore repository work is intentionally split across multiple durable transaction shapes:

```text
design-only main commit
feature/tool work branch + PR merge
protected infrastructure PR
candidate request / candidate materialization
exact release approval transaction
release-simcore publication
post-publish main-state convergence
human LIVE_PASS closure
administrative recovery / correction
```

Each individual transaction already has a natural authority:

```text
commit / tree             → Git
PR / merge                → GitHub PR metadata
release identity          → release records / release-simcore
work close result         → SYS-08 future close receipt
current state             → living main authorities
```

The missing cross-work question is:

> Which meaningful repository transactions belong to the same SimCore work/release lineage, in what order did they occur, what authority did each transaction have, and what mutation boundary did each transaction actually cross?

Reconstructing that lineage from chat memory or arbitrary commit messages is fragile.

SYS-35 defines a curated append-only Repository Transaction Ledger for **meaningful SimCore transaction lineage/navigation**.

It does not copy Git history or become a second release database.

---

## 2. Core invariant

```text
reviewed meaningful repository transaction
+ immutable repository identity refs
+ bounded authority/mutation classification
→ append-only transaction-ledger row

transaction-ledger row
!= Git truth
!= release authorization
!= release lifecycle truth
!= current-state authority
!= work close receipt
```

Canonical identity:

```text
SYS-35
= cross-work repository transaction lineage/navigation

NOT
= every-commit changelog
= automatic Git event log
= release record replacement
= PR database
= issue tracker
= current NEXT authority
= repository writer
```

---

## 3. Why v1 is NR_DOC_ONLY

The hard part is not extracting commits mechanically; Git already provides that.

The hard part is **semantic inclusion and lineage classification**:

```text
Is this commit a meaningful SimCore transaction boundary?
Which work/release lineage does it belong to?
Was it DESIGN, PRODUCT, PROTECTED_INFRA, RELEASE, ADMIN_SYNC, LIVE_CLOSE, or RECOVERY?
What authority did it exercise?
Which later transaction superseded or continued it?
```

Those are reviewed repository-memory judgments.

A repo-wide scanner would either:
- include noisy implementation commits and bots indiscriminately; or
- require heuristic/LLM semantic inference and create false authority.

Therefore v1 is a curated document ledger:

```text
Apply Class = NR_DOC_ONLY
```

No daemon, webhook, GitHub Action, CI hook, commit scraper, background monitor, or repository writer is required.

A future generator may be considered only if it consumes an explicitly curated manifest and does not infer semantic transaction membership from Git history by itself.

---

## 4. v1 artifact

Future application artifact:

```text
docs/SIMCORE_REPOSITORY_TRANSACTION_LEDGER.md
```

Properties:

```text
living append-only navigation ledger
current rows may receive explicit bounded follow-up links/status annotations
historical transaction identity is never rewritten
no raw diff/log bodies
no duplicated plugin bytes
no copied release-record payloads
```

This ledger is **living in membership/navigation**, but each transaction row is point-in-time historical evidence.

---

## 5. Inclusion rule

A transaction is ledger-worthy when at least one is true:

```text
T1 freezes or supersedes a SimCore design/governance authority
T2 lands a bounded implementation/tooling/fixture work item
T3 changes protected repository/build/CI/release/architecture governance
T4 creates or merges a release-intent/candidate/approval transaction
T5 publishes release-simcore production
T6 performs post-publication state convergence or recovery
T7 closes a human live gate / release lifecycle
T8 repairs a material repository/admin drift with durable consequence
T9 marks a formally superseded/aborted transaction needed to understand lineage
```

Not ledger-worthy by default:

```text
format-only micro commits
intermediate local commits fully squashed away from durable authority
routine bot noise with no independent semantic boundary
read-only inspections
ordinary chat discussion without repo mutation
repeated exact no-op checks with no new durable transaction
```

A no-op may still be included when it is itself a meaningful authority event, e.g. an idempotent recovery proving no mutation was required.

---

## 6. Transaction classes

Frozen v1 transaction classes:

```text
DESIGN_FREEZE
DESIGN_SUPERSESSION
PRODUCT_IMPLEMENTATION
NON_RUNTIME_APPLICATION
PROTECTED_INFRASTRUCTURE
PR_MERGE
RELEASE_INTENT
CANDIDATE_MATERIALIZATION
RELEASE_APPROVAL
PRODUCTION_PUBLICATION
POST_PUBLISH_CONVERGENCE
LIVE_GATE_CLOSE
ADMIN_RECOVERY
ROLLBACK_OR_CORRECTION
ABORT_OR_SUPERSESSION
```

One repository event may have one primary class and bounded secondary tags.

Do not invent a new class when an existing class plus tags is sufficient.

---

## 7. Authority domains

Each row records which authority domain the transaction touched.

Frozen v1 domains:

```text
MAIN_DESIGN_EVIDENCE
MAIN_PRODUCT_SOURCE
MAIN_TEST_FIXTURE
MAIN_PROTECTED_INFRA
MAIN_RELEASE_RECORD
RELEASE_SIMCORE_PRODUCTION
MAIN_ADMIN_STATE
LIVE_EVIDENCE_CLOSURE
COMPOSITE
```

`COMPOSITE` is allowed only for a lineage transaction that legitimately spans multiple sequential authority stages, not to hide illegal bundling.

SYS-31/SYS-50 still decide whether a work bundle was allowed.

---

## 8. Mutation boundary

Every row records the actual mutation boundary, not intended scope.

Allowed v1 values:

```text
MAIN_ONLY
RELEASE_SIMCORE_ONLY
MAIN_THEN_RELEASE_SIMCORE
RELEASE_SIMCORE_THEN_MAIN
NO_DURABLE_MUTATION
MULTI_STAGE_BOUNDED
```

Examples:

```text
design freeze commit
→ MAIN_ONLY

candidate materialization to non-production candidate ref
→ MULTI_STAGE_BOUNDED with productionMutation = NONE in notes

release publication
→ RELEASE_SIMCORE_ONLY at publication step

post-publish state convergence
→ MAIN_ONLY after production already changed

full release lineage summary row, if deliberately used
→ RELEASE_SIMCORE_THEN_MAIN
```

The preferred v1 model is **one row per meaningful atomic repository transaction**, with lineage links connecting stages. Avoid giant composite rows that erase sequencing.

---

## 9. Immutable identity fields

Every included row must have sufficient immutable identity for its transaction type.

Common fields:

```text
Transaction ID
Date
Primary class
Work / release lineage ID
Authority domain
Mutation boundary
Repository refs
Outcome
Evidence / authority refs
Predecessor transaction IDs
Successor / superseding transaction ID when later known
Notes
```

Repository refs may contain, as applicable:

```text
commit SHA
PR number + merge SHA
branch/ref name as transport hint
releaseId
candidate commit C
expected production parent P
production commit
production blob
workflow run ID
state-sync/admin commit
```

Rule:

```text
branch name alone
!= immutable transaction identity
```

---

## 10. Transaction ID

SYS-35 transaction IDs are ledger-local stable navigation IDs, not new repository authority.

Frozen format:

```text
RTX-YYYYMMDD-NNN
```

Example:

```text
RTX-20260826-001
```

The row must also carry the natural authority identity such as commit/PR/releaseId.

`RTX-*` is never accepted by release tooling as authorization.

---

## 11. Outcome vocabulary

Frozen v1 ledger outcomes:

```text
LANDED
PUBLISHED
CONVERGED
LIVE_CLOSED
BLOCKED
ABORTED
SUPERSEDED
RECOVERED
NOOP_CONFIRMED
```

These are transaction-history outcomes only.

They do not replace:
- WATCH / DEFER / FIX / BLOCKER;
- SYS-08 work outcome;
- release lifecycle values such as LIVE_PENDING;
- CI PASS/FAIL;
- gate-open/closed state.

---

## 12. Lineage model

A ledger row may point backward to zero or more predecessor transaction IDs.

Normal product release lineage example:

```text
DESIGN_FREEZE
→ PRODUCT_IMPLEMENTATION / PR_MERGE
→ RELEASE_INTENT
→ CANDIDATE_MATERIALIZATION
→ RELEASE_APPROVAL
→ PRODUCTION_PUBLICATION
→ POST_PUBLISH_CONVERGENCE
→ LIVE_GATE_CLOSE
```

Not every work item uses every stage.

Important rule:

```text
lineage edge
= historical/navigation relationship
!= causal proof
!= authorization inheritance
```

A previous PASS/approval is never automatically reusable merely because a later row links to it.

---

## 13. Relationship to SYS-08

SYS-08 answers:

```text
What did this bounded work item conclude at close time?
```

SYS-35 answers:

```text
What durable repository transactions formed the cross-work lineage?
```

Therefore:

```text
SYS-08 receipt may cite RTX IDs
SYS-35 row may cite a close receipt
```

but neither copies the other artifact.

The SYS-08 point-in-time `NEXT` never becomes a SYS-35 current queue field.

---

## 14. Relationship to release records

Release records own detailed per-release state such as:

```text
releaseId
releaseMode
authorizationCommit
productionCommit / previousProductionCommit
productionBlob
verifier identity
publisher run
releaseState
stateSyncStatus
liveGate
```

SYS-35 stores only bounded references/identity needed for lineage navigation.

Example ledger row:

```text
Primary class: PRODUCTION_PUBLICATION
Lineage: simcore-v0.64.7-new-01
Repository refs:
- releaseId = simcore-v0.64.7-new-01
- productionCommit = a7ce8ce3...
- productionBlob = 676b7e2c...
Authority ref:
- products/simcore/releases/records/simcore-v0.64.7-new-01.json
```

Do not copy the entire release-record JSON into the ledger.

---

## 15. Relationship to Git history / PR metadata

Git and GitHub remain exact mutation/history authority.

SYS-35 does not claim:

```text
commit exists because ledger says so
PR merged because ledger says so
path changed because ledger says so
```

Before adding a row, immutable refs should be checked against Git/GitHub where material.

If a ledger row later proves clerically wrong:

```text
append explicit correction annotation
preserve original transaction identity
never rewrite Git history semantics
```

---

## 16. Relationship to SYS-31 / SYS-50

```text
SYS-50
= may these roles/work families be bundled?

SYS-31
= is the release/version blast radius legitimate?

SYS-35
= after durable transactions occur, how are their repository identities and lineage navigated historically?
```

SYS-35 cannot retroactively legitimize an illegal bundle.

If a transaction is later classified as wrongly bundled, the ledger preserves that transaction and points to the forensic/fix authority rather than deleting it.

---

## 17. Relationship to repository main-write coordination

`REPO_MAIN_WRITE_COORDINATION.md` owns write/race safety.

SYS-35 may record meaningful outcomes such as:

```text
MAIN_WRITE_ALREADY_APPLIED
MAIN_WRITE_CONTENT_CONFLICT
bounded recovery PR
```

when they form a durable SimCore transaction boundary.

It does not become the retry queue, lock manager, or writer.

---

## 18. Append-only / correction rule

For historical identity fields:

```text
commit / merge / release / publication identity
= immutable once recorded correctly
```

Allowed later annotation:

```text
successor transaction
superseded-by transaction
forensic classification ref
recovery ref
clerical correction note
```

Forbidden:

```text
rewrite old row to current production
rewrite old outcome because a later release superseded it
replace old NEXT with current NEXT
silently change a recorded commit/PR/release identity
```

When a factual identity was recorded incorrectly, correction must be explicit and preserve the audit trail.

---

## 19. Boundedness

Do not store:

```text
full Git diffs
full CI logs
plugin source bodies
raw diagnostics
raw user conversation
full release JSON payloads
full close receipt bodies
full architecture snapshots
```

Store:

```text
stable ID
short transaction class/outcome
immutable refs
bounded authority pointers
lineage edges
short note when necessary
```

The ledger is a navigation plane, not an archive.

---

## 20. v1 operating procedure

On close of a meaningful repository transaction:

```text
1. determine whether inclusion rule T1..T9 is met
2. verify immutable refs against natural authority
3. assign transaction class/domain/mutation boundary
4. assign or reuse work/release lineage ID
5. append one RTX row
6. link predecessor transaction(s)
7. cite detailed authority/evidence rather than duplicating it
8. if SYS-08 receipt exists, cross-reference it
9. keep current living NEXT/queue in their own authorities
10. stop
```

No retroactive full-history migration is required for v1.

Seed only a small set of recent/high-value transactions if useful during later application; historical backfill is optional and separately bounded.

---

## 21. Failure / uncertainty handling

If transaction identity is incomplete:

```text
DO NOT fabricate a row as authoritative
```

Allowed temporary review marker during curation:

```text
LEDGER_REVIEW_REQUIRED
```

A row may enter the durable ledger only when the natural transaction identity is sufficiently bound.

If lineage relationship is uncertain:

```text
record no edge
or record a bounded note explicitly saying relationship unproven
```

Do not infer causality from nearby timestamps.

---

## 22. Non-goals

SYS-35 v1 does not:

```text
scan every repository commit
subscribe to GitHub events
create a webhook/background task
modify branch protection
modify main-write coordination
modify release workflows
modify release records
open/merge PRs
close gates
classify WATCH/FIX/BLOCKER
infer semantic causality
become a roadmap/current-state database
```

---

## 23. Verification plan for later NR_DOC_ONLY application

When the ledger artifact is materialized, verify at least:

```text
1. one design-freeze transaction can be recorded without copying its document body
2. one implementation PR can record PR + merge SHA without duplicating the diff
3. one release lineage can link intent → publication → state convergence → live close without replacing the release record
4. one protected infrastructure transaction remains distinguishable from product/runtime work
5. one superseded/aborted transaction remains historical and links to its successor
6. branch names are never accepted as sole immutable identity
7. current NEXT/queue values are absent from ledger rows except as historical refs in another artifact
8. no runtime/release/repository writer behavior changes
9. no automated Git scrape or background writer exists
10. historical rows are append-only except explicit correction annotations
```

No real long-chat validation is required solely for SYS-35 application.

---

## 24. Unified classification freeze verdict

Design inspection confirms:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- Git/GitHub already provide the mechanical transaction facts;
- the new value is curated cross-work semantic lineage/navigation;
- automatic semantic inclusion would create false authority and noise;
- no executable scanner or protected repo/release mutation is needed for v1.

---

## 25. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED / HOLD
```

Per Design Sweep First, stop SYS-35 here.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
