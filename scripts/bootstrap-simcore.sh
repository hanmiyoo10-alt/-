#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="${SIMCORE_REPO:-hanmiyoo10-alt/-}"
DEFAULT_BRANCH="${SIMCORE_BRANCH:-release-simcore}"
TARGET_DIR="${SIMCORE_WORKDIR:-simcore-work}"

log() { printf '[simcore-bootstrap] %s\n' "$*"; }
fail() { printf '[simcore-bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

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
      fail "apt-get is available but root/sudo is not. Install GitHub CLI manually or provide a container image with gh preinstalled."
    fi
  elif command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    fail "No supported package manager found. Install GitHub CLI manually, then rerun this script."
  fi

  command -v gh >/dev/null 2>&1 || fail "gh installation finished without a usable gh binary"
  log "installed: $(gh --version | head -n1)"
}

check_auth() {
  if [ -n "${GH_TOKEN:-}" ] || [ -n "${GITHUB_TOKEN:-}" ]; then
    log "GitHub token detected in environment; no token will be written by this script"
  fi

  if gh auth status >/dev/null 2>&1; then
    log "GitHub CLI authentication: OK"
    return 0
  fi

  log "GitHub CLI authentication: NOT CONFIGURED"
  log "Read-only public clone/fetch can still work, but push/PR/release writes need authentication."
  log "For disposable GPT/container sessions, prefer an environment-provided GH_TOKEN rather than storing a token in the filesystem."
  return 0
}

sync_repo() {
  command -v git >/dev/null 2>&1 || fail "git is required"

  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local root
    root="$(git rev-parse --show-toplevel)"
    log "existing git worktree: $root"
    git -C "$root" fetch origin --prune
    log "fetched origin; current branch: $(git -C "$root" branch --show-current)"
    log "release reference: origin/$DEFAULT_BRANCH"
    return 0
  fi

  if [ -d "$TARGET_DIR/.git" ]; then
    log "existing checkout: $TARGET_DIR"
    git -C "$TARGET_DIR" fetch origin --prune
  elif [ -e "$TARGET_DIR" ]; then
    fail "$TARGET_DIR exists but is not a git checkout; set SIMCORE_WORKDIR to another path"
  else
    log "cloning $REPO_SLUG -> $TARGET_DIR"
    gh repo clone "$REPO_SLUG" "$TARGET_DIR"
  fi

  if git -C "$TARGET_DIR" show-ref --verify --quiet "refs/remotes/origin/$DEFAULT_BRANCH"; then
    if [ -z "$(git -C "$TARGET_DIR" status --porcelain)" ]; then
      git -C "$TARGET_DIR" switch -C "$DEFAULT_BRANCH" "origin/$DEFAULT_BRANCH" >/dev/null
      log "checked out $DEFAULT_BRANCH"
    else
      log "working tree has local changes; fetched but did not switch branches"
    fi
  fi
}

main() {
  install_gh
  check_auth
  sync_repo
  log "ready"
}

main "$@"
