import json
import sys
import unittest
from copy import deepcopy
from pathlib import Path

PACKAGE = Path(__file__).resolve().parents[1]
if str(PACKAGE) not in sys.path:
    sys.path.insert(0, str(PACKAGE))

from authority import resolve_authority
from canonical import canonical_sha256
from evidence import build_evidence_package, evidence_package_sha256
from roles._compact import artifact_sha256
from roles import critic as o2_critic
from roles.critic_parallel import (
    CONTRACT_ID,
    ParallelCriticContractError,
    build_parallel_critic_prompt,
    parallel_critic_input_projection,
    validate_parallel_critic_wire,
)
from router import route_task
from runtime.parallel_critic_artifact import (
    ParallelCriticArtifactError,
    build_parallel_critic_role_artifact,
    parallel_critic_role_artifact_sha256,
)

TARGET_SHA = "a" * 40
RELEASE_SHA = "b" * 40
HEX64 = "1" * 64


class O3BParallelCriticContractTests(unittest.TestCase):
    def evidence(self):
        plan = route_task({
            "schema_version": 1,
            "task_id": "o3b-parallel-critic-contract",
            "scope": "plugin:usage-dashboard",
            "task_kind": "impact_analysis",
            "intent": "Exercise the O3-B independent Critic contract without model execution.",
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

    def valid_wire(self):
        return json.dumps({
            "b": [{"k": "lifecycle", "v": "runtime lifecycle boundary", "r": ["S2@L10"]}],
            "c": [{"k": "missing_evidence", "v": "consumer preservation evidence may be incomplete", "r": ["S1@L1"]}],
            "u": [{"k": "unknown", "v": "release impact unresolved", "r": []}],
        }, separators=(",", ":"))

    def test_o2_critic_v1_and_o3_parallel_v2_are_distinct(self):
        self.assertEqual(o2_critic.CONTRACT_ID, "critic-compact-wire-v1")
        self.assertEqual(CONTRACT_ID, "critic-parallel-compact-wire-v2")
        self.assertNotEqual(o2_critic.CONTRACT_ID, CONTRACT_ID)

    def test_valid_wire_is_canonical_and_independent_of_mapper(self):
        evidence = self.evidence()
        first = validate_parallel_critic_wire(self.valid_wire(), evidence)
        second = validate_parallel_critic_wire(self.valid_wire(), evidence)
        self.assertEqual(first, second)
        self.assertEqual(set(first), {"b", "c", "u"})
        serialized = json.dumps(first, sort_keys=True)
        self.assertNotIn("claim-mapper", serialized)
        self.assertNotIn('"i"', serialized)

    def test_empty_wire_is_valid_without_fabricated_records(self):
        result = validate_parallel_critic_wire('{"b":[],"c":[],"u":[]}', self.evidence())
        self.assertEqual(result, {"b": [], "c": [], "u": []})

    def test_unknown_refs_invalid_kinds_and_extra_fields_fail_closed(self):
        evidence = self.evidence()
        specimens = [
            {"b": [{"k": "lifecycle", "v": "x", "r": ["S9@L9"]}], "c": [], "u": []},
            {"b": [{"k": "not-a-boundary", "v": "x", "r": ["S1@L1"]}], "c": [], "u": []},
            {"b": [], "c": [{"k": "not-a-blocker", "v": "x", "r": []}], "u": []},
            {"b": [], "c": [], "u": [], "verdict": "PASS"},
            {"b": [], "c": [{"k": "missing_evidence", "v": "x", "r": [], "status": "DIRECT"}], "u": []},
        ]
        for specimen in specimens:
            with self.subTest(specimen=specimen):
                with self.assertRaises(ParallelCriticContractError):
                    validate_parallel_critic_wire(json.dumps(specimen), evidence)

    def test_grounded_boundary_requires_ref_and_empty_concern_refs_are_bounded(self):
        evidence = self.evidence()
        with self.assertRaises(ParallelCriticContractError):
            validate_parallel_critic_wire(
                '{"b":[{"k":"lifecycle","v":"x","r":[]}],"c":[],"u":[]}', evidence
            )
        allowed = validate_parallel_critic_wire(
            '{"b":[],"c":[{"k":"missing_evidence","v":"x","r":[]}],"u":[]}', evidence
        )
        self.assertEqual(allowed["c"][0]["r"], [])
        with self.assertRaises(ParallelCriticContractError):
            validate_parallel_critic_wire(
                '{"b":[],"c":[{"k":"conflict","v":"x","r":[]}],"u":[]}', evidence
            )

    def test_duplicate_blockers_across_concern_and_unresolved_are_rejected(self):
        evidence = self.evidence()
        with self.assertRaisesRegex(ParallelCriticContractError, "duplicate Parallel Critic blocker"):
            validate_parallel_critic_wire(
                '{"b":[],"c":[{"k":"unknown","v":"same","r":[]}],"u":[{"k":"unknown","v":"same","r":[]}]}',
                evidence,
            )

    def test_prompt_uses_validated_scout_projection_and_no_raw_prose(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        projection = parallel_critic_input_projection(evidence, scout)
        prompt = build_parallel_critic_prompt(evidence, scout)
        self.assertEqual(projection["role"], "scout")
        self.assertEqual(projection["artifact_sha256"], artifact_sha256(scout))
        self.assertIn('"role":"scout"', prompt)
        self.assertIn("O3 PARALLEL-INDEPENDENT MODE", prompt)
        self.assertNotIn("claim-mapper-", prompt)
        self.assertNotIn("response.txt", prompt)
        self.assertNotIn("raw_upstream", prompt)

    def test_role_artifact_is_deterministic_and_upstream_is_exactly_scout(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_parallel_critic_prompt(evidence, scout)
        first = build_parallel_critic_role_artifact(self.valid_wire(), evidence, prompt, scout)
        second = build_parallel_critic_role_artifact(self.valid_wire(), evidence, prompt, deepcopy(scout))
        self.assertEqual(first, second)
        self.assertEqual(first["role"], "critic")
        self.assertEqual(first["upstream_artifact_sha256"], [artifact_sha256(scout)])
        self.assertEqual(first["records"]["claims"], [])
        self.assertEqual(first["records"]["flow_edges"], [])
        self.assertEqual(first["records"]["boundaries"][0]["status"], "SUPPORTED_LIKELY")
        self.assertEqual(first["records"]["boundaries"][0]["role"], "critic")
        self.assertEqual(len(first["records"]["blockers"]), 2)
        self.assertTrue(all(item["origin_role"] == "critic" for item in first["records"]["blockers"]))
        self.assertEqual(
            parallel_critic_role_artifact_sha256(first, evidence),
            canonical_sha256(first),
        )

    def test_non_scout_or_wrong_identity_upstream_fails_closed(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_parallel_critic_prompt(evidence, scout)
        wrong_role = deepcopy(scout)
        wrong_role["role"] = "mapper"
        with self.assertRaises(ParallelCriticArtifactError):
            build_parallel_critic_role_artifact(self.valid_wire(), evidence, prompt, wrong_role)

        wrong_target = deepcopy(scout)
        wrong_target["target_repository_sha"] = "f" * 40
        with self.assertRaises(ParallelCriticArtifactError):
            build_parallel_critic_role_artifact(self.valid_wire(), evidence, prompt, wrong_target)

    def test_parallel_critic_artifact_needs_no_mapper_result(self):
        evidence = self.evidence()
        scout = self.scout_artifact()
        prompt = build_parallel_critic_prompt(evidence, scout)
        artifact = build_parallel_critic_role_artifact(
            '{"b":[],"c":[{"k":"unknown","v":"mapping risk unresolved","r":[]}],"u":[]}',
            evidence,
            prompt,
            scout,
        )
        self.assertEqual(artifact["upstream_artifact_sha256"], [artifact_sha256(scout)])
        self.assertEqual(artifact["records"]["blockers"][0]["subject"], "mapping risk unresolved")


if __name__ == "__main__":
    unittest.main()
