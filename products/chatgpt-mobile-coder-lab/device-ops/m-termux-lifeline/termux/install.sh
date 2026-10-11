#!/data/data/com.termux/files/usr/bin/sh
set -u

PREFIX=/data/data/com.termux/files/usr
HOME_DIR=/data/data/com.termux/files/home
SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LIB_DIR="$HOME_DIR/.local/lib/mcl-m-termux-lifeline"
BIN_DIR="$HOME_DIR/.local/bin"
BOOT_DIR="$HOME_DIR/.termux/boot"

SOURCE_CLIENT="$SELF_DIR/heartbeat-client.py"
SOURCE_RECOVERY="$SELF_DIR/mcl-m-termux-lifeline-recover"
SOURCE_BOOT="$SELF_DIR/30-mcl-m-termux-lifeline-heartbeat"
TARGET_CLIENT="$LIB_DIR/heartbeat-client.py"
TARGET_RECOVERY="$BIN_DIR/mcl-m-termux-lifeline-recover"
TARGET_BOOT="$BOOT_DIR/30-mcl-m-termux-lifeline-heartbeat"

emit() {
    printf '%s\n' \
        'schema=mcl-m-termux-lifeline-files.v1' \
        "operation=$1" \
        "status=$2" \
        'settings_mutated=false' \
        'permissions_mutated=false' \
        'runtime_started=false' \
        'details=withheld'
}

check_file() {
    [ -f "$2" ] && [ ! -L "$2" ] && cmp -s "$1" "$2"
}

case "${1:-}" in
    --check)
        if check_file "$SOURCE_CLIENT" "$TARGET_CLIENT" &&
           check_file "$SOURCE_RECOVERY" "$TARGET_RECOVERY" &&
           check_file "$SOURCE_BOOT" "$TARGET_BOOT"; then
            emit check pass
            exit 0
        fi
        emit check needs_install
        exit 1
        ;;
    --install)
        [ "$#" -eq 1 ] || exit 2
        mkdir -p "$LIB_DIR" "$BIN_DIR" "$BOOT_DIR" || exit 2
        cp "$SOURCE_CLIENT" "$TARGET_CLIENT" || exit 2
        cp "$SOURCE_RECOVERY" "$TARGET_RECOVERY" || exit 2
        cp "$SOURCE_BOOT" "$TARGET_BOOT" || exit 2
        chmod 700 "$TARGET_CLIENT" "$TARGET_RECOVERY" "$TARGET_BOOT" || exit 2
        emit install pass
        ;;
    *)
        printf '%s\n' 'usage: install.sh --check|--install' >&2
        exit 2
        ;;
esac
