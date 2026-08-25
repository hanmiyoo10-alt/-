# SimCore Authority Drift Check / Scan Design

Status: `DESIGN FROZEN · PARKED FOR STABILIZATION · S-10 COMPLETE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-10`
Legacy starter-menu alias: `S3`
Importance: `5 / VERY HIGH`
Design difficulty: `2 / EASY`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2A_STATE_AUTHORITY_MACHINE_BLOCK_CONTRACT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_2B_SYNC_STATE_TOOL_CONTRACT.md`
- `products/simcore/tooling/sync-state.mjs`
- `products/simcore/state-sync/current-claim-probes.json`
- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_EVIDENCE.md`

---

## 1. Problem

SimCore deliberately stores different kinds of authority in different places:

```text
release-simcore
= actual production plugin code / deployment authority

product-manifest.json
= declared release identity

CURRENT_DEVELOPMENT.md
= current operational continuity / immediate next action

R2.1 operator policy + evidence
= delegated release-operation policy status

historical evidence docs
= point-in-time proof, not current authority
```

This separation is correct, but it creates a recurring failure class: one current-authority surface can remain stale after another has legitimately advanced.

The repository has already experienced this class of drift, and the recent doc-only sweep also found stale current-looking prose that needed manual repair.

S-10 defines a **small, read-only current-authority drift audit** that reports contradictions without changing any source.

---

## 2. Critical discovery: do not duplicate RS2 sync-state

S-10 is not a second synchronization system.

The current repository already contains an implemented `products/simcore/tooling/sync-state.mjs` that can verify:

```text
release-simcore materialized identity
↔ product-manifest release identity

latest.js == install.js

version / release-name / release-blob consistency

registered machine-managed block freshness

selected CURRENT_DEVELOPMENT current-production claims

writer-policy safety
```

Therefore the frozen S-10 architecture is:

```text
EXISTING sync-state --check
= production-identity / managed-block verification authority

S-10 Authority Drift Check
= thin current-authority audit profile
= consumes/reuses sync-state results
+ adds only current-operational claims not owned by sync-state
```

Forbidden:

```text
reimplement release blob verification
reimplement latest/install equality
reimplement machine-block rendering
reimplement release-simcore identity resolution
create another state-sync registry
create another document writer
```

This distinction is constitutional for S-10.

---

## 3. User / operator value

The check should answer one question quickly:

```text
Do the repository surfaces that present themselves as CURRENT SimCore authority still agree?
```

Expected value:
- catch stale current-production prose before it misleads the next work session;
- catch a stale current live-gate token after sequencing changes;
- catch R2.1 status wording that regresses from ACTIVE back to PLANNED, or incorrectly claims genuine-release proof;
- preserve historical documents without false positives;
- make repo-memory maintenance cheaper without silently rewriting anything.

---

## 4. Non-goals

S-10 does not authorize:

```text
automatic document repair
automatic manifest repair
automatic release-state convergence
release-simcore publication
GitHub branch writes
issue / PR closure
historical-document rewriting
semantic inference from arbitrary prose
whole-repository grep-as-authority
runtime diagnostics
plugin changes
CI rollout during the current idea phase
```

A finding is a report, not permission to mutate a source.

---

## 5. Frozen v1 scan scope

S-10 v1 checks exactly four current-authority families.

```text
A. PRODUCTION_IDENTITY
B. CURRENT_OPERATIONAL_GATE
C. CURRENT_PRODUCTION_CLAIMS
D. R2_1_OPERATOR_STATUS
```

Do not expand v1 into architecture contracts, deferred ledgers, all WATCH documents, all PRs, or all release evidence.

Those have separate authorities and/or separate future ideas.

---

## 6. A — Production Identity

Source relationship:

```text
release-simcore production bytes
↔ product-manifest.json declared identity
↔ registered machine-managed production snapshot
```

S-10 does not implement this comparison.

It consumes the existing `sync-state --check` result and preserves its findings, including as applicable:

```text
RELEASE_BRANCH_DRIFT
RELEASE_COMMIT_DRIFT
RELEASE_BLOB_DRIFT
LATEST_INSTALL_DIVERGED
VERSION_DRIFT
RELEASE_NAME_DRIFT
MANAGED_BLOCK_STALE
source / marker / writer-policy blockers
```

