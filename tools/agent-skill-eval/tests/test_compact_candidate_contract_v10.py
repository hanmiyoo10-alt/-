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


def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


contract_mod = load("compact_candidate_contract_v10_test", ROOT / "local_response_contract.py")
prompt_mod = load("compact_candidate_prompt_v10_test", ROOT / "compose_local_prompt.py")
receipt_mod = load("compact_candidate_receipt_v10_test", ROOT / "validate_local_receipt.py")

CASE_ID = "synthetic-v10"
SCOPE = "plugin:synthetic-v10"
HISTORICAL_V9_SHA256 = "90808228a42eb509cd16daefc3748684d01837ae9064ba5562bcee08521afc89"


class CandidateCompactWireV10Tests(unittest.TestCase):
    def context(self) -> dict:
        blocks = [
            {
                "index": 1,
                "ref": "a" * 40,
                "resolved_commit_sha": "a" * 40,
                "path": "full.txt",
                "extraction": {"mode": "full", "max_bytes": 4096},
                "text": (
                    "authority\n"
                    "owner\n"
                    "flow-source\n"
                    "request-id\n"
                    "no-extra\n"
                    "test\n"
                    "release\n"
                    "narrow\n"
                    "boundary\n"
                ),
            },
            {
                "index": 2,
                "ref": "b" * 40,
                "resolved_commit_sha": "b" * 40,
                "path": "window.txt",
                "extraction": {
                    "mode": "needle_windows",
                    "needles": ["target"],
                    "radius": 1,
                    "max_bytes": 4096,
                },
                "text": "10: previous\n11: target\n12: next\n",
            },
        ]
        return {
            "schema_version": 1,
            "skill": "plugin-impact-scope",
            "case_id": CASE_ID,
            "blocks": blocks,
            "context_text": (
                "--- SOURCE 1 raw ---\n"
                + blocks[0]["text"]
                + "\n--- SOURCE 2 raw ---\n"
                + blocks[1]["text"]
            ),
            "context_sha256": "e" * 64,
        }

    def raw_contract(self) -> dict:
        return {
            "id": "candidate-grounded-impact-report-v10",
            "expected_scope": SCOPE,
            "prompt_instruction": (
                "Return exactly one compact JSON object with keys scope,a,o,f,p,t,g,n. "
                "Use tuples: a/g/n=[STATUS,VALUE,S#@L#], "
                "o/p.b/t=[LABEL,STATUS,S#@L#], "
                "f=[FROM,TO,STATUS,[S#@L#,...]], "
                "p.ri/p.io=[STATUS,S#@L#]. "
                "UNKNOWN simple claims use empty value/ref as applicable. "
                "Do not emit blockers or a verdict."
            ),
        }

    def contract(self) -> dict:
        value = self.raw_contract()
        value["schema"] = contract_mod.build_schema(value)
        return value

    def supported_payload(self) -> dict:
        return {
            "scope": SCOPE,
            "a": ["DIRECT", "authority", "S1@L1"],
            "o": [["owner", "DIRECT", "S1@L2"]],
            "f": [["producer", "consumer", "SUPPORTED_LIKELY", ["S1@L3", "S2@L11"]]],
            "p": {
                "ri": ["DIRECT", "S1@L4"],
                "io": ["DIRECT", "S1@L5"],
                "b": [["boundary", "DIRECT", "S1@L9"]],
            },
            "t": [["test", "DIRECT", "S1@L6"]],
            "g": ["SUPPORTED_LIKELY", "release", "S1@L7"],
            "n": ["DIRECT", "narrow", "S1@L8"],
        }

    def test_v10_contract_loader_rejects_hidden_answer_fields(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "contracts.json"
            doc = {"schema_version": 1, "contracts": {"plugin-impact-scope": {CASE_ID: self.raw_contract()}}}
            path.write_text(json.dumps(doc), encoding="utf-8")
            loaded = contract_mod.load_contract(path, "plugin-impact-scope", CASE_ID)
            self.assertEqual(loaded["id"], contract_mod.V10_CONTRACT_ID)
            raw = dict(self.raw_contract())
            raw["expected_flow"] = "hidden"
            doc["contracts"]["plugin-impact-scope"][CASE_ID] = raw
            path.write_text(json.dumps(doc), encoding="utf-8")
            with self.assertRaises(contract_mod.ResponseContractError):
                contract_mod.load_contract(path, "plugin-impact-scope", CASE_ID)

    def test_v10_schema_is_compact_and_has_no_model_owned_verdict(self):
        schema = self.contract()["schema"]
        self.assertEqual(set(schema["properties"]), {"scope", "a", "o", "f", "p", "t", "g", "n"})
        self.assertNotIn("verdict", json.dumps(schema))
        self.assertNotIn("blocked_claims", json.dumps(schema))
        self.assertEqual(schema["properties"]["o"]["maxItems"], 3)
        self.assertEqual(schema["properties"]["f"]["maxItems"], 3)
        self.assertEqual(schema["properties"]["p"]["properties"]["b"]["maxItems"], 2)
        self.assertEqual(schema["properties"]["t"]["maxItems"], 2)

    def test_supported_partial_unknown_conflict_are_evaluator_derived(self):
        payload = self.supported_payload()
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "SUPPORTED")
        self.assertEqual(out["derived_blocked_claims"], [])

        payload = self.supported_payload()
        payload["p"]["ri"] = ["UNKNOWN", ""]
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "PARTIAL")
        self.assertEqual(out["derived_blocked_claims"], ["request_identity"])

        payload = self.supported_payload()
        payload["a"] = ["UNKNOWN", "", ""]
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "UNKNOWN")
        self.assertIn("authority", out["derived_blocked_claims"])

        payload = self.supported_payload()
        payload["a"] = ["CONFLICT", "authority", "S1@L1"]
        out = contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        self.assertEqual(out["derived_impact_verdict"], "CONFLICT")
        self.assertIn("conflict", out["derived_blocked_claims"])

    def test_source_line_resolution_supports_full_and_needle_windows(self):
        out = contract_mod.validate_content(json.dumps(self.supported_payload()), self.contract(), self.context())
        self.assertEqual(out["authority"]["sourceRefs"][0]["sourceText"], "authority")
        self.assertEqual(out["flowEdges"][0]["sourceRefs"][1]["sourceText"], "target")
        self.assertEqual(out["flowEdges"][0]["sourceRefs"][1]["sourceLine"], 11)

    def test_source_line_refs_fail_closed(self):
        for bad_ref in ("S17@L1", "S1@L0", "S1@L10000000", "S1-L1"):
            payload = self.supported_payload()
            payload["a"][2] = bad_ref
            with self.subTest(ref=bad_ref):
                with self.assertRaises(contract_mod.ResponseContractError):
                    contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload = self.supported_payload()
        payload["a"][2] = "S1@L99"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload = self.supported_payload()
        payload["f"][0][3] = ["S2@L10", "S2@L99"]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_unknown_cannot_smuggle_affirmative_value_or_source(self):
        payload = self.supported_payload()
        payload["a"] = ["UNKNOWN", "invented", ""]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload = self.supported_payload()
        payload["p"]["io"] = ["UNKNOWN", "S1@L5"]
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_tuple_cardinality_and_model_owned_extra_fields_fail_closed(self):
        payload = self.supported_payload()
        payload["o"] = payload["o"] * 4
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload = self.supported_payload()
        payload["f"][0].append("extra")
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())
        payload = self.supported_payload()
        payload["verdict"] = "SUPPORTED"
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload), self.contract(), self.context())

    def test_text_limits_are_utf8_bytes_not_codepoints(self):
        payload = self.supported_payload()
        payload["o"][0][0] = "한" * 16
        contract_mod.validate_content(json.dumps(payload, ensure_ascii=False), self.contract(), self.context())
        payload["o"][0][0] = "한" * 17
        with self.assertRaises(contract_mod.ResponseContractError):
            contract_mod.validate_content(json.dumps(payload, ensure_ascii=False), self.contract(), self.context())

    def test_maximum_compact_wire_guardrail_is_below_frozen_ceiling(self):
        x = "한" * 16
        y = "나" * 16
        payload = {
            "scope": SCOPE,
            "a": ["SUPPORTED_LIKELY", x, "S16@L9999999"],
            "o": [[x, "SUPPORTED_LIKELY", "S16@L9999999"] for _ in range(3)],
            "f": [[x, y, "SUPPORTED_LIKELY", ["S15@L9999998", "S16@L9999999"]] for _ in range(3)],
            "p": {
                "ri": ["SUPPORTED_LIKELY", "S16@L9999999"],
                "io": ["SUPPORTED_LIKELY", "S16@L9999999"],
                "b": [[x, "SUPPORTED_LIKELY", "S16@L9999999"] for _ in range(2)],
            },
            "t": [[x, "SUPPORTED_LIKELY", "S16@L9999999"] for _ in range(2)],
            "g": ["SUPPORTED_LIKELY", x, "S16@L9999999"],
            "n": ["SUPPORTED_LIKELY", x, "S16@L9999999"],
        }
        self.assertLessEqual(contract_mod.compact_wire_bytes(payload), contract_mod.MAX_COMPACT_WIRE_BYTES)

    def test_v10_prompt_numbers_full_blocks_without_mutating_context_hash(self):
        matrix = {
            "eval_kind": "output",
            "skill": "plugin-impact-scope",
            "case_id": CASE_ID,
            "fixture_class": "second_scope_candidate",
            "candidate_scope": SCOPE,
            "candidate_frozen_source_snapshot": {"main": "a" * 40},
            "prompt": "impact scope only",
        }
        prompt, meta = prompt_mod.compose(matrix, self.context(), Path("/does/not/need/to/exist"), "baseline_without_target_skill", self.contract())
        self.assertIn("S#@L#", prompt)
        self.assertIn("Use only compact S#@L# references", prompt)
        self.assertIn("1: authority", prompt)
        self.assertIn("11: target", prompt)
        self.assertNotIn("FLOW EDGE REGISTRY", prompt)
        self.assertEqual(meta["evidence_context_sha256"], "e" * 64)

    def test_v10_receipt_revalidation_persists_derived_verdict(self):
        payload = self.supported_payload()
        payload["t"] = []
        contract = self.contract()
        contract_hash = contract_mod.contract_sha256(contract)
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            mode = root / "with_skill"
            mode.mkdir(parents=True)
            response = mode / "response.txt"
            response.write_text(json.dumps(payload), encoding="utf-8")
            (root / "response-contract.json").write_text(json.dumps(contract), encoding="utf-8")
            (root / "context.json").write_text(json.dumps(self.context()), encoding="utf-8")
            (mode / "structured-validation.json").write_text(json.dumps({"status": "VALID", "response_contract_sha256": contract_hash, "error": None}), encoding="utf-8")
            verdict, blockers = receipt_mod._derive_structured_impact_evidence(response, str(contract_hash), 0)
            self.assertEqual(verdict, "PARTIAL")
            self.assertEqual(blockers, ["tests_contracts"])
            validation = json.loads((mode / "structured-validation.json").read_text(encoding="utf-8"))
            self.assertEqual(validation["derived_impact_verdict"], "PARTIAL")
            self.assertEqual(validation["derived_blocked_claims"], ["tests_contracts"])

    def test_historical_v9_contract_hash_is_unchanged(self):
        contract = contract_mod.load_contract(ROOT / "local-response-contracts.json", "plugin-impact-scope", "devpass-missing-artifact-recovery-heldout")
        self.assertEqual(contract_mod.contract_sha256(contract), HISTORICAL_V9_SHA256)


if __name__ == "__main__":
    unittest.main()
