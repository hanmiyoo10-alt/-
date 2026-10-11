#!/data/data/com.termux/files/usr/bin/sh
set -eu

SCHEMA=pocketrisu-termux-boot-legacy20-retirement.v1
FIXED_HOME=/data/data/com.termux/files/home
PREFIX=/data/data/com.termux/files/usr
PROD_LEGACY_SHA=c6c6dd4c62d78687ac901948cb39a1fa4643e27f696f914c71a2f027a70f5cf4
PROD_REPLACEMENT_SHA=d441c7c5a13bd9b1cf303dcc599d42a494d1bdab780a8086e505006a69cc3992

usage() {
    printf '%s\n' 'usage: retire-legacy-20.sh --check|--apply|--restore' >&2
    exit 2
}

blocked() {
    printf '%s\n' "BLOCKED $1" >&2
    exit 2
}

[ "$#" -eq 1 ] || usage
OP=$1
case "$OP" in
    --check|--apply|--restore) ;;
    *) usage ;;
esac

TEST_MODE=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE:-0}
case "$TEST_MODE" in
    0)
        [ "${HOME:-}" = "$FIXED_HOME" ] || blocked 'wrong execution home'
        HOME_DIR=$FIXED_HOME
        LEGACY_SHA=$PROD_LEGACY_SHA
        REPLACEMENT_SHA=$PROD_REPLACEMENT_SHA
        SHA256SUM="$PREFIX/bin/sha256sum"
        AWK="$PREFIX/bin/awk"
        STAT="$PREFIX/bin/stat"
        MKDIR="$PREFIX/bin/mkdir"
        CHMOD="$PREFIX/bin/chmod"
        MV="$PREFIX/bin/mv"
        ;;
    1)
        TEST_ROOT=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_ROOT:-}
        case "$TEST_ROOT" in
            /tmp/pocketrisu-termux-boot-retire-test-*) ;;
            *) blocked 'invalid test root' ;;
        esac
        HOME_DIR="$TEST_ROOT/home"
        LEGACY_SHA=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_LEGACY_SHA:-}
        REPLACEMENT_SHA=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_REPLACEMENT_SHA:-}
        SHA256SUM=sha256sum
        AWK=awk
        STAT=stat
        MKDIR=mkdir
        CHMOD=chmod
        MV=mv
        ;;
    *)
        blocked 'invalid test mode'
        ;;
esac

case "$LEGACY_SHA" in
    ????????????????????????????????????????????????????????????????) ;;
    *) blocked 'invalid legacy identity' ;;
esac
case "$REPLACEMENT_SHA" in
    ????????????????????????????????????????????????????????????????) ;;
    *) blocked 'invalid replacement identity' ;;
esac

ACTIVE="$HOME_DIR/.termux/boot/20-pocketrisu-ssh-tunnel"
ARCHIVE_ROOT="$HOME_DIR/.termux/boot-disabled"
ARCHIVE="$ARCHIVE_ROOT/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
REPLACEMENT="$HOME_DIR/.termux/boot/21-pocketrisu-core-supervisor-guard"

path_absent() {
    [ ! -e "$1" ] && [ ! -L "$1" ]
}

file_sha() {
    "$SHA256SUM" "$1" 2>/dev/null | "$AWK" '{print $1}'
}

file_state() {
    path=$1
    wanted=$2
    if path_absent "$path"; then
        printf '%s\n' absent
        return
    fi
    if [ -L "$path" ]; then
        printf '%s\n' symlink
        return
    fi
    if [ ! -f "$path" ]; then
        printf '%s\n' invalid
        return
    fi
    if [ "$("$STAT" -c %a "$path" 2>/dev/null || true)" != 700 ]; then
        printf '%s\n' mode
        return
    fi
    if [ "$(file_sha "$path" || true)" != "$wanted" ]; then
        printf '%s\n' drift
        return
    fi
    printf '%s\n' exact
}

archive_root_state() {
    if path_absent "$ARCHIVE_ROOT"; then
        printf '%s\n' absent
        return
    fi
    if [ -L "$ARCHIVE_ROOT" ]; then
        printf '%s\n' symlink
        return
    fi
    if [ ! -d "$ARCHIVE_ROOT" ]; then
        printf '%s\n' invalid
        return
    fi
    if [ "$("$STAT" -c %a "$ARCHIVE_ROOT" 2>/dev/null || true)" != 700 ]; then
        printf '%s\n' mode
        return
    fi
    printf '%s\n' exact
}

