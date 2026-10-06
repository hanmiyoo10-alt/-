#!/bin/sh
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
pass=0

setup
before=$(sha256sum "$ACTIVE" | awk '{print $1}')
out=$(run_owner --check)
printf '%s\n' "$out" | grep -q 'state=active_exact'
printf '%s\n' "$out" | grep -q 'reason=eligible'
[ "$(sha256sum "$ACTIVE" | awk '{print $1}')" = "$before" ]
[ ! -e "$ARCHIVE" ]
pass=$((pass+1))

out=$(run_owner --apply)
printf '%s\n' "$out" | grep -q 'state=retired_exact'
printf '%s\n' "$out" | grep -q 'result=pass'
[ ! -e "$ACTIVE" ]
[ -f "$ARCHIVE" ] && [ ! -L "$ARCHIVE" ]
[ "$(stat -c %a "$ARCHIVE_ROOT")" = 700 ]
[ "$(stat -c %a "$ARCHIVE")" = 700 ]
[ "$(sha256sum "$ARCHIVE" | awk '{print $1}')" = "$before" ]
[ "$(sha256sum "$REPLACEMENT" | awk '{print $1}')" = "$REPLACEMENT_SHA" ]
pass=$((pass+1))

out=$(run_owner --apply)
printf '%s\n' "$out" | grep -q 'reason=already-retired'
pass=$((pass+1))

out=$(run_owner --restore)
printf '%s\n' "$out" | grep -q 'state=active_exact'
printf '%s\n' "$out" | grep -q 'result=pass'
[ -f "$ACTIVE" ] && [ ! -L "$ACTIVE" ]
[ ! -e "$ARCHIVE" ]
[ "$(sha256sum "$ACTIVE" | awk '{print $1}')" = "$before" ]
pass=$((pass+1))

setup
printf 'drift\n' >> "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup
target="$TMP/legacy-target"
cp "$ACTIVE" "$target"
rm "$ACTIVE"
ln -s "$target" "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup
rm "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup
rm "$REPLACEMENT"
if run_owner --apply >/dev/null 2>&1; then exit 1; fi
[ -f "$ACTIVE" ]
pass=$((pass+1))

setup
mkdir -p "$ARCHIVE_ROOT"
chmod 700 "$ARCHIVE_ROOT"
cp "$ACTIVE" "$ARCHIVE"
chmod 700 "$ARCHIVE"
printf 'foreign\n' >> "$ARCHIVE"
rm "$ACTIVE"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup
mkdir -p "$ARCHIVE_ROOT"
chmod 700 "$ARCHIVE_ROOT"
cp "$ACTIVE" "$ARCHIVE"
chmod 700 "$ARCHIVE"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup
rm -rf "$ARCHIVE_ROOT"
ln -s "$TMP" "$ARCHIVE_ROOT"
if run_owner --apply >/dev/null 2>&1; then exit 1; fi
[ -f "$ACTIVE" ]
pass=$((pass+1))

grep -q '20-pocketrisu-ssh-tunnel' "$OWNER"
grep -q '21-pocketrisu-core-supervisor-guard' "$OWNER"
grep -q 'retired-by-termux-boot-v1' "$OWNER"
! grep -Eq 'sv[[:space:]]+(up|down)|runsvdir|service-daemon|settings[[:space:]]+put|device_config[[:space:]]+put|force-stop|reboot|killall|pkill|tailscale[[:space:]]|curl[[:space:]]|ssh[[:space:]]' "$OWNER"
! grep -Eq '(^|[^A-Za-z])(cp|rm)[[:space:]]' "$OWNER"
pass=$((pass+1))

printf 'PASS %s tests\n' "$pass"
