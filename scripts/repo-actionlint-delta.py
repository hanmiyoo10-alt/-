#!/usr/bin/env python3
"""Compare actionlint diagnostics only across changed workflow files."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

SCHEMA = "repo-actionlint-delta.v1"
ACTIONLINT_FORMAT = "{{range $err := .}}{{json $err}}{{end}}"
WORKFLOW_RE = re.compile(r"^\.github/workflows/[^/]+\.(?:yml|yaml)$")
MAX_CHANGED_WORKFLOWS = 200
MAX_DIAGNOSTICS_PER_FILE = 100
MAX_MESSAGE_CHARS = 2000


class HelperError(RuntimeError):
    def __init__(self, exit_code: int, reason: str, detail: str = "") -> None:
        super().__init__(detail or reason)
        self.exit_code = exit_code
        self.reason = reason
        self.detail = detail


@dataclass(frozen=True)
class Diagnostic:
    kind: str
    message: str

    def as_json(self) -> dict[str, str]:
        return {"kind": self.kind, "message": self.message}


@dataclass(frozen=True)
class Change:
    change: str
    base_path: str | None
    candidate_path: str | None


def run(
    args: list[str], *, cwd: Path, input_text: str | None = None
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            args,
            cwd=cwd,
            input=input_text,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except OSError as exc:
        raise HelperError(3, "PROCESS_EXEC_FAILED", str(exc)) from exc


def git(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    cp = run(["git", *args], cwd=cwd)
    if cp.returncode != 0:
        detail = (cp.stderr or cp.stdout).strip()[:1000]
        raise HelperError(3, "GIT_COMMAND_FAILED", detail)
    return cp


def repository_root() -> Path:
    cwd = Path.cwd()
    cp = run(["git", "rev-parse", "--show-toplevel"], cwd=cwd)
    if cp.returncode != 0:
        raise HelperError(2, "NOT_A_GIT_REPOSITORY", cp.stderr.strip()[:1000])
    return Path(cp.stdout.strip()).resolve()


def resolve_ref(root: Path, ref: str) -> str:
    cp = git(root, "rev-parse", "--verify", f"{ref}^{{commit}}")
    sha = cp.stdout.strip()
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise HelperError(3, "INVALID_RESOLVED_SHA", sha[:1000])
    return sha


def is_workflow(path: str) -> bool:
    return WORKFLOW_RE.fullmatch(path) is not None


def discover_changes(root: Path, base: str, candidate: str) -> list[Change]:
    cp = git(root, "diff", "--name-status", "-M", base, candidate, "--")
    changes: list[Change] = []
    for raw in cp.stdout.splitlines():
        if not raw.strip():
            continue
        fields = raw.split("\t")
        status = fields[0]
        code = status[0]
        if code == "R" and len(fields) == 3:
            old, new = fields[1], fields[2]
            old_wf, new_wf = is_workflow(old), is_workflow(new)
            if old_wf and new_wf:
                changes.append(Change("renamed", old, new))
            elif old_wf:
                changes.append(Change("deleted", old, new))
            elif new_wf:
                changes.append(Change("added", old, new))
            continue
        if len(fields) != 2 or code not in {"A", "D", "M", "T"}:
            paths = fields[1:]
            if any(is_workflow(path) for path in paths):
                raise HelperError(3, "UNSUPPORTED_GIT_DIFF_STATUS", raw[:1000])
            continue
        path = fields[1]
        if not is_workflow(path):
            continue
        change = {"A": "added", "D": "deleted", "M": "modified", "T": "modified"}[code]
        changes.append(Change(change, None if code == "A" else path, None if code == "D" else path))

    if len(changes) > MAX_CHANGED_WORKFLOWS:
        raise HelperError(
            2,
            "TOO_MANY_CHANGED_WORKFLOWS",
            f"{len(changes)} > {MAX_CHANGED_WORKFLOWS}",
        )
    return sorted(changes, key=lambda item: item.candidate_path or item.base_path or "")


def tool_version(root: Path, path: str, *args: str) -> str:
    cp = run([path, *args], cwd=root)
    if cp.returncode != 0:
        detail = (cp.stderr or cp.stdout).strip()[:1000]
        raise HelperError(3, "TOOL_VERSION_FAILED", detail)
    lines = [line.strip() for line in cp.stdout.splitlines() if line.strip()]
    if not lines:
        raise HelperError(3, "TOOL_VERSION_EMPTY", path)
    if Path(path).name == "shellcheck":
        for line in lines:
            if line.startswith("version:"):
                return line.split(":", 1)[1].strip()
    return lines[0]


def tool_identity(root: Path) -> tuple[dict[str, object], dict[str, object]]:
    actionlint = shutil.which("actionlint")
    if actionlint is None:
        raise HelperError(2, "ACTIONLINT_NOT_FOUND")
    actionlint_info = {"path": actionlint, "version": tool_version(root, actionlint, "-version")}

    shellcheck = shutil.which("shellcheck")
    if shellcheck is None:
        shellcheck_info: dict[str, object] = {
            "available": False,
            "path": None,
            "version": None,
        }
    else:
        shellcheck_info = {
            "available": True,
            "path": shellcheck,
            "version": tool_version(root, shellcheck, "--version"),
        }
    return actionlint_info, shellcheck_info


def git_source(root: Path, commit: str, path: str) -> str:
    cp = git(root, "show", f"{commit}:{path}")
    return cp.stdout


def lint_source(root: Path, actionlint: str, source: str) -> tuple[Diagnostic, ...]:
    cp = run(
        [actionlint, "-config-file", "/dev/null", "-format", ACTIONLINT_FORMAT, "-"],
        cwd=root,
        input_text=source,
    )
    if cp.returncode not in {0, 1}:
        detail = (cp.stderr or cp.stdout).strip()[:1000]
        raise HelperError(3, "ACTIONLINT_EXECUTION_FAILED", detail)

    diagnostics: set[Diagnostic] = set()
    for line in cp.stdout.splitlines():
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            raise HelperError(3, "ACTIONLINT_OUTPUT_INVALID", line[:1000]) from exc
        if not isinstance(item, dict):
            raise HelperError(3, "ACTIONLINT_OUTPUT_INVALID", line[:1000])
        kind = item.get("kind")
        message = item.get("message")
        if not isinstance(kind, str) or not kind or not isinstance(message, str) or not message:
            raise HelperError(3, "ACTIONLINT_OUTPUT_INVALID", line[:1000])
        if len(message) > MAX_MESSAGE_CHARS:
            raise HelperError(3, "ACTIONLINT_MESSAGE_TOO_LARGE", kind)
        diagnostics.add(Diagnostic(kind, message))
    if len(diagnostics) > MAX_DIAGNOSTICS_PER_FILE:
        raise HelperError(
            3,
            "TOO_MANY_ACTIONLINT_DIAGNOSTICS",
            str(len(diagnostics)),
        )
    return tuple(sorted(diagnostics, key=lambda item: (item.kind, item.message)))


def diagnostic_keys(path: str, diagnostics: tuple[Diagnostic, ...]) -> set[tuple[str, str, str]]:
    return {(path, item.kind, item.message) for item in diagnostics}


def evaluate_change(
    root: Path,
    actionlint: str,
    base: str,
    candidate: str,
    change: Change,
) -> dict[str, object]:
    record: dict[str, object] = {
        "change": change.change,
        "basePath": change.base_path,
        "candidatePath": change.candidate_path,
        "baseDiagnosticCount": None,
        "candidateDiagnosticCount": None,
        "newDiagnostics": [],
    }
    if change.change == "deleted":
        record["disposition"] = "DELETED_NOT_LINTED"
        return record

    logical_path = change.candidate_path
    if logical_path is None:
        raise HelperError(3, "CANDIDATE_PATH_MISSING")
    candidate_source = git_source(root, candidate, logical_path)
    candidate_diagnostics = lint_source(root, actionlint, candidate_source)
    record["candidateDiagnosticCount"] = len(candidate_diagnostics)

    if change.change == "added":
        new_diagnostics = candidate_diagnostics
        record["disposition"] = "LINTED_NEW"
    else:
        if change.base_path is None:
            raise HelperError(3, "BASE_PATH_MISSING")
        base_source = git_source(root, base, change.base_path)
        base_diagnostics = lint_source(root, actionlint, base_source)
        record["baseDiagnosticCount"] = len(base_diagnostics)
        base_keys = diagnostic_keys(logical_path, base_diagnostics)
        new_diagnostics = tuple(
            item
            for item in candidate_diagnostics
            if (logical_path, item.kind, item.message) not in base_keys
        )
        record["disposition"] = "LINTED_DELTA"

    record["newDiagnostics"] = [item.as_json() for item in new_diagnostics]
    return record


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fail only on candidate-only actionlint diagnostics in changed workflows."
    )
    parser.add_argument("--base", required=True, help="Exact or resolvable base Git ref")
    parser.add_argument("--candidate", required=True, help="Exact or resolvable candidate Git ref")
    return parser.parse_args()


def emit_error(exc: HelperError) -> None:
    receipt = {
        "schema": SCHEMA,
        "result": "ERROR",
        "errorCode": exc.reason,
        "detail": exc.detail[:1000] if exc.detail else None,
    }
    print(json.dumps(receipt, sort_keys=True), file=sys.stderr)


def main() -> int:
    args = parse_args()
    try:
        root = repository_root()
        base = resolve_ref(root, args.base)
        candidate = resolve_ref(root, args.candidate)
        actionlint_info, shellcheck_info = tool_identity(root)
        changes = discover_changes(root, base, candidate)
        files = [
            evaluate_change(
                root,
                str(actionlint_info["path"]),
                base,
                candidate,
                change,
            )
            for change in changes
        ]

        new_count = sum(len(item["newDiagnostics"]) for item in files)
        result = "NOOP" if not files else ("FAIL" if new_count else "PASS")
        receipt = {
            "schema": SCHEMA,
            "base": base,
            "candidate": candidate,
            "actionlint": actionlint_info,
            "shellcheck": shellcheck_info,
            "changedWorkflows": len(files),
            "newDiagnosticCount": new_count,
            "result": result,
            "files": files,
        }
        print(json.dumps(receipt, sort_keys=True))
        return 1 if new_count else 0
    except HelperError as exc:
        emit_error(exc)
        return exc.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