Canonical rule:

```text
sync-state says identity blocked/drifted
→ S-10 may summarize that result
→ S-10 may not reinterpret it into clean
```

Production identity authority remains unchanged.

---

## 7. B — Current Operational Gate

Authority split:

```text
CURRENT_DEVELOPMENT human-authored current operational section
= authority for immediate next action / current live gate

product-manifest.current_priority
= declared machine-readable continuity claim
= must agree with the current operational authority
```

Frozen comparison:

```text
CURRENT_DEVELOPMENT current operational gate token
== product-manifest.current_priority
```

Example current contract at design time:

```text
CURRENT_DEVELOPMENT current gate
= 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT

product-manifest.current_priority
= 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

Mismatch finding:

```text
CURRENT_PRIORITY_DRIFT
```

Important:
- S-10 does not decide the next action by release version arithmetic;
- S-10 does not assume the manifest wins;
- under RS2-2A, the human-authored current operational section owns the immediate next action;
- the check reports the contradiction and leaves repair to the normal documentation/release workflow.

If the current operational section cannot yield exactly one defensible active gate token:

```text
CURRENT_PRIORITY_UNRESOLVED
→ scan BLOCKED for this family
→ no guessing
```

---

## 8. C — Current Production Claims

This family is intentionally delegated to existing sync-state human-current-claim probes where possible.

Current examples already supported by repository tooling include:

```text
CURRENT_DEVELOPMENT production verdict version
CURRENT_DEVELOPMENT current validation release heading
```

S-10 may surface existing observations such as:

```text
HUMAN_CURRENT_PRODUCTION_CLAIM_STALE
HUMAN_CURRENT_RELEASE_SECTION_STALE
```

but must not broaden the parser into a repository-wide search.

Canonical rule:

```text
parse only registered CURRENT claim surfaces
ignore explicitly historical sections
```

If a future current-authority claim needs protection, it must be added as a bounded registered current claim, not as a generic regex over all Markdown files.

---

## 9. D — R2.1 Operator Status

Canonical authority:

```text
SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md
+ activation evidence
```

Current semantic state at design time:

```text
policy = ACTIVE
implementation = QUALIFIED / CLOSED
steady-state genuine release proof = PENDING
background autonomous authority = NO
```

`CURRENT_DEVELOPMENT` may summarize this state, but must not contradict it.

S-10 v1 compares semantic flags rather than requiring byte-identical prose.

Frozen flags:

```text
OPERATOR_POLICY_ACTIVE = true
GENUINE_RELEASE_PROOF = PENDING | PROVEN
BACKGROUND_RELEASE_AUTHORITY = false
```

Current expected tuple:

```text
ACTIVE
PENDING
false
```

Contradiction examples:

```text
CURRENT_DEVELOPMENT says R2.1 PLANNED / NOT ACTIVE
while operator policy is ACTIVE
→ R2_1_POLICY_STATUS_DRIFT

CURRENT_DEVELOPMENT says R2.1 fully proven
while activation evidence says AWAITING GENUINE RELEASE PROOF
→ R2_1_PROOF_STATUS_DRIFT

