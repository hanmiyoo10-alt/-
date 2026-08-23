# SimCore Release System v2 — RS2-2D Drift / Contradiction Detection & Check-Mode Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Prior subphase: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2C_TARGET_MAPPING_WRITE_SAFETY_MIGRATION.md`
Tool contract: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
Authority foundation: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
Phase: `RS2-2 — State Synchronization`
Subphase: `RS2-2D — Drift / Contradiction Detection & Check-Mode Contract`
Authority class: release-infrastructure design / read-only consistency-check contract

---

## 1. Purpose

RS2-2D freezes what the future state synchronization system is allowed to call drift or contradiction, how those findings are reported, and which findings may block a state/release operation.

The central problem is not merely that duplicated state can become stale.

The harder problem is avoiding a checker that becomes noisy or dangerous by treating every historical version reference as a current-state contradiction.

RS2-2D therefore follows this rule:

> Detect only contradictions whose authority, scope, and comparison rule are explicit enough to prove mechanically.

The future checker may report:

```text
production identity drift
managed block staleness
marker/ownership drift
writer-configuration conflict
registered current-state human contradiction
```

It may not:

```text
scan all prose for version-looking strings
infer which historical paragraph should be rewritten
promote or demote validation state
choose a newer release because its version is larger
rewrite human reasoning
repair contradictions automatically
```

This document does **not** implement the checker, change runtime code, modify `release-simcore`, repair the current stale manifest, modify target Markdown, create permanent CI, or retire the legacy release-state path.

---

## 2. Inputs inherited from RS2-2A/B/C

RS2-2D assumes the following already-frozen boundaries.

### 2.1 Declared release identity

`product-manifest.json` is the release-identity declaration for synchronization purposes.

It is read-only to `sync-state.mjs`.

### 2.2 Materialized production identity

An outer orchestrator resolves `release-simcore`, materializes `latest.js` and `install.js`, and supplies a bounded production-identity record.

`sync-state.mjs` verifies the local bytes and identity record before trusting the manifest declaration.

### 2.3 Registered machine targets

Initial steady-state targets are exactly:

```text
docs/CURRENT_DEVELOPMENT.md
  SIMCORE_SYNC:PRODUCTION_SNAPSHOT

docs/SIMCORE_GUIDELINES.md
  SIMCORE_SYNC:PRODUCTION_BASELINE
```

### 2.4 Single-writer steady state

After RS2-2C cutover:

```text
manifest declaration
  -> transitional legacy declaration path until RS2-4

registered document spans
  -> sync-state only

main integration
  -> repo-main-write.py
```

There is no valid `DUAL_WRITE` state.

---

## 3. Current repository evidence

At this design point the repository contains direct negative evidence for source identity drift.

`product-manifest.json` still declares:

```text
production_version = 0.64.3
release_commit      = d7fd45cd193ef1ff187c73761ded958d89558ebf
release_blob        = ff481aa904340b844ef29b0d89aa20bd6286286d
```

while `release-simcore` currently resolves to the corrected v0.64.6 production line.

This is retained as:

```text
RS2_STATE_IDENTITY_DRIFT
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE
```

RS2-2D does not repair it.

It uses the shape as a required future negative fixture.

A second important observation is that `CURRENT_DEVELOPMENT.md` currently duplicates the stale 0.64.3 identity in both its legacy machine snapshot and human current-state prose.

That demonstrates why source trust must be established before downstream contradiction checks are interpreted.

---

## 4. Check layers

The check system is divided into five layers.

```text
L0  invocation / local input validity
L1  source identity authority
L2  machine-target structure and freshness
L3  writer / ownership configuration
L4  bounded human current-state observations
```

These layers are intentionally not equal.

An L1 source failure prevents the checker from claiming that a target is stale relative to a trustworthy current release.

An L4 human observation never becomes permission to rewrite prose.

---

## 5. Finding severity model

Every finding has exactly one severity:

```text
BLOCKER
DRIFT
OBSERVATION
```

### 5.1 `BLOCKER`

The checker cannot safely establish or preserve the required authority boundary.

Examples:

```text
SOURCE_IDENTITY_DRIFT
MANIFEST_INVALID
MARKER_DUPLICATE
MARKER_OVERLAP
LEGACY_MARKER_RESURRECTED
DUAL_WRITER_CONFIGURED
LEGACY_FULL_WRITER_ACTIVE_AFTER_CUTOVER
MATERIALIZED_BLOB_MISMATCH
```

A BLOCKER requires exit code 2.

### 5.2 `DRIFT`

Authority is trustworthy and structure is safe, but one or more registered machine blocks do not equal the deterministic expected rendering.

Canonical example:

```text
MANAGED_BLOCK_STALE
```

A DRIFT requires exit code 1 when no BLOCKER exists.

### 5.3 `OBSERVATION`

The checker found a bounded current-state inconsistency outside machine-owned bytes, but automatic repair is not authorized.

Canonical examples:

```text
HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
HUMAN_CURRENT_RELEASE_SECTION_STALE
```

Observations do not change exit code from 0 by themselves.

