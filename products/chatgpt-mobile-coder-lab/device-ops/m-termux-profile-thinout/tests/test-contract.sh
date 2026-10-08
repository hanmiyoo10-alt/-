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
  for x in sha256sum stat chmod mv rm mkdir grep; do ln -s "$(command -v "$x")" "$P/bin/$x"; done

  cat > "$P/bin/dpkg-query" <<'STUB'
#!/bin/sh
state="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}/state"
target="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}/prefix/etc/profile.d/start-services.sh"
divert="${target}.mcl-stock"
case "$1" in
  -W) cat "$state/version" ;;
  -S)
    [ "$2" = "$target" ] || exit 1
    printf 'termux-services: %s\n' "$target"
    if [ -f "$state/diversion" ]; then
      printf 'local diversion from: %s\n' "$target"
      printf 'local diversion to: %s\n' "$divert"
    fi
    ;;
  *) exit 2 ;;
esac
STUB

  cat > "$P/bin/dpkg-divert" <<'STUB'
#!/bin/sh
root="${MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT}"
target="$root/prefix/etc/profile.d/start-services.sh"
divert="$root/prefix/etc/profile.d/start-services.sh.mcl-stock"
state="$root/state/diversion"
remove_mode="$root/state/remove_mode"

if [ "$1" = "--truename" ] && [ "$#" -eq 2 ]; then
  [ -f "$state" ] && printf '%s\n' "$divert" || printf '%s\n' "$target"
  exit 0
fi
if [ "$1" = "--listpackage" ] && [ "$#" -eq 2 ]; then
  [ -f "$state" ] && cat "$state"
  exit 0
fi
if [ "$#" -eq 6 ] && [ "$1" = "--local" ] && [ "$2" = "--add" ] \
    && [ "$3" = "--rename" ] && [ "$4" = "--divert" ] \
    && [ "$5" = "$divert" ] && [ "$6" = "$target" ]; then
  [ ! -f "$state" ] || exit 1
  [ -f "$target" ] || exit 1
  mv "$target" "$divert" || exit 1
  printf '%s\n' 'LOCAL' > "$state"
  exit 0
fi
if [ "$#" -eq 6 ] && [ "$1" = "--local" ] && [ "$2" = "--remove" ] \
    && [ "$3" = "--rename" ] && [ "$4" = "--divert" ] \
    && [ "$5" = "$divert" ] && [ "$6" = "$target" ]; then
  [ -f "$state" ] || exit 1
  [ "$(cat "$state")" = "LOCAL" ] || exit 1
  mode=""
  [ -f "$remove_mode" ] && mode="$(cat "$remove_mode")"
  case "$mode" in
    fail) exit 1 ;;
    concurrent_stock)
      [ ! -e "$target" ] || exit 1
      mv "$divert" "$target" || exit 1
      rm -f "$state"
      exit 1
      ;;
  esac
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

make_interrupted() {
  target="$P/etc/profile.d/start-services.sh"
  divert="$target.mcl-stock"
  mv "$target" "$divert"
  printf '%s\n' 'LOCAL' > "$TMP/root/state/diversion"
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

make_fixture
set +e
out=$(MCL_M_TERMUX_PROFILE_THINOUT_TEST_MODE=true \
  MCL_M_TERMUX_PROFILE_THINOUT_TEST_ROOT="$TMP/root" \
  sh "$OWNER" --apply); rc=$?
set -e
[ "$rc" -eq 64 ] || fail invalid-test-mode-code
grep -Fxq 'reason=invalid_test_mode' <<<"$out" || fail invalid-test-mode-reason
grep -Fq 'service-daemon start' "$P/etc/profile.d/start-services.sh" || fail invalid-test-mode-mutated
ok invalid-test-mode-block

make_fixture
out=$(run_owner --apply)
grep -Fxq 'state=thinned' <<<"$out" || fail apply-state
grep -Fxq 'result=pass' <<<"$out" || fail apply-pass
grep -Fxq 'reason=applied' <<<"$out" || fail apply-reason
! grep -Fq 'service-daemon' "$P/etc/profile.d/start-services.sh" || fail auto-start-remains
[ "$(cat "$TMP/root/state/diversion")" = 'LOCAL' ] || fail diversion-owner
ok apply

set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 2 ] || fail repeated-apply-code
grep -Fxq 'reason=apply_requires_stock_or_interrupted' <<<"$out" || fail repeated-apply-reason
ok repeated-apply-blocked

