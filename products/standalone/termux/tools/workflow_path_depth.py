#!/usr/bin/env python3
"""Read-only checker for workflow-relative path stability across relocations."""

from __future__ import annotations

import json
import os
import posixpath
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any

SCHEMA = "termux-workflow-path-depth.v1"
MAX_REFERENCES = 64
MAX_PATH_CHARS = 512
MAX_INPUT_BYTES = 64 * 1024
MAX_GIT_OUTPUT_BYTES = 64 * 1024
MAX_DISTINCT_TREE_LOOKUPS = 256
MAX_DISTINCT_OBJECT_TYPE_LOOKUPS = 512
OID_RE = re.compile(r"^[0-9a-fA-F]+$")
REGULAR_BLOB_MODES = {"100644", "100755"}
GIT_ENV_CLEAR = {
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_COMMON_DIR",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
    "GIT_NAMESPACE",
    "GIT_CEILING_DIRECTORIES",
    "GIT_DISCOVERY_ACROSS_FILESYSTEM",
    "GIT_EXTERNAL_DIFF",
    "GIT_DIFF_OPTS",
    "GIT_CONFIG_COUNT",
    "GIT_CONFIG_PARAMETERS",
    "GIT_GLOB_PATHSPECS",
    "GIT_NOGLOB_PATHSPECS",
    "GIT_LITERAL_PATHSPECS",
    "GIT_ICASE_PATHSPECS",
}


class ValidationUnknown(ValueError):
    pass


def _authority_denials() -> dict[str, bool]:
    return {
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


def _contains_surrogate(value: str) -> bool:
    return any(0xD800 <= ord(char) <= 0xDFFF for char in value)


def _repo_root(value: Any) -> Path:
    if (
        not isinstance(value, str)
        or not value
        or len(value) > 4096
        or chr(0) in value
        or _contains_surrogate(value)
    ):
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


def _git_env() -> dict[str, str]:
    env = os.environ.copy()
    for key in list(env):
        if (
            key in GIT_ENV_CLEAR
            or key.startswith("GIT_CONFIG_KEY_")
            or key.startswith("GIT_CONFIG_VALUE_")
            or key.startswith("GIT_TRACE")
        ):
            env.pop(key, None)
    env["GIT_NO_LAZY_FETCH"] = "1"
    env["GIT_NO_REPLACE_OBJECTS"] = "1"
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_OPTIONAL_LOCKS"] = "0"
    env["GIT_LITERAL_PATHSPECS"] = "1"
    return env


def _git(repo: Path, *args: str) -> bytes:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=_git_env(),
        check=False,
    )
    if len(proc.stdout) > MAX_GIT_OUTPUT_BYTES or len(proc.stderr) > MAX_GIT_OUTPUT_BYTES:
        raise ValidationUnknown(f"git {' '.join(args)}: output exceeds bound")
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace").strip()
        raise ValidationUnknown(
            f"git {' '.join(args)} failed: {err or 'unknown error'}"
        )
    return proc.stdout


def _decode_utf8(payload: bytes, field: str) -> str:
    try:
        return payload.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise ValidationUnknown(f"{field}: non-UTF-8 Git evidence") from exc


def _validate_repository(repo: Path) -> None:
    inside = _decode_utf8(
        _git(repo, "rev-parse", "--is-inside-work-tree"),
        "repo_root",
    ).strip()
    if inside != "true":
        raise ValidationUnknown("repo_root: not a Git work tree")
    top = Path(
        _decode_utf8(
            _git(repo, "rev-parse", "--show-toplevel"),
            "repo_root",
        ).strip()
    ).resolve()
    if top != repo:
        raise ValidationUnknown("repo_root: expected exact Git work-tree root")


def _object_type(
    repo: Path,
    oid: str,
    cache: dict[str, str],
    attempted: set[str],
) -> str:
    cached = cache.get(oid)
    if cached is not None:
        return cached
    if oid in attempted:
        raise ValidationUnknown(f"object type unavailable: {oid}")
    if len(attempted) >= MAX_DISTINCT_OBJECT_TYPE_LOOKUPS:
        raise ValidationUnknown("distinct Git object-type lookup budget exhausted")
    attempted.add(oid)
    object_type = _decode_utf8(
        _git(repo, "cat-file", "-t", oid),
        "git object type",
    ).strip()
    if object_type not in {"blob", "tree", "commit", "tag"}:
        raise ValidationUnknown(f"unexpected Git object type: {object_type}")
    cache[oid] = object_type
    return object_type


