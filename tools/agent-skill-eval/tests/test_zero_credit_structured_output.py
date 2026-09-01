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
        }

    def test_contract_is_scoped_to_positive_case_only(self):
        self.assertIsNotNone(self.contract())
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-impact-scope", "narrow-negative"))
        self.assertIsNone(contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-authority-scan", "1"))

    def test_contract_uses_claim_evidence_status_pairs_and_singleton_scope(self):
        contract = self.contract()
        self.assertEqual(contract["id"], "impact-scope-evidence-status-compat-v6")
        self.assertEqual(set(contract["evidence_registry"]), {f"E{i}" for i in range(1, 9)})
        self.assertEqual(
            contract["claim_evidence_status_allowlist"],
            {
                "authority": {"E1": ["DIRECT", "SUPPORTED_LIKELY"]},
                "flow_edges": {
                    "E2": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E3": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E4": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E7": ["DIRECT", "SUPPORTED_LIKELY"],
                },
                "request_identity": {"E5": ["DIRECT", "SUPPORTED_LIKELY"]},
                "no_extra_io": {"E6": ["DIRECT", "SUPPORTED_LIKELY"]},
                "tests": {
                    "E5": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E6": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E8": ["DIRECT", "SUPPORTED_LIKELY"],
                },
                "generated_release": {"E1": ["SUPPORTED_LIKELY"]},
                "narrowest_boundary": {
                    "E2": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E3": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E4": ["DIRECT", "SUPPORTED_LIKELY"],
                    "E7": ["DIRECT", "SUPPORTED_LIKELY"],
                },
            },
        )
        props = contract["schema"]["properties"]
        self.assertEqual(props["scope"]["enum"], ["plugin:usage-dashboard"])
        self.assertEqual(props["flow_edges"]["maxItems"], 3)
        self.assertEqual(props["tests"]["maxItems"], 2)
        self.assertEqual(props["blocked_claims"]["maxItems"], 2)
        self.assertNotIn("verdict", props)
        self.assertNotIn("verdict", contract["schema"]["required"])
        self.assertEqual(
            props["request_identity"]["enum"],
            ["UNKNOWN", "DIRECT:E5", "SUPPORTED_LIKELY:E5"],
        )
        self.assertEqual(
            props["generated_release"]["enum"],
            ["UNKNOWN", "SUPPORTED_LIKELY:E1"],
        )
        self.assertNotIn("CONFLICT:E1", props["authority"]["enum"])
        self.assertNotIn("UNKNOWN:E1", props["authority"]["enum"])

    def test_raw_contract_has_no_duplicated_static_schema(self):
        raw = json.loads((ROOT / "local-response-contracts.json").read_text(encoding="utf-8"))
        case = raw["contracts"]["plugin-impact-scope"]["service-tier-fidelity"]
        self.assertNotIn("schema", case)
        self.assertIn("claim_evidence_status_allowlist", case)
        self.assertNotIn("claim_evidence_allowlist", case)
        self.assertIn("Do not emit a verdict field", case["prompt_instruction"])
        self.assertIn("Do not emit CONFLICT unless", case["prompt_instruction"])

    def test_response_format_uses_status_constrained_schema(self):
        contract = self.contract()
        fmt = contract_mod.response_format(contract)
        self.assertEqual(fmt["type"], "json_object")
        self.assertEqual(fmt["schema"], contract["schema"])
        self.assertEqual(
            contract["schema"]["properties"]["tests"]["items"]["enum"],
            [
                "UNKNOWN",
                "DIRECT:E5", "DIRECT:E6", "DIRECT:E8",
                "SUPPORTED_LIKELY:E5", "SUPPORTED_LIKELY:E6", "SUPPORTED_LIKELY:E8",
            ],
        )
        self.assertFalse(
            any(
                value.startswith("CONFLICT:")
                for prop in contract["schema"]["properties"].values()
                for value in (
                    prop.get("enum", [])
                    if isinstance(prop, dict)
                    else []
                )
            )
        )

    def test_registry_is_revalidated_against_supplied_context(self):
        contract = self.contract()
        registry = contract_mod.validate_evidence_registry(contract, self.context())
        self.assertEqual(registry["E5"]["source_anchor"], "P50 selection source must never enter request identity")
        legend = contract_mod.evidence_legend(contract, self.context())
        self.assertIn("E5 = plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs :: P50 selection source must never enter request identity", legend)
        compatibility = contract_mod.claim_evidence_legend(contract)
        self.assertIn("request_identity = DIRECT:E5,SUPPORTED_LIKELY:E5", compatibility)
        self.assertIn("authority = DIRECT:E1,SUPPORTED_LIKELY:E1", compatibility)
        self.assertNotIn("CONFLICT:E5", compatibility)

    def test_registry_anchor_missing_from_context_fails_closed(self):
        context = self.context()
        context["blocks"][-1]["text"] = "different bounded test evidence"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(self.valid_payload()), self.contract(), context)

    def test_valid_status_compatible_payload_derives_partial(self):
        payload = self.valid_payload()
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["scope"], "plugin:usage-dashboard")
        self.assertEqual(out["request_identity"], "DIRECT:E5")
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")
        self.assertNotIn("verdict", payload)

    def test_model_owned_verdict_field_is_rejected(self):
        payload = self.valid_payload()
        payload["verdict"] = "PARTIAL"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_r12_unsupported_conflict_statuses_fail_closed(self):
        mutations = [
            lambda p: p.__setitem__("authority", "CONFLICT:E1"),
            lambda p: p.__setitem__("request_identity", "CONFLICT:E5"),
            lambda p: p.__setitem__("no_extra_io", "CONFLICT:E6"),
            lambda p: p.__setitem__("tests", ["CONFLICT:E5"]),
            lambda p: p["flow_edges"][0].__setitem__("basis", "CONFLICT:E2"),
            lambda p: p.__setitem__("narrowest_boundary", "CONFLICT:E4"),
        ]
        for mutate in mutations:
            payload = self.valid_payload()
            mutate(payload)
            with self.assertRaises(contract_mod.ResponseContractError):
                contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_all_unknown_evidence_derives_unknown(self):
        payload = self.valid_payload()
        payload["authority"] = "UNKNOWN"
        payload["flow_edges"] = [{"from": "producer", "to": "consumer", "basis": "UNKNOWN"}]
        payload["request_identity"] = "UNKNOWN"
        payload["no_extra_io"] = "UNKNOWN"
        payload["tests"] = []
        payload["generated_release"] = "UNKNOWN"
        payload["narrowest_boundary"] = "UNKNOWN"
        payload["blocked_claims"] = []
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")

    def test_fully_resolved_unblocked_evidence_derives_supported(self):
        payload = self.valid_payload()
        payload["generated_release"] = "SUPPORTED_LIKELY:E1"
        payload["blocked_claims"] = []
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "SUPPORTED")

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
            ("authority", lambda p: p.__setitem__("authority", "DIRECT:E8")),
            ("request_identity", lambda p: p.__setitem__("request_identity", "DIRECT:E8")),
            ("no_extra_io", lambda p: p.__setitem__("no_extra_io", "DIRECT:E5")),
            ("tests", lambda p: p.__setitem__("tests", ["DIRECT:E1"])),
            ("generated_release", lambda p: p.__setitem__("generated_release", "SUPPORTED_LIKELY:E8")),
            ("narrowest_boundary", lambda p: p.__setitem__("narrowest_boundary", "DIRECT:E8")),
            ("flow_edges", lambda p: p["flow_edges"][0].__setitem__("basis", "DIRECT:E5")),
        ]
        for label, mutate in cases:
            with self.subTest(label=label):
                payload = self.valid_payload()
                mutate(payload)
                with self.assertRaises(contract_mod.ResponseContractError):
                    contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_status_allowlist_rejects_unregistered_invalid_duplicate_unknown_and_empty(self):
        base = json.loads((ROOT / "local-response-contracts.json").read_text(encoding="utf-8"))
        mutations = [
            lambda case: case["claim_evidence_status_allowlist"]["authority"].__setitem__("E99", ["DIRECT"]),
            lambda case: case["claim_evidence_status_allowlist"]["authority"]["E1"].append("DIRECT"),
            lambda case: case["claim_evidence_status_allowlist"]["authority"]["E1"].append("UNKNOWN"),
            lambda case: case["claim_evidence_status_allowlist"]["authority"]["E1"].append("BOGUS"),
            lambda case: case["claim_evidence_status_allowlist"].__setitem__("authority", {}),
        ]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                raw = json.loads(json.dumps(base))
                case = raw["contracts"]["plugin-impact-scope"]["service-tier-fidelity"]
                mutate(case)
                with tempfile.TemporaryDirectory() as td:
                    path = Path(td) / "contracts.json"
                    path.write_text(json.dumps(raw), encoding="utf-8")
                    with self.assertRaises(contract_mod.ResponseContractError):
                        contract_mod.load_contract(path, "plugin-impact-scope", "service-tier-fidelity")

    def test_duplicate_flow_edge_is_rejected(self):
        payload = self.valid_payload()
        payload["flow_edges"] = [payload["flow_edges"][0], dict(payload["flow_edges"][0])]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_flow_edge_cap_is_enforced(self):
        payload = self.valid_payload()
        payload["flow_edges"].append({"from": "diagnostics", "to": "test", "basis": "DIRECT:E4"})
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_pair_prompt_shares_contract_hash_instruction_evidence_and_status_legends(self):
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
        self.assertIn("CLAIM EVIDENCE STATUS COMPATIBILITY", with_prompt)
        self.assertIn("authority = DIRECT:E1,SUPPORTED_LIKELY:E1", with_prompt)
        self.assertIn("request_identity = DIRECT:E5,SUPPORTED_LIKELY:E5", base_prompt)
        self.assertIn("STATUS:E# pair", with_prompt)
        self.assertIn("Do not emit a verdict field", base_prompt)
        self.assertIn("do not write or invent source paths or anchors in the output", base_prompt)

    def test_chat_payload_carries_same_status_constrained_response_schema(self):
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
