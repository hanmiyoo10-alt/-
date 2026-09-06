from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("canonical_main", ROOT / "adapters" / "canonical_main.py")
canonical_main = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(canonical_main)

RUN = {"id": "123", "attempt": 1, "event": "push", "sha": "a" * 40}


def bundle(*, state="COMPLETE", ready=True, missing=None, failures=None, target_sha=None):
    return {
        "schemaVersion": 1,
        "mode": canonical_main.MODE,
        "state": state,
        "acceptanceReady": ready,
        "targetSha": target_sha or RUN["sha"],
        "pr": {"number": 1723, "headSha": "b" * 40, "mergeSha": RUN["sha"]},
        "evidence": {},
        "missing": [] if missing is None else missing,
        "failures": [] if failures is None else failures,
    }


def adapt(raw, *, outcome="success"):
    return canonical_main.adapt(
        raw,
        workflow="Canonical Main Proof Bundle",
        run=RUN,
        source_path=".artifacts/canonical-main-proof-bundle.json",
        proof_outcome=outcome,
    )


class CanonicalMainAdapterTests(unittest.TestCase):
    def test_complete_acceptance_ready_is_pass(self):
        summary = adapt(bundle())
        self.assertEqual(summary["result"], "PASS")
        self.assertTrue(summary["complete"])
        self.assertEqual(summary["counts"], {"passed": 2, "total": 2, "failed": 0, "warnings": 0})
        self.assertEqual(summary["reasonCodes"], [])

    def test_complete_failure_is_fail(self):
        raw = bundle(ready=False, failures=["OPS_STATE_NOT_CLEAR", "OPS_NOT_STABLE"])
        summary = adapt(raw)
        self.assertEqual(summary["result"], "FAIL")
        self.assertTrue(summary["complete"])
        self.assertEqual(summary["firstFailure"]["code"], "OPS_STATE_NOT_CLEAR")
        self.assertEqual(summary["reasonCodes"], ["OPS_STATE_NOT_CLEAR", "OPS_NOT_STABLE"])
        self.assertIn({"name": "acceptance_ready", "result": "FAIL"}, summary["checks"])

    def test_partial_bundle_is_unknown_and_incomplete(self):
        raw = bundle(
            state="PARTIAL",
            ready=False,
            missing=["MERGED_MAIN_SIMCORE_CI_UNKNOWN"],
        )
        summary = adapt(raw)
        self.assertEqual(summary["result"], "UNKNOWN")
        self.assertFalse(summary["complete"])
        self.assertEqual(summary["firstFailure"]["code"], "MERGED_MAIN_SIMCORE_CI_UNKNOWN")
        self.assertEqual(summary["reasonCodes"], ["MERGED_MAIN_SIMCORE_CI_UNKNOWN"])

    def test_partial_bundle_can_preserve_failure_codes_after_missing(self):
        raw = bundle(
            state="PARTIAL",
            ready=False,
            missing=["OPS_SHA_UNKNOWN"],
            failures=["PR_HEAD_PLUGIN_CI_NOT_SUCCESS"],
        )
        summary = adapt(raw)
        self.assertEqual(summary["result"], "UNKNOWN")
        self.assertEqual(summary["reasonCodes"], ["OPS_SHA_UNKNOWN", "PR_HEAD_PLUGIN_CI_NOT_SUCCESS"])

    def test_cancelled_compose_is_distinct(self):
        summary = adapt(None, outcome="cancelled")
        self.assertEqual(summary["result"], "CANCELLED")
        self.assertFalse(summary["complete"])
        self.assertEqual(summary["reasonCodes"], ["CANONICAL_MAIN_PROOF_COMPOSE_CANCELLED"])

    def test_failed_compose_is_infra_error(self):
        summary = adapt(None, outcome="failure")
        self.assertEqual(summary["result"], "INFRA_ERROR")
        self.assertFalse(summary["complete"])
        self.assertEqual(summary["reasonCodes"], ["CANONICAL_MAIN_PROOF_COMPOSE_FAILED"])

    def test_complete_with_missing_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "COMPLETE with missing"):
            adapt(bundle(missing=["OPS_SHA_UNKNOWN"]))

    def test_acceptance_ready_contradiction_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "acceptanceReady contradicts"):
            adapt(bundle(ready=True, failures=["OPS_STATE_NOT_CLEAR"]))

    def test_target_sha_mismatch_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "does not match workflow SHA"):
            adapt(bundle(target_sha="c" * 40))

    def test_main_falls_back_on_missing_success_report(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "summary.json"
            args = [
                "--report", str(Path(temporary) / "missing.json"),
                "--output", str(output),
                "--proof-outcome", "success",
                "--run-id", "123",
                "--attempt", "1",
                "--event", "push",
                "--sha", RUN["sha"],
            ]
            self.assertEqual(canonical_main.main(args), 0)
            summary = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(summary["result"], "INFRA_ERROR")
            self.assertFalse(summary["complete"])
            self.assertEqual(summary["reasonCodes"], ["CANONICAL_MAIN_PROOF_BUNDLE_MISSING"])


if __name__ == "__main__":
    unittest.main()
