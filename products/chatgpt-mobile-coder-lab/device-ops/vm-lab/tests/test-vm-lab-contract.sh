#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BOOTSTRAP="$HERE/bootstrap.sh"
VERIFY="$HERE/verify.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
ORIG_PATH=$PATH
REAL_PYTHON=$(command -v python3)
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

make_fixture() {
  name=$1
  ROOT="$TMP/$name"
  HOME="$ROOT/home"
  PREFIX="$ROOT/prefix"
  BIN="$ROOT/bin"
  MOCK_STATE="$ROOT/state"
  PKGLOG="$ROOT/pkg.log"
  CURLLOG="$ROOT/curl.log"
  IMGLOG="$ROOT/img.log"
  mkdir -p "$HOME" "$PREFIX/bin" "$PREFIX/share/qemu" "$BIN" "$MOCK_STATE"
  : > "$PKGLOG"; : > "$CURLLOG"; : > "$IMGLOG"
  export ROOT HOME PREFIX BIN MOCK_STATE PKGLOG CURLLOG IMGLOG REAL_PYTHON
  unset MOCK_BAD_SHA MOCK_GUARD_RC
  cat > "$BIN/dpkg-query" <<'MOCK'
#!/bin/sh
pkg=${3:-}
[ -f "$MOCK_STATE/pkg-$pkg" ] || exit 1
printf '%s' 'install ok installed'
MOCK
  cat > "$BIN/pkg" <<'MOCK'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$PKGLOG"
[ "${1:-}" = install ] || exit 30
for arg in "$@"; do
  case "$arg" in
    qemu-system-aarch64-headless|qemu-utils) : > "$MOCK_STATE/pkg-$arg" ;;
    install|-y|--no-upgrade|--no-remove) ;;
    *) exit 31 ;;
  esac
done
mkdir -p "$PREFIX/share/qemu"
: > "$PREFIX/share/qemu/edk2-aarch64-code.fd"
MOCK
  cat > "$BIN/qemu-system-aarch64" <<'MOCK'
#!/bin/sh
exit 0
MOCK
  cat > "$BIN/qemu-img" <<'MOCK'
#!/bin/sh
set -eu
case "${1:-}" in
  create) printf '%s\n' "$*" >> "$IMGLOG"; : > "$5" ;;
  info) printf '%s\n' '{"format":"qcow2","virtual-size":8589934592}' ;;
  *) exit 32 ;;
esac
MOCK
  cat > "$BIN/curl" <<'MOCK'
#!/bin/sh
set -eu
out=
url=
while [ "$#" -gt 0 ]; do
  case "$1" in
    -o) out=$2; shift 2 ;;
    http*) url=$1; shift ;;
    *) shift ;;
  esac
done
[ -n "$out" ] && [ -n "$url" ] || exit 33
printf '%s\n' "$url" >> "$CURLLOG"
truncate -s 92743680 "$out"
MOCK
  cat > "$BIN/sha256sum" <<'MOCK'
#!/bin/sh
if [ "${MOCK_BAD_SHA:-0}" = 1 ]; then
  printf '%064d  %s\n' 0 "$1"
else
  printf '%s  %s\n' 'c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02' "$1"
fi
MOCK
  cat > "$BIN/python3" <<'MOCK'
#!/bin/sh
case "${1:-}" in
  */tools/repo-env/resource-guard/guard.py) exit "${MOCK_GUARD_RC:-0}" ;;
  *) exec "$REAL_PYTHON" "$@" ;;
