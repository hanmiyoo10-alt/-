#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

SCHEMA_VERSION = 1
RECEIPT_KIND = "CI_PHASE_RECEIPT_V1"
PHASE_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
RESULTS = {"NOT_RUN", "RUNNING", "PASS"}
MAX_PHASES = 32
MAX_BYTES = 32 * 1024


class ReceiptError(ValueError):
    pass


def _phase_name(value: str) -> str:
    if not PHASE_RE.fullmatch(value):
        raise ReceiptError(f"invalid phase name: {value!r}")
    return value


def _read(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ReceiptError(f"receipt missing: {path}")
    if path.stat().st_size > MAX_BYTES:
        raise ReceiptError("receipt exceeds size bound")
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ReceiptError(f"receipt unreadable: {exc}") from exc
    if not isinstance(raw, dict):
        raise ReceiptError("receipt root must be object")
    if raw.get("schemaVersion") != SCHEMA_VERSION or raw.get("receiptKind") != RECEIPT_KIND:
        raise ReceiptError("receipt contract mismatch")
    phases = raw.get("phases")
    if not isinstance(phases, list) or not phases or len(phases) > MAX_PHASES:
        raise ReceiptError("receipt phases invalid")
    names: list[str] = []
    for item in phases:
        if not isinstance(item, dict) or set(item) != {"name", "result"}:
            raise ReceiptError("receipt phase entry invalid")
        name = _phase_name(item.get("name"))
        result = item.get("result")
        if result not in RESULTS:
            raise ReceiptError(f"invalid phase result for {name}")
        names.append(name)
    if len(names) != len(set(names)):
        raise ReceiptError("duplicate phase name")
    metadata = raw.get("metadata")
    if not isinstance(metadata, dict):
        raise ReceiptError("receipt metadata invalid")
    for key, value in metadata.items():
        if not PHASE_RE.fullmatch(str(key)):
            raise ReceiptError(f"invalid metadata key: {key!r}")
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ReceiptError(f"invalid metadata value for {key}")
    return raw


def _write(path: Path, receipt: dict[str, Any]) -> None:
    text = json.dumps(receipt, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
    if len(text.encode("utf-8")) > MAX_BYTES:
        raise ReceiptError("receipt exceeds size bound")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent), text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass


def initialize(path: Path, phases: list[str]) -> None:
    normalized = [_phase_name(item) for item in phases]
    if not normalized or len(normalized) > MAX_PHASES:
        raise ReceiptError("phase list size invalid")
    if len(normalized) != len(set(normalized)):
        raise ReceiptError("duplicate phase name")
    receipt = {
        "schemaVersion": SCHEMA_VERSION,
        "receiptKind": RECEIPT_KIND,
        "phases": [{"name": name, "result": "NOT_RUN"} for name in normalized],
        "metadata": {},
    }
    _write(path, receipt)


def transition(path: Path, phase: str, target: str) -> None:
    receipt = _read(path)
    phase = _phase_name(phase)
    phases = receipt["phases"]
    index = next((i for i, item in enumerate(phases) if item["name"] == phase), None)
    if index is None:
        raise ReceiptError(f"unknown phase: {phase}")
    current = phases[index]["result"]
    if target == "RUNNING":
        if current != "NOT_RUN":
            raise ReceiptError(f"phase {phase} cannot start from {current}")
        if any(item["result"] != "PASS" for item in phases[:index]):
            raise ReceiptError(f"phase {phase} cannot start before previous phases pass")
    elif target == "PASS":
        if current != "RUNNING":
            raise ReceiptError(f"phase {phase} cannot pass from {current}")
    else:
        raise ReceiptError(f"unsupported transition target: {target}")
    phases[index]["result"] = target
    _write(path, receipt)


def set_integer(path: Path, key: str, value: int) -> None:
    receipt = _read(path)
    key = _phase_name(key)
    if isinstance(value, bool) or value < 0:
        raise ReceiptError("metadata value must be non-negative")
    receipt["metadata"][key] = value
    _write(path, receipt)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Write bounded non-authoritative CI phase receipts")
    parser.add_argument("--receipt", required=True)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("phases", nargs="+")

    for name in ("start", "pass"):
        phase_parser = subparsers.add_parser(name)
        phase_parser.add_argument("phase")

    integer_parser = subparsers.add_parser("set-int")
    integer_parser.add_argument("key")
    integer_parser.add_argument("value", type=int)

    args = parser.parse_args(argv)
    path = Path(args.receipt)
    if args.command == "init":
        initialize(path, args.phases)
    elif args.command == "start":
        transition(path, args.phase, "RUNNING")
    elif args.command == "pass":
        transition(path, args.phase, "PASS")
    elif args.command == "set-int":
        set_integer(path, args.key, args.value)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ReceiptError as exc:
        print(f"CI_PHASE_RECEIPT_ERROR:{exc}", file=__import__("sys").stderr)
        raise SystemExit(2)
