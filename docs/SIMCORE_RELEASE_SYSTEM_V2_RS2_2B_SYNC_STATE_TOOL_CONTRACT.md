# SimCore Release System v2 — RS2-2B Sync-State Tool / Read-Verify-Render Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
Prior durable-test close contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1E_PROMOTION_CLOSE_GATE.md`
Phase: `RS2-2 — State Synchronization`
Subphase: `RS2-2B — Sync-State Tool / Read-Verify-Render Contract`
Authority class: release-infrastructure design / local synchronization executable contract

---

## 1. Purpose

RS2-2B turns the authority boundary frozen in RS2-2A into a concrete executable-tool contract.

The future tool is:

```text
products/simcore/tooling/sync-state.mjs
```

Its job is deliberately narrow:

```text
READ local declared state
→ VERIFY local materialized production identity
→ VALIDATE target registry / marker safety
→ RENDER deterministic machine blocks
→ COMPARE proposed blocks with current target blocks
→ CHECK, RENDER-PREVIEW, or WRITE locally
→ EMIT bounded structured result
```

It is **not** a release workflow, a GitHub client, a manifest reconciler, a branch writer, or a human-decision engine.

RS2-2B freezes:

- executable boundary and dependency model;
- CLI modes and invocation rules;
- local input contracts;
- production-identity materialization contract;
- manifest read-only contract;
- target-registry contract;
- deterministic renderer protocol;
- source verification pipeline;
- marker/target preflight pipeline;
- check/render/write semantics;
- file-level atomic write behavior;
- concurrent local-change detection;
- structured bounded report schema;
- top-level result vocabulary;
- exit-code contract;
- filesystem/path safety;
- security and forbidden capabilities;
- relationship to `repo-main-write.py`;
- relationship to the legacy `simcore-sync-memory.py` path;
- required self-tests;
- handoff requirements for RS2-2C.

This document does **not** implement `sync-state.mjs`, modify `product-manifest.json`, modify target Markdown documents, modify `release-simcore`, create permanent CI, replace the current release-state workflow, retire `scripts/simcore-sync-memory.py`, or alter SimCore runtime behavior.

---

## 2. Repository evidence shaping the tool boundary

### 2.1 Current state drift remains real

At this design point `product-manifest.json` still declares an older SimCore production identity while `release-simcore` has advanced.

The manifest currently declares:

```text
production_version = 0.64.3
release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf
release_blob        = ff481aa904340b844ef29b0d89aa20bd6286286d
```

while `release-simcore` currently resolves to the v0.64.6 corrected production line.

This remains the direct negative evidence class frozen by RS2-2A:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

RS2-2B must therefore preserve the rule:

```text
stale declaration
!=
permission to spread stale declaration
```

The future tool detects this mismatch and refuses target writes.

It does not decide that the release branch is newer and rewrite the manifest.

### 2.2 Legacy sync currently mixes responsibilities

The current transitional script:

```text
scripts/simcore-sync-memory.py
```

currently combines several operations:

```text
read environment-derived release identity
→ mutate product-manifest.json
→ replace CURRENT_DEVELOPMENT production snapshot
→ regex-update Guidelines production baseline
→ preserve historical version-specific migration behavior
```

RS2-2B deliberately does not copy that architecture.

The target tool is a renderer/checker over already-declared and verified state.

### 2.3 Shared-main race coordination now exists separately

The repository now contains:

```text
scripts/repo-main-write.py
```

That helper replays an already-created product-owned payload commit onto the latest shared `main`, retries ordinary push races, rejects path-ownership violations, fails closed on content conflicts, and never force-pushes.

RS2-2B treats that as **outer orchestration infrastructure**.

`sync-state.mjs` must not import it, execute it, shell out to it, or duplicate its main-branch coordination logic.

Canonical split:

```text
sync-state.mjs
= local state verification + deterministic local target mutation

repo-main-write.py
= optional later repository integration of an already-created bounded payload commit
```

This separation prevents SimCore state rendering from becoming another repo-wide main writer.

---

## 3. Architectural boundary

RS2-2B preserves the same inner-tool / outer-orchestrator split already frozen for the permanent test harness.

```text
OUTER ORCHESTRATOR
- resolves repository refs
- materializes immutable release source files
- records resolved branch/commit/blob identity
- chooses checkout / worktree
- invokes sync-state
- may create a local Git commit after sync-state succeeds
- may later use repo-main-write.py
- owns GitHub credentials / Actions wiring

