# Local Usage Dashboard — PR Lifecycle Simplification E1: Test Registry Authority

Status: DESIGN — recorded before implementation

Baseline at design time:

- Product: `3.0.0-alpha.5.70`
- Bridge Engine: `1.6.21`
- Bridge Manager: `1.3.0`
- Snapshot contract: `1`
- Recent-request contract: `1`

This is a maintenance-only design. It must not change production runtime behavior, product version, Engine version, Manager version, contract versions, or release artifacts.

## 1. Problem

The current reusable validator contains a large hard-coded Bash `tests=(...)` array. Adding a new regression such as `p35-*.cjs` or a new `behavior-*.cjs` therefore requires editing GitHub Actions YAML even when the release infrastructure itself has not changed.

Some product regressions also assert that their own test filenames are present in the validator workflow. That couples product regression ownership to workflow source shape and makes otherwise generic validation version/test-list aware.

E1 removes that coupling.

## 2. Goal

> GitHub Actions knows how to run the Usage Dashboard test authority; the test directory decides which tests exist.

After E1, adding a normal product or behavior regression must not require editing `.github/workflows/reusable-usage-dashboard-validate.yml`.

Target flow:

```text
reusable-usage-dashboard-validate.yml
        |
        | node plugins/usage-dashboard/tests/run-all.cjs
        v
run-all.cjs
        |
        v
registry.cjs
        |
        +-- foundation authority
        +-- behavior-*.cjs discovery
        +-- p<number>-*.cjs discovery
```

## 3. Authority model

E1 uses a hybrid registry rather than moving the entire filename list from YAML into JavaScript.

### 3.1 Foundation tests

Foundation and release-infrastructure tests that do not follow the `behavior-*` or `pN-*` naming convention are explicitly registered in `registry.cjs`.

The initial foundation authority should include the existing durable infrastructure tests, including:

- `foundation.cjs`
- `release-infrastructure-foundation.cjs`
- `current-release-contract.cjs`
- `legacy-release-workflow-archive.cjs`
- `behavior-harness-contract.cjs`
- the registry contract test itself

The exact implementation-time list must be derived from current `main`, not from this design document alone.

### 3.2 Behavior tests

Every top-level test matching:

```text
behavior-*.cjs
```

is discovered automatically.

Adding a new behavior test must require only adding the test file.

### 3.3 P regressions

Every top-level test matching:

```text
p<number>-*.cjs
```

is discovered automatically.

The runner must parse the numeric P prefix and sort numerically, not lexicographically.

Example required order:

```text
p1-...
p2-...
p9-...
p10-...
p11-...
```

When several files share the same P number, order them lexically by filename within that P number.

## 4. Deterministic execution order

Execution order is a contract:

1. foundation tests,
2. behavior tests,
3. P regressions.

Foundation order is explicit and stable.

Behavior tests are lexical by filename.

P regressions are numeric by P number and lexical by filename within the same number.

Filesystem enumeration order must never determine CI order.

## 5. Fail-closed discovery

Automatic discovery must not silently ignore a new top-level `.cjs` test.

Every `plugins/usage-dashboard/tests/*.cjs` file must belong to exactly one recognized category:

- explicit foundation/runner infrastructure authority,
- `behavior-*.cjs`,
- `p<number>-*.cjs`.

Otherwise validation fails with a stable diagnostic such as:

```text
UNREGISTERED_TEST_FILE:<filename>
```

Other fail-closed conditions:

- an explicitly registered foundation test is missing → `REGISTERED_TEST_MISSING`
- the same test is selected more than once → `DUPLICATE_TEST_REGISTRATION`
- a filename appears intended to be a P regression but has an invalid numeric form → `INVALID_REGRESSION_TEST_NAME`

The implementation may refine exact formatting, but these states must remain separately diagnosable.

## 6. Process isolation

`run-all.cjs` must execute each test as a separate Node process, preserving the current process-isolation semantics.

It must not replace the existing test model with `require()` of all tests into one long-lived process.

Conceptually:

```text
node foundation.cjs
node behavior-cache-runtime.cjs
...
node p34-request-duration-fidelity.cjs
```

The first failing test terminates the suite with a stable diagnostic identifying the failed filename.

## 7. Test-tree mutation guard remains

The validator's existing test-tree cleanliness protection remains authoritative.

Required sequence:

```text
assert_test_tree_clean
node plugins/usage-dashboard/tests/run-all.cjs
assert_test_tree_clean
```

Registry authority does not grant tests permission to mutate repository files.

## 8. Workflow simplification

The reusable validator must remove the hard-coded Bash `tests=(...)` array.

The workflow should only invoke the registry runner and preserve the existing build, materialization, parity, syntax, candidate cleanliness, release-contract and monotonic checks.

E1 is not permission redesign. The validator remains:

```text
permissions:
  contents: read
```

No repository-writing primitive may be added.

## 9. Product regressions must not know workflow test lists

Feature regressions such as `p34-request-duration-fidelity.cjs` must stop asserting that their own filenames are present in workflow YAML.

Product regressions own product contracts.

A dedicated infrastructure test owns registry/discovery behavior.

This separates:

```text
feature correctness
```

from:

```text
test orchestration correctness
```

## 10. Registry contract regression

E1 should add a foundation-level test such as:

```text
test-registry-contract.cjs
```

This is infrastructure coverage and should not consume the next product regression number.

It must cover at minimum:

- current repository discovery succeeds,
- a synthetic new `behavior-*.cjs` is automatically discovered,
- a synthetic new `p35-*.cjs` is automatically discovered,
- P numbers sort numerically,
- same-P filenames sort deterministically,
- unknown top-level `.cjs` fails closed,
- missing explicit foundation entry fails closed,
- duplicate selection fails closed,
- malformed intended P regression fails closed.

## 11. Acceptance criteria

E1 is complete only when all of the following are true:

1. the reusable validator contains no hard-coded complete product/behavior/P test list,
2. normal future `behavior-*` and `pN-*` files run without workflow edits,
3. unclassified top-level `.cjs` files fail closed,
4. test execution order is deterministic,
5. each test still executes in its own Node process,
6. test-tree mutation guards remain before and after the suite,
7. existing product regressions no longer assert their own filename in workflow YAML,
8. registry contract coverage is GREEN,
9. all existing Usage Dashboard regressions and behavior harnesses remain GREEN,
10. production artifacts remain byte-identical before and after the maintenance change.

## 12. Explicit non-goals

E1 does not implement the later PR lifecycle work:

- no candidate-preparation writer,
- no rule that delays PR creation until materialization is complete,
- no release-vs-maintenance diff classifier,
- no maintenance-promotion skip logic,
- no branch-protection or repository-wide required-check changes,
- no runtime feature work.

Those belong to later E stages.

## 13. Expected result

Before E1, a feature release can require:

```text
feature source
+ behavior regression
+ P regression
+ validator workflow test-list edit
+ product regression assertions about validator contents
```

After E1, the normal feature-test side becomes:

```text
feature source
+ behavior regression
+ P regression
```

The generic validator remains generic.

This is the first step of PR Lifecycle Simplification: reduce release-PR churn without weakening test coverage, fail-closed behavior, read-only CI, or exact-byte deployment guarantees.
