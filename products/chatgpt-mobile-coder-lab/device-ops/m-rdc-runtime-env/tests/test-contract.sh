#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
OWNER="$HERE/mcl-m-rdc-runtime-env"
SHIM="$HERE/runtime-env-forward-shim.cjs"
PRE_SHA='f0f5f85c9a5ca41572d59a8187ae94d505a33c0e9ecdee87769517ba2f81e9cc'
MANAGED_SHA='aed27a581721481a76c42e25fe137c3baf63de87fad7412f7905d473f0ddae37'
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

write_original_run() {
  file=$1
  cat > "$file" <<'RUN_EOF'
#!/data/data/com.termux/files/usr/bin/sh
PREFIX=/data/data/com.termux/files/usr
HOME=/data/data/com.termux/files/home
INSTALL="$HOME/.local/share/desktop-commander-remote"
ENTRY="$INSTALL/node_modules/@wonderwhy-er/desktop-commander/dist/index.js"
export PREFIX HOME PATH="$PREFIX/bin:$PATH"
export DESKTOP_COMMANDER_DEVICE_NAME="M"
"$PREFIX/bin/termux-wake-lock" >/dev/null 2>&1 || true
child_pid=""
watchdog_pid=""
stop_watchdog() {
  [ -n "$watchdog_pid" ] || return 0
  "$PREFIX/bin/kill" -TERM -- "-$watchdog_pid" 2>/dev/null || true
}
stop_child() {
  [ -n "$child_pid" ] || return 0
  "$PREFIX/bin/kill" -TERM -- "-$child_pid" 2>/dev/null || true
  i=0
  while "$PREFIX/bin/kill" -0 "$child_pid" 2>/dev/null && [ "$i" -lt 20 ]; do
    "$PREFIX/bin/sleep" 0.25
    i=$((i + 1))
  done
  "$PREFIX/bin/kill" -KILL -- "-$child_pid" 2>/dev/null || true
}
trap 'stop_watchdog; stop_child; exit 0' TERM INT HUP
cd "$HOME"
"$PREFIX/bin/setsid" "$PREFIX/bin/node" "$ENTRY" remote 2>&1 &
child_pid=$!
"$PREFIX/bin/setsid" "$PREFIX/bin/sh" -c '
  while :; do
    "$HOME/.local/bin/rdc-health-watchdog" || true
    "$PREFIX/bin/sleep" 60
  done
' >/dev/null 2>&1 &
watchdog_pid=$!
wait "$child_pid"
rc=$?
stop_watchdog
trap - TERM INT HUP
exit "$rc"
RUN_EOF
  chmod 700 "$file"
  [ "$(sha256sum "$file" | awk '{print $1}')" = "$PRE_SHA" ] || fail "fixture pre-run hash"
}

make_fixture() {
  name=$1
  ROOT="$TMP/$name"
  export ROOT
  PREFIX="$ROOT/prefix"
  HOME_FIX="$ROOT/home"
  SERVICE="$PREFIX/var/service/desktop-commander-remote"
  export MCL_M_RDC_RUNTIME_ENV_TEST_MODE=1
  export MCL_M_RDC_RUNTIME_ENV_TEST_ROOT="$ROOT"
  export MOCK_SV_LOG="$ROOT/sv.log"
  mkdir -p "$SERVICE" "$PREFIX/bin" "$HOME_FIX"
  write_original_run "$SERVICE/run"
  cat > "$PREFIX/bin/sv" <<'SV_EOF'
#!/bin/sh
printf '%s\n' "$*" >> "$MOCK_SV_LOG"
exit 0
SV_EOF
  chmod 755 "$PREFIX/bin/sv"
}

sh -n "$OWNER"
node --check "$SHIM"
grep -Fq '# mcl-m-rdc-runtime-env-owner:v1' "$OWNER" || fail "owner marker"
grep -Fq '// mcl-m-rdc-runtime-env-forward:v1' "$SHIM" || fail "shim marker"
ok "owner and shim syntax plus ownership markers"

