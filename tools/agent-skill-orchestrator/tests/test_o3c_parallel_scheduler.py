import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from runtime.budget_profile import runtime_budget_profile_sha256
from runtime.parallel_scheduler import (
    MEMORY_POLICY_ID,
    ParallelSchedulerError,
    blocked_dependency_job,
    build_parallel_root_provenance,
    parallel_root_provenance_sha256,
    validate_parallel_root_provenance,
)

TARGET_SHA = "a" * 40
EVIDENCE_SHA = "9" * 64
SCOUT_ARTIFACT = "a" * 64
MAPPER_ARTIFACT = "b" * 64
CRITIC_ARTIFACT = "c" * 64
SYNTH_ARTIFACT = "d" * 64


def digest(char):
    return char * 64


def telemetry(wall, cpu, rss):
    return {"wall_clock_ms": wall, "cpu_ms": cpu, "peak_rss_bytes": rss}


def attempt(
    role,
    state,
    upstream,
    *,
    number=1,
    evidence=EVIDENCE_SHA,
    receipt="NONE",
    artifact="NONE",
    model_calls=0,
    hosted_calls=0,
    measured=None,
):
    return {
        "attempt": number,
        "role": role,
        "terminal_state": state,
        "evidence_sha256": evidence,
        "upstream_artifact_sha256": list(upstream),
        "receipt_sha256": receipt,
        "role_artifact_sha256": artifact,
        "model_call_count": model_calls,
        "hosted_ai_call_count": hosted_calls,
        "telemetry": measured if measured is not None else telemetry(None, None, None),
    }


def completed_job(role, upstream, *, receipt, artifact, cpu, wall=10, rss=100):
    measured = telemetry(wall, cpu, rss)
    final = attempt(
        role,
        "COMPLETED",
        upstream,
        receipt=receipt,
        artifact=artifact,
        model_calls=1,
        measured=measured,
    )
    return {
        "role": role,
        "terminal_state": "COMPLETED",
        "evidence_sha256": EVIDENCE_SHA,
        "upstream_artifact_sha256": list(upstream),
        "attempts": [final],
        "receipt_sha256": receipt,
        "role_artifact_sha256": artifact,
        "telemetry": measured,
    }


def failed_job(role, upstream, *, model_calls=0, cpu=None):
    measured = telemetry(5 if cpu is not None else None, cpu, 80 if cpu is not None else None)
    final = attempt(
        role,
        "FAILED",
        upstream,
        receipt="NONE",
        artifact="NONE",
        model_calls=model_calls,
        measured=measured,
    )
    return {
        "role": role,
        "terminal_state": "FAILED",
        "evidence_sha256": EVIDENCE_SHA,
        "upstream_artifact_sha256": list(upstream),
        "attempts": [final],
        "receipt_sha256": "NONE",
        "role_artifact_sha256": "NONE",
        "telemetry": measured,
    }


def invalid_job(role, upstream, *, receipt, cpu=15):
    measured = telemetry(12, cpu, 90)
    final = attempt(
        role,
        "INVALID",
        upstream,
        receipt=receipt,
        artifact="NONE",
        model_calls=1,
        measured=measured,
    )
    return {
        "role": role,
        "terminal_state": "INVALID",
        "evidence_sha256": EVIDENCE_SHA,
        "upstream_artifact_sha256": list(upstream),
        "attempts": [final],
        "receipt_sha256": receipt,
        "role_artifact_sha256": "NONE",
        "telemetry": measured,
    }


def baseline_jobs():
    return [
        completed_job("scout", [], receipt=digest("e"), artifact=SCOUT_ARTIFACT, cpu=10),
        completed_job(
            "mapper", [SCOUT_ARTIFACT], receipt=digest("f"), artifact=MAPPER_ARTIFACT, cpu=20
        ),
        completed_job(
            "critic", [SCOUT_ARTIFACT], receipt=digest("1"), artifact=CRITIC_ARTIFACT, cpu=30
        ),
        completed_job(
            "synthesizer",
            [SCOUT_ARTIFACT, MAPPER_ARTIFACT, CRITIC_ARTIFACT],
            receipt=digest("2"),
            artifact=SYNTH_ARTIFACT,
            cpu=40,
        ),
    ]


