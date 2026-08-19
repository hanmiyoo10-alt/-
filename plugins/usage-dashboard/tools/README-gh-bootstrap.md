# Usage Dashboard GitHub CLI bootstrap

`../../scripts/bootstrap-usage-dashboard.sh` prepares a development environment for Local Usage Dashboard work.

It keeps development and deployment roles separate:

- development source: `main`
- deployment reference: `release-usage-dashboard`
- plugin source: `plugins/usage-dashboard/`

The bootstrap installs `gh` only when it is missing, checks authentication without persisting tokens, fetches the repository, and verifies that the Usage Dashboard source manifest exists before reporting the environment ready.

Environment overrides:

- `USAGE_DASHBOARD_REPO`
- `USAGE_DASHBOARD_SOURCE_BRANCH`
- `USAGE_DASHBOARD_RELEASE_BRANCH`
- `USAGE_DASHBOARD_WORKDIR`
- `USAGE_DASHBOARD_PLUGIN_PATH`

For disposable automation environments, prefer `GH_TOKEN` or `GITHUB_TOKEN` supplied by the environment rather than a stored login.
