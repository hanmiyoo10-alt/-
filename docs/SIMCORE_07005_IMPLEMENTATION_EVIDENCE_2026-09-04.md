# SimCore v0.70.5 Implementation Evidence — 2026-09-04

Date: 2026-09-04 KST
Status: **IMPLEMENTED · PR CI PASS · RELEASE NOT YET PUBLISHED**
Classification: **SIMCORE · v0.70.5 · MANUAL EDIT COMMIT BOUNDARY ATTRIBUTION · OBSERVABILITY ONLY**

## 1. Authority chain

This implementation follows the frozen design and post-predecessor implementation authorization:

- `docs/SIMCORE_07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_DESIGN_2026-09-04.md`
- `docs/SIMCORE_07005_MANUAL_EDIT_COMMIT_BOUNDARY_ATTRIBUTION_IMPACT_SCOPE_2026-09-04.md`
- `docs/SIMCORE_07005_IMPLEMENTATION_AUTHORIZATION_2026-09-04.md`

The predecessor v0.70.4 release was durably closed through accepted HUMAN_EVIDENCE before implementation began.

```text
v0.70.4 validation = LIVE_PASS
v0.70.4 lifecycle = REAL_RELEASE_LIVE_PASS
terminal convergence main commit = f561c64b732555384f01a105023c04ed1dd34121
implementation authorization main commit = 1e721e5c10abe75659e84770bd19ba970a427c4c
```

Fresh preflight confirmed that the frozen v0.70.5 source mapping remained valid against exact `release-simcore` v0.70.4 production.

## 2. Exact implementation branch

```text
branch = impl/simcore-v07005-manual-edit-commit-boundary-attribution
PR = #1463
base = 1e721e5c10abe75659e84770bd19ba970a427c4c
last clean verified implementation head before this evidence record = 95f56ea9249111883c9c599912ce56b7dff52e4e
production parent = df282f18a0035b03be30af8d0ee2174f58b3bcd3
production version = 0.70.4
production blob = 7cf830bd6c48f706e97f116f019144bf280e301c
```

No direct production plugin file is edited by this PR. Candidate bytes are built from exact deployed v0.70.4 only during verification/release materialization.

## 3. Bounded implementation surface

Added:

```text
products/simcore/tooling/build-07005-manual-edit-commit-boundary-attribution.py
products/simcore/tests/suites/builder-v07005.test.mjs
products/simcore/tests/fixtures/builder-v07005/basic.json
products/simcore/releases/validation-profiles/0.70.5.json
```

Updated:

```text
products/simcore/tests/registry.mjs
```

The builder changes the production-derived candidate only at the already-authorized v0.70.5 surfaces:

1. release identity `0.70.4 -> 0.70.5` and operator release card;
2. genuine-manual-edit attribution composition reads existing `saveMetric.serializeMs`, `saveMetric.setMs`, and `saveMetric.pruneMs` as bounded scalars;
3. diagnostic projection carries those three values plus existing aggregate total;
4. one genuine-manual-edit-only `Manual edit commit:` line is rendered.

## 4. Store boundary remains frozen

The builder permanently asserts that the complete `store` module remains byte-identical to v0.70.4.

Therefore this implementation adds:

```text
new Store timer reads = 0
new Store calls = 0
backend.set changes = 0
_prune policy changes = 0
retention changes = 0
persistent schema changes = 0
raw-body retention changes = 0
history scans = 0
network/storage/chat operations = 0
new require edges = 0
```

Store remains the sole measurement owner for:

```text
serializeMs
setMs
pruneMs
```

Edit Reconcile only projects those already-measured scalars.

## 5. Attribution semantics

For genuine manual rebuilds:

```text
commitSerializeMs = existing saveMetric.serializeMs when known non-negative, else null
commitSetMs = existing saveMetric.setMs when known non-negative, else null
commitPruneMs = existing saveMetric.pruneMs when known non-negative, else null
commitMs = exact sum only when all three components are known
commitConfidence = EXACT only when all three existing component metrics are known; otherwise BOUNDED
```

