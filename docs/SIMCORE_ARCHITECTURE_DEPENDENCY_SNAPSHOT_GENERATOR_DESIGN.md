# SimCore M-11 Architecture Dependency Snapshot Generator — Frozen Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · PENDING DIFFICULTY-3 TIER CLOSE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `M-11`
Size: `MEDIUM`
Importance: `5 / VERY HIGH`
Design difficulty: `3 / MODERATE`
Runtime class: `NON_RUNTIME`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `scripts/simcore-architecture-check.py`
- `docs/SIMCORE_CONTRACTS_V2_TRANSITION_DEBT_RETIREMENT_MAP_IDEA.md`
- `docs/SIMCORE_ARCHITECTURE_TESTABILITY_SURFACE_MAP_IDEA.md`

---

## 1. Problem

SimCore already has a machine-enforced Contracts v2 architecture guard.

The current checker parses physical `SimCore.define()` modules and direct `require("./...")` edges, checks them against `config/simcore-architecture-v2.json`, rejects undeclared/forbidden edges, detects stale transition exceptions, and confirms that `latest.js` and `install.js` expose the same dependency graph.

That is sufficient for **pass/fail enforcement**, but it is awkward for architecture evidence questions such as:

```text
what exact physical dependency graph existed before M2-3?
what edges disappeared after M2-3?
which transition exceptions were still physically active?
did a mechanical extraction change only the intended edges?
can an evidence document link a bounded machine-readable graph instead of hand-copying source imports?
```

M-11 adds a deterministic read-only snapshot surface for those questions.

It does not add a second architecture validator.

---

## 2. Frozen identity

Canonical identity:

```text
ARCHITECTURE DEPENDENCY SNAPSHOT
= deterministic serialization of the existing architecture checker's extracted graph
+ existing Contracts v2 classification context
+ bounded input digests

!= new architecture authority
!= second dependency parser
!= new CI gate
!= architecture auto-repair
```

Authority order remains:

```text
Contracts v2 docs/config
→ semantic/layer/dependency authority

simcore-architecture-check.py
→ physical extraction + enforcement authority

M-11 snapshot
→ observation/evidence projection only
```

If a snapshot disagrees with the checker, the snapshot is wrong.

---

## 3. Existing source constraint

The current `scripts/simcore-architecture-check.py` already owns the production extraction semantics:

```text
DEFINE_RE
→ SimCore.define("module", ...)

REQUIRE_RE
→ require("./dependency")

extract_modules(source)
→ module -> sorted unique direct dependencies
```

It also owns current Contracts v2 enforcement:

```text
undeclared module
unknown module dependency
undeclared dependency edge
stale transition exception
forbidden layer edge
core -> runtime forbidden edge
missing required physical module
latest/install graph mismatch
```

M-11 must reuse this exact extraction/check path.

Frozen anti-duplication rule:

```text
NO second regex/parser implementation
NO separately maintained dependency semantics
NO snapshot-only edge classifier
```

---

## 4. Physical implementation decision

Preferred implementation:

```text
scripts/simcore-architecture-check.py
+ optional read-only snapshot output mode
```

Conceptual CLI extension:

```text
--snapshot-out <path>
```

The existing default behavior remains unchanged when the option is absent.

The checker continues to:

```text
parse source
check Contracts v2
print PASS/FAIL
return its existing exit semantics
```

When `--snapshot-out` is supplied, it additionally serializes the exact already-extracted graph and existing check disposition to the requested file.

This is preferred over creating `simcore-architecture-snapshot.py` with its own parser.

A later implementation may extract pure internal helper functions into a shared Python module only if needed for code cohesion, but that refactor must preserve checker behavior byte-for-byte at the report/exit-contract level and must not change architecture policy.

---

## 5. Inputs

Frozen default inputs are the same authority inputs as the existing checker:

```text
contract:
config/simcore-architecture-v2.json

sources:
plugins/simcore/latest.js
plugins/simcore/install.js
```

Existing repeatable `--source` behavior remains valid for explicit work-branch/candidate inspection.

M-11 adds no network fetch and no GitHub API dependency.

The snapshot describes the files actually supplied to the checker; it does not silently substitute `release-simcore` or a different commit.

---

## 6. Snapshot schema v1

Top-level JSON:

```json
{
  "schemaVersion": 1,
  "contract": {},
  "sources": [],
  "parity": {},
  "check": {}
}
```

No generated wall-clock timestamp is stored in v1 because identical inputs must produce identical bytes.

