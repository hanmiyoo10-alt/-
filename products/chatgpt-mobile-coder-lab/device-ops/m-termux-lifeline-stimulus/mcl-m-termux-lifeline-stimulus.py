#!/usr/bin/env python3
"""Bounded Termux process-domain loss stimulus for physical M."""

from __future__ import annotations

from dataclasses import dataclass
import ctypes
import errno
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
from typing import Callable, Iterable, Mapping

SCHEMA = "mcl-m-termux-lifeline-stimulus.v1"
PM_PATH = "/data/data/com.termux/files/usr/bin/pm"
PROC_ROOT = Path("/proc")
PACKAGE_TIMEOUT_SECONDS = 3.0
EXPECTED_PACKAGES = frozenset({"com.termux", "com.termux.api", "com.termux.boot"})
PRESERVED_ROOT_NAMES = frozenset({"com.termux.api", "com.termux.boot"})
ROUTE_ENV = "DC_REMOTE_DEVICE"
ROUTE_VALUE = "true"
PACKAGE_RE = re.compile(r"^package:([A-Za-z0-9._]+) uid:([0-9]+)$")

Receipt = dict[str, str]


class StimulusBlocked(RuntimeError):
    pass


class StimulusUnknown(RuntimeError):
    pass


@dataclass(frozen=True)
class ProcessEntry:
    pid: int
    ppid: int
    argv0: str
    start_time_ticks: int = 1


@dataclass(frozen=True)
class StimulusPlan:
    entries: tuple[ProcessEntry, ...]
    preserved: frozenset[int]
    targets: frozenset[int]
    self_pid: int


def base_receipt(operation: str, **overrides: str) -> Receipt:
    receipt: Receipt = {
        "schema": SCHEMA,
        "operation": operation,
        "package_family": "unknown",
        "process_snapshot": "unknown",
        "preserved_domain": "unknown",
        "target_domain": "unknown",
        "route": "not_required",
        "effect": "none",
        "result": "unknown",
        "details": "withheld",
    }
    receipt.update(overrides)
    return receipt


def render_receipt(receipt: Mapping[str, str]) -> str:
    order = (
        "schema",
        "operation",
        "package_family",
        "process_snapshot",
        "preserved_domain",
        "target_domain",
        "route",
        "effect",
        "result",
        "details",
    )
    return "".join(f"{key}={receipt[key]}\n" for key in order)


