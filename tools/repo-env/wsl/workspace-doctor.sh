#!/usr/bin/env bash
set -u

SCHEMA='repo-wsl-workspace-doctor.v1'

emit_receipt() {
  local environment="$1"
  local path_kind="$2"
  local recommendation="$3"
  local result="$4"
  local reason="$5"
  printf '%s\n' \
    "schema=${SCHEMA}" \
    "environment=${environment}" \
    "path_kind=${path_kind}" \
    "recommendation=${recommendation}" \
    "result=${result}" \
    "reason=${reason}" \
    'details=withheld'
}

usage() {
  cat <<'EOF_HELP'
Usage: bash tools/repo-env/wsl/workspace-doctor.sh [ABSOLUTE_PATH]

Read-only advisory check for the current WSL workspace location. When no path is
provided, the current physical working directory is checked. The helper never
creates, moves, clones, configures, or deletes repository files or worktrees.
EOF_HELP
}

if [[ ${1:-} == '--help' || ${1:-} == '-h' ]]; then
  usage
  exit 0
fi

if (( $# > 1 )); then
  usage >&2
  exit 64
fi

is_wsl=0
if [[ -n ${WSL_DISTRO_NAME:-} || -n ${WSL_INTEROP:-} ]]; then
  is_wsl=1
elif [[ -r /proc/sys/kernel/osrelease ]]; then
  IFS= read -r osrelease < /proc/sys/kernel/osrelease || osrelease=''
  if [[ ${osrelease,,} == *microsoft* ]]; then
    is_wsl=1
  fi
fi

if (( is_wsl == 0 )); then
  emit_receipt 'non_wsl' 'unknown' 'none' 'not_applicable' 'NOT_WSL'
  exit 0
fi

if (( $# == 0 )); then
  target=$(pwd -P) || {
    emit_receipt 'wsl' 'unknown' 'inspect_manually' 'unknown' 'PWD_UNRESOLVED'
    exit 2
  }
else
  target=$1
  if [[ $target != /* ]]; then
    if [[ -d $target ]]; then
      target=$(cd -- "$target" && pwd -P) || {
        emit_receipt 'wsl' 'unknown' 'inspect_manually' 'unknown' 'RELATIVE_PATH_UNRESOLVED'
        exit 2
      }
    else
      emit_receipt 'wsl' 'unknown' 'inspect_manually' 'unknown' 'RELATIVE_PATH_UNRESOLVED'
      exit 2
    fi
  elif [[ -d $target ]]; then
    target=$(cd -- "$target" && pwd -P) || target=$1
  fi
fi

if [[ $target =~ ^/mnt/[[:alpha:]](/|$) ]]; then
  emit_receipt 'wsl' 'windows_drive_mount' 'prefer_wsl_linux_filesystem' 'warn' 'WINDOWS_DRIVE_MOUNT'
  exit 0
fi

emit_receipt 'wsl' 'not_windows_drive_mount' 'keep_current_location_if_linux_workload' 'pass' 'NO_WINDOWS_DRIVE_MOUNT_DETECTED'
exit 0
