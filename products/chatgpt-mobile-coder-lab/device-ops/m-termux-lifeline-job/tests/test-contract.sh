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
exit "$rc"
SH
    chmod 700 "$FIX/home/.local/bin/mcl-m-termux-lifeline-recover"

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

# Scheduler failure rolls back only a wrapper created by this call.
new_fixture
printf '1\n' > "$FIX/state/schedule.rc"
set +e
out=$(run_owner --apply)
rc=$?
set -e
[ "$rc" -eq 3 ] || fail "scheduler failure rc"
assert_contains "$out" 'schedule=fail'
[ ! -e "$FIX/home/.local/lib/mcl-m-termux-lifeline-job/job.sh" ] || fail "new wrapper not rolled back"

rm -rf "$FIX" /tmp/mcl3467-wrapper-invalid.out
printf '%s\n' 'PASS: m-termux-lifeline-job contract'
