from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable

from .github_reader import GitHubReadError

BEGIN = "CI_SUMMARY_V1_BEGIN"
END = "CI_SUMMARY_V1_END"
MAX_JOBS = 100
MAX_BLOCK_LINES = 64
MAX_BLOCK_BYTES = 64 * 1024
MAX_ERROR_MESSAGE = 300
ALLOWED_RESULTS = {"PASS", "NOOP", "FAIL", "INFRA_ERROR", "CANCELLED", "UNKNOWN"}
ANSI_RE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s?")
RUN_RE = re.compile(r"^Run:\s*([0-9]+)(?:\s*·\s*attempt\s+[0-9]+)?$")
COMMIT_RE = re.compile(r"^Commit:\s*([0-9a-fA-F]{7,40})$")


@dataclass(frozen=True)
class WorkflowSpec:
    key: str
    path: str
    name: str

    @property
    def filename(self) -> str:
        return self.path.rsplit("/", 1)[-1]


WORKFLOWS = (
    WorkflowSpec("simcore", ".github/workflows/simcore-ci.yml", "SimCore CI"),
    WorkflowSpec("plugin-control-plane", ".github/workflows/plugin-control-plane-ci.yml", "Plugin Control Plane CI"),
    WorkflowSpec("usage-dashboard", ".github/workflows/reusable-usage-dashboard-validate.yml", "Reusable Usage Dashboard Validate"),
    WorkflowSpec("canonical-main-proof-bundle", ".github/workflows/canonical-main-proof-bundle.yml", "Canonical Main Proof Bundle"),
    WorkflowSpec("agent-skills", ".github/workflows/agent-skills-ci.yml", "Agent Skills CI"),
    WorkflowSpec("termux-response-watch", ".github/workflows/termux-response-watch.yml", "Termux Response Watch"),
    WorkflowSpec("termux-background-gpt", ".github/workflows/termux-background-gpt.yml", "Termux Background GPT"),
    WorkflowSpec("termux-large-doc-prototype", ".github/workflows/termux-large-doc-prototype.yml", "Termux Large Doc Prototype"),
    WorkflowSpec("termux-taskbridge", ".github/workflows/termux-taskbridge.yml", "Termux TaskBridge"),
    WorkflowSpec("repository-read-mcp", ".github/workflows/repository-read-mcp-ci.yml", "Repository Read MCP CI"),
)


def _error(code: str, message: str) -> dict[str, str]:
    clean = " ".join(str(message).replace("\x00", "").split())
    if len(clean) > MAX_ERROR_MESSAGE:
        clean = clean[: MAX_ERROR_MESSAGE - 1] + "…"
    return {"code": code, "message": clean}


def _base(repository: str) -> dict[str, Any]:
    return {"ok": False, "repository": repository, "selection": None, "run": None, "summary": None, "source": None, "errors": []}


def resolve_workflow(value: str | None) -> WorkflowSpec | None:
    if value is None:
        return None
    for spec in WORKFLOWS:
        if value in {spec.key, spec.path, spec.name}:
            return spec
    return None


def supported_workflows() -> list[dict[str, str]]:
    return [{"key": item.key, "path": item.path, "name": item.name} for item in WORKFLOWS]


def normalize_workflow_path(value: object) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    text = value.split("@", 1)[0]
    marker = ".github/workflows/"
    pos = text.find(marker)
    if pos >= 0:
        text = text[pos:]
    if not text.startswith(marker):
        return None
    return text


def infer_workflow_from_run(run: dict[str, Any]) -> WorkflowSpec | None:
    path = normalize_workflow_path(run.get("path"))
    if path is None:
        return None
    for spec in WORKFLOWS:
        if path == spec.path:
            return spec
    return None


def _run_metadata(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": run.get("id"),
        "run_number": run.get("run_number"),
        "event": run.get("event"),
        "head_branch": run.get("head_branch"),
        "head_sha": run.get("head_sha"),
        "status": run.get("status"),
        "conclusion": run.get("conclusion"),
    }


def _ref_matches(run: dict[str, Any], ref: str) -> bool:
    branch = run.get("head_branch")
    sha = run.get("head_sha")
    if isinstance(branch, str) and branch == ref:
        return True
    if isinstance(sha, str) and sha == ref:
        return True
    return False


