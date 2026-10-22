#!/data/data/com.termux/files/usr/bin/sh
set -u

PREFIX=/data/data/com.termux/files/usr
HOME_DIR=/data/data/com.termux/files/home
SERVICE="$PREFIX/var/service/pocketrisu-ssh-tunnel"
STATE="$HOME_DIR/.local/state/pocketrisu-core-supervisor-guard"
CHECK_INTERVAL=15

if [ "${POCKETRISU_CORE_GUARD_TEST_MODE:-0}" = 1 ]; then
    TEST_ROOT="${POCKETRISU_CORE_GUARD_TEST_ROOT:?test root required}"
    PREFIX="$TEST_ROOT/prefix"
    HOME_DIR="$TEST_ROOT/home"
    SERVICE="$PREFIX/var/service/pocketrisu-ssh-tunnel"
    STATE="$HOME_DIR/.local/state/pocketrisu-core-supervisor-guard"
    CHECK_INTERVAL="${POCKETRISU_CORE_GUARD_TEST_INTERVAL:-1}"
fi

SV="$PREFIX/bin/sv"
RUNSV="$PREFIX/bin/runsv"
NOHUP="$PREFIX/bin/nohup"
SLEEP="$PREFIX/bin/sleep"
DATE="$PREFIX/bin/date"
TR="$PREFIX/bin/tr"
MODE="${1:---loop}"

PS="$PREFIX/bin/ps"
STAT="$PREFIX/bin/stat"
SHA256SUM="$PREFIX/bin/sha256sum"
GREP="$PREFIX/bin/grep"
CAT="$PREFIX/bin/cat"
SSH="$PREFIX/bin/ssh"

RUN_FILE="$SERVICE/run"
RUN_FILE_SHA="dd6734737e1f2010ad7fb707a83e383bfe21c7019643946c63ed3a6dd2e6b6bd"
TARGET_FILE="$HOME_DIR/.config/pocketrisu-main-ssh-tunnel/target"

LOG="$STATE/events.log"
PIDFILE="$STATE/guard.pid"
LOCKDIR="$STATE/guard.lock"
RUNSV_LOG="$STATE/runsv.log"
LAUNCHER="$HOME_DIR/.termux/boot/21-pocketrisu-core-supervisor-guard"

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

run_identity_ok() {
    [ -d "$SERVICE" ] && [ ! -L "$SERVICE" ] || return 1
    [ -f "$RUN_FILE" ] && [ ! -L "$RUN_FILE" ] || return 1
    [ "$("$STAT" -c '%a' "$RUN_FILE" 2>/dev/null || true)" = 755 ] || return 1
    run_sha="$("$SHA256SUM" "$RUN_FILE" 2>/dev/null | { IFS=' ' read -r sum _; printf '%s' "$sum"; })"
    [ "$run_sha" = "$RUN_FILE_SHA" ]
}

load_private_target() {
    [ -f "$TARGET_FILE" ] && [ ! -L "$TARGET_FILE" ] && [ -r "$TARGET_FILE" ] || return 1
    target_mode="$("$STAT" -c '%a' "$TARGET_FILE" 2>/dev/null || true)"
    case "$target_mode" in
        400|600) ;;
        *) return 1 ;;
    esac
    [ "$("$GREP" -c '^' "$TARGET_FILE" 2>/dev/null || true)" = 1 ] || return 1
    CORE_REMOTE="$("$CAT" "$TARGET_FILE" 2>/dev/null || true)"
    case "$CORE_REMOTE" in
        ""|-*) return 1 ;;
    esac
    printf '%s\n' "$CORE_REMOTE" |
        "$GREP" -Eq '^[A-Za-z0-9._-]+@[A-Za-z0-9.:-]+$' ||
        return 1
}

classify_missing_target() {
    CORE_TARGET=ambiguous

    run_identity_ok || {
        log "skip=run-identity-drift"
        return 2
    }
    load_private_target || {
        log "skip=target-identity-drift"
        return 2
    }

    for bin in "$PS" "$STAT" "$SHA256SUM" "$GREP" "$CAT" "$SSH" "$RUNSV"; do
        [ -x "$bin" ] || {
            log "skip=required-binary-missing"
            return 2
        }
    done

    psout="$("$PS" -eo pid=,ppid=,args= 2>/dev/null)" || {
        log "skip=process-evidence-unreadable"
        return 2
    }

    expected="$SSH -N -o BatchMode=yes -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -p 8022 -L 127.0.0.1:6001:127.0.0.1:6001 -L 127.0.0.1:39117:127.0.0.1:39117 -L 127.0.0.1:39118:127.0.0.1:39118 -L 127.0.0.1:39119:127.0.0.1:39119 $CORE_REMOTE"

    exact_count=0
    exact_ppid=
    conflict_count=0
    runsv_count=0
    malformed=0

    while IFS=' ' read -r pid ppid args; do
        [ -n "${pid:-}" ] || continue
        case "$pid:$ppid" in
            *[!0-9:]*|:*) malformed=1; continue ;;
        esac

        if [ "$args" = "$RUNSV $SERVICE" ]; then
            runsv_count=$((runsv_count + 1))
        fi

        case " $args " in
            *" -L 127.0.0.1:6001:"*)
                if [ "$args" = "$expected" ]; then
                    exact_count=$((exact_count + 1))
                    exact_ppid="$ppid"
                else
                    conflict_count=$((conflict_count + 1))
                fi
                ;;
        esac
    done <<EOF_PS
$psout
EOF_PS

    [ "$malformed" -eq 0 ] || {
        log "skip=process-evidence-malformed"
        return 2
    }
    [ "$runsv_count" -eq 0 ] || {
        log "skip=missing-status-runsv-present"
        return 2
    }
    [ "$conflict_count" -eq 0 ] || {
        log "skip=conflicting-core-forward"
        return 2
    }
    [ "$exact_count" -le 1 ] || {
        log "skip=duplicate-exact-core-ssh"
        return 2
    }

    if [ "$exact_count" -eq 1 ]; then
        [ "$exact_ppid" = 1 ] || {
            log "skip=exact-core-ssh-unexpected-parent"
            return 2
        }
        CORE_TARGET=exact_orphan_present
        return 0
    fi

    CORE_TARGET=absent
    return 0
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

    classify_missing_target
    target_rc=$?
    [ "$target_rc" -ne 2 ] || return 2

    if [ "$CORE_TARGET" = exact_orphan_present ]; then
        log "skip=exact-core-orphan-present"
        return 0
    fi

    [ "$CORE_TARGET" = absent ] || {
        log "skip=target-state-unknown"
        return 2
    }

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