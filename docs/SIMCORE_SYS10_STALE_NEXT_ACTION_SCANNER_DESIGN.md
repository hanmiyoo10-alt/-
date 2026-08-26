# SYS-10 — Stale Next-Action Scanner — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · READ-ONLY TOOL · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-10
Idea          = Stale Next-Action Scanner
Size          = SMALL
Importance    = 5 / VERY HIGH
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_EXECUTABLE
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_SURFACES_DESIGN_2026-08-26.md`
- `docs/SIMCORE_REALTIME_CLOSE_STEP_OPERATING_ROUTINE.md`
- `docs/SIMCORE_SYS01_LIVING_AUTHORITY_MAP_DESIGN.md`
- `docs/SIMCORE_SYS51_CLOSE_STEP_TRIGGER_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`

Existing systems that SYS-10 must compose with rather than replace:
- S-10 Authority Drift Check / `products/simcore/tooling/authority-drift-check.mjs`
- `products/simcore/tooling/sync-state.mjs`
- current queue/selection authorities
- SYS-01 Living Authority Map

---

## 1. Problem

SimCore deliberately keeps current work state in several living authorities and mirrors. The real-time close-step routine already requires current NEXT/queue recomputation, but a recurring repository-memory failure remains easy to miss:

```text
work A completes / freezes / is superseded
→ canonical current state advances to work B
→ one living document still advertises work A as NEXT
→ a later session follows the stale instruction
```

This failure has occurred in practice with completed design/NR/fixture items remaining in `NEXT`, `next action`, or implementation-ready wording after the authoritative queue had advanced.

The important distinction is:

```text
stale NEXT detection
!= deciding what NEXT should be
```

SYS-10 defines a small read-only scanner for registered current-action surfaces. It reports contradictions or impossible advertised targets without becoming a new priority engine or auto-repair system.

---

## 2. Core invariant

```text
registered CURRENT/NEXT surfaces
+ registered canonical status/selection source
→ stale-current-action findings

SYS-10
!= priority calculator
!= gate opener
!= work scheduler
!= document writer
```

The scanner may establish:

```text
"this advertised NEXT is stale"
```

but must not invent:

```text
"therefore the correct NEXT is X"
```

unless X is already explicitly declared by the registered canonical source for the same scope.

If the canonical source itself is stale or impossible, the scanner reports that condition and leaves RT-02 / RT-11 / RT-12 to recompute the legitimate next operation.

---

## 3. Distinction from related systems

### 3.1 S-10 Authority Drift Check

```text
S-10
= selected CURRENT authority families agree?
= production identity / current priority / current production claims / R2.1 operator status

SYS-10
= registered NEXT/action claims still point to a legitimate non-terminal, non-gated target?
= current mirrors agree with the canonical NEXT claim for their scope?
```

SYS-10 must not reimplement release identity, `latest == install`, managed-block freshness, or R2.1 semantic checks.

If a NEXT scope depends on current production identity, the existing S-10/sync-state result remains authoritative for that identity.

### 3.2 SYS-01 Living Authority Map

```text
SYS-01
= where the CURRENT_IDEA_SELECTION / CURRENT_OPERATIONAL_PRIORITY authority lives

SYS-10
= use a reviewed bounded registration of those relationships to test stale NEXT claims
```

SYS-10 v1 does not infer authority by filename age, commit date, or newest-looking document.

A future materialized SYS-01 map may become reviewed input metadata only through a separate implementation decision; SYS-10 does not require SYS-01 application to exist before design freeze.

### 3.3 SYS-51 Close-Step Trigger Matrix

```text
SYS-51
= when stale-next review is relevant as part of close discipline