NODE_BIN=$(command -v node)
env -i PATH="$PATH" HOME="$HOME" \
  ANDROID_ROOT=parent-root ANDROID_DATA=parent-data \
  ANDROID_ART_ROOT=parent-art ANDROID_I18N_ROOT=parent-i18n \
  ANDROID_TZDATA_ROOT=parent-tz BOOTCLASSPATH=parent-boot \
  DEX2OATBOOTCLASSPATH=parent-dex PREFIX=parent-prefix TMPDIR=parent-tmp \
  MCL_UNRELATED_SECRET=do-not-forward \
  "$NODE_BIN" --require "$SHIM" --input-type=module - <<'NODE'
import {spawn} from 'node:child_process';
const selected = [
  'ANDROID_ROOT','ANDROID_DATA','ANDROID_ART_ROOT','ANDROID_I18N_ROOT',
  'ANDROID_TZDATA_ROOT','BOOTCLASSPATH','DEX2OATBOOTCLASSPATH',
];
const probe = `
const names=${JSON.stringify(selected)};
const out=Object.fromEntries(names.map((name)=>[name,process.env[name]??null]));
out.DC_REMOTE_DEVICE=process.env.DC_REMOTE_DEVICE??null;
out.PREFIX=process.env.PREFIX??null;
out.TMPDIR=process.env.TMPDIR??null;
out.MCL_UNRELATED_SECRET=process.env.MCL_UNRELATED_SECRET??null;
process.stdout.write(JSON.stringify(out));
`;
function run(env) {
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['-e',probe],{env,stdio:['ignore','pipe','inherit']});
    let output='';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',(chunk)=>{output+=chunk;});
    child.on('error',reject);
    child.on('close',(code)=>code===0?resolve(JSON.parse(output)):reject(new Error('child exit')));
  });
}
const marked=await run({DC_REMOTE_DEVICE:'true',ANDROID_ROOT:'child-root'});
if(marked.ANDROID_ROOT!=='child-root') process.exit(1);
for(const name of selected.slice(1)) if(marked[name]!==process.env[name]) process.exit(1);
if(marked.DC_REMOTE_DEVICE!=='true') process.exit(1);
if(marked.PREFIX!==null||marked.TMPDIR!==null||marked.MCL_UNRELATED_SECRET!==null) process.exit(1);
const unmarked=await run({});
for(const name of selected) if(unmarked[name]!==null) process.exit(1);
NODE
ok "marked ESM spawn gets only missing selected keys and child override wins"

env -i PATH="$PATH" HOME="$HOME" \
  ANDROID_ROOT=parent-root ANDROID_DATA=parent-data \
  ANDROID_ART_ROOT=parent-art ANDROID_I18N_ROOT=parent-i18n \
  ANDROID_TZDATA_ROOT=parent-tz BOOTCLASSPATH=parent-boot \
  "$NODE_BIN" --require "$SHIM" --input-type=module - <<'NODE'
import {spawn} from 'node:child_process';
const names=['ANDROID_ROOT','ANDROID_DATA','ANDROID_ART_ROOT','ANDROID_I18N_ROOT','ANDROID_TZDATA_ROOT','BOOTCLASSPATH','DEX2OATBOOTCLASSPATH'];
const probe=`const n=${JSON.stringify(names)};process.stdout.write(String(n.filter((x)=>x in process.env).length));`;
const value=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['-e',probe],{env:{DC_REMOTE_DEVICE:'true'},stdio:['ignore','pipe','inherit']});
  let output='';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',(chunk)=>{output+=chunk;});
  child.on('error',reject);
  child.on('close',(code)=>code===0?resolve(output):reject(new Error('child exit')));
});
if(value!=='0') process.exit(1);
NODE
ok "incomplete parent bundle produces no partial forwarding"

make_fixture check
before=$(sha256sum "$SERVICE/run")
set +e
out=$(sh "$OWNER" --check)
rc=$?
set -e
[ "$rc" -eq 1 ] || fail "pre-apply check rc"
printf '%s\n' "$out" | grep -Fqx 'run=ready' || fail "pre-apply run state"
printf '%s\n' "$out" | grep -Fqx 'shim=missing' || fail "pre-apply shim state"
[ "$(sha256sum "$SERVICE/run")" = "$before" ] || fail "check changed run file"
[ ! -e "$HOME_FIX/.local/share/mcl-m-rdc-runtime-env" ] || fail "check created managed directory"
ok "check is read-only and reports exact ready state"

