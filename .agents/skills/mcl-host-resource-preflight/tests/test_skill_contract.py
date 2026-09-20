import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"

class MclHostResourcePreflightContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)

    def test_identity_and_route_boundary(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-host-resource-preflight\n"))
        self.assertIn("route=<current D-012 route>", self.skill)
        self.assertIn("target=<S|M>", self.skill)
        self.assertIn("this skill\nnever performs that fallback itself", self.skill)

    def test_capacity_delegates_to_common_owner(self):
        self.assertIn("repo-resource-guard.v1", self.skill)
        self.assertIn("Do not reproduce statvfs", self.skill)
        self.assertIn("No floor means that capacity field is `not_requested`", self.skill)
        self.assertIn("Swap is never RAM", self.skill)

    def test_fixed_s_and_m_composition(self):
        self.assertIn("`/root/nyang-repo`", self.skill)
        self.assertIn("`/data/data/com.termux/files/home/nyang-worktrees/mainphone-work`", self.skill)
        self.assertIn("endpoint `S-Termux` only", self.skill)
        self.assertIn("exact public endpoint `M`", self.skill)

    def test_battery_is_fail_closed_and_bounded(self):
        self.assertIn("Command presence is not evidence", self.skill)
        self.assertIn("`/system/bin/dumpsys battery`", self.skill)
        self.assertIn("status 2=`charging`, 3=`discharging`, 4=`not_charging`, 5=`full`", self.skill)
        self.assertIn("Permission-denied text", self.skill)
        self.assertIn("Never expose raw dumpsys output", self.skill)

    def test_thermal_zero_is_unknown_and_no_permission_fallback(self):
        self.assertIn("/sys/class/thermal/thermal_zone*/temp", self.skill)
        self.assertIn("Zero valid readable samples means `unknown`", self.skill)
        self.assertIn("Do not use `dumpsys thermalservice` as fallback", self.skill)

    def test_receipt_has_no_aggregate_readiness(self):
        required=["schema=mcl-sm-host-resource-preflight.v1","details=withheld","s_disk=<pass|below_floor|unknown|not_requested>","m_thermal_max_c=<bounded-decimal|unknown|not_requested>"]
        for token in required: self.assertIn(token,self.skill)
        self.assertIn("There is deliberately no aggregate", self.skill)

    def test_effect_and_privacy_boundary(self):
        self.assertIn("performs no package install, repair", self.skill)
        self.assertIn("Git fetch/sync", self.skill)
        self.assertIn("notification, daemon, scheduler, state DB", self.skill)
        self.assertIn("Do not emit device/session/account identifiers", self.skill)

    def test_vm_admission_is_preserved(self):
        self.assertIn("M VM LAB `vm_admission` remains a separate semantic owner", self.skill)
        self.assertIn("must not copy VM thresholds", self.skill)

    def test_no_mutable_sha_or_hidden_threshold_constants(self):
        combined=self.skill+self.evals_text
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b",combined))
        self.assertNotIn("battery minimum", self.skill.lower())

    def test_eval_identity_and_unique_cases(self):
        self.assertEqual(self.evals["skill_name"],"mcl-host-resource-preflight")
        ids=[x["id"] for x in self.evals["cases"]]
        self.assertEqual(len(ids),len(set(ids)))
        self.assertGreaterEqual(len(ids),7)

    def test_eval_swap_does_not_upgrade_memory(self):
        case=next(x for x in self.evals["cases"] if x["id"]=="m-memory-unknown-swap-cannot-upgrade")
        self.assertEqual(case["expected"]["m_memory"],"unknown")
        self.assertFalse(case["expected"]["swap_substitutes_for_ram"])

    def test_eval_presence_does_not_prove_battery(self):
        case=next(x for x in self.evals["cases"] if x["id"]=="battery-command-presence-not-proof")
        self.assertFalse(case["expected"]["presence_treated_as_success"])

    def test_eval_zero_thermal_stays_unknown(self):
        case=next(x for x in self.evals["cases"] if x["id"]=="thermal-zero-readable-is-unknown")
        self.assertEqual(case["expected"]["s_thermal_max_c"],"unknown")
        self.assertFalse(case["expected"]["pass_by_absence"])

if __name__ == "__main__":
    unittest.main()