def _run_package_query(uid: int):
    return subprocess.run(
        [PM_PATH, "list", "packages", "-U", "--uid", str(uid)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        shell=False,
        close_fds=True,
        timeout=PACKAGE_TIMEOUT_SECONDS,
        check=False,
    )


def query_package_family(
    uid: int,
    *,
    runner: Callable[[int], object] | None = None,
) -> frozenset[str]:
    invoke = _run_package_query if runner is None else runner
    try:
        result = invoke(uid)
    except (OSError, subprocess.SubprocessError) as exc:
        raise StimulusUnknown("package query failed") from exc

    if getattr(result, "returncode", None) != 0:
        raise StimulusUnknown("package query failed")

    rows: list[tuple[str, int]] = []
    for raw in str(getattr(result, "stdout", "")).splitlines():
        line = raw.strip()
        if not line:
            continue
        match = PACKAGE_RE.fullmatch(line)
        if match is None:
            raise StimulusUnknown("package output malformed")
        rows.append((match.group(1), int(match.group(2))))

    if len(rows) != len(EXPECTED_PACKAGES):
        raise StimulusBlocked("package family mismatch")
    if any(package_uid != uid for _, package_uid in rows):
        raise StimulusBlocked("package uid mismatch")
    names = frozenset(name for name, _ in rows)
    if names != EXPECTED_PACKAGES:
        raise StimulusBlocked("package family mismatch")
    return names


def _parse_stat(pid: int, raw: bytes) -> tuple[int, int]:
    prefix = f"{pid} (".encode("ascii")
    if not raw.startswith(prefix):
        raise StimulusUnknown("proc stat malformed")
    close = raw.rfind(b")")
    if close < len(prefix):
        raise StimulusUnknown("proc stat malformed")
    fields = raw[close + 1 :].strip().split()
    if len(fields) < 20:
        raise StimulusUnknown("proc stat malformed")
    try:
        ppid = int(fields[1])
        start_time_ticks = int(fields[19])
    except ValueError as exc:
        raise StimulusUnknown("proc stat malformed") from exc
    if ppid < 0 or start_time_ticks < 0:
        raise StimulusUnknown("proc stat malformed")
    return ppid, start_time_ticks


def _read_process_entry(proc_dir: Path, pid: int) -> ProcessEntry:
    try:
        raw_stat = (proc_dir / "stat").read_bytes()
        raw_cmdline = (proc_dir / "cmdline").read_bytes()
    except OSError as exc:
        raise StimulusUnknown("proc identity unreadable") from exc
    ppid, start_time_ticks = _parse_stat(pid, raw_stat)
    first = raw_cmdline.split(b"\0", 1)[0]
    if not first:
        raise StimulusUnknown("proc cmdline empty")
    try:
        argv0 = first.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise StimulusUnknown("proc cmdline invalid") from exc
    return ProcessEntry(
        pid=pid,
        ppid=ppid,
        argv0=argv0,
        start_time_ticks=start_time_ticks,
    )


def scan_uid_processes(proc_root: Path, uid: int) -> tuple[ProcessEntry, ...]:
    entries: list[ProcessEntry] = []
    try:
        children = list(proc_root.iterdir())
    except OSError as exc:
        raise StimulusUnknown("proc root unreadable") from exc

    for child in children:
        if not child.name.isdecimal():
            continue
        pid = int(child.name)
        try:
            owner_uid = child.stat().st_uid
        except FileNotFoundError:
            continue
        except OSError as exc:
            raise StimulusUnknown("proc ownership unreadable") from exc
        if owner_uid != uid:
            continue
        entries.append(_read_process_entry(child, pid))

    entries.sort(key=lambda item: item.pid)
    if not entries:
        raise StimulusBlocked("same uid process set empty")
    if len({item.pid for item in entries}) != len(entries):
        raise StimulusUnknown("duplicate process identity")
    return tuple(entries)


def classify_process_domain(
    entries: Iterable[ProcessEntry],
    *,
    self_pid: int,
) -> StimulusPlan:
    values = tuple(entries)
    by_pid = {item.pid: item for item in values}
    if len(by_pid) != len(values):
        raise StimulusUnknown("duplicate process identity")

    preserved = {
        item.pid for item in values
        if item.argv0 in PRESERVED_ROOT_NAMES
    }
    children: dict[int, list[int]] = {}
    for item in values:
        children.setdefault(item.ppid, []).append(item.pid)

    stack = list(preserved)
    while stack:
        parent = stack.pop()
        for child_pid in children.get(parent, ()):
            if child_pid not in preserved:
                preserved.add(child_pid)
                stack.append(child_pid)

    targets = set(by_pid) - preserved
    if self_pid not in by_pid:
        raise StimulusUnknown("stimulus process missing from snapshot")
    if self_pid not in targets:
        raise StimulusBlocked("stimulus process would be preserved")
    if not targets:
        raise StimulusBlocked("target domain empty")

    return StimulusPlan(
        entries=values,
        preserved=frozenset(preserved),
        targets=frozenset(targets),
        self_pid=self_pid,
    )


def build_plan(
    *,
    uid_getter: Callable[[], int] = os.getuid,
    pid_getter: Callable[[], int] = os.getpid,
    proc_root: Path = PROC_ROOT,
    package_runner: Callable[[int], object] | None = None,
) -> StimulusPlan:
    uid = uid_getter()
    query_package_family(uid, runner=package_runner)
    entries = scan_uid_processes(proc_root, uid)
    return classify_process_domain(entries, self_pid=pid_getter())


PIDFD_SEND_SIGNAL_NR = 424
PIDFD_OPEN_NR = 434


def _syscall_error(name: str):
    value = ctypes.get_errno()
    if value == errno.ESRCH:
        raise ProcessLookupError(value, name)
    if value in {errno.EPERM, errno.EACCES}:
        raise PermissionError(value, name)
    raise OSError(value, name)


def _pidfd_open(pid: int) -> int:
    helper = getattr(os, "pidfd_open", None)
    if callable(helper):
        return helper(pid, 0)
    libc = ctypes.CDLL(None, use_errno=True)
    result = libc.syscall(PIDFD_OPEN_NR, ctypes.c_int(pid), ctypes.c_uint(0))
    if result < 0:
        _syscall_error("pidfd_open failed")
    return int(result)


def _pidfd_send_signal(pidfd: int, sig: int) -> None:
    helper = getattr(signal, "pidfd_send_signal", None)
    if callable(helper):
        helper(pidfd, sig, None, 0)
        return
    libc = ctypes.CDLL(None, use_errno=True)
    result = libc.syscall(
        PIDFD_SEND_SIGNAL_NR,
        ctypes.c_int(pidfd),
        ctypes.c_int(sig),
        ctypes.c_void_p(),
        ctypes.c_uint(0),
    )
    if result < 0:
        _syscall_error("pidfd_send_signal failed")


def _revalidate_target(
    proc_root: Path,
    uid: int,
    expected: ProcessEntry,
) -> None:
    proc_dir = proc_root / str(expected.pid)
    try:
        owner_uid = proc_dir.stat().st_uid
    except FileNotFoundError as exc:
        raise StimulusUnknown("target disappeared before fire") from exc
    except OSError as exc:
        raise StimulusUnknown("target ownership unreadable") from exc
    if owner_uid != uid:
        raise StimulusUnknown("target ownership changed before fire")
    observed = _read_process_entry(proc_dir, expected.pid)
    if observed != expected:
        raise StimulusUnknown("target identity changed before fire")


def pin_signal_targets(
    plan: StimulusPlan,
    *,
    proc_root: Path = PROC_ROOT,
    uid_getter: Callable[[], int] = os.getuid,
    pidfd_open_fn: Callable[[int], int] = _pidfd_open,
    pidfd_signal_fn: Callable[[int, int], None] = _pidfd_send_signal,
    close_fn: Callable[[int], None] = os.close,
) -> dict[int, int]:
    expected = {entry.pid: entry for entry in plan.entries}
    opened: dict[int, int] = {}
    try:
        for pid in sorted(plan.targets):
            try:
                pidfd = pidfd_open_fn(pid)
            except ProcessLookupError as exc:
                raise StimulusUnknown("target disappeared before pin") from exc
            except PermissionError as exc:
                raise StimulusBlocked("target pidfd permission denied") from exc
            except OSError as exc:
                raise StimulusUnknown("target pidfd open failed") from exc
            opened[pid] = pidfd
            _revalidate_target(proc_root, uid_getter(), expected[pid])
            try:
                pidfd_signal_fn(pidfd, 0)
            except ProcessLookupError as exc:
                raise StimulusUnknown("target disappeared after pin") from exc
            except PermissionError as exc:
                raise StimulusBlocked("target signal permission denied") from exc
            except OSError as exc:
                raise StimulusUnknown("target signal preflight failed") from exc
        return opened
    except Exception:
        for pidfd in opened.values():
            try:
                close_fn(pidfd)
            except OSError:
                pass
        raise


def fire_plan(
    plan: StimulusPlan,
    pinned: Mapping[int, int],
    *,
    pidfd_signal_fn: Callable[[int, int], None] = _pidfd_send_signal,
) -> None:
    for pid in sorted(plan.targets - {plan.self_pid}):
        try:
            pidfd_signal_fn(pinned[pid], signal.SIGTERM)
        except ProcessLookupError:
            continue
        except (PermissionError, OSError) as exc:
            raise StimulusUnknown("peer signal failed") from exc

    try:
        pidfd_signal_fn(pinned[plan.self_pid], signal.SIGTERM)
    except ProcessLookupError:
        return
    except (PermissionError, OSError) as exc:
        raise StimulusUnknown("self signal failed") from exc


def check_receipt(
    *,
    plan_builder: Callable[[], StimulusPlan] = build_plan,
) -> Receipt:
    try:
        plan_builder()
        return base_receipt(
            "check",
            package_family="exact",
            process_snapshot="exact",
            preserved_domain="exact",
            target_domain="admitted",
            result="pass",
        )
    except StimulusBlocked:
        return base_receipt("check", result="blocked")
    except StimulusUnknown:
        return base_receipt("check", result="unknown")


def fire(
    *,
    environ: Mapping[str, str] = os.environ,
    plan_builder: Callable[[], StimulusPlan] = build_plan,
    pin_targets_fn: Callable[[StimulusPlan], Mapping[int, int]] | None = None,
    pidfd_signal_fn: Callable[[int, int], None] = _pidfd_send_signal,
    close_fn: Callable[[int], None] = os.close,
    out=None,
) -> int:
    stream = sys.stdout if out is None else out
    if environ.get(ROUTE_ENV) != ROUTE_VALUE:
        stream.write(render_receipt(base_receipt(
            "fire",
            route="blocked",
            result="blocked",
        )))
        stream.flush()
        return 3

    pinned: Mapping[int, int] = {}
    try:
        plan = plan_builder()
        pinned = (
            pin_signal_targets(plan)
            if pin_targets_fn is None
            else pin_targets_fn(plan)
        )
    except StimulusBlocked:
        stream.write(render_receipt(base_receipt(
            "fire",
            route="verified",
            result="blocked",
        )))
        stream.flush()
        return 3
    except StimulusUnknown:
        stream.write(render_receipt(base_receipt(
            "fire",
            route="verified",
            result="unknown",
        )))
        stream.flush()
        return 4

    stream.write(render_receipt(base_receipt(
        "fire",
        package_family="exact",
        process_snapshot="exact",
        preserved_domain="exact",
        target_domain="admitted",
        route="verified",
        effect="external_proof_required",
        result="external_proof_required",
    )))
    stream.flush()

    try:
        fire_plan(plan, pinned, pidfd_signal_fn=pidfd_signal_fn)
    except StimulusUnknown:
        return 4
    finally:
        for pidfd in pinned.values():
            try:
                close_fn(pidfd)
            except OSError:
                pass
    return 5


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args == ["check"]:
        receipt = check_receipt()
        sys.stdout.write(render_receipt(receipt))
        if receipt["result"] == "pass":
            return 0
        if receipt["result"] == "blocked":
            return 3
        return 4
    if args == ["fire"]:
        return fire()

    operation = args[0] if len(args) == 1 and args[0] in {"check", "fire"} else "invalid"
    sys.stdout.write(render_receipt(base_receipt(operation, result="blocked")))
    return 64


if __name__ == "__main__":
    raise SystemExit(main())