SYS-10
= the bounded read-only scanner that can perform that review
```

The scanner does not select other RT surfaces.

### 3.4 SYS-08 Work-Item Close Receipt

SYS-08 receipts are point-in-time closure records.

```text
receipt says NEXT = B at time T
later NEXT becomes C
→ receipt remains valid historical closure evidence
→ SYS-10 MUST NOT flag that historical receipt
```

Only explicitly registered living/current surfaces are scanned.

### 3.5 SYS-48 Gate-Blocked Reason Surface

SYS-10 may report that a target is currently gated, but it does not own the human explanation of why or what unlock event is required. That richer blocked-reason surface belongs to SYS-48.

---

## 4. v1 physical implementation shape

Preferred later implementation:

```text
products/simcore/tooling/stale-next-action.mjs
products/simcore/tooling/next-action-registry-v1.json
```

Optional focused test:

```text
products/simcore/tooling/test-stale-next-action.mjs
```

No runtime/plugin source is involved.

No permanent CI wiring is part of SYS-10 v1. Adding permanent discovery/required-CI authority later would be a separate protected change.

The registry contains parse/relationship metadata only. It does not store the authoritative current NEXT value.

---

## 5. Registered scope model

The scanner operates on named **NEXT scopes** rather than pretending the entire repository has one universal NEXT.

Examples:

```text
GLOBAL_OPERATIONAL
SYSTEM_IDEA_SWEEP
ORIGINAL_IDEA_QUEUE
FIXTURE_PORTFOLIO
RELEASE_SYSTEM
ARCHITECTURE_CHECKPOINT
```

A scope is registered only when it has a legitimate living current-action surface.

Each scope registration contains:

```text
scopeId
canonicalClaimSource
canonicalStatusSource (optional if same source)
mirrorClaimSources[]
targetVocabulary / targetId pattern
emptyStateVocabulary[]
selector definitions
historical exclusions
```

Rules:
- exactly one canonical NEXT claim source per scope, or an explicitly declared bounded composite;
- zero or more mirrors;
- a scope may legitimately have no current NEXT (`NONE`, `EMPTY`, `CLOSED`, `WAIT_FOR_GATE`, or a registered equivalent);
- domain-scoped NEXT values do not have to equal another domain's NEXT.

This prevents false findings such as comparing a fixture portfolio NEXT against the global live-gate NEXT.

---

## 6. Selector discipline

SYS-10 must never perform repository-wide Markdown grep for words like `NEXT`, `todo`, or `pending`.

Allowed selector classes:

```text
JSON_FIELD
MARKDOWN_MARKER_BLOCK
MARKDOWN_HEADING_BLOCK
REGISTERED_EXACT_LINE_PATTERN
```

Selection must be bounded to a registered living/current section.

Historical subsections inside a living document remain excluded unless explicitly registered as current.

Forbidden discovery heuristics:

```text
newest modified file wins
highest version string wins
first NEXT found in grep wins
last NEXT found in file wins
commit recency implies authority
filename contains CURRENT therefore authoritative
```

Unknown/ambiguous parse must fail closed.

---

## 7. Target state model

For a registered scope, an advertised target may be checked against a bounded status source when such a status source exists.

Normalized target-state categories:

```text
OPEN
TERMINAL
GATED
UNKNOWN
```

### OPEN

Examples:

```text
NOW
READY
ACTIVE
SELECTED
PENDING legitimate execution/validation
```

The exact source vocabulary remains source-owned; SYS-10 only maps registered tokens.

### TERMINAL

Examples:

```text
FROZEN when the scope is "next design"
IMPLEMENTED
COMPLETE
CLOSED
DOC_APPLIED
SUPERSEDED
RETIRED
```

Terminal is scope-sensitive. For example, `FROZEN` is terminal for a design-next scope but may be a prerequisite state for an apply-next scope.

### GATED

Examples:

```text
POST_M2_3
POST_M2_4
EVIDENCE unsatisfied
EXTERNAL unsatisfied
DEPENDENCY unsatisfied
FUTURE
```

A gated target advertised as the immediate NEXT is stale unless the canonical source explicitly represents a wait-for-that-gate state rather than claiming the gated work is executable now.

### UNKNOWN

Unregistered or ambiguous state. Unknown is not clean.

---

## 8. Frozen finding vocabulary

SYS-10 v1 adds exactly these native findings.

```text
NEXT_MIRROR_DRIFT
CANONICAL_NEXT_TERMINAL
CANONICAL_NEXT_GATED
MIRROR_NEXT_TERMINAL
MIRROR_NEXT_GATED
CANONICAL_NEXT_UNRESOLVED
NEXT_TARGET_STATUS_UNRESOLVED
NEXT_SCOPE_AUTHORITY_CONFLICT
NEXT_SCOPE_SOURCE_UNAVAILABLE
NEXT_EMPTY_STATE_DRIFT
```

### `NEXT_MIRROR_DRIFT`

Canonical source says target B, registered mirror says target A.

The scanner may report both values because both were directly read from registered current surfaces. It does not decide B independently.

### `CANONICAL_NEXT_TERMINAL`

The canonical NEXT source itself advertises a target that the registered status source already marks terminal for this scope.

Required handling:

```text
report stale canonical claim
→ do NOT promote a replacement
→ RT-02 / RT-12 recomputation required
```

### `CANONICAL_NEXT_GATED`

Canonical NEXT advertises work whose registered gate is not open for this scope.

### `MIRROR_NEXT_TERMINAL` / `MIRROR_NEXT_GATED`

A mirror advertises an impossible target even if canonical parsing is otherwise clean.

### `CANONICAL_NEXT_UNRESOLVED`

Canonical selector yields zero or multiple incompatible current claims.

### `NEXT_TARGET_STATUS_UNRESOLVED`

Target was parsed but its required registered status cannot be established without guessing.

### `NEXT_SCOPE_AUTHORITY_CONFLICT`

Two sources are both registered as canonical for one scope without an explicit composite contract, or the reviewed registry contradicts the declared authority relationship.

### `NEXT_SCOPE_SOURCE_UNAVAILABLE`

A required registered current source cannot be read.

### `NEXT_EMPTY_STATE_DRIFT`

Canonical scope is legitimately empty/closed/waiting while a mirror still advertises concrete immediate work, or vice versa when the mirror is required to reflect a concrete current NEXT.

---

## 9. Overall result vocabulary

Exactly three top-level outcomes:

```text
NEXT_ACTION_CLEAN
NEXT_ACTION_STALE
NEXT_ACTION_BLOCKED
```

### NEXT_ACTION_CLEAN

All registered scopes requested for the scan resolved, advertised targets were legitimate for their scope, and mirrors agreed where agreement is required.

### NEXT_ACTION_STALE

Sources were resolvable and at least one stale contradiction/impossible target was directly established.

This is normally repository-memory drift, not automatically a runtime defect.

### NEXT_ACTION_BLOCKED

A required authority/selector/status source was unavailable or ambiguous, or authority conflict prevented a trustworthy comparison.

Fail closed:

```text
unknown != clean
```

---

## 10. Output contract

Conceptual machine output:

```json
{
  "schemaVersion": 1,
  "result": "NEXT_ACTION_CLEAN | NEXT_ACTION_STALE | NEXT_ACTION_BLOCKED",
  "scopes": [
    {
      "scopeId": "SYSTEM_IDEA_SWEEP",
      "result": "CLEAN | STALE | BLOCKED",
      "canonicalTarget": "SYS-10",
      "canonicalState": "OPEN",
      "mirrorTargets": ["SYS-10"]
    }
  ],
  "findings": [
    {
      "code": "NEXT_MIRROR_DRIFT",
      "scopeId": "SYSTEM_IDEA_SWEEP",
      "source": "docs/...",
      "observedTarget": "SYS-08",
      "canonicalTarget": "SYS-10"
    }
  ]
}
```

Output limits:
- paths, scope IDs, target IDs, normalized states, and finding codes only;
- no copied document bodies;
- no arbitrary prose diff;
- no proposed patch;
- no automatic replacement target when canonical itself is stale/blocked.

Human output may be a compact table over the same bounded report.

---

## 11. Current design-time specialization

At freeze time the active system-design sweep has one useful concrete scope:

```text
SYSTEM_IDEA_SWEEP
```

Current living surfaces agree that:

```text
frozen = SYS-19 / SYS-01 / SYS-51 / SYS-08
next   = SYS-10
```

A future implementation must be able to detect at least this recurrence class:

```text
SYS-10 freezes
→ canonical selection advances
→ one registered current mirror still says NEXT = SYS-10
→ NEXT_MIRROR_DRIFT or MIRROR_NEXT_TERMINAL
```

The design-time example is evidence that the contract is useful; it is not a hard-coded SYS-10-specific rule.

---

## 12. Repair / close-step behavior

SYS-10 is report-only.

When a stale finding occurs during normal SimCore work:

```text
scanner report
→ classify bounded doc drift through normal project discipline
→ repair owning living source(s)
→ rerun/review affected scope
→ RT-01 living-document consistency
→ RT-02 gate/queue recomputation if needed
→ RT-12 canonical next-operation recomputation
```

If the canonical source itself is terminal/gated/ambiguous:

```text
DO NOT copy a mirror value into canonical
DO NOT choose the highest-scored candidate automatically
DO NOT infer a gate opened
→ recompute through the actual selection/gate authority
```

The scanner cannot authorize the repair target.

---

## 13. Hard boundaries

SYS-10 must never become:

```text
priority engine
roadmap scheduler
gate dependency engine
work auto-selector
second S-10 authority drift checker
second sync-state
repo-wide Markdown linter
historical-document scanner
work receipt freshness checker
automatic document writer
GitHub/repository writer
PR/branch closer
CI dispatcher
release publisher
background polling daemon
runtime/plugin feature
```

It also must not treat old `NEXT` language inside frozen design, evidence, audit, retrospective, or SYS-08 receipt documents as drift merely because time passed.

---

## 14. Verification obligations for later implementation

Minimum focused fixtures/tests:

```text
1. canonical + mirrors agree on open target
   → NEXT_ACTION_CLEAN

