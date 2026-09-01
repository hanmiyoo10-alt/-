from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve()
TOOL_DIR = HERE.parents[1]

spec = importlib.util.spec_from_file_location("validate_receipt", TOOL_DIR / "validate_receipt.py")
validate_receipt = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(validate_receipt)


def matrix():
    return {
        "schema_version": 1,
        "repository_sha": "a" * 40,
        "skill": "plugin-impact-scope",
        "skill_sha256": "b" * 64,
        "eval_kind": "output",
        "fixture_sha256": "c" * 64,
        "case_id": "service-tier-fidelity",
        "prompt_sha256": "d" * 64,
        "requested_model": "claude-haiku-4.5",
        "expected_trigger": None,
    }


def proof(mode):
    if mode == "with_skill":
        return {
            "proof": "PASS",
            "mode": mode,
            "skill": "plugin-impact-scope",
            "canonical_skill_present": True,
            "quarantined_skill_present": False,
        }
    return {
        "proof": "PASS",
        "mode": mode,
        "skill": "plugin-impact-scope",
        "canonical_skill_present": False,
        "quarantined_skill_present": True,
    }


class ReceiptTests(unittest.TestCase):
    def make(self, root: Path, mode: str, exit_code: int = 0):
        response = root / f"{mode}.jsonl"
        if exit_code == 0:
            response.write_text('{"type":"assistant.message","text":"ok"}\n', encoding="utf-8")
        return validate_receipt.make_receipt(
            matrix(),
            proof(mode),
            response,
            exit_code,
            mode,
            "1.0.82",
            "GitHub Copilot CLI 1.0.82",
            "123",
            "1",
        )

    def test_valid_pair_has_no_qualitative_verdict(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            result = validate_receipt.validate_pair(
                self.make(root, "with_skill"),
                self.make(root, "baseline_without_target_skill"),
            )
            self.assertEqual(result["status"], "PAIR_VALID")
            self.assertIsNone(result["qualitative_verdict"])

    def test_prompt_hash_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = self.make(root, "with_skill")
            b = self.make(root, "baseline_without_target_skill")
            b["prompt_sha256"] = "e" * 64
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt.validate_pair(a, b)

    def test_runtime_identity_mismatch_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = self.make(root, "with_skill")
            b = self.make(root, "baseline_without_target_skill")
            b["copilot_runtime_version"] = "different"
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt.validate_pair(a, b)

    def test_duplicate_mode_pair_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = self.make(root, "with_skill")
            b = dict(a)
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt.validate_pair(a, b)

    def test_incomplete_execution_is_not_promoted_to_pair_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            a = self.make(root, "with_skill")
            b = self.make(root, "baseline_without_target_skill", exit_code=7)
            result = validate_receipt.validate_pair(a, b)
            self.assertEqual(result["status"], "EXECUTION_INCOMPLETE")

    def test_success_without_response_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt.make_receipt(
                    matrix(),
                    proof("with_skill"),
                    root / "missing.jsonl",
                    0,
                    "with_skill",
                    "1.0.82",
                    "GitHub Copilot CLI 1.0.82",
                    "123",
                    "1",
                )

    def test_mutated_presence_proof_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            receipt = self.make(root, "baseline_without_target_skill")
            receipt["skill_presence_proof"]["canonical_skill_present"] = True
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt._validate_receipt_shape(receipt)

    def test_forbidden_automatic_winner_key_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            receipt = self.make(root, "with_skill")
            receipt["winner"] = "with_skill"
            with self.assertRaises(validate_receipt.ReceiptError):
                validate_receipt._validate_receipt_shape(receipt)

    def test_trigger_receipt_defaults_unobservable(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            m = matrix()
            m["eval_kind"] = "trigger"
            m["expected_trigger"] = True
            response = root / "trigger.jsonl"
            response.write_text('{}\n', encoding="utf-8")
            receipt = validate_receipt.make_receipt(
                m,
                proof("with_skill"),
                response,
                0,
                "with_skill",
                "1.0.82",
                "GitHub Copilot CLI 1.0.82",
                "123",
                "1",
            )
            self.assertEqual(receipt["trigger_observability"], "UNOBSERVABLE")


if __name__ == "__main__":
    unittest.main()
