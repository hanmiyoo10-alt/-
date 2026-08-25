# SimCore Evidence Index Generator Design

Status: `DESIGN FROZEN · M-13 COMPLETE · PARKED FOR NR DIFFICULTY-3 TIER CLOSE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `M-13`
Domain: `DEVELOPER_TOOLING / TEST_EVIDENCE / REPO_MEMORY`
Importance: `4 / HIGH`
Design difficulty: `3 / MODERATE`
Design gate at selection: `NOW / NON_RUNTIME · S-09 DEPENDENCY SATISFIED`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- `docs/SIMCORE_S09_EVIDENCE_INDEX_IMPLEMENTATION_EVIDENCE_2026-08-26.md`
- `products/simcore/tests/registry.mjs`
- `docs/SIMCORE_GUIDELINES.md`

---

## 1. Problem

S-09 established and materialized a compact eight-field Evidence Index:

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

The first materialization is intentionally conservative and manually curated.
That is correct for authority safety, but repeated maintenance has predictable mechanical costs:

```text
copy the same eight-field structure
keep Contract keys unique
keep status vocabulary bounded
keep NONE relationships coherent
look up fixture execution class in registry
preserve historical Evidence Release provenance
keep Markdown table formatting stable
notice accidental direct edits to generated/navigation content
```

The dangerous response would be a repository crawler that attempts to infer:

```text
which document is authoritative
which live specimen is latest qualifying evidence
whether the contract is PASS / WATCH / GAP
whether an old proof remains applicable after an ownership move
```

Those are evidence/governance decisions and remain outside tooling authority.

M-13 defines a deterministic **Evidence Index Generator** that automates only the mechanical projection after a reviewed row declaration already exists.

---

## 2. Product / operator value

Target future workflow:

```text
review contract + evidence authorities
→ explicitly update bounded index-source manifest
→ M-13 validates mechanical invariants
→ M-13 resolves permanent-fixture execution class from current registry
→ deterministic docs/SIMCORE_EVIDENCE_INDEX.md render
→ check generated view for drift
→ ordinary repo review/commit
```

Expected value:
- remove repeated Markdown-table editing;
- prevent stale duplicated fixture execution classes;
- catch malformed/duplicate rows before merge;
- preserve S-09 cross-field invariants mechanically;
- make the human-readable index reproducible;
- avoid turning repository search heuristics into evidence authority.

---

## 3. Constitutional identity

Canonical principle:

```text
M-13 EVIDENCE INDEX GENERATOR
= CURATED INDEX SOURCE → VALIDATED DETERMINISTIC VIEW
!= EVIDENCE DISCOVERY ENGINE
!= LATEST-EVIDENCE SELECTOR
!= PASS/WATCH/GAP CLASSIFIER
!= CONTRACT OWNER RESOLVER
!= DOC RECONCILER
!= ROADMAP WRITER
```

M-13 may validate a declared projection.
It may not decide what the projection should mean.

---

## 4. Three authority layers

M-13 freezes three intentionally different authority roles.

### 4.1 Semantic/evidence authorities

Existing contract, live-evidence, fixture, gate, debt, WATCH, and roadmap documents remain authoritative for their existing scopes.

They answer questions such as:

```text
what does this contract mean?
who semantically owns it?
what live evidence qualifies?
is a post-milestone recheck required?
why is the current posture PASS / WATCH / GAP?
```

M-13 never supersedes them.

### 4.2 Index curation source

Future machine-readable file:

```text
products/simcore/evidence/evidence-index-source-v1.json
```

This file is authoritative only for:

```text
which reviewed rows are currently materialized in the Evidence Index
+ the explicit bounded S-09 projection chosen for each row
```

It is **not** semantic evidence authority.

Changing a row in this source still requires prior review of the referenced authorities.

### 4.3 Human navigation view

Generated file remains:

```text
docs/SIMCORE_EVIDENCE_INDEX.md
```

After M-13 implementation this becomes a deterministic human-readable projection of the curation source plus fixture-registry resolution.

Canonical rule:

```text
edit curation source
→ regenerate Markdown

DO NOT hand-edit generated row content
```

The Markdown file remains the convenient human navigation surface; the curation source becomes the machine-maintenance source for that view.

---

## 5. Why a curated manifest is required

M-13 must not discover rows by scanning the repository.

Forbidden discovery patterns:

```text
grep every file for PASS
take newest ModifiedAt document
choose highest version number as latest evidence
infer Owner from module names
turn every fixture registry row into an Evidence Index row
map every WATCH to WATCH status automatically
parse prose and choose an Authority document heuristically
```

Reason:

```text
repository presence
!= evidence applicability

