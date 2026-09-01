from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
SKILL_ROOT = REPO_ROOT / ".agents" / "skills" / "plugin-impact-scope"
CASE_ID = "devpass-missing-artifact-recovery-heldout"
FROZEN_MAIN = "3869b454daa6ddc04d72317e22e063784e086f0b"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


contract_mod = load("candidate_grounded_contract_v9_test", ROOT / "local_response_contract.py")
prompt_mod = load("candidate_grounded_prompt_v9_test", ROOT / "compose_local_prompt.py")
receipt_mod = load("candidate_grounded_receipt_v9_test", ROOT / "validate_local_receipt.py")


class CandidateGroundedReportV9Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contracts_path = ROOT / "local-response-contracts.json"
        cls.contract_doc = json.loads(cls.contracts_path.read_text(encoding="utf-8"))
        cls.contract = contract_mod.load_contract(
            cls.contracts_path, "plugin-impact-scope", CASE_ID
        )
        assert cls.contract is not None
        cls.candidates = json.loads(
            (SKILL_ROOT / "evals" / "second_scope_candidate_evals.json").read_text(
                encoding="utf-8"
            )
        )
        cls.profiles = json.loads(
            (ROOT / "local-context-profiles.json").read_text(encoding="utf-8")
        )

    def context(self) -> dict:
        blocks = [
            {
                "index": 1,
                "ref": FROZEN_MAIN,
                "path": "a.txt",
                "text": "auth owner request-id no-extra release",
            },
            {
                "index": 2,
                "ref": FROZEN_MAIN,
                "path": "b.txt",
                "text": "flow test narrow conflict",
            },
        ]
        return {
            "schema_version": 1,
            "skill": "plugin-impact-scope",
            "case_id": CASE_ID,
            "blocks": blocks,
            "context_text": "\n".join(block["text"] for block in blocks),
            "context_sha256": "e" * 64,
        }

    def ref(self, block: str, anchor: str) -> dict:
        return {"sourceBlockId": block, "sourceAnchor": anchor}

    def supported_payload(self) -> dict:
        return {
            "scope": "plugin:devpass",
            "authority": {
                "status": "DIRECT",
                "value": "declared authority",
                "sourceRefs": [self.ref("S1", "auth")],
            },
            "semanticOwners": [
                {
                    "label": "source owner",
                    "status": "DIRECT",
                    "sourceRefs": [self.ref("S1", "owner")],
                }
            ],
            "flowEdges": [
                {
                    "from": "source owner",
                    "to": "consumer",
                    "status": "SUPPORTED_LIKELY",
                    "sourceRefs": [self.ref("S2", "flow")],
                }
            ],
            "preservation": {
                "requestIdentity": {
                    "status": "DIRECT",
                    "sourceRefs": [self.ref("S1", "request-id")],
                },
                "noExtraIo": {
                    "status": "DIRECT",
                    "sourceRefs": [self.ref("S1", "no-extra")],
                },
                "otherBoundaries": [],
            },
            "testsContracts": [
                {
                    "boundary": "validation boundary",
                    "status": "DIRECT",
                    "sourceRefs": [self.ref("S2", "test")],
                }
            ],
            "generatedRelease": {
                "status": "SUPPORTED_LIKELY",
                "value": "release boundary",
                "sourceRefs": [self.ref("S1", "release")],
            },
            "narrowestBoundary": {
                "status": "DIRECT",
                "value": "narrow owner",
                "sourceRefs": [self.ref("S2", "narrow")],
            },
        }

    def test_contract_contains_no_hidden_devpass_answer_registry(self):
        raw = self.contract_doc["contracts"]["plugin-impact-scope"][CASE_ID]
        self.assertEqual(
            set(raw), {"id", "expected_scope", "prompt_instruction"}
        )
        text = json.dumps(raw, ensure_ascii=False)
        for forbidden in (
            "plugins/devpass/latest.js",
            "DECLARED_MISSING",
            "C1",
            "F1",
            "source_path",
            "source_anchor",
            "flow_edge_registry",
            "claim_registry",
        ):
            self.assertNotIn(forbidden, text)
        self.assertEqual(raw["id"], "candidate-grounded-impact-report-v9")

    def test_devpass_fixture_remains_prospectively_frozen(self):
        heldout = next(
            case for case in self.candidates["evals"] if case["id"] == CASE_ID
        )
        self.assertEqual(heldout["kind"], "PROSPECTIVE_HELD_OUT")
        self.assertEqual(heldout["candidate_scope"], "plugin:devpass")
        self.assertEqual(heldout["frozen_source_snapshot"], {"main": FROZEN_MAIN})
        self.assertNotIn("expected_output", heldout)
        self.assertGreaterEqual(len(heldout["assertions"]), 7)

    def test_devpass_context_is_exactly_frozen_but_separate_from_contract(self):
        specs = self.profiles["profiles"]["plugin-impact-scope"][CASE_ID]
        self.assertEqual({spec["ref"] for spec in specs}, {FROZEN_MAIN})
        self.assertTrue(all(spec["ref"] != "HEAD" for spec in specs))
        self.assertLessEqual(len(specs), 4)
        self.assertEqual(
            {spec["path"] for spec in specs},
            {
                "docs/REPO_PROJECT_CATALOG.md",
                ".github/plugin-control-plane/registry.json",
                "plugins/devpass/README.md",
                "docs/DEVPASS_GUIDELINES.md",
            },
        )

    def test_v9_schema_has_generic_report_categories_only(self):
        schema = self.contract["schema"]
        self.assertEqual(
            set(schema["properties"]),
            {
                "scope",
                "authority",
                "semanticOwners",
                "flowEdges",
                "preservation",
                "testsContracts",
                "generatedRelease",
                "narrowestBoundary",
            },
        )
        self.assertNotIn("verdict", schema["properties"])
        self.assertNotIn("blocked_claims", schema["properties"])
        self.assertNotIn("expectedOwner", json.dumps(schema))

    def test_supported_is_evaluator_derived_from_generic_completeness(self):
        out = contract_mod.validate_content(
            json.dumps(self.supported_payload()), self.contract, self.context()
        )
        self.assertEqual(out["derived_blocked_claims"], [])
        self.assertEqual(out["derived_impact_verdict"], "SUPPORTED")

    def test_unknown_authority_or_missing_grounded_flow_derives_unknown(self):
        payload = self.supported_payload()
        payload["authority"] = {"status": "UNKNOWN", "value": "", "sourceRefs": []}
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")
        self.assertIn("authority", out["derived_blocked_claims"])

        payload = self.supported_payload()
        payload["flowEdges"] = []
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")
        self.assertIn("flow", out["derived_blocked_claims"])

    def test_resolved_flow_with_unresolved_required_category_derives_partial(self):
        payload = self.supported_payload()
        payload["preservation"]["requestIdentity"] = {
            "status": "UNKNOWN",
            "sourceRefs": [],
        }
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")
        self.assertEqual(out["derived_blocked_claims"], ["request_identity"])

    def test_conflict_is_evaluator_derived(self):
        payload = self.supported_payload()
        payload["authority"] = {
            "status": "CONFLICT",
            "value": "conflicting authority",
            "sourceRefs": [self.ref("S2", "conflict")],
        }
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_impact_verdict"], "CONFLICT")
        self.assertIn("conflict", out["derived_blocked_claims"])

    def test_non_unknown_claim_requires_real_anchor_in_exact_source_block(self):
        payload = self.supported_payload()
        payload["flowEdges"][0]["sourceRefs"] = [self.ref("S1", "flow")]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(
                json.dumps(payload), self.contract, self.context()
            )
        payload = self.supported_payload()
        payload["authority"]["sourceRefs"] = [self.ref("S9", "auth")]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(
                json.dumps(payload), self.contract, self.context()
            )

    def test_unknown_claim_cannot_smuggle_affirmative_value_or_source(self):
        payload = self.supported_payload()
        payload["generatedRelease"] = {
            "status": "UNKNOWN",
            "value": "invented release",
            "sourceRefs": [],
        }
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(
                json.dumps(payload), self.contract, self.context()
            )

    def test_candidate_prompt_uses_opaque_source_ids_without_hidden_flow_registry(self):
        matrix = {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": CASE_ID,
            "fixture_class": "second_scope_candidate",
            "candidate_scope": "plugin:devpass",
            "candidate_frozen_source_snapshot": {"main": FROZEN_MAIN},
            "prompt": "impact scope only",
        }
        prompt, _ = prompt_mod.compose(
            matrix,
            self.context(),
            SKILL_ROOT / "SKILL.md",
            "with_skill",
            self.contract,
        )
        self.assertIn("SOURCE BLOCK LEGEND", prompt)
        self.assertIn("S1 = SOURCE 1", prompt)
        self.assertNotIn("FLOW EDGE REGISTRY", prompt)
        self.assertNotIn("CLAIM EVIDENCE STATUS COMPATIBILITY", prompt)
        self.assertNotIn("C1 =", prompt)
        self.assertIn("Source-anchor occurrence proves grounding only, not semantic correctness", prompt)

    def test_receipt_revalidates_evaluator_owned_verdict(self):
        payload = self.supported_payload()
        payload["testsContracts"] = []
        contract_hash = contract_mod.contract_sha256(self.contract)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            mode = root / "with_skill"
            mode.mkdir(parents=True)
            response = mode / "response.txt"
            response.write_text(json.dumps(payload), encoding="utf-8")
            (root / "response-contract.json").write_text(
                json.dumps(self.contract), encoding="utf-8"
            )
            (root / "context.json").write_text(
                json.dumps(self.context()), encoding="utf-8"
            )
            (mode / "structured-validation.json").write_text(
                json.dumps(
                    {
                        "status": "VALID",
                        "response_contract_sha256": contract_hash,
                        "error": None,
                    }
                ),
                encoding="utf-8",
            )
            verdict, blockers = receipt_mod._derive_structured_impact_evidence(
                response, str(contract_hash), 0
            )
            self.assertEqual(verdict, "PARTIAL")
            self.assertEqual(blockers, ["tests_contracts"])

    def test_existing_v8_contract_still_loads_with_original_shape(self):
        v8 = contract_mod.load_contract(
            self.contracts_path, "plugin-impact-scope", "service-tier-fidelity"
        )
        self.assertEqual(v8["id"], "impact-scope-grounded-flow-v8")
        self.assertIn("flow_edges", v8["schema"]["properties"])
        self.assertIn("blocked_claims", v8["schema"]["properties"])
        self.assertNotIn("semanticOwners", v8["schema"]["properties"])


if __name__ == "__main__":
    unittest.main()
