# Usage Dashboard GitHub CLI bootstrap

`../../scripts/bootstrap-usage-dashboard.sh` prepares a development environment for Local Usage Dashboard work.

It keeps development and deployment roles separate:

- development source: `main`
- deployment reference: `release-usage-dashboard`
- plugin source: `plugins/usage-dashboard/`

The bootstrap checks for an existing `gh` first. When `gh` is missing, it prefers the repository-vendored GitHub CLI release under `plugins/usage-dashboard/tools/vendor/gh/2.97.0/`. The matching Linux amd64/arm64 archive is verified against the vendored upstream checksum manifest and extracted into the Usage Dashboard cache directory. This path does not require package repositories or a GitHub release download once the repository has been cloned.

If the vendored asset is unavailable, the bootstrap falls back to the same pinned official GitHub CLI release download, verifies SHA-256, and finally tries apt or Homebrew. It then checks authentication without persisting tokens, fetches the repository, and verifies that the Usage Dashboard source manifest exists before reporting the environment ready.

Vendored upstream version: `cli/cli` v2.97.0.

Environment overrides:

- `USAGE_DASHBOARD_REPO`
- `USAGE_DASHBOARD_SOURCE_BRANCH`
- `USAGE_DASHBOARD_RELEASE_BRANCH`
- `USAGE_DASHBOARD_WORKDIR`
- `USAGE_DASHBOARD_PLUGIN_PATH`
- `USAGE_DASHBOARD_GH_HOME`
- `USAGE_DASHBOARD_GH_VERSION`
- `USAGE_DASHBOARD_GH_VENDOR_VERSION`
- `USAGE_DASHBOARD_GH_VENDOR_DIR`

The default extracted location is `${XDG_CACHE_HOME:-$HOME/.cache}/local-usage-dashboard/gh`.

`vendor_gh_cli.sh` materializes the pinned amd64/arm64 upstream archives and checksum manifest. It independently checks the pinned SHA-256 values and the upstream checksum manifest before replacing vendored files.

For disposable automation environments, prefer `GH_TOKEN` or `GITHUB_TOKEN` supplied by the environment rather than a stored login.
