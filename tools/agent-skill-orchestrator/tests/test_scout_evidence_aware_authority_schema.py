from __future__ import annotations

import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))
REPO_ROOT = PACKAGE.parents[1]

from benchmarks.run_scout_cell import load_case_and_evidence
from canonical import canonical_sha256
from evidence import EvidenceError
from roles.scout import scout_response_schema
from roles.scout_evidence_schema import scout_response_schema_for_evidence

STATIC_SCHEMA_SHA256 = "f7f8f6014251e8dc786182dbd68fd001e195dd5c4eca1a7a94c0bcbeb90f92d6"


class ScoutEvidenceAwareAuthoritySchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _, cls.evidence = load_case_and_evidence()

    def _branches(self, schema: dict) -> list[dict]:
        return schema["properties"]["r"]["items"]["oneOf"]

    def _branch(self, schema: dict, kind: str, value: str) -> dict:
        matches = [
            item
            for item in self._branches(schema)
            if item["properties"]["k"]["enum"] == [kind]
            and item["properties"]["v"]["enum"] == [value]
        ]
        self.assertEqual(len(matches), 1)
        return matches[0]

    def test_static_historical_schema_identity_is_unchanged(self):
        self.assertEqual(canonical_sha256(scout_response_schema()), STATIC_SCHEMA_SHA256)

    def test_source_selection_branch_is_fixed_and_bounded_to_supplied_refs(self):
        schema = scout_response_schema_for_evidence(self.evidence)
        branch = self._branch(schema, "s", "relevant_source")
        actual = branch["properties"]["r"]["items"]["enum"]
        expected = sorted(item["source_ref"]["ref"] for item in self.evidence["sources"])
        self.assertEqual(actual, expected)
        self.assertEqual(actual, sorted(actual))

    def test_authority_branches_are_partitioned_by_supplied_authority_class(self):
        schema = scout_response_schema_for_evidence(self.evidence)
        expected: dict[str, list[str]] = {}
        for item in self.evidence["sources"]:
            expected.setdefault(item["authority_class"], []).append(item["source_ref"]["ref"])

        authority_values = [
            branch["properties"]["v"]["enum"][0]
            for branch in self._branches(schema)
            if branch["properties"]["k"]["enum"] == ["a"]
        ]
        self.assertEqual(authority_values, sorted(expected))
        for authority_class, refs in expected.items():
            branch = self._branch(schema, "a", authority_class)
            self.assertEqual(branch["properties"]["r"]["items"]["enum"], sorted(refs))

    def test_o4d_qwen_mixed_authority_class_record_is_unrepresentable(self):
        schema = scout_response_schema_for_evidence(self.evidence)
        branch = self._branch(schema, "a", "domain_primary")
        allowed = set(branch["properties"]["r"]["items"]["enum"])
        self.assertIn("S1@L21", allowed)
        self.assertIn("S2@L749", allowed)
        self.assertNotIn("S3@L1", allowed)
        manifest = self._branch(schema, "a", "manifest")
        self.assertIn("S3@L1", manifest["properties"]["r"]["items"]["enum"])

    def test_builder_is_independent_of_json_object_key_insertion_order(self):
        reordered = deepcopy(self.evidence)
        reordered["sources"] = [dict(reversed(list(item.items()))) for item in reordered["sources"]]
        self.assertEqual(
            scout_response_schema_for_evidence(reordered),
            scout_response_schema_for_evidence(self.evidence),
        )

    def test_invalid_evidence_package_fails_closed_before_schema_projection(self):
        invalid = deepcopy(self.evidence)
        invalid["sources"][0]["source_ref"]["block_digest"] = "0" * 64
        with self.assertRaises(EvidenceError):
            scout_response_schema_for_evidence(invalid)

    def test_live_runtime_uses_evidence_aware_builder_but_historical_benchmarks_do_not(self):
        live_expectations = {
            "tools/agent-skill-orchestrator/runtime/run_scout_pilot.py": 'scout_response_schema_for_evidence(control["evidence_package"])',
            "tools/agent-skill-orchestrator/runtime/run_sequential_pilot.py": "scout_response_schema_for_evidence(evidence_package)",
            "tools/agent-skill-orchestrator/runtime/run_parallel_pilot.py": "scout_response_schema_for_evidence(evidence_package)",
        }
        for relative, expected in live_expectations.items():
            text = (REPO_ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("from roles.scout_evidence_schema import scout_response_schema_for_evidence", text)
            self.assertIn(expected, text)

        historical = [
            "tools/agent-skill-orchestrator/benchmarks/run_scout_cell.py",
            "tools/agent-skill-orchestrator/benchmarks/run_scout_cell_timeout_recovery.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4d_scout_cell.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4d_scout_schema_validation.py",
        ]
        for relative in historical:
            text = (REPO_ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("scout_response_schema()", text)
            self.assertNotIn("scout_response_schema_for_evidence", text)

    def test_schema_contains_no_benchmark_expected_labels_or_ranking_semantics(self):
        schema_text = json.dumps(
            scout_response_schema_for_evidence(self.evidence),
            ensure_ascii=False,
            sort_keys=True,
        )
        for forbidden in ("expected_labels", "winner", "recommended_model", "ranking", "tie_break"):
            self.assertNotIn(forbidden, schema_text)


if __name__ == "__main__":
    unittest.main()
