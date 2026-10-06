#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
OWNER="$ROOT/files/retire-legacy-20.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

passed=0
fail() {
    printf 'FAIL %s
' "$1" >&2
    exit 1
}
ok() {
    passed=$((passed + 1))
    printf 'PASS %s
' "$1"
}

setup_fixture() {
    name="$1"
    home="$TMP/$name/home"
    mkdir -p "$home/.termux/boot" "$home/.termux/boot-disabled"
    printf '%s
' 'replacement-v1' > "$home/.termux/boot/21-pocketrisu-core-supervisor-guard"
    chmod 700 "$home/.termux/boot/21-pocketrisu-core-supervisor-guard"
    printf '%s
' 'legacy-20-fixture-v1' > "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
    chmod 700 "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
    sha256sum "$home/.termux/boot/20-pocketrisu-ssh-tunnel" | awk '{print $1}'
}

run_owner() {
    home="$1"
    expected="$2"
    op="$3"
    POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE=1     POCKETRISU_TERMUX_BOOT_RETIRE_TEST_HOME="$home"     POCKETRISU_TERMUX_BOOT_RETIRE_TEST_EXPECTED_SHA256="$expected"         sh "$OWNER" "$op"
}

sh -n "$OWNER"
ok 'owner syntax'

sha="$(setup_fixture check-ready)"
home="$TMP/check-ready/home"
out="$(run_owner "$home" "$sha" --check)" || fail 'exact check rc'
printf '%s
' "$out" | grep -Fxq 'active=exact' || fail 'exact check active'
printf '%s
' "$out" | grep -Fxq 'archive=absent' || fail 'exact check archive'
printf '%s
' "$out" | grep -Fxq 'replacement=present' || fail 'exact check replacement'
printf '%s
' "$out" | grep -Fxq 'result=ready' || fail 'exact check result'
ok 'exact active is ready'

sha="$(setup_fixture apply-retire)"
home="$TMP/apply-retire/home"
replacement_before="$(sha256sum "$home/.termux/boot/21-pocketrisu-core-supervisor-guard" | awk '{print $1}')"
out="$(run_owner "$home" "$sha" --apply)" || fail 'apply retire rc'
printf '%s
' "$out" | grep -Fxq 'result=retired' || fail 'apply retire result'
[ ! -e "$home/.termux/boot/20-pocketrisu-ssh-tunnel" ] || fail 'active still present'
archive="$home/.termux/boot-disabled/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
[ -f "$archive" ] && [ ! -L "$archive" ] || fail 'archive missing'
[ "$(stat -c '%a' "$archive")" = 700 ] || fail 'archive mode drift'
[ "$(sha256sum "$archive" | awk '{print $1}')" = "$sha" ] || fail 'archive digest drift'
replacement_after="$(sha256sum "$home/.termux/boot/21-pocketrisu-core-supervisor-guard" | awk '{print $1}')"
[ "$replacement_before" = "$replacement_after" ] || fail 'replacement mutated'
ok 'apply moves exact legacy file and preserves replacement'

out="$(run_owner "$home" "$sha" --apply)" || fail 'repeat apply rc'
printf '%s
' "$out" | grep -Fxq 'result=already_retired' || fail 'repeat apply result'
ok 'repeat apply is idempotent'

sha="$(setup_fixture drift)"
home="$TMP/drift/home"
printf '%s
' 'foreign-change' >> "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
if out="$(run_owner "$home" "$sha" --check 2>&1)"; then fail 'drift unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'drift rc'
printf '%s
' "$out" | grep -Fxq 'active=drift' || fail 'drift state'
printf '%s
' "$out" | grep -Fxq 'result=blocked' || fail 'drift result'
[ -f "$home/.termux/boot/20-pocketrisu-ssh-tunnel" ] || fail 'drift active removed'
ok 'drift blocks without mutation'

sha="$(setup_fixture symlink)"
home="$TMP/symlink/home"
rm -f "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
printf '%s
' 'target' > "$home/target"
ln -s "$home/target" "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
if out="$(run_owner "$home" "$sha" --check 2>&1)"; then fail 'symlink unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'symlink rc'
printf '%s
' "$out" | grep -Fxq 'active=symlink' || fail 'symlink state'
ok 'symlink active blocks'

sha="$(setup_fixture missing)"
home="$TMP/missing/home"
rm -f "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
if out="$(run_owner "$home" "$sha" --check 2>&1)"; then fail 'missing unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'missing rc'
printf '%s
' "$out" | grep -Fxq 'active=absent' || fail 'missing active state'
printf '%s
' "$out" | grep -Fxq 'archive=absent' || fail 'missing archive state'
ok 'missing active and archive blocks'

sha="$(setup_fixture archive-drift)"
home="$TMP/archive-drift/home"
rm -f "$home/.termux/boot/20-pocketrisu-ssh-tunnel"
printf '%s
' 'foreign-archive' > "$home/.termux/boot-disabled/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
chmod 700 "$home/.termux/boot-disabled/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
if out="$(run_owner "$home" "$sha" --check 2>&1)"; then fail 'archive drift unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'archive drift rc'
printf '%s
' "$out" | grep -Fxq 'archive=drift' || fail 'archive drift state'
ok 'foreign archive blocks'

sha="$(setup_fixture replacement-missing)"
home="$TMP/replacement-missing/home"
rm -f "$home/.termux/boot/21-pocketrisu-core-supervisor-guard"
if out="$(run_owner "$home" "$sha" --apply 2>&1)"; then fail 'missing replacement unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'missing replacement rc'
printf '%s
' "$out" | grep -Fxq 'replacement=absent' || fail 'missing replacement state'
[ -f "$home/.termux/boot/20-pocketrisu-ssh-tunnel" ] || fail 'active removed with missing replacement'
ok 'missing replacement blocks apply'

sha="$(setup_fixture archive-dir-symlink)"
home="$TMP/archive-dir-symlink/home"
rm -rf "$home/.termux/boot-disabled"
mkdir -p "$home/elsewhere"
ln -s "$home/elsewhere" "$home/.termux/boot-disabled"
if out="$(run_owner "$home" "$sha" --apply 2>&1)"; then fail 'archive dir symlink unexpectedly passed'; else rc=$?; fi
[ "$rc" -eq 2 ] || fail 'archive dir symlink rc'
printf '%s
' "$out" | grep -Fxq 'archive_dir=invalid' || fail 'archive dir symlink state'
ok 'archive directory symlink blocks'

if grep -Eiq 'runsvdir|service-daemon|device_config|force-stop|reboot|settings[[:space:]]+put|(^|[[:space:]])(tailscale|curl|ssh|adb)([[:space:]]|$)' "$OWNER"; then
    fail 'forbidden effect surface present'
fi
ok 'owner excludes broad runtime/network/android effects'

printf 'PASS retire-legacy-20 contract (%s checks)
' "$passed"
