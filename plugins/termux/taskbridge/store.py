from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from state_machine import require_transition, validate_state

SCHEMA_VERSION = "1"


def utc_ts() -> float:
    return time.time()


class Store:
    def __init__(self, state_dir: str | os.PathLike[str] | None = None) -> None:
        root = state_dir or os.environ.get("TASKBRIDGE_STATE_DIR") or "~/.local/state/taskbridge"
        self.state_dir = Path(root).expanduser()
        self.jobs_dir = self.state_dir / "jobs"
        self.db_path = self.state_dir / "taskbridge.sqlite3"
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.jobs_dir.mkdir(parents=True, exist_ok=True)
        self._init_db()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        con = sqlite3.connect(self.db_path, timeout=10)
        con.row_factory = sqlite3.Row
        con.execute("PRAGMA journal_mode=WAL")
        con.execute("PRAGMA foreign_keys=ON")
        try:
            yield con
            con.commit()
        finally:
            con.close()

    def _init_db(self) -> None:
        with self.connect() as con:
            con.executescript(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    name TEXT,
                    adapter TEXT NOT NULL,
                    command_json TEXT NOT NULL,
                    logical_state TEXT NOT NULL,
                    local_state TEXT NOT NULL,
                    remote_state TEXT NOT NULL,
                    signal_confidence TEXT NOT NULL,
                    desired_action TEXT NOT NULL,
                    worker_pid INTEGER,
                    child_pid INTEGER,
                    exit_code INTEGER,
                    result_ref TEXT,
                    error_code TEXT,
                    created_at REAL NOT NULL,
                    started_at REAL,
                    last_seen REAL,
                    finished_at REAL,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    logical_state TEXT,
                    detail_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_events_job ON events(job_id, id);
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                """
            )
            con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES('schema_version',?)", (SCHEMA_VERSION,))

    def create_job(self, command: list[str], *, adapter: str = "shell", name: str | None = None) -> dict[str, Any]:
        if not command:
            raise ValueError("command must not be empty")
        now = utc_ts()
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        with self.connect() as con:
            con.execute(
                """INSERT INTO jobs(
                    job_id,name,adapter,command_json,logical_state,local_state,remote_state,
                    signal_confidence,desired_action,created_at,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (job_id, name, adapter, json.dumps(command), "CREATED", "NOT_STARTED", "UNKNOWN", "LOW", "NONE", now, now),
            )
            self._event_tx(con, job_id, "JOB_CREATED", "CREATED", {"adapter": adapter, "argv_count": len(command)})
        return self.get_job(job_id)

    def get_job(self, job_id: str) -> dict[str, Any]:
        with self.connect() as con:
            row = con.execute("SELECT * FROM jobs WHERE job_id=?", (job_id,)).fetchone()
            if row is None:
                raise KeyError(job_id)
            item = dict(row)
            item["command"] = json.loads(item.pop("command_json"))
            return item

    def list_jobs(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connect() as con:
            rows = con.execute("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
            out = []
            for row in rows:
                item = dict(row)
                item["command"] = json.loads(item.pop("command_json"))
                out.append(item)
            return out

    def request(self, job_id: str, action: str) -> None:
        action = action.upper()
        if action not in {"RUN", "CANCEL", "NONE"}:
            raise ValueError(f"invalid desired action: {action}")
        self.update_fields(job_id, desired_action=action)
        self.add_event(job_id, f"REQUEST_{action}", {"action": action})

    def transition(self, job_id: str, new_state: str, *, event_type: str, detail: dict[str, Any] | None = None, **fields: Any) -> None:
        new_state = validate_state(new_state)
        with self.connect() as con:
            row = con.execute("SELECT logical_state FROM jobs WHERE job_id=?", (job_id,)).fetchone()
            if row is None:
                raise KeyError(job_id)
            old = row["logical_state"]
            require_transition(old, new_state)
            now = utc_ts()
            updates = {"logical_state": new_state, "updated_at": now, **fields}
            if new_state in {"COMPLETED", "FAILED", "CANCELLED"} and "finished_at" not in updates:
                updates["finished_at"] = now
            self._update_tx(con, job_id, updates)
            self._event_tx(con, job_id, event_type, new_state, detail or {})

    def update_fields(self, job_id: str, **fields: Any) -> None:
        fields = dict(fields)
        fields["updated_at"] = utc_ts()
        with self.connect() as con:
            if con.execute("SELECT 1 FROM jobs WHERE job_id=?", (job_id,)).fetchone() is None:
                raise KeyError(job_id)
            self._update_tx(con, job_id, fields)

    def heartbeat(self, job_id: str, *, local_state: str = "RUNNING") -> None:
        now = utc_ts()
        self.update_fields(job_id, last_seen=now, local_state=local_state, signal_confidence="HIGH")

    def add_event(self, job_id: str, event_type: str, detail: dict[str, Any] | None = None) -> None:
        with self.connect() as con:
            state = con.execute("SELECT logical_state FROM jobs WHERE job_id=?", (job_id,)).fetchone()
            if state is None:
                raise KeyError(job_id)
            self._event_tx(con, job_id, event_type, state["logical_state"], detail or {})

    def events(self, job_id: str, limit: int = 100) -> list[dict[str, Any]]:
        with self.connect() as con:
            rows = con.execute(
                "SELECT id,job_id,event_type,logical_state,detail_json,created_at FROM events WHERE job_id=? ORDER BY id DESC LIMIT ?",
                (job_id, limit),
            ).fetchall()
            out = []
            for row in reversed(rows):
                item = dict(row)
                item["detail"] = json.loads(item.pop("detail_json"))
                out.append(item)
            return out

    def set_meta(self, key: str, value: str) -> None:
        with self.connect() as con:
            con.execute("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", (key, value))

    def compare_and_set_meta(self, key: str, expected_value: str | None, new_value: str) -> bool:
        """Atomically replace a metadata value only if it still matches what the caller read.

        This prevents a stale coordinator tick from overwriting a newer user command such as
        response-timer stop. `expected_value=None` means the key must not exist yet.
        """
        with self.connect() as con:
            if expected_value is None:
                cur = con.execute(
                    "INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING",
                    (key, new_value),
                )
            else:
                cur = con.execute(
                    "UPDATE meta SET value=? WHERE key=? AND value=?",
                    (new_value, key, expected_value),
                )
            return cur.rowcount == 1

    def get_meta(self, key: str) -> str | None:
        with self.connect() as con:
            row = con.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
            return None if row is None else str(row["value"])

    def job_paths(self, job_id: str) -> tuple[Path, Path]:
        root = self.jobs_dir / job_id
        root.mkdir(parents=True, exist_ok=True)
        return root / "stdout.log", root / "stderr.log"

    @staticmethod
    def _update_tx(con: sqlite3.Connection, job_id: str, fields: dict[str, Any]) -> None:
        if not fields:
            return
        allowed = {
            "name","adapter","logical_state","local_state","remote_state","signal_confidence","desired_action",
            "worker_pid","child_pid","exit_code","result_ref","error_code","created_at","started_at","last_seen","finished_at","updated_at"
        }
        bad = set(fields) - allowed
        if bad:
            raise ValueError(f"invalid job fields: {sorted(bad)}")
        sql = ", ".join(f"{k}=?" for k in fields)
        con.execute(f"UPDATE jobs SET {sql} WHERE job_id=?", (*fields.values(), job_id))

    @staticmethod
    def _event_tx(con: sqlite3.Connection, job_id: str, event_type: str, logical_state: str | None, detail: dict[str, Any]) -> None:
        con.execute(
            "INSERT INTO events(job_id,event_type,logical_state,detail_json,created_at) VALUES(?,?,?,?,?)",
            (job_id, event_type, logical_state, json.dumps(detail, separators=(",", ":")), utc_ts()),
        )
