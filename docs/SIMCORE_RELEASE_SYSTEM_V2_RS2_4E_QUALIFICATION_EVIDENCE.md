# SimCore Release System v2 — RS2-4E Controller Qualification Evidence

Date: 2026-08-24
Status: **CONTROLLER PRIMITIVE CI VERIFIED · NON-RUNTIME**
Scope: permanent release authority binding, sandbox publish qualification, rollback rehearsal foundation
Parent design: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_PROMOTION_REAL_RELEASE_ROLLBACK_RETIREMENT.md`
Activation amendment: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_ACTIVATION_AMENDMENT.md`
PR: #221

## 1. Implemented surfaces

```text
products/simcore/tooling/release-authority.mjs
products/simcore/tooling/release-publish.mjs
products/simcore/tests/release-controller-qualification.test.mjs
products/simcore/tooling/ci/classify.mjs
products/simcore/tooling/ci/self-test.mjs
```

The permanent publisher primitive is not production-authorized by this work item.

Production mutation from this qualification work remains:

```text
release-simcore = NONE
plugins/simcore/latest.js = NONE
plugins/simcore/install.js = NONE
runtime semantics = NONE
```

## 2. Authority binding

A permanent publication candidate must be backed by a real bounded `CANDIDATE_REQUIRED` report.

The authority layer binds:

```text
profile == CANDIDATE_REQUIRED
conclusion == PASS
candidateCommit == spec.candidateCommit
expectedProductionCommit == spec.expectedProductionCommit
productionCommit == spec.expectedProductionCommit
candidateRequiredAuthority == RS2_4_RELEASE
verifierCommit == expected verifier identity
```

It then reuses the frozen release-spec/candidate checks for:

```text
direct-child C/P relationship
latest/install equality
candidate blob identity
allowed path scope
version/mode relation
rollback approved source identity
current production parent identity
```

Immutable release authorization additionally rejects a spec whose authorized bytes do not match the authorization commit or whose spec path has been rewritten after first authorization.

## 3. Publisher boundary

`release-publish.mjs` supports:

```text
dry-run
publish
```

`publish` is fail-closed and uses an ordinary non-force fast-forward push only after:

```text
exact authority binding PASS
→ production P observed
→ production P re-observed immediately before push
→ candidate C pushed
→ production ref re-read
→ observed after == C
```

No force / force-with-lease path is allowed.

## 4. Qualification matrix

The permanent CI self-test now executes the RS2-4E controller qualification harness.

Covered positive classes:

```text
E-A1 exact C/P Required PASS permits authorization
SHADOW-P2 sandbox NEW_VERSION full fast-forward publish
SHADOW-P3 sandbox SAME_VERSION_CORRECTION full fast-forward publish
ROLLBACK-R1 sandbox forward-history rollback publish
```

Covered authority-negative classes:

```text
E-A2 missing Required report blocks
E-A3 failed Required blocks
E-A4 Required for different C blocks
E-A5 production parent movement blocks
E-A6 authority marker mismatch blocks
E-A6 verifier mismatch blocks
```

Covered semantic/authorization negative classes in this harness:

```text
N1 Required failure
N2 production parent movement
N3 unauthorized candidate path
N4 latest/install divergence
N5 verifier identity mismatch
N6 mixed authorization commit
N7 release-spec mutation after authorization
N8 undeclared same-version NEW_VERSION
N9 undeclared downgrade
```

`N10 post-publish admin failure truth preservation` remains permanently covered by RS2-4D S8 in `post-publish-state-shadow.test.mjs`.

## 5. PFFL evidence — first qualification CI failure

Initial PR head:

```text
802e85211ffd473d7e6337dbd7ce2c0afec67ef4
```

SimCore CI run:

```text
32730309099
Verify 97440822456 = FAILURE
Required 97440886980 = FAILURE
reason = CI_SELF_TEST_FAIL
```

Direct cause:

```text
RS2_4E_SANDBOX_REPO_CWD_NOT_BOUND
```

The sandbox fixture created its release spec inside a temporary Git repository, but the qualification test invoked repository-root-relative publisher paths while the Node process still used the outer CI checkout as `cwd`.

Classification:

```text
FIX / HARNESS / NON_RUNTIME / DIRECT_EVIDENCE
```

This was not a publisher authority failure and caused no production mutation.

Narrow repair:

```text
bind each sandbox authority/publisher invocation to its temporary repository cwd
```

Repair commit:

```text
da8c134a1117a3cd0b5101e82512ed85e5132fb6
```

The failed CI remains durable evidence and the corrected harness is permanent regression coverage.

## 6. PFFL evidence — second qualification CI failure

Second validation head:

```text
a4005c4c51ccbfa4d8aa513833d6df237373aa3b
```

SimCore CI run:

```text
32730541048
Verify 97441624213 = FAILURE
Required 97441742592 = FAILURE
reason = CI_SELF_TEST_FAIL
```

Direct cause:

```text
RS2_4E_AUTH_NEGATIVE_TARGETED_WRONG_GATE
```

The N6 mixed-authorization negative changed `releaseName`. That mutation was semantically invalid by itself, so the frozen release-spec validator correctly failed earlier with:

```text
RELEASE_SPEC_NAME_MISMATCH
```

before the intended immutable-authorization boundary could be exercised.

Classification:

```text
FIX / TEST_ORACLE / NON_RUNTIME / DIRECT_EVIDENCE
```

This is not an authority bypass. The earlier semantic gate was stricter than the test setup expected, and production remained untouched.

Narrow repair:

```text
mutate only evidenceRefs so the release spec remains semantically valid
while its authorized bytes change
→ N6 reaches RELEASE_AUTHORIZATION_MIXED_COMMIT
→ N7 reaches RELEASE_SPEC_MUTATED_AFTER_AUTHORIZATION
```

Repair commit:

```text
cdd74346894547c7c69bcb2a1178c3f1955c35e5
```

Both failed CI runs are preserved as qualification learning evidence.

## 7. Controller primitive CI verification

Validated branch head before evidence-close update:

```text
f8e03486bc9fb90f21e070c8854af282a4513dc1
```

Permanent SimCore CI:

```text
run      32730877768
Verify   97442651173 = SUCCESS
Required 97442762842 = SUCCESS
```

The proposed verifier executed the permanent RS2-4E controller qualification harness and the stable Required aggregate accepted the result.

Verdict:

```text
exact C/P authority binding                  PASS
missing/failed/wrong-C Required negatives    PASS
parent movement negative                     PASS
authority/verifier identity negatives        PASS
P2 NEW_VERSION sandbox publish               PASS
P3 SAME_VERSION_CORRECTION sandbox publish   PASS
R1 forward-history rollback sandbox publish  PASS
N1-N9 qualification matrix                   PASS
N10 permanent owner RS2-4D S8                PRESERVED
release-simcore mutation                     NONE
runtime mutation                             NONE
```

The controller primitive is therefore CI-verified. This does **not** yet authorize production publication; repository-bound P1, rollback source qualification, admin-state repair, and production caller activation remain separate R work.

## 8. Remaining RS2-4E work

```text
repository-bound P1/current-production NOOP qualification
repository-bound rollback source plan qualification
repair current main administrative production drift
activate RS2_4_RELEASE caller authority in permanent controller
run final repository-bound qualification
mark REAL_RELEASE_READY
```

The first genuine SimCore product release remains a later, separate runtime work item and is required for final `REAL_RELEASE_LIVE_PASS` / legacy retirement / RS2-4 closure.
