from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / filename)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


contract_mod = load("local_response_contract", "local_response_contract.py")
prompt_mod = load("compose_local_prompt_structured", "compose_local_prompt.py")
server_mod = load("run_local_server_pair_structured", "run_local_server_pair.py")


class StructuredOutputContractTests(unittest.TestCase):
    def contract(self):
        return contract_mod.load_contract(
            ROOT / "local-response-contracts.json",
            "plugin-impact-scope",
            "service-tier-fidelity",
        )

    def context(self):
        blocks = [
            {"path": "docs/REPO_PROJECT_CATALOG.md", "text": "scope plugin:usage-dashboard authority releaseBranch=release-usage-dashboard"},
            {
                "path": "plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs",
                "text": "serviceTierSelectionSource captureSelectionSource requestKey",
            },
            {
                "path": "plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs",
                "text": "normalize recent rows serviceTierSelectionSource request metadata",
            },
            {
                "path": "plugins/usage-dashboard/src/14-request-ledger.part.js",
                "text": "serviceTierSelectionSource:preferKnownServiceTierSelectionSource requestLedgerKey",
            },
            {
                "path": "plugins/usage-dashboard/src/40-diagnostics.part.js",
                "text": "Service tier selection source: request plan-default unknown",
            },
            {
                "path": "plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs",
                "text": (
                    "P50 selection source must never enter request identity\n"
                    "P50 selection-source path must not add nativeFetch\n"
                    "P50 Service Tier Selection-Source Fidelity"
                ),
            },
        ]
        return {
            "skill": "plugin-impact-scope",
            "case_id": "service-tier-fidelity",
            "blocks": blocks,
            "context_text": "\n".join(block["text"] for block in blocks),
            "context_sha256": "e" * 64,
        }

    def valid_payload(self):
        return {
            "scope": "plugin:usage-dashboard",
            "authority": "DIRECT:E1",
            "flow_edges": [
                {"from": "bridge capture", "to": "normalized sources", "basis": "DIRECT:E2"},
                {"from": "normalized sources", "to": "request ledger", "basis": "DIRECT:E3"},
                {"from": "request ledger", "to": "diagnostics", "basis": "DIRECT:E7"},
            ],
            "request_identity": "DIRECT:E5",
            "no_extra_io": "DIRECT:E6",
            "tests": ["DIRECT:E8"],
            "generated_release": "UNKNOWN",
            "narrowest_boundary": "DIRECT:E4",
            "blocked_claims": ["generated/release ownership unresolved"],
            "verdict": "PARTIAL",
        }

    def test_contract_is_scoped_to_positive_case_only(self):
        self.assertIsNotNone(self.contract())
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-impact-scope", "narrow-negative"))
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-authority-scan", "1"))

    def test_contract_uses_evidence_ids_and_singleton_scope(self):
        contract = self.contract()
        self.assertEqual(contract["id"], "impact-scope-evidence-id-v3")
        self.assertEqual(set(contract["evidence_registry"]), {f"E{i}" for i in range(1, 9)})
        props = contract["schema"]["properties"]
        self.assertEqual(props["scope"]["enum"], ["plugin:usage-dashboard"])
        self.assertEqual(props["flow_edges"]["maxItems"], 3)
        self.assertEqual(props["tests"]["maxItems"], 2)
        self.assertEqual(props["blocked_claims"]["maxItems"], 2)
        schema_text = json.dumps(contract["schema"], sort_keys=True)
        self.assertNotIn("source_path", schema_text)
        self.assertNotIn("source_anchor", schema_text)
        self.assertIn("DIRECT:E1", props["authority"]["enum"])
        self.assertIn("UNKNOWN", props["authority"]["enum"])
        self.assertNotIn("UNKNOWN:E1", props["authority"]["enum"])

    def test_response_format_uses_schema_constraint(self):
        contract = self.contract()
        fmt = contract_mod.response_format(contract)
        self.assertEqual(fmt["type"], "json_object")
        self.assertEqual(fmt["schema"], contract["schema"])

    def test_registry_is_revalidated_against_supplied_context(self):
        contract = self.contract()
        registry = contract_mod.validate_evidence_registry(contract, self.context())
        self.assertEqual(registry["E5"]["source_anchor"], "P50 selection source must never enter request identity")
        legend = contract_mod.evidence_legend(contract, self.context())
        self.assertIn("E5 = plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs :: P50 selection source must never enter request identity", legend)

    def test_registry_anchor_missing_from_context_fails_closed(self):
        context = self.context()
        context["blocks"][-1]["text"] = "different bounded test evidence"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(self.valid_payload()), self.contract(), context)

    def test_valid_evidence_id_payload_passes(self):
        payload = self.valid_payload()
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["scope"], "plugin:usage-dashboard")
        self.assertEqual(out["request_identity"], "DIRECT:E5")
        self.assertEqual(out["verdict"], "PARTIAL")

    def test_unknown_cannot_carry_an_evidence_suffix(self):
        payload = self.valid_payload()
        payload["generated_release"] = "UNKNOWN:E1"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_non_unknown_basis_must_reference_registered_evidence(self):
        payload = self.valid_payload()
        payload["request_identity"] = "DIRECT:E99"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_duplicate_flow_edge_is_rejected(self):
        payload = self.valid_payload()
        payload["flow_edges"] = [payload["flow_edges"][0], dict(payload["flow_edges"][0])]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_flow_edge_cap_is_enforced(self):
        payload = self.valid_payload()
        payload["flow_edges"].append({"from": "diagnostics", "to": "test", "basis": "DIRECT:E8"})
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_supported_verdict_cannot_hide_unknown_preservation(self):
        payload = self.valid_payload()
        payload["verdict"] = "SUPPORTED"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_conflict_basis_requires_conflict_verdict(self):
        payload = self.valid_payload()
        payload["authority"] = "CONFLICT:E1"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload["verdict"] = "CONFLICT"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["verdict"], "CONFLICT")

    def test_pair_prompt_shares_contract_hash_instruction_and_evidence_legend(self):
        contract = self.contract()
        matrix = {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": "service-tier-fidelity",
            "prompt": "trace service tier",
        }
        context = self.context()
        with tempfile.TemporaryDirectory() as td:
            skill = Path(td) / "SKILL.md"
            skill.write_text("target guidance", encoding="utf-8")
            with_prompt, with_meta = prompt_mod.compose(matrix, context, skill, "with_skill", contract)
            base_prompt, base_meta = prompt_mod.compose(matrix, context, skill, "baseline_without_target_skill", contract)
        expected_hash = contract_mod.contract_sha256(contract)
        self.assertEqual(with_meta["response_contract_sha256"], expected_hash)
        self.assertEqual(base_meta["response_contract_sha256"], expected_hash)
        self.assertIn(contract["prompt_instruction"], with_prompt)
        self.assertIn(contract["prompt_instruction"], base_prompt)
        legend_line = "E5 = plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs :: P50 selection source must never enter request identity"
        self.assertIn(legend_line, with_prompt)
        self.assertIn(legend_line, base_prompt)
        self.assertIn("use only an evidence ID", with_prompt)
        self.assertIn("do not write or invent source paths or anchors in the output", base_prompt)

    def test_chat_payload_carries_same_response_schema(self):
        contract = self.contract()
        generation = server_mod.validate_generation({
            "temperature": 0,
            "seed": 42,
            "n_predict": 768,
            "ctx_size": 16384,
            "threads": 4,
            "gpu_layers": 0,
        })
        payload = server_mod.build_chat_payload("task", generation, contract)
        self.assertEqual(payload["response_format"], contract_mod.response_format(contract))


class StructuredWorkflowContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = (REPO_ROOT / ".github" / "workflows" / "agent-skill-zero-credit-eval.yml").read_text(encoding="utf-8")
        cls.ci = (REPO_ROOT / ".github" / "workflows" / "agent-skills-ci.yml").read_text(encoding="utf-8")

    def test_workflow_wires_same_contract_to_prompt_and_runner(self):
        needle = "--response-contracts tools/agent-skill-eval/local-response-contracts.json"
        self.assertEqual(self.workflow.count(needle), 2)
        self.assertIn("ZERO_CREDIT_RESPONSE_CONTRACT_SHA256", self.workflow)

    def test_ordinary_ci_does_not_run_model_for_structured_contract(self):
        self.assertNotIn("local-response-contracts.json", self.ci)
        self.assertNotIn("response_format", self.ci)


if __name__ == "__main__":
    unittest.main()
