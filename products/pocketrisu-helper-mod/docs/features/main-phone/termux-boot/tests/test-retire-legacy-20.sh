#!/usr/bin/env sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$HERE/.." && pwd)
OWNER="$ROOT/files/retire-legacy-20.sh"
TMP=$(mktemp -d /tmp/pocketrisu-termux-boot-retire-test-XXXXXX)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

HOME_FIX="$TMP/home"
ACTIVE="$HOME_FIX/.termux/boot/20-pocketrisu-ssh-tunnel"
REPLACEMENT="$HOME_FIX/.termux/boot/21-pocketrisu-core-supervisor-guard"
ARCHIVE_ROOT="$HOME_FIX/.termux/boot-disabled"
ARCHIVE="$ARCHIVE_ROOT/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"

fail() {
    printf 'FAIL %s\n' "$1" >&2
    exit 1
}
pass=0
ok() {
    pass=$((pass + 1))
    printf 'PASS %s\n' "$1"
}

setup() {
    rm -rf "$HOME_FIX"
    mkdir -p "$HOME_FIX/.termux/boot"
    printf '%s\n' '#!/bin/sh' 'echo legacy' > "$ACTIVE"
    printf '%s\n' '#!/bin/sh' 'echo replacement' > "$REPLACEMENT"
    chmod 700 "$ACTIVE" "$REPLACEMENT"
    LEGACY_SHA=$(sha256sum "$ACTIVE" | awk '{print $1}')
    REPLACEMENT_SHA=$(sha256sum "$REPLACEMENT" | awk '{print $1}')
    export LEGACY_SHA REPLACEMENT_SHA
}

run_owner() {
    POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE=1 \
    POCKETRISU_TERMUX_BOOT_RETIRE_TEST_ROOT="$TMP" \
    POCKETRISU_TERMUX_BOOT_RETIRE_TEST_LEGACY_SHA="$LEGACY_SHA" \
    POCKETRISU_TERMUX_BOOT_RETIRE_TEST_REPLACEMENT_SHA="$REPLACEMENT_SHA" \
    sh "$OWNER" "$1"
}

sh -n "$OWNER"
ok 'owner syntax'

setup
before=$(sha256sum "$ACTIVE" | awk '{print $1}')
out=$(run_owner --check)
printf '%s\n' "$out" | grep -Fxq 'state=active_exact' || fail 'active check state'
printf '%s\n' "$out" | grep -Fxq 'reason=eligible' || fail 'active check reason'
[ "$(sha256sum "$ACTIVE" | awk '{print $1}')" = "$before" ] || fail 'check mutated active'
[ ! -e "$ARCHIVE" ] || fail 'check created archive'
ok 'check is read only'

out=$(run_owner --apply)
printf '%s\n' "$out" | grep -Fxq 'state=retired_exact' || fail 'apply state'
printf '%s\n' "$out" | grep -Fxq 'result=pass' || fail 'apply result'
[ ! -e "$ACTIVE" ] || fail 'active remains after apply'
[ -f "$ARCHIVE" ] && [ ! -L "$ARCHIVE" ] || fail 'archive missing'
[ "$(stat -c %a "$ARCHIVE_ROOT")" = 700 ] || fail 'archive root mode'
[ "$(stat -c %a "$ARCHIVE")" = 700 ] || fail 'archive mode'
[ "$(sha256sum "$ARCHIVE" | awk '{print $1}')" = "$before" ] || fail 'archive bytes changed'
[ "$(sha256sum "$REPLACEMENT" | awk '{print $1}')" = "$REPLACEMENT_SHA" ] || fail 'replacement changed'
ok 'apply moves exact legacy bytes'

out=$(run_owner --apply)
printf '%s\n' "$out" | grep -Fxq 'reason=already-retired' || fail 'repeat apply not idempotent'
ok 'repeat apply is idempotent'

out=$(run_owner --restore)
printf '%s\n' "$out" | grep -Fxq 'state=active_exact' || fail 'restore state'
printf '%s\n' "$out" | grep -Fxq 'result=pass' || fail 'restore result'
[ -f "$ACTIVE" ] && [ ! -L "$ACTIVE" ] || fail 'active missing after restore'
[ ! -e "$ARCHIVE" ] || fail 'archive remains after restore'
[ "$(sha256sum "$ACTIVE" | awk '{print $1}')" = "$before" ] || fail 'restore bytes changed'
ok 'restore is reversible'

