import json
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from canonical import canonical_sha256
from evidence import build_evidence_package, evidence_package_sha256
from roles.scout import (
    ScoutContractError,
    build_role_artifact,
    build_scout_prompt,
    prompt_sha256,
    scout_response_schema,
    validate_scout_wire,
)
from router import route_task
from runtime.generation import GENERATION, LLAMA_RUNTIME, SCOUT_MODEL_PROFILE_ID, scout_generation, scout_model_profile
from runtime.llama_cpp import LlamaRuntimeError, build_server_command, classify_finish_reason, verify_file_sha256
from runtime.local_server import build_chat_payload
from runtime.receipt import build_scout_execution_result, role_execution_receipt_sha256

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40


class O2AScoutRuntimeTests(unittest.TestCase):
    def evidence(self):
        plan = route_task({
            "schema_version": 1,
            "task_id": "o2a-scout",
            "scope": "plugin:usage-dashboard",
            "task_kind": "impact_analysis",
            "intent": "Exercise the O2-A Scout mechanical pilot.",
            "mutation_requested": False,
            "device_truth_requested": False,
        })
        snapshot = resolve_authority("plugin:usage-dashboard", TARGET_SHA, [
            {"kind": "release_branch", "value": "release-usage-dashboard", "status": "OBSERVED", "source_sha": RELEASE_SHA},
            {"kind": "manifest", "value": "plugins/usage-dashboard/runtime/product-manifest.json", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "artifact", "value": "plugins/usage-dashboard/latest.js", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "release_spec_dir", "value": ".github/usage-dashboard/releases", "status": "OBSERVED", "source_sha": TARGET_SHA},
        ])
        return build_evidence_package(plan, snapshot, [
            {"path": "plugins/usage-dashboard/src/runtime.js", "source_sha": TARGET_SHA, "start_line": 10, "content": "export const runtime = true;"},
            {"path": "plugins/usage-dashboard/runtime/product-manifest.json", "source_sha": TARGET_SHA, "start_line": 1, "content": '{"name":"usage-dashboard"}'},
        ])

    def valid_content(self):
        return json.dumps({"r": [
            {"k": "a", "s": "D", "v": "domain_primary", "r": ["S2@L10"]},
            {"k": "s", "s": "D", "v": "relevant_source", "r": ["S1@L1"]},
        ]}, separators=(",", ":"))

    def test_scout_profile_is_frozen_to_existing_qwen_3b_not_selected_by_order(self):
        profile = scout_model_profile()
        self.assertEqual(SCOUT_MODEL_PROFILE_ID, "qwen2.5-3b-instruct-q4_k_m")
        self.assertEqual(profile["profile_id"], SCOUT_MODEL_PROFILE_ID)
        self.assertEqual(profile["family"], "qwen2.5")
        self.assertEqual(profile["sha256"], "626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d")

    def test_generation_and_runtime_identity_match_proven_zero_credit_lane(self):
        expected = {"temperature": 0, "seed": 42, "n_predict": 768, "ctx_size": 16384, "threads": 4, "gpu_layers": 0}
        self.assertEqual(scout_generation(), expected)
        self.assertEqual(GENERATION, expected)
        self.assertEqual(LLAMA_RUNTIME["release"], "b10516")
        self.assertEqual(LLAMA_RUNTIME["artifact_sha256"], "f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35")

    def test_valid_compact_wire_builds_real_role_artifact_with_deterministic_provenance(self):
        evidence = self.evidence()
        prompt = build_scout_prompt(evidence)
        content = self.valid_content()
        parsed = validate_scout_wire(content, evidence)
        artifact = build_role_artifact(content, evidence, prompt)
        self.assertEqual(set(parsed), {"r"})
        self.assertEqual(artifact["role"], "scout")
        self.assertEqual(artifact["model_profile_id"], SCOUT_MODEL_PROFILE_ID)
        self.assertEqual(artifact["evidence_sha256"], evidence_package_sha256(evidence))
        self.assertEqual(artifact["prompt_sha256"], prompt_sha256(prompt))
        self.assertEqual(artifact["structured_response_sha256"], canonical_sha256(parsed))
        self.assertEqual(artifact["upstream_artifact_sha256"], [])
        self.assertEqual(artifact["records"]["flow_edges"], [])
        self.assertEqual(artifact["records"]["boundaries"], [])
        self.assertEqual(artifact["records"]["blockers"], [])
        self.assertEqual(artifact["records"]["conflicts"], [])
        self.assertEqual(artifact["records"]["claims"][0]["kind"], "authority")
        self.assertEqual(artifact["records"]["claims"][1]["value"], "relevant_source")

    def test_unknown_preserved_without_refs(self):
        evidence = self.evidence()
        artifact = build_role_artifact('{"r":[{"k":"a","s":"U","v":"unknown","r":[]}]}', evidence, build_scout_prompt(evidence))
        claim = artifact["records"]["claims"][0]
        self.assertEqual(claim["status"], "UNKNOWN")
        self.assertEqual(claim["refs"], [])

    def test_unknown_with_refs_is_rejected(self):
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[{"k":"a","s":"U","v":"unknown","r":["S2@L10"]}]}', self.evidence())

    def test_unknown_source_ref_is_rejected(self):
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[{"k":"s","s":"D","v":"relevant_source","r":["S9@L9"]}]}', self.evidence())

    def test_authority_value_must_come_from_supplied_authority_metadata(self):
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[{"k":"a","s":"D","v":"release_spec_dir","r":["S2@L10"]}]}', self.evidence())

    def test_semantic_prose_and_forbidden_top_level_fields_are_rejected(self):
        evidence = self.evidence()
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[{"k":"s","s":"D","v":"runtime owns release flow","r":["S2@L10"]}]}', evidence)
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[],"verdict":"SUPPORTED"}', evidence)

    def test_duplicate_json_keys_and_over_ceiling_wire_fail_closed(self):
        evidence = self.evidence()
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[],"r":[]}', evidence)
        with self.assertRaises(ScoutContractError):
            validate_scout_wire('{"r":[]}' + (" " * 2401), evidence)

    def test_prompt_exposes_supplied_evidence_but_no_upstream_role_prose(self):
        prompt = build_scout_prompt(self.evidence())
        self.assertIn("REF S2@L10", prompt)
        self.assertIn("authority_class=domain_primary", prompt)
        self.assertIn("Do not infer semantic owners", prompt)
        self.assertNotIn("mapper output", prompt.lower())
        self.assertNotIn("critic output", prompt.lower())

    def test_response_schema_is_closed_and_compact(self):
        schema = scout_response_schema()
        self.assertFalse(schema["additionalProperties"])
        self.assertEqual(schema["properties"]["r"]["maxItems"], 12)
        record = schema["properties"]["r"]["items"]
        self.assertFalse(record["additionalProperties"])
        self.assertEqual(record["properties"]["r"]["maxItems"], 3)

    def test_finish_reason_stop_only_is_completed(self):
        self.assertEqual(classify_finish_reason("stop"), "COMPLETED")
        self.assertEqual(classify_finish_reason("length"), "EXECUTION_INCOMPLETE")
        self.assertEqual(classify_finish_reason("content_filter"), "EXECUTION_INCOMPLETE")
        self.assertEqual(classify_finish_reason(""), "INVALID")

    def test_truncation_receipt_is_execution_incomplete_and_never_fabricates_role_artifact(self):
        evidence = self.evidence()
        result = build_scout_execution_result(content='{"r":[', finish_reason="length", evidence_package=evidence, prompt=build_scout_prompt(evidence), runtime_version="llama.cpp test-runtime")
        self.assertIsNone(result["artifact"])
        self.assertEqual(result["receipt"]["execution_status"], "EXECUTION_INCOMPLETE")
        self.assertEqual(result["receipt"]["role_artifact_sha256"], "NONE")
        self.assertEqual(result["receipt"]["model_call_count"], 1)
        self.assertEqual(result["receipt"]["hosted_ai_call_count"], 0)

    def test_stop_with_invalid_wire_is_invalid_not_completed(self):
        evidence = self.evidence()
        result = build_scout_execution_result(content='{"r":[],"verdict":"SUPPORTED"}', finish_reason="stop", evidence_package=evidence, prompt=build_scout_prompt(evidence), runtime_version="llama.cpp test-runtime")
        self.assertEqual(result["receipt"]["execution_status"], "INVALID")
        self.assertEqual(result["receipt"]["role_artifact_sha256"], "NONE")
        self.assertIsNotNone(result["error"])

    def test_completed_receipt_is_reproducible_and_zero_hosted_ai(self):
        evidence = self.evidence()
        kwargs = dict(content=self.valid_content(), finish_reason="stop", evidence_package=evidence, prompt=build_scout_prompt(evidence), runtime_version="llama.cpp test-runtime")
        first = build_scout_execution_result(**kwargs)
        second = build_scout_execution_result(**kwargs)
        self.assertEqual(first, second)
        self.assertEqual(first["receipt"]["execution_status"], "COMPLETED")
        self.assertEqual(first["receipt"]["hosted_ai_call_count"], 0)
        self.assertEqual(role_execution_receipt_sha256(first["receipt"]), role_execution_receipt_sha256(second["receipt"]))

    def test_model_sha_verification_and_server_command_are_cpu_loopback_only(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            binary = root / "llama-server"
            model = root / "model.gguf"
            binary.write_bytes(b"runtime")
            model.write_bytes(b"model")
            import hashlib
            verify_file_sha256(model, hashlib.sha256(b"model").hexdigest())
            with self.assertRaises(LlamaRuntimeError):
                verify_file_sha256(model, "0" * 64)
            command = build_server_command(binary, model, scout_generation(), 39128)
            self.assertIn("127.0.0.1", command)
            self.assertEqual(command[command.index("--n-gpu-layers") + 1], "0")

    def test_chat_payload_is_single_turn_local_json_contract(self):
        payload = build_chat_payload("hello", scout_generation(), scout_response_schema())
        self.assertEqual(payload["messages"], [{"role": "user", "content": "hello"}])
        self.assertFalse(payload["stream"])
        self.assertEqual(payload["max_tokens"], 768)
        self.assertEqual(payload["response_format"]["type"], "json_object")
        self.assertNotIn("url", payload)


if __name__ == "__main__":
    unittest.main()
