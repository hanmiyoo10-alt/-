#!/usr/bin/env sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
RUN="$HERE/../files/pocketrisu-ssh-tunnel.run"

fail() {
    printf 'FAIL %s\n' "$*" >&2
    exit 1
}

contains() {
    grep -F -- "$1" "$RUN" >/dev/null 2>&1 || fail "missing: $1"
}

absent() {
    if grep -F -- "$1" "$RUN" >/dev/null 2>&1; then
        fail "forbidden: $1"
    fi
}

sh -n "$RUN" || fail "run script syntax"

contains 'TARGET_FILE="$HOME/.config/pocketrisu-main-ssh-tunnel/target"'
contains '400|600'
contains '"$GREP" -Eq'
contains '^[A-Za-z0-9._-]+@[A-Za-z0-9.:-]+$'
contains '-o BatchMode=yes'
contains '-o StrictHostKeyChecking=yes'
contains '-o ExitOnForwardFailure=yes'
contains '-o ConnectTimeout=10'
contains '-o ServerAliveInterval=15'
contains '-o ServerAliveCountMax=3'
contains '-p 8022'
contains '-L 127.0.0.1:6001:127.0.0.1:6001'
contains '-L 127.0.0.1:39117:127.0.0.1:39117'
contains '-L 127.0.0.1:39118:127.0.0.1:39118'
contains '-L 127.0.0.1:39119:127.0.0.1:39119'
contains '"$REMOTE"'

interval=$(sed -n 's/.*ServerAliveInterval=\([0-9][0-9]*\).*/\1/p' "$RUN")
count=$(sed -n 's/.*ServerAliveCountMax=\([0-9][0-9]*\).*/\1/p' "$RUN")
[ "$interval" = "15" ] || fail "unexpected interval"
[ "$count" = "3" ] || fail "unexpected count"
window=$((interval * count))
[ "$window" -gt 16 ] || fail "liveness window must exceed observed short flap"
[ "$window" -le 60 ] || fail "liveness window exceeds reviewed ceiling"
[ "$window" -eq 45 ] || fail "reviewed liveness window drift"

absent 'ServerAliveInterval=30'
absent 'curl '
absent 'tailscale'
absent 'termux-wifi'
absent 'termux-telephony'
absent 'pkill'
absent 'killall'
absent 'sv restart'
absent 'sv down'
absent 'sv up'
absent 'eval '
absent '. "$TARGET_FILE"'
absent 'source "$TARGET_FILE"'

forward_count=$(grep -c '^[[:space:]]*-L 127\.0\.0\.1:' "$RUN")
[ "$forward_count" -eq 4 ] || fail "fixed forward count drift"

printf '%s\n' 'pocketrisu tunnel-run liveness contract: PASS'
