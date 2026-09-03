# SimCore v0.70.3 Permanent Release Legacy Compatibility Stale Session Re-export Blocker

Date: 2026-09-03 KST

Status: **BLOCKER DIAGNOSED · VALIDATION FIX REQUIRED · RUNTIME BYTES NOT YET IMPLICATED · PRODUCTION UNCHANGED**

Classification:

`FIX · BLOCKER · VALIDATION_FIXTURE · STALE_SESSION_REEXPORT_DEPENDENCY · CANDIDATE_REQUIRED · PRODUCTION_UNCHANGED`

## 1. Trigger

Fresh append-only S7 recovery transaction:

```text
intentId = simcore-v0.70.3-intent-13
releaseId = simcore-v0.70.3-new-13
candidate commit = cd36dcdc59d019d41913b9991cabc89ba4663a9a
expected production = 861100f4771967aa5b8ab8811d06f11702c0d3ff
verifier commit = 55cffa03554961edb35f36750cdc7a091efde157
Permanent Release run = 33767783051
```

Exact approval activation accepted the delegated two-file approval/spec transaction and dispatched Permanent Release.

Permanent Required failed closed before publication.

## 2. Exact gate result

Artifact `simcore-release-required-33767783051` records:

```text
profile = CANDIDATE_REQUIRED
conclusion = FAIL
reasonCodes = [LEGACY_COMPAT_SEMANTIC_FAIL]

GATE_STATIC        = PASS
GATE_ARCH          = PASS
GATE_REGRESSION    = PASS
GATE_STATE         = PASS
GATE_COORDINATION  = PASS
GATE_LEGACY_COMPAT = FAIL
```

Candidate source identity in the report:

```text
latest SHA-256 = 9321f2e958a2341290d2f5d4bd66fca9cab7615c0f94bead29b4f64f45baa598
install SHA-256 = 9321f2e958a2341290d2f5d4bd66fca9cab7615c0f94bead29b4f64f45baa598
bytes = 573582
latest == install = YES
```

Publish and post-publish jobs were skipped. `release-simcore` remained v0.70.1.

## 3. Failing compatibility path

Current permanent verification routes the legacy gate through:

```text
products/simcore/tooling/check.mjs
→ products/simcore/tooling/ci/legacy-compat.mjs
→ scripts/simcore-06406-closure-completion-gate-test.mjs
```

The adapter is registered as `TRANSITIONAL_BOUNDED` and read-only against the supplied candidate source.

The v0.64.6 legacy script loads the Session module and later executes:

```js
const realFacts = session.inspectPreviousBEndOutput(rows, 2);
...
const badFacts = session.inspectPreviousBEndOutput(invalidRows, 2);
```

## 4. Frozen S2-2 authority

S2-2 intentionally retired exactly four dead Session re-export properties:

```text
inspectPreviousBEndOutput
validateStructure: structure.validateStructure
communityBlocks: community.communityBlocks
prepareTurn: lifecycle.prepareTurn
```

The frozen contract explicitly preserves:

```text
function inspectPreviousBEndOutput(...)
its live internal B_END call
CoreRulesetSession factory initialization
all semantic owners and runtime behavior
```

S2-2 caller proof concluded those four Session property names had zero executable consumers. The historical legacy adapter was cited only as evidence that Session factory-load success must remain valid.

The current Permanent Required failure reveals that caller proof was incomplete: fixture19 in the v0.64.6 adapter still consumes the retired `session.inspectPreviousBEndOutput` property directly.

## 5. Root cause classification

The deterministic stale dependency is:

```text
legacy adapter fixture19
→ retired Session re-export property
→ S2-2 cumulative candidate removes that property by design
→ legacy adapter cannot continue through fixture19
→ GATE_LEGACY_COMPAT reports semantic fail
```

This differs from the v0.66.0 `LEGACY_COMPAT_SEMANTIC_FAIL` incident. In v0.66.0, Session factory initialization itself was broken by a dangling runtime export identifier. Here:

```text
GATE_STATIC       PASS
GATE_ARCH         PASS
GATE_REGRESSION   PASS
GATE_STATE        PASS
GATE_COORDINATION PASS
```

and the identified dependency is a test consumer of a deliberately retired compatibility alias.

Therefore the current disposition is **validation-fixture blocker**, not runtime rollback and not authority to restore the dead Session API.

## 6. Required repair boundary

Do not restore the retired Session re-export.

Repair only the validation path so the historical B_END closure assertions no longer depend on `session.inspectPreviousBEndOutput` as a public Session property.

The repair must preserve the original semantic purpose of fixtures 19, 24 and 25:

```text
incomplete prior B_END is rejected
complete/direct prior B_END facts are accepted
terminal timestamp remains authoritative
stale Narrative floor applies
later Narrative remains already satisfied
```

Hard requirements:

```text
candidate/runtime builder semantics unchanged except only if a genuine independent runtime defect is subsequently proven
no Session re-export restoration
no weakening/removal of B_END closure assertions
no source-file mutation by the legacy adapter
legacy adapter remains bounded/read-only
latest/install candidate identity remains an immutable failed new-13 history item
```

## 7. Recovery sequence

Because Permanent Release already failed for immutable `new-13`, do not rerun it as a repaired publication transaction.

Required sequence:

1. merge this blocker evidence to `main`;
2. implement the validation fixture repair on a separate work branch;
3. run permanent SimCore CI and direct legacy compatibility regression against the current production baseline plus deterministic S7 candidate materialization;
4. merge the validation FIX only after fresh Verify + Required PASS;
5. start a fresh append-only S7 candidate transaction using the next unused intent/release IDs;
6. materialize a fresh immutable candidate from the unchanged S7 runtime builder;
7. create a fresh exact two-file approval/spec transaction;
8. require all Candidate Required gates including `GATE_LEGACY_COMPAT` to PASS;
9. only then publish to `release-simcore`;
10. verify latest/install equality and exact production identity before S7 real-long-chat validation.

## 8. Safety state

```text
v0.70.3 runtime publication = NONE
release-simcore = v0.70.1 unchanged
failed immutable transaction = intent-13 / new-13
failed candidate = cd36dcdc59d019d41913b9991cabc89ba4663a9a
classification = FIX · BLOCKER · VALIDATION_FIXTURE
```

No HUMAN_EVIDENCE or S7 live verdict is inferred or modified by this blocker record.
