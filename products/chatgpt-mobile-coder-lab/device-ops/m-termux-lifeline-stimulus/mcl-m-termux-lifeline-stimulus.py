#!/usr/bin/env python3
"""Bounded Termux process-domain loss stimulus for physical M."""

from __future__ import annotations

from dataclasses import dataclass
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


def _parse_ppid(pid: int, text: str) -> int:
    prefix = f"{pid} ("
    if not text.startswith(prefix):
        raise StimulusUnknown("proc stat malformed")
    close = text.rfind(")")
    if close < len(prefix):
        raise StimulusUnknown("proc stat malformed")
    fields = text[close + 1 :].strip().split()
    if len(fields) < 2:
        raise StimulusUnknown("proc stat malformed")
    try:
        ppid = int(fields[1])
    except ValueError as exc:
        raise StimulusUnknown("proc stat malformed") from exc
    if ppid < 0:
        raise StimulusUnknown("proc stat malformed")
    return ppid


def _read_process_entry(proc_dir: Path, pid: int) -> ProcessEntry:
    try:
        stat_text = (proc_dir / "stat").read_text(encoding="utf-8")
        raw_cmdline = (proc_dir / "cmdline").read_bytes()
    except OSError as exc:
        raise StimulusUnknown("proc identity unreadable") from exc
    ppid = _parse_ppid(pid, stat_text)
    first = raw_cmdline.split(b"\0", 1)[0]
    if not first:
        raise StimulusUnknown("proc cmdline empty")
    try:
        argv0 = first.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise StimulusUnknown("proc cmdline invalid") from exc
    return ProcessEntry(pid=pid, ppid=ppid, argv0=argv0)


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
        except OSError:
            continue
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


def check_signal_capability(
    plan: StimulusPlan,
    *,
    kill_fn: Callable[[int, int], None] = os.kill,
) -> None:
    for pid in sorted(plan.targets):
        try:
            kill_fn(pid, 0)
        except ProcessLookupError as exc:
            raise StimulusUnknown("target disappeared before fire") from exc
        except (PermissionError, OSError) as exc:
            raise StimulusBlocked("target signal permission denied") from exc


def fire_plan(
    plan: StimulusPlan,
    *,
    kill_fn: Callable[[int, int], None] = os.kill,
) -> None:
    for pid in sorted(plan.targets - {plan.self_pid}):
        try:
            kill_fn(pid, signal.SIGTERM)
        except ProcessLookupError:
            continue
        except (PermissionError, OSError) as exc:
            raise StimulusUnknown("peer signal failed") from exc

    try:
        kill_fn(plan.self_pid, signal.SIGTERM)
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
    kill_fn: Callable[[int, int], None] = os.kill,
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

    try:
        plan = plan_builder()
        check_signal_capability(plan, kill_fn=kill_fn)
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
        fire_plan(plan, kill_fn=kill_fn)
    except StimulusUnknown:
        return 4
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
