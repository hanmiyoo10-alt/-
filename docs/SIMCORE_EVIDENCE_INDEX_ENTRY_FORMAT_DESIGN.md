# SimCore Evidence Index Entry Format Design

Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-09 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-09`
Legacy starter-menu alias: `S4`
Importance: `5 / VERY HIGH`
Design difficulty: `1 / VERY EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`

---

## 1. Problem

SimCore already preserves contract definitions, live evidence, permanent-fixture state, release identity, WATCH/debt records, and implementation milestones in dedicated authoritative documents.

The evidence is intentionally distributed because each document has a different authority role. The cost is navigation: to answer a simple question such as “what currently proves this contract?” a reviewer may need to rediscover several files.

S-09 defines a **small evidence-index entry contract** that can later connect those existing authorities without copying their evidence bodies and without becoming a new validator, roadmap, or semantic authority.

The index answers only:

```text
what contract is this?
who owns its meaning?
where is its authority definition?
where is the latest qualifying live evidence?
which permanent fixture protects it, if any?
which release produced the cited live evidence?
what is the current evidence posture?
which existing WATCH / debt / gate IDs materially qualify the row?
```

It does not answer the evidence question by itself. It points to the documents that do.

---

## 2. User / operator value

Primary value:

```text
contract
→ authority
→ evidence
→ fixture
→ release
→ current evidence posture
```

in one bounded row.

Expected uses:
- stabilize repo long-term memory;
- reduce repeated evidence rediscovery during later implementation work;
- make post-M2 ownership migration easier to audit;
- expose evidence gaps without inventing new findings;
- provide a frozen schema prerequisite for the future `M-13 Evidence Index Generator`.

---

## 3. Non-goals

S-09 does **not** design or authorize:

```text
a new evidence database
a new roadmap
a new regression registry
a new diagnostic validator
a new issue/debt tracker
a new live-evidence scoring engine
a new source-of-truth hierarchy
a raw-chat archive
a background scanner
a generator/automation implementation
automatic status repair
```

Existing evidence documents, Contracts, ownership maps, fixture registry, current-development authority, and release records remain authoritative in their existing scopes.

---

## 4. Authority model

Canonical principle:

```text
INDEX ENTRY
= READ-ONLY PROJECTION OF EXISTING AUTHORITIES
!= AUTHORITY PRODUCER
```

An index row may summarize a status only when that status is supported by the referenced authoritative documents.

If two authorities appear to conflict:

```text
do not reconcile inside the index
→ preserve/report the contradiction through the normal repo workflow
→ classify the actual contradiction separately
→ update the index only after the authoritative source state is resolved
```

The index must never silently choose a preferred story merely to keep a row clean.

---

## 5. Canonical entry shape

The frozen entry is one Markdown-table row with exactly eight logical fields:

```text
Contract
Owner
Authority
Live Evidence
Fixture
Evidence Release
Status
Related
```

Canonical table header:

```markdown
| Contract | Owner | Authority | Live Evidence | Fixture | Evidence Release | Status | Related |
|---|---|---|---|---|---|---|---|
```

No ninth free-form “Notes” column is part of v1.

Reason: the index must remain a navigation surface rather than grow into another narrative evidence ledger. Material nuance belongs in `Authority`, `Live Evidence`, or the referenced `Related` document/ID.

---

## 6. Field contract

### 6.1 `Contract`

Meaning: stable index-local key for the protected semantic or operational contract.

Format:

```text
lower-kebab-case
```

Examples:

```text
genuine-edit
summary-scope
reload-cache-continuity
broadcast-closure
```

Rules:
- prefer an existing permanent suite ID when one already names the same contract cleanly;
- otherwise use the established contract/design terminology from the authority document;
- do not create a second synonym for an existing contract;
- renaming requires an explicit migration note because future automation may key on this value.

The `Contract` key is an index identifier only. It does not become semantic authority merely by existing in the index.

### 6.2 `Owner`

Meaning: canonical **semantic / contract owner**, not necessarily the physical writer, holder, Store, Session, or Runtime transport.

Rules follow State Ownership Registry v2:

```text
owner != writer != holder
```

Preferred values:
- physical module/service name when ownership is already stable;
- frozen target service name when Contracts v2 already defines the owner but physical extraction is still transitional;
- multiple owners only when the protected contract is intentionally split and the authority document explicitly says so.

Examples:

```text
Lifecycle
Time
Frame + Structure
edit-reconcile
runtime-telemetry
```

Do not put `Session` or `Store` in this field merely because they persist or adopt a result.

### 6.3 `Authority`

Meaning: one primary repository path, optionally with a section/contract label, that defines what the indexed contract means.

Examples:

```text
docs/SIMCORE_CONTRACTS_V2.md §6
docs/SIMCORE_SUMMARY_SCOPE_PERMANENT_FIXTURE_DESIGN_2026-08-26.md
products/simcore/tests/registry.mjs
```

Rules:
- exactly one primary authority reference per row;
- if several documents are relevant, choose the document that defines the contract, not the newest document that merely mentions it;
- supporting documents belong in `Live Evidence` or `Related`;
- historical evidence is never promoted to contract authority merely because it contains a successful sample.

### 6.4 `Live Evidence`

Meaning: the **latest qualifying direct live evidence document** for the exact indexed contract.

Value:

```text
repository path
or
NONE
```

Rules:
- cite a dedicated evidence document when one exists;
- do not embed RAW bodies, fingerprints, timings, or diagnostic excerpts in the index row;
- do not cite a broad roadmap document merely because it summarizes the result when a dedicated live-evidence document exists;
- `NONE` means no qualifying direct live evidence document is currently indexed;
- synthetic fixtures are not live evidence and must never occupy this field.

“Latest” refers to the latest qualifying specimen, not necessarily the latest production version.

### 6.5 `Fixture`

Meaning: permanent regression suite identity and current execution class, when one protects the same contract.

Canonical forms:

```text
suite-id [EXECUTABLE]
suite-id [HYBRID_TRANSITIONAL]
NONE
```

Rules:
- use only the permanent-harness registry identity;
- do not list one-shot/manual checks as permanent fixtures;
- a DESIGN FROZEN but not yet implemented future suite is not falsely presented as registered; until implementation it is `NONE` and the future suite relationship remains in the authority/design document;
- when an existing HYBRID suite becomes executable after ownership movement, update only the execution class while preserving the stable suite ID.

### 6.6 `Evidence Release`

Meaning: production version that produced the `Live Evidence` specimen.

Canonical form:

```text
vMAJOR.MINOR.PATCH
```

or:

```text
NONE
```

Rules:
- this is **not** the current production version unless the cited specimen actually came from current production;
- if `Live Evidence = NONE`, then `Evidence Release = NONE`;
- an older release number is legitimate historical provenance and must not be rewritten to look current.

This field prevents a historical PASS from being visually mistaken for evidence captured on the current release.

### 6.7 `Status`

Frozen vocabulary:

```text
PASS
WATCH
GAP
```

No additional status values belong in v1.

#### `PASS`

Use when the existing authorities currently accept the contract as sufficiently proven for the indexed scope and no unresolved contradictory evidence invalidates that claim.

`PASS` does not mean:
- every future milestone is already validated;
- every semantic rendering example is perfect;
- no related WATCH/debt exists;
- the cited live evidence came from the current production release.

A future ownership move can legitimately change a previously `PASS` row to `GAP` until its required post-move control is rerun.

#### `WATCH`

Use when qualifying evidence exists but an unresolved anomaly, uncertainty, or natural-sample question materially prevents a clean PASS for the exact indexed scope.

`WATCH` is observational, not a failure verdict.

Do not promote an unrelated repository WATCH into this row’s status.

#### `GAP`

Use when a required proof surface for the indexed scope is absent, no qualifying live evidence exists where live proof is required, or a milestone has invalidated the applicability of the prior close proof until a required recheck occurs.

`GAP` does not automatically mean a correctness defect.

Confirmed FIX/BLOCKER severity remains owned by the corresponding ledger/gate document and is linked through `Related` rather than expanding the index status vocabulary.

### 6.8 `Related`

Meaning: compact references to existing identifiers that materially qualify the row.

Allowed examples:

```text
TD-01, TD-11
WATCH:COMMUNITY_PLATFORM_FAMILY_DIVERSITY
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
NONE
```

Rules:
- comma-separated identifiers only;
- link existing identifiers, do not invent prose mini-issues inside the row;
- include only material relationships that affect interpretation of the evidence posture;
- unrelated global roadmap items are excluded;
- severity/priority remains owned by the referenced authority.

---

## 7. Cross-field invariants

Every future index entry must satisfy:

```text
Live Evidence = NONE
→ Evidence Release = NONE

