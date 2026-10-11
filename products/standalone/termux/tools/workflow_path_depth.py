#!/usr/bin/env python3
"""Read-only checker for workflow-relative path stability across relocations."""

from __future__ import annotations

import json
import os
import posixpath
import sys
from pathlib import Path, PurePosixPath
from typing import Any

SCHEMA = "termux-workflow-path-depth.v1"
MAX_REFERENCES = 64
MAX_PATH_CHARS = 512
MAX_INPUT_BYTES = 64 * 1024


class ValidationUnknown(ValueError):
    pass


def _contains_surrogate(value: str) -> bool:
    return any(0xD800 <= ord(char) <= 0xDFFF for char in value)


def _repo_root(value: Any) -> Path:
    if not isinstance(value, str) or not value or chr(0) in value or _contains_surrogate(value):
        raise ValidationUnknown("repo_root: expected usable absolute path")
    root = Path(value)
    if not root.is_absolute():
        raise ValidationUnknown("repo_root: expected absolute path")
    try:
        resolved = root.resolve(strict=True)
    except (OSError, RuntimeError) as exc:
        raise ValidationUnknown("repo_root: unavailable") from exc
    if not resolved.is_dir():
        raise ValidationUnknown("repo_root: expected directory")
    return resolved


def _name_max(repo_root: Path) -> int:
    try:
        value = int(os.pathconf(repo_root, "PC_NAME_MAX"))
    except (OSError, ValueError) as exc:
        raise ValidationUnknown("repo_root: NAME_MAX unavailable") from exc
    if value < 1:
        raise ValidationUnknown("repo_root: invalid NAME_MAX")
    return value


def _validate_component_bytes(parts: list[str] | tuple[str, ...], name_max: int, field: str) -> None:
    for part in parts:
        if part == "..":
            continue
        try:
            encoded = part.encode("utf-8", "strict")
        except UnicodeEncodeError as exc:
            raise ValidationUnknown(f"{field}: unusable Unicode component") from exc
        if len(encoded) > name_max:
            raise ValidationUnknown(
                f"{field}: component exceeds filesystem NAME_MAX"
            )


def _tree_proof(value: Any, working_dir: str, field: str) -> None:
    parts = PurePosixPath(working_dir).parts
    if not isinstance(value, list) or len(value) != len(parts):
        raise ValidationUnknown(f"{field}: complete tree proof required")
    current: list[str] = []
    for index, (row, part) in enumerate(zip(value, parts)):
        current.append(part)
        expected_path = "/".join(current)
        if not isinstance(row, dict) or set(row) != {"path", "mode", "type"}:
            raise ValidationUnknown(f"{field}[{index}]: invalid tree proof row")
        if row["path"] != expected_path:
            raise ValidationUnknown(f"{field}[{index}]: tree proof path mismatch")
        if row["mode"] != "040000" or row["type"] != "tree":
            raise ValidationUnknown(
                f"{field}[{index}]: symlink or non-tree directory component"
            )


