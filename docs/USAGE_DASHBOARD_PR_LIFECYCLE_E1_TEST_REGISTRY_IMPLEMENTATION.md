# Local Usage Dashboard — E1 Test Registry Authority Implementation Evidence

Status: IMPLEMENTED IN CANDIDATE — pending PR validation at first commit

Baseline:

- Product `3.0.0-alpha.5.70`
- Engine `1.6.21`
- Manager `1.3.0`
- contracts `1/1`

Implementation:

- `plugins/usage-dashboard/tests/registry.cjs` owns hybrid test discovery.
- `plugins/usage-dashboard/tests/run-all.cjs` executes each selected test in a separate Node process.
- `plugins/usage-dashboard/tests/test-registry-contract.cjs` locks discovery, ordering and fail-closed behavior.
- `reusable-usage-dashboard-validate.yml` delegates test selection to the runner instead of hard-coding the full test list.
- P34 no longer asserts its own filename is present in workflow YAML.
- Existing test-tree cleanliness guards remain before and after suite execution.

Production artifacts and version tuple are intentionally unchanged.