Fixture != NONE
→ fixture ID must exist in the permanent registry at the time the index is materialized

Status = PASS
→ Authority must exist
→ status must be supportable from referenced repo authorities

Status = WATCH
→ Related or Live Evidence must identify the material uncertainty source

Status = GAP
→ the absence/milestone gap must be supportable from Authority / Related state

Owner
→ must mean semantic/contract ownership, not persistence/transport convenience
```

Forbidden:

```text
PASS inferred from fixture existence alone
PASS inferred from one old sample while current authority explicitly requires a new close control
WATCH invented because an unrelated watch exists elsewhere
GAP used as a synonym for “not implemented” when the contract itself is already proven
Evidence Release silently replaced with current production version
```

---

## 8. Current-line transition rule

An important SimCore case is mechanical ownership movement.

Canonical behavior:

```text
pre-move contract evidence PASS
→ mechanical owner extraction occurs
→ if the frozen migration plan requires a post-move live control
→ index status becomes GAP until that control passes
→ new live evidence captured
→ update Live Evidence + Evidence Release
→ status returns PASS
```

This makes the index truthful without declaring the architecture move itself a correctness failure.

Example family: `genuine-edit` after M2-3.

The v0.64.5 direct live control proves the current pre-M2-3 line. The frozen M2 sequencing still requires a direct post-extraction genuine-edit close control before M2-4. Therefore a future M2-3 landing changes the evidence requirement and may temporarily change the row to `GAP` until the required recheck passes.

---

## 9. Evidence selection precedence

When several possible live documents exist for one contract, choose in this order:

```text
1. exact contract + current physical ownership line
2. exact contract + nearest previous compatible line
3. older direct golden control still explicitly accepted by current authority
4. otherwise NONE
```

Do not replace an exact live specimen with a newer but less relevant broad summary.

If a dedicated live document and an aggregate evidence ledger both record the same event, `Live Evidence` points to the dedicated specimen.

---

## 10. Contract granularity rule

One row should represent one evidence question.

Good:

```text
genuine-edit
representation-fast
summary-scope
broadcast-closure
```

Avoid:

```text
all-edit-behavior
all-broadcast-behavior
all-runtime-health
```

But do not split a frozen existing contract merely to create more rows. Existing suite/contract boundaries take precedence over aesthetic granularity.

Canonical test:

```text
Can one owner/authority statement and one evidence posture describe this row without hiding a materially different claim?
YES → one row
NO  → separate established contracts only if the underlying authority already distinguishes them
```

---

## 11. Historical evidence rule

Historical evidence is legitimate and must remain historical.

Therefore:

```text
Evidence Release = version that produced the sample
Live Evidence = historical evidence path
Status = PASS
```

is allowed when current authority still accepts that sample for the indexed scope.

Do not rewrite historical evidence to current version merely for visual consistency.

If current authority later requires a fresh current-line proof, the status changes according to the requirement; the old document remains preserved.

---

## 12. WATCH / anomaly rule

The index is not the anomaly ledger.

When a new anomaly appears:

```text
preserve it immediately in the proper evidence/watch document
→ classify WATCH / DEFER / FIX / BLOCKER there
→ determine whether it materially changes an indexed contract’s evidence posture
→ only then update the row’s PASS / WATCH / GAP projection
```

A WATCH does not automatically contaminate every related contract row.

---

## 13. Raw-data / privacy / persistence boundary

S-09 stores no runtime data.

Future index materialization may contain only repository references and bounded identifiers.

Forbidden:

```text
raw chat bodies
raw Fresh bodies
full diagnostic copies
user prose excerpts
unbounded event histories
runtime-local fingerprints copied into the index
```

The dedicated evidence documents remain responsible for their own bounded-evidence rules.

---

## 14. Failure behavior

Because the index is navigation metadata, failure must be fail-safe and non-authoritative.

If a future manual or generated entry cannot resolve a required field:

```text
do not guess
use NONE only where the schema permits absence
otherwise mark/update the authoritative evidence issue first
```

If an automation later detects a contradiction:

```text
REPORT
!= AUTO-REWRITE AUTHORITY
```

S-09 does not authorize automatic correction.

---

## 15. Update triggers

A materialized index row should be reconsidered only when one of these occurs:

```text
new qualifying live evidence
permanent fixture registration / execution-class promotion
contract ownership or authority document changes
an indexed WATCH/debt/gate changes evidence applicability
a required post-milestone control becomes pending or passes
a contract is explicitly retired/superseded
```

Do not churn rows because a document timestamp changed or because an unrelated release occurred.

---

## 16. Retirement / supersession

If a contract is retired or superseded:

- do not silently repurpose the same `Contract` key for a different semantic meaning;
- preserve the old evidence documents;
- a future materialized index may remove the active row only when the authoritative roadmap/contract explicitly retires it;
- successor contracts use their own established key.

Historical index snapshots, if ever committed, remain historical evidence and are not rewritten.

---

## 17. Non-authoritative design examples

These examples demonstrate format only. They are **not a materialized Evidence Index** and must not be treated as current index authority.

```markdown
| Contract | Owner | Authority | Live Evidence | Fixture | Evidence Release | Status | Related |
|---|---|---|---|---|---|---|---|
| genuine-edit | edit-reconcile | docs/SIMCORE_CONTRACTS_V2.md §6 | docs/SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md | genuine-edit [HYBRID_TRANSITIONAL] | v0.64.5 | PASS | TD-01, TD-11 |
| reload-cache-continuity | runtime-telemetry | current release/evidence authority | NONE | reload-cache-continuity [EXECUTABLE] | NONE | GAP | 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT |
```

The first row illustrates historical direct live evidence that remains accepted on the pre-M2-3 line. The second illustrates the distinction between an executable fixture and a still-pending required live proof: fixture existence alone cannot create `PASS`.

When M2-3 physically lands, the `genuine-edit` row must be reevaluated under the transition rule rather than mechanically retaining PASS.

---

## 18. Future materialized index file

S-09 freezes only the entry contract.

A later stabilization/implementation item may choose to materialize a canonical index file. Recommended future location:

```text
docs/SIMCORE_EVIDENCE_INDEX.md
```

That future work must:
- use the eight-field v1 schema exactly unless a separately approved schema revision changes it;
- populate rows from authoritative repository evidence;
- remain read-only/navigation authority;
- avoid copying raw evidence bodies.

Creating that index file is **implementation of S-09** and is intentionally not performed during this design work.

---

## 19. Relationship to M-13 Evidence Index Generator

S-09 is the prerequisite contract for M-13.

Canonical dependency:

```text
S-09 Evidence Index Entry Format
DESIGN FROZEN
        ↓
