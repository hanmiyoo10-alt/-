from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("phase_receipt", ROOT / "phase_receipt.py")
phase_receipt = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(phase_receipt)


class PhaseReceiptTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.path = Path(self.temp.name) / "receipt.json"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def read(self):
        return json.loads(self.path.read_text(encoding="utf-8"))

    def test_initialize_is_bounded_and_deterministic(self):
        phase_receipt.initialize(self.path, ["alpha", "beta"])
        raw = self.read()
        self.assertEqual(raw["schemaVersion"], 1)
        self.assertEqual(raw["receiptKind"], "CI_PHASE_RECEIPT_V1")
        self.assertEqual(raw["phases"], [
            {"name": "alpha", "result": "NOT_RUN"},
            {"name": "beta", "result": "NOT_RUN"},
        ])
        self.assertEqual(raw["metadata"], {})

    def test_start_pass_sequence(self):
        phase_receipt.initialize(self.path, ["alpha", "beta"])
        phase_receipt.transition(self.path, "alpha", "RUNNING")
        phase_receipt.transition(self.path, "alpha", "PASS")
        phase_receipt.transition(self.path, "beta", "RUNNING")
        phase_receipt.transition(self.path, "beta", "PASS")
        self.assertEqual([item["result"] for item in self.read()["phases"]], ["PASS", "PASS"])

    def test_cannot_start_later_phase_early(self):
        phase_receipt.initialize(self.path, ["alpha", "beta"])
        with self.assertRaisesRegex(phase_receipt.ReceiptError, "previous phases"):
            phase_receipt.transition(self.path, "beta", "RUNNING")

    def test_cannot_pass_phase_that_never_started(self):
        phase_receipt.initialize(self.path, ["alpha"])
        with self.assertRaisesRegex(phase_receipt.ReceiptError, "cannot pass"):
            phase_receipt.transition(self.path, "alpha", "PASS")

    def test_duplicate_phase_rejected(self):
        with self.assertRaisesRegex(phase_receipt.ReceiptError, "duplicate"):
            phase_receipt.initialize(self.path, ["alpha", "alpha"])

    def test_integer_metadata(self):
        phase_receipt.initialize(self.path, ["alpha"])
        phase_receipt.set_integer(self.path, "test_total", 123)
        self.assertEqual(self.read()["metadata"], {"test_total": 123})

    def test_negative_metadata_rejected(self):
        phase_receipt.initialize(self.path, ["alpha"])
        with self.assertRaisesRegex(phase_receipt.ReceiptError, "non-negative"):
            phase_receipt.set_integer(self.path, "test_total", -1)


if __name__ == "__main__":
    unittest.main()
