#!/usr/bin/env python3
"""Execute the frozen O2-A retrospective Scout pilot on bounded Usage Dashboard evidence."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from authority import resolve_authority
from evidence import build_evidence_package
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence
from router import route_task
from runtime.generation import scout_generation, scout_model_profile
from runtime.llama_cpp import start_server, stop_server, verify_file_sha256
from runtime.local_server import post_chat_completion, wait_for_health
from runtime.receipt import build_scout_execution_result, role_execution_receipt_sha256

SCOPE = "plugin:usage-dashboard"
GUIDELINES_PATH = "docs/USAGE_DASHBOARD_GUIDELINES.md"
MANIFEST_PATH = "plugins/usage-dashboard/runtime/product-manifest.json"
ARTIFACT_PATH = "plugins/usage-dashboard/latest.js"
RELEASE_SPEC_DIR = ".github/usage-dashboard/releases"
RELEASE_BRANCH = "release-usage-dashboard"


class ScoutPilotError(ValueError):
    pass


def _git(repo_root: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(repo_root), *args],
            text=True,
            stderr=subprocess.STDOUT,
        ).strip()
    except subprocess.CalledProcessError as exc:
        raise ScoutPilotError(f"git {' '.join(args)} failed: {exc.output.strip()}") from exc


def _bounded_lines(path: Path, start_line: int, end_line: int) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        raise ScoutPilotError(f"cannot read evidence file {path}: {exc}") from exc
    if start_line < 1 or end_line < start_line or end_line > len(lines):
        raise ScoutPilotError(f"invalid evidence line range for {path}")
    return "\n".join(lines[start_line - 1 : end_line]) + "\n"


def build_pilot_control_inputs(
    repo_root: Path,
    target_repository_sha: str,
    release_repository_sha: str,
) -> dict[str, Any]:
    head = _git(repo_root, "rev-parse", "HEAD")
    if head != target_repository_sha:
        raise ScoutPilotError(f"pilot checkout mismatch: HEAD={head} target={target_repository_sha}")
    release_ref = _git(repo_root, "rev-parse", "refs/remotes/origin/release-usage-dashboard^{commit}")
    if release_ref != release_repository_sha:
        raise ScoutPilotError(
            f"release authority mismatch: fetched={release_ref} request={release_repository_sha}"
        )
    for required in (GUIDELINES_PATH, MANIFEST_PATH, ARTIFACT_PATH, RELEASE_SPEC_DIR):
        if not (repo_root / required).exists():
            raise ScoutPilotError(f"required Usage Dashboard authority path missing: {required}")

    task_request = {
        "schema_version": 1,
        "task_id": "o2a-scout-retrospective-mechanical",
        "scope": SCOPE,
        "task_kind": "source_locator",
        "intent": "Locate the supplied authoritative Usage Dashboard release/source evidence without semantic inference.",
        "mutation_requested": False,
        "device_truth_requested": False,
    }
    execution_plan = route_task(task_request)
    if execution_plan["execution_class"] != "fast" or execution_plan["role_stages"] != [
        {"stage_id": "scout", "role_id": "scout", "depends_on": []}
    ]:
        raise ScoutPilotError("O2-A pilot must resolve to the Scout-only fast lane")

    authority_snapshot = resolve_authority(
        SCOPE,
        target_repository_sha,
        [
            {
                "kind": "release_branch",
                "value": RELEASE_BRANCH,
                "status": "OBSERVED",
                "source_sha": release_repository_sha,
            },
            {
                "kind": "manifest",
                "value": MANIFEST_PATH,
                "status": "OBSERVED",
                "source_sha": target_repository_sha,
            },
            {
                "kind": "artifact",
                "value": ARTIFACT_PATH,
                "status": "OBSERVED",
                "source_sha": target_repository_sha,
            },
            {
                "kind": "release_spec_dir",
                "value": RELEASE_SPEC_DIR,
                "status": "OBSERVED",
                "source_sha": target_repository_sha,
            },
        ],
    )
    if authority_snapshot["overall_status"] != "RESOLVED" or authority_snapshot["blockers"]:
        raise ScoutPilotError("O2-A pilot requires fully resolved deterministic Usage Dashboard authority")

    evidence_package = build_evidence_package(
        execution_plan,
        authority_snapshot,
        [
            {
                "path": GUIDELINES_PATH,
                "source_sha": target_repository_sha,
                "start_line": 1,
                "content": _bounded_lines(repo_root / GUIDELINES_PATH, 1, 12),
            },
            {
                "path": MANIFEST_PATH,
                "source_sha": target_repository_sha,
                "start_line": 1,
                "content": _bounded_lines(repo_root / MANIFEST_PATH, 1, 12),
            },
        ],
    )
    if len(evidence_package["sources"]) != 2:
        raise ScoutPilotError("O2-A pilot evidence must contain exactly two bounded source blocks")

    prompt = build_scout_prompt(evidence_package)
    return {
        "task_request": task_request,
        "execution_plan": execution_plan,
        "authority_snapshot": authority_snapshot,
        "evidence_package": evidence_package,
        "prompt": prompt,
    }


def _write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--target-sha", required=True)
    parser.add_argument("--release-sha", required=True)
    parser.add_argument("--server-binary", required=True)
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--runtime-version-file", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--port", type=int, default=39129)
    args = parser.parse_args(argv)

    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    try:
        repo_root = Path(args.repo_root).resolve()
        profile = scout_model_profile()
        verify_file_sha256(Path(args.model_path), profile["sha256"])
        control = build_pilot_control_inputs(repo_root, args.target_sha, args.release_sha)
        prompt = control.pop("prompt")
        for key, value in control.items():
            _write_json(output_dir / f"{key.replace('_', '-')}.json", value)
        (output_dir / "prompt.txt").write_text(prompt, encoding="utf-8")

        runtime_version = Path(args.runtime_version_file).read_text(encoding="utf-8").strip()
        if not runtime_version:
            raise ScoutPilotError("llama.cpp runtime version is empty")

        server_log_path = output_dir / "llama-server.log"
        with server_log_path.open("wb") as server_log:
            process = start_server(
                Path(args.server_binary),
                Path(args.model_path),
                scout_generation(),
                args.port,
                server_log,
            )
            try:
                wait_for_health(args.port, process)
                content, finish_reason, envelope = post_chat_completion(
                    args.port,
                    prompt,
                    scout_generation(),
                    scout_response_schema_for_evidence(control["evidence_package"]),
                )
            finally:
                stop_server(process)

        (output_dir / "response.txt").write_text(content.rstrip() + "\n", encoding="utf-8")
        (output_dir / "finish-reason.txt").write_text(finish_reason + "\n", encoding="utf-8")
        _write_json(output_dir / "response-envelope.json", envelope)

        result = build_scout_execution_result(
            content=content,
            finish_reason=finish_reason,
            evidence_package=control["evidence_package"],
            prompt=prompt,
            runtime_version=runtime_version,
        )
        _write_json(output_dir / "role-execution-receipt.json", result["receipt"])
        if result["artifact"] is not None:
            _write_json(output_dir / "role-artifact.json", result["artifact"])
        if result["error"]:
            (output_dir / "validation-error.txt").write_text(str(result["error"]) + "\n", encoding="utf-8")

        summary = {
            "mode": "o2a_scout_retrospective_mechanical",
            "scope": SCOPE,
            "target_repository_sha": args.target_sha,
            "release_repository_sha": args.release_sha,
            "model_profile_id": profile["profile_id"],
            "execution_status": result["receipt"]["execution_status"],
            "finish_reason": finish_reason,
            "wire_bytes": len(content.encode("utf-8")),
            "role_artifact_present": result["artifact"] is not None,
            "receipt_sha256": role_execution_receipt_sha256(result["receipt"]),
            "model_call_count": result["receipt"]["model_call_count"],
            "hosted_ai_call_count": result["receipt"]["hosted_ai_call_count"],
        }
        _write_json(output_dir / "summary.json", summary)
        print("SCOUT_PILOT_EXECUTION_STATUS:" + summary["execution_status"])
        print("SCOUT_PILOT_FINISH_REASON:" + finish_reason)
        print("SCOUT_PILOT_WIRE_BYTES:" + str(summary["wire_bytes"]))
        print("SCOUT_PILOT_RECEIPT_SHA256:" + summary["receipt_sha256"])
        return 0 if summary["execution_status"] == "COMPLETED" else 3
    except Exception as exc:
        _write_json(
            output_dir / "summary.json",
            {
                "mode": "o2a_scout_retrospective_mechanical",
                "execution_status": "EXECUTION_INCOMPLETE",
                "error": str(exc),
            },
        )
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