def normalize_log_line(line: str) -> str:
    line = ANSI_RE.sub("", line.rstrip("\r\n"))
    line = TIMESTAMP_RE.sub("", line)
    return line.strip()


def _candidate_blocks(lines: Iterable[str]) -> tuple[list[list[str]], list[str]]:
    blocks: list[list[str]] = []
    problems: list[str] = []
    current: list[str] | None = None
    for raw in lines:
        line = normalize_log_line(raw)
        if line == BEGIN:
            if current is not None:
                problems.append("nested begin marker")
            current = [BEGIN]
            continue
        if line == END:
            if current is None:
                problems.append("end marker without begin")
            else:
                current.append(END)
                blocks.append(current)
                current = None
            continue
        if current is not None:
            current.append(line)
    if current is not None:
        problems.append("begin marker without end")
    return blocks, problems


def _parse_block(block: list[str], run: dict[str, Any]) -> tuple[dict[str, Any] | None, dict[str, str] | None]:
    text = "\n".join(block) + "\n"
    if len(block) > MAX_BLOCK_LINES or len(text.encode("utf-8")) > MAX_BLOCK_BYTES:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block exceeds configured bound")
    if len(block) < 5 or block[0] != BEGIN or block[-1] != END:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block markers are invalid")
    body = block[1:-1]
    if not body or not body[0].startswith("CI SUMMARY · "):
        return None, _error("SUMMARY_BLOCK_INVALID", "first body line must start with CI SUMMARY ·")

    result_lines = [line for line in body if line.startswith("Result:")]
    if len(result_lines) != 1:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block must contain exactly one Result line")
    result = result_lines[0].split(":", 1)[1].strip()
    if result not in ALLOWED_RESULTS:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block result vocabulary is invalid")

    run_lines = [line for line in body if line.startswith("Run:")]
    if len(run_lines) != 1:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block must contain exactly one Run line")
    match = RUN_RE.fullmatch(run_lines[0])
    if not match:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact Run line format is invalid")
    selected_id = run.get("id")
    if isinstance(selected_id, bool) or not isinstance(selected_id, int) or int(match.group(1)) != selected_id:
        return None, _error("SUMMARY_RUN_ID_MISMATCH", "compact Run id does not match selected GitHub run")

    commit_lines = [line for line in body if line.startswith("Commit:")]
    if len(commit_lines) != 1:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact block must contain exactly one Commit line")
    commit_match = COMMIT_RE.fullmatch(commit_lines[0])
    if not commit_match:
        return None, _error("SUMMARY_BLOCK_INVALID", "compact Commit line format is invalid")
    head_sha = run.get("head_sha")
    commit_prefix = commit_match.group(1).lower()
    if not isinstance(head_sha, str) or not head_sha.lower().startswith(commit_prefix):
        return None, _error("SUMMARY_COMMIT_MISMATCH", "compact Commit prefix does not match selected GitHub run")

    complete = not any(line == "Summary complete: false" for line in body)
    return {"result": result, "complete": complete, "text": text}, None