esac
MOCK
  chmod 755 "$BIN"/*
  PATH="$BIN:$ORIG_PATH"
  export PATH
}

mark_package() { : > "$MOCK_STATE/pkg-$1"; }
mark_firmware() { : > "$PREFIX/share/qemu/edk2-aarch64-code.fd"; }
make_fixture absent
out=$("$BOOTSTRAP" --check)
printf '%s\n' "$out" | grep -Fqx 'MISSING vm-root:mcl-vm-lab' || fail 'missing root not reported'
[ ! -s "$PKGLOG" ] && [ ! -s "$CURLLOG" ] || fail 'check mutated package or network surface'
[ ! -e "$HOME/.local/share/mcl-vm-lab" ] || fail 'check created managed root'
ok 'absent check is read-only and bounded'

if "$BOOTSTRAP" >/dev/null 2>&1; then fail 'no-arg bootstrap accepted'; fi
if "$BOOTSTRAP" --apply extra >/dev/null 2>&1; then fail 'extra bootstrap arg accepted'; fi
if "$VERIFY" --wat >/dev/null 2>&1; then fail 'unknown verify arg accepted'; fi
ok 'argument surface is fixed'

make_fixture conflict
mkdir -p "$HOME/.local/share/mcl-vm-lab"
if "$BOOTSTRAP" --apply >"$ROOT/out" 2>"$ROOT/err"; then fail 'unmarked root accepted'; fi
grep -Fqx 'BLOCKED ownership-conflict' "$ROOT/err" || fail 'unmarked root not bounded'
[ ! -s "$PKGLOG" ] && [ ! -s "$CURLLOG" ] || fail 'ownership conflict mutated'
ok 'unmarked root fails before mutation'

make_fixture apply
out=$("$BOOTSTRAP" --apply)
grep -Fq -- '--no-upgrade' "$PKGLOG" || fail 'no-upgrade guard missing'
grep -Fq -- '--no-remove' "$PKGLOG" || fail 'no-remove guard missing'
grep -Fq 'qemu-system-aarch64-headless' "$PKGLOG" || fail 'headless qemu package missing'
grep -Fq 'qemu-utils' "$PKGLOG" || fail 'qemu-utils package missing'
grep -Fqx 'https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/alpine-virt-3.24.1-aarch64.iso' "$CURLLOG" || fail 'guest URL not fixed'
printf '%s\n' "$out" | grep -Fqx 'PRESENT guest-image:alpine-virt-3.24.1-aarch64' || fail 'image not converged'
ok 'apply owns only fixed packages image and disk'
[ -f "$HOME/.local/share/mcl-vm-lab/.mcl-vm-lab-v1" ] || fail 'share marker missing'
[ -f "$HOME/.local/state/mcl-vm-lab/.mcl-vm-lab-v1" ] || fail 'state marker missing'
[ "$(wc -c < "$HOME/.local/share/mcl-vm-lab/alpine-virt-3.24.1-aarch64.iso" | tr -d ' ')" = 92743680 ] || fail 'image size not pinned'
[ -f "$HOME/.local/share/mcl-vm-lab/mcl-vm-lab.qcow2" ] || fail 'disk absent'
[ "$(wc -c < "$HOME/.local/state/mcl-vm-lab/uefi-vars.fd" | tr -d ' ')" = 67108864 ] || fail 'uefi vars size not pinned'
ok 'owned markers and pinned artifact shape materialize'

pkg_before=$(wc -l < "$PKGLOG" | tr -d ' ')
curl_before=$(wc -l < "$CURLLOG" | tr -d ' ')
img_before=$(wc -l < "$IMGLOG" | tr -d ' ')
out=$("$BOOTSTRAP" --apply)
[ "$(wc -l < "$PKGLOG" | tr -d ' ')" = "$pkg_before" ] || fail 'second apply reinstalled packages'
[ "$(wc -l < "$CURLLOG" | tr -d ' ')" = "$curl_before" ] || fail 'second apply redownloaded image'
[ "$(wc -l < "$IMGLOG" | tr -d ' ')" = "$img_before" ] || fail 'second apply recreated disk'
ok 'repeated apply is converged no-op'

out=$("$VERIFY" --check)
printf '%s\n' "$out" | grep -Fqx 'PASS vm-lab-prepared' || fail 'verify check did not pass'
ok 'prepared-state verify passes exact disk and image contract'

export MOCK_BAD_SHA=1
if "$BOOTSTRAP" --check >"$ROOT/out" 2>"$ROOT/err"; then fail 'bad image checksum accepted'; fi
grep -Fqx 'BLOCKED guest-image-conflict' "$ROOT/err" || fail 'bad checksum not bounded'
unset MOCK_BAD_SHA
ok 'checksum mismatch fails closed'

export MOCK_GUARD_RC=2
set +e
"$VERIFY" --admission >"$ROOT/out" 2>"$ROOT/err"
rc=$?
set -e
[ "$rc" -eq 2 ] || fail 'unknown admission exit code wrong'
grep -Fqx 'UNKNOWN resource-admission' "$ROOT/err" || fail 'unknown admission not preserved'
ok 'memory/resource uncertainty remains UNKNOWN'
export MOCK_GUARD_RC=1
set +e
"$VERIFY" --admission >"$ROOT/out" 2>"$ROOT/err"
rc=$?
set -e
[ "$rc" -eq 1 ] || fail 'below-floor admission exit code wrong'
grep -Fqx 'BLOCKED resource-floor' "$ROOT/err" || fail 'below-floor admission not bounded'
ok 'below-floor admission blocks'

export MOCK_GUARD_RC=0
out=$("$VERIFY" --admission)
printf '%s\n' "$out" | grep -Fqx 'PASS boot-admission' || fail 'pass admission missing'
ok 'boot admission passes only on full guard PASS'
unset MOCK_GUARD_RC

for f in "$BOOTSTRAP" "$VERIFY" "$0"; do sh -n "$f" || fail "syntax failed: $f"; done
grep -Fq 'virt,accel=tcg' "$HERE/README.md" || fail 'TCG boot contract missing'
grep -Fq -- '-cpu cortex-a57 -smp 2 -m 1024' "$HERE/README.md" || fail 'bounded cpu/ram contract missing'
grep -Fq -- '-nic none' "$HERE/README.md" || fail 'network-off contract missing'
grep -Fq 'if=pflash,format=raw,readonly=on' "$HERE/README.md" || fail 'read-only code pflash missing'
grep -Fq 'uefi-vars.fd' "$HERE/README.md" || fail 'writable vars pflash missing'
grep -Fq 'c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02' "$BOOTSTRAP" || fail 'pinned checksum missing'
ok 'fixed guest and bounded TCG boot shape are explicit'

! grep -Eiq -- '(/dev/kvm|accel=kvm|-[[:space:]]*(virtfs|fsdev)|hostfwd=|tap,|bridge,|--bind|shared-home|adb root|setenforce|bootloader)' "$BOOTSTRAP" "$VERIFY" || fail 'forbidden host/security surface present'
! grep -Eq -- 'MCL_VM_|eval[[:space:]]|sh[[:space:]]+-c' "$BOOTSTRAP" "$VERIFY" || fail 'arbitrary override surface present'
grep -Fq "IMAGE_URL='https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/alpine-virt-3.24.1-aarch64.iso'" "$BOOTSTRAP" || fail 'image URL is not literal-fixed'
ok 'KVM sharing bridge and arbitrary override surfaces are absent'

echo "1..$PASS"
