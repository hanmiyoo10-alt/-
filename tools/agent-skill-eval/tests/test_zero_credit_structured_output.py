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
            "flow_edges": ["F1", "F2", "F3"],
            "request_identity": "DIRECT:E5",
            "no_extra_io": "DIRECT:E6",
            "tests": ["DIRECT:E8"],
            "generated_release": "UNKNOWN",
            "narrowest_boundary": "DIRECT:E2",
            "blocked_claims": [],
        }

    def test_contract_is_scoped_to_positive_case_only(self):
        self.assertIsNotNone(self.contract())
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-impact-scope", "narrow-negative"))
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-authority-scan", "1"))

    def test_contract_uses_grounded_flow_registry_and_singleton_scope(self):
        contract = self.contract()
        self.assertEqual(contract["id"], "impact-scope-grounded-flow-v8")
        self.assertEqual(set(contract["evidence_registry"]), {f"E{i}" for i in range(1, 9)})
        self.assertEqual(
            contract["flow_edge_registry"],
            {
                "F1": {
                    "from": "bridge.capture.serviceTierSelectionSource",
                    "to": "bridge.normalizedRecentLogs.serviceTierSelectionSource",
                    "evidence_ids": ["E2", "E3"],
                },
                "F2": {
                    "from": "bridge.normalizedRecentLogs.serviceTierSelectionSource",
                    "to": "plugin.recentRequests.serviceTierSelectionSource",
                    "evidence_ids": ["E3", "E4"],
                },
                "F3": {
                    "from": "plugin.recentRequests.serviceTierSelectionSource",
                    "to": "plugin.diagnostics.selectionSource",
                    "evidence_ids": ["E4", "E7"],
                },
            },
        )
        self.assertEqual(contract["required_flow_edge_ids"], ["F1", "F2", "F3"])
        self.assertNotIn("flow_edges", contract["claim_evidence_status_allowlist"])
        props = contract["schema"]["properties"]
        self.assertEqual(props["scope"]["enum"], ["plugin:usage-dashboard"])
        self.assertEqual(props["flow_edges"]["items"]["enum"], ["F1", "F2", "F3"])
        self.assertEqual(props["flow_edges"]["minItems"], 0)
        self.assertEqual(props["flow_edges"]["maxItems"], 3)
        self.assertEqual(props["blocked_claims"]["maxItems"], 0)
        self.assertNotIn("verdict", props)
        self.assertEqual(
            props["request_identity"]["enum"],
            ["UNKNOWN", "DIRECT:E5", "SUPPORTED_LIKELY:E5"],
        )

    def test_raw_contract_has_no_free_form_flow_schema_or_dead_flow_allowlist(self):
        raw = json.loads((ROOT / "local-response-contracts.json").read_text(encoding="utf-8"))
        case = raw["contracts"]["plugin-impact-scope"]["service-tier-fidelity"]
        self.assertNotIn("schema", case)
        self.assertIn("flow_edge_registry", case)
        self.assertIn("required_flow_edge_ids", case)
        self.assertNotIn("flow_edges", case["claim_evidence_status_allowlist"])
        self.assertIn("select only registered F# edge IDs", case["prompt_instruction"])
        self.assertIn("never invent from/to endpoints", case["prompt_instruction"])
        self.assertIn("blocked_claims is a compatibility-only field and must be an empty array", case["prompt_instruction"])
        self.assertNotIn("derived_blocked_claims", case["prompt_instruction"])

    def test_flow_registry_is_revalidated_through_registered_evidence(self):
        contract = self.contract()
        registry = contract_mod.validate_flow_edge_registry(contract, self.context())
        self.assertEqual(registry["F1"]["evidence_ids"], ["E2", "E3"])
        self.assertEqual(registry["F3"]["evidence_ids"], ["E4", "E7"])
        legend = contract_mod.flow_edge_legend(contract, self.context())
        self.assertIn(
            "F1 = bridge.capture.serviceTierSelectionSource -> bridge.normalizedRecentLogs.serviceTierSelectionSource :: E2,E3",
            legend,
        )
        self.assertNotIn("p50-service-tier-selection-source-fidelity.cjs ->", legend)

    def test_flow_registry_rejects_unknown_evidence_and_required_unknown_edge(self):
        base = json.loads((ROOT / "local-response-contracts.json").read_text(encoding="utf-8"))
        mutations = [
            lambda case: case["flow_edge_registry"]["F1"].__setitem__("evidence_ids", ["E2", "E99"]),
            lambda case: case["required_flow_edge_ids"].append("F99"),
            lambda case: case["flow_edge_registry"]["F1"].__setitem__("to", case["flow_edge_registry"]["F1"]["from"]),
        ]
        for mutate in mutations:
            raw = json.loads(json.dumps(base))
            case = raw["contracts"]["plugin-impact-scope"]["service-tier-fidelity"]
            mutate(case)
            with tempfile.TemporaryDirectory() as td:
                path = Path(td) / "contracts.json"
                path.write_text(json.dumps(raw), encoding="utf-8")
                with self.assertRaises(contract_mod.ResponseContractError):
                    contract_mod.load_contract(path, "plugin-impact-scope", "service-tier-fidelity")

    def test_registry_anchor_missing_from_context_fails_closed(self):
        context = self.context()
        context["blocks"][-1]["text"] = "different bounded test evidence"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(self.valid_payload()), self.contract(), context)

    def test_valid_full_chain_payload_derives_partial_when_release_blocked(self):
        payload = self.valid_payload()
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["flow_edges"], ["F1", "F2", "F3"])
        self.assertEqual([edge["id"] for edge in out["resolved_flow_edges"]], ["F1", "F2", "F3"])
        self.assertEqual(out["derived_blocked_claims"], ["generated_release"])
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")

    def test_full_chain_and_resolved_preservation_derives_supported(self):
        payload = self.valid_payload()
        payload["generated_release"] = "SUPPORTED_LIKELY:E1"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_blocked_claims"], [])
        self.assertEqual(out["derived_impact_verdict"], "SUPPORTED")

    def test_partial_flow_chain_cannot_derive_supported(self):
        payload = self.valid_payload()
        payload["flow_edges"] = ["F2", "F3"]
        payload["generated_release"] = "SUPPORTED_LIKELY:E1"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_blocked_claims"], ["flow:F1"])
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")

    def test_missing_source_backed_test_derives_test_blocker(self):
        payload = self.valid_payload()
        payload["tests"] = []
        payload["generated_release"] = "SUPPORTED_LIKELY:E1"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_blocked_claims"], ["tests"])
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")

    def test_empty_flow_and_all_unknown_derives_unknown(self):
        payload = self.valid_payload()
        payload["authority"] = "UNKNOWN"
        payload["flow_edges"] = []
        payload["request_identity"] = "UNKNOWN"
        payload["no_extra_io"] = "UNKNOWN"
        payload["tests"] = []
        payload["generated_release"] = "UNKNOWN"
        payload["narrowest_boundary"] = "UNKNOWN"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(
            out["derived_blocked_claims"],
            [
                "authority",
                "flow:F1",
                "flow:F2",
                "flow:F3",
                "request_identity",
                "no_extra_io",
                "tests",
                "generated_release",
                "narrowest_boundary",
            ],
        )
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")

    def test_non_empty_model_owned_blocker_is_rejected(self):
        payload = self.valid_payload()
        payload["blocked_claims"] = ["SUPPORTED_LIKELY:E3"]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_free_form_or_test_flow_edges_fail_closed(self):
        for bad in (
            [{"from": "ledger", "to": "test", "basis": "DIRECT:E7"}],
            ["E8"],
            ["F99"],
            ["plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs"],
        ):
            payload = self.valid_payload()
            payload["flow_edges"] = bad
            with self.assertRaises(contract_mod.ResponseContractError):
                contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_duplicate_flow_edge_id_is_rejected(self):
        payload = self.valid_payload()
        payload["flow_edges"] = ["F1", "F1"]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_model_owned_verdict_field_is_rejected(self):
        payload = self.valid_payload()
        payload["verdict"] = "SUPPORTED"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_status_compatibility_remains_fail_closed(self):
        mutations = [
            lambda p: p.__setitem__("authority", "CONFLICT:E1"),
            lambda p: p.__setitem__("request_identity", "CONFLICT:E5"),
            lambda p: p.__setitem__("no_extra_io", "CONFLICT:E6"),
            lambda p: p.__setitem__("tests", ["CONFLICT:E5"]),
            lambda p: p.__setitem__("narrowest_boundary", "CONFLICT:E4"),
        ]
        for mutate in mutations:
            payload = self.valid_payload()
            mutate(payload)
            with self.assertRaises(contract_mod.ResponseContractError):
                contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_generated_release_rejects_direct_but_accepts_supported_likely(self):
        payload = self.valid_payload()
        payload["generated_release"] = "DIRECT:E1"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload["generated_release"] = "SUPPORTED_LIKELY:E1"
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["generated_release"], "SUPPORTED_LIKELY:E1")

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

    def test_cross_claim_evidence_reuse_fails_closed(self):
        cases = [
            lambda p: p.__setitem__("authority", "DIRECT:E8"),
            lambda p: p.__setitem__("request_identity", "DIRECT:E8"),
            lambda p: p.__setitem__("no_extra_io", "DIRECT:E5"),
            lambda p: p.__setitem__("tests", ["DIRECT:E1"]),
            lambda p: p.__setitem__("generated_release", "SUPPORTED_LIKELY:E8"),
            lambda p: p.__setitem__("narrowest_boundary", "DIRECT:E8"),
        ]
        for mutate in cases:
            payload = self.valid_payload()
            mutate(payload)
            with self.assertRaises(contract_mod.ResponseContractError):
                contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_pair_prompt_shares_contract_hash_evidence_flow_and_status_legends(self):
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
        self.assertIn("FLOW EDGE REGISTRY", with_prompt)
        self.assertIn("F1 = bridge.capture.serviceTierSelectionSource", with_prompt)
        self.assertIn("F3 = plugin.recentRequests.serviceTierSelectionSource", base_prompt)
        self.assertIn("CLAIM EVIDENCE STATUS COMPATIBILITY", with_prompt)
        self.assertIn("request_identity = DIRECT:E5,SUPPORTED_LIKELY:E5", base_prompt)
        self.assertNotIn("flow_edges = DIRECT:E2", with_prompt)
        self.assertIn("registered F# values", with_prompt)

    def test_chat_payload_carries_same_grounded_flow_response_schema(self):
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
        flow_items = payload["response_format"]["schema"]["properties"]["flow_edges"]["items"]
        self.assertEqual(flow_items["enum"], ["F1", "F2", "F3"])
        self.assertEqual(payload["response_format"]["schema"]["properties"]["blocked_claims"]["maxItems"], 0)
        self.assertNotIn("verdict", payload["response_format"]["schema"]["properties"])


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
