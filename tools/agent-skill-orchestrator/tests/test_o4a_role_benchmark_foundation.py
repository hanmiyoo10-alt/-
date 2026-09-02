import copy
import sys
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from benchmarks.score_role_output import (
    RoleBenchmarkError,
    SCORING_POLICY_ID,
    SCORING_POLICY_SHA256,
    fixture_sha256,
    normalize_fixture_text,
    ratio,
    result_sha256,
    score_role_output,
    validate_case,
    validate_result,
    validate_score,
)
from benchmarks.aggregate_role_scores import (
    RoleBenchmarkAggregateError,
    aggregate_role_scores,
    validate_aggregate,
)

SHA = "b" * 40


class O4ABenchmarkFoundationTests(unittest.TestCase):
    def case(self, role, labels, *, case_id=None, known_refs=None):
        upstream = {
            "scout": [],
            "mapper": ["2" * 64],
            "critic": ["2" * 64],
            "synthesizer": ["2" * 64, "3" * 64, "4" * 64],
        }[role]
        data = {
            "schema_version": 1,
            "scoring_policy_id": SCORING_POLICY_ID,
            "scoring_policy_sha256": SCORING_POLICY_SHA256,
            "case_id": case_id or f"o4a-{role}",
            "case_version": "v1",
            "retrospective_only": True,
            "source_case_id": "retired-fixture",
            "source_case_kind": "RETIRED_DIAGNOSTIC",
            "repository_snapshots": [{"name": "main", "sha": SHA}],
            "role": role,
            "role_contract_id": f"{role}-contract-v1",
            "evidence_sha256": "1" * 64,
            "known_source_refs": known_refs or ["S1@L1", "S2@L2", "S3@L3"],
            "upstream_artifact_sha256": upstream,
            "expected_labels": labels,
            "fixture_sha256": "0" * 64,
        }
        data["fixture_sha256"] = fixture_sha256(data)
        return data

    def result(
        self,
        case,
        atoms,
        *,
        status="COMPLETED",
        parse_valid=True,
        contract_valid=True,
        compact=True,
        model_profile_id="qwen-test",
        telemetry=None,
        model_call_count=None,
    ):
        if model_call_count is None:
            model_call_count = 0 if status == "FAILED" else 1
        response = "NONE" if status == "FAILED" and model_call_count == 0 else "8" * 64
        receipt = "NONE" if status == "FAILED" and model_call_count == 0 else "9" * 64
        artifact = "a" * 64 if status == "COMPLETED" else "NONE"
        known = set(case["known_source_refs"])
        invalid_refs = 0
        for atom in atoms:
            if "ref" in atom:
                invalid_refs += 0 if atom["ref"] in known else 1
            if "refs" in atom:
                invalid_refs += sum(ref not in known for ref in atom["refs"])
        data = {
            "schema_version": 1,
            "scoring_policy_id": SCORING_POLICY_ID,
            "scoring_policy_sha256": SCORING_POLICY_SHA256,
            "case_id": case["case_id"],
            "case_version": case["case_version"],
            "fixture_sha256": case["fixture_sha256"],
            "role": case["role"],
            "model": {
                "profile_id": model_profile_id,
                "family": "qwen-test-family",
                "repository": "example/model",
                "revision": "exact-revision",
                "file": "model.gguf",
                "sha256": "5" * 64,
            },
            "runtime": {
                "id": "llama.cpp",
                "version": "b10516",
                "binary_sha256": "6" * 64,
            },
            "execution_status": status,
            "finish_reason": "stop",
            "parse_valid": parse_valid,
            "contract_valid": contract_valid,
            "invalid_ref_count": invalid_refs,
            "model_call_count": model_call_count,
            "hosted_ai_call_count": 0,
            "compact_completion_status": compact,
            "prompt_sha256": "7" * 64,
            "response_sha256": response,
            "receipt_sha256": receipt,
            "artifact_sha256": artifact,
            "telemetry": telemetry or {
                "wall_clock_ms": 100,
                "server_cpu_ms": None,
                "server_peak_rss_bytes": 200,
                "prompt_tokens": None,
                "completion_tokens": 5,
            },
            "predicted_atoms": atoms,
            "result_sha256": "0" * 64,
        }
        data["result_sha256"] = result_sha256(data)
        return data

    def test_closed_case_result_score_and_aggregate_shapes(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        validate_case(case)
        broken = copy.deepcopy(case)
        broken["composite_score"] = 9999
        broken["fixture_sha256"] = fixture_sha256(broken)
        with self.assertRaises(RoleBenchmarkError):
            validate_case(broken)

        result = self.result(case, [{"kind": "source_ref", "ref": "S1@L1"}])
        score = score_role_output(case, result)
        broken_score = copy.deepcopy(score)
        broken_score["weighted_score"] = 1
        with self.assertRaises(RoleBenchmarkError):
            validate_score(broken_score)

        aggregate = aggregate_role_scores([score])
        broken_aggregate = copy.deepcopy(aggregate)
        broken_aggregate["winner"] = "qwen"
        with self.assertRaises(RoleBenchmarkAggregateError):
            validate_aggregate(broken_aggregate)

    def test_fixture_and_result_digests_are_reproducible_and_tamper_fails(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        self.assertEqual(case["fixture_sha256"], fixture_sha256(copy.deepcopy(case)))
        tampered = copy.deepcopy(case)
        tampered["case_version"] = "v2"
        with self.assertRaisesRegex(RoleBenchmarkError, "fixture_sha256"):
            validate_case(tampered)

        result = self.result(case, [{"kind": "source_ref", "ref": "S1@L1"}])
        self.assertEqual(result["result_sha256"], result_sha256(copy.deepcopy(result)))
        tampered_result = copy.deepcopy(result)
        tampered_result["finish_reason"] = "length"
        with self.assertRaisesRegex(RoleBenchmarkError, "result_sha256"):
            validate_result(tampered_result, case)

    def test_normalization_is_nfc_plus_trim_only_no_casefold_or_fuzzy(self):
        self.assertEqual(normalize_fixture_text("  Cafe\u0301  "), "Café")
        case = self.case("mapper", [{"label_id": "o1", "kind": "owner", "value": "Café", "aliases": []}])
        exact = self.result(case, [{"kind": "owner", "value": " Cafe\u0301 ", "refs": ["S1@L1"]}])
        self.assertEqual(score_role_output(case, exact)["metrics"]["owner_recall"]["basis_points"], 10000)
        casefold = self.result(case, [{"kind": "owner", "value": "CAFÉ", "refs": ["S1@L1"]}])
        self.assertEqual(score_role_output(case, casefold)["metrics"]["owner_recall"]["basis_points"], 0)
        fuzzy = self.result(case, [{"kind": "owner", "value": "Café owner", "refs": ["S1@L1"]}])
        self.assertEqual(score_role_output(case, fuzzy)["metrics"]["owner_recall"]["basis_points"], 0)

    def test_fixture_owned_aliases_are_exact_and_ambiguous_aliases_rejected(self):
        case = self.case("mapper", [
            {"label_id": "o1", "kind": "owner", "value": "producer", "aliases": ["producer alias"]},
            {"label_id": "o2", "kind": "owner", "value": "consumer", "aliases": []},
        ])
        result = self.result(case, [{"kind": "owner", "value": "producer alias", "refs": ["S1@L1"]}])
        score = score_role_output(case, result)
        self.assertEqual(score["metrics"]["owner_precision"]["basis_points"], 10000)
        self.assertEqual(score["metrics"]["owner_recall"]["basis_points"], 5000)
        ambiguous = copy.deepcopy(case)
        ambiguous["expected_labels"][1]["aliases"] = ["producer alias"]
        ambiguous["fixture_sha256"] = fixture_sha256(ambiguous)
        with self.assertRaisesRegex(RoleBenchmarkError, "ambiguous"):
            validate_case(ambiguous)

    def test_ratio_floor_and_zero_denominator_null(self):
        self.assertEqual(ratio(2, 3), {"numerator": 2, "denominator": 3, "basis_points": 6666})
        self.assertEqual(ratio(0, 0), {"numerator": 0, "denominator": 0, "basis_points": None})

    def test_scout_metrics_exact_and_authority_overclaim_counted(self):
        case = self.case("scout", [
            {"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"},
            {"label_id": "a1", "kind": "authority", "authority_class": "manifest", "refs": ["S2@L2"]},
        ])
        result = self.result(case, [
            {"kind": "source_ref", "ref": "S1@L1"},
            {"kind": "authority", "authority_class": "manifest", "refs": ["S2@L2"]},
            {"kind": "authority", "authority_class": "release", "refs": ["S3@L3"]},
        ])
        metrics = score_role_output(case, result)["metrics"]
        self.assertEqual(metrics["source_selection_recall"]["basis_points"], 10000)
        self.assertEqual(metrics["authority_precision"]["basis_points"], 5000)
        self.assertEqual(metrics["authority_overclaim_count"], 1)

    def test_mapper_metrics_false_edge_and_grounding(self):
        case = self.case("mapper", [
            {"label_id": "o1", "kind": "owner", "value": "owner", "aliases": []},
            {"label_id": "e1", "kind": "edge", "from": "producer", "to": "consumer", "from_aliases": ["p"], "to_aliases": ["c"]},
        ])
        result = self.result(case, [
            {"kind": "owner", "value": "owner", "refs": ["S1@L1"]},
            {"kind": "edge", "from": "p", "to": "c", "refs": ["S2@L2"]},
            {"kind": "edge", "from": "x", "to": "y", "refs": ["S3@L3"]},
        ])
        metrics = score_role_output(case, result)["metrics"]
        self.assertEqual(metrics["edge_precision"]["basis_points"], 5000)
        self.assertEqual(metrics["edge_recall"]["basis_points"], 10000)
        self.assertEqual(metrics["false_edge_count"], 1)
        self.assertEqual(metrics["grounding_precision"]["basis_points"], 10000)

    def test_critic_required_uncertainty_miss_increases_optimism_violation(self):
        case = self.case("critic", [
            {"label_id": "b1", "kind": "boundary", "boundary_kind": "lifecycle", "subject": "background", "aliases": []},
            {"label_id": "k1", "kind": "blocker", "blocker_kind": "unknown", "subject": "release impact", "aliases": [], "required_uncertainty": True},
        ])
        result = self.result(case, [{"kind": "boundary", "boundary_kind": "lifecycle", "subject": "background", "refs": ["S1@L1"]}])
        metrics = score_role_output(case, result)["metrics"]
        self.assertEqual(metrics["required_uncertainty_preservation_recall"]["basis_points"], 0)
        self.assertEqual(metrics["optimism_violation_count"], 1)

    def test_synth_metrics_preservation_excess_and_forbidden_new_claim(self):
        case = self.case("synthesizer", [
            {"label_id": "r1", "kind": "record", "record_sha256": "1" * 64, "disposition": "required"},
            {"label_id": "r2", "kind": "record", "record_sha256": "2" * 64, "disposition": "required_blocker_or_conflict"},
            {"label_id": "r3", "kind": "record", "record_sha256": "3" * 64, "disposition": "optional_useful"},
        ])
        result = self.result(case, [
            {"kind": "record", "record_sha256": "1" * 64},
            {"kind": "record", "record_sha256": "2" * 64},
            {"kind": "record", "record_sha256": "4" * 64},
            {"kind": "new_claim", "claim_sha256": "5" * 64},
        ])
        metrics = score_role_output(case, result)["metrics"]
        self.assertEqual(metrics["required_record_preservation_recall"]["basis_points"], 10000)
        self.assertEqual(metrics["required_blocker_conflict_preservation_recall"]["basis_points"], 10000)
        self.assertEqual(metrics["optional_useful_selection_recall"]["basis_points"], 0)
        self.assertEqual(metrics["excess_optional_selection_count"], 1)
        self.assertEqual(metrics["forbidden_new_claim_count"], 1)
        self.assertTrue(metrics["compact_completion_status"])

    def test_unknown_well_formed_refs_count_and_completed_contract_valid_fails_closed(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        result = self.result(case, [{"kind": "source_ref", "ref": "S9@L9"}])
        with self.assertRaisesRegex(RoleBenchmarkError, "invalid refs"):
            validate_result(result, case)
        invalid = self.result(case, [{"kind": "source_ref", "ref": "S9@L9"}], status="INVALID", parse_valid=True, contract_valid=False)
        score = score_role_output(case, invalid)
        self.assertFalse(score["semantic_scored"])
        self.assertEqual(score["metrics"]["invalid_ref_count"], 1)
        self.assertIsNone(score["metrics"]["source_selection_recall"]["basis_points"])

    def test_nullable_telemetry_preserved_and_bool_rejected(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        result = self.result(case, [{"kind": "source_ref", "ref": "S1@L1"}], telemetry={
            "wall_clock_ms": None,
            "server_cpu_ms": None,
            "server_peak_rss_bytes": None,
            "prompt_tokens": None,
            "completion_tokens": None,
        })
        score = score_role_output(case, result)
        self.assertEqual(score["telemetry"], result["telemetry"])
        broken = copy.deepcopy(result)
        broken["telemetry"]["wall_clock_ms"] = True
        broken["result_sha256"] = result_sha256(broken)
        with self.assertRaises(RoleBenchmarkError):
            validate_result(broken, case)

    def test_hosted_ai_call_count_must_remain_zero(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        result = self.result(case, [{"kind": "source_ref", "ref": "S1@L1"}])
        result["hosted_ai_call_count"] = 1
        result["result_sha256"] = result_sha256(result)
        with self.assertRaises(RoleBenchmarkError):
            validate_result(result, case)

    def test_failed_and_incomplete_cells_remain_in_reliability_denominator(self):
        labels = [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}]
        c1 = self.case("scout", labels, case_id="case-1")
        c2 = self.case("scout", labels, case_id="case-2")
        c3 = self.case("scout", labels, case_id="case-3")
        ok = score_role_output(c1, self.result(c1, [{"kind": "source_ref", "ref": "S1@L1"}]))
        failed = score_role_output(c2, self.result(c2, [], status="FAILED", parse_valid=False, contract_valid=False, compact=False, model_call_count=0))
        incomplete = score_role_output(c3, self.result(c3, [], status="EXECUTION_INCOMPLETE", parse_valid=False, contract_valid=False, compact=False))
        aggregate = aggregate_role_scores([ok, failed, incomplete])
        row = aggregate["rows"][0]
        self.assertEqual(row["execution"]["total"], 3)
        self.assertEqual(row["execution"]["completed"], 1)
        self.assertEqual(row["execution"]["failed"], 1)
        self.assertEqual(row["execution"]["execution_incomplete"], 1)
        self.assertEqual(row["reliability"]["completion_ratio"]["basis_points"], 3333)

    def test_aggregation_micro_sums_not_average_and_order_independent(self):
        labels = [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}]
        c1 = self.case("scout", labels, case_id="case-a")
        c2 = self.case("scout", labels, case_id="case-b")
        s1 = score_role_output(c1, self.result(c1, [{"kind": "source_ref", "ref": "S1@L1"}]))
        s2 = score_role_output(c2, self.result(c2, [
            {"kind": "source_ref", "ref": "S1@L1"},
            {"kind": "source_ref", "ref": "S2@L2"},
            {"kind": "source_ref", "ref": "S3@L3"},
        ]))
        first = aggregate_role_scores([s1, s2])
        second = aggregate_role_scores([s2, s1])
        self.assertEqual(first, second)
        precision = first["rows"][0]["metrics"]["source_selection_precision"]
        self.assertEqual(precision, {"numerator": 2, "denominator": 4, "basis_points": 5000})

    def test_duplicate_cell_identity_rejected(self):
        case = self.case("scout", [{"label_id": "s1", "kind": "source_ref", "ref": "S1@L1"}])
        score = score_role_output(case, self.result(case, [{"kind": "source_ref", "ref": "S1@L1"}]))
        with self.assertRaisesRegex(RoleBenchmarkAggregateError, "duplicate benchmark cell identity"):
            aggregate_role_scores([score, copy.deepcopy(score)])


if __name__ == "__main__":
    unittest.main()