SYNC-STATE TOOL
- receives local paths only
- parses bounded local metadata
- verifies local source bytes against the supplied resolved identity
- compares resolved identity to the manifest declaration
- validates registered machine blocks
- renders registered blocks
- checks or writes local target files only
- emits bounded machine-readable results

REPOSITORY / NETWORK
- never contacted directly by sync-state
```

The tool must be runnable in a filesystem sandbox with no GitHub token and no network access.

---

## 4. Physical target

Initial executable path:

```text
products/simcore/tooling/sync-state.mjs
```

Supporting files may later include:

```text
products/simcore/state-sync/
  target-registry.json
  renderers.mjs
  schema/
    production-identity-v1.schema.json
    target-registry-v1.schema.json
    sync-report-v1.schema.json
```

RS2-2B freezes the logical contracts, not the requirement that every helper be split physically on day one.

Implementation may start with a small number of files if module boundaries remain testable and no authority is widened.

---

## 5. CLI mode model

Exactly one operating mode is active per invocation.

Canonical commands:

```text
node products/simcore/tooling/sync-state.mjs \
  --check \
  --root <repo-root> \
  --manifest <path> \
  --production-identity <path> \
  --targets <registry-path>
```

```text
node products/simcore/tooling/sync-state.mjs \
  --render \
  --root <repo-root> \
  --manifest <path> \
  --production-identity <path> \
  --targets <registry-path> \
  --output-dir <path>
```

```text
node products/simcore/tooling/sync-state.mjs \
  --write \
  --root <repo-root> \
  --manifest <path> \
  --production-identity <path> \
  --targets <registry-path>
