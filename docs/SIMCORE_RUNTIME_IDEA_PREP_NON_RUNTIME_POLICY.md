# SimCore Runtime-Idea PREP_NON_RUNTIME Policy

Status: `CANONICAL OPERATIONAL POLICY · RUNTIME CORE REMAINS PARKED · REPO-MEMORY PREPARATION ALLOWED · DOC-APPLY SUBCLASSIFICATION ACTIVE · NO RUNTIME CHANGE`

Purpose: allow bounded repository-memory preparation for frozen RUNTIME ideas without starting runtime/plugin implementation or weakening the existing stabilization gate.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md` — canonical R document-only applicability/status queue

---

## 1. Core rule

A SimCore idea remains classified by its **core implementation effect**.

Therefore:

```text
RUNTIME idea
+ repository-only preparatory artifact
!= NON_RUNTIME idea
```

The core item remains `RUNTIME` and its plugin/runtime implementation remains parked until stabilization.

However, after the runtime idea's design is fully frozen, an ancillary repository-memory slice may be implemented now when it passes the strict `R_PREP_NON_RUNTIME` boundary.

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

This is an additive preparation rule, not an authorization to start product/runtime work.

---

## 2. What R_PREP_NON_RUNTIME means

`R_PREP_NON_RUNTIME` is a **slice classification**, not a new idea-lane classification.

It means:

```text
this artifact can be useful before runtime implementation
AND
it carries no executable/runtime behavior
AND
it does not become a second semantic/runtime authority
```

Typical eligible artifacts:

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

The artifact may organize already-frozen semantics.
It may not invent new runtime semantics.

### 2A. DOC APPLY classification

Every R idea now also carries a document-only applicability state under:

```text
docs/SIMCORE_RUNTIME_DOC_APPLY_CLASSIFICATION_2026-08-26.md
```

Frozen vocabulary:

```text
DOC_APPLICABLE
DOC_APPLIED
DOC_NOT_REQUIRED
DOC_UNASSESSED
```

Interpretation:

```text
DOC_APPLICABLE
= useful separable document-only artifact exists

DOC_APPLIED
= that artifact was applied under a separate R_PREP transaction

DOC_NOT_REQUIRED
= frozen design already contains sufficient durable memory

DOC_UNASSESSED
= design not frozen enough to judge safely
```

A design being documented does not automatically make it `DOC_APPLICABLE`.
The test is whether an additional independently useful repository artifact can be applied before runtime work.

---

## 3. Hard eligibility gate

A preparatory slice is eligible only when **all** are true:

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

If any condition fails:

```text
R_PREP_NON_RUNTIME = NOT ELIGIBLE
→ keep the slice parked with the parent runtime implementation
OR
→ classify it as a separate NR idea if it is genuinely independent tooling/infrastructure
```

---

## 4. Forbidden scope

R_PREP_NON_RUNTIME must never be used to smuggle implementation forward.

Forbidden:

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

A file being under `docs/` is not sufficient by itself. The artifact must also be non-executable and non-authoritative for runtime behavior.

---

## 5. Long-term-memory boundary

Eligible durable-memory artifacts may record:

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

They must not record guessed current runtime facts as if observed.

Canonical rule:

```text
TEMPLATE / CHECKLIST / REGISTRY STRUCTURE
= allowed

