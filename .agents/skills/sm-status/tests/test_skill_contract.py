import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"


EXPECTED_RECEIPT_KEYS = [
    "schema",
    "rdc_s",
    "rdc_s_termux",
    "rdc_m",
    "s_termux_profile",
    "m_rdc_supervision",
    "s_repo_branch",
    "s_repo_dirty",
    "s_origin_main_tracking",
    "m_repo_branch",
    "m_repo_dirty",
    "m_origin_main_tracking",
    "m_private_lab_substrate",
    "m_private_lab_analysis",
    "m_vm_lab",
    "m_vm_admission",
    "details",
]


class SmStatusSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals = json.loads(EVALS.read_text(encoding="utf-8"))

    def _receipt_block(self):
        marker = "schema=mcl-sm-status.v1"
        start = self.skill.index(marker)
        end = self.skill.index("```", start)
        return self.skill[start:end].strip()

    def test_frontmatter_and_trigger_identity(self):
        self.assertTrue(self.skill.startswith("---\nname: sm-status\n"))
        self.assertIn("Use when the user asks for sm-status", self.skill)
        self.assertIn("S, S-Termux, and M", self.skill)

    def test_receipt_schema_and_exact_key_order(self):
        lines = self._receipt_block().splitlines()
        keys = [line.split("=", 1)[0] for line in lines]
        self.assertEqual(keys, EXPECTED_RECEIPT_KEYS)
        self.assertEqual(lines[0], "schema=mcl-sm-status.v1")
        self.assertEqual(lines[-1], "details=withheld")

    def test_receipt_has_no_aggregate_result_or_watchdog_field(self):
        block = self._receipt_block()
        self.assertNotRegex(block, r"(?m)^result=")
        self.assertNotRegex(block, r"(?m)^watchdog=")
        self.assertIn("There is deliberately no aggregate `result` field", self.skill)
        self.assertIn("v1 intentionally has no watchdog field", self.skill)

    def test_read_only_git_contract(self):
        self.assertIn("Do not run `git fetch`", self.skill)
        self.assertIn("Never fetch first", self.skill)
        self.assertIn("without fetch or branch movement", self.skill)
        self.assertIn("does not authorize sync", self.skill)

    def test_existing_owner_delegation_is_explicit(self):
        required = [
            "mcl-rdcctl status --profile s-termux",
            "schema=mcl-rdcctl.v1",
            "mcl-env-status status",
            "schema=mcl-m-family-status.v1",
            "m-rdc-supervisor-guard --check",
            "schema=mcl-m-rdc-supervisor.v1",
        ]
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.skill)

    def test_absolute_repo_targets_are_explicit(self):
        self.assertIn("/root/nyang-repo", self.skill)
        self.assertIn(
            "/data/data/com.termux/files/home/nyang-worktrees/mainphone-work",
            self.skill,
        )
        self.assertIn("not the ordinary\n`nyang-repo` checkout", self.skill)

    def test_unknown_and_privacy_boundaries_are_explicit(self):
        self.assertIn("become `unknown` in the affected field only", self.skill)
        self.assertIn("Do not expose device IDs, session IDs, auth-token state", self.skill)
        self.assertIn("Ignore all other returned metadata", self.skill)
        self.assertIn("Malformed output, extra free-form child output", self.skill)

    def test_no_mutable_sha_is_frozen_in_skill_or_evals(self):
        combined = self.skill + EVALS.read_text(encoding="utf-8")
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", combined))

    def test_eval_corpus_identity_and_required_cases(self):
        self.assertEqual(self.evals["skill_name"], "sm-status")
        self.assertEqual(self.evals["schema_version"], 1)
        cases = self.evals["cases"]
        ids = [case["id"] for case in cases]
        self.assertEqual(len(ids), len(set(ids)))
        required_ids = {
            "healthy-bounded-projection",
            "device-offline-preserves-unknown",
            "stale-tracking-is-not-broken",
            "dirty-worktree-stays-observation",
            "malformed-m-family-receipt",
            "vm-not-ready-preserved",
            "missing-github-main",
            "privacy-metadata-is-not-receipt-data",
            "watchdog-has-no-v1-field",
            "unexpected-branch-is-reported-verbatim",
        }
        self.assertEqual(set(ids), required_ids)

    def test_evals_preserve_no_mutation_and_no_aggregate_claim(self):
        by_id = {case["id"]: case for case in self.evals["cases"]}
        self.assertFalse(
            by_id["healthy-bounded-projection"]["expected"]["aggregate_result_present"]
        )
        self.assertFalse(
            by_id["stale-tracking-is-not-broken"]["expected"]["git_fetch_performed"]
        )
        self.assertFalse(
            by_id["dirty-worktree-stays-observation"]["expected"]["sync_performed"]
        )
        self.assertFalse(
            by_id["watchdog-has-no-v1-field"]["expected"]["watchdog_field_present"]
        )

    def test_malformed_owner_eval_fails_closed(self):
        case = next(
            item for item in self.evals["cases"]
            if item["id"] == "malformed-m-family-receipt"
        )
        projected = {
            key: value for key, value in case["expected"].items()
            if key.startswith("m_")
        }
        self.assertTrue(projected)
        self.assertEqual(set(projected.values()), {"unknown"})


if __name__ == "__main__":
    unittest.main()
