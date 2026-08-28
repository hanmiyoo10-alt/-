# SimCore v0.66.0 Runtime FIX01 — Session Recovery Export Evidence

Date: 2026-08-29 KST

Status:

`IMPLEMENTED ON WORK BRANCH · PR/EXACT-PRODUCTION VALIDATION PENDING · PRODUCTION UNCHANGED`

Classification:

`FIX · BLOCKER · RUNTIME · DANGLING_SESSION_RECOVERY_EXPORT`

Root-cause authority:

`docs/SIMCORE_06600_PERMANENT_RELEASE_LEGACY_COMPAT_BLOCKER_2026-08-29.md`

Failed immutable transaction:

```text
release = simcore-v0.66.0-new-02
intent = simcore-v0.66.0-intent-02
candidate C = ea88eecb4428a42682894c96980bef420b0a0d27
candidate runtime SHA-256 = af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
Permanent Release run = 33203691741
failure = LEGACY_COMPAT_SEMANTIC_FAIL
publication = NONE
```

## 1. Repair shape

The failed `new-02` builder is preserved as immutable provenance:

`products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion.py`

Raw file-byte SHA-256 required by FIX01:

`ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50`

FIX01 is append-only:

`products/simcore/tooling/build-06600-m2-4-session-runtime-mirror-boundary-completion-fix01.py`

It runs the frozen failed builder first, then applies exactly one runtime repair inside the generated Session module:

```diff
   prepareTurn: lifecycle.prepareTurn,
-  recovery,
 };
```

The standalone `SimCore.define("recovery", ...)` compatibility facade is not removed or weakened.

## 2. Why re-adding Session Recovery is forbidden

M2-4 explicitly retired Session runtime ownership through Recovery. Re-introducing:

```js
const recovery = require('./recovery');
```

would hide the ReferenceError but regress the physical ownership milestone.

FIX01 therefore requires all of the following simultaneously:

```text
Session require('./recovery') = ABSENT
Session recovery.* calls       = ABSENT
Session dangling recovery export = ABSENT
standalone Recovery module     = PRESENT
Recovery compatibility surface = PRESENT
```

## 3. Builder-local regression fence

FIX01 must fail closed unless the exact failed builder raw identity is present.

After generation it must verify:

- metadata/runtime/host version remains 0.66.0;
- latest.js and install.js are byte-identical;
- Session has no Recovery runtime dependency/call/export residue;
- standalone Recovery facade still exposes representative Output Compat and Bootstrap Migration compatibility functions;
- `node --check` passes on both generated files;
- `scripts/simcore-06406-closure-completion-gate-test.mjs` passes against both generated files.

The last item is the exact legacy adapter family that blocked Permanent Required, so the repaired builder cannot reproduce the same dangling-export defect silently.

## 4. Acceptance sequence

Before any publication:

1. permanent PR CI on this runtime FIX branch;
2. merge FIX01 builder/evidence to main only if PR CI passes;
3. create fresh append-only `intent-03 / new-03` candidate request using FIX01 builder;
4. require PR1 dry qualification to execute FIX01 against exact current production parent;
5. Generic Candidate must materialize a **new** immutable candidate commit/blob;
6. Candidate Required full baseline, including legacy compatibility, must pass;
7. only then may the permanent publisher mutate `release-simcore`;
8. verify latest/install exact identity and v0.66.0 header after publication;
9. real long-chat human validation remains required before final closure.

If repository policy shows `intent-03/new-03` is already occupied, use the next unused append-only pair. Do not reuse `intent-02/new-02`.

## 5. Safety

```text
production version = 0.65.0
release-simcore commit = c6659296c68b4322d0ed43f7d8a3339e57f1cbf1
current branch production mutation = NONE
failed candidate rewrite = FORBIDDEN
failed approval rewrite = FORBIDDEN
```
