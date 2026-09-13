#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-rdcctl"
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
  ROOT="$TMP/$1"
  export ROOT
  mkdir -p "$ROOT/prefix/bin" \
    "$ROOT/prefix/var/service/desktop-commander-remote-termux" \
    "$ROOT/home/.termux" \
    "$ROOT/home/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander" \
    "$ROOT/rdc-termux"
  printf '%s\n' '{' '  "name": "@wonderwhy-er/desktop-commander",' '  "version": "0.2.50"' '}' \
    > "$ROOT/home/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/package.json"
  printf '%s\n' '# external command policy remains default-disabled' > "$ROOT/home/.termux/termux.properties"

  cat > "$ROOT/prefix/bin/sv" <<'SV'
#!/bin/sh
case "${MCL_TEST_SV_STATE:-run}" in
  run) echo 'run: PRIVATE_LOG_LIKE_FIXTURE_OUTPUT pid=999 path=/private/service' ;;
  down) echo 'down: PRIVATE_LOG_LIKE_FIXTURE_OUTPUT pid=999 path=/private/service' ;;
  *) echo 'PRIVATE_LOG_LIKE_FIXTURE_OUTPUT pid=999 path=/private/service'; exit 1 ;;
esac
SV
  chmod 755 "$ROOT/prefix/bin/sv"

  cat > "$ROOT/rdc-termux/verify.sh" <<'VERIFY'
#!/bin/sh
printf '%s\n' 'TOKEN_LIKE_FIXTURE_OUTPUT'
printf '%s\n' 'SESSION_LIKE_FIXTURE_OUTPUT' >&2
exit "${MCL_TEST_VERIFY_RC:-0}"
VERIFY
  chmod 755 "$ROOT/rdc-termux/verify.sh"
}

run_ctl() {
  MCL_RDCCTL_TEST_MODE=1 MCL_RDCCTL_TEST_ROOT="$ROOT" sh "$CTL" "$@"
}
expected_receipt() {
  version=$1 service=$2 managed=$3 policy=$4 result=$5
  printf '%s\n' \
    'schema=mcl-rdcctl.v1' \
    'profile=s-termux' \
    'execution_context=termux' \
    "rdc_version=$version" \
    "service_state=$service" \
    "managed_profile=$managed" \
    "external_command_policy=$policy" \
    "result=$result"
}

make_fixture happy
out=$(run_ctl status --profile s-termux 2>"$ROOT/err")
[ "$out" = "$(expected_receipt 0.2.50 running pass disabled pass)" ] || fail "happy status receipt"
[ ! -s "$ROOT/err" ] || fail "happy status wrote stderr"
if printf '%s\n' "$out" | grep -Eq 'ACCESS_TOKEN|PRIVATE_SESSION|PRIVATE_LOG_LIKE_FIXTURE_OUTPUT|pid=|/private/'; then
  fail "child or raw service output escaped receipt"
fi
ok "status emits only the fixed sanitized receipt"

out=$(run_ctl verify --profile s-termux 2>"$ROOT/err")
[ "$out" = "$(expected_receipt 0.2.50 running pass disabled pass)" ] || fail "happy verify receipt"
ok "verify passes only the bounded healthy profile"
make_fixture verifyfail
if MCL_RDCCTL_TEST_MODE=1 MCL_RDCCTL_TEST_ROOT="$ROOT" MCL_TEST_VERIFY_RC=7 sh "$CTL" verify --profile s-termux >"$ROOT/out" 2>"$ROOT/err"; then
  fail "verify accepted failed managed profile"
else
  rc=$?
fi
[ "$rc" -eq 1 ] || fail "verify failure exit code"
out=$(cat "$ROOT/out")
[ "$out" = "$(expected_receipt 0.2.50 running fail disabled fail)" ] || fail "failed managed receipt"
[ ! -s "$ROOT/err" ] || fail "failed child stderr escaped"
ok "managed-profile failure stays sanitized and nonzero"

make_fixture stopped
out=$(MCL_RDCCTL_TEST_MODE=1 MCL_RDCCTL_TEST_ROOT="$ROOT" MCL_TEST_SV_STATE=down sh "$CTL" status --profile s-termux)
[ "$out" = "$(expected_receipt 0.2.50 stopped pass disabled fail)" ] || fail "stopped service classification"
if printf '%s\n' "$out" | grep -Eq 'PRIVATE_LOG_LIKE_FIXTURE_OUTPUT|pid=|/private/'; then fail "raw sv status escaped"; fi
ok "raw runit status is classified without passthrough"

make_fixture unknown
chmod 644 "$ROOT/prefix/bin/sv"
out=$(run_ctl status --profile s-termux)
[ "$out" = "$(expected_receipt 0.2.50 unknown pass disabled unknown)" ] || fail "unknown service receipt"
ok "status preserves unknown instead of manufacturing pass"
make_fixture policy
printf '%s\n' 'allow-external-apps = true' > "$ROOT/home/.termux/termux.properties"
out=$(run_ctl status --profile s-termux)
[ "$out" = "$(expected_receipt 0.2.50 running pass enabled fail)" ] || fail "enabled external-command policy receipt"
ok "broader Termux command policy is surfaced only as an enum"

make_fixture missing
rm -rf "$ROOT/prefix/var/service/desktop-commander-remote-termux"
out=$(run_ctl status --profile s-termux)
[ "$out" = "$(expected_receipt 0.2.50 missing pass disabled fail)" ] || fail "missing service receipt"
ok "known missing service is a bounded failure"

make_fixture unsupported
cat > "$ROOT/rdc-termux/verify.sh" <<'PROBE'
#!/bin/sh
touch "$MCL_TEST_PROBE"
exit 0
PROBE
chmod 755 "$ROOT/rdc-termux/verify.sh"
probe="$ROOT/probed"
if MCL_RDCCTL_TEST_MODE=1 MCL_RDCCTL_TEST_ROOT="$ROOT" MCL_TEST_PROBE="$probe" sh "$CTL" status --profile '../../private/path' >"$ROOT/out" 2>"$ROOT/err"; then
  fail "unsupported profile accepted"
fi
[ ! -e "$probe" ] || fail "unsupported profile reached verifier"
[ "$(cat "$ROOT/err")" = 'BLOCKED unsupported profile' ] || fail "unsupported profile diagnostic"
ok "unsupported profile fails before any profile probe"
make_fixture readonly
before=$(find "$ROOT" -type f -exec sha256sum {} \; | sort)
run_ctl status --profile s-termux >/dev/null
run_ctl verify --profile s-termux >/dev/null
after=$(find "$ROOT" -type f -exec sha256sum {} \; | sort)
[ "$before" = "$after" ] || fail "controller mutated fixture state"
ok "status and verify are content-read-only"

if grep -Eiq 'device[.]json|[.]desktop-commander-device|proot-distro|tailnet|private[ -]?key|session[ -]?id|device[ -]?id' "$CTL"; then
  fail "controller references forbidden sensitive/runtime surfaces"
fi
if grep -Eq 'sv[[:space:]]+(up|down|restart)' "$CTL"; then
  fail "controller contains mutating runit action"
fi
if grep -Eq '(^|[;&|[:space:]])(touch|mkdir|cp|mv|rm|chmod|chown|install|npm|pkg|apt|git|proot-distro)([;&|[:space:]]|$)' "$CTL"; then
  fail "controller contains forbidden mutating command surface"
fi
ok "controller source excludes forbidden mutation and sensitive inputs"

echo "1..$PASS"
