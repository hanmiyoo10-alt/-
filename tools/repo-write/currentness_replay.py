#!/usr/bin/env python3
"""Read-only proof that a stale candidate can be replayed onto newer main."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Any

SHA40 = re.compile(r"^[0-9a-f]{40}$")
MAX_PATHS = 200
MAX_VALIDATIONS = 50
MAX_DIFF_BYTES = 4_194_304
ALLOWED_MODE = "100644"


def run(repo: Path, *args: str, input_text: str | None = None, check: bool = True):
    cp = subprocess.run(["git", *args], cwd=repo, input=input_text, text=True,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if check and cp.returncode != 0:
        raise RuntimeError((cp.stderr or cp.stdout or "git command failed").strip()[:500])
    return cp


def exact_commit(repo: Path, value: str) -> bool:
    if not isinstance(value, str) or not SHA40.fullmatch(value):
        return False
    cp = run(repo, "cat-file", "-e", f"{value}^{{commit}}", check=False)
    return cp.returncode == 0

def ancestor(repo: Path, base: str, head: str) -> bool:
    return run(repo, "merge-base", "--is-ancestor", base, head, check=False).returncode == 0


def range_has_merge(repo: Path, base: str, head: str) -> bool:
    return bool(run(repo, "rev-list", "--merges", f"{base}..{head}").stdout.strip())


def name_status(repo: Path, base: str, head: str) -> list[tuple[str, list[str]]]:
    raw = run(repo, "diff", "--name-status", "-z", "-M", base, head).stdout
    tokens = raw.split("\0")
    if tokens and tokens[-1] == "":
        tokens.pop()
    out: list[tuple[str, list[str]]] = []
    index = 0
    while index < len(tokens):
        status = tokens[index]
        index += 1
        count = 2 if status.startswith(("R", "C")) else 1
        if index + count > len(tokens):
            raise ValueError("DIFF_STATUS_INVALID")
        paths = tokens[index:index + count]
        index += count
        out.append((status, paths))
    return out


def status_paths(rows: list[tuple[str, list[str]]]) -> list[str]:
    paths = sorted({path for _, row_paths in rows for path in row_paths})
    if len(paths) > MAX_PATHS:
        raise OverflowError("PATH_BOUND_EXCEEDED")
    return paths


def change_identity(rows: list[tuple[str, list[str]]]) -> list[dict[str, Any]]:
    return sorted(
        ({"status": status[:1], "paths": list(paths)} for status, paths in rows),
        key=lambda row: (row["status"], row["paths"]),
    )


def stable_patch_id(repo: Path, base: str, head: str) -> str:
    diff = run(repo, "diff", "--no-ext-diff", "--no-textconv", "-M", base, head).stdout
    if not diff:
        return ""
    if len(diff.encode("utf-8")) > MAX_DIFF_BYTES:
        raise OverflowError("DIFF_BOUND_EXCEEDED")
    cp = subprocess.run(["git", "patch-id", "--stable"], cwd=repo, input=diff, text=True,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if cp.returncode != 0 or not cp.stdout.strip():
        raise RuntimeError("PATCH_ID_FAILED")
    return cp.stdout.split()[0]

def tree_entry(repo: Path, rev: str, path: str) -> tuple[str, str] | None:
    cp = run(repo, "ls-tree", rev, "--", path)
    if not cp.stdout.strip():
        return None
    fields = cp.stdout.split(None, 3)
    return fields[0], fields[2]


def index_entry(repo: Path, path: str) -> tuple[str, str] | None:
    cp = run(repo, "ls-files", "-s", "--", path)
    if not cp.stdout.strip():
        return None
    rows = [line for line in cp.stdout.splitlines() if line.strip()]
    if len(rows) != 1:
        raise ValueError("INDEX_ENTRY_AMBIGUOUS")
    fields = rows[0].split()
    return fields[0], fields[1]


def unsupported_modes(repo: Path, base: str, head: str, paths: list[str]) -> list[str]:
    bad: list[str] = []
    for path in paths:
        for rev in (base, head):
            entry = tree_entry(repo, rev, path)
            if entry and entry[0] != ALLOWED_MODE:
                bad.append(f"{rev}:{path}:{entry[0]}")
    return bad


def rerun_plan(owning_ci: str, required: list[str]) -> list[dict[str, str]]:
    ids = ["protected:Required", f"owning-ci:{owning_ci}", *required]
    seen: set[str] = set()
    return [{"validationId": value, "status": "RERUN_REQUIRED"}
            for value in ids if value and not (value in seen or seen.add(value))]

def result(state: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "mode": "CURRENTNESS_REPLAY_V1",
        "state": state,
        "reasonCode": reason,
        "mutationAuthorized": False,
        "mergeAuthorized": False,
        **extra,
    }


def dry_replay(repo: Path, base: str, head: str, current: str,
               candidate_rows: list[tuple[str, list[str]]], paths: list[str]) -> dict[str, Any]:
    original_patch = stable_patch_id(repo, base, head)
    patch = run(repo, "diff", "--no-ext-diff", "--no-textconv", "--binary", "-M", base, head).stdout
    if len(patch.encode("utf-8")) > MAX_DIFF_BYTES:
        return result("UNKNOWN", "DIFF_BOUND_EXCEEDED")
    if "GIT binary patch" in patch or "Binary files " in patch:
        return result("UNKNOWN", "UNSUPPORTED_BINARY_PATCH")
    with tempfile.TemporaryDirectory(prefix="currentness-replay-") as tmp:
        worktree = Path(tmp) / "wt"
        run(repo, "worktree", "add", "--detach", str(worktree), current)
        try:
            applied = subprocess.run(["git", "apply", "--index", "-"], cwd=worktree,
                                     input=patch, text=True, stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE, check=False)
            if applied.returncode != 0:
                return result("CONFLICT", "DRY_REPLAY_APPLY_FAILED",
                              detail=(applied.stderr or applied.stdout).strip()[:300])
            # --index updates the index while HEAD stays current; inspect cached delta.
            raw = run(worktree, "diff", "--cached", "--name-status", "-z", "-M").stdout
            tokens = raw.split("\0")
            if tokens and tokens[-1] == "":
                tokens.pop()
            replay_rows = []
            i = 0
            while i < len(tokens):
                status = tokens[i]; i += 1
                count = 2 if status.startswith(("R", "C")) else 1
                replay_rows.append((status, tokens[i:i + count])); i += count
            replay_paths = status_paths(replay_rows)
            if replay_paths != paths:
                return result("CONFLICT", "REPLAY_PATH_IDENTITY_MISMATCH",
                              originalPaths=paths, replayPaths=replay_paths)
            original_change_identity = change_identity(candidate_rows)
            replay_change_identity = change_identity(replay_rows)
            if replay_change_identity != original_change_identity:
                return result("CONFLICT", "REPLAY_CHANGE_IDENTITY_MISMATCH",
                              originalChangeIdentity=original_change_identity,
                              replayChangeIdentity=replay_change_identity)
            replay_diff = run(worktree, "diff", "--cached", "--no-ext-diff", "--no-textconv", "-M").stdout
            patch_cp = subprocess.run(["git", "patch-id", "--stable"], cwd=worktree, input=replay_diff,
                                      text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            if patch_cp.returncode != 0 or not patch_cp.stdout.strip():
                return result("UNKNOWN", "REPLAY_PATCH_ID_UNAVAILABLE")
            replay_patch = patch_cp.stdout.split()[0]
            if replay_patch != original_patch:
                return result("CONFLICT", "REPLAY_PATCH_ID_MISMATCH",
                              originalPatchId=original_patch, replayPatchId=replay_patch)
            identities: dict[str, Any] = {}
            for path in paths:
                expected = tree_entry(repo, head, path)
                observed = index_entry(worktree, path)
                identities[path] = {"candidateHead": expected, "replay": observed}
                if expected != observed:
                    return result("CONFLICT", "REPLAY_TREE_IDENTITY_MISMATCH",
                                  path=path, expected=expected, observed=observed)
            return result("DISJOINT_REPLAY_PROVEN", "DRY_REPLAY_SEMANTICS_PRESERVED",
                          originalPatchId=original_patch, replayPatchId=replay_patch,
                          changedPaths=paths, changeIdentity=original_change_identity,
                          treeIdentity=identities)
        finally:
            run(repo, "worktree", "remove", "--force", str(worktree), check=False)


def validate_profile(data: dict[str, Any], stale: bool) -> tuple[str, list[str]] | None:
    owning = data.get("owningCi")
    required = data.get("requiredValidations")
    if not stale:
        return (owning if isinstance(owning, str) else "", required if isinstance(required, list) else [])
    if not isinstance(owning, str) or not owning.strip() or len(owning) > 120:
        return None
    if not isinstance(required, list) or not required or len(required) > MAX_VALIDATIONS:
        return None
    if not all(isinstance(item, str) and item.strip() and len(item) <= 120 for item in required):
        return None
    if len(set(required)) != len(required):
        return None
    return owning.strip(), required

def plan_currentization(repo: Path, data: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(data, dict):
        return result("UNKNOWN", "REQUEST_INVALID")
    base = data.get("candidateBase")
    head = data.get("candidateHead")
    current = data.get("currentMain")
    if not all(exact_commit(repo, value) for value in (base, head, current)):
        return result("UNKNOWN", "COMMIT_IDENTITY_INVALID")
    assert isinstance(base, str) and isinstance(head, str) and isinstance(current, str)
    if not ancestor(repo, base, head):
        return result("CONFLICT", "CANDIDATE_BASE_NOT_ANCESTOR", candidateBase=base, candidateHead=head)
    if not ancestor(repo, base, current):
        return result("CONFLICT", "CURRENT_MAIN_NOT_DESCENDANT_OF_BASE", candidateBase=base, currentMain=current)
    stale = base != current
    if range_has_merge(repo, base, head):
        return result("UNKNOWN", "UNSUPPORTED_CANDIDATE_MERGE_HISTORY")
    profile = validate_profile(data, stale)
    if profile is None:
        return result("UNKNOWN", "VALIDATION_PROFILE_REQUIRED", candidateBase=base,
                      candidateHead=head, currentMain=current)
    owning_ci, required = profile
    if not stale:
        return result("CURRENT", "CANDIDATE_BASE_IS_CURRENT_MAIN", candidateBase=base,
                      candidateHead=head, currentMain=current, rerunPlan=[])
    try:
        candidate_rows = name_status(repo, base, head)
        main_rows = name_status(repo, base, current)
        candidate_paths = status_paths(candidate_rows)
        main_paths = status_paths(main_rows)
    except OverflowError:
        return result("UNKNOWN", "PATH_BOUND_EXCEEDED")
    except ValueError:
        return result("UNKNOWN", "DIFF_STATUS_INVALID")
    except RuntimeError as exc:
        return result("UNKNOWN", "GIT_EVIDENCE_UNAVAILABLE", detail=str(exc)[:300])
    if not candidate_paths:
        return result("UNKNOWN", "CANDIDATE_DIFF_EMPTY")
    overlap = sorted(set(candidate_paths) & set(main_paths))
    if overlap:
        return result("OVERLAP", "CHANGED_PATH_OVERLAP", overlapPaths=overlap,
                      candidatePaths=candidate_paths, mainAdvancePaths=main_paths)
    try:
        bad_modes = unsupported_modes(repo, base, head, candidate_paths)
    except RuntimeError as exc:
        return result("UNKNOWN", "TREE_EVIDENCE_UNAVAILABLE", detail=str(exc)[:300])
    if bad_modes:
        return result("UNKNOWN", "UNSUPPORTED_MODE", unsupportedModes=bad_modes)
    try:
        proof = dry_replay(repo, base, head, current, candidate_rows, candidate_paths)
    except (RuntimeError, ValueError, OverflowError) as exc:
        return result("UNKNOWN", "DRY_REPLAY_EVIDENCE_UNAVAILABLE", detail=str(exc)[:300])
    proof.update({"candidateBase": base, "candidateHead": head, "currentMain": current,
                  "candidatePaths": candidate_paths, "mainAdvancePaths": main_paths})
    if proof["state"] == "DISJOINT_REPLAY_PROVEN":
        proof["rerunPlan"] = rerun_plan(owning_ci, required)
        proof["freshBarrierRequiredBeforeMutation"] = True
        proof["historicalExactHeadEvidenceReusableAsCurrent"] = False
    return proof


def load_request(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise ValueError(f"REQUEST_READ_FAILED:{exc}") from exc
    if not raw or len(raw) > 16_384 or b"\x00" in raw:
        raise ValueError("REQUEST_SIZE_INVALID")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("REQUEST_JSON_INVALID") from exc
    if not isinstance(data, dict):
        raise ValueError("REQUEST_INVALID")
    allowed = {"schemaVersion", "candidateBase", "candidateHead", "currentMain", "owningCi", "requiredValidations"}
    if set(data) - allowed or type(data.get("schemaVersion")) is not int or data.get("schemaVersion") != 1:
        raise ValueError("REQUEST_SCHEMA_INVALID")
    return data


def exit_code(payload: dict[str, Any]) -> int:
    return {"CURRENT": 0, "DISJOINT_REPLAY_PROVEN": 0, "OVERLAP": 1,
            "UNKNOWN": 2, "CONFLICT": 3}.get(str(payload.get("state")), 2)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--request-file", required=True)
    args = parser.parse_args(argv)
    try:
        payload = plan_currentization(Path(args.repo).resolve(), load_request(Path(args.request_file)))
    except Exception as exc:
        payload = result("UNKNOWN", "RUNTIME_ERROR", detail=str(exc)[:300])
    sys.stdout.write(json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n")
    return exit_code(payload)


if __name__ == "__main__":
    raise SystemExit(main())
