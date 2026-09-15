#!/usr/bin/env python3
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

GIB = 1024 ** 3
GUEST_BYTES = GIB
RESERVE_BYTES = GIB
PRE_HEADROOM_BYTES = 3 * GIB
POST_HEADROOM_BYTES = GIB
QMP_TIMEOUT_SECONDS = 5.0
GUEST_MEMORY_ID = "mcl-guest-memory"
RESERVE_MEMORY_ID = "mcl-admission-reserve"


class AdmissionError(RuntimeError):
    def __init__(self, reason):
        super().__init__(reason)
        self.reason = reason


def read_mem_available_bytes(path="/proc/meminfo"):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("MemAvailable:"):
                    parts = line.split()
                    if len(parts) != 3 or parts[2] != "kB":
                        break
                    value = int(parts[1])
                    if value > 0:
                        return value * 1024
    except (OSError, ValueError):
        pass
    raise AdmissionError("memavailable-unavailable")

def read_cgroup_v2_path(path):
    try:
        lines = Path(path).read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise AdmissionError("cgroup-unavailable") from exc
    matches = []
    for line in lines:
        parts = line.split(":", 2)
        if len(parts) == 3 and parts[0] == "0" and parts[1] == "":
            matches.append(parts[2])
    if len(matches) != 1 or not matches[0].startswith("/"):
        raise AdmissionError("cgroup-unavailable")
    return matches[0]


def build_qemu_command(home, prefix, qmp_socket):
    data_root = os.path.join(home, ".local", "share", "mcl-vm-lab")
    state_root = os.path.join(home, ".local", "state", "mcl-vm-lab")
    firmware = os.path.join(prefix, "share", "qemu", "edk2-aarch64-code.fd")
    disk = os.path.join(data_root, "mcl-vm-lab.qcow2")
    image = os.path.join(data_root, "alpine-virt-3.24.1-aarch64.iso")
    vars_path = os.path.join(state_root, "uefi-vars.fd")
    return [
        "qemu-system-aarch64",
        "-machine", f"virt,accel=tcg,memory-backend={GUEST_MEMORY_ID}",
        "-cpu", "cortex-a57", "-smp", "2", "-m", "1024",
        "-object", f"memory-backend-ram,id={GUEST_MEMORY_ID},size=1G,prealloc=on",
        "-object", f"memory-backend-ram,id={RESERVE_MEMORY_ID},size=1G,prealloc=on",
        "-S",
        "-qmp", f"unix:{qmp_socket},server=on,wait=off",
        "-display", "none", "-monitor", "none", "-serial", "stdio", "-nic", "none",        "-drive", f"if=pflash,format=raw,readonly=on,file={firmware}",
        "-drive", f"if=pflash,format=raw,file={vars_path}",
        "-drive", f"if=none,format=qcow2,file={disk},id=rootdisk",
        "-device", "virtio-blk-device,drive=rootdisk",
        "-device", "virtio-scsi-device,id=scsi",
        "-drive", f"if=none,format=raw,readonly=on,file={image},id=install",
        "-device", "scsi-cd,drive=install",
        "-boot", "d",
    ]


class QmpClient:
    def __init__(self, sock):
        self.sock = sock
        self.stream = sock.makefile("rwb", buffering=0)

    def _read(self, reason):
        try:
            line = self.stream.readline()
            if not line:
                raise AdmissionError(reason)
            payload = json.loads(line.decode("utf-8"))
            if not isinstance(payload, dict):
                raise AdmissionError(reason)
            return payload
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise AdmissionError(reason) from exc

    def _command(self, name, arguments=None, reason="qmp-command-failed"):
        request = {"execute": name}
        if arguments is not None:
            request["arguments"] = arguments
        wire = (json.dumps(request, separators=(",", ":")) + "\r\n").encode("utf-8")
        try:
            self.stream.write(wire)
        except OSError as exc:
            raise AdmissionError(reason) from exc
        for _ in range(32):
            reply = self._read(reason)
            if "event" in reply:
                continue
            if "error" in reply:
                raise AdmissionError(reason)
            if "return" in reply:
                return reply["return"]
        raise AdmissionError(reason)

    def negotiate(self):
        greeting = self._read("qmp-malformed")
        if not isinstance(greeting.get("QMP"), dict):
            raise AdmissionError("qmp-malformed")
        self._command("qmp_capabilities", reason="qmp-capabilities")

    def status(self):
        result = self._command("query-status", reason="qmp-status")
        if not isinstance(result, dict):
            raise AdmissionError("qmp-status")
        return result.get("status")

    def delete_reserve(self):
        self._command(
            "object-del",
            {"id": RESERVE_MEMORY_ID},
            reason="reserve-delete-failed",
        )

    def cont(self):
        self._command("cont", reason="cont-failed")

    def quit(self):
        try:
            self._command("quit", reason="qmp-quit-failed")
        except AdmissionError:
            pass

    def close(self):
        try:
            self.stream.close()
        except OSError:
            pass
        try:
            self.sock.close()
        except OSError:
            pass

