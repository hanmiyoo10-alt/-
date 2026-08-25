# SimCore Natural Evidence Corpus Index Design

Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-12 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-12`
Importance: `4 / HIGH`
Design difficulty: `2 / EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/SIMCORE_LIVE_EVIDENCE_PACKET_BUILDER_DESIGN.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`
- `docs/SIMCORE_RUNTIME_WATCH_06402.md`
- `docs/SIMCORE_M2_LIVE_06400_INBOX.md`
- `docs/SIMCORE_M2_LIVE_EVIDENCE.md`

---

## 1. Problem

SimCore already preserves real long-chat evidence in several intentionally different repository forms:

```text
live inboxes
focused WATCH documents
dedicated live-control documents
release validation documents
performance evidence notes
recovery evidence
aggregate M2 live evidence
```

That distribution is correct because each file preserves the context appropriate to its event. The navigation problem is different:

```text
Which natural real-chat specimens have we actually seen?
Which scenario did each specimen exercise?
Which production version/runtime/turn produced it?
Where was it first captured?
Where is its best current evidence document?
What classification did the repository give it?
Which contracts or WATCH families does it inform?
```

Today the answer often requires rediscovering old inbox sections, validation documents, and WATCH files manually.

S-12 defines one bounded **Natural Evidence Corpus Index** for repository navigation across real long-chat specimens without copying raw chat bodies or replacing the evidence documents themselves.

---

## 2. Core identity

Canonical principle:

```text
NATURAL EVIDENCE CORPUS INDEX
= SPECIMEN CATALOG / NAVIGATION SURFACE
!= EVIDENCE AUTHORITY
!= CONTRACT PASS/FAIL AUTHORITY
!= WATCH/FIX/BLOCKER CLASSIFIER
!= RAW CHAT ARCHIVE
!= TEST FIXTURE REGISTRY
```

The corpus answers:

```text
what real specimen exists
→ what scenario it belongs to
→ where its repository evidence lives
```

The source evidence document remains authoritative for what the specimen proves and how it was classified.

---

## 3. Why the unit is a specimen, not a file

Repository evidence files and real specimens are not one-to-one.

Current patterns already include:

```text
one live inbox document
→ many distinct natural specimens

