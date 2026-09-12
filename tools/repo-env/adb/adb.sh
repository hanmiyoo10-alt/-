#!/bin/sh
set -eu

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

adb_path="$(resolve_adb || true)"
if [ -z "$adb_path" ]; then
    printf '%s\n' 'status=MISSING reason=ADB_NOT_FOUND' >&2
    exit 3
fi

normalize_termux_tmp=0
termux_tmp=/data/data/com.termux/files/usr/tmp

if [ "${REPO_ADB_TESTING:-0}" = "1" ] && [ "${REPO_ADB_TEST_TERMUX:-0}" = "1" ]; then
    normalize_termux_tmp=1
    termux_tmp="${REPO_ADB_TEST_TERMUX_TMP:-$termux_tmp}"
else
    case "$adb_path" in
        /data/data/com.termux/files/usr/bin/adb) normalize_termux_tmp=1 ;;
    esac
fi

if [ "$normalize_termux_tmp" = "1" ]; then
    current_tmp="${TMPDIR:-}"
    if [ -z "$current_tmp" ] || [ ! -w "$current_tmp" ]; then
        if [ ! -d "$termux_tmp" ] || [ ! -w "$termux_tmp" ]; then
            printf 'status=BLOCKED reason=TERMUX_TMP_UNAVAILABLE path=%s\n' "$termux_tmp" >&2
            exit 5
        fi
        TMPDIR="$termux_tmp"
        export TMPDIR
    fi
fi

exec "$adb_path" "$@"
