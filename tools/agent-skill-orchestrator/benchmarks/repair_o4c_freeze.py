from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.run_scout_cell import CASE_PATH, EVIDENCE_PATH
from benchmarks.score_role_output import fixture_sha256, validate_case
from canonical import canonical_json_bytes
from evidence import evidence_package_sha256, validate_evidence_package


def _read(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path}")
    return value


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate a mechanical O4-C freeze repair candidate without model execution.")
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)

    evidence = _read(EVIDENCE_PATH)
    case = _read(CASE_PATH)
    old_evidence_sha = case["evidence_sha256"]
    old_fixture_sha = case["fixture_sha256"]
    repaired_digests: dict[str, str] = {}

    for source in evidence["sources"]:
        digest = hashlib.sha256(source["content"].encode("utf-8")).hexdigest()
        ref = source["source_ref"]["ref"]
        source["source_ref"]["block_digest"] = digest
        repaired_digests[ref] = digest

    validate_evidence_package(evidence)
    new_evidence_sha = evidence_package_sha256(evidence)
    case["evidence_sha256"] = new_evidence_sha
    case["fixture_sha256"] = fixture_sha256(case)
    validate_case(case)

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    (output / EVIDENCE_PATH.name).write_bytes(canonical_json_bytes(evidence) + b"\n")
    (output / CASE_PATH.name).write_bytes(canonical_json_bytes(case) + b"\n")
    (output / "repair-receipt.json").write_bytes(canonical_json_bytes({
        "schema_version": 1,
        "reason": "PRE_INFERENCE_DERIVED_BLOCK_DIGEST_REPAIR",
        "model_output_count_before_repair": 0,
        "semantic_source_bytes_changed": False,
        "old_evidence_sha256": old_evidence_sha,
        "new_evidence_sha256": new_evidence_sha,
        "old_fixture_sha256": old_fixture_sha,
        "new_fixture_sha256": case["fixture_sha256"],
        "repaired_block_digests": repaired_digests,
    }) + b"\n")
    print("O4C_REPAIR_OLD_EVIDENCE_SHA256:" + old_evidence_sha)
    print("O4C_REPAIR_NEW_EVIDENCE_SHA256:" + new_evidence_sha)
    print("O4C_REPAIR_OLD_FIXTURE_SHA256:" + old_fixture_sha)
    print("O4C_REPAIR_NEW_FIXTURE_SHA256:" + case["fixture_sha256"])
    print("O4C_REPAIR_MODEL_OUTPUT_COUNT:0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
