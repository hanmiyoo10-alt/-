import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from evidence import build_evidence_package, evidence_package_sha256
from roles._compact import artifact_sha256
from roles.critic import build_critic_prompt
from roles.mapper import build_mapper_prompt
from roles.synthesizer import build_synthesizer_prompt
from router import route_task
from runtime.semantic_role_artifact import (
    SemanticRoleArtifactError,
    build_critic_role_artifact,
    build_mapper_role_artifact,
    build_synthesizer_role_artifact,
    semantic_role_artifact_sha256,
)
from runtime.semantic_role_receipt import (
    SemanticRoleReceiptError,
    build_semantic_role_execution_result,
    semantic_role_execution_receipt_sha256,
)
from schema_validation import ContractValidationError, load_schema, validate_contract

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40
HEX64 = "1" * 64
RUNTIME_VERSION = "llama.cpp o2c synthetic runtime"


class O2CRoleExecutionEnvelopeTests(unittest.TestCase):
    def evidence(self):
        plan = route_task({
            "schema_version": 1,
            "task_id": "o2c-role-envelopes",
            "scope": "plugin:usage-dashboard",
            "task_kind": "impact_analysis",
            "intent": "Exercise O2-C semantic role execution envelopes.",
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
            {"path": "plugins/usage-dashboard/src/runtime.js", "source_sha": TARGET_SHA, "start_line": 10, "content": "export const runtime = true;"},
            {"path": "plugins/usage-dashboard/runtime/product-manifest.json", "source_sha": TARGET_SHA, "start_line": 1, "content": '{"name":"usage-dashboard"}'},
        ])

    def artifact(self, role, records, upstream=None):
        evidence = self.evidence()
        return {
            "schema_version": 1,
            "role": role,
            "model_profile_id": "qwen2.5-3b-instruct-q4_k_m",
            "model_digest": "2" * 64,
            "target_repository_sha": TARGET_SHA,
            "evidence_sha256": evidence_package_sha256(evidence),
            "prompt_sha256": HEX64,
            "structured_response_sha256": "3" * 64,
            "upstream_artifact_sha256": [] if upstream is None else list(upstream),
            "records": records,
        }

    def scout_artifact(self):
        return self.artifact("scout", {
            "claims": [{
                "id": "claim-scout-001", "kind": "authority", "status": "DIRECT",
                "value": "manifest", "refs": ["S1@L1"], "role": "scout",
            }],
            "flow_edges": [], "boundaries": [], "blockers": [], "conflicts": [],
        })

    def build_mapper(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_mapper_prompt(evidence, scout)
        content = '{"o":[{"v":"runtime","r":["S2@L10"]}],"e":[{"f":"runtime","t":"dashboard","r":["S1@L1","S2@L10"]}]}'
        return evidence, scout, prompt, content, build_mapper_role_artifact(content, evidence, prompt, scout)

    def build_critic(self):
        evidence, scout, _, _, mapper = self.build_mapper()
        prompt = build_critic_prompt(evidence, mapper)
        content = json.dumps({
            "b": [{"k": "request_identity", "v": "request identity must remain stable", "r": ["S2@L10"]}],
            "q": [{"i": "claim-mapper-001", "k": "missing_evidence", "v": "consumer boundary needs proof", "r": ["S1@L1"]}],
            "u": [{"k": "unknown", "v": "release impact unresolved", "r": []}],
        }, separators=(",", ":"))
        critic = build_critic_role_artifact(content, evidence, prompt, mapper)
        return evidence, scout, mapper, prompt, content, critic

    def test_scout_receipt_v1_remains_scout_only_and_v2_rejects_scout(self):
        v1 = load_schema("role-execution-receipt.schema.json")
        self.assertEqual(v1["properties"]["schema_version"]["const"], 1)
        self.assertEqual(v1["properties"]["role"]["const"], "scout")
        v2 = load_schema("semantic-role-execution-receipt-v2.schema.json")
        self.assertEqual(v2["properties"]["schema_version"]["const"], 2)
        self.assertEqual(v2["properties"]["role"]["enum"], ["mapper", "critic", "synthesizer"])
        specimen = {
            "schema_version": 2,
            "role": "scout",
            "execution_status": "COMPLETED",
        }
        with self.assertRaises(ContractValidationError):
            validate_contract(specimen, "semantic-role-execution-receipt-v2.schema.json")

    def test_mapper_artifact_is_deterministic_and_status_is_evaluator_owned(self):
        evidence, scout, prompt, content, first = self.build_mapper()
        second = build_mapper_role_artifact(content, evidence, prompt, scout)
        self.assertEqual(first, second)
        self.assertEqual(first["role"], "mapper")
        self.assertEqual(first["records"]["claims"][0]["status"], "SUPPORTED_LIKELY")
        self.assertEqual(first["records"]["flow_edges"][0]["status"], "SUPPORTED_LIKELY")
        self.assertEqual(first["upstream_artifact_sha256"], [artifact_sha256(scout)])
        self.assertEqual(
            semantic_role_artifact_sha256(first, evidence, expected_role="mapper"),
            semantic_role_artifact_sha256(second, evidence, expected_role="mapper"),
        )

    def test_critic_projects_boundaries_and_blockers_without_mapper_mutation(self):
        evidence, _, mapper, _, _, critic = self.build_critic()
        self.assertEqual(critic["records"]["claims"], [])
        self.assertEqual(critic["records"]["flow_edges"], [])
        self.assertEqual(critic["records"]["boundaries"][0]["status"], "SUPPORTED_LIKELY")
        self.assertEqual(critic["records"]["boundaries"][0]["role"], "critic")
        self.assertEqual(len(critic["records"]["blockers"]), 2)
        self.assertTrue(critic["records"]["blockers"][0]["subject"].startswith("claim-mapper-001: "))
        self.assertEqual(critic["records"]["blockers"][1]["kind"], "unknown")
        self.assertEqual(critic["upstream_artifact_sha256"], [artifact_sha256(mapper)])
        self.assertEqual(mapper["records"]["claims"][0]["status"], "SUPPORTED_LIKELY")

    def test_synthesizer_rewraps_selected_typed_records_and_preserves_mandatory_blockers(self):
        evidence, _, mapper, _, _, critic = self.build_critic()
        prompt = build_synthesizer_prompt(evidence, [critic, mapper])
        content = '{"s":["C1","E1","B1"]}'
        first = build_synthesizer_role_artifact(content, evidence, prompt, [critic, mapper])
        second_prompt = build_synthesizer_prompt(evidence, [mapper, critic])
        second = build_synthesizer_role_artifact(content, evidence, second_prompt, [mapper, critic])
        self.assertEqual(first, second)
        self.assertEqual(first["records"]["claims"][0]["id"], "claim-synthesizer-001")
        self.assertEqual(first["records"]["claims"][0]["status"], "SUPPORTED_LIKELY")
        self.assertEqual(first["records"]["flow_edges"][0]["role"], "synthesizer")
        self.assertEqual(first["records"]["boundaries"][0]["role"], "synthesizer")
        self.assertEqual(len(first["records"]["blockers"]), 2)
        self.assertEqual(
            first["upstream_artifact_sha256"],
            [artifact_sha256(mapper), artifact_sha256(critic)],
        )

    def test_synthesizer_conflict_without_selected_referenced_claims_fails_closed(self):
        evidence, _, mapper, _, _, _ = self.build_critic()
        conflict_artifact = self.artifact("critic", {
            "claims": [
                {"id": "claim-critic-left", "kind": "preservation", "status": "SUPPORTED_LIKELY", "value": "left", "refs": ["S2@L10"], "role": "critic"},
                {"id": "claim-critic-right", "kind": "preservation", "status": "SUPPORTED_LIKELY", "value": "right", "refs": ["S1@L1"], "role": "critic"},
            ],
            "flow_edges": [], "boundaries": [], "blockers": [],
            "conflicts": [{
                "id": "conflict-o2c-001", "subject": "selected conflict",
                "left_claim_id": "claim-critic-left", "right_claim_id": "claim-critic-right",
                "resolution": "UNRESOLVED",
            }],
        }, upstream=[artifact_sha256(mapper)])
        prompt = build_synthesizer_prompt(evidence, [mapper, conflict_artifact])
        with self.assertRaisesRegex(SemanticRoleArtifactError, "cannot be remapped"):
            build_synthesizer_role_artifact('{"s":[]}', evidence, prompt, [mapper, conflict_artifact])

    def test_mapper_execution_receipt_distinguishes_completed_invalid_and_truncated(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_mapper_prompt(evidence, scout)
        valid = '{"o":[{"v":"runtime","r":["S2@L10"]}],"e":[]}'
        completed = build_semantic_role_execution_result(
            role="mapper", content=valid, finish_reason="stop", evidence_package=evidence,
            prompt=prompt, upstream_artifacts=[scout], runtime_version=RUNTIME_VERSION,
        )
        self.assertEqual(completed["receipt"]["execution_status"], "COMPLETED")
        self.assertIsNotNone(completed["artifact"])
        self.assertEqual(completed["receipt"]["model_call_count"], 1)
        self.assertEqual(completed["receipt"]["hosted_ai_call_count"], 0)
        self.assertEqual(completed["receipt"]["upstream_artifact_sha256"], [artifact_sha256(scout)])

        invalid = build_semantic_role_execution_result(
            role="mapper", content='{"o":', finish_reason="stop", evidence_package=evidence,
            prompt=prompt, upstream_artifacts=[scout], runtime_version=RUNTIME_VERSION,
        )
        self.assertEqual(invalid["receipt"]["execution_status"], "INVALID")
        self.assertIsNone(invalid["artifact"])
        self.assertEqual(invalid["receipt"]["role_artifact_sha256"], "NONE")

        truncated = build_semantic_role_execution_result(
            role="mapper", content=valid, finish_reason="length", evidence_package=evidence,
            prompt=prompt, upstream_artifacts=[scout], runtime_version=RUNTIME_VERSION,
        )
        self.assertEqual(truncated["receipt"]["execution_status"], "EXECUTION_INCOMPLETE")
        self.assertIsNone(truncated["artifact"])
        self.assertEqual(truncated["receipt"]["role_artifact_sha256"], "NONE")

    def test_execution_receipt_hash_is_reproducible_and_contains_no_raw_upstream_prose(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_mapper_prompt(evidence, scout)
        content = '{"o":[],"e":[]}'
        first = build_semantic_role_execution_result(
            role="mapper", content=content, finish_reason="stop", evidence_package=evidence,
            prompt=prompt, upstream_artifacts=[scout], runtime_version=RUNTIME_VERSION,
        )
        second = build_semantic_role_execution_result(
            role="mapper", content=content, finish_reason="stop", evidence_package=evidence,
            prompt=prompt, upstream_artifacts=[deepcopy(scout)], runtime_version=RUNTIME_VERSION,
        )
        self.assertEqual(first, second)
        self.assertEqual(
            semantic_role_execution_receipt_sha256(first["receipt"]),
            semantic_role_execution_receipt_sha256(second["receipt"]),
        )
        serialized = json.dumps(first["receipt"], sort_keys=True)
        self.assertNotIn("response.txt", serialized)
        self.assertNotIn("raw_upstream", serialized)
        self.assertNotIn("records", first["receipt"])

    def test_upstream_identity_mismatch_and_missing_synth_dependency_fail_closed(self):
        evidence, scout, _, _, mapper = self.build_mapper()
        tampered = deepcopy(scout)
        tampered["target_repository_sha"] = "f" * 40
        prompt = build_mapper_prompt(evidence, scout)
        with self.assertRaises(SemanticRoleReceiptError):
            build_semantic_role_execution_result(
                role="mapper", content='{"o":[],"e":[]}', finish_reason="stop",
                evidence_package=evidence, prompt=prompt, upstream_artifacts=[tampered],
                runtime_version=RUNTIME_VERSION,
            )
        synth_prompt = build_synthesizer_prompt(evidence, [mapper])
        with self.assertRaisesRegex(SemanticRoleReceiptError, "missing required roles"):
            build_semantic_role_execution_result(
                role="synthesizer", content='{"s":[]}', finish_reason="stop",
                evidence_package=evidence, prompt=synth_prompt, upstream_artifacts=[mapper],
                runtime_version=RUNTIME_VERSION,
            )


if __name__ == "__main__":
    unittest.main()
