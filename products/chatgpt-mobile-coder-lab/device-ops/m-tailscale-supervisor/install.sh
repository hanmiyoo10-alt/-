#!/data/data/com.termux/files/usr/bin/sh
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PREFIX=/data/data/com.termux/files/usr
HOME_DIR=/data/data/com.termux/files/home
if [ "${MCL_M_TAILSCALE_SUPERVISOR_TEST_MODE:-0}" = "1" ]; then
    TEST_ROOT="${MCL_M_TAILSCALE_SUPERVISOR_TEST_ROOT:?test root required}"
    PREFIX="$TEST_ROOT/prefix"
    HOME_DIR="$TEST_ROOT/home"
fi

SOURCE_GUARD="$SCRIPT_DIR/m-tailscale-supervisor-guard"
SOURCE_SERVICE_RUN="$SCRIPT_DIR/service/run"
SOURCE_LAUNCHER="$SCRIPT_DIR/32-mcl-m-tailscale-supervisor-guard"
DEST_GUARD="$HOME_DIR/.local/bin/mcl-m-tailscale-supervisor-guard"
DEST_SERVICE_RUN="$PREFIX/var/service/mcl-m-tailscale-supervisor-guard/run"
DEST_LAUNCHER="$HOME_DIR/.termux/boot/32-mcl-m-tailscale-supervisor-guard"

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
service_run_state() {
    service_dir="$(dirname "$DEST_SERVICE_RUN")"
    if [ -L "$service_dir" ] || { [ -e "$service_dir" ] && [ ! -d "$service_dir" ]; }; then
        FILE_STATE=drift
        return 0
    fi
    file_state "$SOURCE_SERVICE_RUN" "$DEST_SERVICE_RUN"
}
combine_state() {
    state="$1"
    case "$state" in
        drift) RESULT=drift ;;
        missing) [ "$RESULT" = drift ] || RESULT=missing ;;
    esac
}
emit_check() {
    file_state "$SOURCE_GUARD" "$DEST_GUARD"
    guard_state="$FILE_STATE"
    service_run_state
    service_state="$FILE_STATE"
    file_state "$SOURCE_LAUNCHER" "$DEST_LAUNCHER"
    launcher_state="$FILE_STATE"

    RESULT=pass
    combine_state "$guard_state"
    combine_state "$service_state"
    combine_state "$launcher_state"
    printf '%s\n' \
        'schema=mcl-m-tailscale-supervisor-install.v2' \
        "guard=$guard_state" \
        "guard_service=$service_state" \
        "launcher=$launcher_state" \
        "result=$RESULT" \
        'details=withheld'

    case "$RESULT" in
        pass) return 0 ;;
        missing) return 1 ;;
        *) return 2 ;;
    esac
}
apply_files() {
    service_dir="$(dirname "$DEST_SERVICE_RUN")"
    if [ -e "$service_dir" ] && { [ ! -d "$service_dir" ] || [ -L "$service_dir" ]; }; then
        printf '%s\n' 'guard service path conflict' >&2
        return 2
    fi

    mkdir -p "$(dirname "$DEST_GUARD")" "$(dirname "$DEST_LAUNCHER")" "$(dirname "$service_dir")"
    cp "$SOURCE_GUARD" "$DEST_GUARD"
    cp "$SOURCE_LAUNCHER" "$DEST_LAUNCHER"
    chmod 755 "$DEST_GUARD" "$DEST_LAUNCHER"
    if [ ! -e "$service_dir" ]; then
        stage="$HOME_DIR/.local/state/mcl-m-tailscale-supervisor-guard/install-service.$$"
        rm -rf "$stage"
        mkdir -p "$(dirname "$stage")" "$stage"
        cp "$SOURCE_SERVICE_RUN" "$stage/run"
        chmod 755 "$stage/run"
        if ! mv "$stage" "$service_dir"; then
            rm -rf "$stage"
            return 1
        fi
    else
        cp "$SOURCE_SERVICE_RUN" "$DEST_SERVICE_RUN.new"
        chmod 755 "$DEST_SERVICE_RUN.new"
        mv "$DEST_SERVICE_RUN.new" "$DEST_SERVICE_RUN"
    fi
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
