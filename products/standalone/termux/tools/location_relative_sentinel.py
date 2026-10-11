"""Pure classifier for relocation-sensitive Path(__file__).resolve().parents[N]."""

from __future__ import annotations

import ast
import json
import sys
from pathlib import PurePosixPath
from typing import Any

SCHEMA = "termux-location-relative-sentinel.v1"
MAX_FILES = 64
MAX_PATH_CHARS = 512
MAX_SOURCE_BYTES = 128 * 1024
MAX_TOTAL_SOURCE_BYTES = 512 * 1024
MAX_INPUT_BYTES = 512 * 1024
MAX_AST_NODES = 20_000
MAX_EXPRESSIONS_PER_FILE = 64
MAX_PARENT_INDEX = 256
MAX_FINGERPRINT_CHARS = 2048


class ValidationUnknown(ValueError):
    pass


def _authority_denials() -> dict[str, Any]:
    return {
        "evidence_provenance": "CALLER_SUPPLIED",
        "authenticated_repository_evidence": False,
        "path_resolution_model": "LEXICAL_REPOSITORY_RELATIVE",
        "runtime_symlink_resolution_proven": False,
        "filesystem_source_discovery_used": False,
        "git_used": False,
        "github_used": False,
        "network_used": False,
        "mutation_authorized": False,
        "execution_authorized": False,
        "merge_authorized": False,
        "release_authorized": False,
        "production_authorized": False,
        "runtime_authorized": False,
        "device_authorized": False,
    }


def _contains_surrogate(value: str) -> bool:
    return any(0xD800 <= ord(char) <= 0xDFFF for char in value)


def _has_control(value: str) -> bool:
    return any(ord(char) < 32 or ord(char) == 127 for char in value)


