#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
INSTALL="$OWNER/install.sh"
REPO=$(CDPATH= cd -- "$OWNER/../../../.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() {
  printf 'FAIL %s\n' "$*" >&2
  exit 1
}
ok() {
  printf 'PASS %s\n' "$1"
}
assert_line() {
  printf '%s\n' "$OUT" | grep -Fqx "$1" || fail "missing line: $1"
}
run_install() {
  set +e
  OUT=$(env     MCL_M_FAMILY_STATUS_INSTALL_TEST_MODE=1     MCL_M_FAMILY_STATUS_INSTALL_TEST_HOME="$HOME_DIR"     MCL_M_FAMILY_STATUS_INSTALL_TEST_PREFIX="$PREFIX_DIR"     MCL_M_FAMILY_STATUS_INSTALL_TEST_SOURCE_ROOT="$SOURCE_DIR"     sh "$INSTALL" "$@" 2>&1)
  RC=$?
  set -e
}

FILES='
products/chatgpt-mobile-coder-lab/device-ops/m-family-status/mcl-env-status|755
products/chatgpt-mobile-coder-lab/device-ops/m-termux-operator/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/verify.sh|755
products/chatgpt-mobile-coder-lab/device-ops/private-lab/analysis-profile.sh|755
products/chatgpt-mobile-coder-lab/device-ops/vm-lab/bootstrap.sh|755
products/chatgpt-mobile-coder-lab/device-ops/vm-lab/verify.sh|755
tools/repo-env/resource-guard/guard.py|644
'

reset_fixture() {
  ROOT="$TMP/root"
  HOME_DIR="$ROOT/home"
  PREFIX_DIR="$ROOT/prefix"
  SOURCE_DIR="$ROOT/source"
  rm -rf "$ROOT"
  mkdir -p "$HOME_DIR" "$PREFIX_DIR/bin" "$SOURCE_DIR"
  printf '%s\n' "$FILES" | sed '/^$/d' | while IFS='|' read -r rel mode; do
    mkdir -p "$SOURCE_DIR/$(dirname "$rel")"
    cp "$REPO/$rel" "$SOURCE_DIR/$rel"
    chmod "$mode" "$SOURCE_DIR/$rel"
  done
}

snapshot() {
  {
    find "$HOME_DIR/.local/share/mcl-m-family-status" -type f -printf '%m %T@ %p\n' 2>/dev/null || true
    if [ -f "$PREFIX_DIR/bin/mcl-env-status" ]; then
      stat -c '%a %Y %n' "$PREFIX_DIR/bin/mcl-env-status"
      sha256sum "$PREFIX_DIR/bin/mcl-env-status"
    fi
  } | sort
}

reset_fixture
run_install --check
[ "$RC" -eq 1 ] || fail "initial check rc=$RC"
assert_line 'schema=mcl-m-family-status-install.v1'
assert_line 'bundle=missing'
assert_line 'launcher=missing'
assert_line 'result=needs_apply'
[ ! -e "$HOME_DIR/.local/share/mcl-m-family-status" ] || fail 'check created bundle'
[ ! -e "$PREFIX_DIR/bin/mcl-env-status" ] || fail 'check created launcher'
ok 'check is read-only and reports missing'

run_install --apply
[ "$RC" -eq 0 ] || fail "apply rc=$RC output=$OUT"
assert_line 'bundle=present'
assert_line 'launcher=present'
assert_line 'result=pass'
printf '%s\n' "$FILES" | sed '/^$/d' | while IFS='|' read -r rel mode; do
  src="$SOURCE_DIR/$rel"
  dst="$HOME_DIR/.local/share/mcl-m-family-status/repo/$rel"
  [ -f "$dst" ] && [ ! -L "$dst" ] || fail "missing target $rel"
  cmp -s "$src" "$dst" || fail "content mismatch $rel"
  [ "$(stat -c %a "$dst")" = "$mode" ] || fail "mode mismatch $rel"
done
[ "$(stat -c %a "$PREFIX_DIR/bin/mcl-env-status")" = 755 ] || fail 'launcher mode'
ok 'apply materializes exact fixed bundle and launcher'

set +e
HOME="$HOME_DIR" PREFIX="$PREFIX_DIR" "$PREFIX_DIR/bin/mcl-env-status" invalid >"$TMP/launcher.out" 2>"$TMP/launcher.err"
launcher_rc=$?
set -e
[ "$launcher_rc" -eq 2 ] || fail 'launcher did not invoke projection'
grep -Fqx 'usage: mcl-env-status status' "$TMP/launcher.err" || fail 'launcher target mismatch'
ok 'launcher executes bundled projection'

before=$(snapshot)
run_install --apply
[ "$RC" -eq 0 ] || fail 'repeat apply failed'
after=$(snapshot)
[ "$before" = "$after" ] || fail 'repeat apply rewrote managed files'
ok 'repeated apply is no-op'

drift="$HOME_DIR/.local/share/mcl-m-family-status/repo/products/chatgpt-mobile-coder-lab/device-ops/m-termux-operator/bootstrap.sh"
printf '\n# drift\n' >> "$drift"
run_install --check
[ "$RC" -eq 1 ] || fail 'managed drift not repairable'
assert_line 'bundle=missing'
run_install --apply
[ "$RC" -eq 0 ] || fail 'managed drift repair failed'
cmp -s "$SOURCE_DIR/products/chatgpt-mobile-coder-lab/device-ops/m-termux-operator/bootstrap.sh" "$drift" || fail 'drift not repaired'
ok 'managed regular-file drift is rematerialized'

extra="$HOME_DIR/.local/share/mcl-m-family-status/unmanaged.txt"
printf 'x\n' > "$extra"
run_install --check
[ "$RC" -eq 2 ] || fail 'unexpected bundle file accepted'
assert_line 'bundle=conflict'
assert_line 'result=blocked'
rm "$extra"
ok 'unexpected bundle file blocks'

target="$HOME_DIR/.local/share/mcl-m-family-status/repo/products/chatgpt-mobile-coder-lab/device-ops/private-lab/verify.sh"
rm "$target"
ln -s /dev/null "$target"
run_install --apply
[ "$RC" -eq 2 ] || fail 'symlink target accepted'
assert_line 'bundle=conflict'
assert_line 'result=blocked'
ok 'symlink managed target blocks'

reset_fixture
printf '#!/bin/sh\nexit 0\n' > "$PREFIX_DIR/bin/mcl-env-status"
chmod 755 "$PREFIX_DIR/bin/mcl-env-status"
run_install --apply
[ "$RC" -eq 2 ] || fail 'unmanaged launcher overwritten'
assert_line 'launcher=conflict'
assert_line 'result=blocked'
ok 'unmanaged launcher blocks'

source_text=$(cat "$INSTALL")
for forbidden in 'pkg install' 'apt-get' 'proot-distro' 'qemu-system' 'sv up' 'sv down' 'sv restart' 'git ' 'curl ' 'wget ' '/system/bin' 'adb '; do
  if printf '%s\n' "$source_text" | grep -F "$forbidden" >/dev/null; then
    fail "forbidden install surface: $forbidden"
  fi
done
ok 'installer excludes package runtime service git network and android effects'

printf 'PASS m-family-status install contract\n'
