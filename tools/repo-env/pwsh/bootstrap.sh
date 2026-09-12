#!/bin/sh
set -eu

MODE=${1:-check}
MIN_MAJOR=${REPO_PWSH_MIN_MAJOR:-7}
PREFIX_TAG='[repo-pwsh]'

log() { printf '%s %s\n' "$PREFIX_TAG" "$*"; }
fail() { log "ERROR: $*" >&2; exit 5; }

pwsh_path() {
  command -v pwsh 2>/dev/null || return 1
}

pwsh_version() {
  if ! p=$(pwsh_path); then
    return 1
  fi
  "$p" -NoLogo -NoProfile -Command '$PSVersionTable.PSVersion.ToString()' 2>/dev/null | head -n 1
}

pwsh_satisfied() {
  v=$(pwsh_version 2>/dev/null || true)
  [ -n "$v" ] || return 1
  major=${v%%.*}
  case "$major" in
    ''|*[!0-9]*) return 1 ;;
  esac
  [ "$major" -ge "$MIN_MAJOR" ]
}

arch_kind() {
  case "$(uname -m 2>/dev/null || printf unknown)" in
    x86_64|amd64) printf 'x64\n' ;;
    arm64|aarch64) printf 'arm64\n' ;;
    *) printf 'other\n' ;;
  esac
}

platform_route() {
  if [ "${REPO_PWSH_TESTING:-0}" = 1 ] && [ -n "${REPO_PWSH_TEST_ROUTE:-}" ]; then
    printf '%s\n' "$REPO_PWSH_TEST_ROUTE"
    return 0
  fi

  case "${PREFIX:-}" in
    *com.termux*) printf 'termux-community\n'; return 0 ;;
  esac
  if [ -n "${TERMUX_VERSION:-}" ]; then
    printf 'termux-community\n'
    return 0
  fi

  os=$(uname -s 2>/dev/null || printf unknown)
  case "$os" in
    Darwin)
      a=$(arch_kind)
      case "$a" in x64|arm64) ;; *) printf 'macos-unsupported\n'; return 0 ;; esac
      major=$(sw_vers -productVersion 2>/dev/null | awk -F. '{print $1}' || true)
      case "$major" in 14|15|26) printf 'macos-official-pkg\n' ;; *) printf 'macos-unsupported\n' ;; esac
      ;;
    Linux)
      if [ ! -r /etc/os-release ]; then
        printf 'linux-unsupported\n'
        return 0
      fi
      # shellcheck disable=SC1091
      . /etc/os-release
      a=$(arch_kind)
      if [ "$a" != x64 ]; then
        printf 'linux-unsupported\n'
        return 0
      fi
      case "${ID:-}:${VERSION_ID:-}" in
        debian:13) printf 'debian-pmc\n' ;;
        ubuntu:24.04|ubuntu:26.04) printf 'ubuntu-pmc\n' ;;
        *) printf 'linux-unsupported\n' ;;
      esac
      ;;
    *) printf 'unsupported\n' ;;
  esac
}

support_for_route() {
  case "$1" in
    debian-pmc|ubuntu-pmc|macos-official-pkg) printf 'SUPPORTED\n' ;;
    termux-community) printf 'COMMUNITY_UNSUPPORTED\n' ;;
    *) printf 'UNAVAILABLE\n' ;;
  esac
}

print_status() {
  route=$(platform_route)
  support=$(support_for_route "$route")
  if pwsh_satisfied; then
    p=$(pwsh_path)
    v=$(pwsh_version)
    printf 'status=SATISFIED\nsupport=%s\nroute=%s\npath=%s\nversion=%s\n' "$support" "$route" "$p" "$v"
  else
    printf 'status=MISSING\nsupport=%s\nroute=%s\n' "$support" "$route"
  fi
}

as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    fail "root privileges are required and sudo is unavailable"
  fi
}