one natural specimen
→ first captured in an inbox
→ later promoted into a dedicated evidence/watch document
→ later summarized again in CURRENT_DEVELOPMENT or a release close
```

Therefore:

```text
FILE != SPECIMEN
```

Frozen unit:

```text
one corpus row
= one reviewed natural evidence specimen
```

A specimen may be:
- one bounded request/output observation;
- one paired next-turn proof;
- one bounded real-chat sequence when the source document explicitly treats the sequence as a single proof unit.

The index must never split or merge a source-defined proof sequence merely to make the table prettier.

---

## 4. Natural-evidence eligibility

A specimen is eligible only when repository evidence supports that it came from **actual production real-chat operation** rather than synthetic simulation.

### Included

Examples:

```text
ordinary long-chat request/output
natural representation mismatch + next-turn carryover
natural warning/anomaly
natural recovery after an anomaly
natural Broadcast sequence
natural B_END → C handoff
natural performance sample
natural host/history/cache-boundary observation
natural user-visible quality specimen
```

Explicitly opening/copying diagnostics after the turn does not make the underlying turn synthetic.

A release-validation sequence may still qualify when it uses the normal production path in the real ongoing chat and does not manufacture invalid semantic state solely to trigger the result.

### Excluded by default

```text
unit/static fixture
mocked Host/Fresh data
synthetic replay
branch-only candidate execution
shadow release transaction
CI-only evidence
hand-written fake diagnostic
intentional state corruption solely to trigger a fault
provider/cache speculation without real receipt
repository-only release proof
```

A deliberately staged live control is not automatically `natural` merely because it ran in production. If the evidence document identifies the scenario as a controlled validation action rather than a naturally occurring operational specimen, keep it outside S-12 and let S-09 or its dedicated evidence document carry it.

This prevents `live` and `natural` from becoming synonyms.

### Fail-closed eligibility

If naturalness cannot be established from the preserved repository evidence:

```text
DO NOT INDEX YET
```

Do not guess from file names or version numbers.

---

## 5. Relationship to ordinary intentional user actions

Normal product use can be intentional without becoming synthetic.

Examples:

```text
user naturally chooses B_END
user naturally edits a previous response during ordinary use
user naturally requests a long annual summary
```

These may qualify when they are part of ordinary real-chat use and the source evidence treats them as natural operational events.

By contrast:

```text
edit a response solely because the validation plan needs a MANUAL_EDIT_REBUILT specimen
```

is a controlled live test and is excluded from the natural corpus unless a separate later natural occurrence is observed.

The source document owns this distinction; S-12 does not reconstruct intent after the fact.

---

## 6. Frozen v1 index shape

Future materialized index file:

```text
docs/SIMCORE_NATURAL_EVIDENCE_CORPUS_INDEX.md
```

S-12 freezes an eleven-field Markdown row:

```text
Specimen
Captured
Scenario
Production
Observation
Role
Primary Source
Origin
Disposition
Contracts
Record State
```

Canonical header:

```markdown
| Specimen | Captured | Scenario | Production | Observation | Role | Primary Source | Origin | Disposition | Contracts | Record State |
|---|---|---|---|---|---|---|---|---|---|---|
```

No free-form `Notes` column belongs in v1.
Narrative interpretation remains in the source evidence document.

---

## 7. `Specimen`

Meaning: stable corpus identity for one real evidence unit.

Frozen format:

```text
NE-YYYYMMDD-NNN
```

Examples:

```text
NE-20260821-001
NE-20260822-003
```

Rules:
- date is the first repository-preservation date for the specimen, not an inferred event date;
- `NNN` is unique within that date;
- once assigned, the ID never changes because a better source document is later created;
- the ID carries no semantic verdict;
- scenario/contract names must not be embedded in the ID and therefore cannot silently change its identity.

If the first-preservation date cannot be established, the specimen is not materialized until repository evidence resolves it.

---

## 8. `Captured`

Meaning: first repository-preservation date for the natural specimen.

Format:

```text
YYYY-MM-DD
```

This is not necessarily the exact runtime wall-clock timestamp.

If a source contains an exact runtime capture timestamp, that remains source evidence and is not duplicated into the corpus row unless needed in `Observation`.

Historical dates are never rewritten to current date.

---

## 9. `Scenario`

Meaning: stable scenario/family identifier describing what kind of evidence this specimen is.

Preferred precedence:

```text
existing WATCH / gate / contract / established scenario identifier
→ reuse it

