# SimCore Release System v2 — RS2-1B Permanent Test Harness Contract

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Parent plan: `docs/SIMCORE_RELEASE_SYSTEM_V2_PLAN.md`
Parent inventory: `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_1A_FIXTURE_INVENTORY.md`
Phase: `RS2-1 — Durable Tests`
Subphase: `RS2-1B — Permanent Test Harness Contract`
Authority class: release-infrastructure design / permanent test execution contract

## 1. Purpose

RS2-1B defines how permanent SimCore regression fixtures are executed while production remains a single installable bundle.

The harness must preserve the current evidence-driven safety model and must not become a second release engine.

This phase freezes:

- source-input contract;
- fixture-file contract;
- module/function extraction contract;
- test registry and execution order;
- isolation and deterministic-environment rules;
- baseline/candidate comparison model;
- PASS/FAIL/error semantics;
- bounded result/report schema;
- capability/stub rules;
- failure-closed behavior;
- exact boundary between permanent tests and later permanent CI/release workflow.

This phase does **not** implement the harness, migrate Batch A fixtures, create permanent CI, change `release-simcore`, change `product-manifest.json`, or change SimCore runtime behavior.

---

## 2. Evidence from the current release process

Two existing patterns are explicitly preserved as inputs to this design.

### 2.1 Current one-shot fixture pattern

The v0.64.5 release workflow already demonstrated that a scoped test can:

```text
read the current single-file bundle
→ extract a bounded Community helper
→ extract the bounded Reaction inspector
→ execute the historical v0.64.4 physical-line framing control
→ reproduce MISSING ×5
→ execute the v0.64.5 logical-unit framing
→ PASS
→ retain malformed negative controls
```

This proves permanent tests do not require immediate source modularization.

### 2.2 Current production-materialization pattern

The existing architecture-contract workflow already uses the safe outer pattern:

```text
workflow resolves release-simcore
→ materializes production latest/install into temporary files
→ validates syntax + identity
→ passes local file paths to a read-only checker
```

RS2-1B keeps that separation.

The permanent harness itself must not fetch GitHub refs, mutate branches, patch source, deploy production, update the manifest, or write release state.

---

## 3. Core boundary

The permanent test system is divided into three layers.

```text
ORCHESTRATOR / WORKFLOW
- resolves repository refs
- materializes source files
- decides production vs candidate paths
- owns GitHub permissions and CI wiring

PERMANENT TEST HARNESS
- receives local file paths only
- loads fixture registry
- extracts bounded SimCore modules/functions
- creates deterministic test contexts
- executes assertions
- emits bounded results

SIMCORE SOURCE UNDER TEST
- read-only input
- never patched or rewritten by the harness
```

This boundary is mandatory.

A permanent fixture must never depend on the harness secretly editing the source to create the expected result.

---

## 4. Target repository layout

RS2-1B freezes the following directional layout for the first implementation.

```text
products/simcore/
  tests/
    registry.mjs
    suites/
      representation-fast.test.mjs
      genuine-edit.test.mjs
      community-reaction.test.mjs
      broadcast-closure.test.mjs
      diagnostic-copy.test.mjs
    fixtures/
      representation-fast/
      genuine-edit/
      community-reaction/
      broadcast-closure/
      diagnostic-copy/
    schema/
      fixture-v1.schema.json
  tooling/
    test.mjs
    bundle-loader.mjs
    test-context.mjs
    assertions.mjs
```

This layout does not require moving the production source.

During RS2-1 the source under test remains:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

or temporary copies materialized from `release-simcore`.

Development-source modularization remains RS2-5 and must not be pulled forward by the test harness.

---

## 5. Runner interface

The permanent entry point is conceptually frozen as:

```text
node products/simcore/tooling/test.mjs ...
```

Exact CLI parsing implementation is deferred to RS2-1 implementation, but these invocation contracts are frozen.

### 5.1 Single-source mode

```text
node products/simcore/tooling/test.mjs \
  --source <path> \
  --suite <suite-or-pack>
```

Use for ordinary regression validation of one candidate or one materialized production bundle.

### 5.2 Differential mode

