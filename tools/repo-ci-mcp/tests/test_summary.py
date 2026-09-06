from __future__ import annotations

import unittest

from repo_ci_mcp.github_reader import GitHubReadError
from repo_ci_mcp.summary import (
    BEGIN,
    END,
    WORKFLOWS,
    infer_workflow_from_run,
    normalize_log_line,
    normalize_workflow_path,
    repo_ci_summary,
    resolve_workflow,
)


def block(run_id=42, sha="abcdef1234567890abcdef1234567890abcdef12", result="PASS", extra=()):
    return "\n".join((BEGIN, "CI SUMMARY · Test", f"Result: {result}", *extra, f"Run: {run_id} · attempt 1", f"Commit: {sha[:12]}", END, ""))


def run(run_id=42, path=".github/workflows/simcore-ci.yml", branch="main", sha="abcdef1234567890abcdef1234567890abcdef12", status="completed", conclusion="success"):
    return {"id": run_id, "run_number": 7, "event": "push", "head_branch": branch, "head_sha": sha, "status": status, "conclusion": conclusion, "path": path}


class FakeReader:
    repository = "hanmiyoo10-alt/-"

    def __init__(self, selected=None, runs=None, jobs=None, logs=None):
        self.selected = selected or run()
        self.runs = list(runs if runs is not None else [self.selected])
        self.jobs = list(jobs if jobs is not None else [{"id": 9, "name": "test", "conclusion": "success"}])
        self.logs = dict(logs if logs is not None else {9: block(self.selected["id"], self.selected["head_sha"])})
        self.calls = []

    def get_run(self, run_id):
        self.calls.append(("get_run", run_id))
        return self.selected

    def list_workflow_runs(self, filename, ref):
        self.calls.append(("list_workflow_runs", filename, ref))
        return self.runs

    def list_jobs(self, run_id):
        self.calls.append(("list_jobs", run_id))
        return len(self.jobs), self.jobs

    def get_job_log(self, job_id):
        self.calls.append(("get_job_log", job_id))
        value = self.logs[job_id]
        if isinstance(value, Exception):
            raise value
        return value


