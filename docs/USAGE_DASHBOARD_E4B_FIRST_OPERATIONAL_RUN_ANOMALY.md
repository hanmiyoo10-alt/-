# Local Usage Dashboard — E4-B First Operational Run Anomaly

Status: **FIX CANDIDATE**

Recorded: `2026-08-24`

Production baseline during this incident remained unchanged:

- Product `3.0.0-alpha.5.70`
- Bridge Engine `1.6.21`
- Bridge Manager `1.3.0`
- contracts `1/1`
- production branch `release-usage-dashboard`

## Incident

The first real feature-release exercise of the permanent E4-B Safe Candidate Preparation controller was attempted for `3.0.0-alpha.5.71 — Cross-Scope Request Provenance`.

Authoritative failed run:

- workflow: `Usage Dashboard Safe Candidate Preparation`
- run ID: `32715516996`
- workflow ref: `main`
- prepare job ID: `97395772602`
- failed step: `Require main workflow trust root`
- result: `CANDIDATE_PREP_TARGET_DENIED`
- candidate writer: skipped
- production write: none

The candidate branch itself had not moved and the intended exact candidate SHA was valid. No candidate materialization or production mutation occurred.

## Root cause

The mobile GitHub workflow input UI supplied field-description text together with the intended values. The raw inputs observed in the runner included forms equivalent to:

```text
Candidate branch release/usage-dashboard-5.71-cross-scope-provenance
release/usage-dashboard-5.71-cross-scope-provenance
```

and the same contamination pattern for the exact SHA and release-spec path.

The original E4-B trust gate correctly rejected those raw strings because it required exact raw-value equality with the approved grammar. This was a UX/entry normalization defect at the trusted controller boundary, not a candidate-code defect.

## Fix contract

The trusted `main` control plane now normalizes workflow-dispatch inputs before candidate checkout.

Normalization is fail-closed:

1. extract tokens only from the existing approved grammars,
2. deduplicate repeated occurrences of the same exact token,
3. require exactly one distinct valid candidate branch,
4. require exactly one distinct valid 40-hex SHA,
5. require exactly one distinct valid release-spec path,
6. reject zero matches or multiple distinct valid matches,
7. run the existing target-branch denial policy after normalization.

This specifically permits harmless mobile UI label contamination and repeated copies of the same intended value without weakening branch, SHA, or release-spec authority.

The workflow first checks out the immutable trusted `github.sha` with `contents: read` and `persist-credentials: false`, runs only the trusted normalization policy, and then checks out the exact normalized candidate SHA. The privileged candidate writer consumes only normalized prepare-job outputs.

## Preserved E4-B invariants

- candidate code never receives repository write credentials,
- privileged writer never executes candidate code,
- `main`, `release-usage-dashboard`, and other denied targets remain denied,
- exact candidate SHA remains mandatory,
- release spec remains constrained to `.github/usage-dashboard/releases/*.json`,
- candidate payload parent/path/mode verification remains unchanged,
- CAS and plain fast-forward-only write remain unchanged,
- no force push is introduced,
- no production artifact or product version changes in this maintenance fix.

## Regression

`plugins/usage-dashboard/tests/candidate-preparation-contract.cjs` now includes fixtures matching the observed mobile contamination and negative fixtures containing two distinct valid branches, SHAs, or release specs. Ambiguous inputs must fail closed.

## Operational closure condition

This anomaly is closed only after:

1. maintenance PR CI is GREEN,
2. the fix merges to `main`,
3. a fresh E4-B workflow dispatch for the real 5.71 candidate passes the normalized trust gate,
4. E4-B materializes the candidate through the existing constrained writer.

The 5.71 feature release then resumes the already-closed E1–E4-B adoption sequence at E2 candidate-ready.