newest document
!= contract authority

fixture existence
!= live PASS

textual mention
!= semantic ownership
```

Therefore row inclusion is explicit and fail-closed.

```text
row absent from curation source
!= GAP
!= unproven
!= deprecated
```

This preserves S-09's bounded initial-coverage rule.

---

## 6. Frozen source-manifest shape

Future source file:

```text
products/simcore/evidence/evidence-index-source-v1.json
```

Top-level conceptual shape:

```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "contract": "representation-fast",
      "owner": "edit-reconcile",
      "authority": "docs/... §...",
      "liveEvidence": "docs/...",
      "fixtureId": "representation-fast",
      "evidenceRelease": "v0.64.6",
      "status": "PASS",
      "related": ["TD-01", "TD-10"]
    }
  ]
}
```

The source manifest intentionally does not store rendered Markdown syntax.

---

## 7. Source field contract

### `schemaVersion`

Frozen v1 value:

```text
1
```

Unknown future schema versions fail closed.

### `contract`

Same S-09 `Contract` meaning.

Requirements:

```text
lower-kebab-case
unique in manifest
non-empty
```

Generator never renames or aliases a key.

### `owner`

Exact reviewed S-09 semantic-owner projection.

The generator does not derive it from source imports, Store writes, Session calls, or filenames.

### `authority`

One reviewed primary authority reference.

Format remains a repository-relative path with an optional human locator suffix such as:

```text
docs/SIMCORE_CONTRACTS_V2.md §6
```

Generator validates the repository path portion exists.
It does not semantically validate that the section actually proves the contract.

### `liveEvidence`

Value:

```text
repository reference
or null
```

`null` renders as `NONE`.

Generator validates the repository path portion exists when non-null.
It does not decide whether the document is the latest qualifying specimen.

### `fixtureId`

Value:

```text
permanent registry suite ID
or null
```

Important: the curation source stores **only the stable suite ID**, not its execution class.

The generator resolves:

```text
EXECUTABLE
HYBRID_TRANSITIONAL
```

from the current canonical permanent fixture registry:

```text
products/simcore/tests/registry.mjs
```

This prevents execution-class duplication/drift.

`null` renders as `NONE`.

### `evidenceRelease`

Value:

```text
vMAJOR.MINOR.PATCH
or null
```

Historical provenance is explicit reviewed input.
The generator never replaces it with current production.

### `status`

Frozen S-09 vocabulary only:

```text
PASS
WATCH
GAP
```

Generator validates the enum but never computes the value.

### `related`

Array of bounded existing identifiers.

Examples:

```text
["TD-01", "TD-10"]
["06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT"]
[]
```

Empty array renders as `NONE`.

The generator preserves identifiers; it does not infer severity or create new debt/WATCH records.

---

## 8. Fixture registry resolution

Canonical registry remains:

```text
products/simcore/tests/registry.mjs
```

For each non-null `fixtureId`:

```text
find exact registry ID
→ read current coverage
→ require EXECUTABLE or HYBRID_TRANSITIONAL
→ render:
   <fixtureId> [<coverage>]
```

If the ID is missing or the coverage state is unsupported:

```text
GENERATION_BLOCKED
```

No stale fallback class may be copied from the curation manifest or existing Markdown.

M-13 does not modify the registry.

---

## 9. Frozen mechanical validation rules

M-13 validates only rules that can be established without semantic judgment.

Required v1 checks:

```text
schemaVersion == 1
entries is a bounded array
contract key format valid
contract keys unique
all required scalar fields present
status in PASS / WATCH / GAP
repository path portion of Authority exists
repository path portion of non-null Live Evidence exists
fixtureId resolves exactly in permanent registry
fixture coverage is supported
liveEvidence == null ↔ evidenceRelease == null
related is a bounded identifier array
no raw/body-like fields exist in schema
```

Additional cross-field structural checks:

```text
status = WATCH
→ liveEvidence != null OR related.length > 0

status = PASS
→ authority must resolve