```

Optional in all modes:

```text
--report <path>
```

### 5.1 Mode exclusivity

The following are invalid:

```text
--check --write
--check --render
--render --write
no mode flag
```

Result:

```text
INVOCATION_ERROR / MODE_INVALID
exit 2
```

### 5.2 No hidden default write

If the user omits a mode, the tool must not assume `--check` or `--write`.

Explicit mode selection is required.

There is no environment variable that silently upgrades check mode into write mode.

---

## 6. Root and path contract

`--root` identifies the filesystem authority boundary for the invocation.

All registered input and target paths must resolve beneath that root.

Required rules:

```text
canonicalize root once
resolve each relative path against root
reject path traversal outside root
reject target paths that resolve outside root
reject target symlinks for write mode
reject registry entries containing absolute paths unless a later contract explicitly authorizes them
```

Failure examples:

```text
PATH_OUTSIDE_ROOT
TARGET_SYMLINK_DENIED
INPUT_PATH_INVALID
TARGET_PATH_INVALID
```

The tool must not write outside `--root` except the explicit `--output-dir` used by render-preview mode when that directory itself passes the configured output-path rule.

---

## 7. Manifest input contract

Canonical input:

```text
--manifest product-manifest.json
```

The manifest is **read-only in every mode**, including `--write`.

Required initial fields are those frozen by RS2-2A, including at minimum:

```text
schema_version
product
production_version
release_name
release_branch
release_commit
release_blob
production_files.latest
production_files.install
production_files.expected_identical
validation_status
```

Optional declared roadmap coordinates may be consumed only when a target renderer explicitly allows them:

```text
major_update_milestone
major_update_phase
major_update_checkpoint
```

`current_priority` remains compatibility/status data only and must not become generated next-action reasoning.

### 7.1 Manifest failure behavior

Malformed JSON, missing required keys, wrong types, unsupported schema, or invalid bounded enums produce:

```text
MANIFEST_INVALID
```

No target file may be written.

### 7.2 No manifest auto-heal

The following is forbidden:

```text
manifest says 0.64.3
resolved production says 0.64.6
→ sync-state rewrites manifest to 0.64.6
```

That is a release/state-authority transition owned outside this tool.

---

## 8. Production identity record

Because `sync-state.mjs` must not resolve GitHub refs or fetch remote branches, the outer orchestrator supplies a bounded local resolver record.

Canonical argument:

```text
--production-identity <path>
```

Initial logical schema:

```json
{
  "schemaVersion": 1,
  "product": "SimCore",
  "resolvedBranch": "release-simcore",
  "resolvedCommit": "<git commit sha>",
  "latest": {
    "path": "<materialized local path>",
    "blob": "<git blob sha>"
  },
  "install": {
    "path": "<materialized local path>",
    "blob": "<git blob sha>"
  }
}
```

The outer orchestrator is responsible for producing this record from an immutable resolved repository state.

The inner tool does not blindly trust its file hashes.

It re-reads the local materialized files and verifies that their computed Git-blob identities match the supplied record.

---

## 9. Local production-source verification

Verification order is fixed conceptually as:

```text
parse identity record
→ validate identity schema
→ read latest bytes
→ read install bytes
→ compute local Git blob identity for latest
→ compute local Git blob identity for install
→ compare local blobs to identity record
→ compare resolved branch to manifest.release_branch
→ compare resolved commit to manifest.release_commit
→ compare latest blob to manifest.release_blob
→ compare latest/install identity when expected_identical=true
→ compare latest/install bytes when expected_identical=true
→ parse source version marker
→ compare version marker to manifest.production_version
→ parse release-name marker when supported
→ compare release name to manifest.release_name
```

Only then may the source outcome become:

```text
IDENTITY_VERIFIED
```

### 9.1 Git blob computation

The tool may compute a Git-compatible blob SHA from local bytes without invoking `git` or contacting a repository.

Conceptually for the current SHA-1 repository object format:

```text
sha1("blob " + byteLength + NUL + bytes)
```

If repository object format support ever changes, the production-identity schema must version that behavior explicitly rather than silently guessing.

### 9.2 Latest/install identity

When:

```text
production_files.expected_identical = true
```

all of the following must hold:

```text
latest bytes == install bytes
latest computed blob == install computed blob
identity.latest.blob == identity.install.blob
manifest.release_blob == computed latest blob
```

Failure is source identity drift.

### 9.3 Release-name extraction

Release-name verification is required where the current supported SimCore release-note format can be parsed deterministically.

If the source format is genuinely unsupported:

```text
SOURCE_FORMAT_UNSUPPORTED
```

is safer than silently skipping the check.

Compatibility exceptions, if ever required for historical baselines, must be explicit registry/schema data rather than heuristic fallback.

---

## 10. Source outcome vocabulary

RS2-2B inherits the RS2-2A source outcomes:

```text
IDENTITY_VERIFIED
SOURCE_IDENTITY_DRIFT
SOURCE_UNAVAILABLE
MANIFEST_INVALID
SOURCE_FORMAT_UNSUPPORTED
```

Only `IDENTITY_VERIFIED` may proceed to target rendering or write planning.

All other outcomes are read-only terminal outcomes.

### 10.1 Drift dimensions

Bounded drift dimensions include at minimum:

```text
VERSION_DRIFT
RELEASE_NAME_DRIFT
RELEASE_BRANCH_DRIFT
RELEASE_COMMIT_DRIFT
RELEASE_BLOB_DRIFT
LATEST_INSTALL_DIVERGED
PRODUCTION_PATH_MISSING
PRODUCTION_IDENTITY_RECORD_INVALID
MATERIALIZED_BLOB_MISMATCH
VALIDATION_SCHEMA_DRIFT
```

Multiple dimensions may be reported.

No full production source body appears in the report.

---

## 11. Target registry contract

The tool does not discover Markdown files by globbing the repository.

It reads an explicit versioned registry:

```text
--targets <registry-path>
```

Initial logical shape:

```json
{
  "registryVersion": 1,
  "targets": [
    {
      "id": "current-development-production-snapshot",
      "path": "docs/CURRENT_DEVELOPMENT.md",
      "blockId": "PRODUCTION_SNAPSHOT",
      "renderer": "production-snapshot-v1",
      "markerProfile": "canonical-or-registered-legacy",
      "sourceFields": [
        "product",
        "production_version",
        "release_name",
        "release_branch",
        "release_commit",
        "release_blob",
        "validation_status"
      ]
    }
  ]
}
```

RS2-2C will freeze the exact initial target entries, marker migration choices, and renderer-to-document mapping.

RS2-2B freezes the mechanism:

```text
explicit registry
explicit renderer ID
explicit block ID
explicit source-field allowlist
no repository glob authority
```

---

## 12. Registry validation

Before reading target content, the registry must satisfy:

```text
supported registryVersion
unique target id
unique path + block authority combination
known renderer id
known marker profile
known source fields only
no HUMAN_JUDGMENT fields
no duplicate block owner
paths under root
```

Failures include:

```text
TARGET_REGISTRY_INVALID
DUPLICATE_TARGET_ID
DUPLICATE_BLOCK_AUTHORITY
RENDERER_UNREGISTERED
SOURCE_FIELD_UNAUTHORIZED
MARKER_PROFILE_UNREGISTERED
```

No target write may occur after any registry validation failure.

---

## 13. Renderer protocol

Every renderer is a deterministic pure transformation over an explicit bounded fact object.

Conceptual interface:

```text
render(context) -> generatedBlockText
```

Where `context` contains only allowlisted verified facts for that renderer.

Renderers must not read:

```text
process.env for semantic values
wall clock
current Git branch
network
filesystem outside their supplied inputs
unregistered manifest keys
other target documents
```

### 13.1 Renderer output constraints

Generated output must be:

```text
UTF-8 text
bounded in size
free of timestamps sourced from "now"
free of human conclusions
stable field order
stable whitespace
stable quoting rules
```

The same verified input facts must produce byte-identical generated block content.

---

## 14. Machine-block marker handling

RS2-2B implements the marker invariants frozen by RS2-2A.

Canonical marker form:

```text
<!-- SIMCORE_SYNC:<BLOCK_ID>:BEGIN -->
...
<!-- SIMCORE_SYNC:<BLOCK_ID>:END -->
```

Registered legacy aliases may exist only when RS2-2C explicitly maps them.

For each target, preflight requires:

```text
BEGIN count exactly 1
END count exactly 1
BEGIN before END
no nested registered block
no overlapping registered block
block ID matches registry target
markers themselves remain unchanged unless RS2-2C authorizes migration
```

Failures include:

```text
MARKER_MISSING
MARKER_DUPLICATE
MARKER_REVERSED
MARKER_NESTED
MARKER_OVERLAP
BLOCK_ID_UNREGISTERED
```

Ambiguous regex replacement is forbidden.

---

## 15. Byte-span model

The tool parses each target into three bounded byte spans:

```text
PREFIX
= bytes from file start through BEGIN marker boundary