def _require_object_type(
    repo: Path,
    oid: str,
    expected: str,
    cache: dict[str, str],
    attempted: set[str],
    field: str,
) -> None:
    actual = _object_type(repo, oid, cache, attempted)
    if actual != expected:
        raise ValidationUnknown(
            f"{field}: expected Git object type {expected}, got {actual}"
        )


def _object_format(repo: Path) -> tuple[str, int]:
    value = _decode_utf8(
        _git(repo, "rev-parse", "--show-object-format"),
        "repo object format",
    ).strip()
    lengths = {"sha1": 40, "sha256": 64}
    if value not in lengths:
        raise ValidationUnknown(f"unsupported Git object format: {value}")
    return value, lengths[value]


def _resolve_commit(
    repo: Path,
    value: Any,
    field: str,
    oid_length: int,
    object_types: dict[str, str],
    object_attempts: set[str],
) -> str:
    if (
        not isinstance(value, str)
        or len(value) != oid_length
        or not OID_RE.fullmatch(value)
    ):
        raise ValidationUnknown(
            f"{field}: expected full {oid_length}-hex commit object ID"
        )
    oid = value.lower()
    _require_object_type(
        repo,
        oid,
        "commit",
        object_types,
        object_attempts,
        field,
    )
    return oid


def _name_max(repo_root: Path) -> int:
    try:
        value = int(os.pathconf(repo_root, "PC_NAME_MAX"))
    except (OSError, ValueError) as exc:
        raise ValidationUnknown("repo_root: NAME_MAX unavailable") from exc
    if value < 1:
        raise ValidationUnknown("repo_root: invalid NAME_MAX")
    return value


def _reject_git_reserved_components(
    parts: list[str] | tuple[str, ...],
    field: str,
) -> None:
    for part in parts:
        if part != ".." and part.casefold() == ".git":
            raise ValidationUnknown(f"{field}: Git-reserved .git component")


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
    _reject_git_reserved_components(parts, field)
    return value