def repo_ci_summary(reader, workflow: str | None = None, ref: str | None = None, run_id: int | None = None) -> dict[str, Any]:
    out = _base(reader.repository)
    if workflow is None and run_id is None:
        out["errors"] = [_error("WORKFLOW_REQUIRED", "at least workflow or run_id must be supplied")]
        out["supported_workflows"] = supported_workflows()
        return out

    requested_spec = resolve_workflow(workflow)
    if workflow is not None and requested_spec is None:
        out["errors"] = [_error("WORKFLOW_UNSUPPORTED", f"unsupported workflow: {workflow}")]
        out["supported_workflows"] = supported_workflows()
        return out

    selection_mode = "exact" if run_id is not None else "latest"
    selected_ref = ref if ref is not None else ("main" if selection_mode == "latest" else None)

    try:
        if run_id is not None:
            if isinstance(run_id, bool) or not isinstance(run_id, int) or run_id <= 0:
                raise ValueError("run_id must be a positive integer")
            run = reader.get_run(run_id)
            inferred_spec = infer_workflow_from_run(run)
            if inferred_spec is None:
                out["errors"] = [_error("RUN_WORKFLOW_MISMATCH", "selected run is not a supported compact-summary workflow")]
                return out
            if requested_spec is not None and inferred_spec != requested_spec:
                out["errors"] = [_error("RUN_WORKFLOW_MISMATCH", "selected run does not belong to requested workflow")]
                return out
            spec = requested_spec or inferred_spec
            if ref is not None and not _ref_matches(run, ref):
                out["selection"] = {"mode": selection_mode, "workflow_key": spec.key, "workflow_path": spec.path, "workflow_name": spec.name, "ref": ref}
                out["run"] = _run_metadata(run)
                out["errors"] = [_error("RUN_REF_MISMATCH", "selected run does not match explicitly requested ref")]
                return out
        else:
            assert requested_spec is not None
            spec = requested_spec
            runs = reader.list_workflow_runs(spec.filename, selected_ref or "main")
            if not runs:
                out["selection"] = {"mode": selection_mode, "workflow_key": spec.key, "workflow_path": spec.path, "workflow_name": spec.name, "ref": selected_ref}
                out["errors"] = [_error("RUN_NOT_FOUND", "no workflow run matched requested workflow/ref")]
                return out
            run = runs[0]
            inferred_spec = infer_workflow_from_run(run)
            if inferred_spec is None or inferred_spec != spec:
                out["errors"] = [_error("RUN_WORKFLOW_MISMATCH", "newest returned run does not match requested workflow")]
                return out
    except ValueError as exc:
        out["errors"] = [_error("RUN_NOT_FOUND", str(exc))]
        return out
    except GitHubReadError as exc:
        out["errors"] = [_error("RUN_NOT_FOUND", str(exc))]
        return out

    out["selection"] = {"mode": selection_mode, "workflow_key": spec.key, "workflow_path": spec.path, "workflow_name": spec.name, "ref": selected_ref}
    out["run"] = _run_metadata(run)

    if run.get("status") != "completed":
        out["errors"] = [_error("RUN_NOT_TERMINAL", "selected newest run is not terminal; older runs were not substituted")]
        return out

    selected_id = run.get("id")
    if isinstance(selected_id, bool) or not isinstance(selected_id, int) or selected_id <= 0:
        out["errors"] = [_error("RUN_NOT_FOUND", "selected run id is invalid")]
        return out

    try:
        total_jobs, jobs = reader.list_jobs(selected_id)
    except GitHubReadError as exc:
        out["errors"] = [_error("JOBS_UNAVAILABLE", str(exc))]
        return out
    if total_jobs > MAX_JOBS or len(jobs) > MAX_JOBS:
        out["errors"] = [_error("JOBS_BOUND_EXCEEDED", f"selected run has more than {MAX_JOBS} jobs")]
        return out

    candidates: list[tuple[dict[str, Any], list[str]]] = []
    malformed: list[str] = []
    for job in jobs:
        if job.get("conclusion") == "skipped":
            continue
        job_id = job.get("id")
        if isinstance(job_id, bool) or not isinstance(job_id, int) or job_id <= 0:
            out["errors"] = [_error("JOBS_UNAVAILABLE", "job metadata contains invalid id")]
            return out
        try:
            log = reader.get_job_log(job_id)
        except GitHubReadError as exc:
            out["errors"] = [_error("JOB_LOG_UNAVAILABLE", f"job {job_id}: {exc}")]
            return out
        blocks, problems = _candidate_blocks(log.splitlines())
        malformed.extend(f"job {job_id}: {problem}" for problem in problems)
        candidates.extend((job, block) for block in blocks)

    if malformed:
        out["errors"] = [_error("SUMMARY_BLOCK_INVALID", malformed[0])]
        return out
    if not candidates:
        out["errors"] = [_error("SUMMARY_BLOCK_MISSING", "no exact CI_SUMMARY_V1 marker block found in selected run")]
        return out
    if len(candidates) != 1:
        out["errors"] = [_error("SUMMARY_BLOCK_AMBIGUOUS", f"found {len(candidates)} compact blocks across selected run")]
        return out

    job, block = candidates[0]
    summary, error = _parse_block(block, run)
    if error is not None:
        out["errors"] = [error]
        return out

    out["ok"] = True
    out["summary"] = summary
    out["source"] = {"kind": "github_actions_job_log_compact_block", "job_id": job.get("id"), "job_name": job.get("name")}
    return out
