import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"


class MclPreflightSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)

    def test_frontmatter_and_identity(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-preflight\n"))
        self.assertIn("after D-012 has already", self.skill)
        self.assertIn("This skill consumes a route decision. It never creates one.", self.skill)

    def test_route_and_executor_are_required_inputs(self):
        self.assertIn("route=<D-012 route>", self.skill)
        self.assertIn("executor=<exact selected execution surface>", self.skill)
        self.assertIn("Missing, ambiguous, or conflicting route/executor evidence is `UNKNOWN`", self.skill)

    def test_s_owner_and_explicit_m_fallback_are_separate(self):
        self.assertIn("s-family-status/s-env-status status", self.skill)
        self.assertIn("schema=mcl-s-env-status.v1", self.skill)
        self.assertIn("`S` with executor `M`", self.skill)
        self.assertIn("already-documented ordinary-repository", self.skill)
        self.assertIn("fallback `M`", self.skill)

    def test_context_specific_owners_are_named(self):
        required = [
            "mcl-rdcctl status --profile s-termux",
            "mcl-env-status status",
            "device-ops/private-lab/**",
            "existing VM owner/admission path",
            "fixed sanitized private-runner receipt",
        ]
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.skill)
    def test_mutable_sequence_preserves_later_guards(self):
        ordered = [
            "D-012 semantic route and exact executor",
            "current packet/PR write-scope overlap proof",
            "D-013 lease acquire and read-back validation",
            "Git/worktree/currentness guards",
            "separately authorized repository mutation",
        ]
        positions = [self.skill.index(token) for token in ordered]
        self.assertEqual(positions, sorted(positions))

    def test_preflight_has_no_aggregate_readiness(self):
        self.assertIn("Do not emit a new aggregate `PASS`, `READY`, `healthy`, `safe_to_mutate`", self.skill)
        self.assertIn("`sm-status` remains the whole-cluster read-only", self.skill)

    def test_no_dispatcher_or_writer_authority(self):
        self.assertIn("not a router, dispatcher, scheduler, queue, central task database", self.skill)
        self.assertIn("does not run Git fetch/pull/sync/reset/checkout/stash/clean", self.skill)
        self.assertIn("acquire/release a lease", self.skill)
        self.assertIn("open or merge a PR", self.skill)

    def test_unknown_and_privacy_are_fail_closed(self):
        self.assertIn("Malformed or unrecognized child receipts remain `UNKNOWN`", self.skill)
        self.assertIn("Do not expose device IDs, RDC/session IDs", self.skill)
        self.assertIn("construct, transmit, recover, or inspect a sensitive command", self.skill)

    def test_no_mutable_sha_is_frozen(self):
        combined = self.skill + self.evals_text
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", combined))

    def test_eval_corpus_identity_and_unique_cases(self):
        self.assertEqual(self.evals["skill_name"], "mcl-preflight")
        self.assertEqual(self.evals["schema_version"], 1)
        ids = [case["id"] for case in self.evals["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(ids), 8)
    def test_eval_route_conflict_stays_unknown(self):
        case = next(item for item in self.evals["cases"] if item["id"] == "route-executor-conflict")
        self.assertEqual(case["expected"]["preflight_state"], "UNKNOWN")
        self.assertFalse(case["expected"]["owner_invoked"])
        self.assertFalse(case["expected"]["route_guessed"])

    def test_eval_context_blocks_do_not_reroute_or_repair(self):
        case = next(item for item in self.evals["cases"] if item["id"] == "private-lab-blocked-no-reroute")
        self.assertTrue(case["expected"]["blocked_preserved"])
        self.assertFalse(case["expected"]["silent_reroute_performed"])
        self.assertFalse(case["expected"]["repair_performed"])

    def test_eval_private_route_never_constructs_sensitive_command(self):
        case = next(item for item in self.evals["cases"] if item["id"] == "s-private-missing-receipt")
        self.assertFalse(case["expected"]["sensitive_command_constructed"])
        self.assertFalse(case["expected"]["private_payload_requested"])

    def test_eval_mutable_work_keeps_three_later_guards(self):
        case = next(item for item in self.evals["cases"] if item["id"] == "mutable-work-keeps-separate-guards")
        expected = case["expected"]
        self.assertTrue(expected["overlap_guard_required"])
        self.assertTrue(expected["lease_guard_required"])
        self.assertTrue(expected["git_currentness_guard_required"])
        self.assertFalse(expected["preflight_grants_mutation"])


if __name__ == "__main__":
    unittest.main()
