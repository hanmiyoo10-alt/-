#!/usr/bin/env python3
"""Validate one narrowly scoped O3-D live parallel retrospective request."""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
MODE = "o3d_parallel_retrospective_live"
FROZEN_EVIDENCE_REPOSITORY_SHA = "7bd212b496111a628d249946d3a98b8c55d001ae"
FROZEN_RELEASE_REPOSITORY_SHA = "82c4f900cf548068d1eada957c982a5d78f1347b"
EXPECTED_KEYS = {
    "schema_version",
    "mode",
    "harness_repository_sha",
    "evidence_repository_sha",
    "release_repository_sha",
}


class ParallelPilotRequestError(ValueError):
    pass


def load_request(path: Path) -> dict[str, object]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ParallelPilotRequestError(
            f"cannot read O3-D parallel pilot request: {exc}"
        ) from exc
    if not isinstance(data, dict) or set(data) != EXPECTED_KEYS:
        raise ParallelPilotRequestError("O3-D parallel pilot request fields are not exact")
    if data["schema_version"] != 1 or data["mode"] != MODE:
        raise ParallelPilotRequestError("O3-D parallel pilot request identity is invalid")
    for key in (
        "harness_repository_sha",
        "evidence_repository_sha",
        "release_repository_sha",
    ):
        value = data[key]
        if not isinstance(value, str) or SHA_RE.fullmatch(value) is None:
            raise ParallelPilotRequestError(
                f"{key} must be an exact lowercase 40-hex SHA"
            )
    if data["evidence_repository_sha"] != FROZEN_EVIDENCE_REPOSITORY_SHA:
        raise ParallelPilotRequestError(
            "O3-D evidence_repository_sha drifted from frozen retrospective authority"
        )
    if data["release_repository_sha"] != FROZEN_RELEASE_REPOSITORY_SHA:
        raise ParallelPilotRequestError(
            "O3-D release_repository_sha drifted from frozen retrospective authority"
        )
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
        print("O3D_PARALLEL_REQUEST:VALID")
        print("O3D_HARNESS_SHA:" + str(data["harness_repository_sha"]))
        print("O3D_EVIDENCE_SHA:" + str(data["evidence_repository_sha"]))
        print("O3D_RELEASE_SHA:" + str(data["release_repository_sha"]))
        return 0
    except ParallelPilotRequestError as exc:
        sys.stderr.write(json.dumps({"error": str(exc)}, ensure_ascii=False) + "\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
