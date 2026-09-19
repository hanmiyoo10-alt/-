import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[4]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"
DECISIONS = REPO / "products/chatgpt-mobile-coder-lab/docs/decisions.md"


class MclDispatcherSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)
        cls.decisions = DECISIONS.read_text(encoding="utf-8")

    def case(self, case_id):
        return next(item for item in self.evals["cases"] if item["id"] == case_id)

    def test_frontmatter_and_plan_only_identity(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-dispatcher\n"))
        self.assertIn("planning only", self.skill)
        self.assertIn("does not own routing policy", self.skill)

    def test_current_d012_is_read_before_route_choice(self):
        authority = self.skill.index("read current `docs/device-routing.md`")
        routing = self.skill.index("## Routing discipline")
        self.assertLess(authority, routing)
        self.assertIn("Current D-012 always wins", self.skill)

    def test_skill_does_not_clone_full_routing_matrix(self):
        self.assertNotIn("## Route precedence", self.skill)
        self.assertNotIn("## Routing matrix", self.skill)
        self.assertIn("Do not copy or freeze a second complete D-012", self.skill)

    def test_semantics_precede_status(self):
        self.assertIn("Semantic requirement is classified\n**before** current status", self.skill)
        case = self.case("ordinary-repo-s-offline-no-auto-switch")
        self.assertFalse(case["expected"]["status_changed_route"])
        self.assertFalse(case["expected"]["auto_switched_to_m"])

    def test_s_fallback_is_candidate_not_automatic(self):
        self.assertIn("reported as `M_candidate`", self.skill)
        self.assertIn("never switches executor merely because S is unavailable", self.skill)
        self.assertEqual(self.case("ordinary-repo-mutable")["expected"]["fallback"], "M_candidate")

    def test_multi_context_work_splits_phases(self):
        self.assertIn("split it into ordered phase receipts", self.skill)
        case = self.case("s-termux-split-phase")
        self.assertEqual(case["expected"]["phase_count"], 2)
        self.assertEqual(case["expected"]["phase_routes"], ["S", "S_TERMUX"])
        self.assertFalse(case["expected"]["collapsed_contexts"])

    def test_preflight_coverage_is_not_invented(self):
        self.assertIn("Do not assume every current D-012 route is supported by `mcl-preflight`", self.skill)
        self.assertIn("#2487", self.skill)
        for case_id in ["gui-read-direct-owner", "gui-action-direct-owner"]:
            case = self.case(case_id)
            self.assertEqual(case["expected"]["preflight_owner"], "route_owner")
            self.assertFalse(case["expected"]["forced_through_mcl_preflight"])

    def test_repository_mutation_keeps_separate_guards(self):
        ordered = [
            "current packet/PR overlap",
            "D-013 lease",
            "Git/worktree/currentness",
            "separately authorized mutation",
            "validation/CI/main-write",
            "D-013 release",
        ]
        positions = [self.skill.index(token) for token in ordered]
        self.assertEqual(positions, sorted(positions))
        case = self.case("ordinary-repo-mutable")
        self.assertEqual(case["expected"]["overlap_guard"], "required")
        self.assertEqual(case["expected"]["lease_guard"], "required")
        self.assertFalse(case["expected"]["effect_performed"])

    def test_read_only_does_not_manufacture_lease(self):
        case = self.case("repo-read-only-no-lease")
        self.assertEqual(case["expected"]["repository_effect"], "read_only")
        self.assertEqual(case["expected"]["overlap_guard"], "not_required")
        self.assertEqual(case["expected"]["lease_guard"], "not_required")

    def test_nonrepository_lease_remains_owner_defined(self):
        for case_id in ["private-lab-plan", "vm-lab-plan"]:
            self.assertEqual(self.case(case_id)["expected"]["lease_guard"], "owner_defined")
        self.assertIn("lease and handoff requirements\nremain `owner_defined` or `unknown`", self.skill)

    def test_receipt_contract_is_bounded_plan_only(self):
        for token in [
            "schema=mcl-dispatch-plan.v1",
            "preflight_owner=<mcl-preflight|route_owner|not_applicable|unknown>",
            "repository_effect=<none|read_only|mutable|unknown>",
            "lease_guard=<required|owner_defined|not_required|unknown>",
            "next_gate=<preflight|route_owner|scope_overlap|lease_plan|git_currentness|owner_effect|separate_authority|blocked|unknown>",
            "details=withheld",
        ]:
            self.assertIn(token, self.skill)
        self.assertIn("The receipt is a plan", self.skill)

    def test_no_aggregate_readiness_or_completion_fields(self):
        self.assertIn("Never add aggregate fields", self.skill)
        for forbidden in [
            "`health`", "`ready`", "`safe_to_mutate`", "`authorized`",
            "`priority`", "`owner_account`", "`completion`",
        ]:
            self.assertIn(forbidden, self.skill)

    def test_effectful_dispatch_is_forbidden(self):
        required = [
            "acquire or release D-013",
            "edit source, commit, push, open/merge/close a PR",
            "create a daemon, background worker, scheduler, queue, or central task DB",
            "An effectful or autonomous dispatcher requires separate reviewed authority",
        ]
        for token in required:
            self.assertIn(token, self.skill)

    def test_private_and_gui_payloads_stay_private(self):
        self.assertIn("raw GUI hierarchy/node contents", self.skill)
        self.assertIn("never constructs, requests, transports, or recovers a\nsensitive command or payload", self.skill)
        private_case = self.case("s-private-local-plan")
        self.assertFalse(private_case["expected"]["private_payload_requested"])
        self.assertFalse(private_case["expected"]["sensitive_command_constructed"])

    def test_ambiguity_and_unsupported_fail_closed(self):
        ambiguous = self.case("ambiguous-requirement")
        unsupported = self.case("unsupported-requirement")
        self.assertEqual(ambiguous["expected"]["route"], "UNKNOWN")
        self.assertFalse(ambiguous["expected"]["route_guessed"])
        self.assertEqual(unsupported["expected"]["route"], "UNSUPPORTED_OR_SEPARATE_AUTHORITY")
        self.assertEqual(unsupported["expected"]["next_gate"], "separate_authority")

    def test_eval_corpus_is_unique_and_covers_required_families(self):
        self.assertEqual(self.evals["skill_name"], "mcl-dispatcher")
        self.assertEqual(self.evals["schema_version"], 1)
        ids = [case["id"] for case in self.evals["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        required = {
            "ordinary-repo-mutable", "ordinary-repo-s-offline-no-auto-switch",
            "repo-read-only-no-lease", "s-termux-split-phase", "private-lab-plan",
            "vm-lab-plan", "s-private-local-plan", "gui-read-direct-owner",
            "gui-action-direct-owner", "ambiguous-requirement",
            "unsupported-requirement", "blocked-context-no-reroute",
        }
        self.assertTrue(required.issubset(set(ids)))

    def test_all_eval_paths_are_plan_only(self):
        for case in self.evals["cases"]:
            self.assertFalse(case["expected"].get("effect_performed", False), case["id"])

    def test_decisions_has_d018_plan_only_pointer(self):
        self.assertIn("## D-018", self.decisions)
        self.assertIn("mcl-dispatcher", self.decisions)
        self.assertIn("plan-only", self.decisions)
        self.assertIn("separate reviewed authority", self.decisions)

    def test_no_mutable_sha_is_frozen(self):
        combined = self.skill + self.evals_text
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", combined))


if __name__ == "__main__":
    unittest.main()