### 6.1 `contract`

```json
{
  "path": "config/simcore-architecture-v2.json",
  "sha256": "...",
  "schemaVersion": 2,
  "milestone": "2.0M",
  "phase": "M2"
}
```

Rules:
- repository-relative path only;
- SHA-256 of exact contract bytes;
- include only bounded architecture identity fields;
- do not copy stale/historical production-baseline metadata merely to make the snapshot look current.

### 6.2 `sources[]`

One entry per inspected source:

```json
{
  "path": "plugins/simcore/latest.js",
  "sha256": "...",
  "modules": [],
  "edges": [],
  "graphSha256": "..."
}
```

`modules[]` canonical row:

```json
{
  "name": "session",
  "layer": "application",
  "physical": "required",
  "dependencies": ["frame", "kernel", "store"]
}
```

Rules:
- module name from actual source;
- `layer` and `physical` projected from Contracts v2 when declared;
- dependencies sorted lexicographically;
- no source body or code excerpt retained.

`edges[]` canonical row:

```json
{
  "from": "kernel",
  "to": "community",
  "classification": "TRANSITION_EXCEPTION"
}
```

Frozen edge classifications:

```text
ALLOWED
TRANSITION_EXCEPTION
UNDECLARED
UNKNOWN_MODULE
FORBIDDEN_LAYER
```

These labels may only serialize the **existing checker result for that edge**. They must not be independently recomputed by a second policy implementation.

If the current checker implementation does not expose sufficient structured detail for one classification, implementation must first structure its existing result internally without changing the underlying rule; it may not invent a new rule to fill the snapshot.

### 6.3 `graphSha256`

`graphSha256` is a digest of canonical graph material only:

```text
sorted module names
+ sorted direct dependency lists
```

It excludes:
- source path;
- source file SHA;
- timestamps;
- checker prose;
- contract metadata.

Purpose:

```text
latest/install have different paths
but identical dependency graph
→ same graphSha256
```

The graph digest is evidence metadata only, not a semantic authority.

### 6.4 `parity`

For two or more inspected sources:

```json
{
  "graphEqual": true,
  "allGraphSha256Equal": true
}
```

This is a serialization of the checker's existing multi-source graph comparison, not a replacement for `latest.js == install.js` byte equality required elsewhere.

Important distinction:

```text
dependency graph equality
!= plugin byte equality
```

### 6.5 `check`

```json
{
  "result": "PASS",
  "failureCount": 0,
  "noticeCount": 1,
  "failures": [],
  "notices": []
}
```

`result` vocabulary:

```text
PASS
FAIL
```

The arrays contain bounded existing checker findings/notices only.

The snapshot does not define new architecture severities or reason codes.

---

## 7. Determinism contract

Given identical source bytes + identical contract bytes + identical CLI source ordering:

```text
snapshot bytes must be identical
```

Required normalization:
- repository-relative `/` paths;
- modules sorted by module name;
- dependency arrays sorted;
- edges sorted by `(from, to)`;
- findings/notices deterministically sorted using the existing checker text/structured identity;
- UTF-8 JSON;
- stable indentation;
- one trailing newline;
- no wall-clock timestamp;
- no hostname, absolute path, Python patch version, runner name, or environment-specific metadata.

This makes ordinary Git diff usable as the before/after architecture comparison surface.

---

## 8. Before/after M2 evidence contract

M-11 does **not** need a second graph-diff engine in v1.

Canonical milestone proof:

```text
pre-change source/contract
→ produce snapshot A

mechanical M2 implementation
→ produce snapshot B

Git / evidence diff A ↔ B
→ inspect added/removed modules and edges
```

For an ownership extraction such as M2-3, expected architecture evidence may state:

```text
behavior fixtures = equivalent
architecture snapshot = intended physical edges moved/removed
```

The snapshot proves physical topology only.

It cannot prove:
- semantic equivalence;
- state-write equivalence;
- live correctness;
- performance;
- Host behavior.

Those remain owned by fixtures/live evidence.

---

## 9. Transition-exception evidence

The current architecture contract intentionally contains staged transition exceptions such as Kernel upward edges.

M-11 must make active transition edges visible without converting them into failures when the checker currently accepts them.

Example:

```text
kernel -> community
classification = TRANSITION_EXCEPTION
```

When an exception is retired:

```text
source edge disappears
+ contract exception is removed
→ later snapshot no longer contains the edge
```

A stale exception remains a checker failure under existing policy.

