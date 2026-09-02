import json
import sys
import tempfile
import unittest
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from canonical import canonical_sha256
from evidence import build_evidence_package, evidence_package_sha256
from roles._compact import artifact_sha256
from roles.critic_parallel import build_parallel_critic_prompt
from router import route_task
from runtime.parallel_critic_receipt import (
    build_parallel_critic_execution_result,
    parallel_critic_execution_receipt_sha256,
)
from runtime.resolve_parallel_pilot_request import (
    FROZEN_EVIDENCE_REPOSITORY_SHA,
    FROZEN_RELEASE_REPOSITORY_SHA,
    MODE as REQUEST_MODE,
    ParallelPilotRequestError,
    load_request,
)
from runtime.run_parallel_pilot import (
    MIN_OVERLAP_MS,
    SERVER_PARALLEL_SLOTS,
    _job_from_summary,
    build_parallel_server_command,
    concurrency_summary,
    grounding_summary,
)

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40
HEX64 = "1" * 64


class O3DLiveParallelTests(unittest.TestCase):
    def evidence(self):
        plan = route_task({
            "schema_version": 1,
            "task_id": "o3d-live-parallel-test",
            "scope": "plugin:usage-dashboard",
            "task_kind": "impact_analysis",
            "intent": "Exercise O3-D live parallel contracts without model execution.",
            "mutation_requested": False,
            "device_truth_requested": False,
        })
        snapshot = resolve_authority("plugin:usage-dashboard", TARGET_SHA, [
            {"kind": "release_branch", "value": "release-usage-dashboard", "status": "OBSERVED", "source_sha": RELEASE_SHA},
            {"kind": "manifest", "value": "plugins/usage-dashboard/runtime/product-manifest.json", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "artifact", "value": "plugins/usage-dashboard/latest.js", "status": "OBSERVED", "source_sha": TARGET_SHA},
            {"kind": "release_spec_dir", "value": ".github/usage-dashboard/releases", "status": "OBSERVED", "source_sha": TARGET_SHA},
        ])
        return build_evidence_package(plan, snapshot, [
            {"path": "plugins/usage-dashboard/runtime/product-manifest.json", "source_sha": TARGET_SHA, "start_line": 1, "content": '{"name":"usage-dashboard"}'},
            {"path": "plugins/usage-dashboard/src/runtime.js", "source_sha": TARGET_SHA, "start_line": 10, "content": "export const runtime = true;"},
        ])

    def scout_artifact(self):
        evidence = self.evidence()
        return {
            "schema_version": 1,
            "role": "scout",
            "model_profile_id": "qwen2.5-3b-instruct-q4_k_m",
            "model_digest": "2" * 64,
            "target_repository_sha": TARGET_SHA,
            "evidence_sha256": evidence_package_sha256(evidence),
            "prompt_sha256": HEX64,
            "structured_response_sha256": "3" * 64,
            "upstream_artifact_sha256": [],
            "records": {
                "claims": [{
                    "id": "claim-scout-001",
                    "kind": "authority",
                    "status": "DIRECT",
                    "value": "manifest",
                    "refs": ["S1@L1"],
                    "role": "scout",
                }],
                "flow_edges": [],
                "boundaries": [],
                "blockers": [],
                "conflicts": [],
            },
        }

    def test_parallel_critic_receipt_binds_scout_directly(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_parallel_critic_prompt(evidence, scout)
        result = build_parallel_critic_execution_result(
            content='{"b":[{"k":"lifecycle","v":"runtime boundary","r":["S2@L10"]}],"c":[],"u":[]}',
            finish_reason="stop",
            evidence_package=evidence,
            prompt=prompt,
            scout_artifact=scout,
            runtime_version="llama.cpp test",
        )
        self.assertEqual(result["receipt"]["execution_status"], "COMPLETED")
        self.assertEqual(
            result["receipt"]["upstream_artifact_sha256"],
            [artifact_sha256(scout)],
        )
        self.assertEqual(
            result["receipt"]["role_artifact_sha256"],
            canonical_sha256(result["artifact"]),
        )
        self.assertEqual(
            parallel_critic_execution_receipt_sha256(result["receipt"]),
            canonical_sha256(result["receipt"]),
        )

    def test_parallel_critic_invalid_wire_has_receipt_but_no_artifact(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_parallel_critic_prompt(evidence, scout)
        result = build_parallel_critic_execution_result(
            content='{"b":[{"k":"lifecycle","v":"x","r":[]}],"c":[],"u":[]}',
            finish_reason="stop",
            evidence_package=evidence,
            prompt=prompt,
            scout_artifact=scout,
            runtime_version="llama.cpp test",
        )
        self.assertEqual(result["receipt"]["execution_status"], "INVALID")
        self.assertEqual(result["receipt"]["role_artifact_sha256"], "NONE")
        self.assertIsNone(result["artifact"])
        self.assertTrue(result["error"])

    def test_request_resolver_is_exact_and_frozen(self):
        valid = {
            "schema_version": 1,
            "mode": REQUEST_MODE,
            "harness_repository_sha": "c" * 40,
            "evidence_repository_sha": FROZEN_EVIDENCE_REPOSITORY_SHA,
            "release_repository_sha": FROZEN_RELEASE_REPOSITORY_SHA,
        }
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "request.json"
            path.write_text(json.dumps(valid), encoding="utf-8")
            self.assertEqual(load_request(path), valid)
            specimens = []
            wrong = dict(valid)
            wrong["extra"] = True
            specimens.append(wrong)
            wrong = dict(valid)
            wrong["mode"] = "o2d_sequential_retrospective_mechanical"
            specimens.append(wrong)
            wrong = dict(valid)
            wrong["evidence_repository_sha"] = "d" * 40
            specimens.append(wrong)
            wrong = dict(valid)
            wrong["release_repository_sha"] = "e" * 40
            specimens.append(wrong)
            wrong = dict(valid)
            wrong["harness_repository_sha"] = "NOT-A-SHA"
            specimens.append(wrong)
            for specimen in specimens:
                with self.subTest(specimen=specimen):
                    path.write_text(json.dumps(specimen), encoding="utf-8")
                    with self.assertRaises(ParallelPilotRequestError):
                        load_request(path)

    def test_parallel_server_command_adds_exactly_two_slots(self):
        with tempfile.TemporaryDirectory() as td:
            binary = Path(td) / "llama-server"
            model = Path(td) / "model.gguf"
            binary.write_bytes(b"x")
            model.write_bytes(b"x")
            from runtime.generation import scout_generation
            command = build_parallel_server_command(binary, model, scout_generation(), 39132)
        self.assertEqual(SERVER_PARALLEL_SLOTS, 2)
        self.assertEqual(command[-2:], ["--parallel", "2"])
        self.assertEqual(command.count("--parallel"), 1)

    def test_concurrency_summary_requires_overlap_and_ten_percent_benefit(self):
        mapper = {"start_monotonic_ns": 0, "end_monotonic_ns": 10_000_000_000}
        critic = {"start_monotonic_ns": 100_000_000, "end_monotonic_ns": 10_100_000_000}
        result = concurrency_summary(mapper, critic)
        self.assertGreaterEqual(result["overlap_ms"], MIN_OVERLAP_MS)
        self.assertTrue(result["benefit_pass"])
        self.assertTrue(result["acceptance_pass"])

        serial = {"start_monotonic_ns": 10_000_000_000, "end_monotonic_ns": 20_000_000_000}
        rejected = concurrency_summary(mapper, serial)
        self.assertEqual(rejected["overlap_ms"], 0)
        self.assertFalse(rejected["acceptance_pass"])

    def test_grounding_requires_nonempty_known_refs(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        good = grounding_summary({"scout": scout}, evidence)
        self.assertEqual(good["ref_bearing_record_count"], 1)
        self.assertEqual(good["grounding_ratio_basis_points"], 10_000)
        self.assertTrue(good["acceptance_pass"])

        bad = self.scout_artifact()
        bad["records"]["claims"][0]["refs"] = []
        rejected = grounding_summary({"scout": bad}, evidence)
        self.assertEqual(rejected["grounding_ratio_basis_points"], 0)
        self.assertFalse(rejected["acceptance_pass"])

    def test_job_conversion_keeps_null_cpu_rss_and_exact_upstream(self):
        evidence_sha = "4" * 64
        scout_sha = "5" * 64
        summary = {
            "execution_status": "COMPLETED",
            "receipt_sha256": "6" * 64,
            "role_artifact_sha256": "7" * 64,
            "upstream_artifact_sha256": [scout_sha],
            "model_call_count": 1,
            "hosted_ai_call_count": 0,
        }
        job = _job_from_summary(
            role="mapper",
            summary=summary,
            timing={"wall_clock_ms": 123},
            evidence_sha256=evidence_sha,
        )
        self.assertEqual(job["upstream_artifact_sha256"], [scout_sha])
        self.assertEqual(job["attempts"][0]["attempt"], 1)
        self.assertEqual(job["telemetry"]["wall_clock_ms"], 123)
        self.assertIsNone(job["telemetry"]["cpu_ms"])
        self.assertIsNone(job["telemetry"]["peak_rss_bytes"])

    def test_blocked_job_conversion_fabricates_nothing(self):
        job = _job_from_summary(
            role="synthesizer",
            summary={"execution_status": "BLOCKED_DEPENDENCY"},
            timing=None,
            evidence_sha256="8" * 64,
        )
        self.assertEqual(job["attempts"], [])
        self.assertEqual(job["receipt_sha256"], "NONE")
        self.assertEqual(job["role_artifact_sha256"], "NONE")
        self.assertIsNone(job["telemetry"]["wall_clock_ms"])


if __name__ == "__main__":
    unittest.main()
