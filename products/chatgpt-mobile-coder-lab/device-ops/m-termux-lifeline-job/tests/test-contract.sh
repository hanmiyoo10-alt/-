#!/usr/bin/env sh
set -eu

SELF=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SELF/.." && pwd)
WRAPPER="$ROOT_DIR/mcl-m-termux-lifeline-job"
OWNER="$ROOT_DIR/mcl-m-termux-lifeline-job-owner"

fail() {
    printf '%s\n' "FAIL: $1" >&2
    exit 1
}

assert_contains() {
    hay="$1"
    needle="$2"
    printf '%s\n' "$hay" | grep -F -- "$needle" >/dev/null || fail "missing $needle"
}

new_fixture() {
    FIX=$(mktemp -d)
    mkdir -p \
        "$FIX/prefix/bin" \
        "$FIX/home/.local/lib/mcl-m-termux-lifeline" \
        "$FIX/home/.local/bin" \
        "$FIX/state"

    cat > "$FIX/home/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py" <<'SH'
#!/bin/sh
state="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT/state/hb.seq"
[ "$1" = "--status" ] || exit 2
first=$(sed -n '1p' "$state" 2>/dev/null || true)
[ -n "$first" ] || exit 2
sed '1d' "$state" > "$state.next"
mv "$state.next" "$state"
exit "$first"
SH
    chmod 700 "$FIX/home/.local/lib/mcl-m-termux-lifeline/heartbeat-client.py"

    cat > "$FIX/home/.local/bin/mcl-m-termux-lifeline-recover" <<'SH'
#!/bin/sh
[ "$#" -eq 0 ] || exit 2
root="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT"
printf '%s\n' called >> "$root/state/recovery.log"
rc=$(cat "$root/state/recovery.rc" 2>/dev/null || printf 0)
if [ "$rc" -eq 0 ]; then
    state="$root/home/.local/state/mcl-m-termux-lifeline"
    mkdir -p "$state"
    tmp="$state/recovery.receipt.$$"
    cat > "$tmp" <<'EOF'
schema=mcl-m-termux-lifeline-recovery.v4
rdc_target=pass
tailscale_target=pass
heartbeat_active=pass
guard_ring_started=false
details=withheld
EOF
    mv "$tmp" "$state/recovery.receipt"
fi
exit "$rc"
SH
    chmod 700 "$FIX/home/.local/bin/mcl-m-termux-lifeline-recover"

    mkdir -p "$FIX/home/.termux/boot"
    cat > "$FIX/home/.termux/boot/31-mcl-m-rdc-supervisor-guard" <<'SH'
#!/bin/sh
root="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT"
printf '%s\n' rdc >> "$root/state/launcher.log"
exit "$(cat "$root/state/rdc-launcher.rc" 2>/dev/null || printf 0)"
SH
    cat > "$FIX/home/.termux/boot/32-mcl-m-tailscale-supervisor-guard" <<'SH'
#!/bin/sh
root="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT"
printf '%s\n' tailscale >> "$root/state/launcher.log"
exit "$(cat "$root/state/tailscale-launcher.rc" 2>/dev/null || printf 0)"
SH
    chmod 700 "$FIX/home/.termux/boot/31-mcl-m-rdc-supervisor-guard"         "$FIX/home/.termux/boot/32-mcl-m-tailscale-supervisor-guard"

    cat > "$FIX/prefix/bin/date" <<'SH'
#!/bin/sh
root="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT"
[ "$#" -eq 1 ] && [ "$1" = "+%s" ] || exit 2
cat "$root/state/now"
SH
    chmod 700 "$FIX/prefix/bin/date"
    cat > "$FIX/prefix/bin/stat" <<'SH'
#!/bin/sh
exec /usr/bin/stat "$@"
SH
    chmod 700 "$FIX/prefix/bin/stat"

    cat > "$FIX/prefix/bin/termux-job-scheduler" <<'SH'
#!/bin/sh
root="$MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT"
if [ "$#" -eq 1 ] && [ "$1" = "--pending" ]; then
    rc=$(cat "$root/state/pending.rc" 2>/dev/null || printf 0)
    cat "$root/state/pending.out" 2>/dev/null || true
    exit "$rc"
fi
printf '%s\n' "$@" > "$root/state/schedule.argv"
rc=$(cat "$root/state/schedule.rc" 2>/dev/null || printf 0)
exit "$rc"
SH
    chmod 700 "$FIX/prefix/bin/termux-job-scheduler"

    printf '0\n' > "$FIX/state/hb.seq"
    printf '0\n' > "$FIX/state/recovery.rc"
    printf '0\n' > "$FIX/state/pending.rc"
    printf 'No jobs found\n' > "$FIX/state/pending.out"
    printf '0\n' > "$FIX/state/schedule.rc"
    printf '1000\n' > "$FIX/state/now"
    printf '0\n' > "$FIX/state/rdc-launcher.rc"
    printf '0\n' > "$FIX/state/tailscale-launcher.rc"
}

