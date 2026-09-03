# SimCore v0.70.3 Legacy Compatibility Stale Session Re-export Fix Evidence

Date: 2026-09-03 KST

Status: **FIX IMPLEMENTED · TARGETED S7 QUALIFICATION PASS · PERMANENT PR CI PENDING · PRODUCTION UNCHANGED**

Classification:

`FIX · VALIDATION_FIXTURE · STALE_SESSION_REEXPORT_DEPENDENCY · RUNTIME UNCHANGED`

## 1. Authority

This FIX follows:

- `docs/SIMCORE_07003_PERMANENT_RELEASE_LEGACY_COMPAT_STALE_SESSION_REEXPORT_BLOCKER_2026-09-03.md`
- `docs/SIMCORE_S2_2_SESSION_DEAD_REEXPORT_SURFACE_RETIREMENT_DESIGN_2026-08-31.md`
- `docs/SIMCORE_S2_2_SESSION_DEAD_REEXPORTS_IMPLEMENTATION_EVIDENCE_2026-08-31.md`

Production authority remains:

```text
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
version = 0.70.1
name = Cold First-Turn Tail Attribution
```

The failed immutable S7 release transaction remains:

```text
intentId = simcore-v0.70.3-intent-13
releaseId = simcore-v0.70.3-new-13
candidate = cd36dcdc59d019d41913b9991cabc89ba4663a9a
Permanent Release run = 33767783051
failure = LEGACY_COMPAT_SEMANTIC_FAIL
publication = NONE
```

## 2. Exact FIX

Changed only:

`scripts/simcore-06406-closure-completion-gate-test.mjs`

The legacy fixture now resolves the previous-B_END inspector with a bounded compatibility bridge:

```text
if Session.inspectPreviousBEndOutput is still exported
  → use the existing exported function unchanged
else
  → read the exact Session module source
  → require the preserved private declaration
     function inspectPreviousBEndOutput(historyMessages, sendIndex)
  → require the preserved class boundary
     class CoreRulesetSession
  → evaluate that exact declaration only with its existing Kernel / Time / Structure dependencies
  → execute fixtures 19 / 24 / 25 through the exact private implementation
```

The test does not add, restore, patch, rename or mutate any runtime Session export.

The candidate source file is read-only. No runtime source transformation is performed.

## 3. Why this preserves the legacy assertion

The old adapter called:

```js
session.inspectPreviousBEndOutput(...)
```

That tested the helper through a Session re-export which S2-2 intentionally retired.

The repaired adapter still tests the **same helper implementation from the source under test**. It does not replace the helper with a duplicated test implementation and does not weaken fixture 19, 24 or 25.

Therefore these semantic checks remain executable:

```text
fixture 19
  malformed/incomplete prior B_END → closureComplete false
  complete prior B_END → Structure clean + explicit terminal + closureComplete true

fixture 24
  real complete/direct facts + matching stored terminal + stale Narrative → APPLIED

fixture 25
  same complete/direct facts + later Narrative → ALREADY_SATISFIED
```

If the private helper disappears, its exact declaration changes location outside the preserved Session boundary, or cannot be evaluated with the frozen dependency set, the adapter fails closed.

## 4. Targeted branch-only qualification

A temporary branch-only workflow was used solely to prove both compatibility sides before the permanent FIX PR.

Workflow:

`SimCore v0.70.3 legacy compat fix qualification`

Run:

`33769639993`

Result:

`SUCCESS`

Passing ordered steps:

```text
Checkout validation fix authority                  PASS
Set up Node 22                                    PASS
Set up Python 3.12                                PASS
Fetch exact production authority                  PASS
Materialize production into isolated temp root    PASS
Prove legacy adapter still passes exact production PASS
Materialize deterministic S7 candidate in temp root PASS
Prove retired-export fallback against S7 bytes    PASS
Assert no repository runtime mutation             PASS
```

Qualification mechanics:

1. fetched exact `release-simcore` commit `861100f4771967aa5b8ab8811d06f11702c0d3ff`;
2. copied production latest/install into an isolated runner temp root;
3. ran the repaired legacy adapter against exact v0.70.1 production;
4. ran `products/simcore/tooling/build-s7-post-m2-simplification-convergence.py` only inside that temp root;
5. confirmed generated version `0.70.3` and latest/install equality;
6. ran the repaired legacy adapter against those generated S7 bytes;
7. confirmed no repository plugin runtime mutation.

The qualification workflow is temporary scaffolding and must be deleted from the work branch before the permanent FIX PR is merged.

## 5. Scope guard

This FIX does **not** change:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
S7 runtime builder
S7 runtime semantics
Prompt bytes / Prompt Cache ABI
Session public runtime surface
Structure / Lifecycle / Time semantics
persistent state/schema
provider/cache claims
release-simcore
release controller / activation / publication architecture
```

It also does not reinterpret `new-13` as releasable. That transaction remains immutable failed history.

## 6. Required closure

Before starting a fresh append-only S7 release transaction:

```text
temporary qualification workflow = REMOVED
permanent FIX PR Verify = PASS
permanent FIX PR Required = PASS
FIX PR = merged main
post-merge main health = PASS or any supersession separately classified
release-simcore = still v0.70.1
```

Then use the next unused intent/release IDs, materialize a fresh immutable S7 candidate, perform a fresh exact two-file approval/spec transaction, and require Permanent Required including `GATE_LEGACY_COMPAT` to pass before publication.

No HUMAN_EVIDENCE or S7 live verdict is inferred by this FIX.
