#!/data/data/com.termux/files/usr/bin/python
"""Fixed M Termux:API JobScheduler lifeline owner."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
from typing import Callable

SCHEMA = "mcl-m-termux-job-lifeline.v1"
JOB_RECEIPT_SCHEMA = "mcl-m-termux-job-lifeline-job.v1"
OWNERSHIP_MARKER = "mcl-m-termux-job-lifeline-owner:v1"
RUN_MARKER = "mcl-m-termux-job-lifeline-run:v1"

JOB_ID = 2756
PERIOD_MS = 900000
NETWORK = "none"
BATTERY_NOT_LOW = "false"
STORAGE_NOT_LOW = "false"
CHARGING = "false"
PERSISTED = "true"

TERMUX_HOME = Path("/data/data/com.termux/files/home")
TERMUX_PREFIX = Path("/data/data/com.termux/files/usr")
INSTALL_DIR = TERMUX_HOME / ".local/lib/mcl-m-termux-job-lifeline"
INSTALLED_CONTROLLER = INSTALL_DIR / "mcl-m-termux-job-lifeline.py"
INSTALLED_RUN = INSTALL_DIR / "mcl-m-termux-job-lifeline-run"
STATE_DIR = TERMUX_HOME / ".local/state/mcl-m-termux-job-lifeline"
JOB_RECEIPT = STATE_DIR / "job.receipt"
SCHEDULER = TERMUX_PREFIX / "bin/termux-job-scheduler"
PYTHON = TERMUX_PREFIX / "bin/python"
HEARTBEAT = TERMUX_HOME / ".local/lib/mcl-m-termux-lifeline/heartbeat-client.py"
RECOVERY = TERMUX_HOME / ".local/bin/mcl-m-termux-lifeline-recover"

PENDING_RE = re.compile(r"^Pending Job (?P<job_id>-?\d+): (?P<path>\S+)(?:\s{4}(?P<desc>.*))?$")


class OwnerBlocked(RuntimeError):
    pass


@dataclass(frozen=True)
class Layout:
    install_dir: Path = INSTALL_DIR
    installed_controller: Path = INSTALLED_CONTROLLER
    installed_run: Path = INSTALLED_RUN
    state_dir: Path = STATE_DIR
    job_receipt: Path = JOB_RECEIPT
    scheduler: Path = SCHEDULER
    python: Path = PYTHON
    heartbeat: Path = HEARTBEAT
    recovery: Path = RECOVERY


DEFAULT_LAYOUT = Layout()
Runner = Callable[..., subprocess.CompletedProcess]


def _is_regular(path: Path) -> bool:
    try:
        st = path.lstat()
    except OSError:
        return False
    return stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)


def _read_bytes(path: Path) -> bytes:
    if not _is_regular(path):
        raise OwnerBlocked("regular file required")
    try:
        return path.read_bytes()
    except OSError as exc:
        raise OwnerBlocked("read failed") from exc


def _owned_bytes(path: Path, marker: str) -> bool:
    if not _is_regular(path):
        return False
    try:
        return marker in path.read_text(encoding="utf-8")
    except (OSError, UnicodeError):
        return False


def source_paths() -> tuple[Path, Path]:
    controller = Path(__file__).resolve()
    return controller, controller.with_name("mcl-m-termux-job-lifeline-run")


def _target_state(destination: Path, source: Path, marker: str) -> str:
    if not destination.exists() and not destination.is_symlink():
        return "missing"
    if not _is_regular(destination):
        return "unmanaged"
    try:
        if destination.read_bytes() == _read_bytes(source) and stat.S_IMODE(destination.stat().st_mode) == 0o700:
            return "managed"
    except OSError:
        return "unmanaged"
    return "owned_drift" if _owned_bytes(destination, marker) else "unmanaged"


def install_state(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    source_controller: Path | None = None,
    source_run: Path | None = None,
) -> str:
    src_controller, src_run = source_paths()
    if source_controller is not None:
        src_controller = source_controller
    if source_run is not None:
        src_run = source_run
    if not _is_regular(src_controller) or not _is_regular(src_run):
        return "source_invalid"

    controller_state = _target_state(
        layout.installed_controller, src_controller, OWNERSHIP_MARKER
    )
    run_state = _target_state(layout.installed_run, src_run, RUN_MARKER)
    states = {controller_state, run_state}
    if states == {"missing"}:
        return "missing"
    if states == {"managed"}:
        return "managed"
    if "unmanaged" in states:
        return "drift"
    return "drift"


def _write_managed(source: Path, destination: Path) -> None:
    source_bytes = _read_bytes(source)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{destination.name}.", dir=str(destination.parent))
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(source_bytes)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, 0o700)
        os.replace(tmp, destination)
    finally:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass


def install(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    source_controller: Path | None = None,
    source_run: Path | None = None,
) -> str:
    src_controller, src_run = source_paths()
    if source_controller is not None:
        src_controller = source_controller
    if source_run is not None:
        src_run = source_run
    _read_bytes(src_controller)
    _read_bytes(src_run)

    if layout.install_dir.exists() or layout.install_dir.is_symlink():
        if layout.install_dir.is_symlink() or not layout.install_dir.is_dir():
            raise OwnerBlocked("install dir conflict")

    controller_state = _target_state(
        layout.installed_controller, src_controller, OWNERSHIP_MARKER
    )
    run_state = _target_state(layout.installed_run, src_run, RUN_MARKER)
    if "unmanaged" in {controller_state, run_state}:
        raise OwnerBlocked("unmanaged installed target")

    if not layout.install_dir.exists():
        layout.install_dir.mkdir(parents=True, mode=0o700)
    os.chmod(layout.install_dir, 0o700)

    if controller_state != "managed":
        _write_managed(src_controller, layout.installed_controller)
    if run_state != "managed":
        _write_managed(src_run, layout.installed_run)

    state = install_state(
        layout, source_controller=src_controller, source_run=src_run
    )
    if state != "managed":
        raise OwnerBlocked("install did not converge")
    return state


def schedule_argv(layout: Layout = DEFAULT_LAYOUT) -> list[str]:
    return [
        str(layout.scheduler),
        "--script",
        str(layout.installed_run),
        "--job-id",
        str(JOB_ID),
        "--period-ms",
        str(PERIOD_MS),
        "--network",
        NETWORK,
        "--battery-not-low",
        BATTERY_NOT_LOW,
        "--storage-not-low",
        STORAGE_NOT_LOW,
        "--charging",
        CHARGING,
        "--persisted",
        PERSISTED,
    ]


def pending_argv(layout: Layout = DEFAULT_LAYOUT) -> list[str]:
    return [str(layout.scheduler), "--pending"]


def cancel_argv(layout: Layout = DEFAULT_LAYOUT) -> list[str]:
    return [str(layout.scheduler), "--cancel", "--job-id", str(JOB_ID)]


def _run(
    argv: list[str],
    *,
    runner: Runner = subprocess.run,
    timeout: float = 5.0,
    capture: bool = True,
) -> subprocess.CompletedProcess:
    kwargs = {
        "stdin": subprocess.DEVNULL,
        "timeout": timeout,
        "check": False,
        "text": True,
    }
    if capture:
        kwargs.update({"stdout": subprocess.PIPE, "stderr": subprocess.PIPE})
    else:
        kwargs.update({"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL})
    try:
        return runner(argv, **kwargs)
    except (OSError, subprocess.SubprocessError) as exc:
        raise OwnerBlocked("command execution failed") from exc


def parse_pending(text: str) -> list[tuple[int, str, str]]:
    value = text.strip()
    if value == "No jobs found":
        return []
    if not value:
        raise OwnerBlocked("pending output empty")
    jobs: list[tuple[int, str, str]] = []
    for line in value.splitlines():
        match = PENDING_RE.fullmatch(line)
        if match is None:
            raise OwnerBlocked("pending output malformed")
        jobs.append(
            (
                int(match.group("job_id")),
                match.group("path"),
                match.group("desc") or "",
            )
        )
    return jobs


def _query_jobs(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
) -> list[tuple[int, str, str]]:
    proc = _run(pending_argv(layout), runner=runner)
    if proc.returncode != 0 or proc.stderr:
        raise OwnerBlocked("pending read failed")
    return parse_pending(proc.stdout)


def schedule_state(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
) -> str:
    target = [job for job in _query_jobs(layout, runner=runner) if job[0] == JOB_ID]
    if not target:
        return "absent"
    if len(target) != 1:
        return "drift"
    _job_id, path, desc = target[0]
    if path != str(layout.installed_run):
        return "collision"
    if f"(periodic: {PERIOD_MS}ms)" not in desc or "(persisted)" not in desc:
        return "drift"
    forbidden = ("(while charging)", "(battery not low)", "(storage not low)")
    if any(token in desc for token in forbidden):
        return "drift"
    return "managed"


def last_result_state(layout: Layout = DEFAULT_LAYOUT) -> str:
    path = layout.job_receipt
    if not path.exists():
        return "missing"
    if not _is_regular(path):
        return "unknown"
    try:
        values = {}
        for raw in path.read_text(encoding="utf-8").splitlines():
            if "=" not in raw:
                return "unknown"
            key, value = raw.split("=", 1)
            values[key] = value
    except (OSError, UnicodeError):
        return "unknown"
    expected = {
        "schema",
        "liveness_before",
        "recovery_attempted",
        "liveness_after",
        "result",
        "details",
    }
    if set(values) != expected:
        return "unknown"
    if values["schema"] != JOB_RECEIPT_SCHEMA or values["details"] != "withheld":
        return "unknown"
    if values["result"] not in {"healthy", "recovered", "failed"}:
        return "unknown"
    return values["result"]


def control_receipt(install_value: str, schedule_value: str, last_value: str) -> str:
    return "".join(
        [
            f"schema={SCHEMA}\n",
            f"install={install_value}\n",
            f"schedule={schedule_value}\n",
            f"last_result={last_value}\n",
            "job_id=2756\n",
            "period_ms=900000\n",
            "persisted=true\n",
            "details=withheld\n",
        ]
    )


def check(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
    source_controller: Path | None = None,
    source_run: Path | None = None,
) -> tuple[str, int]:
    install_value = install_state(
        layout, source_controller=source_controller, source_run=source_run
    )
    try:
        schedule_value = schedule_state(layout, runner=runner)
    except OwnerBlocked:
        schedule_value = "unknown"
    last_value = last_result_state(layout)
    receipt = control_receipt(install_value, schedule_value, last_value)
    if install_value == "managed" and schedule_value == "managed":
        return receipt, 0
    if install_value == "missing" and schedule_value == "absent":
        return receipt, 1
    return receipt, 2


def schedule(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
    source_controller: Path | None = None,
    source_run: Path | None = None,
) -> str:
    if install_state(
        layout, source_controller=source_controller, source_run=source_run
    ) != "managed":
        raise OwnerBlocked("install is not managed")
    state = schedule_state(layout, runner=runner)
    if state == "managed":
        return state
    if state != "absent":
        raise OwnerBlocked("target job id is not safely available")
    proc = _run(schedule_argv(layout), runner=runner)
    if proc.returncode != 0 or proc.stderr:
        raise OwnerBlocked("schedule failed")
    if schedule_state(layout, runner=runner) != "managed":
        raise OwnerBlocked("schedule readback failed")
    return "managed"


def cancel(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
) -> str:
    state = schedule_state(layout, runner=runner)
    if state == "absent":
        return "absent"
    if state != "managed":
        raise OwnerBlocked("refuse to cancel non-managed target id")
    proc = _run(cancel_argv(layout), runner=runner)
    if proc.returncode != 0 or proc.stderr:
        raise OwnerBlocked("cancel failed")
    if schedule_state(layout, runner=runner) != "absent":
        raise OwnerBlocked("cancel readback failed")
    return "absent"


def _status(
    layout: Layout,
    *,
    runner: Runner = subprocess.run,
) -> bool:
    if not _is_regular(layout.heartbeat):
        return False
    proc = _run(
        [str(layout.python), str(layout.heartbeat), "--status"],
        runner=runner,
        timeout=5.0,
        capture=False,
    )
    return proc.returncode == 0


def _write_job_receipt(
    layout: Layout,
    *,
    before: str,
    attempted: bool,
    after: str,
    result: str,
) -> None:
    if layout.state_dir.exists() or layout.state_dir.is_symlink():
        if layout.state_dir.is_symlink() or not layout.state_dir.is_dir():
            raise OwnerBlocked("state dir conflict")
    else:
        layout.state_dir.mkdir(parents=True, mode=0o700)
    os.chmod(layout.state_dir, 0o700)
    payload = "".join(
        [
            f"schema={JOB_RECEIPT_SCHEMA}\n",
            f"liveness_before={before}\n",
            f"recovery_attempted={'true' if attempted else 'false'}\n",
            f"liveness_after={after}\n",
            f"result={result}\n",
            "details=withheld\n",
        ]
    ).encode("utf-8")
    fd, tmp_name = tempfile.mkstemp(prefix=".job.receipt.", dir=str(layout.state_dir))
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, layout.job_receipt)
    finally:
        try:
            tmp.unlink(missing_ok=True)
        except OSError:
            pass


def job_run(
    layout: Layout = DEFAULT_LAYOUT,
    *,
    runner: Runner = subprocess.run,
) -> int:
    if _status(layout, runner=runner):
        _write_job_receipt(
            layout,
            before="healthy",
            attempted=False,
            after="healthy",
            result="healthy",
        )
        return 0

    recovery_ok = False
    if _is_regular(layout.recovery) and os.access(layout.recovery, os.X_OK):
        proc = _run(
            [str(layout.recovery)],
            runner=runner,
            timeout=45.0,
            capture=False,
        )
        recovery_ok = proc.returncode == 0
    after_healthy = _status(layout, runner=runner)
    result = "recovered" if recovery_ok and after_healthy else "failed"
    _write_job_receipt(
        layout,
        before="inactive",
        attempted=True,
        after="healthy" if after_healthy else "inactive",
        result=result,
    )
    return 0 if result == "recovered" else 3


def last_result_receipt(layout: Layout = DEFAULT_LAYOUT) -> str:
    state = last_result_state(layout)
    if state in {"missing", "unknown"}:
        return "".join(
            [
                f"schema={JOB_RECEIPT_SCHEMA}\n",
                "liveness_before=unknown\n",
                "recovery_attempted=false\n",
                "liveness_after=unknown\n",
                f"result={state}\n",
                "details=withheld\n",
            ]
        )
    return layout.job_receipt.read_text(encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    try:
        if args == ["--check"]:
            receipt, rc = check()
            sys.stdout.write(receipt)
            return rc
        if args == ["--install"]:
            install()
            receipt, _ = check()
            sys.stdout.write(receipt)
            return 0
        if args == ["--schedule"]:
            schedule()
            receipt, rc = check()
            sys.stdout.write(receipt)
            return 0 if rc == 0 else 2
        if args == ["--cancel"]:
            cancel()
            receipt, _ = check()
            sys.stdout.write(receipt)
            return 0
        if args == ["--last-result"]:
            sys.stdout.write(last_result_receipt())
            return 0
        if args == ["--job-run"]:
            return job_run()
    except OwnerBlocked:
        sys.stdout.write(
            control_receipt(
                install_state(),
                "blocked",
                last_result_state(),
            )
        )
        return 2
    sys.stdout.write(
        "usage: python mcl-m-termux-job-lifeline.py "
        "--check|--install|--schedule|--cancel|--last-result\n"
    )
    return 64


if __name__ == "__main__":
    raise SystemExit(main())