```text
node products/simcore/tooling/test.mjs \
  --baseline <path> \
  --candidate <path> \
  --suite <suite-or-pack> \
  --mode differential
```

Use only when a fixture migration or intentional behavioral change needs explicit baseline/candidate attribution.

Differential mode is not required for every normal release after the permanent fixture becomes established.

### 5.3 Report mode

The harness may optionally accept:

```text
--report <path>
```

The report must contain bounded machine-readable results only. It must not contain full raw long-chat responses, complete diagnostic reports, arbitrary exception stacks, or production secrets.

### 5.4 No ref resolution inside the harness

The following are forbidden harness arguments:

```text
--github-ref
--branch
--commit-to
--deploy
--release
--manifest-write
```

Ref resolution belongs to later CI/release orchestration, not to the test runner.

---

## 6. Source input contract

The harness receives immutable local source paths.

For a normal single-source run:

```text
sourcePath
sourceBytes
sourceSha256
```

are computed locally and remain read-only.

The harness may report the SHA-256 and byte length for attribution but must never rewrite the input file.

### 6.1 Canonical single-bundle test input

Behavioral suites test one canonical bundle source at a time, normally `latest.js` or a temporary copy of it.

`latest.js === install.js` is a separate permanent artifact-identity contract and must not require every behavioral suite to execute twice.

### 6.2 Source syntax responsibility

Permanent CI will run JavaScript syntax validation separately.

The harness may perform a parse/preflight as needed for safe extraction, but syntax validation remains an explicit outer static gate rather than a hidden side effect of one behavioral suite.

### 6.3 Source provenance

The harness report may include a caller-supplied label such as:

```text
production
candidate
baseline
```

but the label is descriptive only. The harness does not decide whether a file is truly deployed production.

That authority remains outside the harness.

---

## 7. Bundle extraction contract

The first permanent harness must work against the existing single-file `SimCore.define(...)` bundle without executing the outer runtime shell.

### 7.1 Extraction unit

The loader recognizes bounded internal module definitions of the form:

```js
SimCore.define("module-name", function (require, module, exports) {
  ...
});
```

The loader builds an in-memory registry of module factories from these internal definitions.

### 7.2 Outer runtime execution is forbidden

The harness must **not** execute:

- plugin bootstrap IIFE;
- PocketRisu host hooks;
- runtime request hooks;
- output commit hooks;
- production storage/network paths;
- release/update logic.

If a test cannot be expressed without booting the real outer runtime, it does not silently bypass this restriction. It must be classified for a later integration-harness design.

### 7.3 Fail closed on extraction ambiguity

If a requested module cannot be uniquely extracted, the result is:

```text
HARNESS_ERROR / MODULE_EXTRACTION_FAILED
```

The harness must not fall back to executing the entire plugin.

### 7.4 Dependency resolution

The loader may execute an extracted module factory only through a test-owned CommonJS-style resolver.

Rules:

```text
requested module must exist exactly once
required internal dependency must exist exactly once
module cache is test-context local
unknown dependency = fail closed
host dependency = deny unless an explicit deterministic stub is injected
```

### 7.5 No textual patching for ordinary tests

Permanent tests must not modify extracted function bodies before execution.

Historical algorithm controls may exist as explicit reference functions inside a test suite, but they are separate test code and must be named as historical/reference logic.

They must never masquerade as the current source under test.

---

## 8. Execution isolation

Every fixture execution starts from a clean deterministic context.

Initial implementation rule:

```text
fresh module registry/cache per fixture
fresh stub state per fixture
no mutable state shared between fixtures
```

This is intentionally conservative even if suite-level reuse would be faster.

Correctness attribution is more important than test throughput in RS2-1.

Parallel fixture execution is not part of the first harness. Any later parallelization requires a separate proof that isolation and ordering do not change results.

---

## 9. Deterministic environment contract

Permanent regression results must not depend on real external state.

Default harness context provides only deterministic JavaScript facilities needed by the extracted pure modules.

The following are absent/denied by default:

```text
real pluginStorage
real setChat
real fetch
real clipboard
real DOM
real setInterval
real setTimeout
real repository/network access
```

