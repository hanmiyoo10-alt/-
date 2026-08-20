# Local Usage Dashboard Product Root

Owner root for Local Usage Dashboard repository state and release automation.

Current compatibility paths remain:

- Product source/runtime: `plugins/usage-dashboard/`
- Guidelines: `docs/USAGE_DASHBOARD_GUIDELINES.md`
- Bootstrap helper: `scripts/bootstrap-usage-dashboard.sh`
- Release channel: `release-usage-dashboard`

These paths are intentionally retained during the first isolation phase because historical release/test tooling still references them.

## Isolation contract

- Usage Dashboard workflows may modify only Usage Dashboard-owned runtime/state files plus shared repository infrastructure explicitly documented in `products/README.md`.
- Any Usage Dashboard workflow that can commit or push to `main` must use the shared `repo-main-write` concurrency group.
- Usage Dashboard release-channel writes remain independent of SimCore release-channel writes.
- Future relocation into this directory should be incremental and compatibility-preserving rather than a bulk path rewrite.
