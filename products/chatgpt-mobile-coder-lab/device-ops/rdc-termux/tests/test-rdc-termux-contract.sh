#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
INSTALL="$HERE/install.sh"
VERIFY="$HERE/verify.sh"
SHIM="$HERE/device-name-shim.cjs"
RUNTIME_ENV_SHIM="$HERE/runtime-env-forward-shim.cjs"
WHICH_SHIM="$HERE/which-rg-shim.sh"
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
printf '%s\n' '{' '  "name": "@wonderwhy-er/desktop-commander",' '  "version": "0.2.51"' '}' > "$pkg/package.json"
printf '%s\n' '#!/bin/sh' 'exit 0' > "$pkg/dist/index.js"
chmod 755 "$pkg/dist/index.js"
MOCK
  chmod 755 "$PREFIX/bin/npm"

  printf "%s\n" "#!/bin/sh" "exit 0" > "$PREFIX/bin/rg"
  chmod 755 "$PREFIX/bin/rg"

  cat > "$PREFIX/bin/sv" <<'MOCK'
#!/bin/sh
echo "run: $2: (pid 123) 1s"
MOCK
  chmod 755 "$PREFIX/bin/sv"
}
make_fixture whichshim
resolved=$(PATH="$PREFIX/bin" "$WHICH_SHIM" rg)
[ "$resolved" = "$PREFIX/bin/rg" ] || fail "ripgrep discovery shim path"
if PATH="$PREFIX/bin" "$WHICH_SHIM" git >/dev/null 2>&1; then fail "ripgrep discovery shim accepted another command"; fi
if PATH="$PREFIX/bin" "$WHICH_SHIM" rg extra >/dev/null 2>&1; then fail "ripgrep discovery shim accepted extra arguments"; fi
ok "ripgrep discovery shim resolves only rg through PATH"

DESKTOP_COMMANDER_DEVICE_NAME=S-Termux node --require "$SHIM" --input-type=module -e "import os from 'node:os'; if (os.hostname() !== 'S-Termux') process.exit(1)"
if DESKTOP_COMMANDER_DEVICE_NAME= node --require "$SHIM" -e "process.exit(0)" >/dev/null 2>&1; then fail "empty device label accepted"; fi
ok "device-name shim reaches ESM hostname and fails closed"

NODE_BIN=$(command -v node)
env -i PATH="$PATH" HOME="$HOME" \
  ANDROID_ROOT=parent-root ANDROID_DATA=parent-data \
  ANDROID_ART_ROOT=parent-art ANDROID_I18N_ROOT=parent-i18n \
  ANDROID_TZDATA_ROOT=parent-tz BOOTCLASSPATH=parent-boot \
  DEX2OATBOOTCLASSPATH=parent-dex PREFIX=parent-prefix TMPDIR=parent-tmp \
  MCL_UNRELATED_SECRET=do-not-forward \
  "$NODE_BIN" --require "$RUNTIME_ENV_SHIM" --input-type=module - <<'NODE'
import { spawn } from 'node:child_process';

const selected = [
  'ANDROID_ROOT', 'ANDROID_DATA', 'ANDROID_ART_ROOT', 'ANDROID_I18N_ROOT',
  'ANDROID_TZDATA_ROOT', 'BOOTCLASSPATH', 'DEX2OATBOOTCLASSPATH',
];
const probe = `
const selected = ${JSON.stringify(selected)};
const result = Object.fromEntries(selected.map((name) => [name, process.env[name] ?? null]));
result.DC_REMOTE_DEVICE = process.env.DC_REMOTE_DEVICE ?? null;
result.PREFIX = process.env.PREFIX ?? null;
result.TMPDIR = process.env.TMPDIR ?? null;
result.MCL_UNRELATED_SECRET = process.env.MCL_UNRELATED_SECRET ?? null;
process.stdout.write(JSON.stringify(result));
`;
function run(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', probe], { env, stdio: ['ignore', 'pipe', 'inherit'] });
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(JSON.parse(output)) : reject(new Error('child exit')));
  });
}
const marked = await run({ DC_REMOTE_DEVICE: 'true', ANDROID_ROOT: 'child-root' });
if (marked.ANDROID_ROOT !== 'child-root') process.exit(1);
for (const name of selected.slice(1)) if (marked[name] !== process.env[name]) process.exit(1);
if (marked.DC_REMOTE_DEVICE !== 'true') process.exit(1);
if (marked.PREFIX !== null || marked.TMPDIR !== null || marked.MCL_UNRELATED_SECRET !== null) process.exit(1);

