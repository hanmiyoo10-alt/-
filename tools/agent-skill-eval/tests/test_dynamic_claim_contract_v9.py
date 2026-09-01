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
FROZEN_DEVPASS_MAIN = "3869b454daa6ddc04d72317e22e063784e086f0b"
CASE_ID = "devpass-missing-artifact-recovery-heldout"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


contract_mod = load("local_response_contract_v9_test", ROOT / "local_response_contract.py")
receipt_mod = load("validate_local_receipt_v9_test", ROOT / "validate_local_receipt.py")


class DynamicClaimContractV9Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.contracts_path = ROOT / "local-response-contracts.json"
        cls.contract = contract_mod.load_contract(
            cls.contracts_path,
            "plugin-impact-scope",
            CASE_ID,
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
        by_path: dict[str, list[str]] = {}
        for entry in self.contract["evidence_registry"].values():
            by_path.setdefault(entry["source_path"], []).append(entry["source_anchor"])
        blocks = [
            {"path": path, "text": "\n".join(anchors)}
            for path, anchors in sorted(by_path.items())
        ]
        return {
            "skill": "plugin-impact-scope",
            "case_id": CASE_ID,
            "blocks": blocks,
            "context_text": "\n".join(block["text"] for block in blocks),
            "context_sha256": "e" * 64,
        }

    def resolved_payload(self) -> dict:
        claims: dict[str, str] = {}
        for claim_id, entry in self.contract["claim_registry"].items():
            allowed = entry["evidence_status_allowlist"]
            chosen = None
            for status in ("DIRECT", "SUPPORTED_LIKELY"):
                for evidence_id, statuses in allowed.items():
                    if status in statuses:
                        chosen = f"{status}:{evidence_id}"
                        break
                if chosen is not None:
                    break
            self.assertIsNotNone(chosen, claim_id)
            claims[claim_id] = str(chosen)
        return {
            "scope": "plugin:devpass",
            "flow_edges": list(self.contract["required_flow_edge_ids"]),
            "claims": claims,
        }

    def test_devpass_case_is_prospectively_frozen_and_prior_cases_are_diagnostic(self):
        heldout = next(case for case in self.candidates["evals"] if case["id"] == CASE_ID)
        self.assertEqual(heldout["kind"], "PROSPECTIVE_HELD_OUT")
        self.assertEqual(heldout["candidate_scope"], "plugin:devpass")
        self.assertEqual(
            heldout["frozen_source_snapshot"],
            {"main": FROZEN_DEVPASS_MAIN},
        )
        self.assertNotIn("expected_output", heldout)
        self.assertGreaterEqual(len(heldout["assertions"]), 7)
        note = self.candidates["note"]
        self.assertIn("DevPass missing-artifact recovery is a new prospective v9 held-out", note)
        self.assertIn("Voyage visible-refresh held-outs are retained only as diagnostic/training evidence", note)

    def test_devpass_profile_and_contract_share_exact_frozen_sources(self):
        specs = self.profiles["profiles"]["plugin-impact-scope"][CASE_ID]
        self.assertEqual({spec["ref"] for spec in specs}, {FROZEN_DEVPASS_MAIN})
        self.assertTrue(all(spec["ref"] != "HEAD" for spec in specs))
        self.assertTrue(all(spec["mode"] == "needle_windows" for spec in specs))
        self.assertLessEqual(len(specs), 5)
        by_path = {spec["path"]: spec for spec in specs}
        self.assertEqual(
            set(by_path),
            {
                "docs/REPO_PROJECT_CATALOG.md",
                ".github/plugin-control-plane/registry.json",
                "plugins/devpass/README.md",
                "docs/DEVPASS_GUIDELINES.md",
            },
        )
        for evidence_id, evidence in self.contract["evidence_registry"].items():
            self.assertIn(evidence["source_path"], by_path, evidence_id)
            self.assertIn(
                evidence["source_anchor"],
                by_path[evidence["source_path"]]["needles"],
                evidence_id,
            )

    def test_v9_schema_is_dynamic_and_model_does_not_own_verdict_or_blockers(self):
        self.assertEqual(self.contract["id"], "impact-scope-grounded-claims-v9")
        self.assertEqual(self.contract["expected_scope"], "plugin:devpass")
        self.assertEqual(
            set(self.contract["claim_registry"]),
            {f"C{i}" for i in range(1, 8)},
        )
        self.assertEqual(
            self.contract["required_claim_ids"],
            [f"C{i}" for i in range(1, 8)],
        )
        schema = self.contract["schema"]
        self.assertEqual(set(schema["properties"]), {"scope", "flow_edges", "claims"})
        self.assertEqual(schema["required"], ["scope", "flow_edges", "claims"])
        self.assertEqual(
            schema["properties"]["claims"]["required"],
            [f"C{i}" for i in range(1, 8)],
        )
        self.assertNotIn("verdict", schema["properties"])
        self.assertNotIn("blocked_claims", schema["properties"])

    def test_v9_full_required_grounding_derives_supported(self):
        out = contract_mod.validate_content(
            json.dumps(self.resolved_payload()),
            self.contract,
            self.context(),
        )
        self.assertEqual(out["derived_blocked_claims"], [])
        self.assertEqual(out["derived_impact_verdict"], "SUPPORTED")
        self.assertEqual(
            [edge["id"] for edge in out["resolved_flow_edges"]],
            ["F1", "F2", "F3"],
        )
        self.assertEqual(
            [claim["id"] for claim in out["resolved_claims"]],
            [f"C{i}" for i in range(1, 8)],
        )

    def test_v9_unknown_required_claim_derives_partial(self):
        payload = self.resolved_payload()
        payload["claims"]["C3"] = "UNKNOWN"
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_blocked_claims"], ["claim:C3"])
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")

    def test_v9_missing_required_flow_derives_partial(self):
        payload = self.resolved_payload()
        payload["flow_edges"] = ["F2", "F3"]
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_blocked_claims"], ["flow:F1"])
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")

    def test_v9_all_unknown_and_no_flow_derives_unknown(self):
        payload = self.resolved_payload()
        payload["flow_edges"] = []
        payload["claims"] = {claim_id: "UNKNOWN" for claim_id in payload["claims"]}
        out = contract_mod.validate_content(
            json.dumps(payload), self.contract, self.context()
        )
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")
        self.assertEqual(
            out["derived_blocked_claims"],
            ["flow:F1", "flow:F2", "flow:F3"]
            + [f"claim:C{i}" for i in range(1, 8)],
        )

    def test_v9_cross_claim_evidence_and_model_owned_fields_fail_closed(self):
        payload = self.resolved_payload()
        payload["claims"]["C3"] = "DIRECT:E1"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(
                json.dumps(payload), self.contract, self.context()
            )

        payload = self.resolved_payload()
        payload["verdict"] = "SUPPORTED"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(
                json.dumps(payload), self.contract, self.context()
            )

    def test_v9_conflict_is_contract_allowlisted_and_evaluator_derived(self):
        raw = {
            "schema_version": 1,
            "contracts": {
                "plugin-impact-scope": {
                    "synthetic": {
                        "id": "impact-scope-grounded-claims-v9",
                        "expected_scope": "plugin:synthetic",
                        "prompt_instruction": "Return JSON only.",
                        "evidence_registry": {
                            "E1": {"source_path": "x.txt", "source_anchor": "anchor"}
                        },
                        "flow_edge_registry": {
                            "F1": {
                                "from": "a",
                                "to": "b",
                                "evidence_ids": ["E1"]
                            }
                        },
                        "required_flow_edge_ids": ["F1"],
                        "claim_registry": {
                            "C1": {
                                "label": "synthetic conflict boundary",
                                "evidence_status_allowlist": {
                                    "E1": ["DIRECT", "CONFLICT"]
                                }
                            }
                        },
                        "required_claim_ids": ["C1"]
                    }
                }
            }
        }
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "contracts.json"
            path.write_text(json.dumps(raw), encoding="utf-8")
            contract = contract_mod.load_contract(
                path, "plugin-impact-scope", "synthetic"
            )
        context = {
            "blocks": [{"path": "x.txt", "text": "anchor"}],
            "context_text": "anchor",
            "context_sha256": "a" * 64,
        }
        payload = {
            "scope": "plugin:synthetic",
            "flow_edges": ["F1"],
            "claims": {"C1": "CONFLICT:E1"},
        }
        out = contract_mod.validate_content(json.dumps(payload), contract, context)
        self.assertEqual(out["derived_impact_verdict"], "CONFLICT")
        self.assertEqual(out["derived_blocked_claims"], ["claim:C1"])

    def test_v9_claim_legend_is_data_driven(self):
        legend = contract_mod.claim_evidence_legend(self.contract)
        self.assertIn("C1 declared update-channel authority =", legend)
        self.assertIn("C7 writable automation migration boundary =", legend)
        self.assertIn("DIRECT:E5", legend)
        self.assertNotIn("plugin:usage-dashboard", legend)

    def test_v9_receipt_revalidation_carries_evaluator_verdict_and_blockers(self):
        payload = self.resolved_payload()
        payload["claims"]["C6"] = "UNKNOWN"
        contract_hash = contract_mod.contract_sha256(self.contract)
        self.assertIsNotNone(contract_hash)
        with tempfile.TemporaryDirectory() as td:
            eval_root = Path(td)
            mode_dir = eval_root / "with_skill"
            mode_dir.mkdir(parents=True)
            response_path = mode_dir / "response.txt"
            response_path.write_text(json.dumps(payload), encoding="utf-8")
            (eval_root / "response-contract.json").write_text(
                json.dumps(self.contract), encoding="utf-8"
            )
            (eval_root / "context.json").write_text(
                json.dumps(self.context()), encoding="utf-8"
            )
            (mode_dir / "structured-validation.json").write_text(
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
                response_path,
                str(contract_hash),
                0,
            )
            self.assertEqual(verdict, "PARTIAL")
            self.assertEqual(blockers, ["claim:C6"])
            validation = json.loads(
                (mode_dir / "structured-validation.json").read_text(encoding="utf-8")
            )
            self.assertEqual(validation["derived_impact_verdict"], "PARTIAL")
            self.assertEqual(validation["derived_blocked_claims"], ["claim:C6"])

    def test_existing_v8_contract_shape_remains_supported(self):
        v8 = contract_mod.load_contract(
            self.contracts_path,
            "plugin-impact-scope",
            "service-tier-fidelity",
        )
        self.assertEqual(v8["id"], "impact-scope-grounded-flow-v8")
        self.assertEqual(
            set(v8["schema"]["properties"]),
            {
                "scope",
                "authority",
                "flow_edges",
                "request_identity",
                "no_extra_io",
                "tests",
                "generated_release",
                "narrowest_boundary",
                "blocked_claims",
            },
        )
        self.assertNotIn("claims", v8["schema"]["properties"])


if __name__ == "__main__":
    unittest.main()
