# SimCore Runtime-Idea PREP_NON_RUNTIME Policy

Status: `CANONICAL OPERATIONAL POLICY · RUNTIME CORE REMAINS PARKED · REPO-MEMORY PREPARATION ALLOWED · NO RUNTIME CHANGE`

Purpose: allow bounded repository-memory preparation for frozen RUNTIME ideas without starting runtime/plugin implementation or weakening the existing stabilization gate.

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_IDEA_DESIGN_PROGRESS_LEDGER_2026-08-26.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`

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

if a separable repo-memory preparation exists:
→ R_PREP_NON_RUNTIME review
→ bounded prep transaction
→ static/path verification
→ main documentation / durable-memory sync
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

---

## 3. Hard eligibility gate

A preparatory slice is eligible only when **all** are true:

```text
parent R idea = DESIGN FROZEN
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
R_PREP_NON_RUNTIME candidate now: NONE REQUIRED
```

Reason: the frozen design already contains the necessary durable-memory contracts; the remaining meaningful work is UI/runtime implementation and verification.

### S-02 Diagnostic Quick Summary

```text
RUNTIME core: PARKED
R_PREP_NON_RUNTIME candidate now: NONE REQUIRED
```

Reason: the frozen design already records the six-field contract, same-observation rule, stale/current presentation semantics, and verification obligations. Additional repository structure would duplicate the design rather than reduce future implementation risk.

### S-04 Live Evidence Packet Builder

```text
RUNTIME core: PARKED
R_PREP_NON_RUNTIME candidate now: YES
candidate: repository evidence-review / classification-handoff template
```

Reason: S-04 already freezes the runtime packet as a transfer object and explicitly places final classification/preservation authority in the repository. A manual review template can be useful now without implementing the packet button, clipboard path, diagnostic projection, or any runtime behavior.

The template must remain usable with manually transcribed evidence before S-04 runtime implementation and must not pretend a packet was generated when it was not.

---

## 9. Active / undesigned R ideas

An R idea still in `ACTIVE / DESIGN IN PROGRESS` is not eligible for prep implementation.

Canonical rule:

```text
finish design first
→ DESIGN FROZEN
→ only then inspect for separable R_PREP_NON_RUNTIME work
```

This prevents preparatory artifacts from freezing semantics before the parent idea is actually designed.

Current active R queue remains:

```text
S-03 Diagnostic Copy Profiles
S-07 Host Capability Receipt
S-08 History Frontier Confidence Surface
```

Each may be reviewed for prep only after its own design freezes.

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
```

Real long-chat validation is not required for prep-only repository memory.

Future runtime implementation still carries its normal release/live obligations.

---

## 11. Relationship to NR harvest

Keep these systems separate.

```text
NR SAFE_NON_RUNTIME HARVEST
= implementation of a NON_RUNTIME idea after its NR difficulty-tier close

R_PREP_NON_RUNTIME
= ancillary repository-memory preparation for a frozen RUNTIME idea
```

R_PREP does not wait for an NR difficulty-tier close because the parent remains in the R lane and the prep artifact is deliberately non-executable repository memory only.

If the proposed slice grows into reusable executable tooling, stop and classify/design it as a separate NR item instead of continuing under R_PREP.

---

## 12. Current operating verdict

```text
RUNTIME CORE
= STILL PARKED

FROZEN R IDEA
+ useful separable repo-memory artifact
+ strict R_PREP_NON_RUNTIME PASS
→ may prepare now in a separate work item

NO USEFUL PREP ARTIFACT
→ do nothing; design doc remains sufficient

EXECUTABLE / RUNTIME / CI / RELEASE EFFECT
→ NOT R_PREP
→ PARK OR SEPARATE NR DESIGN
```

Current first candidate after this policy transaction:

```text
S-04
→ repository evidence-review / classification-handoff template
→ separate next work item
```