run_wrapper() {
    MCL_M_TERMUX_LIFELINE_JOB_TEST_MODE=1 \
    MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT="$FIX" \
    sh "$WRAPPER" "$@"
}

run_owner() {
    MCL_M_TERMUX_LIFELINE_JOB_TEST_MODE=1 \
    MCL_M_TERMUX_LIFELINE_JOB_TEST_ROOT="$FIX" \
    sh "$OWNER" "$@"
}

# Syntax and fixed public surface.
sh -n "$WRAPPER"
sh -n "$OWNER"
grep -F -- '--cancel-all' "$OWNER" >/dev/null && fail "cancel-all surface present"
grep -F -- '--rollback' "$OWNER" >/dev/null && fail "rollback surface present"
grep -F -- '--job-id 34070' "$OWNER" >/dev/null || fail "fixed job id missing"
grep -F -- '--period-ms 900000' "$OWNER" >/dev/null || fail "fixed period missing"
grep -F -- '--network none' "$OWNER" >/dev/null || fail "fixed network missing"
grep -F -- '--persisted true' "$OWNER" >/dev/null || fail "fixed persisted missing"

# Wrapper rejects args.
new_fixture
set +e
run_wrapper unexpected >/tmp/mcl3467-wrapper-invalid.out 2>/dev/null
rc=$?
set -e
[ "$rc" -eq 64 ] || fail "wrapper invalid argv rc"

# Healthy wrapper does not call recovery.
new_fixture
printf '0\n' > "$FIX/state/hb.seq"
out=$(run_wrapper)
assert_contains "$out" 'heartbeat_pre=active'
assert_contains "$out" 'recovery=not_run'
assert_contains "$out" 'heartbeat_post=active'
assert_contains "$out" 'result=healthy'
[ ! -e "$FIX/state/recovery.log" ] || fail "healthy path called recovery"

# Inactive wrapper recovers once and rechecks.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
out=$(run_wrapper)
assert_contains "$out" 'heartbeat_pre=inactive'
assert_contains "$out" 'recovery=pass'
assert_contains "$out" 'heartbeat_post=active'
assert_contains "$out" 'result=recovered'
[ "$(wc -l < "$FIX/state/recovery.log")" -eq 1 ] || fail "recovery count"

# Recovery failure stays bounded.
new_fixture
printf '1\n' > "$FIX/state/hb.seq"
printf '1\n' > "$FIX/state/recovery.rc"
set +e
out=$(run_wrapper)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "recovery failure rc"
assert_contains "$out" 'recovery=fail'
assert_contains "$out" 'result=blocked'


# Recovered path records pending generation and performs zero launcher effect.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
out=$(run_wrapper)
assert_contains "$out" 'result=recovered'
[ -f "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.pending" ] || fail "durability pending missing"
[ ! -e "$FIX/state/launcher.log" ] || fail "recovery firing rearmed early"
assert_contains "$(cat "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.receipt")" 'result=pending'

# Before cooldown a healthy firing is zero effect and remains pending.
printf '0\n' > "$FIX/state/hb.seq"
printf '1200\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=healthy'
[ ! -e "$FIX/state/launcher.log" ] || fail "cooldown firing rearmed early"
assert_contains "$(cat "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.receipt")" 'result=pending'

# After cooldown fixed launchers run once in order; later healthy firing does not repeat.
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=healthy'
[ "$(sed -n '1p' "$FIX/state/launcher.log")" = rdc ] || fail "rdc launcher order"
[ "$(sed -n '2p' "$FIX/state/launcher.log")" = tailscale ] || fail "tailscale launcher order"
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 2 ] || fail "launcher count"
[ ! -e "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.pending" ] || fail "pending not cleared"
assert_contains "$(cat "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.receipt")" 'result=pass'
printf '0\n' > "$FIX/state/hb.seq"
printf '1700\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=healthy'
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 2 ] || fail "durability retried after pass"

