import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from assignment import (
    AssignmentPolicyError,
    assign_all_roles,
    assign_role,
    load_assignment_evidence,
    load_assignment_policy,
    snapshot_sha256,
    validate_assignment_snapshot,
    validate_evidence,
    validate_policy,
)
from canonical import canonical_sha256
from registry import load_model_registry


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def rehash(value, field):
    base = copy.deepcopy(value)
    base.pop(field, None)
    value[field] = canonical_sha256(base)
    return value


class O5RoleAssignmentPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = load_assignment_policy()
        self.real_evidence = load_assignment_evidence()
        self.registry = load_model_registry()
        self.profiles = {item["profile_id"]: item for item in self.registry["profiles"]}
        self.qwen = "qwen2.5-3b-instruct-q4_k_m"
        self.ministral = "ministral-3-3b-instruct-2512-q4_k_m"

    def metrics(self, role, *, precision=10000, recall=6000, optional=6000):
        def ratio(bp):
            if bp == 10000:
                return {"numerator": 10, "denominator": 10, "basis_points": 10000}
            if bp == 9000:
                return {"numerator": 9, "denominator": 10, "basis_points": 9000}
            if bp == 7000:
                return {"numerator": 7, "denominator": 10, "basis_points": 7000}
            if bp == 6000:
                return {"numerator": 6, "denominator": 10, "basis_points": 6000}
            if bp == 5000:
                return {"numerator": 5, "denominator": 10, "basis_points": 5000}
            if bp == 4000:
                return {"numerator": 4, "denominator": 10, "basis_points": 4000}
            if bp == 0:
                return {"numerator": 0, "denominator": 10, "basis_points": 0}
            raise AssertionError(bp)
        if role == "scout":
            return {
                "source_selection_precision": ratio(precision),
                "source_selection_recall": ratio(recall),
                "authority_precision": ratio(precision),
                "authority_recall": ratio(recall),
                "invalid_ref_count": 0,
                "authority_overclaim_count": 0,
            }
        if role == "mapper":
            return {
                "owner_precision": ratio(precision),
                "owner_recall": ratio(recall),
                "edge_precision": ratio(precision),
                "edge_recall": ratio(recall),
                "grounding_precision": ratio(precision),
                "false_edge_count": 0,
                "invalid_ref_count": 0,
            }
        if role == "critic":
            return {
                "boundary_precision": ratio(precision),
                "boundary_recall": ratio(recall),
                "blocker_precision": ratio(precision),
                "blocker_recall": ratio(recall),
                "required_uncertainty_preservation_recall": ratio(10000),
                "false_blocker_count": 0,
                "optimism_violation_count": 0,
                "invalid_ref_count": 0,
            }
        if role == "synthesizer":
            return {
                "required_record_preservation_recall": ratio(10000),
                "required_blocker_conflict_preservation_recall": ratio(10000),
                "compact_completion_status": True,
                "optional_useful_selection_recall": ratio(optional),
                "excess_optional_selection_count": 0,
                "forbidden_new_claim_count": 0,
                "invalid_ref_count": 0,
            }
        raise AssertionError(role)

    def cell(self, role, profile_id, case_id, *, metrics=None, wall_clock_ms=100, diagnostic=False, eligible=True):
        profile = self.profiles[profile_id]
        case_version = "v1"
        return {
            "role": role,
            "model_profile_id": profile_id,
            "model_family": profile["family"],
            "model_sha256": profile["sha256"],
            "case_id": case_id,
            "case_version": case_version,
            "measurement_id": f"o4-{role}-{case_id}-v1",
            "diagnostic_replay_only": diagnostic,
            "assignment_eligible": eligible,
            "assignment_basis": "DIAGNOSTIC_REPLAY_ONLY" if diagnostic else ("ELIGIBLE_RETROSPECTIVE" if eligible else "HISTORICAL_TERMINAL_ONLY"),
            "scoring_policy_id": "o4a-retrospective-role-benchmark-v1",
            "scoring_policy_sha256": "8f14ca312d8b8bf96c869b24d4b97fd5a690547fbe65422c19ed886c1b62c965",
            "role_contract_id": f"{role}-contract-v1",
            "generation_sha256": canonical_sha256(self.policy["generation"]),
            "fixture_sha256": digest(f"fixture:{role}:{case_id}"),
            "evidence_sha256": digest(f"evidence:{role}:{case_id}"),
            "prompt_sha256": digest(f"prompt:{role}:{case_id}"),
            "response_schema_sha256": digest(f"schema:{role}:{case_id}"),
            "result_sha256": digest(f"result:{role}:{case_id}:{profile_id}"),
            "score_sha256": digest(f"score:{role}:{case_id}:{profile_id}"),
            "execution_status": "COMPLETED",
            "parse_valid": True,
            "contract_valid": True,
            "wall_clock_ms": wall_clock_ms,
            "metrics": copy.deepcopy(metrics or self.metrics(role)),
        }

    def evidence(self, cells):
        value = {"schema_version": 1, "evidence_id": "synthetic-o5-test", "cells": cells, "evidence_sha256": "0" * 64}
        return rehash(value, "evidence_sha256")

    def paired(self, role, *, q_metrics=None, m_metrics=None, q_time=100, m_time=200):
        cells = []
        for case_id in ("case-a", "case-b"):
            cells.append(self.cell(role, self.qwen, case_id, metrics=q_metrics, wall_clock_ms=q_time))
            cells.append(self.cell(role, self.ministral, case_id, metrics=m_metrics, wall_clock_ms=m_time))
        return self.evidence(cells)

    def test_policy_and_current_evidence_hashes_validate(self):
        validate_policy(self.policy)
        validate_evidence(self.real_evidence)
        self.assertEqual(self.policy["policy_sha256"], canonical_sha256({k:v for k,v in self.policy.items() if k != "policy_sha256"}))
        self.assertEqual(self.real_evidence["evidence_sha256"], canonical_sha256({k:v for k,v in self.real_evidence.items() if k != "evidence_sha256"}))

    def test_closed_policy_rejects_winner_and_weighted_score_is_false(self):
        broken = copy.deepcopy(self.policy)
        broken["winner"] = self.qwen
        rehash(broken, "policy_sha256")
        with self.assertRaises(AssignmentPolicyError):
            validate_policy(broken)
        self.assertFalse(self.policy["weighted_composite_score"])

    def test_evidence_metrics_reject_unknown_weighted_score(self):
        evidence = self.paired("scout")
        evidence["cells"][0]["metrics"]["weighted_score"] = 9999
        rehash(evidence, "evidence_sha256")
        with self.assertRaises(AssignmentPolicyError):
            validate_evidence(evidence)

    def test_current_real_evidence_returns_no_assignment_for_all_roles(self):
        snapshots = assign_all_roles(self.real_evidence, self.policy, registry_data=self.registry)
        self.assertEqual(snapshots["scout"]["reason_code"], "INSUFFICIENT_INDEPENDENT_CASES")
        for role in ("mapper", "critic", "synthesizer"):
            self.assertEqual(snapshots[role]["reason_code"], "NO_COMPARABLE_O4_EVIDENCE")
        self.assertTrue(all(item["status"] == "NO_ASSIGNMENT" for item in snapshots.values()))
        self.assertTrue(all(item["selection"]["present"] is False for item in snapshots.values()))

    def test_diagnostic_replay_is_excluded_from_independent_case_count(self):
        cells = []
        for profile in (self.qwen, self.ministral):
            cells.append(self.cell("scout", profile, "case-a"))
            cells.append(self.cell("scout", profile, "case-b", diagnostic=True, eligible=False))
        snapshot = assign_role("scout", self.evidence(cells), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["reason_code"], "INSUFFICIENT_INDEPENDENT_CASES")

    def test_fewer_than_two_distinct_cases_fails_closed(self):
        evidence = self.evidence([self.cell("scout", self.qwen, "case-a"), self.cell("scout", self.ministral, "case-a")])
        self.assertEqual(assign_role("scout", evidence, self.policy, registry_data=self.registry)["reason_code"], "INSUFFICIENT_INDEPENDENT_CASES")

    def test_fewer_than_two_model_families_fails_closed(self):
        evidence = self.evidence([self.cell("scout", self.qwen, "case-a"), self.cell("scout", self.qwen, "case-b")])
        self.assertEqual(assign_role("scout", evidence, self.policy, registry_data=self.registry)["reason_code"], "INSUFFICIENT_MODEL_FAMILIES")

    def test_nonpaired_case_sets_fail_closed(self):
        cells = [
            self.cell("scout", self.qwen, "case-a"), self.cell("scout", self.qwen, "case-b"),
            self.cell("scout", self.ministral, "case-a"), self.cell("scout", self.ministral, "case-c"),
        ]
        self.assertEqual(assign_role("scout", self.evidence(cells), self.policy, registry_data=self.registry)["reason_code"], "MISSING_PAIRED_CELL")

    def test_incompatible_paired_identity_fails_closed(self):
        evidence = self.paired("scout")
        evidence["cells"][1]["prompt_sha256"] = digest("different prompt")
        rehash(evidence, "evidence_sha256")
        self.assertEqual(assign_role("scout", evidence, self.policy, registry_data=self.registry)["reason_code"], "INCOMPATIBLE_EVIDENCE_IDENTITY")

    def test_disabled_model_cannot_be_selected(self):
        registry = copy.deepcopy(self.registry)
        for item in registry["profiles"]:
            if item["profile_id"] == self.ministral:
                item["enabled"] = False
        self.assertEqual(assign_role("scout", self.paired("scout"), self.policy, registry_data=registry)["reason_code"], "MODEL_INELIGIBLE")

    def test_undefined_required_ratio_fails_instead_of_manufacturing_zero(self):
        evidence = self.paired("scout")
        for cell in evidence["cells"]:
            cell["metrics"]["authority_recall"] = {"numerator": 0, "denominator": 0, "basis_points": None}
        rehash(evidence, "evidence_sha256")
        snapshot = assign_role("scout", evidence, self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["reason_code"], "UNDEFINED_REQUIRED_METRIC")

    def test_threshold_boundaries_precision_9000_recall_5000_pass(self):
        metrics = self.metrics("scout", precision=9000, recall=5000)
        snapshot = assign_role("scout", self.paired("scout", q_metrics=metrics, m_metrics=metrics, q_time=100, m_time=200), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["status"], "FROZEN_ASSIGNMENT")
        self.assertEqual(snapshot["selection"]["profile_id"], self.qwen)

    def test_below_recall_floor_fails_threshold(self):
        metrics = self.metrics("scout", precision=10000, recall=4000)
        snapshot = assign_role("scout", self.paired("scout", q_metrics=metrics, m_metrics=metrics), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["reason_code"], "THRESHOLD_FAILURE")

    def test_safety_preservation_must_be_10000_for_critic(self):
        q = self.metrics("critic")
        m = self.metrics("critic")
        q["required_uncertainty_preservation_recall"] = {"numerator": 9, "denominator": 10, "basis_points": 9000}
        m["required_uncertainty_preservation_recall"] = {"numerator": 9, "denominator": 10, "basis_points": 9000}
        snapshot = assign_role("critic", self.paired("critic", q_metrics=q, m_metrics=m), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["reason_code"], "THRESHOLD_FAILURE")

    def test_violation_counts_must_be_zero(self):
        q = self.metrics("mapper")
        m = self.metrics("mapper")
        q["false_edge_count"] = 1
        m["false_edge_count"] = 1
        snapshot = assign_role("mapper", self.paired("mapper", q_metrics=q, m_metrics=m), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["reason_code"], "THRESHOLD_FAILURE")

    def test_quality_difference_beats_lower_latency(self):
        q = self.metrics("scout", precision=10000, recall=6000)
        m = self.metrics("scout", precision=10000, recall=7000)
        snapshot = assign_role("scout", self.paired("scout", q_metrics=q, m_metrics=m, q_time=10, m_time=1000), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["selection"]["profile_id"], self.ministral)

    def test_latency_breaks_only_exact_quality_tie(self):
        same = self.metrics("scout", precision=10000, recall=6000)
        snapshot = assign_role("scout", self.paired("scout", q_metrics=same, m_metrics=same, q_time=100, m_time=200), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["selection"]["profile_id"], self.qwen)

    def test_exact_quality_and_runtime_tie_returns_no_assignment(self):
        same = self.metrics("scout", precision=10000, recall=6000)
        snapshot = assign_role("scout", self.paired("scout", q_metrics=same, m_metrics=same, q_time=100, m_time=100), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["status"], "NO_ASSIGNMENT")
        self.assertEqual(snapshot["reason_code"], "EXACT_TIE")

    def test_synthesizer_optional_metric_is_comparison_only(self):
        q = self.metrics("synthesizer", optional=5000)
        m = self.metrics("synthesizer", optional=7000)
        snapshot = assign_role("synthesizer", self.paired("synthesizer", q_metrics=q, m_metrics=m, q_time=10, m_time=1000), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot["selection"]["profile_id"], self.ministral)

    def test_family_diversity_bonus_and_semantic_escalation_are_disabled(self):
        self.assertFalse(self.policy["family_diversity_bonus"])
        self.assertEqual(self.policy["budget"]["total_semantic_role_calls"], 4)
        self.assertEqual(self.policy["budget"]["hosted_ai_calls"], 0)
        self.assertEqual(self.policy["budget"]["semantic_reruns"], 0)
        self.assertEqual(self.policy["budget"]["escalation_model_calls"], 0)
        self.assertEqual(self.policy["budget"]["role_call_limits"], {"scout":1,"mapper":1,"critic":1,"synthesizer":1})

    def test_assignment_snapshot_hash_and_closed_shape(self):
        snapshot = assign_role("scout", self.paired("scout"), self.policy, registry_data=self.registry)
        self.assertEqual(snapshot_sha256(snapshot), snapshot["assignment_sha256"])
        broken = copy.deepcopy(snapshot)
        broken["confidence"] = 0
        rehash(broken, "assignment_sha256")
        with self.assertRaises(AssignmentPolicyError):
            validate_assignment_snapshot(broken)

    def test_no_active_assignment_file_is_materialized(self):
        self.assertFalse((PACKAGE / "models" / "active-assignments.json").exists())


if __name__ == "__main__":
    unittest.main()
