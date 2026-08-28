from __future__ import annotations

import json
import os
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable


def default_state_dir() -> Path:
    override = os.environ.get("TERMUX_BACKGROUND_GPT_STATE_DIR")
    if override:
        return Path(override).expanduser()
    return Path.home() / ".local" / "state" / "termux-background-gpt"


def state_path() -> Path:
    return default_state_dir() / "state.json"


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def atomic_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + ".", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass


def load_state(path: Path | None = None) -> dict[str, Any] | None:
    target = path or state_path()
    try:
        with target.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return None
    if not isinstance(data, dict):
        raise ValueError("state file must contain a JSON object")
    return data


def pid_alive(pid: int | None) -> bool:
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def elapsed_seconds(
    state: dict[str, Any],
    clock: Callable[[], float] = time.time,
) -> float:
    started = state.get("response_created_at", state.get("submitted_at_epoch", clock()))
    ended = state.get("response_completed_at")
    try:
        start_value = float(started)
    except (TypeError, ValueError):
        start_value = clock()
    try:
        end_value = float(ended) if ended is not None else clock()
    except (TypeError, ValueError):
        end_value = clock()
    return max(0.0, end_value - start_value)


def normalize_local_watcher(
    state: dict[str, Any] | None,
    path: Path | None = None,
) -> dict[str, Any] | None:
    if not state or state.get("watcher_status") != "running":
        return state
    pid = state.get("watcher_pid")
    if pid_alive(pid if isinstance(pid, int) else None):
        return state
    stale = dict(state)
    stale["watcher_status"] = "stale"
    stale["watcher_stale_at"] = now_iso()
    atomic_write_json(path or state_path(), stale)
    return stale