The pre-existing overall rebuild attribution remains conservative and `BOUNDED`.

Diagnostic rendering preserves:

```text
unknown component -> n/a
known measured zero -> 0.0 ms
ordinary SAME_FAST -> no manual attribution line
representation-fast path -> no manual attribution line
```

No behavioral optimization is introduced.

## 6. Frozen correctness markers

The executable regression and builder preserve cardinality/markers for:

```text
USER_EDIT_CANDIDATE
MANUAL_EDIT_REBUILT
REPRESENTATION_FAST_RECONCILED
PROMPT_COMPILER_VERSION = 4
COMMUNITY_CLASSIFIER_VERSION = 3
STATE_VERSION = 5
CORE_STATE_VERSION = 10
```

The genuine edit fixture verifies snapshot save remains exactly once. The SAME_FAST fixture verifies the ordinary exact carryover path does not read snapshots and carries no manual component attribution.

## 7. First regression failure and repair

The first implementation CI run exposed a test-harness accounting mismatch, not a runtime defect.

Preserved evidence:

- `docs/SIMCORE_07005_IMPLEMENTATION_REGRESSION_FAILURE_01_MANUAL_ATTRIBUTION_FIXTURE_2026-09-04.md`

First run:

```text
SimCore CI = 33832017307
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = FAIL
reason = PERMANENT_REGRESSION_FAIL
assertion = builder-v07005: manual edit attribution present
```

Root cause:

```text
fixture declared synthetic Store work = 7.5 ms
stubbed store.save wall time ≈ 0 ms
existing conservative rebuild closure guard correctly rejected impossible accounting
```

Repair was fixture-only: synthetic non-zero Store metrics now consume corresponding synthetic wall time before metric publication. Runtime builder semantics were not changed by this repair.

Classification remained:

```text
FIX / BLOCKER / TEST FIXTURE / NON_RUNTIME / PRODUCTION UNCHANGED
```

## 8. Clean verification after repair

Exact repaired implementation head:

```text
95f56ea9249111883c9c599912ce56b7dff52e4e
```

SimCore CI:

```text
run = 33832259014
Verify = PASS
Required = PASS
GATE_CI_SELF = PASS
GATE_STATIC = PASS
GATE_ARCH = PASS
GATE_REGRESSION = PASS
production commit = df282f18a0035b03be30af8d0ee2174f58b3bcd3
PR base = 1e721e5c10abe75659e84770bd19ba970a427c4c
PR head = 95f56ea9249111883c9c599912ce56b7dff52e4e
```

Plugin Control Plane PR observation on the same head also succeeded.

The executable v0.70.5 regression proves:

```text
production-derived builder PASS
latest.js == install.js in generated candidate
metadata/runtime/Host identity = 0.70.5
Store module byte-preserved
module inventory/order unchanged
Edit Reconcile require graph unchanged
forbidden side-effect marker counts unchanged
complete existing Store metrics retain distinct values
commit total closes exactly to serialize + set + prune
known zero remains zero
unknown component remains null/n/a
manual-edit save cardinality remains exactly one
SAME_FAST remains branch-only with no manual component attribution
```

## 9. Release boundary

At this implementation-evidence point:

```text
PRODUCTION = v0.70.4 UNCHANGED
release-simcore = UNCHANGED
production latest.js/install.js = UNCHANGED
v0.70.5 publication = NOT YET PERFORMED
behavioral optimization = HOLD
provider cache = UNVERIFIED
```

## 10. Next transaction

After this evidence record is part of an exact-head PR that again passes SimCore `Verify` and `Required`:

```text
merge implementation PR to main
→ create exact v0.70.5 candidate request from current production
→ Candidate Required / validation profile qualification
→ immutable candidate materialization
→ exact approval package
→ Permanent Release
→ direct release-simcore readback + latest.js == install.js proof
→ v0.70.5 REAL-LONG-CHAT HUMAN_EVIDENCE gate
```

No release-system redesign is authorized or required by this implementation.