sh "$OWNER" --apply > "$ROOT/apply.out"
DEST_SHIM="$HOME_FIX/.local/share/mcl-m-rdc-runtime-env/runtime-env-forward-shim.cjs"
[ -f "$DEST_SHIM" ] || fail "managed shim missing"
cmp -s "$SHIM" "$DEST_SHIM" || fail "managed shim bytes"
[ "$(sha256sum "$SERVICE/run" | awk '{print $1}')" = "$MANAGED_SHA" ] || fail "managed run hash"
[ "$(stat -c '%a' "$SERVICE/run")" = 700 ] || fail "managed run mode"
[ "$(grep -Fc '# mcl-m-rdc-runtime-env:v1' "$SERVICE/run")" -eq 1 ] || fail "run marker count"
[ "$(grep -Fc 'RUNTIME_ENV_SHIM="$HOME/.local/share/mcl-m-rdc-runtime-env/runtime-env-forward-shim.cjs"' "$SERVICE/run")" -eq 1 ] || fail "shim path count"
[ "$(grep -Fc -- '--require "$RUNTIME_ENV_SHIM"' "$SERVICE/run")" -eq 1 ] || fail "preload count"
! grep -Fq 'NODE_OPTIONS' "$SERVICE/run" || fail "global Node preload surface"
sed -e '/^# mcl-m-rdc-runtime-env:v1$/d' \
    -e '/^RUNTIME_ENV_SHIM="\$HOME\/\.local\/share\/mcl-m-rdc-runtime-env\/runtime-env-forward-shim.cjs"$/d' \
    -e 's/ --require "\$RUNTIME_ENV_SHIM"//' \
    "$SERVICE/run" > "$ROOT/normalized.run"
[ "$(sha256sum "$ROOT/normalized.run" | awk '{print $1}')" = "$PRE_SHA" ] || fail "non-owner run semantics changed"
ok "apply adopts exact current M run and preserves all prior semantics"

run_before=$(sha256sum "$SERVICE/run")
shim_before=$(sha256sum "$DEST_SHIM")
sh "$OWNER" --apply > "$ROOT/apply2.out"
[ "$(sha256sum "$SERVICE/run")" = "$run_before" ] || fail "second apply changed run"
[ "$(sha256sum "$DEST_SHIM")" = "$shim_before" ] || fail "second apply changed shim"
ok "second apply is a no-op"

sh "$OWNER" --activate > "$ROOT/activate.out"
[ "$(cat "$MOCK_SV_LOG")" = "restart $SERVICE" ] || fail "activate target"
ok "activate targets only fixed M RDC service"

make_fixture drift
printf '%s\n' '# drift' >> "$SERVICE/run"
if sh "$OWNER" --apply > "$ROOT/drift.out" 2>&1; then fail "drifted run accepted"; fi
[ ! -e "$HOME_FIX/.local/share/mcl-m-rdc-runtime-env" ] || fail "drifted run caused shim mutation"
ok "drifted target fails closed before managed mutation"

make_fixture unmanaged
mkdir -p "$HOME_FIX/.local/share/mcl-m-rdc-runtime-env"
printf '%s\n' 'UNMANAGED' > "$HOME_FIX/.local/share/mcl-m-rdc-runtime-env/runtime-env-forward-shim.cjs"
before=$(sha256sum "$SERVICE/run")
if sh "$OWNER" --apply > "$ROOT/unmanaged.out" 2>&1; then fail "unmanaged shim accepted"; fi
[ "$(sha256sum "$SERVICE/run")" = "$before" ] || fail "unmanaged shim changed run"
ok "unmanaged shim fails closed before run mutation"

! grep -Eq '(^|[[:space:]])(export[[:space:]]+)?NODE_OPTIONS=' "$OWNER" || fail "owner sets NODE_OPTIONS"
! grep -Eq '(cp|mv|install|rm|sed|awk).*(node_modules|desktop-commander/dist)' "$OWNER" || fail "owner mutates vendor path"
! grep -Eiq '(device\.json|auth|session|token).*=' "$OWNER" || fail "owner owns private/auth config"
! grep -Eq 'SERVICE_NAME=.*\$' "$OWNER" || fail "owner has caller-selected service"
ok "owner excludes global preload vendor private-config and generic service selectors"

echo "1..$PASS"
