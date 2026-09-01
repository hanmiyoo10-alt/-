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
            {"path": "plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs", "text": "serviceTierSelectionSource captureSelectionSource requestKey"},
            {"path": "plugins/usage-dashboard/src/14-request-ledger.part.js", "text": "requestLedgerKey requestIdentityStable noExtraIoGuard"},
            {"path": "plugins/usage-dashboard/src/40-diagnostics.part.js", "text": "requestServiceTierSelectionSourceText diagnosticsSelectionSource"},
            {"path": "plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs", "text": "P50_SERVICE_TIER_SELECTION_SOURCE_FIDELITY requestLedgerKey noExtraIoGuard"},
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
            "authority": {
                "status": "DIRECT",
                "source_path": "docs/REPO_PROJECT_CATALOG.md",
                "source_anchor": "plugin:usage-dashboard",
                "note": "current catalog scope",
            },
            "flow_edges": [
                {
                    "from": "bridge capture",
                    "to": "request metadata",
                    "status": "DIRECT",
                    "source_path": "plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs",
                    "source_anchor": "serviceTierSelectionSource",
                    "note": "selection source captured into request metadata",
                },
                {
                    "from": "request metadata",
                    "to": "Recent Requests / Diagnostics",
                    "status": "DIRECT",
                    "source_path": "plugins/usage-dashboard/src/40-diagnostics.part.js",
                    "source_anchor": "requestServiceTierSelectionSourceText",
                    "note": "consumer formatting surface",
                },
            ],
            "request_identity": {
                "status": "DIRECT",
                "source_path": "plugins/usage-dashboard/src/14-request-ledger.part.js",
                "source_anchor": "requestLedgerKey",
                "note": "preserve ledger identity key",
            },
            "no_extra_io": {
                "status": "DIRECT",
                "source_path": "plugins/usage-dashboard/src/14-request-ledger.part.js",
                "source_anchor": "noExtraIoGuard",
                "note": "preserve no-extra-I/O boundary",
            },
            "tests": [
                {
                    "status": "DIRECT",
                    "source_path": "plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs",
                    "source_anchor": "P50_SERVICE_TIER_SELECTION_SOURCE_FIDELITY",
                    "note": "existing fidelity regression surface",
                }
            ],
            "generated_release": {
                "status": "UNKNOWN",
                "source_path": "",
                "source_anchor": "",
                "note": "not established by bounded evidence",
            },
            "narrowest_boundary": {
                "status": "DIRECT",
                "source_path": "plugins/usage-dashboard/src/40-diagnostics.part.js",
                "source_anchor": "diagnosticsSelectionSource",
                "note": "bounded to capture plus existing request presentation consumers",
            },
            "blocked_claims": ["generated/release ownership remains unresolved"],
            "verdict": "PARTIAL",
        }

    def test_contract_is_scoped_to_positive_case_only(self):
        self.assertIsNotNone(self.contract())
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-impact-scope", "narrow-negative"))
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-authority-scan", "1"))

    def test_response_format_uses_schema_constraint(self):
        contract = self.contract()
        fmt = contract_mod.response_format(contract)
        self.assertEqual(fmt["type"], "json_object")
        self.assertEqual(fmt["schema"], contract["schema"])

    def test_valid_source_linked_payload_passes(self):
        payload = self.valid_payload()
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["scope"], "plugin:usage-dashboard")
        self.assertEqual(out["verdict"], "PARTIAL")

    def test_unknown_claim_must_not_carry_source(self):
        payload = self.valid_payload()
        payload["generated_release"]["source_path"] = "docs/REPO_PROJECT_CATALOG.md"
        payload["generated_release"]["source_anchor"] = "plugin:usage-dashboard"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_non_unknown_anchor_must_exist_verbatim(self):
        payload = self.valid_payload()
        payload["request_identity"]["source_anchor"] = "inventedRequestIdentitySymbol"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_duplicate_flow_edge_is_rejected(self):
        payload = self.valid_payload()
        payload["flow_edges"].append(dict(payload["flow_edges"][0]))
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_supported_verdict_cannot_hide_unknown_preservation(self):
        payload = self.valid_payload()
        payload["verdict"] = "SUPPORTED"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_pair_prompt_shares_contract_hash_and_instruction(self):
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
