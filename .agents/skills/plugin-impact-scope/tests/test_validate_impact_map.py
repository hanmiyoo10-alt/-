from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "validate_impact_map.py"


def load_module():
    spec = importlib.util.spec_from_file_location("validate_impact_map", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


validate_impact_map = load_module()


def base_payload():
    return {
        "scope": "plugin:usage-dashboard",
        "question_class": "service tier selection-source enrichment",
        "authority_input": "fresh owning guideline/source reads",
        "semantic_owners": ["Engine /logs sanitizer", "Plugin service-tier presentation"],
        "impact_edges": [
            {
                "from": "Engine sanitizer",
                "to": "recent request metadata",
                "relationship": "emits sanitized scalar",
                "evidence_class": "DIRECT",
                "basis": "current Engine source writes exact field",
                "sources": ["main:plugins/usage-dashboard/runtime/engine.js#selection-source"],
            },
            {
                "from": "recent request metadata",
                "to": "Plugin UI",
                "relationship": "consumer reads exact scalar",
                "evidence_class": "SUPPORTED_LIKELY",
                "basis": "current Plugin source references exact field; runtime path requires final review",
                "sources": ["main:plugins/usage-dashboard/src/12-service-tier.part.js"],
            },
        ],
        "validation_surfaces": ["focused service-tier regression", "full Usage Dashboard registry"],
        "generated_release_surfaces": ["Engine artifact/materializer if runtime source changes"],
        "narrowest_supported_boundary": "source-backed selection-source scalar from Engine capture through Plugin presentation",
        "blocked_claims": [],
        "verdict": "IMPACT_SCOPED",
    }


class ValidateImpactMapTests(unittest.TestCase):
    def test_valid_map_passes_structure_and_provenance_only(self):
        result = validate_impact_map.validate_map(base_payload())
        self.assertTrue(result["valid"])
        self.assertEqual(result["truth_claim_status"], "STRUCTURE_AND_PROVENANCE_ONLY")
        self.assertFalse(result["semantic_relationships_proven_by_validator"])
        self.assertFalse(result["mutation_performed"])

    def test_non_unknown_edge_requires_basis_and_sources(self):
        payload = base_payload()
        payload["impact_edges"][0]["basis"] = ""
        payload["impact_edges"][0]["sources"] = []
        result = validate_impact_map.validate_map(payload)
        self.assertFalse(result["valid"])
        self.assertTrue(any("requires basis" in error for error in result["errors"]))
        self.assertTrue(any("requires concrete sources" in error for error in result["errors"]))

    def test_unknown_edge_forces_partial_or_unknown_verdict(self):
        payload = base_payload()
        payload["impact_edges"].append(
            {
                "from": "dynamic listener",
                "to": "runtime callback",
                "relationship": "registration path unresolved",
                "evidence_class": "UNKNOWN",
                "basis": "",
                "sources": [],
            }
        )
        result = validate_impact_map.validate_map(payload)
        self.assertFalse(result["valid"])
        self.assertIn("IMPACT_SCOPED cannot contain UNKNOWN or CONFLICT edges", result["errors"])

        payload["verdict"] = "PARTIAL"
        result = validate_impact_map.validate_map(payload)
        self.assertTrue(result["valid"])

    def test_conflict_edge_requires_conflict_verdict(self):
        payload = base_payload()
        payload["impact_edges"][0]["evidence_class"] = "CONFLICT"
        payload["impact_edges"][0]["basis"] = "two owning sources disagree"
        payload["impact_edges"][0]["sources"] = ["source-a", "source-b"]
        result = validate_impact_map.validate_map(payload)
        self.assertFalse(result["valid"])
        self.assertIn("CONFLICT edge requires CONFLICT verdict", result["errors"])

        payload["verdict"] = "CONFLICT"
        result = validate_impact_map.validate_map(payload)
        self.assertTrue(result["valid"])

    def test_mutation_shaped_key_is_rejected(self):
        payload = base_payload()
        payload["deploy"] = {"branch": "some-release-branch"}
        result = validate_impact_map.validate_map(payload)
        self.assertFalse(result["valid"])
        self.assertTrue(any("read-only impact map" in error for error in result["errors"]))

    def test_other_scope_is_not_validated(self):
        payload = base_payload()
        payload["scope"] = "plugin:simcore"
        result = validate_impact_map.validate_map(payload)
        self.assertFalse(result["valid"])
        self.assertIn("scope is outside PILOT_VALIDATED_SCOPES", result["errors"])


if __name__ == "__main__":
    unittest.main()
