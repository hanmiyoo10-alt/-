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
CHECK_INTERVAL="${POCKETRISU_GUARD_INTERVAL:-15}"
MODE="${1:---loop}"

LOG="$STATE/events.log"
PIDFILE="$STATE/guard.pid"
LOCKDIR="$STATE/guard.lock"
RUNSV_LOG="$STATE/runsv.log"

mkdir -p "$STATE"

log() {
    printf '%s %s\n' "$("$DATE" '+%Y-%m-%d %H:%M:%S %z')" "$*" >> "$LOG"
}

supervisor_present() {
    status="$($SV status "$SERVICE" 2>&1 || true)"
    case "$status" in
        *"runsv not running"*) return 1 ;;
        run:*|down:*) return 0 ;;
        *) return 1 ;;
    esac
}

restore_core_supervisor() {
    [ -d "$SERVICE" ] || { log "skip=service-missing"; return 0; }
    [ ! -e "$SERVICE/down" ] || { log "skip=operator-down"; return 0; }
    supervisor_present && return 0

    log "action=start-core-runsv"
    "$NOHUP" "$RUNSV" "$SERVICE" >> "$RUNSV_LOG" 2>&1 &

    i=0
    while [ "$i" -lt 5 ]; do
        "$SLEEP" 1
        supervisor_present && {
            log "result=supervisor-restored"
            return 0
        }
        i=$((i + 1))
    done

    log "result=supervisor-start-failed"
    return 1
}

acquire_loop_lock() {
    if mkdir "$LOCKDIR" 2>/dev/null; then
        echo "$$" > "$PIDFILE"
        return 0
    fi

    oldpid="$(cat "$PIDFILE" 2>/dev/null || true)"
    if [ -n "$oldpid" ] && kill -0 "$oldpid" 2>/dev/null; then
        return 1
    fi

    rm -rf "$LOCKDIR"
    mkdir "$LOCKDIR" 2>/dev/null || return 1
    echo "$$" > "$PIDFILE"
}

cleanup() {
    current="$(cat "$PIDFILE" 2>/dev/null || true)"
    [ "$current" = "$$" ] && rm -f "$PIDFILE"
    rmdir "$LOCKDIR" 2>/dev/null || true
}

case "$MODE" in
    --once)
        restore_core_supervisor
        ;;
    --loop)
        acquire_loop_lock || exit 0
        trap cleanup EXIT INT TERM HUP
        log "guard=started interval=${CHECK_INTERVAL}s"
        while :; do
            restore_core_supervisor || true
            "$SLEEP" "$CHECK_INTERVAL"
        done
        ;;
    *)
        echo "usage: $0 [--once|--loop]" >&2
        exit 2
        ;;
esac