# Clock rollback terminally blocks the recovery generation until a fresh recovery.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
run_wrapper >/dev/null
printf '0\n' > "$FIX/state/hb.seq"
printf '900\n' > "$FIX/state/now"
set +e
out=$(run_wrapper)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "clock rollback rc"
assert_contains "$out" 'result=blocked'
[ ! -e "$FIX/state/launcher.log" ] || fail "clock rollback launched durability"
[ -f "$FIX/home/.local/state/mcl-m-termux-lifeline-job/durability.attempt" ] || fail "clock rollback attempt marker missing"
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "clock rollback catch-up retry rc"
[ ! -e "$FIX/state/launcher.log" ] || fail "clock rollback retried after catch-up"
printf '1\n0\n' > "$FIX/state/hb.seq"
printf '2000\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=recovered'
printf '0\n' > "$FIX/state/hb.seq"
printf '2301\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=healthy'
[ "$(sed -n '1p' "$FIX/state/launcher.log")" = rdc ] || fail "fresh recovery rdc launcher"
[ "$(sed -n '2p' "$FIX/state/launcher.log")" = tailscale ] || fail "fresh recovery tailscale launcher"
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 2 ] || fail "fresh recovery launcher count"

# RDC launcher failure consumes the attempt and never runs Tailscale or retries.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
run_wrapper >/dev/null
printf '1\n' > "$FIX/state/rdc-launcher.rc"
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
set +e
out=$(run_wrapper)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "rdc durability failure rc"
assert_contains "$out" 'result=blocked'
[ "$(cat "$FIX/state/launcher.log")" = rdc ] || fail "tailscale ran after rdc failure"
printf '0\n' > "$FIX/state/hb.seq"
printf '1700\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "rdc durability retry block rc"
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 1 ] || fail "rdc durability retried"

# Tailscale launcher failure is also at-most-once for the generation.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
run_wrapper >/dev/null
printf '1\n' > "$FIX/state/tailscale-launcher.rc"
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "tailscale durability failure rc"
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 2 ] || fail "tailscale durability attempt count"
printf '0\n' > "$FIX/state/hb.seq"
printf '1700\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "tailscale durability retry block rc"
[ "$(wc -l < "$FIX/state/launcher.log")" -eq 2 ] || fail "tailscale durability retried"

# Recovery generation mismatch blocks with zero launcher effect.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
run_wrapper >/dev/null
rr="$FIX/home/.local/state/mcl-m-termux-lifeline/recovery.receipt"
cp "$rr" "$rr.new"
mv "$rr.new" "$rr"
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "generation mismatch rc"
[ ! -e "$FIX/state/launcher.log" ] || fail "generation mismatch launched durability"

# Fresh later recovery creates a new generation and permits one new future attempt.
new_fixture
printf '1\n0\n' > "$FIX/state/hb.seq"
run_wrapper >/dev/null
printf '1\n' > "$FIX/state/rdc-launcher.rc"
printf '0\n' > "$FIX/state/hb.seq"
printf '1301\n' > "$FIX/state/now"
set +e
run_wrapper >/dev/null
set -e
printf '0\n' > "$FIX/state/rdc-launcher.rc"
printf '1\n0\n' > "$FIX/state/hb.seq"
printf '2000\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=recovered'
printf '0\n' > "$FIX/state/hb.seq"
printf '2301\n' > "$FIX/state/now"
out=$(run_wrapper)
assert_contains "$out" 'result=healthy'
[ "$(tail -n 2 "$FIX/state/launcher.log" | tr '\n' ' ')" = "rdc tailscale " ] || fail "fresh generation did not rearm"

# Owner check reports missing before apply.
new_fixture
set +e
out=$(run_owner --check)
rc=$?
set -e
[ "$rc" -eq 1 ] || fail "missing check rc"
assert_contains "$out" 'wrapper=missing'
assert_contains "$out" 'result=missing'

# Empty-namespace apply uses exact fixed argv and installs exact wrapper.
out=$(run_owner --apply)
assert_contains "$out" 'namespace=empty'
assert_contains "$out" 'schedule=pass'
assert_contains "$out" 'result=scheduled'
dest="$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
cmp -s "$WRAPPER" "$dest" || fail "installed wrapper bytes"
[ -x "$dest" ] || fail "installed wrapper mode"
argv=$(cat "$FIX/state/schedule.argv")
for token in \
    '--script' \
    "$dest" \
    '--job-id' '34070' \
    '--period-ms' '900000' \
    '--network' 'none' \
    '--battery-not-low' 'false' \
    '--storage-not-low' 'false' \
    '--charging' 'false' \
    '--persisted' 'true'
