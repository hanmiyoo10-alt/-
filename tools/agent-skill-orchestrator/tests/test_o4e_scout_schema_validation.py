from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))
REPO_ROOT = PACKAGE.parents[1]

from benchmarks.resolve_o4e_request import MATRIX_ID, O4ERequestError, resolve_push
from benchmarks.run_o4e_scout_cell import REQUEST_TIMEOUT_SECONDS, main as cell_main
from benchmarks.run_o4e_scout_schema_validation import (
    EXPECTED_EVIDENCE_SHA256,
    EXPECTED_FIXTURE_SHA256,
    EXPECTED_PROMPT_SHA256,
    aggregate_outputs,
    build_matrix_manifest,
)
from benchmarks.run_scout_cell import (
    O4C_MODEL_PROFILE_IDS,
    benchmark_model_profile,
    build_result,
    load_case_and_evidence,
)
from benchmarks.score_role_output import score_role_output
from canonical import canonical_sha256
from roles.scout import build_scout_prompt, prompt_sha256, scout_response_schema
from roles.scout_evidence_schema import scout_response_schema_for_evidence


class O4EScoutSchemaValidationTests(unittest.TestCase):
    def _git(self, root: Path, *args: str) -> str:
        proc = subprocess.run(
            ["git", "-C", str(root), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return proc.stdout.strip()

    def _repo(self) -> tuple[tempfile.TemporaryDirectory[str], Path, str]:
        temp = tempfile.TemporaryDirectory()
        root = Path(temp.name)
        self._git(root, "init")
        self._git(root, "config", "user.email", "o4e@example.invalid")
        self._git(root, "config", "user.name", "O4E Test")
        (root / "base.txt").write_text("base\n", encoding="utf-8")
        self._git(root, "add", "base.txt")
        self._git(root, "commit", "-m", "base")
        return temp, root, self._git(root, "rev-parse", "HEAD")

    def _request_commit(self, root: Path, target_sha: str, *, extra: bool = False) -> str:
        request_dir = root / ".agent-skill-o4e-requests"
        request_dir.mkdir(parents=True, exist_ok=True)
        (request_dir / "request.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "matrix_id": MATRIX_ID,
                    "target_repository_sha": target_sha,
                },
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", ".agent-skill-o4e-requests/request.json")
        if extra:
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            self._git(root, "add", "extra.txt")
        self._git(root, "commit", "-m", "request")
        return self._git(root, "rev-parse", "HEAD")

    def test_request_resolver_accepts_exact_single_file_parent_bound_commit(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        resolved = resolve_push(
            root,
            "refs/heads/agent-skill-o4e-request/test-1",
            request_sha,
        )
        self.assertEqual(resolved["target_repository_sha"], parent)
        self.assertEqual(resolved["request_commit_sha"], request_sha)
        self.assertEqual(resolved["matrix_id"], MATRIX_ID)
        self.assertEqual(resolved["request_path"], ".agent-skill-o4e-requests/request.json")

    def test_request_resolver_fails_closed_for_wrong_branch_extra_path_and_target_mismatch(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        with self.assertRaises(O4ERequestError):
            resolve_push(root, "refs/heads/main", request_sha)

        temp2, root2, parent2 = self._repo()
        self.addCleanup(temp2.cleanup)
        request_sha2 = self._request_commit(root2, parent2, extra=True)
        with self.assertRaises(O4ERequestError):
            resolve_push(root2, "refs/heads/agent-skill-o4e-request/test-2", request_sha2)

        temp3, root3, parent3 = self._repo()
        self.addCleanup(temp3.cleanup)
        request_sha3 = self._request_commit(root3, "0" * 40)
        with self.assertRaises(O4ERequestError):
            resolve_push(root3, "refs/heads/agent-skill-o4e-request/test-3", request_sha3)
        self.assertNotEqual(parent3, "0" * 40)

    def test_request_resolver_rejects_modified_existing_request(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        first = self._request_commit(root, parent)
        path = root / ".agent-skill-o4e-requests" / "request.json"
        path.write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "matrix_id": MATRIX_ID,
                    "target_repository_sha": first,
                },
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", str(path.relative_to(root)))
        self._git(root, "commit", "-m", "modify request")
        second = self._git(root, "rev-parse", "HEAD")
        with self.assertRaises(O4ERequestError):
            resolve_push(root, "refs/heads/agent-skill-o4e-request/test-4", second)

    def test_manifest_binds_hardened_schema_and_frozen_o4c_inputs(self):
        manifest = build_matrix_manifest("a" * 40)
        case, evidence = load_case_and_evidence()
        prompt = build_scout_prompt(evidence)
        self.assertEqual(manifest["matrix_id"], MATRIX_ID)
        self.assertEqual(manifest["fixture_sha256"], EXPECTED_FIXTURE_SHA256)
        self.assertEqual(manifest["evidence_sha256"], EXPECTED_EVIDENCE_SHA256)
        self.assertEqual(manifest["prompt_sha256"], EXPECTED_PROMPT_SHA256)
        self.assertEqual(prompt_sha256(prompt), EXPECTED_PROMPT_SHA256)
        self.assertEqual(case["fixture_sha256"], EXPECTED_FIXTURE_SHA256)
        self.assertEqual(
            manifest["response_schema_sha256"],
            canonical_sha256(scout_response_schema_for_evidence(evidence)),
        )
        self.assertNotEqual(manifest["response_schema_sha256"], canonical_sha256(scout_response_schema()))
        self.assertEqual(manifest["request_timeout_seconds"], 1800)
        self.assertEqual(int(REQUEST_TIMEOUT_SECONDS), 1800)
        self.assertEqual(manifest["model_profile_ids"], list(O4C_MODEL_PROFILE_IDS))
        self.assertEqual(manifest["local_model_call_ceiling"], 2)
        self.assertEqual(manifest["hosted_ai_call_ceiling"], 0)
        self.assertFalse({"winner", "rank", "assignment", "recommended_model"}.intersection(manifest))

    def _write_cell(self, root: Path, profile_id: str, content: str) -> None:
        case, evidence = load_case_and_evidence()
        prompt = build_scout_prompt(evidence)
        result, artifact, receipt = build_result(
            case=case,
            evidence=evidence,
            profile=benchmark_model_profile(profile_id),
            runtime_version="llama.cpp test",
            runtime_binary_sha256="b" * 64,
            prompt=prompt,
            content=content,
            finish_reason="stop",
            envelope={"usage": {"prompt_tokens": 10, "completion_tokens": 5}},
            wall_clock_ms=1,
        )
        del artifact, receipt
        score = score_role_output(case, result)
        cell = root / profile_id
        cell.mkdir(parents=True, exist_ok=True)
        (cell / "result.json").write_text(json.dumps(result, sort_keys=True) + "\n", encoding="utf-8")
        (cell / "score.json").write_text(json.dumps(score, sort_keys=True) + "\n", encoding="utf-8")
        (cell / "cell-metadata.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "model_profile_id": profile_id,
                    "response_schema_sha256": canonical_sha256(scout_response_schema_for_evidence(evidence)),
                    "request_timeout_seconds": 1800,
                    "canonical_terminal_row": True,
                    "execution_status": result["execution_status"],
                    "model_call_count": 1,
                    "hosted_ai_call_count": 0,
                },
                sort_keys=True,
            ) + "\n",
            encoding="utf-8",
        )

    def test_aggregate_accepts_two_terminal_rows_and_reports_only_hardening_verdict(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            matrix = build_matrix_manifest("a" * 40)
            matrix_path = root / "matrix.json"
            matrix_path.write_text(json.dumps(matrix, sort_keys=True) + "\n", encoding="utf-8")
            valid = '{"r":[{"k":"s","v":"relevant_source","r":["S1@L21"]}]}'
            for profile_id in O4C_MODEL_PROFILE_IDS:
                self._write_cell(root / "cells", profile_id, valid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertEqual(summary["hardening_verdict"], "HARDENING_VALIDATED")
            self.assertEqual(summary["local_model_call_count"], 2)
            self.assertFalse({"winner", "rank", "assignment", "recommended_model"}.intersection(summary))

            invalid = '{"r":[{"k":"s","v":"semantic prose","r":["S1@L21"]}]}'
            self._write_cell(root / "cells", O4C_MODEL_PROFILE_IDS[1], invalid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertEqual(summary["hardening_verdict"], "HARDENING_NOT_VALIDATED")
            self.assertEqual(len(summary["rows"]), 2)

    def test_cell_main_returns_success_for_canonical_invalid_terminal_evidence(self):
        fake_result = {
            "execution_status": "INVALID",
            "model": {"profile_id": O4C_MODEL_PROFILE_IDS[0]},
            "result_sha256": "1" * 64,
        }
        fake_score = {"score_sha256": "2" * 64}
        fake_metadata = {"response_schema_sha256": "3" * 64}
        with tempfile.TemporaryDirectory() as temp, patch(
            "benchmarks.run_o4e_scout_cell.execute_cell",
            return_value=(
                fake_result,
                fake_score,
                "prompt",
                "response",
                {},
                None,
                {},
                fake_metadata,
            ),
        ):
            rc = cell_main([
                "--model-profile", O4C_MODEL_PROFILE_IDS[0],
                "--port", "39139",
                "--runtime-version", "test",
                "--runtime-binary-sha256", "b" * 64,
                "--output-dir", temp,
            ])
            self.assertEqual(rc, 0)
            self.assertTrue((Path(temp) / "result.json").exists())

    def test_workflow_is_request_only_zero_credit_and_ordinary_ci_covers_it(self):
        workflow_path = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4e-scout-schema-validation.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("agent-skill-o4e-request/**", workflow)
        self.assertIn(".agent-skill-o4e-requests/*.json", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("workflow_dispatch", workflow)
        self.assertNotIn("copilot-requests", workflow)
        self.assertIn("run_o4e_scout_cell", workflow)
        self.assertIn("HARDENING_VALIDATED", workflow)

        ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")
        path = ".github/workflows/agent-skill-orchestrator-o4e-scout-schema-validation.yml"
        self.assertGreaterEqual(ci.count(path), 2)
        self.assertNotIn("huggingface.co", ci)
        self.assertNotIn("llama-server", ci)


if __name__ == "__main__":
    unittest.main()
