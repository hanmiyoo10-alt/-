#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BOOT="$HERE/bootstrap.sh"
VERIFY="$HERE/verify.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

make_fixture() {
  name=$1
  ROOT="$TMP/$name"
  PREFIX="$ROOT/prefix"
  STATE="$ROOT/state"
  BIN="$ROOT/bin"
  LOG="$ROOT/pd.log"
  mkdir -p "$BIN" "$STATE/containers/ubuntu/rootfs"
  printf 'PRESERVE\n' > "$STATE/containers/ubuntu/rootfs/preserved"
  : > "$LOG"
  cat > "$BIN/proot-distro" <<'MOCK'
#!/bin/sh
set -eu
LOG=${MOCK_PD_LOG:?}
STATE=${MCL_PRIVATE_LAB_STATE_BASE:?}
printf '%s\n' "$*" >> "$LOG"
if [ "$1" = install ] && [ "${2:-}" = --help ]; then
  [ "${MOCK_NO_NAME_CAP:-0}" = 1 ] && { echo 'install IMAGE'; exit 0; }
  echo '  -n, --name [NAME]  Set a custom name for the container.'
  exit 0
fi
if [ "$1" = install ]; then
  [ "$2" = --name ] || exit 40
  name=$3
  mkdir -p "$STATE/containers/$name/rootfs"
  exit 0
fi
if [ "$1" = login ]; then
  [ "$2" = --isolated ] || exit 41
  name=$3
  root="$STATE/containers/$name/rootfs"
  case "$*" in
    *'apt-get install'*) : > "$root/.toolchain"; exit 0 ;;
    *'command -v'*) [ -f "$root/.toolchain" ]; exit $? ;;
  esac
  exit 0
fi
exit 42
MOCK
  chmod 755 "$BIN/proot-distro"
  export ROOT PREFIX STATE BIN LOG
  export MOCK_PD_LOG="$LOG"
  export MCL_PRIVATE_LAB_STATE_BASE="$STATE"
  export MCL_PRIVATE_LAB_PROOT_DISTRO="$BIN/proot-distro"
  unset MCL_PRIVATE_LAB_NAME MCL_PRIVATE_LAB_IMAGE MOCK_NO_NAME_CAP
}

make_fixture unsafe
if MCL_PRIVATE_LAB_NAME='bad name' "$BOOT" --apply >/dev/null 2>&1; then fail "unsafe name accepted"; fi
[ ! -s "$LOG" ] || fail "unsafe name invoked proot-distro"
ok "unsafe lab name fails before mutation"

make_fixture preserved
if MCL_PRIVATE_LAB_NAME=ubuntu "$BOOT" --apply >/dev/null 2>&1; then fail "preserved ubuntu accepted"; fi
[ ! -s "$LOG" ] || fail "preserved ubuntu invoked proot-distro"
ok "existing ubuntu can never be the lab target"

make_fixture capability
export MOCK_NO_NAME_CAP=1
if "$BOOT" --apply >/dev/null 2>&1; then fail "missing name capability accepted"; fi
[ ! -d "$STATE/containers/mcl-private-lab" ] || fail "capability failure created lab"
ok "missing named-container capability fails closed"

make_fixture check
before=$(cksum "$STATE/containers/ubuntu/rootfs/preserved")
out=$("$BOOT" --check)
printf '%s\n' "$out" | grep -Fqx 'PRESENT capability:named-container' || fail "capability state missing"
printf '%s\n' "$out" | grep -Fqx 'MISSING container:mcl-private-lab' || fail "missing state not reported"
[ ! -d "$STATE/containers/mcl-private-lab" ] || fail "check created lab"
[ "$(cksum "$STATE/containers/ubuntu/rootfs/preserved")" = "$before" ] || fail "check changed ubuntu"
ok "default check is read-only and preserves ubuntu"

make_fixture apply
before=$(cksum "$STATE/containers/ubuntu/rootfs/preserved")
"$BOOT" --apply >/dev/null
LAB="$STATE/containers/mcl-private-lab/rootfs"
[ -f "$LAB/etc/mcl-private-lab" ] || fail "managed marker missing"
grep -Fqx '# mcl-private-lab:v1' "$LAB/etc/mcl-private-lab" || fail "managed marker wrong"
for d in vendor fixtures results receipts; do [ -d "$LAB/opt/mcl-private-lab/$d" ] || fail "layout $d missing"; done
[ -f "$LAB/.toolchain" ] || fail "toolchain install not requested"
[ "$(cksum "$STATE/containers/ubuntu/rootfs/preserved")" = "$before" ] || fail "apply changed ubuntu"
grep -Fq 'install --name mcl-private-lab ubuntu:24.04' "$LOG" || fail "named install not used"
! grep -Fq 'login mcl-private-lab' "$LOG" || fail "non-isolated login used"
grep -Fq 'login --isolated mcl-private-lab' "$LOG" || fail "isolated login missing"
ok "apply creates only managed named lab with isolated entry"

install_count=$(grep -c '^install --name mcl-private-lab ' "$LOG")
"$BOOT" --apply >/dev/null
[ "$(grep -c '^install --name mcl-private-lab ' "$LOG")" -eq "$install_count" ] || fail "second apply reinstalled lab"
ok "second apply preserves managed lab container"

MCL_PRIVATE_LAB_STATE_BASE="$STATE" MCL_PRIVATE_LAB_PROOT_DISTRO="$BIN/proot-distro" "$VERIFY" >/dev/null
ok "verify requires managed layout and toolchain"

make_fixture unmanaged
mkdir -p "$STATE/containers/mcl-private-lab/rootfs"
if "$BOOT" --apply >/dev/null 2>&1; then fail "unmanaged existing lab accepted"; fi
[ ! -e "$STATE/containers/mcl-private-lab/rootfs/etc/mcl-private-lab" ] || fail "unmanaged lab adopted"
ok "unmanaged target fails closed"

! grep -Eq 'proot-distro (remove|reset|rename)' "$BOOT" || fail "destructive proot command present"
! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$BOOT" || fail "host sharing option present"
grep -Fq 'login --isolated' "$BOOT" || fail "isolated login contract missing"
! grep -Eiq 'auth[_ -]?token|refresh[_ -]?token|session[_ -]?file|private[_ -]?key' "$BOOT" || fail "sensitive runtime ownership leaked into bootstrap"
ok "bootstrap excludes destructive, shared-host, and sensitive runtime surfaces"

[ "$(git -C "$HERE" rev-parse --show-toplevel 2>/dev/null || true)" != "" ] || true
sh -n "$BOOT"
sh -n "$VERIFY"
sh -n "$0"
ok "shell syntax passes"

echo "1..$PASS"
