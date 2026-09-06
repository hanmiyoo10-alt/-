#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

MAX_MANIFEST_BYTES = 64 * 1024
MAX_CHECKS = 200


def _load_manifest(path: str) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file():
        raise ValueError(f"manifest missing: {path}")
    if source.stat().st_size > MAX_MANIFEST_BYTES:
        raise ValueError("manifest exceeds 64 KiB")
    raw = json.loads(source.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("schemaVersion") != 1:
        raise ValueError("manifest schemaVersion must equal 1")
    suite = raw.get("suite")
    checks = raw.get("checks")
    if not isinstance(suite, str) or not suite.strip():
        raise ValueError("manifest suite missing")
    if not isinstance(checks, list) or not checks or len(checks) > MAX_CHECKS:
        raise ValueError("manifest checks invalid")
    seen: set[str] = set()
    for index, item in enumerate(checks):
        if not isinstance(item, dict):
            raise ValueError(f"check {index} must be object")
        name = item.get("name")
        command = item.get("command")
        if not isinstance(name, str) or not name.strip() or name in seen:
            raise ValueError(f"check {index} name invalid or duplicate")
        seen.add(name)
        if not isinstance(command, list) or not command or not all(isinstance(x, str) and x for x in command):
            raise ValueError(f"check {name} command invalid")
    return {"schemaVersion": 1, "suite": suite.strip(), "checks": checks}


def _write_report(path: str, report: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix(target.suffix + ".tmp")
    temp.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    temp.replace(target)


def _initial_report(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "suite": manifest["suite"],
        "result": "RUNNING",
        "failFast": True,
        "plannedCount": len(manifest["checks"]),
        "completedCount": 0,
        "checks": [
            {"name": item["name"], "status": "NOT_RUN", "exitCode": None}
            for item in manifest["checks"]
        ],
        "firstFailure": None,
    }


def run_manifest(manifest: dict[str, Any], report_path: str, cwd: str | None = None) -> int:
    report = _initial_report(manifest)
    _write_report(report_path, report)

    for index, item in enumerate(manifest["checks"]):
        name = item["name"]
        command = item["command"]
        print(f"CI_RECEIPT_CHECK_BEGIN:{index + 1}/{len(manifest['checks'])}:{name}", flush=True)
        try:
            completed = subprocess.run(command, cwd=cwd, check=False)
            code = completed.returncode
        except OSError as exc:
            code = 127
            report["checks"][index].update({"status": "INFRA_ERROR", "exitCode": code})
            report["completedCount"] = index + 1
            report["result"] = "INFRA_ERROR"
            report["firstFailure"] = {
                "name": name,
                "status": "INFRA_ERROR",
                "exitCode": code,
                "message": f"command launch failed: {exc}",
            }
            _write_report(report_path, report)
            print(f"CI_RECEIPT_CHECK_END:{name}:INFRA_ERROR:{code}", flush=True)
            return code

        status = "PASS" if code == 0 else "FAIL"
        report["checks"][index].update({"status": status, "exitCode": code})
        report["completedCount"] = index + 1
        print(f"CI_RECEIPT_CHECK_END:{name}:{status}:{code}", flush=True)
        if code != 0:
            report["result"] = "FAIL"
            report["firstFailure"] = {"name": name, "status": "FAIL", "exitCode": code}
            _write_report(report_path, report)
            return code if 0 < code < 256 else 1
        _write_report(report_path, report)

    report["result"] = "PASS"
    _write_report(report_path, report)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Execute an ordered CI contract manifest and emit fail-fast structured receipts")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--report", required=True)
    parser.add_argument("--cwd")
    args = parser.parse_args(argv)
    try:
        manifest = _load_manifest(args.manifest)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"CI_RECEIPT_MANIFEST_ERROR:{exc}", file=sys.stderr)
        return 2
    return run_manifest(manifest, args.report, cwd=args.cwd)


if __name__ == "__main__":
    raise SystemExit(main())