def _repo_path(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS:
        raise ValidationUnknown(f"{field}: expected bounded non-empty path")
    if (
        value != value.strip()
        or value.startswith("/")
        or value.endswith("/")
        or "\\" in value
        or "//" in value
        or "\x00" in value
        or _contains_surrogate(value)
        or _has_control(value)
    ):
        raise ValidationUnknown(f"{field}: noncanonical repository path")
    parts = value.split("/")
    if any(part in {"", ".", ".."} for part in parts):
        raise ValidationUnknown(f"{field}: noncanonical repository path")
    if PurePosixPath(value).as_posix() != value:
        raise ValidationUnknown(f"{field}: noncanonical repository path")
    return value


def _source_text(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise ValidationUnknown(f"{field}: expected source text")
    if "\x00" in value or _contains_surrogate(value):
        raise ValidationUnknown(f"{field}: unusable source text")
    try:
        encoded = value.encode("utf-8", "strict")
    except UnicodeEncodeError as exc:
        raise ValidationUnknown(f"{field}: source is not valid UTF-8 text") from exc
    if len(encoded) > MAX_SOURCE_BYTES:
        raise ValidationUnknown(f"{field}: source exceeds byte limit")
    return value


def _relative_suffix(path: str, root: str, field: str) -> str:
    prefix = root + "/"
    if not path.startswith(prefix):
        raise ValidationUnknown(f"{field}: file must be below declared root")
    suffix = path[len(prefix) :]
    if not suffix:
        raise ValidationUnknown(f"{field}: file suffix missing")
    return suffix


def _literal_integer(node: ast.AST) -> tuple[bool, int | None]:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool):
            return True, None
        if isinstance(node.value, int):
            return True, node.value
        return False, None
    if (
        isinstance(node, ast.UnaryOp)
        and isinstance(node.op, (ast.UAdd, ast.USub))
        and isinstance(node.operand, ast.Constant)
        and isinstance(node.operand.value, int)
        and not isinstance(node.operand.value, bool)
    ):
        value = node.operand.value
        return True, value if isinstance(node.op, ast.UAdd) else -value
    return False, None


def _is_canonical_file_resolve(node: ast.AST) -> bool:
    if not isinstance(node, ast.Call) or node.args or node.keywords:
        return False
    if not isinstance(node.func, ast.Attribute) or node.func.attr != "resolve":
        return False
    path_call = node.func.value
    if (
        not isinstance(path_call, ast.Call)
        or len(path_call.args) != 1
        or path_call.keywords
        or not isinstance(path_call.func, ast.Name)
        or path_call.func.id != "Path"
    ):
        return False
    arg = path_call.args[0]
    return isinstance(arg, ast.Name) and arg.id == "__file__"


def _normalized_line(source: str, node: ast.Subscript) -> str:
    if node.end_lineno is None or node.lineno != node.end_lineno:
        raise ValidationUnknown("multiline fixed-parent expression unsupported")
    lines = source.splitlines()
    if node.lineno < 1 or node.lineno > len(lines):
        raise ValidationUnknown("fixed-parent source location invalid")
    segment = ast.get_source_segment(source, node)
    if not segment or "\n" in segment or "\r" in segment:
        raise ValidationUnknown("fixed-parent source segment unavailable")
    line = lines[node.lineno - 1]
    if line.count(segment) != 1:
        raise ValidationUnknown("fixed-parent containing line is ambiguous")
    normalized = line.replace(
        segment,
        "Path(__file__).resolve().parents[<N>]",
        1,
    ).strip()
    if not normalized or len(normalized) > MAX_FINGERPRINT_CHARS:
        raise ValidationUnknown("fixed-parent line fingerprint invalid")
    return normalized


def _extract_expressions(source: str, field: str) -> list[dict[str, Any]]:
    try:
        tree = ast.parse(source, filename=field, mode="exec")
    except (SyntaxError, ValueError, RecursionError) as exc:
        raise ValidationUnknown(f"{field}: Python syntax unavailable") from exc

    expressions: list[dict[str, Any]] = []
    unsupported: list[str] = []

    node_count = 0
    for node in ast.walk(tree):
        node_count += 1
        if node_count > MAX_AST_NODES:
            raise ValidationUnknown(f"{field}: AST node budget exceeded")
        if not isinstance(node, ast.Subscript):
            continue
        parents_attr = node.value
        if not isinstance(parents_attr, ast.Attribute) or parents_attr.attr != "parents":
            continue

        if not _is_canonical_file_resolve(parents_attr.value):
            unsupported.append("UNSUPPORTED_FIXED_PARENT_BASE")
            continue

        is_literal, index = _literal_integer(node.slice)
        if not is_literal or index is None or index < 0 or index > MAX_PARENT_INDEX:
            unsupported.append("UNSUPPORTED_PARENT_INDEX")
            continue

        expressions.append(
            {
                "line": node.lineno,
                "column": node.col_offset,
                "parent_index": index,
                "fingerprint": _normalized_line(source, node),
            }
        )

    if unsupported:
        raise ValidationUnknown(sorted(unsupported)[0])

    expressions.sort(key=lambda row: (row["line"], row["column"]))
    if len(expressions) > MAX_EXPRESSIONS_PER_FILE:
        raise ValidationUnknown("too many fixed-parent expressions")

    seen: set[str] = set()
    for row in expressions:
        fingerprint = row["fingerprint"]
        if fingerprint in seen:
            raise ValidationUnknown("AMBIGUOUS_FIXED_PARENT_PAIRING")
        seen.add(fingerprint)

    return expressions


def _ancestor_target(file_path: str, parent_index: int, field: str) -> str:
    parts = PurePosixPath(file_path).parts
    directory_parts = parts[:-1]
    if parent_index > len(directory_parts):
        raise ValidationUnknown(f"{field}: parent index escapes repository root")
    keep = len(directory_parts) - parent_index
    if keep == 0:
        return "."
    return "/".join(directory_parts[:keep])


def _within(path: str, root: str) -> bool:
    return path == root or path.startswith(root + "/")


def _expected_target(old_target: str, old_root: str, new_root: str) -> tuple[str, str]:
    if _within(old_target, old_root):
        if old_target == old_root:
            relative = ""
        else:
            relative = old_target[len(old_root) + 1 :]
        mapped = new_root if not relative else f"{new_root}/{relative}"
        return mapped, "MOVED_SUBTREE_TARGET"
    return old_target, "EXTERNAL_TARGET"


def _classify_file(
    item: Any,
    old_root: str,
    new_root: str,
) -> dict[str, Any]:
    try:
        if not isinstance(item, dict) or set(item) != {
            "old_path",
            "new_path",
            "old_source",
            "new_source",
        }:
            raise ValidationUnknown("file item shape invalid")

        old_path = _repo_path(item["old_path"], "old_path")
        new_path = _repo_path(item["new_path"], "new_path")
        if not old_path.endswith(".py") or not new_path.endswith(".py"):
            raise ValidationUnknown("file paths must identify Python source")
        old_suffix = _relative_suffix(old_path, old_root, "old_path")
        new_suffix = _relative_suffix(new_path, new_root, "new_path")
        if old_suffix != new_suffix:
            raise ValidationUnknown("root-relative file suffix changed")

        old_source = _source_text(item["old_source"], "old_source")
        new_source = _source_text(item["new_source"], "new_source")
        old_expressions = _extract_expressions(old_source, "old_source")
        new_expressions = _extract_expressions(new_source, "new_source")

        if len(old_expressions) != len(new_expressions):
            raise ValidationUnknown("MISSING_OR_EXTRA_FIXED_PARENT_EXPRESSION")

        if not old_expressions:
            return {
                "old_path": old_path,
                "new_path": new_path,
                "status": "PASS",
                "reason": "NO_FIXED_PARENT_EXPRESSIONS",
                "expressions": [],
                **_authority_denials(),
            }

        results: list[dict[str, Any]] = []
        for old_expr, new_expr in zip(old_expressions, new_expressions):
            if old_expr["fingerprint"] != new_expr["fingerprint"]:
                raise ValidationUnknown("AMBIGUOUS_FIXED_PARENT_PAIRING")

            old_target = _ancestor_target(
                old_path,
                old_expr["parent_index"],
                "old_source",
            )
            expected_target, target_class = _expected_target(
                old_target,
                old_root,
                new_root,
            )
            candidate_target = _ancestor_target(
                new_path,
                new_expr["parent_index"],
                "new_source",
            )
            status = "PASS" if candidate_target == expected_target else "FAIL"
            results.append(
                {
                    "status": status,
                    "reason": (
                        "PARENT_DEPTH_TARGET_PRESERVED"
                        if status == "PASS"
                        else "PARENT_DEPTH_TARGET_MISMATCH"
                    ),
                    "old_line": old_expr["line"],
                    "new_line": new_expr["line"],
                    "old_parent_index": old_expr["parent_index"],
                    "new_parent_index": new_expr["parent_index"],
                    "old_resolved_target": old_target,
                    "expected_new_target": expected_target,
                    "candidate_new_target": candidate_target,
                    "target_class": target_class,
                }
            )

        status = "FAIL" if any(row["status"] == "FAIL" for row in results) else "PASS"
        return {
            "old_path": old_path,
            "new_path": new_path,
            "status": status,
            "reason": (
                "FIXED_PARENT_TARGET_MISMATCH"
                if status == "FAIL"
                else "FIXED_PARENT_TARGETS_PRESERVED"
            ),
            "expressions": results,
            **_authority_denials(),
        }
    except ValidationUnknown as exc:
        return {
            "status": "UNKNOWN",
            "reason": "INVALID_OR_AMBIGUOUS_FILE_EVIDENCE",
            "error": str(exc),
            **_authority_denials(),
        }


def classify(request: Any) -> dict[str, Any]:
    try:
        if not isinstance(request, dict) or set(request) != {
            "schema",
            "old_root",
            "new_root",
            "files",
        }:
            raise ValidationUnknown("request shape invalid")
        if request.get("schema") != SCHEMA:
            raise ValidationUnknown("schema invalid")

        old_root = _repo_path(request["old_root"], "old_root")
        new_root = _repo_path(request["new_root"], "new_root")
        if old_root == new_root:
            raise ValidationUnknown("old_root and new_root must differ")

        files = request.get("files")
        if (
            not isinstance(files, list)
            or not files
            or len(files) > MAX_FILES
        ):
            raise ValidationUnknown("files must be a bounded non-empty list")

        normalized: list[tuple[str, str, Any]] = []
        old_seen: set[str] = set()
        new_seen: set[str] = set()
        total_source_bytes = 0
        for index, item in enumerate(files):
            if not isinstance(item, dict) or set(item) != {
                "old_path",
                "new_path",
                "old_source",
                "new_source",
            }:
                raise ValidationUnknown("file item shape invalid")
            old_path = item.get("old_path")
            new_path = item.get("new_path")
            if not isinstance(old_path, str) or not isinstance(new_path, str):
                raise ValidationUnknown("file paths must be strings")
            old_source = _source_text(
                item["old_source"],
                f"files[{index}].old_source",
            )
            new_source = _source_text(
                item["new_source"],
                f"files[{index}].new_source",
            )
            total_source_bytes += len(old_source.encode("utf-8", "strict"))
            total_source_bytes += len(new_source.encode("utf-8", "strict"))
            if total_source_bytes > MAX_TOTAL_SOURCE_BYTES:
                raise ValidationUnknown("total source evidence exceeds byte limit")
            if old_path in old_seen or new_path in new_seen:
                raise ValidationUnknown("duplicate file path evidence")
            old_seen.add(old_path)
            new_seen.add(new_path)
            normalized.append((old_path, new_path, item))

        normalized.sort(key=lambda row: (row[0], row[1]))
        results = [
            _classify_file(item, old_root, new_root)
            for _, _, item in normalized
        ]

        if any(row["status"] == "UNKNOWN" for row in results):
            status = "UNKNOWN"
        elif any(row["status"] == "FAIL" for row in results):
            status = "FAIL"
        else:
            status = "PASS"

        return {
            "schema": SCHEMA,
            "status": status,
            "reason": f"BATCH_{status}",
            "old_root": old_root,
            "new_root": new_root,
            "files": results,
            **_authority_denials(),
        }
    except ValidationUnknown as exc:
        return {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "BATCH_INVALID",
            "error": str(exc),
            "files": [],
            **_authority_denials(),
        }


def _reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise ValidationUnknown("duplicate JSON key")
        result[key] = value
    return result


def _read_stdin() -> str:
    raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
    if len(raw) > MAX_INPUT_BYTES:
        raise ValidationUnknown("input exceeds byte limit")
    try:
        return raw.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise ValidationUnknown("input is not UTF-8") from exc


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if args:
        output = {
            "schema": SCHEMA,
            "status": "UNKNOWN",
            "reason": "CLI_ARGUMENT_INVALID",
            "files": [],
            **_authority_denials(),
        }
    else:
        try:
            request = json.loads(
                _read_stdin(),
                object_pairs_hook=_reject_duplicate_keys,
            )
            output = classify(request)
        except (json.JSONDecodeError, ValidationUnknown) as exc:
            output = {
                "schema": SCHEMA,
                "status": "UNKNOWN",
                "reason": "INPUT_INVALID",
                "error": str(exc),
                "files": [],
                **_authority_denials(),
            }

    print(json.dumps(output, sort_keys=True, separators=(",", ":")))
    return 2 if output["status"] == "UNKNOWN" else (1 if output["status"] == "FAIL" else 0)


if __name__ == "__main__":
    raise SystemExit(main())
