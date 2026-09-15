#!/bin/sh
set -eu

MODE=check
BLOCKING=0
BLOCKED=0

usage() {
    printf '%s\n' 'usage: bootstrap.sh [--check|--apply]' >&2
    exit 2
}

[ "$#" -le 1 ] || usage
if [ "$#" -eq 1 ]; then
    case "$1" in
        --check) MODE=check ;;
        --apply) MODE=apply ;;
        *) usage ;;
    esac
fi

emit() {
    printf '%s %s\n' "$1" "$2"
}

package_present() {
    dpkg-query -W -f='${Status}\n' "$1" 2>/dev/null | grep -Fqx 'install ok installed'
}
command_present() {
    command -v "$1" >/dev/null 2>&1
}

install_package() {
    package=$1
    pkg install -y --no-upgrade --no-remove "$package" >/dev/null 2>&1
}

command -v dpkg-query >/dev/null 2>&1 || {
    emit BLOCKED package-query:unavailable
    exit 2
}

command -v pkg >/dev/null 2>&1 || {
    emit BLOCKED package-manager:unavailable
    exit 2
}

check_tool() {
    package=$1
    command_name=$2

    if package_present "$package"; then
        if command_present "$command_name"; then
            emit PRESENT "tool:$command_name package:$package"
        else
            emit BLOCKED "tool:$command_name contract-mismatch"
            BLOCKED=1
        fi
        return 0
    fi
    if [ "$MODE" = check ]; then
        emit MISSING "tool:$command_name package:$package"
        BLOCKING=1
        return 0
    fi

    if install_package "$package" \
        && package_present "$package" \
        && command_present "$command_name"; then
        emit INSTALLED "tool:$command_name package:$package"
        return 0
    fi

    emit FAILED "tool:$command_name package:$package"
    BLOCKING=1
}

check_tool ripgrep rg
check_tool jq jq
check_tool file file

if [ "$BLOCKED" -ne 0 ]; then
    exit 2
fi
if [ "$BLOCKING" -ne 0 ]; then
    exit 1
fi
exit 0