out=$(run_owner --restore)
grep -Fxq 'state=stock' <<<"$out" || fail restore-state
grep -Fxq 'result=pass' <<<"$out" || fail restore-pass
grep -Fxq 'reason=restored' <<<"$out" || fail restore-reason
grep -Fq 'service-daemon start' "$P/etc/profile.d/start-services.sh" || fail stock-not-restored
[ ! -e "$P/etc/profile.d/start-services.sh.mcl-stock" ] || fail archive-left
ok restore

make_fixture
make_interrupted
out=$(run_owner --check)
grep -Fxq 'state=interrupted' <<<"$out" || fail interrupted-check-state
grep -Fxq 'result=pass' <<<"$out" || fail interrupted-check-pass
ok interrupted-check

out=$(run_owner --apply)
grep -Fxq 'state=thinned' <<<"$out" || fail interrupted-apply-state
grep -Fxq 'reason=applied_from_interrupted' <<<"$out" || fail interrupted-apply-reason
ok interrupted-apply

make_fixture
make_interrupted
out=$(run_owner --restore)
grep -Fxq 'state=stock' <<<"$out" || fail interrupted-restore-state
grep -Fxq 'reason=restored_from_interrupted' <<<"$out" || fail interrupted-restore-reason
ok interrupted-restore

make_fixture
make_interrupted
printf '%s\n' 'foreign-package' > "$TMP/root/state/diversion"
set +e
out=$(run_owner --check); rc=$?
set -e
[ "$rc" -eq 2 ] || fail foreign-diversion-code
grep -Fxq 'reason=diversion_owner_mismatch' <<<"$out" || fail foreign-diversion-reason
ok foreign-diversion-block

make_fixture
rm -f "$P/bin/mv"
cat > "$P/bin/mv" <<'STUB'
#!/bin/sh
exit 1
STUB
chmod 700 "$P/bin/mv"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 4 ] || fail install-failure-code
grep -Fxq 'reason=replacement_install_failed' <<<"$out" || fail install-failure-reason
grep -Fxq 'state=stock' <<<"$out" || fail install-failure-state
grep -Fq 'service-daemon start' "$P/etc/profile.d/start-services.sh" || fail rollback-stock-not-restored
[ ! -e "$P/etc/profile.d/start-services.sh.mcl-stock" ] || fail rollback-archive-left
ok install-failure-rollback

make_fixture
printf '%s\n' 'fail' > "$TMP/root/state/remove_mode"
rm -f "$P/bin/mv"
cat > "$P/bin/mv" <<'STUB'
#!/bin/sh
exit 1
STUB
chmod 700 "$P/bin/mv"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 4 ] || fail rollback-failure-code
grep -Fxq 'reason=replacement_install_failed_rollback_failed' <<<"$out" || fail rollback-failure-reason
grep -Fxq 'state=interrupted' <<<"$out" || fail rollback-failure-state
grep -Fxq 'diversion=present' <<<"$out" || fail rollback-failure-diversion
[ ! -e "$P/etc/profile.d/start-services.sh" ] || fail rollback-failure-target
[ -f "$P/etc/profile.d/start-services.sh.mcl-stock" ] || fail rollback-failure-archive
ok rollback-failure-reclassified