M-11 must not hide it to make a snapshot cleaner.

---

## 10. Planned/deferred modules

Contracts v2 may declare modules that are not yet physical.

The v1 snapshot is **actual-source-first**:

```text
sources[].modules
= modules physically found in that source
```

Do not insert an absent planned module into the actual module list.

For navigation, the `check` findings may reflect existing checker rules when a required/planned/deferred condition is violated.

A future contract-inventory projection is a separate idea and must not be smuggled into M-11.

---

## 11. Failure behavior

Snapshot output must be useful for evidence without masking enforcement.

Frozen behavior:

```text
source/contract readable + extraction succeeds
→ snapshot may be written even when architecture check result = FAIL
→ existing checker exit remains FAIL

source unreadable / contract JSON invalid / snapshot serialization impossible
→ no authoritative-looking partial snapshot
→ checker exits through existing/error path
```

If output writing fails:

```text
architecture check result itself is not changed
snapshot generation reports operational failure
```

A failed snapshot write must never mutate source/contract files in response.

---

## 12. Boundedness

Snapshot v1 contains names, classifications and digests only.

Hard design limits:

```text
max physical modules per source: 256
max direct edges per source: 2048
max serialized finding/notice text per item: 2048 chars
max snapshot file: 512 KiB
```

If a limit is exceeded:

```text
snapshot write = FAIL CLOSED
architecture checker = retains its own existing result/exit semantics
```

Do not truncate graph rows silently; a partial graph must not look complete.

---

## 13. Raw-data / security boundary

Forbidden in snapshot:

```text
plugin source bodies
function bodies
prompt bytes
user/assistant bodies
Fresh bodies
runtime diagnostic bodies
secret/environment values
absolute local filesystem paths
GitHub tokens/API responses
```

Allowed:

```text
module names
direct module dependency names
layer/physical labels from Contracts v2
existing checker classifications/findings
SHA-256 digests
repository-relative input paths
```

---

## 14. State / persistence / Host permissions

```text
Core semantic write             FORBIDDEN
Session write                   FORBIDDEN
SnapshotStore write             FORBIDDEN
Host read/write                 FORBIDDEN
pluginStorage                   FORBIDDEN
network                         FORBIDDEN
release-simcore write           FORBIDDEN
contract auto-write             FORBIDDEN
plugin source auto-write        FORBIDDEN
GitHub API                      FORBIDDEN
background task                 FORBIDDEN
```

Allowed filesystem mutation:

```text
explicit caller-selected snapshot output file only
```

No implicit committed `latest snapshot` file is maintained.

---

## 15. Repository capture policy

Default snapshot output is ephemeral/build evidence.

Recommended temporary location:

```text
.simcore-architecture/dependency-snapshot.json
```

That path is not repository authority.

When a milestone needs durable before/after evidence, the bounded snapshot may be committed as an immutable evidence attachment/location chosen by that milestone work item.

Do not create a permanently rewritten:

```text
CURRENT_ARCHITECTURE_SNAPSHOT.json
```

because that would become a second current architecture authority and create drift pressure.

Contracts v2 config remains current architecture authority.

---

## 16. Relationship to existing permanent CI

Current permanent CI invokes `scripts/simcore-architecture-check.py` as `GATE_ARCH`.

M-11 v1 does not change:

```text
when GATE_ARCH runs
what paths trigger it
what constitutes PASS/FAIL
required release authority
CI conclusion semantics
```

No new required check is authorized by this design.

An implementation may add tests for snapshot serialization/determinism, but it must not promote snapshot generation into a required release gate as part of M-11.

That would be a separate CI-policy change.

---

## 17. Relationship to architecture fixtures and M2

M-11 complements, but never replaces:

```text
M-16 Differential Architecture Fixtures
representation-fast / genuine-edit fixtures
M2 transition-debt retirement controls
live long-chat gates
```

Canonical evidence split:

```text
fixture
→ behavior stayed equivalent

M-11 snapshot
→ physical dependency topology changed as intended

live evidence
→ production behavior remained healthy
```

No one surface is allowed to impersonate the others.

---

## 18. Relationship to M-12 State Writer Static Audit

Keep the scopes separate.

```text
M-11
= module dependency edges

M-12
= physical state-write sites vs authorized writer/owner registry
```

M-11 must not start scanning assignments, state fields, persistence writes, or mutation authority.

---

## 19. Verification plan for later implementation

Minimum permanent/static controls:

