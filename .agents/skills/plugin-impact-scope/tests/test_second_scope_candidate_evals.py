from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = SKILL_ROOT / "evals" / "second_scope_candidate_evals.json"
DISCOVERY = SKILL_ROOT / "scripts" / "discover_impact.py"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_impact_map.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class SecondScopeCandidateEvalTests(unittest.TestCase):
    def setUp(self) -> None:
        self.data = json.loads(CANDIDATES.read_text(encoding="utf-8"))

    def test_simcore_remains_candidate_only(self):
        discovery = load_module("impact_scope_candidate_discovery", DISCOVERY)
        validator = load_module("impact_scope_candidate_validator", VALIDATOR)
        self.assertEqual(self.data["status"], "CANDIDATE_ONLY_NOT_PROMOTED")
        self.assertEqual(self.data["candidate_scope"], "plugin:simcore")
        self.assertNotIn("plugin:simcore", discovery.PILOT_VALIDATED_SCOPES)
        self.assertNotIn("plugin:simcore", validator.PILOT_VALIDATED_SCOPES)

    def test_frozen_snapshot_precedes_human_3m3_answer(self):
        snapshot = self.data["frozen_source_snapshot"]
        self.assertEqual(snapshot["main"], "e4daaa427ed902ca6f8368c45d509f7fd0f26d42")
        self.assertEqual(snapshot["release-simcore"], "861100f4771967aa5b8ab8811d06f11702c0d3ff")
        self.assertRegex(snapshot["main"], r"^[0-9a-f]{40}$")
        self.assertRegex(snapshot["release-simcore"], r"^[0-9a-f]{40}$")

    def test_heldout_case_is_prospective_and_solution_free(self):
        heldout = next(
            case for case in self.data["evals"]
            if case["id"] == "simcore-3m3-structured-sidecar-validation-heldout"
        )
        self.assertEqual(heldout["kind"], "PROSPECTIVE_HELD_OUT")
        self.assertIn("impact scope만", heldout["prompt"])
        self.assertIn("구현안이나 최종 schema 설계는 쓰지 마", heldout["prompt"])
        self.assertGreaterEqual(len(heldout["assertions"]), 6)
        self.assertNotIn("expected_output", heldout)

    def test_retrospective_cases_are_not_mislabeled_as_generalization_proof(self):
        retrospective = [
            case for case in self.data["evals"]
            if case["kind"] == "RETROSPECTIVE_COMPATIBILITY"
        ]
        self.assertEqual(len(retrospective), 2)
        self.assertTrue(all(case["kind"] != "PROSPECTIVE_HELD_OUT" for case in retrospective))


if __name__ == "__main__":
    unittest.main()