class RealRuntime:
    def __init__(self):
        self.home = os.environ.get("HOME", "")
        self.prefix = os.environ.get("PREFIX", "")
        self.tmpdir = os.environ.get("TMPDIR", "")
        self.control_dir = None
        self.qmp_path = None
        if not self.home or not os.path.isabs(self.home):
            raise AdmissionError("home-unavailable")
        if not self.prefix or not os.path.isabs(self.prefix):
            raise AdmissionError("prefix-unavailable")
        if not self.tmpdir or not os.path.isabs(self.tmpdir):
            raise AdmissionError("tmpdir-unavailable")
        if os.path.islink(self.tmpdir) or not os.path.isdir(self.tmpdir):
            raise AdmissionError("tmpdir-unavailable")
        if not os.access(self.tmpdir, os.W_OK | os.X_OK):
            raise AdmissionError("tmpdir-unavailable")
        prefix_real = os.path.realpath(self.prefix)
        tmpdir_real = os.path.realpath(self.tmpdir)
        try:
            if os.path.commonpath([prefix_real, tmpdir_real]) != prefix_real:
                raise AdmissionError("tmpdir-unavailable")
        except ValueError as exc:
            raise AdmissionError("tmpdir-unavailable") from exc

    def mem_available(self):
        return read_mem_available_bytes()

    def self_cgroup(self):
        return read_cgroup_v2_path("/proc/self/cgroup")

    def process_cgroup(self, pid):
        return read_cgroup_v2_path(f"/proc/{pid}/cgroup")

    def prepare_control(self):
        try:
            self.control_dir = tempfile.mkdtemp(prefix="mcl-vm-admission.", dir=self.tmpdir)
        except OSError as exc:
            raise AdmissionError("control-state-unavailable") from exc
        self.qmp_path = os.path.join(self.control_dir, "qmp.sock")
        return self.qmp_path

    def start_qemu(self):
        command = build_qemu_command(self.home, self.prefix, self.qmp_path)
        try:
            return subprocess.Popen(command)
        except OSError as exc:
            raise AdmissionError("qemu-start-failed") from exc
    def connect_qmp(self, proc):
        deadline = time.monotonic() + QMP_TIMEOUT_SECONDS
        last_error = None
        while time.monotonic() < deadline:
            if proc.poll() is not None:
                raise AdmissionError("qemu-start-failed")
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(1.0)
            try:
                sock.connect(self.qmp_path)
                return QmpClient(sock)
            except OSError as exc:
                last_error = exc
                sock.close()
                time.sleep(0.05)
        raise AdmissionError("qmp-unavailable") from last_error

    def invalidate_control(self):
        if self.qmp_path and os.path.lexists(self.qmp_path):
            try:
                os.unlink(self.qmp_path)
            except OSError as exc:
                raise AdmissionError("control-cleanup-failed") from exc
        if self.control_dir and os.path.isdir(self.control_dir):
            try:
                os.rmdir(self.control_dir)
            except OSError as exc:
                raise AdmissionError("control-cleanup-failed") from exc
        self.qmp_path = None
        self.control_dir = None

    def cleanup_control_best_effort(self):
        if self.qmp_path and os.path.lexists(self.qmp_path):
            try:
                os.unlink(self.qmp_path)
            except OSError:
                pass
        if self.control_dir and os.path.isdir(self.control_dir):
            try:
                os.rmdir(self.control_dir)
            except OSError:
                pass
        self.qmp_path = None
        self.control_dir = None

    def abort(self, proc, qmp):
        if qmp is not None:
            qmp.quit()
            qmp.close()
        if proc is not None and proc.poll() is None:
            try:
                proc.wait(timeout=1.0)
            except subprocess.TimeoutExpired:
                proc.terminate()
                try:
                    proc.wait(timeout=1.0)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait(timeout=1.0)
        self.cleanup_control_best_effort()

def run_admission(runtime):
    if runtime.mem_available() < PRE_HEADROOM_BYTES:
        raise AdmissionError("pre-headroom")

    proc = None
    qmp = None
    continued = False
    runtime.prepare_control()
    try:
        proc = runtime.start_qemu()
        qmp = runtime.connect_qmp(proc)
        qmp.negotiate()
        if qmp.status() != "prelaunch":
            raise AdmissionError("qmp-not-prelaunch")

        launcher_cgroup = runtime.self_cgroup()
        child_cgroup = runtime.process_cgroup(proc.pid)
        if launcher_cgroup != child_cgroup:
            raise AdmissionError("cgroup-mismatch")

        if runtime.mem_available() < POST_HEADROOM_BYTES:
            raise AdmissionError("post-headroom")

        qmp.delete_reserve()
        runtime.invalidate_control()
        qmp.cont()
        continued = True
        qmp.close()
        qmp = None
        return proc
    except AdmissionError:
        if not continued:
            runtime.abort(proc, qmp)
        raise
    except Exception as exc:
        if not continued:
            runtime.abort(proc, qmp)
        raise AdmissionError("controller-failure") from exc


def main():
    try:
        runtime = RealRuntime()
        proc = run_admission(runtime)
    except AdmissionError as exc:
        print(f"BLOCKED live-admission:{exc.reason}", file=sys.stderr)
        return 1

    print("PASS live-admission", flush=True)
    try:
        return proc.wait()
    except KeyboardInterrupt:
        if proc.poll() is None:
            proc.terminate()
            try:
                return proc.wait(timeout=2.0)
            except subprocess.TimeoutExpired:
                proc.kill()
                return proc.wait()
        return proc.returncode or 0


if __name__ == "__main__":
    raise SystemExit(main())