const unmarked = await run({});
for (const name of selected) if (unmarked[name] !== null) process.exit(1);
NODE
ok "runtime-env shim forwards only missing selected keys to marked ESM spawn"

env -i PATH="$PATH" HOME="$HOME" \
  ANDROID_ROOT=parent-root ANDROID_DATA=parent-data \
  ANDROID_ART_ROOT=parent-art ANDROID_I18N_ROOT=parent-i18n \
  ANDROID_TZDATA_ROOT=parent-tz BOOTCLASSPATH=parent-boot \
  "$NODE_BIN" --require "$RUNTIME_ENV_SHIM" --input-type=module - <<'NODE'
import { spawn } from 'node:child_process';

const selected = [
  'ANDROID_ROOT', 'ANDROID_DATA', 'ANDROID_ART_ROOT', 'ANDROID_I18N_ROOT',
  'ANDROID_TZDATA_ROOT', 'BOOTCLASSPATH', 'DEX2OATBOOTCLASSPATH',
];
const probe = `const names=${JSON.stringify(selected)};process.stdout.write(String(names.filter((name)=>name in process.env).length));`;
const count = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['-e', probe], {
    env: { DC_REMOTE_DEVICE: 'true' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error('child exit')));
});
if (count !== '0') process.exit(1);
NODE
ok "runtime-env shim refuses partial forwarding from incomplete parent"

make_fixture labelblocked
if RDC_TERMUX_DEVICE_NAME='bad label' sh "$INSTALL" --apply > "$ROOT/labelblocked.out" 2>&1; then fail "invalid device label accepted"; fi
[ ! -s "$MOCK_LOG" ] || fail "invalid device label mutated package state"
[ ! -e "$PREFIX/var/service/desktop-commander-remote-termux" ] || fail "invalid device label created service"
ok "installer rejects unsafe device labels before mutation"

make_fixture check
out=$(sh "$INSTALL" --check)
[ ! -e "$HOME/.local/share/desktop-commander-remote-termux" ] || fail "check mutated install path"
[ ! -e "$PREFIX/var/service/desktop-commander-remote-termux" ] || fail "check mutated service path"
printf '%s' "$out" | grep -Fq 'MISSING package:0.2.51' || fail "check package state"
ok "default check is read-only"

make_fixture apply
mkdir -p "$PREFIX/var/service/desktop-commander-remote"
echo ORIGINAL > "$PREFIX/var/service/desktop-commander-remote/run"
original_sum=$(cksum "$PREFIX/var/service/desktop-commander-remote/run")
sh "$INSTALL" --apply > "$ROOT/apply.out"
shimfile="$HOME/.local/share/desktop-commander-remote-termux/device-name-shim.cjs"
runtimefile="$HOME/.local/share/desktop-commander-remote-termux/runtime-env-forward-shim.cjs"
whichfile="$HOME/.local/share/desktop-commander-remote-termux/tool-shims/which"
[ -f "$shimfile" ] || fail "managed device-name shim missing"
[ -f "$runtimefile" ] || fail "managed runtime-env shim missing"
[ -x "$whichfile" ] || fail "managed ripgrep discovery shim missing"
grep -Fq "# mcl-rdc-termux-which-rg:v1" "$whichfile" || fail "managed ripgrep discovery shim marker missing"
grep -Fq "// mcl-rdc-termux-device-name:v1" "$shimfile" || fail "managed shim marker missing"
grep -Fq "// mcl-rdc-termux-runtime-env-forward:v1" "$runtimefile" || fail "managed runtime-env shim marker missing"
[ -e "$PREFIX/var/service/desktop-commander-remote-termux/down" ] || fail "new service not disabled after apply"
[ "$(cksum "$PREFIX/var/service/desktop-commander-remote/run")" = "$original_sum" ] || fail "existing S endpoint changed"
[ "$(grep -c '^npm$' "$MOCK_LOG")" -eq 1 ] || fail "package install count"
sh "$VERIFY" > "$ROOT/verify.out"
ok "apply creates only the sibling managed service"

