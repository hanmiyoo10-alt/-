# SYS-17 — Missing Evidence Slot Analyzer — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_EXECUTABLE · CURATED-SLOT ANALYZER · READ-ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-17
Idea          = Missing Evidence Slot Analyzer
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
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
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- `products/simcore/evidence/evidence-index-source-v1.json`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`

Existing authorities SYS-17 must not replace:
- actual evidence/specimen/test/CI/release/live records;
- M-13 Evidence Index and its curated source;
- SYS-13 proof-kind × claim-kind policy;
- live-gate / release-gate / architecture-gate authorities;
- anomaly/deferred classification authorities;
- current priority selection.

---

## 1. Problem

SimCore intentionally distinguishes many evidence states:

```text
PROVEN
NOT_PROVEN
NOT_CLAIMED
CONFLICTED
BLOCKED
NOT_APPLICABLE
```

SYS-13 now defines which proof kinds may establish which claim kinds, but a separate practical question remains:

```text
For the bounded scope we are trying to close,
which explicitly required evidence claims are already proven,
and which required evidence slots are still empty, not claimed, conflicted, or blocked?
```

Today those gaps are visible across several authorities, for example:

```text
v0.64.7 reload-cache-continuity natural live control
→ required for the active live gate
→ still missing

M-11 / M-10 / M-13 focused/direct permanent-CI execution claims
→ intentionally NOT_CLAIMED
→ verification WATCH only

R2.1 delegated release E2E operation
→ permanent-CI qualified
→ genuine release proof still pending
```

The danger is not lack of information. The danger is treating a curated navigation index, a generic CI PASS, or a nearby evidence record as if it filled a specific required claim slot.

SYS-17 defines a bounded read-only analyzer for **explicitly registered evidence slots**. It reports missing proof; it does not discover evidence, invent requirements, decide gates, or promote evidence maturity.

---

## 2. Core invariant

```text
reviewed bounded evidence-slot registry
+ reviewed proof records / references
+ SYS-13 claim/proof vocabulary
→ deterministic slot-status report

SYS-17
!= evidence discovery
!= repository-wide Markdown crawler
!= Evidence Index replacement
!= proof-kind inference from filenames
!= gate-authority engine
!= anomaly severity classifier
!= auto-fix / auto-document writer
```

Canonical rule:

```text
unregistered absence
!= missing evidence
```

Only an explicitly registered slot may be reported as missing.

This preserves the M-13 Evidence Index rule:

```text
row absent
!= GAP
!= unproven contract
```

---

## 3. Why this is `NR_EXECUTABLE`

The useful v1 behavior is deterministic comparison of a bounded registry against reviewed proof-state records.

That is more valuable than another static checklist because the same operation is repeated for:
- a live-gate close;
- a release-system proof close;
- a work-item verification packet;
- focused verification debt;
- an architecture-checkpoint close.

The implementation remains:

```text
local
read-only
non-runtime
non-network
non-writer
non-CI-authority
```

Therefore:

```text
NON_RUNTIME = yes
NR_EXECUTABLE = yes
NR_PROTECTED = no for v1
```

Permanent-CI wiring, automatic GitHub evidence discovery, or mutation of current-state authorities would be separate protected work and are not part of SYS-17 v1.

---

## 4. Constitutional boundary with M-13 Evidence Index

M-13 owns curated evidence navigation.

```text
M-13
contract → owner / authority / live evidence / fixture / status / related
```

Its index is intentionally partial and does not infer gaps from missing rows.

SYS-17 owns a different question:

```text
SYS-17
bounded closure scope → explicit required claim slots → current slot state
```

Therefore:

```text
Evidence Index row absent
→ SYS-17 MUST NOT create a slot

