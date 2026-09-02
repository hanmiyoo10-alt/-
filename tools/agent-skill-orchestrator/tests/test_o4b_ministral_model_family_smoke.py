from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models.model_family_smoke import (
    EXPECTED_CANDIDATE,
    GENERATION,
    LLAMA_RUNTIME,
    ModelFamilySmokeError,
    candidate_download_url,
    candidate_sha256,
    load_candidate,
    model_credential_env_present,
    receipt_sha256,
    validate_receipt,
)
from registry import eligible_model_profiles, load_model_registry

CANDIDATE_PATH = ROOT / "models" / "candidates" / "ministral-3-3b-instruct-2512-q4_k_m.json"
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "agent-skill-orchestrator-model-family-smoke.yml"


class O4BMinistralModelFamilySmokeTests(unittest.TestCase):
    def test_candidate_manifest_is_exact_frozen_identity(self):
        candidate = load_candidate(CANDIDATE_PATH)
        self.assertEqual(candidate, EXPECTED_CANDIDATE)
        self.assertEqual(candidate["revision"], "fc774f009f0c62a186f48e870fd6295b36f63779")
        self.assertEqual(candidate["file"], "Ministral-3-3B-Instruct-2512-Q4_K_M.gguf")
        self.assertEqual(candidate["size_bytes"], 2147023008)
        self.assertEqual(candidate["sha256"], "9ed150d4367e68df0ac8e1540f6ddc65b42d0ee26378329d1ecbca60f93fc5f8")
        self.assertEqual(candidate["license"]["id"], "apache-2.0")
        self.assertEqual(candidate["access"]["proof_status"], "pending_smoke")

    def test_candidate_download_url_is_revision_scoped_not_main(self):
        url = candidate_download_url(load_candidate(CANDIDATE_PATH))
        self.assertIn("/resolve/fc774f009f0c62a186f48e870fd6295b36f63779/", url)
        self.assertNotIn("/resolve/main/", url)
        self.assertTrue(url.endswith("Ministral-3-3B-Instruct-2512-Q4_K_M.gguf?download=true"))

    def test_candidate_manifest_tamper_fails_closed(self):
        candidate = deepcopy(EXPECTED_CANDIDATE)
        candidate["sha256"] = "0" * 64
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "candidate.json"
            path.write_text(json.dumps(candidate), encoding="utf-8")
            with self.assertRaises(ModelFamilySmokeError):
                load_candidate(path)

    def test_pre_smoke_registry_contains_only_existing_qwen_family(self):
        registry = load_model_registry()
        profile_ids = {item["profile_id"] for item in registry["profiles"]}
        self.assertEqual(
            profile_ids,
            {
                "qwen2.5-1.5b-instruct-q4_k_m",
                "qwen2.5-3b-instruct-q4_k_m",
            },
        )
        self.assertNotIn("ministral-3-3b-instruct-2512-q4_k_m", profile_ids)
        self.assertEqual(
            eligible_model_profiles(registry),
            (
                "qwen2.5-1.5b-instruct-q4_k_m",
                "qwen2.5-3b-instruct-q4_k_m",
            ),
        )

    def test_model_credential_environment_detection_is_fail_closed(self):
        clean = {name: "" for name in ("HF_TOKEN", "HUGGING_FACE_HUB_TOKEN", "HUGGINGFACEHUB_API_TOKEN")}
        with patch.dict(os.environ, clean, clear=False):
            self.assertFalse(model_credential_env_present())
        with patch.dict(os.environ, {"HF_TOKEN": "unexpected"}, clear=False):
            self.assertTrue(model_credential_env_present())

    def _valid_receipt(self):
        candidate = EXPECTED_CANDIDATE
        receipt = {
            "schema_version": 1,
            "status": "PASS",
            "workflow_repository_sha": "a" * 40,
            "workflow_run_id": 1,
            "workflow_run_attempt": 1,
            "candidate_sha256": candidate_sha256(candidate),
            "candidate": {
                "profile_id": candidate["profile_id"],
                "repository": candidate["repository"],
                "revision": candidate["revision"],
                "file": candidate["file"],
                "expected_size_bytes": candidate["size_bytes"],
                "expected_sha256": candidate["sha256"],
            },
            "download": {
                "measured_size_bytes": candidate["size_bytes"],
                "measured_sha256": candidate["sha256"],
                "url_uses_frozen_revision": True,
            },
            "license": deepcopy(candidate["license"]),
            "access": {
                "class": "public_unauthenticated_https",
                "proof_mode": "fresh_github_hosted_runner_no_model_credentials",
                "credential_env_present": False,
            },
            "runtime": {**LLAMA_RUNTIME, "runtime_version": "llama.cpp b10516 synthetic"},
            "generation": deepcopy(GENERATION),
            "transport_result": {
                "http_status": 200,
                "finish_reason": "stop",
                "content_nonempty": True,
            },
            "local_model_call_count": 1,
            "hosted_ai_call_count": 0,
            "prompt_sha256": "b" * 64,
            "response_sha256": "c" * 64,
            "receipt_sha256": "0" * 64,
        }
        receipt["receipt_sha256"] = receipt_sha256(receipt)
        return receipt

    def test_receipt_validator_accepts_only_exact_pass_contract(self):
        validate_receipt(self._valid_receipt())

    def test_receipt_rejects_credential_or_call_count_drift(self):
        for mutation in ("credential", "local_calls", "hosted_calls", "model_sha"):
            receipt = self._valid_receipt()
            if mutation == "credential":
                receipt["access"]["credential_env_present"] = True
            elif mutation == "local_calls":
                receipt["local_model_call_count"] = 2
            elif mutation == "hosted_calls":
                receipt["hosted_ai_call_count"] = 1
            else:
                receipt["download"]["measured_sha256"] = "d" * 64
            receipt["receipt_sha256"] = receipt_sha256(receipt)
            with self.subTest(mutation=mutation):
                with self.assertRaises(ModelFamilySmokeError):
                    validate_receipt(receipt)

    def test_workflow_is_gated_and_has_no_model_credentials_or_benchmark_calls(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        lowered = text.lower()
        self.assertIn(".o4b-model-smoke-trigger", text)
        self.assertIn("workflow_dispatch", text)
        self.assertNotIn("pull_request:", text)
        self.assertNotIn("${{ secrets.", text)
        self.assertNotIn("authorization:", lowered)
        self.assertNotIn("api.openai.com", lowered)
        self.assertNotIn("copilot", lowered)
        self.assertNotIn("benchmark_scores", text)
        self.assertNotIn("score_role_output", text)
        self.assertNotIn("aggregate_role_scores", text)
        self.assertIn("O4B_LOCAL_MODEL_CALL_COUNT:1", text)
        self.assertIn("O4B_HOSTED_AI_CALL_COUNT:0", text)
        self.assertIn("post_chat_completion", text)
        self.assertIn("scout_generation", text)
        self.assertIn("O4-B pre-smoke registry boundary violated", text)

    def test_workflow_pins_existing_runtime_and_cpu_only_generation(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")
        self.assertIn("LLAMA_RELEASE: b10516", text)
        self.assertIn("f263a91280471b4c33c4999d7c76259c0f3a0a53a0b3e692b2c0b84380137a35", text)
        self.assertEqual(GENERATION["threads"] if "threads" in GENERATION else 4, 4)
        self.assertEqual(LLAMA_RUNTIME["threads"], 4)
        self.assertEqual(LLAMA_RUNTIME["gpu_layers"], 0)


if __name__ == "__main__":
    unittest.main()
