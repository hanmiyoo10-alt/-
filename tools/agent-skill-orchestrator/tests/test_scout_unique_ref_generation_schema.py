from __future__ import annotations

import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))
REPO_ROOT = PACKAGE.parents[1]

from benchmarks.run_o4f_scout_cell import load_o4f_case_and_evidence
from canonical import canonical_sha256
from roles.scout import scout_response_schema
from roles.scout_evidence_schema import (
    MAX_STRICT_REF_ARRAY_VARIANTS,
    scout_response_schema_for_evidence,
    scout_response_schema_for_evidence_unique_refs,
)

STATIC_SCHEMA_SHA256 = "f7f8f6014251e8dc786182dbd68fd001e195dd5c4eca1a7a94c0bcbeb90f92d6"
O4F_EVIDENCE_SCHEMA_SHA256 = "c4c59b939875203b91580381664220a9305c922c4dda9aa685bd08cd207c0d61"
O4F_DUPLICATE_REFS = ["S5@L2", "S5@L2", "S5@L2"]


class ScoutUniqueRefGenerationSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        _, cls.evidence = load_o4f_case_and_evidence()

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

    def test_historical_static_and_o4f_schema_identities_are_unchanged(self):
        self.assertEqual(canonical_sha256(scout_response_schema()), STATIC_SCHEMA_SHA256)
        self.assertEqual(
            canonical_sha256(scout_response_schema_for_evidence(self.evidence)),
            O4F_EVIDENCE_SCHEMA_SHA256,
        )

    def test_strict_source_branch_enumerates_only_sorted_unique_ref_arrays(self):
        schema = scout_response_schema_for_evidence_unique_refs(self.evidence)
        branch = self._branch(schema, "s", "relevant_source")
        refs_schema = branch["properties"]["r"]
        variants = refs_schema["enum"]
        self.assertTrue(variants)
        self.assertLessEqual(len(variants), MAX_STRICT_REF_ARRAY_VARIANTS)
        for refs in variants:
            self.assertEqual(refs, sorted(refs))
            self.assertEqual(len(refs), len(set(refs)))
            self.assertGreaterEqual(len(refs), refs_schema["minItems"])
            self.assertLessEqual(len(refs), refs_schema["maxItems"])
            self.assertTrue(set(refs).issubset(set(refs_schema["items"]["enum"])))

    def test_exact_o4f_qwen_duplicate_ref_shape_is_unrepresentable(self):
        schema = scout_response_schema_for_evidence_unique_refs(self.evidence)
        evidence_branch = self._branch(schema, "a", "evidence")
        refs_schema = evidence_branch["properties"]["r"]
        self.assertEqual(refs_schema["items"]["enum"], ["S5@L2"])
        self.assertEqual(refs_schema["enum"], [["S5@L2"]])
        self.assertNotIn(O4F_DUPLICATE_REFS, refs_schema["enum"])

    def test_valid_multi_ref_combinations_remain_representable_canonically(self):
        schema = scout_response_schema_for_evidence_unique_refs(self.evidence)
        source = self._branch(schema, "s", "relevant_source")["properties"]["r"]
        allowed = source["items"]["enum"]
        self.assertGreaterEqual(len(allowed), 3)
        self.assertIn([allowed[0], allowed[1]], source["enum"])
        self.assertIn([allowed[0], allowed[1], allowed[2]], source["enum"])
        self.assertNotIn([allowed[1], allowed[0]], source["enum"])

    def test_authority_partition_is_preserved_by_strict_projection(self):
        schema = scout_response_schema_for_evidence_unique_refs(self.evidence)
        expected: dict[str, list[str]] = {}
        for item in self.evidence["sources"]:
            expected.setdefault(item["authority_class"], []).append(item["source_ref"]["ref"])
        for authority_class, refs in expected.items():
            ref_schema = self._branch(schema, "a", authority_class)["properties"]["r"]
            self.assertEqual(ref_schema["items"]["enum"], sorted(refs))
            for variant in ref_schema["enum"]:
                self.assertTrue(set(variant).issubset(set(refs)))

    def test_strict_projection_is_deterministic_across_object_key_order(self):
        reordered = deepcopy(self.evidence)
        reordered["sources"] = [dict(reversed(list(item.items()))) for item in reordered["sources"]]
        self.assertEqual(
            scout_response_schema_for_evidence_unique_refs(reordered),
            scout_response_schema_for_evidence_unique_refs(self.evidence),
        )

    def test_live_scout_surfaces_use_strict_builder_and_historical_o4e_o4f_do_not(self):
        live = [
            "tools/agent-skill-orchestrator/runtime/run_scout_pilot.py",
            "tools/agent-skill-orchestrator/runtime/run_sequential_pilot.py",
            "tools/agent-skill-orchestrator/runtime/run_parallel_pilot.py",
        ]
        for relative in live:
            text = (REPO_ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("scout_response_schema_for_evidence_unique_refs", text)

        historical = [
            "tools/agent-skill-orchestrator/benchmarks/run_o4e_scout_cell.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4e_scout_schema_validation.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4f_scout_cell.py",
            "tools/agent-skill-orchestrator/benchmarks/run_o4f_scout_matrix.py",
        ]
        for relative in historical:
            text = (REPO_ROOT / relative).read_text(encoding="utf-8")
            self.assertIn("scout_response_schema_for_evidence", text)
            self.assertNotIn("scout_response_schema_for_evidence_unique_refs", text)


if __name__ == "__main__":
    unittest.main()
