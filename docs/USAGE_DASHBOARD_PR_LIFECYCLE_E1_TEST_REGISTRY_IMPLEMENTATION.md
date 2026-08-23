# Local Usage Dashboard — E1 Test Registry Authority Implementation Evidence

Status: IMPLEMENTED — PR #153 final candidate validation GREEN

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
- Product regressions no longer assert that behavior/P filenames are directly embedded in workflow YAML.
- Existing test-tree cleanliness guards remain before and after suite execution.
- Superseded P8/P9 Provider Manager cache-IPC regressions are retired explicitly in `retired-regressions.json`; P10 Independent Cache Observer is the active authority.

Final validation evidence:

- Workflow: `Usage Dashboard Candidate Validation`
- Run: `#39`, run id `32638686235`
- Job: `validate / validate`, job id `97192261177`
- Result: `success`
- Registry result: `TEST_REGISTRY_GREEN:66`
- Product tuple validated: `3.0.0-alpha.5.70 / Engine 1.6.21 / Manager 1.3.0 / contracts 1/1`
- P34 Request Duration Fidelity: GREEN
- Engine parity SHA256 remained `839da52f23d1a38bf9cde34083b9232d054556810af1e1505cff12172c1bcc5c`

PR #153 anomaly review:

1. Run #14 (`32637772299`) — VERIFIED orchestration coupling in `foundation.cjs`: it required `behavior-state-contract.cjs` to be named directly in validator YAML. Production impact: none. Fixed by moving selection authority to the registry.
2. Run #15 (`32637825143`) — VERIFIED orchestration coupling in `release-infrastructure-foundation.cjs`: it required the P33 filename in validator YAML. Production impact: none. Fixed by asserting registry runner authority instead.
3. Run #17 (`32637902646`) — VERIFIED orchestration coupling in `behavior-harness-contract.cjs`: it required individual behavior filenames in validator YAML. Production impact: none. Fixed by discovering behavior tests from the registry.
4. Run #18 (`32637998450`) — VERIFIED same legacy coupling surfaced first in P1 after foundation/behavior suites passed. Production impact: none. Follow-up search removed the same workflow-test-name coupling from affected P regressions.
5. Run #35 (`32638429300`) — VERIFIED stale regression discovery. Registry correctly executed P8, which required the old Provider Manager cache IPC while current P10 intentionally requires that IPC to be absent. Production impact: none. P8/P9 were explicitly retired with durable provenance and recurrence guards; no registry skip exception was added.

The final GREEN therefore does not erase the earlier RED runs: each failure was classified, fixed at its authority boundary, and covered against recurrence.

Production artifacts and version tuple remain intentionally unchanged.