runfile="$PREFIX/var/service/desktop-commander-remote-termux/run"
grep -Fq "DESKTOP_COMMANDER_DEVICE_NAME='S-Termux'" "$runfile" || fail "device label missing"
grep -Fq "SHIM='$shimfile'" "$runfile" || fail "managed shim path missing"
grep -Fq "RUNTIME_ENV_SHIM='$runtimefile'" "$runfile" || fail "managed runtime-env shim path missing"
grep -Fq -- '--require "$SHIM"' "$runfile" || fail "managed shim preload missing"
grep -Fq -- '--require "$RUNTIME_ENV_SHIM"' "$runfile" || fail "managed runtime-env shim preload missing"
! grep -Fq 'NODE_OPTIONS' "$runfile" || fail "generated service uses global Node preload surface"
grep -Fq 'bin/node' "$runfile" || fail "Termux node path missing"
! grep -Fq 'proot-distro' "$runfile" || fail "PRoot invocation present"
! grep -Fq '/root/' "$runfile" || fail "Ubuntu home present"
grep -Fq "export PREFIX HOME PATH=\"\$TOOL_SHIM_DIR:\$PREFIX/bin:\$PATH\"" "$runfile" || fail "process-local ripgrep discovery PATH missing"
! grep -Fq "/system/bin" "$runfile" || fail "generated service widened PATH to Android system bin"
ok "generated service is Termux-native and distinct"
grep -Fq 'rc=0' "$runfile" || fail "child wait status initializer missing"
grep -Fq 'wait "$child_pid" || rc=$?' "$runfile" || fail "child wait is still exposed to errexit"