install_pmc() {
  distro=$1
  version=$2
  if [ "$distro" = ubuntu ]; then
    prereqs='wget apt-transport-https software-properties-common'
  else
    prereqs='wget'
  fi
  command -v apt-get >/dev/null 2>&1 || fail 'apt-get is required for the selected PMC route'
  command -v dpkg >/dev/null 2>&1 || fail 'dpkg is required for the selected PMC route'

  as_root apt-get update
  # Intentionally unquoted expansion: fixed internal package-name list only.
  # shellcheck disable=SC2086
  as_root apt-get install -y $prereqs

  tmpdir=$(mktemp -d)
  repo_pkg="$tmpdir/packages-microsoft-prod.deb"
  trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM
  wget -q "https://packages.microsoft.com/config/$distro/$version/packages-microsoft-prod.deb" -O "$repo_pkg"
  as_root dpkg -i "$repo_pkg"
  as_root apt-get update
  as_root apt-get install -y powershell
  rm -rf "$tmpdir"
  trap - EXIT HUP INT TERM
}

install_macos_pkg() {
  command -v curl >/dev/null 2>&1 || fail 'curl is required for the macOS package route'
  command -v installer >/dev/null 2>&1 || fail 'macOS installer command is unavailable'
  a=$(arch_kind)
  case "$a" in x64) suffix='osx-x64.pkg' ;; arm64) suffix='osx-arm64.pkg' ;; *) fail "unsupported macOS architecture: $a" ;; esac

  release_json=$(curl -fsSL 'https://api.github.com/repos/PowerShell/PowerShell/releases/latest') || fail 'failed to query the official PowerShell release'
  asset_url=$(printf '%s\n' "$release_json" | grep -Eo "https://[^\"]*powershell-[^\"]*-$suffix" | head -n 1 || true)
  [ -n "$asset_url" ] || fail "could not resolve the latest official $suffix package"

  tmpdir=$(mktemp -d)
  pkg="$tmpdir/powershell.pkg"
  trap 'rm -rf "$tmpdir"' EXIT HUP INT TERM
  curl -fL "$asset_url" -o "$pkg"
  as_root installer -pkg "$pkg" -target /
  rm -rf "$tmpdir"
  trap - EXIT HUP INT TERM
}

install_pwsh() {
  # Idempotence barrier: a sufficient existing pwsh exits before route detection,
  # network access, package-manager calls, or privilege escalation.
  if pwsh_satisfied; then
    printf 'action=NOOP\nreason=ALREADY_SATISFIED\npath=%s\nversion=%s\n' "$(pwsh_path)" "$(pwsh_version)"
    return 0
  fi

  route=$(platform_route)
  case "$route" in
    debian-pmc) install_pmc debian 13 ;;
    ubuntu-pmc)
      # shellcheck disable=SC1091
      . /etc/os-release
      install_pmc ubuntu "$VERSION_ID"
      ;;
    macos-official-pkg) install_macos_pkg ;;
    termux-community)
      log 'Termux/Android is a community/unsupported lane; no automatic installer is implemented.' >&2
      return 4
      ;;
    *)
      log "No supported automatic installer for route=$route" >&2
      return 4
      ;;
  esac

  if pwsh_satisfied; then
    printf 'action=INSTALLED\npath=%s\nversion=%s\n' "$(pwsh_path)" "$(pwsh_version)"
    return 0
  fi
  fail 'installer completed but PowerShell 7 could not be verified in the current shell'
}

case "$MODE" in
  check)
    print_status
    ;;
  plan)
    if pwsh_satisfied; then
      printf 'action=NOOP\nreason=ALREADY_SATISFIED\npath=%s\nversion=%s\n' "$(pwsh_path)" "$(pwsh_version)"
    else
      route=$(platform_route)
      support=$(support_for_route "$route")
      printf 'action=INSTALL\nsupport=%s\nroute=%s\n' "$support" "$route"
      [ "$support" = SUPPORTED ] || exit 4
    fi
    ;;
  install)
    install_pwsh
    ;;
  verify)
    if pwsh_satisfied; then
      printf 'status=SATISFIED\npath=%s\nversion=%s\n' "$(pwsh_path)" "$(pwsh_version)"
    else
      printf 'status=MISSING\nminimum_major=%s\n' "$MIN_MAJOR" >&2
      exit 3
    fi
    ;;
  *)
    printf 'usage: %s {check|plan|install|verify}\n' "$0" >&2
    exit 2
    ;;
esac
