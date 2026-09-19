import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[4]
SKILL = ROOT / "SKILL.md"
EVALS = ROOT / "evals" / "evals.json"
DISPATCHER_SKILL = REPO / ".agents/skills/mcl-dispatcher/SKILL.md"
PREFLIGHT_SKILL = REPO / ".agents/skills/mcl-preflight/SKILL.md"
LEASE_DOC = REPO / "products/chatgpt-mobile-coder-lab/docs/task-lease.md"
HANDOFF_DOC = REPO / "products/chatgpt-mobile-coder-lab/docs/task-handoff.md"


class MclExecutionHandoffSkillContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.skill = SKILL.read_text(encoding="utf-8")
        cls.evals_text = EVALS.read_text(encoding="utf-8")
        cls.evals = json.loads(cls.evals_text)
        cls.dispatcher = DISPATCHER_SKILL.read_text(encoding="utf-8")
        cls.preflight = PREFLIGHT_SKILL.read_text(encoding="utf-8")
        cls.lease_doc = LEASE_DOC.read_text(encoding="utf-8")
        cls.handoff_doc = HANDOFF_DOC.read_text(encoding="utf-8")

    def case(self, case_id):
        return next(item for item in self.evals["cases"] if item["id"] == case_id)

    def test_frontmatter_and_coordination_only_identity(self):
        self.assertTrue(self.skill.startswith("---\nname: mcl-execution-handoff\n"))
        self.assertIn("Coordination-only admission skill", self.skill)
        self.assertIn("A `HANDOFF_READY` result is **not** execution permission", self.skill)
        self.assertIn("Actual effect execution remains with the already-authorized existing owner", self.skill)

    def test_v1_support_is_narrow(self):
        for token in ["route=S", "executor=S | M", "repository_effect=mutable"]:
            self.assertIn(token, self.skill)
        self.assertEqual(self.case("repo-s-handoff-ready")["expected"]["status"], "HANDOFF_READY")
        self.assertEqual(self.case("repo-m-fallback-handoff-ready")["expected"]["status"], "HANDOFF_READY")
        self.assertEqual(self.case("read-only-not-applicable")["expected"]["status"], "NOT_APPLICABLE")

    def test_context_specific_routes_stay_separate_owner(self):
        self.assertIn("return `SEPARATE_OWNER_REQUIRED`", self.skill)
        self.assertEqual(self.case("s-termux-separate-owner")["expected"]["status"], "SEPARATE_OWNER_REQUIRED")
        gui = self.case("gui-action-separate-owner")
        self.assertEqual(gui["expected"]["status"], "SEPARATE_OWNER_REQUIRED")
        self.assertFalse(gui["expected"]["action_authorized"])

    def test_required_evidence_chain_is_explicit(self):
        ordered = [
            "### 1. Dispatch plan identity",
            "### 2. Route-conditioned preflight evidence",
            "### 3. Scope overlap",
            "### 4. D-013 lease identity",
            "### 5. Git/worktree currentness",
            "### 6. D-014 manifest identity",
            "### 7. Source packet authority",
        ]
        positions = [self.skill.index(token) for token in ordered]
        self.assertEqual(positions, sorted(positions))

    def test_preflight_uncertainty_is_not_upgraded(self):
        self.assertEqual(self.case("preflight-unknown")["expected"]["status"], "UNKNOWN")
        self.assertEqual(self.case("preflight-blocked")["expected"]["status"], "BLOCKED")
        self.assertIn("never convert any non-ready state into `HANDOFF_READY`", self.skill)

    def test_overlap_must_be_exact_disjoint(self):
        self.assertIn("exactly `DISJOINT`", self.skill)
        self.assertEqual(self.case("overlap-present")["expected"]["status"], "BLOCKED")
        self.assertEqual(self.case("overlap-conflict")["expected"]["status"], "CONFLICT")

    def test_active_lease_is_mandatory_and_identity_bound(self):
        self.assertIn("Require one currently active D-013 lease", self.skill)
        self.assertEqual(self.case("lease-missing")["expected"]["status"], "BLOCKED")
        self.assertEqual(self.case("lease-released")["expected"]["status"], "BLOCKED")
        self.assertEqual(self.case("packet-digest-conflict")["expected"]["status"], "CONFLICT")
        for token in ["packet-body SHA-256", "normalized scopes", "branch/worktree identity", "observed base SHA"]:
            self.assertIn(token, self.skill)

    def test_git_currentness_is_separate_and_fail_closed(self):
        self.assertEqual(self.case("git-currentness-unknown")["expected"]["status"], "UNKNOWN")
        self.assertIn("does not fetch, switch, reset, sync, stash, clean, create, or delete", self.skill)

    def test_d014_manifest_is_reused_not_reinvented(self):
        self.assertIn("Require one valid D-014 `TASK_MANIFEST`", self.skill)
        self.assertIn("Do not create a second handoff schema", self.skill)
        self.assertEqual(self.case("manifest-identity-conflict")["expected"]["status"], "CONFLICT")
        self.assertIn("MCL_TASK_MANIFEST", self.handoff_doc)
        self.assertIn("D-013", self.handoff_doc)

    def test_packet_stage_must_already_authorize_mutation(self):
        self.assertEqual(self.case("terminal-packet-blocked")["expected"]["status"], "BLOCKED")
        self.assertEqual(self.case("authority-scope-only-blocked")["expected"]["status"], "BLOCKED")
        self.assertIn("does not advance packet lifecycle", self.skill)

    def test_no_executor_fallback_after_selection(self):
        case = self.case("selected-s-never-falls-back")
        self.assertEqual(case["expected"]["executor"], "S")
        self.assertFalse(case["expected"]["auto_switched_executor"])
        self.assertIn("never swaps to\nthe other executor", self.skill)

    def test_receipt_contract_is_bounded_and_non_authoritative(self):
        for token in [
            "schema=mcl-execution-handoff.v1",
            "status=<HANDOFF_READY|BLOCKED|UNKNOWN|CONFLICT|SEPARATE_OWNER_REQUIRED|NOT_APPLICABLE>",
            "manifest_id=<sha256|not_applicable|unknown>",
            "lease_id=<sha256|not_applicable|unknown>",
            "mutation_authorized=false",
            "execution_authorized=false",
            "details=withheld",
        ]:
            self.assertIn(token, self.skill)
        for case_id in ["repo-s-handoff-ready", "repo-m-fallback-handoff-ready"]:
            case = self.case(case_id)
            self.assertFalse(case["expected"]["mutation_authorized"])
            self.assertFalse(case["expected"]["execution_authorized"])

    def test_execution_payload_is_forbidden(self):
        case = self.case("command-payload-rejected")
        self.assertEqual(case["expected"]["status"], "BLOCKED")
        self.assertFalse(case["expected"]["command_executed"])
        for token in ["run shell commands", "dispatch a generic GitHub workflow", "create a queue, scheduler, daemon"]:
            self.assertIn(token, self.skill)

    def test_skill_does_not_claim_effects(self):
        for case in self.evals["cases"]:
            self.assertFalse(case["expected"].get("effect_performed", False), case["id"])
        self.assertNotIn("effect_performed=true", self.skill)

    def test_existing_owner_boundaries_are_named(self):
        for token in ["mcl-dispatch-plan.v1", "D-013", "D-014", "Work System overlap", "Work Harness"]:
            self.assertIn(token, self.skill)
        self.assertIn("planning only", self.dispatcher)
        self.assertIn("This skill is not a router, dispatcher", self.preflight)
        self.assertIn("ACTIVE V1", self.lease_doc)

    def test_identity_conflicts_are_explicit(self):
        self.assertIn("Treat present cross-source identity disagreement as `CONFLICT`", self.skill)
        self.assertEqual(self.case("workspace-conflict")["expected"]["status"], "CONFLICT")
        self.assertEqual(self.case("manifest-identity-conflict")["expected"]["status"], "CONFLICT")

    def test_eval_corpus_is_unique_and_complete(self):
        self.assertEqual(self.evals["skill_name"], "mcl-execution-handoff")
        self.assertEqual(self.evals["schema_version"], 1)
        ids = [case["id"] for case in self.evals["cases"]]
        self.assertEqual(len(ids), len(set(ids)))
        required = {
            "repo-s-handoff-ready", "repo-m-fallback-handoff-ready",
            "read-only-not-applicable", "s-termux-separate-owner",
            "gui-action-separate-owner", "preflight-unknown", "preflight-blocked",
            "overlap-conflict", "overlap-present", "lease-missing", "lease-released",
            "packet-digest-conflict", "workspace-conflict", "git-currentness-unknown",
            "manifest-identity-conflict", "terminal-packet-blocked",
            "authority-scope-only-blocked", "selected-s-never-falls-back",
            "command-payload-rejected",
        }
        self.assertTrue(required.issubset(set(ids)))

    def test_no_mutable_sha_or_secret_material_is_frozen(self):
        combined = self.skill + self.evals_text
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", combined))
        for forbidden in ["GH_TOKEN=", "GITHUB_TOKEN=", "auth_token", "session_id", "device_id"]:
            self.assertNotIn(forbidden, combined)


if __name__ == "__main__":
    unittest.main()