MANAGED_BODY
= bytes strictly owned between BEGIN and END markers

SUFFIX
= END marker boundary through file end
```

Only `MANAGED_BODY` may change during ordinary synchronization.

Required proof before a proposed write is accepted:

```text
before.PREFIX  == after.PREFIX
before.SUFFIX  == after.SUFFIX
markers         == expected registered markers
```

This is stronger than visually comparing Markdown.

### 15.1 Newline behavior

Renderer body newline style is deterministic per target.

Initial rule:

```text
use the newline sequence adjacent to the registered marker pair when it is consistently LF or CRLF
otherwise fail closed as TARGET_FORMAT_UNSUPPORTED
```

The tool must not normalize line endings outside the managed body.

---

## 16. Full preflight before mode behavior

All modes share the same read/verify pipeline up to the action boundary:

```text
1. parse invocation
2. canonicalize root
3. load/validate manifest
4. load/validate production identity record
5. verify local production source identity
6. require IDENTITY_VERIFIED
7. load/validate target registry
8. read every selected target
9. validate every marker pair / block span
10. render every proposed managed body
11. construct proposed target bytes in memory
12. prove unmanaged-byte preservation for every target
13. compute per-target before/after hashes
14. construct complete change plan
15. only then execute mode-specific action
```

There is no target write before the entire selected batch passes preflight.

---

## 17. `--check` semantics

`--check` is read-only.

It compares current registered blocks with deterministic rendered blocks.

Possible clean result:

```text
SYNC_CLEAN
exit 0
```

Possible drift result:

```text
SYNC_DRIFT
exit 1
```

`SYNC_DRIFT` means:

```text
source identity was valid
registry/markers were valid
at least one managed block is stale relative to verified declared state
```

It is not a tool failure.

It is a CI-consumable state difference.

If source identity is invalid, the result is not `SYNC_DRIFT`; it is an infrastructure/source safety failure and exits 2.

---

## 18. `--render` semantics

`--render` is a preview/materialization mode.

It does **not** modify registered target files.

It requires:

```text
--output-dir <path>
```

For every selected target, it writes the complete proposed target file under the output directory using a deterministic relative-path mirror.

Example:

```text
<output-dir>/docs/CURRENT_DEVELOPMENT.md
```

Rules:

```text
source target remains byte-identical
output files are deterministic
output directory is explicit
existing output files are replaced only through file-atomic temp+rename semantics
no Git commit or branch operation
```

`--render` is intended for test fixtures, review, and migration rehearsal.

Successful render exits 0 whether or not the source target was stale, because rendering the preview is the requested action.

The report still records per-target `CLEAN` or `STALE` status.

---

## 19. `--write` semantics

`--write` may mutate only registered target files beneath `--root`.

Preconditions:

```text
source outcome = IDENTITY_VERIFIED
all registry entries valid
all selected target markers valid
all proposed outputs deterministic
unmanaged-byte preservation proven
all source target paths unchanged since preflight read
```

Possible outcomes:

```text
WRITE_NOOP
WRITE_APPLIED
```

Both exit 0.

### 19.1 No manifest write

`--write` does not include the manifest in the target set.

The manifest is an input authority, not a renderer output.

### 19.2 No hidden Git operation

After local target writes, the tool stops.

It does not:

```text
git add
git commit
git pull
git rebase
git push
repo-main-write.py
GitHub API
```

Those are orchestration concerns.

---

## 20. File-level atomic write contract

Each changed target is written through a same-directory temporary file followed by atomic rename where supported by the local filesystem.

Conceptually:

```text
write temp bytes
→ verify temp bytes hash == planned after-hash
→ confirm live target still equals planned before-hash
→ rename temp over target
```

A target must never be truncated in place and then rewritten.

### 20.1 Batch-level honesty

RS2-2B does **not** claim a multi-file filesystem transaction that the platform cannot guarantee.

The safety model is:

```text
all-target preflight before first write
+ file-atomic replacement
+ live before-hash recheck immediately before each replacement
+ bounded recovery reporting
```

If an I/O failure occurs after one target was already replaced, the tool must report:

```text
WRITE_PARTIAL_FAILURE
```

with the exact bounded list of target IDs already applied and not applied.

The orchestrator must treat this as failed infrastructure and must not commit the partial result.

Implementation should attempt bounded restoration from in-memory/original staged bytes where safe, but must never report success unless the final target set matches the complete planned after-state or the complete original before-state.

A restoration failure is:

```text
WRITE_RECOVERY_FAILED
```

and requires explicit administrative attention.

---

## 21. Concurrent local-change guard

The tool records a content hash for every target during preflight.

Immediately before replacing a target in `--write`, it re-reads the current file and compares it with the planned before-hash.

If any target changed after planning:

```text
TARGET_CHANGED_DURING_RUN
```

No replacement of that target occurs.

The invocation fails closed.

This protects against another process modifying the same checkout during synchronization.

It does not replace repository-level main coordination.

---

## 22. Relationship to shared-main coordination

The repository-level integration sequence may later be:

```text
checkout / worktree at chosen base
→ outer orchestrator materializes production identity
→ sync-state --write
→ verify local diff is target-bounded
→ create product-owned payload commit
→ repo-main-write.py replays payload on latest main
```

Important:

```text
sync-state owns managed block bytes
repo-main-write owns safe shared-main landing
```

Neither tool should absorb the other's responsibility.

If the shared main moves after the local sync commit, `repo-main-write.py` may replay that bounded commit and fail closed on a true content conflict.

`sync-state` must not invent a second retry/rebase protocol.

---

## 23. Result report

All modes produce a bounded in-memory result.

If `--report <path>` is supplied, the result is serialized as deterministic JSON.

Initial logical schema:

```json
{
  "reportVersion": 1,
  "mode": "check",
  "result": "SYNC_DRIFT",
  "source": {
    "outcome": "IDENTITY_VERIFIED",
    "driftDimensions": []
  },
  "targets": [
    {
      "id": "current-development-production-snapshot",
      "path": "docs/CURRENT_DEVELOPMENT.md",
      "blockId": "PRODUCTION_SNAPSHOT",
      "status": "STALE",
      "beforeBlockSha256": "...",
      "afterBlockSha256": "...",
      "beforeFileSha256": "...",
      "afterFileSha256": "...",
      "outsideManagedBytesPreserved": true,
      "changed": true
    }
  ],
  "write": {
    "attempted": false,
    "appliedTargetIds": []
  }
}
```

### 23.1 Bounded-report rule

Reports must not contain:

```text
full production source
full target documents
raw human-authored paragraphs
raw prompt/output/chat bodies
secret environment values
GitHub token data
```

Generated block bodies are also omitted from the normal JSON report.

Render-preview output files are the explicit mechanism for inspecting complete proposed target content.

---

## 24. Target status vocabulary

Initial per-target statuses:

```text
CLEAN
STALE
NOT_EVALUATED
```

Safety/parse failures are represented by bounded reason codes rather than pretending a target is merely stale.

Examples:

```text
MARKER_MISSING
MARKER_DUPLICATE
MARKER_REVERSED
MARKER_NESTED
MARKER_OVERLAP
TARGET_FORMAT_UNSUPPORTED
TARGET_CHANGED_DURING_RUN
TARGET_PATH_INVALID
```

---

## 25. Top-level result vocabulary

Initial top-level results:

```text
SYNC_CLEAN
SYNC_DRIFT
RENDER_APPLIED
WRITE_NOOP
WRITE_APPLIED
SOURCE_INVALID
TARGET_INVALID
INVOCATION_ERROR
WRITE_FAILED
WRITE_PARTIAL_FAILURE
WRITE_RECOVERY_FAILED
INTERNAL_ERROR
```

The result vocabulary separates a healthy detected drift from an untrustworthy tool/source state.

---

## 26. Exit-code contract

RS2-2B freezes a compact exit-code contract:

```text
0 = requested operation completed successfully
1 = check-mode managed-state drift detected
2 = invocation / schema / source / registry / target safety failure
3 = local write / partial-write / recovery failure
4 = unexpected internal tool failure
```

Examples:

```text
--check + clean                → 0
--check + stale managed block  → 1
--check + source identity drift→ 2
--render successful            → 0
--write no-op                  → 0
--write applied                → 0
--write target changed mid-run → 2 before mutation of that target
--write partial I/O failure    → 3
unexpected assertion failure   → 4
```

RS2-2D may add more detailed contradiction reason codes, but it must preserve these top-level exit meanings unless evidence requires an explicit versioned change.

---

## 27. Standard output behavior

Human-readable stdout/stderr must be bounded.

Example successful check:

```text
SIMCORE_SYNC_STATE SYNC_CLEAN
source IDENTITY_VERIFIED
2 targets · 2 clean · 0 stale
```

Example healthy drift:

```text
SIMCORE_SYNC_STATE SYNC_DRIFT
source IDENTITY_VERIFIED
2 targets · 1 clean · 1 stale
stale: current-development-production-snapshot
```

Example source failure:

```text
SIMCORE_SYNC_STATE SOURCE_INVALID
SOURCE_IDENTITY_DRIFT
VERSION_DRIFT, RELEASE_COMMIT_DRIFT
writes: NONE
```

Do not dump target bodies or giant diffs to normal logs.

---

## 28. Selection behavior

Initial implementation should support the entire registry by default.

A bounded optional selector may be added:

```text
--target <target-id>
```

repeated as needed.

If selectors are implemented, unknown target IDs are invocation errors.

No ad-hoc file path supplied on the CLI may bypass the registry.

This prevents:

```text
--write docs/random-evidence.md
```

from becoming an unofficial synchronization surface.

---

## 29. Security and forbidden capabilities

`sync-state.mjs` must not require or use:

```text
GitHub token
GitHub API
network fetch
SSH
remote Git operations
branch push
Git commit creation
process spawning for Git/release commands
pluginStorage
Risu host APIs
setChat
browser storage
runtime plugin code execution
timers/background jobs
```

The tool operates on local data files only.

### 29.1 Source is data, not executable input

Production `latest.js` / `install.js` are inspected as text/bytes.

`sync-state` must never execute the production plugin bundle merely to determine its version or release name.

Release markers are parsed statically.

---

## 30. Environment-variable policy

Environment variables may be used for ordinary process/runtime configuration only if they do not alter semantic state silently.

Forbidden semantic authority pattern:

```text
VERSION=0.99.0 sync-state --write
```

Release identity must come from the explicit manifest + production-identity inputs.

CLI arguments and file content are the auditable semantic inputs.

Secrets are never read or reported.

---

## 31. Determinism contract

Given byte-identical:

```text
manifest
production identity record
materialized latest/install
registry
target files
```

and the same supported tool version, the tool must produce byte-identical:

```text
rendered managed bodies
render-preview files
JSON report except fields explicitly excluded from determinism
exit code
```

Initial report schema contains no wall-clock timestamp.

No `syncedAt: now` field is allowed.

---

## 32. Idempotence contract

For verified source state S and target set D:

```text
write(S, D)  -> D'
write(S, D') -> D'
```

The second write must return:

```text
WRITE_NOOP
```

with no file-byte changes.

Similarly:

```text
check(S, D') -> SYNC_CLEAN
```

Idempotence is a required implementation self-test.

---

## 33. Human-judgment firewall in the executable

The renderer registry is the executable enforcement point for the RS2-2A human-judgment firewall.

No renderer may synthesize:

```text
release health conclusions
next action
promotion decision
FIX / WATCH / DEFER / BLOCKER judgment
cause attribution
risk assessment
M2/M3 decision
live evidence interpretation
```

A field such as:

```text
validation_status = LIVE_PENDING
```

may render exactly as a declared status.

It may not render:

```text
"The release is healthy and ready to proceed."
```

A field such as:

```text
current_priority = M2_3
```

may not generate:

```text
"M2-3 is the next authorized task."
```

---

## 34. Current legacy-sync coexistence

RS2-2B does not retire:

```text
scripts/simcore-sync-memory.py
.github/workflows/simcore-release-state-sync.yml
```

During implementation transition, the new tool may be run in shadow/check mode against fixtures or an infrastructure branch.

It must not become a second concurrent production-memory writer before RS2-2E grants operational authority.

No period should exist where two independent mechanisms both believe they own the same machine-managed block on `main`.

RS2-2C will define marker/target migration and coexistence mechanics in detail.

---

## 35. Relationship to RS2-1 durable tests

Once implemented, `sync-state` becomes a permanent infrastructure regression subject.

Minimum self-test fixture families required by RS2-2B:

```text
CLI mode exclusivity
valid verified identity
manifest invalid
identity-record invalid
resolved commit mismatch
blob-record mismatch
latest/install divergence
version mismatch
release-name mismatch
path traversal denial
target symlink denial
registry duplicate target
unauthorized source field
marker missing
marker duplicate
marker reversed
marker nested/overlap
clean check
stale check exit 1
render preview preserves source target
write applied
write no-op
idempotent second run
outside-managed bytes unchanged
newline behavior
local target changed during run
bounded report contains no raw bodies
no network / GitHub / git-write capability
```

The test harness for these infrastructure fixtures may be simpler than the SimCore runtime bundle harness, but must retain deterministic isolated temporary directories.

---

## 36. Required negative identity fixture

The direct historical drift observed during RS2-2A remains a required future negative fixture in reduced form.

Conceptual input:

```text
manifest:
  version 0.64.3
  release commit A

resolved identity:
  version 0.64.6-equivalent
  release commit B
```

Expected:

```text
SOURCE_INVALID
SOURCE_IDENTITY_DRIFT
VERSION_DRIFT
RELEASE_COMMIT_DRIFT
no target mutation
exit 2
```

The permanent fixture must use reduced synthetic identifiers, not hardcode a current production version forever.

---

## 37. Write-safety fixture family

The implementation must prove at minimum:

```text
A. valid stale managed body
   → --write changes managed body only

B. same input second run
   → WRITE_NOOP

C. human paragraph changed before block
   → renderer preserves it byte-for-byte

D. human paragraph changed after block
   → renderer preserves it byte-for-byte

E. duplicate BEGIN marker
   → TARGET_INVALID
   → no writes

F. target changes after preflight
   → TARGET_CHANGED_DURING_RUN
   → fail closed

G. one of multiple targets invalid
   → preflight abort before first write
```

This is the minimum proof that synchronization is block-owned rather than document-owned.

---

## 38. Render-preview fixture family

`--render` must prove:

```text
original target bytes unchanged
preview target equals proposed --write result
relative path mapping deterministic
report marks CLEAN/STALE accurately
repeated render yields identical preview bytes
```

Render mode must not become a second undocumented target writer.

Only the explicitly supplied output directory is writable.

---

## 39. Failure ordering

When multiple problems exist, the tool reports the earliest authority/safety layer first while retaining bounded secondary reason codes where useful.

Priority:

```text
INVOCATION
→ ROOT/PATH
→ MANIFEST
→ PRODUCTION IDENTITY
→ SOURCE VERIFICATION
→ REGISTRY
→ TARGET MARKERS/FORMAT
→ RENDERER
→ MODE ACTION
→ WRITE I/O
```

Example:

If the manifest and production identity disagree **and** a target marker is missing, the source identity failure terminates before target rendering.

This avoids discussing document staleness against an unverified release identity.

---

## 40. No automatic contradiction repair

RS2-2B detects only contradictions required to establish trusted source/render inputs.

Even when an obvious correction appears possible, the tool does not:

```text
rewrite manifest
pick newer commit
pick higher semantic version
change validation status
move roadmap checkpoint
repair human prose
```

RS2-2D will broaden contradiction detection semantics, but the repair boundary stays explicit and fail-closed.

---

## 41. No permanent CI in RS2-2B

RS2-2B defines a CI-compatible executable contract but does not install a permanent CI workflow.

RS2-3 later decides when and where to invoke:

```text
sync-state --check
```

and which drift states block a PR/release.

Any temporary implementation validation workflow before RS2-3 must remain:

```text
infrastructure-only
read-only toward production
no release deployment
no manifest mutation
no main direct write authority beyond an explicit bounded infrastructure PR
```

---

## 42. No release transaction in RS2-2B

RS2-4 eventually owns the permanent release transaction.

RS2-2B does not implement:

```text
candidate promotion
release-simcore branch update
product-manifest release identity update
release branch lock
release rollback
```

The future relationship is directional:

```text
RS2-4 release transaction establishes declared + deployed identity
→ RS2-2 sync-state verifies that identity locally
→ RS2-2 renders registered documentary facts
```

The renderer never becomes the deployer.

---

## 43. Interaction with active runtime work

RS2-2B is a design-only infrastructure subphase and remains independent from active SimCore correctness/observability minis.

Current or future runtime releases may advance while this design is being written.

That does not invalidate the tool contract because the tool reads version/release facts as data.

Implementation must not be combined in one work item with:

```text
v0.64.x runtime correctness change
cache/telemetry behavior change
M2-3 Edit Reconcile ownership extraction
Representation behavior
Reaction/COMMUNITY behavior
Broadcast/Time/Frame behavior
Core storage schema
prompt/runtime semantic changes
```

Function changes and release-system infrastructure remain separate workstreams.

---

## 44. Implementation sequence after authorization

RS2-2B design anticipates the following future implementation order:

```text
B0  infrastructure work branch from current main
B1  CLI parser + mode exclusivity
B2  root/path safety + schema readers
B3  production-identity verifier + local Git-blob computation
B4  target-registry reader + renderer registry
B5  marker/span parser + byte-preservation planner
B6  --check + bounded report
B7  --render preview
B8  --write + file-atomic replacement + concurrent-local-change guard
B9  self-test suite
B10 full RS2-2B implementation evidence freeze
B11 handoff to RS2-2C mapping/migration implementation
```

No legacy production sync is retired in this sequence.

---

## 45. Implementation evidence requirements

Future RS2-2B implementation evidence must record at minimum:

```text
tool commit
fixture/self-test result
supported CLI modes
production-identity schema version
registry schema version
report schema version
source verification controls
write-safety controls
network/GitHub capability absence
manifest mutation absence
runtime/release-simcore diff NONE
legacy sync retirement NONE
```

Reports/evidence must be bounded and must not contain full target/source bodies.

---

## 46. RS2-2B design close gate

RS2-2B design is complete when:

```text
physical tool path defined                              PASS
outer orchestrator / inner tool split defined          PASS
explicit local production-identity record defined      PASS
manifest read-only contract defined                    PASS
local blob/source verification defined                 PASS
CLI check/render/write modes defined                    PASS
mode exclusivity defined                               PASS
root/path safety defined                               PASS
explicit target registry defined                       PASS
renderer protocol defined                              PASS
marker/span parser contract defined                    PASS
unmanaged-byte preservation proof defined              PASS
full-batch preflight before writes defined              PASS
check-mode semantics and drift exit defined            PASS
render-preview semantics defined                       PASS
write-mode semantics defined                           PASS
file-level atomic replacement defined                  PASS
concurrent local-change guard defined                  PASS
bounded report schema defined                          PASS
top-level result vocabulary defined                    PASS
exit-code contract defined                             PASS
human-judgment firewall enforced at renderer boundary  PASS
repo-main-write separation defined                     PASS
legacy sync coexistence defined                        PASS
required self-test families defined                    PASS
runtime diff                                            NONE
release-simcore diff                                    NONE
manifest diff                                           NONE
permanent CI change                                     NONE
legacy sync retirement                                  NONE
```

No implementation is required to close the **design** subphase.

---

## 47. Handoff to RS2-2C

RS2-2C must now freeze the **concrete document mapping and migration mechanics** for this tool.

At minimum RS2-2C must decide:

```text
exact initial target registry entries
CURRENT_DEVELOPMENT PRODUCTION_SNAPSHOT renderer shape
SIMCORE_GUIDELINES PRODUCTION_BASELINE renderer shape
canonical marker vs registered legacy alias strategy
one-time marker migration mechanics
exact source-field allowlists per block
legacy simcore-sync-memory.py coexistence window
which mechanism owns each block during transition
unmanaged-byte preservation migration proof
how old regex-driven sync is prevented from racing the new block owner
```

RS2-2C must also account for the repository-wide main-write coordination already introduced separately.

It must not make `sync-state.mjs` itself a GitHub/main writer.

---

## 48. Frozen final rule

RS2-2B follows one executable rule above all others:

> Resolve repository authority outside the tool; verify bytes and own only registered bytes inside the tool.

That means:

```text
no remote authority guessing
no manifest self-heal
no human reasoning generation
no unregistered file discovery
no whole-document rewrite
no hidden GitHub write
```

A safe synchronization tool should be boring:

```text
read exact inputs
verify exact identity
render exact blocks
write exact spans
report exact bounded outcomes
```

Everything else belongs to another authority.