A suite that needs one of these behaviors must inject a named deterministic test capability.

Examples:

```text
clipboard stub
document/textarea stub
storage adapter stub
clock value stub
```

The stub exists only inside the fixture context and must expose bounded observable calls for assertions.

No permanent test is allowed to contact a real provider or host merely because a source path references that API.

---

## 10. Capability injection contract

Capabilities are deny-by-default.

A suite may request only a named capability registered by the harness.

Conceptual shape:

```js
createTestContext({
  capabilities: ['clipboard', 'dom']
})
```

The exact JavaScript API is deferred, but these rules are frozen:

1. capability names are enumerable and centrally registered;
2. a suite cannot access undeclared host globals;
3. capabilities are deterministic stubs, never passthroughs to real host APIs;
4. every capability resets between fixtures;
5. observed calls are bounded counters/arguments required for assertions;
6. raw long-chat payload retention is prohibited.

Diagnostic Copy is the primary Batch A consumer of explicit clipboard/DOM stubs.

---

## 11. Fixture file contract

Fixture files are declarative data, not executable JavaScript.

Initial file type:

```text
*.fixture.json
```

Executable assertion logic lives in `*.test.mjs` suite files.

This prevents a captured fixture from becoming arbitrary code merely because it was imported by CI.

### 11.1 Common fixture envelope

The first implementation must support a common envelope equivalent to:

```json
{
  "fixtureVersion": 1,
  "meta": {
    "id": "community-reaction.multiline-bilingual-valid",
    "subsystem": "community-reaction",
    "evidenceClass": "CAPTURED_SHAPE",
    "introducedBy": "0.64.5",
    "sourceEvidence": "docs/SIMCORE_LIVE_06404_REACTION_ATTRIBUTION.md",
    "contract": "logical comment/reply unit owns reaction-tail validation scope",
    "negativeControl": false,
    "retirementPolicy": "explicit-contract-change-only"
  },
  "input": {},
  "expected": {}
}
```

`input` and `expected` are subsystem-specific bounded objects validated by the owning suite.

The common schema does not attempt to invent one giant universal DSL for every SimCore subsystem.

### 11.2 Required common fields

The RS2-1A semantic metadata remains mandatory:

```text
id
subsystem
evidenceClass
introducedBy
sourceEvidence when available
contract
negativeControl
retirementPolicy
expected outcome represented in bounded form
```

### 11.3 Exact-one evidence class clarification

RS2-1A requires `evidenceClass` to contain exactly one class, while some inventory descriptions use combined prose such as `GOLDEN_CONTRACT + CAPTURED_SHAPE`.

RS2-1B resolves that execution metadata ambiguity explicitly:

- `evidenceClass` remains exactly one primary origin class;
- a fixture derived from a live bounded shape uses `CAPTURED_SHAPE` even when it protects a golden behavior;
- a purely synthetic fixture uses `SYNTHETIC`;
- `GOLDEN_CONTRACT` is used when the fixture itself represents the durable validated contract rather than a captured incident shape;
- suite/registry metadata may separately mark a fixture as a required golden release gate without changing `evidenceClass` into an array.

No fixture may encode `evidenceClass` as multiple values.

### 11.4 Raw data prohibition

Fixture JSON must not contain:

- complete long-chat transcripts;
- complete user histories;
- unbounded copied diagnostics;
- unrelated private/user prose;
- host credentials or secrets;
- production manifest identity copied manually as test input unless identity itself is the contract under test.

Captured live cases are reduced to the minimum structural shape necessary for the deterministic assertion.

---

## 12. Suite contract

Each stable subsystem owns one suite module.

Examples:

```text
representation-fast.test.mjs
genuine-edit.test.mjs
community-reaction.test.mjs
broadcast-closure.test.mjs
diagnostic-copy.test.mjs
```

A suite is responsible for:

1. declaring its stable suite ID;
2. declaring required internal SimCore modules/functions;
3. declaring required deterministic capabilities;
4. validating its subsystem-specific fixture `input` and `expected` objects;
5. executing assertions through harness primitives;
6. returning bounded result codes;
7. never resolving repository refs or writing source files.

