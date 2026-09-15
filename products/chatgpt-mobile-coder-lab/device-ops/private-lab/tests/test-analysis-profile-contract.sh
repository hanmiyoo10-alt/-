#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PROFILE="$HERE/analysis-profile.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
ORIG_PATH=$PATH
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

make_fixture() {
  name=$1
  ROOT="$TMP/$name"
  STATE="$ROOT/state"
  BIN="$ROOT/bin"
  HOSTBIN="$ROOT/host-bin"
  LOG="$ROOT/pd.log"
  APTLOG="$ROOT/apt.log"
  LAB="$STATE/containers/mcl-private-lab/rootfs"
  mkdir -p "$BIN" "$HOSTBIN" "$LAB/etc" "$LAB/usr/bin"
  printf '%s\n' '# mcl-private-lab:v1' > "$LAB/etc/mcl-private-lab"
  : > "$LOG"
  : > "$APTLOG"
  for c in rg jq file; do
    printf '#!/bin/sh\nexit 0\n' > "$HOSTBIN/$c"
    chmod 755 "$HOSTBIN/$c"
  done
  cat > "$BIN/proot-distro" <<'MOCK'
#!/bin/sh
set -eu
LOG=${MOCK_PD_LOG:?}
APTLOG=${MOCK_APT_LOG:?}
STATE=${MCL_PRIVATE_LAB_STATE_BASE:?}
printf '%s\n' "$*" >> "$LOG"
[ "$1" = login ] || exit 40
[ "$2" = --isolated ] || exit 41
[ "$3" = mcl-private-lab ] || exit 42
[ "$4" = -- ] || exit 43
script=${7:-}
root="$STATE/containers/mcl-private-lab/rootfs"
case "$script" in
  *dpkg-query*)
    package=${9:-}
    native=${10:-}
    pkg=0
    bin=0
    [ -f "$root/.pkg-$package" ] && pkg=1
    case "$native" in
      /usr/bin/rg) rel=usr/bin/rg ;;
      /usr/bin/jq) rel=usr/bin/jq ;;
      /usr/bin/file) rel=usr/bin/file ;;
      *) exit 44 ;;
    esac
    [ -x "$root/$rel" ] && bin=1
    printf '%s:%s\n' "$pkg" "$bin"
    exit 0
    ;;
  *'apt-get install'*)
    shift 8
    printf 'install' >> "$APTLOG"
    for package in "$@"; do printf ' %s' "$package" >> "$APTLOG"; done
    printf '\n' >> "$APTLOG"
    if [ "${MOCK_APT_FAIL:-0}" = 1 ]; then
      echo 'RAW-APT-SECRET-SHOULD-NOT-LEAK'
      echo 'RAW-APT-ERROR-SHOULD-NOT-LEAK' >&2
      exit 55
    fi
    for package in "$@"; do
      : > "$root/.pkg-$package"
      case "$package" in
        ripgrep) native=usr/bin/rg ;;
        jq) native=usr/bin/jq ;;
        file) native=usr/bin/file ;;
        *) exit 45 ;;
      esac
      printf '#!/bin/sh\nexit 0\n' > "$root/$native"
      chmod 755 "$root/$native"
    done
    exit 0
    ;;
esac
exit 46
MOCK
  chmod 755 "$BIN/proot-distro"
  export ROOT STATE BIN HOSTBIN LOG APTLOG LAB
  export MOCK_PD_LOG="$LOG" MOCK_APT_LOG="$APTLOG"
  export MCL_PRIVATE_LAB_STATE_BASE="$STATE"
  export MCL_PRIVATE_LAB_PROOT_DISTRO="$BIN/proot-distro"
  unset MOCK_APT_FAIL MCL_PRIVATE_LAB_NAME
  PATH="$HOSTBIN:$ORIG_PATH"
  export PATH
}

mark_present() {
  package=$1 native=$2
  : > "$LAB/.pkg-$package"
  printf '#!/bin/sh\nexit 0\n' > "$LAB/usr/bin/$native"
  chmod 755 "$LAB/usr/bin/$native"
}

make_fixture absent
out=$("$PROFILE" --check)
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:rg package:ripgrep' || fail 'rg missing state absent'
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:jq package:jq' || fail 'jq missing state absent'
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:file package:file' || fail 'file missing state absent'
[ ! -s "$APTLOG" ] || fail 'check invoked apt'
ok 'isolated check ignores host lookalike commands and stays read-only'