They are evidence for human synchronization work.

---

## 6. Top-level check results

The top-level result vocabulary is:

```text
CHECK_CLEAN
CHECK_CLEAN_WITH_OBSERVATIONS
CHECK_DRIFT
CHECK_BLOCKED
```

Rules:

```text
no blocker + no drift + no observation
  -> CHECK_CLEAN

no blocker + no drift + >=1 observation
  -> CHECK_CLEAN_WITH_OBSERVATIONS

no blocker + >=1 drift
  -> CHECK_DRIFT

>=1 blocker
  -> CHECK_BLOCKED
```

Observations may coexist with drift or blockers but do not outrank them.

---

## 7. Exit-code contract

RS2-2B's three-code model remains unchanged.

```text
0  CHECK_CLEAN or CHECK_CLEAN_WITH_OBSERVATIONS
1  CHECK_DRIFT
2  CHECK_BLOCKED / invalid invocation / safety or authority failure
```

No additional exit codes are introduced in RS2-2D.

This keeps shell and future CI consumption simple.

---

## 8. Precedence

When multiple finding classes coexist, primary result precedence is:

```text
BLOCKER
  > DRIFT
  > OBSERVATION
  > CLEAN
```

Within BLOCKER processing, conceptual authority order remains:

```text
INVOCATION/PATH
→ MANIFEST
→ MATERIALIZED PRODUCTION IDENTITY
→ SOURCE IDENTITY AGREEMENT
→ TARGET MARKER/FORMAT SAFETY
→ WRITER OWNERSHIP SAFETY
→ TARGET FRESHNESS
→ HUMAN CURRENT-CLAIM OBSERVATIONS
```

The report may retain bounded secondary findings that are independent of the failed authority layer.

It must not fabricate downstream comparisons that require a source identity which failed verification.

---

## 9. Source identity drift

Source identity verification remains the strongest state-sync check.

The following are BLOCKER dimensions:

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
SOURCE_FORMAT_UNSUPPORTED
```

When any required identity dimension fails:

```text
source.status = SOURCE_IDENTITY_DRIFT or corresponding terminal source failure
result        = CHECK_BLOCKED
exit          = 2
```

No managed block is declared stale or clean against an unverified source.

---

## 10. No semantic-version winner rule

The checker must never resolve identity drift using semantic version ordering.

Forbidden:

```text
manifest 0.64.3
production 0.64.6
→ choose 0.64.6 because 0.64.6 > 0.64.3
```

Also forbidden:

```text
same version, different commit
→ choose whichever commit is newer by date
```

The checker's job is to report disagreement, not decide authority transitions.

This is especially important for same-version correction releases.

---

## 11. Machine target states

Once source identity is verified and target markers are safe, every registered target gets one freshness state:

```text
CLEAN
STALE
INVALID
NOT_EVALUATED
```

### 11.1 `CLEAN`

The exact registered managed span equals deterministic renderer output.

### 11.2 `STALE`

Marker structure is valid, but body bytes differ from deterministic renderer output.

This creates:

```text
MANAGED_BLOCK_STALE
severity DRIFT
```

### 11.3 `INVALID`

Marker/span structure cannot be trusted.

Examples:

```text
marker missing
marker duplicated
marker reversed
marker nested
marker overlap
unregistered block ID
invalid UTF-8
```

This creates a BLOCKER.

### 11.4 `NOT_EVALUATED`

A prior source/registry authority failure prevented a trustworthy render comparison.

`NOT_EVALUATED` is not equivalent to CLEAN.

---

## 12. Staleness is exact-byte staleness

A managed block is CLEAN only when its expected bytes are exact.

The checker does not normalize:

```text
whitespace
line endings inside the managed span
heading punctuation
field ordering
label wording
```

before comparing.

The renderer already defines canonical bytes.

Therefore:

```text
semantically similar
!=
CLEAN
```

This property protects deterministic idempotence.

---

## 13. Hash-bounded stale reporting

A stale block report contains bounded identity only.

Allowed:

```text
target id
block id
current managed length
expected managed length
current managed hash
expected managed hash
renderer id/version
finding code
```

Forbidden by default:

```text
full current block text
full expected block text
full document body
arbitrary human prose surrounding the block
```

`--render` remains the explicit local preview mechanism when a human needs the proposed bytes.

---

## 14. Canonical marker enforcement

After RS2-2C cutover the ordinary checker accepts only canonical markers.

For `CURRENT_DEVELOPMENT`:

```text
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_SYNC:PRODUCTION_SNAPSHOT:END -->
```

For Guidelines:

```text
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:BEGIN -->
<!-- SIMCORE_SYNC:PRODUCTION_BASELINE:END -->
```

Legacy aliases are not ordinary steady-state aliases.

---

## 15. Legacy marker resurrection

After canonical cutover, appearance of the old `CURRENT_DEVELOPMENT` markers:

```text
<!-- SIMCORE_PRODUCTION_SNAPSHOT:BEGIN -->
<!-- SIMCORE_PRODUCTION_SNAPSHOT:END -->
```

produces:

```text
LEGACY_MARKER_RESURRECTED
severity BLOCKER
exit 2
```

This remains true even if the canonical block also exists.

Mixed old/new marker authority is more dangerous, not less.

The checker does not silently migrate the old marker again.

---

## 16. Mixed marker authority

The following are all BLOCKER states:

```text
legacy pair + canonical pair
legacy BEGIN + canonical END
canonical BEGIN + legacy END
multiple canonical pairs
canonical pair nested in any other managed span
```

Representative finding codes:

```text
MARKER_AUTHORITY_MIXED
MARKER_DUPLICATE
MARKER_OVERLAP
MARKER_REVERSED
```

No best-effort selection is allowed.

---

## 17. Writer-configuration consistency

State consistency includes the system that is allowed to write state.

After cutover, the repository configuration must preserve:

```text
legacy declaration path
  -> manifest-only mode