otherwise
→ create one bounded scenario key when the specimen is first preserved
```

Examples:

```text
CORE_HANDSHAKE_TRANSIENT_MISS
REPRESENTATION_FAST_RECONCILE
PANEL_SNAPSHOT_FRESHNESS
POST_BEND_C_CLOCK_HANDOFF
STORE_LATENCY_DOMINANCE
COMMUNITY_REACTION_ATTRIBUTION
```

Rules:
- one primary Scenario per row;
- do not invent aliases for an existing established family;
- scenario is a discovery key, not causal attribution;
- if causality is unknown, the scenario name must remain observational rather than naming an unproven cause.

Bad:

```text
POCKETRISU_BROKE_HANDSHAKE
```

when Host/SimCore causality is unestablished.

---

## 10. `Production`

Meaning: production SimCore version that produced the specimen.

Format:

```text
vMAJOR.MINOR.PATCH
```

Rules:
- use the actual version from source evidence;
- never replace an old version with current production for visual consistency;
- branch/candidate versions that never became production are ineligible for this natural-production corpus.

This field is provenance, not current applicability.

---

## 11. `Observation`

Meaning: bounded request/output/runtime reference sufficient to relocate the event inside its source evidence without raw content.

Preferred forms:

```text
<runtime-generation> · @2062
<runtime-generation> · @2064→@2065
<runtime-generation> · @2018→@2020 paired
<generation-A>→<generation-B> · reload sequence
```

Rules:
- bounded identifiers only;
- raw user/assistant text forbidden;
- no full fingerprints or full chat objects;
- a multi-turn range is allowed only when the source document treats it as one proof unit;
- cross-generation references are allowed only for scenarios whose evidence inherently spans a reload/generation boundary.

The corpus does not create diagnostic observation identity; it references the already-preserved evidence location.

---

## 12. `Role`

Meaning: why the natural specimen is useful in the evidence corpus.

Frozen v1 role vocabulary:

```text
LIVE_GATE
REGRESSION_CONTROL
ANOMALY
RECOVERY_CONTROL
PERFORMANCE_SAMPLE
QUALITY_SAMPLE
```

At most two roles may be listed for one specimen, separated by `+`.

Examples:

```text
ANOMALY+RECOVERY_CONTROL
LIVE_GATE+REGRESSION_CONTROL
```

Rules:
- role describes evidence use, not severity;
- `ANOMALY` does not imply FIX;
- `PERFORMANCE_SAMPLE` does not imply a performance defect;
- do not create new roles for every subsystem.

If none of the six roles accurately describe a new natural specimen, revise S-12 explicitly rather than inventing a private row-local role.

---

## 13. `Primary Source`

Meaning: best current repository document/section for reviewing the specimen.

Preferred source precedence:

```text
1. dedicated exact-specimen evidence document
2. focused WATCH / investigation document
3. focused release live-validation document
4. aggregate live inbox / evidence ledger section
5. broad current-development summary only when no better evidence source exists
```

Rules:
- source must be a repository path plus section/anchor when the file contains multiple specimens;
- choose the most direct specific evidence source, not merely the newest document;
- changing Primary Source never changes Specimen ID;
- a summary that only mentions the event must not displace a dedicated direct-evidence document.

---

## 14. `Origin`

Meaning: first repository location where the specimen was preserved.

Examples:

```text
docs/SIMCORE_M2_LIVE_06400_INBOX.md#natural-v0640-representation-mismatch

docs/SIMCORE_RUNTIME_WATCH_06402.md#core_handshake_transient_miss
```

Frozen rule:

```text
Origin is immutable after materialization.
```

If the specimen is later promoted:

```text
Origin stays the original inbox/watch section
Primary Source may move to the new dedicated evidence document
```

This preserves the actual evidence provenance chain without duplicating narrative.

---

## 15. `Disposition`

Meaning: compact projection of the repository-owned classification when one is explicitly available.

Frozen v1 vocabulary:

```text
PASS
WATCH
DEFER
FIX
BLOCKER
N/A
```

Rules:
- S-12 never generates the classification;
- use `PASS` only when the source/evidence authority explicitly accepts the specimen as a pass/control/close result for its stated scope;
- use WATCH / DEFER / FIX / BLOCKER only when existing repository evidence assigns that classification or an unambiguous canonical equivalent;
- use `N/A` for a valid natural control/sample whose source does not assign a governance disposition;
- do not retrospectively upgrade `OBSERVE_ONLY`, `SUSPECTED`, or other historical wording into FIX/BLOCKER merely for normalization;
- when historical wording cannot be mapped without judgment, use `N/A` and let Primary Source carry the original wording.

The corpus is therefore classification-preserving, not classification-producing.

---

## 16. `Contracts`

Meaning: bounded stable IDs for contracts/WATCH/gate families materially informed by the specimen.

Examples:

```text
representation-fast
WATCH:CORE_HANDSHAKE_TRANSIENT_MISS
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
TD-01
NONE
```

Rules:
- comma-separated stable identifiers only;
- maximum initial v1 target: four identifiers;
- do not duplicate long prose descriptions;
- include only relationships supported by source evidence;
- this field does not make S-12 a contract authority;
- `NONE` is allowed for a useful specimen not yet attached to a durable contract family.

Where an S-09 Contract key already exists, prefer that exact key for the same semantic contract.

---

## 17. `Record State`

Meaning: integrity state of the corpus record itself, not runtime correctness.

Frozen vocabulary:

```text
ACTIVE
RETRACTED
DUPLICATE→<Specimen ID>
```

### `ACTIVE`

The specimen remains a legitimate corpus record.

Historical age or superseding releases do not make a valid specimen inactive.

### `RETRACTED`

Use only when later authoritative evidence establishes that the original entry is unusable or materially misidentified.

The row remains preserved rather than silently deleted.

### `DUPLICATE→<Specimen ID>`

Use when two corpus IDs are later proven to represent the same real event.

The earlier/canonical specimen remains ACTIVE; the duplicate row points to it.

Do not use Record State to represent WATCH/FIX/BLOCKER. That belongs in Disposition.

---

## 18. Promotion rule — inbox to dedicated evidence

A common lifecycle is:

```text
natural event
→ first capture in live inbox
→ adjacent evidence arrives
→ dedicated evidence/watch document created
```

Frozen corpus behavior:

```text
Specimen ID      UNCHANGED
Captured         UNCHANGED
Origin           UNCHANGED
Primary Source   UPDATE to dedicated source
Disposition      UPDATE only if authority classification changed
Contracts        UPDATE only if an established relationship became explicit
Record State     ACTIVE
```

Do not create a second corpus row merely because the same event gained a better document.

---

## 19. Recurrence rule

A repeated natural event is a new specimen when it is an independently observed real occurrence.

Example:

```text
CORE_HANDSHAKE_TRANSIENT_MISS at @2062
and another independent miss later
→ two Specimen IDs
→ same Scenario
```

Reason: recurrence count is evidence.

Do not collapse repeated real occurrences into one row merely because the scenario name matches.

Conversely, multiple documents describing the same occurrence remain one specimen.

Canonical distinction:

```text
same event, many documents
= ONE specimen

