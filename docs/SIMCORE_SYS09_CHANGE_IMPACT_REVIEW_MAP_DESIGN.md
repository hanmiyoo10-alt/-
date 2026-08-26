# SYS-09 — Change-Impact Review Map — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · PROCEDURAL REVIEW MAP · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-09
Idea          = Change-Impact Review Map
Size          = MEDIUM
Importance    = 5 / VERY HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
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
- `docs/SIMCORE_SYS03_GATE_DEPENDENCY_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS08_WORK_ITEM_CLOSE_RECEIPT_DESIGN.md`

Protected existing classifier authority that SYS-09 must not replace:
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_3B_TRIGGER_CHECK_MATRIX_PATH_CLASSIFICATION.md`

---

## 1. Problem

SimCore work is intentionally split across runtime source, release identity, living memory, evidence, permanent fixtures, architecture contracts, local tooling, CI/release machinery, and repository coordination.

A bounded change can therefore be locally correct while still requiring review elsewhere.

Examples:

```text
runtime source changed
→ production boundary and architecture/fixture implications may need review

current queue authority changed
→ living mirrors, gate/queue state, and NEXT may need review

fixture registry changed
→ coverage/evidence/verification claims may need review

release or CI authority changed
→ protected infrastructure review is mandatory even if plugin bytes are untouched
```

The existing close-step system tells the operator what maintenance surfaces exist, and SYS-51 selects close surfaces from the work type/event overlays. However, the operator can still miss a concern-specific review because the **actual changed concern** and the **required review obligations** are not represented in one bounded map.

SYS-09 defines that map.

---

## 2. Core invariant

```text
reviewed change family
→ required review obligations
→ affected authority / contract / RT surfaces

SYS-09
!= change classifier authority
!= CI path router
!= verification result
!= gate result
!= automatic document writer
```

The map answers:

> Given a known, reviewed kind of change, what authorities/contracts must be reconsidered before this bounded transaction can close?

It does not answer:

> Did those reviews pass?

Each owning review surface remains authoritative for its own result.

---

## 3. Constitutional boundary with permanent CI path classification

Release System v2 already owns a protected PR path-classification contract for CI routing. It classifies changed paths into labels such as:

```text
CI_SELF
HARNESS
ARCH_CONTRACT
STATE_SYNC
LEGACY_VERIFICATION
SIMCORE_DOC_ONLY
SHARED_MAIN_COORDINATION
```

That classifier controls which permanent CI gates are applicable.

SYS-09 must not duplicate, replace, widen, or silently reinterpret that classifier.

```text
RS2-3B path classifier
= changed paths → CI applicability / CI routing
= protected CI authority