class SummaryTests(unittest.TestCase):
    def test_01_key_resolution(self): self.assertEqual(resolve_workflow("simcore"), WORKFLOWS[0])
    def test_02_path_resolution(self): self.assertEqual(resolve_workflow(WORKFLOWS[1].path), WORKFLOWS[1])
    def test_03_name_resolution(self): self.assertEqual(resolve_workflow(WORKFLOWS[2].name), WORKFLOWS[2])
    def test_04_unknown_resolution(self): self.assertIsNone(resolve_workflow("wat"))
    def test_05_registry_has_nine(self): self.assertEqual(len(WORKFLOWS), 9)
    def test_06_path_suffix_normalized(self): self.assertEqual(normalize_workflow_path(".github/workflows/simcore-ci.yml@refs/heads/main"), WORKFLOWS[0].path)
    def test_07_owner_prefix_normalized(self): self.assertEqual(normalize_workflow_path("hanmiyoo10-alt/-/.github/workflows/simcore-ci.yml@abc"), WORKFLOWS[0].path)
    def test_08_invalid_path_none(self): self.assertIsNone(normalize_workflow_path("x.yml"))
    def test_09_infer_supported(self): self.assertEqual(infer_workflow_from_run(run()), WORKFLOWS[0])
    def test_10_infer_unsupported(self): self.assertIsNone(infer_workflow_from_run(run(path=".github/workflows/other.yml")))
    def test_11_timestamp_normalized(self): self.assertEqual(normalize_log_line("2026-09-06T01:02:03.456Z CI_SUMMARY_V1_BEGIN"), BEGIN)
    def test_12_ansi_normalized(self): self.assertEqual(normalize_log_line("\x1b[31mCI_SUMMARY_V1_BEGIN\x1b[0m"), BEGIN)
    def test_13_shell_literal_not_marker(self): self.assertNotEqual(normalize_log_line('echo "CI_SUMMARY_V1_BEGIN"'), BEGIN)
    def test_14_missing_inputs(self): self.assertEqual(repo_ci_summary(FakeReader())["errors"][0]["code"], "WORKFLOW_REQUIRED")
    def test_15_unsupported_workflow(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="wat")["errors"][0]["code"], "WORKFLOW_UNSUPPORTED")
    def test_16_latest_happy(self): self.assertTrue(repo_ci_summary(FakeReader(), workflow="simcore")["ok"])
    def test_17_latest_default_ref_main(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="simcore")["selection"]["ref"], "main")
    def test_18_latest_uses_first_only(self):
        newest = run(run_id=50, status="queued", conclusion=None)
        older = run(run_id=49)
        reader = FakeReader(selected=newest, runs=[newest, older])
        out = repo_ci_summary(reader, workflow="simcore")
        self.assertEqual(out["errors"][0]["code"], "RUN_NOT_TERMINAL")
        self.assertNotIn(("list_jobs", 49), reader.calls)
    def test_19_latest_no_runs(self): self.assertEqual(repo_ci_summary(FakeReader(runs=[]), workflow="simcore")["errors"][0]["code"], "RUN_NOT_FOUND")
    def test_20_latest_run_path_mismatch(self):
        rr = run(path=".github/workflows/agent-skills-ci.yml")
        self.assertEqual(repo_ci_summary(FakeReader(selected=rr, runs=[rr]), workflow="simcore")["errors"][0]["code"], "RUN_WORKFLOW_MISMATCH")
    def test_21_exact_happy(self): self.assertTrue(repo_ci_summary(FakeReader(), workflow="simcore", run_id=42)["ok"])
    def test_22_exact_infers_workflow(self): self.assertEqual(repo_ci_summary(FakeReader(), run_id=42)["selection"]["workflow_key"], "simcore")
    def test_23_exact_workflow_mismatch(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="agent-skills", run_id=42)["errors"][0]["code"], "RUN_WORKFLOW_MISMATCH")
    def test_24_exact_ref_branch_match(self): self.assertTrue(repo_ci_summary(FakeReader(), workflow="simcore", ref="main", run_id=42)["ok"])
    def test_25_exact_ref_sha_match(self): self.assertTrue(repo_ci_summary(FakeReader(), workflow="simcore", ref=run()["head_sha"], run_id=42)["ok"])
    def test_26_exact_ref_mismatch(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="simcore", ref="other", run_id=42)["errors"][0]["code"], "RUN_REF_MISMATCH")
    def test_27_nonterminal(self): self.assertEqual(repo_ci_summary(FakeReader(selected=run(status="in_progress", conclusion=None)), workflow="simcore")["errors"][0]["code"], "RUN_NOT_TERMINAL")
    def test_28_pass_result_ok(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="simcore")["summary"]["result"], "PASS")
    def test_29_fail_result_still_ok(self):
        reader = FakeReader(logs={9: block(result="FAIL", extra=("First failure:", "- code: X"))})
        out = repo_ci_summary(reader, workflow="simcore")
        self.assertTrue(out["ok"]); self.assertEqual(out["summary"]["result"], "FAIL")
    def test_30_noop_result(self):
        out = repo_ci_summary(FakeReader(logs={9: block(result="NOOP")}), workflow="simcore")
        self.assertEqual(out["summary"]["result"], "NOOP")
    def test_31_incomplete_false(self):
        out = repo_ci_summary(FakeReader(logs={9: block(extra=("Summary complete: false",))}), workflow="simcore")
        self.assertFalse(out["summary"]["complete"])
    def test_32_missing_block(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9: "hello\n"}), workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_MISSING")
    def test_33_duplicate_same_job(self):
        out = repo_ci_summary(FakeReader(logs={9: block() + block()}), workflow="simcore")
        self.assertEqual(out["errors"][0]["code"], "SUMMARY_BLOCK_AMBIGUOUS")
    def test_34_duplicate_across_jobs(self):
        reader = FakeReader(jobs=[{"id": 9, "name": "a", "conclusion": "success"},{"id":10,"name":"b","conclusion":"success"}], logs={9:block(),10:block()})
        self.assertEqual(repo_ci_summary(reader, workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_AMBIGUOUS")
    def test_35_end_without_begin(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9: END+"\n"}), workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_INVALID")
    def test_36_begin_without_end(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9: BEGIN+"\nfoo\n"}), workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_INVALID")
    def test_37_nested_begin(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9: BEGIN+"\n"+BEGIN+"\n"+END+"\n"}), workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_INVALID")
    def test_38_invalid_result(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9:block(result="GREEN")}), workflow="simcore")["errors"][0]["code"], "SUMMARY_BLOCK_INVALID")
    def test_39_run_id_mismatch(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9:block(run_id=41)}), workflow="simcore")["errors"][0]["code"], "SUMMARY_RUN_ID_MISMATCH")
    def test_40_commit_mismatch(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9:block(sha="1111111111111111111111111111111111111111")}), workflow="simcore")["errors"][0]["code"], "SUMMARY_COMMIT_MISMATCH")
    def test_41_skipped_job_ignored(self):
        reader = FakeReader(jobs=[{"id":8,"name":"skip","conclusion":"skipped"},{"id":9,"name":"ok","conclusion":"success"}], logs={8:GitHubReadError("no log"),9:block()})
        self.assertTrue(repo_ci_summary(reader, workflow="simcore")["ok"])
    def test_42_job_log_failure(self): self.assertEqual(repo_ci_summary(FakeReader(logs={9:GitHubReadError("boom")}), workflow="simcore")["errors"][0]["code"], "JOB_LOG_UNAVAILABLE")
    def test_43_job_bound(self):
        reader = FakeReader(); reader.jobs=[{"id": i+1,"name":str(i),"conclusion":"success"} for i in range(101)]
        self.assertEqual(repo_ci_summary(reader, workflow="simcore")["errors"][0]["code"], "JOBS_BOUND_EXCEEDED")
    def test_44_source_job_preserved(self): self.assertEqual(repo_ci_summary(FakeReader(), workflow="simcore")["source"]["job_id"], 9)
    def test_45_text_has_final_newline(self): self.assertTrue(repo_ci_summary(FakeReader(), workflow="simcore")["summary"]["text"].endswith("\n"))
    def test_46_text_preserves_markers(self):
        text = repo_ci_summary(FakeReader(), workflow="simcore")["summary"]["text"]
        self.assertTrue(text.startswith(BEGIN+"\n")); self.assertTrue(text.endswith(END+"\n"))
