import copy
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from budget import BudgetError, execute_synthetic_budget
from canonical import canonical_json_bytes
from evidence import build_evidence_package, evidence_package_sha256
from judge import judge_synthetic
from router import route_task
from synthetic import (
    SyntheticReceiptError,
    run_synthetic_control_plane,
    synthetic_receipt_sha256,
    validate_synthetic_receipt,
)

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40


class O1B2BudgetJudgeReceiptTests(unittest.TestCase):
    def task(self, task_kind="impact_analysis"):
        return {
            "schema_version": 1,
            "task_id": f"o1b2-{task_kind}",
            "scope": "plugin:usage-dashboard",
            "task_kind": task_kind,
            "intent": "Exercise deterministic O1-B2 control-plane behavior.",
            "mutation_requested": False,
            "device_truth_requested": False,
        }

    def observations(self):
        return [
            {
                "kind": "release_branch",
                "value": "release-usage-dashboard",
                "status": "OBSERVED",
                "source_sha": RELEASE_SHA,
            },
            {
                "kind": "manifest",
                "value": "plugins/usage-dashboard/runtime/product-manifest.json",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
            {
                "kind": "artifact",
                "value": "plugins/usage-dashboard/latest.js",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
            {
                "kind": "release_spec_dir",
                "value": ".github/usage-dashboard/releases",
                "status": "OBSERVED",
                "source_sha": TARGET_SHA,
            },
        ]

    def plan_and_evidence(self, *, resolved=True, task_kind="impact_analysis"):
        plan = route_task(self.task(task_kind))
        snapshot = resolve_authority(
            "plugin:usage-dashboard",
            TARGET_SHA,
            self.observations() if resolved else [],
        )
        evidence = build_evidence_package(
            plan,
            snapshot,
            [
                {
                    "path": "plugins/usage-dashboard/src/runtime.js",
                    "source_sha": TARGET_SHA,
                    "start_line": 10,
                    "content": "export const runtime = true;",
                }
            ],
        )
        return plan, evidence

    def claim(self, claim_id, role, value=None, *, status="DIRECT", subject=None):
        return (
            {
                "id": claim_id,
                "kind": "preservation",
                "status": status,
                "value": value or claim_id,
                "refs": ["S1@L10"],
                "role": role,
            },
            {
                "claim_id": claim_id,
                "subject_key": subject or f"subject/{claim_id}",
            },
        )

    def fixture(self, evidence, stage_id, role, claim, subject):
        return {
            "schema_version": 1,
            "stage_id": stage_id,
            "role": role,
            "evidence_sha256": evidence_package_sha256(evidence),
            "records": {
                "claims": [claim],
                "claim_subjects": [subject],
                "flow_edges": [],
                "boundaries": [],
                "blockers": [],
            },
        }

    def full_fixtures(self, evidence):
        result = []
        for stage_id, role in (
            ("scout", "scout"),
            ("mapper", "mapper"),
            ("critic", "critic"),
            ("synthesizer", "synthesizer"),
        ):
            claim, subject = self.claim(f"claim-{stage_id}", role)
            result.append(self.fixture(evidence, stage_id, role, claim, subject))
        return result

    def test_standard_lane_all_four_success_can_reach_supported_with_zero_model_calls(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        result = run_synthetic_control_plane(plan, evidence, self.full_fixtures(evidence))
        budget = result["budget_state"]
        judge = result["judge_result"]
        receipt = result["receipt"]
        self.assertEqual(budget["profile_id"], "standard-cpu")
        self.assertEqual(budget["max_role_attempts"], 4)
        self.assertEqual(budget["role_attempt_count"], 4)
        self.assertEqual(budget["model_call_count"], 0)
        self.assertFalse(budget["exhausted"])
        self.assertTrue(all(item["status"] == "SUCCEEDED" for item in budget["stage_states"]))
        self.assertEqual(budget["blockers"], [])
        self.assertEqual(judge["final_verdict"], "SUPPORTED")
        self.assertEqual(receipt["mode"], "o1_synthetic_zero_model")
        self.assertEqual(receipt["model_call_count"], 0)
        self.assertEqual(receipt["final_verdict"], "SUPPORTED")

    def test_full_receipt_is_byte_reproducible_across_outer_fixture_order(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        fixtures = self.full_fixtures(evidence)
        first = run_synthetic_control_plane(plan, evidence, fixtures)
        second = run_synthetic_control_plane(plan, evidence, list(reversed(fixtures)))
        self.assertEqual(first, second)
        self.assertEqual(
            canonical_json_bytes(first["receipt"]),
            canonical_json_bytes(second["receipt"]),
        )
        first_sha = synthetic_receipt_sha256(
            first["receipt"],
            execution_plan=plan,
            evidence_package=evidence,
            typed_bus=first["typed_bus"],
            budget_state=first["budget_state"],
            judge_result=first["judge_result"],
        )
        second_sha = synthetic_receipt_sha256(
            second["receipt"],
            execution_plan=plan,
            evidence_package=evidence,
            typed_bus=second["typed_bus"],
            budget_state=second["budget_state"],
            judge_result=second["judge_result"],
        )
        self.assertEqual(first_sha, second_sha)

    def test_stricter_budget_exhaustion_is_partial_with_successful_upstream_work(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        result = run_synthetic_control_plane(
            plan,
            evidence,
            self.full_fixtures(evidence),
            role_attempt_limit_override=2,
        )
        budget = result["budget_state"]
        states = {item["stage_id"]: item for item in budget["stage_states"]}
        self.assertEqual(budget["profile_id"], "synthetic-strict-2")
        self.assertEqual(budget["role_attempt_count"], 2)
        self.assertTrue(budget["exhausted"])
        self.assertEqual(states["scout"]["status"], "SUCCEEDED")
        self.assertEqual(states["mapper"]["status"], "SUCCEEDED")
        self.assertEqual(states["critic"]["status"], "SKIPPED_BUDGET")
        self.assertEqual(states["critic"]["cause"], "budget")
        self.assertEqual(states["synthesizer"]["status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(states["synthesizer"]["cause"], "budget")
        self.assertTrue(all(item["kind"] == "budget" for item in budget["blockers"]))
        self.assertEqual(result["judge_result"]["final_verdict"], "PARTIAL")
        self.assertNotEqual(result["judge_result"]["final_verdict"], "SUPPORTED")

    def test_zero_budget_without_success_is_unknown_not_supported(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        result = run_synthetic_control_plane(
            plan,
            evidence,
            self.full_fixtures(evidence),
            role_attempt_limit_override=0,
        )
        self.assertEqual(result["budget_state"]["role_attempt_count"], 0)
        self.assertTrue(result["budget_state"]["exhausted"])
        self.assertEqual(result["judge_result"]["final_verdict"], "UNKNOWN")

    def test_declared_non_budget_stage_failure_yields_execution_incomplete(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        fixtures = [
            item for item in self.full_fixtures(evidence) if item["stage_id"] != "mapper"
        ]
        result = run_synthetic_control_plane(
            plan,
            evidence,
            fixtures,
            failed_stage_ids=["mapper"],
        )
        states = {item["stage_id"]: item for item in result["budget_state"]["stage_states"]}
        self.assertEqual(states["mapper"]["status"], "FAILED")
        self.assertEqual(states["mapper"]["cause"], "execution")
        self.assertEqual(states["critic"]["status"], "SUCCEEDED")
        self.assertEqual(states["synthesizer"]["status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(states["synthesizer"]["cause"], "execution")
        self.assertEqual(result["judge_result"]["final_verdict"], "EXECUTION_INCOMPLETE")

    def test_dependency_bypass_fixture_is_not_admitted(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        mapper_claim, mapper_subject = self.claim("claim-mapper-only", "mapper")
        mapper_fixture = self.fixture(
            evidence,
            "mapper",
            "mapper",
            mapper_claim,
            mapper_subject,
        )
        result = run_synthetic_control_plane(plan, evidence, [mapper_fixture])
        self.assertEqual(result["typed_bus"]["fixture_sha256"], {})
        self.assertEqual(result["typed_bus"]["claims"], [])
        states = {item["stage_id"]: item for item in result["budget_state"]["stage_states"]}
        self.assertEqual(states["scout"]["status"], "MISSING_INPUT")
        self.assertEqual(states["mapper"]["status"], "BLOCKED_DEPENDENCY")
        self.assertEqual(states["mapper"]["cause"], "execution")
        self.assertEqual(result["judge_result"]["final_verdict"], "EXECUTION_INCOMPLETE")

    def test_pairwise_bus_conflict_yields_conflict(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        fixtures = self.full_fixtures(evidence)
        mapper_claim, mapper_subject = self.claim(
            "claim-mapper-conflict", "mapper", "owner-a", subject="semantic-owner/runtime"
        )
        critic_claim, critic_subject = self.claim(
            "claim-critic-conflict", "critic", "owner-b", subject="semantic-owner/runtime"
        )
        fixtures = [
            self.fixture(evidence, "mapper", "mapper", mapper_claim, mapper_subject)
            if item["stage_id"] == "mapper"
            else self.fixture(evidence, "critic", "critic", critic_claim, critic_subject)
            if item["stage_id"] == "critic"
            else item
            for item in fixtures
        ]
        result = run_synthetic_control_plane(plan, evidence, fixtures)
        self.assertTrue(result["typed_bus"]["conflicts"])
        self.assertEqual(result["judge_result"]["final_verdict"], "CONFLICT")

    def test_upstream_typed_conflict_status_yields_conflict_without_pairwise_disagreement(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        fixtures = self.full_fixtures(evidence)
        critic_claim, critic_subject = self.claim(
            "claim-critic-status-conflict",
            "critic",
            status="CONFLICT",
            subject="critic/explicit-conflict",
        )
        fixtures = [
            self.fixture(evidence, "critic", "critic", critic_claim, critic_subject)
            if item["stage_id"] == "critic"
            else item
            for item in fixtures
        ]
        result = run_synthetic_control_plane(plan, evidence, fixtures)
        self.assertEqual(result["typed_bus"]["conflicts"], [])
        self.assertEqual(result["judge_result"]["final_verdict"], "CONFLICT")

    def test_unknown_authority_survives_to_partial_and_prevents_supported(self):
        plan, evidence = self.plan_and_evidence(resolved=False)
        self.assertTrue(evidence["blockers"])
        result = run_synthetic_control_plane(plan, evidence, self.full_fixtures(evidence))
        self.assertEqual(result["budget_state"]["role_attempt_count"], 4)
        self.assertEqual(result["judge_result"]["final_verdict"], "PARTIAL")
        self.assertTrue(any(item["kind"] == "unknown" for item in result["judge_result"]["blockers"]))

    def test_empty_clean_deterministic_bus_is_unknown_not_supported(self):
        plan, evidence = self.plan_and_evidence(resolved=True, task_kind="release_lookup")
        result = run_synthetic_control_plane(plan, evidence, [])
        self.assertEqual(result["budget_state"]["profile_id"], "deterministic-only")
        self.assertEqual(result["budget_state"]["stage_states"], [])
        self.assertEqual(result["typed_bus"]["claims"], [])
        self.assertEqual(result["judge_result"]["blockers"], [])
        self.assertEqual(result["judge_result"]["final_verdict"], "UNKNOWN")

    def test_budget_override_cannot_expand_default_and_rejects_invalid_values(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        fixtures = self.full_fixtures(evidence)
        for override in (-1, 5, True, 1.5):
            with self.subTest(override=override):
                with self.assertRaises(BudgetError):
                    execute_synthetic_budget(
                        plan,
                        evidence,
                        fixtures,
                        role_attempt_limit_override=override,
                    )

    def test_receipt_closed_schema_rejects_model_or_generation_provenance(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        result = run_synthetic_control_plane(plan, evidence, self.full_fixtures(evidence))
        for field, value in (
            ("model_profile_id", "fake-model"),
            ("model_digest", "c" * 64),
            ("generation_profile_sha256", "d" * 64),
            ("prompt_sha256", "e" * 64),
        ):
            with self.subTest(field=field):
                receipt = copy.deepcopy(result["receipt"])
                receipt[field] = value
                with self.assertRaisesRegex(SyntheticReceiptError, "invalid synthetic receipt"):
                    validate_synthetic_receipt(
                        receipt,
                        execution_plan=plan,
                        evidence_package=evidence,
                        typed_bus=result["typed_bus"],
                        budget_state=result["budget_state"],
                        judge_result=result["judge_result"],
                    )

    def test_tampered_receipt_hash_chain_fails_closed(self):
        plan, evidence = self.plan_and_evidence(resolved=True)
        result = run_synthetic_control_plane(plan, evidence, self.full_fixtures(evidence))
        fields = (
            "execution_plan_sha256",
            "authority_snapshot_sha256",
            "evidence_sha256",
            "typed_bus_sha256",
            "budget_state_sha256",
            "judge_result_sha256",
        )
        for field in fields:
            with self.subTest(field=field):
                receipt = copy.deepcopy(result["receipt"])
                receipt[field] = "0" * 64
                with self.assertRaisesRegex(SyntheticReceiptError, "mismatch"):
                    validate_synthetic_receipt(
                        receipt,
                        execution_plan=plan,
                        evidence_package=evidence,
                        typed_bus=result["typed_bus"],
                        budget_state=result["budget_state"],
                        judge_result=result["judge_result"],
                    )


if __name__ == "__main__":
    unittest.main()