2. canonical target B, mirror target A
   → NEXT_MIRROR_DRIFT
   → NEXT_ACTION_STALE

3. canonical target already TERMINAL for design scope
   → CANONICAL_NEXT_TERMINAL
   → no replacement suggestion

4. mirror target already TERMINAL
   → MIRROR_NEXT_TERMINAL

5. canonical target is gated POST_M2_3
   → CANONICAL_NEXT_GATED

6. canonical explicit EMPTY/CLOSED, mirror concrete target
   → NEXT_EMPTY_STATE_DRIFT

7. canonical concrete target, required mirror incorrectly EMPTY
   → NEXT_EMPTY_STATE_DRIFT

8. canonical selector yields two incompatible NEXT values
   → CANONICAL_NEXT_UNRESOLVED
   → NEXT_ACTION_BLOCKED

9. target status source missing/ambiguous
   → NEXT_TARGET_STATUS_UNRESOLVED
   → NEXT_ACTION_BLOCKED

10. required living source missing
    → NEXT_SCOPE_SOURCE_UNAVAILABLE

11. two undeclared canonical sources registered for one scope
    → NEXT_SCOPE_AUTHORITY_CONFLICT

12. historical frozen design contains old NEXT text
    → excluded / no finding

13. SYS-08 point-in-time receipt contains old NEXT
    → excluded / no finding