any current-authority surface claims standing/background autonomous release authority
→ R2_1_AUTHORITY_SCOPE_DRIFT
```

S-10 does not infer R2.1 state from the older qualification JSON alone. Qualification state and active operator-policy state are related but not identical authorities.

---

## 10. Historical exclusion rule

This is the most important false-positive guard.

Historical documents and explicitly historical sections are allowed to contain old statements such as:

```text
Production: v0.64.2
Status: PENDING
next action: validate old release
```

without being drift.

S-10 must never treat age or old version text alone as a finding.

Frozen inclusion rule:

```text
SCAN ONLY
1. explicit current-authority files/fields
2. registered machine-managed blocks
3. registered current-claim probes
4. dedicated active-policy status sources
```

Frozen exclusion rule:

```text
DO NOT SCAN AS CURRENT AUTHORITY
historical release ledgers
point-in-time live evidence
old incident docs
superseded plan bodies clearly marked historical
archived validation sections
version-specific regression evidence
```

A current-authority file may contain historical subsections. Parsing must be section/marker scoped, not whole-file version grep.

---

## 11. Finding vocabulary

S-10 itself adds only a small current-authority vocabulary.

Native S-10 finding IDs:

```text
CURRENT_PRIORITY_DRIFT
CURRENT_PRIORITY_UNRESOLVED
R2_1_POLICY_STATUS_DRIFT
R2_1_PROOF_STATUS_DRIFT
R2_1_AUTHORITY_SCOPE_DRIFT
CURRENT_AUTHORITY_SOURCE_UNAVAILABLE
CURRENT_AUTHORITY_PARSE_AMBIGUOUS
```

Existing sync-state findings are passed through under their existing IDs and meanings.

Do not rename existing release-state findings into new S-10 aliases.

---

## 12. Overall result vocabulary

Exactly three top-level S-10 outcomes:

```text
AUTHORITY_CLEAN
AUTHORITY_DRIFT
AUTHORITY_BLOCKED
```

### `AUTHORITY_CLEAN`

All required v1 current-authority families were resolved and no contradiction was found.

### `AUTHORITY_DRIFT`

Required sources were readable/comparable and at least one contradiction exists.

This is a repository-maintenance result, not automatically a runtime correctness failure.

### `AUTHORITY_BLOCKED`

A required current-authority source could not be read, parsed, or compared without guessing, or the underlying sync-state source verification is blocked.

Fail closed:

```text
unknown
!= clean
```

---

## 13. Output contract

Future S-10 implementation should emit one bounded report.

Conceptual machine shape:

```json
{
  "schemaVersion": 1,
  "result": "AUTHORITY_CLEAN | AUTHORITY_DRIFT | AUTHORITY_BLOCKED",
  "families": {
    "productionIdentity": "CLEAN | DRIFT | BLOCKED",
    "currentOperationalGate": "CLEAN | DRIFT | BLOCKED",
    "currentProductionClaims": "CLEAN | DRIFT | BLOCKED",
    "r2_1OperatorStatus": "CLEAN | DRIFT | BLOCKED"
  },
  "findings": [
    {
      "code": "CURRENT_PRIORITY_DRIFT",
      "sourceA": "docs/CURRENT_DEVELOPMENT.md",
      "sourceB": "product-manifest.json"
    }
  ]
}
```

Rules:
- bounded identifiers/paths only;
- no copied document bodies;
- no raw plugin bytes;
- no unbounded diffs;
- no automatic patch payload.

Human output may be a compact table over the same result.

---

## 14. Future physical implementation boundary

Preferred future class:

```text
NON_RUNTIME / REPO_SAFETY / READ_ONLY
```

Preferred shape:

```text
small authority-drift audit executable/profile
→ consume existing sync-state --check report
→ read only the additional bounded current-authority sources
→ emit report
```

The design does not require `sync-state.mjs` to be refactored into a library merely for S-10.

Acceptable future integration options:
- invoke the existing local `sync-state --check` command and consume its bounded JSON report;
- consume a sync-state report already produced by outer tooling/CI.

Forbidden:
- copy/paste sync-state identity algorithms into S-10;
- add network/GitHub API behavior to the inner audit tool;
- write to main;
- rewrite documentation;
- invoke release publication.

---

## 15. Failure behavior

S-10 must be fail-closed for reporting and fail-safe for repository state.

```text
missing required current source
→ AUTHORITY_BLOCKED
→ no write

ambiguous parser result
→ AUTHORITY_BLOCKED
→ no nearest-looking guess

sync-state source verification blocked
→ AUTHORITY_BLOCKED
→ do not continue as if production identity were clean

drift detected
→ AUTHORITY_DRIFT
→ report only
```

No S-10 failure may mutate production or documentation.

---

## 16. Update / re-scan triggers

A later implementation is useful after:

```text
release publication / release-state convergence
live-gate closure or gate replacement
CURRENT_DEVELOPMENT current-action change
R2.1 genuine-release proof changes PENDING → PROVEN
current-authority doc maintenance
manual doc-only drift cleanup
```

No background polling is authorized.

Run on demand or as bounded CI/static verification if later promoted.

---

## 17. Verification obligations for future implementation

Minimum fixtures/static tests:

```text
1. all four v1 families agree
   → AUTHORITY_CLEAN

2. manifest release identity differs from verified production
   → underlying sync-state finding preserved
   → AUTHORITY_DRIFT or BLOCKED according to sync-state result

