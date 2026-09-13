#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
INSTALL="$HERE/install.sh"
VERIFY="$HERE/verify.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0

ok() {
  PASS=$((PASS + 1))
  echo "ok $PASS - $1"
}

fail() {
  echo "not ok - $1" >&2
  exit 1
}

make_fixture() {
  name=$1
  ROOT="$TMP/$name"
  PREFIX="$ROOT/prefix"
  HOME="$ROOT/home"
  export ROOT PREFIX HOME
  export MOCK_LOG="$ROOT/mock.log"
  mkdir -p "$PREFIX/bin" "$HOME/.termux"
  : > "$MOCK_LOG"
  echo '# external command policy remains default-disabled' > "$HOME/.termux/termux.properties"
  cat > "$PREFIX/bin/npm" <<'MOCK'
#!/bin/sh
set -eu
echo npm >> "$MOCK_LOG"
out=
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--prefix" ]; then out=$2; shift 2; else shift; fi
done
[ -n "$out" ] || exit 2
pkg="$out/node_modules/@wonderwhy-er/desktop-commander"
mkdir -p "$pkg/dist"
printf '%s\n' '{' '  "name": "@wonderwhy-er/desktop-commander",' '  "version": "0.2.50"' '}' > "$pkg/package.json"
printf '%s\n' '#!/bin/sh' 'exit 0' > "$pkg/dist/index.js"
chmod 755 "$pkg/dist/index.js"
MOCK
  chmod 755 "$PREFIX/bin/npm"

  cat > "$PREFIX/bin/sv" <<'MOCK'
#!/bin/sh
echo "run: $2: (pid 123) 1s"
MOCK
  chmod 755 "$PREFIX/bin/sv"
}
make_fixture check
out=$(sh "$INSTALL" --check)
[ ! -e "$HOME/.local/share/desktop-commander-remote-termux" ] || fail "check mutated install path"
[ ! -e "$PREFIX/var/service/desktop-commander-remote-termux" ] || fail "check mutated service path"
printf '%s' "$out" | grep -Fq 'MISSING package:0.2.50' || fail "check package state"
ok "default check is read-only"

make_fixture apply
mkdir -p "$PREFIX/var/service/desktop-commander-remote"
echo ORIGINAL > "$PREFIX/var/service/desktop-commander-remote/run"
original_sum=$(cksum "$PREFIX/var/service/desktop-commander-remote/run")
sh "$INSTALL" --apply > "$ROOT/apply.out"
[ -e "$PREFIX/var/service/desktop-commander-remote-termux/down" ] || fail "new service not disabled after apply"
[ "$(cksum "$PREFIX/var/service/desktop-commander-remote/run")" = "$original_sum" ] || fail "existing S endpoint changed"
[ "$(grep -c '^npm$' "$MOCK_LOG")" -eq 1 ] || fail "package install count"
sh "$VERIFY" > "$ROOT/verify.out"
ok "apply creates only the sibling managed service"

runfile="$PREFIX/var/service/desktop-commander-remote-termux/run"
grep -Fq "DESKTOP_COMMANDER_DEVICE_NAME='S-Termux'" "$runfile" || fail "device label missing"
grep -Fq 'bin/node' "$runfile" || fail "Termux node path missing"
! grep -Fq 'proot-distro' "$runfile" || fail "PRoot invocation present"
! grep -Fq '/root/' "$runfile" || fail "Ubuntu home present"
ok "generated service is Termux-native and distinct"
before_run=$(cksum "$runfile")
before_log=$(cksum "$PREFIX/var/service/desktop-commander-remote-termux/log/run")
before_pkg=$(cksum "$HOME/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/package.json")
sh "$INSTALL" --apply > "$ROOT/apply2.out"
[ "$(grep -c '^npm$' "$MOCK_LOG")" -eq 1 ] || fail "second apply reinstalled package"
[ "$(cksum "$runfile")" = "$before_run" ] || fail "second apply rewrote run"
[ "$(cksum "$PREFIX/var/service/desktop-commander-remote-termux/log/run")" = "$before_log" ] || fail "second apply rewrote log"
[ "$(cksum "$HOME/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/package.json")" = "$before_pkg" ] || fail "second apply rewrote package"
ok "second apply is a managed-state no-op"

sh "$INSTALL" --activate > "$ROOT/activate.out"
[ ! -e "$PREFIX/var/service/desktop-commander-remote-termux/down" ] || fail "activate left down marker"
sh "$VERIFY" --require-running > "$ROOT/verify-running.out"
ok "activation is explicit and running verification is separate"

make_fixture blocked
mkdir -p "$PREFIX/var/service/desktop-commander-remote-termux"
echo UNMANAGED > "$PREFIX/var/service/desktop-commander-remote-termux/run"
if sh "$INSTALL" --apply > "$ROOT/blocked.out" 2>&1; then fail "unmanaged target accepted"; fi
[ ! -s "$MOCK_LOG" ] || fail "blocked target mutated package state"
ok "unmanaged target fails closed before mutation"
make_fixture policy
sh "$INSTALL" --apply > "$ROOT/policy-apply.out"
POLICY=$(printf '%s%s' 'allow-external' '-apps')
printf '%s = true\n' "$POLICY" > "$HOME/.termux/termux.properties"
if sh "$VERIFY" > "$ROOT/policy-verify.out" 2>&1; then fail "enabled external-command policy accepted"; fi
ok "verify fails closed when broader command policy is enabled"

! grep -Fq 'termux.properties' "$INSTALL" || fail "installer edits Termux properties"
! grep -Fq "$POLICY" "$INSTALL" || fail "installer changes broader command policy"
! grep -Fq 'proot-distro' "$INSTALL" || fail "installer contains PRoot route"
! grep -Fq '/root/' "$INSTALL" || fail "installer contains Ubuntu home"
! grep -Eiq 'copy.*(auth|session)|(auth|session).*copy' "$INSTALL" || fail "installer contains auth/session copy"
ok "installer excludes security, PRoot, and auth/session widening"

echo "1..$PASS"