same scenario, new real occurrence
= NEW specimen
```

---

## 20. Paired / sequence evidence rule

Some natural evidence only becomes meaningful as a bounded sequence.

Examples:

```text
output representation mismatch
→ next request exact Fresh carryover
→ Representation Fast Reconcile

B_END
→ immediate first C
→ second ordinary C decoupling control

reload generation A
→ generation B handoff observation
```

A source may define that bounded sequence as one specimen when the proof question inherently depends on the relation among those observations.

Rules:
- Primary Source must explicitly present the observations as one proof unit;
- Observation field records the bounded sequence reference;
- do not duplicate each member as separate rows unless each member also has an independently meaningful evidence role in its own source;
- no raw bodies are copied into the corpus.

---

## 21. Historical evidence rule

Natural evidence remains useful after production advances.

Therefore:

```text
Production = v0.64.0
Captured = 2026-08-21
Record State = ACTIVE
```

is valid while current production is later.

Do not rewrite old rows to the current version.

Historical compatibility/current proof posture is owned by S-09 and the relevant contract authority, not S-12.

S-12 answers `what happened and where is it documented?`, not `does this still close the current contract?`.

---

## 22. Relationship to S-04 Live Evidence Packet Builder

S-04 and S-12 occupy different points in the evidence flow.

```text
S-04
= capture-time bounded transfer packet

S-12
= repository-level index after evidence has been reviewed/preserved
```

Canonical future flow:

```text
natural observation
→ optional S-04 packet
→ forensic review
→ dedicated/aggregate repository evidence entry
→ classification
→ S-12 corpus row
```

S-12 must not index an unreviewed clipboard packet as if it were repository evidence.

A packet may help populate metadata, but the source document—not the packet—is the corpus authority.

---

## 23. Relationship to S-09 Evidence Index

The two indexes use different primary axes.

```text
S-09 Evidence Index
= CONTRACT-CENTRIC
= what currently proves/protects this contract?

