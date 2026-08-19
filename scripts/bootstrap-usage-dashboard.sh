#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="${USAGE_DASHBOARD_REPO:-hanmiyoo10-alt/-}"
SOURCE_BRANCH="${USAGE_DASHBOARD_SOURCE_BRANCH:-main}"
RELEASE_BRANCH="${USAGE_DASHBOARD_RELEASE_BRANCH:-release-usage-dashboard}"
TARGET_DIR="${USAGE_DASHBOARD_WORKDIR:-usage-dashboard-work}"
PLUGIN_PATH="${USAGE_DASHBOARD_PLUGIN_PATH:-plugins/usage-dashboard}"

log() { printf '[usage-dashboard-bootstrap] %s\n' "$*"; }
fail() { printf '[usage-dashboard-bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

install_gh() {
  if command -v gh >/dev/null 2>&1; then
    log "gh already installed: $(gh --version | head -n1)"
    return 0
  fi

  log "gh not found; attempting local environment install"

  if command -v apt-get >/dev/null 2>&1; then
    if [ "$(id -u)" -eq 0 ]; then
      apt-get update
      DEBIAN_FRONTEND=noninteractive apt-get install -y gh
    elif command -v sudo >/dev/null 2>&1; then
      sudo apt-get update
      sudo DEBIAN_FRONTEND=noninteractive apt-get install -y gh
    else
      fail "apt-get is available but root/sudo is not. Provide gh in the environment or use a container image with gh preinstalled."
    fi
  elif command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    fail "No supported package manager found. Provide gh in the environment, then rerun this script."
  fi

  command -v gh >/dev/null 2>&1 || fail "gh installation finished without a usable gh binary"
  log "installed: $(gh --version | head -n1)"
}

check_auth() {
  if [ -n "${GH_TOKEN:-}" ] || [ -n "${GITHUB_TOKEN:-}" ]; then
    log "GitHub token detected in environment; this script never writes tokens to disk"
  fi

  if gh auth status >/dev/null 2>&1; then
    log "GitHub CLI authentication: OK"
    return 0
  fi

  log "GitHub CLI authentication: NOT CONFIGURED"
  log "Public fetch/clone can still work, but push/PR/release writes need authentication."
  log "For disposable GPT/container sessions, prefer an environment-provided GH_TOKEN."
  return 0
}

verify_plugin_tree() {
  local root="$1"
  [ -d "$root/$PLUGIN_PATH" ] || fail "expected plugin path not found: $root/$PLUGIN_PATH"
  [ -f "$root/$PLUGIN_PATH/src/manifest.json" ] || fail "usage-dashboard source manifest not found under $PLUGIN_PATH"
  log "plugin source: $root/$PLUGIN_PATH"
}

sync_repo() {
  command -v git >/dev/null 2>&1 || fail "git is required"

  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local root
    root="$(git rev-parse --show-toplevel)"
    log "existing git worktree: $root"
    git -C "$root" fetch origin --prune
    verify_plugin_tree "$root"
    log "current branch: $(git -C "$root" branch --show-current)"
    log "development source: origin/$SOURCE_BRANCH"
    log "release reference: origin/$RELEASE_BRANCH"
    return 0
  fi

  if [ -d "$TARGET_DIR/.git" ]; then
    log "existing checkout: $TARGET_DIR"
    git -C "$TARGET_DIR" fetch origin --prune
  elif [ -e "$TARGET_DIR" ]; then
    fail "$TARGET_DIR exists but is not a git checkout; set USAGE_DASHBOARD_WORKDIR to another path"
  else
    log "cloning $REPO_SLUG -> $TARGET_DIR"
    gh repo clone "$REPO_SLUG" "$TARGET_DIR"
  fi

  if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/remotes/origin/$SOURCE_BRANCH"; then
    if [ -z "$(git -C "$TARGET_DIR" status --porcelain)" ]; then
      git -C "$TARGET_DIR" switch -C "$SOURCE_BRANCH" "origin/$SOURCE_BRANCH" >/dev/null
      log "checked out development source $SOURCE_BRANCH"
    else
      log "working tree has local changes; fetched but did not switch branches"
    fi
  else
    fail "development source branch not found: origin/$SOURCE_BRANCH"
  fi

  verify_plugin_tree "$TARGET_DIR"

  if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/remotes/origin/$RELEASE_BRANCH"; then
    log "release reference ready: origin/$RELEASE_BRANCH"
  else
    log "release reference not found: origin/$RELEASE_BRANCH"
  fi
}

main() {
  install_gh
  check_auth
  sync_repo
  log "ready"
}

main "$@"
