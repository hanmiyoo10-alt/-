#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OWNER="$ROOT/mcl-m-termux-profile-thinout"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

fail(){ echo "FAIL $*" >&2; exit 1; }
ok(){ echo "PASS $*"; }

make_fixture() {
  rm -rf "$TMP/root"
  P="$TMP/root/prefix"
  mkdir -p "$P/bin" "$P/etc/profile.d" "$P/tmp" "$TMP/root/state"
  for x in sha256sum stat chmod mv rm mkdir; do ln -s "$(command -v "$x")" "$P/bin/$x"; done
  cat > "$P/bin/dpkg-query" <<'STUB'
#!/bin/sh
state="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}/state"
target="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}/prefix/etc/profile.d/start-services.sh"
case "$1" in
  -W) cat "$state/version" ;;
  -S) [ "$2" = "$target" ] && printf 'termux-services: %s\n' "$target" || exit 1 ;;
  *) exit 2 ;;
esac
STUB
  cat > "$P/bin/dpkg-divert" <<'STUB'
#!/bin/sh
root="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}"
target="$root/prefix/etc/profile.d/start-services.sh"
divert="$root/prefix/etc/profile.d/start-services.sh.mcl-stock"
state="$root/state/diversion"
if [ "$1" = "--truename" ]; then
  [ -f "$state" ] && printf '%s\n' "$divert" || printf '%s\n' "$target"
  exit 0
fi
if [ "$#" -eq 6 ] && [ "$1" = "--local" ] && [ "$2" = "--add" ] \
    && [ "$3" = "--rename" ] && [ "$4" = "--divert" ] \
    && [ "$5" = "$divert" ] && [ "$6" = "$target" ]; then
  [ ! -f "$state" ] || exit 1
  [ -f "$target" ] || exit 1
  mv "$target" "$divert" || exit 1
  : > "$state"
  exit 0
fi
if [ "$#" -eq 6 ] && [ "$1" = "--local" ] && [ "$2" = "--remove" ] \
    && [ "$3" = "--rename" ] && [ "$4" = "--divert" ] \
    && [ "$5" = "$divert" ] && [ "$6" = "$target" ]; then
  [ -f "$state" ] || exit 1
  [ ! -e "$target" ] || exit 1
  mv "$divert" "$target" || exit 1
  rm -f "$state"
  exit 0
fi
exit 2
STUB
  chmod 700 "$P/bin/dpkg-query" "$P/bin/dpkg-divert"
  printf '%s' '0.13-1' > "$TMP/root/state/version"
  cat > "$P/etc/profile.d/start-services.sh" <<'STOCK'
export SVDIR=$PREFIX/var/service
export LOGDIR=$PREFIX/var/log
(service-daemon start >/dev/null 2>&1 & )
STOCK
  chmod 700 "$P/etc/profile.d/start-services.sh"
}

run_owner() {
  MCL_M_TERMUX_PROFILE_THINOUT_TEST_MODE=1 \
  MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT="$TMP/root" \
  sh "$OWNER" "$@"
}

make_fixture
out=$(run_owner --check)
grep -Fxq 'state=stock' <<<"$out" || fail stock-check
grep -Fxq 'result=pass' <<<"$out" || fail stock-pass
ok stock-check

out=$(run_owner --apply)
grep -Fxq 'state=thinned' <<<"$out" || fail apply-state
grep -Fxq 'result=pass' <<<"$out" || fail apply-pass
! grep -Fq 'service-daemon' "$TMP/root/prefix/etc/profile.d/start-services.sh" || fail auto-start-remains
grep -Fxq 'export SVDIR=$PREFIX/var/service' "$TMP/root/prefix/etc/profile.d/start-services.sh" || fail sdir
grep -Fxq 'export LOGDIR=$PREFIX/var/log' "$TMP/root/prefix/etc/profile.d/start-services.sh" || fail logdir
[ -f "$TMP/root/prefix/etc/profile.d/start-services.sh.mcl-stock" ] || fail archive
ok apply

set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 2 ] || fail repeated-apply-code
grep -Fxq 'reason=apply_requires_stock' <<<"$out" || fail repeated-apply-reason
ok repeated-apply-blocked

out=$(run_owner --restore)
grep -Fxq 'state=stock' <<<"$out" || fail restore-state
grep -Fxq 'result=pass' <<<"$out" || fail restore-pass
grep -Fq 'service-daemon start' "$TMP/root/prefix/etc/profile.d/start-services.sh" || fail stock-not-restored
[ ! -e "$TMP/root/prefix/etc/profile.d/start-services.sh.mcl-stock" ] || fail archive-left
ok restore

make_fixture
printf '%s' '0.99' > "$TMP/root/state/version"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 3 ] || fail package-version-code
grep -Fxq 'reason=package_identity_mismatch' <<<"$out" || fail package-version-reason
ok package-version-block

make_fixture
printf '\n# drift\n' >> "$TMP/root/prefix/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 2 ] || fail stock-drift-code
grep -Fxq 'reason=stock_hash_mismatch' <<<"$out" || fail stock-drift-reason
ok stock-drift-block

make_fixture
mv "$TMP/root/prefix/etc/profile.d/start-services.sh" "$TMP/root/state/real"
ln -s "$TMP/root/state/real" "$TMP/root/prefix/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --check); rc=$?
set -e
[ "$rc" -eq 2 ] || fail symlink-code
grep -Fxq 'reason=stock_target_not_regular' <<<"$out" || fail symlink-reason
ok symlink-block

make_fixture
run_owner --apply >/dev/null
printf '\n# drift\n' >> "$TMP/root/prefix/etc/profile.d/start-services.sh.mcl-stock"
set +e
out=$(run_owner --restore); rc=$?
set -e
[ "$rc" -eq 2 ] || fail archive-drift-code
grep -Fxq 'reason=archive_hash_mismatch' <<<"$out" || fail archive-drift-reason
ok archive-drift-block

make_fixture
run_owner --apply >/dev/null
printf '\n# drift\n' >> "$TMP/root/prefix/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --restore); rc=$?
set -e
[ "$rc" -eq 2 ] || fail replacement-drift-code
grep -Fxq 'reason=replacement_hash_mismatch' <<<"$out" || fail replacement-drift-reason
ok replacement-drift-block

grep -Fq "EXPECTED_PACKAGE='termux-services'" "$OWNER" || fail fixed-package
grep -Fq "EXPECTED_VERSION='0.13-1'" "$OWNER" || fail fixed-version
grep -Fq "EXPECTED_STOCK_SHA='8c8b8c5222a74bd037cb059ccbbedd4d94cf1f0b1b76b2df8cfa220b9de9d3f8'" "$OWNER" || fail fixed-stock
grep -Fq -- '--local --add --rename --divert' "$OWNER" || fail diversion-add
grep -Fq -- '--local --remove --rename --divert' "$OWNER" || fail diversion-remove
! grep -Eq 'settings|device_config|max_phantom_processes|killall|pkill|force-stop|reboot' "$OWNER" || fail forbidden-surface
! grep -Fq 'service-daemon start' "$OWNER" || fail auto-start-command
ok static-contract

sh -n "$OWNER"
echo 'PASS m-termux-profile-thinout contract'