Suite files may contain reference assertion logic but must not contain release/deployment automation.

---

## 13. Registry contract

Automatic filesystem globbing is not authoritative in the first permanent harness.

Use an explicit static registry:

```text
products/simcore/tests/registry.mjs
```

Conceptually:

```text
batch-a
  representation-fast
  genuine-edit
  community-reaction
  broadcast-closure
  diagnostic-copy
```

Benefits:

- deterministic suite order;
- reviewable additions/removals;
- no accidental test activation from stray files;
- explicit permanent-pack membership.

A fixture file not referenced by its owning suite is not silently considered an active release gate.

A suite cannot disappear from a permanent pack without an explicit registry diff and retirement evidence.

---

## 14. Execution order

Initial order is deterministic and serial.

Within a pack:

```text
registry order
→ suite order
→ fixture ID lexical order inside the suite
```

The result must not depend on directory enumeration order.

A failed fixture does not authorize mutation or repair. The runner may continue to collect bounded failures from the remaining fixtures, but final status is fail closed.

For harness/infrastructure errors that make later results untrustworthy, the runner may abort immediately with `HARNESS_ERROR`.

---

## 15. Assertion model

Permanent tests report semantic outcomes rather than matching arbitrary console prose.

Preferred assertion forms:

```text
exact enum/result code
exact boolean/state field
exact bounded call count
exact fingerprint relation
exact state-transition reason
exact structure cardinality
exact artifact hash/identity where that is the contract
```

Avoid fragile full-output string snapshots unless the exact byte representation is itself the protected contract.

Human-readable diagnostic wording may have explicit fixtures only when wording compatibility is intentionally frozen.

---

## 16. Result state model

Every fixture execution ends in exactly one runner outcome:

```text
PASS
FAIL
HARNESS_ERROR
```

`SKIP` is not a normal permanent-gate outcome in RS2-1.

If a registered fixture cannot run because a required module or fixture field is missing, that is not success; it is `HARNESS_ERROR`.

### 16.1 `PASS`

All expected semantic assertions for the fixture are satisfied.

### 16.2 `FAIL`

The harness executed successfully, but the source behavior violates the expected contract.

Examples:

```text
expected REPRESENTATION_FAST_RECONCILED, got MANUAL_EDIT_REBUILT
expected MISSING, got PASS
expected one builder call, got two
```

### 16.3 `HARNESS_ERROR`

The test result is not trustworthy because execution infrastructure failed.

Bounded reasons include:

```text
INVALID_FIXTURE
DUPLICATE_FIXTURE_ID
UNKNOWN_SUITE
MODULE_EXTRACTION_FAILED
UNKNOWN_DEPENDENCY
UNDECLARED_CAPABILITY
REFERENCE_SOURCE_UNAVAILABLE
ASSERTION_PROTOCOL_ERROR
INTERNAL_RUNNER_ERROR
```

Harness errors must never be converted to fixture PASS.

---

## 17. Process exit contract

Initial exit-code contract:

```text
0 = all selected fixtures PASS
1 = one or more fixture FAIL outcomes
2 = HARNESS_ERROR / invalid harness invocation / invalid fixture registry
```

Do not overload exit codes with release/deployment states.

`LIVE_PENDING`, `DEPLOY_FAILED`, and other Release System v2 release states belong outside the test harness.

---

## 18. Bounded machine report

When report output is enabled, use a bounded schema equivalent to:

```json
{
  "harnessVersion": 1,
  "mode": "single",
  "source": {
    "label": "candidate",
    "sha256": "...",
    "bytes": 123456
  },
  "summary": {
    "pass": 10,
    "fail": 0,
    "harnessError": 0
  },
  "results": [
    {
      "fixtureId": "community-reaction.multiline-bilingual-valid",
      "suite": "community-reaction",
      "outcome": "PASS",
      "reason": "EXPECTED_CONTRACT"
    }
  ]
}
```

Rules:

- no full source body;
- no full fixture body;
- no raw long-chat data;
- no arbitrary exception stack by default;
- reason values are bounded codes;
- timing may be emitted only as non-authoritative diagnostic metadata and must not become a correctness assertion without a separate performance contract.