Evidence Index status GAP
→ may be cited by a reviewed SYS-17 slot record
→ but SYS-17 does not reinterpret M-13 semantics
```

No M-13 source rows are auto-created or modified by SYS-17.

---

## 5. Constitutional boundary with SYS-13

SYS-13 owns proof fitness:

```text
proof kind × claim kind
→ DIRECT / CONDITIONAL / SUPPORTING / NONE
```

SYS-17 owns slot completeness:

```text
registered claim slot
+ reviewed proof record
→ SATISFIED / MISSING / NOT_CLAIMED / CONFLICTED / BLOCKED / NOT_APPLICABLE
```

SYS-17 must not redefine the SYS-13 matrix.

A slot registration therefore stores the **reviewed acceptable proof kinds** chosen under SYS-13 policy; SYS-17 validates membership but does not derive acceptable proof kinds from arbitrary prose.

If SYS-13 later changes materially, affected slot registry entries must be reviewed before SYS-17 can claim a clean result.

---

## 6. No global evidence backlog

SYS-17 v1 does **not** maintain one universal list of everything that could ever be useful to prove.

That would incorrectly mix:
- active blockers;
- future checkpoint controls;
- WATCH-only verification debt;
- optional natural samples;
- gated release proof;
- bonus evidence.

Instead every slot belongs to one bounded scope.

Frozen scope kinds:

```text
LIVE_GATE
WORK_ITEM_CLOSE
ARCH_CHECKPOINT
RELEASE_PROOF
VERIFICATION_WATCH
CONTRACT_REVALIDATION
```

A caller selects one explicit `scopeId`.

SYS-17 analyzes only slots registered for that scope.

---

## 7. v1 physical implementation shape

Preferred later implementation:

```text
products/simcore/tooling/evidence-slot-analyzer.mjs
products/simcore/tooling/evidence-slot-analyzer.test.mjs
products/simcore/evidence/evidence-slots-v1.json
products/simcore/evidence/evidence-slots-v1.schema.json
```

No plugin/runtime source is part of SYS-17.

No GitHub Action, permanent-CI discovery rule, branch protection, release workflow, repository writer, network fetcher, or background watcher is part of v1.

---

## 8. Slot registry model

`evidence-slots-v1.json` is a **reviewed projection**, not semantic evidence authority.

Each slot records at least:

```text
slotId
scopeKind
scopeId
claimKind
claimLabel
requirementClass
acceptableProofKinds[]
currentResult
currentProofKind
proofIdentity
sourceAuthorityRefs[]
conditionsSatisfied[]
conditionsMissing[]
notes
```

### 8.1 `slotId`

Stable repository identifier, for example:

```text
06407_LIVE_RELOAD_CONTINUITY
R21_GENUINE_RELEASE_E2E
M13_FOCUSED_TEST_DIRECT_CI_EXECUTION
```

### 8.2 `scopeKind` + `scopeId`

Examples:

```text
LIVE_GATE / 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
RELEASE_PROOF / R2_1_GENUINE_RELEASE_E2E
VERIFICATION_WATCH / NR_DIFFICULTY3_FOCUSED_EXECUTION
```

### 8.3 `claimKind`

Must use a SYS-13 claim kind such as:

```text
CK-03 NAMED_FOCUSED_TEST_ACTUALLY_EXECUTED
CK-10 NAMED_NATURAL_LIVE_CONTROL_PASSED
CK-11 RELEASE_SYSTEM_E2E_OPERATION_PROVEN
```

Unknown claim kinds fail closed.

### 8.4 `requirementClass`

Frozen v1 values:

```text
REQUIRED_FOR_SCOPE_CLOSE
WATCH_ONLY
OPTIONAL_CONFIRMATION
```

This is reviewed metadata copied from the real authority for the bounded scope.

SYS-17 may report the class, but must not promote/demote it.

### 8.5 `acceptableProofKinds[]`

Explicit reviewed SYS-13 proof kinds that can satisfy this particular slot.

Examples:

```text
06407 live continuity
→ [PK-09 NATURAL_LIVE_VALIDATION]

R2.1 genuine release E2E
→ [PK-10 GENUINE_RELEASE_E2E]

M-13 focused standalone direct execution
→ [PK-02 FOCUSED_DETERMINISTIC_TEST, PK-04 PERMANENT_CI]
```

For a CONDITIONAL SYS-13 relationship, the slot must also declare the bounded conditions that must be present.

### 8.6 Current proof-state fields

`currentResult` uses exactly SYS-13 proof-result vocabulary:

```text
PROVEN
NOT_PROVEN
NOT_CLAIMED
CONFLICTED
BLOCKED
NOT_APPLICABLE
```

The registry never converts a generic word like `PASS` into `PROVEN` without reviewed proof identity and claim mapping.

---

## 9. Slot-status output vocabulary

SYS-17 maps one registered slot to exactly one result:

```text
SLOT_SATISFIED
SLOT_MISSING
SLOT_NOT_CLAIMED
SLOT_CONFLICTED
SLOT_BLOCKED
SLOT_NOT_APPLICABLE
```

Mapping:

```text
PROVEN + acceptable proof kind + required conditions satisfied
→ SLOT_SATISFIED

NOT_PROVEN
→ SLOT_MISSING

NOT_CLAIMED
→ SLOT_NOT_CLAIMED

CONFLICTED
→ SLOT_CONFLICTED

BLOCKED
→ SLOT_BLOCKED

NOT_APPLICABLE
→ SLOT_NOT_APPLICABLE
```

Additional fail-close rules:

```text
PROVEN + unacceptable proof kind
→ SLOT_BLOCKED / PROOF_KIND_NOT_ACCEPTABLE