SYS-09
= reviewed change family → human/operator review obligations
= task-close procedural authority
```

A later SYS-09 automation must not consume CI labels as semantic truth without a separately frozen integration design.

No `.github/workflows/**`, branch-protection, permanent harness routing, or required-check behavior is changed by SYS-09 v1.

---

## 4. Relationship to SYS-51 Close-Step Trigger Matrix

The two systems operate on different inputs.

```text
SYS-51
primary transaction type + observed event overlays
→ which RT surfaces to evaluate

SYS-09
actual reviewed change families
→ which concern-specific authorities/contracts need review
```

They are additive.

Example:

```text
WT-04 NON_RUNTIME_EXECUTABLE_TOOLING
→ SYS-51 selects RT-01/02/04/08/11/12 plus triggered surfaces

actual change family = LOCAL_TOOLING
→ SYS-09 requires tool contract, focused verification, production-neutrality, and living-reference review
```

SYS-09 may point to RT IDs but cannot redefine them.

---

## 5. Relationship to SYS-01 / SYS-03 / SYS-08

### SYS-01 Living Authority Map

```text
SYS-01
= where the affected authority lives

SYS-09
= when a reviewed change family requires that authority to be rechecked
```

SYS-09 should reference authority families rather than duplicating current values.

### SYS-03 Gate Dependency Graph

```text
SYS-03
= review event → dependent gated items

SYS-09
= change family → required review obligations
```

A change may trigger a gate/dependency review, but SYS-09 does not enumerate gate dependents itself. It may require `RT-11`, after which SYS-03 may be used as the direct dependent lookup.

### SYS-08 Work-Item Close Receipt

SYS-08 may record which SYS-09 change families were reviewed and which obligations were completed, but it remains point-in-time closure evidence.

SYS-09 is the reusable review contract.

---

## 6. v1 implementation form

The useful v1 implementation is one living document/table, conceptually:

```text
docs/SIMCORE_CHANGE_IMPACT_REVIEW_MAP.md
```

No executable scanner, GitHub Action, path parser, repository writer, CI hook, generator, or background watcher is required for v1.

The operator/assistant identifies the actual change families from the bounded work and uses the map during task close.

This deliberately follows the active no-code-by-default rule.

---

## 7. Frozen v1 change families

SYS-09 v1 recognizes exactly these concern families.

```text
CF-01 RUNTIME_SOURCE_OR_BEHAVIOR
CF-02 PRODUCTION_RELEASE_IDENTITY_OR_BYTES
CF-03 LIVING_STATE_OR_SELECTION_AUTHORITY
CF-04 FROZEN_DESIGN_OR_POLICY_CONTRACT
CF-05 EVIDENCE_ANOMALY_OR_LIVE_POSTURE
CF-06 PERMANENT_FIXTURE_TEST_OR_COVERAGE
CF-07 ARCHITECTURE_CONTRACT_OR_OWNERSHIP
CF-08 LOCAL_NON_RUNTIME_TOOLING
CF-09 CI_RELEASE_OR_REPOSITORY_AUTHORITY
CF-10 GATE_DEPENDENCY_OR_PRIORITY_STATE
CF-11 SHARED_REPOSITORY_COORDINATION
CF-12 HISTORICAL_OR_POINT_IN_TIME_RECORD_ONLY
```

A transaction may have multiple change families.

The family set is descriptive review metadata only. It does not replace:
- unified idea Runtime Class;
- NR Apply Class;
- SYS-51 work types;
- RS2-3B CI path labels;
- architecture module ownership classes.

---

## 8. Change-family semantics

### CF-01 RUNTIME_SOURCE_OR_BEHAVIOR

Includes:
- plugin runtime source changes;
- request/output semantics;
- state mutation/observation behavior;
- host/runtime interaction behavior.

Required review obligations:

```text
production boundary
architecture/frozen-surface impact
relevant permanent fixture coverage
verification honesty
live validation contract if publication follows
living current-state consequence
```

Typical RT surfaces:

```text
RT-04 RT-08 RT-09 RT-01 RT-02 RT-11 RT-12
```

This family never authorizes publication.

### CF-02 PRODUCTION_RELEASE_IDENTITY_OR_BYTES

Includes:
- `release-simcore` publication/rollback;
- deployed version/commit/blob identity;
- `latest.js` / `install.js` production identity;
- manifest release identity convergence.

Required review obligations:

```text
release-simcore identity
latest == install
manifest/current production identity
release/operator policy
current live gate
living docs convergence
transaction evidence
```

Typical RT surfaces:

```text
RT-03 RT-04 RT-08 RT-10 RT-01 RT-02 RT-11 RT-12
```

Only an explicitly authorized release transaction may create this family intentionally.

### CF-03 LIVING_STATE_OR_SELECTION_AUTHORITY

Includes:
- current priority/queue/NEXT state;
- progress ledger state;
- current anomaly disposition;
- current operational/living policy state.

Required review obligations:

```text
canonical owning authority first
registered living mirrors
stale NEXT possibility
queue/gate consequence
SYS-01 authority-map relation if ownership changed
```

Typical RT surfaces:

```text
RT-01 RT-02 RT-03 when current-state checker scope is relevant RT-11 RT-12
```

Historical records are not rewritten merely because current state changed.

### CF-04 FROZEN_DESIGN_OR_POLICY_CONTRACT

Includes:
- new or changed frozen design;
- durable policy/contract semantics;
- accepted allowed/forbidden implementation boundaries.

Required review obligations:

```text
classification consistency
supersession/current-authority relationship
future implementation/apply classification
references from living selection/progress docs
change-impact consequences for later implementation
```

Typical RT surfaces:

```text
RT-01 RT-02 RT-11 RT-12
```

Frozen design text remains point-in-time authority after freeze; later current-state changes do not rewrite it.

### CF-05 EVIDENCE_ANOMALY_OR_LIVE_POSTURE

Includes:
- new natural live specimen;
- anomaly finding/reclassification;
- evidence maturity/current posture change;
- LIVE_PENDING/PASS/FIX/BLOCKER evidence consequences.

Required review obligations:

```text
forensic classification
natural-corpus qualification when applicable
evidence navigation
current anomaly/disposition authority
gate/queue effect
verification claim scope
```

Typical RT surfaces:

```text
RT-05 RT-06 RT-07 RT-08 RT-01 RT-02 RT-11 RT-12
```

SYS-09 never classifies anomaly severity itself.

### CF-06 PERMANENT_FIXTURE_TEST_OR_COVERAGE

Includes:
- permanent suite/fixture/registry changes;
- coverage-class changes;
- negative-control changes;
- executable/hybrid coverage promotion.

Required review obligations:

```text
fixture registry / suite intent
coverage ownership class
Evidence Index consequence if curated
focused/static/CI verification honesty
production neutrality where runtime source is unchanged
```

Typical RT surfaces:

```text
RT-09 RT-08 RT-05 when evidence projection changes RT-04 RT-01 RT-02 RT-11 RT-12
```

Do not promote HYBRID_TRANSITIONAL to EXECUTABLE without direct owner execution.

### CF-07 ARCHITECTURE_CONTRACT_OR_OWNERSHIP

Includes:
- module/import boundaries;
- Contracts v2 changes;
- ownership extraction/migration;
- architecture machine-contract changes.

Required review obligations:

```text
architecture contract authority
ownership migration consequence
state/read/write surface implication
fixture/test seam consequence
production neutrality or intentional runtime change
post-checkpoint gate consequences
```

Typical RT surfaces:

```text
RT-04 RT-08 RT-09 when coverage changes RT-01 RT-02 RT-11 RT-12
```

This family does not bypass the M2 checkpoint order.

### CF-08 LOCAL_NON_RUNTIME_TOOLING

Includes:
- local read-only analyzer/generator/formatter;
- focused tooling tests;
- bounded repository-local helper that does not alter CI/release/repository writer authority.

Required review obligations:

```text
frozen tool input/output/fail-closed contract
syntax/static/focused verification
no network/writer/runtime authority
production neutrality when material
verification-coverage WATCH honesty
```

Typical RT surfaces:

```text
RT-04 RT-08 RT-01 RT-02 RT-11 RT-12
```

Permanent CI discovery is not implied.

### CF-09 CI_RELEASE_OR_REPOSITORY_AUTHORITY

Includes:
- permanent CI routing/discovery;
- required-check semantics;
- release workflow authority;
- repo writer/branch authority;
- harness authority/topology.

Required review obligations:

```text
protected-system design/gate
trust boundary
read/write authority
rollback/fallback
self-change verification
no mixing with runtime feature work
```

Typical RT surfaces:

```text
RT-04 RT-08 RT-10 RT-01 RT-02 RT-11 RT-12
```

This family is protected work. SYS-09 does not authorize the change merely by identifying it.

### CF-10 GATE_DEPENDENCY_OR_PRIORITY_STATE

Includes:
- an item gate changes;
- a dependency/review event is added/closed/replaced;
- current selection policy or legitimate open set changes.

Required review obligations:

```text
owning gate/selection authority
SYS-03 direct dependency graph when applied
SYS-48 blocked reason surface when applied
SYS-10 stale NEXT risk when applied
new incremental sweep state
```

Typical RT surfaces:

```text
RT-02 RT-11 RT-01 RT-12
```

A dependency event is never treated as automatic implementation authorization.

### CF-11 SHARED_REPOSITORY_COORDINATION

Includes:
- shared main-writer coordination;
- repository-wide locking/merge/write protocol used by SimCore;
- cross-product protected coordination surface.

Required review obligations:

```text
shared coordination authority
SimCore compatibility/trust boundary
protected write semantics
release/state-sync consumers if applicable
no product-local ownership claim over shared infrastructure
```

Typical RT surfaces:

```text
RT-04 when production/release claims are material RT-08 RT-10 RT-01 RT-02 RT-11 RT-12
```

SYS-09 does not make SimCore the owner of shared coordination.

### CF-12 HISTORICAL_OR_POINT_IN_TIME_RECORD_ONLY

Includes:
- frozen implementation evidence;
- close receipts;
- release evidence/retrospectives;
- historical design snapshots where current authority is explicitly elsewhere.

Default review obligation:

```text
preserve point-in-time meaning
verify cross-reference if newly created
no living-state propagation solely because historical prose contains old CURRENT/NEXT text
```

Typical RT surfaces:

```text
RT-01 only if a separate living authority also changed
RT-12 for the bounded task itself
```

This family exists primarily to prevent over-triggering.

---

## 9. Frozen review-row schema

Each v1 map row contains:

```text
Change Family ID
Change family label
Trigger evidence / examples
Required authority reviews
Required contract reviews
Required RT surfaces / overlays
Verification expectation
Possible gate/queue consequence
Forbidden assumptions / bundling
Explicit non-authorities
```

`Required` means evaluate, not mutate.

A review may conclude:

```text
REVIEWED_NO_CHANGE
UPDATED
NOT_APPLICABLE_AFTER_REVIEW
BLOCKED
```

SYS-09 does not define one universal PASS/FAIL vocabulary for the underlying reviews.

---

## 10. Multi-family resolution

Change families are additive.

```text
bounded work
→ identify every materially affected CF family
→ union required reviews
→ SYS-51 work-type/event RT set
→ union selected close obligations
```

No lighter family suppresses a stronger one.

Example:

```text
fixture update + CI discovery edit
= CF-06 + CF-09
```

This must be treated as protected CI/harness authority work, not ordinary fixture expansion.

Likewise:

```text
runtime fix + release workflow redesign
= CF-01 + CF-09
```

is a prohibited bundling candidate under current SimCore workflow and should be split before implementation. Future SYS-50 may make this detection explicit; SYS-09 only exposes both impact families.

---

## 11. Matching discipline

SYS-09 v1 does not infer change families by filename extension alone.

Use reviewed semantic facts:

```text
what changed?
which authority/behavior/contract does that file actually own?
what bounded transaction was performed?
```

Paths may be included as examples, but path matching is not authority.

Forbidden heuristics:

```text
.js => runtime
.md => doc-only
.github/** => always release
products/simcore/tests/** => only fixture concern
newest file owns state
CI classifier label => complete semantic impact
```

A Markdown file can own a live policy; a JS file can be non-runtime local tooling; a test file can also alter harness/CI authority depending on context.

If the family cannot be resolved without guessing:

```text
IMPACT_MAP_BLOCKED
```

and the work must be reviewed before close rather than assigned the lightest family.

---

## 12. Map state vocabulary

Exactly three v1 map-evaluation states:

```text
IMPACT_MAP_READY
IMPACT_MAP_STALE
IMPACT_MAP_BLOCKED
```

### IMPACT_MAP_READY

Every material change is covered by one or more reviewed change families and required review obligations are resolvable.

### IMPACT_MAP_STALE

A map row references an authority/RT/contract relationship that has been superseded or materially changed.

Repair the map after the owning authority is updated.

### IMPACT_MAP_BLOCKED

A change cannot be classified or its review obligation cannot be resolved without semantic guessing.

Fail closed:

```text
unknown impact
!= low impact
```

These states concern the map only and do not replace project anomaly or verification statuses.

---

## 13. Update discipline

Review SYS-09 when any of these changes:

```text
new authority family appears
SYS-01 authority relationship changes
RT surface semantics change
new protected repository/CI/release authority appears
architecture ownership model changes materially
fixture/evidence governance changes materially
SYS-51 work-type/event semantics change in a way that affects review obligations
```

Update order:

```text
owning authority/contract first
→ verify new relationship
→ update SYS-09 review map
→ review SYS-51/SYS-01/SYS-03/SYS-48 only if their own relationships changed
→ RT-01/02/11/12 normal close
```

Do not edit SYS-09 merely because a file path changed while its semantic owner/review obligation remained the same.

---

## 14. Hard boundaries

SYS-09 must never become:

```text
second permanent-CI path classifier
CI gate router
branch-protection authority
release dispatcher
gate-state checker
priority engine
NEXT selector
architecture ownership inferencer
runtime behavior classifier
automatic verification PASS/FAIL engine
automatic document writer
repository writer
background watcher
```

It is a procedural review-obligation map only.

---

## 15. Verification plan for later NR_DOC_ONLY application

When `SIMCORE_CHANGE_IMPACT_REVIEW_MAP.md` is materialized, manually verify at least:

```text
1. all CF-01..CF-12 rows exist exactly once
2. every referenced RT ID still exists in the parent RT design
3. no row changes RS2-3B path classifier semantics
4. CF-09 is visibly protected and cannot be treated as ordinary SAFE_NON_RUNTIME merely because plugin bytes stay unchanged
5. CF-12 prevents historical receipts/evidence from triggering living-state rewrites
6. fixture+CI mixed work resolves to both CF-06 and CF-09
7. runtime+release-system mixed work resolves to both CF-01 and CF-09 and is not silently bundled
8. local tooling does not imply permanent CI discovery
9. gate/dependency changes route through RT-02/RT-11 rather than automatic opening
10. no file-extension-only semantic inference is required
11. unresolved semantic impact fails closed
12. no plugin/runtime/release/CI/repository-writer behavior changes
```

No real long-chat validation is required solely for SYS-09.

---

## 16. Future automation boundary

If manual use later becomes materially expensive, a future revision may propose a reviewed machine-readable map or read-only helper.

That future work must answer separately whether it:
- consumes existing RS2-3B path labels;
- introduces its own path registry;
- runs in permanent CI;
- affects protected infrastructure routing.

Any integration that changes permanent CI/release/repository authority is `NR_PROTECTED` work and must not be smuggled into SYS-09 document application.

---

## 17. Unified classification freeze verdict

Design inspection confirms:

```text
SIZE          = MEDIUM
IMPORTANCE    = 5
DIFFICULTY    = 3
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the core value is the reviewed semantic map from change families to review obligations;
- current close-step discipline can consume the map manually;
- executable path classification already exists under protected CI authority and must not be duplicated;
- no new tool is needed to obtain the intended v1 value;
- no runtime/release/CI/repository-writer behavior changes are required.

---

## 18. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-09 here. Materialization of the living review map is a separate bounded NR_DOC_ONLY application after the active system-idea design sweep closes.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
