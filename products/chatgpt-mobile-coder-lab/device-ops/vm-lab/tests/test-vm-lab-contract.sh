#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BOOTSTRAP="$HERE/bootstrap.sh"
VERIFY="$HERE/verify.sh"
VMCTL="$HERE/mcl-vmctl"
CONTROLLER="$HERE/admission-controller.py"
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
  GUARDLOG="$ROOT/guard.log"
  CONTROLLOG="$ROOT/controller.log"
  mkdir -p "$HOME" "$PREFIX/bin" "$PREFIX/share/qemu" "$BIN" "$MOCK_STATE"
  : > "$PKGLOG"; : > "$CURLLOG"; : > "$IMGLOG"; : > "$GUARDLOG"; : > "$CONTROLLOG"
  export ROOT HOME PREFIX BIN MOCK_STATE PKGLOG CURLLOG IMGLOG GUARDLOG CONTROLLOG REAL_PYTHON
  unset MOCK_BAD_SHA MOCK_GUARD_RC MOCK_CONTROLLER_RC
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
  */tools/repo-env/resource-guard/guard.py)
    printf '%s\n' "$*" >> "$GUARDLOG"
    exit "${MOCK_GUARD_RC:-0}"
    ;;
  */device-ops/vm-lab/admission-controller.py)
    printf '%s\n' "$*" >> "$CONTROLLOG"
    if [ "${MOCK_CONTROLLER_RC+x}" = x ]; then exit "$MOCK_CONTROLLER_RC"; fi
    exec "$REAL_PYTHON" "$@"
    ;;
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
if "$VMCTL" >/dev/null 2>&1; then fail 'no-arg vmctl accepted'; fi
if "$VMCTL" stop >/dev/null 2>&1; then fail 'unknown vmctl action accepted'; fi
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

: > "$GUARDLOG"
export MOCK_GUARD_RC=0
out=$("$VERIFY" --live-preflight)
printf '%s\n' "$out" | grep -Fqx 'PASS live-start-preflight' || fail 'live preflight did not pass'
grep -Fq -- '--min-free-disk-bytes 12884901888' "$GUARDLOG" || fail 'live preflight disk floor missing'
grep -Fq -- '--min-free-inodes 10000' "$GUARDLOG" || fail 'live preflight inode floor missing'
! grep -Fq -- '--min-available-memory-bytes' "$GUARDLOG" || fail 'live preflight weakened static memory semantics'
ok 'live preflight reuses disk and inode guard without memory reinterpretation'

: > "$CONTROLLOG"
export MOCK_CONTROLLER_RC=0
"$VMCTL" start >/dev/null
[ "$(wc -l < "$CONTROLLOG" | tr -d ' ')" = 1 ] || fail 'vmctl controller invocation count wrong'
grep -Fqx "$CONTROLLER" "$CONTROLLOG" || fail 'vmctl did not invoke fixed controller path only'
unset MOCK_CONTROLLER_RC
ok 'vmctl start delegates only to fixed live controller after preflight'

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
grep -Fq -- '-device virtio-scsi-device,id=scsi' "$HERE/README.md" || fail 'virtio-scsi device missing'
grep -Fq 'c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02' "$BOOTSTRAP" || fail 'pinned checksum missing'
ok 'fixed guest and bounded TCG boot shape are explicit'

! grep -Eiq -- '(/dev/kvm|accel=kvm|-[[:space:]]*(virtfs|fsdev)|hostfwd=|tap,|bridge,|--bind|shared-home|adb root|setenforce|bootloader)' "$BOOTSTRAP" "$VERIFY" || fail 'forbidden host/security surface present'
! grep -Eq -- 'MCL_VM_|eval[[:space:]]|sh[[:space:]]+-c' "$BOOTSTRAP" "$VERIFY" || fail 'arbitrary override surface present'
grep -Fq "IMAGE_URL='https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/alpine-virt-3.24.1-aarch64.iso'" "$BOOTSTRAP" || fail 'image URL is not literal-fixed'
ok 'KVM sharing bridge and arbitrary override surfaces are absent'


"$REAL_PYTHON" - "$CONTROLLER" <<'PY'
import importlib.util
import os
import sys
import tempfile