classify() {
    ACTIVE_STATE=$(file_state "$ACTIVE" "$LEGACY_SHA")
    ARCHIVE_STATE=$(file_state "$ARCHIVE" "$LEGACY_SHA")
    REPLACEMENT_STATE=$(file_state "$REPLACEMENT" "$REPLACEMENT_SHA")
    ARCHIVE_ROOT_STATE=$(archive_root_state)
    STATE=blocked
    REASON=identity

    case "$ARCHIVE_ROOT_STATE" in
        absent|exact) ;;
        *)
            REASON=archive-root
            return
            ;;
    esac

    case "$ACTIVE_STATE:$ARCHIVE_STATE" in
        exact:absent)
            STATE=active_exact
            REASON=eligible
            ;;
        absent:exact)
            STATE=retired_exact
            REASON=already-retired
            ;;
        absent:absent)
            STATE=missing
            REASON=legacy-missing
            ;;
        exact:exact)
            STATE=partial
            REASON=duplicate
            ;;
        *)
            STATE=blocked
            REASON=identity
            ;;
    esac
}

require_exact_replacement() {
    [ "$REPLACEMENT_STATE" = exact ] && return 0
    STATE=blocked
    REASON=replacement
    return 1
}

emit() {
    printf '%s\n' \
        "schema=$SCHEMA" \
        "operation=$1" \
        "state=$STATE" \
        "active=$ACTIVE_STATE" \
        "archive=$ARCHIVE_STATE" \
        "replacement=$REPLACEMENT_STATE" \
        "archive_root=$ARCHIVE_ROOT_STATE" \
        "result=$2" \
        "reason=$REASON" \
        'details=withheld'
}

ensure_archive_root() {
    state=$(archive_root_state)
    case "$state" in
        exact)
            return 0
            ;;
        absent)
            old_umask=$(umask)
            umask 077
            "$MKDIR" "$ARCHIVE_ROOT" || {
                umask "$old_umask"
                return 1
            }
            "$CHMOD" 700 "$ARCHIVE_ROOT" || {
                umask "$old_umask"
                return 1
            }
            umask "$old_umask"
            [ "$(archive_root_state)" = exact ]
            ;;
        *)
            return 1
            ;;
    esac
}

check_only() {
    classify
    require_exact_replacement || {
        emit check blocked
        return 2
    }
    case "$STATE" in
        active_exact|retired_exact)
            emit check pass
            ;;
        *)
            emit check blocked
            return 2
            ;;
    esac
}

apply_retirement() {
    classify
    require_exact_replacement || {
        emit apply blocked
        return 2
    }
    case "$STATE" in
        retired_exact)
            emit apply pass
            return
            ;;
        active_exact) ;;
        *)
            emit apply blocked
            return 2
            ;;
    esac

    ensure_archive_root || {
        classify
        REASON=archive-root
        emit apply blocked
        return 2
    }

    classify
    require_exact_replacement || {
        emit apply blocked
        return 2
    }
    [ "$STATE" = active_exact ] || {
        emit apply blocked
        return 2
    }
    path_absent "$ARCHIVE" || {
        REASON=archive-present
        emit apply blocked
        return 2
    }

    if ! "$MV" "$ACTIVE" "$ARCHIVE"; then
        classify
        REASON=move-failed
        emit apply unknown
        return 2
    fi

    classify
    if [ "$STATE" = retired_exact ]; then
        if require_exact_replacement; then
            REASON=none
            emit apply pass
        else
            emit apply unknown
            return 2
        fi
    else
        REASON=post-move
        emit apply unknown
        return 2
    fi
}

restore_retirement() {
    classify
    case "$STATE" in
        active_exact)
            REASON=already-active
            emit restore pass
            return
            ;;
        retired_exact) ;;
        *)
            emit restore blocked
            return 2
            ;;
    esac

    path_absent "$ACTIVE" || {
        REASON=active-present
        emit restore blocked
        return 2
    }

    if ! "$MV" "$ARCHIVE" "$ACTIVE"; then
        classify
        REASON=restore-move-failed
        emit restore unknown
        return 2
    fi

    classify
    if [ "$STATE" = active_exact ]; then
        REASON=none
        emit restore pass
    else
        REASON=post-restore
        emit restore unknown
        return 2
    fi
}

case "$OP" in
    --check) check_only ;;
    --apply) apply_retirement ;;
    --restore) restore_retirement ;;
esac