status = GAP
→ authority must resolve
→ liveEvidence may be null
```

These checks do not prove the semantic verdict.

---

## 10. Validation that M-13 must NOT perform

Forbidden semantic validation:

```text
read Authority prose and decide Owner is correct
compare dates and choose latest evidence
infer Evidence Release from filename
infer PASS from a live document saying PASS somewhere
infer WATCH because a WATCH identifier exists
infer GAP because fixture is missing
infer compatibility across M2 ownership moves
infer contract retirement
infer evidence causality
```

If a reviewed source row is semantically wrong, ordinary repo review/evidence authorities must correct the curation source.
M-13 is not a semantic auditor.

S-10 Authority Drift Check remains a different tool and must not be folded into M-13.

---

## 11. Repository-reference parsing

M-13 needs only enough parsing to validate referenced file existence.

Examples:

```text
docs/A.md
docs/A.md §6
docs/A.md §3–5
products/simcore/tests/registry.mjs
```

Frozen behavior:

```text
extract repository path prefix
→ verify exact path exists under repository root
→ retain full original reference string for rendering
```

M-13 does not:
- validate Markdown anchor text;
- parse section prose;
- follow links;
- open GitHub/network URLs;
- rewrite locators.

Path traversal or absolute paths are rejected.

---

## 12. Deterministic ordering

Generated rows are sorted lexicographically by normalized `contract` key.

Reason:

```text
same logical row set
→ same row order
→ no manual reorder churn
```

The array order in the source manifest carries no semantic meaning.

`related` identifiers are also rendered in deterministic lexical order after uniqueness validation.

The generator must not preserve accidental input ordering as hidden priority.

---

## 13. Deterministic Markdown output

Frozen output target:

```text
docs/SIMCORE_EVIDENCE_INDEX.md
```

Generated content contains:
- stable title;
- generated-file notice;
- S-09 schema authority reference;
- frozen coverage rule;
- exact eight-column Markdown table;
- rows from the curation source;
- stable update/hard-boundary boilerplate defined by the generator template.

No wall-clock timestamp, random UUID, local filesystem path, Git branch, or current date is inserted into generated bytes.

Canonical property:

```text
same normalized source manifest
+ same relevant fixture registry state
+ same generator version
→ byte-identical Markdown output
```

---

## 14. Generated-file notice

After implementation, the human index should clearly state conceptually:

```text
GENERATED NAVIGATION VIEW
source: products/simcore/evidence/evidence-index-source-v1.json
schema: docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md
edit source, not generated rows
```

This is presentation metadata only.
The semantic evidence authorities remain external.

---

## 15. CLI contract

Preferred future implementation:

```text
node products/simcore/tooling/evidence-index.mjs --check
node products/simcore/tooling/evidence-index.mjs --write
```

### `--check`

```text
load source manifest
→ validate schema/mechanical invariants
→ resolve fixture registry classes
→ render expected Markdown in memory
→ compare with docs/SIMCORE_EVIDENCE_INDEX.md
```

Outcomes:

```text
INDEX_CLEAN
INDEX_RENDER_DRIFT
INDEX_SOURCE_INVALID
INDEX_REFERENCE_UNAVAILABLE
INDEX_FIXTURE_UNRESOLVED
```

`--check` performs no writes.

### `--write`

```text
perform all validation first
→ render complete output in memory
→ if any validation fails: write nothing
→ atomically replace generated Markdown only
```

`--write` may not modify:
- source manifest;
- evidence documents;
- fixture registry;
- roadmap/debt/WATCH documents;
- plugin/runtime files.

This is deterministic rendering, not authority repair.

---

## 16. No automatic repo mutation beyond generated view

M-13 itself does not:

```text
git commit
git push
open PR
merge PR
edit GitHub issues
write release-simcore
modify current production identity
```

Repository publication remains the ordinary SimCore work transaction.

The generator writes only its derived Markdown output when explicitly invoked with `--write`.

---

## 17. Failure / fail-closed behavior

Any unresolved required mechanical fact blocks generation.

Examples:

```text
duplicate Contract
invalid status
missing authority path
missing live-evidence path
fixture ID absent from registry
non-null Evidence Release with null Live Evidence
unsafe repository path
unknown schema version
```

Canonical behavior:

```text
BUILD EXPECTED OUTPUT IN MEMORY
→ validation failure
→ no target-file mutation
→ bounded error result
```

Never emit a partial table.
Never silently drop a bad row.
Never preserve a stale old rendered row to make generation succeed.

---

## 18. Contradiction behavior

M-13 cannot reliably discover semantic contradictions by itself.

If an operator or another repo tool discovers that two authorities conflict:

```text
preserve/classify contradiction under normal SimCore workflow
→ resolve actual authority state
→ update curation source explicitly
→ regenerate index
```

M-13 must not select whichever source is newer or whichever keeps the row PASS.

Canonical principle retained from S-09:

```text
REPORT / REVIEW
!= AUTO-RECONCILE SEMANTIC AUTHORITY
```

---

## 19. Migration from current manual S-09 materialization

When M-13 is eventually implemented, migration is mechanical and non-semantic.

Current canonical index contains six reviewed rows:

```text
representation-fast
genuine-edit
community-reaction
broadcast-closure
diagnostic-copy
reload-cache-continuity
```

Implementation migration must:

```text
1. transcribe those exact reviewed projections into evidence-index-source-v1.json
2. replace rendered fixture classes with fixtureId only in the source manifest
3. resolve fixture classes from current registry
4. generate the Markdown view
5. compare every eight-field row semantically with the pre-M13 index
6. explain any formatting/order-only differences
7. forbid accidental evidence/status/owner changes inside the migration
```

M-13 implementation must not use migration as an excuse to add speculative new rows.

New rows require separate reviewed curation changes after generator equivalence is established.

---

## 20. Relationship to S-09

```text
S-09
= entry semantics / eight-field contract / evidence posture rules