def _repo_dir(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS:
        raise ValidationUnknown(f"{field}: expected bounded non-empty path")
    if (
        value != value.strip()
        or value.startswith("/")
        or value.endswith("/")
        or chr(0) in value
        or _contains_surrogate(value)
    ):
        raise ValidationUnknown(f"{field}: noncanonical repository directory")
    if "\\" in value or "//" in value:
        raise ValidationUnknown(f"{field}: noncanonical repository directory")
    parts = PurePosixPath(value).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise ValidationUnknown(f"{field}: noncanonical repository directory")
    if PurePosixPath(value).as_posix() != value:
        raise ValidationUnknown(f"{field}: noncanonical repository directory")
    return value


def _relative_ref(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS:
        raise ValidationUnknown(f"{field}: expected bounded non-empty relative path")
    if (
        value != value.strip()
        or value.startswith("/")
        or chr(0) in value
        or _contains_surrogate(value)
    ):
        raise ValidationUnknown(f"{field}: expected canonical relative path")
    if "\\" in value or "//" in value:
        raise ValidationUnknown(f"{field}: expected canonical POSIX relative path")
    if value.endswith("/") or value == ".":
        raise ValidationUnknown(f"{field}: expected file-like relative path")
    parts = value.split("/")
    if any(part in {"", "."} for part in parts):
        raise ValidationUnknown(f"{field}: expected canonical relative path")
    seen_path_component = False
    for part in parts:
        if part == "..":
            if seen_path_component:
                raise ValidationUnknown(
                    f"{field}: parent traversal after path component is unsupported"
                )
        else:
            seen_path_component = True
    if not seen_path_component:
        raise ValidationUnknown(f"{field}: expected file-like path component")
    return value


def _resolve_repo_target(working_dir: str, reference: str) -> str:
    stack = list(PurePosixPath(working_dir).parts)
    for part in reference.split("/"):
        if part == "..":
            if not stack:
                raise ValidationUnknown("reference escapes repository root")
            stack.pop()
        else:
            stack.append(part)
    if not stack:
        raise ValidationUnknown("reference resolves to repository root")
    return "/".join(stack)


def _relative_to_target(working_dir: str, target: str) -> str:
    relative = posixpath.relpath(target, start=working_dir)
    if relative.startswith("/"):
        raise ValidationUnknown("computed reference is not relative")
    return _relative_ref(relative, "expected_new_reference")


def check_reference(
    item: Any,
    repo_root: Path | None = None,
    name_max: int | None = None,
) -> dict[str, Any]:
    try:
        if not isinstance(item, dict) or set(item) != {
            "old_working_dir",
            "new_working_dir",
            "old_reference",
            "candidate_new_reference",
            "old_working_dir_tree_proof",
            "new_working_dir_tree_proof",
        }:
            raise ValidationUnknown("request shape invalid")
        if repo_root is None or name_max is None:
            raise ValidationUnknown("repo_root filesystem evidence required")
        old_dir = _repo_dir(item["old_working_dir"], "old_working_dir")
        new_dir = _repo_dir(item["new_working_dir"], "new_working_dir")
        old_ref = _relative_ref(item["old_reference"], "old_reference")
        new_ref = _relative_ref(
            item["candidate_new_reference"], "candidate_new_reference"
        )
        _validate_component_bytes(
            PurePosixPath(old_dir).parts, name_max, "old_working_dir"
        )
        _validate_component_bytes(
            PurePosixPath(new_dir).parts, name_max, "new_working_dir"
        )
        _validate_component_bytes(old_ref.split("/"), name_max, "old_reference")
        _validate_component_bytes(
            new_ref.split("/"), name_max, "candidate_new_reference"
        )
        _tree_proof(
            item["old_working_dir_tree_proof"],
            old_dir,
            "old_working_dir_tree_proof",
        )
        _tree_proof(
            item["new_working_dir_tree_proof"],
            new_dir,
            "new_working_dir_tree_proof",
        )

        target = _resolve_repo_target(old_dir, old_ref)
        expected = _relative_to_target(new_dir, target)
        candidate_target = _resolve_repo_target(new_dir, new_ref)
        status = (
            "PASS"
            if new_ref == expected and candidate_target == target
            else "FAIL"
        )
        reason = (
            "SAME_REPOSITORY_TARGET"
            if status == "PASS"
            else "RELOCATED_REFERENCE_MISMATCH"
        )
        return {
            "schema": SCHEMA,
            "status": status,
            "reason": reason,
            "old_working_dir": old_dir,
            "new_working_dir": new_dir,
            "old_reference": old_ref,
            "candidate_new_reference": new_ref,
            "resolved_target": target,
            "expected_new_reference": expected,
            "candidate_resolved_target": candidate_target,
            "filesystem_name_max_bytes": name_max,
            "working_directory_tree_proof": "SUPPLIED_EVIDENCE_ACCEPTED",
            "working_dir_depth_delta": (
                len(PurePosixPath(new_dir).parts)
                - len(PurePosixPath(old_dir).parts)
            ),
            "mutation_authorized": False,
            "execution_authorized": False,
            "network_used": False,
            "github_used": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
            "runtime_authorized": False,
            "device_authorized": False,
        }
    except ValidationUnknown as exc:
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "INVALID_OR_AMBIGUOUS_INPUT",
            "error": str(exc),
            "mutation_authorized": False,
            "execution_authorized": False,
            "network_used": False,
            "github_used": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
            "runtime_authorized": False,
            "device_authorized": False,
        }


def check_batch(request: Any) -> dict[str, Any]:
    if (
        not isinstance(request, dict)
        or set(request) != {"schema", "repo_root", "references"}
        or request.get("schema") != SCHEMA
        or not isinstance(request.get("references"), list)
        or not request["references"]
        or len(request["references"]) > MAX_REFERENCES
    ):
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "BATCH_INVALID",
            "results": [],
            "mutation_authorized": False,
            "execution_authorized": False,
            "network_used": False,
            "github_used": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
            "runtime_authorized": False,
            "device_authorized": False,
        }

    try:
        repo_root = _repo_root(request["repo_root"])
        name_max = _name_max(repo_root)
    except ValidationUnknown as exc:
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "BATCH_INVALID",
            "error": str(exc),
            "results": [],
            "mutation_authorized": False,
            "execution_authorized": False,
            "network_used": False,
            "github_used": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
            "runtime_authorized": False,
            "device_authorized": False,
        }

    results = [
        check_reference(item, repo_root, name_max)
        for item in request["references"]
    ]
    order = {"UNKNOWN": 2, "FAIL": 1, "PASS": 0}
    status = max((row["status"] for row in results), key=lambda x: order[x], default="PASS")
    return {
        "schema": SCHEMA,
        "status": status,
        "reason": f"BATCH_{status}",
        "results": results,
        "mutation_authorized": False,
        "execution_authorized": False,
        "network_used": False,
        "github_used": False,
        "merge_authorized": False,
        "release_authorized": False,
        "production_authorized": False,
        "runtime_authorized": False,
        "device_authorized": False,
    }


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValidationUnknown("duplicate JSON key")
        result[key] = value
    return result


def _read_cli_input(args: list[str]) -> str:
    if args:
        with open(args[0], "rb") as handle:
            raw = handle.read(MAX_INPUT_BYTES + 1)
    else:
        raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        raise ValidationUnknown("input exceeds byte limit")
    return raw.decode("utf-8", "strict")


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) > 1:
        output = {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "CLI_ARGUMENT_INVALID",
            "results": [],
            "mutation_authorized": False,
            "execution_authorized": False,
            "network_used": False,
            "github_used": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
            "runtime_authorized": False,
            "device_authorized": False,
        }
    else:
        try:
            text = _read_cli_input(args)
            output = check_batch(
                json.loads(text, object_pairs_hook=_reject_duplicate_keys)
            )
        except Exception as exc:
            output = {
                "schema": SCHEMA,
                "status": "UNKNOWN",
                "reason": "INPUT_INVALID",
                "error": str(exc),
                "results": [],
                "mutation_authorized": False,
                "execution_authorized": False,
                "network_used": False,
                "github_used": False,
                "merge_authorized": False,
                "release_authorized": False,
                "production_authorized": False,
                "runtime_authorized": False,
                "device_authorized": False,
            }
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 2 if output["status"] == "UNKNOWN" else (1 if output["status"] == "FAIL" else 0)


if __name__ == "__main__":
    raise SystemExit(main())
