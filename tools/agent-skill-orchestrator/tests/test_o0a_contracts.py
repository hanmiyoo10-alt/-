import json
import math
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from canonical import canonical_json_bytes, canonical_sha256
from schema_validation import ContractValidationError, load_schema, validate_contract

SHA40 = "a" * 40
SHA64 = "b" * 64
REFS = {"S1@L1", "S2@L8"}

class CanonicalTests(unittest.TestCase):
    def test_object_key_order_does_not_change_bytes_or_digest(self):
        left = {"b": [2, 1], "a": {"z": True, "x": "한글"}}
        right = {"a": {"x": "한글", "z": True}, "b": [2, 1]}
        self.assertEqual(canonical_json_bytes(left), canonical_json_bytes(right))
        self.assertEqual(canonical_sha256(left), canonical_sha256(right))

    def test_non_finite_numbers_fail_closed(self):
        with self.assertRaises(ValueError):
            canonical_json_bytes({"bad": math.nan})

class SchemaTests(unittest.TestCase):
    def test_all_schema_documents_round_trip_as_json_objects(self):
        for path in sorted((PACKAGE / "schemas").glob("*.schema.json")):
            schema = load_schema(path.name)
            self.assertIsInstance(schema, dict)
            self.assertEqual(schema, json.loads(json.dumps(schema)))

    def test_source_ref_format_is_closed(self):
        good = {"ref": "S2@L8", "source_sha": SHA40, "block_digest": SHA64}
        validate_contract(good, "source-ref.schema.json")
        bad = dict(good, ref="source:2:8")
        with self.assertRaises(ContractValidationError):
            validate_contract(bad, "source-ref.schema.json")

    def test_unknown_claim_ref_fails_closed(self):
        claim = {"id": "claim-1", "kind": "preservation", "status": "SUPPORTED_LIKELY", "value": "request identity unchanged", "refs": ["S9@L9"], "role": "critic"}
        with self.assertRaisesRegex(ContractValidationError, "unknown source ref"):
            validate_contract(claim, "claim.schema.json", known_source_refs=REFS)

    def test_known_claim_ref_validates(self):
        claim = {"id": "claim-1", "kind": "preservation", "status": "SUPPORTED_LIKELY", "value": "request identity unchanged", "refs": ["S1@L1"], "role": "critic"}
        validate_contract(claim, "claim.schema.json", known_source_refs=REFS)

    def _role_artifact(self):
        return {
            "schema_version": 1,
            "role": "critic",
            "model_profile_id": "fixture-model",
            "model_digest": SHA64,
            "target_repository_sha": SHA40,
            "evidence_sha256": "c" * 64,
            "prompt_sha256": "d" * 64,
            "structured_response_sha256": "e" * 64,
            "upstream_artifact_sha256": [],
            "records": {
                "claims": [{"id": "claim-1", "kind": "preservation", "status": "UNKNOWN", "value": "release truth not established", "refs": [], "role": "critic"}],
                "flow_edges": [],
                "boundaries": [],
                "blockers": [],
                "conflicts": []
            }
        }

    def test_role_artifact_requires_provenance(self):
        artifact = self._role_artifact()
        validate_contract(artifact, "role-artifact.schema.json", known_source_refs=REFS)
        del artifact["model_digest"]
        with self.assertRaisesRegex(ContractValidationError, "model_digest"):
            validate_contract(artifact, "role-artifact.schema.json", known_source_refs=REFS)

    def test_role_artifact_rejects_extra_properties(self):
        artifact = self._role_artifact()
        artifact["model_verdict"] = "SUPPORTED"
        with self.assertRaisesRegex(ContractValidationError, "unexpected property"):
            validate_contract(artifact, "role-artifact.schema.json", known_source_refs=REFS)

    def test_receipt_requires_hash_linked_provenance(self):
        receipt = {
            "schema_version": 1,
            "target_repository_sha": SHA40,
            "authority_profile": "fixture-authority",
            "evidence_sha256": "1" * 64,
            "execution_plan_sha256": "2" * 64,
            "generation_profile_sha256": "3" * 64,
            "role_artifact_sha256": {"critic": "4" * 64},
            "final_verdict": "NOT_EVALUATED"
        }
        validate_contract(receipt, "orchestration-receipt.schema.json")
        del receipt["execution_plan_sha256"]
        with self.assertRaisesRegex(ContractValidationError, "execution_plan_sha256"):
            validate_contract(receipt, "orchestration-receipt.schema.json")

    def test_duplicate_refs_fail_closed(self):
        claim = {"id": "claim-dup", "kind": "other", "status": "DIRECT", "value": "duplicate refs are not canonical", "refs": ["S1@L1", "S1@L1"], "role": "scout"}
        with self.assertRaisesRegex(ContractValidationError, "unique"):
            validate_contract(claim, "claim.schema.json", known_source_refs=REFS)

if __name__ == "__main__":
    unittest.main()
