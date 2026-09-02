#!/usr/bin/env python3
"""Validate one narrowly scoped O2-D retrospective sequential pilot request."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MODE = "o2d_sequential_retrospective_mechanical"
FROZEN_EVIDENCE_REPOSITORY_SHA = "7bd212b496111a628d249946d3a98b8c55d001ae"
FROZEN_RELEASE_REPOSITORY_SHA = "82c4f900cf548068d1eada957c982a5d78f1347b"
EXPECTED_KEYS = {
    "schema_version",
    "mode",
    "harness_repository_sha",
    "evidence_repository_sha",
    "release_repository_sha",
}


class SequentialPilotRequestError(ValueError):
    pass


def load_request(path: Path) -> dict[str, object]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SequentialPilotRequestError(
            f"cannot read O2-D sequential pilot request: {exc}"
        ) from exc
    if not isinstance(data, dict) or set(data) != EXPECTED_KEYS:
        raise SequentialPilotRequestError("O2-D sequential pilot request fields are not exact")
    if data["schema_version"] != 1 or data["mode"] != MODE:
        raise SequentialPilotRequestError("O2-D sequential pilot request identity is invalid")
    for key in (
        "harness_repository_sha",
        "evidence_repository_sha",
        "release_repository_sha",
    ):
        value = data[key]
        if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
            raise SequentialPilotRequestError(f"{key} must be an exact lowercase 40-hex SHA")
    if data["evidence_repository_sha"] != FROZEN_EVIDENCE_REPOSITORY_SHA:
        raise SequentialPilotRequestError("O2-D evidence_repository_sha drifted from frozen retrospective authority")
    if data["release_repository_sha"] != FROZEN_RELEASE_REPOSITORY_SHA:
        raise SequentialPilotRequestError("O2-D release_repository_sha drifted from frozen retrospective authority")
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
        print("O2D_SEQUENTIAL_REQUEST:VALID")
        print("O2D_HARNESS_SHA:" + str(data["harness_repository_sha"]))
        print("O2D_EVIDENCE_SHA:" + str(data["evidence_repository_sha"]))
        print("O2D_RELEASE_SHA:" + str(data["release_repository_sha"]))
        return 0
    except SequentialPilotRequestError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