14. living CURRENT_DEVELOPMENT contains historical old-release NEXT subsection
    → section exclusion prevents false positive

15. two different scopes legitimately have different NEXT values
    → no cross-scope drift

16. no filesystem writes
17. no GitHub/network calls from inner scanner
18. no plugin/release file mutation
19. bounded JSON output contains no document bodies
```

No real long-chat validation is required solely for SYS-10.

---

## 15. Future integration boundary

Initial implementation should be local/on-demand.

Potential later integrations require separate review:

```text
call from close-step helper
consume materialized SYS-01 map metadata
write a SYS-08 receipt result line
run in permanent CI
apply automatic document patches
```

Of these, permanent CI discovery and automatic repository mutation are protected system changes and are not authorized by SYS-10 v1.

---

## 16. Unified classification freeze verdict

Source/design inspection changes the provisional apply classification from `NR_UNASSESSED` to:

```text
SIZE          = SMALL
IMPORTANCE    = 5
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_EXECUTABLE
```

Why `NR_EXECUTABLE`:
- the recurring failure has a stable read-only comparison contract;
- the useful value is deterministic scanning rather than another hand-maintained document;
- implementation can remain repository-local and read-only;
- no runtime/plugin semantics are touched;
- no CI/release/repository writer authority change is required for the local tool.

It is not `NR_PROTECTED` because v1 does not change permanent CI, release machinery, branch authority, or repository mutation permissions.

---

## 17. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION = NOT STARTED
```

Per Design Sweep First, stop here. Tool implementation is a separate bounded NON_RUNTIME transaction after the current system-design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
