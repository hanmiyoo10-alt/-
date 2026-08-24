# Local Usage Dashboard 5.71 Release Retrospective

Recorded: 2026-08-24

Release: `3.0.0-alpha.5.71 — Cross-Scope Request Provenance`

Engine: `1.6.22`

Manager: `1.3.0`

PR: `#206 — feat(usage-dashboard): 5.71 cross-scope request provenance`

Main merge: `4e05e7af2de390a8bcd302b9c51a38539b17eb67`

Production promotion: `254cb20d70fff6fdd91ab62de595d4ff602303d1`

## Outcome

The release completed successfully and production was promoted through the generic exact-byte release path. The final main/release product manifest, plugin bundle, Engine, and Manager artifacts matched by Git blob identity at release verification time.

The feature contract remained explicit-only:

- DevPass request ownership is established by exact project provenance.
- Credits ownership requires exact organization provenance plus explicit `usedMode=credits`.
- model/provider/price/token/duration/service-tier values do not infer account scope.
- insufficient evidence remains `UNKNOWN`.
- request identity is enriched in place rather than duplicated.
- raw project/organization identifiers remain ephemeral and do not enter the public plugin ledger.

## What worked well

### 1. The release safety system actually stopped unsafe candidates

The most important success was not that every intermediate attempt passed. It was that unsafe or stale intermediate states did not reach production.

During iteration, validation exposed a broad diagnostics diff, stale generated artifacts, structural expectations that still described the 5.70 module layout, and a capture-tap concurrency race. The candidate was repeatedly rejected or held before merge until those were resolved.

That is the correct failure mode for this project: false negatives are cheaper than publishing a mixed or partially materialized runtime.

### 2. E4-B / E2 / E4-C control boundaries were useful in a real feature release

The owner-comment control queue removed the need for the user to manually fill GitHub Actions inputs. Candidate preparation and candidate-ready checks were still bound to an exact branch/SHA rather than a moving checkout.

This was the first feature-scale operational proof that the release-control work was not merely documentation or maintenance scaffolding.

### 3. Black-box behavior tests found a real concurrency defect

The `ensureCaptureTap` extension could race when concurrent snapshot paths rewrote the stable v10 capture tap while the 5.71 wrapper patched it to v11. The failure was intermittent: one run could pass while another lost the expected secondary CLI launch.

The correct fix was production-side single-flight serialization around the 5.71 patch phase, not weakening the organization-capture test.

This is a strong validation of the process-harness direction: concurrency bugs that static source checks cannot prove are now observable in CI.

### 4. Exact-byte promotion remained trustworthy

After merge, production was advanced by the exact-byte promoter rather than rebuilding release artifacts independently. Final verification compared Git blob identity for the production-critical files.

This substantially reduces the chance of `main` and `release-usage-dashboard` representing the same version label with different bytes.

## What was inefficient

### 1. The PR was opened too early

PR #206 ultimately contained 30 commits across 24 changed files. The final result was valid, but the repair history shows that the candidate was still being materially shaped after the PR had already become the primary integration surface.

For the next feature release, the candidate should remain on its release branch until the following are green before opening the PR:

1. materializer idempotency check,
2. generated-artifact parity,
3. focused behavior tests for changed runtime paths,
4. module/layout structural checks,
5. E2 exact-SHA readiness.

The PR should be the final integration gate, not the main debugging workspace.

### 2. Generated-artifact ownership needs a stricter rule

The release exposed how easy it is for source modules, generated Engine bytes, Manager embedded hashes, and `product-manifest.json` hashes to become temporarily inconsistent.

Rule going forward:

> Edit source-of-truth modules only. Generated plugin/Engine artifacts and embedded hashes are materializer output, never hand-maintained release inputs.

A preflight diff should fail if a generated artifact changed without the corresponding source/build path explaining it.

### 3. The 5.71 materializer was not fully idempotent after Engine-source edits

When the candidate already reported the target version, the materializer rebuilt the Engine but originally did not resynchronize the Manager's bundled Engine hash and manifest hashes afterward.

This made post-materialization source fixes unnecessarily fragile.

The target-version path must always be a complete reconciliation pass:

`source -> Engine build -> Manager embedded Engine hash -> manifest hashes -> plugin build -> validation`

Running the materializer twice should produce zero diff and the same artifact hashes.

### 4. Structural tests encoded historical counts instead of current authority

`p5-module-layout` and `p6-rc-contract` contained expectations tied to the old 23-module layout. 5.71 intentionally introduced three modules and therefore exposed those assumptions.

Tests should derive structural counts from the authoritative module registry unless an exact historical count is itself the contract being tested.

Version-number branches such as "5.67 and later means 23 modules" are brittle and should not be used for a growing modular product.

### 5. A P35 assertion tested an implementation spelling rather than the actual bound

The production provenance code correctly bounded both raw and normalized rows to 100, but the test searched for the stale literal `rawRows.slice(0, 100)` rather than the actual `capturedLogs.rows.slice(0, 100)` implementation.

Static tests should lock semantic boundaries, not incidental variable spelling. When possible, the bound should be verified by the behavior harness instead of substring matching.

## Process changes for the next release

### A. Add a release-branch diff budget before E4-B

Before materialization, compare the candidate against the current production baseline and classify every changed path as one of:

- intentional source,
- intentional test,
- release metadata,
- generated materialization output.

Unexpected files, broad unrelated diffs, temporary markers, or generated files changed before materialization should fail immediately.

### B. Run changed-path behavior tests repeatedly before the full registry

For concurrency-sensitive Engine changes, run the focused behavior pack at least three consecutive times before opening the PR. A pass/fail/pass pattern should be treated as a production defect, not test noise.

### C. Make materializer idempotency a permanent release contract

Every release materializer should have a generic test that:

1. materializes once,
2. records production-critical hashes,
3. materializes again,
4. asserts zero working-tree diff,
5. asserts the hashes are unchanged.

This should not be reimplemented per release.

### D. Remove module-count version tables

Module existence and count should come from `src/parts.cjs` and the Engine parts manifest. Release tests should verify registry/file parity instead of maintaining historical numeric tables.

### E. Keep the user's operational surface unchanged

The release did not justify adding more manual user steps. The desired model remains:

`assistant prepares -> validates -> PR/CI -> merges -> promotes -> user presses + -> user performs real-device verification`

Any release-control improvement should reduce assistant-side repair loops without moving work back to the user.

## Overall assessment

### Product result: A

The intended 5.71 provenance semantics shipped, UNKNOWN remained conservative, existing fidelity contracts were preserved, the final full registry passed, and production was exact-byte promoted.

### Release safety: A-

The system caught every important intermediate defect before production. Exact-SHA controls, candidate validation, behavior tests, and exact-byte promotion all provided real value.

### Release efficiency: B-

The candidate required too many repair cycles, generated-artifact synchronization was initially incomplete, and multiple structural tests still encoded old release assumptions. The pipeline was safe but noisier and slower than it should be.

## Next maintenance priority

Before designing a large 5.72 feature, the highest-value maintenance work is a small release-process hardening pass covering:

1. generic materializer idempotency verification,
2. authoritative module-count checks,
3. pre-E4-B candidate diff classification/budget,
4. focused repeated behavior smoke for changed Engine paths.

These changes should not alter production product bytes or require a new user-facing release by themselves.
