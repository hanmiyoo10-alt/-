#!/data/data/com.termux/files/usr/bin/sh
set -u

PRODUCTION_EXPECTED_SHA256='c6c6dd4c62d78687ac901948cb39a1fa4643e27f696f914c71a2f027a70f5cf4'
EXPECTED_MODE='700'
HOME_DIR="${HOME:-/data/data/com.termux/files/home}"
EXPECTED_SHA256="$PRODUCTION_EXPECTED_SHA256"

if [ "${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE:-0}" = "1" ]; then
    HOME_DIR="${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_HOME:?test home required}"
    EXPECTED_SHA256="${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_EXPECTED_SHA256:?test sha required}"
fi

ACTIVE="$HOME_DIR/.termux/boot/20-pocketrisu-ssh-tunnel"
REPLACEMENT="$HOME_DIR/.termux/boot/21-pocketrisu-core-supervisor-guard"
DISABLED_DIR="$HOME_DIR/.termux/boot-disabled"
ARCHIVE="$DISABLED_DIR/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
OPERATION="${1:---check}"

case "$EXPECTED_SHA256" in
    [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]*)
        [ "${#EXPECTED_SHA256}" -eq 64 ] || exit 2
        ;;
    *) exit 2 ;;
esac

[ "$#" -eq 1 ] || {
    printf '%s
' 'usage: retire-legacy-20.sh --check|--apply' >&2
    exit 2
}

case "$OPERATION" in
    --check|--apply) ;;
    *)
        printf '%s
' 'usage: retire-legacy-20.sh --check|--apply' >&2
        exit 2
        ;;
esac

classify_legacy() {
    path="$1"
    if [ -L "$path" ]; then
        printf '%s
' symlink
        return
    fi
    if [ ! -e "$path" ]; then
        printf '%s
' absent
        return
    fi
    if [ ! -f "$path" ]; then
        printf '%s
' invalid
        return
    fi
    mode="$(stat -c '%a' "$path" 2>/dev/null || true)"
    if [ "$mode" != "$EXPECTED_MODE" ]; then
        printf '%s
' drift
        return
    fi
    digest="$(sha256sum "$path" 2>/dev/null | awk '{print $1}')"
    if [ "$digest" = "$EXPECTED_SHA256" ]; then
        printf '%s
' exact
    else
        printf '%s
' drift
    fi
}

classify_replacement() {
    if [ -L "$REPLACEMENT" ]; then
        printf '%s
' symlink
    elif [ ! -e "$REPLACEMENT" ]; then
        printf '%s
' absent
    elif [ -f "$REPLACEMENT" ] && [ -x "$REPLACEMENT" ]; then
        printf '%s
' present
    else
        printf '%s
' invalid
    fi
}

classify_archive_dir() {
    if [ -L "$DISABLED_DIR" ]; then
        printf '%s
' invalid
    elif [ ! -e "$DISABLED_DIR" ]; then
        printf '%s
' absent
    elif [ -d "$DISABLED_DIR" ]; then
        printf '%s
' present
    else
        printf '%s
' invalid
    fi
}

inspect_state() {
    ACTIVE_STATE="$(classify_legacy "$ACTIVE")"
    ARCHIVE_STATE="$(classify_legacy "$ARCHIVE")"
    REPLACEMENT_STATE="$(classify_replacement)"
    ARCHIVE_DIR_STATE="$(classify_archive_dir)"

    RESULT=blocked
    if [ "$REPLACEMENT_STATE" = present ] && [ "$ARCHIVE_DIR_STATE" != invalid ]; then
        if [ "$ACTIVE_STATE" = exact ] && [ "$ARCHIVE_STATE" = absent ]; then
            RESULT=ready
        elif [ "$ACTIVE_STATE" = absent ] && [ "$ARCHIVE_STATE" = exact ]; then
            RESULT=already_retired
        fi
    fi
}

emit() {
    printf '%s
' \
        'schema=pocketrisu-termux-boot-legacy20-retire.v1' \
        "operation=${OPERATION#--}" \
        "active=$ACTIVE_STATE" \
        "archive=$ARCHIVE_STATE" \
        "archive_dir=$ARCHIVE_DIR_STATE" \
        "replacement=$REPLACEMENT_STATE" \
        "result=$RESULT" \
        'details=withheld'
}

inspect_state

if [ "$OPERATION" = --check ]; then
    emit
    if [ "$RESULT" = ready ] || [ "$RESULT" = already_retired ]; then
        exit 0
    fi
    exit 2
fi

if [ "$RESULT" = already_retired ]; then
    emit
    exit 0
fi

if [ "$RESULT" != ready ]; then
    emit
    exit 2
fi

if [ "$ARCHIVE_DIR_STATE" = absent ]; then
    mkdir -m 700 -p "$DISABLED_DIR" || {
        RESULT=failed
        emit
        exit 1
    }
fi

inspect_state
if [ "$RESULT" != ready ]; then
    emit
    exit 2
fi

if ! mv "$ACTIVE" "$ARCHIVE"; then
    RESULT=failed
    emit
    exit 1
fi

inspect_state
if [ "$ACTIVE_STATE" = absent ] && [ "$ARCHIVE_STATE" = exact ] \
    && [ "$REPLACEMENT_STATE" = present ]; then
    RESULT=retired
    emit
    exit 0
fi

RESULT=failed
emit
exit 1