M-13
= deterministic maintenance implementation for that frozen contract
```

M-13 cannot amend the S-09 schema.

If a ninth field or new status is desired:

```text
amend/reopen S-09 design first
→ then update M-13
```

Generator convenience never expands schema authority.

---

## 21. Relationship to S-10 Authority Drift Check

S-10 and M-13 are separate.

```text
S-10
= read-only contradiction audit across selected current operational authorities

M-13
= deterministic renderer/validator for reviewed Evidence Index curation
```

M-13 must not call S-10 and turn its findings into automatic Evidence Index edits.

A future operator may use S-10 findings as review input, but row changes remain explicit.

---

## 22. Relationship to S-12 Natural Evidence Corpus

S-12 remains specimen-centric.

```text
S-12
= every indexed natural specimen

S-09/M-13
= contract-centric selected evidence posture
```

M-13 must not automatically choose the newest S-12 specimen as `Live Evidence`.

Reason:
- newest natural specimen may not exercise the exact contract;
- controlled live proof may be valid for S-09 but excluded from S-12;
- a current authority may still require a specific post-milestone control.

S-12 may aid human discovery only.

---

## 23. Relationship to fixture registry

The permanent fixture registry is a mechanical dependency only for:

```text
fixture ID existence
current coverage class
```

M-13 does not infer:

```text
fixture exists → Status PASS
fixture executable → live proof unnecessary
fixture missing → Status GAP
```

Those conclusions remain forbidden.

---

## 24. Raw-data / privacy boundary

Neither source manifest nor generated index may contain:

```text
raw user body
raw assistant body
raw Fresh body
full diagnostic
full prompt
full COMMUNITY / Knowledge body
host chat object
runtime-local full fingerprints
exception stack
```

Allowed content remains bounded navigation metadata:

```text
contract ID
owner label
repository references
fixture ID/class
release version
PASS/WATCH/GAP
related stable IDs
```

---

## 25. Resource / execution boundary

Future M-13 implementation is offline repository tooling.

```text
network                 NONE
GitHub API              NONE
Host API                NONE
SnapshotStore           NONE
pluginStorage           NONE
chat history            NONE
Fresh reads             NONE
runtime imports         NONE
background polling      NONE
```

It may read only:
- its curation source;
- permanent fixture registry;
- referenced repository paths for existence checks;
- current generated target for `--check` comparison.

It must not perform broad recursive semantic scanning.

---

## 26. Proposed implementation files

When the NR Difficulty-3 harvest is explicitly authorized, preferred files are:

```text
products/simcore/evidence/evidence-index-source-v1.json
products/simcore/tooling/schema/evidence-index-source-v1.schema.json
products/simcore/tooling/evidence-index.mjs
products/simcore/tooling/evidence-index.test.mjs
```

Existing generated target:

```text
docs/SIMCORE_EVIDENCE_INDEX.md
```

No new runtime module is introduced.

---

## 27. Test / regression surface

M-13 implementation must have focused non-runtime tests for at least:

### Valid generation
- current six-row migration source validates;
- fixture IDs resolve to exact current execution classes;
- expected Markdown is deterministic;
- source array reorder does not change generated row order;
- related-ID reorder does not change generated bytes.

### Schema / identity rejection
- duplicate Contract blocks;
- invalid Contract key blocks;
- unsupported schema version blocks;
- unsupported Status blocks.

### Path safety
- missing Authority path blocks;
- missing Live Evidence path blocks;
- absolute/path-traversal reference blocks.

### Fixture safety
- unknown fixture ID blocks;
- invalid registry coverage blocks;
- null fixture renders `NONE`.

### Cross-field invariants
- null Live Evidence + non-null Evidence Release blocks;
- non-null Live Evidence + null Evidence Release blocks;
- WATCH with neither evidence nor Related blocks.

### Authority safety
- no semantic status inference;
- no new rows from fixture registry enumeration;
- no repo-wide evidence discovery;
- no target mutation after failed validation.

### Drift checking
- exact generated target → `INDEX_CLEAN`;
- hand-edited target → `INDEX_RENDER_DRIFT`;
- `--check` never rewrites target.

---

## 28. CI / verification boundary

M-13 design does not authorize a new CI/release gate.

When implemented:
- focused local/static tests are required;
- existing SimCore CI should be observed as applicable;
- if standalone tooling tests are not automatically discovered, preserve the existing `NR standalone tooling-test discovery coverage` WATCH rather than broadening CI policy inside M-13;
- adding generalized tooling-test discovery is a separate repo/CI work item.

Do not mix CI authority restructuring into M-13 harvest.

---

## 29. SAFE_NON_RUNTIME eligibility after tier close

Design-time classification:

```text
Runtime class = NON_RUNTIME
```

Expected strict harvest posture after NR Difficulty-3 closes:

```text
likely SAFE_NON_RUNTIME
```

provided implementation remains exactly within this frozen boundary:

```text
local manifest/schema/tool/test + generated docs view only
no plugin bytes
no release-simcore
no runtime semantics
no release workflow
no GitHub/network writer
no semantic authority inference
```

Final SAFE_NON_RUNTIME eligibility is still re-checked at harvest time.
Design freeze does not itself authorize implementation.

---

## 30. Implementation sequencing

After NR Difficulty-3 tier close, if M-13 passes the harvest gate:

```text
repo design already frozen
→ create dedicated work branch
→ add source schema + curated migration manifest
→ implement deterministic generator
→ generate index from current six rows
→ run focused tests
→ verify current six-row semantic equivalence
→ verify plugin/release-simcore diff = NONE
→ ordinary PR/CI
→ merge main
→ implementation evidence + queue/ledger sync
```

Do not add new Evidence Index rows in the same migration transaction unless required solely to preserve an already-existing canonical row.

---

## 31. Forbidden scope expansion

M-13 must not absorb:

```text
S-10 Authority Drift Check
S-12 Natural Evidence Corpus generator
M-10 fixture skeleton generation
a repository knowledge graph
a generic Markdown generator
a generalized doc linter
contract ownership inference
latest-evidence ranking
WATCH/FIX/BLOCKER classification
auto-commit / auto-PR
auto-repair of authority docs
CI classifier restructuring
release workflow changes
```

If any becomes desirable, create/select a separate idea/work item.

---

## 32. Open design questions

```text
NONE
```

Resolved:
- source of generator inputs;
- semantic-authority boundary;
- dual-authority avoidance;
- fixture execution-class resolution;
- exact curation manifest fields;
- partial-coverage semantics;
- deterministic ordering;
- deterministic rendering;
- CLI behavior;
- path/reference checks;
- cross-field mechanical invariants;
- contradiction/failure handling;
- migration from current manual index;
- relationship to S-09/S-10/S-12/fixture registry;
- privacy/resource boundaries;
- test obligations;
- CI non-expansion rule;
- later harvest eligibility.

---

## 33. Frozen verdict

```text
M-13 EVIDENCE INDEX GENERATOR

PROBLEM
= manual index maintenance has mechanical drift risk

INPUT AUTHORITY
= explicitly reviewed evidence-index-source-v1.json

SEMANTIC AUTHORITY
= existing contract/evidence/gate/debt documents

FIXTURE CLASS AUTHORITY
= products/simcore/tests/registry.mjs

OUTPUT
= deterministic docs/SIMCORE_EVIDENCE_INDEX.md

GENERATOR MAY
= validate mechanical invariants
= resolve fixture execution class
= render/check deterministic view

GENERATOR MAY NOT
= discover evidence
= choose latest evidence
= infer owner
= infer PASS/WATCH/GAP
= reconcile contradictions
= mutate semantic authorities

DESIGN STATUS
= FROZEN

IMPLEMENTATION STATUS
= NONE

NEXT
= freeze M-13 in NR queue
→ NR Difficulty-3 currently-designable design tier closes
→ separately review M-11 / M-10 / M-13 for SAFE_NON_RUNTIME harvest
```

Mandatory stop boundary:

```text
DESIGN COMPLETE
→ RECORD IN main
→ DESIGN FROZEN
→ PARKED FOR NR DIFFICULTY-3 TIER CLOSE
→ NO IMPLEMENTATION IN THIS WORK ITEM
```
