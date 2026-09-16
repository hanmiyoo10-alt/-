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
    "roundtrip_s",
    "roundtrip_s_termux",
    "roundtrip_m",
    "s_termux_profile",
    "m_rdc_supervision",
    "s_repo_dirty",
    "m_repo_dirty",
    "change",
    "changed_fields",
    "details",
]

COMPARABLE_KEYS = [
    "rdc_s",
    "rdc_s_termux",
    "rdc_m",
    "roundtrip_s",
    "roundtrip_s_termux",
    "roundtrip_m",
    "s_termux_profile",
    "m_rdc_supervision",
    "s_repo_dirty",
    "m_repo_dirty",
]


class MclSoakWatchSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)

    def _receipt_block(self):
        marker = "```text\nschema=mcl-sm-soak-watch.v1"
        start = self.skill.index(marker) + len("```text\n")
        end = self.skill.index("```", start)
        return self.skill[start:end].strip()

    def test_frontmatter_and_owner_identity(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-soak-watch\n"))
        self.assertIn("Delegate current state to sm-status", self.skill)
        self.assertIn("Natural-soak interpretation and durable evidence remain\nowned by #2143", self.skill)

    def test_receipt_schema_and_exact_key_order(self):
        lines = self._receipt_block().splitlines()
        keys = [line.split("=", 1)[0] for line in lines]
        self.assertEqual(keys, EXPECTED_RECEIPT_KEYS)
        self.assertEqual(lines[0], "schema=mcl-sm-soak-watch.v1")
        self.assertEqual(lines[-1], "details=withheld")
    def test_no_aggregate_health_or_unowned_runtime_fields(self):
        block = self._receipt_block()
        for forbidden in ("health=", "ready=", "result=", "safe_to_work=", "watchdog=", "channel_health="):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, block)
        self.assertIn("There is deliberately no aggregate health or readiness field", self.skill)
        self.assertIn("Do not parse raw channel logs, process tables, watchdog state", self.skill)

    def test_sm_status_delegation_and_fail_closed_projection(self):
        self.assertIn("Run the existing `sm-status` skill", self.skill)
        self.assertIn("schema=mcl-sm-status.v1", self.skill)
        self.assertIn("use `unknown` for every projected child field", self.skill)
        self.assertIn("rather\nthan rebuilding them from lower-level observations", self.skill)

    def test_roundtrip_scope_and_presence_are_separate(self):
        self.assertIn("exact public endpoint `S`, `S-Termux`, and `M`", self.skill)
        self.assertIn("at most once per snapshot", self.skill)
        self.assertIn("Accept only exact marker return as `pass`", self.skill)
        self.assertIn("Presence and roundtrip are separate observations", self.skill)
        self.assertIn("keep the roundtrip field `unknown`", self.skill)

    def test_prior_receipt_is_explicit_stateless_and_validated(self):
        self.assertIn("must be supplied explicitly by the caller", self.skill)
        self.assertIn("Never\nsearch Git, device state, issue history, chat history, or local files", self.skill)
        self.assertIn("This skill stores nothing", self.skill)
        self.assertIn("change=unknown", self.skill)
        self.assertIn("changed_fields=unknown", self.skill)

    def test_comparable_key_order_is_fixed(self):
        marker = "Comparable keys are, in order:"
        start = self.skill.index(marker)
        section = self.skill[start:self.skill.index("```", self.skill.index("```", start) + 3)]
        flattened = section.replace("\n", "")
        positions = [flattened.index(key) for key in COMPARABLE_KEYS]
        self.assertEqual(positions, sorted(positions))
    def test_no_mutation_scheduler_or_storage_authority(self):
        required = [
            "Do not fetch or mutate Git",
            "Do not create or update a scheduler, daemon, background watcher",
            "GitHub issue, state file, or database",
            "A platform condition-watch or scheduled\ninvocation, if separately requested and authorized, is outside repository\nsource authority",
        ]
        for token in required:
            with self.subTest(token=token):
                self.assertIn(token, self.skill)

    def test_privacy_and_no_causality_boundaries(self):
        self.assertIn("Do not expose device IDs, session IDs, auth state", self.skill)
        self.assertIn("does not identify Wi-Fi, Android, Tailscale, provider", self.skill)
        self.assertIn("Comparison never explains why a field changed", self.skill)
        self.assertIn("Do not include the marker, command, endpoint metadata", self.skill)

    def test_no_mutable_sha_frozen_in_skill_or_evals(self):
        combined = self.skill + self.evals_text
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", combined))

    def test_eval_corpus_identity_and_required_cases(self):
        self.assertEqual(self.evals["skill_name"], "mcl-soak-watch")
        self.assertEqual(self.evals["schema_version"], 1)
        ids = [case["id"] for case in self.evals["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), {
            "no-prior-snapshot",
            "same-valid-prior",
            "changed-fields-ordered",
            "invalid-prior-fails-closed",
            "offline-without-attempt-keeps-roundtrip-unknown",
            "explicit-roundtrip-failure-has-no-cause",
            "malformed-sm-status-preserves-unknown",
            "privacy-and-watchdog-boundary",
            "unknown-value-can-still-be-a-change",
        })
    def test_eval_semantics_cover_fail_closed_and_ordering(self):
        by_id = {case["id"]: case for case in self.evals["cases"]}
        self.assertEqual(by_id["no-prior-snapshot"]["expected"]["change"], "no_prior")
        self.assertEqual(by_id["same-valid-prior"]["expected"]["change"], "same")
        self.assertEqual(
            by_id["changed-fields-ordered"]["expected"]["changed_fields"],
            "rdc_m,roundtrip_m,m_repo_dirty",
        )
        self.assertEqual(by_id["invalid-prior-fails-closed"]["expected"]["change"], "unknown")
        self.assertEqual(
            by_id["offline-without-attempt-keeps-roundtrip-unknown"]["expected"]["roundtrip_s_termux"],
            "unknown",
        )
        self.assertFalse(
            by_id["explicit-roundtrip-failure-has-no-cause"]["expected"]["root_cause_present"]
        )

    def test_malformed_child_does_not_erase_independent_roundtrip(self):
        case = next(item for item in self.evals["cases"] if item["id"] == "malformed-sm-status-preserves-unknown")
        self.assertEqual(case["expected"]["roundtrip_s"], "pass")
        delegated = ["rdc_s", "s_termux_profile", "m_rdc_supervision", "s_repo_dirty", "m_repo_dirty"]
        self.assertEqual({case["expected"][key] for key in delegated}, {"unknown"})


if __name__ == "__main__":
    unittest.main()
