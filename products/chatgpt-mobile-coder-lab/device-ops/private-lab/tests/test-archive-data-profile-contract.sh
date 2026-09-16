#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
PROFILE="$HERE/archive-data-profile.sh"
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
  for c in zstd unzip; do
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
    case "$package:$native" in
      zstd:/usr/bin/zstd|unzip:/usr/bin/unzip) ;;
      *) exit 44 ;;
    esac
    pkg=0
    bin=0
    [ -f "$root/.pkg-$package" ] && pkg=1
    [ -x "$root$native" ] && bin=1
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
      case "$package" in
        zstd|unzip) ;;
        *) exit 45 ;;
      esac
      : > "$root/.pkg-$package"
      printf '#!/bin/sh\nexit 0\n' > "$root/usr/bin/$package"
      chmod 755 "$root/usr/bin/$package"
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
  package=$1
  : > "$LAB/.pkg-$package"
  printf '#!/bin/sh\nexit 0\n' > "$LAB/usr/bin/$package"
  chmod 755 "$LAB/usr/bin/$package"
}

make_fixture absent
out=$("$PROFILE" --check)
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:zstd package:zstd' || fail 'zstd missing state absent'
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:unzip package:unzip' || fail 'unzip missing state absent'
[ ! -s "$APTLOG" ] || fail 'check invoked apt'
ok 'isolated check ignores host lookalikes and stays read-only'

make_fixture partial
mark_present zstd
out=$("$PROFILE" --check)
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:zstd package:zstd' || fail 'zstd present lost'
printf '%s\n' "$out" | grep -Fqx 'MISSING tool:unzip package:unzip' || fail 'unzip missing not independent'
ok 'zstd stays present while unzip remains independently missing'

make_fixture present
mark_present zstd
mark_present unzip
out=$("$PROFILE" --check)
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:zstd package:zstd' || fail 'zstd not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:unzip package:unzip' || fail 'unzip not present'
ok 'both fixed package/native pairs converge'

make_fixture zstd_package_mismatch
: > "$LAB/.pkg-zstd"
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'zstd package-only mismatch accepted'; fi
grep -Fqx 'BLOCKED package-command-mismatch' "$ROOT/err" || fail 'zstd package-only mismatch not bounded'
[ ! -s "$APTLOG" ] || fail 'zstd mismatch invoked apt'
ok 'zstd package-present binary-missing blocks before mutation'

make_fixture unzip_binary_mismatch
printf '#!/bin/sh\nexit 0\n' > "$LAB/usr/bin/unzip"
chmod 755 "$LAB/usr/bin/unzip"
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'unzip binary-only mismatch accepted'; fi
grep -Fqx 'BLOCKED package-command-mismatch' "$ROOT/err" || fail 'unzip binary-only mismatch not bounded'
[ ! -s "$APTLOG" ] || fail 'unzip mismatch invoked apt'
ok 'unzip binary-present package-missing blocks before mutation'

make_fixture apply_partial
mark_present zstd
out=$("$PROFILE" --apply)
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:zstd package:zstd' || fail 'apply partial zstd not preserved'
printf '%s\n' "$out" | grep -Fqx 'INSTALLED tool:unzip package:unzip' || fail 'apply partial unzip install missing'
grep -Fqx 'install unzip' "$APTLOG" || fail 'apply partial requested more than unzip'
ok 'apply with zstd present requests exactly unzip'
make_fixture apply_all_absent
out=$("$PROFILE" --apply)
printf '%s\n' "$out" | grep -Fqx 'INSTALLED tool:zstd package:zstd' || fail 'all absent zstd install missing'
printf '%s\n' "$out" | grep -Fqx 'INSTALLED tool:unzip package:unzip' || fail 'all absent unzip install missing'
grep -Fqx 'install zstd unzip' "$APTLOG" || fail 'all absent fixed order mismatch'
ok 'fully absent apply requests exactly zstd then unzip'

before=$(wc -l < "$APTLOG" | tr -d ' ')
out=$("$PROFILE" --apply)
[ "$(wc -l < "$APTLOG" | tr -d ' ')" = "$before" ] || fail 'second apply invoked apt'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:zstd package:zstd' || fail 'second apply zstd not present'
printf '%s\n' "$out" | grep -Fqx 'PRESENT tool:unzip package:unzip' || fail 'second apply unzip not present'
ok 'repeated apply is a converged no-op'

make_fixture apt_fail
export MOCK_APT_FAIL=1
if "$PROFILE" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'apt failure accepted'; fi
grep -Fqx 'FAILED profile:archive-data' "$ROOT/err" || fail 'apt failure not bounded'
! grep -Fq 'RAW-APT-' "$ROOT/out" || fail 'raw apt stdout leaked'
! grep -Fq 'RAW-APT-' "$ROOT/err" || fail 'raw apt stderr leaked'
ok 'apt failure is sanitized and bounded'

make_fixture args
if "$PROFILE" >/dev/null 2>&1; then fail 'no-arg alias accepted'; fi
if "$PROFILE" --wat >/dev/null 2>&1; then fail 'unknown arg accepted'; fi
if "$PROFILE" --check extra >/dev/null 2>&1; then fail 'multiple args accepted'; fi
ok 'arguments fail closed'
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
grep -Fq 'apt-get install -y --no-remove --no-upgrade --no-install-recommends "$@"' "$PROFILE" || fail 'fixed install safeguard missing'
! grep -Fq '    shift' "$PROFILE" || fail 'inner shell drops fixed package args'
grep -Fq 'set -- "$@" zstd' "$PROFILE" || fail 'zstd allowlist step missing'
grep -Fq 'set -- "$@" unzip' "$PROFILE" || fail 'unzip allowlist step missing'
! grep -Eq '\bsqlite3\b|\bstrace\b|\blsof\b|\biproute2\b|\bclang\b|\bcmake\b|\bgdb\b' "$PROFILE" || fail 'later-rung package leaked into v2'
! grep -Eiq 'auth[_ -]?token|refresh[_ -]?token|session[_ -]?file|private[_ -]?key|tailscale|sshd|runit|adb' "$PROFILE" || fail 'forbidden runtime surface present'
ok 'profile is isolated, two-package-only, and excludes later/sensitive surfaces'

sh -n "$PROFILE"
sh -n "$0"
ok 'shell syntax passes'

echo "1..$PASS"