---

## 19. Differential mode contract

Differential mode exists for migration proof and bounded behavior changes.

It receives two already-materialized source files:

```text
baseline
candidate
```

The runner executes the same named fixture/suite contract against both when the suite supports differential evaluation.

The differential result is explicit:

```text
BASELINE_EXPECTED / CANDIDATE_EXPECTED
BASELINE_UNEXPECTED / CANDIDATE_EXPECTED
BASELINE_EXPECTED / CANDIDATE_UNEXPECTED
BOTH_UNEXPECTED
```

The exact enum names may be implemented equivalently, but the two sides must remain separately attributable.

### 19.1 Historical defect reproduction

A correctness migration may intentionally require:

```text
baseline = known historical defect
candidate = repaired behavior
```

Example:

```text
v0.64.4 physical-line framing → MISSING ×5
v0.64.5 logical-unit framing → PASS
```

This does not mean future production tests must continue loading v0.64.4 forever.

The historical differential is migration evidence. The permanent current contract remains the repaired expected behavior.

### 19.2 No hidden source transformation

Differential mode compares two supplied sources or an explicit historical reference function.

It must never generate the baseline by undoing candidate code with textual replacement.

---

## 20. Legacy one-shot equivalence hook

RS2-1B must support later RS2-1D equivalence proof without making old workflows permanent dependencies.

For each migrated fixture family, RS2-1D may compare:

```text
legacy one-shot oracle result
vs
new permanent harness result
```

The new harness report must expose stable fixture IDs and bounded semantic results so this comparison is mechanical.

Once equivalence is proven and the new fixture is promoted, the legacy workflow/script may later be retired under RS2-4 cleanup rules.

RS2-1B itself does not delete any legacy tooling.

---

## 21. Batch A harness requirements

The first harness implementation must be sufficient for all RS2-1A Batch A families.

### 21.1 Representation Fast

Needs:

```text
bounded representation/edit-reconcile module loading
fingerprint/state fixture objects
deterministic in-memory store/session-port stubs if required by the current ownership layer
exact reconcile reason assertions
snapshot mutation observation
```

### 21.2 Genuine Edit

Needs:

```text
same bounded reconcile harness as Representation Fast
state before/after observation
manual rebuild result assertion
no host write passthrough
```

### 21.3 COMMUNITY Reaction

Needs:

```text
Community + Reaction pure-module extraction
logical unit fixtures
malformed negative cases
no host capability
```

The existing v0.64.5 one-shot test demonstrates feasibility.

### 21.4 B_END Closure

Needs:

```text
bounded Lifecycle/Time/Structure/Broadcast-related function extraction or a scoped integration adapter
synthetic/captured canonical response envelope
in-memory state only
terminal/stored/unlock/closure assertions
```

If the current code boundary cannot express the full closure contract without executing the real outer runtime, RS2-1C must split the suite into bounded owner-level contracts first rather than relaxing the no-host-runtime rule.

### 21.5 Diagnostic Copy

Needs:

```text
report-builder callable boundary
clipboard stub
DOM/textarea fallback stub
builder-call count
payload equality observation
cleanup/failure classification assertions
```

No real clipboard or browser DOM is used in permanent CI.

---

## 22. Artifact identity remains separate

The behavioral harness does not replace these outer static checks:

```text
node --check latest.js
node --check install.js
latest.js == install.js
version marker consistency
runtime version consistency
architecture Contracts v2
forbidden side-effect contracts
```

Some of these will eventually be composed into `products/simcore/tooling/check.mjs` or permanent CI in RS2-3.

RS2-1B deliberately avoids turning one test runner into an opaque all-purpose release script.

---

## 23. Harness self-tests

The harness implementation must itself have bounded self-tests before any SimCore fixture becomes authoritative.

Minimum self-test families:

```text
fixture schema accepts valid metadata
fixture schema rejects missing required fields
duplicate fixture IDs fail
unknown suite fails
module extraction finds one module
missing module fails closed
duplicate/ambiguous module definition fails closed
unknown internal dependency fails
undeclared capability fails
registered deterministic capability resets between fixtures
PASS / FAIL / HARNESS_ERROR map to exit 0 / 1 / 2
result report contains no fixture/source raw body by default
```

