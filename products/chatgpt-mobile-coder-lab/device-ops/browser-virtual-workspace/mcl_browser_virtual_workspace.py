from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

SCHEMA = "mcl-browser-virtual-workspace.v1"
MARKER = "mcl-browser-virtual-workspace:v1"
MODEL = "SM-S938N"
FORWARD_PORT = 9223
STATE_DIR_NAME = ".local/state/mcl-browser-virtual-workspace"
STATE_FILE_NAME = "state.json"
LOG_FILE_NAME = "scrcpy.log"
COLAB_ROOT = "https://colab.research.google.com/"
DISPLAY_SPEC = "720x1280/240"
TARGET_ID_RE = re.compile(r"^[A-Fa-f0-9]{1,64}$")

SCRCPY_ARGS = [
    "--new-display=" + DISPLAY_SPEC,
    "--start-app=com.android.settings",
    "--record=/dev/null",
    "--record-format=mkv",
    "--no-window",
    "--no-audio",
    "--no-clipboard-autosync",
    "--no-power-on",
    "--max-fps=5",
    "--video-bit-rate=1M",
]
CHROME_COMPONENT = "com.android.chrome/com.google.android.apps.chrome.IntentDispatcher"
CHROME_FLAGS = "0x18080000"


class WorkspaceError(RuntimeError):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def bounded_receipt(
    operation: str,
    state: str,
    *,
    display_id: str = "unknown",
    owner_process: str = "unknown",
    virtual_display: str = "unknown",
    chrome_task: str = "unknown",
    cdp: str = "unknown",
    bound_target: str = "unknown",
) -> str:
    fields = [
        ("schema", SCHEMA),
        ("operation", operation),
        ("state", state),
        ("display_id", display_id),
        ("owner_process", owner_process),
        ("virtual_display", virtual_display),
        ("chrome_task", chrome_task),
        ("cdp", cdp),
        ("bound_target", bound_target),
        ("details", "withheld"),
    ]
    return "\n".join(f"{key}={value}" for key, value in fields)


def parse_adb_devices(output: str) -> str:
    connected: list[str] = []
    for raw in output.splitlines():
        line = raw.strip()
        if (
            not line
            or line.startswith("List of devices attached")
            or line.startswith("*")
        ):
            continue
        parts = line.split()
        if len(parts) < 2:
            raise WorkspaceError("adb-device-list-invalid")
        if parts[1] == "device":
            connected.append(parts[0])
    if len(connected) != 1:
        raise WorkspaceError("adb-device-not-unique")
    return connected[0]


def validate_product_model(output: str) -> None:
    stripped = output.strip()
    lines = stripped.splitlines()
    if len(lines) != 1 or lines[0] != MODEL:
        raise WorkspaceError("adb-device-not-eligible")


def parse_display_ids(output: str) -> set[int]:
    return {int(value) for value in re.findall(r"mDisplayId=(\d+)", output)}


def wait_created_display(
    runtime: Any,
    serial: str,
    proc: subprocess.Popen[str],
    before_displays: set[int],
    *,
    timeout_seconds: float = 12,
    sleep_fn: Any = time.sleep,
) -> int:
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise WorkspaceError("scrcpy-exited")
        after_displays = runtime.displays(serial)
        if 0 not in after_displays:
            raise WorkspaceError("physical-display-lost")
        created_displays = {
            observed
            for observed in after_displays - before_displays
            if observed != 0
        }
        if len(created_displays) == 1:
            return next(iter(created_displays))
        if len(created_displays) > 1:
            raise WorkspaceError("display-admission-ambiguous")
        sleep_fn(0.25)
    raise WorkspaceError("display-id-timeout")


def build_scrcpy_command(serial: str) -> list[str]:
    return ["scrcpy", "-s", serial, *SCRCPY_ARGS]


def build_chrome_command(serial: str, display_id: int) -> list[str]:
    if display_id <= 0:
        raise WorkspaceError("display-id-invalid")
    return [
        "adb",
        "-s",
        serial,
        "shell",
        "am",
        "start",
        "--display",
        str(display_id),
        "-f",
        CHROME_FLAGS,
        "-a",
        "android.intent.action.VIEW",
        "-d",
        COLAB_ROOT,
        "-n",
        CHROME_COMPONENT,
    ]


def is_owned_scrcpy_cmdline(tokens: list[str], expected_serial: str) -> bool:
    if len(tokens) != 3 + len(SCRCPY_ARGS):
        return False
    if Path(tokens[0]).name != "scrcpy":
        return False
    if tokens[1] != "-s":
        return False
    if tokens[2] != expected_serial:
        return False
    return tokens[3:] == SCRCPY_ARGS


