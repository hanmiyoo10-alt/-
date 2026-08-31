# SimCore CI Builder Path Classification Gap Repair Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · SEPARATE REPOSITORY-SYSTEM REPAIR · NON_RUNTIME**
Classification: **SIMCORE CI / PATH CLASSIFICATION / S2-3 BLOCKER RECOVERY**

## 1. Trigger

S2-3 final request-free PR CI exposed a classification gap after its temporary candidate request was correctly removed.

Observed request-free head:

```text
a23d13189a5f4efb3f78c171a87f06b502ecfa90
```

Observed SimCore CI:

```text
run = 33359203332
Verify job = 99387192584
job conclusion = SUCCESS
verifier conclusion = NOOP
reason = NOOP_SIMCORE_DOC_ONLY
```

The PR diff contained the S2-3 cumulative builder:

```text
products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py
```

but `classify.mjs` assigned that path no label. Accompanying SimCore documentation therefore made the entire PR appear `SIMCORE_DOC_ONLY`, so the required request-free validation gates were not exercised.

Preserved blocker authority:

`docs/SIMCORE_S2_3_FINAL_CI_BLOCKER_02_BUILDER_PATH_CLASSIFICATION_GAP_2026-08-31.md`

## 2. Problem statement

Current classifier behavior distinguishes selected exact builder paths and `test-*.mjs`, but it does not classify the general SimCore candidate-builder family:

```text
products/simcore/tooling/build-*.py
```

These builders are executable validation/release-construction inputs. A PR changing one must not become doc-only merely because no candidate request is present.

The defect is classification only. It does not indicate a runtime regression.

## 3. Frozen repair scope

Allowed delta:

```text
products/simcore/tooling/ci/classify.mjs
+ bounded classifier regression test/fixture only if an existing appropriate test surface exists or a small dedicated test is required
+ implementation evidence for this repair
```

Required semantic rule:

```text
products/simcore/tooling/build-*.py
-> CI_SELF + HARNESS
```

This matches the existing classification posture of explicitly listed active SimCore builders such as:

```text
build-06407-reload-cache-continuity.py
build-06800-community-parent-local-alias-classification-repair.py
```

The rule is intentionally restricted to direct files under `products/simcore/tooling/` whose basename begins `build-` and ends `.py`.

## 4. Explicit non-goals

Do not change:

```text
runtime plugin bytes
release-simcore
candidate materialization semantics
release approval semantics
release publication semantics
state convergence
branch protection
workflow trigger topology
GATE planning rules
S2-3 builder runtime delta
v0.70.2 cache design
```

Do not broadly classify every `products/simcore/tooling/*` file. The repair is only for the established builder family.

## 5. Before / after

Before:

```text
build-s2-3-runtime-utility-dead-exports.py -> []
S2-3 docs -> [SIMCORE_DOC_ONLY]
overall -> [SIMCORE_DOC_ONLY]
docOnly -> true
```

After:

```text
build-s2-3-runtime-utility-dead-exports.py -> [CI_SELF, HARNESS]
S2-3 docs -> [SIMCORE_DOC_ONLY]
overall -> [CI_SELF, HARNESS, SIMCORE_DOC_ONLY]
docOnly -> false
```

The existing check planner then decides the exact applicable gates under the existing policy. This repair does not add or bypass a gate.

## 6. Compatibility expectations

Preserve current classification for:

```text
unrelated repository files
SimCore docs-only PRs
SimCore releases paths
SimCore tests paths
architecture contracts
state-sync paths
legacy verification workflows/scripts
shared-main coordination paths
```

Existing exact builder entries may remain for backward compatibility. The new family rule simply closes the gap for current/future direct `build-*.py` files.

## 7. Static verification contract

At minimum verify:

```text
classifyPath('products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py')
= [CI_SELF, HARNESS]

classifyPaths([
  'docs/SIMCORE_S2_3_RUNTIME_UTILITY_DEAD_EXPORTS_IMPLEMENTATION_EVIDENCE_2026-08-31.md',
  'products/simcore/tooling/build-s2-3-runtime-utility-dead-exports.py'
]).docOnly
= false
```

Also verify a non-builder tooling path that was previously unrelated does not become classified merely because it lives under `products/simcore/tooling/`.

Run:

```text
node --check products/simcore/tooling/ci/classify.mjs
classifier regression test
SimCore CI self-validation
```

## 8. Acceptance criterion

The repair is accepted only when:

```text
1. classifier regression proof passes
2. SimCore CI self-change lane passes
3. repair merges independently to main
4. release-simcore remains v0.70.1 unchanged
5. PR #1022 is retriggered request-free against repaired main
6. PR #1022 no longer resolves to NOOP_SIMCORE_DOC_ONLY
7. substantive required final validation runs and passes before S2-3 merge
```

## 9. Rollback condition

Rollback or stop if the rule:

```text
widens classification beyond direct build-*.py files
changes gate planning policy rather than path classification
creates release/candidate state
changes production runtime bytes
causes unrelated repository tooling to become SimCore release-relevant
```

## 10. Final disposition

```text
DESIGN = FROZEN
ROOT_CAUSE = SIMCORE_BUILDER_PATH_CLASSIFICATION_GAP
REPAIR = DIRECT products/simcore/tooling/build-*.py -> CI_SELF + HARNESS
TRANSACTION = SEPARATE NON_RUNTIME CI REPAIR
S2_3 = BLOCKED UNTIL REPAIR LANDS AND REQUEST_FREE CI IS RE-RUN
PRODUCTION = v0.70.1 UNCHANGED
```