PROVEN + missing conditional facts
→ SLOT_MISSING / CONDITIONAL_PROOF_INCOMPLETE

PROVEN + missing immutable proof identity
→ SLOT_BLOCKED / PROOF_IDENTITY_INCOMPLETE

unknown result
→ SLOT_BLOCKED
```

---

## 10. Top-level analyzer result

Top-level output is descriptive, not gate-authoritative.

Frozen values:

```text
EVIDENCE_SLOTS_CLEAR
EVIDENCE_SLOTS_INCOMPLETE
EVIDENCE_SLOTS_BLOCKED
```

Precedence:

```text
BLOCKED
> INCOMPLETE
> CLEAR
```

### `EVIDENCE_SLOTS_CLEAR`

Every registered `REQUIRED_FOR_SCOPE_CLOSE` slot is `SLOT_SATISFIED` or `SLOT_NOT_APPLICABLE` where the authority explicitly says not applicable.

WATCH/OPTIONAL slots may still be `NOT_CLAIMED` or missing and are reported separately.

This result means only:

> the registered evidence requirements for this selected scope have no unresolved required slot.

It does not mean:
- the gate is authorized to close;
- the release is safe;
- runtime correctness is universal;
- no unregistered evidence requirement exists;
- current priority should advance.

### `EVIDENCE_SLOTS_INCOMPLETE`

At least one registered required slot is missing, not claimed, or conflicted.

SYS-17 reports which slot and why. It does not decide severity beyond the registered `requirementClass`.

### `EVIDENCE_SLOTS_BLOCKED`

Trustworthy slot analysis is impossible because the registry/proof identity/claim vocabulary/source binding is invalid or unresolved.

Unknown never becomes clear.

---

## 11. Analyzer algorithm

Frozen v1 sequence:

```text
1. validate slot registry schema
2. select exact caller-provided scopeKind + scopeId
3. fail if the selected scope is absent or ambiguous
4. validate every slotId is unique
5. validate each claimKind is recognized by the frozen SYS-13 vocabulary projection
6. validate acceptableProofKinds are recognized
7. validate currentResult vocabulary
8. for PROVEN slots, require acceptable proof kind + immutable proof identity
9. require declared conditional facts where the proof relationship is conditional
10. map each slot to SLOT_*
11. summarize required / WATCH / optional counts separately
12. emit bounded report
```

No step searches the repository for possible evidence.
No step changes slot state.
No step selects a different scope because the requested scope has gaps.

---

## 12. CLI contract

Preferred bounded commands:

```text
node products/simcore/tooling/evidence-slot-analyzer.mjs --scope <scopeId>
node products/simcore/tooling/evidence-slot-analyzer.mjs --slot <slotId>
node products/simcore/tooling/evidence-slot-analyzer.mjs --list-scopes
node products/simcore/tooling/evidence-slot-analyzer.mjs --check
```

Forbidden v1 commands/concepts:

```text
--discover
--scan-all-docs
--find-latest-proof
--promote
--close-gate
--fix
--write-index
--update-ledger
--publish
```

---

## 13. Finding vocabulary

Minimum v1 codes:

```text
REQUIRED_SLOT_MISSING
REQUIRED_SLOT_NOT_CLAIMED
REQUIRED_SLOT_CONFLICTED
WATCH_SLOT_NOT_CLAIMED
OPTIONAL_SLOT_MISSING
PROOF_KIND_NOT_ACCEPTABLE
CONDITIONAL_PROOF_INCOMPLETE
PROOF_IDENTITY_INCOMPLETE
UNKNOWN_CLAIM_KIND
UNKNOWN_PROOF_KIND
UNKNOWN_PROOF_RESULT
DUPLICATE_SLOT_ID
SCOPE_NOT_FOUND
SCOPE_AMBIGUOUS
SOURCE_AUTHORITY_REF_MISSING
REGISTRY_SCHEMA_INVALID
```

Reports contain metadata and refs only. They must not duplicate raw diagnostics, full chat bodies, full CI logs, or release payloads.

---

## 14. Current examples

### 14.1 Active v0.64.7 live gate

Registered scope:

```text
LIVE_GATE / 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

Required slot:

```text
slotId = 06407_LIVE_RELOAD_CONTINUITY
claimKind = CK-10 NAMED_NATURAL_LIVE_CONTROL_PASSED
acceptableProofKinds = [PK-09 NATURAL_LIVE_VALIDATION]
currentResult = NOT_PROVEN
requirementClass = REQUIRED_FOR_SCOPE_CLOSE
```

Expected analyzer result today:

```text
SLOT_MISSING
EVIDENCE_SLOTS_INCOMPLETE
```

This reflects the current `PENDING_REAL_LONG_CHAT` gate. SYS-17 itself does not close or advance the gate.

### 14.2 NR Difficulty-3 focused verification WATCH

Example slot:

```text
slotId = M13_FOCUSED_TEST_DIRECT_CI_EXECUTION
scopeKind = VERIFICATION_WATCH
scopeId = NR_DIFFICULTY3_FOCUSED_EXECUTION
claimKind = CK-03 NAMED_FOCUSED_TEST_ACTUALLY_EXECUTED
currentResult = NOT_CLAIMED
requirementClass = WATCH_ONLY
```

Expected:

```text
SLOT_NOT_CLAIMED
```

This does not make the scope blocking and must not trigger CI redesign.

### 14.3 R2.1 genuine release proof

Registered scope:

```text
RELEASE_PROOF / R2_1_GENUINE_RELEASE_E2E
```

Required slot:

```text
claimKind = CK-11 RELEASE_SYSTEM_E2E_OPERATION_PROVEN
acceptableProofKinds = [PK-10 GENUINE_RELEASE_E2E]
currentResult = NOT_PROVEN
requirementClass = REQUIRED_FOR_SCOPE_CLOSE
```

Permanent CI qualification remains relevant supporting evidence but cannot satisfy this slot.

Expected:

```text
SLOT_MISSING
EVIDENCE_SLOTS_INCOMPLETE
```

---

## 15. Gated/future evidence is not automatically a current gap

Example:

```text
post-M2-3 genuine-edit direct control
```

is a real future close requirement, but before M2-3 exists it must not be mixed into the current v0.64.7 live-gate scope.

It may have its own future registered scope such as:

```text
ARCH_CHECKPOINT / M2_3_POST_EXTRACTION_CLOSE
```

but SYS-17 must not report it as a missing current production slot merely because the evidence does not exist yet.

This preserves gate discipline:

```text
future required evidence
!= current missing blocker
```

---

## 16. Relationship to SYS-19 Live-Gate Handoff Packet

SYS-19 tells the human what bounded live experiment/evidence to return.

SYS-17 can support that handoff by answering:

```text
Which registered required live-proof slots are still missing for this exact live gate?
```

But:

```text
SYS-17
!= handoff generator
```

SYS-19 remains the human-facing experiment contract.

---

## 17. Relationship to SYS-08 close receipt

SYS-08 may summarize a SYS-17 result as a pointer:

```text
Evidence slots: INCOMPLETE
Required missing: 06407_LIVE_RELOAD_CONTINUITY
Authority: <SYS-17 report / slot registry ref>
```

It must not copy the entire registry or raw evidence into the close receipt.

---

## 18. Verification requirements for later implementation

A later SYS-17 implementation transaction must verify at minimum:

```text
slot registry schema validation
scope selection determinism
duplicate slot rejection
unknown vocabulary fail-close
PROVEN + wrong proof kind rejection
conditional proof missing-condition rejection
missing immutable identity rejection
required vs WATCH vs optional separation
NOT_CLAIMED preserved exactly
no repository/network writes
no runtime/plugin/release file changes
```

Focused tests must include at least:

```text
required missing live slot
required proven slot
WATCH-only NOT_CLAIMED slot
optional missing slot
wrong proof kind
missing conditional fact
missing proof identity
unknown claim kind
ambiguous scope
```

If permanent CI does not directly execute the focused SYS-17 test in the future, record that execution coverage honestly under SYS-13 rather than widening CI in the same implementation transaction.

---

## 19. Explicit non-goals

SYS-17 v1 does not:

```text
crawl Markdown for the word GAP
infer evidence requirements from M-13 row absence
select latest live specimen
parse arbitrary CI logs
fetch GitHub Actions over network
rewrite Evidence Index
rewrite Deferred Ledger
change WATCH / DEFER / FIX / BLOCKER
change PASS / WATCH / GAP
open or close gates
select NEXT
schedule live validation
publish releases
modify runtime/plugin bytes
```

---

## 20. Freeze verdict

```text
SYS-17 DESIGN = COMPLETE
OPEN DESIGN QUESTIONS = 0
RUNTIME CLASS = NON_RUNTIME
APPLY CLASS = NR_EXECUTABLE
IMPLEMENTATION = HELD BY ACTIVE SYSTEM DESIGN SWEEP
```

Frozen operating rule:

> **A missing evidence claim may be reported only when the claim slot was explicitly registered for the selected bounded scope. Absence elsewhere is not proof of a gap.**

This design preserves existing evidence authority while making required missing proof visible without proof substitution or gate inference.