3. latest/install differ
   → preserve LATEST_INSTALL_DIVERGED
   → AUTHORITY_BLOCKED

4. machine-managed block stale
   → preserve MANAGED_BLOCK_STALE
   → AUTHORITY_DRIFT

5. CURRENT_DEVELOPMENT gate != manifest.current_priority
   → CURRENT_PRIORITY_DRIFT

6. current gate cannot be resolved uniquely
   → CURRENT_PRIORITY_UNRESOLVED
   → AUTHORITY_BLOCKED

7. R2.1 active policy but CURRENT_DEVELOPMENT says planned/inactive
   → R2_1_POLICY_STATUS_DRIFT

8. R2.1 proof pending but CURRENT_DEVELOPMENT says fully proven
   → R2_1_PROOF_STATUS_DRIFT

9. background release authority incorrectly claimed
   → R2_1_AUTHORITY_SCOPE_DRIFT

10. historical v0.64.2/v0.64.3 production wording exists only in historical sections
    → no finding

11. old live evidence contains old gate/status
    → no finding

12. required current source missing
    → AUTHORITY_BLOCKED

13. arbitrary repo-wide old-version strings
    → not scanned / no finding

14. report contains paths/IDs only
    → no document body leakage

15. no filesystem writes
16. no network/GitHub calls in inner checker
17. no release-simcore mutation
18. no latest/install mutation
```

Reuse existing release-system tests where they already prove sync-state semantics. S-10 tests should cover only the thin additional audit behavior and integration contract.

---

## 18. Live-validation obligation

None solely for S-10.

Future implementation is repository-only and read-only:

```text
validation
= static / fixture / CI / controlled repository specimens
```

S-10 may report the status of live gates, but it cannot prove a live gate itself.

No plugin release and no real long-chat validation are required solely because S-10 is implemented later.

---

## 19. Interaction with normal anomaly policy

If S-10 finds drift during a future work item:

```text
preserve finding in repo evidence
→ classify through normal WATCH / DEFER / FIX / BLOCKER discipline
→ repair in a separate bounded docs/infra work item
```

S-10's own `AUTHORITY_DRIFT` result is not a replacement for project severity classification.

Example:

```text
stale current prose
→ likely FIX / DOC_DRIFT / NON_RUNTIME

release identity mismatch
→ stronger release-infrastructure handling may apply
```

The actual authority-specific workflow decides severity.

---

## 20. Anti-scope rules

Do not let S-10 become:

```text
AuthorityManager
repo-wide Markdown linter
second sync-state
release reconciler
history migrator
PR hygiene system
Evidence Index Generator
WATCH ledger parser
background monitor
self-healing documentation bot
```

If future needs exceed the four frozen v1 families, extend by a separate design revision or a distinct idea rather than silently widening S-10.

---

## 21. Open design questions

```text
NONE
```

The v1 authority families, precedence, historical exclusion, result vocabulary, failure behavior, and future implementation boundary are fully specified.

---

## 22. Final frozen contract

```text
S-10 AUTHORITY DRIFT CHECK / SCAN

PURPOSE
= detect contradictions among CURRENT SimCore repository authorities

V1 FAMILIES
= PRODUCTION_IDENTITY
+ CURRENT_OPERATIONAL_GATE
+ CURRENT_PRODUCTION_CLAIMS
+ R2_1_OPERATOR_STATUS

PRODUCTION IDENTITY
= reuse existing sync-state --check
= do not duplicate its algorithms

CURRENT GATE AUTHORITY
= CURRENT_DEVELOPMENT human current-operation section
= product-manifest.current_priority must agree

R2.1 AUTHORITY
= operator policy + activation evidence
= CURRENT_DEVELOPMENT summary must not contradict

HISTORICAL DOCS
= excluded unless explicitly registered as current authority

RESULT
= AUTHORITY_CLEAN / AUTHORITY_DRIFT / AUTHORITY_BLOCKED

AUTO REPAIR
= FORBIDDEN

WRITES
= NONE

NETWORK / GITHUB IN INNER TOOL
= NONE

RUNTIME CHANGE
= NONE

DESIGN STATUS
= FROZEN

PARKING STATUS
= PARKED FOR STABILIZATION
```