def _relative_ref(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS:
        raise ValidationUnknown(f"{field}: expected bounded non-empty relative path")
    if (
        value != value.strip()
        or value.startswith("/")
        or value.endswith("/")
        or value == "."
        or chr(0) in value
        or _contains_surrogate(value)
    ):
        raise ValidationUnknown(f"{field}: expected canonical relative path")
    if "\\" in value or "//" in value:
        raise ValidationUnknown(f"{field}: expected canonical POSIX relative path")
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
    _reject_git_reserved_components(parts, field)
    return value


def _validate_component_bytes(
    parts: list[str] | tuple[str, ...],
    name_max: int,
    field: str,
) -> None:
    for part in parts:
        if part == "..":
            continue
        try:
            encoded = part.encode("utf-8", "strict")
        except UnicodeEncodeError as exc:
            raise ValidationUnknown(f"{field}: unusable Unicode component") from exc
        if len(encoded) > name_max:
            raise ValidationUnknown(f"{field}: component exceeds filesystem NAME_MAX")


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


def _tree_entry(
    repo: Path,
    commit_oid: str,
    path: str,
    cache: dict[tuple[str, str], dict[str, str] | None],
    attempted: set[tuple[str, str]],
    allow_missing: bool = False,
) -> dict[str, str] | None:
    key = (commit_oid, path)
    if key in cache:
        cached = cache[key]
        if cached is None:
            if allow_missing:
                return None
            raise ValidationUnknown(f"tree entry unavailable: {path}")
        return cached
    if key in attempted:
        raise ValidationUnknown(f"tree entry unavailable or ambiguous: {path}")
    if len(attempted) >= MAX_DISTINCT_TREE_LOOKUPS:
        raise ValidationUnknown("distinct Git tree lookup budget exhausted")
    attempted.add(key)
    raw = _git(repo, "ls-tree", "-z", commit_oid, "--", path)
    records = [record for record in raw.split(b"\0") if record]
    if not records:
        cache[key] = None
        if allow_missing:
            return None
        raise ValidationUnknown(f"tree entry unavailable: {path}")
    if len(records) != 1:
        raise ValidationUnknown(f"tree entry ambiguous: {path}")
    try:
        meta, raw_name = records[0].split(b"\t", 1)
        mode, object_type, oid = _decode_utf8(
            meta, "git ls-tree metadata"
        ).split(" ", 2)
    except ValueError as exc:
        raise ValidationUnknown(f"malformed tree entry: {path}") from exc
    name = _decode_utf8(raw_name, "git ls-tree path")
    if name != path or not OID_RE.fullmatch(oid):
        raise ValidationUnknown(f"unexpected tree entry identity: {path}")
    entry = {
        "mode": mode,
        "type": object_type,
        "oid": oid.lower(),
    }
    cache[key] = entry
    return entry


def _verify_directory_prefixes(
    repo: Path,
    commit_oid: str,
    directory: str,
    field: str,
    cache: dict[tuple[str, str], dict[str, str] | None],
    attempted: set[tuple[str, str]],
    object_types: dict[str, str],
    object_attempts: set[str],
) -> None:
    current: list[str] = []
    for part in PurePosixPath(directory).parts:
        current.append(part)
        path = "/".join(current)
        entry = _tree_entry(repo, commit_oid, path, cache, attempted)
        if entry["mode"] != "040000" or entry["type"] != "tree":
            raise ValidationUnknown(f"{field}: symlink or non-tree component: {path}")
        _require_object_type(
            repo,
            entry["oid"],
            "tree",
            object_types,
            object_attempts,
            field,
        )


def _verify_regular_target(
    repo: Path,
    commit_oid: str,
    target: str,
    field: str,
    cache: dict[tuple[str, str], dict[str, str] | None],
    attempted: set[tuple[str, str]],
    object_types: dict[str, str],
    object_attempts: set[str],
) -> dict[str, str]:
    parts = PurePosixPath(target).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise ValidationUnknown(f"{field}: noncanonical target")
    current: list[str] = []
    for part in parts[:-1]:
        current.append(part)
        path = "/".join(current)
        entry = _tree_entry(repo, commit_oid, path, cache, attempted)
        if entry["mode"] != "040000" or entry["type"] != "tree":
            raise ValidationUnknown(f"{field}: symlink or non-tree target component: {path}")
        _require_object_type(
            repo,
            entry["oid"],
            "tree",
            object_types,
            object_attempts,
            field,
        )
    final = _tree_entry(repo, commit_oid, target, cache, attempted)
    if final["type"] != "blob" or final["mode"] not in REGULAR_BLOB_MODES:
        raise ValidationUnknown(f"{field}: target is not a regular file")
    _require_object_type(
        repo,
        final["oid"],
        "blob",
        object_types,
        object_attempts,
        field,
    )
    return final


def _verify_candidate_target(
    repo: Path,
    commit_oid: str,
    target: str,
    field: str,
    cache: dict[tuple[str, str], dict[str, str] | None],
    attempted: set[tuple[str, str]],
    object_types: dict[str, str],
    object_attempts: set[str],
) -> dict[str, str] | None:
    parts = PurePosixPath(target).parts
    if not parts or any(part in {"", ".", ".."} for part in parts):
        raise ValidationUnknown(f"{field}: noncanonical target")
    current: list[str] = []
    for part in parts[:-1]:
        current.append(part)
        path = "/".join(current)
        entry = _tree_entry(
            repo,
            commit_oid,
            path,
            cache,
            attempted,
            allow_missing=True,
        )
        if entry is None:
            return None
        if entry["mode"] != "040000" or entry["type"] != "tree":
            raise ValidationUnknown(
                f"{field}: symlink or non-tree target component: {path}"
            )
        _require_object_type(
            repo,
            entry["oid"],
            "tree",
            object_types,
            object_attempts,
            field,
        )
    final = _tree_entry(
        repo,
        commit_oid,
        target,
        cache,
        attempted,
        allow_missing=True,
    )
    if final is None:
        return None
    if final["type"] != "blob" or final["mode"] not in REGULAR_BLOB_MODES:
        raise ValidationUnknown(f"{field}: target is not a regular file")
    _require_object_type(
        repo,
        final["oid"],
        "blob",
        object_types,
        object_attempts,
        field,
    )
    return final


def check_reference(
    item: Any,
    repo: Path | None = None,
    old_oid: str | None = None,
    new_oid: str | None = None,
    name_max: int | None = None,
    tree_cache: dict[tuple[str, str], dict[str, str] | None] | None = None,
    tree_attempts: set[tuple[str, str]] | None = None,
    object_types: dict[str, str] | None = None,
    object_attempts: set[str] | None = None,
) -> dict[str, Any]:
    try:
        if not isinstance(item, dict) or set(item) != {
            "old_working_dir",
            "new_working_dir",
            "old_reference",
            "candidate_new_reference",
        }:
            raise ValidationUnknown("request shape invalid")
        if repo is None or old_oid is None or new_oid is None or name_max is None:
            raise ValidationUnknown("authenticated Git evidence required")
        if tree_cache is None:
            tree_cache = {}
        if tree_attempts is None:
            tree_attempts = set()
        if object_types is None:
            object_types = {}
        if object_attempts is None:
            object_attempts = set()

        old_dir = _repo_dir(item["old_working_dir"], "old_working_dir")
        new_dir = _repo_dir(item["new_working_dir"], "new_working_dir")
        old_ref = _relative_ref(item["old_reference"], "old_reference")
        new_ref = _relative_ref(
            item["candidate_new_reference"],
            "candidate_new_reference",
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

        _verify_directory_prefixes(
            repo,
            old_oid,
            old_dir,
            "old_working_dir",
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )
        _verify_directory_prefixes(
            repo,
            new_oid,
            new_dir,
            "new_working_dir",
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )

        target = _resolve_repo_target(old_dir, old_ref)
        expected = _relative_to_target(new_dir, target)
        _validate_component_bytes(
            expected.split("/"), name_max, "expected_new_reference"
        )
        candidate_target = _resolve_repo_target(new_dir, new_ref)

        old_target_entry = _verify_regular_target(
            repo,
            old_oid,
            target,
            "old_target",
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )
        new_target_entry = _verify_regular_target(
            repo,
            new_oid,
            target,
            "new_target",
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )
        candidate_target_entry = _verify_candidate_target(
            repo,
            new_oid,
            candidate_target,
            "candidate_target",
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )

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
            "working_dir_depth_delta": (
                len(PurePosixPath(new_dir).parts)
                - len(PurePosixPath(old_dir).parts)
            ),
            "filesystem_name_max_bytes": name_max,
            "tree_evidence": "AUTHENTICATED_LOCAL_GIT",
            "old_target_blob": old_target_entry["oid"],
            "new_target_blob": new_target_entry["oid"],
            "candidate_target_blob": (
                candidate_target_entry["oid"]
                if candidate_target_entry is not None
                else None
            ),
            **_authority_denials(),
        }
    except ValidationUnknown as exc:
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "INVALID_OR_AMBIGUOUS_INPUT",
            "error": str(exc),
            **_authority_denials(),
        }