sync-state
  -> registered document spans

repo-main-write.py
  -> latest-main integration only
```

The checker may inspect only explicitly registered workflow/script configuration surfaces.

It does not search every repository file for shell commands.

---

## 18. Writer policy findings

Initial writer-policy BLOCKERs:

```text
DUAL_WRITER_CONFIGURED
LEGACY_FULL_WRITER_ACTIVE_AFTER_CUTOVER
SYNC_STATE_TARGET_OWNER_MISSING
UNREGISTERED_STATE_WRITER
REPO_MAIN_WRITE_BYPASS_CONFIGURED
```

### 18.1 `DUAL_WRITER_CONFIGURED`

Both legacy full document mutation and `sync-state --write` are configured in the same steady-state path.

### 18.2 `LEGACY_FULL_WRITER_ACTIVE_AFTER_CUTOVER`

The ordinary state-sync workflow invokes:

```text
simcore-sync-memory.py --legacy-full
```

or an equivalent legacy document-writing path.

### 18.3 `SYNC_STATE_TARGET_OWNER_MISSING`

Canonical markers are active but the configured ordinary workflow no longer invokes the canonical document owner.

### 18.4 `UNREGISTERED_STATE_WRITER`

A registered workflow surface writes the managed documents through a mechanism not present in the writer-policy contract.

### 18.5 `REPO_MAIN_WRITE_BYPASS_CONFIGURED`

The steady-state workflow attempts an unsafe direct/force main update instead of the approved integration boundary.

---

## 19. Writer checks are structural, not behavioral proof

A static writer-policy PASS proves only that registered configuration matches the expected ownership contract.

It does not prove that GitHub Actions will never fail, that credentials are valid, or that `repo-main-write.py` will never encounter a real content conflict.

Therefore diagnostics must say:

```text
WRITER_POLICY_CLEAN
```

not:

```text
main writes guaranteed safe forever
```

---

## 20. Human contradiction detection is positive-scope only

RS2-2D explicitly forbids repository-wide or document-wide version scanning.

The checker may inspect human prose only through a versioned list of registered **current-claim probes**.

Conceptual shape:

```json
{
  "probeVersion": 1,
  "probes": [
    {
      "id": "current-development-production-verdict",
      "path": "docs/CURRENT_DEVELOPMENT.md",
      "section": "Production verdict",
      "parser": "current-production-sentence-v1",
      "severity": "OBSERVATION"
    }
  ]
}
```

A prose string outside a registered probe is not a contradiction input merely because it contains a version number.

---

## 21. Initial human current-claim probes

RS2-2D authorizes two initial observations in `CURRENT_DEVELOPMENT.md`.

### 21.1 Production verdict claim

Anchor:

```text
# 1. Current Operational State
→ ## Production verdict
```

The parser recognizes only a bounded current-tense claim equivalent to the canonical sentence shape:

```text
`vX.Y.Z` is the current production release.
```

If that exact current claim is present and differs from the verified production identity:

```text
HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
severity OBSERVATION
```

If the sentence shape is absent, the checker does not guess.

### 21.2 Current validation-release heading

Anchor:

```text
# 2. Current Validation Release
```

The first direct release heading under that section may be parsed only when it matches the registered heading grammar:

```text
## vX.Y.Z — Release Name
```

If it unambiguously claims a different current release:

```text
HUMAN_CURRENT_RELEASE_SECTION_STALE
severity OBSERVATION
```

This observation still does not authorize heading rewrite.

---

## 22. Why human current-state findings are observations

`CURRENT_DEVELOPMENT.md` is human continuity authority.

Its human sections encode more than identity:

```text
why a release matters
live evidence state
next action
blocked work
historical continuity
```

The checker cannot safely regenerate that reasoning.

Therefore an unambiguous stale current claim is useful evidence but not machine-owned drift.

Default response:

```text
report observation
preserve bytes
human sync later
```

---

## 23. No global historical exclusion regex is needed

The strongest historical-reference safety rule is **positive scope**, not a giant exclusion regex.

The checker does not start by finding every `vX.Y.Z` occurrence.

It starts from registered current-claim anchors.

Therefore version references inside the following are naturally ignored unless later explicitly registered:

```text
historical release subsections
validated precursor sections
changelogs
incident evidence
watch documents
release plans
regression evidence
code examples
quoted diagnostics
old live gates
architecture history
```

No finding is emitted for uninspected historical material.

---

## 24. Historical heading rule

If a later detector is authorized to inspect a larger human section, it must classify structural heading context before parsing claims.

At minimum these contexts are non-current by default:

```text
heading explicitly containing Historical
heading explicitly containing Superseded
version-specific historical release subsection not registered as current
Guideline Changelog
Completed milestone/history sections
```

But this rule is secondary to positive-scope registration.

Do not broaden scanning merely because exclusions exist.

---

## 25. Quoted and code-fenced content

Human contradiction probes must ignore content inside Markdown code fences, quoted diagnostic blocks, and registered literal examples unless the specific probe contract says otherwise.

Example:

```text
Historical evidence:
`v0.63.55` was production at that time.
```

is not a current-production contradiction merely because it contains a version token.

Likewise a code example that demonstrates stale state is not itself stale state.

---

## 26. Source trust before human comparison

Human current-claim comparisons occur only when:

```text
source identity = IDENTITY_VERIFIED
```

If manifest and production disagree, the checker does **not** compare human prose to either side and announce a human contradiction.

Instead:

```text
source BLOCKER
human probes NOT_EVALUATED
```

This prevents cascading false attribution.

---

## 27. Machine target trust before duplicate-claim comparison

Where a human probe compares against a fact also rendered in a managed block, the verified production identity remains the comparison authority.

The checker must not treat a stale managed block as the source of truth for human prose.

Canonical order:

```text
verified production identity
→ expected deterministic machine state
→ managed block freshness
→ bounded human current-claim observation
```

---

## 28. Contradiction classes

Initial structured finding classes are:

```text
SOURCE_AUTHORITY
TARGET_STRUCTURE
TARGET_FRESHNESS
OWNERSHIP_POLICY
HUMAN_CURRENT_CLAIM
```

Representative codes:

```text
SOURCE_AUTHORITY
  SOURCE_IDENTITY_DRIFT
  MATERIALIZED_BLOB_MISMATCH
  MANIFEST_INVALID

