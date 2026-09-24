#!/data/data/com.termux/files/usr/bin/sh
set -u

PREFIX="${POCKETRISU_PREFIX:-/data/data/com.termux/files/usr}"
SERVICE="${POCKETRISU_SERVICE:-$PREFIX/var/service/pocketrisu-ssh-tunnel}"
STATE="${POCKETRISU_GUARD_STATE:-$HOME/.local/state/pocketrisu-core-supervisor-guard}"
SV="${POCKETRISU_SV:-$PREFIX/bin/sv}"
RUNSV="${POCKETRISU_RUNSV:-$PREFIX/bin/runsv}"
NOHUP="${POCKETRISU_NOHUP:-$PREFIX/bin/nohup}"
SLEEP="${POCKETRISU_SLEEP:-$PREFIX/bin/sleep}"
DATE="${POCKETRISU_DATE:-$PREFIX/bin/date}"
TR="${POCKETRISU_TR:-$PREFIX/bin/tr}"
CHECK_INTERVAL="${POCKETRISU_GUARD_INTERVAL:-15}"
MODE="${1:---loop}"

LOG="$STATE/events.log"
PIDFILE="$STATE/guard.pid"
LOCKDIR="$STATE/guard.lock"
RUNSV_LOG="$STATE/runsv.log"
LAUNCHER="$HOME/.termux/boot/21-pocketrisu-core-supervisor-guard"

mkdir -p "$STATE"

log() {
    printf '%s %s\n' "$("$DATE" '+%Y-%m-%d %H:%M:%S %z')" "$*" >> "$LOG"
}
supervisor_state() {
    status="$("$SV" status "$SERVICE" 2>&1 || true)"
    case "$status" in
        run:*|down:*) return 0 ;;
        *"runsv not running"*|*"unable to open supervise/ok: file does not exist"*) return 1 ;;
        *) return 2 ;;
    esac
}

restore_core_supervisor() {
    [ -d "$SERVICE" ] || { log "skip=service-missing"; return 0; }
    [ ! -e "$SERVICE/down" ] || { log "skip=operator-down"; return 0; }

    supervisor_state
    state_rc=$?
    [ "$state_rc" -ne 0 ] || return 0
    if [ "$state_rc" -eq 2 ]; then
        log "skip=ambiguous-status"
        return 2
    fi

    log "action=start-core-runsv"
    "$NOHUP" "$RUNSV" "$SERVICE" >> "$RUNSV_LOG" 2>&1 &

    i=0
    while [ "$i" -lt 5 ]; do
        "$SLEEP" 1
        supervisor_state
        state_rc=$?
        if [ "$state_rc" -eq 0 ]; then
            log "result=supervisor-restored"
            return 0
        fi
        if [ "$state_rc" -eq 2 ]; then
            log "result=ambiguous-after-start"
            return 1
        fi
        i=$((i + 1))
    done

    log "result=supervisor-start-failed"
    return 1
}
loop_pid_state() {
    [ -r "$PIDFILE" ] || return 1
    oldpid="$(cat "$PIDFILE" 2>/dev/null || true)"
    case "$oldpid" in ''|*[!0-9]*) return 1 ;; esac
    kill -0 "$oldpid" 2>/dev/null || return 1
    cmdline="$("$TR" '\000' ' ' < "/proc/$oldpid/cmdline" 2>/dev/null || true)"
    case "$cmdline" in
        *pocketrisu-core-supervisor-guard*--loop*) return 0 ;;
        *) return 2 ;;
    esac
}

acquire_loop_lock() {
    if mkdir "$LOCKDIR" 2>/dev/null; then
        printf '%s\n' "$$" > "$PIDFILE"
        return 0
    fi

    loop_pid_state
    state_rc=$?
    [ "$state_rc" -ne 0 ] || return 1
    [ "$state_rc" -ne 2 ] || return 2

    rm -rf "$LOCKDIR"
    mkdir "$LOCKDIR" 2>/dev/null || return 1
    printf '%s\n' "$$" > "$PIDFILE"
}
cleanup() {
    current="$(cat "$PIDFILE" 2>/dev/null || true)"
    [ "$current" = "$$" ] && rm -f "$PIDFILE"
    rmdir "$LOCKDIR" 2>/dev/null || true
}

terminate_loop() {
    cleanup
    trap - EXIT INT TERM HUP
    exit 0
}

ensure_anchor() {
    [ -f "$LAUNCHER" ] && [ ! -L "$LAUNCHER" ] && [ -x "$LAUNCHER" ] || return 1
    "$LAUNCHER" --ensure-anchor >/dev/null 2>&1
}

case "$MODE" in
    --once)
        restore_core_supervisor
        ;;
    --loop)
        acquire_loop_lock
        lock_rc=$?
        [ "$lock_rc" -ne 1 ] || exit 0
        [ "$lock_rc" -ne 2 ] || exit 2
        trap cleanup EXIT
        trap terminate_loop INT TERM HUP
        log "guard=started interval=${CHECK_INTERVAL}s"
        while :; do
            restore_core_supervisor || true
            ensure_anchor || true
            "$SLEEP" "$CHECK_INTERVAL"
        done
        ;;
    *)
        echo "usage: $0 [--once|--loop]" >&2
        exit 2
        ;;
esac