path = sys.argv[1]
spec = importlib.util.spec_from_file_location("mcl_vm_admission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

assert mod.GUEST_BYTES == 1024 ** 3
assert mod.RESERVE_BYTES == 1024 ** 3
assert mod.PRE_HEADROOM_BYTES == 3 * 1024 ** 3
assert mod.POST_HEADROOM_BYTES == 1024 ** 3

cmd = mod.build_qemu_command("/home/test", "/prefix", "/tmp/qmp.sock")
joined = " ".join(cmd)
assert "virt,accel=tcg,memory-backend=mcl-guest-memory" in joined
assert "memory-backend-ram,id=mcl-guest-memory,size=1G,prealloc=on" in joined
assert "memory-backend-ram,id=mcl-admission-reserve,size=1G,prealloc=on" in joined
assert " -S " in f" {joined} "
assert "-nic none" in joined
assert "-smp 2 -m 1024" in joined


class FakeProc:
    pid = 4242


class FakeQmp:
    def __init__(self, runtime, status="prelaunch", negotiate_reason=None, delete_reason=None):
        self.runtime = runtime
        self.status_value = status
        self.negotiate_reason = negotiate_reason
        self.delete_reason = delete_reason
        self.actions = []

    def negotiate(self):
        self.actions.append("negotiate")
        if self.negotiate_reason:
            raise mod.AdmissionError(self.negotiate_reason)

    def status(self):
        self.actions.append("status")
        return self.status_value

    def delete_reserve(self):
        self.actions.append("delete")
        if self.delete_reason:
            raise mod.AdmissionError(self.delete_reason)

    def cont(self):
        assert self.runtime.invalidated
        self.actions.append("cont")

    def quit(self):
        self.actions.append("quit")

    def close(self):
        self.actions.append("close")


class FakeRuntime:
    def __init__(self, mem_values, status="prelaunch", connect_reason=None,
                 negotiate_reason=None, delete_reason=None, child_cgroup="/same",
                 child_cgroup_reason=None):
        self.mem_values = list(mem_values)
        self.status = status
        self.connect_reason = connect_reason
        self.child_cgroup = child_cgroup
        self.child_cgroup_reason = child_cgroup_reason
        self.proc = FakeProc()
        self.prepared = False
        self.started = False
        self.invalidated = False
        self.aborted = False
        self.seen_pid = None
        self.qmp = FakeQmp(self, status, negotiate_reason, delete_reason)

    def mem_available(self):
        return self.mem_values.pop(0)

    def prepare_control(self):
        self.prepared = True
        return "/tmp/fake-qmp"

    def start_qemu(self):
        self.started = True
        return self.proc

    def connect_qmp(self, proc):
        assert proc is self.proc
        if self.connect_reason:
            raise mod.AdmissionError(self.connect_reason)
        return self.qmp

    def self_cgroup(self):
        return "/same"

    def process_cgroup(self, pid):
        self.seen_pid = pid
        if self.child_cgroup_reason:
            raise mod.AdmissionError(self.child_cgroup_reason)
        return self.child_cgroup

    def invalidate_control(self):
        self.invalidated = True

    def abort(self, proc, qmp):
        self.aborted = True
        self.invalidated = True


def expect_block(reason, runtime):
    try:
        mod.run_admission(runtime)
    except mod.AdmissionError as exc:
        assert exc.reason == reason, (exc.reason, reason)
    else:
        raise AssertionError(f"expected {reason}")
    if runtime.started:
        assert runtime.aborted

pre = FakeRuntime([mod.PRE_HEADROOM_BYTES - 1])
expect_block("pre-headroom", pre)
assert not pre.prepared and not pre.started

expect_block(
    "qmp-unavailable",
    FakeRuntime([mod.PRE_HEADROOM_BYTES], connect_reason="qmp-unavailable"),
)
expect_block(
    "qmp-malformed",
    FakeRuntime([mod.PRE_HEADROOM_BYTES], negotiate_reason="qmp-malformed"),
)
expect_block(
    "qmp-not-prelaunch",
    FakeRuntime([mod.PRE_HEADROOM_BYTES], status="running"),
)
expect_block(
    "cgroup-unavailable",
    FakeRuntime(
        [mod.PRE_HEADROOM_BYTES], child_cgroup_reason="cgroup-unavailable"
    ),
)
expect_block(
    "cgroup-mismatch",
    FakeRuntime([mod.PRE_HEADROOM_BYTES], child_cgroup="/different"),
)
expect_block(
    "post-headroom",
    FakeRuntime([mod.PRE_HEADROOM_BYTES, mod.POST_HEADROOM_BYTES - 1]),
)
expect_block(
    "reserve-delete-failed",
    FakeRuntime(
        [mod.PRE_HEADROOM_BYTES, mod.POST_HEADROOM_BYTES],
        delete_reason="reserve-delete-failed",
    ),
)

success = FakeRuntime([mod.PRE_HEADROOM_BYTES, mod.POST_HEADROOM_BYTES])
proc = mod.run_admission(success)
assert proc is success.proc
assert success.seen_pid == success.proc.pid
assert success.invalidated and not success.aborted
assert success.qmp.actions == ["negotiate", "status", "delete", "cont", "close"]

old_env = {key: os.environ.get(key) for key in ("HOME", "PREFIX", "TMPDIR")}
try:
    os.environ["HOME"] = "/home/test"
    os.environ["PREFIX"] = "/prefix"
    os.environ["TMPDIR"] = ""
    try:
        mod.RealRuntime()
    except mod.AdmissionError as exc:
        assert exc.reason == "tmpdir-unavailable"
    else:
        raise AssertionError("empty TMPDIR accepted")

    with tempfile.TemporaryDirectory() as outside:
        os.environ["TMPDIR"] = outside
        try:
            mod.RealRuntime()
        except mod.AdmissionError as exc:
            assert exc.reason == "tmpdir-unavailable"
        else:
            raise AssertionError("non-prefix TMPDIR accepted")

    with tempfile.TemporaryDirectory() as prefix:
        tmpdir = os.path.join(prefix, "tmp")
        os.mkdir(tmpdir)
        os.environ["PREFIX"] = prefix
        os.environ["TMPDIR"] = tmpdir
        runtime = mod.RealRuntime()
        qmp_path = runtime.prepare_control()
        assert os.path.commonpath([tmpdir, qmp_path]) == tmpdir
        runtime.cleanup_control_best_effort()
        assert not os.path.exists(qmp_path)
finally:
    for key, value in old_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
PY
ok 'live admission controller fails closed and continues only same prelaunch QEMU transaction'

python3 -m py_compile "$CONTROLLER" || fail 'controller compile failed'
for f in "$BOOTSTRAP" "$VERIFY" "$VMCTL" "$0"; do sh -n "$f" || fail "syntax failed: $f"; done
ok 'shell and controller syntax pass'

grep -Fq -- '-S -qmp unix:<private-TMPDIR-socket>,server=on,wait=off' "$HERE/README.md" || fail 'prelaunch QMP contract missing'
grep -Fq 'PRE_HEADROOM_BYTES = 3 * GIB' "$CONTROLLER" || fail '3 GiB pre-headroom missing'
grep -Fq 'POST_HEADROOM_BYTES = GIB' "$CONTROLLER" || fail '1 GiB post-headroom missing'
grep -Fq 'RESERVE_MEMORY_ID = "mcl-admission-reserve"' "$CONTROLLER" || fail 'reserve identity missing'
grep -Fq 'qmp.delete_reserve()' "$CONTROLLER" || fail 'reserve deletion missing'
grep -Fq 'qmp.cont()' "$CONTROLLER" || fail 'QMP cont missing'
ok 'fixed live allocation envelope and same-process transition are explicit'

! grep -Eiq -- '(/dev/kvm|accel=kvm|-[[:space:]]*(virtfs|fsdev)|hostfwd=|tap,|bridge,|adb root|setenforce|bootloader)' "$VMCTL" "$CONTROLLER" || fail 'live controller exposes forbidden host/security surface'
! grep -Eq -- 'eval[[:space:]]|sh[[:space:]]+-c|MCL_VM_' "$VMCTL" "$CONTROLLER" || fail 'live controller exposes arbitrary override surface'
ok 'live controller has no KVM sharing security bypass or arbitrary override surface'

echo "1..$PASS"