future S-09 materialization can use the frozen schema
        ↓
M-13 generator may later automate discovery/update
```

M-13 may not redefine:

```text
status semantics
owner semantics
authority precedence
row fields
raw-data boundary
```

without first revising S-09 as a separate design change.

M-13 remains unselected and unimplemented.

---

## 20. Verification obligations for future implementation

When S-09 is later selected for implementation, minimum verification must include:

```text
schema: exactly eight logical fields
all Contract keys unique
all Authority paths resolve
all non-NONE Live Evidence paths resolve
all non-NONE Fixture IDs exist in permanent registry
Live Evidence NONE ↔ Evidence Release NONE invariant
Status vocabulary limited to PASS / WATCH / GAP
no raw evidence body embedded
historical Evidence Release values preserved
sample known contracts match authoritative current evidence posture
```

If tooling materializes or updates the index, CI/static checks may enforce these structural properties later. S-09 itself does not add CI now.

---

## 21. Live-validation obligation

Future implementation of a repository-only evidence index requires **no plugin runtime release and no real long-chat validation solely for the index**.

However the index may only report live-evidence statuses that are supported by real long-chat evidence when the underlying contract requires such proof.

Therefore:

```text
index implementation validation
= repo/static correctness

underlying contract live proof
= remains owned by that contract’s normal live gate
```

The index must never manufacture live confidence from repository formatting.

---

## 22. Implementation boundary

Future implementation class:

```text
NON_RUNTIME / REPO_MEMORY
```

Forbidden coupling:

```text
runtime source edits
latest.js / install.js edits
release-simcore publication
plugin version bump
schema migration
M2 ownership work
release-system redesign
```

If implemented later, it should be one bounded repository/tooling item.

---

## 23. Open design questions

```text
NONE
```

All currently known design questions required by `SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md` are resolved for S-09.

---

## 24. Final frozen contract

```text
S-09 EVIDENCE INDEX ENTRY FORMAT

PURPOSE
= connect existing contract/evidence authorities

ENTRY
= exactly 8 fields
  Contract
  Owner
  Authority
  Live Evidence
  Fixture
  Evidence Release
  Status
  Related

STATUS
= PASS / WATCH / GAP only

OWNER
= semantic/contract owner, not writer/holder convenience

LIVE EVIDENCE
= latest qualifying direct live evidence path or NONE

FIXTURE
= permanent registry suite + execution class or NONE

EVIDENCE RELEASE
= version that produced cited live evidence, never silently currentized

AUTHORITY
= existing contract authority; index never becomes semantic authority

RAW DATA
= forbidden

AUTOMATIC REPAIR
= forbidden

IMPLEMENTATION NOW
= NONE

DESIGN STATUS
= FROZEN

PARKING STATUS
= PARKED FOR STABILIZATION
```

STOP boundary reached. No implementation follows from this document.