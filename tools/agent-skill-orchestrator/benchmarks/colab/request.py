from __future__ import annotations

import argparse
import json
import re
import secrets
import subprocess
import sys
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parents[2]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from canonical import canonical_sha256
from schema_validation import ContractValidationError, validate_contract

REQUEST_SCHEMA = "colab-bootstrap-request-v1.schema.json"
OPERATION_KIND = "COLAB_BOOTSTRAP_CPU_SMOKE"
EXECUTION_PROFILE_ID = "colab-cpu-bootstrap-v1"
MAX_WALL_MINUTES_LIMIT = 30
MAIN_BRANCH = "main"
SHA_PATTERN = re.compile(r"^[0-9a-f]{40}$")
REQUEST_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")
REQUEST_SUFFIX_PATTERN = re.compile(r"^[0-9a-f]{4}$")


class ColabBootstrapRequestError(ValueError):
    pass


def _hash_without_self(value: dict[str, Any], field: str) -> str:
    base = deepcopy(value)
    base.pop(field, None)
    return canonical_sha256(base)


def _git(repo_root: Path, *args: str) -> str:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), *args],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=20,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ColabBootstrapRequestError(f"git invocation failed: {exc}") from exc
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or f"exit={proc.returncode}").strip()
        raise ColabBootstrapRequestError(f"git {' '.join(args)} failed: {detail}")
    return proc.stdout


def resolve_checked_out_main_sha(repo_root: Path | str) -> str:
    root = Path(repo_root).resolve()
    branch = _git(root, "symbolic-ref", "--short", "HEAD").strip()
    if branch != MAIN_BRANCH:
        raise ColabBootstrapRequestError(f"checkout branch must be {MAIN_BRANCH!r}")
    sha = _git(root, "rev-parse", "HEAD").strip()
    if not SHA_PATTERN.fullmatch(sha):
        raise ColabBootstrapRequestError("resolved main SHA must be lowercase 40-hex")
    return sha


def make_runtime_request_id(
    now: datetime | None = None,
    suffix: str | None = None,
) -> str:
    observed = now or datetime.now(timezone.utc)
    if observed.tzinfo is None:
        raise ColabBootstrapRequestError("runtime request timestamp must be timezone-aware")
    observed = observed.astimezone(timezone.utc)
    resolved_suffix = suffix or secrets.token_hex(2)
    if not REQUEST_SUFFIX_PATTERN.fullmatch(resolved_suffix):
        raise ColabBootstrapRequestError("runtime request suffix must be four lowercase hex characters")
    request_id = f"cagb1-{observed.strftime('%Y%m%dt%H%M%Sz')}-{resolved_suffix}"
    if not REQUEST_ID_PATTERN.fullmatch(request_id):
        raise ColabBootstrapRequestError("generated runtime request id is invalid")
    return request_id


def make_request(request_id: str, repository_sha: str, max_wall_minutes: int = 10) -> dict[str, Any]:
    request = {
        "schema_version": 1,
        "request_id": request_id,
        "repository_sha": repository_sha,
        "operation_kind": OPERATION_KIND,
        "execution_profile_id": EXECUTION_PROFILE_ID,
        "max_model_calls": 0,
        "max_wall_minutes": max_wall_minutes,
    }
    request["request_sha256"] = _hash_without_self(request, "request_sha256")
    return validate_request(request)


def validate_request(value: dict[str, Any]) -> dict[str, Any]:
    try:
        validate_contract(value, REQUEST_SCHEMA)
    except ContractValidationError as exc:
        raise ColabBootstrapRequestError(str(exc)) from exc
    wall = value["max_wall_minutes"]
    if wall < 1 or wall > MAX_WALL_MINUTES_LIMIT:
        raise ColabBootstrapRequestError("max_wall_minutes must be between 1 and 30")
    expected = _hash_without_self(value, "request_sha256")
    if value["request_sha256"] != expected:
        raise ColabBootstrapRequestError("request_sha256 mismatch")
    return deepcopy(value)


def load_request(path: Path | str) -> dict[str, Any]:
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ColabBootstrapRequestError(f"cannot read request: {exc}") from exc
    if not isinstance(value, dict):
        raise ColabBootstrapRequestError("request must be a JSON object")
    return validate_request(value)


def write_json(path: Path | str, value: dict[str, Any]) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prepare a bounded CAGB-1 bootstrap request.")
    parser.add_argument("--request-id", required=True)
    parser.add_argument("--repository-sha", required=True)
    parser.add_argument("--max-wall-minutes", type=int, default=10)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    try:
        write_json(args.output, make_request(args.request_id, args.repository_sha, args.max_wall_minutes))
        return 0
    except ColabBootstrapRequestError as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
