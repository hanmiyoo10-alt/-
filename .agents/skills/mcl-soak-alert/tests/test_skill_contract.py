import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"

RECEIPT_KEYS = [
    "schema",
    "notify",
    "degraded_fields",
    "recovered_fields",
    "evidence_loss_fields",
    "details",
]

ALERT_FIELDS = [
    "rdc_s",
    "rdc_s_termux",
    "rdc_m",
    "roundtrip_s",
    "roundtrip_s_termux",
    "roundtrip_m",
    "s_termux_profile",
    "m_rdc_supervision",
]


class MclSoakAlertSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)

    def _receipt_block(self):
        marker = "```text\nschema=mcl-sm-soak-alert.v1"
        start = self.skill.index(marker) + len("```text\n")
        end = self.skill.index("```", start)
        return self.skill[start:end].strip()

    def _alert_field_block(self):
        marker = "Alert-bearing fields are fixed in this order:"
        start = self.skill.index("```text", self.skill.index(marker)) + len("```text")
        end = self.skill.index("```", start)
        return [line.strip() for line in self.skill[start:end].splitlines() if line.strip()]

    def test_frontmatter_and_owner_composition(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-soak-alert\n"))
        self.assertIn("Natural-soak interpretation and B1 closure remain owned by\n#2143", self.skill)
        self.assertIn("Snapshot and prior-vs-current comparison remain owned by\n`mcl-soak-watch`", self.skill)

    def test_receipt_schema_and_exact_key_order(self):
        lines = self._receipt_block().splitlines()
        keys = [line.split("=", 1)[0] for line in lines]
        self.assertEqual(keys, RECEIPT_KEYS)
        self.assertEqual(lines[0], "schema=mcl-sm-soak-alert.v1")
        self.assertEqual(lines[-1], "details=withheld")

    def test_alert_field_order_is_fixed(self):
        self.assertEqual(self._alert_field_block(), ALERT_FIELDS)

    def test_value_classes_are_exact_and_unknown_preserved(self):
        self.assertIn("`online=good`, `offline=degraded`", self.skill)
        self.assertIn("`pass=good`,\n  `fail=degraded`, `unknown=unknown`", self.skill)
        self.assertIn("`missing|operator_down|service_missing=degraded`", self.skill)
        self.assertIn("Missing, malformed, ambiguous, or unavailable evidence stays `unknown`", self.skill)

    def test_repository_dirty_fields_are_non_alerting(self):
        self.assertIn("Do not classify `s_repo_dirty` or `m_repo_dirty` as alert-bearing", self.skill)
        self.assertIn("changes alone must produce `notify=no`", self.skill)

    def test_transition_semantics_cover_degrade_recovery_and_evidence_loss(self):
        required = [
            "current `degraded` + prior not `degraded` -> `degraded_fields`",
            "prior `degraded` + current `good` -> `recovered_fields`",
            "prior known/non-`unknown` + current `unknown` ->\n  `evidence_loss_fields`",
            "prior `unknown` + current `good` -> no recovery claim",
            "unchanged degraded -> no new transition",
        ]
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.skill)
        self.assertIn("A degraded-to-unknown transition is evidence loss, not recovery", self.skill)

    def test_no_prior_semantics_are_current_degradation_only(self):
        self.assertIn("With no prior receipt:", self.skill)
        self.assertIn("current explicit degraded alert-bearing field", self.skill)
        self.assertIn("good or unknown-only initial observations produce `notify=no`", self.skill)

    def test_malformed_current_and_prior_fail_closed(self):
        self.assertIn("Malformed current receipt:", self.skill)
        self.assertIn("`notify=unknown`", self.skill)
        self.assertIn("Malformed supplied prior with a valid current receipt:", self.skill)
        self.assertIn("`recovered_fields=unknown`", self.skill)
        self.assertIn("`evidence_loss_fields=unknown`", self.skill)

    def test_multiple_categories_are_not_collapsed(self):
        self.assertIn("Multiple categories may coexist in one receipt", self.skill)
        self.assertIn("Preserve them separately", self.skill)

    def test_no_aggregate_causality_or_repair_authority(self):
        receipt = self._receipt_block()
        for forbidden in ("health=", "ready=", "result=", "root_cause=", "severity=", "repair="):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, receipt)
        self.assertIn("never explains why a field changed", self.skill)
        self.assertIn("Do not restart, repair, fail over, dispatch", self.skill)

    def test_classifier_has_no_scheduler_network_or_storage_capability(self):
        required = [
            "Do not invoke Remote Desktop Commander, devices, GitHub, Gmail, network APIs",
            "Do not create or mutate a state file, database, issue, workflow, timer",
            "This skill does not schedule itself.",
            "do not create hidden state in Git",
        ]
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.skill)

    def test_privacy_boundary_is_bounded(self):
        self.assertIn("Never emit device/session/account identifiers", self.skill)
        self.assertIn("raw RDC responses", self.skill)
        self.assertIn("private logs", self.skill)
        self.assertIn("email addresses", self.skill)
        self.assertIn("Only reviewed field names", self.skill)

    def test_external_condition_watch_is_explicitly_separate(self):
        self.assertIn("A separately authorized ChatGPT condition-watch may invoke", self.skill)
        self.assertIn("platform automation owns cadence", self.skill)
        self.assertIn("No natural outage, supervisor loss, or roundtrip failure may be manufactured", self.skill)

    def test_no_mutable_sha_frozen_in_skill_or_evals(self):
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", self.skill + self.evals_text))

    def test_eval_identity_and_required_cases(self):
        self.assertEqual(self.evals["skill_name"], "mcl-soak-alert")
        self.assertEqual(self.evals["schema_version"], 1)
        ids = [case["id"] for case in self.evals["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), {
            "no-prior-all-good",
            "no-prior-explicit-degraded",
            "good-to-degraded",
            "degraded-to-good",
            "known-to-unknown-evidence-loss",
            "unknown-to-good-is-not-recovery",
            "unchanged-degraded-no-repeat",
            "repo-dirty-only-change",
            "mixed-transition-categories",
            "malformed-current-fails-closed",
            "malformed-prior-with-current-degradation",
            "malformed-prior-without-current-degradation",
            "privacy-scheduler-causality-boundary",
        })

    def test_eval_semantics_lock_transition_behavior(self):
        by_id = {case["id"]: case for case in self.evals["cases"]}
        self.assertEqual(by_id["no-prior-explicit-degraded"]["expected"]["degraded_fields"],
                         "rdc_m,roundtrip_s_termux")
        self.assertEqual(by_id["degraded-to-good"]["expected"]["recovered_fields"],
                         "rdc_m,roundtrip_s")
        self.assertEqual(by_id["known-to-unknown-evidence-loss"]["expected"]["evidence_loss_fields"],
                         "rdc_s_termux,m_rdc_supervision")
        self.assertEqual(by_id["unchanged-degraded-no-repeat"]["expected"]["notify"], "no")
        self.assertEqual(by_id["repo-dirty-only-change"]["expected"]["notify"], "no")
        mixed = by_id["mixed-transition-categories"]["expected"]
        self.assertEqual(mixed["degraded_fields"], "rdc_m")
        self.assertEqual(mixed["recovered_fields"], "roundtrip_s")
        self.assertEqual(mixed["evidence_loss_fields"], "m_rdc_supervision")

    def test_eval_semantics_lock_malformed_behavior(self):
        by_id = {case["id"]: case for case in self.evals["cases"]}
        current = by_id["malformed-current-fails-closed"]["expected"]
        self.assertEqual(set(current.values()), {"unknown"})
        prior_bad = by_id["malformed-prior-with-current-degradation"]["expected"]
        self.assertEqual(prior_bad["notify"], "yes")
        self.assertEqual(prior_bad["degraded_fields"], "roundtrip_m")
        self.assertEqual(prior_bad["recovered_fields"], "unknown")
        self.assertEqual(prior_bad["evidence_loss_fields"], "unknown")


if __name__ == "__main__":
    unittest.main()
