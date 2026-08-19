# Usage Dashboard GitHub CLI bootstrap

`../../scripts/bootstrap-usage-dashboard.sh` prepares a development environment for Local Usage Dashboard work.

It keeps development and deployment roles separate:

- development source: `main`
- deployment reference: `release-usage-dashboard`
- plugin source: `plugins/usage-dashboard/`

The bootstrap checks for an existing `gh` first. When `gh` is missing it prefers a portable Linux install from the official GitHub CLI release assets, verifies the downloaded archive against the published SHA-256 checksum, and stores it under the Usage Dashboard cache directory. If portable installation is unavailable it falls back to apt or Homebrew. It then checks authentication without persisting tokens, fetches the repository, and verifies that the Usage Dashboard source manifest exists before reporting the environment ready.

Environment overrides:

- `USAGE_DASHBOARD_REPO`
- `USAGE_DASHBOARD_SOURCE_BRANCH`
- `USAGE_DASHBOARD_RELEASE_BRANCH`
- `USAGE_DASHBOARD_WORKDIR`
- `USAGE_DASHBOARD_PLUGIN_PATH`
- `USAGE_DASHBOARD_GH_HOME`
- `USAGE_DASHBOARD_GH_VERSION`

The default portable location is `${XDG_CACHE_HOME:-$HOME/.cache}/local-usage-dashboard/gh`.

For disposable automation environments, prefer `GH_TOKEN` or `GITHUB_TOKEN` supplied by the environment rather than a stored login.
