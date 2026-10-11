#!/usr/bin/env python3
"""Read-only validator for bounded Termux child-path migrations."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any


SCHEMA = "termux-migration-plan.v1"
MAX_CHANGED_FILES = 1000
MAX_RENAME_CANDIDATES = 2000
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
}
OID_RE = re.compile(r"^[0-9a-fA-F]{40,64}$")
PARENT_DEPTH_RE = re.compile(r"Path\(__file__\)\.resolve\(\)\.parents\[(\d+)\]")
UPWARD_CHAIN_RE = re.compile(r"(?:\.\./){2,}")


class ValidationUnknown(RuntimeError):
    pass


def _decode_utf8(payload: bytes, context: str) -> str:
    try:
        return payload.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise ValidationUnknown(f"{context}: non-UTF-8 evidence") from exc


def _norm_repo_path(value: str, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValidationUnknown(f"{field}: expected non-empty repository-relative path")
    if value != value.strip() or "\\" in value:
        raise ValidationUnknown(f"{field}: noncanonical repository path: {value!r}")
    if value.startswith("/") or value.endswith("/"):
        raise ValidationUnknown(f"{field}: noncanonical repository path: {value!r}")
    p = PurePosixPath(value)
    if (
        p.is_absolute()
        or ".." in p.parts
        or "." in p.parts
        or not p.parts
        or p.as_posix() != value
    ):
        raise ValidationUnknown(f"{field}: invalid repository-relative path: {value!r}")
    return value


def _norm_scope(value: str, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValidationUnknown(f"{field}: expected non-empty scope")
    if value.endswith("/**"):
        return _norm_repo_path(value[:-3], field) + "/**"
    return _norm_repo_path(value, field)


def _validate_plan(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValidationUnknown("plan: expected JSON object")
    if raw.get("schema") != SCHEMA:
        raise ValidationUnknown(f"plan.schema: expected {SCHEMA!r}")

    old_root = _norm_repo_path(raw.get("old_root"), "old_root")
    new_root = _norm_repo_path(raw.get("new_root"), "new_root")
    if old_root == new_root:
        raise ValidationUnknown("old_root and new_root must differ")

    scopes = raw.get("authorized_paths")
    if not isinstance(scopes, list) or not scopes:
        raise ValidationUnknown("authorized_paths: expected non-empty list")
    scopes = [_norm_scope(x, "authorized_paths[]") for x in scopes]

    count = raw.get("expected_changed_file_count")
    if (
        type(count) is not int
        or count < 1
        or count > MAX_CHANGED_FILES
    ):
        raise ValidationUnknown(
            f"expected_changed_file_count: expected integer in 1..{MAX_CHANGED_FILES}"
        )

    def rel_list(name: str) -> list[str]:
        value = raw.get(name, [])
        if not isinstance(value, list):
            raise ValidationUnknown(f"{name}: expected list")
        return [_norm_repo_path(x, f"{name}[]") for x in value]

    scan_paths = raw.get("scan_paths", [])
    if not isinstance(scan_paths, list):
        raise ValidationUnknown("scan_paths: expected list")
    scan_paths = [_norm_repo_path(x, "scan_paths[]") for x in scan_paths]

    return {
        "schema": SCHEMA,
        "old_root": old_root,
        "new_root": new_root,
        "authorized_paths": scopes,
        "expected_changed_file_count": count,
        "content_edit_relpaths": rel_list("content_edit_relpaths"),
        "allowed_old_root_relpaths": rel_list("allowed_old_root_relpaths"),
        "allow_old_root_reference_paths": rel_list("allow_old_root_reference_paths"),
        "scan_paths": scan_paths,
    }


def _git(repo: Path, *args: str, text: bool = True) -> str | bytes:
    env = os.environ.copy()
    for key in list(env):
        if (
            key in GIT_ENV_CLEAR
            or key.startswith("GIT_CONFIG_KEY_")
            or key.startswith("GIT_CONFIG_VALUE_")
        ):
            env.pop(key, None)
    env["GIT_NO_LAZY_FETCH"] = "1"
    env["GIT_NO_REPLACE_OBJECTS"] = "1"
    env["GIT_TERMINAL_PROMPT"] = "0"
    env["GIT_OPTIONAL_LOCKS"] = "0"
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace").strip()
        raise ValidationUnknown(f"git {' '.join(args)} failed: {err or 'unknown error'}")
    if text:
        return _decode_utf8(proc.stdout, f"git {' '.join(args)} output")
    return proc.stdout


def _resolve_commit(repo: Path, ref: str, field: str) -> str:
    if not isinstance(ref, str) or not ref.strip():
        raise ValidationUnknown(f"{field}: expected non-empty Git ref")
    ref = ref.strip()
    if ref.startswith("-") or "\x00" in ref:
        raise ValidationUnknown(f"{field}: unsafe Git ref")
    oid = str(
        _git(
            repo,
            "rev-parse",
            "--verify",
            "--end-of-options",
            f"{ref}^{{commit}}",
        )
    ).strip()
    if not OID_RE.fullmatch(oid):
        raise ValidationUnknown(f"{field}: Git did not resolve a commit object ID")
    return oid.lower()


def _zlist(payload: bytes, context: str) -> list[str]:
    values = []
    for item in payload.split(b"\0"):
        if item:
            values.append(_decode_utf8(item, context))
    return values


def _diff_changes(repo: Path, base_oid: str, head_oid: str) -> list[dict[str, Any]]:
    tokens = _zlist(
        _git(
            repo,
            "diff",
            "--find-renames=20%",
            f"-l{MAX_RENAME_CANDIDATES}",
            "--no-ext-diff",
            "--name-status",
            "-z",
            base_oid,
            head_oid,
            "--",
            text=False,
        ),
        "git diff path",
    )
    changes: list[dict[str, Any]] = []
    index = 0
    while index < len(tokens):
        status = tokens[index]
        index += 1
        if not status or status[0] not in "ACDMRTUXB":
            raise ValidationUnknown(f"git diff: unsupported status record {status!r}")
        path_count = 2 if status[0] in {"R", "C"} else 1
        if index + path_count > len(tokens):
            raise ValidationUnknown("git diff: truncated name-status record")
        paths = tokens[index : index + path_count]
        index += path_count
        changes.append(
            {"status": status, "paths": paths, "logical_path": paths[-1]}
        )
    return changes


def _tree_files(repo: Path, ref_oid: str, root: str) -> list[str]:
    out = _zlist(
        _git(
            repo,
            "ls-tree",
            "-r",
            "--name-only",
            "-z",
            ref_oid,
            "--",
            root,
            text=False,
        ),
        "git ls-tree path",
    )
    prefix = root.rstrip("/") + "/"
    rel = []
    for path in out:
        if path == root:
            rel.append(PurePosixPath(path).name)
        elif path.startswith(prefix):
            rel.append(path[len(prefix) :])
    return sorted(rel)


def _tree_entry(repo: Path, ref_oid: str, path: str) -> dict[str, str]:
    raw = _git(repo, "ls-tree", "-z", ref_oid, "--", path, text=False)
    records = [record for record in raw.split(b"\0") if record]
    if len(records) != 1:
        raise ValidationUnknown(f"tree entry unavailable or ambiguous: {path}")
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
    return {"mode": mode, "type": object_type, "oid": oid.lower()}


def _show_text(
    repo: Path, ref_oid: str, path: str, *, required: bool
) -> str | None:
    try:
        entry = _tree_entry(repo, ref_oid, path)
        if entry["type"] != "blob":
            raise ValidationUnknown(f"scan path is not a blob: {path}")
        data = _git(repo, "cat-file", "blob", entry["oid"], text=False)
        return _decode_utf8(data, f"scan path {path}")
    except ValidationUnknown:
        if required:
            raise
        return None


def _validate_repository(repo: Path) -> None:
    if not repo.is_dir():
        raise ValidationUnknown(f"repo_root: not a directory: {repo}")
    inside = str(_git(repo, "rev-parse", "--is-inside-work-tree")).strip()
    if inside != "true":
        raise ValidationUnknown("repo_root: not a Git work tree")
    top = Path(str(_git(repo, "rev-parse", "--show-toplevel")).strip()).resolve()
    if top != repo.resolve():
        raise ValidationUnknown(
            f"repo_root: expected work-tree root {repo.resolve()}, observed {top}"
        )


def _scope_contains(scope: str, path: str) -> bool:
    if scope.endswith("/**"):
        root = scope[:-3].rstrip("/")
        return path == root or path.startswith(root + "/")
    return path == scope


def _finding(kind: str, disposition: str, **extra: Any) -> dict[str, Any]:
    return {"reason": kind, "disposition": disposition, **extra}


def validate(repo: Path, base: str, head: str, plan: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    _validate_repository(repo)
    base_oid = _resolve_commit(repo, base, "base_ref")
    head_oid = _resolve_commit(repo, head, "head_ref")
    changes = _diff_changes(repo, base_oid, head_oid)
    changed = sorted(change["logical_path"] for change in changes)
    changed_endpoints = sorted(
        {path for change in changes for path in change["paths"]}
    )
    authorized = plan["authorized_paths"]

    unexpected = [
        path
        for path in changed_endpoints
        if not any(_scope_contains(scope, path) for scope in authorized)
    ]
    if unexpected:
        findings.append(
            _finding(
                "CHANGED_PATH_OUTSIDE_AUTHORIZED_SCOPE",
                "FAIL",
                paths=unexpected,
            )
        )

    if len(changes) != plan["expected_changed_file_count"]:
        findings.append(
            _finding(
                "CHANGED_FILE_COUNT_MISMATCH",
                "FAIL",
                expected=plan["expected_changed_file_count"],
                actual=len(changes),
            )
        )

    old_root = plan["old_root"]
    new_root = plan["new_root"]
    base_inventory = _tree_files(repo, base_oid, old_root)
    new_inventory = _tree_files(repo, head_oid, new_root)
    allowed_old = sorted(plan["allowed_old_root_relpaths"])
    head_old_inventory = _tree_files(repo, head_oid, old_root)

    if not base_inventory:
        findings.append(
            _finding("BASE_OLD_ROOT_EMPTY_OR_MISSING", "FAIL", root=old_root)
        )
    if base_inventory != new_inventory:
        findings.append(
            _finding(
                "TARGET_INVENTORY_MISMATCH",
                "FAIL",
                base_old_inventory=base_inventory,
                head_new_inventory=new_inventory,
            )
        )
    if head_old_inventory != allowed_old:
        findings.append(
            _finding(
                "OLD_ROOT_RESIDUE_MISMATCH",
                "FAIL",
                expected=allowed_old,
                actual=head_old_inventory,
            )
        )

    edits = set(plan["content_edit_relpaths"])
    unknown_edits = sorted(edits - set(base_inventory))
    if unknown_edits:
        findings.append(
            _finding(
                "CONTENT_EDIT_REL_PATH_NOT_IN_BASE_INVENTORY",
                "FAIL",
                paths=unknown_edits,
            )
        )

    parity_mismatches = []
    mode_mismatches = []
    for rel in base_inventory:
        old_path = f"{old_root}/{rel}"
        new_path = f"{new_root}/{rel}"
        try:
            old_entry = _tree_entry(repo, base_oid, old_path)
            new_entry = _tree_entry(repo, head_oid, new_path)
        except ValidationUnknown as exc:
            parity_mismatches.append({"path": rel, "error": str(exc)})
            continue
        if (old_entry["mode"], old_entry["type"]) != (
            new_entry["mode"],
            new_entry["type"],
        ):
            mode_mismatches.append(
                {"path": rel, "base": old_entry, "head": new_entry}
            )
        if rel not in edits and old_entry["oid"] != new_entry["oid"]:
            parity_mismatches.append(
                {
                    "path": rel,
                    "base": old_entry["oid"],
                    "head": new_entry["oid"],
                }
            )
    if mode_mismatches:
        findings.append(
            _finding(
                "TREE_MODE_OR_TYPE_MISMATCH",
                "FAIL",
                files=mode_mismatches,
            )
        )
    if parity_mismatches:
        findings.append(
            _finding("BYTE_PARITY_MISMATCH", "FAIL", files=parity_mismatches)
        )

    explicit_scan_paths = bool(plan["scan_paths"])
    scan_paths = plan["scan_paths"]
    if not scan_paths:
        scan_paths = sorted(
            {
                path
                for path in changed_endpoints
                if path.startswith(new_root + "/")
                or path.startswith(".github/workflows/")
                or path.endswith(".py")
                or path.endswith(".sh")
            }
        )

    depth_delta = len(PurePosixPath(new_root).parts) - len(
        PurePosixPath(old_root).parts
    )
    allow_old_refs = set(plan["allow_old_root_reference_paths"])
    for path in scan_paths:
        text = _show_text(
            repo,
            head_oid,
            path,
            required=explicit_scan_paths,
        )
        if text is None:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            for match in PARENT_DEPTH_RE.finditer(line):
                findings.append(
                    _finding(
                        "FIXED_PARENT_DEPTH_REFERENCE",
                        "WARN",
                        path=path,
                        line=lineno,
                        parents=int(match.group(1)),
                        migration_depth_delta=depth_delta,
                        excerpt=line.strip()[:220],
                    )
                )
            for match in UPWARD_CHAIN_RE.finditer(line):
                findings.append(
                    _finding(
                        "RELATIVE_UPWARD_CHAIN_REFERENCE",
                        "WARN",
                        path=path,
                        line=lineno,
                        chain=match.group(0),
                        migration_depth_delta=depth_delta,
                        excerpt=line.strip()[:220],
                    )
                )
            if old_root in line and path not in allow_old_refs:
                findings.append(
                    _finding(
                        "OLD_ROOT_TEXT_REFERENCE",
                        "WARN",
                        path=path,
                        line=lineno,
                        excerpt=line.strip()[:220],
                    )
                )

    if any(f["disposition"] == "FAIL" for f in findings):
        status = "FAIL"
    elif any(f["disposition"] == "WARN" for f in findings):
        status = "WARN"
    else:
        status = "PASS"

    return {
        "schema": "termux-migration-validation.v1",
        "status": status,
        "base_ref": base,
        "head_ref": head,
        "base_oid": base_oid,
        "head_oid": head_oid,
        "old_root": old_root,
        "new_root": new_root,
        "changed_file_count": len(changes),
        "changed_files": changed,
        "changed_path_endpoints": changed_endpoints,
        "changes": changes,
        "base_old_inventory": base_inventory,
        "head_new_inventory": new_inventory,
        "head_old_inventory": head_old_inventory,
        "content_edit_relpaths": sorted(edits),
        "findings": findings,
        "mutation_authorized": False,
        "merge_authorized": False,
        "release_authorized": False,
        "production_authorized": False,
    }


def _parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo-root", default=".", help="local Git checkout root")
    p.add_argument("--base-ref", required=True)
    p.add_argument("--head-ref", required=True)
    p.add_argument(
        "--plan",
        required=True,
        help="termux-migration-plan.v1 JSON file",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        repo = Path(args.repo_root).resolve()
        raw = json.loads(Path(args.plan).read_text(encoding="utf-8"))
        plan = _validate_plan(raw)
        result = validate(repo, args.base_ref, args.head_ref, plan)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result["status"] == "FAIL" else 0
    except (
        OSError,
        ValueError,
        json.JSONDecodeError,
        ValidationUnknown,
    ) as exc:
        result = {
            "schema": "termux-migration-validation.v1",
            "status": "UNKNOWN",
            "error": str(exc),
            "mutation_authorized": False,
            "merge_authorized": False,
            "release_authorized": False,
            "production_authorized": False,
        }
        print(json.dumps(result, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