These are test-infrastructure tests, not SimCore runtime behavior tests.

---

## 24. Security and mutation contract

The harness process is read-only with respect to production and candidate source.

Forbidden behavior:

```text
write plugins/simcore/latest.js
write plugins/simcore/install.js
git commit
git push
GitHub API writes
manifest updates
release branch updates
production storage access
real network access
real host chat writes
real timers/background jobs
```

Test-generated temporary files may be written only to a caller-provided temporary/report location and must not become production artifacts automatically.

If a suite requires source mutation to pass, the fixture design is invalid.

---

## 25. Failure attribution rules

A failing permanent test must preserve the distinction between:

```text
SOURCE_CONTRACT_FAILURE
HARNESS_INFRASTRUCTURE_FAILURE
FIXTURE_DEFINITION_FAILURE
```

Do not report all three as generic `test failed`.

This distinction is required because Release System v2 relies on evidence before repair.

Recommended bounded mapping:

```text
FAIL
  → SOURCE_CONTRACT_FAILURE

HARNESS_ERROR / INVALID_FIXTURE
  → FIXTURE_DEFINITION_FAILURE or HARNESS_INFRASTRUCTURE_FAILURE
```

No automatic source repair is authorized from any failure state.

---

## 26. Test data lifecycle

Permanent fixture changes are code-reviewed evidence changes.

Rules:

1. new fixture requires stable ID and provenance metadata;
2. changed expected result requires an explicit contract-change explanation;
3. fixture deletion requires the RS2-1A retirement policy;
4. captured-shape data must remain bounded after edits;
5. renaming a fixture ID is treated as identity migration, not cosmetic formatting;
6. test harness must reject duplicate stable IDs across all active suites.

---

## 27. What remains deferred to RS2-1C

RS2-1B defines the harness contract only.

RS2-1C will decide and implement the **first concrete regression pack** using this harness contract.

RS2-1C owns:

```text
exact Batch A fixture files
exact subsystem-specific input schemas
exact extracted functions/adapters used by each suite
exact golden expectations
exact historical differential cases to retain
exact permanent test implementation
```

RS2-1B does not pre-implement those details in a design document.

---

## 28. What remains deferred to RS2-1D

RS2-1D owns the baseline-equivalence proof:

```text
legacy one-shot results
vs
permanent harness results
```

No one-shot tooling is retired before that proof.

---

## 29. What remains deferred to RS2-3

Permanent GitHub Actions CI wiring belongs to RS2-3.

RS2-1B does not introduce `simcore-ci.yml`.

The future permanent CI will:

```text
materialize source
run outer static gates
invoke this harness
collect bounded report
fail closed
```

The harness remains locally runnable independent of GitHub Actions.

---

## 30. RS2-1B close gate

RS2-1B is design-complete when all of the following are frozen:

```text
source path contract                         PASS
no GitHub/ref resolution inside harness      PASS
single-bundle extraction boundary            PASS
outer runtime execution forbidden            PASS
fail-closed extraction semantics              PASS
deterministic test context                    PASS
capability injection deny-by-default          PASS
declarative JSON fixture contract              PASS
RS2-1A metadata mapping                        PASS
explicit registry / deterministic ordering    PASS
PASS/FAIL/HARNESS_ERROR model                  PASS
exit 0/1/2 contract                            PASS
bounded report contract                        PASS
differential mode boundary                     PASS
legacy equivalence hook                        PASS
Batch A capability coverage designed           PASS
harness self-test requirements                 PASS
source/repository mutation forbidden           PASS
runtime diff                                   NONE
release-simcore diff                           NONE
manifest diff                                  NONE
permanent CI implementation                    NONE
```

---

## 31. Next subphase

After RS2-1B is accepted, proceed to:

```text
RS2-1C — First Permanent Regression Pack
```

RS2-1C should implement the harness minimally and migrate only Batch A.

Do not migrate Batch B/C in the first implementation merely because the harness can support them.

The first proof should remain small enough that failures can be attributed to either the harness or one known Batch A contract.
