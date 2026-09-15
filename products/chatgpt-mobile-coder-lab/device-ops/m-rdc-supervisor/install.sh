#!/data/data/com.termux/files/usr/bin/sh
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
HOME_DIR=/data/data/com.termux/files/home
if [ "${MCL_M_RDC_SUPERVISOR_TEST_MODE:-0}" = "1" ]; then
    TEST_ROOT="${MCL_M_RDC_SUPERVISOR_TEST_ROOT:?test root required}"
    HOME_DIR="$TEST_ROOT/home"
fi

SOURCE_GUARD="$SCRIPT_DIR/m-rdc-supervisor-guard"
SOURCE_LAUNCHER="$SCRIPT_DIR/31-mcl-m-rdc-supervisor-guard"
DEST_GUARD="$HOME_DIR/.local/bin/mcl-m-rdc-supervisor-guard"
DEST_LAUNCHER="$HOME_DIR/.termux/boot/31-mcl-m-rdc-supervisor-guard"

file_state() {
    src="$1"
    dst="$2"
    if [ ! -e "$dst" ]; then
        FILE_STATE=missing
    elif [ ! -f "$dst" ] || [ -L "$dst" ]; then
        FILE_STATE=drift
    elif cmp -s "$src" "$dst" && [ -x "$dst" ]; then
        FILE_STATE=present
    else
        FILE_STATE=drift
    fi
}
emit_check() {
    file_state "$SOURCE_GUARD" "$DEST_GUARD"
    guard_state="$FILE_STATE"
    file_state "$SOURCE_LAUNCHER" "$DEST_LAUNCHER"
    launcher_state="$FILE_STATE"

    result=pass
    [ "$guard_state" = present ] || result="$guard_state"
    if [ "$launcher_state" != present ]; then
        if [ "$result" = pass ] || [ "$launcher_state" = drift ]; then
            result="$launcher_state"
        fi
    fi

    printf '%s\n' \
        'schema=mcl-m-rdc-supervisor-install.v1' \
        "guard=$guard_state" \
        "launcher=$launcher_state" \
        "result=$result" \
        'details=withheld'

    case "$result" in
        pass) return 0 ;;
        missing) return 1 ;;
        *) return 2 ;;
    esac
}
apply_files() {
    mkdir -p "$(dirname "$DEST_GUARD")" "$(dirname "$DEST_LAUNCHER")"
    cp "$SOURCE_GUARD" "$DEST_GUARD"
    cp "$SOURCE_LAUNCHER" "$DEST_LAUNCHER"
    chmod 755 "$DEST_GUARD" "$DEST_LAUNCHER"
    emit_check
}

case "${1:-}" in
    --check)
        emit_check
        ;;
    --apply)
        apply_files
        ;;
    *)
        printf '%s\n' 'usage: install.sh --check|--apply' >&2
        exit 2
        ;;
esac
