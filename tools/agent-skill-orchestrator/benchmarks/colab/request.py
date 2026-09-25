from __future__ import annotations

import argparse
import json
import sys
from copy import deepcopy
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


class ColabBootstrapRequestError(ValueError):
    pass


def _hash_without_self(value: dict[str, Any], field: str) -> str:
    base = deepcopy(value)
    base.pop(field, None)
    return canonical_sha256(base)


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