for tool in setsid kill sleep; do
  host_tool=$(command -v "$tool") || fail "host $tool unavailable"
  case "$host_tool" in /*) ;; *) host_tool="/usr/bin/$tool" ;; esac
  [ -x "$host_tool" ] || fail "host $tool path unavailable"
  cat > "$PREFIX/bin/$tool" <<MOCK
#!/bin/sh
exec '$host_tool' "\$@"
MOCK
  chmod 755 "$PREFIX/bin/$tool"
done
cat > "$PREFIX/bin/sleep" <<'MOCK'
#!/bin/sh
exec /bin/sleep 0.01
MOCK
chmod 755 "$PREFIX/bin/sleep"
cat > "$PREFIX/bin/termux-wake-lock" <<'MOCK'
#!/bin/sh
exit 0
MOCK
cat > "$PREFIX/bin/node" <<'MOCK'
#!/bin/sh
case "${RDC_TEST_NODE_MODE:-cleanup}" in
  exit7) exit 7 ;;
  cleanup) trap '' TERM; while :; do /bin/sleep 1; done ;;
  *) exit 2 ;;
esac
MOCK
chmod 755 "$PREFIX/bin/termux-wake-lock" "$PREFIX/bin/node"

(
service_pid=
child_pid=
cleanup_lifecycle() {
  [ -z "$service_pid" ] || kill -KILL "$service_pid" 2>/dev/null || true
  [ -z "$child_pid" ] || kill -KILL -- "-$child_pid" 2>/dev/null || true
}
trap cleanup_lifecycle EXIT HUP INT TERM

if RDC_TEST_NODE_MODE=exit7 sh "$runfile" > "$ROOT/lifecycle-exit.out" 2>&1; then
  fail "generated service lost nonzero child exit status"
else
  child_status=$?
fi
[ "$child_status" -eq 7 ] || fail "generated service changed child exit status"

RDC_TEST_NODE_MODE=cleanup sh "$runfile" > "$ROOT/lifecycle-term.out" 2>&1 &
service_pid=$!
child_pid=
i=0
while [ "$i" -lt 100 ]; do
  child_pid=$(ps -o pid= --ppid "$service_pid" 2>/dev/null | awk 'NR==1 {gsub(/[[:space:]]/, ""); print; exit}')
  [ -z "$child_pid" ] || break
  sleep 0.02
  i=$((i + 1))
done
[ -n "$child_pid" ] || { kill -KILL "$service_pid" 2>/dev/null || true; fail "generated service child did not start"; }
kill -TERM "$service_pid"
i=0
while kill -0 "$service_pid" 2>/dev/null && [ "$i" -lt 350 ]; do sleep 0.02; i=$((i + 1)); done
if kill -0 "$service_pid" 2>/dev/null; then
  kill -KILL "$service_pid" 2>/dev/null || true
  kill -KILL -- "-$child_pid" 2>/dev/null || true
  fail "generated service TERM trap did not exit"
fi
wait "$service_pid" || fail "generated service TERM trap returned nonzero"
i=0
while kill -0 "$child_pid" 2>/dev/null && [ "$i" -lt 100 ]; do sleep 0.02; i=$((i + 1)); done
if kill -0 "$child_pid" 2>/dev/null; then
  fail "setsid child group survived generated TERM cleanup"
fi
service_pid=
child_pid=
)
ok "generated service guards wait from errexit and cleans its setsid child group"

before_run=$(cksum "$runfile")
before_log=$(cksum "$PREFIX/var/service/desktop-commander-remote-termux/log/run")
before_pkg=$(cksum "$HOME/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/package.json")
before_shim=$(cksum "$shimfile")
before_runtime=$(cksum "$runtimefile")
before_which=$(cksum "$whichfile")
sh "$INSTALL" --apply > "$ROOT/apply2.out"
[ "$(grep -c '^npm$' "$MOCK_LOG")" -eq 1 ] || fail "second apply reinstalled package"
[ "$(cksum "$runfile")" = "$before_run" ] || fail "second apply rewrote run"
[ "$(cksum "$PREFIX/var/service/desktop-commander-remote-termux/log/run")" = "$before_log" ] || fail "second apply rewrote log"
[ "$(cksum "$HOME/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/package.json")" = "$before_pkg" ] || fail "second apply rewrote package"
[ "$(cksum "$shimfile")" = "$before_shim" ] || fail "second apply rewrote device-name shim"
[ "$(cksum "$runtimefile")" = "$before_runtime" ] || fail "second apply rewrote runtime-env shim"
[ "$(cksum "$whichfile")" = "$before_which" ] || fail "second apply rewrote ripgrep discovery shim"
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

make_fixture shimblocked
mkdir -p "$HOME/.local/share/desktop-commander-remote-termux"
echo UNMANAGED > "$HOME/.local/share/desktop-commander-remote-termux/device-name-shim.cjs"
if sh "$INSTALL" --apply > "$ROOT/shimblocked.out" 2>&1; then fail "unmanaged shim accepted"; fi
[ ! -s "$MOCK_LOG" ] || fail "unmanaged shim mutated package state"
ok "unmanaged device-name shim fails closed before mutation"

make_fixture runtimeblocked
mkdir -p "$HOME/.local/share/desktop-commander-remote-termux"
echo UNMANAGED > "$HOME/.local/share/desktop-commander-remote-termux/runtime-env-forward-shim.cjs"
if sh "$INSTALL" --apply > "$ROOT/runtimeblocked.out" 2>&1; then fail "unmanaged runtime-env shim accepted"; fi
[ ! -s "$MOCK_LOG" ] || fail "unmanaged runtime-env shim mutated package state"
ok "unmanaged runtime-env shim fails closed before mutation"

make_fixture whichblocked
mkdir -p "$HOME/.local/share/desktop-commander-remote-termux/tool-shims"
echo UNMANAGED > "$HOME/.local/share/desktop-commander-remote-termux/tool-shims/which"
if sh "$INSTALL" --apply > "$ROOT/whichblocked.out" 2>&1; then fail "unmanaged ripgrep discovery shim accepted"; fi
[ ! -s "$MOCK_LOG" ] || fail "unmanaged ripgrep discovery shim mutated package state"
ok "unmanaged ripgrep discovery shim fails closed before mutation"

make_fixture policy
sh "$INSTALL" --apply > "$ROOT/policy-apply.out"
POLICY=$(printf '%s%s' 'allow-external' '-apps')
printf '%s = true\n' "$POLICY" > "$HOME/.termux/termux.properties"
if sh "$VERIFY" > "$ROOT/policy-verify.out" 2>&1; then fail "enabled external-command policy accepted"; fi
ok "verify fails closed when broader command policy is enabled"

! grep -Fq 'termux.properties' "$INSTALL" || fail "installer edits Termux properties"
! grep -Fq "$POLICY" "$INSTALL" || fail "installer changes broader command policy"
! grep -Fq 'proot-distro' "$INSTALL" || fail "installer contains PRoot route"
! grep -Fq 'NODE_OPTIONS' "$INSTALL" || fail "installer uses global Node preload surface"
! grep -Fq '/root/' "$INSTALL" || fail "installer contains Ubuntu home"
! grep -Eiq 'copy.*(auth|session)|(auth|session).*copy' "$INSTALL" || fail "installer contains auth/session copy"
! grep -Fq "/system/bin" "$INSTALL" || fail "installer widens process PATH to Android system bin"
! grep -Fq "/system/bin" "$WHICH_SHIM" || fail "ripgrep discovery shim depends on Android system bin"
ok "installer excludes security, PRoot, and auth/session widening"

echo "1..$PASS"