CURRENT RUNTIME FACT manufactured from design
= forbidden
```

If a future runtime observation is required, leave the field explicitly pending/unknown until real evidence exists.

---

## 6. Parent-item status

Completing a prep slice does not change the parent R idea to implemented.

Allowed parent status notation:

```text
DESIGN FROZEN
DOC APPLY CLASS = DOC_APPLIED
R_PREP_NON_RUNTIME = COMPLETE
RUNTIME IMPLEMENTATION = PARKED FOR STABILIZATION
```

Never write:

```text
RUNTIME IMPLEMENTED
```

merely because its repo-memory preparation exists.

---

## 7. Transaction rule

Process/policy changes and prep implementation must not be mixed in one implementation transaction.

Canonical sequence:

```text
policy/design authority established on main
→ stop policy transaction
→ later separate prep work item
→ static/path verification
→ main evidence sync
```

For each prep work item:

```text
one parent R idea
→ one bounded prep purpose
→ no runtime implementation
```

Do not bundle multiple unrelated runtime ideas into one prep artifact solely for convenience.

---

## 8. Current frozen-R applicability review

As of 2026-08-26:

### S-01 MINI_WARNING_WIDGET_V1

```text
RUNTIME core: PARKED
DOC APPLY CLASS: DOC_NOT_REQUIRED
```

Reason: the frozen design already contains the necessary durable-memory contracts; the remaining meaningful work is UI/runtime implementation and verification.

### S-02 Diagnostic Quick Summary

```text
RUNTIME core: PARKED
DOC APPLY CLASS: DOC_NOT_REQUIRED
```

Reason: the frozen design already records the six-field contract, same-observation rule, stale/current presentation semantics, and verification obligations. Additional repository structure would duplicate the design rather than reduce future implementation risk.

### S-03 Diagnostic Copy Profiles

```text
RUNTIME core: PARKED
DOC APPLY CLASS: DOC_NOT_REQUIRED
```

Reason: the frozen S-03 design already records profile vocabulary, field budgets, pair identity, copy-transport compatibility, failure rules, and verification obligations. Another pre-runtime document would duplicate the same durable-memory contract.

### S-04 Live Evidence Packet Builder

```text
RUNTIME core: PARKED
DOC APPLY CLASS: DOC_APPLICABLE
candidate: repository evidence-review / classification-handoff template
```

Reason: S-04 already freezes the runtime packet as a transfer object and explicitly places final classification/preservation authority in the repository. A manual review template can be useful now without implementing the packet button, clipboard path, diagnostic projection, or any runtime behavior.

The template must remain usable with manually transcribed evidence before S-04 runtime implementation and must not pretend a packet was generated when it was not.

### S-07 Host Capability Receipt

```text
RUNTIME core: PARKED
DOC APPLY CLASS: DOC_NOT_REQUIRED
```

Reason: the frozen S-07 design already records capability IDs, Surface/Use state vocabularies, evidence-source classes, side-effect-probe prohibitions, provider-overclaim boundaries and verification obligations. A separate pre-runtime capability baseline would risk recording current Host facts that have not actually been captured by the future receipt.

---

## 9. Active / undesigned R ideas

An R idea still in `ACTIVE / DESIGN IN PROGRESS`, gated, or future-only remains:

```text
DOC_UNASSESSED
```

Canonical rule:

```text
finish design first
→ DESIGN FROZEN
→ assign DOC_APPLICABLE or DOC_NOT_REQUIRED
→ runtime core PARKED
```

This prevents preparatory artifacts from freezing semantics before the parent idea is actually designed.

Current active R queue:

```text
S-08 History Frontier Confidence Surface
```

S-08 receives its document-applicability verdict in the same work item that freezes its design.

---

## 10. Verification

R_PREP_NON_RUNTIME work requires bounded static verification appropriate to the artifact:

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

Real long-chat validation is not required for prep-only repository memory.

Future runtime implementation still carries its normal release/live obligations.

---

## 11. Relationship to NR harvest

Keep these systems separate.

```text
NR SAFE_NON_RUNTIME HARVEST
= implementation of a NON_RUNTIME idea after its NR difficulty-tier close

R_PREP_NON_RUNTIME / DOC APPLY
= ancillary repository-memory preparation for a frozen RUNTIME idea
```

R_PREP does not wait for an NR difficulty-tier close because the parent remains in the R lane and the prep artifact is deliberately non-executable repository memory only.

If the proposed slice grows into reusable executable tooling, stop and classify/design it as a separate NR item instead of continuing under R_PREP.

---

## 12. Current operating verdict

```text
RUNTIME CORE
= STILL PARKED

DOC APPLY QUEUE
= frozen R ideas whose DOC APPLY CLASS = DOC_APPLICABLE

CURRENT DOC APPLY QUEUE
1. S-04 repository evidence-review / classification-handoff template

CURRENT DOC_NOT_REQUIRED
S-01
S-02
S-03
S-07

CURRENT DOC_UNASSESSED
S-08 + all gated/future R ideas until their designs freeze
```

Current first document-only application remains held until the design sweep closes:

```text
S-04
→ repository evidence-review / classification-handoff template
→ separate later work item
```