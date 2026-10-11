#!/usr/bin/env python3
"""Read-only validator for bounded Termux child-path migrations."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path, PurePosixPath
from typing import Any


SCHEMA = "termux-migration-plan.v1"
PARENT_DEPTH_RE = re.compile(r"Path\(__file__\)\.resolve\(\)\.parents\[(\d+)\]")
UPWARD_CHAIN_RE = re.compile(r"(?:\.\./){2,}")


class ValidationUnknown(RuntimeError):
    pass


def _norm_repo_path(value: str, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationUnknown(f"{field}: expected non-empty repository-relative path")
    raw = value.replace("\\", "/").strip("/")
    p = PurePosixPath(raw)
    if p.is_absolute() or ".." in p.parts or "." in p.parts or not p.parts:
        raise ValidationUnknown(f"{field}: invalid repository-relative path: {value!r}")
    return p.as_posix()


def _norm_scope(value: str, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValidationUnknown(f"{field}: expected non-empty scope")
    value = value.replace("\\", "/").strip()
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
    if not isinstance(count, int) or count < 1:
        raise ValidationUnknown("expected_changed_file_count: expected positive integer")

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
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", "replace").strip()
        raise ValidationUnknown(f"git {' '.join(args)} failed: {err or 'unknown error'}")
    if text:
        return proc.stdout.decode("utf-8", "strict")
    return proc.stdout


def _zlist(payload: bytes) -> list[str]:
    return [x.decode("utf-8", "strict") for x in payload.split(b"\0") if x]


def _changed_files(repo: Path, base: str, head: str) -> list[str]:
    return sorted(_zlist(_git(repo, "diff", "--find-renames=20%", "--name-only", "-z", base, head, "--", text=False)))


def _tree_files(repo: Path, ref: str, root: str) -> list[str]:
    out = _zlist(_git(repo, "ls-tree", "-r", "--name-only", "-z", ref, "--", root, text=False))
    prefix = root.rstrip("/") + "/"
    rel = []
    for path in out:
        if path == root:
            rel.append(PurePosixPath(path).name)
        elif path.startswith(prefix):
            rel.append(path[len(prefix):])
    return sorted(rel)


def _blob(repo: Path, ref: str, path: str) -> str:
    return str(_git(repo, "rev-parse", f"{ref}:{path}")).strip()


def _show_text(repo: Path, ref: str, path: str) -> str | None:
    try:
        data = _git(repo, "show", f"{ref}:{path}", text=False)
    except ValidationUnknown:
        return None
    try:
        return data.decode("utf-8", "strict")
    except UnicodeDecodeError:
        return None


def _scope_contains(scope: str, path: str) -> bool:
    if scope.endswith("/**"):
        root = scope[:-3].rstrip("/")
        return path == root or path.startswith(root + "/")
    return path == scope


def _finding(kind: str, disposition: str, **extra: Any) -> dict[str, Any]:
    return {"reason": kind, "disposition": disposition, **extra}


def validate(repo: Path, base: str, head: str, plan: dict[str, Any]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    changed = _changed_files(repo, base, head)
    authorized = plan["authorized_paths"]

    unexpected = [p for p in changed if not any(_scope_contains(s, p) for s in authorized)]
    if unexpected:
        findings.append(
            _finding("CHANGED_PATH_OUTSIDE_AUTHORIZED_SCOPE", "FAIL", paths=unexpected)
        )

    if len(changed) != plan["expected_changed_file_count"]:
        findings.append(
            _finding(
                "CHANGED_FILE_COUNT_MISMATCH",
                "FAIL",
                expected=plan["expected_changed_file_count"],
                actual=len(changed),
            )
        )

    old_root = plan["old_root"]
    new_root = plan["new_root"]
    base_inventory = _tree_files(repo, base, old_root)
    new_inventory = _tree_files(repo, head, new_root)
    allowed_old = sorted(plan["allowed_old_root_relpaths"])
    head_old_inventory = _tree_files(repo, head, old_root)

    if not base_inventory:
        findings.append(_finding("BASE_OLD_ROOT_EMPTY_OR_MISSING", "FAIL", root=old_root))
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
            _finding("CONTENT_EDIT_REL_PATH_NOT_IN_BASE_INVENTORY", "FAIL", paths=unknown_edits)
        )

    parity_mismatches = []
    for rel in base_inventory:
        if rel in edits:
            continue
        old_path = f"{old_root}/{rel}"
        new_path = f"{new_root}/{rel}"
        try:
            old_sha = _blob(repo, base, old_path)
            new_sha = _blob(repo, head, new_path)
        except ValidationUnknown as exc:
            parity_mismatches.append({"path": rel, "error": str(exc)})
            continue
        if old_sha != new_sha:
            parity_mismatches.append({"path": rel, "base": old_sha, "head": new_sha})
    if parity_mismatches:
        findings.append(
            _finding("BYTE_PARITY_MISMATCH", "FAIL", files=parity_mismatches)
        )

    scan_paths = plan["scan_paths"]
    if not scan_paths:
        scan_paths = sorted(
            {
                p
                for p in changed
                if p.startswith(new_root + "/")
                or p.startswith(".github/workflows/")
                or p.endswith(".py")
                or p.endswith(".sh")
            }
        )

    depth_delta = len(PurePosixPath(new_root).parts) - len(PurePosixPath(old_root).parts)
    allow_old_refs = set(plan["allow_old_root_reference_paths"])
    for path in scan_paths:
        text = _show_text(repo, head, path)
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
        "old_root": old_root,
        "new_root": new_root,
        "changed_file_count": len(changed),
        "changed_files": changed,
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
    p.add_argument("--plan", required=True, help="termux-migration-plan.v1 JSON file")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv or sys.argv[1:])
    try:
        repo = Path(args.repo_root).resolve()
        raw = json.loads(Path(args.plan).read_text(encoding="utf-8"))
        plan = _validate_plan(raw)
        _git(repo, "rev-parse", "--is-inside-work-tree")
        result = validate(repo, args.base_ref, args.head_ref, plan)
        print(json.dumps(result, indent=2, sort_keys=True))
        return 1 if result["status"] == "FAIL" else 0
    except (OSError, json.JSONDecodeError, ValidationUnknown) as exc:
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
