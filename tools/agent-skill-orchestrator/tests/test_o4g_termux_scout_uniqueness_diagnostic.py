from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))
REPO_ROOT = PACKAGE.parents[1]

from benchmarks.resolve_o4g_request import (
    MATRIX_ID,
    O4GRequestError,
    SOURCE_REPOSITORY_SHA,
    resolve_push,
)
from benchmarks.run_o4f_scout_cell import load_o4f_case_and_evidence, o4f_model_profile
from benchmarks.run_o4g_scout_cell import O4G_MODEL_PROFILE_IDS
from benchmarks.run_o4g_scout_matrix import aggregate_outputs, build_matrix_manifest
from benchmarks.run_scout_cell import build_result
from benchmarks.score_role_output import score_role_output
from canonical import canonical_sha256
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import (
    scout_response_schema_for_evidence,
    scout_response_schema_for_evidence_unique_refs,
)


class O4GTermuxScoutUniquenessDiagnosticTests(unittest.TestCase):
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
        self._git(root, "config", "user.email", "o4g@example.invalid")
        self._git(root, "config", "user.name", "O4G Test")
        (root / "base.txt").write_text("base\n", encoding="utf-8")
        self._git(root, "add", "base.txt")
        self._git(root, "commit", "-m", "base")
        return temp, root, self._git(root, "rev-parse", "HEAD")

    def _request_commit(
        self,
        root: Path,
        target_sha: str,
        *,
        source_sha: str = SOURCE_REPOSITORY_SHA,
        extra: bool = False,
    ) -> str:
        request_dir = root / ".agent-skill-o4g-requests"
        request_dir.mkdir(parents=True, exist_ok=True)
        (request_dir / "request.json").write_text(
            json.dumps(
                {
                    "schema_version": 1,
                    "matrix_id": MATRIX_ID,
                    "target_repository_sha": target_sha,
                    "source_repository_sha": source_sha,
                },
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )
        self._git(root, "add", ".agent-skill-o4g-requests/request.json")
        if extra:
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            self._git(root, "add", "extra.txt")
        self._git(root, "commit", "-m", "request")
        return self._git(root, "rev-parse", "HEAD")

    def test_manifest_reuses_o4f_fixture_but_binds_strict_schema_only(self):
        manifest = build_matrix_manifest("a" * 40)
        case, evidence = load_o4f_case_and_evidence()
        historical_sha = canonical_sha256(scout_response_schema_for_evidence(evidence))
        strict_sha = canonical_sha256(scout_response_schema_for_evidence_unique_refs(evidence))
        self.assertEqual(manifest["matrix_id"], MATRIX_ID)
        self.assertEqual(manifest["case_id"], case["case_id"])
        self.assertEqual(manifest["fixture_sha256"], case["fixture_sha256"])
        self.assertEqual(manifest["evidence_sha256"], case["evidence_sha256"])
        self.assertEqual(manifest["source_repository_sha"], SOURCE_REPOSITORY_SHA)
        self.assertEqual(manifest["response_schema_sha256"], strict_sha)
        self.assertNotEqual(strict_sha, historical_sha)
        self.assertEqual(manifest["response_schema_mode"], "STRICT_UNIQUE_REF_ARRAY_ENUM")
        self.assertTrue(manifest["diagnostic_replay_only"])
        self.assertFalse(manifest["assignment_candidate_only"])
        self.assertFalse(manifest["independent_assignment_case"])
        self.assertFalse(manifest["paired_assignment_eligible"])
        self.assertEqual(manifest["local_model_call_ceiling"], 2)
        self.assertEqual(manifest["hosted_ai_call_ceiling"], 0)
        self.assertEqual(manifest["model_profile_ids"], list(O4G_MODEL_PROFILE_IDS))
        self.assertFalse({"winner", "rank", "ranking", "assignment", "tie_break"}.intersection(manifest))

    def test_request_resolver_accepts_only_new_o4g_namespace_and_parent_bound_target(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        resolved = resolve_push(root, "refs/heads/agent-skill-o4g-request/once", request_sha)
        self.assertEqual(resolved["target_repository_sha"], parent)
        self.assertEqual(resolved["source_repository_sha"], SOURCE_REPOSITORY_SHA)
        self.assertTrue(resolved["diagnostic_replay_only"])
        self.assertFalse(resolved["independent_assignment_case"])
        self.assertEqual(resolved["request_path"], ".agent-skill-o4g-requests/request.json")

    def test_request_resolver_fails_closed_on_old_namespace_extra_path_or_source_drift(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        with self.assertRaises(O4GRequestError):
            resolve_push(root, "refs/heads/agent-skill-o4f-request/old", request_sha)

        temp2, root2, parent2 = self._repo()
        self.addCleanup(temp2.cleanup)
        request_sha2 = self._request_commit(root2, parent2, extra=True)
        with self.assertRaises(O4GRequestError):
            resolve_push(root2, "refs/heads/agent-skill-o4g-request/extra", request_sha2)

        temp3, root3, parent3 = self._repo()
        self.addCleanup(temp3.cleanup)
        request_sha3 = self._request_commit(root3, parent3, source_sha="0" * 40)
        with self.assertRaises(O4GRequestError):
            resolve_push(root3, "refs/heads/agent-skill-o4g-request/source", request_sha3)

    def _write_cell(self, root: Path, profile_id: str, content: str) -> None:
        case, evidence = load_o4f_case_and_evidence()
        prompt = build_scout_prompt(evidence)
        result, artifact, receipt = build_result(
            case=case,
            evidence=evidence,
            profile=o4f_model_profile(profile_id),
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
                    "measurement_id": MATRIX_ID,
                    "model_profile_id": profile_id,
                    "response_schema_sha256": canonical_sha256(
                        scout_response_schema_for_evidence_unique_refs(evidence)
                    ),
                    "request_timeout_seconds": 1800,
                    "canonical_terminal_row": True,
                    "diagnostic_replay_only": True,
                    "independent_assignment_case": False,
                    "assignment_eligible": False,
                    "assignment_basis": "DIAGNOSTIC_ONLY",
                    "execution_status": result["execution_status"],
                    "model_call_count": 1,
                    "hosted_ai_call_count": 0,
                },
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )

    def test_valid_pair_is_diagnostic_closed_but_never_assignment_eligible(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            matrix = build_matrix_manifest("a" * 40)
            matrix_path = root / "matrix.json"
            matrix_path.write_text(json.dumps(matrix, sort_keys=True) + "\n", encoding="utf-8")
            valid = '{"r":[{"k":"s","v":"relevant_source","r":["S1@L6"]}]}'
            for profile_id in O4G_MODEL_PROFILE_IDS:
                self._write_cell(root / "cells", profile_id, valid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertTrue(summary["paired_contract_valid"])
            self.assertEqual(summary["diagnostic_observation"], "STRICT_UNIQUENESS_GAP_OBSERVED_CLOSED")
            self.assertTrue(summary["diagnostic_replay_only"])
            self.assertFalse(summary["independent_assignment_case"])
            self.assertFalse(summary["paired_assignment_eligible"])
            self.assertFalse(any(row["assignment_eligible"] for row in summary["rows"]))
            self.assertEqual({row["assignment_basis"] for row in summary["rows"]}, {"DIAGNOSTIC_ONLY"})
            self.assertFalse({"winner", "rank", "ranking", "assignment", "tie_break"}.intersection(summary))

    def test_invalid_terminal_row_remains_diagnostic_and_cannot_promote(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            matrix = build_matrix_manifest("a" * 40)
            matrix_path = root / "matrix.json"
            matrix_path.write_text(json.dumps(matrix, sort_keys=True) + "\n", encoding="utf-8")
            valid = '{"r":[{"k":"s","v":"relevant_source","r":["S1@L6"]}]}'
            invalid = '{"r":[{"k":"s","v":"semantic prose","r":["S1@L6"]}]}'
            self._write_cell(root / "cells", O4G_MODEL_PROFILE_IDS[0], invalid)
            self._write_cell(root / "cells", O4G_MODEL_PROFILE_IDS[1], valid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertFalse(summary["paired_contract_valid"])
            self.assertEqual(
                summary["diagnostic_observation"],
                "STRICT_UNIQUENESS_GAP_NOT_CLOSED_OR_INCONCLUSIVE",
            )
            self.assertFalse(summary["paired_assignment_eligible"])
            self.assertFalse(any(row["assignment_eligible"] for row in summary["rows"]))

    def test_workflow_is_one_shot_zero_credit_diagnostic_and_ci_covers_it(self):
        workflow_path = (
            REPO_ROOT
            / ".github"
            / "workflows"
            / "agent-skill-orchestrator-o4g-termux-scout-uniqueness-diagnostic.yml"
        )
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("agent-skill-o4g-request/**", workflow)
        self.assertIn(".agent-skill-o4g-requests/*.json", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("workflow_dispatch", workflow)
        self.assertNotIn("copilot-requests", workflow)
        self.assertIn("run_o4g_scout_cell", workflow)
        self.assertIn("O4G_PAIRED_ASSIGNMENT_ELIGIBLE:false", workflow)
        self.assertIn("O4G_DIAGNOSTIC_REPLAY_ONLY:true", workflow)

        ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")
        path = ".github/workflows/agent-skill-orchestrator-o4g-termux-scout-uniqueness-diagnostic.yml"
        self.assertGreaterEqual(ci.count(path), 2)
        self.assertNotIn("huggingface.co", ci)
        self.assertNotIn("llama-server", ci)


if __name__ == "__main__":
    unittest.main()