S-12 Natural Evidence Corpus
= SPECIMEN-CENTRIC
= what natural real-chat evidence have we actually observed?
```

Therefore one natural specimen may be:
- listed once in S-12;
- referenced as `Live Evidence` by one or more S-09 contract rows when applicable.

S-12 does not decide which specimen is the latest qualifying proof for S-09.
S-09 does not need to list every historical natural specimen.

Canonical relationship:

```text
many S-12 specimens
→ one S-09 contract may select the latest qualifying source
```

No automatic bidirectional write is authorized by this design.

---

## 24. Relationship to M-10 Live Diagnostic → Fixture Skeleton Generator

S-12 may later make good natural specimen candidates easier to discover for M-10.

But:

```text
indexed natural specimen
!= safe fixture assertion
```

M-10 must still review:
- which facts are deterministic;
- which facts are observational only;
- which unknowns must remain unasserted;
- whether the physical owner is stable enough for a permanent fixture.

S-12 never emits fixture code or fixture expectations.

---

## 25. Raw-data / privacy boundary

The future corpus index stores navigation metadata only.

Forbidden in rows:

```text
raw user prose
raw assistant output
full COMMUNITY blocks
full Knowledge blocks
full diagnostics
raw Fresh bodies
full prompt text
full host chat objects
exception stacks
long warning text
full fingerprints/body hashes when not necessary for navigation
```

Allowed bounded references:

```text
version
runtime generation
turn indices
scenario IDs
contract/watch/gate IDs
repository paths/anchors
small role/disposition enums
```

The corpus is not a telemetry warehouse.

---

## 26. Source-anchor rule

Because aggregate inbox/watch files can contain many specimens, file path alone is insufficient whenever ambiguity exists.

Frozen rule:

```text
multi-specimen source
→ path + stable heading/anchor required
```

If an existing document heading is not anchor-safe/stable enough, future implementation may use a bounded explicit evidence ID added to that source as a separate repository/documentation change.

S-12 does not authorize rewriting historical documents merely to make every old anchor pretty.

---

## 27. Sorting and discovery

Future canonical materialized index order:

```text
Captured descending
→ Specimen ascending as tie-break
```

Reason: most recent natural evidence should be easiest to find while stable IDs preserve deterministic ordering within a day.

Search/discovery keys:

```text
Specimen
Scenario
Production
Role
Disposition
Contracts
```

Do not create separate duplicated corpus files per subsystem in v1.
One canonical index avoids multi-index drift.

---

## 28. Update triggers

A corpus row changes only when one of these happens:

```text
new natural specimen preserved
same specimen promoted to a better Primary Source
source authority explicitly changes Disposition
new established contract/watch/gate relationship becomes material
later evidence retracts the specimen
later review proves duplicate identity
source path/anchor is intentionally migrated
```

Do not churn rows because:

```text
a new unrelated release occurred
document modified timestamp changed
current production advanced
an old specimen is simply old
S-09 chose a different latest qualifying proof
```

---

## 29. Failure behavior

A future materializer/checker must fail safe.

If required metadata cannot be resolved:

```text
do not guess
→ do not add/update the row
→ report bounded corpus validation failure
```

Examples:

```text
source path missing
source anchor ambiguous
Production unsupported/missing
Specimen ID duplicate
Disposition not source-supported
naturalness unresolved
Origin would be overwritten
unknown Role value
```

No failure authorizes automatic repair of the evidence source.

---

## 30. Future implementation verification

When S-12 is later implemented, minimum repository/static verification must include:

```text
1. exactly eleven logical fields per active row
2. unique Specimen IDs
3. Specimen matches NE-YYYYMMDD-NNN
4. Captured date matches Specimen date component
5. Production is an explicit vX.Y.Z production version
6. Role values limited to frozen vocabulary, max two
7. Disposition limited to PASS/WATCH/DEFER/FIX/BLOCKER/N/A
8. Record State limited to ACTIVE/RETRACTED/DUPLICATE→ID
9. all Primary Source paths resolve
10. all Origin paths resolve
11. multi-specimen sources use a section/anchor reference
12. duplicate state points to an existing canonical Specimen ID
13. Contract IDs are bounded and max four
14. no row embeds raw bodies/full diagnostic payloads
15. historical Production values remain historical
16. source promotion changes Primary Source without changing Origin/Specimen
17. same event is not duplicated merely because it appears in several docs
18. naturalness remains human/source-evidence reviewed rather than inferred from filename alone
```

CI may verify structural invariants later.
CI cannot prove human historical intent/naturalness from syntax alone; that remains evidence-review responsibility.

---

## 31. Runtime / release boundary

Future S-12 implementation class:

```text
NON_RUNTIME / REPO_MEMORY / TEST_EVIDENCE NAVIGATION
```

It must not require solely for itself:

```text
plugin version bump
release-simcore publication
latest.js / install.js edits
real long-chat validation
SnapshotStore change
runtime diagnostic change
release-system redesign
```

If a later convenience tool is added to maintain/check the corpus, that work remains a separate non-runtime tooling item and must conform to this frozen schema.

---

## 32. Non-authoritative format examples

The following are format examples only and are **not** a materialized corpus or current evidence classification.

```markdown
| Specimen | Captured | Scenario | Production | Observation | Role | Primary Source | Origin | Disposition | Contracts | Record State |
|---|---|---|---|---|---|---|---|---|---|---|
| NE-20260822-001 | 2026-08-22 | CORE_HANDSHAKE_TRANSIENT_MISS | v0.64.2 | mt4bcgc3-5556z8 · @2062 | ANOMALY+RECOVERY_CONTROL | docs/SIMCORE_RUNTIME_WATCH_06402.md#core_handshake_transient_miss | docs/SIMCORE_RUNTIME_WATCH_06402.md#core_handshake_transient_miss | WATCH | WATCH:CORE_HANDSHAKE_TRANSIENT_MISS | ACTIVE |
| NE-20260821-001 | 2026-08-21 | REPRESENTATION_FAST_RECONCILE | v0.64.0 | mt2qjgt5-9oi0sk · @2018→@2020 paired | LIVE_GATE+REGRESSION_CONTROL | docs/SIMCORE_M2_LIVE_06400_INBOX.md#natural-v0640-representation-mismatch | docs/SIMCORE_M2_LIVE_06400_INBOX.md#natural-v0640-representation-mismatch | PASS | representation-fast | ACTIVE |
```

These examples demonstrate the separation between:
- specimen identity;
- source provenance;
- source-owned disposition;
- contract linkage.

Actual rows must be populated only during later S-12 implementation after direct source review.

---

## 33. Design rejection cases

Reject any future implementation proposal that turns S-12 into:

```text
raw chat archive
auto-WATCH/FIX classifier
second Evidence Index
second fixture registry
all-evidence database
runtime telemetry persistence
background crawler
whole-repo semantic inference engine
auto-delete old evidence system
```

If corpus maintenance later becomes large enough to need automation, the automation must remain a projection/checker over this schema rather than widening the corpus authority.

---

## 34. Open design questions

```text
NONE
```

The current source inventory is sufficient to freeze:
- eligibility;
- specimen granularity;
- identity;
- source promotion;
- recurrence;
- paired-sequence handling;
- classification projection;
- raw-data boundary;
- update/retirement behavior;
- future verification obligations.

---

## 35. Final frozen contract

```text
S-12 NATURAL EVIDENCE CORPUS INDEX