def parse_display_section(output: str, display_id: int) -> str:
    marker = f"Display #{display_id} (activities from top to bottom):"
    start = output.find(marker)
    if start < 0:
        return ""
    rest = output[start + len(marker) :]
    nxt = re.search(r"\nDisplay #\d+ \(activities from top to bottom\):", rest)
    return rest[: nxt.start()] if nxt else rest


def chrome_task_present(output: str, display_id: int) -> bool:
    section = parse_display_section(output, display_id)
    return "com.android.chrome/" in section and "ChromeTabbedActivity" in section


def validate_state(value: dict[str, Any]) -> dict[str, Any]:
    required = {
        "marker",
        "pid",
        "display_id",
        "target_id",
        "started_at",
        "forward_port",
    }
    if set(value) != required:
        raise WorkspaceError("state-invalid")
    if value["marker"] != MARKER:
        raise WorkspaceError("state-marker-mismatch")
    if not isinstance(value["pid"], int) or value["pid"] <= 0:
        raise WorkspaceError("state-invalid")
    if not isinstance(value["display_id"], int) or value["display_id"] <= 0:
        raise WorkspaceError("state-invalid")
    if value["target_id"] is not None and not TARGET_ID_RE.fullmatch(value["target_id"]):
        raise WorkspaceError("state-invalid")
    if value["forward_port"] != FORWARD_PORT:
        raise WorkspaceError("state-invalid")
    if not isinstance(value["started_at"], str) or len(value["started_at"]) > 40:
        raise WorkspaceError("state-invalid")
    return value