def build_root(jobs=None, *, wall=50, rss=1000):
    return build_parallel_root_provenance(
        target_repository_sha=TARGET_SHA,
        evidence_sha256=EVIDENCE_SHA,
        jobs=baseline_jobs() if jobs is None else jobs,
        root_wall_clock_ms=wall,
        root_peak_rss_bytes=rss,
    )


class O3CParallelSchedulerTests(unittest.TestCase):
    def test_baseline_root_binds_budget_memory_policy_and_distinct_telemetry(self):
        root = build_root()
        self.assertEqual(root["budget_profile"]["profile_id"], "standard-cpu-v1")
        self.assertEqual(root["budget_profile"]["profile_sha256"], runtime_budget_profile_sha256())
        self.assertEqual(root["budget_profile"]["max_total_role_calls"], 4)
        self.assertEqual(root["budget_profile"]["max_hosted_ai_calls"], 0)
        self.assertEqual(root["budget_profile"]["max_concurrent_model_workers"], 2)
        self.assertEqual(root["runner_memory_policy_id"], MEMORY_POLICY_ID)
        self.assertEqual(root["total_model_call_count"], 4)
        self.assertEqual(root["total_hosted_ai_call_count"], 0)
        self.assertEqual(root["telemetry"]["wall_clock_ms"], 50)
        self.assertEqual(root["telemetry"]["summed_worker_cpu_ms"], 100)
        self.assertEqual(root["telemetry"]["peak_rss_bytes"], 1000)
        self.assertEqual(root["synthesizer_dependency_gate"], "READY")
        validate_parallel_root_provenance(root)

    def test_sibling_arrival_order_does_not_change_root_or_digest(self):
        first_jobs = baseline_jobs()
        second_jobs = [first_jobs[2], first_jobs[0], first_jobs[3], first_jobs[1]]
        first = build_root(first_jobs)
        second = build_root(second_jobs)
        self.assertEqual(first, second)
        self.assertEqual(parallel_root_provenance_sha256(first), parallel_root_provenance_sha256(second))
        self.assertEqual([item["role"] for item in first["jobs"]], ["scout", "mapper", "critic", "synthesizer"])

    def test_mapper_and_critic_must_bind_same_root_evidence_and_scout_artifact(self):
        jobs = baseline_jobs()
        jobs[2]["evidence_sha256"] = digest("8")
        jobs[2]["attempts"][0]["evidence_sha256"] = digest("8")
        with self.assertRaisesRegex(ParallelSchedulerError, "root evidence"):
            build_root(jobs)

        jobs = baseline_jobs()
        jobs[2]["upstream_artifact_sha256"] = [digest("7")]
        jobs[2]["attempts"][0]["upstream_artifact_sha256"] = [digest("7")]
        with self.assertRaisesRegex(ParallelSchedulerError, "completed Scout"):
            build_root(jobs)

    def test_mapper_failure_does_not_poison_completed_critic(self):
        scout, _, critic, _ = baseline_jobs()
        mapper = failed_job("mapper", [SCOUT_ARTIFACT])
        synth = blocked_dependency_job("synthesizer", EVIDENCE_SHA)
        root = build_root([critic, synth, mapper, scout], wall=None, rss=None)
        by_role = {item["role"]: item for item in root["jobs"]}
        self.assertEqual(by_role["mapper"]["terminal_state"], "FAILED")
        self.assertEqual(by_role["critic"]["terminal_state"], "COMPLETED")
        self.assertEqual(by_role["critic"]["role_artifact_sha256"], CRITIC_ARTIFACT)
        self.assertEqual(by_role["synthesizer"]["terminal_state"], "BLOCKED_DEPENDENCY")
        self.assertEqual(root["synthesizer_dependency_gate"], "BLOCKED")
        self.assertEqual(root["total_model_call_count"], 2)

    def test_critic_invalid_does_not_poison_completed_mapper(self):
        scout, mapper, _, _ = baseline_jobs()
        critic = invalid_job("critic", [SCOUT_ARTIFACT], receipt=digest("3"))
        synth = blocked_dependency_job("synthesizer", EVIDENCE_SHA)
        root = build_root([synth, critic, scout, mapper])
        by_role = {item["role"]: item for item in root["jobs"]}
        self.assertEqual(by_role["mapper"]["terminal_state"], "COMPLETED")
        self.assertEqual(by_role["mapper"]["role_artifact_sha256"], MAPPER_ARTIFACT)
        self.assertEqual(by_role["critic"]["terminal_state"], "INVALID")
        self.assertEqual(by_role["synthesizer"]["terminal_state"], "BLOCKED_DEPENDENCY")
        self.assertEqual(root["total_model_call_count"], 3)

    def test_synthesizer_dependency_gate_rejects_false_ready_or_false_blocked(self):
        scout, _, critic, synth = baseline_jobs()
        mapper = failed_job("mapper", [SCOUT_ARTIFACT])
        with self.assertRaisesRegex(ParallelSchedulerError, "dependency-blocked"):
            build_root([scout, mapper, critic, synth])

        scout, mapper, critic, _ = baseline_jobs()
        blocked = blocked_dependency_job("synthesizer", EVIDENCE_SHA)
        with self.assertRaisesRegex(ParallelSchedulerError, "cannot be dependency-blocked"):
            build_root([scout, mapper, critic, blocked])

    def test_scout_failure_blocks_both_siblings_and_synthesizer(self):
        scout = failed_job("scout", [])
        jobs = [
            scout,
            blocked_dependency_job("mapper", EVIDENCE_SHA),
            blocked_dependency_job("critic", EVIDENCE_SHA),
            blocked_dependency_job("synthesizer", EVIDENCE_SHA),
        ]
        root = build_root(jobs, wall=None, rss=None)
        self.assertEqual(root["synthesizer_dependency_gate"], "BLOCKED")
        self.assertEqual(root["total_model_call_count"], 0)
        self.assertIsNone(root["telemetry"]["summed_worker_cpu_ms"])

    def test_retry_metadata_is_contiguous_bounded_and_evidence_stable(self):
        jobs = baseline_jobs()
        critic = jobs[2]
        first = attempt(
            "critic",
            "FAILED",
            [SCOUT_ARTIFACT],
            number=1,
            model_calls=0,
            measured=telemetry(5, 5, 70),
        )
        second = deepcopy(critic["attempts"][0])
        second["attempt"] = 2
        critic["attempts"] = [first, second]
        root = build_root(jobs)
        self.assertEqual(root["total_model_call_count"], 4)
        self.assertEqual(root["jobs"][2]["attempts"][1]["attempt"], 2)

        jobs = baseline_jobs()
        critic = jobs[2]
        first = attempt("critic", "FAILED", [SCOUT_ARTIFACT], number=1)
        second = deepcopy(critic["attempts"][0])
        second["attempt"] = 3
        critic["attempts"] = [first, second]
        with self.assertRaisesRegex(ParallelSchedulerError, "contiguous"):
            build_root(jobs)

        jobs = baseline_jobs()
        critic = jobs[2]
        first = attempt("critic", "FAILED", [SCOUT_ARTIFACT], number=1)
        second = deepcopy(critic["attempts"][0])
        second["attempt"] = 2
        second["evidence_sha256"] = digest("8")
        critic["attempts"] = [first, second]
        with self.assertRaisesRegex(ParallelSchedulerError, "evidence digest drifted"):
            build_root(jobs)

        jobs = baseline_jobs()
        critic = jobs[2]
        first = attempt("critic", "FAILED", [SCOUT_ARTIFACT], number=1)
        second = attempt("critic", "FAILED", [SCOUT_ARTIFACT], number=2)
        third = deepcopy(critic["attempts"][0])
        third["attempt"] = 3
        critic["attempts"] = [first, second, third]
        with self.assertRaisesRegex(ParallelSchedulerError, "at most 2"):
            build_root(jobs)

    def test_retry_cannot_continue_after_completed_attempt(self):
        jobs = baseline_jobs()
        critic = jobs[2]
        completed = deepcopy(critic["attempts"][0])
        failed = attempt("critic", "FAILED", [SCOUT_ARTIFACT], number=2)
        critic["attempts"] = [completed, failed]
        critic["terminal_state"] = "FAILED"
        critic["receipt_sha256"] = "NONE"
        critic["role_artifact_sha256"] = "NONE"
        critic["telemetry"] = failed["telemetry"]
        with self.assertRaisesRegex(ParallelSchedulerError, "cannot continue after"):
            build_root(jobs)

    def test_unknown_telemetry_stays_null_and_explicit_zero_stays_zero(self):
        jobs = baseline_jobs()
        jobs[2]["attempts"][0]["telemetry"]["cpu_ms"] = None
        jobs[2]["telemetry"]["cpu_ms"] = None
        root = build_root(jobs, wall=None, rss=None)
        self.assertIsNone(root["telemetry"]["wall_clock_ms"])
        self.assertIsNone(root["telemetry"]["summed_worker_cpu_ms"])
        self.assertIsNone(root["telemetry"]["peak_rss_bytes"])

        jobs = baseline_jobs()
        for job in jobs:
            job["attempts"][0]["telemetry"] = telemetry(0, 0, 0)
            job["telemetry"] = telemetry(0, 0, 0)
        root = build_root(jobs, wall=0, rss=0)
        self.assertEqual(root["telemetry"]["wall_clock_ms"], 0)
        self.assertEqual(root["telemetry"]["summed_worker_cpu_ms"], 0)
        self.assertEqual(root["telemetry"]["peak_rss_bytes"], 0)

    def test_invalid_or_fabricated_telemetry_is_rejected(self):
        jobs = baseline_jobs()
        jobs[1]["attempts"][0]["telemetry"]["cpu_ms"] = -1
        jobs[1]["telemetry"]["cpu_ms"] = -1
        with self.assertRaisesRegex(ParallelSchedulerError, "non-negative integer or null"):
            build_root(jobs)

        blocked = blocked_dependency_job("synthesizer", EVIDENCE_SHA)
        blocked["telemetry"]["wall_clock_ms"] = 0
        scout, mapper, critic, _ = baseline_jobs()
        critic = invalid_job("critic", [SCOUT_ARTIFACT], receipt=digest("3"))
        with self.assertRaisesRegex(ParallelSchedulerError, "must not fabricate telemetry"):
            build_root([scout, mapper, critic, blocked])

    def test_call_budget_and_zero_hosted_ai_are_fail_closed(self):
        jobs = baseline_jobs()
        critic = jobs[2]
        first = attempt(
            "critic", "FAILED", [SCOUT_ARTIFACT], number=1, model_calls=1, measured=telemetry(5, 5, 50)
        )
        second = deepcopy(critic["attempts"][0])
        second["attempt"] = 2
        critic["attempts"] = [first, second]
        with self.assertRaisesRegex(ParallelSchedulerError, "exceeds runtime budget"):
            build_root(jobs)

        jobs = baseline_jobs()
        jobs[1]["attempts"][0]["hosted_ai_call_count"] = 1
        with self.assertRaisesRegex(ParallelSchedulerError, "hosted AI"):
            build_root(jobs)

    def test_root_revalidation_detects_budget_aggregate_and_policy_tampering(self):
        root = build_root()
        mutations = [
            ("budget_profile", "profile_sha256", digest("0")),
            ("budget_profile", "max_concurrent_model_workers", 1),
            (None, "total_model_call_count", 3),
            (None, "runner_memory_policy_id", "other-policy-v1"),
            ("telemetry", "summed_worker_cpu_ms", 99),
        ]
        for parent, key, value in mutations:
            with self.subTest(parent=parent, key=key):
                tampered = deepcopy(root)
                if parent is None:
                    tampered[key] = value
                else:
                    tampered[parent][key] = value
                with self.assertRaises(ParallelSchedulerError):
                    validate_parallel_root_provenance(tampered)

    def test_duplicate_missing_or_extra_job_fields_fail_closed(self):
        scout, mapper, critic, _ = baseline_jobs()
        with self.assertRaisesRegex(ParallelSchedulerError, "duplicate"):
            build_root([scout, mapper, critic, deepcopy(critic)])

        jobs = baseline_jobs()
        jobs[1]["extra"] = "forbidden"
        with self.assertRaisesRegex(ParallelSchedulerError, "fields invalid"):
            build_root(jobs)

    def test_blocked_dependency_helper_never_claims_calls_receipts_or_artifacts(self):
        job = blocked_dependency_job("synthesizer", EVIDENCE_SHA)
        self.assertEqual(job["attempts"], [])
        self.assertEqual(job["receipt_sha256"], "NONE")
        self.assertEqual(job["role_artifact_sha256"], "NONE")
        self.assertEqual(job["upstream_artifact_sha256"], [])
        self.assertTrue(all(value is None for value in job["telemetry"].values()))


if __name__ == "__main__":
    unittest.main()
