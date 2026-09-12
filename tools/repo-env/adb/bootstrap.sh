#!/bin/sh
set -eu

MODE="${1:-check}"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

case "$MODE" in
    check|plan|install|verify) ;;
    *)
        printf 'usage: %s {check|plan|install|verify}\n' "$0" >&2
        exit 2
        ;;
esac

resolve_adb() {
    if [ "${REPO_ADB_TESTING:-0}" = "1" ] && [ -n "${REPO_ADB_TEST_ADB_PATH:-}" ]; then
        if [ "${REPO_ADB_TEST_ADB_PATH}" = "MISSING" ]; then
            return 1
        fi
        printf '%s\n' "${REPO_ADB_TEST_ADB_PATH}"
        return 0
    fi
    command -v adb 2>/dev/null
}

already_satisfied() {
    adb_path="$(resolve_adb || true)"
    [ -n "$adb_path" ] || return 1
    printf 'status=READY path=%s\n' "$adb_path"
    return 0
}

detect_route() {
    if [ "${REPO_ADB_TESTING:-0}" = "1" ] && [ -n "${REPO_ADB_TEST_ROUTE:-}" ]; then
        printf '%s\n' "${REPO_ADB_TEST_ROUTE}"
        return 0
    fi

    if [ -r /etc/os-release ] && command -v apt-get >/dev/null 2>&1; then
        ID=
        . /etc/os-release
        case "${ID:-}" in
            ubuntu|debian)
                if [ "$(id -u)" = "0" ]; then
                    printf '%s\n' 'apt-adb-root'
                else
                    printf '%s\n' 'apt-adb-admin-required'
                fi
                return 0
                ;;
        esac
    fi

    if command -v pkg >/dev/null 2>&1; then
        if [ "$(id -u)" = "0" ]; then
            printf '%s\n' 'termux-root-blocked'
        else
            printf '%s\n' 'termux-android-tools'
        fi
        return 0
    fi

    printf '%s\n' 'unsupported'
}

print_plan() {
    route="$1"
    case "$route" in
        termux-android-tools)
            printf '%s\n' 'action=INSTALL support=SUPPORTED route=termux-android-tools package=android-tools'
            ;;
        apt-adb-root)
            printf '%s\n' 'action=INSTALL support=SUPPORTED route=apt-adb-root package=adb'
            ;;
        apt-adb-admin-required)
            printf '%s\n' 'action=BLOCKED support=SUPPORTED route=apt-adb-admin-required reason=ADMIN_REQUIRED'
            ;;
        termux-root-blocked)
            printf '%s\n' 'action=BLOCKED support=SUPPORTED route=termux-root-blocked reason=TERMUX_PKG_REFUSES_ROOT'
            ;;
        *)
            printf '%s\n' 'action=BLOCKED support=UNAVAILABLE route=unsupported reason=NO_AUTHORIZED_ROUTE'
            ;;
    esac
}

if [ "$MODE" = "check" ]; then
    if already_satisfied; then
        sh "$SCRIPT_DIR/adb.sh" version | sed -n '1,2p'
        exit 0
    fi
    printf '%s\n' 'status=MISSING reason=ADB_NOT_FOUND'
    exit 3
fi

if [ "$MODE" = "plan" ]; then
    if adb_path="$(resolve_adb || true)" && [ -n "$adb_path" ]; then
        printf 'action=NOOP reason=ALREADY_SATISFIED path=%s\n' "$adb_path"
        exit 0
    fi
    print_plan "$(detect_route)"
    exit 0
fi

if [ "$MODE" = "install" ]; then
    if adb_path="$(resolve_adb || true)" && [ -n "$adb_path" ]; then
        printf 'action=NOOP reason=ALREADY_SATISFIED path=%s\n' "$adb_path"
        exit 0
    fi

    route="$(detect_route)"
    case "$route" in
        termux-android-tools)
            pkg install -y android-tools
            ;;
        apt-adb-root)
            apt-get update
            apt-get install -y adb
            ;;
        apt-adb-admin-required)
            printf '%s\n' 'status=BLOCKED reason=ADMIN_REQUIRED' >&2
            exit 4
            ;;
        termux-root-blocked)
            printf '%s\n' 'status=BLOCKED reason=TERMUX_PKG_REFUSES_ROOT' >&2
            exit 4
            ;;
        *)
            printf '%s\n' 'status=BLOCKED reason=NO_AUTHORIZED_ROUTE' >&2
            exit 4
            ;;
    esac

    adb_path="$(resolve_adb || true)"
    if [ -z "$adb_path" ]; then
        printf '%s\n' 'status=FAILED reason=ADB_STILL_MISSING' >&2
        exit 5
    fi
    printf 'action=INSTALLED path=%s route=%s\n' "$adb_path" "$route"
    exit 0
fi

if [ "$MODE" = "verify" ]; then
    adb_path="$(resolve_adb || true)"
    if [ -z "$adb_path" ]; then
        printf '%s\n' 'status=MISSING reason=ADB_NOT_FOUND' >&2
        exit 3
    fi

    sh "$SCRIPT_DIR/adb.sh" version
    sh "$SCRIPT_DIR/adb.sh" start-server
    sh "$SCRIPT_DIR/adb.sh" devices
    printf 'status=READY path=%s\n' "$adb_path"
    exit 0
fi
