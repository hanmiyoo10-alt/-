#!/usr/bin/env python3
"""Validate one narrowly scoped O2-A retrospective Scout pilot request."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
EXPECTED_KEYS = {"schema_version", "mode", "target_repository_sha", "release_repository_sha"}
MODE = "o2a_scout_retrospective_mechanical"


class PilotRequestError(ValueError):
    pass


def load_request(path: Path) -> dict[str, object]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PilotRequestError(f"cannot read Scout pilot request: {exc}") from exc
    if not isinstance(data, dict) or set(data) != EXPECTED_KEYS:
        raise PilotRequestError("Scout pilot request fields are not exact")
    if data["schema_version"] != 1 or data["mode"] != MODE:
        raise PilotRequestError("Scout pilot request identity is invalid")
    for key in ("target_repository_sha", "release_repository_sha"):
        value = data[key]
        if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
            raise PilotRequestError(f"{key} must be an exact lowercase 40-hex SHA")
    return data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--request", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args(argv)
    try:
        data = load_request(Path(args.request))
        Path(args.output).write_text(
            json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        print("SCOUT_PILOT_REQUEST:VALID")
        print("SCOUT_PILOT_TARGET_SHA:" + str(data["target_repository_sha"]))
        print("SCOUT_PILOT_RELEASE_SHA:" + str(data["release_repository_sha"]))
        return 0
    except PilotRequestError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