make_fixture present
mark_present ripgrep rg
mark_present jq jq
mark_present file file
out=$("$PROFILE" --check)
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:rg package:ripgrep' || fail 'rg not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:jq package:jq' || fail 'jq not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:file package:file' || fail 'file not present'
ok 'package ownership plus fixed native binaries converge'

make_fixture package_mismatch
: > "$LAB/.pkg-ripgrep"
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'package-only mismatch accepted'; fi
grep -Fqx 'BLOCKED package-command-mismatch' "$ROOT/err" || fail 'package-only mismatch not bounded'
[ ! -s "$APTLOG" ] || fail 'mismatch invoked apt'
ok 'package-present binary-missing fails before mutation'

make_fixture binary_mismatch
printf '#!/bin/sh\nexit 0\n' > "$LAB/usr/bin/rg"
chmod 755 "$LAB/usr/bin/rg"
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'binary-only mismatch accepted'; fi
grep -Fqx 'BLOCKED package-command-mismatch' "$ROOT/err" || fail 'binary-only mismatch not bounded'
[ ! -s "$APTLOG" ] || fail 'binary mismatch invoked apt'
ok 'binary-present package-missing fails before mutation'

make_fixture apply
mark_present jq jq
out=$("$PROFILE" --apply)
printf '%s\n' "$out" | grep -Fqx 'INSTALLED tool:rg package:ripgrep' || fail 'rg install status missing'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:jq package:jq' || fail 'jq present status missing'
printf '%s\n' "$out" | grep -Fqx 'INSTALLED tool:file package:file' || fail 'file install status missing'
grep -Fqx 'install ripgrep file' "$APTLOG" || fail 'apply did not request exact missing allowlist'
ok 'apply requests only missing allowlisted packages'

before=$(wc -l < "$APTLOG" | tr -d ' ')
out=$("$PROFILE" --apply)
[ "$(wc -l < "$APTLOG" | tr -d ' ')" = "$before" ] || fail 'second apply invoked apt'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:rg package:ripgrep' || fail 'second apply rg not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:jq package:jq' || fail 'second apply jq not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:file package:file' || fail 'second apply file not present'
ok 'repeated apply is converged no-op'

make_fixture apt_fail
export MOCK_APT_FAIL=1
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'apt failure accepted'; fi
grep -Fqx 'FAILED profile:analysis-essentials' "$ROOT/err" || fail 'apt failure not bounded'
! grep -Fq 'RAW-APT-' "$ROOT/out" || fail 'raw apt stdout leaked'
! grep -Fq 'RAW-APT-' "$ROOT/err" || fail 'raw apt stderr leaked'
ok 'apt failure is sanitized and bounded'

make_fixture args
if "$PROFILE" >/dev/null 2>&1; then fail 'no-arg alias accepted'; fi
if "$PROFILE" --wat >/dev/null 2>&1; then fail 'unknown arg accepted'; fi
if "$PROFILE" --check extra >/dev/null 2>&1; then fail 'multiple args accepted'; fi
ok 'no-arg alias, unknown, and multiple arguments fail closed'

make_fixture unmanaged
rm -f "$LAB/etc/mcl-private-lab"
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'unmanaged lab accepted'; fi
grep -Fqx 'BLOCKED lab-unavailable' "$ROOT/err" || fail 'unmanaged lab not bounded'
[ ! -s "$LOG" ] || fail 'unmanaged lab entered proot'
ok 'managed marker is required before isolated entry'

! grep -Fq 'login mcl-private-lab' "$PROFILE" || fail 'non-isolated login literal present'
grep -Fq 'login --isolated' "$PROFILE" || fail 'isolated login contract missing'
! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$PROFILE" || fail 'host sharing surface present'
! grep -Eq 'apt-get (update|upgrade|dist-upgrade|remove|autoremove)' "$PROFILE" || fail 'broad apt mutation surface present'
! grep -Eiq 'auth[_ -]?token|refresh[_ -]?token|session[_ -]?file|private[_ -]?key|tailscale|sshd|runit|adb' "$PROFILE" || fail 'forbidden runtime surface present'
ok 'profile excludes host sharing, broad mutation, and sensitive runtime surfaces'

sh -n "$PROFILE"
sh -n "$0"
ok 'shell syntax passes'

echo "1..$PASS"