do
    printf '%s\n' "$argv" | grep -Fx -- "$token" >/dev/null || fail "missing fixed schedule token $token"
done
out=$(run_owner --check)
assert_contains "$out" 'wrapper=present'
assert_contains "$out" 'result=ready'

# Exact bytes with widened mode are drift, not ready.
chmod 755 "$dest"
set +e
out=$(run_owner --check)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "mode drift check rc"
assert_contains "$out" 'wrapper=drift'
assert_contains "$out" 'result=blocked'
chmod 700 "$dest"

# Non-empty or malformed namespace blocks before scheduler effect.
new_fixture
printf 'Pending Job 99: unrelated\n' > "$FIX/state/pending.out"
set +e
out=$(run_owner --apply)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "nonempty pending rc"
assert_contains "$out" 'namespace=blocked'
assert_contains "$out" 'schedule=not_run'
[ ! -e "$FIX/state/schedule.argv" ] || fail "blocked path scheduled"

new_fixture
printf '2\n' > "$FIX/state/pending.rc"
set +e
out=$(run_owner --apply)
rc=$?
set -e
[ "$rc" -eq 4 ] || fail "unknown pending rc"
assert_contains "$out" 'namespace=unknown'
[ ! -e "$FIX/state/schedule.argv" ] || fail "unknown path scheduled"

# Drifted wrapper blocks before scheduler effect.
new_fixture
mkdir -p "$FIX/home/.local/lib/mcl-m-termux-lifeline-job"
printf 'drift\n' > "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
chmod 700 "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
set +e
out=$(run_owner --apply)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "drift rc"
assert_contains "$out" 'wrapper=drift'
[ ! -e "$FIX/state/schedule.argv" ] || fail "drift path scheduled"

# Scheduler client nonzero is an uncertain registration outcome.
# Preserve the exact wrapper so the external exact-job projection can decide
# whether Android actually registered job 34070 before client completion failed.
new_fixture
printf '1\n' > "$FIX/state/schedule.rc"
set +e
out=$(run_owner --apply)
rc=$?
set -e
[ "$rc" -eq 4 ] || fail "scheduler uncertain rc"
assert_contains "$out" 'schedule=unknown'
assert_contains "$out" 'result=unknown'
dest="$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
[ -f "$dest" ] || fail "uncertain registration removed wrapper"
cmp -s "$WRAPPER" "$dest" || fail "uncertain registration wrapper bytes"
[ "$(stat -c '%a' "$dest")" = 700 ] || fail "uncertain registration wrapper mode"
out=$(run_owner --check)
assert_contains "$out" 'wrapper=present'
assert_contains "$out" 'result=ready'


# Managed-job wrapper refresh performs no scheduler mutation.
new_fixture
mkdir -p "$FIX/home/.local/lib/mcl-m-termux-lifeline-job"
printf 'old\n' > "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
chmod 700 "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
out=$(run_owner --refresh-wrapper)
assert_contains "$out" 'wrapper=present'
assert_contains "$out" 'schedule=not_run'
assert_contains "$out" 'result=refreshed'
cmp -s "$WRAPPER" "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh" || fail "refresh bytes"
[ "$(stat -c '%a' "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh")" = 700 ] || fail "refresh mode"
[ ! -e "$FIX/state/schedule.argv" ] || fail "refresh invoked scheduler"

# Missing wrapper may be refreshed without scheduling.
new_fixture
out=$(run_owner --refresh-wrapper)
assert_contains "$out" 'result=refreshed'
[ ! -e "$FIX/state/schedule.argv" ] || fail "missing refresh invoked scheduler"

# Exact refresh is a no-op ready result.
out=$(run_owner --refresh-wrapper)
assert_contains "$out" 'result=ready'
[ ! -e "$FIX/state/schedule.argv" ] || fail "exact refresh invoked scheduler"

# Symlink/non-regular refresh destination blocks.
new_fixture
mkdir -p "$FIX/home/.local/lib/mcl-m-termux-lifeline-job"
ln -s "$WRAPPER" "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh"
set +e
out=$(run_owner --refresh-wrapper)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "symlink refresh rc"
assert_contains "$out" 'result=blocked'
[ ! -e "$FIX/state/schedule.argv" ] || fail "symlink refresh invoked scheduler"

rm -rf "$FIX" /tmp/mcl3467-wrapper-invalid.out
printf '%s\n' 'PASS: m-termux-lifeline-job contract'