PURPOSE
= catalog real natural long-chat evidence specimens by scenario and source

UNIT
= one reviewed natural specimen
!= one file

ELIGIBILITY
= actual production real-chat operation
= no synthetic/mock/CI/shadow evidence
= controlled-live-only tests excluded unless later naturally observed

ROW
= 11 fields
  Specimen
  Captured
  Scenario
  Production
  Observation
  Role
  Primary Source
  Origin
  Disposition
  Contracts
  Record State

SPECIMEN ID
= NE-YYYYMMDD-NNN
= stable forever

SOURCE PROMOTION
= Primary Source may change
= Origin + Specimen remain immutable

RECURRENCE
= same scenario + new real occurrence
→ new Specimen

DUPLICATE DOCUMENTATION
= same real event in many docs
→ one Specimen

DISPOSITION
= source-owned projection only
= PASS / WATCH / DEFER / FIX / BLOCKER / N/A

RECORD STATE
= ACTIVE / RETRACTED / DUPLICATE→ID

RAW DATA
= forbidden in corpus row

S-04
= capture-time packet

S-09
= contract-centric evidence index

S-12
= specimen-centric natural evidence corpus

IMPLEMENTATION NOW
= NONE

DESIGN STATUS
= FROZEN

PARKING STATUS
= PARKED FOR STABILIZATION
```
