#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="${USAGE_DASHBOARD_REPO:-hanmiyoo10-alt/-}"
SOURCE_BRANCH="${USAGE_DASHBOARD_SOURCE_BRANCH:-main}"
RELEASE_BRANCH="${USAGE_DASHBOARD_RELEASE_BRANCH:-release-usage-dashboard}"
TARGET_DIR="${USAGE_DASHBOARD_WORKDIR:-usage-dashboard-work}"
PLUGIN_PATH="${USAGE_DASHBOARD_PLUGIN_PATH:-plugins/usage-dashboard}"
GH_HOME="${USAGE_DASHBOARD_GH_HOME:-${XDG_CACHE_HOME:-$HOME/.cache}/local-usage-dashboard/gh}"
GH_VERSION_OVERRIDE="${USAGE_DASHBOARD_GH_VERSION:-}"

log() { printf '[usage-dashboard-bootstrap] %s\n' "$*"; }
fail() { printf '[usage-dashboard-bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

run_limited() {
  if command -v timeout >/dev/null 2>&1; then
    timeout 60s "$@"
  else
    "$@"
  fi
}

download_file() {
  local url="$1"
  local output="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --connect-timeout 10 --max-time 60 -o "$output" "$url"
    return
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q --timeout=20 --tries=2 -O "$output" "$url"
    return
  fi
  return 1
}

resolve_gh_version() {
  if [ -n "$GH_VERSION_OVERRIDE" ]; then
    printf '%s\n' "${GH_VERSION_OVERRIDE#v}"
    return 0
  fi

  command -v python3 >/dev/null 2>&1 || return 1
  local metadata
  metadata="$(mktemp)"
  if ! download_file 'https://api.github.com/repos/cli/cli/releases/latest' "$metadata"; then
    rm -f "$metadata"
    return 1
  fi
  local version
  version="$(python3 - "$metadata" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as f:
    tag = str(json.load(f).get('tag_name') or '')
print(tag.removeprefix('v'))
PY
)"
  rm -f "$metadata"
  [ -n "$version" ] || return 1
  printf '%s\n' "$version"
}

verify_sha256() {
  local checksum_file="$1"
  local asset_name="$2"
  local archive="$3"
  local expected
  expected="$(awk -v asset="$asset_name" '$2 == asset { print $1; exit }' "$checksum_file")"
  [ -n "$expected" ] || return 1

  if command -v sha256sum >/dev/null 2>&1; then
    printf '%s  %s\n' "$expected" "$archive" | sha256sum -c - >/dev/null
    return
  fi
  if command -v shasum >/dev/null 2>&1; then
    [ "$(shasum -a 256 "$archive" | awk '{print $1}')" = "$expected" ]
    return
  fi
  return 1
}

install_gh_portable() {
  [ "$(uname -s)" = 'Linux' ] || return 1
  command -v tar >/dev/null 2>&1 || return 1

  local arch
  case "$(uname -m)" in
    x86_64|amd64) arch='amd64' ;;
    aarch64|arm64) arch='arm64' ;;
    *) return 1 ;;
  esac

  local version
  version="$(resolve_gh_version)" || return 1
  [ -n "$version" ] || return 1

  local install_dir="$GH_HOME/$version"
  local gh_bin="$install_dir/bin/gh"
  if [ -x "$gh_bin" ]; then
    export PATH="$install_dir/bin:$PATH"
    log "portable gh already installed: $(gh --version | head -n1)"
    return 0
  fi

  local asset="gh_${version}_linux_${arch}.tar.gz"
  local checksums="gh_${version}_checksums.txt"
  local base="https://github.com/cli/cli/releases/download/v${version}"
  local tmp
  tmp="$(mktemp -d)"
  local archive="$tmp/$asset"
  local checksum_file="$tmp/$checksums"

  log "installing portable gh v${version} for linux/${arch}"
  if ! download_file "$base/$asset" "$archive" || ! download_file "$base/$checksums" "$checksum_file"; then
    rm -rf "$tmp"
    return 1
  fi
  if ! verify_sha256 "$checksum_file" "$asset" "$archive"; then
    rm -rf "$tmp"
    return 1
  fi
  if ! tar -xzf "$archive" -C "$tmp"; then
    rm -rf "$tmp"
    return 1
  fi

  local extracted="$tmp/gh_${version}_linux_${arch}/bin/gh"
  [ -x "$extracted" ] || { rm -rf "$tmp"; return 1; }
  mkdir -p "$install_dir/bin"
  cp "$extracted" "$gh_bin"
  chmod 0755 "$gh_bin"
  rm -rf "$tmp"

  export PATH="$install_dir/bin:$PATH"
  command -v gh >/dev/null 2>&1 || return 1
  log "portable install complete: $(gh --version | head -n1)"
}

install_gh_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    if [ "$(id -u)" -eq 0 ]; then
      run_limited apt-get update && run_limited env DEBIAN_FRONTEND=noninteractive apt-get install -y gh && return 0
    elif command -v sudo >/dev/null 2>&1; then
      run_limited sudo apt-get update && run_limited sudo env DEBIAN_FRONTEND=noninteractive apt-get install -y gh && return 0
    fi
  fi

  if command -v brew >/dev/null 2>&1; then
    run_limited brew install gh && return 0
  fi
  return 1
}

install_gh() {
  if command -v gh >/dev/null 2>&1; then
    log "gh already installed: $(gh --version | head -n1)"
    return 0
  fi

  log "gh not found; trying Usage Dashboard portable install"
  if install_gh_portable; then
    return 0
  fi

  log "portable install unavailable; trying local package manager"
  if install_gh_package_manager && command -v gh >/dev/null 2>&1; then
    log "package-manager install complete: $(gh --version | head -n1)"
    return 0
  fi

  fail "Could not install gh. Network/package access is unavailable in this environment."
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