def check_batch(request: Any) -> dict[str, Any]:
    if (
        not isinstance(request, dict)
        or set(request) != {
            "schema",
            "repo_root",
            "old_ref",
            "new_ref",
            "references",
        }
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
            **_authority_denials(),
        }

    object_types: dict[str, str] = {}
    object_attempts: set[str] = set()
    try:
        repo = _repo_root(request["repo_root"])
        _validate_repository(repo)
        object_format, oid_length = _object_format(repo)
        old_oid = _resolve_commit(
            repo,
            request["old_ref"],
            "old_ref",
            oid_length,
            object_types,
            object_attempts,
        )
        new_oid = _resolve_commit(
            repo,
            request["new_ref"],
            "new_ref",
            oid_length,
            object_types,
            object_attempts,
        )
        name_max = _name_max(repo)
    except ValidationUnknown as exc:
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "BATCH_INVALID",
            "error": str(exc),
            "results": [],
            **_authority_denials(),
        }

    tree_cache: dict[tuple[str, str], dict[str, str] | None] = {}
    tree_attempts: set[tuple[str, str]] = set()
    results = [
        check_reference(
            item,
            repo,
            old_oid,
            new_oid,
            name_max,
            tree_cache,
            tree_attempts,
            object_types,
            object_attempts,
        )
        for item in request["references"]
    ]
    order = {"UNKNOWN": 2, "FAIL": 1, "PASS": 0}
    status = max((row["status"] for row in results), key=lambda x: order[x])
    return {
        "schema": SCHEMA,
        "status": status,
        "reason": f"BATCH_{status}",
        "old_ref": request["old_ref"],
        "new_ref": request["new_ref"],
        "object_format": object_format,
        "oid_length": oid_length,
        "old_oid": old_oid,
        "new_oid": new_oid,
        "results": results,
        "git_read_only_used": True,
        **_authority_denials(),
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
            **_authority_denials(),
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
                **_authority_denials(),
            }
    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 2 if output["status"] == "UNKNOWN" else (1 if output["status"] == "FAIL" else 0)


if __name__ == "__main__":
    raise SystemExit(main())