class RealRuntime:
    def __init__(self) -> None:
        self.home = Path.home()
        self.state_dir = self.home / STATE_DIR_NAME
        self.state_file = self.state_dir / STATE_FILE_NAME
        self.log_file = self.state_dir / LOG_FILE_NAME

    def run(self, argv: list[str], timeout: int = 15) -> subprocess.CompletedProcess[str]:
        try:
            return subprocess.run(
                argv,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=timeout,
            )
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise WorkspaceError("command-unavailable") from exc

    def require_command(self, name: str) -> None:
        proc = self.run(["sh", "-c", f"command -v {name} >/dev/null 2>&1"])
        if proc.returncode != 0:
            raise WorkspaceError(f"{name}-unavailable")

    def resolve_serial(self) -> str:
        proc = self.run(["adb", "devices", "-l"])
        if proc.returncode != 0:
            raise WorkspaceError("adb-unavailable")
        serial = parse_adb_devices(proc.stdout)
        model = self.run(["adb", "-s", serial, "shell", "getprop", "ro.product.model"])
        if model.returncode != 0:
            raise WorkspaceError("adb-model-unavailable")
        validate_product_model(model.stdout)
        return serial

    def displays(self, serial: str) -> set[int]:
        proc = self.run(["adb", "-s", serial, "shell", "dumpsys", "display"])
        if proc.returncode != 0:
            raise WorkspaceError("display-observation-unavailable")
        return parse_display_ids(proc.stdout)

    def activities(self, serial: str) -> str:
        proc = self.run(["adb", "-s", serial, "shell", "dumpsys", "activity", "activities"])
        if proc.returncode != 0:
            raise WorkspaceError("activity-observation-unavailable")
        return proc.stdout

    def forward_in_use(self) -> bool:
        proc = self.run(["adb", "forward", "--list"])
        if proc.returncode != 0:
            raise WorkspaceError("adb-forward-unavailable")
        needle = f"tcp:{FORWARD_PORT}"
        return any(needle in line.split() for line in proc.stdout.splitlines())

    def create_forward(self, serial: str) -> None:
        proc = self.run(
            [
                "adb",
                "-s",
                serial,
                "forward",
                f"tcp:{FORWARD_PORT}",
                "localabstract:chrome_devtools_remote",
            ]
        )
        if proc.returncode != 0:
            raise WorkspaceError("cdp-forward-failed")

    def remove_forward(self, serial: str) -> None:
        self.run(["adb", "-s", serial, "forward", "--remove", f"tcp:{FORWARD_PORT}"])

    def list_targets(self) -> list[dict[str, Any]]:
        url = f"http://127.0.0.1:{FORWARD_PORT}/json/list"
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                data = json.load(response)
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
            raise WorkspaceError("cdp-unreachable") from exc
        if not isinstance(data, list):
            raise WorkspaceError("cdp-invalid")
        return [item for item in data if isinstance(item, dict) and item.get("type") == "page"]

    def start_scrcpy(self, serial: str) -> subprocess.Popen[str]:
        self.state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self.state_dir, 0o700)
        log = self.log_file.open("w", encoding="utf-8")
        try:
            proc = subprocess.Popen(
                build_scrcpy_command(serial),
                stdout=log,
                stderr=subprocess.STDOUT,
                text=True,
                start_new_session=True,
            )
        except OSError as exc:
            log.close()
            raise WorkspaceError("scrcpy-start-failed") from exc
        log.close()
        return proc

    def launch_chrome(self, serial: str, display_id: int) -> None:
        proc = self.run(build_chrome_command(serial, display_id))
        if proc.returncode != 0:
            raise WorkspaceError("chrome-launch-failed")

    def process_cmdline(self, pid: int) -> list[str] | None:
        path = Path("/proc") / str(pid) / "cmdline"
        try:
            raw = path.read_bytes()
        except FileNotFoundError:
            return None
        except OSError:
            raise WorkspaceError("process-observation-unavailable")
        return [part.decode("utf-8", "replace") for part in raw.split(b"\0") if part]

    def signal_int(self, pid: int) -> None:
        try:
            os.kill(pid, signal.SIGINT)
        except ProcessLookupError:
            return
        except OSError as exc:
            raise WorkspaceError("process-signal-failed") from exc

    def wait_process_exit(self, pid: int) -> bool:
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            if self.process_cmdline(pid) is None:
                return True
            time.sleep(0.2)
        return False

    def save_state(self, state: dict[str, Any]) -> None:
        self.state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self.state_dir, 0o700)
        temp = self.state_file.with_suffix(".tmp")
        temp.write_text(json.dumps(state, sort_keys=True) + "\n", encoding="utf-8")
        os.chmod(temp, 0o600)
        os.replace(temp, self.state_file)

    def load_state(self) -> dict[str, Any] | None:
        if not self.state_file.exists():
            return None
        try:
            value = json.loads(self.state_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise WorkspaceError("state-invalid") from exc
        if not isinstance(value, dict):
            raise WorkspaceError("state-invalid")
        return validate_state(value)

    def clear_state(self) -> None:
        for path in (self.state_file, self.log_file):
            try:
                path.unlink()
            except FileNotFoundError:
                pass
        try:
            self.state_dir.rmdir()
        except OSError:
            pass


def classify(runtime: RealRuntime, state: dict[str, Any] | None) -> dict[str, str]:
    if state is None:
        return {
            "state": "stopped",
            "display_id": "none",
            "owner_process": "absent",
            "virtual_display": "absent",
            "chrome_task": "absent",
            "cdp": "unknown",
            "bound_target": "absent",
        }

    try:
        serial = runtime.resolve_serial()
        display_ids = runtime.displays(serial)
        activities = runtime.activities(serial)
    except WorkspaceError:
        return {
            "state": "unknown",
            "display_id": str(state["display_id"]),
            "owner_process": "unknown",
            "virtual_display": "unknown",
            "chrome_task": "unknown",
            "cdp": "unknown",
            "bound_target": "unknown",
        }

    cmdline = runtime.process_cmdline(state["pid"])
    owner_process = (
        "running"
        if cmdline is not None and is_owned_scrcpy_cmdline(cmdline, serial)
        else "absent"
        if cmdline is None
        else "mismatch"
    )
    virtual_display = "present" if state["display_id"] in display_ids else "absent"
    chrome_task = "present" if chrome_task_present(activities, state["display_id"]) else "absent"

    cdp = "unreachable"
    bound_target = "absent"
    try:
        targets = runtime.list_targets()
        cdp = "reachable"
        if state["target_id"] is None:
            bound_target = "unknown"
        elif any(item.get("id") == state["target_id"] for item in targets):
            bound_target = "present"
    except WorkspaceError:
        pass

    running = (
        owner_process == "running"
        and virtual_display == "present"
        and chrome_task == "present"
        and cdp == "reachable"
    )
    if running:
        state_name = "running"
    elif owner_process == "mismatch":
        state_name = "blocked"
    else:
        state_name = "stale"

    return {
        "state": state_name,
        "display_id": str(state["display_id"]),
        "owner_process": owner_process,
        "virtual_display": virtual_display,
        "chrome_task": chrome_task,
        "cdp": cdp,
        "bound_target": bound_target,
    }


def run_start(runtime: RealRuntime) -> str:
    if runtime.load_state() is not None:
        raise WorkspaceError("existing-state")

    runtime.require_command("adb")
    runtime.require_command("scrcpy")
    runtime.require_command("python3")
    serial = runtime.resolve_serial()
    before_displays = runtime.displays(serial)
    if 0 not in before_displays:
        raise WorkspaceError("physical-display-missing")
    if before_displays != {0}:
        raise WorkspaceError("display-baseline-conflict")
    if runtime.forward_in_use():
        raise WorkspaceError("cdp-port-in-use")

    proc: subprocess.Popen[str] | None = None
    display_id: int | None = None
    forward_created = False
    try:
        proc = runtime.start_scrcpy(serial)
        display_id = wait_created_display(runtime, serial, proc, before_displays)
        after_displays = runtime.displays(serial)
        created_displays = {
            observed
            for observed in after_displays - before_displays
            if observed != 0
        }
        if 0 not in after_displays or created_displays != {display_id}:
            raise WorkspaceError("display-admission-failed")

        runtime.create_forward(serial)
        forward_created = True
        before_targets = {item.get("id") for item in runtime.list_targets()}
        runtime.launch_chrome(serial, display_id)

        deadline = time.monotonic() + 8
        target_id: str | None = None
        while time.monotonic() < deadline:
            try:
                targets = runtime.list_targets()
            except WorkspaceError:
                time.sleep(0.25)
                continue
            new_colab = [
                item.get("id")
                for item in targets
                if item.get("id") not in before_targets
                and isinstance(item.get("url"), str)
                and item["url"].startswith(COLAB_ROOT)
                and isinstance(item.get("id"), str)
                and TARGET_ID_RE.fullmatch(item["id"])
            ]
            if len(new_colab) == 1:
                target_id = new_colab[0]
                break
            if len(new_colab) > 1:
                raise WorkspaceError("target-ambiguous")
            time.sleep(0.25)

        activities = runtime.activities(serial)
        if not chrome_task_present(activities, display_id):
            raise WorkspaceError("chrome-task-missing")

        state = {
            "marker": MARKER,
            "pid": proc.pid,
            "display_id": display_id,
            "target_id": target_id,
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "forward_port": FORWARD_PORT,
        }
        runtime.save_state(state)
        snapshot = classify(runtime, state)
        if snapshot["state"] != "running":
            raise WorkspaceError("post-start-validation-failed")
        return bounded_receipt("start", **snapshot)
    except Exception:
        if forward_created:
            runtime.remove_forward(serial)
        if proc is not None:
            runtime.signal_int(proc.pid)
            runtime.wait_process_exit(proc.pid)
        runtime.clear_state()
        raise


def run_status(runtime: RealRuntime) -> str:
    state = runtime.load_state()
    snapshot = classify(runtime, state)
    return bounded_receipt("status", **snapshot)


def run_stop(runtime: RealRuntime) -> str:
    state = runtime.load_state()
    if state is None:
        return bounded_receipt(
            "stop",
            "stopped",
            display_id="none",
            owner_process="absent",
            virtual_display="absent",
            chrome_task="absent",
            cdp="unknown",
            bound_target="absent",
        )

    serial = runtime.resolve_serial()
    cmdline = runtime.process_cmdline(state["pid"])
    if cmdline is not None and not is_owned_scrcpy_cmdline(cmdline, serial):
        raise WorkspaceError("pid-command-mismatch")

    if cmdline is not None:
        runtime.signal_int(state["pid"])
        if not runtime.wait_process_exit(state["pid"]):
            raise WorkspaceError("scrcpy-stop-timeout")

    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if state["display_id"] not in runtime.displays(serial):
            break
        time.sleep(0.2)
    else:
        raise WorkspaceError("display-stop-timeout")

    runtime.remove_forward(serial)
    runtime.clear_state()
    return bounded_receipt(
        "stop",
        "stopped",
        display_id="none",
        owner_process="absent",
        virtual_display="absent",
        chrome_task="absent",
        cdp="unreachable",
        bound_target="absent",
    )


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1 or args[0] not in {"start", "status", "stop"}:
        print("usage: mcl-browser-virtual-workspace start|status|stop", file=sys.stderr)
        return 2

    operation = args[0]
    runtime = RealRuntime()
    try:
        if operation == "start":
            print(run_start(runtime))
        elif operation == "status":
            print(run_status(runtime))
        else:
            print(run_stop(runtime))
        return 0
    except WorkspaceError:
        print(
            bounded_receipt(
                operation,
                "blocked",
                display_id="unknown",
                owner_process="unknown",
                virtual_display="unknown",
                chrome_task="unknown",
                cdp="unknown",
                bound_target="unknown",
            ),
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