make_fixture
run_owner --apply >/dev/null
printf '%s\n' 'concurrent_stock' > "$TMP/root/state/remove_mode"
out=$(run_owner --restore)
grep -Fxq 'result=pass' <<<"$out" || fail concurrent-restore-pass
grep -Fxq 'reason=restored_concurrently' <<<"$out" || fail concurrent-restore-reason
grep -Fxq 'state=stock' <<<"$out" || fail concurrent-restore-state
grep -Fq 'service-daemon start' "$P/etc/profile.d/start-services.sh" || fail concurrent-stock-overwritten
ok concurrent-restore-no-overwrite

make_fixture
run_owner --apply >/dev/null
printf '%s\n' 'fail' > "$TMP/root/state/remove_mode"
set +e
out=$(run_owner --restore); rc=$?
set -e
[ "$rc" -eq 4 ] || fail restore-failure-code
grep -Fxq 'reason=diversion_remove_failed' <<<"$out" || fail restore-failure-reason
grep -Fxq 'state=thinned' <<<"$out" || fail restore-failure-state
! grep -Fq 'service-daemon' "$P/etc/profile.d/start-services.sh" || fail restore-failure-auto-start
ok restore-failure-rethinned

make_fixture
printf '%s' '0.99' > "$TMP/root/state/version"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 3 ] || fail package-version-code
grep -Fxq 'reason=package_identity_mismatch' <<<"$out" || fail package-version-reason
ok package-version-block

make_fixture
printf '\n# drift\n' >> "$P/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --apply); rc=$?
set -e
[ "$rc" -eq 2 ] || fail stock-drift-code
grep -Fxq 'reason=stock_hash_mismatch' <<<"$out" || fail stock-drift-reason
ok stock-drift-block

make_fixture
mv "$P/etc/profile.d/start-services.sh" "$TMP/root/state/real"
ln -s "$TMP/root/state/real" "$P/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --check); rc=$?
set -e
[ "$rc" -eq 2 ] || fail symlink-code
grep -Fxq 'reason=stock_target_not_regular' <<<"$out" || fail symlink-reason
ok symlink-block

make_fixture
run_owner --apply >/dev/null
printf '\n# drift\n' >> "$P/etc/profile.d/start-services.sh.mcl-stock"
set +e
out=$(run_owner --restore); rc=$?
set -e
[ "$rc" -eq 2 ] || fail archive-drift-code
grep -Fxq 'reason=archive_hash_mismatch' <<<"$out" || fail archive-drift-reason
ok archive-drift-block

make_fixture
run_owner --apply >/dev/null
printf '\n# drift\n' >> "$P/etc/profile.d/start-services.sh"
set +e
out=$(run_owner --restore); rc=$?
set -e
[ "$rc" -eq 2 ] || fail replacement-drift-code
grep -Fxq 'reason=replacement_hash_mismatch' <<<"$out" || fail replacement-drift-reason
ok replacement-drift-block

grep -Fq "EXPECTED_PACKAGE='termux-services'" "$OWNER" || fail fixed-package
grep -Fq "EXPECTED_VERSION='0.13-1'" "$OWNER" || fail fixed-version
grep -Fq "EXPECTED_STOCK_SHA='8c8b8c5222a74bd037cb059ccbbedd4d94cf1f0b1b76b2df8cfa220b9de9d3f8'" "$OWNER" || fail fixed-stock
grep -Fq -- '--listpackage "$TARGET"' "$OWNER" || fail local-diversion-owner-check
grep -Fq -- '--local --add --rename --divert' "$OWNER" || fail diversion-add
grep -Fq -- '--local --remove --rename --divert' "$OWNER" || fail diversion-remove
grep -Fq -- '"$MV" -n "$path" "$TARGET"' "$OWNER" || fail no-clobber-install
! grep -Eq 'settings|device_config|max_phantom_processes|killall|pkill|force-stop|reboot' "$OWNER" || fail forbidden-surface
! grep -Fq 'service-daemon start' "$OWNER" || fail auto-start-command
ok static-contract

sh -n "$OWNER"
echo 'PASS m-termux-profile-thinout contract'
