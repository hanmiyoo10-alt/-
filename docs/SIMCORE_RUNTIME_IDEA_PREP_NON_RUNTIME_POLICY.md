# SimCore Runtime-Idea PREP_NON_RUNTIME Policy

Status: `CANONICAL OPERATIONAL POLICY · RUNTIME CORE REMAINS PARKED · S-04 R_PREP COMPLETE · CURRENT DOC APPLY QUEUE EMPTY · NO RUNTIME CHANGE`

Purpose: allow bounded repository-memory preparation for frozen RUNTIME ideas without starting runtime/plugin implementation or weakening the existing stabilization gate.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md`
- `docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md`

---

## 1. Core rule

```text
RUNTIME idea
+ repository-only preparatory artifact
!= NON_RUNTIME idea
```

The core item remains `RUNTIME` and its plugin/runtime implementation remains parked until stabilization.

Canonical flow:

```text
RUNTIME idea selected
→ complete full design
→ DESIGN FROZEN
→ runtime implementation PARKED
→ assign DOC APPLY CLASS

DOC_APPLICABLE
→ later separate R_PREP_NON_RUNTIME transaction
→ bounded prep artifact
→ static/path verification
→ main durable-memory sync
→ DOC_APPLIED
→ runtime item remains PARKED

DOC_NOT_REQUIRED
→ no prep implementation
→ runtime item remains PARKED
```

---

## 2. What R_PREP_NON_RUNTIME means

`R_PREP_NON_RUNTIME` is a slice classification, not a new idea lane.

Eligible artifacts are non-executable repository memory such as:

```text
repository evidence-review template
operator checklist
bounded durable-memory registry
non-executable field dictionary
manual evidence intake form
migration/rollout checklist
static conformance checklist
explicit cross-reference map
```

The artifact may organize already-frozen semantics. It may not invent runtime semantics or current runtime facts.

Frozen DOC APPLY vocabulary:

```text
DOC_APPLICABLE
DOC_APPLIED
DOC_NOT_REQUIRED
DOC_UNASSESSED
```

---

## 3. Hard eligibility gate

A preparatory slice is eligible only when all are true:

```text
parent R idea = DESIGN FROZEN
DOC APPLY CLASS = DOC_APPLICABLE
plugin bytes = unchanged
latest.js/install.js = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
Host behavior = unchanged
Core/Session/Store state/schema = unchanged
prompt behavior = unchanged
runtime diagnostic behavior = unchanged
release workflow/CI authority = unchanged
no executable script/tool is added
no runtime-consumed schema/config is added
no network/GitHub writer is added
no generated current-production truth is invented
```

If any condition fails, the slice is not R_PREP_NON_RUNTIME.

---

## 4. Forbidden scope

```text
plugin source edits
DOM/UI implementation
new diagnostic formatter code
new Host reads/writes
SnapshotStore/state fields
runtime event hooks
clipboard/runtime handlers
runtime-consumed JSON schema/config
Node/Python tooling
CI test discovery changes
workflow changes
release automation changes
version bump
release candidate
release-simcore publication
```

A file being under `docs/` is not enough by itself.

---

## 5. Long-term-memory boundary

Allowed:

```text
frozen field names / meanings
review steps
classification handoff
repo preservation destinations
manual operator responsibilities
expected evidence links
future implementation verification checklist
placeholder/example structures clearly marked as examples
```

Forbidden:

```text
CURRENT RUNTIME FACT manufactured from design
```

Future observation fields remain pending/unknown until real evidence exists.

---

## 6. Parent-item status

Completing prep never means runtime implementation completed.

Allowed:

```text
DESIGN FROZEN
DOC APPLY CLASS = DOC_APPLIED
R_PREP_NON_RUNTIME = COMPLETE
RUNTIME IMPLEMENTATION = PARKED FOR STABILIZATION
```

Forbidden:

```text
RUNTIME IMPLEMENTED
```

merely because repo-memory prep exists.

---

## 7. Transaction rule

```text
policy/design authority established on main
→ stop policy/design transaction
→ later separate prep work item
→ static/path verification
→ main evidence sync
```

One prep work item = one parent R idea + one bounded prep purpose.

---

## 8. Current frozen-R applicability review

### DOC_NOT_REQUIRED

```text
S-01 MINI_WARNING_WIDGET_V1
S-02 Diagnostic Quick Summary
S-03 Diagnostic Copy Profiles
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

Reasons:
- their frozen design documents already contain the durable-memory contracts needed before runtime implementation;
- S-07 must not create a pre-runtime current Host capability baseline;
- S-08 must not create a pre-runtime current Host/history confidence baseline;
- extra prep documents would duplicate semantics or fabricate current observations.

### DOC_APPLIED

```text
S-04 Live Evidence Packet Builder
→ docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md
→ application evidence: docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

Applied behavior:
- manual `MANUAL_EQUIVALENT` intake is allowed before runtime S-04 exists;
- future actual `PACKET_V1` remains distinguishable from manual transcription;
- packet handoff starts as `CLASSIFICATION_PENDING / REVIEW_REQUIRED / NOT_ASSESSED`;
- final `WATCH / DEFER / FIX / BLOCKER` is assigned only after repository forensic review;
- dedicated evidence/watch documents remain the final preserved interpretation/classification authority;
- runtime S-04 remains unimplemented and parked.

### DOC_APPLICABLE

```text
NONE
```

---

## 9. Current design state

The current gate-open design sweep is closed:

```text
S-03 → FROZEN / DOC_NOT_REQUIRED
S-07 → FROZEN / DOC_NOT_REQUIRED
S-08 → FROZEN / DOC_NOT_REQUIRED

CURRENT GATE-OPEN R DESIGN = NONE
```

All gated/future R ideas remain `DOC_UNASSESSED` until their design gates legitimately open and their designs freeze.

---

## 10. Verification

R_PREP_NON_RUNTIME work requires:

```text
referenced repo paths resolve
terminology matches frozen design
no runtime files changed
no release-simcore change
no plugin version change
no executable/tooling/workflow files added
no runtime-current fact fabricated
no parent runtime implementation status accidentally promoted
DOC APPLY state moves only DOC_APPLICABLE → DOC_APPLIED after successful prep
```

For the completed S-04 prep, these checks are recorded in:

```text
docs/SIMCORE_S04_R_PREP_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

Real long-chat validation is not required for prep-only repository memory. Future runtime implementation still carries its normal release/live obligations.

---

## 11. Relationship to NR harvest

```text
NR SAFE_NON_RUNTIME HARVEST
= implementation of a NON_RUNTIME idea after its NR difficulty-tier close

R_PREP_NON_RUNTIME / DOC APPLY
= ancillary repository-memory preparation for a frozen RUNTIME idea
```

Keep them separate. If a prep slice grows into executable tooling, stop and classify/design it as a separate NR item.

---

## 12. Current operating verdict

```text
RUNTIME CORE
= STILL PARKED

CURRENT DOC APPLY QUEUE
= EMPTY

DOC_APPLIED
S-04

CURRENT DOC_NOT_REQUIRED
S-01
S-02
S-03
S-07
S-08

CURRENT DOC_UNASSESSED
all gated/future R ideas until design freeze
```
