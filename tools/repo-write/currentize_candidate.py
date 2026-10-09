#!/usr/bin/env python3
"""Bounded non-force currentization effect for one existing work branch."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from typing import Any

import currentness_replay as replay

MODE = "CURRENTIZE_CANDIDATE_V1"
FIXED_REMOTE = "origin"
BOT_NAME = "repo-currentization[bot]"
BOT_EMAIL = "repo-currentization@users.noreply.github.com"
MERGE_MESSAGE = "chore(repo): currentize candidate to current main"
SHADOW_MESSAGE = "repo-currentization semantic shadow"
MAX_REQUEST_BYTES = 16_384
MAX_BRANCH_BYTES = 180
MAX_VALIDATIONS = 50
SHA40 = re.compile(r"^[0-9a-f]{40}$")


class CurrentizeError(RuntimeError):
    def __init__(self, reason: str, detail: str = "", exit_code: int = 2,
                 mutation_may_have_occurred: bool = False):
        super().__init__(reason)
        self.reason = reason
        self.detail = detail[:800]
        self.exit_code = exit_code
        self.mutation_may_have_occurred = mutation_may_have_occurred


def run(repo: Path, *args: str, check: bool = True,
        env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    cp = subprocess.run(
        ["git", *args],
        cwd=repo,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        env=env,
    )
    if check and cp.returncode != 0:
        raise CurrentizeError(
            "GIT_COMMAND_FAILED",
            detail=(cp.stderr or cp.stdout or "git command failed").strip(),
        )
    return cp


def exact_commit(repo: Path, value: str) -> bool:
    return bool(
        isinstance(value, str)
        and SHA40.fullmatch(value)
        and run(repo, "cat-file", "-e", f"{value}^{{commit}}", check=False).returncode == 0
    )


def ancestor(repo: Path, base: str, head: str) -> bool:
    return run(repo, "merge-base", "--is-ancestor", base, head, check=False).returncode == 0


def remote_head(repo: Path, branch: str) -> str | None:
    cp = run(repo, "ls-remote", "--heads", FIXED_REMOTE, f"refs/heads/{branch}", check=False)
    if cp.returncode != 0:
        raise CurrentizeError("REMOTE_HEAD_READ_FAILED", detail=(cp.stderr or cp.stdout).strip(), exit_code=4)
    rows = [line.split() for line in cp.stdout.splitlines() if line.strip()]
    if not rows:
        return None
    if len(rows) != 1 or len(rows[0]) != 2 or not SHA40.fullmatch(rows[0][0]):
        raise CurrentizeError("REMOTE_HEAD_AMBIGUOUS", exit_code=4)
    return rows[0][0]


def fetch_ref(repo: Path, branch: str, expected: str) -> None:
    cp = run(repo, "fetch", "--no-tags", FIXED_REMOTE, f"refs/heads/{branch}", check=False)
    if cp.returncode != 0:
        raise CurrentizeError("REMOTE_REF_FETCH_FAILED", detail=(cp.stderr or cp.stdout).strip(), exit_code=4)
    observed = run(repo, "rev-parse", "FETCH_HEAD").stdout.strip()
    if observed != expected:
        raise CurrentizeError(
            "REMOTE_REF_MOVED_DURING_FETCH",
            detail=json.dumps({"branch": branch, "expected": expected, "observed": observed}, separators=(",", ":")),
            exit_code=4,
        )


def ensure_commit(repo: Path, value: str) -> None:
    if exact_commit(repo, value):
        return
    cp = run(repo, "fetch", "--no-tags", FIXED_REMOTE, value, check=False)
    if cp.returncode != 0 or not exact_commit(repo, value):
        raise CurrentizeError("COMMIT_EVIDENCE_UNAVAILABLE", detail=value, exit_code=4)


def validate_branch(repo: Path, branch: str) -> None:
    if not isinstance(branch, str) or not branch or len(branch.encode("utf-8")) > MAX_BRANCH_BYTES:
        raise CurrentizeError("BRANCH_INVALID")
    lowered = branch.lower()
    if lowered in {"main", "master"} or lowered.startswith("release-") or lowered.startswith("release/"):
        raise CurrentizeError("PROTECTED_BRANCH_DENIED")
    if lowered.startswith("refs/") or branch.startswith("-"):
        raise CurrentizeError("BRANCH_INVALID")
    cp = run(repo, "check-ref-format", "--branch", branch, check=False)
    if cp.returncode != 0:
        raise CurrentizeError("BRANCH_INVALID")


def validate_profile(owning_ci: Any, required: Any) -> tuple[str, list[str]]:
    if not isinstance(owning_ci, str) or not owning_ci.strip() or len(owning_ci.strip()) > 120:
        raise CurrentizeError("VALIDATION_PROFILE_INVALID")
    if not isinstance(required, list) or not required or len(required) > MAX_VALIDATIONS:
        raise CurrentizeError("VALIDATION_PROFILE_INVALID")
    values: list[str] = []
    for item in required:
        if not isinstance(item, str) or not item.strip() or len(item.strip()) > 120:
            raise CurrentizeError("VALIDATION_PROFILE_INVALID")
        values.append(item.strip())
    if len(set(values)) != len(values):
        raise CurrentizeError("VALIDATION_PROFILE_INVALID")
    return owning_ci.strip(), values


def load_request(path: Path) -> dict[str, Any]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise CurrentizeError("REQUEST_READ_FAILED", detail=str(exc)) from exc
    if not raw or len(raw) > MAX_REQUEST_BYTES or b"\x00" in raw:
        raise CurrentizeError("REQUEST_SIZE_INVALID")
    try:
        data = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CurrentizeError("REQUEST_JSON_INVALID") from exc
    if not isinstance(data, dict):
        raise CurrentizeError("REQUEST_INVALID")
    allowed = {
        "schemaVersion", "branch", "expectedHead", "generationBase",
        "currentMain", "owningCi", "requiredValidations",
    }
    if set(data) != allowed or type(data.get("schemaVersion")) is not int or data["schemaVersion"] != 1:
        raise CurrentizeError("REQUEST_SCHEMA_INVALID")
    for field in ("expectedHead", "generationBase", "currentMain"):
        if not isinstance(data.get(field), str) or not SHA40.fullmatch(data[field]):
            raise CurrentizeError("COMMIT_IDENTITY_INVALID", detail=field)
    if not isinstance(data.get("branch"), str):
        raise CurrentizeError("BRANCH_INVALID")
    owning, required = validate_profile(data.get("owningCi"), data.get("requiredValidations"))
    return {
        "schemaVersion": 1,
        "branch": data["branch"],
        "expectedHead": data["expectedHead"],
        "generationBase": data["generationBase"],
        "currentMain": data["currentMain"],
        "owningCi": owning,
        "requiredValidations": required,
    }


def generation_shape(repo: Path, generation_base: str, candidate_head: str) -> str:
    if not ancestor(repo, generation_base, candidate_head):
        raise CurrentizeError("GENERATION_BASE_NOT_ANCESTOR")
    merges = [
        line.strip()
        for line in run(repo, "rev-list", "--first-parent", "--merges",
                        f"{generation_base}..{candidate_head}").stdout.splitlines()
        if line.strip()
    ]
    if not merges:
        return "LINEAR"
    if len(merges) != 1:
        raise CurrentizeError("GENERATION_MERGE_HISTORY_UNSUPPORTED")
    parents = run(repo, "rev-list", "--parents", "-n", "1", merges[0]).stdout.strip().split()
    if len(parents) != 3 or parents[2] != generation_base:
        raise CurrentizeError("GENERATION_BASE_NOT_CURRENTIZATION_PARENT")
    return "PRIOR_CURRENTIZATION"


def shadow_candidate(repo: Path, generation_base: str, candidate_head: str) -> str:
    candidate_tree = run(repo, "rev-parse", f"{candidate_head}^{{tree}}").stdout.strip()
    env = dict(os.environ)
    env.update({
        "GIT_AUTHOR_NAME": BOT_NAME,
        "GIT_AUTHOR_EMAIL": BOT_EMAIL,
        "GIT_COMMITTER_NAME": BOT_NAME,
        "GIT_COMMITTER_EMAIL": BOT_EMAIL,
        "GIT_AUTHOR_DATE": "2000-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE": "2000-01-01T00:00:00Z",
    })
    cp = run(repo, "commit-tree", candidate_tree, "-p", generation_base, "-m", SHADOW_MESSAGE,
             check=False, env=env)
    shadow = cp.stdout.strip()
    if cp.returncode != 0 or not SHA40.fullmatch(shadow):
        raise CurrentizeError("SEMANTIC_SHADOW_FAILED", detail=(cp.stderr or cp.stdout).strip())
    return shadow


def planner_request(request: dict[str, Any], shadow: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "candidateBase": request["generationBase"],
        "candidateHead": shadow,
        "currentMain": request["currentMain"],
        "owningCi": request["owningCi"],
        "requiredValidations": request["requiredValidations"],
    }


def compact_planner(payload: dict[str, Any]) -> dict[str, Any]:
    keep = {
        "state", "reasonCode", "originalPatchId", "replayPatchId", "changedPaths",
        "changeIdentity", "treeIdentity", "candidateBase", "currentMain",
        "candidatePaths", "mainAdvancePaths", "rerunPlan",
        "freshBarrierRequiredBeforeMutation",
        "historicalExactHeadEvidenceReusableAsCurrent",
    }
    return {key: payload[key] for key in payload if key in keep}


def result(disposition: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "mode": MODE,
        "disposition": disposition,
        "reasonCode": reason,
        "branchMutationObserved": disposition == "CURRENTIZED",
        "remoteMutationMayHaveOccurred": bool(extra.pop("remoteMutationMayHaveOccurred", False)),
        "forcePushUsed": False,
        "rebaseUsed": False,
        "prMutationAuthorized": False,
        "mergeToMainAuthorized": False,
        "ciDispatchAuthorized": False,
        **extra,
    }


def validate_new_head(repo: Path, old_head: str, current_main: str, new_head: str,
                      proof: dict[str, Any]) -> dict[str, Any]:
    parents = run(repo, "rev-list", "--parents", "-n", "1", new_head).stdout.strip().split()
    if len(parents) != 3 or parents[1] != old_head or parents[2] != current_main:
        raise CurrentizeError("MERGE_COMMIT_SHAPE_INVALID")
    if not ancestor(repo, old_head, new_head) or not ancestor(repo, current_main, new_head):
        raise CurrentizeError("MERGE_ANCESTRY_INVALID")

    rows = replay.name_status(repo, current_main, new_head)
    paths = replay.status_paths(rows)
    if paths != proof.get("changedPaths"):
        raise CurrentizeError("POSTMERGE_PATH_IDENTITY_MISMATCH")
    identity = replay.change_identity(rows)
    if identity != proof.get("changeIdentity"):
        raise CurrentizeError("POSTMERGE_CHANGE_IDENTITY_MISMATCH")

    patch_id = replay.stable_patch_id(repo, current_main, new_head)
    if patch_id != proof.get("originalPatchId"):
        raise CurrentizeError("POSTMERGE_PATCH_ID_MISMATCH")

    tree_identity: dict[str, Any] = {}
    for path in paths:
        expected = replay.tree_entry(repo, old_head, path)
        observed = replay.tree_entry(repo, new_head, path)
        tree_identity[path] = {"candidateHead": expected, "currentizedHead": observed}
        if expected != observed:
            raise CurrentizeError("POSTMERGE_TREE_IDENTITY_MISMATCH", detail=path)

    return {
        "changedPaths": paths,
        "changeIdentity": identity,
        "patchId": patch_id,
        "treeIdentity": tree_identity,
    }


def assert_remote_barrier(repo: Path, branch: str, expected_head: str, current_main: str,
                          reason_suffix: str) -> None:
    observed_main = remote_head(repo, "main")
    if observed_main != current_main:
        raise CurrentizeError(
            f"CURRENT_MAIN_MOVED_{reason_suffix}",
            detail=json.dumps({"expected": current_main, "observed": observed_main}, separators=(",", ":")),
            exit_code=4,
        )
    observed_branch = remote_head(repo, branch)
    if observed_branch != expected_head:
        raise CurrentizeError(
            f"REMOTE_HEAD_MOVED_{reason_suffix}",
            detail=json.dumps({"expected": expected_head, "observed": observed_branch}, separators=(",", ":")),
            exit_code=4,
        )


def apply_currentization(repo: Path, request: dict[str, Any]) -> dict[str, Any]:
    branch = request["branch"]
    old_head = request["expectedHead"]
    generation_base = request["generationBase"]
    current_main = request["currentMain"]
    validate_branch(repo, branch)

    assert_remote_barrier(repo, branch, old_head, current_main, "BEFORE_PROOF")
    fetch_ref(repo, branch, old_head)
    fetch_ref(repo, "main", current_main)
    ensure_commit(repo, generation_base)

    shape = generation_shape(repo, generation_base, old_head)

    if ancestor(repo, current_main, old_head):
        return result(
            "CURRENT",
            "CURRENT_MAIN_ALREADY_ANCESTOR",
            branch=branch,
            oldHead=old_head,
            currentMain=current_main,
            newHead=old_head,
            generationShape=shape,
            nextGenerationBase=current_main,
            rerunPlan=[],
        )

    shadow = shadow_candidate(repo, generation_base, old_head)
    proof = replay.plan_currentization(repo, planner_request(request, shadow))
    if proof.get("state") != "DISJOINT_REPLAY_PROVEN":
        state = str(proof.get("state") or "UNKNOWN")
        if state not in {"CURRENT", "OVERLAP", "CONFLICT", "UNKNOWN"}:
            state = "UNKNOWN"
        return result(
            state,
            str(proof.get("reasonCode") or "PLANNER_NON_SUCCESS"),
            branch=branch,
            oldHead=old_head,
            currentMain=current_main,
            generationBase=generation_base,
            generationShape=shape,
            planner=compact_planner(proof),
        )

    assert_remote_barrier(repo, branch, old_head, current_main, "BEFORE_MERGE")

    temp_root = Path(tempfile.mkdtemp(prefix="repo-currentize-"))
    worktree = temp_root / "worktree"
    added = False
    pushed = False
    new_head: str | None = None
    try:
        run(repo, "worktree", "add", "--detach", str(worktree), old_head)
        added = True
        run(worktree, "config", "user.name", BOT_NAME)
        run(worktree, "config", "user.email", BOT_EMAIL)

        merge = run(worktree, "merge", "--no-ff", "-m", MERGE_MESSAGE, current_main, check=False)
        if merge.returncode != 0:
            raise CurrentizeError("MERGE_CONFLICT_OR_FAILURE", detail=(merge.stderr or merge.stdout).strip())

        new_head = run(worktree, "rev-parse", "HEAD").stdout.strip()
        if not SHA40.fullmatch(new_head):
            raise CurrentizeError("NEW_HEAD_INVALID")
        preservation = validate_new_head(repo, old_head, current_main, new_head, proof)

        assert_remote_barrier(repo, branch, old_head, current_main, "BEFORE_PUSH")

        push = run(worktree, "push", FIXED_REMOTE, f"{new_head}:refs/heads/{branch}", check=False)
        if push.returncode != 0:
            now = remote_head(repo, branch)
            reason = "REMOTE_HEAD_RACE" if now != old_head else "PUSH_FAILED_NON_RACE"
            raise CurrentizeError(reason, detail=(push.stderr or push.stdout).strip(), exit_code=4)
        pushed = True

        observed = remote_head(repo, branch)
        if observed != new_head:
            raise CurrentizeError(
                "POSTPUSH_HEAD_MISMATCH",
                detail=json.dumps({"expected": new_head, "observed": observed}, separators=(",", ":")),
                exit_code=5,
                mutation_may_have_occurred=True,
            )

        return result(
            "CURRENTIZED",
            "CURRENTIZATION_COMPLETE",
            branch=branch,
            oldHead=old_head,
            currentMain=current_main,
            newHead=new_head,
            generationBase=generation_base,
            generationShape=shape,
            nextGenerationBase=current_main,
            planner=compact_planner(proof),
            changedPaths=preservation["changedPaths"],
            changeIdentity=preservation["changeIdentity"],
            patchId=preservation["patchId"],
            treeIdentity=preservation["treeIdentity"],
            rerunPlan=proof.get("rerunPlan", []),
            historicalExactHeadEvidenceReusableAsCurrent=False,
        )
    except CurrentizeError as exc:
        if pushed and not exc.mutation_may_have_occurred:
            exc.mutation_may_have_occurred = True
        raise
    finally:
        if added:
            run(repo, "worktree", "remove", "--force", str(worktree), check=False)
        shutil.rmtree(temp_root, ignore_errors=True)


def write_result(path: Path | None, payload: dict[str, Any]) -> None:
    text = json.dumps(payload, sort_keys=True, separators=(",", ":")) + "\n"
    if path:
        path.write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)


def exit_code(payload: dict[str, Any]) -> int:
    state = payload.get("disposition")
    if state in {"CURRENTIZED", "CURRENT"}:
        return 0
    if state == "OVERLAP":
        return 1
    if state == "CONFLICT":
        return 3
    if state == "UNKNOWN":
        return 4
    return 2


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".")
    parser.add_argument("--request-file", required=True)
    parser.add_argument("--result-out")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    repo = Path(args.repo).resolve()
    result_out = Path(args.result_out).resolve() if args.result_out else None
    try:
        if not (repo / ".git").exists() and not (repo / "HEAD").exists():
            raise CurrentizeError("NOT_A_GIT_REPOSITORY")
        request = load_request(Path(args.request_file))
        payload = apply_currentization(repo, request)
        write_result(result_out, payload)
        return exit_code(payload)
    except CurrentizeError as exc:
        payload = result(
            "UNKNOWN" if exc.mutation_may_have_occurred else "BLOCKED",
            exc.reason,
            detail=exc.detail or None,
            remoteMutationMayHaveOccurred=exc.mutation_may_have_occurred,
        )
        write_result(result_out, payload)
        return exc.exit_code


if __name__ == "__main__":
    raise SystemExit(main())