fake_home="$TMP/fake-production-home"
mkdir -p "$fake_home/.termux/boot"
if out=$(HOME="$fake_home" POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE=0 sh "$OWNER" --check 2>&1); then
    fail 'mismatched production HOME unexpectedly passed'
fi
printf '%s\n' "$out" | grep -Fq 'BLOCKED wrong execution home' || fail 'production home mismatch reason'
[ ! -e "$fake_home/.termux/boot/20-pocketrisu-ssh-tunnel" ] || fail 'fake home mutated'
grep -Fq 'FIXED_HOME=/data/data/com.termux/files/home' "$OWNER" || fail 'fixed production home missing'
ok 'production HOME cannot redirect owner'

setup
printf '%s\n' drift >> "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then fail 'drift passed'; fi
[ -f "$ACTIVE" ] || fail 'drift active removed'
ok 'active drift blocks'

setup
target="$TMP/legacy-target"
cp "$ACTIVE" "$target"
rm "$ACTIVE"
ln -s "$target" "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then fail 'active symlink passed'; fi
ok 'active symlink blocks'

setup
rm "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then fail 'missing legacy passed'; fi
ok 'missing active and archive blocks'

setup
rm "$REPLACEMENT"
if run_owner --apply >/dev/null 2>&1; then fail 'missing replacement passed'; fi
[ -f "$ACTIVE" ] || fail 'active removed without replacement'
ok 'missing replacement blocks'

setup
chmod 600 "$REPLACEMENT"
if run_owner --check >/dev/null 2>&1; then fail 'replacement mode drift passed'; fi
ok 'replacement mode drift blocks'

setup
mkdir -p "$ARCHIVE_ROOT"
chmod 700 "$ARCHIVE_ROOT"
cp "$ACTIVE" "$ARCHIVE"
chmod 700 "$ARCHIVE"
printf '%s\n' foreign >> "$ARCHIVE"
rm "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then fail 'archive drift passed'; fi
ok 'archive drift blocks'

setup
mkdir -p "$ARCHIVE_ROOT"
chmod 700 "$ARCHIVE_ROOT"
cp "$ACTIVE" "$ARCHIVE"
chmod 700 "$ARCHIVE"
if run_owner --check >/dev/null 2>&1; then fail 'duplicate active/archive passed'; fi
ok 'duplicate active and archive blocks'

setup
rm -rf "$ARCHIVE_ROOT"
ln -s "$TMP" "$ARCHIVE_ROOT"
if run_owner --apply >/dev/null 2>&1; then fail 'archive-root symlink passed'; fi
[ -f "$ACTIVE" ] || fail 'active removed with archive-root symlink'
ok 'archive-root symlink blocks'

setup
mkdir -p "$ARCHIVE_ROOT"
chmod 755 "$ARCHIVE_ROOT"
if run_owner --apply >/dev/null 2>&1; then fail 'archive-root mode drift passed'; fi
[ -f "$ACTIVE" ] || fail 'active removed with archive-root mode drift'
ok 'archive-root mode drift blocks'

if POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE=1 \
   POCKETRISU_TERMUX_BOOT_RETIRE_TEST_ROOT=/tmp/not-reviewed-root \
   POCKETRISU_TERMUX_BOOT_RETIRE_TEST_LEGACY_SHA="$LEGACY_SHA" \
   POCKETRISU_TERMUX_BOOT_RETIRE_TEST_REPLACEMENT_SHA="$REPLACEMENT_SHA" \
   sh "$OWNER" --check >/dev/null 2>&1; then
    fail 'unreviewed test root passed'
fi
ok 'test relocation requires reviewed prefix'

grep -Fq '20-pocketrisu-ssh-tunnel' "$OWNER"
grep -Fq '21-pocketrisu-core-supervisor-guard' "$OWNER"
grep -Fq 'retired-by-termux-boot-v1' "$OWNER"
if grep -Eiq 'sv[[:space:]]+(up|down)|runsvdir|service-daemon|settings[[:space:]]+put|device_config[[:space:]]+put|force-stop|reboot|killall|pkill|tailscale[[:space:]]|curl[[:space:]]|ssh[[:space:]]|adb[[:space:]]' "$OWNER"; then
    fail 'forbidden effect surface present'
fi
if grep -Eq '(^|[^A-Za-z])(cp|rm)[[:space:]]' "$OWNER"; then
    fail 'copy/delete fallback present'
fi
ok 'owner excludes broad runtime and copy/delete effects'

printf 'PASS retire-legacy-20 contract (%s checks)\n' "$pass"
