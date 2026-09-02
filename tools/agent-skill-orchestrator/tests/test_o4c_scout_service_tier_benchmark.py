from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[1]
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from benchmarks.run_o4c_scout_matrix import (
    O4C_MODEL_PROFILE_IDS,
    build_matrix_manifest,
    prepare_matrix,
)
from benchmarks.run_scout_cell import (
    CASE_PATH,
    EVIDENCE_PATH,
    benchmark_model_profile,
    load_case_and_evidence,
    scout_wire_to_atoms,
)
from evidence import evidence_package_sha256
from roles.scout import ScoutContractError, validate_scout_wire
from runtime.budget_profile import DEFAULT_RUNTIME_BUDGET_PROFILE_ID
from runtime.generation import SCOUT_MODEL_PROFILE_ID


class O4CScoutServiceTierBenchmarkTests(unittest.TestCase):
    def setUp(self) -> None:
        self.case, self.evidence = load_case_and_evidence()

    def test_frozen_fixture_and_evidence_identity(self) -> None:
        self.assertTrue(self.case["retrospective_only"])
        self.assertEqual(
            self.case["evidence_sha256"],
            "06c345cde924c8dc8e84d1c65a03d9ee8b2a477ea856f5abd0603444485b4d97",
        )
        self.assertEqual(
            self.case["fixture_sha256"],
            "196905603a4c291dbce17744c20bf004c1e9a05c331e1bb7acdd38cca9fa3c6f",
        )
        self.assertEqual(evidence_package_sha256(self.evidence), self.case["evidence_sha256"])
        self.assertEqual(
            self.case["repository_snapshots"],
            [
                {"name": "main", "sha": "f5dd31c0c5a0f0fc7f293d768ed402c304b1704f"},
                {"name": "release-usage-dashboard", "sha": "82c4f900cf548068d1eada957c982a5d78f1347b"},
            ],
        )

    def test_exactly_one_known_source_is_intentional_distractor(self) -> None:
        known = set(self.case["known_source_refs"])
        relevant = {
            item["ref"]
            for item in self.case["expected_labels"]
            if item["kind"] == "source_ref"
        }
        authority_labels = [
            item
            for item in self.case["expected_labels"]
            if item["kind"] == "authority"
        ]
        authority_refs = {ref for item in authority_labels for ref in item["refs"]}
        self.assertEqual(len(relevant), 8)
        self.assertEqual(len(authority_labels), 8)
        self.assertTrue(all(len(item["refs"]) == 1 for item in authority_labels))
        self.assertEqual(authority_refs, relevant)
        self.assertEqual(known - relevant, {"S4@L90"})

    def test_scout_atomization_is_batching_independent_and_deduplicates(self) -> None:
        wire_a = json.dumps({
            "r": [
                {"k": "s", "v": "relevant_source", "r": ["S1@L21", "S2@L749", "S3@L1"]},
                {"k": "a", "v": "domain_primary", "r": ["S1@L21", "S2@L749"]},
                {"k": "a", "v": "manifest", "r": ["S3@L1"]},
            ]
        }, separators=(",", ":"))
        wire_b = json.dumps({
            "r": [
                {"k": "s", "v": "relevant_source", "r": ["S1@L21"]},
                {"k": "s", "v": "relevant_source", "r": ["S2@L749", "S3@L1"]},
                {"k": "s", "v": "relevant_source", "r": ["S1@L21"]},
                {"k": "a", "v": "domain_primary", "r": ["S2@L749"]},
                {"k": "a", "v": "domain_primary", "r": ["S1@L21", "S2@L749"]},
                {"k": "a", "v": "manifest", "r": ["S3@L1"]},
            ]
        }, separators=(",", ":"))
        self.assertEqual(
            scout_wire_to_atoms(wire_a, self.evidence),
            scout_wire_to_atoms(wire_b, self.evidence),
        )

    def test_unknown_ref_fails_production_scout_validator(self) -> None:
        wire = json.dumps({
            "r": [{"k": "s", "v": "relevant_source", "r": ["S99@L99"]}]
        }, separators=(",", ":"))
        with self.assertRaises(ScoutContractError):
            validate_scout_wire(wire, self.evidence)

    def test_matrix_is_exactly_two_enabled_public_zero_credit_profiles(self) -> None:
        self.assertEqual(
            O4C_MODEL_PROFILE_IDS,
            (
                "qwen2.5-3b-instruct-q4_k_m",
                "ministral-3-3b-instruct-2512-q4_k_m",
            ),
        )
        for profile_id in O4C_MODEL_PROFILE_IDS:
            profile = benchmark_model_profile(profile_id)
            self.assertTrue(profile["enabled"])
            self.assertEqual(profile["access"]["class"], "public_unauthenticated_https")
            self.assertEqual(
                profile["execution_surface"],
                "LOCAL_GITHUB_HOSTED_CPU_ZERO_AI_CREDITS",
            )
            self.assertRegex(profile["sha256"], r"^[0-9a-f]{64}$")

    def test_production_scout_and_budget_bindings_remain_qwen(self) -> None:
        self.assertEqual(SCOUT_MODEL_PROFILE_ID, "qwen2.5-3b-instruct-q4_k_m")
        self.assertEqual(DEFAULT_RUNTIME_BUDGET_PROFILE_ID, "standard-cpu-v1")
        budget = json.loads(
            (PACKAGE_ROOT / "runtime" / "budget_profiles.json").read_text(encoding="utf-8")
        )
        standard = [
            item for item in budget["profiles"]
            if item["profile_id"] == "standard-cpu-v1"
        ]
        self.assertEqual(len(standard), 1)
        self.assertEqual(standard[0]["model_profile_id"], "qwen2.5-3b-instruct-q4_k_m")

    def test_prepare_preserves_exact_frozen_inputs_inside_artifact_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "matrix.json"
            manifest = prepare_matrix(output_path=output)
            frozen = output.parent / "frozen-inputs"
            self.assertEqual(
                (frozen / "o4c-scout-service-tier-fidelity-v1.case.json").read_bytes(),
                CASE_PATH.read_bytes(),
            )
            self.assertEqual(
                (frozen / "o4c-scout-service-tier-fidelity-v1.evidence.json").read_bytes(),
                EVIDENCE_PATH.read_bytes(),
            )
            self.assertEqual(manifest["fixture_sha256"], self.case["fixture_sha256"])
            self.assertEqual(manifest["evidence_sha256"], self.case["evidence_sha256"])

    def test_manifest_has_no_winner_or_assignment_semantics(self) -> None:
        manifest = build_matrix_manifest()
        self.assertEqual(manifest["model_profile_ids"], list(O4C_MODEL_PROFILE_IDS))
        self.assertEqual(manifest["hosted_ai_call_count"], 0)
        for key in ("winner", "recommended_model", "assignment", "rank", "ranking", "tie_break"):
            self.assertNotIn(key, manifest)

    def test_benchmark_workflow_is_manual_only_and_secret_free(self) -> None:
        workflow = (
            REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4c-scout-benchmark.yml"
        ).read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", workflow)
        self.assertNotIn("pull_request:", workflow)
        self.assertNotIn("\n  push:", workflow)
        self.assertIn("permissions:\n  contents: read", workflow)
        self.assertNotIn("secrets.", workflow)
        self.assertNotIn("api.openai.com", workflow)
        self.assertNotIn("copilot", workflow.lower())
        self.assertIn("HF_TOKEN HUGGING_FACE_HUB_TOKEN HUGGINGFACEHUB_API_TOKEN", workflow)
        self.assertIn("hosted_ai_call_count", workflow)
        self.assertIn("qwen2.5-3b-instruct-q4_k_m", workflow)
        self.assertIn("ministral-3-3b-instruct-2512-q4_k_m", workflow)

    def test_agent_skills_ci_mechanically_covers_benchmark_workflow_without_executing_it(self) -> None:
        ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")
        benchmark_path = ".github/workflows/agent-skill-orchestrator-o4c-scout-benchmark.yml"
        self.assertEqual(ci.count(benchmark_path), 2)
        self.assertNotIn("workflow_call", (
            REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-o4c-scout-benchmark.yml"
        ).read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
