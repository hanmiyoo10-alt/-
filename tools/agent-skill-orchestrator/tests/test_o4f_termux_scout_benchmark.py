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

from benchmarks.resolve_o4f_request import MATRIX_ID, O4FRequestError, SOURCE_REPOSITORY_SHA, resolve_push
from benchmarks.run_o4f_scout_cell import (
    O4F_MODEL_PROFILE_IDS,
    REQUEST_TIMEOUT_SECONDS,
    load_o4f_case_and_evidence,
    o4f_model_profile,
)
from benchmarks.run_o4f_scout_matrix import aggregate_outputs, build_matrix_manifest
from benchmarks.run_scout_cell import build_result
from benchmarks.score_role_output import score_role_output
from canonical import canonical_sha256
from roles.scout import build_scout_prompt
from roles.scout_evidence_schema import scout_response_schema_for_evidence


class O4FTermuxScoutBenchmarkTests(unittest.TestCase):
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
        self._git(root, "config", "user.email", "o4f@example.invalid")
        self._git(root, "config", "user.name", "O4F Test")
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
        request_dir = root / ".agent-skill-o4f-requests"
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
        self._git(root, "add", ".agent-skill-o4f-requests/request.json")
        if extra:
            (root / "extra.txt").write_text("extra\n", encoding="utf-8")
            self._git(root, "add", "extra.txt")
        self._git(root, "commit", "-m", "request")
        return self._git(root, "rev-parse", "HEAD")

    def test_historical_heldout_remains_prospective_while_o4f_is_retrospective(self):
        historical = json.loads(
            (
                REPO_ROOT
                / ".agents"
                / "skills"
                / "plugin-impact-scope"
                / "evals"
                / "second_scope_candidate_evals.json"
            ).read_text(encoding="utf-8")
        )
        heldout = next(
            item
            for item in historical["evals"]
            if item["id"] == "termux-large-doc-background-autosave-heldout"
        )
        self.assertEqual(heldout["kind"], "PROSPECTIVE_HELD_OUT")
        self.assertEqual(heldout["frozen_source_snapshot"]["main"], SOURCE_REPOSITORY_SHA)
        case, _ = load_o4f_case_and_evidence()
        self.assertTrue(case["retrospective_only"])
        self.assertEqual(case["source_case_kind"], "RETROSPECTIVE_COMPATIBILITY")

    def test_frozen_evidence_is_nine_bounded_blocks_across_seven_source_surfaces(self):
        case, evidence = load_o4f_case_and_evidence()
        self.assertEqual(case["repository_snapshots"], [{"name": "main", "sha": SOURCE_REPOSITORY_SHA}])
        self.assertEqual(len(evidence["sources"]), 9)
        self.assertEqual(len({item["path"] for item in evidence["sources"]}), 7)
        self.assertEqual({item["source_sha"] for item in evidence["sources"]}, {SOURCE_REPOSITORY_SHA})
        self.assertEqual(
            {item["authority_class"] for item in evidence["sources"]},
            {"declared_by", "guidelines", "evidence", "domain_primary"},
        )
        self.assertEqual(
            set(case["known_source_refs"]),
            {item["source_ref"]["ref"] for item in evidence["sources"]},
        )

    def test_expected_labels_are_typed_scout_atoms_only(self):
        case, _ = load_o4f_case_and_evidence()
        self.assertEqual({item["kind"] for item in case["expected_labels"]}, {"source_ref", "authority"})
        self.assertEqual(len(case["expected_labels"]), 18)
        serialized = json.dumps(case["expected_labels"], sort_keys=True)
        for forbidden in ("autosave timing", "debounce", "retry", "queueing", "module placement"):
            self.assertNotIn(forbidden, serialized)

    def test_manifest_binds_two_public_zero_credit_families_and_hardened_schema(self):
        manifest = build_matrix_manifest("a" * 40)
        _, evidence = load_o4f_case_and_evidence()
        self.assertEqual(manifest["matrix_id"], MATRIX_ID)
        self.assertEqual(manifest["source_repository_sha"], SOURCE_REPOSITORY_SHA)
        self.assertEqual(manifest["model_profile_ids"], list(O4F_MODEL_PROFILE_IDS))
        self.assertEqual({item["family"] for item in manifest["models"]}, {"qwen2.5", "ministral-3"})
        self.assertTrue(all(item["execution_surface"] == "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS" for item in manifest["models"]))
        self.assertTrue(all(item["access_class"] == "public_unauthenticated_https" for item in manifest["models"]))
        self.assertEqual(manifest["response_schema_sha256"], canonical_sha256(scout_response_schema_for_evidence(evidence)))
        self.assertEqual(manifest["local_model_call_ceiling"], 2)
        self.assertEqual(manifest["hosted_ai_call_ceiling"], 0)
        self.assertEqual(manifest["request_timeout_seconds"], int(REQUEST_TIMEOUT_SECONDS))
        self.assertFalse({"winner", "rank", "assignment", "recommended_model"}.intersection(manifest))

    def test_request_resolver_accepts_only_single_parent_bound_request(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        resolved = resolve_push(root, "refs/heads/agent-skill-o4f-request/test-1", request_sha)
        self.assertEqual(resolved["target_repository_sha"], parent)
        self.assertEqual(resolved["source_repository_sha"], SOURCE_REPOSITORY_SHA)
        self.assertEqual(resolved["request_path"], ".agent-skill-o4f-requests/request.json")

    def test_request_resolver_fails_closed_on_wrong_branch_extra_path_or_source_drift(self):
        temp, root, parent = self._repo()
        self.addCleanup(temp.cleanup)
        request_sha = self._request_commit(root, parent)
        with self.assertRaises(O4FRequestError):
            resolve_push(root, "refs/heads/main", request_sha)

        temp2, root2, parent2 = self._repo()
        self.addCleanup(temp2.cleanup)
        request_sha2 = self._request_commit(root2, parent2, extra=True)
        with self.assertRaises(O4FRequestError):
            resolve_push(root2, "refs/heads/agent-skill-o4f-request/test-2", request_sha2)

        temp3, root3, parent3 = self._repo()
        self.addCleanup(temp3.cleanup)
        request_sha3 = self._request_commit(root3, parent3, source_sha="0" * 40)
        with self.assertRaises(O4FRequestError):
            resolve_push(root3, "refs/heads/agent-skill-o4f-request/test-3", request_sha3)

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
                    "response_schema_sha256": canonical_sha256(scout_response_schema_for_evidence(evidence)),
                    "request_timeout_seconds": 1800,
                    "canonical_terminal_row": True,
                    "diagnostic_replay_only": False,
                    "execution_status": result["execution_status"],
                    "model_call_count": 1,
                    "hosted_ai_call_count": 0,
                },
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )

    def test_pair_is_assignment_eligible_only_when_both_terminal_cells_are_valid(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            matrix = build_matrix_manifest("a" * 40)
            matrix_path = root / "matrix.json"
            matrix_path.write_text(json.dumps(matrix, sort_keys=True) + "\n", encoding="utf-8")
            valid = '{"r":[{"k":"s","v":"relevant_source","r":["S1@L6"]}]}'
            for profile_id in O4F_MODEL_PROFILE_IDS:
                self._write_cell(root / "cells", profile_id, valid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertTrue(summary["paired_assignment_eligible"])
            self.assertTrue(all(row["assignment_eligible"] for row in summary["rows"]))
            self.assertEqual({row["assignment_basis"] for row in summary["rows"]}, {"ELIGIBLE_RETROSPECTIVE"})
            self.assertFalse({"winner", "rank", "assignment", "recommended_model"}.intersection(summary))

            invalid = '{"r":[{"k":"s","v":"semantic prose","r":["S1@L6"]}]}'
            self._write_cell(root / "cells", O4F_MODEL_PROFILE_IDS[1], invalid)
            summary = aggregate_outputs(root / "cells", matrix_path)
            self.assertFalse(summary["paired_assignment_eligible"])
            self.assertFalse(any(row["assignment_eligible"] for row in summary["rows"]))
            self.assertEqual({row["assignment_basis"] for row in summary["rows"]}, {"HISTORICAL_TERMINAL_ONLY"})

    def test_workflow_is_one_shot_zero_credit_and_ordinary_ci_covers_it(self):
        workflow_path = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4f-termux-scout-benchmark.yml"
        workflow = workflow_path.read_text(encoding="utf-8")
        self.assertIn("agent-skill-o4f-request/**", workflow)
        self.assertIn(".agent-skill-o4f-requests/*.json", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("workflow_dispatch", workflow)
        self.assertNotIn("copilot-requests", workflow)
        self.assertIn("verify-source", workflow)
        self.assertIn("run_o4f_scout_cell", workflow)
        self.assertIn("O4F_PAIRED_ASSIGNMENT_ELIGIBLE", workflow)

        ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")
        path = ".github/workflows/agent-skill-orchestrator-o4f-termux-scout-benchmark.yml"
        self.assertGreaterEqual(ci.count(path), 2)
        self.assertNotIn("huggingface.co", ci)
        self.assertNotIn("llama-server", ci)


if __name__ == "__main__":
    unittest.main()