TARGET_STRUCTURE
  MARKER_MISSING
  MARKER_DUPLICATE
  MARKER_OVERLAP
  LEGACY_MARKER_RESURRECTED
  MARKER_AUTHORITY_MIXED

TARGET_FRESHNESS
  MANAGED_BLOCK_STALE

OWNERSHIP_POLICY
  DUAL_WRITER_CONFIGURED
  LEGACY_FULL_WRITER_ACTIVE_AFTER_CUTOVER
  SYNC_STATE_TARGET_OWNER_MISSING
  UNREGISTERED_STATE_WRITER
  REPO_MAIN_WRITE_BYPASS_CONFIGURED

HUMAN_CURRENT_CLAIM
  HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
  HUMAN_CURRENT_RELEASE_SECTION_STALE
```

New classes require design/review rather than arbitrary string additions in code.

---

## 29. Report schema extension

RS2-2D extends the bounded report concept from RS2-2B.

Directional schema:

```json
{
  "schemaVersion": 1,
  "mode": "check",
  "result": "CHECK_CLEAN",
  "source": {
    "status": "IDENTITY_VERIFIED",
    "dimensions": []
  },
  "targets": [
    {
      "id": "current-development-production-snapshot",
      "status": "CLEAN",
      "renderer": "current-development-production-snapshot-v1"
    }
  ],
  "ownership": {
    "status": "CLEAN",
    "findingCodes": []
  },
  "observations": [],
  "counts": {
    "blockers": 0,
    "drifts": 0,
    "observations": 0
  }
}
```

Exact schema is versioned during implementation.

---

## 30. Finding record shape

Each finding is bounded.

Conceptual fields:

```json
{
  "code": "MANAGED_BLOCK_STALE",
  "class": "TARGET_FRESHNESS",
  "severity": "DRIFT",
  "targetId": "current-development-production-snapshot",
  "probeId": null,
  "details": {
    "currentHash": "...",
    "expectedHash": "..."
  }
}
```

Human observation details may include bounded tokens such as:

```text
observed version
expected verified version
registered section/probe id
```

They must not include the full paragraph.

---

## 31. Stable ordering

Report ordering is deterministic.

Required order:

```text
source findings
→ target-structure findings by registry order
→ target-freshness findings by registry order
→ ownership findings by policy registry order
→ human observations by probe registry order
```

Repeated checks over unchanged bytes must produce byte-identical JSON when report paths/metadata are unchanged.

No wall-clock timestamp is inserted by default.

---

## 32. Check mode is read-only

`sync-state --check` must not:

```text
modify manifest
modify managed blocks
rename markers
fix writer configuration
rewrite human prose
create commits
push branches
contact GitHub
```

A checker that repairs state while checking is non-compliant.

---

## 33. Ordinary PR behavior

RS2-2D defines check semantics, not permanent CI trigger wiring.

RS2-3 later decides exactly when ordinary PRs invoke the checker.

The intended policy is scope-aware.

A PR unrelated to SimCore state synchronization should not be blocked merely because existing production state is independently awaiting administrative reconciliation.

Candidate relevant paths include:

```text
product-manifest.json
docs/CURRENT_DEVELOPMENT.md
docs/SIMCORE_GUIDELINES.md
products/simcore/state-sync/**
products/simcore/tooling/sync-state.mjs
scripts/simcore-sync-memory.py
scripts/repo-main-write.py
.github/workflows/simcore-release-state-sync.yml
```

RS2-3 freezes exact trigger/path policy.

---

## 34. Relevant ordinary PR check semantics

When an ordinary PR is in scope for state-sync checking, the checker uses the same result/exit contract as any other invocation.

```text
CHECK_CLEAN                       exit 0
CHECK_CLEAN_WITH_OBSERVATIONS     exit 0
CHECK_DRIFT                       exit 1
CHECK_BLOCKED                     exit 2
```

No softer hidden PR-specific meaning is introduced inside the tool.

Scope selection belongs to orchestration, not check semantics.

---

## 35. Release-state run behavior

The transitional release-state path after RS2-2C cutover is conceptually:

```text
resolve/materialize release-simcore
→ update manifest through explicit declaration owner
→ produce verified production-identity input
→ sync-state --write
→ sync-state --check
→ create bounded payload commit
→ repo-main-write.py
→ post-main read-only verification
```

The final pre-commit `--check` must be:

```text
CHECK_CLEAN
or
CHECK_CLEAN_WITH_OBSERVATIONS
```

`CHECK_DRIFT` or `CHECK_BLOCKED` prevents the payload commit.

---

## 36. Human observations do not block release-state materialization by default

A human current-claim observation may remain immediately after machine state synchronization.

That is expected because human continuity prose is not machine-owned.

Therefore:

```text
CHECK_CLEAN_WITH_OBSERVATIONS
```

is acceptable for release-state machine synchronization.

The observation must be preserved for follow-up human/main-memory synchronization.

RS2-2E defines the exact phase-close expectation for outstanding observations.

---

## 37. Managed drift blocks a completed release-state sync

After `sync-state --write`, a remaining managed block mismatch means the write did not establish deterministic synchronized state.

Therefore:

```text
MANAGED_BLOCK_STALE after write
→ CHECK_DRIFT
→ no commit/push
```

The outer orchestrator does not paper over the failure by staging whatever file exists.

---

## 38. Source blockers always block release-state synchronization

Examples:

```text
manifest says commit A
materialized production says commit B
latest/install differ
resolver blob does not match local bytes
source version differs from manifest
```

All are:

```text
CHECK_BLOCKED
exit 2
writes/commit/push NONE
```

The correct response is authority repair outside the checker.

---

## 39. Post-main verification

After `repo-main-write.py` lands the bounded payload on the latest `main`, the orchestrator should rematerialize or read the resulting main target files and run a read-only consistency verification against the same declared/production identity where still valid.

Purpose:

```text
prove replay onto newer main preserved managed state
prove no content conflict silently changed the block
prove canonical marker authority remains unique
```

If `main` advanced in a way that changes relevant SimCore authority inputs, the operation must resolve fresh inputs rather than reuse stale assumptions.

---

## 40. Main movement and check replay

Because the repository has concurrent product work, a state payload may be replayed onto a newer main.

RS2-2D therefore requires:

```text
before integration:
  check local bounded payload

after latest-main replay:
  re-check registered target bytes / ownership policy
```

A successful pre-replay check is not sufficient evidence for the post-replay result.

This complements `repo-main-write.py`; it does not replace it.

---

## 41. No cross-product contradiction scanning

SimCore state-sync check must not inspect Usage Dashboard current-state prose or decide whether another product is stale.

Likewise the presence of unrelated commits on main is not SimCore drift.

Cross-product coordination is limited to shared repository integration safety.

Product state authorities remain isolated.

---

## 42. No evidence-document scanner

Dedicated SimCore evidence/watch/plan documents are not initial contradiction-check targets.

Examples include:

```text
SIMCORE_M2_LIVE_EVIDENCE.md
SIMCORE_ANOMALY_WATCH.md
version-specific live evidence docs
RS2 design docs
release plans
```

These files intentionally preserve historical claims.

A future machine check over one of them requires a separately registered current-claim probe or managed block.

---

## 43. Validation-state contradiction policy

`manifest.validation_status` is a declaration rendered into the machine snapshot.

The checker verifies that the managed block renders the same declared value.

It does **not** infer whether the declared status is semantically justified by live evidence.

Forbidden:

```text
no live evidence file found
→ downgrade LIVE_PASS
```

or:

```text
CI green
→ promote LIVE_PENDING to LIVE_PASS
```

Evidence-to-status promotion remains outside sync-state.

---

## 44. Roadmap-coordinate contradiction policy

The machine snapshot may render declared:

```text
major_update_milestone
major_update_phase
major_update_checkpoint
```

The checker verifies exact rendering only.

It does not infer that M2 is complete, that M3 should start, or that a checkpoint is blocked.

If human roadmap prose later conflicts with those coordinates, it is not automatically an initial current-claim finding unless a dedicated probe is registered.

---

## 45. `current_priority` remains outside generated-action authority

RS2-2D does not reintroduce `current_priority` through contradiction checking.

The checker may not say:

```text
manifest current_priority = X
human next action = Y
→ contradiction
```

because immediate next action is human operational authority.

A future cleanup may deprecate the compatibility field, but this phase does not assign it stronger meaning.

---

## 46. Provider-cache claims remain outside initial checks

`provider_cache_status` is evidence-sensitive and excluded from the initial managed production snapshot.

RS2-2D does not compare arbitrary human cache prose to that compatibility field.

Provider claims still require provider evidence under the Guidelines.

---

## 47. Check result examples

### 47.1 Fully clean

```text
source IDENTITY_VERIFIED
targets CLEAN
ownership CLEAN
human probes clean/not present

→ CHECK_CLEAN
→ exit 0
```

### 47.2 Machine clean, human stale current claim

```text
source IDENTITY_VERIFIED
targets CLEAN
ownership CLEAN
Production verdict still says previous release

→ HUMAN_CURRENT_PRODUCTION_CLAIM_STALE / OBSERVATION
→ CHECK_CLEAN_WITH_OBSERVATIONS
→ exit 0
```

### 47.3 Machine block stale

```text
source IDENTITY_VERIFIED
CURRENT_DEVELOPMENT snapshot differs from renderer
markers valid

→ MANAGED_BLOCK_STALE / DRIFT
→ CHECK_DRIFT
→ exit 1
```

### 47.4 Manifest vs production mismatch

```text
manifest commit A
production commit B

→ SOURCE_IDENTITY_DRIFT / BLOCKER
→ targets NOT_EVALUATED
→ CHECK_BLOCKED
→ exit 2
```

### 47.5 Legacy marker comes back

```text
canonical ownership expected
old SIMCORE_PRODUCTION_SNAPSHOT marker present

→ LEGACY_MARKER_RESURRECTED / BLOCKER
→ CHECK_BLOCKED
→ exit 2
```

### 47.6 Dual writer configured

```text
workflow invokes --manifest-only
workflow also invokes sync-state --write
legacy full path absent
→ clean
```

versus:

```text
workflow invokes --legacy-full
workflow invokes sync-state --write

→ DUAL_WRITER_CONFIGURED / BLOCKER
→ CHECK_BLOCKED
→ exit 2
```

---

## 48. Multiple findings example

Suppose:

```text
source identity verified
CURRENT_DEVELOPMENT snapshot stale
Guidelines baseline stale
human Production verdict stale
```

Result:

```text
2 x MANAGED_BLOCK_STALE / DRIFT
1 x HUMAN_CURRENT_PRODUCTION_CLAIM_STALE / OBSERVATION

CHECK_DRIFT
exit 1
```

All bounded findings remain in the report.

---

## 49. Source failure with independent ownership failure

Suppose:

```text
manifest vs production commit mismatch
and
legacy full writer is configured after cutover
```

The report may contain both because writer configuration can be inspected independently of trusted release identity.

Primary result remains:

```text
CHECK_BLOCKED
exit 2
```

Target freshness remains NOT_EVALUATED because expected production render authority is not trusted.

---

## 50. Repair boundaries

Finding classes map to owners, not automatic fixes.

```text
SOURCE_AUTHORITY blocker
→ release/state declaration owner

TARGET_STRUCTURE blocker
→ RS2 state-sync infrastructure migration/repair

TARGET_FRESHNESS drift
→ sync-state --write in authorized workflow

OWNERSHIP_POLICY blocker
→ release infrastructure/configuration change

HUMAN_CURRENT_CLAIM observation
→ human main-memory/document synchronization
```

The checker does not cross these ownership boundaries.

---

## 51. Classification vocabulary for repository evidence

When a real anomaly is discovered during implementation or operation, repository evidence still uses the project's anomaly classes:

```text
FIX
WATCH
DEFER
BLOCKER
```

The checker's internal severity is not a replacement for that ledger.

Suggested mapping:

```text
CHECK_BLOCKED safety/authority defect
→ usually BLOCKER or FIX depending on operational position

CHECK_DRIFT
→ FIX / deterministic synchronization drift

OBSERVATION
→ WATCH or FIX after human attribution
```

Do not automatically classify human prose stale as a correctness bug in the runtime.

---

## 52. Required fixture families

RS2-2D implementation must add deterministic tests for at least:

```text
D1  verified source + both targets clean
D2  verified source + one target stale
D3  verified source + both targets stale
D4  source version drift
D5  source same-version commit drift
D6  materialized blob mismatch
D7  latest/install divergence
D8  canonical marker missing
D9  canonical marker duplicate
D10 legacy marker resurrection
D11 mixed old/new marker authority
D12 dual writer configured
D13 legacy full writer active after cutover
D14 canonical owner missing
D15 clean machine state + stale Production verdict observation
D16 clean machine state + stale current-validation heading observation
D17 historical release sections ignored
D18 Guideline changelog version references ignored
D19 code-fenced version examples ignored
D20 source blocker prevents human comparison
D21 stale target + human observation precedence
D22 source blocker + independent writer blocker aggregation
D23 deterministic finding order
D24 bounded report contains no full prose/source body
D25 repeated clean check produces identical report bytes
```

---

## 53. Historical-reference negative fixtures

Historical exclusion must be demonstrated with explicit negative controls.

At minimum include a fixture containing many old versions under:

```text
historical release headings
validated precursor text
Guideline Changelog
code fences
quoted diagnostics
```

Expected:

```text
no HUMAN_CURRENT_* finding
```

Then place one stale version in the registered current Production verdict anchor.

Expected:

```text
exactly one HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
```

This proves positive scope rather than accidental regex behavior.

---

## 54. Current identity-drift fixture

Preserve the current observed mismatch only as bounded fixture provenance.

Conceptual synthetic fixture:

```text
manifest:
  version 0.64.3
  commit A

materialized production:
  version 0.64.6
  commit B

legacy/current human text:
  0.64.3
```

Expected:

```text
SOURCE_IDENTITY_DRIFT
VERSION_DRIFT
RELEASE_COMMIT_DRIFT
CHECK_BLOCKED
human probes NOT_EVALUATED
no writes
```

Do not hardcode 0.64.6 as a permanent current release expectation.

---

## 55. Same-version correction fixture

Because SimCore can receive a correction under the same public version, include:

```text
manifest version X commit A
production version X commit B
```

Expected:

```text
RELEASE_COMMIT_DRIFT
possibly RELEASE_BLOB_DRIFT
CHECK_BLOCKED
```

Version equality alone must never yield IDENTITY_VERIFIED.

---

## 56. Self-test safety gates

Beyond behavioral fixtures, implementation self-tests must prove:

```text
--check leaves all inputs byte-identical
no network access required
no GitHub token required
no git push/commit invoked
no manifest write
no target write
no human prose rewrite
no unregistered file discovery
report boundedness
report deterministic ordering
exit-code precedence
```

---

## 57. No permanent CI in RS2-2D

RS2-2D defines check semantics but does not install permanent CI.

RS2-3 owns:

```text
workflow file
PR path filters
required-check naming
release-state invocation points
scheduled/manual checks if any
failure presentation
```

Temporary implementation validation before RS2-3 must remain infrastructure-only and read-only toward production.

---

## 58. No release transaction in RS2-2D

RS2-4 still owns the eventual permanent release transaction.

RS2-2D does not:

```text
promote candidate
update release-simcore
write manifest release identity
rollback release branch
create release tag
```

It only verifies consistency of inputs it receives.

---

## 59. No runtime interaction

Drift checking is repository infrastructure.

It must not execute SimCore plugin bootstrap, host hooks, storage writes, timers, network behavior, or request/output runtime paths.

There is no reason for a state-sync checker to load the plugin runtime.

---

## 60. Interaction with active SimCore release work

Runtime minis may continue independently while RS2-2D design/implementation proceeds.

If production advances during RS2 work:

```text
resolve fresh production identity
preserve existing release path
record any state drift explicitly
continue RS2 on current main
```

Do not combine a runtime correctness fix with a state-check infrastructure implementation commit.

---

## 61. Interaction with repo-wide main writer

`repo-main-write.py` remains the shared repository integration authority for bounded payload commits.

RS2-2D may verify the configured use of that helper in registered SimCore workflow surfaces.

It must not import, call, or reimplement main replay/push logic inside `sync-state.mjs`.

The relationship is:

```text
sync-state check
→ local correctness evidence

repo-main-write
→ repository integration

post-integration check
→ resulting state evidence
```

---

## 62. Check report retention

Reports are bounded evidence and may be stored as CI artifacts or attached to implementation evidence when useful.

They should retain:

```text
schema version
source identity hashes/refs
result
finding codes
managed block hashes/lengths
writer-policy result
current-claim probe result
```

They should not retain:

```text
full plugin source
full target docs
raw long-chat diagnostics
private user prose
arbitrary historical document bodies
```

---

## 63. Failure message discipline

Human-readable console output should summarize the same bounded findings as JSON.

Good:

```text
CHECK_BLOCKED
SOURCE_IDENTITY_DRIFT: RELEASE_COMMIT_DRIFT
TARGETS: NOT_EVALUATED
WRITES: NONE
```

Bad:

```text
State is broken; automatically rewriting everything to latest release...
```

The checker should be boring and explicit.

---

## 64. Implementation sequence after authorization

Directional implementation order:

```text
D0  branch from then-current main
D1  freeze report/finding schemas
D2  implement target CLEAN/STALE evaluator
D3  implement canonical/legacy marker policy detectors
D4  implement registered writer-policy checker
D5  implement current-claim probe registry/parser
D6  implement historical/code-fence negative controls
D7  integrate source + target + ownership + observation precedence
D8  implement deterministic bounded report
D9  implement exit-code contract
D10 full fixture/self-test pack
D11 test ordinary relevant-PR local invocation shape
D12 test transitional release-state post-write check shape
D13 test latest-main replay/post-integration recheck shape
D14 freeze implementation evidence
D15 hand off to RS2-2E
```

No permanent CI is installed in this sequence.

---

## 65. Implementation evidence requirements

Future RS2-2D implementation evidence must record:

```text
base main commit
implementation commit
finding schema version
probe registry version
writer-policy registry/version
fixture totals/results
source drift fixture result
same-version correction fixture result
historical exclusion fixture result
marker resurrection result
writer conflict result
bounded report result
exit-code precedence result
read-only proof
network/GitHub capability absence
runtime diff NONE
release-simcore diff NONE
manifest mutation NONE
permanent CI change NONE
```

---

## 66. Operational blocker matrix

Initial matrix:

| Finding | Severity | Auto repair | Check exit |
|---|---|---|---:|
| Source identity mismatch | BLOCKER | No | 2 |
| Materialized blob mismatch | BLOCKER | No | 2 |
| Marker missing/duplicate/overlap | BLOCKER | No | 2 |
| Legacy marker resurrection | BLOCKER | No | 2 |
| Dual writer configured | BLOCKER | No | 2 |
| Legacy full writer active after cutover | BLOCKER | No | 2 |
| Registered managed body stale | DRIFT | Authorized `--write` may repair | 1 |
| Human current production claim stale | OBSERVATION | No | 0 alone |
| Human current validation section stale | OBSERVATION | No | 0 alone |
| Historical version reference | No finding | N/A | N/A |

This matrix is normative for the initial implementation.

---

## 67. What RS2-2D deliberately does not detect

Initial implementation does not attempt to mechanically prove:

```text
whether live evidence justifies LIVE_PASS
whether a WATCH should become FIX
whether M2-3 should begin
whether a human next-action paragraph is strategically correct
whether a historical incident narrative is still useful
whether provider cache actually hit
whether a release title is semantically good
whether a runtime bug is fixed
```

These are outside state synchronization authority.

---

## 68. RS2-2D design close gate

RS2-2D design is complete when:

```text
five check layers defined                               PASS
BLOCKER / DRIFT / OBSERVATION model defined             PASS
top-level check results defined                         PASS
0/1/2 exit contract preserved                           PASS
result precedence defined                               PASS
source identity blockers defined                        PASS
no semantic-version winner rule defined                 PASS
machine CLEAN/STALE/INVALID/NOT_EVALUATED defined       PASS
exact-byte staleness defined                            PASS
bounded stale reporting defined                         PASS
canonical marker enforcement defined                    PASS
legacy marker resurrection defined                      PASS
mixed marker authority blocker defined                  PASS
writer-policy consistency defined                       PASS
dual-writer blocker defined                             PASS
positive-scope human probe rule defined                 PASS
initial current-claim probes defined                    PASS
historical/version-reference false-positive rules       PASS
code-fence/quote exclusion defined                      PASS
source-before-human comparison defined                  PASS
contradiction classes defined                           PASS
bounded report extension defined                        PASS
deterministic report ordering defined                   PASS
ordinary-PR semantic boundary defined                   PASS
release-state post-write check defined                  PASS
post-main replay check defined                          PASS
human observations nonblocking by default defined       PASS
current identity-drift fixture defined                  PASS
same-version correction fixture defined                 PASS
required fixture families defined                       PASS
repair ownership mapping defined                        PASS
RS2-3 trigger authority deferred                        PASS
runtime diff                                             NONE
release-simcore diff                                     NONE
manifest change                                          NONE
permanent CI change                                      NONE
legacy retirement                                        NONE
```

No implementation is required to close the **design** subphase.

---

## 69. Handoff to RS2-2E

RS2-2E is the final RS2-2 design subphase.

It must freeze:

```text
what implementation evidence is required to declare RS2-2 operational
what status means STATE_SYNC_AVAILABLE
whether outstanding human observations prevent phase close
what fallback remains active
when legacy full document sync becomes rollback-only or retirement-eligible
what exact authority moves from legacy sync to sync-state
what remains transitional until RS2-4
how current identity drift must be resolved before cutover
what minimum post-cutover clean checks are required
what status/evidence is handed to RS2-3 Permanent CI
what conditions trigger rollback of the document-ownership cutover
```

The expected shape is similar to RS2-1E:

```text
phase completion
!=
full release-system replacement
```

RS2-2 may become operational while manifest declaration still uses a transitional owner, provided ownership is single-writer, identity is verified, and fallback is explicit.

---

## 70. Frozen final rule

> A contradiction checker earns authority by refusing to guess what a document means.

For RS2-2:

```text
verify production identity exactly
compare machine-owned bytes exactly
verify writer ownership explicitly
inspect human prose only through registered current claims
ignore historical material by default
report before repair
never rewrite human reasoning
```

The goal is not to make every old version number disappear.

The goal is to make every **current authoritative fact** mechanically consistent without destroying the repository's history.