```text
1. current latest.js snapshot generation succeeds
2. current install.js snapshot generation succeeds
3. latest/install graphSha256 equal
4. repeated identical invocation produces byte-identical snapshot
5. module ordering deterministic
6. edge ordering deterministic
7. dependencies unique/sorted
8. known Kernel transition edges serialize as TRANSITION_EXCEPTION
9. ordinary allowed edge serializes as ALLOWED
10. synthetic undeclared edge preserves existing checker FAIL and appears as existing failure/classification
11. stale transition exception preserves existing checker FAIL
12. unknown dependency preserves existing checker FAIL
13. required-module absence preserves existing checker FAIL
14. snapshot may be emitted for an extractable failing graph without converting checker exit to PASS
15. malformed source/contract does not leave an authoritative-looking partial snapshot
16. source paths are repository-relative
17. no source body appears in output
18. no timestamp/environment-specific field appears
19. output > bound fails closed rather than truncating graph rows
20. default checker invocation without --snapshot-out remains behaviorally identical
21. permanent CI GATE_ARCH pass/fail semantics remain unchanged
22. latest.js/install.js runtime bytes are unchanged by tool implementation
```

If the implementation requires refactoring checker internals, add equivalence fixtures proving pre/post checker outcomes for representative PASS and FAIL cases.

---

## 20. Live validation

```text
REAL LONG-CHAT VALIDATION = NOT REQUIRED
```

Reason:

```text
NON_RUNTIME static architecture tooling only
```

M-11 may be used as evidence during a later runtime milestone, but its own implementation does not justify a plugin release or live chat gate.

---

## 21. Harvest eligibility

Runtime class:

```text
NON_RUNTIME
```

However:

```text
NON_RUNTIME != automatically SAFE_NON_RUNTIME_READY
```

M-11 becomes eligible for harvest review only after the currently designable Difficulty-3 tier closes.

At that point implementation must be checked against `SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`.

Expected safe implementation boundary:
- architecture tooling/report serialization only;
- no CI-policy change;
- no release authority change;
- no plugin/release-simcore bytes.

If implementation inspection reveals that the tool requires changing required CI/release authority rather than merely exposing existing checker observations:

```text
SAFE_NON_RUNTIME_REVOKED
→ PARK FOR LATER TOOLING/INFRA WORK
```

Do not widen the harvest silently.

---

## 22. Forbidden expansion

M-11 v1 must not become:

```text
architecture auto-fixer
generic code dependency analyzer
State Writer audit
graph visualization platform
architecture database
runtime module registry
CI gate redesign
source modular build system
M2 implementation framework
a second Contracts v2 validator
```

No visualization/UI is required for correctness. JSON + ordinary diff is sufficient.

---

## 23. Revisit triggers

Reopen this frozen design only if:

```text
SimCore module declaration/import syntax materially changes
Contracts v2 checker extraction semantics change
single-file delivery is replaced by L-01 modular source build
snapshot evidence proves insufficient for a concrete M2 ownership proof
existing checker can no longer expose structured findings without ambiguity
```

Do not reopen merely to add prettier output.

---

## 24. Open design questions

```text
NONE
```

All known questions required for a bounded later implementation are resolved.

---

## 25. Final frozen contract

```text
M-11 ARCHITECTURE DEPENDENCY SNAPSHOT GENERATOR

SIZE
= MEDIUM

IMPORTANCE
= 5 / VERY HIGH

DIFFICULTY
= 3 / MODERATE

RUNTIME CLASS
= NON_RUNTIME

PARSER / ENFORCEMENT AUTHORITY
= existing scripts/simcore-architecture-check.py

IMPLEMENTATION SHAPE
= optional deterministic --snapshot-out on existing checker

SNAPSHOT
= source graph + Contracts v2 projection + existing checker disposition

SECOND PARSER
= FORBIDDEN

SECOND VALIDATOR
= FORBIDDEN

AUTO-REPAIR
= FORBIDDEN

DETERMINISTIC
= YES

TIMESTAMP
= NONE

RAW SOURCE/BODIES
= FORBIDDEN

M2 BEFORE/AFTER
= snapshots + ordinary Git/evidence diff

CI POLICY CHANGE
= NONE

PLUGIN / release-simcore CHANGE
= NONE

LIVE VALIDATION
= NOT REQUIRED

DESIGN STATUS
= FROZEN

IMPLEMENTATION DISPOSITION
= PENDING DIFFICULTY-3 TIER CLOSE
```
